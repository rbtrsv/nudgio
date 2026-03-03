from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from datetime import datetime
from enum import Enum
from typing import Optional
from core.db import Base


class PlatformType(str, Enum):
    SHOPIFY = "shopify"
    WOOCOMMERCE = "woocommerce"
    MAGENTO = "magento"


class BestsellerMethod(str, Enum):
    VOLUME = "volume"
    VALUE = "value"
    BALANCED = "balanced"


class RecommendationType(str, Enum):
    BESTSELLER = "bestseller"
    CROSS_SELL = "cross_sell"
    UP_SELL = "up_sell"
    SIMILAR = "similar"
    USER_BASED = "user_based"


class EventType(str, Enum):
    VIEW = "view"
    CLICK = "click"
    PURCHASE = "purchase"


class EcommerceConnection(Base):
    __tablename__ = "ecommerce_connections"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id"), nullable=False)
    platform: Mapped[PlatformType] = mapped_column(SQLEnum(PlatformType), nullable=False)
    connection_name: Mapped[str] = mapped_column(String(255), nullable=False)
    db_host: Mapped[str] = mapped_column(String(255), nullable=False)
    db_name: Mapped[str] = mapped_column(String(255), nullable=False)
    db_user: Mapped[str] = mapped_column(String(255), nullable=False)
    db_password: Mapped[str] = mapped_column(String(512), nullable=False)  # Encrypted password
    db_port: Mapped[int] = mapped_column(Integer, default=3306)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    settings: Mapped[Optional["RecommendationSettings"]] = relationship(back_populates="connection", uselist=False, cascade="all, delete-orphan")
    usage_tracking: Mapped[list["APIUsageTracking"]] = relationship(back_populates="connection", cascade="all, delete-orphan")
    analytics: Mapped[list["RecommendationAnalytics"]] = relationship(back_populates="connection", cascade="all, delete-orphan")


class RecommendationSettings(Base):
    __tablename__ = "recommendation_settings"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    connection_id: Mapped[int] = mapped_column(Integer, ForeignKey("ecommerce_connections.id"), nullable=False, unique=True)
    bestseller_method: Mapped[BestsellerMethod] = mapped_column(SQLEnum(BestsellerMethod), default=BestsellerMethod.VOLUME)
    bestseller_lookback_days: Mapped[int] = mapped_column(Integer, default=30)
    crosssell_lookback_days: Mapped[int] = mapped_column(Integer, default=30)
    max_recommendations: Mapped[int] = mapped_column(Integer, default=10)
    min_price_increase_percent: Mapped[int] = mapped_column(Integer, default=10)  # For upsell
    
    # Shop URL configuration for HTML components
    shop_base_url: Mapped[str | None] = mapped_column(String(500), nullable=True)  # e.g., "https://myshop.myshopify.com"
    product_url_template: Mapped[str | None] = mapped_column(String(500), nullable=True)  # e.g., "/products/{handle}" or "/product/{id}"
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    connection: Mapped["EcommerceConnection"] = relationship(back_populates="settings")


class APIUsageTracking(Base):
    __tablename__ = "api_usage_tracking"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(Integer, ForeignKey("organizations.id"), nullable=False)
    connection_id: Mapped[int] = mapped_column(Integer, ForeignKey("ecommerce_connections.id"), nullable=False)
    endpoint: Mapped[str] = mapped_column(String(255), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    response_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    
    # Relationships
    connection: Mapped["EcommerceConnection"] = relationship(back_populates="usage_tracking")


class RecommendationAnalytics(Base):
    __tablename__ = "recommendation_analytics"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    connection_id: Mapped[int] = mapped_column(Integer, ForeignKey("ecommerce_connections.id"), nullable=False)
    recommendation_type: Mapped[RecommendationType] = mapped_column(SQLEnum(RecommendationType), nullable=False)
    product_id: Mapped[str] = mapped_column(String(255), nullable=False)
    recommended_product_id: Mapped[str] = mapped_column(String(255), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)  # Position in recommendation list
    event_type: Mapped[EventType] = mapped_column(SQLEnum(EventType), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    
    # Relationships
    connection: Mapped["EcommerceConnection"] = relationship(back_populates="analytics")