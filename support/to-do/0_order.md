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
- ✅ Shopify API adapter (`adapters/shopify/api.py`) — REST Admin API
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
- ❌ GDPR webhooks — 3 mandatory compliance endpoints (`customers/data_request`, `customers/redact`, `shop/redact`) with HMAC-SHA256 verification (Base64)
- ❌ GraphQL migration — migrate `ShopifyAdapter` from REST to GraphQL Admin API (REST rejected for new public apps since April 2025)
- ❌ Shopify Billing API — integrate Shopify's own billing (required for App Store apps, cannot use external billing)
- ✅ Register app in Shopify Partner Dashboard — app registered, Client ID + Client Secret obtained, redirect URLs configured, OAuth flow tested with dev store
- ❌ `shopify.app.toml` configuration for webhooks and compliance endpoints

### 3. Shopify Embedded App UI
- ❌ App Bridge integration — Shopify apps must render inside Shopify Admin as an iframe
- ❌ Embedded dashboard pages — connection status, settings, widget preview, analytics, embed codes
- ❌ Handle session tokens from Shopify App Bridge

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
- ❌ Frontend subscription page — show current tier, usage stats, upgrade/downgrade buttons (match nexotype/finpy pattern)

---

## Priority List (What to Work on Next)

### 🔴 High Priority — Required for Launch
1. ✅ **Shopify Partner Dashboard registration** — app registered, Client ID + Client Secret obtained, OAuth flow tested with dev store.
2. **GDPR webhooks** — 3 mandatory compliance endpoints. Shopify will reject the app without them.
3. **GraphQL migration** — migrate `ShopifyAdapter` from REST to GraphQL Admin API. REST rejected for new public apps since April 2025.
4. **Shopify Billing API** — Shopify requires its own billing for App Store apps. Cannot use external Stripe billing for Shopify merchants.
5. **`shopify.app.toml` configuration** — webhooks and compliance endpoints config.

### 🟡 Medium Priority — Required for Shopify App Store
6. **Shopify App Bridge integration** — apps must render inside Shopify Admin as an iframe.
7. **Embedded dashboard pages** — connection status, settings, widget preview, analytics, embed codes inside Shopify Admin.
8. **App Store submission** — listing, description, screenshots, demo video, submit for review (2-4 weeks).

### 🟢 Low Priority — Future Expansions
9. **Production DragonflyDB** — provision in Coolify, switch cache + rate limit backends (⏸️ on hold).
10. **WooCommerce WordPress Plugin** — PHP plugin for WordPress Plugin Directory.
11. **Magento Adobe Commerce Extension** — smaller market, lowest priority.
12. **Frontend subscription page** — cosmetic, accounts module already handles billing.

---

## Notes

- Items 1-5 are blockers — Shopify App Store will reject without them
- Items 6-8 are Shopify embedded app requirements
- Item 9 is on hold until DragonflyDB is provisioned in Coolify
- Items 10-11 are future platform expansions
- Item 12 is cosmetic — accounts subscription module already handles billing via Stripe
- Backend recommendation engine is complete (adapters, scoring, widget generation, analytics tracking)
- Accounts module is shared and complete (auth, organizations, subscriptions, Stripe)
- Landing page is complete and deployed at www.nudgio.tech (Vercel)
