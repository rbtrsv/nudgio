"""Centralized adapter factory — maps platform type to the correct adapter class."""

from ..models import EcommerceConnection, PlatformType
from .shopify import ShopifyAdapter
from .woocommerce import WooCommerceDatabaseAdapter
from .magento import MagentoDatabaseAdapter


def get_adapter(connection: EcommerceConnection):
    """
    Centralized adapter factory.
    Returns the correct adapter based on platform.
    Will be extended with connection_method logic when API adapters are added.
    """
    if connection.platform == PlatformType.SHOPIFY:
        # Shopify is always API-based
        return ShopifyAdapter(connection)
    elif connection.platform == PlatformType.WOOCOMMERCE:
        return WooCommerceDatabaseAdapter(connection)
    elif connection.platform == PlatformType.MAGENTO:
        return MagentoDatabaseAdapter(connection)
    else:
        raise ValueError(f"Unsupported platform: {connection.platform}")
