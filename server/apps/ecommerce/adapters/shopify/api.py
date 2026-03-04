from typing import List, Dict, Any
import aiohttp
import json
from datetime import datetime, timedelta
from ...models import EcommerceConnection


class ShopifyAdapter:
    """
    Shopify Admin API adapter.
    Uses Shopify's REST Admin API to fetch products and orders.
    """

    def __init__(self, connection: EcommerceConnection):
        self.connection = connection
        # API credentials from EcommerceConnection:
        # store_url = store domain (e.g., "m0stv8-wr.myshopify.com")
        # api_secret = access token (e.g., "shpat_...")
        self.store_domain = connection.store_url
        self.access_token = connection.api_secret
        self.api_version = "2023-10"  # Shopify API version

    def _get_headers(self) -> Dict[str, str]:
        """Get headers for Shopify API requests"""
        return {
            "X-Shopify-Access-Token": self.access_token,
            "Content-Type": "application/json"
        }

    def _get_base_url(self) -> str:
        """Get base URL for Shopify API"""
        return f"https://{self.store_domain}/admin/api/{self.api_version}"

    async def get_product_count(self) -> int:
        """Get total product count from Shopify Admin API via /products/count.json"""
        async with aiohttp.ClientSession() as session:
            url = f"{self._get_base_url()}/products/count.json"
            params = {"status": "active"}
            async with session.get(url, headers=self._get_headers(), params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get("count", 0)
                return 0

    async def get_order_count(self, lookback_days: int = 365) -> int:
        """Get total order count from Shopify Admin API via /orders/count.json"""
        since_date = (datetime.utcnow() - timedelta(days=lookback_days)).isoformat()
        async with aiohttp.ClientSession() as session:
            url = f"{self._get_base_url()}/orders/count.json"
            params = {
                "financial_status": "paid",
                "created_at_min": since_date,
                "status": "any",
            }
            async with session.get(url, headers=self._get_headers(), params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get("count", 0)
                return 0

    async def get_products(self, limit: int = 250) -> List[Dict[str, Any]]:
        """Get products from Shopify Admin API"""
        products = []

        async with aiohttp.ClientSession() as session:
            url = f"{self._get_base_url()}/products.json"
            params = {
                "limit": min(limit, 250),  # Shopify max is 250
                "status": "active"
            }

            async with session.get(url, headers=self._get_headers(), params=params) as response:
                if response.status == 200:
                    data = await response.json()

                    for product in data.get("products", []):
                        # Get the first variant for pricing
                        variant = product.get("variants", [{}])[0] if product.get("variants") else {}

                        products.append({
                            "product_id": str(product["id"]),
                            "title": product.get("title", ""),
                            "handle": product.get("handle", ""),
                            "product_type": product.get("product_type", ""),
                            "vendor": product.get("vendor", ""),
                            "status": product.get("status", ""),
                            "variant_id": str(variant.get("id", "")),
                            "price": float(variant.get("price", 0)),
                            "sku": variant.get("sku", ""),
                            "inventory_quantity": variant.get("inventory_quantity", 0),
                            "created_at": product.get("created_at"),
                            "updated_at": product.get("updated_at")
                        })
                else:
                    print(f"Shopify API error: {response.status} - {await response.text()}")

        return products

    async def get_orders(self, lookback_days: int = 30, limit: int = 250) -> List[Dict[str, Any]]:
        """Get orders from Shopify Admin API"""
        orders = []

        # Calculate date filter
        since_date = (datetime.utcnow() - timedelta(days=lookback_days)).isoformat()

        async with aiohttp.ClientSession() as session:
            url = f"{self._get_base_url()}/orders.json"
            params = {
                "limit": min(limit, 250),  # Shopify max is 250
                "financial_status": "paid",
                "created_at_min": since_date,
                "status": "any"
            }

            async with session.get(url, headers=self._get_headers(), params=params) as response:
                if response.status == 200:
                    data = await response.json()

                    for order in data.get("orders", []):
                        orders.append({
                            "order_id": str(order["id"]),
                            "customer_id": str(order.get("customer", {}).get("id", "")) if order.get("customer") else "",
                            "total_price": float(order.get("total_price", 0)),
                            "financial_status": order.get("financial_status", ""),
                            "order_date": order.get("created_at")
                        })
                else:
                    print(f"Shopify API error: {response.status} - {await response.text()}")

        return orders

    async def get_order_items(self, lookback_days: int = 30, limit: int = 10000) -> List[Dict[str, Any]]:
        """Get order line items from Shopify Admin API"""
        order_items = []

        # First get orders
        orders = await self.get_orders(lookback_days, min(limit // 5, 250))  # Estimate items per order

        async with aiohttp.ClientSession() as session:
            for order in orders:
                order_id = order["order_id"]
                url = f"{self._get_base_url()}/orders/{order_id}.json"

                async with session.get(url, headers=self._get_headers()) as response:
                    if response.status == 200:
                        data = await response.json()
                        order_data = data.get("order", {})

                        for line_item in order_data.get("line_items", []):
                            order_items.append({
                                "order_id": order_id,
                                "product_id": str(line_item.get("product_id", "")),
                                "variant_id": str(line_item.get("variant_id", "")),
                                "quantity": int(line_item.get("quantity", 0)),
                                "price": float(line_item.get("price", 0)),
                                "product_title": line_item.get("title", ""),
                                "order_date": order["order_date"],
                                "customer_id": order["customer_id"]
                            })

                    # Stop if we've reached the limit
                    if len(order_items) >= limit:
                        break

        return order_items[:limit]

    async def get_product_by_id(self, product_id: str) -> Dict[str, Any]:
        """Get single product by ID from Shopify Admin API"""
        async with aiohttp.ClientSession() as session:
            url = f"{self._get_base_url()}/products/{product_id}.json"

            async with session.get(url, headers=self._get_headers()) as response:
                if response.status == 200:
                    data = await response.json()
                    product = data.get("product", {})

                    if product:
                        # Get the first variant for pricing
                        variant = product.get("variants", [{}])[0] if product.get("variants") else {}

                        return {
                            "product_id": str(product["id"]),
                            "title": product.get("title", ""),
                            "handle": product.get("handle", ""),
                            "product_type": product.get("product_type", ""),
                            "vendor": product.get("vendor", ""),
                            "variant_id": str(variant.get("id", "")),
                            "price": float(variant.get("price", 0)),
                            "sku": variant.get("sku", ""),
                            "inventory_quantity": variant.get("inventory_quantity", 0)
                        }
                else:
                    print(f"Shopify API error: {response.status} - {await response.text()}")

        return {}

    async def test_connection(self) -> bool:
        """Test if Shopify API connection is working"""
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self._get_base_url()}/shop.json"

                async with session.get(url, headers=self._get_headers()) as response:
                    return response.status == 200
        except Exception:
            return False
