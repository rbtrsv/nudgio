"""
Nudgio Schemas — Recommendation Settings

Per-connection recommendation algorithm configuration schemas.
"""

from pydantic import BaseModel, field_validator, ConfigDict
from datetime import datetime
from .recommendation_schemas import BestsellerMethod


# ==========================================
# Request Schemas
# ==========================================

class RecommendationSettingsCreate(BaseModel):
    """Schema for creating recommendation settings"""
    bestseller_method: BestsellerMethod = BestsellerMethod.VOLUME
    bestseller_lookback_days: int = 30
    crosssell_lookback_days: int = 30
    max_recommendations: int = 10
    min_price_increase_percent: int = 10  # Upsell threshold
    shop_base_url: str | None = None  # "https://myshop.myshopify.com"
    product_url_template: str | None = None  # "/products/{handle}"

    @field_validator('bestseller_lookback_days', 'crosssell_lookback_days')
    @classmethod
    def validate_lookback_days(cls, v):
        if v < 1 or v > 365:
            raise ValueError('Lookback days must be between 1 and 365')
        return v

    @field_validator('max_recommendations')
    @classmethod
    def validate_max_recommendations(cls, v):
        if v < 1 or v > 100:
            raise ValueError('Max recommendations must be between 1 and 100')
        return v

    @field_validator('min_price_increase_percent')
    @classmethod
    def validate_min_price_increase(cls, v):
        if v < 0 or v > 1000:
            raise ValueError('Min price increase percent must be between 0 and 1000')
        return v


class RecommendationSettingsUpdate(BaseModel):
    """Schema for updating recommendation settings"""
    bestseller_method: BestsellerMethod | None = None
    bestseller_lookback_days: int | None = None
    crosssell_lookback_days: int | None = None
    max_recommendations: int | None = None
    min_price_increase_percent: int | None = None
    shop_base_url: str | None = None
    product_url_template: str | None = None


# ==========================================
# Response Schemas
# ==========================================

class RecommendationSettingsDetail(BaseModel):
    """Schema for recommendation settings details"""
    id: int
    connection_id: int
    bestseller_method: BestsellerMethod
    bestseller_lookback_days: int
    crosssell_lookback_days: int
    max_recommendations: int
    min_price_increase_percent: int
    shop_base_url: str | None = None
    product_url_template: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class RecommendationSettingsResponse(BaseModel):
    """Response schema for single recommendation settings operations"""
    success: bool
    data: RecommendationSettingsDetail | None = None
    error: str | None = None


class ConnectionSettingsDetail(BaseModel):
    """Schema for connection with its settings"""
    connection_id: int
    connection_name: str
    platform: str
    settings: RecommendationSettingsDetail | None = None


class RecommendationSettingsListResponse(BaseModel):
    """Response schema for listing recommendation settings across connections"""
    success: bool
    data: list[ConnectionSettingsDetail] | None = None
    count: int = 0
    error: str | None = None


class MessageResponse(BaseModel):
    """Simple message response"""
    success: bool
    message: str | None = None
    error: str | None = None
