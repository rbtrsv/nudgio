from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from core.db import get_session
from apps.accounts.models import User
from apps.accounts.utils.auth_utils import get_current_user

from ..models import EcommerceConnection
from ..schemas.data_schemas import (
    ProductImportRequest,
    OrderImportRequest,
    OrderItemImportRequest,
    DataImportResponse,
    ConnectionStatsDetail,
    ConnectionStatsResponse,
)
from ..adapters.factory import get_adapter

# ==========================================
# Data Management Router
# ==========================================

router = APIRouter(prefix="/data", tags=["Data Management"])


async def get_active_connection(connection_id: int, user_id: int, db: AsyncSession):
    """Helper to get and validate user owns an active connection"""
    result = await db.execute(
        select(EcommerceConnection).where(
            and_(
                EcommerceConnection.id == connection_id,
                EcommerceConnection.user_id == user_id,
                EcommerceConnection.is_active == True
            )
        )
    )
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active connection not found"
        )
    return connection


@router.post("/import/products", response_model=DataImportResponse)
async def import_products(
    payload: ProductImportRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """
    Import product data for a connection

    This endpoint:
    1. Validates the user owns an active connection
    2. Validates each product record
    3. Returns import results with processed count and errors
    """
    try:
        # Validate user owns an active connection
        await get_active_connection(payload.connection_id, user.id, db)

        # Validate product data
        processed = 0
        errors = []
        for product in payload.products:
            if not product.product_id or not product.title:
                errors.append(f"Product missing required fields: {product.model_dump()}")
                continue
            processed += 1

        return DataImportResponse(
            success=len(errors) == 0,
            message=f"Processed {processed} products with {len(errors)} errors",
            records_processed=processed,
            errors=errors,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error importing products: {str(e)}")


@router.post("/import/orders", response_model=DataImportResponse)
async def import_orders(
    payload: OrderImportRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """
    Import order data for a connection

    This endpoint:
    1. Validates the user owns an active connection
    2. Validates each order record
    3. Returns import results with processed count and errors
    """
    try:
        # Validate user owns an active connection
        await get_active_connection(payload.connection_id, user.id, db)

        # Validate order data
        processed = 0
        errors = []
        for order in payload.orders:
            if not order.order_id or not order.total_price:
                errors.append(f"Order missing required fields: {order.model_dump()}")
                continue
            processed += 1

        return DataImportResponse(
            success=len(errors) == 0,
            message=f"Processed {processed} orders with {len(errors)} errors",
            records_processed=processed,
            errors=errors,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error importing orders: {str(e)}")


@router.post("/import/order-items", response_model=DataImportResponse)
async def import_order_items(
    payload: OrderItemImportRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """
    Import order item data for a connection

    This endpoint:
    1. Validates the user owns an active connection
    2. Validates each order item record
    3. Returns import results with processed count and errors
    """
    try:
        # Validate user owns an active connection
        await get_active_connection(payload.connection_id, user.id, db)

        # Validate order items data
        processed = 0
        errors = []
        for item in payload.order_items:
            if not item.order_id or not item.product_id or not item.quantity:
                errors.append(f"Order item missing required fields: {item.model_dump()}")
                continue
            processed += 1

        return DataImportResponse(
            success=len(errors) == 0,
            message=f"Processed {processed} order items with {len(errors)} errors",
            records_processed=processed,
            errors=errors,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error importing order items: {str(e)}")


@router.get("/stats/{connection_id}", response_model=ConnectionStatsResponse)
async def get_connection_stats(
    connection_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """
    Get data statistics for a connection

    This endpoint:
    1. Validates the user owns an active connection
    2. Queries product, order, and order item counts via the adapter
    3. Returns the connection statistics
    """
    try:
        # Validate user owns an active connection
        connection = await get_active_connection(connection_id, user.id, db)

        # Get basic counts via adapter
        adapter = get_adapter(connection)
        products = await adapter.get_products(limit=1)
        orders = await adapter.get_orders(limit=1, lookback_days=365)
        order_items = await adapter.get_order_items(limit=1, lookback_days=365)

        # Note: Simplified implementation — in practice, use separate count queries
        return ConnectionStatsResponse(
            success=True,
            data=ConnectionStatsDetail(
                connection_id=connection.id,
                connection_name=connection.connection_name,
                platform=connection.platform,
                products_count=len(products) if products else 0,
                orders_count=len(orders) if orders else 0,
                order_items_count=len(order_items) if order_items else 0,
                last_sync=connection.updated_at,
                data_freshness_days=30,
            ),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting connection stats: {str(e)}")


@router.post("/sync/{connection_id}", response_model=ConnectionStatsResponse)
async def sync_connection_data(
    connection_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """
    Trigger data sync for a connection

    This endpoint:
    1. Validates the user owns an active connection
    2. Triggers a data sync (placeholder for background job)
    3. Returns the current connection statistics
    """
    try:
        # Validate user owns an active connection
        connection = await get_active_connection(connection_id, user.id, db)

        # Placeholder: would trigger a background job to sync data
        connection.updated_at = connection.updated_at
        await db.commit()

        # Return current stats
        adapter = get_adapter(connection)
        products = await adapter.get_products(limit=1)
        orders = await adapter.get_orders(limit=1, lookback_days=365)
        order_items = await adapter.get_order_items(limit=1, lookback_days=365)

        return ConnectionStatsResponse(
            success=True,
            data=ConnectionStatsDetail(
                connection_id=connection.id,
                connection_name=connection.connection_name,
                platform=connection.platform,
                products_count=len(products) if products else 0,
                orders_count=len(orders) if orders else 0,
                order_items_count=len(order_items) if order_items else 0,
                last_sync=connection.updated_at,
                data_freshness_days=30,
            ),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error syncing connection data: {str(e)}")
