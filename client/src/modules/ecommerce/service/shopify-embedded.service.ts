/**
 * Shopify Embedded App — API Service
 *
 * API client for the Shopify embedded app (runs inside Shopify Admin iframe).
 * All requests use Shopify session tokens (via App Bridge idToken()),
 * NOT our JWT cookie auth (which doesn't work in third-party iframes).
 *
 * Backend: /server/apps/ecommerce/subrouters/shopify_embedded_subrouter.py
 *
 * Stage 1 endpoints:
 * - POST /init — initialize connection (auto-provision if needed)
 * - GET  /dashboard — dashboard data (stats + billing status)
 *
 * Stage 2 endpoints:
 * - GET  /settings — get recommendation settings
 * - PUT  /settings — create/update recommendation settings
 * - POST /settings/reset — reset settings to defaults
 * - POST /recommendations/bestsellers — bestseller recommendations
 * - POST /recommendations/cross-sell — cross-sell recommendations
 * - POST /recommendations/upsell — upsell recommendations
 * - POST /recommendations/similar — similar product recommendations
 * - GET  /components/bestsellers — bestseller HTML widget preview
 * - GET  /components/cross-sell — cross-sell HTML widget preview
 * - GET  /components/upsell — upsell HTML widget preview
 * - GET  /components/similar — similar products HTML widget preview
 * - POST /billing/subscribe — create billing subscription
 * - POST /billing/cancel — cancel subscription
 * - GET  /billing/status — billing status
 *
 * Product Helpers:
 * - GET  /products — product list for admin dropdown (ungated)
 *
 * Stage 3 (future — separate):
 * - App Proxy + Theme App Extension for storefront widget delivery
 */

import { API_BASE_URL } from '@/modules/accounts/utils/api.endpoints';

// ==========================================
// Endpoints
// ==========================================

/**
 * API endpoints for Shopify embedded app
 * Backend: /server/apps/ecommerce/subrouters/shopify_embedded_subrouter.py
 */
const EMBEDDED_ENDPOINTS = {
  // Stage 1
  INIT: `${API_BASE_URL}/ecommerce/shopify/embedded/init`,
  DASHBOARD: `${API_BASE_URL}/ecommerce/shopify/embedded/dashboard`,
  // Stage 2 — Settings
  SETTINGS: `${API_BASE_URL}/ecommerce/shopify/embedded/settings`,
  SETTINGS_RESET: `${API_BASE_URL}/ecommerce/shopify/embedded/settings/reset`,
  // Stage 2 — Recommendations
  RECOMMENDATIONS_BESTSELLERS: `${API_BASE_URL}/ecommerce/shopify/embedded/recommendations/bestsellers`,
  RECOMMENDATIONS_CROSS_SELL: `${API_BASE_URL}/ecommerce/shopify/embedded/recommendations/cross-sell`,
  RECOMMENDATIONS_UPSELL: `${API_BASE_URL}/ecommerce/shopify/embedded/recommendations/upsell`,
  RECOMMENDATIONS_SIMILAR: `${API_BASE_URL}/ecommerce/shopify/embedded/recommendations/similar`,
  // Stage 2 — Components (HTML widget preview)
  COMPONENTS_BESTSELLERS: `${API_BASE_URL}/ecommerce/shopify/embedded/components/bestsellers`,
  COMPONENTS_CROSS_SELL: `${API_BASE_URL}/ecommerce/shopify/embedded/components/cross-sell`,
  COMPONENTS_UPSELL: `${API_BASE_URL}/ecommerce/shopify/embedded/components/upsell`,
  COMPONENTS_SIMILAR: `${API_BASE_URL}/ecommerce/shopify/embedded/components/similar`,
  // Stage 2 — Billing
  BILLING_SUBSCRIBE: `${API_BASE_URL}/ecommerce/shopify/embedded/billing/subscribe`,
  BILLING_CANCEL: `${API_BASE_URL}/ecommerce/shopify/embedded/billing/cancel`,
  BILLING_STATUS: `${API_BASE_URL}/ecommerce/shopify/embedded/billing/status`,
  // Product Helpers (ungated)
  PRODUCTS: `${API_BASE_URL}/ecommerce/shopify/embedded/products`,
};

