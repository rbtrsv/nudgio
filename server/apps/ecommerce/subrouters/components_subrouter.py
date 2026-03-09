from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List, Dict
from core.db import get_session
from apps.accounts.models import User
from apps.accounts.utils.auth_utils import get_current_user
from ..models import EcommerceConnection, RecommendationSettings, IngestedProduct
from ..schemas.ecommerce_connection_schemas import PlatformType
from ..schemas.recommendation_schemas import BestsellerMethod
from ..adapters.factory import get_adapter
from ..engine.engine import RecommendationEngine
from ..utils.dependency_utils import get_active_connection, enforce_monthly_order_limit
from ..utils.cache_utils import get_cached_recommendations, set_cached_recommendations

router = APIRouter(
    prefix="/components",
    tags=["Product Component Recommendations"],
    dependencies=[Depends(enforce_monthly_order_limit)],
)


# ==========================================
# Image Aspect Ratio Map — Tailwind classes per aspect ratio option
# ==========================================

IMAGE_ASPECT_MAP = {
    "square": "aspect-square",       # 1:1
    "portrait": "aspect-[3/4]",      # 3:4
    "landscape": "aspect-video",     # 16:9
}


# ==========================================
# Size Map — proportional CSS classes per size tier
# ==========================================

SIZE_MAP = {
    "compact": {
        "title_text": "text-xs",
        "price_text": "text-sm",
        "card_padding": "p-2",
        "button_padding": "px-2 py-1",
        "button_text": "text-xs",
        "grid_gap": "gap-2",
        "title_truncate": 25,
        "heading_text": "text-base",
        "heading_margin": "mb-2",
        "container_padding": "p-2",
        "shadow": "shadow-sm hover:shadow-md",
        "carousel_card_width": "w-48",
        "carousel_gap": "space-x-2",
    },
    "default": {
        "title_text": "text-sm",
        "price_text": "text-lg",
        "card_padding": "p-4",
        "button_padding": "px-4 py-2",
        "button_text": "text-sm",
        "grid_gap": "gap-4",
        "title_truncate": 50,
        "heading_text": "text-xl",
        "heading_margin": "mb-4",
        "container_padding": "p-4",
        "shadow": "shadow-md hover:shadow-lg",
        "carousel_card_width": "w-64",
        "carousel_gap": "space-x-4",
    },
    "spacious": {
        "title_text": "text-base",
        "price_text": "text-xl",
        "card_padding": "p-6",
        "button_padding": "px-6 py-3",
        "button_text": "text-base",
        "grid_gap": "gap-6",
        "title_truncate": 60,
        "heading_text": "text-2xl",
        "heading_margin": "mb-6",
        "container_padding": "p-6",
        "shadow": "shadow-lg hover:shadow-xl",
        "carousel_card_width": "w-80",
        "carousel_gap": "space-x-6",
    },
}


# ==========================================
# Hardcoded Visual Defaults — single source of truth
# ==========================================

VISUAL_DEFAULTS = {
    "style": "card",
    "columns": 4,
    "size": "default",
    "primary_color": "#3B82F6",
    "text_color": "#1F2937",
    "bg_color": "#FFFFFF",
    "border_radius": "8px",
    "cta_text": "View",
    "show_price": True,
    "image_aspect": "square",
    "widget_title": "",
}

# Maps URL param names to DB column names on RecommendationSettings
_URL_TO_DB_MAP = {
    "style": "widget_style",
    "columns": "widget_columns",
    "size": "widget_size",
    "primary_color": "primary_color",
    "text_color": "text_color",
    "bg_color": "bg_color",
    "border_radius": "border_radius",
    "cta_text": "cta_text",
    "show_price": "show_price",
    "image_aspect": "image_aspect",
    "widget_title": "widget_title",
}


