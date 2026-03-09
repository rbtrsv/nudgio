'use client';

import { useState, useCallback } from 'react';
import { type WidgetParams } from '../schemas/components.schemas';
import {
  getBestsellersWidget,
  getCrossSellWidget,
  getUpsellWidget,
  getSimilarWidget,
} from '../service/components.service';

/**
 * Widget type identifier for selecting which component to fetch
 */
export type WidgetType = 'bestsellers' | 'cross-sell' | 'upsell' | 'similar';

/**
 * Default values — only include data attributes that differ from these
 */
const EMBED_DEFAULTS: Record<string, string> = {
  top: '4',
  style: 'card',
  columns: '4',
  size: 'default',
  'primary-color': '#3B82F6',
  'text-color': '#1F2937',
  'bg-color': '#FFFFFF',
  'border-radius': '8px',
  'cta-text': 'View',
  'show-price': 'true',
  'image-aspect': 'square',
  'lookback-days': '30',
  method: 'volume',
  'min-price-increase': '10',
};

/**
 * Stateless hook for fetching embeddable HTML widget components
 *
 * No store/provider needed — uses local useState for loading/error/html.
 * Wraps service calls and provides a clean API.
 */
export function useComponents() {
  const [html, setHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Backend status for non-error states (e.g., "waiting_for_data" for ingest connections with no data)
  const [status, setStatus] = useState<string | null>(null);

  /**
   * Fetch a widget by type
   * @param type Widget type
   * @param params Widget parameters
   */
  const fetchWidget = useCallback(async (type: WidgetType, params: WidgetParams) => {
    setIsLoading(true);
    setError(null);
    setStatus(null);

    try {
      let response;

      switch (type) {
        case 'bestsellers':
          response = await getBestsellersWidget(params);
          break;
        case 'cross-sell':
          response = await getCrossSellWidget(params);
          break;
        case 'upsell':
          response = await getUpsellWidget(params);
          break;
        case 'similar':
          response = await getSimilarWidget(params);
          break;
      }

      if (response.success && response.html) {
        setHtml(response.html);
      } else if (response.status === 'waiting_for_data') {
        // Ingest connection with no data — not an error, just a state
        setStatus('waiting_for_data');
        setHtml(null);
      } else {
        setError(response.error || 'Failed to fetch widget');
        setHtml(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setHtml(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Generate a universal embed code snippet using data-attribute based widget.js loader.
   *
   * Takes widget config + API key ID + server URL. Returns a <div> + <script> snippet
   * that works on any website (no platform plugin required).
   *
   * Only includes data attributes that differ from defaults to minimize snippet size.
   * product_id is intentionally omitted — user adds per page.
   *
   * @param keyId Widget API key ID (from WidgetAPIKey model)
   * @param serverUrl Nudgio server URL (e.g., "https://server.nudgio.tech")
   * @param widgetType Widget type: bestsellers, cross-sell, upsell, similar
   * @param config Widget configuration values
   * @returns Embed code string
   */
  const generateEmbedCode = useCallback((
    keyId: number,
    serverUrl: string,
    widgetType: WidgetType,
    config: {
      top?: number;
      style?: string;
      columns?: number;
      size?: string;
      primaryColor?: string;
      textColor?: string;
      bgColor?: string;
      borderRadius?: string;
      widgetTitle?: string;
      ctaText?: string;
      showPrice?: boolean;
      imageAspect?: string;
      lookbackDays?: number;
      method?: string;
      minPriceIncrease?: number;
    },
  ): string => {
    // Build data attributes — only include non-default values
    const attrs: string[] = [
      `data-key-id="${keyId}"`,
      `data-type="${widgetType}"`,
    ];

    const attrMap: Record<string, string> = {
      top: String(config.top ?? 4),
      style: config.style ?? 'card',
      columns: String(config.columns ?? 4),
      size: config.size ?? 'default',
      'primary-color': config.primaryColor ?? '#3B82F6',
      'text-color': config.textColor ?? '#1F2937',
      'bg-color': config.bgColor ?? '#FFFFFF',
      'border-radius': config.borderRadius ?? '8px',
      'cta-text': config.ctaText ?? 'View',
      'show-price': String(config.showPrice ?? true),
      'image-aspect': config.imageAspect ?? 'square',
      'lookback-days': String(config.lookbackDays ?? 30),
      method: config.method ?? 'volume',
      'min-price-increase': String(config.minPriceIncrease ?? 10),
    };

    // widget-title has no default (empty = auto) — only include if user set one
    if (config.widgetTitle) {
      attrs.push(`data-widget-title="${config.widgetTitle}"`);
    }

    for (const [key, value] of Object.entries(attrMap)) {
      if (value !== EMBED_DEFAULTS[key]) {
        attrs.push(`data-${key}="${value}"`);
      }
    }

    const attrStr = attrs.join('\n     ');

    return `<!-- Nudgio Recommendation Widget -->\n<div class="nudgio-widget"\n     ${attrStr}>\n</div>\n<script src="${serverUrl}/ecommerce/static/widget.js" async defer></script>`;
  }, []);

  return {
    html,
    isLoading,
    error,
    status,
    fetchWidget,
    generateEmbedCode,
  };
}

export default useComponents;
