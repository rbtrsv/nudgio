# Nudgio — To-Do List (Ordered by Importance)

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
- ✅ Managed Pricing billing page — billing page rewritten for Shopify Managed Pricing. Shows current plan + plan comparison + "Manage Plan on Shopify" button that opens `https://admin.shopify.com/store/{storeHandle}/charges/nudgio/pricing_plans`. Subscribe/cancel endpoints and service functions kept with comments for manual pricing revert. Partner Dashboard → Distribution → Manage listing → Pricing content → Settings → "Managed pricing" selected.

### 4. Shopify App Store Submission
- ❌ App listing: description, screenshots, demo video
- ❌ Submit for Shopify review (2-4 week review process)

### 5. Legal Pages ✅
- ✅ Privacy policy — `/legal/privacy-policy` (GDPR/CCPA, store data, credentials, Stripe)
- ✅ Terms of service — `/legal/terms-of-service` (SaaS terms, subscriptions, liability, Romanian jurisdiction)

### 6. WooCommerce WordPress Plugin
- ❌ PHP plugin for WordPress Plugin Directory — shortcodes or Gutenberg blocks for recommendation widgets
- ❌ Submit to WordPress Plugin Directory

### 7. Magento Adobe Commerce Extension
- ❌ Magento extension for Adobe Commerce Marketplace (lower priority — smaller market)

### 8. Nice to Have
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
8. **App Store submission** — listing, description, screenshots, demo video, submit for review (2-4 weeks).

### 🟢 Low Priority — Future Expansions
9. **Production DragonflyDB** — provision in Coolify, switch cache + rate limit backends (⏸️ on hold).
10. **WooCommerce WordPress Plugin** — PHP plugin for WordPress Plugin Directory.
11. **Magento Adobe Commerce Extension** — smaller market, lowest priority.
12. ✅ **Frontend subscription page** — DONE. Shopify: Managed Pricing page. Standalone: Stripe via accounts module.

---

## Notes

- Items 1-5 are blockers — Shopify App Store will reject without them
- Items 6-8 are Shopify embedded app requirements
- Item 9 is on hold until DragonflyDB is provisioned in Coolify
- Items 10-11 are future platform expansions
- Item 12 is DONE — Shopify uses Managed Pricing, standalone uses Stripe via accounts module
- Backend recommendation engine is complete (adapters, scoring, widget generation, analytics tracking)
- Accounts module is shared and complete (auth, organizations, subscriptions, Stripe)
- Landing page is complete and deployed at www.nudgio.tech (Vercel)
