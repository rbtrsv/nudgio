# Nudgio — To-Do List (Ordered by Importance)

> **MANDATORY**: Never create migration files. The user creates and runs migrations themselves. Only add/modify model fields. DO NOT DELETE THIS RULE.

---

## MANDATORY RULES — Read Before Any Implementation

1. **Read 2-3 reference files BEFORE creating or modifying ANY file.** Read from nexotype, accounts, assetmanager, or finpy — both frontend and backend — to understand exact patterns, naming, comments, structure.

2. **File naming mirrors model names.** The backend model name dictates the file name across the ENTIRE stack:
   - Model: `EcommerceConnection` → backend: `ecommerce_connection_schemas.py`, `ecommerce_connection_subrouter.py` → frontend: `ecommerce-connections.schema.ts`, `ecommerce-connections.service.ts`, `ecommerce-connections.store.ts`, `ecommerce-connections-provider.tsx`, `use-ecommerce-connections.ts`
   - Model: `RecommendationSettings` → backend: `recommendation_settings_schemas.py`, `recommendation_settings_subrouter.py` → frontend: `recommendation-settings.schema.ts`, `recommendation-settings.service.ts`, `recommendation-settings.store.ts`, `recommendation-settings-provider.tsx`, `use-recommendation-settings.ts`
   - Model: `RecommendationResult` → backend: `recommendation_schemas.py`, `recommendation_subrouter.py` → frontend: `recommendations.schema.ts`, `recommendations.service.ts`, `use-recommendations.ts`
   - Model: `ConnectionStats` → backend: `data_schemas.py`, `data_subrouter.py` → frontend: `data.schema.ts`, `data.service.ts`, `data.store.ts`, `data-provider.tsx`, `use-data.ts`
   - Model: components → backend: `components_subrouter.py` → frontend: `components.schema.ts`, `components.service.ts`, `use-components.ts`
   - This applies to ALL file types: schemas, subrouters, services, stores, providers, hooks, pages.

3. **Frontend schema fields MUST match backend response fields exactly.** Same field names (snake_case), same types, same enum values.

4. **Never guess patterns.** If unsure how a file should look, find and read a working example first.

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
| Custom Integration | Ingest (Push API) | Connection name only | No credentials — data pushed via Data Ingestion API |

---

## Architecture Reference

### Models (`server/apps/ecommerce/models.py`)

- `EcommerceConnection(BaseMixin)` — id, user_id, organization_id, platform, connection_name, connection_method (api/database/ingest), store_url, api_key, api_secret, db_* fields, is_active, sync fields (auto_sync_enabled, sync_interval, last_synced_at, next_sync_at, last_sync_status)
- `RecommendationSettings(BaseMixin)` — id, connection_id (unique FK), algorithm fields (bestseller_method, lookback days, max_recommendations, min_price_increase_percent), shop URLs (shop_base_url, product_url_template), 11 brand identity visual fields (widget_style, widget_columns, widget_size, primary_color, text_color, bg_color, border_radius, cta_text, show_price, image_aspect, widget_title)
- `WidgetAPIKey(BaseMixin)` — id, connection_id, name, api_key_prefix, encrypted_secret, allowed_domains, is_active
- `ShopifyBilling(BaseMixin)` — id, organization_id, shop_domain, charge_id, plan_name, status, activated_on, cancelled_on
- `IngestedProduct`, `IngestedOrder`, `IngestedOrderItem` — local storage tables per connection_id
- `APIUsageTracking`, `RecommendationAnalytics` — append-only logs (no BaseMixin)

### Adapters (`server/apps/ecommerce/adapters/`)

```
adapters/
├── base.py           → PlatformAdapter ABC
├── factory.py        → get_adapter(connection, db) — routes by platform + connection_method
├── ingest.py         → IngestAdapter — reads from ingested tables
├── shopify/api.py    → ShopifyAdapter (GraphQL Admin API 2026-01)
├── woocommerce/api.py      → WooCommerceApiAdapter (REST API v3, HTTP Basic Auth)
├── woocommerce/database.py → WooCommerceAdapter (direct MySQL)
├── magento/api.py           → MagentoApiAdapter (REST API, Bearer token)
└── magento/database.py      → MagentoAdapter (direct MySQL, EAV)
```

### Subrouters (`server/apps/ecommerce/subrouters/`) — 12 subrouters, 69+ routes

- `ecommerce_connection_subrouter.py` — CRUD + test connection
- `recommendation_settings_subrouter.py` — CRUD per connection
- `recommendation_subrouter.py` — bestsellers, cross-sell, up-sell, similar
- `components_subrouter.py` — HTML widget generation + `apply_visual_defaults()` helper
- `data_subrouter.py` — raw product/order data + import + sync
- `woocommerce_sync_subrouter.py` — WooCommerce plugin data push (HMAC body signing auth)
- `shopify_oauth_subrouter.py` — Shopify OAuth 2.0 flow
- `woocommerce_auth_subrouter.py` — WooCommerce auto-auth
- `widget_api_key_subrouter.py` — JWT-gated CRUD for widget API keys
- `widget_subrouter.py` — Public widget endpoints (HMAC signed URL auth)
- `widget_sign_subrouter.py` — HMAC URL signing for widget.js
- `shopify_embedded_subrouter.py` — Embedded app endpoints (session token auth)
- `shopify_app_proxy_subrouter.py` — App Proxy widget endpoints (HMAC hex auth)
- `shopify_billing_subrouter.py` — Billing subscribe/cancel/status/callback

### Utils (`server/apps/ecommerce/utils/`)

- `dependency_utils.py` — `get_user_connection()`, `get_active_connection()`, `require_active_subscription`, `get_user_organization_id()`
- `subscription_utils.py` — tier constants, limits, grace period, query helpers, `is_service_active()`
- `cache_utils.py` — ABC + `InMemoryCacheBackend` + `DragonflyCacheBackend`
- `encryption_utils.py` — Fernet symmetric encryption for credentials
- `rate_limiting_utils.py` — ABC + `InMemoryRateLimitBackend` + `DragonflyRateLimitBackend`
- `widget_auth_utils.py` — HMAC-SHA256 for public widget endpoints + `verify_woocommerce_sync_signature()` for POST body signing
- `sync_utils.py` — shared upsert helpers + `sync_connection_data()` + ghost row pruning
- `shopify_session_utils.py` — session token verify + Token Exchange API
- `shopify_billing_utils.py` — Shopify Billing API helpers

