/**
 * API endpoints for the ecommerce module
 */

import { API_BASE_URL } from '@/modules/accounts/utils/api.endpoints';

/**
 * API endpoints for connections
 */
export const CONNECTION_ENDPOINTS = {
  LIST: `${API_BASE_URL}/ecommerce/connections/`,
  DETAIL: (id: number) => `${API_BASE_URL}/ecommerce/connections/${id}`,
  CREATE: `${API_BASE_URL}/ecommerce/connections/`,
  UPDATE: (id: number) => `${API_BASE_URL}/ecommerce/connections/${id}`,
  DELETE: (id: number) => `${API_BASE_URL}/ecommerce/connections/${id}`,
  TEST: (id: number) => `${API_BASE_URL}/ecommerce/connections/${id}/test`,
};

/**
 * API endpoints for recommendation settings
 */
export const SETTINGS_ENDPOINTS = {
  CREATE_OR_UPDATE: (connId: number) => `${API_BASE_URL}/ecommerce/settings/${connId}`,
  DETAIL: (connId: number) => `${API_BASE_URL}/ecommerce/settings/${connId}`,
  LIST: `${API_BASE_URL}/ecommerce/settings/`,
  DELETE: (connId: number) => `${API_BASE_URL}/ecommerce/settings/${connId}`,
  RESET: (connId: number) => `${API_BASE_URL}/ecommerce/settings/${connId}/reset`,
};

/**
 * API endpoints for recommendations
 */
export const RECOMMENDATION_ENDPOINTS = {
  BESTSELLERS: `${API_BASE_URL}/ecommerce/recommendations/bestsellers`,
  CROSS_SELL: `${API_BASE_URL}/ecommerce/recommendations/cross-sell`,
  UPSELL: `${API_BASE_URL}/ecommerce/recommendations/upsell`,
  SIMILAR: `${API_BASE_URL}/ecommerce/recommendations/similar`,
};

/**
 * API endpoints for embeddable HTML components
 */
export const COMPONENT_ENDPOINTS = {
  BESTSELLERS: `${API_BASE_URL}/ecommerce/components/bestsellers`,
  CROSS_SELL: `${API_BASE_URL}/ecommerce/components/cross-sell`,
  UPSELL: `${API_BASE_URL}/ecommerce/components/upsell`,
  SIMILAR: `${API_BASE_URL}/ecommerce/components/similar`,
};

/**
 * API endpoints for data and analytics
 */
export const DATA_ENDPOINTS = {
  STATS: (connId: number) => `${API_BASE_URL}/ecommerce/data/stats/${connId}`,
};

/**
 * API endpoints for Shopify OAuth
 */
export const SHOPIFY_OAUTH_ENDPOINTS = {
  AUTH: (shop: string) => `${API_BASE_URL}/ecommerce/shopify/auth?shop=${encodeURIComponent(shop)}`,
};

/**
 * API endpoints for WooCommerce auto-auth
 */
export const WOOCOMMERCE_AUTH_ENDPOINTS = {
  AUTH: (storeUrl: string) => `${API_BASE_URL}/ecommerce/woocommerce/auth?store_url=${encodeURIComponent(storeUrl)}`,
};
