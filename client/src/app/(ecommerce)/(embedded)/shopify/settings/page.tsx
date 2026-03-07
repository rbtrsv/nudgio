/**
 * Shopify Embedded App — Settings Page
 *
 * Polaris web component version of (standalone)/settings/page.tsx.
 * Runs inside the Shopify Admin iframe.
 *
 * 5 algorithm fields (shop URLs excluded — Shopify provides these automatically):
 * - bestseller_method — select (volume, value, balanced)
 * - bestseller_lookback_days — number input
 * - crosssell_lookback_days — number input
 * - max_recommendations — number input
 * - min_price_increase_percent — number input
 *
 * No connection selector — connection is auto-resolved from Shopify session token.
 * Save feedback uses shopify.toast.show() (App Bridge toast).
 *
 * Backend: /server/apps/ecommerce/subrouters/shopify_embedded_subrouter.py
 * - GET  /shopify/embedded/settings
 * - PUT  /shopify/embedded/settings
 * - POST /shopify/embedded/settings/reset
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useEmbedded } from '../layout';
import {
  getSettings,
  updateSettings,
  resetSettings,
  type EmbeddedSettingsDetail,
  type EmbeddedSettingsPayload,
} from '@/modules/ecommerce/service/shopify-embedded.service';

// ==========================================
// Loading State
// ==========================================

function SettingsSkeleton() {
  return (
    <s-page heading="Settings">
      <s-section heading="Loading settings...">
        <s-spinner />
      </s-section>
    </s-page>
  );
}

// ==========================================
// Error State
// ==========================================

function SettingsError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <s-page heading="Settings">
      <s-section>
        <s-banner tone="critical" heading="Failed to load settings">
          <s-paragraph>{error}</s-paragraph>
          <s-button slot="secondary-actions" onClick={onRetry}>
            Retry
          </s-button>
        </s-banner>
      </s-section>
    </s-page>
  );
}

// ==========================================
// Settings Page
// ==========================================

export default function ShopifySettingsPage() {
  const { getSessionToken, isLoading: contextLoading, error: contextError } = useEmbedded();

  // Settings data from API
  const [settings, setSettings] = useState<EmbeddedSettingsDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Local form state — matches backend RecommendationSettings model fields
  const [bestsellerMethod, setBestsellerMethod] = useState('volume');
  const [bestsellerLookbackDays, setBestsellerLookbackDays] = useState(30);
  const [crosssellLookbackDays, setCrosssellLookbackDays] = useState(30);
  const [maxRecommendations, setMaxRecommendations] = useState(10);
  const [minPriceIncreasePercent, setMinPriceIncreasePercent] = useState(10);

  // Action states
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // ==========================================
  // Populate form when settings are loaded
  // ==========================================

  useEffect(() => {
    if (settings) {
      setBestsellerMethod(settings.bestseller_method);
      setBestsellerLookbackDays(settings.bestseller_lookback_days);
      setCrosssellLookbackDays(settings.crosssell_lookback_days);
      setMaxRecommendations(settings.max_recommendations);
      setMinPriceIncreasePercent(settings.min_price_increase_percent);
    }
  }, [settings]);

  // ==========================================
  // Fetch settings on mount
  // ==========================================

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = await getSessionToken();
      const response = await getSettings(token);

      if (response.success && response.data) {
        setSettings(response.data);
      } else if (response.error) {
        setError(response.error);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load settings';
      setError(message);
      console.error('Settings fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getSessionToken]);

  // Fetch settings once context is ready (not loading, no context error)
  useEffect(() => {
    if (!contextLoading && !contextError) {
      fetchSettings();
    }
  }, [contextLoading, contextError, fetchSettings]);

  // ==========================================
  // Save settings
  // ==========================================

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const token = await getSessionToken();
      const payload: EmbeddedSettingsPayload = {
        bestseller_method: bestsellerMethod,
        bestseller_lookback_days: bestsellerLookbackDays,
        crosssell_lookback_days: crosssellLookbackDays,
        max_recommendations: maxRecommendations,
        min_price_increase_percent: minPriceIncreasePercent,
      };

      const response = await updateSettings(token, payload);

      if (response.success && response.data) {
        setSettings(response.data);
        // App Bridge toast for save feedback
        window.shopify?.toast.show('Settings saved');
      } else if (response.error) {
        window.shopify?.toast.show('Failed to save settings', { isError: true });
      }
    } catch (err) {
      console.error('Settings save error:', err);
      window.shopify?.toast.show('Failed to save settings', { isError: true });
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // Reset settings to defaults
  // ==========================================

  const handleReset = async () => {
    try {
      setIsResetting(true);

      const token = await getSessionToken();
      await resetSettings(token);

      // Re-fetch to get default values
      await fetchSettings();

      window.shopify?.toast.show('Settings reset to defaults');
    } catch (err) {
      console.error('Settings reset error:', err);
      window.shopify?.toast.show('Failed to reset settings', { isError: true });
    } finally {
      setIsResetting(false);
    }
  };

  // ==========================================
  // Render
  // ==========================================

  // Loading state — show spinner while fetching settings
  if (contextLoading || isLoading) {
    return <SettingsSkeleton />;
  }

  // Error state — show error banner with retry button
  if (contextError || error) {
    return (
      <SettingsError
        error={contextError || error || 'Unknown error'}
        onRetry={fetchSettings}
      />
    );
  }

  return (
    <s-page heading="Settings">

      {/* Top spacer — breathing room between page heading and first section */}
      <s-box paddingBlockStart="base" />

      {/* Algorithm Configuration Section */}
      <s-section heading="Algorithm Configuration">
        <s-box padding="base">
          <s-stack direction="block" gap="base">

            {/* Bestseller Method — select dropdown */}
            <s-select
              label="Bestseller Method"
              value={bestsellerMethod}
              onChange={(e) => setBestsellerMethod(e.currentTarget.value)}
            >
              <s-option value="volume">Volume (sales count)</s-option>
              <s-option value="value">Value (revenue)</s-option>
              <s-option value="balanced">Balanced</s-option>
            </s-select>

            {/* Max Recommendations — number input */}
            <s-number-field
              label="Max Recommendations"
              min={1}
              max={100}
              step={1}
              value={String(maxRecommendations)}
              onChange={(e) => {
                const val = parseInt(e.currentTarget.value, 10);
                if (!isNaN(val)) setMaxRecommendations(val);
              }}
            />

            {/* Bestseller Lookback Days — number input */}
            <s-number-field
              label="Bestseller Lookback Days"
              min={1}
              max={365}
              step={1}
              value={String(bestsellerLookbackDays)}
              onChange={(e) => {
                const val = parseInt(e.currentTarget.value, 10);
                if (!isNaN(val)) setBestsellerLookbackDays(val);
              }}
            />

            {/* Cross-sell Lookback Days — number input */}
            <s-number-field
              label="Cross-sell Lookback Days"
              min={1}
              max={365}
              step={1}
              value={String(crosssellLookbackDays)}
              onChange={(e) => {
                const val = parseInt(e.currentTarget.value, 10);
                if (!isNaN(val)) setCrosssellLookbackDays(val);
              }}
            />

            {/* Min Upsell Price Increase — number input */}
            <s-number-field
              label="Min Upsell Price Increase (%)"
              min={0}
              max={1000}
              step={1}
              value={String(minPriceIncreasePercent)}
              onChange={(e) => {
                const val = parseInt(e.currentTarget.value, 10);
                if (!isNaN(val)) setMinPriceIncreasePercent(val);
              }}
            />

          </s-stack>
        </s-box>
      </s-section>

      {/* Save / Reset Buttons */}
      <s-section>
        <s-stack direction="inline" gap="base">
          <s-button
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || undefined}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </s-button>
          <s-button
            onClick={handleReset}
            disabled={isResetting || undefined}
          >
            {isResetting ? 'Resetting...' : 'Reset to Defaults'}
          </s-button>
        </s-stack>
      </s-section>

      {/* Bottom spacer — breathing room after last section */}
      <s-box paddingBlockEnd="base" />

    </s-page>
  );
}
