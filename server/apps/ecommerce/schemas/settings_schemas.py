from pydantic import BaseModel, field_validator, ConfigDict
from datetime import datetime
from ..models import BestsellerMethod


class RecommendationSettingsRequest(BaseModel):
    connection_id: int
    default_limit: int = 10
    default_lookback_days: int = 30
    bestseller_method: BestsellerMethod = BestsellerMethod.VOLUME
    cross_sell_enabled: bool = True
    upsell_enabled: bool = True
    similar_products_enabled: bool = True
    min_upsell_price_increase: int = 10
    cache_recommendations: bool = True
    cache_duration_minutes: int = 60
    shop_base_url: str | None = None
    product_url_template: str | None = None
    
    @field_validator('default_limit')
    @classmethod
    def validate_limit(cls, v):
        if v < 1 or v > 100:
            raise ValueError('Limit must be between 1 and 100')
        return v
    
    @field_validator('default_lookback_days')
    @classmethod 
    def validate_lookback_days(cls, v):
        if v < 1 or v > 365:
            raise ValueError('Lookback days must be between 1 and 365')
        return v
    
    @field_validator('min_upsell_price_increase')
    @classmethod
    def validate_min_upsell_increase(cls, v):
        if v < 0 or v > 1000:
            raise ValueError('Min upsell price increase must be between 0 and 1000 percent')
        return v


class RecommendationSettingsResponse(BaseModel):
    id: int
    connection_id: int
    default_limit: int
    default_lookback_days: int
    bestseller_method: BestsellerMethod
    cross_sell_enabled: bool
    upsell_enabled: bool
    similar_products_enabled: bool
    min_upsell_price_increase: int
    cache_recommendations: bool
    cache_duration_minutes: int
    shop_base_url: str | None = None
    product_url_template: str | None = None
    created_at: datetime
    updated_at: datetime | None = None
    
    model_config = ConfigDict(from_attributes=True)


class SettingsDetailResponse(BaseModel):
    """Response schema for settings operations"""
    success: bool
    data: RecommendationSettingsResponse | None = None
    error: str | None = None

class ConnectionSettingsResponse(BaseModel):
    """Connection settings response"""
    connection_id: int
    connection_name: str
    platform: str
    settings: RecommendationSettingsResponse | None = None

class SettingsListResponse(BaseModel):
    """Response schema for listing settings"""
    success: bool
    data: list[ConnectionSettingsResponse] | None = None
    error: str | None = None

class MessageResponse(BaseModel):
    """Generic message response"""
    success: bool
    message: str | None = None
    error: str | None = None