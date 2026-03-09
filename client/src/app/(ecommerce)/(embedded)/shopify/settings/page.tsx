/**
 * Shopify Embedded App — Settings Page
 *
 * Polaris web component version of (standalone)/settings/page.tsx.
 * Runs inside the Shopify Admin iframe.
 *
 * Algorithm fields (shop URLs excluded — Shopify provides these automatically):
 * - bestseller_method — select (volume, value, balanced)
 * - bestseller_lookback_days — number input
 * - crosssell_lookback_days — number input
 * - max_recommendations — number input
 * - min_price_increase_percent — number input
 *
 * Brand identity visual fields (saved as defaults for widget rendering):
 * - widget_style, widget_columns, widget_size
 * - primary_color, text_color, bg_color, border_radius
 * - cta_text, show_price, image_aspect, widget_title
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

  // Local form state — algorithm fields
  const [bestsellerMethod, setBestsellerMethod] = useState('volume');
  const [bestsellerLookbackDays, setBestsellerLookbackDays] = useState(30);
  const [crosssellLookbackDays, setCrosssellLookbackDays] = useState(30);
  const [maxRecommendations, setMaxRecommendations] = useState(10);
  const [minPriceIncreasePercent, setMinPriceIncreasePercent] = useState(10);

  // Local form state — brand identity visual fields
  const [widgetStyle, setWidgetStyle] = useState<'card' | 'carousel'>('card');
  const [widgetColumns, setWidgetColumns] = useState(4);
  const [widgetSize, setWidgetSize] = useState<'compact' | 'default' | 'spacious'>('default');
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [textColor, setTextColor] = useState('#1F2937');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [borderRadius, setBorderRadius] = useState('8px');
  const [ctaText, setCtaText] = useState('View');
  const [showPrice, setShowPrice] = useState(true);
  const [imageAspect, setImageAspect] = useState<'square' | 'portrait' | 'landscape'>('square');
  const [widgetTitle, setWidgetTitle] = useState('');

  // Action states
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // ==========================================
  // Populate form when settings are loaded
  // ==========================================

  useEffect(() => {
    if (settings) {
      // Algorithm fields
      setBestsellerMethod(settings.bestseller_method);
      setBestsellerLookbackDays(settings.bestseller_lookback_days);
      setCrosssellLookbackDays(settings.crosssell_lookback_days);
      setMaxRecommendations(settings.max_recommendations);
      setMinPriceIncreasePercent(settings.min_price_increase_percent);
      // Brand identity visual fields — use DB value if saved, else keep hardcoded default
      if (settings.widget_style) setWidgetStyle(settings.widget_style as 'card' | 'carousel');
      if (settings.widget_columns != null) setWidgetColumns(settings.widget_columns);
      if (settings.widget_size) setWidgetSize(settings.widget_size as 'compact' | 'default' | 'spacious');
      if (settings.primary_color) setPrimaryColor(settings.primary_color);
      if (settings.text_color) setTextColor(settings.text_color);
      if (settings.bg_color) setBgColor(settings.bg_color);
      if (settings.border_radius) setBorderRadius(settings.border_radius);
      if (settings.cta_text) setCtaText(settings.cta_text);
      if (settings.show_price != null) setShowPrice(settings.show_price);
      if (settings.image_aspect) setImageAspect(settings.image_aspect as 'square' | 'portrait' | 'landscape');
      if (settings.widget_title != null) setWidgetTitle(settings.widget_title);
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
        // Algorithm fields
        bestseller_method: bestsellerMethod,
        bestseller_lookback_days: bestsellerLookbackDays,
        crosssell_lookback_days: crosssellLookbackDays,
        max_recommendations: maxRecommendations,
        min_price_increase_percent: minPriceIncreasePercent,
        // Brand identity visual fields
        widget_style: widgetStyle,
        widget_columns: widgetColumns,
        widget_size: widgetSize,
        primary_color: primaryColor,
        text_color: textColor,
        bg_color: bgColor,
        border_radius: borderRadius,
        cta_text: ctaText,
        show_price: showPrice,
        image_aspect: imageAspect,
        widget_title: widgetTitle || null,
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

      {/* Brand Identity Section */}
      <s-section heading="Brand Identity">
        <s-box padding="base">
          <s-stack direction="block" gap="base">

            {/* Widget Style — select dropdown */}
            <s-select
              label="Layout Style"
              value={widgetStyle}
              onChange={(e) => setWidgetStyle(e.currentTarget.value as 'card' | 'carousel')}
            >
              <s-option value="card">Card Grid</s-option>
              <s-option value="carousel">Carousel</s-option>
            </s-select>

            {/* Columns — number input */}
            <s-number-field
              label="Columns"
              min={2}
              max={6}
              step={1}
              value={String(widgetColumns)}
              onChange={(e) => {
                const val = parseInt(e.currentTarget.value, 10);
                if (!isNaN(val)) setWidgetColumns(val);
              }}
              details="Max columns at full width. Responsive: 1 col mobile → 2 col tablet → N col desktop."
            />

            {/* Size — select dropdown */}
            <s-select
              label="Size"
              value={widgetSize}
              onChange={(e) => setWidgetSize(e.currentTarget.value as 'compact' | 'default' | 'spacious')}
              details="Controls text, padding, and gap proportionally."
            >
              <s-option value="compact">Compact</s-option>
              <s-option value="default">Default</s-option>
              <s-option value="spacious">Spacious</s-option>
            </s-select>

            {/* Primary Color */}
            <s-text-field
              label="Primary Color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.currentTarget.value)}
              details="Hex color code (e.g. #3B82F6)"
            />

            {/* Text Color */}
            <s-text-field
              label="Text Color"
              value={textColor}
              onChange={(e) => setTextColor(e.currentTarget.value)}
              details="Hex color code (e.g. #1F2937)"
            />

            {/* Background Color */}
            <s-text-field
              label="Background Color"
              value={bgColor}
              onChange={(e) => setBgColor(e.currentTarget.value)}
              details="Hex color code (e.g. #FFFFFF)"
            />

            {/* Border Radius */}
            <s-text-field
              label="Border Radius"
              value={borderRadius}
              onChange={(e) => setBorderRadius(e.currentTarget.value)}
              details="CSS value (e.g. 8px)"
            />

            {/* Widget Title */}
            <s-text-field
              label="Widget Title"
              value={widgetTitle}
              onChange={(e) => setWidgetTitle(e.currentTarget.value)}
              details="Leave empty for auto-default based on widget type."
            />

            {/* CTA Text */}
            <s-text-field
              label="Button Text"
              value={ctaText}
              onChange={(e) => setCtaText(e.currentTarget.value)}
              details="Call-to-action button text (e.g. View, Shop Now, Add to Cart)."
            />

            {/* Show Price */}
            <s-checkbox
              label="Show Price"
              checked={showPrice || undefined}
              onChange={(e) => setShowPrice(e.currentTarget.checked)}
            />

            {/* Image Aspect Ratio */}
            <s-select
              label="Image Aspect Ratio"
              value={imageAspect}
              onChange={(e) => setImageAspect(e.currentTarget.value as 'square' | 'portrait' | 'landscape')}
            >
              <s-option value="square">Square (1:1)</s-option>
              <s-option value="portrait">Portrait (3:4)</s-option>
              <s-option value="landscape">Landscape (16:9)</s-option>
            </s-select>

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
