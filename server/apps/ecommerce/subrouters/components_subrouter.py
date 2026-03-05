from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List, Dict
from core.db import get_session
from apps.accounts.models import User
from apps.accounts.utils.auth_utils import get_current_user
from ..models import EcommerceConnection, RecommendationSettings
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


def get_default_shop_urls(connection: EcommerceConnection, settings: Optional[RecommendationSettings]) -> Dict[str, str]:
    """Get shop URLs from settings or defaults by platform"""
    if settings and settings.shop_base_url and settings.product_url_template:
        return {
            "base_url": settings.shop_base_url,
            "product_template": settings.product_url_template
        }
    
    # Default URL patterns by platform
    defaults = {
        PlatformType.SHOPIFY.value: {
            "base_url": f"https://{connection.store_url or connection.db_host}",  # Shopify store domain
            "product_template": "/products/{handle}"
        },
        PlatformType.WOOCOMMERCE.value: {
            "base_url": f"https://{connection.store_url or connection.db_host}",  # WordPress site domain
            "product_template": "/product/{handle}"  # or "/shop/{handle}"
        },
        PlatformType.MAGENTO.value: {
            "base_url": f"https://{connection.store_url or connection.db_host}",  # Magento store domain
            "product_template": "/catalog/product/view/id/{id}"
        }
    }

    return defaults.get(connection.platform, {
        "base_url": f"https://{connection.store_url or connection.db_host}",
        "product_template": "/products/{handle}"
    })