### Router (`server/apps/ecommerce/router.py`)

Prefix: `/ecommerce`. Split into ungated and gated:
- **Ungated**: Shopify OAuth + WooCommerce auth + webhooks + billing + embedded (session token) + App Proxy (HMAC) + Widget (HMAC signed URL) + WooCommerce Sync (HMAC body signing)
- **Gated**: Everything else via `require_active_subscription` dependency

### Custom Integration — Tab Layout

| Connection | Tabs |
|---|---|
| Shopify (API) | Overview, Data Sync, Settings |
| WooCommerce/Magento (API/DB) | Overview, Data Sync, Settings, API Keys |
| Custom Integration (ingest) | Overview, Settings, API Keys |

Key decisions: Data Sync tab hidden for ingest connections (data is pushed). API Keys tab shows Push API Integration Guide for ingest connections.

---

## Widget / Visual Fields — Parity Checklist

When adding or modifying visual widget fields (e.g. colors, border_radius, cta_text, image_aspect, show_price, widget_title, etc.), **ALL of these files must be updated in sync**:

### Backend
- [ ] `server/apps/ecommerce/models.py` — RecommendationSettings model columns
- [ ] `server/apps/ecommerce/schemas/recommendation_settings_schemas.py` — Create, Update, Detail schemas
- [ ] `server/apps/ecommerce/subrouters/components_subrouter.py` — `VISUAL_DEFAULTS` + `_URL_TO_DB_MAP` + `apply_visual_defaults()`
- [ ] `server/apps/ecommerce/subrouters/components_subrouter.py` — 4 standalone endpoints
- [ ] `server/apps/ecommerce/subrouters/widget_subrouter.py` — 4 public widget endpoints
- [ ] `server/apps/ecommerce/subrouters/shopify_embedded_subrouter.py` — 4 embedded component endpoints + PUT settings create block
- [ ] `server/apps/ecommerce/subrouters/shopify_app_proxy_subrouter.py` — 4 app proxy endpoints
- [ ] `server/apps/ecommerce/subrouters/recommendation_settings_subrouter.py` — create block
- [ ] `server/apps/ecommerce/engine/engine.py` — `generate_recommendation_html()` if new params affect rendering

### Frontend — Standalone Dashboard
- [ ] `client/src/modules/ecommerce/schemas/recommendation-settings.schemas.ts` — both schemas
- [ ] `client/src/app/(ecommerce)/(standalone)/settings/page.tsx` — state, populate, save payload, UI
- [ ] `client/src/app/(ecommerce)/(standalone)/components/page.tsx` — state, generate params, save brand defaults

### Frontend — Shopify Embedded
- [ ] `client/src/modules/ecommerce/service/shopify-embedded.service.ts` — EmbeddedSettingsDetail + EmbeddedSettingsPayload
- [ ] `client/src/app/(ecommerce)/(embedded)/shopify/settings/page.tsx` — state, populate, save payload, UI
- [ ] `client/src/app/(ecommerce)/(embedded)/shopify/components/page.tsx` — state, generate params, save brand defaults

### Frontend — Shopify Theme Extension
- [ ] `client/extensions/nudgio-widget/blocks/nudgio-recommendations.liquid` — schema settings + URL params

### Frontend — WordPress Plugin
- [ ] `client/plugins/wordpress/nudgio/blocks/recommendations/block.json` — block attributes
- [ ] `client/plugins/wordpress/nudgio/blocks/recommendations/index.js` — Gutenberg editor controls
- [ ] `client/plugins/wordpress/nudgio/blocks/recommendations/render.php` — block-to-shortcode mapping
- [ ] `client/plugins/wordpress/nudgio/includes/class-nudgio-shortcode.php` — shortcode_atts + signed params

### Frontend — Custom Integration (widget.js)
- [ ] `server/apps/ecommerce/static/widget.js` — DEFAULTS + ATTR_MAP
- [ ] `client/src/modules/ecommerce/hooks/use-components.ts` — EMBED_DEFAULTS + generateEmbedCode

---

## Lessons Learned / Gotchas (From Official Docs)

### Shopify
- **HMAC encoding differs by context**: OAuth callback = **hex** digest. Webhooks / GDPR = **Base64** digest. App Proxy = **hex** but with decoded values, no separator join, duplicate keys joined with comma. Three different HMAC verification implementations.
- **REST API deprecated for new public apps** (April 2025): Must use **GraphQL Admin API** exclusively. OAuth endpoints (`/admin/oauth/authorize`, `/admin/oauth/access_token`) are NOT affected.
- **GraphQL rate limits are points-based**: Standard 100 pts/sec (1,000 bucket), Plus 1,000 pts/sec. Different from REST leaky bucket (40 requests, 2/sec leak).
- **Use non-expiring offline tokens**: Don't opt into expiring tokens (`expiring=1`) — it's **irreversible per shop** and adds unnecessary complexity. Non-expiring is the default.
- **Verify granted scopes after token exchange**: Merchant could have modified scope during authorization. Compare `response.scope` with what you requested.
- **Session tokens expire in 1 minute**: Shopify JWT (HS256, signed with CLIENT_SECRET). Token Exchange API converts session token to offline access token.
- **`id_token` not `id-token`**: The Token Exchange grant type parameter uses underscore, not hyphen.

### WooCommerce
- **Auto-auth callback uses raw JSON body**: `callback_url` receives POST with JSON — use raw body parsing, NOT form parsing.
- **No built-in rate limiting**: Hosting provider may impose limits. Recommend max 5 req/sec.
- **Max `per_page` is 100**: Pagination via `X-WP-TotalPages` header.
- **Some stores use custom permalink structure**: If `/wp-json/` doesn't work, try `/?rest_route=/wc/v3`.