// ==========================================
// Response Types — Dashboard (Stage 1)
// ==========================================

/** Connection info returned by embedded endpoints */
export interface EmbeddedConnection {
  id: number;
  connection_name: string;
  store_url: string;
  platform: string;
  is_active: boolean;
  created_at: string | null;
}

/** Product/order count stats */
export interface EmbeddedStats {
  products_count: number;
  orders_count: number;
}

/** Shopify billing status */
export interface EmbeddedBilling {
  has_subscription: boolean;
  plan_name: string;
  billing_status: string | null;
  start_date: string | null;
  end_date: string | null;
  test: boolean;
}

/** Combined response from POST /init and GET /dashboard */
export interface EmbeddedDashboardResponse {
  connection: EmbeddedConnection;
  stats: EmbeddedStats;
  billing: EmbeddedBilling;
}

// ==========================================
// Response Types — Settings (Stage 2)
// ==========================================

/** Recommendation settings detail — matches backend RecommendationSettingsDetail */
export interface EmbeddedSettingsDetail {
  id: number;
  connection_id: number;
  bestseller_method: string;
  bestseller_lookback_days: number;
  crosssell_lookback_days: number;
  max_recommendations: number;
  min_price_increase_percent: number;
  shop_base_url: string | null;
  product_url_template: string | null;
  created_at: string;
  updated_at: string | null;
}

/** Settings response wrapper */
export interface EmbeddedSettingsResponse {
  success: boolean;
  data: EmbeddedSettingsDetail | null;
  error: string | null;
}

/** Settings create/update payload — matches backend RecommendationSettingsCreate.
 *  shop_base_url and product_url_template excluded — Shopify provides these automatically. */
export interface EmbeddedSettingsPayload {
  bestseller_method: string;
  bestseller_lookback_days: number;
  crosssell_lookback_days: number;
  max_recommendations: number;
  min_price_increase_percent: number;
}

/** Simple message response */
export interface EmbeddedMessageResponse {
  success: boolean;
  message: string | null;
  error: string | null;
}

// ==========================================
// Response Types — Recommendations (Stage 2)
// ==========================================

/** Single product recommendation — matches backend ProductRecommendation */
export interface EmbeddedRecommendation {
  product_id: string;
  title: string;
  price: number;
  handle: string | null;
  vendor: string | null;
  sku: string | null;
  position: number;
  metrics: Record<string, unknown> | null;
  co_occurrence_count: number | null;
  price_increase_percent: number | null;
  similarity_score: number | null;
}

/** Recommendation result — matches backend RecommendationResult */
export interface EmbeddedRecommendationResult {
  recommendations: EmbeddedRecommendation[];
  count: number;
  method: string | null;
  base_product_id: string | null;
  lookback_days: number;
  generated_at: string;
}

/** Recommendation response wrapper — matches backend RecommendationResponse */
export interface EmbeddedRecommendationResponse {
  success: boolean;
  data: EmbeddedRecommendationResult | null;
  error: string | null;
}

/** Bestseller request params (no connection_id — auto-resolved) */
export interface EmbeddedBestsellerParams {
  limit?: number;
  lookback_days?: number;
  method?: 'volume' | 'value' | 'balanced';
}

/** Cross-sell request params (no connection_id — auto-resolved) */
export interface EmbeddedCrossSellParams {
  product_id: string;
  limit?: number;
  lookback_days?: number;
}

/** Upsell request params (no connection_id — auto-resolved) */
export interface EmbeddedUpsellParams {
  product_id: string;
  limit?: number;
  lookback_days?: number;
  min_price_increase_percent?: number;
}

/** Similar products request params (no connection_id — auto-resolved) */
export interface EmbeddedSimilarParams {
  product_id: string;
  limit?: number;
  lookback_days?: number;
}

// ==========================================
// Response Types — Components (Stage 2)
// ==========================================

/** Component widget query params */
export interface EmbeddedComponentParams {
  product_id?: string;
  top?: number;
  lookback_days?: number;
  method?: string;
  min_price_increase_percent?: number;
  style?: 'card' | 'carousel' | 'list';
  device?: 'desktop' | 'mobile';
  primary_color?: string;
  text_color?: string;
  bg_color?: string;
  border_radius?: string;
}