@router.get("/bestsellers", response_class=HTMLResponse)
async def get_bestsellers_component(
    connection_id: int = Query(..., description="Connection ID to use for recommendations"),
    top: int = Query(4, description="Number of recommendations to show"),
    lookback_days: int = Query(30, description="Number of days to look back for order data"),
    method: str = Query("volume", description="Bestseller calculation method: volume, value, or balanced"),
    style: str = Query("card", description="Component style: card, carousel, list"),
    device: str = Query("desktop", description="Target device: desktop, mobile"),
    primary_color: str = Query("#3B82F6", description="Primary color hex"),
    text_color: str = Query("#1F2937", description="Text color hex"),
    bg_color: str = Query("#FFFFFF", description="Background color hex"),
    border_radius: str = Query("8px", description="Border radius"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get bestsellers HTML component"""
    try:
        connection = await get_active_connection(connection_id, current_user.id, session)

        # Get shop URL settings
        settings_result = await session.execute(
            select(RecommendationSettings).where(
                RecommendationSettings.connection_id == connection_id
            )
        )
        settings = settings_result.scalar_one_or_none()

        # Default URLs by platform if not configured
        shop_urls = get_default_shop_urls(connection, settings)

        adapter = get_adapter(connection)
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
            style=style,
            device=device,
            colors={
                "primary": primary_color,
                "text": text_color,
                "bg": bg_color
            },
            border_radius=border_radius,
            rec_type="bestseller",
            shop_urls=shop_urls
        )
        
        return HTMLResponse(content=html)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating component: {str(e)}")


@router.get("/cross-sell", response_class=HTMLResponse)
async def get_cross_sell_component(
    connection_id: int = Query(..., description="Connection ID to use for recommendations"),
    product_id: str = Query(..., description="Product ID for cross-sell recommendations"),
    top: int = Query(4, description="Number of recommendations to show"),
    lookback_days: int = Query(30, description="Number of days to look back for order data"),
    style: str = Query("card", description="Component style: card, carousel, list"),
    device: str = Query("desktop", description="Target device: desktop, mobile"),
    primary_color: str = Query("#3B82F6", description="Primary color hex"),
    text_color: str = Query("#1F2937", description="Text color hex"),
    bg_color: str = Query("#FFFFFF", description="Background color hex"),
    border_radius: str = Query("8px", description="Border radius"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get cross-sell HTML component"""
    try:
        connection = await get_active_connection(connection_id, current_user.id, session)
        
        # Get shop URL settings
        settings_result = await session.execute(
            select(RecommendationSettings).where(
                RecommendationSettings.connection_id == connection_id
            )
        )
        settings = settings_result.scalar_one_or_none()
        
        # Default URLs by platform if not configured
        shop_urls = get_default_shop_urls(connection, settings)
        
        adapter = get_adapter(connection)
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
            style=style,
            device=device,
            colors={
                "primary": primary_color,
                "text": text_color,
                "bg": bg_color
            },
            border_radius=border_radius,
            rec_type="cross-sell",
            shop_urls=shop_urls
        )
        
        return HTMLResponse(content=html)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating component: {str(e)}")


@router.get("/upsell", response_class=HTMLResponse)
async def get_upsell_component(
    connection_id: int = Query(..., description="Connection ID to use for recommendations"),
    product_id: str = Query(..., description="Product ID for upsell recommendations"),
    top: int = Query(4, description="Number of recommendations to show"),
    min_price_increase_percent: int = Query(10, description="Minimum price increase percentage for upsell candidates"),
    style: str = Query("card", description="Component style: card, carousel, list"),
    device: str = Query("desktop", description="Target device: desktop, mobile"),
    primary_color: str = Query("#3B82F6", description="Primary color hex"),
    text_color: str = Query("#1F2937", description="Text color hex"),
    bg_color: str = Query("#FFFFFF", description="Background color hex"),
    border_radius: str = Query("8px", description="Border radius"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get upsell HTML component"""
    try:
        connection = await get_active_connection(connection_id, current_user.id, session)
        
        # Get shop URL settings
        settings_result = await session.execute(
            select(RecommendationSettings).where(
                RecommendationSettings.connection_id == connection_id
            )
        )
        settings = settings_result.scalar_one_or_none()
        
        # Default URLs by platform if not configured
        shop_urls = get_default_shop_urls(connection, settings)
        
        adapter = get_adapter(connection)
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
            style=style,
            device=device,
            colors={
                "primary": primary_color,
                "text": text_color,
                "bg": bg_color
            },
            border_radius=border_radius,
            rec_type="upsell",
            shop_urls=shop_urls
        )
        
        return HTMLResponse(content=html)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating component: {str(e)}")


@router.get("/similar", response_class=HTMLResponse)
async def get_similar_component(
    connection_id: int = Query(..., description="Connection ID to use for recommendations"),
    product_id: str = Query(..., description="Product ID for similar product recommendations"),
    top: int = Query(4, description="Number of recommendations to show"),
    style: str = Query("card", description="Component style: card, carousel, list"),
    device: str = Query("desktop", description="Target device: desktop, mobile"),
    primary_color: str = Query("#3B82F6", description="Primary color hex"),
    text_color: str = Query("#1F2937", description="Text color hex"),
    bg_color: str = Query("#FFFFFF", description="Background color hex"),
    border_radius: str = Query("8px", description="Border radius"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get similar products HTML component"""
    try:
        connection = await get_active_connection(connection_id, current_user.id, session)
        
        # Get shop URL settings
        settings_result = await session.execute(
            select(RecommendationSettings).where(
                RecommendationSettings.connection_id == connection_id
            )
        )
        settings = settings_result.scalar_one_or_none()
        
        # Default URLs by platform if not configured
        shop_urls = get_default_shop_urls(connection, settings)
        
        adapter = get_adapter(connection)
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
            style=style,
            device=device,
            colors={
                "primary": primary_color,
                "text": text_color,
                "bg": bg_color
            },
            border_radius=border_radius,
            rec_type="similar",
            shop_urls=shop_urls
        )
        
        return HTMLResponse(content=html)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating component: {str(e)}")


def generate_recommendation_html(
    recommendations: List[Dict],
    style: str,
    device: str,
    colors: Dict[str, str],
    border_radius: str,
    rec_type: str,
    shop_urls: Dict[str, str]
) -> str:
    """Generate HTML component with embedded Tailwind CSS"""
    
    if not recommendations:
        return "<div class='text-center text-gray-500 p-4'>No recommendations available</div>"
    
    title_map = {
        "bestseller": "Popular now",
        "cross-sell": "Frequently bought together",
        "upsell": "You might like these too",
        "similar": "You may also like"
    }
    
    title = title_map.get(rec_type, "Recommended for you")
    
    # Generate product cards
    if style == "card" and device == "desktop":
        cards_html = generate_desktop_cards(recommendations, colors, border_radius, shop_urls)
        container_class = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
    elif style == "carousel":
        cards_html = generate_carousel_cards(recommendations, colors, border_radius, shop_urls)
        container_class = "flex overflow-x-auto space-x-4 pb-4 scrollbar-hide"
    elif device == "mobile":
        cards_html = generate_mobile_cards(recommendations, colors, shop_urls)
        container_class = "grid grid-cols-2 gap-3"
    else:
        cards_html = generate_desktop_cards(recommendations, colors, border_radius, shop_urls)
        container_class = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
    
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
        <div class="w-full max-w-7xl mx-auto p-4">
            <h3 class="text-xl font-bold mb-4" style="color: {colors['text']}">{title}</h3>
            <div class="{container_class}">
                {cards_html}
            </div>
        </div>
        
        <script>
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


def generate_desktop_cards(recommendations: List[Dict], colors: Dict[str, str], border_radius: str, shop_urls: Dict[str, str]) -> str:
    """Generate desktop product cards"""
    cards = []
    
    for rec in recommendations:
        # Handle different data structures from engine
        product_id = rec.get('id') or rec.get('product_id', '')
        title = rec.get('title') or rec.get('name', 'Product Name')
        price = rec.get('price', '0.00')
        handle = rec.get('handle', '')
        position = rec.get('position', 1)
        image_url = rec.get('image_url', '')
        
        # Build product URL
        if shop_urls.get("product_template") and shop_urls.get("base_url"):
            if "{handle}" in shop_urls["product_template"] and handle:
                product_url = shop_urls["base_url"] + shop_urls["product_template"].format(handle=handle)
            elif "{id}" in shop_urls["product_template"] and product_id:
                product_url = shop_urls["base_url"] + shop_urls["product_template"].format(id=product_id)
            else:
                product_url = shop_urls["base_url"]
        else:
            product_url = "#"
        
        card = f"""
        <div class="w-full bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1" 
             style="border-radius: {border_radius}; background-color: {colors['bg']}">
            <div class="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
                <img src="{image_url or 'https://via.placeholder.com/300x300?text=No+Image'}"
                     alt="{title}"
                     class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                     loading="lazy">
            </div>
            <div class="p-4">
                <h4 class="font-semibold text-sm mb-2 line-clamp-2" style="color: {colors['text']}">
                    {str(title)[:50]}
                </h4>
                <div class="flex items-center justify-between">
                    <span class="font-bold text-lg" style="color: {colors['primary']}">${price}</span>
                    <button data-rec-click 
                            data-product-id="{product_id}"
                            data-position="{position}"
                            data-handle="{handle}"
                            data-product-url="{product_url}"
                            class="px-4 py-2 rounded-md text-white text-sm font-medium hover:opacity-90 transition-opacity"
                            style="background-color: {colors['primary']}">
                        View
                    </button>
                </div>
            </div>
        </div>
        """
        cards.append(card)
    
    return ''.join(cards)


def generate_carousel_cards(recommendations: List[Dict], colors: Dict[str, str], border_radius: str, shop_urls: Dict[str, str]) -> str:
    """Generate carousel product cards"""
    cards = []
    
    for rec in recommendations:
        product_id = rec.get('id') or rec.get('product_id', '')
        title = rec.get('title') or rec.get('name', 'Product Name')
        price = rec.get('price', '0.00')
        handle = rec.get('handle', '')
        position = rec.get('position', 1)
        image_url = rec.get('image_url', '')
        
        # Build product URL
        if shop_urls.get("product_template") and shop_urls.get("base_url"):
            if "{handle}" in shop_urls["product_template"] and handle:
                product_url = shop_urls["base_url"] + shop_urls["product_template"].format(handle=handle)
            elif "{id}" in shop_urls["product_template"] and product_id:
                product_url = shop_urls["base_url"] + shop_urls["product_template"].format(id=product_id)
            else:
                product_url = shop_urls["base_url"]
        else:
            product_url = "#"
        
        card = f"""
        <div class="flex-none w-64 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300" 
             style="border-radius: {border_radius}; background-color: {colors['bg']}">
            <div class="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
                <img src="{image_url or 'https://via.placeholder.com/250x250?text=No+Image'}"
                     alt="{title}"
                     class="w-full h-full object-cover hover:scale-105 transition-transform duration-300">
            </div>
            <div class="p-3">
                <h4 class="font-medium text-sm mb-2 line-clamp-2" style="color: {colors['text']}">
                    {str(title)[:40]}
                </h4>
                <div class="flex items-center justify-between">
                    <span class="font-bold" style="color: {colors['primary']}">${price}</span>
                    <button data-rec-click 
                            data-product-id="{product_id}"
                            data-position="{position}"
                            data-handle="{handle}"
                            data-product-url="{product_url}"
                            class="px-3 py-1 rounded text-white text-xs font-medium hover:opacity-90"
                            style="background-color: {colors['primary']}">
                        View
                    </button>
                </div>
            </div>
        </div>
        """
        cards.append(card)
    
    return ''.join(cards)


def generate_mobile_cards(recommendations: List[Dict], colors: Dict[str, str], shop_urls: Dict[str, str]) -> str:
    """Generate mobile product cards"""
    cards = []
    
    for rec in recommendations:
        product_id = rec.get('id') or rec.get('product_id', '')
        title = rec.get('title') or rec.get('name', 'Product')
        price = rec.get('price', '0.00')
        handle = rec.get('handle', '')
        position = rec.get('position', 1)
        image_url = rec.get('image_url', '')

        # Build product URL
        if shop_urls.get("product_template") and shop_urls.get("base_url"):
            if "{handle}" in shop_urls["product_template"] and handle:
                product_url = shop_urls["base_url"] + shop_urls["product_template"].format(handle=handle)
            elif "{id}" in shop_urls["product_template"] and product_id:
                product_url = shop_urls["base_url"] + shop_urls["product_template"].format(id=product_id)
            else:
                product_url = shop_urls["base_url"]
        else:
            product_url = "#"
        
        card = f"""
        <div class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
             style="background-color: {colors['bg']}">
            <div class="aspect-square bg-gray-100 overflow-hidden">
                <img src="{image_url or 'https://via.placeholder.com/200x200?text=No+Image'}"
                     alt="{title}"
                     class="w-full h-full object-cover">
            </div>
            <div class="p-3">
                <h4 class="font-medium text-xs mb-2 line-clamp-2" style="color: {colors['text']}">
                    {str(title)[:25]}
                </h4>
                <div class="flex items-center justify-between">
                    <span class="font-bold text-sm" style="color: {colors['primary']}">${price}</span>
                    <button data-rec-click 
                            data-product-id="{product_id}"
                            data-position="{position}"
                            data-handle="{handle}"
                            data-product-url="{product_url}"
                            class="px-2 py-1 rounded text-xs text-white font-medium"
                            style="background-color: {colors['primary']}">
                        View
                    </button>
                </div>
            </div>
        </div>
        """
        cards.append(card)
    
    return ''.join(cards)