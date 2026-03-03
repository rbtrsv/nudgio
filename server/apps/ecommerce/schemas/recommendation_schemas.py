from pydantic import BaseModel
from typing import List, Dict, Any
from ..models import BestsellerMethod


class RecommendationRequest(BaseModel):
    connection_id: int
    limit: int = 10
    lookback_days: int = 30


class BestsellerRequest(RecommendationRequest):
    method: BestsellerMethod = BestsellerMethod.VOLUME


class CrossSellRequest(RecommendationRequest):
    product_id: str


class UpsellRequest(RecommendationRequest):
    product_id: str
    min_price_increase_percent: int = 10


class SimilarProductsRequest(RecommendationRequest):
    product_id: str


class ProductRecommendation(BaseModel):
    product_id: str
    title: str
    price: float
    handle: str | None = None
    vendor: str | None = None
    sku: str | None = None
    position: int
    metrics: Dict[str, Any] | None = None
    co_occurrence_count: int | None = None
    price_increase_percent: float | None = None
    similarity_score: float | None = None


class RecommendationResponse(BaseModel):
    """Response schema for recommendations"""
    recommendations: List[ProductRecommendation]
    total: int
    method: str | None = None
    base_product_id: str | None = None
    lookback_days: int
    generated_at: str

class RecommendationDetailResponse(BaseModel):
    """Response schema for recommendation operations"""
    success: bool
    data: RecommendationResponse | None = None
    error: str | None = None