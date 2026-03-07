# Nudgio — Ecommerce Implementation

## MANDATORY RULES — Read Before Any Implementation

1. **Read 2-3 reference files BEFORE creating or modifying ANY file.** Read from nexotype, accounts, assetmanager, or finpy — both frontend and backend — to understand exact patterns, naming, comments, structure.

2. **File naming mirrors model names.** The backend model name dictates the file name across the ENTIRE stack:
   - Model: `EcommerceConnection` → backend: `ecommerce_connection_schemas.py`, `ecommerce_connection_subrouter.py` → frontend: `ecommerce-connections.schema.ts`, `ecommerce-connections.service.ts`, `ecommerce-connections.store.ts`, `ecommerce-connections-provider.tsx`, `use-ecommerce-connections.ts`
   - Model: `RecommendationSettings` → backend: `recommendation_settings_schemas.py`, `recommendation_settings_subrouter.py` → frontend: `recommendation-settings.schema.ts`, `recommendation-settings.service.ts`, `recommendation-settings.store.ts`, `recommendation-settings-provider.tsx`, `use-recommendation-settings.ts`
   - Model: `RecommendationResult` → backend: `recommendation_schemas.py`, `recommendation_subrouter.py` → frontend: `recommendations.schema.ts`, `recommendations.service.ts`, `use-recommendations.ts`
   - Model: `ConnectionStats` → backend: `data_schemas.py`, `data_subrouter.py` → frontend: `data.schema.ts`, `data.service.ts`, `data.store.ts`, `data-provider.tsx`, `use-data.ts`
   - Model: components → backend: `components_subrouter.py` → frontend: `components.schema.ts`, `components.service.ts`, `use-components.ts`
   - This applies to ALL file types: schemas, subrouters, services, stores, providers, hooks, pages.

3. **Frontend schema fields MUST match backend response fields exactly.** Same field names (snake_case), same types, same enum values. Check `EcommerceConnectionDetail` (backend) → `ConnectionSchema` (frontend).

4. **Never guess patterns.** If unsure how a file should look, find and read a working example first.

---

## Context

The ecommerce frontend module is fully built (31 files, all pages working). The current connection system requires:
- **Shopify**: Manual access token input (store domain in `db_host`, token in `db_password`)
- **WooCommerce**: Direct MySQL credentials (`db_host`, `db_name`, `db_user`, `db_password`, `db_port`)
- **Magento**: Direct MySQL credentials (`db_host`, `db_name`, `db_user`, `db_password`, `db_port`)

This is not user-friendly. Most merchants are non-technical and cannot provide database credentials.

**Goal**: Add REST API-based authentication for all 3 platforms so merchants only need easy-to-obtain API keys from their store admin panels. Keep existing database adapters as an "Advanced" option for power users.

---

## Platform Authentication Summary

| Platform | Method | User Provides | Where to Get It |
|---|---|---|---|
| Shopify | OAuth 2.0 | Click "Connect with Shopify" | Automatic via OAuth consent screen |
| Shopify | Manual API | Store domain + Access token | Shopify Admin > Apps > Develop apps > Create an app > API credentials |
| WooCommerce | Auto-Auth (wc-auth) | Click "Connect WooCommerce" → approve | Automatic via `/wc-auth/v1/authorize` endpoint (built into WooCommerce) |
| WooCommerce | Manual REST API | Store URL + Consumer key + Consumer secret | WooCommerce > Settings > Advanced > REST API > Add Key |
| WooCommerce | Database | MySQL host, name, user, password, port | wp-config.php or hosting panel (advanced) |
| Magento | REST API | Store URL + Integration access token | Magento Admin > System > Integrations > Add New > Activate |
| Magento | Database | MySQL host, name, user, password, port | env.php or hosting panel (advanced) |

---

## Current State (Updated 2026-03-04, Session 2)

### Model (`server/apps/ecommerce/models.py`)

```python
class BaseMixin:
    """Universal fields for all domain models. Provides: timestamps, soft delete, user audit."""
    created_at, updated_at                    # Timestamps
    deleted_at, deleted_by                    # Soft delete (NULL = active, SET = deleted)
    created_by, updated_by                    # User audit (loose coupling, no FK)

class EcommerceConnection(BaseMixin, Base):
    __tablename__ = "ecommerce_connections"
    id, user_id, organization_id, platform, connection_name
    connection_method                         # "api" (default) or "database"
    # API-based connection fields
    store_url                                 # "https://mystore.myshopify.com"
    api_key                                   # WooCommerce: consumer_key
    api_secret                                # WooCommerce: consumer_secret, Magento/Shopify: access token
    # Database-based connection fields
    db_host, db_name, db_user, db_password, db_port
    is_active
    # Relationships: settings, usage_tracking, analytics

class RecommendationSettings(BaseMixin, Base):
    __tablename__ = "recommendation_settings"
    id, connection_id (unique, FK → ecommerce_connections)
    bestseller_method, bestseller_lookback_days, crosssell_lookback_days
    max_recommendations, min_price_increase_percent
    shop_base_url, product_url_template

class APIUsageTracking(Base):                 # No BaseMixin (append-only log)
    id, organization_id, connection_id, endpoint, timestamp, response_time_ms, status_code

class RecommendationAnalytics(Base):          # No BaseMixin (append-only log)
    id, connection_id, recommendation_type, product_id, recommended_product_id
    position, event_type, timestamp, user_agent, ip_address
```

### Adapters (`server/apps/ecommerce/adapters/`)

```
adapters/
├── __init__.py
├── base.py           → PlatformAdapter ABC (SQLAlchemy async engine, test_connection via SELECT 1)
├── factory.py        → get_adapter(connection) — routes by platform + connection_method
├── shopify/
│   ├── __init__.py
│   └── api.py        → ShopifyAdapter (aiohttp, REST Admin API, store_url + api_secret)
├── woocommerce/
│   ├── __init__.py
│   ├── api.py        → WooCommerceApiAdapter (aiohttp, REST API v3, HTTP Basic Auth)
│   └── database.py   → WooCommerceAdapter(PlatformAdapter) (direct MySQL queries)
└── magento/
    ├── __init__.py
    ├── api.py        → MagentoApiAdapter (aiohttp, REST API, Bearer token, 2.4.4+ error detection)
    └── database.py   → MagentoAdapter(PlatformAdapter) (direct MySQL queries, EAV)
```

### Subrouters (`server/apps/ecommerce/subrouters/`)

- `ecommerce_connection_subrouter.py` — CRUD + test connection (soft delete, shared helpers, user audit)
- `recommendation_settings_subrouter.py` — CRUD per connection (partial update via `model_dump(exclude_unset=True)`)
- `recommendation_subrouter.py` — bestsellers, cross-sell, up-sell, similar products
- `components_subrouter.py` — HTML widget generation
- `data_subrouter.py` — raw product/order data
- `shopify_oauth_subrouter.py` — Shopify OAuth 2.0 flow (`/shopify/auth` + `/shopify/callback`)
- `woocommerce_auth_subrouter.py` — WooCommerce auto-auth (`/woocommerce/auth` + `/woocommerce/callback`)

### Utils (`server/apps/ecommerce/utils/`)

- `dependency_utils.py` — `get_user_connection()`, `get_active_connection()` (ownership + soft delete filter), `require_active_subscription()` (router-level subscription gate), `get_user_organization_id()` (query OrganizationMember for org_id)
- `subscription_utils.py` — tier constants (FREE/PRO/ENTERPRISE), tier limits (connections, monthly orders, rate limits), grace period, query helpers (`get_org_subscription`, `get_org_connection_count`, `get_org_monthly_order_count`), logic helpers (`get_org_tier`, `tier_is_sufficient`, `get_tier_limits`, `is_over_connection_limit`, `is_service_active`)
- `cache_utils.py` — recommendation caching with ABC + two backends: `InMemoryCacheBackend` (development) + `DragonflyCacheBackend` (production). Switch via `CACHE_BACKEND` constant in file.
- `encryption_utils.py` — Fernet symmetric encryption (AES-128-CBC) for credentials. Integrated: encrypt on create/update, decrypt in adapter factory.
- `rate_limiting_utils.py` — API rate limiting per organization with ABC + two backends: `InMemoryRateLimitBackend` (development) + `DragonflyRateLimitBackend` (production). Reads limits from `subscription_utils.TIER_LIMITS`. Switch via `RATE_LIMIT_BACKEND` constant in file.

### Schemas (`server/apps/ecommerce/schemas/`)

