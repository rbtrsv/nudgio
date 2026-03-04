"""
Nudgio Models — Ecommerce

Platform connections, recommendation settings, API usage tracking, recommendation analytics.
"""

from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from datetime import datetime
from typing import Optional
from core.db import Base


# ==========================================
# 1. PLATFORM CONNECTIONS
# ==========================================

class EcommerceConnection(Base):
    """
    Purpose: Stores credentials and configuration for connecting to a merchant's ecommerce platform.
    Scope: Multi-platform (Shopify, WooCommerce, Magento).
    Usage: "My Shopify Store via API", "WooCommerce Production via Database".
    """
    __tablename__ = "ecommerce_connections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    platform: Mapped[str] = mapped_column(String(50), nullable=False)  # "shopify", "woocommerce", "magento"
    connection_name: Mapped[str] = mapped_column(String(255), nullable=False)
    connection_method: Mapped[str] = mapped_column(String(50), default="api")  # "api", "database"

    # API-based connection fields
    store_url: Mapped[str | None] = mapped_column(String(500), nullable=True)  # "https://mystore.myshopify.com"
    api_key: Mapped[str | None] = mapped_column(String(512), nullable=True)  # WooCommerce: consumer_key
    api_secret: Mapped[str | None] = mapped_column(String(512), nullable=True)  # WooCommerce: consumer_secret, Magento/Shopify: access token

    # Database-based connection fields (not needed for API connections)
    db_host: Mapped[str | None] = mapped_column(String(255), nullable=True)
    db_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    db_user: Mapped[str | None] = mapped_column(String(255), nullable=True)
    db_password: Mapped[str | None] = mapped_column(String(512), nullable=True)
    db_port: Mapped[int | None] = mapped_column(Integer, nullable=True, default=3306)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    settings: Mapped[Optional["RecommendationSettings"]] = relationship(back_populates="connection", uselist=False, cascade="all, delete-orphan")
    usage_tracking: Mapped[list["APIUsageTracking"]] = relationship(back_populates="connection", cascade="all, delete-orphan")
    analytics: Mapped[list["RecommendationAnalytics"]] = relationship(back_populates="connection", cascade="all, delete-orphan")


# ==========================================
# 2. RECOMMENDATION SETTINGS
# ==========================================

class RecommendationSettings(Base):
    """
    Purpose: Per-connection configuration for recommendation algorithms.
    Scope: Controls bestseller method, lookback windows, upsell thresholds, shop URLs.
    Usage: "Use volume-based bestsellers with 30-day lookback for My Shopify Store".
    """
    __tablename__ = "recommendation_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    connection_id: Mapped[int] = mapped_column(Integer, ForeignKey("ecommerce_connections.id", ondelete="CASCADE"), nullable=False, unique=True)

    # Algorithm configuration
    bestseller_method: Mapped[str] = mapped_column(String(50), default="volume")  # "volume", "value", "balanced"
    bestseller_lookback_days: Mapped[int] = mapped_column(Integer, default=30)
    crosssell_lookback_days: Mapped[int] = mapped_column(Integer, default=30)
    max_recommendations: Mapped[int] = mapped_column(Integer, default=10)
    min_price_increase_percent: Mapped[int] = mapped_column(Integer, default=10)  # Upsell threshold

    # Shop URL configuration for HTML components
    shop_base_url: Mapped[str | None] = mapped_column(String(500), nullable=True)  # "https://myshop.myshopify.com"
    product_url_template: Mapped[str | None] = mapped_column(String(500), nullable=True)  # "/products/{handle}"

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    connection: Mapped["EcommerceConnection"] = relationship(back_populates="settings")


# ==========================================
# 3. API USAGE TRACKING
# ==========================================

class APIUsageTracking(Base):
    """
    Purpose: Logs every API call made through a connection for rate limiting and monitoring.
    Scope: Per-organization, per-connection.
    Usage: "GET /recommendations/bestsellers responded 200 in 340ms".
    """
    __tablename__ = "api_usage_tracking"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    connection_id: Mapped[int] = mapped_column(Integer, ForeignKey("ecommerce_connections.id", ondelete="CASCADE"), nullable=False)
    endpoint: Mapped[str] = mapped_column(String(255), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    response_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Relationships
    connection: Mapped["EcommerceConnection"] = relationship(back_populates="usage_tracking")


# ==========================================
# 4. RECOMMENDATION ANALYTICS
# ==========================================

class RecommendationAnalytics(Base):
    """
    Purpose: Tracks user interactions with recommendation widgets (views, clicks, purchases).
    Scope: Per-connection, per-recommendation.
    Usage: "User viewed cross_sell recommendation for product 123 at position 2".
    """
    __tablename__ = "recommendation_analytics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    connection_id: Mapped[int] = mapped_column(Integer, ForeignKey("ecommerce_connections.id", ondelete="CASCADE"), nullable=False)

    # What was recommended
    recommendation_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "bestseller", "cross_sell", "up_sell", "similar", "user_based"
    product_id: Mapped[str] = mapped_column(String(255), nullable=False)
    recommended_product_id: Mapped[str] = mapped_column(String(255), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    # What the user did
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "view", "click", "purchase"
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)

    # Relationships
    connection: Mapped["EcommerceConnection"] = relationship(back_populates="analytics")
