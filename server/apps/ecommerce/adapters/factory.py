"""Centralized adapter factory — maps platform + connection method to the correct adapter class."""

from sqlalchemy.ext.asyncio import AsyncSession

from ..models import EcommerceConnection
from ..schemas.ecommerce_connection_schemas import PlatformType, ConnectionMethod
from ..utils.encryption_utils import decrypt_password
from .shopify import ShopifyAdapter
from .woocommerce import WooCommerceDatabaseAdapter, WooCommerceApiAdapter
from .magento import MagentoDatabaseAdapter, MagentoApiAdapter
from .ingest import IngestAdapter


def get_adapter(connection: EcommerceConnection, db: AsyncSession = None):
    """
    Centralized adapter factory.
    Returns the correct adapter based on platform and connection_method.

    Decrypts credentials before passing to adapter — adapters receive
    already-decrypted values. Single decryption point.

    Args:
        connection: The EcommerceConnection instance
        db: AsyncSession — required for IngestAdapter, ignored for platform adapters

    Note: decrypt_password() handles non-encrypted values gracefully
    (returns input if decryption fails), so existing plaintext credentials
    still work during transition.
    """
    # Ingest connections use local tables — no credentials to decrypt
    if connection.connection_method == ConnectionMethod.INGEST.value:
        if db is None:
            raise ValueError("IngestAdapter requires db session")
        return IngestAdapter(connection, db)

    # Decrypt credentials into local vars — never mutate the ORM object
    # (mutating connection.api_secret in-place would dirty the SQLAlchemy
    # session and risk writing back "decrypted" values on next commit)
    api_key = decrypt_password(connection.api_key) if connection.api_key else None
    api_secret = decrypt_password(connection.api_secret) if connection.api_secret else None
    db_password = decrypt_password(connection.db_password) if connection.db_password else None

    if connection.platform == PlatformType.SHOPIFY.value:
        # Shopify is always API-based — api_secret = access token
        return ShopifyAdapter(connection, access_token=api_secret)

    elif connection.platform == PlatformType.WOOCOMMERCE.value:
        if connection.connection_method == ConnectionMethod.DATABASE.value:
            return WooCommerceDatabaseAdapter(connection, db_password=db_password)
        return WooCommerceApiAdapter(connection, api_key=api_key, api_secret=api_secret)

    elif connection.platform == PlatformType.MAGENTO.value:
        if connection.connection_method == ConnectionMethod.DATABASE.value:
            return MagentoDatabaseAdapter(connection, db_password=db_password)
        return MagentoApiAdapter(connection, api_key=api_key, api_secret=api_secret)

    else:
        raise ValueError(f"Unsupported platform: {connection.platform}")