### Magento
- **2.4.4+ Bearer token breaking change**: Integration tokens disabled as standalone Bearer tokens by default. Merchant must enable: Stores > Configuration > Services > OAuth → "Allow OAuth Access Tokens to be used as standalone Bearer tokens" → Yes. Error when disabled: `"The consumer isn't authorized to access %resources."`.
- **Single product lookup uses SKU, not numeric ID**: `GET /rest/default/V1/products/{sku}`.
- **searchCriteria filter logic**: Filter groups are AND'd together. Filters within a group are OR'd.
- **No built-in rate limiting**: Recommend max 5 req/sec. `input_limit` defaults: max 20 items per bulk PUT/POST.
- **`default` in URL = default store view**: Can be replaced with specific store code (e.g., `rest/us_en/V1`).

### WooCommerce Data Flow
- **Two data paths for WooCommerce**: (1) WooCommerce API connection (`connection_method="api"`) → `WooCommerceApiAdapter` queries store REST API **live** on every widget request — no ingested data needed, bestsellers/cross-sell/upsell/similar all work immediately. (2) WooCommerce plugin push sync → pushes data to `ingested_products`/`ingested_orders`/`ingested_order_items` via `woocommerce_sync_subrouter.py`. After first successful sync, the adapter factory automatically switches to `IngestAdapter` (local PostgreSQL reads) for all widget/recommendation requests — reducing latency vs. live REST API calls.
- **Plugin auto-sync triggers**: WP-Cron every 6 hours + real-time hooks on product/order changes + manual "Sync Data" button. First sync after credential entry requires manual button click (cron first run is up to 6 hours away).

### General
- **Nudgio server has NO `/api/v1/` prefix**: Routes are directly at `/ecommerce/...`. Never add `/api/v1/` to billing callbacks, webhook URIs, auth redirects, app proxy, etc.
- **No PG enums in DB**: Use `String(50)` columns, Python `(str, Enum)` in schemas only, `.value` when writing to DB.
- **Engine `image_url` mapping**: Shopify returns `image_url` (string), WooCommerce returns `images` (list). Engine handles both.
- **Liquid template URL encoding**: Color values must be encoded separately before appending to URL. Encoding the full query string would triple-encode `?`, `&`, `=`.
- **Extensions deploy to Shopify CDN** via `shopify app deploy`, NOT to Coolify. Coolify ignores `extensions/` entirely.

---

## ✅ Done

### Repo Setup & Infrastructure
- ✅ Create nudgio repo (copied server + client skeleton from nexotype)
- ✅ Server config: main.py, config.py, manage.py updated for nudgio (port 8002/3002)
- ✅ Database: Coolify PostgreSQL configured (port 6035 public, 5432 internal)
- ✅ .env and .env.production with real DB credentials
- ✅ Initial migration created and applied (11 tables: 7 accounts + 4 ecommerce)
- ✅ Client ecommerce route group: `(ecommerce)` layout, page, sidebar, breadcrumb, providers
- ✅ Organization pages copied under `(ecommerce)/organizations/` (list, new, details, subscription)
- ✅ Nexotype routes disabled: `(nexotype)` → `_nexotype`

### Branding
- ✅ Branding rename: nexotype → nudgio (proxy.ts, token.client.utils.ts, token.server.utils.ts, auth.server.store.ts, root layout.tsx)
- ✅ Nudgio brand colors selected: `#17FFFD` → `#2631f7` (cyan → blue)
- ✅ Nudgio logo created (SVG, dark + light variants)
- ✅ Logo wired into login-signup.tsx, app-sidebar.tsx, ecommerce-sidebar.tsx
- ✅ Favicon added

### Build & Deployment
- ✅ Frontend build passing (recharts, chart component, ts-expect-error fixed)
- ✅ Coolify: Nudgio Server + Client apps created (sslip.io URLs)
- ✅ Coolify: PostgreSQL running with backups
- ✅ Pushed to GitHub

### Ecommerce Backend (Phases A–F)
- ✅ Models: `EcommerceConnection` with `connection_method` (api/database), `store_url`, `api_key`, `api_secret`, `db_*` fields nullable
- ✅ `BaseMixin` on `EcommerceConnection` + `RecommendationSettings` (timestamps, soft delete, user audit)
- ✅ Migration applied (`91d861a1bea9` + BaseMixin migration)
- ✅ All schemas rewritten with `Field(description="...")` — nexotype patterns
- ✅ All subrouters rewritten — section headers, docstrings, two-tier except, soft delete
- ✅ Adapter factory (`adapters/factory.py`) — routes by platform + connection_method
- ✅ Shopify API adapter (`adapters/shopify/api.py`) — GraphQL Admin API (migrated from REST)
- ✅ WooCommerce API adapter (`adapters/woocommerce/api.py`) — REST API v3, HTTP Basic Auth
- ✅ WooCommerce DB adapter (`adapters/woocommerce/database.py`) — direct MySQL
- ✅ Magento API adapter (`adapters/magento/api.py`) — Bearer token, 2.4.4+ error detection
- ✅ Magento DB adapter (`adapters/magento/database.py`) — direct MySQL, EAV
- ✅ Shopify OAuth subrouter (`/shopify/auth` + `/shopify/callback`)
- ✅ WooCommerce auto-auth subrouter (`/woocommerce/auth` + `/woocommerce/callback`)
- ✅ Env vars for Shopify OAuth (config.py, .env, .env.production, .env.example)

### Ecommerce Utils
- ✅ `dependency_utils.py` — `get_user_connection()`, `get_active_connection()`, `require_active_subscription`, `get_user_organization_id()`
- ✅ `subscription_utils.py` — tier constants (FREE/PRO/ENTERPRISE), tier limits, grace period, query + logic helpers
- ✅ `cache_utils.py` — ABC + `InMemoryCacheBackend` + `DragonflyCacheBackend`
- ✅ `encryption_utils.py` — Fernet symmetric encryption for credentials
- ✅ `rate_limiting_utils.py` — ABC + `InMemoryRateLimitBackend` + `DragonflyRateLimitBackend`

### Ecommerce Router
- ✅ Router split: ungated (OAuth/auth callbacks) + gated (everything else with `require_active_subscription`)
- ✅ 7 subrouters, 28 routes total
- ✅ Connection limit check on create
- ✅ Credential encryption on create/update, decryption in adapter factory
- ✅ Cache wired into recommendation + component subrouters
- ✅ Rate limiting wired into router
- ✅ Monthly order limit enforcement wired

