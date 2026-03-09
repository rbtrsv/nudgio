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
 * Brand identity visual fields (35 settings, 8 groups — saved as defaults for widget rendering):
 * - Widget Container: widget_bg_color, widget_padding
 * - Widget Title: widget_title, title_color, title_size, title_alignment
 * - Layout: widget_style, widget_columns, gap
 * - Product Card: card_bg_color, card_border_radius, card_border_width, card_border_color, card_shadow, card_padding, card_hover
 * - Product Image: image_aspect, image_fit, image_radius
 * - Product Title: product_title_color, product_title_size, product_title_weight, product_title_lines, product_title_alignment
 * - Price: show_price, price_color, price_size
 * - CTA Button: button_text, button_bg_color, button_text_color, button_radius, button_size, button_variant, button_full_width
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

  // Local form state — brand identity visual fields (35 settings, 8 groups)
  // Group 1: Widget Container
  const [widgetBgColor, setWidgetBgColor] = useState('#FFFFFF');
  const [widgetPadding, setWidgetPadding] = useState('md');
  // Group 2: Widget Title
  const [widgetTitle, setWidgetTitle] = useState('');
  const [titleColor, setTitleColor] = useState('#111827');
  const [titleSize, setTitleSize] = useState('lg');
  const [titleAlignment, setTitleAlignment] = useState('left');
  // Group 3: Layout
  const [widgetStyle, setWidgetStyle] = useState<'grid' | 'carousel'>('grid');
  const [widgetColumns, setWidgetColumns] = useState(4);
  const [gap, setGap] = useState('md');
  // Group 4: Product Card
  const [cardBgColor, setCardBgColor] = useState('#FFFFFF');
  const [cardBorderRadius, setCardBorderRadius] = useState('8px');
  const [cardBorderWidth, setCardBorderWidth] = useState('1');
  const [cardBorderColor, setCardBorderColor] = useState('#E5E7EB');
  const [cardShadow, setCardShadow] = useState('sm');
  const [cardPadding, setCardPadding] = useState('md');
  const [cardHover, setCardHover] = useState('lift');
  // Group 5: Product Image
  const [imageAspect, setImageAspect] = useState<'square' | 'portrait' | 'landscape'>('square');
  const [imageFit, setImageFit] = useState('cover');
  const [imageRadius, setImageRadius] = useState('8px');
  // Group 6: Product Title in Card
  const [productTitleColor, setProductTitleColor] = useState('#1F2937');
  const [productTitleSize, setProductTitleSize] = useState('sm');
  const [productTitleWeight, setProductTitleWeight] = useState('medium');
  const [productTitleLines, setProductTitleLines] = useState(2);
  const [productTitleAlignment, setProductTitleAlignment] = useState('left');
  // Group 7: Price
  const [showPrice, setShowPrice] = useState(true);
  const [priceColor, setPriceColor] = useState('#111827');
  const [priceSize, setPriceSize] = useState('md');
  // Group 8: CTA Button
  const [buttonText, setButtonText] = useState('View');
  const [buttonBgColor, setButtonBgColor] = useState('#3B82F6');
  const [buttonTextColor, setButtonTextColor] = useState('#FFFFFF');
  const [buttonRadius, setButtonRadius] = useState('6px');
  const [buttonSize, setButtonSize] = useState('md');
  const [buttonVariant, setButtonVariant] = useState('solid');
  const [buttonFullWidth, setButtonFullWidth] = useState(false);

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
      // Group 1: Widget Container
      if (settings.widget_bg_color) setWidgetBgColor(settings.widget_bg_color);
      if (settings.widget_padding) setWidgetPadding(settings.widget_padding);
      // Group 2: Widget Title
      if (settings.widget_title != null) setWidgetTitle(settings.widget_title);
      if (settings.title_color) setTitleColor(settings.title_color);
      if (settings.title_size) setTitleSize(settings.title_size);
      if (settings.title_alignment) setTitleAlignment(settings.title_alignment);
      // Group 3: Layout
      if (settings.widget_style) setWidgetStyle(settings.widget_style as 'grid' | 'carousel');
      if (settings.widget_columns != null) setWidgetColumns(settings.widget_columns);
      if (settings.gap) setGap(settings.gap);
      // Group 4: Product Card
      if (settings.card_bg_color) setCardBgColor(settings.card_bg_color);
      if (settings.card_border_radius) setCardBorderRadius(settings.card_border_radius);
      if (settings.card_border_width) setCardBorderWidth(settings.card_border_width);
      if (settings.card_border_color) setCardBorderColor(settings.card_border_color);
      if (settings.card_shadow) setCardShadow(settings.card_shadow);
      if (settings.card_padding) setCardPadding(settings.card_padding);
      if (settings.card_hover) setCardHover(settings.card_hover);
      // Group 5: Product Image
      if (settings.image_aspect) setImageAspect(settings.image_aspect as 'square' | 'portrait' | 'landscape');
      if (settings.image_fit) setImageFit(settings.image_fit);
      if (settings.image_radius) setImageRadius(settings.image_radius);
      // Group 6: Product Title in Card
      if (settings.product_title_color) setProductTitleColor(settings.product_title_color);
      if (settings.product_title_size) setProductTitleSize(settings.product_title_size);
      if (settings.product_title_weight) setProductTitleWeight(settings.product_title_weight);
      if (settings.product_title_lines != null) setProductTitleLines(settings.product_title_lines);
      if (settings.product_title_alignment) setProductTitleAlignment(settings.product_title_alignment);
      // Group 7: Price
      if (settings.show_price != null) setShowPrice(settings.show_price);
      if (settings.price_color) setPriceColor(settings.price_color);
      if (settings.price_size) setPriceSize(settings.price_size);
      // Group 8: CTA Button
      if (settings.button_text) setButtonText(settings.button_text);
      if (settings.button_bg_color) setButtonBgColor(settings.button_bg_color);
      if (settings.button_text_color) setButtonTextColor(settings.button_text_color);
      if (settings.button_radius) setButtonRadius(settings.button_radius);
      if (settings.button_size) setButtonSize(settings.button_size);
      if (settings.button_variant) setButtonVariant(settings.button_variant);
      if (settings.button_full_width != null) setButtonFullWidth(settings.button_full_width);
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
        // Group 1: Widget Container
        widget_bg_color: widgetBgColor,
        widget_padding: widgetPadding,
        // Group 2: Widget Title
        widget_title: widgetTitle || null,
        title_color: titleColor,
        title_size: titleSize,
        title_alignment: titleAlignment,
        // Group 3: Layout
        widget_style: widgetStyle,
        widget_columns: widgetColumns,
        gap,
        // Group 4: Product Card
        card_bg_color: cardBgColor,
        card_border_radius: cardBorderRadius,
        card_border_width: cardBorderWidth,
        card_border_color: cardBorderColor,
        card_shadow: cardShadow,
        card_padding: cardPadding,
        card_hover: cardHover,
        // Group 5: Product Image
        image_aspect: imageAspect,
        image_fit: imageFit,
        image_radius: imageRadius,
        // Group 6: Product Title in Card
        product_title_color: productTitleColor,
        product_title_size: productTitleSize,
        product_title_weight: productTitleWeight,
        product_title_lines: productTitleLines,
        product_title_alignment: productTitleAlignment,
        // Group 7: Price
        show_price: showPrice,
        price_color: priceColor,
        price_size: priceSize,
        // Group 8: CTA Button
        button_text: buttonText,
        button_bg_color: buttonBgColor,
        button_text_color: buttonTextColor,
        button_radius: buttonRadius,
        button_size: buttonSize,
        button_variant: buttonVariant,
        button_full_width: buttonFullWidth,
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

      {/* Brand Identity — Group 1: Widget Container */}
      <s-section heading="Widget Container">
        <s-box padding="base">
          <s-stack direction="block" gap="base">
            <s-text-field label="Background Color" value={widgetBgColor} onChange={(e) => setWidgetBgColor(e.currentTarget.value)} details="Hex color (e.g. #FFFFFF)" />
            <s-select label="Padding" value={widgetPadding} onChange={(e) => setWidgetPadding(e.currentTarget.value)}>
              <s-option value="none">None</s-option>
              <s-option value="sm">Small</s-option>
              <s-option value="md">Medium</s-option>
              <s-option value="lg">Large</s-option>
            </s-select>
          </s-stack>
        </s-box>
      </s-section>

      {/* Brand Identity — Group 2: Widget Title */}
      <s-section heading="Widget Title">
        <s-box padding="base">
          <s-stack direction="block" gap="base">
            <s-text-field label="Title Text" value={widgetTitle} onChange={(e) => setWidgetTitle(e.currentTarget.value)} details="Leave empty for auto-default based on widget type." />
            <s-text-field label="Title Color" value={titleColor} onChange={(e) => setTitleColor(e.currentTarget.value)} details="Hex color (e.g. #111827)" />
            <s-select label="Title Size" value={titleSize} onChange={(e) => setTitleSize(e.currentTarget.value)}>
              <s-option value="sm">Small</s-option>
              <s-option value="md">Medium</s-option>
              <s-option value="lg">Large</s-option>
              <s-option value="xl">Extra Large</s-option>
            </s-select>
            <s-select label="Title Alignment" value={titleAlignment} onChange={(e) => setTitleAlignment(e.currentTarget.value)}>
              <s-option value="left">Left</s-option>
              <s-option value="center">Center</s-option>
            </s-select>
          </s-stack>
        </s-box>
      </s-section>

      {/* Brand Identity — Group 3: Layout */}
      <s-section heading="Layout">
        <s-box padding="base">
          <s-stack direction="block" gap="base">
            <s-select label="Layout Style" value={widgetStyle} onChange={(e) => setWidgetStyle(e.currentTarget.value as 'grid' | 'carousel')}>
              <s-option value="grid">Grid Cards</s-option>
              <s-option value="carousel">Carousel</s-option>
            </s-select>
            <s-number-field label="Columns" min={2} max={6} step={1} value={String(widgetColumns)} onChange={(e) => { const val = parseInt(e.currentTarget.value, 10); if (!isNaN(val)) setWidgetColumns(val); }} details="Max columns at full width. Responsive: 1 col mobile → 2 col tablet → N col desktop." />
            <s-select label="Card Gap" value={gap} onChange={(e) => setGap(e.currentTarget.value)}>
              <s-option value="sm">Small</s-option>
              <s-option value="md">Medium</s-option>
              <s-option value="lg">Large</s-option>
            </s-select>
          </s-stack>
        </s-box>
      </s-section>

      {/* Brand Identity — Group 4: Product Card */}
      <s-section heading="Product Card">
        <s-box padding="base">
          <s-stack direction="block" gap="base">
            <s-text-field label="Card Background" value={cardBgColor} onChange={(e) => setCardBgColor(e.currentTarget.value)} details="Hex color (e.g. #FFFFFF)" />
            <s-text-field label="Card Border Radius" value={cardBorderRadius} onChange={(e) => setCardBorderRadius(e.currentTarget.value)} details="CSS value (e.g. 8px)" />
            <s-select label="Card Border Width" value={cardBorderWidth} onChange={(e) => setCardBorderWidth(e.currentTarget.value)}>
              <s-option value="0">None</s-option>
              <s-option value="1">1px</s-option>
              <s-option value="2">2px</s-option>
            </s-select>
            <s-text-field label="Card Border Color" value={cardBorderColor} onChange={(e) => setCardBorderColor(e.currentTarget.value)} details="Hex color (e.g. #E5E7EB)" />
            <s-select label="Card Shadow" value={cardShadow} onChange={(e) => setCardShadow(e.currentTarget.value)}>
              <s-option value="none">None</s-option>
              <s-option value="sm">Small</s-option>
              <s-option value="md">Medium</s-option>
              <s-option value="lg">Large</s-option>
            </s-select>
            <s-select label="Card Padding" value={cardPadding} onChange={(e) => setCardPadding(e.currentTarget.value)}>
              <s-option value="sm">Small</s-option>
              <s-option value="md">Medium</s-option>
              <s-option value="lg">Large</s-option>
            </s-select>
            <s-select label="Card Hover Effect" value={cardHover} onChange={(e) => setCardHover(e.currentTarget.value)}>
              <s-option value="none">None</s-option>
              <s-option value="lift">Lift</s-option>
              <s-option value="shadow">Shadow</s-option>
              <s-option value="glow">Glow</s-option>
            </s-select>
          </s-stack>
        </s-box>
      </s-section>

      {/* Brand Identity — Group 5: Product Image */}
      <s-section heading="Product Image">
        <s-box padding="base">
          <s-stack direction="block" gap="base">
            <s-select label="Aspect Ratio" value={imageAspect} onChange={(e) => setImageAspect(e.currentTarget.value as 'square' | 'portrait' | 'landscape')}>
              <s-option value="square">Square (1:1)</s-option>
              <s-option value="portrait">Portrait (3:4)</s-option>
              <s-option value="landscape">Landscape (16:9)</s-option>
            </s-select>
            <s-select label="Image Fit" value={imageFit} onChange={(e) => setImageFit(e.currentTarget.value)}>
              <s-option value="cover">Cover (crop)</s-option>
              <s-option value="contain">Contain (fit)</s-option>
            </s-select>
            <s-text-field label="Image Border Radius" value={imageRadius} onChange={(e) => setImageRadius(e.currentTarget.value)} details="CSS value (e.g. 8px, 0)" />
          </s-stack>
        </s-box>
      </s-section>

      {/* Brand Identity — Group 6: Product Title */}
      <s-section heading="Product Title">
        <s-box padding="base">
          <s-stack direction="block" gap="base">
            <s-text-field label="Title Color" value={productTitleColor} onChange={(e) => setProductTitleColor(e.currentTarget.value)} details="Hex color (e.g. #1F2937)" />
            <s-select label="Title Size" value={productTitleSize} onChange={(e) => setProductTitleSize(e.currentTarget.value)}>
              <s-option value="xs">Extra Small</s-option>
              <s-option value="sm">Small</s-option>
              <s-option value="md">Medium</s-option>
              <s-option value="lg">Large</s-option>
            </s-select>
            <s-select label="Title Weight" value={productTitleWeight} onChange={(e) => setProductTitleWeight(e.currentTarget.value)}>
              <s-option value="normal">Normal</s-option>
              <s-option value="medium">Medium</s-option>
              <s-option value="semibold">Semibold</s-option>
              <s-option value="bold">Bold</s-option>
            </s-select>
            <s-number-field label="Max Lines" min={1} max={3} step={1} value={String(productTitleLines)} onChange={(e) => { const val = parseInt(e.currentTarget.value, 10); if (!isNaN(val)) setProductTitleLines(val); }} details="Product title truncation after N lines." />
            <s-select label="Title Alignment" value={productTitleAlignment} onChange={(e) => setProductTitleAlignment(e.currentTarget.value)}>
              <s-option value="left">Left</s-option>
              <s-option value="center">Center</s-option>
            </s-select>
          </s-stack>
        </s-box>
      </s-section>

      {/* Brand Identity — Group 7: Price */}
      <s-section heading="Price">
        <s-box padding="base">
          <s-stack direction="block" gap="base">
            <s-checkbox label="Show Price" checked={showPrice || undefined} onChange={(e) => setShowPrice(e.currentTarget.checked)} />
            <s-text-field label="Price Color" value={priceColor} onChange={(e) => setPriceColor(e.currentTarget.value)} details="Hex color (e.g. #111827)" />
            <s-select label="Price Size" value={priceSize} onChange={(e) => setPriceSize(e.currentTarget.value)}>
              <s-option value="sm">Small</s-option>
              <s-option value="md">Medium</s-option>
              <s-option value="lg">Large</s-option>
            </s-select>
          </s-stack>
        </s-box>
      </s-section>

      {/* Brand Identity — Group 8: CTA Button */}
      <s-section heading="CTA Button">
        <s-box padding="base">
          <s-stack direction="block" gap="base">
            <s-text-field label="Button Text" value={buttonText} onChange={(e) => setButtonText(e.currentTarget.value)} details="e.g. View, Shop Now, Add to Cart" />
            <s-text-field label="Button Color" value={buttonBgColor} onChange={(e) => setButtonBgColor(e.currentTarget.value)} details="Hex color (e.g. #3B82F6)" />
            <s-text-field label="Button Text Color" value={buttonTextColor} onChange={(e) => setButtonTextColor(e.currentTarget.value)} details="Hex color (e.g. #FFFFFF)" />
            <s-text-field label="Button Border Radius" value={buttonRadius} onChange={(e) => setButtonRadius(e.currentTarget.value)} details="CSS value (e.g. 6px, 9999px for pill)" />
            <s-select label="Button Size" value={buttonSize} onChange={(e) => setButtonSize(e.currentTarget.value)}>
              <s-option value="sm">Small</s-option>
              <s-option value="md">Medium</s-option>
              <s-option value="lg">Large</s-option>
            </s-select>
            <s-select label="Button Style" value={buttonVariant} onChange={(e) => setButtonVariant(e.currentTarget.value)}>
              <s-option value="solid">Solid (filled)</s-option>
              <s-option value="outline">Outline (border)</s-option>
              <s-option value="ghost">Ghost (transparent)</s-option>
            </s-select>
            <s-checkbox label="Full Width Button" checked={buttonFullWidth || undefined} onChange={(e) => setButtonFullWidth(e.currentTarget.checked)} />
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
