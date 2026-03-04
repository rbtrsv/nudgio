"""
Nudgio Schemas — Ecommerce Connection

Platform connection CRUD schemas, platform/method enums, test response.
"""

from pydantic import BaseModel, field_validator, model_validator, ConfigDict
from datetime import datetime
from enum import Enum


# ==========================================
# Enums
# ==========================================

class PlatformType(str, Enum):
    """Supported ecommerce platforms"""
    SHOPIFY = "shopify"
    WOOCOMMERCE = "woocommerce"
    MAGENTO = "magento"


class ConnectionMethod(str, Enum):
    """Connection method: API (REST) or DATABASE (direct SQL)"""
    API = "api"
    DATABASE = "database"


# ==========================================
# Request Schemas
# ==========================================

class EcommerceConnectionCreate(BaseModel):
    """Schema for creating a new ecommerce connection"""
    connection_name: str
    platform: PlatformType
    connection_method: ConnectionMethod = ConnectionMethod.API  # API (REST) or DATABASE (direct SQL)
    # API-based fields
    store_url: str | None = None  # "https://mystore.myshopify.com" or "https://mystore.com"
    api_key: str | None = None  # WooCommerce: consumer_key (ck_xxx)
    api_secret: str | None = None  # WooCommerce: consumer_secret (cs_xxx), Magento/Shopify: access token
    # Database-based fields (only needed for connection_method=database)
    db_host: str | None = None
    db_name: str | None = None
    db_user: str | None = None
    db_password: str | None = None
    db_port: int | None = None

    @field_validator('connection_name')
    @classmethod
    def validate_connection_name(cls, v):
        if not v or len(v.strip()) < 3:
            raise ValueError('Connection name must be at least 3 characters')
        return v.strip()

    @model_validator(mode='after')
    def validate_connection_fields(self):
        """Validate required fields based on connection_method"""
        if self.connection_method == ConnectionMethod.API:
            # API connections require store_url
            if not self.store_url or len(self.store_url.strip()) < 3:
                raise ValueError('Store URL is required for API connections')
            self.store_url = self.store_url.strip()
            # Set default port for API connections
            if self.db_port is None:
                self.db_port = 443
        elif self.connection_method == ConnectionMethod.DATABASE:
            # Database connections require db_host and db_password
            if not self.db_host or len(self.db_host.strip()) < 3:
                raise ValueError('Database host is required for database connections')
            if not self.db_password:
                raise ValueError('Database password is required for database connections')
            self.db_host = self.db_host.strip()
            # Set default port for database connections
            if self.db_port is None:
                if self.platform == PlatformType.SHOPIFY:
                    self.db_port = 443
                else:
                    self.db_port = 3306  # MySQL default for WooCommerce/Magento
        return self


class EcommerceConnectionUpdate(BaseModel):
    """Schema for updating an ecommerce connection"""
    connection_name: str | None = None
    platform: PlatformType | None = None
    connection_method: ConnectionMethod | None = None
    store_url: str | None = None
    api_key: str | None = None
    api_secret: str | None = None
    db_host: str | None = None
    db_name: str | None = None
    db_user: str | None = None
    db_password: str | None = None
    db_port: int | None = None


# ==========================================
# Response Schemas
# ==========================================

class EcommerceConnectionDetail(BaseModel):
    """Schema for ecommerce connection details"""
    id: int
    connection_name: str
    platform: PlatformType
    connection_method: ConnectionMethod
    # API fields (api_key/api_secret intentionally excluded — never expose secrets)
    store_url: str | None = None
    # Database fields (db_password intentionally excluded — never expose secrets)
    db_host: str | None = None
    db_name: str | None = None
    db_user: str | None = None
    db_port: int | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class EcommerceConnectionResponse(BaseModel):
    """Response schema for single ecommerce connection operations"""
    success: bool
    data: EcommerceConnectionDetail | None = None
    error: str | None = None


class EcommerceConnectionListResponse(BaseModel):
    """Response schema for listing ecommerce connections"""
    success: bool
    data: list[EcommerceConnectionDetail] | None = None
    count: int = 0
    error: str | None = None


class EcommerceConnectionTestResponse(BaseModel):
    """Response schema for connection test results"""
    success: bool
    message: str
    sample_products_count: int = 0


class MessageResponse(BaseModel):
    """Simple message response"""
    success: bool
    message: str | None = None
    error: str | None = None