### Ecommerce Frontend (Phase G)
- ✅ All frontend files renamed to mirror backend model names (21 files via `git mv`)
- ✅ All imports updated across 22+ files
- ✅ `ecommerce-connections.schema.ts` — `connectionMethodEnum`, new fields
- ✅ `api.endpoints.ts` — Shopify OAuth + WooCommerce auth endpoints
- ✅ `ecommerce-connections.service.ts` — `initiateShopifyOAuth()` + `initiateWooCommerceAuth()`
- ✅ `recommendation-settings.schema.ts` — rewritten to match backend
- ✅ `recommendations.schema.ts` — `total` → `count`
- ✅ `connections/new/page.tsx` — different fields per platform + connection method
- ✅ `connections/[id]/page.tsx` — method badge, store_url for API, eye toggle on credentials
- ✅ `connections/page.tsx` — OAuth/auth success redirects, method badge
- ✅ `settings/page.tsx` — correct field names
- ✅ `recommendations/page.tsx` — `result.count`
- ✅ `recommendations/page.tsx` — product dropdown (replaced raw text Input with Select, fetches from `GET /data/products/{connection_id}`, same pattern as standalone Components page)
- ✅ `data-provider.tsx` — removed auto-fetch (was causing 404s)
- ✅ `recommendation-settings-provider.tsx` — removed auto-fetch (was causing 404s)
- ✅ `ConnectionProvider` `initialFetch={true}` (connections load on all pages)

### Backend Improvements
- ✅ Propagate HTTP status codes in adapter error messages
- ✅ Data endpoints — `data_subrouter.py` fetches products/orders/stats live from store APIs
- ✅ Efficient adapter count methods — `get_product_count()` + `get_order_count()` on all 5 adapters
- ✅ Removed `order_items_count` from stats
- ✅ Settings endpoint returns defaults when no record exists (no more 404)
- ✅ `pool_pre_ping=True` on DB engine
- ✅ Frontend service envelope unwrapping bug fixed
- ✅ Widget parameters (lookback_days, method, min_price_increase) passed through to engine
- ✅ Product images in widget HTML (from adapter data, not placeholders)
- ✅ Token Exchange typo fix — `id-token` → `id_token` in `shopify_session_utils.py` (was preventing offline access token exchange)
- ✅ GraphQL error parsing — robust normalization (str/dict/list) in `shopify/api.py`, `shopify_session_utils.py`, `shopify_billing_utils.py`
- ✅ Engine image_url mapping — Shopify returns `image_url` (string), WooCommerce returns `images` (list); engine now handles both
- ✅ Removed `/api/v1/` prefix from all server URLs — billing callbacks, webhook URIs, auth redirects, app proxy, `.env.example`
- ✅ App Proxy HMAC verification — rewritten to match Shopify docs (decoded values, no separator join, duplicate keys with comma)
- ✅ Liquid template URL encoding — color values encoded separately before append (was triple-encoding entire query string)

### Stripe / Billing
- ✅ Stripe sandbox configured (separate from nexotype + finpy)
- ✅ Pro + Enterprise products created in Stripe Dashboard with metadata
- ✅ Stripe Customer Portal configured (plan switching, cancellations)
- ✅ Production webhook endpoint (`https://server.nudgio.tech/accounts/subscriptions/webhook`)
- ✅ `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` set in Coolify env vars
- ✅ Tested: Pro subscription via Stripe Checkout → webhook → DB record

### Landing Page (Website)
- ✅ Next.js 16 app at `/website` — deployed to Vercel (`www.nudgio.tech`)
- ✅ DNS configured: `@` → Vercel, `www` → Vercel, `server/client/wp` → Coolify
- ✅ All branding updated (logos, metadata, colors, SEO)
- ✅ HeroSectionAnimated — "Unparalleled. Commerce. Solutions."
- ✅ Features component — 8 feature cards with lucide icons, Nudgio gradient on hover
- ✅ HowItWorks component — 4 steps with gradient connecting line
- ✅ ContactSection — address updated, cyan-500 colors
- ✅ Contact form API route — nodemailer + Gmail
- ✅ Blog page with 2 Nudgio articles (SimpleSection cards, no external images)
- ✅ Footer — "© 2025 Buraro Technologies", LinkedIn/GitHub/Email
- ✅ Navbar — Features, Blog, Contact

---

## ❌ To Do

### 1. Production DragonflyDB (⏸️ On Hold)
- ❌ Provision DragonflyDB in Coolify
- ❌ Switch `CACHE_BACKEND` and `RATE_LIMIT_BACKEND` to `"dragonfly"`
- ❌ Configure `DRAGONFLY_URL` env var

### 2. Shopify App Store Submission Blockers
- ✅ GDPR webhooks — 3 mandatory compliance endpoints (`customers/data_request`, `customers/redact`, `shop/redact`) with HMAC-SHA256 verification (Base64)
- ✅ GraphQL migration — `ShopifyAdapter` rewritten from REST to GraphQL Admin API (2026-01), config-driven version, cursor pagination, N+1 eliminated
- ✅ Shopify Billing API — Shopify Billing API integrated (ShopifyBilling model, subscribe/callback/cancel/status endpoints, webhook handler, subscription integration with grace period + multi-store entitlement)
- ✅ Register app in Shopify Partner Dashboard — app registered, Client ID + Client Secret obtained, redirect URLs configured, OAuth flow tested with dev store
- ✅ `shopify.app.toml` configuration — scopes, redirect URLs, webhooks, compliance topics, all routed through dispatcher endpoint

