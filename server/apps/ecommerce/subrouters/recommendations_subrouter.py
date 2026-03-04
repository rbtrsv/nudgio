from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List
from datetime import datetime
from core.db import get_session
from apps.accounts.subrouters.auth_subrouter import get_current_user
from apps.accounts.models import User
from ..models import EcommerceConnection, PlatformType, BestsellerMethod
from ..schemas.recommendation_schemas import (
    BestsellerRequest,
    CrossSellRequest, 
    UpsellRequest,
    SimilarProductsRequest,
    RecommendationResponse,
)
from ..adapters.factory import get_adapter
from ..engine.engine import RecommendationEngine

router = APIRouter(prefix="/recommendations", tags=["Product Recommendations"])


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


@router.post("/bestsellers", response_model=RecommendationResponse)
async def get_bestsellers(
    request: BestsellerRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get bestselling products using sales volume, value, or balanced approach"""
    
    connection = await get_user_connection(request.connection_id, current_user.id, session)
    
    try:
        adapter = get_adapter(connection)
        engine = RecommendationEngine(adapter)
        
        recommendations = await engine.get_bestsellers(
            limit=request.limit,
            method=request.method,
            lookback_days=request.lookback_days
        )
        
        return RecommendationResponse(
            recommendations=recommendations,
            total=len(recommendations),
            method=request.method.value,
            lookback_days=request.lookback_days,
            generated_at=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating recommendations: {str(e)}"
        )


@router.post("/cross-sell", response_model=RecommendationResponse)
async def get_cross_sell(
    request: CrossSellRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get frequently bought together products using market basket analysis"""
    
    connection = await get_user_connection(request.connection_id, current_user.id, session)
    
    try:
        adapter = get_adapter(connection)
        engine = RecommendationEngine(adapter)
        
        recommendations = await engine.get_cross_sell(
            product_id=request.product_id,
            limit=request.limit,
            lookback_days=request.lookback_days
        )
        
        return RecommendationResponse(
            recommendations=recommendations,
            total=len(recommendations),
            method="cross_sell",
            base_product_id=request.product_id,
            lookback_days=request.lookback_days,
            generated_at=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating recommendations: {str(e)}"
        )


@router.post("/upsell", response_model=RecommendationResponse)
async def get_upsell(
    request: UpsellRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get higher-priced alternatives in same category"""
    
    connection = await get_user_connection(request.connection_id, current_user.id, session)
    
    try:
        adapter = get_adapter(connection)
        engine = RecommendationEngine(adapter)
        
        recommendations = await engine.get_upsell(
            product_id=request.product_id,
            limit=request.limit,
            min_price_increase_percent=request.min_price_increase_percent
        )
        
        return RecommendationResponse(
            recommendations=recommendations,
            total=len(recommendations),
            method="upsell",
            base_product_id=request.product_id,
            lookback_days=request.lookback_days,
            generated_at=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating recommendations: {str(e)}"
        )


@router.post("/similar", response_model=RecommendationResponse)
async def get_similar_products(
    request: SimilarProductsRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get similar products based on category, vendor, and attributes"""
    
    connection = await get_user_connection(request.connection_id, current_user.id, session)
    
    try:
        adapter = get_adapter(connection)
        engine = RecommendationEngine(adapter)
        
        recommendations = await engine.get_similar(
            product_id=request.product_id,
            limit=request.limit
        )
        
        return RecommendationResponse(
            recommendations=recommendations,
            total=len(recommendations),
            method="similar",
            base_product_id=request.product_id,
            lookback_days=request.lookback_days,
            generated_at=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating recommendations: {str(e)}"
        )