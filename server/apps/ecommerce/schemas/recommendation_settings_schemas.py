"""
Nudgio Schemas — Recommendation Settings

Per-connection recommendation algorithm configuration schemas.
"""

from pydantic import BaseModel, Field, field_validator, ConfigDict
from datetime import datetime
from .recommendation_schemas import BestsellerMethod


# ==========================================
# Request Schemas
# ==========================================

class RecommendationSettingsCreate(BaseModel):
    """Schema for creating recommendation settings"""
    bestseller_method: BestsellerMethod = Field(default=BestsellerMethod.VOLUME, description="Bestseller calculation method: volume, value, or balanced")
    bestseller_lookback_days: int = Field(default=30, description="Number of days to look back for bestseller calculations (1-365)")
    crosssell_lookback_days: int = Field(default=30, description="Number of days to look back for cross-sell calculations (1-365)")
    max_recommendations: int = Field(default=10, description="Maximum number of recommendations to return (1-100)")
    min_price_increase_percent: int = Field(default=10, description="Minimum price increase percentage for upsell recommendations (0-1000)")
    shop_base_url: str | None = Field(default=None, description="Shop base URL, e.g. https://myshop.myshopify.com")
    product_url_template: str | None = Field(default=None, description="Product URL template, e.g. /products/{handle}")
    # Brand identity defaults — visual settings for widget rendering
    widget_style: str | None = Field(default=None, description="Widget layout style: card, carousel")
    widget_columns: int | None = Field(default=None, description="Max grid columns at full width (2-6)")
    widget_size: str | None = Field(default=None, description="Visual density: compact, default, spacious")
    primary_color: str | None = Field(default=None, description="Primary/accent color hex, e.g. #3B82F6")
    text_color: str | None = Field(default=None, description="Text color hex, e.g. #1F2937")
    bg_color: str | None = Field(default=None, description="Background color hex, e.g. #FFFFFF")
    border_radius: str | None = Field(default=None, description="CSS border radius, e.g. 8px")
    cta_text: str | None = Field(default=None, description="Call-to-action button text, e.g. View, Shop Now")
    show_price: bool | None = Field(default=None, description="Whether to display product prices")
    image_aspect: str | None = Field(default=None, description="Image aspect ratio: square, portrait, landscape")
    widget_title: str | None = Field(default=None, description="Custom widget heading (empty string = auto-default by type)")

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
    """Schema for updating recommendation settings — all fields optional (partial update)"""
    bestseller_method: BestsellerMethod | None = Field(default=None, description="Bestseller calculation method: volume, value, or balanced")
    bestseller_lookback_days: int | None = Field(default=None, description="Number of days to look back for bestseller calculations (1-365)")
    crosssell_lookback_days: int | None = Field(default=None, description="Number of days to look back for cross-sell calculations (1-365)")
    max_recommendations: int | None = Field(default=None, description="Maximum number of recommendations to return (1-100)")
    min_price_increase_percent: int | None = Field(default=None, description="Minimum price increase percentage for upsell recommendations (0-1000)")
    shop_base_url: str | None = Field(default=None, description="Shop base URL, e.g. https://myshop.myshopify.com")
    product_url_template: str | None = Field(default=None, description="Product URL template, e.g. /products/{handle}")
    # Brand identity defaults — visual settings for widget rendering
    widget_style: str | None = Field(default=None, description="Widget layout style: card, carousel")
    widget_columns: int | None = Field(default=None, description="Max grid columns at full width (2-6)")
    widget_size: str | None = Field(default=None, description="Visual density: compact, default, spacious")
    primary_color: str | None = Field(default=None, description="Primary/accent color hex, e.g. #3B82F6")
    text_color: str | None = Field(default=None, description="Text color hex, e.g. #1F2937")
    bg_color: str | None = Field(default=None, description="Background color hex, e.g. #FFFFFF")
    border_radius: str | None = Field(default=None, description="CSS border radius, e.g. 8px")
    cta_text: str | None = Field(default=None, description="Call-to-action button text, e.g. View, Shop Now")
    show_price: bool | None = Field(default=None, description="Whether to display product prices")
    image_aspect: str | None = Field(default=None, description="Image aspect ratio: square, portrait, landscape")
    widget_title: str | None = Field(default=None, description="Custom widget heading (empty string = auto-default by type)")


# ==========================================
# Response Schemas
# ==========================================

class RecommendationSettingsDetail(BaseModel):
    """Schema for recommendation settings details"""
    id: int = Field(description="Settings ID")
    connection_id: int = Field(description="ID of the associated connection")
    bestseller_method: BestsellerMethod = Field(description="Bestseller calculation method")
    bestseller_lookback_days: int = Field(description="Bestseller lookback window in days")
    crosssell_lookback_days: int = Field(description="Cross-sell lookback window in days")
    max_recommendations: int = Field(description="Maximum number of recommendations")
    min_price_increase_percent: int = Field(description="Minimum upsell price increase percentage")
    shop_base_url: str | None = Field(default=None, description="Shop base URL")
    product_url_template: str | None = Field(default=None, description="Product URL template")
    # Brand identity defaults — visual settings for widget rendering
    widget_style: str | None = Field(default=None, description="Widget layout style")
    widget_columns: int | None = Field(default=None, description="Max grid columns at full width")
    widget_size: str | None = Field(default=None, description="Visual density")
    primary_color: str | None = Field(default=None, description="Primary/accent color hex")
    text_color: str | None = Field(default=None, description="Text color hex")
    bg_color: str | None = Field(default=None, description="Background color hex")
    border_radius: str | None = Field(default=None, description="CSS border radius")
    cta_text: str | None = Field(default=None, description="Call-to-action button text")
    show_price: bool | None = Field(default=None, description="Whether to display product prices")
    image_aspect: str | None = Field(default=None, description="Image aspect ratio")
    widget_title: str | None = Field(default=None, description="Custom widget heading")
    created_at: datetime = Field(description="When the settings were created")
    updated_at: datetime | None = Field(default=None, description="When the settings were last updated")

    model_config = ConfigDict(from_attributes=True)


class RecommendationSettingsResponse(BaseModel):
    """Response schema for single recommendation settings operations"""
    success: bool = Field(description="Whether the operation succeeded")
    data: RecommendationSettingsDetail | None = Field(default=None, description="Settings details")
    error: str | None = Field(default=None, description="Error message if operation failed")


class ConnectionSettingsDetail(BaseModel):
    """Schema for connection with its settings"""
    connection_id: int = Field(description="ID of the connection")
    connection_name: str = Field(description="Connection name")
    platform: str = Field(description="Ecommerce platform")
    settings: RecommendationSettingsDetail | None = Field(default=None, description="Settings for this connection, null if not configured")


class RecommendationSettingsListResponse(BaseModel):
    """Response schema for listing recommendation settings across connections"""
    success: bool = Field(description="Whether the operation succeeded")
    data: list[ConnectionSettingsDetail] | None = Field(default=None, description="List of connections with their settings")
    count: int = Field(default=0, description="Total number of connections")
    error: str | None = Field(default=None, description="Error message if operation failed")


class MessageResponse(BaseModel):
    """Simple message response"""
    success: bool = Field(description="Whether the operation succeeded")
    message: str | None = Field(default=None, description="Response message")
    error: str | None = Field(default=None, description="Error message if operation failed")