### 3. Shopify Embedded App UI
- ✅ App Bridge integration — CDN-loaded App Bridge + Polaris web components, session token auth (JWT HS256), Token Exchange API for offline access tokens
- ✅ Embedded dashboard pages — 5 pages: dashboard, settings, recommendations, components (preview only), billing. 16 embedded endpoints (53 total routes). Polaris web components (`s-page`, `s-section`, `s-box`, `s-stack`, etc.)
- ✅ Handle session tokens from Shopify App Bridge — `shopify.idToken()` → Bearer token → `verify_shopify_session_token` → `get_shopify_connection` dependency
- ✅ Security hardening — embedded gating (subscription + rate limit + monthly order limit via `EmbeddedOrgContext`), `scalars().first()` fix for multi-org users
- ✅ Navigation & UI polish — `<s-app-nav>` sidebar navigation, Shop URLs removed from Settings, button group fix, top spacers, nav icon SVG
- ✅ Storefront widget delivery (Stage 3):
  - ✅ **App Proxy backend endpoint** — `shopify_app_proxy_subrouter.py` with HMAC-SHA256 hex verification, 4 widget endpoints (bestsellers, cross-sell, upsell, similar), entitlement check via `is_service_active()`, all responses HTMLResponse (renders in storefront iframe)
  - ✅ **App Proxy config in `shopify.app.toml`** — `[app_proxy]` section: url, prefix="apps", subpath="nudgio-widget". Storefront URL: `https://shop.myshopify.com/apps/nudgio-widget/{type}`
  - ✅ **Theme App Extension** — `extensions/nudgio-widget/`: Liquid app block with iframe + `{% schema %}` settings (widget type, count, style, colors), iframe auto-resize JS. Deployed to Shopify CDN (not Coolify).
  - ✅ **Deploy extension** — deployed via `shopify app deploy`
  - ✅ **Update Components page** — info banner updated with actual storefront instructions
  - ✅ **Bottom spacers** — `<s-box paddingBlockEnd="base" />` added to all 5 embedded pages
- ✅ Components page product dropdown — replaced raw Product ID text field with `<s-select>` dropdown that fetches products from `GET /shopify/embedded/products` (ungated). Info banner explains storefront auto-detects product via Theme Editor.
- ✅ Liquid template guard — if widget type requires product but `product` object is nil (non-product page), renders friendly HTML message instead of iframe request. Defense-in-depth alongside backend app proxy guard.
- ✅ Responsive `columns` + `size` params (full stack) — replaced `device`-based layout with responsive grid (`columns` 2–6, default 4: 1→2→N cascade) + density control (`size` compact/default/spacious: 13-property SIZE_MAP). `device` kept as first-class API param (not deprecated), hidden from UI. `list` style removed. 17 files across server (4 subrouters), WordPress plugin (7 files: shortcode, block.json, index.js, render.php, activation, settings, docs), Shopify extension (Liquid schema), Next.js client (5 files: Zod schema, 2 services, 2 component pages). Server-side validation: clamp columns 2–6, size fallback to "default". HMAC unchanged.
- ✅ Managed Pricing billing page — billing page rewritten for Shopify Managed Pricing. Shows current plan + plan comparison + "Manage Plan on Shopify" button that opens `https://admin.shopify.com/store/{storeHandle}/charges/nudgio/pricing_plans`. Subscribe/cancel endpoints and service functions kept with comments for manual pricing revert. Partner Dashboard → Distribution → Manage listing → Pricing content → Settings → "Managed pricing" selected.
- ✅ Documentation page — static Polaris page (5 sections: Adding Widget to Storefront, Widget Types, Settings vs Theme Editor, Components Preview, Visual Customization). `<s-link>` added to `<s-app-nav>` (before Billing). No API calls, no backend changes.

### 4. Shopify App Store Submission (⏳ Waiting on Automated Checks)
- ⏳ Automated embedded app checks — auto-checked every 2 hours. **BLOCKER**: "Using latest App Bridge CDN" + "Using session tokens for auth" not yet passing. Must log in and interact with app on dev store to generate session data.
- ✅ App listing: description, screenshots, demo video
- ❌ Submit for Shopify review (2-4 week review process) — blocked by automated checks above

### 5. Legal Pages ✅
- ✅ Privacy policy — `/legal/privacy-policy` (GDPR/CCPA, store data, credentials, Stripe)
- ✅ Terms of service — `/legal/terms-of-service` (SaaS terms, subscriptions, liability, Romanian jurisdiction)

### 6. Public Widget API (HMAC-Signed URL Auth) ✅
- ✅ `WidgetAPIKey` model — Fernet-encrypted secret, connection_id, api_key_prefix, name, allowed_domains, is_active
- ✅ Public widget endpoints — `widget_subrouter.py` (ungated, HMAC signed URL auth), 4 endpoints: `/widget/bestsellers`, `/widget/cross-sell`, `/widget/upsell`, `/widget/similar`, all HTMLResponse
- ✅ `widget_auth_utils.py` — HMAC-SHA256 verification (canonical query, URL-encoded, sorted), timestamp expiry, domain restriction, dedicated rate limiting
- ✅ `widget_api_key_subrouter.py` — JWT-gated CRUD (generate/list/delete), plaintext secret shown once
- ✅ API key management UI in dashboard — "API Keys" 3rd tab on connection detail page (hidden for Shopify)
- ✅ Components page "Copy Snippet" — generates `<div>` + `<script>` snippet with API key + widget.js loader

