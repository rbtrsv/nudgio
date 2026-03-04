from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, text

from core.db import get_session
from apps.accounts.models import User, OrganizationMember
from apps.accounts.utils.auth_utils import get_current_user

from ..models import EcommerceConnection
from ..schemas.ecommerce_connection_schemas import (
    PlatformType,
    EcommerceConnectionCreate,
    EcommerceConnectionDetail,
    EcommerceConnectionResponse,
    EcommerceConnectionListResponse,
    EcommerceConnectionTestResponse,
    MessageResponse,
)
from ..adapters.factory import get_adapter

# ==========================================
# Ecommerce Connections Router
# ==========================================

router = APIRouter(prefix="/connections", tags=["Ecommerce Connections"])


@router.post("/", response_model=EcommerceConnectionResponse)
async def create_connection(
    payload: EcommerceConnectionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """
    Create a new ecommerce platform connection

    This endpoint:
    1. Validates the user belongs to an organization
    2. Checks for duplicate connection names
    3. Creates the connection record
    4. Returns the created connection details
    """
    try:
        # Get user's organization ID from membership
        org_result = await db.execute(
            select(OrganizationMember).where(OrganizationMember.user_id == user.id)
        )
        membership = org_result.scalar_one_or_none()
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must belong to an organization"
            )

        # Check if connection name already exists for this user
        existing = await db.execute(
            select(EcommerceConnection).where(
                and_(
                    EcommerceConnection.user_id == user.id,
                    EcommerceConnection.connection_name == payload.connection_name
                )
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Connection name already exists"
            )

        # Create new connection
        new_connection = EcommerceConnection(
            user_id=user.id,
            organization_id=membership.organization_id,
            connection_name=payload.connection_name,
            platform=payload.platform.value,
            connection_method=payload.connection_method.value,
            store_url=payload.store_url,
            api_key=payload.api_key,
            api_secret=payload.api_secret,
            db_host=payload.db_host,
            db_name=payload.db_name,
            db_user=payload.db_user,
            db_password=payload.db_password,
            db_port=payload.db_port,
            is_active=False,
        )
        db.add(new_connection)
        await db.commit()
        await db.refresh(new_connection)

        return EcommerceConnectionResponse(
            success=True,
            data=EcommerceConnectionDetail.model_validate(new_connection, from_attributes=True),
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@router.get("/", response_model=EcommerceConnectionListResponse)
async def list_connections(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """
    List all ecommerce connections for the current user

    This endpoint:
    1. Queries all connections owned by the user
    2. Returns a paginated list ordered by creation date
    """
    try:
        # Get all connections for the user
        result = await db.execute(
            select(EcommerceConnection).where(
                EcommerceConnection.user_id == user.id
            ).order_by(EcommerceConnection.created_at.desc())
        )
        connections = result.scalars().all()

        return EcommerceConnectionListResponse(
            success=True,
            data=[EcommerceConnectionDetail.model_validate(conn, from_attributes=True) for conn in connections],
            count=len(connections),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@router.get("/{connection_id}", response_model=EcommerceConnectionResponse)
async def get_connection(
    connection_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """
    Get details for a specific ecommerce connection

    This endpoint:
    1. Retrieves a connection by ID (enforces ownership)
    2. Returns the connection details
    """
    try:
        # Get connection owned by the user
        result = await db.execute(
            select(EcommerceConnection).where(
                and_(
                    EcommerceConnection.id == connection_id,
                    EcommerceConnection.user_id == user.id
                )
            )
        )
        connection = result.scalar_one_or_none()
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Connection not found"
            )

        return EcommerceConnectionResponse(
            success=True,
            data=EcommerceConnectionDetail.model_validate(connection, from_attributes=True),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@router.post("/{connection_id}/test", response_model=EcommerceConnectionTestResponse)
async def test_connection(
    connection_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """
    Test an ecommerce connection and return sample data

    This endpoint:
    1. Retrieves the connection (enforces ownership)
    2. Creates the platform adapter
    3. Explores database structure (for database connections)
    4. Fetches sample products to verify connectivity
    5. Marks the connection as active on success
    """
    # Get connection owned by the user
    result = await db.execute(
        select(EcommerceConnection).where(
            and_(
                EcommerceConnection.id == connection_id,
                EcommerceConnection.user_id == user.id
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
        adapter = get_adapter(connection)

        # Explore database structure (helps with debugging)
        table_info = ""
        try:
            # Skip table exploration for API-based adapters (like Shopify)
            if not hasattr(adapter, 'engine'):
                table_info = f" | {connection.platform} uses API access (no direct database tables)"
            else:
                async with adapter.engine.begin() as conn:
                    # Define table patterns based on platform
                    if connection.platform == PlatformType.WOOCOMMERCE.value:
                        patterns = [
                            ('%wc_%', 'HPOS tables'),
                            ('%woocommerce%', 'Legacy tables'),
                            ('%order%', 'Order tables'),
                        ]
                    elif connection.platform == PlatformType.SHOPIFY.value:
                        patterns = [
                            ('%shop_%', 'Shop tables'),
                            ('%product%', 'Product tables'),
                            ('%customer%', 'Customer tables'),
                            ('%order%', 'Order tables'),
                        ]
                    elif connection.platform == PlatformType.MAGENTO.value:
                        patterns = [
                            ('%sales_%', 'Sales tables'),
                            ('%catalog_%', 'Catalog tables'),
                            ('%quote%', 'Quote tables'),
                            ('%customer%', 'Customer tables'),
                        ]
                    else:
                        patterns = [('%_%', 'All tables')]

                    # Collect tables for each pattern
                    table_groups = {}
                    for pattern, label in patterns:
                        result = await conn.execute(text(f"SHOW TABLES LIKE '{pattern}'"))
                        tables = [row[0] for row in result.fetchall()]
                        if tables:
                            table_groups[label] = tables

                    # Format table info
                    if table_groups:
                        table_parts = [f"{label}: {tables}" for label, tables in table_groups.items()]
                        table_info = f" | {' | '.join(table_parts)}"
                    else:
                        table_info = f" | No {connection.platform} tables found"

        except Exception as e:
            table_info = f" | Table exploration failed: {str(e)}"

        # Test by getting sample products
        products = []
        product_error = None
        try:
            products = await adapter.get_products(limit=10)
        except Exception as e:
            product_error = str(e)

        if products:
            # Mark connection as active
            connection.is_active = True
            await db.commit()

            return EcommerceConnectionTestResponse(
                success=True,
                message=f"Connection successful! Found {len(products)} products.{table_info}",
                sample_products_count=len(products),
            )
        else:
            error_detail = f" Product query failed: {product_error}" if product_error else " No products found."
            return EcommerceConnectionTestResponse(
                success=False,
                message=f"Connection successful but{error_detail} Check your database schema.{table_info}",
                sample_products_count=0,
            )

    except Exception as e:
        return EcommerceConnectionTestResponse(
            success=False,
            message=f"Connection failed: {str(e)}",
            sample_products_count=0,
        )


@router.put("/{connection_id}", response_model=EcommerceConnectionResponse)
async def update_connection(
    connection_id: int,
    payload: EcommerceConnectionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """
    Update an existing ecommerce connection

    This endpoint:
    1. Retrieves the connection by ID (enforces ownership)
    2. Checks for duplicate connection names (excluding self)
    3. Updates all connection fields
    4. Resets active status (user must re-test)
    5. Returns the updated connection details
    """
    try:
        # Get connection owned by the user
        result = await db.execute(
            select(EcommerceConnection).where(
                and_(
                    EcommerceConnection.id == connection_id,
                    EcommerceConnection.user_id == user.id
                )
            )
        )
        connection = result.scalar_one_or_none()
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Connection not found"
            )

        # Check if new connection name conflicts with existing ones (excluding self)
        if payload.connection_name != connection.connection_name:
            existing = await db.execute(
                select(EcommerceConnection).where(
                    and_(
                        EcommerceConnection.user_id == user.id,
                        EcommerceConnection.connection_name == payload.connection_name,
                        EcommerceConnection.id != connection_id
                    )
                )
            )
            if existing.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Connection name already exists"
                )

        # Update fields
        connection.connection_name = payload.connection_name
        connection.platform = payload.platform.value
        connection.connection_method = payload.connection_method.value
        connection.store_url = payload.store_url
        connection.api_key = payload.api_key
        connection.api_secret = payload.api_secret
        connection.db_host = payload.db_host
        connection.db_name = payload.db_name
        connection.db_user = payload.db_user
        connection.db_password = payload.db_password
        connection.db_port = payload.db_port
        connection.is_active = False  # Reset active status, user needs to test again

        await db.commit()
        await db.refresh(connection)

        return EcommerceConnectionResponse(
            success=True,
            data=EcommerceConnectionDetail.model_validate(connection, from_attributes=True),
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@router.delete("/{connection_id}", response_model=MessageResponse)
async def delete_connection(
    connection_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """
    Delete an ecommerce connection

    This endpoint:
    1. Retrieves the connection by ID (enforces ownership)
    2. Deletes the connection (cascades to settings, usage, analytics)
    3. Returns a success message
    """
    try:
        # Get connection owned by the user
        result = await db.execute(
            select(EcommerceConnection).where(
                and_(
                    EcommerceConnection.id == connection_id,
                    EcommerceConnection.user_id == user.id
                )
            )
        )
        connection = result.scalar_one_or_none()
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Connection not found"
            )

        # Delete connection (will cascade to settings, usage tracking, analytics)
        label = connection.connection_name
        await db.delete(connection)
        await db.commit()

        return MessageResponse(
            success=True,
            message=f"Connection '{label}' has been deleted"
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