def apply_visual_defaults(
    settings: Optional[RecommendationSettings],
    *,
    style: str,
    columns: int,
    size: str,
    primary_color: str,
    text_color: str,
    bg_color: str,
    border_radius: str,
    cta_text: str,
    show_price: bool,
    image_aspect: str,
    widget_title: str,
) -> Dict[str, any]:
    """
    Apply the fallback chain: URL param (explicit) → DB brand defaults → hardcoded defaults.

    For each visual parameter:
    - URL value != hardcoded default → user explicitly set it → use URL value
    - URL value == hardcoded default AND DB has value → use DB value
    - URL value == hardcoded default AND DB is None → keep hardcoded default

    Returns a dict with resolved values keyed by URL param names.
    """
    url_values = {
        "style": style,
        "columns": columns,
        "size": size,
        "primary_color": primary_color,
        "text_color": text_color,
        "bg_color": bg_color,
        "border_radius": border_radius,
        "cta_text": cta_text,
        "show_price": show_price,
        "image_aspect": image_aspect,
        "widget_title": widget_title,
    }

    resolved = {}
    for param_name, url_val in url_values.items():
        hardcoded = VISUAL_DEFAULTS[param_name]
        db_col = _URL_TO_DB_MAP[param_name]

        if url_val != hardcoded:
            # URL value differs from hardcoded → user explicitly set it → use URL value
            resolved[param_name] = url_val
        elif settings is not None and getattr(settings, db_col, None) is not None:
            # URL value matches hardcoded AND DB has a saved value → use DB value
            resolved[param_name] = getattr(settings, db_col)
        else:
            # URL value matches hardcoded AND DB is None → keep hardcoded default
            resolved[param_name] = hardcoded

    return resolved


def get_default_shop_urls(connection: EcommerceConnection, settings: Optional[RecommendationSettings]) -> Dict[str, str]:
    """Get shop URLs from settings or defaults by platform"""
    if settings and settings.shop_base_url and settings.product_url_template:
        return {
            "base_url": settings.shop_base_url,
            "product_template": settings.product_url_template
        }

    # Strip protocol from store_url if already present (store_url is stored as "https://domain.com")
    raw_host = connection.store_url or connection.db_host or ""
    raw_host = raw_host.removeprefix("https://").removeprefix("http://").rstrip("/")

    # Default URL patterns by platform
    defaults = {
        PlatformType.SHOPIFY.value: {
            "base_url": f"https://{raw_host}",  # Shopify store domain
            "product_template": "/products/{handle}"
        },
        PlatformType.WOOCOMMERCE.value: {
            "base_url": f"https://{raw_host}",  # WordPress site domain
            "product_template": "/product/{handle}"
        },
        PlatformType.MAGENTO.value: {
            "base_url": f"https://{raw_host}",  # Magento store domain
            "product_template": "/catalog/product/view/id/{id}"
        }
    }

    return defaults.get(connection.platform, {
        "base_url": f"https://{raw_host}",
        "product_template": "/products/{handle}"
    })


async def _check_ingest_has_data(connection: EcommerceConnection, session: AsyncSession) -> Optional[JSONResponse]:
    """
    Check if an ingest connection has ingested data (products).

    For ingest connections with zero products, returns a JSON response
    with waiting_for_data status instead of letting the engine fail
    with a cryptic error.

    Returns:
        JSONResponse if no data (caller should return it), None if data exists
    """
    if connection.connection_method != "ingest":
        return None

    result = await session.execute(
        select(func.count()).select_from(IngestedProduct).where(
            IngestedProduct.connection_id == connection.id
        )
    )
    product_count = result.scalar() or 0

    if product_count == 0:
        return JSONResponse(
            status_code=200,
            content={
                "status": "waiting_for_data",
                "message": "Connection is active but no data has been ingested yet. Push product and order data via the API to generate recommendations.",
            },
        )

    return None