### 7. WooCommerce WordPress Plugin ✅
- ✅ WordPress plugin at `client/plugins/wordpress/nudgio/` — iframe-based rendering (HMAC-signed URLs, same pattern as Shopify)
- ✅ `[nudgio]` shortcode — signed iframe URLs, auto-resize JS, auto-detects product ID on WooCommerce product pages
- ✅ WP Admin settings page — Key ID, encrypted API Secret, Server URL, default widget settings, Test Connection
- ✅ WooCommerce feature compatibility, `uninstall.php`, GPL-2.0-or-later
- ✅ Verified working on `wp.nudgio.tech`
- ✅ Gutenberg block — `nudgio/recommendations` block with Columns RangeControl (2–6) + Size SelectControl (compact/default/spacious), live preview placeholder, block.json + index.js + render.php
- ✅ Rename plugin directory
- ✅ Submit to WordPress Plugin Directory
- ✅ **WooCommerce Auto-Sync (Plugin Push via HMAC)** — v1.3.0:
  - ✅ Server: `woocommerce_sync_subrouter.py` — 3 POST endpoints (`/woocommerce-sync/products`, `/orders`, `/order-items`), HMAC-SHA256 body signing auth via headers (`X-Nudgio-Key-Id`, `X-Nudgio-Timestamp`, `X-Nudgio-Nonce`, `X-Nudgio-Signature`), connection_id derived from API key, reuses existing `upsert_products()`/`upsert_orders()`/`upsert_order_items()` from `sync_utils.py`, batch limit 5000
  - ✅ Server: `verify_woocommerce_sync_signature()` in `widget_auth_utils.py` — same security model as widget HMAC but for POST body (headers instead of query params)
  - ✅ Server: `image_url` field added to `ProductData` schema (was missing — WooCommerce sends product images)
  - ✅ Server: `woocommerce_sync_router` mounted on ungated router in `router.py`
  - ✅ Plugin: `class-nudgio-sync.php` — `sync_all()`, `sync_products()`, `sync_orders()`, `sync_order_items()`, `sync_single_product()`, `sync_single_order()`, `sign_and_post()`. Batches in chunks of 500. WooCommerce field mapping (get_id, get_name, get_slug, get_type, get_sku, get_price, get_image_id, get_stock_quantity, get_status, get_total, get_customer_id, get_items, get_variation_id, get_quantity, get_date_created)
  - ✅ Plugin: "Sync Data" button on Settings page with AJAX handler + last sync status display (`nudgio_last_sync_at`, `nudgio_last_sync_status`, `nudgio_last_sync_message` in wp_options)
  - ✅ Plugin: WP-Cron scheduled sync every 6 hours (`nudgio_cron_sync`)
  - ✅ Plugin: Real-time WooCommerce hooks — `woocommerce_update_product` + `woocommerce_new_product` → single product sync (10s delay), `woocommerce_order_status_changed` (completed/processing) → single order + items sync (10s delay)
  - ✅ Plugin: Deactivation cleanup — clears all cron events (`nudgio_cron_sync`, `nudgio_sync_single_product`, `nudgio_sync_single_order`)
  - ✅ Plugin: Version bump to 1.3.0 (header, constant, readme.txt, changelog, upgrade notice)

### 8. Custom Integration Platform + Data Sync Tab ✅
- ✅ `CUSTOM_INTEGRATION` added to `PlatformType` enum (backend + frontend)
- ✅ Create connection form — "Custom Integration" platform option, ingest-only form (connection name + info banner, no credentials)
- ✅ Connection detail page — Data Sync moved from Settings to own top-level tab (hidden for ingest connections)
- ✅ Tab layout: Shopify API → 3 tabs (Overview, Data Sync, Settings), WooCommerce/Magento → 4 tabs (+API Keys), Custom Integration ingest → 3 tabs (Overview, Settings, API Keys — no Data Sync)
- ✅ Settings tab for ingest connections — only connection_name editable + Danger Zone (no credential fields)
- ✅ `format-utils.ts` — `getPlatformLabel()` + `getConnectionMethodLabel()` mappers (no snake_case in UI)
- ✅ Push API Integration Guide — card in API Keys tab for ingest connections (Connection ID with copy-to-clipboard, endpoints, auth method, example request)
- ✅ Connections list page — proper platform/method labels, "Data: Push API" for ingest cards

### 9. Data Ingestion + Local Storage (V3 Architecture) ✅
**Goal:** Store product/order data locally so engine reads from DB, not live API calls. Enables custom sites + faster reads for all platforms.

#### Step 1 — Push API + IngestAdapter ✅
- ✅ Models: `IngestedProduct`, `IngestedOrder`, `IngestedOrderItem` — local storage tables per connection_id, unique constraints for upsert
- ✅ Migration for 3 new tables (applied)
- ✅ Import endpoints persist via upsert — `POST /data/import/{products,orders,order-items}` in `data_subrouter.py` using shared upsert helpers from `sync_utils.py`
- ✅ `IngestAdapter` — reads from ingested tables, same interface as ShopifyAdapter/WooCommerceApiAdapter
- ✅ Factory updated — `get_adapter(connection, db)` with optional `db` param, routes `connection_method="ingest"` to IngestAdapter
- ✅ `"ingest"` added to `ConnectionMethod` enum

#### Step 2 — Auto-Sync ✅
- ✅ `sync_utils.py` — shared upsert helpers + `sync_connection_data()` orchestration + ghost row pruning + sync metadata (`last_synced_at`, `last_sync_status`, `next_sync_at`)
- ✅ `POST /data/sync/{connection_id}` — triggers full sync via platform adapter → ingested tables
- ✅ Periodic sync scheduler — `sync_scheduler.py`: asyncio background loop in FastAPI lifespan, checks every 5 min, `FOR UPDATE SKIP LOCKED`, skips ingest connections
- ✅ Sync settings per connection — 5 fields on `EcommerceConnection` (`auto_sync_enabled`, `sync_interval`, `last_synced_at`, `next_sync_at`, `last_sync_status`), `SyncInterval` enum, PATCH computes `next_sync_at`
- ✅ FastAPI lifespan — scheduler start/stop in `main.py`
- ✅ Frontend Data Sync card — Switch toggle, interval Select, status info, Sync Now button

#### Step 3 — Granular Sync Filters (future)
- ❌ Filter by category, price range, date range, product tags
- ❌ Selective sync (specific products/categories only)

### 9. Universal JS Widget Snippet (For Non-WordPress/Non-Shopify Sites) ✅
- ✅ `widget.js` loader — IIFE in `apps/ecommerce/static/widget.js`, finds `.nudgio-widget` divs, reads `data-*` attributes, XHR to `/ecommerce/widget/sign`, creates iframe with auto-resize + MutationObserver for SPA support
- ✅ `widget_sign_subrouter.py` — `GET /ecommerce/widget/sign` endpoint, server-side HMAC URL signing (CORS `*`, rate limited, domain check, secret never in JS)
- ✅ Product support via `data-product-id` attribute
- ✅ Components page "Copy Snippet" — `generateEmbedCode()` outputs `<div>` + `<script>` snippet using API key, only non-default data attributes included
- ✅ For custom sites, Squarespace, Wix, etc. — any site that can paste a `<script>` tag

### 10. Magento Adobe Commerce Extension 🚫 Abandoned
- 🚫 Magento 2 extension for Adobe Commerce Marketplace — too much work for too little market. Will not be implemented.

