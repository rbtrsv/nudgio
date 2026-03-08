"""
Widget Sign Subrouter

Public endpoint that generates HMAC-signed widget URLs for the universal JS loader (widget.js).
Used by non-Shopify platforms (WooCommerce, Magento, custom sites).

Flow:
    1. widget.js on merchant's storefront reads data-* attributes from <div class="nudgio-widget">
    2. widget.js makes XHR GET to /ecommerce/widget/sign?key_id=5&type=bestsellers&top=4&...
    3. This endpoint looks up the API key, signs all params via HMAC-SHA256, returns signed URL
    4. widget.js creates <iframe src="{signed_url}"> inside the div
    5. Signed URL hits /ecommerce/widget/{type} (existing widget_subrouter) which verifies HMAC

Security:
- API key lookup validates key is active + not deleted
- Rate limiting per key_id + per IP
- Domain restriction as secondary signal
- Signed URL includes timestamp + nonce to prevent replay attacks
- CORS: Access-Control-Allow-Origin: * (public endpoint, called from any merchant's storefront)

Endpoint:
- GET /widget/sign — returns JSON { "url": "https://server.nudgio.tech/ecommerce/widget/..." }
"""

import hmac as hmac_mod
import hashlib
import time
import secrets
import logging

from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from fastapi import Depends

from core.db import get_session
from core.config import settings
from ..models import WidgetAPIKey, EcommerceConnection
from ..utils.encryption_utils import decrypt_password
from ..utils.widget_auth_utils import check_widget_rate_limit, check_domain_restriction

logger = logging.getLogger(__name__)

# ==========================================
# Widget Sign Router
# ==========================================

router = APIRouter(prefix="/widget", tags=["Widget Sign"])


# ==========================================
# CORS Preflight
# ==========================================

@router.options("/sign")
async def sign_options():
    """CORS preflight handler for sign endpoint"""
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        },
    )


# ==========================================
# GET /widget/sign — Generate HMAC-Signed Widget URL
# ==========================================

@router.get("/sign")
async def sign_widget_url(
    request: Request,
    key_id: int = Query(..., description="Widget API key ID"),
    type: str = Query(..., description="Widget type: bestsellers, cross-sell, upsell, similar"),
    # Widget styling params (all optional, passed through to signed URL)
    product_id: str | None = Query(None, description="Product ID (required for cross-sell, upsell, similar)"),
    top: int = Query(4, description="Number of recommendations"),
    style: str = Query("card", description="Component style: card, carousel"),
    columns: int = Query(4, description="Max columns at full width (2–6)"),
    size: str = Query("default", description="Visual density: compact, default, spacious"),
    primary_color: str = Query("#3B82F6", description="Primary color hex"),
    text_color: str = Query("#1F2937", description="Text color hex"),
    bg_color: str = Query("#FFFFFF", description="Background color hex"),
    border_radius: str = Query("8px", description="Border radius CSS value"),
    lookback_days: int = Query(30, description="Lookback window in days"),
    method: str = Query("volume", description="Bestseller method: volume, value, balanced"),
    min_price_increase: int = Query(10, description="Min price increase % for upsell"),
    db: AsyncSession = Depends(get_session),
):
    """
    Generate an HMAC-signed widget URL for iframe embedding.

    This endpoint:
    1. Look up WidgetAPIKey by key_id (active, not deleted)
    2. Load the connection (active, not deleted)
    3. Check rate limit (per key_id + per client IP)
    4. Check domain restriction (referer vs allowed_domains)
    5. Decrypt API secret via Fernet
    6. Build params dict with all widget params + key_id + ts + nonce
    7. Sort params → urlencode → HMAC-SHA256 → hexdigest
    8. Build signed URL: {SERVER_URL}/ecommerce/widget/{type}?{params}&sig={sig}
    9. Return JSON { "url": signed_url }
    """
    cors_headers = {"Access-Control-Allow-Origin": "*"}

    # Step 1: Look up API key (active + not deleted)
    result = await db.execute(
        select(WidgetAPIKey).where(
            and_(
                WidgetAPIKey.id == key_id,
                WidgetAPIKey.is_active == True,
                WidgetAPIKey.deleted_at.is_(None),
            )
        )
    )
    api_key = result.scalar_one_or_none()
    if not api_key:
        return JSONResponse(
            status_code=403,
            content={"error": "Invalid or inactive API key"},
            headers=cors_headers,
        )

    # Step 2: Load connection (active + not deleted)
    conn_result = await db.execute(
        select(EcommerceConnection).where(
            and_(
                EcommerceConnection.id == api_key.connection_id,
                EcommerceConnection.is_active == True,
                EcommerceConnection.deleted_at.is_(None),
            )
        )
    )
    connection = conn_result.scalar_one_or_none()
    if not connection:
        return JSONResponse(
            status_code=403,
            content={"error": "Connection not found or inactive"},
            headers=cors_headers,
        )

    # Step 3: Rate limiting
    client_ip = request.client.host if request.client else "unknown"
    rate_ok = await check_widget_rate_limit(key_id, client_ip)
    if not rate_ok:
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded"},
            headers=cors_headers,
        )

    # Step 4: Domain restriction check
    referer = request.headers.get("referer")
    domain_ok = check_domain_restriction(api_key, referer)
    if not domain_ok:
        return JSONResponse(
            status_code=403,
            content={"error": "Domain not allowed"},
            headers=cors_headers,
        )

    # Step 5: Decrypt API secret
    try:
        decrypted_secret = decrypt_password(api_key.api_key_encrypted)
    except Exception:
        logger.error("Widget sign: failed to decrypt API key id=%s", key_id)
        return JSONResponse(
            status_code=500,
            content={"error": "Internal authentication error"},
            headers=cors_headers,
        )

    # Step 6: Build params dict
    params = {
        "key_id": str(key_id),
        "connection_id": str(connection.id),
        "ts": str(int(time.time())),
        "nonce": secrets.token_hex(16),
        "top": str(top),
        "style": style,
        "columns": str(columns),
        "size": size,
        "primary_color": primary_color,
        "text_color": text_color,
        "bg_color": bg_color,
        "border_radius": border_radius,
        "lookback_days": str(lookback_days),
        "method": method,
        "min_price_increase": str(min_price_increase),
    }

    # Only include product_id if provided (not needed for bestsellers)
    if product_id:
        params["product_id"] = product_id

    # Step 7: Sort → urlencode → HMAC-SHA256
    from urllib.parse import urlencode
    sorted_params = sorted(params.items())
    canonical = urlencode(sorted_params)

    sig = hmac_mod.new(
        decrypted_secret.encode("utf-8"),
        canonical.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    # Step 8: Build signed URL
    signed_url = f"{settings.SERVER_URL}/ecommerce/widget/{type}?{canonical}&sig={sig}"

    # Step 9: Return signed URL
    return JSONResponse(
        content={"url": signed_url},
        headers=cors_headers,
    )