@router.get("/bestsellers", response_class=HTMLResponse)
async def get_bestsellers_component(
    connection_id: int = Query(..., description="Connection ID to use for recommendations"),
    top: int = Query(4, description="Number of recommendations to show"),
    lookback_days: int = Query(30, description="Number of days to look back for order data"),
    method: str = Query("volume", description="Bestseller calculation method: volume, value, or balanced"),
    style: str = Query("card", description="Component style: card, carousel"),
    device: str = Query("desktop", description="Target device: desktop, mobile"),
    columns: int = Query(4, description="Max columns at full width (2–6)"),
    size: str = Query("default", description="Visual density: compact, default, spacious"),
    primary_color: str = Query("#3B82F6", description="Primary color hex"),
    text_color: str = Query("#1F2937", description="Text color hex"),
    bg_color: str = Query("#FFFFFF", description="Background color hex"),
    border_radius: str = Query("8px", description="Border radius"),
    widget_title: str = Query("", description="Custom widget title (empty = auto-default by widget type)"),
    cta_text: str = Query("View", description="Call-to-action button text"),
    show_price: bool = Query(True, description="Show product price"),
    image_aspect: str = Query("square", description="Image aspect ratio: square, portrait, landscape"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get bestsellers HTML component"""
    try:
        connection = await get_active_connection(connection_id, current_user.id, session)

        # Check if ingest connection has data before attempting recommendations
        no_data_response = await _check_ingest_has_data(connection, session)
        if no_data_response:
            return no_data_response

        # Get shop URL settings
        settings_result = await session.execute(
            select(RecommendationSettings).where(
                RecommendationSettings.connection_id == connection_id
            )
        )
        settings = settings_result.scalar_one_or_none()

        # Default URLs by platform if not configured
        shop_urls = get_default_shop_urls(connection, settings)

        # Apply visual defaults fallback chain: URL param → DB brand defaults → hardcoded
        vis = apply_visual_defaults(
            settings, style=style, columns=columns, size=size,
            primary_color=primary_color, text_color=text_color, bg_color=bg_color,
            border_radius=border_radius, cta_text=cta_text, show_price=show_price,
            image_aspect=image_aspect, widget_title=widget_title,
        )

        adapter = get_adapter(connection, session)
        engine = RecommendationEngine(adapter)

        # Check cache first
        cached = await get_cached_recommendations(
            connection_id, "bestseller",
            limit=top, method=method, lookback_days=lookback_days,
        )
        if cached is not None:
            recs = cached
        else:
            # Generate bestseller recommendations (cache miss)
            method_enum = BestsellerMethod(method) if method in [m.value for m in BestsellerMethod] else BestsellerMethod.VOLUME
            recs = await engine.get_bestsellers(limit=top, lookback_days=lookback_days, method=method_enum)
            # Cache for next request
            await set_cached_recommendations(
                connection_id, "bestseller", recs,
                limit=top, method=method, lookback_days=lookback_days,
            )

        # Generate HTML component
        html = generate_recommendation_html(
            recommendations=recs,
            style=vis["style"],
            device=device,
            columns=vis["columns"],
            size=vis["size"],
            colors={
                "primary": vis["primary_color"],
                "text": vis["text_color"],
                "bg": vis["bg_color"],
            },
            border_radius=vis["border_radius"],
            rec_type="bestseller",
            shop_urls=shop_urls,
            widget_title=vis["widget_title"],
            cta_text=vis["cta_text"],
            show_price=vis["show_price"],
            image_aspect=vis["image_aspect"],
        )

        return HTMLResponse(content=html)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating component: {str(e)}")


@router.get("/cross-sell", response_class=HTMLResponse)
async def get_cross_sell_component(
    connection_id: int = Query(..., description="Connection ID to use for recommendations"),
    product_id: str = Query(..., description="Product ID for cross-sell recommendations"),
    top: int = Query(4, description="Number of recommendations to show"),
    lookback_days: int = Query(30, description="Number of days to look back for order data"),
    style: str = Query("card", description="Component style: card, carousel"),
    device: str = Query("desktop", description="Target device: desktop, mobile"),
    columns: int = Query(4, description="Max columns at full width (2–6)"),
    size: str = Query("default", description="Visual density: compact, default, spacious"),
    primary_color: str = Query("#3B82F6", description="Primary color hex"),
    text_color: str = Query("#1F2937", description="Text color hex"),
    bg_color: str = Query("#FFFFFF", description="Background color hex"),
    border_radius: str = Query("8px", description="Border radius"),
    widget_title: str = Query("", description="Custom widget title (empty = auto-default by widget type)"),
    cta_text: str = Query("View", description="Call-to-action button text"),
    show_price: bool = Query(True, description="Show product price"),
    image_aspect: str = Query("square", description="Image aspect ratio: square, portrait, landscape"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get cross-sell HTML component"""
    try:
        connection = await get_active_connection(connection_id, current_user.id, session)

        # Check if ingest connection has data before attempting recommendations
        no_data_response = await _check_ingest_has_data(connection, session)
        if no_data_response:
            return no_data_response

        # Get shop URL settings
        settings_result = await session.execute(
            select(RecommendationSettings).where(
                RecommendationSettings.connection_id == connection_id
            )
        )
        settings = settings_result.scalar_one_or_none()

        # Default URLs by platform if not configured
        shop_urls = get_default_shop_urls(connection, settings)

        # Apply visual defaults fallback chain: URL param → DB brand defaults → hardcoded
        vis = apply_visual_defaults(
            settings, style=style, columns=columns, size=size,
            primary_color=primary_color, text_color=text_color, bg_color=bg_color,
            border_radius=border_radius, cta_text=cta_text, show_price=show_price,
            image_aspect=image_aspect, widget_title=widget_title,
        )

        adapter = get_adapter(connection, session)
        engine = RecommendationEngine(adapter)

        # Check cache first
        cached = await get_cached_recommendations(
            connection_id, "cross_sell",
            product_id=product_id, limit=top, lookback_days=lookback_days,
        )
        if cached is not None:
            recs = cached
        else:
            # Generate cross-sell recommendations (cache miss)
            recs = await engine.get_cross_sell(product_id=product_id, limit=top, lookback_days=lookback_days)
            # Cache for next request
            await set_cached_recommendations(
                connection_id, "cross_sell", recs,
                product_id=product_id, limit=top, lookback_days=lookback_days,
            )

        # Generate HTML component
        html = generate_recommendation_html(
            recommendations=recs,
            style=vis["style"],
            device=device,
            columns=vis["columns"],
            size=vis["size"],
            colors={
                "primary": vis["primary_color"],
                "text": vis["text_color"],
                "bg": vis["bg_color"],
            },
            border_radius=vis["border_radius"],
            rec_type="cross-sell",
            shop_urls=shop_urls,
            widget_title=vis["widget_title"],
            cta_text=vis["cta_text"],
            show_price=vis["show_price"],
            image_aspect=vis["image_aspect"],
        )

        return HTMLResponse(content=html)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating component: {str(e)}")


@router.get("/upsell", response_class=HTMLResponse)
async def get_upsell_component(
    connection_id: int = Query(..., description="Connection ID to use for recommendations"),
    product_id: str = Query(..., description="Product ID for upsell recommendations"),
    top: int = Query(4, description="Number of recommendations to show"),
    min_price_increase_percent: int = Query(10, description="Minimum price increase percentage for upsell candidates"),
    style: str = Query("card", description="Component style: card, carousel"),
    device: str = Query("desktop", description="Target device: desktop, mobile"),
    columns: int = Query(4, description="Max columns at full width (2–6)"),
    size: str = Query("default", description="Visual density: compact, default, spacious"),
    primary_color: str = Query("#3B82F6", description="Primary color hex"),
    text_color: str = Query("#1F2937", description="Text color hex"),
    bg_color: str = Query("#FFFFFF", description="Background color hex"),
    border_radius: str = Query("8px", description="Border radius"),
    widget_title: str = Query("", description="Custom widget title (empty = auto-default by widget type)"),
    cta_text: str = Query("View", description="Call-to-action button text"),
    show_price: bool = Query(True, description="Show product price"),
    image_aspect: str = Query("square", description="Image aspect ratio: square, portrait, landscape"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get upsell HTML component"""
    try:
        connection = await get_active_connection(connection_id, current_user.id, session)

        # Check if ingest connection has data before attempting recommendations
        no_data_response = await _check_ingest_has_data(connection, session)
        if no_data_response:
            return no_data_response

        # Get shop URL settings
        settings_result = await session.execute(
            select(RecommendationSettings).where(
                RecommendationSettings.connection_id == connection_id
            )
        )
        settings = settings_result.scalar_one_or_none()

        # Default URLs by platform if not configured
        shop_urls = get_default_shop_urls(connection, settings)

        # Apply visual defaults fallback chain: URL param → DB brand defaults → hardcoded
        vis = apply_visual_defaults(
            settings, style=style, columns=columns, size=size,
            primary_color=primary_color, text_color=text_color, bg_color=bg_color,
            border_radius=border_radius, cta_text=cta_text, show_price=show_price,
            image_aspect=image_aspect, widget_title=widget_title,
        )

        adapter = get_adapter(connection, session)
        engine = RecommendationEngine(adapter)

        # Check cache first
        cached = await get_cached_recommendations(
            connection_id, "upsell",
            product_id=product_id, limit=top, min_price_increase_percent=min_price_increase_percent,
        )
        if cached is not None:
            recs = cached
        else:
            # Generate upsell recommendations (cache miss)
            recs = await engine.get_upsell(product_id=product_id, limit=top, min_price_increase_percent=min_price_increase_percent)
            # Cache for next request
            await set_cached_recommendations(
                connection_id, "upsell", recs,
                product_id=product_id, limit=top, min_price_increase_percent=min_price_increase_percent,
            )

        # Generate HTML component
        html = generate_recommendation_html(
            recommendations=recs,
            style=vis["style"],
            device=device,
            columns=vis["columns"],
            size=vis["size"],
            colors={
                "primary": vis["primary_color"],
                "text": vis["text_color"],
                "bg": vis["bg_color"],
            },
            border_radius=vis["border_radius"],
            rec_type="upsell",
            shop_urls=shop_urls,
            widget_title=vis["widget_title"],
            cta_text=vis["cta_text"],
            show_price=vis["show_price"],
            image_aspect=vis["image_aspect"],
        )

        return HTMLResponse(content=html)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating component: {str(e)}")


@router.get("/similar", response_class=HTMLResponse)
async def get_similar_component(
    connection_id: int = Query(..., description="Connection ID to use for recommendations"),
    product_id: str = Query(..., description="Product ID for similar product recommendations"),
    top: int = Query(4, description="Number of recommendations to show"),
    style: str = Query("card", description="Component style: card, carousel"),
    device: str = Query("desktop", description="Target device: desktop, mobile"),
    columns: int = Query(4, description="Max columns at full width (2–6)"),
    size: str = Query("default", description="Visual density: compact, default, spacious"),
    primary_color: str = Query("#3B82F6", description="Primary color hex"),
    text_color: str = Query("#1F2937", description="Text color hex"),
    bg_color: str = Query("#FFFFFF", description="Background color hex"),
    border_radius: str = Query("8px", description="Border radius"),
    widget_title: str = Query("", description="Custom widget title (empty = auto-default by widget type)"),
    cta_text: str = Query("View", description="Call-to-action button text"),
    show_price: bool = Query(True, description="Show product price"),
    image_aspect: str = Query("square", description="Image aspect ratio: square, portrait, landscape"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get similar products HTML component"""
    try:
        connection = await get_active_connection(connection_id, current_user.id, session)

        # Check if ingest connection has data before attempting recommendations
        no_data_response = await _check_ingest_has_data(connection, session)
        if no_data_response:
            return no_data_response

        # Get shop URL settings
        settings_result = await session.execute(
            select(RecommendationSettings).where(
                RecommendationSettings.connection_id == connection_id
            )
        )
        settings = settings_result.scalar_one_or_none()

        # Default URLs by platform if not configured
        shop_urls = get_default_shop_urls(connection, settings)

        # Apply visual defaults fallback chain: URL param → DB brand defaults → hardcoded
        vis = apply_visual_defaults(
            settings, style=style, columns=columns, size=size,
            primary_color=primary_color, text_color=text_color, bg_color=bg_color,
            border_radius=border_radius, cta_text=cta_text, show_price=show_price,
            image_aspect=image_aspect, widget_title=widget_title,
        )

        adapter = get_adapter(connection, session)
        engine = RecommendationEngine(adapter)

        # Check cache first
        cached = await get_cached_recommendations(
            connection_id, "similar",
            product_id=product_id, limit=top,
        )
        if cached is not None:
            recs = cached
        else:
            # Generate similar product recommendations (cache miss)
            recs = await engine.get_similar(product_id=product_id, limit=top)
            # Cache for next request
            await set_cached_recommendations(
                connection_id, "similar", recs,
                product_id=product_id, limit=top,
            )

        # Generate HTML component
        html = generate_recommendation_html(
            recommendations=recs,
            style=vis["style"],
            device=device,
            columns=vis["columns"],
            size=vis["size"],
            colors={
                "primary": vis["primary_color"],
                "text": vis["text_color"],
                "bg": vis["bg_color"],
            },
            border_radius=vis["border_radius"],
            rec_type="similar",
            shop_urls=shop_urls,
            widget_title=vis["widget_title"],
            cta_text=vis["cta_text"],
            show_price=vis["show_price"],
            image_aspect=vis["image_aspect"],
        )

        return HTMLResponse(content=html)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating component: {str(e)}")


def generate_recommendation_html(
    recommendations: List[Dict],
    style: str,
    device: str,
    columns: int,
    size: str,
    colors: Dict[str, str],
    border_radius: str,
    rec_type: str,
    shop_urls: Dict[str, str],
    widget_title: str = "",
    cta_text: str = "View",
    show_price: bool = True,
    image_aspect: str = "square",
) -> str:
    """Generate HTML component with embedded Tailwind CSS"""

    # Empty results → return hidden empty div (nothing visible on the storefront)
    if not recommendations:
        return "<div style='display:none'></div>"

    # Server-side validation: clamp columns to 2–6, fallback size to "default"
    columns = max(2, min(6, columns))
    if size not in SIZE_MAP:
        size = "default"

    sm = SIZE_MAP[size]

    # Widget title: use custom title if provided, otherwise auto-default by rec_type
    title_map = {
        "bestseller": "Popular now",
        "cross-sell": "Frequently bought together",
        "upsell": "You might like these too",
        "similar": "You may also like"
    }

    title = widget_title if widget_title else title_map.get(rec_type, "Recommended for you")

    # Image aspect ratio: validate against known values, fallback to "square"
    aspect_class = IMAGE_ASPECT_MAP.get(image_aspect, IMAGE_ASPECT_MAP["square"])

    # Responsive grid: 1 col mobile → 2 col tablet → N col desktop
    col_class = f"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-{columns}"

    # Generate product cards based on style
    if style == "carousel":
        cards_html = generate_carousel_cards(recommendations, colors, border_radius, shop_urls, sm, cta_text, show_price, aspect_class)
        container_class = f"flex overflow-x-auto {sm['carousel_gap']} pb-4 scrollbar-hide"
    else:
        # "card" or any other value — responsive grid
        cards_html = generate_grid_cards(recommendations, colors, border_radius, shop_urls, sm, cta_text, show_price, aspect_class)
        container_class = f"{col_class} {sm['grid_gap']}"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            .line-clamp-2 {{
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }}
            .scrollbar-hide {{
                -ms-overflow-style: none;
                scrollbar-width: none;
            }}
            .scrollbar-hide::-webkit-scrollbar {{
                display: none;
            }}
        </style>
    </head>
    <body style="background-color: {colors['bg']};">
        <div class="w-full max-w-7xl mx-auto {sm['container_padding']}">
            <h3 class="{sm['heading_text']} font-bold {sm['heading_margin']}" style="color: {colors['text']}">{title}</h3>
            <div class="{container_class}">
                {cards_html}
            </div>
        </div>

        <script>
            // Report content height to parent frame for auto-resize (iframe embedding)
            window.addEventListener('load', () => {{
                const height = document.body.scrollHeight;
                window.parent.postMessage({{ type: 'nudgio-resize', height: height }}, '*');
            }});

            // Track recommendation clicks
            document.querySelectorAll('[data-rec-click]').forEach(el => {{
                el.addEventListener('click', (e) => {{
                    const productId = e.target.dataset.productId;
                    const position = e.target.dataset.position;
                    const recType = '{rec_type}';

                    // Send analytics (optional - implement analytics endpoint)
                    fetch('/api/analytics/click', {{
                        method: 'POST',
                        headers: {{'Content-Type': 'application/json'}},
                        body: JSON.stringify({{
                            product_id: productId,
                            rec_type: recType,
                            position: parseInt(position),
                            timestamp: new Date().toISOString()
                        }})
                    }}).catch(err => console.log('Analytics failed:', err));

                    // Redirect to product page
                    const productUrl = e.target.dataset.productUrl;
                    if (productUrl) {{
                        window.open(productUrl, '_blank');
                    }}
                }});
            }});
        </script>
    </body>
    </html>
    """

    return html


def _build_product_url(shop_urls: Dict[str, str], handle: str, product_id: str) -> str:
    """Build product URL from shop URL template and product data."""
    if shop_urls.get("product_template") and shop_urls.get("base_url"):
        if "{handle}" in shop_urls["product_template"] and handle:
            return shop_urls["base_url"] + shop_urls["product_template"].format(handle=handle)
        elif "{id}" in shop_urls["product_template"] and product_id:
            return shop_urls["base_url"] + shop_urls["product_template"].format(id=product_id)
        else:
            return shop_urls["base_url"]
    return "#"


def generate_grid_cards(recommendations: List[Dict], colors: Dict[str, str], border_radius: str, shop_urls: Dict[str, str], sm: Dict, cta_text: str, show_price: bool, aspect_class: str) -> str:
    """Generate responsive grid product cards using size map."""
    cards = []

    for rec in recommendations:
        # Handle different data structures from engine
        product_id = rec.get('id') or rec.get('product_id', '')
        title = rec.get('title') or rec.get('name', 'Product Name')
        price = rec.get('price', '0.00')
        handle = rec.get('handle', '')
        position = rec.get('position', 1)
        image_url = rec.get('image_url', '')

        product_url = _build_product_url(shop_urls, handle, product_id)

        # Conditionally render price span
        price_html = f'<span class="font-bold {sm["price_text"]}" style="color: {colors["primary"]}">${price}</span>' if show_price else ''

        card = f"""
        <div class="w-full bg-white rounded-lg {sm['shadow']} transition-all duration-300 transform hover:-translate-y-1"
             style="border-radius: {border_radius}; background-color: {colors['bg']}">
            <div class="{aspect_class} bg-gray-100 rounded-t-lg overflow-hidden">
                <img src="{image_url or 'https://via.placeholder.com/300x300?text=No+Image'}"
                     alt="{title}"
                     class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                     loading="lazy">
            </div>
            <div class="{sm['card_padding']}">
                <h4 class="font-semibold {sm['title_text']} mb-2 line-clamp-2" style="color: {colors['text']}">
                    {str(title)[:sm['title_truncate']]}
                </h4>
                <div class="flex items-center justify-between">
                    {price_html}
                    <button data-rec-click
                            data-product-id="{product_id}"
                            data-position="{position}"
                            data-handle="{handle}"
                            data-product-url="{product_url}"
                            class="{sm['button_padding']} rounded-md text-white {sm['button_text']} font-medium hover:opacity-90 transition-opacity"
                            style="background-color: {colors['primary']}">
                        {cta_text}
                    </button>
                </div>
            </div>
        </div>
        """
        cards.append(card)

    return ''.join(cards)


def generate_carousel_cards(recommendations: List[Dict], colors: Dict[str, str], border_radius: str, shop_urls: Dict[str, str], sm: Dict, cta_text: str, show_price: bool, aspect_class: str) -> str:
    """Generate carousel product cards using size map."""
    cards = []

    for rec in recommendations:
        product_id = rec.get('id') or rec.get('product_id', '')
        title = rec.get('title') or rec.get('name', 'Product Name')
        price = rec.get('price', '0.00')
        handle = rec.get('handle', '')
        position = rec.get('position', 1)
        image_url = rec.get('image_url', '')

        product_url = _build_product_url(shop_urls, handle, product_id)

        # Conditionally render price span
        price_html = f'<span class="font-bold {sm["price_text"]}" style="color: {colors["primary"]}">${price}</span>' if show_price else ''

        card = f"""
        <div class="flex-none {sm['carousel_card_width']} bg-white rounded-lg {sm['shadow']} transition-all duration-300"
             style="border-radius: {border_radius}; background-color: {colors['bg']}">
            <div class="{aspect_class} bg-gray-100 rounded-t-lg overflow-hidden">
                <img src="{image_url or 'https://via.placeholder.com/250x250?text=No+Image'}"
                     alt="{title}"
                     class="w-full h-full object-cover hover:scale-105 transition-transform duration-300">
            </div>
            <div class="{sm['card_padding']}">
                <h4 class="font-medium {sm['title_text']} mb-2 line-clamp-2" style="color: {colors['text']}">
                    {str(title)[:sm['title_truncate']]}
                </h4>
                <div class="flex items-center justify-between">
                    {price_html}
                    <button data-rec-click
                            data-product-id="{product_id}"
                            data-position="{position}"
                            data-handle="{handle}"
                            data-product-url="{product_url}"
                            class="{sm['button_padding']} rounded text-white {sm['button_text']} font-medium hover:opacity-90"
                            style="background-color: {colors['primary']}">
                        {cta_text}
                    </button>
                </div>
            </div>
        </div>
        """
        cards.append(card)

    return ''.join(cards)