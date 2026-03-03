# Nudgio — To-Do List (Ordered by Importance)

---

## Done

### Repo Setup
- [x] Create nudgio repo (copied server + client skeleton from nexotype)
- [x] Server config: main.py, config.py, manage.py updated for nudgio (port 8002/3002)
- [x] Database: Coolify PostgreSQL configured (port 6035 public, 5432 internal)
- [x] .env and .env.production with real DB credentials
- [x] Initial migration created and applied (11 tables: 7 accounts + 4 ecommerce)
- [x] Client ecommerce route group: `(ecommerce)` layout, page, sidebar, breadcrumb, providers
- [x] Branding rename: nexotype → nudgio (proxy.ts, token.client.utils.ts, token.server.utils.ts, auth.server.store.ts, root layout.tsx)
- [x] Organization pages copied under `(ecommerce)/organizations/` (list, new, details, subscription)
- [x] Nexotype routes disabled: `(nexotype)` → `_nexotype`

---

## To Do

### 1. Finish Branding Cleanup (Blocking — Visible to Users)
- [ ] Replace nexotype logo imports in `login-signup.tsx` with Nudgio text or new logo
- [ ] Audit remaining nexotype string references across client codebase
- [ ] Create or source Nudgio logo (SVG, dark + light variants)

### 2. Push to GitHub (Blocking — Deployment Prerequisite)
- [ ] Resolve GitHub push protection block (revoked Shopify token in `support/commands.txt`)
- [ ] Push nudgio repo to GitHub

### 3. Coolify Deployment (Blocking — Production Access)
- [ ] Create Nudgio Server app in Coolify
- [ ] Create Nudgio Client app in Coolify
- [ ] Set env vars in Coolify from .env.production
- [ ] Configure domains (api.nudgio.com / app.nudgio.com or similar)
- [ ] Verify server + client build and run in production

### 4. Ecommerce Dashboard Pages (Core Product — Frontend)
- [ ] Connections page: list existing ecommerce connections (Shopify/WooCommerce/Magento)
- [ ] Connection detail page: connection status, store info, settings
- [ ] Connection create page: manual connection setup (current flow, before OAuth)
- [ ] Recommendation settings page: lookback period, method, limits per connection
- [ ] Widget preview page: live preview of HTML recommendation components
- [ ] Analytics page: API usage, clicks, views, conversions per connection
- [ ] Widget embed codes page: copy-paste embed snippets for merchants

### 5. Ecommerce Module Wiring (Core Product — Frontend Plumbing)
- [ ] Ecommerce API endpoints file (`modules/ecommerce/utils/api.endpoints.ts`)
- [ ] Ecommerce schemas (connections, settings, analytics — Zod)
- [ ] Ecommerce services (API calls to server)
- [ ] Ecommerce stores (Zustand — connections, settings, analytics)
- [ ] Ecommerce hooks (useConnections, useRecommendationSettings, useAnalytics)
- [ ] Ecommerce providers (wire stores into `ecommerce-providers.tsx`)

### 6. Shopify OAuth Flow (Distribution — Shopify App Store Requirement)
- [ ] Register app in Shopify Partner Dashboard
- [ ] Implement GET `/shopify/auth` — redirect merchant to Shopify OAuth consent screen
- [ ] Implement GET `/shopify/callback` — receive access token, save to EcommerceConnection
- [ ] Replace manual token input with "Install on Shopify" button in connection create page
- [ ] Test full OAuth flow: install → authorize → connection created

### 7. Shopify Embedded App UI (Distribution — Shopify App Store Requirement)
- [ ] Integrate Shopify App Bridge (JS library for iframe rendering in Shopify Admin)
- [ ] Adapt dashboard pages to render inside Shopify Admin iframe
- [ ] Handle session tokens from Shopify App Bridge (distinct from nudgio auth)
- [ ] Test embedded experience in Shopify development store

### 8. Billing / Pricing (Monetization)
- [ ] Decide: Shopify Billing API vs Stripe (Stripe already in accounts module)
- [ ] Define pricing tiers: Free (50 recs/day), Pro ($19/mo), Business ($49/mo)
- [ ] Implement usage metering (recommendations per day per connection)
- [ ] Implement tier gating on recommendation endpoints
- [ ] Pricing page for non-Shopify merchants (WooCommerce, Magento)

### 9. Shopify App Store Submission (Distribution — Go-Live)
- [ ] App listing: description, screenshots, demo video
- [ ] Privacy policy page
- [ ] Terms of service page
- [ ] Submit for Shopify review (2-4 week review process)

### 10. WooCommerce Plugin (Phase 2 — Second Platform)
- [ ] PHP plugin: installs on WordPress, sends product/order data to Nudgio API
- [ ] Recommendation widget rendering via shortcodes or Gutenberg blocks
- [ ] Submit to WordPress Plugin Directory

### 11. Magento Extension (Phase 3 — Third Platform)
- [ ] Magento extension format
- [ ] Submit to Adobe Commerce Marketplace

---

## Notes

- Items 1-3 are infrastructure prerequisites — must be done before anything else ships
- Items 4-5 are the core product dashboard — the merchant-facing UI for managing recommendations
- Items 6-7 are Shopify-specific distribution requirements — needed for App Store listing
- Item 8 is monetization — can be done in parallel with 6-7
- Items 9-11 are go-to-market milestones
- Backend recommendation engine is already complete (adapters, scoring, widget generation, analytics tracking)
- Accounts module is shared and complete (auth, organizations, subscriptions, Stripe)
