'use client';

import { WidgetParams, WidgetResponse } from '../schemas/components.schemas';
import { COMPONENT_ENDPOINTS } from '../utils/api.endpoints';
import { getAuthHeaders } from '@/modules/accounts/utils/fetch.client';

/**
 * Build query string from widget params
 * @param params Widget parameters
 * @returns URL query string
 */
const buildWidgetQuery = (params: WidgetParams): string => {
  const searchParams = new URLSearchParams();
  searchParams.set('connection_id', String(params.connection_id));
  if (params.product_id) searchParams.set('product_id', params.product_id);
  if (params.top !== undefined) searchParams.set('top', String(params.top));
  if (params.lookback_days !== undefined) searchParams.set('lookback_days', String(params.lookback_days));
  if (params.method) searchParams.set('method', params.method);
  if (params.min_price_increase !== undefined) searchParams.set('min_price_increase_percent', String(params.min_price_increase));
  if (params.style) searchParams.set('style', params.style);
  if (params.device) searchParams.set('device', params.device);
  if (params.columns !== undefined) searchParams.set('columns', String(params.columns));
  if (params.size) searchParams.set('size', params.size);
  if (params.primary_color) searchParams.set('primary_color', params.primary_color);
  if (params.text_color) searchParams.set('text_color', params.text_color);
  if (params.bg_color) searchParams.set('bg_color', params.bg_color);
  if (params.border_radius) searchParams.set('border_radius', params.border_radius);
  return searchParams.toString();
};

/**
 * Fetch HTML widget from a component endpoint
 * Uses plain fetch() + getAuthHeaders() because these endpoints return HTML, not JSON
 * @param baseUrl The component endpoint URL
 * @param params Widget parameters
 * @returns Promise with widget response
 */
const fetchWidget = async (baseUrl: string, params: WidgetParams): Promise<WidgetResponse> => {
  try {
    const query = buildWidgetQuery(params);
    const url = `${baseUrl}?${query}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: errorText || `Request failed with status ${response.status}`,
      };
    }

    // Check Content-Type to distinguish HTML from JSON (waiting_for_data response)
    const contentType = response.headers.get('content-type') || '';
    const body = await response.text();

    if (contentType.includes('application/json')) {
      // Backend returned a JSON status (e.g., waiting_for_data for ingest connections with no data)
      try {
        const json = JSON.parse(body);
        return {
          success: false,
          status: json.status,
          error: json.message || 'Unknown status',
        };
      } catch {
        return { success: false, error: body };
      }
    }

    return {
      success: true,
      html: body,
      error: undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch widget',
    };
  }
};

/**
 * Fetch bestsellers HTML widget
 * @param params Widget parameters
 * @returns Promise with widget response containing HTML
 */
export const getBestsellersWidget = async (params: WidgetParams): Promise<WidgetResponse> => {
  return fetchWidget(COMPONENT_ENDPOINTS.BESTSELLERS, params);
};

/**
 * Fetch cross-sell HTML widget
 * @param params Widget parameters (product_id required)
 * @returns Promise with widget response containing HTML
 */
export const getCrossSellWidget = async (params: WidgetParams): Promise<WidgetResponse> => {
  return fetchWidget(COMPONENT_ENDPOINTS.CROSS_SELL, params);
};

/**
 * Fetch upsell HTML widget
 * @param params Widget parameters (product_id required)
 * @returns Promise with widget response containing HTML
 */
export const getUpsellWidget = async (params: WidgetParams): Promise<WidgetResponse> => {
  return fetchWidget(COMPONENT_ENDPOINTS.UPSELL, params);
};

/**
 * Fetch similar products HTML widget
 * @param params Widget parameters (product_id required)
 * @returns Promise with widget response containing HTML
 */
export const getSimilarWidget = async (params: WidgetParams): Promise<WidgetResponse> => {
  return fetchWidget(COMPONENT_ENDPOINTS.SIMILAR, params);
};
