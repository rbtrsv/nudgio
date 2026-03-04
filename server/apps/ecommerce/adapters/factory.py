"""Centralized adapter factory — maps platform + connection method to the correct adapter class."""

from ..models import EcommerceConnection
from ..schemas.ecommerce_connection_schemas import PlatformType, ConnectionMethod
from .shopify import ShopifyAdapter
from .woocommerce import WooCommerceDatabaseAdapter, WooCommerceApiAdapter
from .magento import MagentoDatabaseAdapter, MagentoApiAdapter


def get_adapter(connection: EcommerceConnection):
    """
    Centralized adapter factory.
    Returns the correct adapter based on platform and connection_method.
    """
    if connection.platform == PlatformType.SHOPIFY.value:
        # Shopify is always API-based
        return ShopifyAdapter(connection)

    elif connection.platform == PlatformType.WOOCOMMERCE.value:
        if connection.connection_method == ConnectionMethod.DATABASE.value:
            return WooCommerceDatabaseAdapter(connection)
        return WooCommerceApiAdapter(connection)

    elif connection.platform == PlatformType.MAGENTO.value:
        if connection.connection_method == ConnectionMethod.DATABASE.value:
            return MagentoDatabaseAdapter(connection)
        return MagentoApiAdapter(connection)

    else:
        raise ValueError(f"Unsupported platform: {connection.platform}")
