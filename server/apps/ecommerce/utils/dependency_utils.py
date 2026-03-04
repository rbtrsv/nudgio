"""
Ecommerce Dependency Utilities

Shared helper functions for validating connection ownership across subrouters.
"""

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from ..models import EcommerceConnection


# ==========================================
# Connection Ownership Helpers
# ==========================================

async def get_user_connection(connection_id: int, user_id: int, db: AsyncSession):
    """
    Get and validate that the user owns the connection.

    Args:
        connection_id: ID of the connection to look up
        user_id: ID of the current user (ownership check)
        db: Database session

    Returns:
        The EcommerceConnection instance

    Raises:
        HTTPException 404 if connection not found or not owned by user
    """
    result = await db.execute(
        select(EcommerceConnection).where(
            and_(
                EcommerceConnection.id == connection_id,
                EcommerceConnection.user_id == user_id,
                EcommerceConnection.deleted_at == None,  # Soft delete filter
            )
        )
    )
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    return connection


async def get_active_connection(connection_id: int, user_id: int, db: AsyncSession):
    """
    Get and validate that the user owns an active connection.

    Same as get_user_connection but also checks is_active == True.
    Used by recommendation and data endpoints that require a tested connection.

    Args:
        connection_id: ID of the connection to look up
        user_id: ID of the current user (ownership check)
        db: Database session

    Returns:
        The EcommerceConnection instance (guaranteed active)

    Raises:
        HTTPException 404 if connection not found, not owned, or not active
    """
    result = await db.execute(
        select(EcommerceConnection).where(
            and_(
                EcommerceConnection.id == connection_id,
                EcommerceConnection.user_id == user_id,
                EcommerceConnection.is_active == True,
                EcommerceConnection.deleted_at == None,  # Soft delete filter
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
