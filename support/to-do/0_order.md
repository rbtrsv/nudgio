# Nudgio — To-Do List (Ordered by Importance)

---

## Done

### Repo Setup & Infrastructure
- [x] Create nudgio repo (copied server + client skeleton from nexotype)
- [x] Server config: main.py, config.py, manage.py updated for nudgio (port 8002/3002)
- [x] Database: Coolify PostgreSQL configured (port 6035 public, 5432 internal)
- [x] .env and .env.production with real DB credentials
- [x] Initial migration created and applied (11 tables: 7 accounts + 4 ecommerce)
- [x] Client ecommerce route group: `(ecommerce)` layout, page, sidebar, breadcrumb, providers
- [x] Organization pages copied under `(ecommerce)/organizations/` (list, new, details, subscription)
- [x] Nexotype routes disabled: `(nexotype)` → `_nexotype`

### Branding
- [x] Branding rename: nexotype → nudgio (proxy.ts, token.client.utils.ts, token.server.utils.ts, auth.server.store.ts, root layout.tsx)
- [x] Nudgio brand colors selected: `#17FFFD` → `#2631f7` (cyan → blue)
- [x] Nudgio logo created (SVG, dark + light variants)
- [x] Logo wired into login-signup.tsx, app-sidebar.tsx, ecommerce-sidebar.tsx
- [x] Favicon added

### Build & Deployment
- [x] Frontend build passing (recharts, chart component, ts-expect-error fixed)
- [x] Coolify: Nudgio Server + Client apps created (sslip.io URLs)
- [x] Coolify: PostgreSQL running with backups
- [x] Pushed to GitHub

---

## To Do

### 1. Ecommerce Module Wiring (Core Product — Frontend Plumbing)
- [ ] Ecommerce API endpoints file (`modules/ecommerce/utils/api.endpoints.ts`)
- [ ] Ecommerce schemas (connections, settings, analytics — Zod)
- [ ] Ecommerce services (API calls to server)
- [ ] Ecommerce stores (Zustand — connections, settings, analytics)
- [ ] Ecommerce hooks (useConnections, useRecommendationSettings, useAnalytics)
- [ ] Ecommerce providers (wire stores into `ecommerce-providers.tsx`)

### 2. Ecommerce Dashboard Pages (Core Product — Frontend)
- [ ] Connections page: list existing ecommerce connections (Shopify/WooCommerce/Magento)
- [ ] Connection detail page: connection status, store info, settings
- [ ] Connection create page: manual connection setup (current flow, before OAuth)
- [ ] Recommendation settings page: lookback period, method, limits per connection
- [ ] Widget preview page: live preview of HTML recommendation components
- [ ] Analytics page: API usage, clicks, views, conversions per connection
- [ ] Widget embed codes page: copy-paste embed snippets for merchants

### 3. Shopify OAuth Flow (Distribution — Shopify App Store Requirement)
- [ ] Register app in Shopify Partner Dashboard
- [ ] Implement GET `/shopify/auth` — redirect merchant to Shopify OAuth consent screen
- [ ] Implement GET `/shopify/callback` — receive access token, save to EcommerceConnection
- [ ] Replace manual token input with "Install on Shopify" button in connection create page
- [ ] Test full OAuth flow: install → authorize → connection created

### 4. Shopify Embedded App UI (Distribution — Shopify App Store Requirement)
- [ ] Integrate Shopify App Bridge (JS library for iframe rendering in Shopify Admin)
- [ ] Adapt dashboard pages to render inside Shopify Admin iframe
- [ ] Handle session tokens from Shopify App Bridge (distinct from nudgio auth)
- [ ] Test embedded experience in Shopify development store

### 5. Billing / Pricing (Monetization)
- [ ] Decide: Shopify Billing API vs Stripe (Stripe already in accounts module)
- [ ] Define pricing tiers: Free (50 recs/day), Pro ($19/mo), Business ($49/mo)
- [ ] Implement usage metering (recommendations per day per connection)
- [ ] Implement tier gating on recommendation endpoints
- [ ] Pricing page for non-Shopify merchants (WooCommerce, Magento)

### 6. Shopify App Store Submission (Distribution — Go-Live)
- [ ] App listing: description, screenshots, demo video
- [ ] Privacy policy page
- [ ] Terms of service page
- [ ] Submit for Shopify review (2-4 week review process)

### 7. WooCommerce Plugin (Phase 2 — Second Platform)
- [ ] PHP plugin: installs on WordPress, sends product/order data to Nudgio API
- [ ] Recommendation widget rendering via shortcodes or Gutenberg blocks
- [ ] Submit to WordPress Plugin Directory

### 8. Magento Extension (Phase 3 — Third Platform)
- [ ] Magento extension format
- [ ] Submit to Adobe Commerce Marketplace

---

## Notes

- Items 1-2 are the core product — ecommerce module plumbing then dashboard pages
- Items 3-4 are Shopify-specific distribution requirements — needed for App Store listing
- Item 5 is monetization — can be done in parallel with 3-4
- Item 6 is Shopify App Store submission
- Items 7-8 are future platform expansions
- Backend recommendation engine is already complete (adapters, scoring, widget generation, analytics tracking)
- Accounts module is shared and complete (auth, organizations, subscriptions, Stripe)
