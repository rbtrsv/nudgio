'use client';

import { useState, useCallback } from 'react';
import { type WidgetParams } from '../schemas/component.schema';
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
 * Stateless hook for fetching embeddable HTML widget components
 *
 * No store/provider needed — uses local useState for loading/error/html.
 * Wraps service calls and provides a clean API.
 */
export function useComponents() {
  const [html, setHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch a widget by type
   * @param type Widget type
   * @param params Widget parameters
   */
  const fetchWidget = useCallback(async (type: WidgetType, params: WidgetParams) => {
    setIsLoading(true);
    setError(null);

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
   * Generate an embed code snippet for the current widget HTML
   * @returns Embed code string or null if no HTML is loaded
   */
  const generateEmbedCode = useCallback((): string | null => {
    if (!html) return null;

    return `<!-- Nudgio Recommendation Widget -->\n<div class="nudgio-widget">\n${html}\n</div>`;
  }, [html]);

  return {
    html,
    isLoading,
    error,
    fetchWidget,
    generateEmbedCode,
  };
}

export default useComponents;
