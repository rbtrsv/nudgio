from pydantic import BaseModel
from typing import List
from datetime import datetime


class ProductData(BaseModel):
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
    order_id: str
    customer_id: str | None = None
    total_price: float
    status: str
    order_date: datetime


class OrderItemData(BaseModel):
    order_id: str
    product_id: str
    variant_id: str | None = None
    quantity: int
    price: float
    product_title: str | None = None
    customer_id: str | None = None
    order_date: datetime


class DataImportRequest(BaseModel):
    connection_id: int
    data_type: str  # "products", "orders", "order_items"


class ProductImportRequest(DataImportRequest):
    products: List[ProductData]


class OrderImportRequest(DataImportRequest):
    orders: List[OrderData]


class OrderItemImportRequest(DataImportRequest):
    order_items: List[OrderItemData]


class DataImportResponse(BaseModel):
    """Response schema for data import operations"""
    success: bool
    message: str | None = None
    records_processed: int = 0
    errors: List[str] = []
    error: str | None = None


class ConnectionStatsResponse(BaseModel):
    connection_id: int
    connection_name: str
    platform: str
    products_count: int
    orders_count: int
    order_items_count: int
    last_sync: datetime | None = None
    data_freshness_days: int | None = None

class StatsResponse(BaseModel):
    """Response schema for connection stats"""
    success: bool
    data: ConnectionStatsResponse | None = None
    error: str | None = None