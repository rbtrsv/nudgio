"""
Ecommerce Dependency Utilities

Shared helper functions and FastAPI dependencies for the ecommerce module.

Connection Ownership Helpers:
    - get_user_connection: ownership + soft-delete filtered lookup (any connection)
    - get_active_connection: same + is_active check (for recommendation/data endpoints)

Organization Helpers:
    - get_user_organization_id: resolve user → organization via OrganizationMember

Shared Context (resolved ONCE per request via FastAPI Depends deduplication):
    - get_org_context: queries org_id + subscription + tier in 2 DB calls, shared
      across all dependencies that need org/subscription info

Router-Level Dependencies (applied to gated router — all gated endpoints):
    - require_active_subscription: blocks all requests when service is inactive (403)
    - enforce_rate_limit: per-org per-minute and per-hour request caps (429)

Subrouter-Level Dependencies (applied to recommendation + component routers only):
    - enforce_monthly_order_limit: blocks when monthly order quota exceeded (403)
"""

from dataclasses import dataclass
from typing import Optional
from fastapi import HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from ..models import EcommerceConnection
from .subscription_utils import (
    is_service_active_with_subscription,
    get_org_subscription,
    get_org_tier,
    get_tier_limits,
    get_org_monthly_order_count,
)
from .rate_limiting_utils import check_rate_limit
from apps.accounts.models import User, OrganizationMember, Subscription
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
# Shared Organization Context
# ==========================================

@dataclass
class OrgContext:
    """
    Resolved once per request via FastAPI Depends deduplication.

    All dependencies that need org_id / subscription / tier declare
    Depends(get_org_context). FastAPI calls get_org_context exactly once
    per request and reuses the result — reducing 3x org_id + 3x subscription
    queries down to 1x each (2 DB calls total instead of 10+).
    """
    org_id: Optional[int]
    subscription: Optional[Subscription]
    tier: str


async def get_org_context(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> OrgContext:
    """
    Resolve the user's organization context in 2 DB calls.

    This endpoint:
    1. Look up the user's organization ID from OrganizationMember
    2. Look up the organization's subscription record
    3. Derive the tier from the subscription

    FastAPI deduplicates Depends() — when multiple dependencies declare
    Depends(get_org_context), this function runs once and the result is
    shared across require_active_subscription, enforce_rate_limit, and
    enforce_monthly_order_limit within the same request.
    """
    org_id = await get_user_organization_id(user.id, session)
    if not org_id:
        return OrgContext(org_id=None, subscription=None, tier="FREE")

    subscription = await get_org_subscription(org_id, session)
    tier = get_org_tier(subscription)
    return OrgContext(org_id=org_id, subscription=subscription, tier=tier)


# ==========================================
# Subscription Dependencies
# ==========================================

async def require_active_subscription(
    ctx: OrgContext = Depends(get_org_context),
    session: AsyncSession = Depends(get_session),
):
    """
    Router-level dependency — covers all gated ecommerce subrouters.

    Blocks ALL requests (reads + writes) when service is inactive.
    Unlike finpy/nexotype which only gate writes, Nudgio blocks everything
    after grace period — widgets show nothing (not broken, just empty).

    Uses get_org_context (deduplicated) for org_id and subscription.
    Passes ctx.subscription to is_service_active_with_subscription to avoid
    re-querying. Only needs its own session for the FREE tier connection
    count check (when subscription is None).
    """
    if not ctx.org_id:
        # No org = no connections = nothing to gate
        return

    if not await is_service_active_with_subscription(ctx.subscription, ctx.org_id, session):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your subscription has expired. Reactivate to restore access."
        )


async def enforce_rate_limit(
    ctx: OrgContext = Depends(get_org_context),
):
    """
    Router-level dependency — enforces per-org rate limits on all gated endpoints.

    Checks per-minute and per-hour request limits based on subscription tier.
    Raises HTTP 429 if either limit is exceeded.

    Uses get_org_context (deduplicated) — no additional DB queries needed.
    """
    if not ctx.org_id:
        # No org = FREE tier defaults
        await check_rate_limit(0, "FREE")
        return

    await check_rate_limit(ctx.org_id, ctx.tier)


async def enforce_monthly_order_limit(
    ctx: OrgContext = Depends(get_org_context),
    session: AsyncSession = Depends(get_session),
):
    """
    Endpoint-level dependency — blocks recommendation requests when monthly order quota is exceeded.

    Only applied to recommendation and component subrouters (not connections, settings, or data).
    Raises HTTP 403 if the organization has exceeded their monthly order limit for their tier.

    Uses get_org_context (deduplicated) for org_id and tier.
    Only needs its own session for the monthly order count query.
    """
    if not ctx.org_id:
        return

    limits = get_tier_limits(ctx.tier)

    # None = unlimited (ENTERPRISE)
    if limits["max_monthly_orders"] is None:
        return

    current_count = await get_org_monthly_order_count(ctx.org_id, session)
    if current_count >= limits["max_monthly_orders"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Monthly order limit exceeded: {limits['max_monthly_orders']} requests/month for {ctx.tier} plan. Upgrade to increase your limit."
        )
