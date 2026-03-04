"""
Nudgio Schemas — Data Management

Data transfer objects for product/order import and connection statistics.
"""

from pydantic import BaseModel
from datetime import datetime


# ==========================================
# Data Transfer Objects
# ==========================================

class ProductData(BaseModel):
    """Single product record for import"""
    product_id: str
    title: str
    handle: str | None = None
    product_type: str | None = None
    vendor: str | None = None
    sku: str | None = None
    price: float
    inventory_quantity: int | None = None
    status: str | None = "active"
    created_at: datetime | None = None
    updated_at: datetime | None = None


class OrderData(BaseModel):
    """Single order record for import"""
    order_id: str
    customer_id: str | None = None
    total_price: float
    status: str
    order_date: datetime


class OrderItemData(BaseModel):
    """Single order line item for import"""
    order_id: str
    product_id: str
    variant_id: str | None = None
    quantity: int
    price: float
    product_title: str | None = None
    customer_id: str | None = None
    order_date: datetime


# ==========================================
# Request Schemas
# ==========================================

class DataImportRequest(BaseModel):
    """Base request for data import operations"""
    connection_id: int
    data_type: str  # "products", "orders", "order_items"


class ProductImportRequest(DataImportRequest):
    """Request for importing product data"""
    products: list[ProductData]


class OrderImportRequest(DataImportRequest):
    """Request for importing order data"""
    orders: list[OrderData]


class OrderItemImportRequest(DataImportRequest):
    """Request for importing order item data"""
    order_items: list[OrderItemData]


# ==========================================
# Response Schemas
# ==========================================

class DataImportResponse(BaseModel):
    """Response schema for data import operations"""
    success: bool
    message: str | None = None
    records_processed: int = 0
    errors: list[str] = []
    error: str | None = None


class ConnectionStatsDetail(BaseModel):
    """Schema for connection data statistics"""
    connection_id: int
    connection_name: str
    platform: str
    products_count: int
    orders_count: int
    order_items_count: int
    last_sync: datetime | None = None
    data_freshness_days: int | None = None


class ConnectionStatsResponse(BaseModel):
    """Response schema for connection stats operations"""
    success: bool
    data: ConnectionStatsDetail | None = None
    error: str | None = None