- `ecommerce_connection_schemas.py` — `PlatformType`, `ConnectionMethod` enums + Create, Update, Detail, Response, ListResponse, MessageResponse
- `recommendation_settings_schemas.py` — `BestsellerMethod` enum + Create, Detail, Response, ListResponse, MessageResponse
- `recommendation_schemas.py` — `RecommendationType` enum + Response schemas
- `data_schemas.py` — Product, Order, OrderItem data schemas

All schema fields have `Field(description="...")`.

### Router (`server/apps/ecommerce/router.py`)

Prefix: `/ecommerce`. Split into ungated and gated groups:
- **Ungated**: Shopify OAuth + WooCommerce auth callbacks (merchant connecting for first time, no subscription check needed)
- **Gated**: Everything else via `APIRouter(dependencies=[Depends(require_active_subscription)])` — connections, settings, recommendations, components, data. All endpoints return 403 when subscription is inactive.

7 subrouters, 28 routes total.

### Frontend (`client/src/`)

Fully built (31+ files). All pages working. File names mirror backend model names.
- Connection form: different fields per platform + connection_method (Shopify OAuth / WooCommerce auto-auth / Manual API / Database)
- Settings page: matches backend `RecommendationSettingsDetail`
- Recommendations, components, analytics, data pages: all functional

---

## Shopify — OAuth 2.0 Authorization Code Grant

### Overview

OAuth 2.0 is **mandatory** for Shopify App Store listing. The merchant clicks "Connect with Shopify", gets redirected to Shopify's consent screen, approves, and our app receives a permanent access token.

**CRITICAL — REST API DEPRECATION (from official docs, verified March 2026)**:
- As of **October 1, 2024**, Shopify marked the REST Admin API as "legacy"
- As of **April 1, 2025**, all **new public apps** must use the **GraphQL Admin API** exclusively — REST submissions to the App Store will be **rejected**
- Existing apps can continue using REST but will face **App Store demotion** if they don't migrate product APIs
- Shopify will announce a **full migration deadline** (REST completely removed) later
- The **OAuth flow itself** (`/admin/oauth/authorize` and `/admin/oauth/access_token`) is NOT affected — same endpoints regardless of REST vs GraphQL
- **Impact on Nudgio**: Our existing `ShopifyAdapter` uses REST (`/admin/api/2023-10/products.json`). For App Store submission, we must migrate to GraphQL (`/admin/api/2026-01/graphql.json`). This is a separate task from the auth plan but must happen before App Store submission.
- **GraphQL rate limits are different from REST**: Points-based system (Standard: 100 pts/sec, Plus: 1,000 pts/sec) instead of leaky bucket
- Source: https://shopify.dev/docs/api/usage/rate-limits, https://www.shopify.com/partners/blog/all-in-on-graphql

### OAuth Flow Steps

**Step 1 — User clicks "Connect with Shopify" on our frontend**
Frontend sends the store domain (e.g., `mystore.myshopify.com`) to our backend.

**Step 2 — Backend redirects merchant to Shopify authorization page**

Authorization URL:
```
GET https://{shop}/admin/oauth/authorize
  ?client_id={SHOPIFY_CLIENT_ID}
  &scope=read_products,read_orders
  &redirect_uri={SHOPIFY_REDIRECT_URI}
  &state={nonce}
```

Parameters:
- `{shop}` — Merchant's store domain (e.g., `mystore.myshopify.com`)
- `{client_id}` — From Shopify Partner Dashboard (called "Client ID", historically "API Key")
- `{scope}` — Comma-separated scopes (see Scopes section below)
- `{redirect_uri}` — Must be whitelisted in Partner Dashboard, HTTPS required
- `{state}` — Random nonce, stored server-side for verification

**Step 3 — Merchant approves, Shopify redirects to our callback**

```
GET {redirect_uri}
  ?code={authorization_code}
  &hmac={hmac_signature}
  &host={base64_encoded_host}
  &shop={shop_domain}
  &state={nonce}
  &timestamp={unix_timestamp}
```

**Step 4 — Backend validates the callback**

Security checks (all 3 mandatory):
1. Verify `state` matches the stored nonce
2. Validate `hmac` signature (HMAC-SHA256, see HMAC section below)
3. Confirm `shop` is a valid Shopify hostname: `^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$`

**Step 5 — Exchange authorization code for access token**

```http
POST https://{shop}/admin/oauth/access_token
Content-Type: application/x-www-form-urlencoded

client_id={SHOPIFY_CLIENT_ID}&client_secret={SHOPIFY_CLIENT_SECRET}&code={authorization_code}
```

Response (non-expiring offline token):
```json
{
  "access_token": "f85632530bf277ec9ac6f649fc327f17",
  "scope": "read_products,read_orders"
}
```

**Step 6 — Save connection and redirect to frontend**

Save `EcommerceConnection` with `platform=shopify`, `connection_method=api`, `store_url={shop}`, `api_secret={access_token}`.
Redirect to `{FRONTEND_URL}/connections?shopify_connected=true`.

### HMAC-SHA256 Verification (OAuth Callback)

- **Algorithm**: HMAC-SHA256
- **Key**: App's Client Secret
- **Encoding**: Hex digest

Procedure:
1. Take the full query string from the callback URL
2. Remove the `hmac` parameter
3. Sort remaining parameters alphabetically: `parameter_name=parameter_value`
4. Join with `&`
5. Compute HMAC-SHA256 using Client Secret as key
6. Compare hex digest to received `hmac` value

```python
import hmac
import hashlib

secret = b"client_secret_here"
# Sorted params without hmac:
message = b"code=0907a61c...&shop=mystore.myshopify.com&state=0.678...&timestamp=1337178173"
digest = hmac.new(secret, message, hashlib.sha256).hexdigest()
# Compare digest to the hmac query parameter (timing-safe comparison)
```

### HMAC-SHA256 Verification (Webhooks — different from OAuth)

- **Algorithm**: HMAC-SHA256
- **Key**: App's Client Secret
- **Encoding**: Base64 (NOT hex — different from OAuth!)
- **Location**: HTTP header `X-Shopify-Hmac-SHA256`
- **Input**: Raw request body (before JSON parsing)

```python
import hmac
import hashlib
import base64

secret = b"client_secret_here"
body = b'{"raw": "json body"}'  # Raw bytes, not parsed
digest = hmac.new(secret, body, hashlib.sha256).digest()
computed_hmac = base64.b64encode(digest).decode()
# Timing-safe compare to X-Shopify-Hmac-SHA256 header
```

### Required Scopes

For a recommendation engine:
- `read_products` — Product data (titles, variants, prices, images)
- `read_orders` — Order data (last 60 days by default)
- `read_all_orders` — ALL historical orders (requires justification during app review — Shopify scrutinizes this)
- `read_customers` — Customer data (optional, for personalization)

Recommended initial scopes: `read_products,read_orders`

### Access Token Types

| Token Type | Lifetime | Use Case |
|---|---|---|
| Non-expiring offline token (default) | Permanent, until app uninstall | Background server-to-server API calls — **this is what Nudgio needs** |
| Expiring offline token | Access: 1 hour, Refresh: 90 days | Same as above but with rotation — opt-in, irreversible |
| Online token | 24 hours, tied to user session | User-facing interactions in Shopify Admin |

**We want non-expiring offline tokens** — they persist indefinitely and allow our server to make API calls without the merchant being present.

**December 2025 Update**: Shopify added expiring offline tokens as an opt-in option. To get expiring tokens, add `expiring=1` to the token exchange POST body. Response includes `refresh_token` and `refresh_token_expires_in`. **Do NOT opt into this** — it's irreversible per shop and adds unnecessary complexity for our use case. Non-expiring is the default and what we should use.

**Scope verification after token exchange**: After receiving the access token, verify that all requested scopes were actually granted. The merchant could have modified the scope parameter during authorization. Compare `response.scope` with what you requested. If `write` scope was requested, only check for `write` presence (it implies `read`).

### REST Admin API Rate Limits

Leaky bucket algorithm:

| Plan | Bucket Size | Leak Rate |
|---|---|---|
| Standard | 40 requests | 2 requests/second |
| Advanced | 40 requests | 4 requests/second |
| Shopify Plus | 400 requests | 20 requests/second |

Headers:
- `X-Shopify-Shop-Api-Call-Limit: 32/40` — Current usage vs maximum
- `Retry-After: {seconds}` — Returned with HTTP 429 when throttled

REST API base URL (legacy, still functional for existing apps):
```
https://{shop}/admin/api/{api_version}/{resource}.json
```
Example: `https://mystore.myshopify.com/admin/api/2025-01/products.json`

