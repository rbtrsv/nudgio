from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List
from core.db import get_session
from apps.accounts.subrouters.auth_subrouter import get_current_user
from apps.accounts.models import User
from ..models import EcommerceConnection, RecommendationSettings
from ..schemas.settings_schemas import (
    RecommendationSettingsRequest,
    RecommendationSettingsResponse,
    SettingsDetailResponse,
    ConnectionSettingsResponse,
    SettingsListResponse,
    MessageResponse
)

router = APIRouter(prefix="/settings", tags=["Recommendation Settings"])


async def get_user_connection(connection_id: int, user_id: int, session: AsyncSession):
    """Helper to get and validate user connection"""
    result = await session.execute(
        select(EcommerceConnection).where(
            and_(
                EcommerceConnection.id == connection_id,
                EcommerceConnection.user_id == user_id
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


@router.post("/{connection_id}", response_model=RecommendationSettingsResponse)
async def create_or_update_settings(
    connection_id: int,
    settings_data: RecommendationSettingsRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Create or update recommendation settings for a connection"""
    
    connection = await get_user_connection(connection_id, current_user.id, session)
    
    # Check if settings already exist
    existing_result = await session.execute(
        select(RecommendationSettings).where(
            RecommendationSettings.connection_id == connection_id
        )
    )
    existing_settings = existing_result.scalar_one_or_none()
    
    if existing_settings:
        # Update existing settings
        existing_settings.default_limit = settings_data.default_limit
        existing_settings.default_lookback_days = settings_data.default_lookback_days
        existing_settings.bestseller_method = settings_data.bestseller_method
        existing_settings.cross_sell_enabled = settings_data.cross_sell_enabled
        existing_settings.upsell_enabled = settings_data.upsell_enabled
        existing_settings.similar_products_enabled = settings_data.similar_products_enabled
        existing_settings.min_upsell_price_increase = settings_data.min_upsell_price_increase
        existing_settings.cache_recommendations = settings_data.cache_recommendations
        existing_settings.cache_duration_minutes = settings_data.cache_duration_minutes
        existing_settings.shop_base_url = settings_data.shop_base_url
        existing_settings.product_url_template = settings_data.product_url_template
        
        await session.commit()
        await session.refresh(existing_settings)
        return existing_settings
    else:
        # Create new settings
        new_settings = RecommendationSettings(
            connection_id=connection_id,
            default_limit=settings_data.default_limit,
            default_lookback_days=settings_data.default_lookback_days,
            bestseller_method=settings_data.bestseller_method,
            cross_sell_enabled=settings_data.cross_sell_enabled,
            upsell_enabled=settings_data.upsell_enabled,
            similar_products_enabled=settings_data.similar_products_enabled,
            min_upsell_price_increase=settings_data.min_upsell_price_increase,
            cache_recommendations=settings_data.cache_recommendations,
            cache_duration_minutes=settings_data.cache_duration_minutes,
            shop_base_url=settings_data.shop_base_url,
            product_url_template=settings_data.product_url_template
        )
        
        session.add(new_settings)
        await session.commit()
        await session.refresh(new_settings)
        return new_settings


@router.get("/{connection_id}", response_model=RecommendationSettingsResponse)
async def get_settings(
    connection_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get recommendation settings for a connection"""
    
    await get_user_connection(connection_id, current_user.id, session)
    
    result = await session.execute(
        select(RecommendationSettings).where(
            RecommendationSettings.connection_id == connection_id
        )
    )
    
    settings = result.scalar_one_or_none()
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Settings not found for this connection"
        )
    
    return settings


@router.get("/", response_model=List[ConnectionSettingsResponse])
async def get_all_connection_settings(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get settings for all user connections"""
    
    # Get all user connections
    connections_result = await session.execute(
        select(EcommerceConnection).where(
            EcommerceConnection.user_id == current_user.id
        ).order_by(EcommerceConnection.created_at.desc())
    )
    
    connections = connections_result.scalars().all()
    response = []
    
    for connection in connections:
        # Get settings for this connection
        settings_result = await session.execute(
            select(RecommendationSettings).where(
                RecommendationSettings.connection_id == connection.id
            )
        )
        settings = settings_result.scalar_one_or_none()
        
        response.append(ConnectionSettingsResponse(
            connection_id=connection.id,
            connection_name=connection.connection_name,
            platform=connection.platform.value,
            settings=settings
        ))
    
    return response


@router.delete("/{connection_id}")
async def delete_settings(
    connection_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Delete recommendation settings for a connection"""
    
    await get_user_connection(connection_id, current_user.id, session)
    
    result = await session.execute(
        select(RecommendationSettings).where(
            RecommendationSettings.connection_id == connection_id
        )
    )
    
    settings = result.scalar_one_or_none()
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Settings not found for this connection"
        )
    
    await session.delete(settings)
    await session.commit()
    
    return {"message": "Settings deleted successfully"}


@router.post("/{connection_id}/reset")
async def reset_settings_to_default(
    connection_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Reset recommendation settings to default values"""
    
    await get_user_connection(connection_id, current_user.id, session)
    
    # Delete existing settings if they exist
    existing_result = await session.execute(
        select(RecommendationSettings).where(
            RecommendationSettings.connection_id == connection_id
        )
    )
    existing_settings = existing_result.scalar_one_or_none()
    
    if existing_settings:
        await session.delete(existing_settings)
        await session.commit()
    
    return {"message": "Settings reset to default values"}