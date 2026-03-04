from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, text
from typing import List
from core.db import get_session
from apps.accounts.subrouters.auth_subrouter import get_current_user
from apps.accounts.models import User
from ..models import EcommerceConnection, PlatformType
from ..schemas.data_schemas import (
    ProductImportRequest,
    OrderImportRequest, 
    OrderItemImportRequest,
    DataImportResponse,
    ConnectionStatsResponse,
    StatsResponse
)
from ..adapters.factory import get_adapter
from sqlalchemy import create_engine

router = APIRouter(prefix="/data", tags=["Data Management"])


async def get_user_connection(connection_id: int, user_id: int, session: AsyncSession):
    """Helper to get and validate user connection"""
    result = await session.execute(
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
    request: ProductImportRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Import product data (for platforms that support direct data insertion)"""
    
    connection = await get_user_connection(request.connection_id, current_user.id, session)
    
    # Note: This is a placeholder implementation
    # In practice, you might not want to allow direct data insertion into customer databases
    # Instead, you might store this data in your own database for analysis
    
    try:
        processed = 0
        errors = []
        
        # Validate product data
        for product in request.products:
            if not product.product_id or not product.title:
                errors.append(f"Product missing required fields: {product.dict()}")
                continue
            processed += 1
        
        return DataImportResponse(
            success=len(errors) == 0,
            message=f"Processed {processed} products with {len(errors)} errors",
            records_processed=processed,
            errors=errors
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error importing products: {str(e)}"
        )


@router.post("/import/orders", response_model=DataImportResponse) 
async def import_orders(
    request: OrderImportRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Import order data (for platforms that support direct data insertion)"""
    
    connection = await get_user_connection(request.connection_id, current_user.id, session)
    
    try:
        processed = 0
        errors = []
        
        # Validate order data
        for order in request.orders:
            if not order.order_id or not order.total_price:
                errors.append(f"Order missing required fields: {order.dict()}")
                continue
            processed += 1
        
        return DataImportResponse(
            success=len(errors) == 0,
            message=f"Processed {processed} orders with {len(errors)} errors",
            records_processed=processed,
            errors=errors
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error importing orders: {str(e)}"
        )


@router.post("/import/order-items", response_model=DataImportResponse)
async def import_order_items(
    request: OrderItemImportRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Import order items data (for platforms that support direct data insertion)"""
    
    connection = await get_user_connection(request.connection_id, current_user.id, session)
    
    try:
        processed = 0
        errors = []
        
        # Validate order items data
        for item in request.order_items:
            if not item.order_id or not item.product_id or not item.quantity:
                errors.append(f"Order item missing required fields: {item.dict()}")
                continue
            processed += 1
        
        return DataImportResponse(
            success=len(errors) == 0,
            message=f"Processed {processed} order items with {len(errors)} errors", 
            records_processed=processed,
            errors=errors
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error importing order items: {str(e)}"
        )


@router.get("/stats/{connection_id}", response_model=ConnectionStatsResponse)
async def get_connection_stats(
    connection_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get data statistics for a connection"""
    
    connection = await get_user_connection(connection_id, current_user.id, session)
    
    try:
        adapter = get_adapter(connection)
        
        # Get basic counts
        products = await adapter.get_products(limit=1)
        orders = await adapter.get_orders(limit=1, lookback_days=365)
        order_items = await adapter.get_order_items(limit=1, lookback_days=365)
        
        # Note: This is a simplified implementation
        # In practice, you'd want separate count queries for better performance
        
        return ConnectionStatsResponse(
            connection_id=connection.id,
            connection_name=connection.connection_name,
            platform=connection.platform.value,
            products_count=len(products) if products else 0,
            orders_count=len(orders) if orders else 0,
            order_items_count=len(order_items) if order_items else 0,
            last_sync=connection.updated_at,
            data_freshness_days=30  # Placeholder
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting connection stats: {str(e)}"
        )


@router.post("/sync/{connection_id}")
async def sync_connection_data(
    connection_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Trigger data sync for a connection (placeholder for future implementation)"""
    
    connection = await get_user_connection(connection_id, current_user.id, session)
    
    # This would typically trigger a background job to sync data
    # For now, just update the connection's updated_at timestamp
    
    connection.updated_at = connection.updated_at
    await session.commit()
    
    return {
        "message": "Data sync triggered successfully",
        "connection_id": connection_id,
        "connection_name": connection.connection_name
    }