### 10. Widget Settings Enhancement (5 New Configurable Fields) ✅
- ✅ 5 new settings: `widget_title` (text, auto-default per type), `cta_text` (text, "View"), `show_price` (boolean, true), `border_radius` (text, "8px"), `image_aspect` (select: square/portrait/landscape)
- ✅ Server HTML generator (`components_subrouter.py`) — `IMAGE_ASPECT_MAP`, updated `generate_recommendation_html()`, `generate_grid_cards()`, `generate_carousel_cards()` with cta_text, show_price, aspect_class
- ✅ Standalone component endpoints (`components_subrouter.py`) — 4 endpoints accept + pass new params
- ✅ Shopify App Proxy endpoints (`shopify_app_proxy_subrouter.py`) — 4 endpoints accept + pass new params
- ✅ Shopify Theme Extension (`nudgio-recommendations.liquid`) — 5 new `{% schema %}` settings + URL params (separate variable encoding)
- ✅ WordPress plugin — settings (`class-nudgio-settings.php`), shortcode (`class-nudgio-shortcode.php`), block.json, settings page
- ✅ Shopify Embedded endpoints (`shopify_embedded_subrouter.py`) — 4 endpoints accept + pass new params
- ✅ Public Widget endpoints (`widget_subrouter.py`) — 4 endpoints accept + pass new params
- ✅ Widget Sign endpoint (`widget_sign_subrouter.py`) — new params in HMAC-signed dict
- ✅ Universal `widget.js` — DEFAULTS + ATTR_MAP updated with new data-attributes
- ✅ Frontend schemas/services — `components.schemas.ts`, `components.service.ts`, `shopify-embedded.service.ts` updated
- ✅ Frontend hooks — `use-components.ts` EMBED_DEFAULTS + generateEmbedCode updated
- ✅ Frontend UI pages — both Components pages (Shopify embedded + standalone) have controls for new settings
- ✅ Shopify Recommendations page — replaced button-group with s-select (onClick doesn't fire in Polaris web components)

### 11. Brand Identity Defaults (Visual Fields in RecommendationSettings)
- ✅ 11 nullable visual columns added to `RecommendationSettings` model: `widget_style`, `widget_columns`, `widget_size`, `primary_color`, `text_color`, `bg_color`, `border_radius`, `cta_text`, `show_price`, `image_aspect`, `widget_title`
- ✅ Backend schemas updated: `RecommendationSettingsCreate`, `RecommendationSettingsUpdate`, `RecommendationSettingsDetail`
- ✅ `apply_visual_defaults()` fallback helper in `components_subrouter.py` — fallback chain: URL param (explicit) → DB brand defaults → hardcoded defaults
- ✅ Applied in 4 subrouters (16 endpoints): `components_subrouter`, `widget_subrouter`, `shopify_embedded_subrouter`, `shopify_app_proxy_subrouter`
- ✅ Frontend schema (`recommendation-settings.schemas.ts`) — 11 fields in both `RecommendationSettingsSchema` and `CreateOrUpdateSettingsSchema`
- ✅ "Save as Brand Defaults" button on standalone Components page (`createOrUpdateSettings`)
- ✅ "Save as Brand Defaults" button on Shopify Components page (`updateSettings`)
- ✅ `EmbeddedSettingsPayload` + `EmbeddedSettingsDetail` updated in `shopify-embedded.service.ts`
- ✅ Both settings create blocks (`recommendation_settings_subrouter` + `shopify_embedded_subrouter`) include 11 new fields
- ⚠️ **Migration not included** — user creates migration manually

### 12. Widget Configuration Overhaul (35 Settings, 8 Groups) ✅
- ✅ Replaced 11 limited visual settings with 35 individually configurable settings across 8 groups (Widget Container, Widget Title, Layout, Product Card, Product Image, Product Title, Price, CTA Button)
- ✅ DROP 6 columns (`widget_size`, `primary_color`, `text_color`, `bg_color`, `border_radius`, `cta_text`), ADD 29 new, KEEP 5
- ✅ Full stack: models, schemas, `components_subrouter.py` (VISUAL_DEFAULTS + `_URL_TO_DB_MAP` + `apply_visual_defaults()`), 4 subrouters, Liquid template, frontend types/services/UI
- ✅ WordPress plugin updated — 35 shortcode attributes, 10 Gutenberg editor panels, admin settings page with 8 groups
- ✅ Shopify Theme Extension — 35 `{% schema %}` settings with separate color URL-encoding
- ✅ widget.js — DEFAULTS + ATTR_MAP updated with all 35 data-* attributes

### 13. Documentation Pages (Standalone + Shopify Embedded) ✅
- ✅ Standalone documentation page — `(standalone)/documentation/page.tsx`, 7 Card sections: Quick Start, Push API (3 endpoints with full curl examples), Widget API Keys, Embedding on Custom Sites (snippet + 35 data-* attributes), WordPress Plugin (Gutenberg block + shortcode), Widget Types, Visual Settings (8 groups). BookOpen icon + sidebar link after Analytics.
- ✅ Shopify embedded documentation page — `(embedded)/shopify/documentation/page.tsx`, 5 Polaris sections with merchant-friendly language: Adding Widget (Theme Editor steps), Widget Types, Settings vs Theme Editor (hierarchy explanation), Components Preview, Visual Customization (8 groups). `<s-link>` in `<s-app-nav>` before Billing.
- ✅ All data-* attribute values verified against backend schemas (title_alignment, product_title_alignment, card_padding, gap, price_size corrected)

### 14. Nice to Have
- ✅ Frontend subscription page — DONE (Shopify: Managed Pricing billing page with plan display + Shopify upgrade redirect; Standalone: Stripe via accounts module)

---

## Priority List (What to Work on Next)

### 🔴 High Priority — Required for Launch
1. ✅ **Shopify Partner Dashboard registration** — app registered, Client ID + Client Secret obtained, OAuth flow tested with dev store.
2. ✅ **GDPR webhooks** — DONE. 3 compliance endpoints with HMAC-SHA256 verification.
3. ✅ **GraphQL migration** — DONE. `ShopifyAdapter` rewritten to GraphQL Admin API (2026-01).
4. ✅ **Shopify Billing API** — DONE. ShopifyBilling model, 4 billing endpoints, webhook handler, OrgContext integration.
5. ✅ **`shopify.app.toml` configuration** — DONE. Dispatcher endpoint, app/uninstalled handler, all topics configured.

### 🟡 Medium Priority — Required for Shopify App Store
6. ✅ **Shopify App Bridge integration** — DONE. CDN-loaded App Bridge + Polaris, session token auth, Token Exchange API, auto-provisioning.
7. ✅ **Embedded dashboard pages** — DONE. 5 pages (dashboard, settings, recommendations, components, billing). 16 embedded endpoints. Security gating.
7b. ✅ **Storefront widget delivery (Stage 3)** — DONE. App Proxy subrouter (4 endpoints, HMAC hex verification per Shopify docs — decoded values, no separator join, duplicate keys with comma), `[app_proxy]` in `shopify.app.toml`, Theme App Extension (Liquid block + iframe auto-resize JS), deployed via `shopify app deploy`, Components page updated with storefront instructions. Verified working in Theme Editor with product images.
7c. ✅ **Components product dropdown + guards** — DONE. Product dropdown (fetches from `GET /products`, ungated), Liquid guard for non-product pages, app proxy guard for missing product_id.
7d. ✅ **Managed Pricing billing** — DONE. Billing page shows current plan + "Manage Plan on Shopify" button (opens Shopify-hosted pricing page). Subscribe/cancel code kept for manual pricing revert. Managed Pricing configured in Partner Dashboard.
8. **App Store submission** — ⏳ listing done (description, screenshots, demo video). Blocked by automated embedded app checks (App Bridge CDN + session tokens). Submit for review after checks pass.

### 🟢 Low Priority — Future Expansions
9. **Production DragonflyDB** — provision in Coolify, switch cache + rate limit backends (⏸️ on hold).
10. ✅ **Public Widget API** — DONE. `WidgetAPIKey` model (Fernet-encrypted), HMAC-signed URL auth, 4 public widget endpoints, key management UI (3rd tab), dedicated rate limiting. 66 routes total.
11. ✅ **WooCommerce WordPress Plugin** — DONE. R1: `[nudgio]` shortcode + WP Admin settings page + iframe rendering + HMAC signing + Test Connection. R2 (v1.3.0): Auto-Sync via HMAC body signing — `woocommerce_sync_subrouter.py` (3 POST endpoints), `class-nudgio-sync.php` (full sync + single product/order sync), WP-Cron every 6h, real-time WooCommerce hooks, "Sync Data" button + status display. Verified on `wp.nudgio.tech`.
12. ✅ **Custom Integration Platform + Data Sync Tab** — DONE. `CUSTOM_INTEGRATION` enum, ingest-only create form, Data Sync as own tab (hidden for ingest), `format-utils.ts` label mappers, Push API Integration Guide in API Keys tab.
13. ✅ **Data Ingestion + Local Storage (V3)** — DONE. 3 ingested tables + migration + IngestAdapter + factory routing + shared upsert helpers + `sync_connection_data()` with ghost row pruning + periodic sync scheduler (asyncio loop, `SKIP LOCKED`, lifespan) + per-connection sync settings (5 fields, SyncInterval enum, PATCH logic) + frontend Data Sync card (toggle, interval, status, Sync Now).
14. ✅ **Universal JS Widget Snippet** — DONE. `widget.js` loader (IIFE, XHR, iframe, MutationObserver) + `widget_sign_subrouter.py` (HMAC signing, CORS) + Components page "Copy Snippet" (`generateEmbedCode()`).
15. 🚫 **Magento Adobe Commerce Extension** — ABANDONED. Too much work for too little market.
16. ✅ **Frontend subscription page** — DONE. Shopify: Managed Pricing page. Standalone: Stripe via accounts module.
17. ✅ **Widget Settings Enhancement** — DONE. 5 new configurable fields (widget_title, cta_text, show_price, border_radius, image_aspect) propagated across all delivery paths: server HTML generator, 4 subrouters (standalone, app proxy, embedded, public widget), sign endpoint, Shopify Liquid, WordPress plugin, widget.js, frontend schemas/services/hooks, both Components UI pages. Shopify Recommendations page type picker fixed (s-select instead of s-button-group).
18. ✅ **Brand Identity Defaults** — DONE. 11 nullable visual columns on `RecommendationSettings` (widget_style, widget_columns, widget_size, primary_color, text_color, bg_color, border_radius, cta_text, show_price, image_aspect, widget_title). Fallback chain: URL param → DB brand defaults → hardcoded. `apply_visual_defaults()` helper applied in 16 endpoints across 4 subrouters. "Save as Brand Defaults" button on both Components pages. Frontend schemas + Shopify embedded service updated. Migration by user.
19. ✅ **Widget Configuration Overhaul (35 Settings)** — DONE. Replaced 11 limited settings with 35 in 8 groups. Full stack: models, schemas, 4 subrouters, Liquid, WordPress plugin (35 shortcode attrs + 10 Gutenberg panels), widget.js, frontend UI.
20. ✅ **Documentation Pages** — DONE. Standalone (7 Card sections with curl examples, data-* reference, WordPress plugin guide) + Shopify embedded (5 Polaris sections, merchant-friendly). Sidebar + nav links added. Values verified against backend.

---

## Notes

- Items 1-5 are blockers — Shopify App Store will reject without them
- Items 6-8 are Shopify embedded app requirements
- Item 9 is on hold until DragonflyDB is provisioned in Coolify
- Item 10 (Public Widget API) is prerequisite for items 11-13 — all delivery methods use it
- Item 11 (WooCommerce) is independent PHP, server-to-server — no JS snippet dependency
- Item 12 (Universal JS) is for sites without a dedicated plugin (Squarespace, Wix, custom)
- Item 13 (Magento) is abandoned — too much work for too little market
- Backend recommendation engine is complete (adapters, scoring, widget generation, analytics tracking)
- Accounts module is shared and complete (auth, organizations, subscriptions, Stripe)
- Landing page is complete and deployed at www.nudgio.tech (Vercel)