### GraphQL Admin API Rate Limits (for new public apps)

Points-based calculated query cost:

| Plan | Points/Second | Max Bucket |
|---|---|---|
| Standard | 100 points/sec | 1,000 points |
| Advanced | 200 points/sec | — |
| Shopify Plus | 1,000 points/sec | — |
| Enterprise | 2,000 points/sec | — |

Cost defaults: Scalars/Enums = 0 pts, Objects = 1 pt, Connections = sized by `first`/`last` args, Mutations = 10 pts.
Max single query cost: 1,000 points. Max pagination: 25,000 objects per query. Array inputs max: 250 items.

GraphQL base URL:
```
POST https://{shop}/admin/api/{api_version}/graphql.json
```
Example: `POST https://mystore.myshopify.com/admin/api/2026-01/graphql.json`

Headers: `X-Shopify-Access-Token: {access_token}`, `Content-Type: application/json`

### Mandatory GDPR Webhooks (required for App Store listing)

Three compliance webhooks are **mandatory**. App will be **rejected** without them.

| Topic | Purpose | When Sent |
|---|---|---|
| `customers/data_request` | Merchant requests export of a customer's stored data | Data subject access request |
| `customers/redact` | Delete all stored data for a specific customer | 10 days after request |
| `shop/redact` | Delete all stored data for a shop | 48 hours after app uninstall |

Response: 200-series HTTP status code. Complete action within 30 days.
Verify `X-Shopify-Hmac-SHA256` header (Base64 HMAC, see webhook HMAC section above).
Return `401 Unauthorized` if HMAC validation fails.
Apps may withhold redaction if legally required to retain data.

Configuration via `shopify.app.toml`:
```toml
[webhooks]
api_version = "2024-07"

[[webhooks.subscriptions]]
compliance_topics = ["customers/data_request", "customers/redact", "shop/redact"]
uri = "https://api.nudgio.com/webhooks/shopify"
```

If not using `shopify.app.toml`, configure these URLs in Partner Dashboard under app settings.

**Payloads:**

`customers/data_request`:
```json
{
  "shop_id": 954889,
  "shop_domain": "{shop}.myshopify.com",
  "orders_requested": [299938, 280263, 220458],
  "customer": {"id": 191167, "email": "john@example.com", "phone": "555-625-1199"},
  "data_request": {"id": 9999}
}
```

`customers/redact`:
```json
{
  "shop_id": 954889,
  "shop_domain": "{shop}.myshopify.com",
  "customer": {"id": 191167, "email": "john@example.com", "phone": "555-625-1199"},
  "orders_to_redact": [299938, 280263, 220458]
}
```

`shop/redact`:
```json
{
  "shop_id": 954889,
  "shop_domain": "{shop}.myshopify.com"
}
```

### Shopify Partner Dashboard Registration

1. Go to `partners.shopify.com`, log in or create account
2. Navigate to **Apps** > **Create app**
3. Set **App URL** (e.g., `https://api.nudgio.com/ecommerce/shopify/install`)
4. Set **Allowed redirection URL(s)** (e.g., `https://api.nudgio.com/ecommerce/shopify/callback`)
5. Save → retrieve **Client ID** and **Client Secret**

For development: Create a development store under **Stores** > **Add store** > **Development store**.

---

## WooCommerce — REST API v3

### Overview

WooCommerce has a built-in REST API (v3). Merchants generate consumer_key + consumer_secret from their WooCommerce admin panel. No plugin installation required — the API is built into WooCommerce core.

### Authentication

**HTTP Basic Auth over HTTPS** — consumer_key as username, consumer_secret as password.

```
Authorization: Basic base64(consumer_key:consumer_secret)
```

Over HTTP (not recommended): Uses OAuth 1.0a signature-based auth. We should require HTTPS.

For servers with Authorization header parsing issues, credentials can be passed as query parameters:
```
?consumer_key=ck_xxx&consumer_secret=cs_xxx
```

### Auto-Key Generation Endpoint (wc-auth) — Like OAuth for WooCommerce

WooCommerce has a built-in `/wc-auth/v1/authorize` endpoint that lets merchants generate API keys by clicking "Accept" — no manual key creation needed. This is the most user-friendly option.

**Flow:**
1. Nudgio constructs authorization URL:
```
{store_url}/wc-auth/v1/authorize
  ?app_name=Nudgio
  &scope=read
  &user_id={nudgio_internal_user_id}
  &return_url={FRONTEND_URL}/connections?wc_connected=true
  &callback_url={API_URL}/ecommerce/woocommerce/callback
```

2. Merchant visits the URL in browser → sees WooCommerce permission screen → clicks "Accept"
3. Merchant is redirected to `return_url` with `?success=1&user_id={user_id}`
4. WooCommerce POSTs API credentials to `callback_url`:
```json
{
  "key_id": 1,
  "user_id": "123",
  "consumer_key": "ck_xxxxxxxxxxxxxxxx",
  "consumer_secret": "cs_xxxxxxxxxxxxxxxx",
  "key_permissions": "read"
}
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `app_name` | string | Your application name (shown to merchant) |
| `scope` | string | `read`, `write`, or `read_write` |
| `user_id` | string | Your internal user ID (returned in callback) |
| `return_url` | string | Where merchant redirects after approval |
| `callback_url` | string | **HTTPS required** — receives API keys via POST |

**Important**: The `callback_url` receives the POST with JSON body — use `file_get_contents('php://input')` in PHP or read raw body in FastAPI. Standard form parsing won't work.

**This is the preferred method for WooCommerce** — merchants don't need to navigate to Settings > REST API manually.

### Manual API Key Generation (fallback)

If auto-auth doesn't work (e.g., store behind firewall that can't reach our callback URL):

### How Merchants Generate API Keys

Path in WooCommerce admin:
```
WooCommerce > Settings > Advanced > REST API > Add Key
```

Fields:
- **Description**: e.g., "Nudgio Recommendations"
- **User**: Select the admin user
- **Permissions**: **Read** (we only need read access for products and orders)

This generates:
- **Consumer key**: `ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Consumer secret**: `cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

The consumer secret is only shown once — merchant must copy it immediately.

### Base URL

```
{store_url}/wp-json/wc/v3
```

Example: `https://mystore.com/wp-json/wc/v3`

Some stores use a custom permalink structure. If `/wp-json/` doesn't work, try:
```
{store_url}/?rest_route=/wc/v3
```

### Products Endpoint

**List products:**
```http
GET /wp-json/wc/v3/products
  ?per_page=100
  &page=1
  &status=publish
  &orderby=id
  &order=asc
```

Key query params (from official docs):
- `per_page` — Max 100 (WooCommerce limit), default 10
- `page` — Page number (1-based), default 1
- `status` — `publish`, `draft`, `pending`, `private`, `any`
- `orderby` — `id`, `date`, `title`, `slug`, `include`, `price`, `popularity`, `rating`
- `order` — `asc` or `desc` (default `desc`)
- `category` — Filter by category ID
- `tag` — Filter by tag ID
- `sku` — Filter by exact SKU
- `type` — Filter by product type (`simple`, `grouped`, `external`, `variable`)
- `search` — Full-text search
- `after` — ISO 8601 date, only products created after this date
- `before` — ISO 8601 date, only products created before this date
- `exclude` — Array of IDs to exclude
- `include` — Array of IDs to include
- `offset` — Offset result set by N items
- `context` — `view` (default) or `edit`

Response fields per product:
```json
{
  "id": 794,
  "name": "Premium Quality T-Shirt",
  "slug": "premium-quality-t-shirt",
  "type": "simple",
  "status": "publish",
  "sku": "TSHIRT-001",
  "price": "21.99",
  "regular_price": "21.99",
  "sale_price": "",
  "stock_quantity": 45,
  "stock_status": "instock",
  "categories": [{"id": 15, "name": "Clothing", "slug": "clothing"}],
  "images": [{"id": 795, "src": "https://...", "name": "...", "alt": "..."}],
  "variations": [123, 124, 125],
  "date_created": "2024-01-15T10:30:00",
  "date_modified": "2024-02-20T14:22:00"
}
```

**Single product:**
```http
GET /wp-json/wc/v3/products/{id}
```

### Orders Endpoint

**List orders:**
```http
GET /wp-json/wc/v3/orders
  ?per_page=100
  &page=1
  &status=completed,processing
  &after=2024-01-01T00:00:00
  &orderby=date
  &order=desc
```

