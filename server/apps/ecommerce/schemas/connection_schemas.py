from pydantic import BaseModel, field_validator, ConfigDict
from datetime import datetime
from ..models import PlatformType


class ConnectionCreateRequest(BaseModel):
    connection_name: str
    platform: PlatformType
    # For Shopify: db_host = store domain, db_password = access token
    # For WooCommerce/Magento: standard database fields
    db_host: str  # Shopify: "mystore.myshopify.com", Others: database host
    db_name: str | None = ""  # Shopify: unused, Others: database name
    db_user: str | None = ""  # Shopify: unused, Others: database user
    db_password: str  # Shopify: access token, Others: database password
    db_port: int | None = None
    
    @field_validator('connection_name')
    @classmethod
    def validate_connection_name(cls, v):
        if not v or len(v.strip()) < 3:
            raise ValueError('Connection name must be at least 3 characters')
        return v.strip()
    
    @field_validator('db_host')
    @classmethod
    def validate_db_host(cls, v):
        if not v or len(v.strip()) < 3:
            raise ValueError('Database host is required')
        return v.strip()
    
    @field_validator('db_port')
    @classmethod
    def validate_db_port(cls, v, info):
        if v is None:
            # Set default port based on platform
            platform = info.data.get('platform')
            if platform == PlatformType.SHOPIFY:
                return 443  # HTTPS for Shopify API
            else:
                return 3306  # MySQL default for WooCommerce/Magento
        return v


class ConnectionResponse(BaseModel):
    id: int
    connection_name: str
    platform: PlatformType
    db_host: str
    db_name: str
    db_user: str
    db_port: int
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None
    
    model_config = ConfigDict(from_attributes=True)


class ConnectionTestResponse(BaseModel):
    success: bool
    message: str
    sample_products_count: int = 0


class ConnectionDetailResponse(BaseModel):
    """Response schema for connection operations"""
    success: bool
    data: ConnectionResponse | None = None
    error: str | None = None

class ConnectionListResponse(BaseModel):
    """Response schema for listing connections"""
    success: bool
    data: list[ConnectionResponse] | None = None
    total: int = 0
    error: str | None = None

class MessageResponse(BaseModel):
    """Generic message response"""
    success: bool
    message: str | None = None
    error: str | None = None