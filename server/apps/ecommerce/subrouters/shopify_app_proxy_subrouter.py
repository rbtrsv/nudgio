"""
Shopify App Proxy Subrouter

Public endpoints for storefront widget delivery via Shopify App Proxy.
No JWT auth, no session token — authenticated via Shopify HMAC signature only.

Storefront URL pattern:
    https://shop.myshopify.com/apps/nudgio-widget/{type}?top=4&style=card&...

Shopify intercepts the request and proxies it to:
    https://server.nudgio.tech/ecommerce/shopify/app-proxy/{type}?top=4&...&shop=...&signature=...&timestamp=...

Endpoints:
- GET /shopify/app-proxy/bestsellers — bestseller widget HTML
- GET /shopify/app-proxy/cross-sell — cross-sell widget HTML (requires product_id)
- GET /shopify/app-proxy/upsell — upsell widget HTML (requires product_id)
- GET /shopify/app-proxy/similar — similar products widget HTML (requires product_id)

Auth: HMAC-SHA256 hex signature via 'signature' query parameter.
Same algorithm as OAuth callback (_verify_hmac in shopify_oauth_subrouter.py),
but param name is 'signature' instead of 'hmac'.

All responses are HTMLResponse (including errors) because these render inside
an iframe on the merchant's storefront.
"""

import hmac as hmac_mod
import hashlib
import logging

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from core.db import get_session
from core.config import settings
from ..models import EcommerceConnection, RecommendationSettings
from ..schemas.recommendation_schemas import BestsellerMethod
from ..adapters.factory import get_adapter
from ..engine.engine import RecommendationEngine
from ..utils.cache_utils import get_cached_recommendations, set_cached_recommendations
from ..utils.subscription_utils import is_service_active
from .components_subrouter import generate_recommendation_html, get_default_shop_urls

logger = logging.getLogger(__name__)

# ==========================================
# Shopify App Proxy Router
# ==========================================

router = APIRouter(prefix="/shopify/app-proxy", tags=["Shopify App Proxy"])


# ==========================================
# HMAC Verification (App Proxy — NOT same as OAuth)
# ==========================================