Key query params:
- `per_page` — Max 100
- `page` — Page number
- `status` — `pending`, `processing`, `on-hold`, `completed`, `cancelled`, `refunded`, `failed`, `trash`, `any`
- `after` — ISO 8601 date, only orders after this date
- `before` — ISO 8601 date, only orders before this date
- `customer` — Filter by customer ID

Response fields per order:
```json
{
  "id": 727,
  "status": "completed",
  "date_created": "2024-03-15T08:45:00",
  "total": "67.50",
  "customer_id": 12,
  "line_items": [
    {
      "id": 315,
      "name": "Premium Quality T-Shirt",
      "product_id": 794,
      "variation_id": 0,
      "quantity": 2,
      "subtotal": "43.98",
      "total": "43.98",
      "sku": "TSHIRT-001",
      "price": 21.99
    },
    {
      "id": 316,
      "name": "Baseball Cap",
      "product_id": 812,
      "variation_id": 0,
      "quantity": 1,
      "subtotal": "23.52",
      "total": "23.52",
      "sku": "CAP-002",
      "price": 23.52
    }
  ]
}
```

**Order line_items are embedded directly in the order response** — no separate endpoint needed.

### Pagination

Response headers:
- `X-WP-Total` — Total number of items
- `X-WP-TotalPages` — Total number of pages

Max `per_page`: 100

Loop strategy:
```
page=1 → read X-WP-TotalPages → loop until page > totalPages
```

### Rate Limiting

WooCommerce itself has **no built-in rate limiting**. However:
- The hosting provider may impose limits (e.g., Cloudflare, shared hosting)
- WordPress can be slow under high load
- Recommended: max 5 requests/second, respect any `429` or `503` responses

### Error Responses

```json
{
  "code": "woocommerce_rest_cannot_view",
  "message": "Sorry, you cannot list resources.",
  "data": {"status": 403}
}
```

Common error codes:
- `401` — Invalid consumer key/secret
- `403` — Insufficient permissions (key needs "Read" permission)
- `404` — Resource not found
- `400` — Invalid parameters

### test_connection() Strategy

```http
GET /wp-json/wc/v3/system_status
```

If 200 → connection works. Also verifies WooCommerce version and plugin status.
Fallback: `GET /wp-json/wc/v3` (API root).

---

## Magento — REST API with Integration Token

### Overview

Magento 2 (Adobe Commerce) has a built-in REST API. Authentication uses Bearer tokens generated from "Integrations" in the Magento Admin panel. No extension installation required.

### Authentication

**Bearer token** in Authorization header:

```
Authorization: Bearer {access_token}
```

The token is a permanent integration access token — does not expire unless manually revoked.

**CRITICAL — Magento 2.4.4+ Breaking Change (verified March 2026)**:
Starting with Magento 2.4.4 (released 2022), integration tokens can **no longer** be used as standalone Bearer tokens **by default**. This was disabled for security reasons (never-expiring tokens = vulnerability if compromised).

**Error when disabled**: `"The consumer isn't authorized to access %resources."`

**To re-enable Bearer token auth, merchant must do ONE of**:
1. **Admin Panel**: Stores > Configuration > Services > OAuth → "Allow OAuth Access Tokens to be used as standalone Bearer tokens" → **Yes** → Flush cache
2. **CLI**: `bin/magento config:set oauth/consumer/enable_integration_as_bearer 1`
3. **Database**: `core_config_data` table → set `oauth/consumer/enable_integration_as_bearer` = `1`

**Long-term recommendation from Adobe**: Migrate to OAuth 1.0a token generation (4-hour expiring tokens). Adobe may remove the `enable_integration_as_bearer` option in future versions.

**Impact on Nudgio**: We must document this clearly for merchants running Magento 2.4.4+. Our setup guide should include the CLI command or admin panel step. Alternatively, we could implement OAuth 1.0a for Magento in the future, but Bearer token with the config flag is simpler for now.

**Admin token alternative** (not recommended for production):
```
POST /rest/V1/integration/admin/token
Body: {"username": "admin", "password": "password"}
```
Returns a token valid for 4 hours (configurable in Admin > Stores > Configuration > Services > OAuth > Admin Token Lifetime). This requires storing merchant's admin credentials — security concern. Integration tokens are preferred.

### How Merchants Generate Integration Tokens

Path in Magento Admin:
```
System > Integrations > Add New Integration
```

Steps:
1. **Name**: e.g., "Nudgio Recommendations"
2. **API tab**: Select resource access:
   - **Catalog > Inventory > Products** (read)
   - **Sales > Operations > Orders** (read)
   - Or simply grant **All** access (simpler for merchants)
3. Click **Save** → Click **Activate** → Click **Allow**
4. Magento displays 4 tokens:
   - **Consumer Key**
   - **Consumer Secret**
   - **Access Token** ← **this is what we need**
   - **Access Token Secret**

We only need the **Access Token** for Bearer auth. The Consumer Key/Secret are for OAuth 1.0a (not needed).

### Base URL

```
{store_url}/rest/default/V1
```

- `default` = default store view. Can be replaced with a specific store code (e.g., `rest/us_en/V1`)
- For "all store views": use `rest/all/V1`

Example: `https://mymagento.com/rest/default/V1`

### Products Endpoint

**List products:**
```http
GET /rest/default/V1/products
  ?searchCriteria[pageSize]=100
  &searchCriteria[currentPage]=1
  &searchCriteria[filterGroups][0][filters][0][field]=type_id
  &searchCriteria[filterGroups][0][filters][0][value]=simple,configurable
  &searchCriteria[filterGroups][0][filters][0][conditionType]=in
```

searchCriteria parameter format:
```
searchCriteria[filterGroups][{group_index}][filters][{filter_index}][field]={field_name}
searchCriteria[filterGroups][{group_index}][filters][{filter_index}][value]={value}
searchCriteria[filterGroups][{group_index}][filters][{filter_index}][conditionType]={condition}
```

Filter groups are AND'd together. Filters within a group are OR'd.

Condition types (complete list from official docs):

| Operator | Description |
|---|---|
| `eq` | Equals (default if omitted) |
| `neq` | Not equal |
| `like` | Pattern match (SQL wildcards `%`, URL-encode as `%25`) |
| `nlike` | Not like |
| `in` | In list (comma-separated values) |
| `nin` | Not in list |
| `gt` | Greater than |
| `lt` | Less than |
| `gteq` | Greater than or equal |
| `lteq` | Less than or equal |
| `moreq` | More or equal (alias for gteq) |
| `from` | Range beginning (use with `to`) |
| `to` | Range end (use with `from`) |
| `null` | Is null |
| `notnull` | Is not null |
| `finset` | Value within a set (FIND_IN_SET) |
| `nfinset` | Value NOT in set |

**Important**: Only top-level attributes are searchable. URL-encode `%` as `%25` in `like` patterns.

Response structure:
```json
{
  "items": [
    {
      "id": 1,
      "sku": "PROD-001",
      "name": "Premium T-Shirt",
      "price": 29.99,
      "status": 1,
      "type_id": "simple",
      "created_at": "2024-01-15 10:30:00",
      "updated_at": "2024-02-20 14:22:00",
      "custom_attributes": [
        {"attribute_code": "description", "value": "..."},
        {"attribute_code": "short_description", "value": "..."},
        {"attribute_code": "url_key", "value": "premium-t-shirt"},
        {"attribute_code": "manufacturer", "value": "Nike"}
      ],
      "extension_attributes": {
        "stock_item": {
          "qty": 45,
          "is_in_stock": true
        }
      }
    }
  ],
  "search_criteria": {
    "filter_groups": [...],
    "page_size": 100,
    "current_page": 1
  },
  "total_count": 1250
}
```

**Single product by SKU:**
```http
GET /rest/default/V1/products/{sku}
```

Note: Magento REST API uses SKU (not numeric ID) for single product lookup.

### Orders Endpoint

**List orders:**
```http
GET /rest/default/V1/orders
  ?searchCriteria[pageSize]=100
  &searchCriteria[currentPage]=1
  &searchCriteria[filterGroups][0][filters][0][field]=status
  &searchCriteria[filterGroups][0][filters][0][value]=complete,processing
  &searchCriteria[filterGroups][0][filters][0][conditionType]=in
  &searchCriteria[filterGroups][1][filters][0][field]=created_at
  &searchCriteria[filterGroups][1][filters][0][value]=2024-01-01 00:00:00
  &searchCriteria[filterGroups][1][filters][0][conditionType]=gteq
  &searchCriteria[sortOrders][0][field]=created_at
  &searchCriteria[sortOrders][0][direction]=DESC
```

