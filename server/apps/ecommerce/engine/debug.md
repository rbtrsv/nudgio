# Engine Debug Notes

## Inspecting Shopify Store Data Directly

Shopify has no direct DB access. Use the GraphQL Admin API with the access token from our DB.

### Get the access token

```bash
PGPASSWORD='<password>' psql -h <host> -p <port> -U postgres -d nudgio -t -A \
  -c "SELECT store_url, api_secret FROM ecommerce_connections WHERE platform = 'shopify' AND is_active = true LIMIT 1;"
```

- `store_url` = e.g. `nudgio-dev-store.myshopify.com`
- `api_secret` = access token (e.g. `shpat_...`) — stored plaintext, decrypt_password falls back to returning as-is

### Query products (type, vendor, price)

```bash
curl -s -X POST "https://nudgio-dev-store.myshopify.com/admin/api/2026-01/graphql.json" \
  -H "X-Shopify-Access-Token: <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ products(first: 20, query: \"status:active\") { edges { node { id title productType vendor variants(first:1) { nodes { price } } } } } }"}'
```

### Query orders with line items (cross-sell debug)

```bash
curl -s -X POST "https://nudgio-dev-store.myshopify.com/admin/api/2026-01/graphql.json" \
  -H "X-Shopify-Access-Token: <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ orders(first: 10, query: \"financial_status:paid\") { edges { node { id createdAt lineItems(first: 10) { nodes { product { id title } quantity } } } } } }"}'
```

## 2026-03-09 Debug Session Findings

### Data verified OK

- 15 active products, 4 paid orders
- Product types: "snowboard" (11), "giftcard" (1), "accessories" (1), "" (1)
- Vendors: "Nudgio Dev Store" (8), "Hydrogen Vendor" (3), "Snowboard Vendor" (2), "Multi-managed Vendor" (1)

### Engine simulation (local, same logic as engine.py)

For "The 3p Fulfilled Snowboard" (id=10134449127737, type=snowboard, vendor=Nudgio Dev Store, price=$2629.95):

- **Similar**: 13 candidates found — engine logic is correct
- **Upsell**: 0 candidates — expected, this is the most expensive snowboard
- **Cross-sell**: depends on whether this product appears in any order alongside others

### Conclusion

Engine logic is correct. "No recommendations available" is caused by a **silent runtime exception** in the try/except blocks. Debug logging added to engine.py — deploy server to see actual error.

### Suspected root cause

`get_adapter()` in `adapters/factory.py` mutates `connection.api_secret` in-place:
```python
connection.api_secret = decrypt_password(connection.api_secret)
```
If the SQLAlchemy connection object is reused across requests, the token could get double-processed. Needs investigation after deploying logging.
