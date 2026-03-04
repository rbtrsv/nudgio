"""
Nudgio Schemas — Recommendations

Engine request/response schemas for recommendation algorithms (bestseller, cross-sell, upsell, similar).
"""

from pydantic import BaseModel
from enum import Enum


# ==========================================
# Enums
# ==========================================

class BestsellerMethod(str, Enum):
    """Bestseller calculation method"""
    VOLUME = "volume"
    VALUE = "value"
    BALANCED = "balanced"


class RecommendationType(str, Enum):
    """Recommendation algorithm types"""
    BESTSELLER = "bestseller"
    CROSS_SELL = "cross_sell"
    UP_SELL = "up_sell"
    SIMILAR = "similar"
    USER_BASED = "user_based"


class EventType(str, Enum):
    """Analytics event types"""
    VIEW = "view"
    CLICK = "click"
    PURCHASE = "purchase"


# ==========================================
# Request Schemas
# ==========================================

class RecommendationRequest(BaseModel):
    """Base request for all recommendation endpoints"""
    connection_id: int
    limit: int = 10
    lookback_days: int = 30


class BestsellerRequest(RecommendationRequest):
    """Request for bestseller recommendations"""
    method: BestsellerMethod = BestsellerMethod.VOLUME


class CrossSellRequest(RecommendationRequest):
    """Request for cross-sell (frequently bought together) recommendations"""
    product_id: str


class UpsellRequest(RecommendationRequest):
    """Request for upsell (higher-priced alternative) recommendations"""
    product_id: str
    min_price_increase_percent: int = 10


class SimilarProductsRequest(RecommendationRequest):
    """Request for similar product recommendations"""
    product_id: str


# ==========================================
# Response Schemas
# ==========================================

class ProductRecommendation(BaseModel):
    """Single product recommendation item"""
    product_id: str
    title: str
    price: float
    handle: str | None = None
    vendor: str | None = None
    sku: str | None = None
    position: int
    metrics: dict | None = None
    co_occurrence_count: int | None = None
    price_increase_percent: float | None = None
    similarity_score: float | None = None


class RecommendationResult(BaseModel):
    """Recommendation engine result containing product list"""
    recommendations: list[ProductRecommendation]
    count: int
    method: str | None = None
    base_product_id: str | None = None
    lookback_days: int
    generated_at: str


class RecommendationResponse(BaseModel):
    """Response schema for recommendation operations"""
    success: bool
    data: RecommendationResult | None = None
    error: str | None = None