Response fields per order:
```json
{
  "items": [
    {
      "entity_id": 1001,
      "increment_id": "000000001",
      "status": "complete",
      "customer_id": 42,
      "grand_total": 89.97,
      "created_at": "2024-03-15 08:45:00",
      "items": [
        {
          "item_id": 2001,
          "order_id": 1001,
          "product_id": 1,
          "sku": "PROD-001",
          "name": "Premium T-Shirt",
          "qty_ordered": 2,
          "price": 29.99,
          "product_type": "simple"
        },
        {
          "item_id": 2002,
          "order_id": 1001,
          "product_id": 15,
          "sku": "CAP-002",
          "name": "Baseball Cap",
          "qty_ordered": 1,
          "price": 29.99,
          "product_type": "simple"
        }
      ]
    }
  ],
  "total_count": 500
}
```

**Order items are embedded directly in the order response** (under `items[].items[]`) — no separate endpoint needed.

### Pagination

Parameters:
- `searchCriteria[pageSize]` — Max 300 (default 20)
- `searchCriteria[currentPage]` — 1-based page number

Response includes `total_count`. Loop strategy:
```
currentPage=1 → read total_count → calculate total_pages = ceil(total_count / pageSize) → loop
```

### Rate Limiting

Magento has **no built-in REST API rate limiting** by default. However:
- Hosting providers may impose limits
- Magento's PHP-based architecture is slower than Node/Go APIs
- `input_limit` defaults: max 20 items per bulk PUT/POST request
- Recommended: max 5 requests/second to avoid overloading the server

### Error Responses

```json
{
  "message": "The consumer isn't authorized to access %resources.",
  "parameters": {
    "resources": "Magento_Catalog::products"
  }
}
```

Common errors:
- `401` — Invalid or expired token
- `403` — Token lacks required resource permissions
- `404` — Resource not found
- `400` — Invalid searchCriteria parameters

### test_connection() Strategy

```http
GET /rest/default/V1/store/storeConfigs
```

If 200 → connection works. Returns store configuration (name, locale, currency, etc.).

---

## Implementation Plan

### Phase A: Model + Migration

#### A1. Add `ConnectionMethod` enum to `models.py`

```python
class ConnectionMethod(str, Enum):
    API = "api"
    DATABASE = "database"
```

#### A2. Add new columns to `EcommerceConnection` in `models.py`

```python
# Connection method: API (REST) or DATABASE (direct SQL)
connection_method: Mapped[ConnectionMethod] = mapped_column(
    SQLEnum(ConnectionMethod), default=ConnectionMethod.API
)
# API-based connection fields
store_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
# e.g., "https://mystore.myshopify.com" or "https://mystore.com"
api_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
# WooCommerce: consumer_key (ck_xxx)
api_secret: Mapped[str | None] = mapped_column(String(512), nullable=True)
# WooCommerce: consumer_secret (cs_xxx), Magento: integration access token, Shopify: access token
```

Keep existing `db_*` fields for database connections (no removal, backward compatible).

#### A3. Make `db_*` fields nullable

Currently `db_host`, `db_name`, `db_user`, `db_password` are `nullable=False`. Change to `nullable=True` since API connections don't need them.

#### A4. Update `connection_schemas.py`

Add `connection_method`, `store_url`, `api_key`, `api_secret` to `ConnectionCreateRequest`.
Make `db_*` fields optional.
Add validation: if `connection_method=api` → require `store_url`; if `connection_method=database` → require `db_host`.
Add `connection_method` and `store_url` to `ConnectionResponse` (do NOT expose `api_key`/`api_secret` in responses).

#### A5. Generate + run Alembic migration

```bash
cd server && uv run alembic revision --autogenerate -m "add connection_method and api fields"
cd server && uv run alembic upgrade head
```

#### Files:
- `server/apps/ecommerce/models.py`
- `server/apps/ecommerce/schemas/connection_schemas.py`
- `server/migrations/versions/<new_migration>.py` (auto-generated)

---

### Phase B: Centralized Adapter Factory

#### B1. Create `server/apps/ecommerce/adapters/factory.py`

```python
from ..models import EcommerceConnection, PlatformType, ConnectionMethod
from .shopify import ShopifyAdapter
from .woocommerce import WooCommerceAdapter
from .woocommerce_api import WooCommerceApiAdapter
from .magento import MagentoAdapter
from .magento_api import MagentoApiAdapter

def get_adapter(connection: EcommerceConnection):
    """Centralized adapter factory. Returns the correct adapter based on platform and connection_method."""
    if connection.platform == PlatformType.SHOPIFY:
        return ShopifyAdapter(connection)  # Always API-based

    elif connection.platform == PlatformType.WOOCOMMERCE:
        if connection.connection_method == ConnectionMethod.API:
            return WooCommerceApiAdapter(connection)
        else:
            return WooCommerceAdapter(connection)

    elif connection.platform == PlatformType.MAGENTO:
        if connection.connection_method == ConnectionMethod.API:
            return MagentoApiAdapter(connection)
        else:
            return MagentoAdapter(connection)

    else:
        raise ValueError(f"Unsupported platform: {connection.platform}")
```

#### B2. Replace duplicated factory logic in all 4 subrouters

In each subrouter, replace the if/elif/elif block + per-adapter imports with:
```python
from ..adapters.factory import get_adapter
# ...
adapter = get_adapter(connection)
```

#### Files:
- `server/apps/ecommerce/adapters/factory.py` (new)
- `server/apps/ecommerce/subrouters/connections_subrouter.py`
- `server/apps/ecommerce/subrouters/data_subrouter.py`
- `server/apps/ecommerce/subrouters/recommendations_subrouter.py`
- `server/apps/ecommerce/subrouters/components_subrouter.py`

---

### Phase C: WooCommerce REST API Adapter + Auto-Auth

#### C1. Create `server/apps/ecommerce/adapters/woocommerce_api.py`

Standalone class (like `ShopifyAdapter`, NOT inheriting `PlatformAdapter`). Uses aiohttp. Same interface: `get_products()`, `get_orders()`, `get_order_items()`, `get_product_by_id()`, `test_connection()`.

Field mapping from `EcommerceConnection`:
- `store_url` → base URL (e.g., `https://mystore.com`)
- `api_key` → consumer_key (HTTP Basic Auth username)
- `api_secret` → consumer_secret (HTTP Basic Auth password)

Base URL: `{store_url}/wp-json/wc/v3`

Authentication: `aiohttp.BasicAuth(consumer_key, consumer_secret)`

`test_connection()`: `GET /wp-json/wc/v3/system_status` → verify 200.

Pagination: Loop with `per_page=100` + `page=N`, read `X-WP-TotalPages` header.

#### C2. Create WooCommerce auto-auth callback endpoint

Create `server/apps/ecommerce/subrouters/woocommerce_auth_subrouter.py`:

