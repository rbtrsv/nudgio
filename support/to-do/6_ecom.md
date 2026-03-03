# Nudgio — Ecommerce Recommendation Engine

## Overview

Standalone SaaS product extracted from nexotype/finpy ecommerce module.
Cross-platform product recommendation engine for Shopify, WooCommerce, and Magento.
Monetization: per-shop monthly subscription via Shopify App Store, WordPress Plugin Directory, Adobe Commerce Marketplace.

---

## Name Candidates

- **Nudgio** — nudge (subtle push towards purchase decision) + -io
- **Recolo** — reco(mmendation) + lo(gic)
- **CartPulse** — cart (shopping cart) + pulse (sales rhythm/analytics)
- **Shelfy** — shelf (digital shelf) + -fy (tech suffix)
- **Recofy** — reco(mmendation) + -fy (like Shopify, Spotify)
- **Pickora** — pick (product selection) + -ora
- **Nudgly** — nudge + -ly
- **Nudgeo** — nudge + -geo
- **Nudgify** — nudge + -fy
- **Nudgi** — nudge shortened
- **Nudgr** — nudge without vowel (Flickr, Tumblr pattern)
- **Nudgit** — nudge + it (do it, push it)

**Current pick: Nudgio**

Domain: TBD (nudgio.com, nudgio.io, or similar).

---

## What Exists Already

The ecommerce module (`server/apps/ecommerce/`) is identical in both nexotype and finpy.
~2500 lines of production-grade Python code.

### Backend (ready)
- **3 platform adapters**: Shopify (REST Admin API), WooCommerce (MySQL), Magento (MySQL)
- **4 recommendation types**: bestsellers, cross-sell, upsell, similar products
- **Recommendation engine**: market basket analysis, volume/value/balanced scoring
- **HTML widget generation**: embeddable components with customizable styling (card grid, carousel, list)
- **Settings system**: per-connection configuration (lookback period, limits, methods, URL templates)
- **Analytics tracking**: API usage, click tracking, event tracking (view/click/purchase)
- **Models**: EcommerceConnection, RecommendationSettings, APIUsageTracking, RecommendationAnalytics

### What's Missing
- OAuth flow for Shopify (currently manual token input)
- Embedded app UI for Shopify Admin
- Frontend dashboard (currently API-only)
- Billing/subscription integration
- Data import endpoints (stubs only)
- Landing page
- Privacy policy, terms of service

---

## Architecture

New repo, same tech stack as nexotype/finpy:
- **Backend**: FastAPI + SQLAlchemy (async) + PostgreSQL
- **Frontend**: Next.js + shadcn/ui + Tailwind
- **Hosting**: Coolify (like nexotype/finpy)
- **Billing**: Stripe (accounts module, already built)
- **Auth**: accounts module (Google OAuth + JWT, already built)

### Repo Structure (based on nexotype/finpy pattern)
```
nudgio/
  server/
    apps/
      accounts/          # Copied from nexotype — auth, subscriptions, Stripe
      ecommerce/         # Copied from nexotype — the recommendation engine
    core/                # Copied from nexotype — config, db, middleware
    main.py
  client/
    src/
      app/               # Next.js pages
      modules/
        accounts/        # Auth, subscriptions UI
        ecommerce/       # Dashboard UI (new)
        shadcnui/        # UI components
```

---

## Implementation Plan

### Phase 1 — Standalone Repo + Shopify App Store (Priority)

#### Step 1: Repo Setup
- Create new GitHub repo `nudgio`
- Copy server skeleton from nexotype (core/, accounts/, ecommerce/)
- Copy client skeleton from nexotype (accounts module, shadcn, auth flow)
- Setup Coolify deployment (nudgio server + client + PostgreSQL)
- Configure domains (api.nudgio.com, app.nudgio.com or similar)

#### Step 2: Shopify OAuth Flow
- Register app in Shopify Partner Dashboard
- Implement OAuth endpoints:
  - GET `/shopify/auth` — redirect merchant to Shopify OAuth consent screen
  - GET `/shopify/callback` — receive access token, save to EcommerceConnection
- Replace manual token input with "Install on Shopify" button
- Store access token encrypted in EcommerceConnection.db_password (existing field)
- Adapter already works with access token — no engine changes needed

#### Step 3: Embedded App UI (Shopify Requirement)
- Shopify apps must render inside Shopify Admin as an iframe
- Implement App Bridge integration (Shopify's JS library)
- Dashboard pages:
  - Connection status / store info
  - Recommendation settings (lookback, method, limits)
  - Widget preview (live preview of HTML components)
  - Analytics (clicks, views, conversions)
  - Widget embed codes (copy-paste for merchants)

#### Step 4: Billing
- Use Shopify's own billing API (required for App Store apps)
  - OR use Stripe with Shopify App Store approval
- Pricing model: freemium
  - Free: 50 recommendations/day
  - Pro ($19/mo): unlimited recommendations, all widget styles, analytics
  - Business ($49/mo): priority support, custom styling, API access

#### Step 5: Shopify App Store Submission
- App listing (description, screenshots, demo video)
- Privacy policy
- Terms of service
- Shopify review process (2-4 weeks)

### Phase 2 — WooCommerce (WordPress Plugin Directory)

- Write PHP plugin that:
  - Installs on merchant's WordPress site
  - Sends product/order data to Nudgio API
  - Renders recommendation widgets via shortcodes or Gutenberg blocks
- Submit to WordPress Plugin Directory (free listing)
- Same backend API, different integration method

### Phase 3 — Magento (Adobe Commerce Marketplace)

- Similar to WooCommerce but Magento extension format
- Lower priority — smaller market

---

## Competitive Landscape

Major players in Shopify recommendation apps:
- **Wiser AI** — most popular, thousands of reviews
- **Glood** — 12 recommendation types, visual editor
- **Rebuy** — enterprise, AI-powered
- **StoreFrog** — freemium
- **AiTrillion** — all-in-one marketing + recommendations

### Differentiation Angles
- **Cross-platform**: Shopify + WooCommerce + Magento (most competitors are Shopify-only)
- **Simple setup**: connect and go, no complex configuration
- **Embeddable widgets**: pre-built HTML components, copy-paste embed
- **Transparent pricing**: no hidden fees, no % of revenue

---

## Revenue Projection

Conservative estimates:
- Month 1-3: 0-20 merchants (organic App Store discovery)
- Month 3-6: 20-100 merchants (with marketing effort)
- Month 6-12: 100-500 merchants

At $19-49/mo per merchant:
- 100 merchants × $29 avg = ~$2,900/mo
- 500 merchants × $29 avg = ~$14,500/mo

---

## Why Nudgio First

1. Engine already built — 1 day to make it publishable
2. Self-service distribution (App Store) — no sales calls needed
3. Clear ROI for merchants — recommendations directly increase sales
4. Recurring revenue from day 1
5. Cross-platform advantage over competitors
6. Nexotype and Finpy continue running — Nudgio is additive, not a replacement