// ==========================================
// Response Types — Billing (Stage 2)
// ==========================================

/** Billing subscribe response */
export interface EmbeddedBillingSubscribeResponse {
  success: boolean;
  confirmation_url: string;
}

// ==========================================
// Response Types — Products (ungated)
// ==========================================

/** Single product for admin dropdown — matches backend GET /products item */
export interface EmbeddedProduct {
  product_id: string;
  title: string;
  image_url: string;
}

/** Product list response — matches backend GET /products */
export interface EmbeddedProductsResponse {
  products: EmbeddedProduct[];
  count: number;
}

// ==========================================
// Fetch Helpers
// ==========================================

/**
 * Fetch helper for embedded endpoints — sends session token as Bearer auth.
 *
 * Unlike fetchClient (which uses cookie JWT), this sends the Shopify
 * session token in the Authorization header. No cookies involved.
 *
 * @param url Full API URL
 * @param sessionToken Shopify session token from App Bridge idToken()
 * @param options Additional fetch options (method, body, etc.)
 * @returns Parsed JSON response
 * @throws Error with detail message from backend
 */
async function embeddedFetch<T>(
  url: string,
  sessionToken: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch helper for embedded endpoints that return HTML (not JSON).
 *
 * Used by component preview endpoints that return HTMLResponse.
 *
 * @param url Full API URL
 * @param sessionToken Shopify session token from App Bridge idToken()
 * @returns Raw HTML string
 * @throws Error with status text on failure
 */
async function embeddedFetchHtml(
  url: string,
  sessionToken: string,
): Promise<string> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

// ==========================================
// Stage 1 — Init + Dashboard
// ==========================================

/**
 * Initialize the embedded app for a Shopify merchant.
 *
 * Called on every embedded app load. Handles two cases:
 * - Existing connection: refreshes access token, returns dashboard data
 * - No connection (first install): auto-provisions User + Org + Connection
 *
 * @param sessionToken Shopify session token from App Bridge idToken()
 * @returns Dashboard response with connection, stats, and billing
 */
export const initEmbedded = async (
  sessionToken: string,
): Promise<EmbeddedDashboardResponse> => {
  return embeddedFetch<EmbeddedDashboardResponse>(
    EMBEDDED_ENDPOINTS.INIT,
    sessionToken,
    { method: 'POST' },
  );
};

/**
 * Get dashboard data for the embedded app.
 *
 * Same response shape as initEmbedded but without Token Exchange.
 * Used for refreshing dashboard data after initial load.
 *
 * @param sessionToken Shopify session token from App Bridge idToken()
 * @returns Dashboard response with connection, stats, and billing
 */
export const getDashboard = async (
  sessionToken: string,
): Promise<EmbeddedDashboardResponse> => {
  return embeddedFetch<EmbeddedDashboardResponse>(
    EMBEDDED_ENDPOINTS.DASHBOARD,
    sessionToken,
    { method: 'GET' },
  );
};

// ==========================================
// Stage 2 — Settings
// ==========================================

/**
 * Get recommendation settings for the embedded app's connection.
 *
 * No connection_id needed — auto-resolved from session token.
 * Returns defaults if no saved settings exist.
 *
 * @param sessionToken Shopify session token from App Bridge idToken()
 * @returns Settings response with current or default settings
 */
export const getSettings = async (
  sessionToken: string,
): Promise<EmbeddedSettingsResponse> => {
  return embeddedFetch<EmbeddedSettingsResponse>(
    EMBEDDED_ENDPOINTS.SETTINGS,
    sessionToken,
    { method: 'GET' },
  );
};

/**
 * Create or update recommendation settings for the embedded app's connection.
 *
 * @param sessionToken Shopify session token from App Bridge idToken()
 * @param data Settings payload with 5 algorithm fields
 * @returns Settings response with updated settings
 */
export const updateSettings = async (
  sessionToken: string,
  data: EmbeddedSettingsPayload,
): Promise<EmbeddedSettingsResponse> => {
  return embeddedFetch<EmbeddedSettingsResponse>(
    EMBEDDED_ENDPOINTS.SETTINGS,
    sessionToken,
    { method: 'PUT', body: JSON.stringify(data) },
  );
};

/**
 * Reset recommendation settings to default values.
 *
 * Deletes saved settings — defaults are applied by GET /settings.
 *
 * @param sessionToken Shopify session token from App Bridge idToken()
 * @returns Message response with success status
 */
export const resetSettings = async (
  sessionToken: string,
): Promise<EmbeddedMessageResponse> => {
  return embeddedFetch<EmbeddedMessageResponse>(
    EMBEDDED_ENDPOINTS.SETTINGS_RESET,
    sessionToken,
    { method: 'POST' },
  );
};

// ==========================================
// Stage 2 — Recommendations
// ==========================================

/**
 * Get bestselling products.
 *
 * @param sessionToken Shopify session token from App Bridge idToken()
 * @param params Bestseller parameters (limit, lookback_days, method)
 * @returns Recommendation response with product list
 */
export const getBestsellers = async (
  sessionToken: string,
  params: EmbeddedBestsellerParams,
): Promise<EmbeddedRecommendationResponse> => {
  return embeddedFetch<EmbeddedRecommendationResponse>(
    EMBEDDED_ENDPOINTS.RECOMMENDATIONS_BESTSELLERS,
    sessionToken,
    { method: 'POST', body: JSON.stringify(params) },
  );
};

/**
 * Get frequently bought together products.
 *
 * @param sessionToken Shopify session token from App Bridge idToken()
 * @param params Cross-sell parameters (product_id, limit, lookback_days)
 * @returns Recommendation response with product list
 */
export const getCrossSell = async (
  sessionToken: string,
  params: EmbeddedCrossSellParams,
): Promise<EmbeddedRecommendationResponse> => {
  return embeddedFetch<EmbeddedRecommendationResponse>(
    EMBEDDED_ENDPOINTS.RECOMMENDATIONS_CROSS_SELL,
    sessionToken,
    { method: 'POST', body: JSON.stringify(params) },
  );
};

/**
 * Get higher-priced alternatives.
 *
 * @param sessionToken Shopify session token from App Bridge idToken()
 * @param params Upsell parameters (product_id, limit, lookback_days, min_price_increase_percent)
 * @returns Recommendation response with product list
 */
export const getUpsell = async (
  sessionToken: string,
  params: EmbeddedUpsellParams,
): Promise<EmbeddedRecommendationResponse> => {
  return embeddedFetch<EmbeddedRecommendationResponse>(
    EMBEDDED_ENDPOINTS.RECOMMENDATIONS_UPSELL,
    sessionToken,
    { method: 'POST', body: JSON.stringify(params) },
  );
};

/**
 * Get similar products.
 *
 * @param sessionToken Shopify session token from App Bridge idToken()
 * @param params Similar parameters (product_id, limit, lookback_days)
 * @returns Recommendation response with product list
 */
export const getSimilar = async (
  sessionToken: string,
  params: EmbeddedSimilarParams,
): Promise<EmbeddedRecommendationResponse> => {
  return embeddedFetch<EmbeddedRecommendationResponse>(
    EMBEDDED_ENDPOINTS.RECOMMENDATIONS_SIMILAR,
    sessionToken,
    { method: 'POST', body: JSON.stringify(params) },
  );
};

// ==========================================
// Stage 2 — Components (HTML Widget Preview)
// ==========================================

/**
 * Get HTML widget preview for a specific component type.
 *
 * Returns raw HTML (not JSON) — rendered in an iframe for preview.
 * Component endpoints use query params (not JSON body).
 *
 * @param sessionToken Shopify session token from App Bridge idToken()
 * @param type Widget type: 'bestsellers' | 'cross-sell' | 'upsell' | 'similar'
 * @param params Component configuration (style, device, colors, etc.)
 * @returns Raw HTML string
 */
export const getComponentHtml = async (
  sessionToken: string,
  type: 'bestsellers' | 'cross-sell' | 'upsell' | 'similar',
  params: EmbeddedComponentParams,
): Promise<string> => {
  // Build query string from params
  const searchParams = new URLSearchParams();
  if (params.product_id) searchParams.set('product_id', params.product_id);
  if (params.top !== undefined) searchParams.set('top', String(params.top));
  if (params.lookback_days !== undefined) searchParams.set('lookback_days', String(params.lookback_days));
  if (params.method) searchParams.set('method', params.method);
  if (params.min_price_increase_percent !== undefined) searchParams.set('min_price_increase_percent', String(params.min_price_increase_percent));
  if (params.style) searchParams.set('style', params.style);
  if (params.device) searchParams.set('device', params.device);
  if (params.primary_color) searchParams.set('primary_color', params.primary_color);
  if (params.text_color) searchParams.set('text_color', params.text_color);
  if (params.bg_color) searchParams.set('bg_color', params.bg_color);
  if (params.border_radius) searchParams.set('border_radius', params.border_radius);

  // Map type to endpoint
  const endpointMap: Record<string, string> = {
    'bestsellers': EMBEDDED_ENDPOINTS.COMPONENTS_BESTSELLERS,
    'cross-sell': EMBEDDED_ENDPOINTS.COMPONENTS_CROSS_SELL,
    'upsell': EMBEDDED_ENDPOINTS.COMPONENTS_UPSELL,
    'similar': EMBEDDED_ENDPOINTS.COMPONENTS_SIMILAR,
  };
  const baseUrl = endpointMap[type];
  const url = `${baseUrl}?${searchParams.toString()}`;

  return embeddedFetchHtml(url, sessionToken);
};

// ==========================================
// Stage 2 — Billing
// ==========================================

/**
 * Create a Shopify app subscription charge.
 *
 * NOTE: Currently NOT used — app is configured with Managed Pricing in the Partner Dashboard.
 * With Managed Pricing, merchants subscribe through Shopify's hosted pricing page.
 * Kept here in case we switch back to Manual Pricing (Billing API) in the future.
 *
 * Returns a confirmation_url — redirect the merchant to this URL
 * to approve the charge. Use window.open(url, '_top') to exit the iframe.
 *
 * @param sessionToken Shopify session token from App Bridge idToken()
 * @param planName Plan tier: 'PRO' or 'ENTERPRISE'
 * @returns Subscribe response with confirmation_url
 */
export const subscribeBilling = async (
  sessionToken: string,
  planName: string,
): Promise<EmbeddedBillingSubscribeResponse> => {
  return embeddedFetch<EmbeddedBillingSubscribeResponse>(
    `${EMBEDDED_ENDPOINTS.BILLING_SUBSCRIBE}?plan_name=${encodeURIComponent(planName)}`,
    sessionToken,
    { method: 'POST' },
  );
};

/**
 * Cancel an active Shopify app subscription.
 *
 * NOTE: Currently NOT used — app is configured with Managed Pricing in the Partner Dashboard.
 * With Managed Pricing, merchants cancel through Shopify's interface, not our endpoint.
 * Kept here in case we switch back to Manual Pricing (Billing API) in the future.
 *
 * @param sessionToken Shopify session token from App Bridge idToken()
 * @returns Success response
 */
export const cancelBilling = async (
  sessionToken: string,
): Promise<{ success: boolean }> => {
  return embeddedFetch<{ success: boolean }>(
    EMBEDDED_ENDPOINTS.BILLING_CANCEL,
    sessionToken,
    { method: 'POST' },
  );
};

/**
 * Get Shopify billing status for the connection.
 *
 * @param sessionToken Shopify session token from App Bridge idToken()
 * @returns Billing status (same shape as EmbeddedBilling)
 */
export const getBillingStatus = async (
  sessionToken: string,
): Promise<EmbeddedBilling> => {
  return embeddedFetch<EmbeddedBilling>(
    EMBEDDED_ENDPOINTS.BILLING_STATUS,
    sessionToken,
    { method: 'GET' },
  );
};

// ==========================================
// Product Helpers (ungated)
// ==========================================

/**
 * Get a simplified product list for the admin Components page dropdown.
 *
 * On the ungated router — FREE tier merchants can preview widgets too.
 *
 * @param sessionToken Shopify session token from App Bridge idToken()
 * @returns Product list with product_id, title, image_url
 */
export const getProducts = async (
  sessionToken: string,
): Promise<EmbeddedProductsResponse> => {
  return embeddedFetch<EmbeddedProductsResponse>(
    EMBEDDED_ENDPOINTS.PRODUCTS,
    sessionToken,
    { method: 'GET' },
  );
};