**`GET /ecommerce/woocommerce/auth`**
- Query params: `store_url` (merchant's WooCommerce store URL)
- Builds authorization URL: `{store_url}/wc-auth/v1/authorize?app_name=Nudgio&scope=read&user_id={nudgio_user_id}&return_url={FRONTEND_URL}/connections?wc_connected=true&callback_url={API_URL}/ecommerce/woocommerce/callback`
- Returns `{ auth_url: "..." }`

**`POST /ecommerce/woocommerce/callback`**
- Receives JSON body from WooCommerce: `{ key_id, user_id, consumer_key, consumer_secret, key_permissions }`
- Saves/updates `EcommerceConnection` with `connection_method=api`, `store_url`, `api_key=consumer_key`, `api_secret=consumer_secret`

Register in `router.py`.

#### Files:
- `server/apps/ecommerce/adapters/woocommerce_api.py` (new)
- `server/apps/ecommerce/subrouters/woocommerce_auth_subrouter.py` (new)
- `server/apps/ecommerce/router.py` (add include_router)

---

### Phase D: Magento REST API Adapter

#### D1. Create `server/apps/ecommerce/adapters/magento_api.py`

Standalone class. Uses aiohttp. Same interface.

Field mapping from `EcommerceConnection`:
- `store_url` → base URL (e.g., `https://mymagento.com`)
- `api_secret` → integration access token (Bearer auth)

Base URL: `{store_url}/rest/default/V1`

Authentication: `Authorization: Bearer {access_token}`

`test_connection()`: `GET /rest/default/V1/store/storeConfigs` → verify 200. If 401 error with message containing "consumer isn't authorized", return helpful error message explaining the Magento 2.4.4+ Bearer token config change (see Magento section above).

Pagination: `searchCriteria[pageSize]=100` + `searchCriteria[currentPage]=N`, read `total_count` from response.

**Note on Magento 2.4.4+**: If merchant gets auth errors, they need to enable Bearer token usage via admin panel or CLI (documented in Magento section above). Our test_connection() should detect this specific error and return a clear instruction.

#### Files:
- `server/apps/ecommerce/adapters/magento_api.py` (new)

---

### Phase E: Update ShopifyAdapter

#### E1. Update field mapping in `server/apps/ecommerce/adapters/shopify.py`

```python
# Before:
self.store_domain = connection.db_host
self.access_token = connection.db_password

# After (backward compat):
self.store_domain = connection.store_url or connection.db_host
self.access_token = connection.api_secret or connection.db_password
```

Ensures existing Shopify connections (using `db_host`/`db_password`) still work while new connections use proper fields.

#### Files:
- `server/apps/ecommerce/adapters/shopify.py`

---

### Phase F: Shopify OAuth Flow

#### F1. Add environment variables

`.env` and `.env.production`:
```
SHOPIFY_CLIENT_ID=<from Shopify Partner Dashboard>
SHOPIFY_CLIENT_SECRET=<from Shopify Partner Dashboard>
SHOPIFY_SCOPES=read_products,read_orders
SHOPIFY_REDIRECT_URI=https://api.nudgio.com/ecommerce/shopify/callback
```

`core/config.py`:
```python
SHOPIFY_CLIENT_ID: str = ""
SHOPIFY_CLIENT_SECRET: str = ""
SHOPIFY_SCOPES: str = "read_products,read_orders"
SHOPIFY_REDIRECT_URI: str = ""
```

#### F2. Create `server/apps/ecommerce/subrouters/shopify_oauth_subrouter.py`

**`GET /ecommerce/shopify/auth`**
- Query params: `shop` (store domain)
- Generates random `nonce`, stores server-side
- Returns `{ auth_url: "https://{shop}/admin/oauth/authorize?..." }`

**`GET /ecommerce/shopify/callback`**
- Shopify sends: `code`, `hmac`, `shop`, `state`, `timestamp`
- Verify HMAC-SHA256 (hex digest, sorted params, Client Secret as key)
- Verify `state` matches stored nonce
- Validate `shop` hostname regex
- Exchange code for token via POST to `https://{shop}/admin/oauth/access_token`
- Save/update `EcommerceConnection`
- Redirect to `{FRONTEND_URL}/connections?shopify_connected=true`

#### F3. Register subrouter

In `server/apps/ecommerce/router.py`:
```python
from .subrouters.shopify_oauth_subrouter import router as shopify_oauth_router
ecommerce_router.include_router(shopify_oauth_router)
```

#### Files:
- `server/apps/ecommerce/subrouters/shopify_oauth_subrouter.py` (new)
- `server/apps/ecommerce/router.py`
- `server/core/config.py`
- `.env`, `.env.production`

---

### Phase G: Frontend Updates

#### G1. Update `client/src/modules/ecommerce/schemas/ecommerce-connections.schema.ts`

Add `connectionMethodEnum` (`api`, `database`).
Add `connection_method`, `store_url` to `ConnectionSchema`.
Add `connection_method`, `store_url`, `api_key`, `api_secret` to `CreateConnectionSchema`.

#### G2. Update `client/src/modules/ecommerce/utils/api.endpoints.ts`

Add Shopify OAuth endpoint:
```typescript
export const SHOPIFY_OAUTH_ENDPOINTS = {
  AUTH: (shop: string) => `${API_BASE_URL}/ecommerce/shopify/auth?shop=${shop}`,
};
```

#### G3. Redesign `client/src/app/(ecommerce)/connections/new/page.tsx`

Show different fields based on platform + connection method:

**Shopify:**
- "Connect with Shopify" OAuth button (primary)
- OR "Manual Setup" toggle → `store_url` + `api_secret` (access token)
- No database option

**WooCommerce:**
- "Connect WooCommerce" button (primary) → auto-auth via `/wc-auth/v1/authorize`
- OR "Manual API Setup" toggle → `store_url`, `api_key` (consumer_key), `api_secret` (consumer_secret)
- OR "Database" toggle (advanced) → `db_host`, `db_name`, `db_user`, `db_password`, `db_port`

**Magento:**
- Connection Method toggle: "REST API" (default) | "Database"
- REST API mode: `store_url`, `api_secret` (integration access token)
- Database mode: `db_host`, `db_name`, `db_user`, `db_password`, `db_port`

#### G4. Update `client/src/modules/ecommerce/service/ecommerce-connections.service.ts`

Add `initiateShopifyOAuth(shop: string)` → calls auth endpoint → returns auth URL.

#### G5. Update `client/src/app/(ecommerce)/connections/[id]/page.tsx`

Show `connection_method` badge (API / Database) alongside platform badge.
Show `store_url` instead of `db_host` for API connections.

#### G6. Update `client/src/app/(ecommerce)/connections/page.tsx`

Add success alert when redirected from Shopify OAuth with `?shopify_connected=true`.

#### Files:
- `client/src/modules/ecommerce/schemas/ecommerce-connections.schema.ts`
- `client/src/modules/ecommerce/utils/api.endpoints.ts`
- `client/src/modules/ecommerce/service/ecommerce-connections.service.ts`
- `client/src/app/(ecommerce)/connections/new/page.tsx`
- `client/src/app/(ecommerce)/connections/[id]/page.tsx`
- `client/src/app/(ecommerce)/connections/page.tsx`

---

## Implementation Order (file by file)

1. `server/apps/ecommerce/models.py` — add ConnectionMethod enum + new columns + make db_* nullable
2. Generate + run Alembic migration
3. `server/apps/ecommerce/schemas/connection_schemas.py` — add new fields + validation
4. `server/apps/ecommerce/adapters/woocommerce_api.py` — new WooCommerce REST API adapter
5. `server/apps/ecommerce/adapters/magento_api.py` — new Magento REST API adapter
6. `server/apps/ecommerce/adapters/shopify.py` — update field mapping for backward compat
7. `server/apps/ecommerce/adapters/factory.py` — centralized adapter factory
8. Replace adapter factory in 4 subrouters (connections, data, recommendations, components)
9. `server/core/config.py` — add Shopify + WooCommerce env vars
10. `server/apps/ecommerce/subrouters/shopify_oauth_subrouter.py` — Shopify OAuth flow endpoints
11. `server/apps/ecommerce/subrouters/woocommerce_auth_subrouter.py` — WooCommerce auto-auth callback
12. `server/apps/ecommerce/router.py` — register both new subrouters
13. `client/src/modules/ecommerce/schemas/ecommerce-connections.schema.ts` — add connectionMethod + API fields
14. `client/src/modules/ecommerce/utils/api.endpoints.ts` — add Shopify OAuth + WooCommerce auth endpoints
15. `client/src/modules/ecommerce/service/ecommerce-connections.service.ts` — add initiateShopifyOAuth + initiateWooCommerceAuth
16. `client/src/app/(ecommerce)/connections/new/page.tsx` — redesign form per platform
17. `client/src/app/(ecommerce)/connections/[id]/page.tsx` — show connection_method badge
18. `client/src/app/(ecommerce)/connections/page.tsx` — OAuth/auth success handling for both Shopify + WooCommerce

---

## Official Documentation

### Shopify
- **OAuth Authorization Code Grant**: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant
- **Offline Access Tokens**: https://shopify.dev/docs/apps/build/authentication-authorization/access-token-types/offline-access-tokens
- **Auth Overview**: https://shopify.dev/docs/apps/build/authentication-authorization
- **API Scopes**: https://shopify.dev/docs/api/usage/access-scopes
- **Rate Limits (all APIs)**: https://shopify.dev/docs/api/usage/rate-limits
- **GDPR Webhooks**: https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance
- **REST Admin API (legacy)**: https://shopify.dev/docs/api/admin-rest
- **GraphQL Admin API**: https://shopify.dev/docs/api/admin-graphql
- **All-in on GraphQL blog post**: https://www.shopify.com/partners/blog/all-in-on-graphql
- **Partner Dashboard**: https://partners.shopify.com
- **App Store Requirements**: https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements

### WooCommerce
- **REST API v3 Docs**: https://woocommerce.github.io/woocommerce-rest-api-docs/
- **Authentication**: https://woocommerce.github.io/woocommerce-rest-api-docs/#authentication
- **Auto-Key Generation (wc-auth)**: https://woocommerce.github.io/woocommerce-rest-api-docs/#authentication-endpoint
- **Developer Docs**: https://developer.woocommerce.com/docs/apis/rest-api/
- **GitHub Source (auth endpoint)**: https://github.com/woocommerce/woocommerce-rest-api-docs/blob/trunk/source/includes/v3/_authentication-endpoint.md

### Magento / Adobe Commerce
- **REST API Overview**: https://developer.adobe.com/commerce/webapi/rest/
- **Token-Based Auth**: https://developer.adobe.com/commerce/webapi/get-started/authentication/gs-authentication-token/
- **searchCriteria**: https://developer.adobe.com/commerce/webapi/rest/use-rest/performing-searches/
- **Magento 2.4.4 Bearer Token Change**: https://blog.petehouston.com/integration-api-not-working-after-upgrading-to-magento-2-4-4/
- **Mirror Docs (searchCriteria examples)**: https://r-martins.github.io/m1docs/guides/v2.4/rest/performing-searches.html

---

## Verification

### Backend
1. Run migration: `cd server && uv run alembic upgrade head`
2. Run server: `cd server && uv run uvicorn main:app --port 8002`
3. Test WooCommerce API: Create connection with `connection_method=api`, `store_url`, `api_key`, `api_secret` → test connection → fetch products
4. Test Magento API: Create connection with `connection_method=api`, `store_url`, `api_secret` → test connection → fetch products
5. Test Shopify OAuth: Visit `GET /ecommerce/shopify/auth?shop=teststore.myshopify.com` → verify redirect URL → simulate callback
6. Verify existing database connections still work (backward compat)

### Frontend
1. `cd client && npm run build` — zero TypeScript errors
2. Create WooCommerce REST API connection → fill store_url + consumer_key + consumer_secret → test → verify products
3. Create Magento REST API connection → fill store_url + access_token → test → verify products
4. Click "Connect with Shopify" → verify OAuth redirect flow
5. Verify all existing pages (recommendations, components, analytics, settings) work with API-based connections

---

## Progress Checklist

### Phase A: Model + Migration
- [x] A1. Add `ConnectionMethod` enum and `connection_method` column to `EcommerceConnection` model
- [x] A2. Add API fields (`store_url`, `api_key`, `api_secret`) to model
- [x] A3. Make `db_*` fields nullable
- [x] A4. Rewrite `ecommerce_connection_schemas.py` (new fields, validation, nexotype patterns)
- [x] A5. Generate + run Alembic migration (`91d861a1bea9`) — applied and verified
- [x] A6. Rewrite all schema files to follow nexotype patterns (`recommendation_settings_schemas.py`, `recommendation_schemas.py`, `data_schemas.py`)
- [x] A7. Rewrite all subrouters to follow nexotype patterns (section headers, docstrings, two-tier except, proper naming)
- [x] A8. Rename subrouter files to mirror model names (`ecommerce_connection_subrouter.py`, `recommendation_settings_subrouter.py`, `recommendation_subrouter.py`)
- [x] A9. Verify DB state — all columns correct (varchar not enum), old PG enum types dropped, all FKs have CASCADE

### Phase B: Centralized Adapter Factory
- [x] B1. Create `adapters/factory.py` with `get_adapter()` function
- [x] B2. Replace duplicated factory logic in all subrouters with `from ..adapters.factory import get_adapter`
- [x] B3. Update `factory.py` to route by `connection_method` (api vs database) — API is default, database only if explicitly set

### Phase C: WooCommerce REST API Adapter + Auto-Auth
- [x] C1. Create `adapters/woocommerce/api.py` — `WooCommerceApiAdapter` (HTTP Basic Auth, pagination, test_connection)
- [x] C2. Create `subrouters/woocommerce_auth_subrouter.py` — auto-key generation via `/wc-auth/v1/authorize` + callback endpoint
- [x] C3. Register WooCommerce auth subrouter in `router.py`

### Phase D: Magento REST API Adapter
- [x] D1. Create `adapters/magento/api.py` — `MagentoApiAdapter` (Bearer token, searchCriteria pagination, 2.4.4+ error detection)

### Phase E: Update Shopify Adapter
- [x] E1. Update `adapters/shopify/api.py` field mapping — use `store_url` and `api_secret` directly

### Phase F: Shopify OAuth + Environment Config
- [x] F1. Add Shopify env vars to `core/config.py` (`SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `SHOPIFY_SCOPES`, `SHOPIFY_REDIRECT_URI`)
- [x] F2. Add Shopify env vars to `.env`, `.env.production`, `.env.example`
- [x] F3. Create `subrouters/shopify_oauth_subrouter.py` — `/shopify/auth` (generate auth URL) + `/shopify/callback` (HMAC verify, exchange code for token, save connection)
- [x] F4. Register Shopify OAuth subrouter in `router.py`

### Phase G: Frontend Updates
- [x] G1. Update `schemas/ecommerce-connections.schema.ts` — add `connectionMethodEnum` (`api`, `database`), add `connection_method`, `store_url`, `api_key`, `api_secret` fields
- [x] G2. Update `utils/api.endpoints.ts` — add Shopify OAuth + WooCommerce auth endpoints
- [x] G3. Update `service/ecommerce-connections.service.ts` — add `initiateShopifyOAuth(shop)` + `initiateWooCommerceAuth(store_url)`
- [x] G4. Rename all frontend files to mirror backend model names (21 files via `git mv`: schemas, services, hooks, stores, providers)
- [x] G5. Update all imports across 22+ files to use new file names
- [x] G6. Fix `recommendation-settings.schema.ts` — rewrite to match backend `RecommendationSettingsDetail` (removed 8 wrong fields, added correct ones)
- [x] G7. Fix `recommendations.schema.ts` — `total` → `count` to match backend `RecommendationResult`
- [x] G8. Rewrite `settings/page.tsx` to use correct field names from fixed schema
- [x] G9. Fix `recommendations/page.tsx` — `result.total` → `result.count`
- [x] G10. Redesign `connections/new/page.tsx` — different fields per platform + connection method (Shopify: OAuth button + manual toggle; WooCommerce: auto-auth button + manual API + database; Magento: API default + database toggle)
- [x] G11. Update `connections/[id]/page.tsx` — show `connection_method` badge (API/Database), show `store_url` for API connections, show different info fields per method
- [x] G12. Update `connections/page.tsx` — handle OAuth/auth success redirects (`?shopify_connected=true`, `?wc_connected=true`), show `store_url`/`db_host` per method, add method badge

### Phase H: Backend Audit Fixes (2026-03-04)
- [x] H1. Add `BaseMixin` class to `models.py` — timestamps (`created_at`, `updated_at`), soft delete (`deleted_at`, `deleted_by`), user audit (`created_by`, `updated_by`)
- [x] H2. Apply `BaseMixin` to `EcommerceConnection` and `RecommendationSettings` (not log tables — append-only)
- [x] H3. Generate + run migration (`Add BaseMixin fields`) — 8 new columns (4 per table)
- [x] H4. Create `utils/dependency_utils.py` — shared `get_user_connection()` and `get_active_connection()` with soft delete filter
- [x] H5. Refactor `ecommerce_connection_subrouter.py` — use shared helpers (DRY), soft delete on delete endpoint, `created_by`/`updated_by` audit fields, soft delete filter on all queries
- [x] H6. Fix `recommendation_settings_subrouter.py` — partial update via `model_dump(exclude_unset=True)`, soft delete filter on list query
- [x] H7. Add `Field(description="...")` to all schema fields in all 4 schema files
- [x] H8. Add docstring and section comments to `router.py`
- [x] H9. Add docstring to `encryption.py` — Fernet two-way encryption for credentials, integration points documented
- [x] H10. Add `cryptography` package to `pyproject.toml` via `uv add cryptography`

### Phase I: Subscription System + Credential Encryption + Cache/Rate Limiting Backends (2026-03-04)

#### I1–I3: Utils Renames
- [x] I1. Rename `cache.py` → `cache_utils.py` (git mv)
- [x] I2. Rename `encryption.py` → `encryption_utils.py` (git mv)
- [x] I3. Rename `rate_limiting.py` → `rate_limiting_utils.py` (git mv)

#### I4: Subscription Utils
- [x] I4. Create `utils/subscription_utils.py` — complete subscription tier system:
  - Constants: `TIER_ORDER` (FREE/PRO/ENTERPRISE), `GRACE_PERIOD_DAYS` (7), `TIER_LIMITS` (connections, monthly orders, requests/min, requests/hour)
  - Pricing: FREE €0/mo, PRO €12/mo, ENTERPRISE €36/mo
  - Query helpers: `get_org_subscription()`, `get_org_connection_count()`, `get_org_monthly_order_count()` (counts APIUsageTracking records for recommendations in current month)
  - Logic helpers: `get_org_tier()`, `tier_is_sufficient()`, `get_tier_limits()`, `is_over_connection_limit()`, `is_service_active()` (main check: FREE limits, ACTIVE/TRIALING, grace period, manual_override)
  - Stripe Dashboard setup instructions in docstring (products, metadata, features, portal config)

#### I5: Subscription Dependency
- [x] I5. Add `require_active_subscription` + `get_user_organization_id` to `utils/dependency_utils.py`
  - `require_active_subscription`: router-level dependency, blocks ALL requests when `is_service_active()` returns False (403)
  - `get_user_organization_id`: queries `OrganizationMember` for user's org_id

#### I6: Router Split (Gated/Ungated)
- [x] I6. Rewrite `router.py` — split into ungated (Shopify OAuth + WooCommerce auth callbacks) and gated (everything else with `Depends(require_active_subscription)`)

#### I7: Connection Limit + Credential Encryption
- [x] I7. Update `ecommerce_connection_subrouter.py`:
  - Connection limit check on create: `is_over_connection_limit()` → 403 if over tier limit
  - Encrypt credentials on create: `encrypt_password()` for `api_key`, `api_secret`, `db_password`
  - Encrypt credentials on update: same for sensitive fields that were updated
- [x] I8. Update `adapters/factory.py` — decrypt credentials before adapter init: `decrypt_password()` for `api_key`, `api_secret`, `db_password`. Single decryption point, adapters receive plaintext. `decrypt_password()` handles non-encrypted values gracefully (returns input if decryption fails).

#### I9: Cache Backend Rewrite
- [x] I9. Rewrite `cache_utils.py` — ABC (`CacheBackend`) + two implementations:
  - `InMemoryCacheBackend`: Python dict with TTL (development, single worker)
  - `DragonflyCacheBackend`: DragonflyDB/Redis via `redis.asyncio` (production, multi-worker)
  - Factory: `CACHE_BACKEND = "memory"` constant in file, switch to `"dragonfly"` for production
  - Helper functions: `get_cached_recommendations()`, `set_cached_recommendations()`

#### I10: Rate Limiting Backend Rewrite
- [x] I10. Rewrite `rate_limiting_utils.py` — ABC (`RateLimitBackend`) + two implementations:
  - `InMemoryRateLimitBackend`: Python dict with sliding window (development)
  - `DragonflyRateLimitBackend`: DragonflyDB/Redis sorted sets (production)
  - Reads limits from `subscription_utils.TIER_LIMITS` instead of hardcoding
  - Factory: `RATE_LIMIT_BACKEND = "memory"` constant in file
  - Main function: `check_rate_limit(org_id, tier)` — checks minute + hour windows

#### I11: Stripe Configuration + Testing
- [x] I11. Configure Stripe for nudgio sandbox:
  - API key: `sk_test_51T7GFC...` (separate sandbox from nexotype `51ShB2t` and finpy `51MEJyv`)
  - Webhook secret: `whsec_8049dafa...` (generated by `stripe listen --api-key`)
  - Stripe listen command: `stripe listen --api-key sk_test_51T7GFC... --forward-to localhost:8002/accounts/subscriptions/webhook`
  - Updated `support/commands.txt` with correct nudgio stripe command + sandbox explanation
  - Tested: Pro subscription created via Stripe Checkout → webhook received → Subscription record in DB

#### I12: Frontend Provider Fixes
- [x] I12. Fix `data-provider.tsx` — removed auto-fetch useEffect on `activeConnectionId` change (was causing 404 "Active connection not found" for connections without data). Architecture preserved (imports, destructuring, store connection).
- [x] I13. Fix `recommendation-settings-provider.tsx` — removed auto-fetch useEffect on `activeConnectionId` change (was causing 404 "Settings not found for this connection"). Initialize useEffect for `initialFetch && !isInitialized` kept. Architecture preserved.

---

## What Remains

### Performance (Built, Not Wired — Highest Priority)
- ✅ Wire cache into recommendation + component subrouters
- ✅ Wire rate limiting into router
- ✅ Wire monthly order limit enforcement

### Production Deployment
- ⏸️ Production DragonflyDB setup — switch `CACHE_BACKEND` and `RATE_LIMIT_BACKEND` to `"dragonfly"`, configure `DRAGONFLY_URL` (ON HOLD — DragonflyDB not yet provisioned in Coolify)
- ✅ Production Stripe configuration — webhook endpoint created (`https://server.nudgio.tech/accounts/subscriptions/webhook`), `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` set in Coolify env vars
- ✅ Create Pro and Enterprise products in Stripe Dashboard with correct metadata (`tier=PRO`/`ENTERPRISE`, `tier_order=0`/`1`, features list)
- ✅ Stripe Customer Portal — enable plan switching, add Pro + Enterprise as eligible products, enable cancellations
- ~~Clean up duplicate test subscriptions from Stripe Dashboard~~ (test mode, irrelevant to production)

### Backend Improvements
- ~~HTTPS validation on `store_url`~~ (skipped — would block test/dev shops on localhost or local network)
- ✅ Propagate HTTP status codes in adapter error messages — adapters now raise with status code + response body instead of silently returning empty
- ~~Different `test_connection()` response messages for API vs Database connections~~ (cosmetic, low priority)
- ✅ Data endpoints — `data_subrouter.py` fetches products/orders/stats live from store APIs via adapters
- ✅ Efficient adapter count methods — `get_product_count()` and `get_order_count()` added to all 5 adapters (lightweight API calls / SQL COUNT)
- ✅ Removed `order_items_count` from stats (no efficient count across platforms)
- ✅ Settings endpoint returns defaults when no record exists (no more 404)
- ✅ `pool_pre_ping=True` on DB engine (prevents stale connection errors)
- ✅ Frontend service envelope unwrapping bug fixed across all services
- ✅ Widget parameters (lookback_days, method, min_price_increase) passed through to engine
- ✅ Product images in widget HTML (from adapter data, not placeholders)
- ✅ ConnectionProvider `initialFetch={true}` (connections load on all pages)
- ✅ Eye toggle on credential fields in connection detail page

### Shopify App Store Submission Blockers
- ✅ GDPR webhooks — 3 mandatory compliance endpoints with HMAC-SHA256 verification (Base64)
- ✅ GraphQL migration — `ShopifyAdapter` rewritten from REST to GraphQL Admin API (2026-01)
- ✅ Shopify Billing API — ShopifyBilling model, subscribe/callback/cancel/status endpoints, webhook handler
- ✅ Shopify Partner Dashboard — app registered, Client ID + Client Secret obtained, OAuth flow tested
- ✅ `shopify.app.toml` configuration — scopes, redirect URLs, webhooks, compliance topics

### Shopify Embedded App UI
- ✅ App Bridge integration — CDN-loaded App Bridge + Polaris web components, session token auth (JWT HS256), Token Exchange API, auto-provisioning (User + Org + Connection)
- ✅ Embedded dashboard pages — 5 pages: dashboard, settings, recommendations, components (preview only), billing. 16 embedded endpoints (53 total routes). Security gating (subscription + rate limit + monthly order limit via EmbeddedOrgContext)
- ❌ Storefront widget delivery (Stage 3) — App Proxy + HMAC verification + Theme App Extension (Liquid + JS) for live storefront rendering

### WooCommerce WordPress Plugin (Distribution)
- ❌ PHP plugin for WordPress Plugin Directory — shortcodes or Gutenberg blocks for recommendation widgets
- ❌ Submit to WordPress Plugin Directory (free listing)

### Magento Adobe Commerce Extension (Distribution)
- ❌ Magento extension for Adobe Commerce Marketplace — lower priority (smaller market)

### Landing Page + Legal
- ✅ Landing page — deployed at www.nudgio.tech (Vercel), hero + features + how it works + contact form + blog
- ✅ Privacy policy — `/legal/privacy-policy` (GDPR/CCPA)
- ✅ Terms of service — `/legal/terms-of-service` (SaaS terms, Romanian jurisdiction)

### Nice to Have
- ❌ Frontend subscription page — show current tier, usage stats, upgrade/downgrade buttons (match nexotype/finpy pattern)
