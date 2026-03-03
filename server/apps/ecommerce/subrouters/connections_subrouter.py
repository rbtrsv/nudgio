from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, text
from core.db import get_session
from apps.accounts.subrouters.auth_subrouter import get_current_user
from apps.accounts.models import User, OrganizationMember
from ..models import EcommerceConnection, PlatformType
from ..schemas.connection_schemas import (
    ConnectionCreateRequest, 
    ConnectionResponse, 
    ConnectionDetailResponse,
    ConnectionListResponse,
    ConnectionTestResponse,
    MessageResponse
)
from ..adapters.shopify import ShopifyAdapter
from ..adapters.woocommerce import WooCommerceAdapter
from ..adapters.magento import MagentoAdapter

router = APIRouter(prefix="/connections", tags=["Database Connections"])


@router.post("/", response_model=ConnectionDetailResponse)
async def create_connection(
    connection_data: ConnectionCreateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Create a new ecommerce database connection"""
    
    # Get user's organization ID from membership
    org_result = await session.execute(
        select(OrganizationMember).where(OrganizationMember.user_id == current_user.id)
    )
    membership = org_result.scalar_one_or_none()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to an organization"
        )
    
    try:
        # Check if connection name already exists for this user
        existing = await session.execute(
            select(EcommerceConnection).where(
                and_(
                    EcommerceConnection.user_id == current_user.id,
                    EcommerceConnection.connection_name == connection_data.connection_name
                )
            )
        )
        if existing.scalar_one_or_none():
            return ConnectionDetailResponse(
                success=False,
                data=None,
                error="Connection name already exists"
            )
        
        # Create new connection
        new_connection = EcommerceConnection(
            user_id=current_user.id,
            organization_id=membership.organization_id,
            connection_name=connection_data.connection_name,
            platform=connection_data.platform,
            db_host=connection_data.db_host,
            db_name=connection_data.db_name,
            db_user=connection_data.db_user,
            db_password=connection_data.db_password,
            db_port=connection_data.db_port,
            is_active=False
        )
        
        session.add(new_connection)
        await session.commit()
        await session.refresh(new_connection)
        
        return ConnectionDetailResponse(
            success=True,
            data=ConnectionResponse.model_validate(new_connection)
        )
    except Exception as e:
        await session.rollback()
        return ConnectionDetailResponse(
            success=False,
            data=None,
            error=f"An error occurred: {str(e)}"
        )


@router.get("/", response_model=ConnectionListResponse)
async def list_connections(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get all ecommerce connections for current user"""
    
    result = await session.execute(
        select(EcommerceConnection).where(
            EcommerceConnection.user_id == current_user.id
        ).order_by(EcommerceConnection.created_at.desc())
    )
    
    connections = result.scalars().all()
    
    try:
        return ConnectionListResponse(
            success=True,
            data=[ConnectionResponse.model_validate(conn) for conn in connections],
            total=len(connections)
        )
    except Exception as e:
        return ConnectionListResponse(
            success=False,
            data=None,
            total=0,
            error=f"An error occurred: {str(e)}"
        )


@router.get("/{connection_id}", response_model=ConnectionDetailResponse)
async def get_connection(
    connection_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get a specific connection by ID"""
    
    try:
        result = await session.execute(
            select(EcommerceConnection).where(
                and_(
                    EcommerceConnection.id == connection_id,
                    EcommerceConnection.user_id == current_user.id
                )
            )
        )
        
        connection = result.scalar_one_or_none()
        if not connection:
            return ConnectionDetailResponse(
                success=False,
                data=None,
                error="Connection not found"
            )
        
        return ConnectionDetailResponse(
            success=True,
            data=ConnectionResponse.model_validate(connection)
        )
    except Exception as e:
        return ConnectionDetailResponse(
            success=False,
            data=None,
            error=f"An error occurred: {str(e)}"
        )


@router.post("/{connection_id}/test", response_model=ConnectionTestResponse)
async def test_connection(
    connection_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Test ecommerce database connection and return sample data"""
    
    # Get connection
    result = await session.execute(
        select(EcommerceConnection).where(
            and_(
                EcommerceConnection.id == connection_id,
                EcommerceConnection.user_id == current_user.id
            )
        )
    )
    
    connection = result.scalar_one_or_none()
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )
    
    try:
        # Create adapter based on platform
        if connection.platform == PlatformType.SHOPIFY:
            adapter = ShopifyAdapter(connection)
        elif connection.platform == PlatformType.WOOCOMMERCE:
            adapter = WooCommerceAdapter(connection)
        elif connection.platform == PlatformType.MAGENTO:
            adapter = MagentoAdapter(connection)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported platform"
            )
        
        # First, always explore database structure - this helps with debugging
        table_info = ""
        try:
            # Skip table exploration for API-based adapters (like Shopify)
            if not hasattr(adapter, 'engine'):
                table_info = f" | {connection.platform.value} uses API access (no direct database tables)"
            else:
                async with adapter.engine.begin() as conn:
                    # Define table patterns based on platform
                    if connection.platform == PlatformType.WOOCOMMERCE:
                        patterns = [
                            ('%wc_%', 'HPOS tables'),
                            ('%woocommerce%', 'Legacy tables'),
                            ('%order%', 'Order tables')
                        ]
                    elif connection.platform == PlatformType.SHOPIFY:
                        patterns = [
                            ('%shop_%', 'Shop tables'),
                            ('%product%', 'Product tables'),
                            ('%customer%', 'Customer tables'),
                            ('%order%', 'Order tables')
                        ]
                    elif connection.platform == PlatformType.MAGENTO:
                        patterns = [
                            ('%sales_%', 'Sales tables'),
                            ('%catalog_%', 'Catalog tables'),
                            ('%quote%', 'Quote tables'),
                            ('%customer%', 'Customer tables')
                        ]
                    else:
                        patterns = [('%_%', 'All tables')]
                    
                    # Collect tables for each pattern
                    table_groups = {}
                    for pattern, label in patterns:
                        result = await conn.execute(text(f"SHOW TABLES LIKE '{pattern}'"))
                        tables = [row[0] for row in result.fetchall()]
                        if tables:  # Only include non-empty groups
                            table_groups[label] = tables
                    
                    # Format table info
                    if table_groups:
                        table_parts = [f"{label}: {tables}" for label, tables in table_groups.items()]
                        table_info = f" | {' | '.join(table_parts)}"
                    else:
                        table_info = f" | No {connection.platform.value} tables found"
                    
        except Exception as e:
            table_info = f" | Table exploration failed: {str(e)}"
        
        # Now test by getting sample products
        products = []
        product_error = None
        try:
            products = await adapter.get_products(limit=10)
        except Exception as e:
            product_error = str(e)
        
        if products:
            # Update connection as active
            connection.is_active = True
            await session.commit()
            
            return ConnectionTestResponse(
                success=True,
                message=f"Connection successful! Found {len(products)} products.{table_info}",
                sample_products_count=len(products)
            )
        else:
            error_detail = f" Product query failed: {product_error}" if product_error else " No products found."
            return ConnectionTestResponse(
                success=False,
                message=f"Connection successful but{error_detail} Check your database schema.{table_info}",
                sample_products_count=0
            )
            
    except Exception as e:
        return ConnectionTestResponse(
            success=False,
            message=f"Connection failed: {str(e)}",
            sample_products_count=0
        )


