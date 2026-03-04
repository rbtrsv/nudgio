from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime

from core.db import get_session
from apps.accounts.models import User
from apps.accounts.utils.auth_utils import get_current_user

from ..models import EcommerceConnection
from ..schemas.recommendation_schemas import (
    BestsellerRequest,
    CrossSellRequest,
    UpsellRequest,
    SimilarProductsRequest,
    RecommendationResult,
    RecommendationResponse,
)
from ..adapters.factory import get_adapter
from ..engine.engine import RecommendationEngine

# ==========================================
# Product Recommendations Router
# ==========================================

router = APIRouter(prefix="/recommendations", tags=["Product Recommendations"])


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


@router.post("/bestsellers", response_model=RecommendationResponse)
async def get_bestsellers(
    payload: BestsellerRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """
    Get bestselling products

    This endpoint:
    1. Validates the user owns an active connection
    2. Creates the platform adapter and recommendation engine
    3. Generates bestseller recommendations using volume, value, or balanced method
    4. Returns the recommendation results
    """
    try:
        # Validate user owns an active connection
        connection = await get_active_connection(payload.connection_id, user.id, db)

        # Create adapter and engine
        adapter = get_adapter(connection)
        engine = RecommendationEngine(adapter)

        # Generate bestseller recommendations
        recommendations = await engine.get_bestsellers(
            limit=payload.limit,
            method=payload.method,
            lookback_days=payload.lookback_days,
        )

        return RecommendationResponse(
            success=True,
            data=RecommendationResult(
                recommendations=recommendations,
                count=len(recommendations),
                method=payload.method.value,
                lookback_days=payload.lookback_days,
                generated_at=datetime.utcnow().isoformat(),
            ),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating recommendations: {str(e)}")


@router.post("/cross-sell", response_model=RecommendationResponse)
async def get_cross_sell(
    payload: CrossSellRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """
    Get frequently bought together products

    This endpoint:
    1. Validates the user owns an active connection
    2. Creates the platform adapter and recommendation engine
    3. Generates cross-sell recommendations using market basket analysis
    4. Returns the recommendation results
    """
    try:
        # Validate user owns an active connection
        connection = await get_active_connection(payload.connection_id, user.id, db)

        # Create adapter and engine
        adapter = get_adapter(connection)
        engine = RecommendationEngine(adapter)

        # Generate cross-sell recommendations
        recommendations = await engine.get_cross_sell(
            product_id=payload.product_id,
            limit=payload.limit,
            lookback_days=payload.lookback_days,
        )

        return RecommendationResponse(
            success=True,
            data=RecommendationResult(
                recommendations=recommendations,
                count=len(recommendations),
                method="cross_sell",
                base_product_id=payload.product_id,
                lookback_days=payload.lookback_days,
                generated_at=datetime.utcnow().isoformat(),
            ),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating recommendations: {str(e)}")


@router.post("/upsell", response_model=RecommendationResponse)
async def get_upsell(
    payload: UpsellRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """
    Get higher-priced alternatives in same category

    This endpoint:
    1. Validates the user owns an active connection
    2. Creates the platform adapter and recommendation engine
    3. Generates upsell recommendations above the price threshold
    4. Returns the recommendation results
    """
    try:
        # Validate user owns an active connection
        connection = await get_active_connection(payload.connection_id, user.id, db)

        # Create adapter and engine
        adapter = get_adapter(connection)
        engine = RecommendationEngine(adapter)

        # Generate upsell recommendations
        recommendations = await engine.get_upsell(
            product_id=payload.product_id,
            limit=payload.limit,
            min_price_increase_percent=payload.min_price_increase_percent,
        )

        return RecommendationResponse(
            success=True,
            data=RecommendationResult(
                recommendations=recommendations,
                count=len(recommendations),
                method="upsell",
                base_product_id=payload.product_id,
                lookback_days=payload.lookback_days,
                generated_at=datetime.utcnow().isoformat(),
            ),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating recommendations: {str(e)}")


@router.post("/similar", response_model=RecommendationResponse)
async def get_similar_products(
    payload: SimilarProductsRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """
    Get similar products based on category, vendor, and attributes

    This endpoint:
    1. Validates the user owns an active connection
    2. Creates the platform adapter and recommendation engine
    3. Generates similar product recommendations
    4. Returns the recommendation results
    """
    try:
        # Validate user owns an active connection
        connection = await get_active_connection(payload.connection_id, user.id, db)

        # Create adapter and engine
        adapter = get_adapter(connection)
        engine = RecommendationEngine(adapter)

        # Generate similar product recommendations
        recommendations = await engine.get_similar(
            product_id=payload.product_id,
            limit=payload.limit,
        )

        return RecommendationResponse(
            success=True,
            data=RecommendationResult(
                recommendations=recommendations,
                count=len(recommendations),
                method="similar",
                base_product_id=payload.product_id,
                lookback_days=payload.lookback_days,
                generated_at=datetime.utcnow().isoformat(),
            ),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating recommendations: {str(e)}")
