"""
Ecommerce Dependency Utilities

Shared helper functions and FastAPI dependencies for the ecommerce module.

Connection Ownership Helpers:
    - get_user_connection: ownership + soft-delete filtered lookup (any connection)
    - get_active_connection: same + is_active check (for recommendation/data endpoints)

Organization Helpers:
    - get_user_organization_id: resolve user → organization via OrganizationMember

Router-Level Dependencies (applied to gated router — all gated endpoints):
    - require_active_subscription: blocks all requests when service is inactive (403)
    - enforce_rate_limit: per-org per-minute and per-hour request caps (429)

Subrouter-Level Dependencies (applied to recommendation + component routers only):
    - enforce_monthly_order_limit: blocks when monthly order quota exceeded (403)
"""

from typing import Optional
from fastapi import HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from ..models import EcommerceConnection
from .subscription_utils import (
    is_service_active,
    get_org_subscription,
    get_org_tier,
    get_tier_limits,
    get_org_monthly_order_count,
)
from .rate_limiting_utils import check_rate_limit
from apps.accounts.models import User, OrganizationMember
from apps.accounts.utils.auth_utils import get_current_user
from core.db import get_session


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


# ==========================================
# Organization Helpers
# ==========================================

async def get_user_organization_id(user_id: int, session: AsyncSession) -> Optional[int]:
    """
    Get the user's organization ID from their membership.

    Args:
        user_id: User ID
        session: Database session

    Returns:
        Organization ID or None if user has no organization
    """
    result = await session.execute(
        select(OrganizationMember.organization_id)
        .filter(OrganizationMember.user_id == user_id)
        .limit(1)
    )
    org_membership = result.scalar_one_or_none()
    return org_membership


# ==========================================
# Subscription Dependencies
# ==========================================

async def require_active_subscription(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Router-level dependency — covers all gated ecommerce subrouters.

    Blocks ALL requests (reads + writes) when service is inactive.
    Unlike finpy/nexotype which only gate writes, Nudgio blocks everything
    after grace period — widgets show nothing (not broken, just empty).

    Args:
        user: Current authenticated user (resolved by get_current_user)
        session: Database session
    """
    org_id = await get_user_organization_id(user.id, session)
    if not org_id:
        # No org = no connections = nothing to gate
        return

    if not await is_service_active(org_id, session):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your subscription has expired. Reactivate to restore access."
        )


async def enforce_rate_limit(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Router-level dependency — enforces per-org rate limits on all gated endpoints.

    Checks per-minute and per-hour request limits based on subscription tier.
    Raises HTTP 429 if either limit is exceeded.
    """
    org_id = await get_user_organization_id(user.id, session)
    if not org_id:
        # No org = FREE tier defaults
        await check_rate_limit(0, "FREE")
        return

    subscription = await get_org_subscription(org_id, session)
    tier = get_org_tier(subscription)
    await check_rate_limit(org_id, tier)


async def enforce_monthly_order_limit(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """
    Endpoint-level dependency — blocks recommendation requests when monthly order quota is exceeded.

    Only applied to recommendation and component subrouters (not connections, settings, or data).
    Raises HTTP 403 if the organization has exceeded their monthly order limit for their tier.
    """
    org_id = await get_user_organization_id(user.id, session)
    if not org_id:
        return

    subscription = await get_org_subscription(org_id, session)
    tier = get_org_tier(subscription)
    limits = get_tier_limits(tier)

    # None = unlimited (ENTERPRISE)
    if limits["max_monthly_orders"] is None:
        return

    current_count = await get_org_monthly_order_count(org_id, session)
    if current_count >= limits["max_monthly_orders"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Monthly order limit exceeded: {limits['max_monthly_orders']} requests/month for {tier} plan. Upgrade to increase your limit."
        )