@router.put("/{connection_id}", response_model=ConnectionDetailResponse)
async def update_connection(
    connection_id: int,
    connection_data: ConnectionCreateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Update an existing connection"""
    
    try:
        # Get connection
        result = await session.execute(
            select(EcommerceConnection).where(
                and_(
                    EcommerceConnection.id == connection_id,
                    EcommerceConnection.user_id == current_user.id
                )
            )
        )
        
        connection = result.scalar_one_or_none()
        if not connection:
            return ConnectionDetailResponse(
                success=False,
                data=None,
                error="Connection not found"
            )
        
        # Check if new connection name conflicts with existing ones (excluding current)
        if connection_data.connection_name != connection.connection_name:
            existing = await session.execute(
                select(EcommerceConnection).where(
                    and_(
                        EcommerceConnection.user_id == current_user.id,
                        EcommerceConnection.connection_name == connection_data.connection_name,
                        EcommerceConnection.id != connection_id
                    )
                )
            )
            if existing.scalar_one_or_none():
                return ConnectionDetailResponse(
                    success=False,
                    data=None,
                    error="Connection name already exists"
                )
        
        # Update fields
        connection.connection_name = connection_data.connection_name
        connection.platform = connection_data.platform
        connection.db_host = connection_data.db_host
        connection.db_name = connection_data.db_name
        connection.db_user = connection_data.db_user
        connection.db_password = connection_data.db_password
        connection.db_port = connection_data.db_port
        connection.is_active = False  # Reset active status, user needs to test again
        
        await session.commit()
        await session.refresh(connection)
        
        return ConnectionDetailResponse(
            success=True,
            data=ConnectionResponse.model_validate(connection)
        )
    except Exception as e:
        await session.rollback()
        return ConnectionDetailResponse(
            success=False,
            data=None,
            error=f"An error occurred: {str(e)}"
        )


@router.delete("/{connection_id}", response_model=MessageResponse)
async def delete_connection(
    connection_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Delete a connection"""
    
    try:
        result = await session.execute(
            select(EcommerceConnection).where(
                and_(
                    EcommerceConnection.id == connection_id,
                    EcommerceConnection.user_id == current_user.id
                )
            )
        )
        
        connection = result.scalar_one_or_none()
        if not connection:
            return MessageResponse(
                success=False,
                error="Connection not found"
            )
        
        await session.delete(connection)
        await session.commit()
        
        return MessageResponse(
            success=True,
            message="Connection deleted successfully"
        )
    except Exception as e:
        await session.rollback()
        return MessageResponse(
            success=False,
            error=f"An error occurred: {str(e)}"
        )