def _verify_proxy_signature(request: Request, client_secret: str) -> bool:
    """
    Verify Shopify App Proxy HMAC-SHA256 signature.

    DIFFERENT from OAuth callback (_verify_hmac in shopify_oauth_subrouter.py).
    App Proxy uses a different join format.

    Follows Shopify App Proxy authentication docs exactly:
    https://shopify.dev/docs/apps/build/online-store/app-proxies/authenticate-app-proxies

    Algorithm (matching Ruby reference):
        query_hash = Rack::Utils.parse_query(query_string)
        signature = query_hash.delete("signature")
        sorted_params = query_hash.collect{ |k, v| "#{k}=#{Array(v).join(',')}" }.sort.join
        calculated = OpenSSL::HMAC.hexdigest('sha256', secret, sorted_params)

    Key differences from OAuth HMAC:
    - Values are URL-decoded (not raw encoded)
    - Duplicate keys are joined with comma: key=v1,v2
    - Sorted key=value pairs are concatenated WITHOUT separator (no &)
    - HMAC-SHA256 hex digest with Client Secret
    """
    from urllib.parse import unquote, parse_qs

    # Step 1: Parse query string with URL decoding, preserve duplicate keys
    # parse_qs returns {key: [val1, val2, ...]} with decoded values
    raw_qs = str(request.url.query)
    parsed = parse_qs(raw_qs, keep_blank_values=True)

    # Step 2: Extract and remove signature
    signature_list = parsed.pop("signature", [])
    received_signature = signature_list[0] if signature_list else ""

    if not received_signature:
        return False

    # Step 3: Build sorted params string
    # Duplicate key values joined with comma, then sorted alphabetically, then concatenated (no separator)
    param_strings = []
    for key, values in parsed.items():
        # Join multiple values with comma (e.g., extra=1&extra=2 → extra=1,2)
        joined_value = ",".join(values)
        param_strings.append(f"{key}={joined_value}")

    # Sort alphabetically and concatenate WITHOUT separator (Shopify's .sort.join with no arg)
    param_strings.sort()
    sorted_params = "".join(param_strings)

    # Step 4: HMAC-SHA256 hex digest
    computed = hmac_mod.new(
        client_secret.encode("utf-8"),
        sorted_params.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    # Step 5: Timing-safe compare
    return hmac_mod.compare_digest(computed, received_signature)


# ==========================================
# Connection Lookup (by shop domain)
# ==========================================

async def _get_connection_by_shop(shop: str, db: AsyncSession) -> EcommerceConnection | None:
    """
    Look up active Shopify connection by shop domain.

    Deterministic: most recent active connection for this shop.
    Filters: platform=shopify, store_url=shop, is_active=True, not soft-deleted.
    """
    result = await db.execute(
        select(EcommerceConnection).where(
            and_(
                EcommerceConnection.platform == "shopify",
                EcommerceConnection.store_url == shop,
                EcommerceConnection.is_active == True,
                EcommerceConnection.deleted_at.is_(None),
            )
        ).order_by(EcommerceConnection.created_at.desc()).limit(1)
    )
    return result.scalars().first()


# ==========================================
# Error HTML Templates
# ==========================================

def _error_html(message: str) -> str:
    """Generate minimal error HTML for iframe display."""
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="display:flex;align-items:center;justify-content:center;min-height:100px;font-family:sans-serif;color:#6B7280;">
    <p>{message}</p>
</body>
</html>"""


# ==========================================
# GET /bestsellers — Bestseller Widget
# ==========================================

@router.get("/bestsellers", response_class=HTMLResponse)
async def get_bestsellers_widget(
    request: Request,
    shop: str = Query("", description="Shopify store domain (added by Shopify App Proxy)"),
    top: int = Query(4, description="Number of recommendations to show"),
    lookback_days: int = Query(30, description="Number of days to look back for order data"),
    method: str = Query("volume", description="Bestseller calculation method: volume, value, or balanced"),
    style: str = Query("card", description="Component style: card, carousel, list"),
    device: str = Query("desktop", description="Target device: desktop, mobile"),
    primary_color: str = Query("#3B82F6", description="Primary color hex"),
    text_color: str = Query("#1F2937", description="Text color hex"),
    bg_color: str = Query("#FFFFFF", description="Background color hex"),
    border_radius: str = Query("8px", description="Border radius"),
    db: AsyncSession = Depends(get_session),
):
    """
    Serve bestseller recommendation widget HTML via Shopify App Proxy.

    Public endpoint — no JWT, no session token. Authenticated via Shopify HMAC
    signature in query params. Returns HTML for iframe rendering on storefront.

    This endpoint:
    1. Verify HMAC-SHA256 signature from 'signature' query param
    2. Look up active Shopify connection by 'shop' domain
    3. Check entitlement (active subscription or free tier within limits)
    4. Get RecommendationSettings for shop URL configuration
    5. Create adapter + engine, check cache or generate bestseller recommendations
    6. Generate HTML widget via generate_recommendation_html
    7. Return HTMLResponse for iframe rendering
    """
    try:
        # Step 1: Verify HMAC signature
        if not settings.SHOPIFY_CLIENT_SECRET:
            logger.error("App Proxy: SHOPIFY_CLIENT_SECRET not configured")
            return HTMLResponse(content=_error_html("Widget not available"), status_code=500)

        if not _verify_proxy_signature(request, settings.SHOPIFY_CLIENT_SECRET):
            logger.warning(f"App Proxy: HMAC verification failed for shop={shop}")
            return HTMLResponse(content=_error_html("Unauthorized"), status_code=401)

        # Step 2: Look up connection by shop domain
        connection = await _get_connection_by_shop(shop, db)
        if not connection:
            logger.warning(f"App Proxy: no active connection for shop={shop}")
            return HTMLResponse(content=_error_html("Widget not available"), status_code=404)

        # Step 3: Check entitlement (active subscription or free tier)
        service_active = await is_service_active(connection.organization_id, db)
        if not service_active:
            logger.info(f"App Proxy: service inactive for shop={shop}, org_id={connection.organization_id}")
            return HTMLResponse(
                content=_error_html("Widget unavailable — subscription required"),
                status_code=403,
            )

        # Step 4: Get shop URL settings
        settings_result = await db.execute(
            select(RecommendationSettings).where(
                RecommendationSettings.connection_id == connection.id
            )
        )
        rec_settings = settings_result.scalar_one_or_none()
        shop_urls = get_default_shop_urls(connection, rec_settings)

        # Step 5: Create adapter + engine, check cache or generate
        adapter = get_adapter(connection)
        engine = RecommendationEngine(adapter)

        cached = await get_cached_recommendations(
            connection.id, "bestseller",
            limit=top, method=method, lookback_days=lookback_days,
        )
        if cached is not None:
            recs = cached
        else:
            method_enum = BestsellerMethod(method) if method in [m.value for m in BestsellerMethod] else BestsellerMethod.VOLUME
            recs = await engine.get_bestsellers(limit=top, lookback_days=lookback_days, method=method_enum)
            await set_cached_recommendations(
                connection.id, "bestseller", recs,
                limit=top, method=method, lookback_days=lookback_days,
            )

        # Step 6: Generate HTML widget
        html = generate_recommendation_html(
            recommendations=recs,
            style=style,
            device=device,
            colors={"primary": primary_color, "text": text_color, "bg": bg_color},
            border_radius=border_radius,
            rec_type="bestseller",
            shop_urls=shop_urls,
        )

        # Step 7: Return HTMLResponse
        return HTMLResponse(content=html)

    except Exception as e:
        logger.error(f"App Proxy bestsellers error for shop={shop}: {str(e)}")
        return HTMLResponse(content=_error_html("Error loading recommendations"), status_code=500)


# ==========================================
# GET /cross-sell — Cross-Sell Widget
# ==========================================

@router.get("/cross-sell", response_class=HTMLResponse)
async def get_cross_sell_widget(
    request: Request,
    shop: str = Query("", description="Shopify store domain (added by Shopify App Proxy)"),
    product_id: str = Query(..., description="Product ID for cross-sell recommendations"),
    top: int = Query(4, description="Number of recommendations to show"),
    lookback_days: int = Query(30, description="Number of days to look back for order data"),
    style: str = Query("card", description="Component style: card, carousel, list"),
    device: str = Query("desktop", description="Target device: desktop, mobile"),
    primary_color: str = Query("#3B82F6", description="Primary color hex"),
    text_color: str = Query("#1F2937", description="Text color hex"),
    bg_color: str = Query("#FFFFFF", description="Background color hex"),
    border_radius: str = Query("8px", description="Border radius"),
    db: AsyncSession = Depends(get_session),
):
    """
    Serve cross-sell recommendation widget HTML via Shopify App Proxy.

    Public endpoint — no JWT, no session token. Authenticated via Shopify HMAC
    signature in query params. Returns HTML for iframe rendering on storefront.

    This endpoint:
    1. Verify HMAC-SHA256 signature from 'signature' query param
    2. Look up active Shopify connection by 'shop' domain
    3. Check entitlement (active subscription or free tier within limits)
    4. Get RecommendationSettings for shop URL configuration
    5. Create adapter + engine, check cache or generate cross-sell recommendations
    6. Generate HTML widget via generate_recommendation_html
    7. Return HTMLResponse for iframe rendering
    """
    try:
        # Step 1: Verify HMAC signature
        if not settings.SHOPIFY_CLIENT_SECRET:
            logger.error("App Proxy: SHOPIFY_CLIENT_SECRET not configured")
            return HTMLResponse(content=_error_html("Widget not available"), status_code=500)

        if not _verify_proxy_signature(request, settings.SHOPIFY_CLIENT_SECRET):
            logger.warning(f"App Proxy: HMAC verification failed for shop={shop}")
            return HTMLResponse(content=_error_html("Unauthorized"), status_code=401)

        # Step 2: Look up connection by shop domain
        connection = await _get_connection_by_shop(shop, db)
        if not connection:
            logger.warning(f"App Proxy: no active connection for shop={shop}")
            return HTMLResponse(content=_error_html("Widget not available"), status_code=404)

        # Step 3: Check entitlement (active subscription or free tier)
        service_active = await is_service_active(connection.organization_id, db)
        if not service_active:
            logger.info(f"App Proxy: service inactive for shop={shop}, org_id={connection.organization_id}")
            return HTMLResponse(
                content=_error_html("Widget unavailable — subscription required"),
                status_code=403,
            )

        # Step 4: Get shop URL settings
        settings_result = await db.execute(
            select(RecommendationSettings).where(
                RecommendationSettings.connection_id == connection.id
            )
        )
        rec_settings = settings_result.scalar_one_or_none()
        shop_urls = get_default_shop_urls(connection, rec_settings)

        # Step 5: Create adapter + engine, check cache or generate
        adapter = get_adapter(connection)
        engine = RecommendationEngine(adapter)

        cached = await get_cached_recommendations(
            connection.id, "cross_sell",
            product_id=product_id, limit=top, lookback_days=lookback_days,
        )
        if cached is not None:
            recs = cached
        else:
            recs = await engine.get_cross_sell(product_id=product_id, limit=top, lookback_days=lookback_days)
            await set_cached_recommendations(
                connection.id, "cross_sell", recs,
                product_id=product_id, limit=top, lookback_days=lookback_days,
            )

        # Step 6: Generate HTML widget
        html = generate_recommendation_html(
            recommendations=recs,
            style=style,
            device=device,
            colors={"primary": primary_color, "text": text_color, "bg": bg_color},
            border_radius=border_radius,
            rec_type="cross-sell",
            shop_urls=shop_urls,
        )

        # Step 7: Return HTMLResponse
        return HTMLResponse(content=html)

    except Exception as e:
        logger.error(f"App Proxy cross-sell error for shop={shop}: {str(e)}")
        return HTMLResponse(content=_error_html("Error loading recommendations"), status_code=500)


# ==========================================
# GET /upsell — Upsell Widget
# ==========================================

@router.get("/upsell", response_class=HTMLResponse)
async def get_upsell_widget(
    request: Request,
    shop: str = Query("", description="Shopify store domain (added by Shopify App Proxy)"),
    product_id: str = Query(..., description="Product ID for upsell recommendations"),
    top: int = Query(4, description="Number of recommendations to show"),
    min_price_increase_percent: int = Query(10, description="Minimum price increase percentage for upsell candidates"),
    style: str = Query("card", description="Component style: card, carousel, list"),
    device: str = Query("desktop", description="Target device: desktop, mobile"),
    primary_color: str = Query("#3B82F6", description="Primary color hex"),
    text_color: str = Query("#1F2937", description="Text color hex"),
    bg_color: str = Query("#FFFFFF", description="Background color hex"),
    border_radius: str = Query("8px", description="Border radius"),
    db: AsyncSession = Depends(get_session),
):
    """
    Serve upsell recommendation widget HTML via Shopify App Proxy.

    Public endpoint — no JWT, no session token. Authenticated via Shopify HMAC
    signature in query params. Returns HTML for iframe rendering on storefront.

    This endpoint:
    1. Verify HMAC-SHA256 signature from 'signature' query param
    2. Look up active Shopify connection by 'shop' domain
    3. Check entitlement (active subscription or free tier within limits)
    4. Get RecommendationSettings for shop URL configuration
    5. Create adapter + engine, check cache or generate upsell recommendations
    6. Generate HTML widget via generate_recommendation_html
    7. Return HTMLResponse for iframe rendering
    """
    try:
        # Step 1: Verify HMAC signature
        if not settings.SHOPIFY_CLIENT_SECRET:
            logger.error("App Proxy: SHOPIFY_CLIENT_SECRET not configured")
            return HTMLResponse(content=_error_html("Widget not available"), status_code=500)

        if not _verify_proxy_signature(request, settings.SHOPIFY_CLIENT_SECRET):
            logger.warning(f"App Proxy: HMAC verification failed for shop={shop}")
            return HTMLResponse(content=_error_html("Unauthorized"), status_code=401)

        # Step 2: Look up connection by shop domain
        connection = await _get_connection_by_shop(shop, db)
        if not connection:
            logger.warning(f"App Proxy: no active connection for shop={shop}")
            return HTMLResponse(content=_error_html("Widget not available"), status_code=404)

        # Step 3: Check entitlement (active subscription or free tier)
        service_active = await is_service_active(connection.organization_id, db)
        if not service_active:
            logger.info(f"App Proxy: service inactive for shop={shop}, org_id={connection.organization_id}")
            return HTMLResponse(
                content=_error_html("Widget unavailable — subscription required"),
                status_code=403,
            )

        # Step 4: Get shop URL settings
        settings_result = await db.execute(
            select(RecommendationSettings).where(
                RecommendationSettings.connection_id == connection.id
            )
        )
        rec_settings = settings_result.scalar_one_or_none()
        shop_urls = get_default_shop_urls(connection, rec_settings)

        # Step 5: Create adapter + engine, check cache or generate
        adapter = get_adapter(connection)
        engine = RecommendationEngine(adapter)

        cached = await get_cached_recommendations(
            connection.id, "upsell",
            product_id=product_id, limit=top, min_price_increase_percent=min_price_increase_percent,
        )
        if cached is not None:
            recs = cached
        else:
            recs = await engine.get_upsell(product_id=product_id, limit=top, min_price_increase_percent=min_price_increase_percent)
            await set_cached_recommendations(
                connection.id, "upsell", recs,
                product_id=product_id, limit=top, min_price_increase_percent=min_price_increase_percent,
            )

        # Step 6: Generate HTML widget
        html = generate_recommendation_html(
            recommendations=recs,
            style=style,
            device=device,
            colors={"primary": primary_color, "text": text_color, "bg": bg_color},
            border_radius=border_radius,
            rec_type="upsell",
            shop_urls=shop_urls,
        )

        # Step 7: Return HTMLResponse
        return HTMLResponse(content=html)

    except Exception as e:
        logger.error(f"App Proxy upsell error for shop={shop}: {str(e)}")
        return HTMLResponse(content=_error_html("Error loading recommendations"), status_code=500)


# ==========================================
# GET /similar — Similar Products Widget
# ==========================================

@router.get("/similar", response_class=HTMLResponse)
async def get_similar_widget(
    request: Request,
    shop: str = Query("", description="Shopify store domain (added by Shopify App Proxy)"),
    product_id: str = Query(..., description="Product ID for similar product recommendations"),
    top: int = Query(4, description="Number of recommendations to show"),
    style: str = Query("card", description="Component style: card, carousel, list"),
    device: str = Query("desktop", description="Target device: desktop, mobile"),
    primary_color: str = Query("#3B82F6", description="Primary color hex"),
    text_color: str = Query("#1F2937", description="Text color hex"),
    bg_color: str = Query("#FFFFFF", description="Background color hex"),
    border_radius: str = Query("8px", description="Border radius"),
    db: AsyncSession = Depends(get_session),
):
    """
    Serve similar products recommendation widget HTML via Shopify App Proxy.

    Public endpoint — no JWT, no session token. Authenticated via Shopify HMAC
    signature in query params. Returns HTML for iframe rendering on storefront.

    This endpoint:
    1. Verify HMAC-SHA256 signature from 'signature' query param
    2. Look up active Shopify connection by 'shop' domain
    3. Check entitlement (active subscription or free tier within limits)
    4. Get RecommendationSettings for shop URL configuration
    5. Create adapter + engine, check cache or generate similar product recommendations
    6. Generate HTML widget via generate_recommendation_html
    7. Return HTMLResponse for iframe rendering
    """
    try:
        # Step 1: Verify HMAC signature
        if not settings.SHOPIFY_CLIENT_SECRET:
            logger.error("App Proxy: SHOPIFY_CLIENT_SECRET not configured")
            return HTMLResponse(content=_error_html("Widget not available"), status_code=500)

        if not _verify_proxy_signature(request, settings.SHOPIFY_CLIENT_SECRET):
            logger.warning(f"App Proxy: HMAC verification failed for shop={shop}")
            return HTMLResponse(content=_error_html("Unauthorized"), status_code=401)

        # Step 2: Look up connection by shop domain
        connection = await _get_connection_by_shop(shop, db)
        if not connection:
            logger.warning(f"App Proxy: no active connection for shop={shop}")
            return HTMLResponse(content=_error_html("Widget not available"), status_code=404)

        # Step 3: Check entitlement (active subscription or free tier)
        service_active = await is_service_active(connection.organization_id, db)
        if not service_active:
            logger.info(f"App Proxy: service inactive for shop={shop}, org_id={connection.organization_id}")
            return HTMLResponse(
                content=_error_html("Widget unavailable — subscription required"),
                status_code=403,
            )

        # Step 4: Get shop URL settings
        settings_result = await db.execute(
            select(RecommendationSettings).where(
                RecommendationSettings.connection_id == connection.id
            )
        )
        rec_settings = settings_result.scalar_one_or_none()
        shop_urls = get_default_shop_urls(connection, rec_settings)

        # Step 5: Create adapter + engine, check cache or generate
        adapter = get_adapter(connection)
        engine = RecommendationEngine(adapter)

        cached = await get_cached_recommendations(
            connection.id, "similar",
            product_id=product_id, limit=top,
        )
        if cached is not None:
            recs = cached
        else:
            recs = await engine.get_similar(product_id=product_id, limit=top)
            await set_cached_recommendations(
                connection.id, "similar", recs,
                product_id=product_id, limit=top,
            )

        # Step 6: Generate HTML widget
        html = generate_recommendation_html(
            recommendations=recs,
            style=style,
            device=device,
            colors={"primary": primary_color, "text": text_color, "bg": bg_color},
            border_radius=border_radius,
            rec_type="similar",
            shop_urls=shop_urls,
        )

        # Step 7: Return HTMLResponse
        return HTMLResponse(content=html)

    except Exception as e:
        logger.error(f"App Proxy similar error for shop={shop}: {str(e)}")
        return HTMLResponse(content=_error_html("Error loading recommendations"), status_code=500)
