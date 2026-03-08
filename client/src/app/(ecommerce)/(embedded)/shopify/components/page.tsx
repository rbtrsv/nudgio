/**
 * Shopify Embedded App — Components Page
 *
 * Polaris web component version of (standalone)/components/page.tsx.
 * Runs inside the Shopify Admin iframe.
 *
 * Widget type selector + configuration inputs + generate button.
 * Live preview via iframe (srcdoc) — NOT dangerouslySetInnerHTML
 * (Polaris shadow DOM may interfere with widget styles).
 *
 * Preview only — no embed code section.
 * Embed code / storefront delivery is deferred to Stage 3
 * (requires App Proxy + HMAC verification + Theme App Extension).
 *
 * No connection selector — connection is auto-resolved from Shopify session token.
 *
 * Backend: /server/apps/ecommerce/subrouters/shopify_embedded_subrouter.py
 * - GET /shopify/embedded/components/bestsellers
 * - GET /shopify/embedded/components/cross-sell
 * - GET /shopify/embedded/components/upsell
 * - GET /shopify/embedded/components/similar
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useEmbedded } from '../layout';
import {
  getComponentHtml,
  getProducts,
  type EmbeddedProduct,
} from '@/modules/ecommerce/service/shopify-embedded.service';

// ==========================================
// Types
// ==========================================

type WidgetType = 'bestsellers' | 'cross-sell' | 'upsell' | 'similar';

// ==========================================
// Components Page
// ==========================================

export default function ShopifyComponentsPage() {
  const { getSessionToken, isLoading: contextLoading, error: contextError } = useEmbedded();

  // Widget config state
  const [widgetType, setWidgetType] = useState<WidgetType>('bestsellers');
  const [productId, setProductId] = useState('');
  const [top, setTop] = useState(4);
  const [lookbackDays, setLookbackDays] = useState(30);
  const [method, setMethod] = useState<'volume' | 'value' | 'balanced'>('volume');
  const [minPriceIncrease, setMinPriceIncrease] = useState(10);
  const [style, setStyle] = useState<'card' | 'carousel'>('card');
  const [columns, setColumns] = useState(4);
  const [size, setSize] = useState<'compact' | 'default' | 'spacious'>('default');
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [textColor, setTextColor] = useState('#1F2937');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [borderRadius, setBorderRadius] = useState('8px');

  // Product dropdown state
  const [products, setProducts] = useState<EmbeddedProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsFetched, setProductsFetched] = useState(false);
  // Ref guard to prevent duplicate fetch calls during render cycles
  const fetchingRef = useRef(false);

  // Preview state
  const [html, setHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived flags
  const needsProductId = widgetType !== 'bestsellers';
  const needsMethod = widgetType === 'bestsellers';
  const needsMinPriceIncrease = widgetType === 'upsell';

  // ==========================================
  // Fetch products for dropdown (once, when first needed)
  // ==========================================

  // ⚠️ Product fetch must surface errors to the UI — never silently swallow.
  // A silent catch leaves the dropdown stuck on "Loading products..." forever.
  // Fetch products when a product-specific widget type is selected
  useEffect(() => {
    if (!needsProductId || productsFetched || fetchingRef.current) return;

    const fetchProducts = async () => {
      fetchingRef.current = true;
      setProductsLoading(true);
      try {
        const token = await getSessionToken();
        const result = await getProducts(token);
        setProducts(result.products);
        setProductsFetched(true);
      } catch (err) {
        console.error('Failed to fetch products:', err);
        setError(err instanceof Error ? err.message : 'Failed to load products');
      } finally {
        setProductsLoading(false);
        fetchingRef.current = false;
      }
    };

    fetchProducts();
  }, [needsProductId, productsFetched, getSessionToken]);

  // ==========================================
  // Generate preview
  // ==========================================

  const handleGenerate = async () => {
    if (needsProductId && !productId) {
      setError('Product ID is required');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const token = await getSessionToken();
      const result = await getComponentHtml(token, widgetType, {
        product_id: needsProductId ? productId : undefined,
        top,
        lookback_days: lookbackDays,
        method: needsMethod ? method : undefined,
        min_price_increase_percent: needsMinPriceIncrease ? minPriceIncrease : undefined,
        style,
        columns,
        size,
        primary_color: primaryColor,
        text_color: textColor,
        bg_color: bgColor,
        border_radius: borderRadius,
      });

      setHtml(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate widget';
      setError(message);
      console.error('Component generate error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // Loading / Error — context level
  // ==========================================

  if (contextLoading) {
    return (
      <s-page heading="Components">
        <s-section heading="Loading...">
          <s-spinner />
        </s-section>
      </s-page>
    );
  }

  if (contextError) {
    return (
      <s-page heading="Components">
        <s-section>
          <s-banner tone="critical" heading="Error">
            <s-paragraph>{contextError}</s-paragraph>
          </s-banner>
        </s-section>
      </s-page>
    );
  }

  return (
    <s-page heading="Components">

      {/* Top spacer — breathing room between page heading and first section */}
      <s-box paddingBlockStart="base" />

      {/* Widget Configuration Section */}
      <s-section heading="Widget Configuration">
        <s-box padding="base">
          <s-stack direction="block" gap="base">

            {/* Widget Type */}
            <s-select
              label="Widget Type"
              value={widgetType}
              onChange={(e) => setWidgetType(e.currentTarget.value as WidgetType)}
            >
              <s-option value="bestsellers">Bestsellers</s-option>
              <s-option value="cross-sell">Cross-Sell</s-option>
              <s-option value="upsell">Upsell</s-option>
              <s-option value="similar">Similar Products</s-option>
            </s-select>

            {/* Product dropdown — shown for cross-sell, upsell, similar */}
            {needsProductId && (
              <>
                <s-banner tone="info">
                  <s-paragraph>
                    On your storefront, this widget type automatically detects the current product
                    via Theme Editor. The dropdown below is for preview purposes only.
                  </s-paragraph>
                </s-banner>

                <s-select
                  label="Product"
                  value={productId}
                  onChange={(e) => setProductId(e.currentTarget.value)}
                  disabled={productsLoading || undefined}
                >
                  <s-option value="">
                    {productsLoading ? 'Loading products...' : productsFetched ? 'Select a product' : 'Failed to load — retry'}
                  </s-option>
                  {products.map((p) => (
                    <s-option key={p.product_id} value={p.product_id}>
                      {p.title}
                    </s-option>
                  ))}
                </s-select>
              </>
            )}

            {/* Items to Show */}
            <s-number-field
              label="Items to Show"
              min={1}
              max={20}
              step={1}
              value={String(top)}
              onChange={(e) => {
                const val = parseInt(e.currentTarget.value, 10);
                if (!isNaN(val)) setTop(val);
              }}
            />

            {/* Lookback Days */}
            <s-number-field
              label="Lookback Days"
              min={1}
              max={3650}
              step={1}
              value={String(lookbackDays)}
              onChange={(e) => {
                const val = parseInt(e.currentTarget.value, 10);
                if (!isNaN(val)) setLookbackDays(val);
              }}
            />

            {/* Method — only for bestsellers */}
            {needsMethod && (
              <s-select
                label="Method"
                value={method}
                onChange={(e) => setMethod(e.currentTarget.value as 'volume' | 'value' | 'balanced')}
              >
                <s-option value="volume">Volume</s-option>
                <s-option value="value">Value</s-option>
                <s-option value="balanced">Balanced</s-option>
              </s-select>
            )}

            {/* Min Price Increase — only for upsell */}
            {needsMinPriceIncrease && (
              <s-number-field
                label="Min Price Increase (%)"
                min={0}
                max={500}
                step={1}
                value={String(minPriceIncrease)}
                onChange={(e) => {
                  const val = parseInt(e.currentTarget.value, 10);
                  if (!isNaN(val)) setMinPriceIncrease(val);
                }}
              />
            )}

            {/* Style */}
            <s-select
              label="Style"
              value={style}
              onChange={(e) => setStyle(e.currentTarget.value as 'card' | 'carousel')}
            >
              <s-option value="card">Card Grid</s-option>
              <s-option value="carousel">Carousel</s-option>
            </s-select>

            {/* Columns */}
            <s-number-field
              label="Columns"
              min={2}
              max={6}
              step={1}
              value={String(columns)}
              onChange={(e) => {
                const val = parseInt(e.currentTarget.value, 10);
                if (!isNaN(val)) setColumns(val);
              }}
              details="Max columns at full width. Responsive: 1 col mobile → 2 col tablet → N col desktop."
            />

            {/* Size */}
            <s-select
              label="Size"
              value={size}
              onChange={(e) => setSize(e.currentTarget.value as 'compact' | 'default' | 'spacious')}
              details="Controls text, padding, and gap proportionally."
            >
              <s-option value="compact">Compact</s-option>
              <s-option value="default">Default</s-option>
              <s-option value="spacious">Spacious</s-option>
            </s-select>

            {/* Colors */}
            <s-text-field
              label="Primary Color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.currentTarget.value)}
              details="Hex color code (e.g. #3B82F6)"
            />

            <s-text-field
              label="Text Color"
              value={textColor}
              onChange={(e) => setTextColor(e.currentTarget.value)}
              details="Hex color code (e.g. #1F2937)"
            />

            <s-text-field
              label="Background Color"
              value={bgColor}
              onChange={(e) => setBgColor(e.currentTarget.value)}
              details="Hex color code (e.g. #FFFFFF)"
            />

            <s-text-field
              label="Border Radius"
              value={borderRadius}
              onChange={(e) => setBorderRadius(e.currentTarget.value)}
              details="CSS value (e.g. 8px)"
            />

            {/* Generate Button */}
            <s-button
              variant="primary"
              onClick={handleGenerate}
              disabled={isLoading || (needsProductId && !productId) || undefined}
            >
              {isLoading ? 'Generating...' : 'Generate Preview'}
            </s-button>

          </s-stack>
        </s-box>
      </s-section>

      {/* Error Banner */}
      {error && (
        <s-section>
          <s-banner tone="critical" heading="Error">
            <s-paragraph>{error}</s-paragraph>
          </s-banner>
        </s-section>
      )}

      {/* Live Preview — rendered in iframe to isolate widget styles */}
      {html && (
        <s-section heading="Live Preview">
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <iframe
              srcDoc={html}
              style={{
                width: '100%',
                minHeight: '400px',
                border: 'none',
              }}
              title="Widget Preview"
            />
          </s-box>

          {/* Storefront delivery instructions */}
          <s-banner tone="info" heading="Add to Your Storefront">
            <s-paragraph>
              To display this widget on your storefront, go to Online Store → Customize,
              then add the "Nudgio Recommendations" block to any section on your product or collection pages.
            </s-paragraph>
          </s-banner>
        </s-section>
      )}

      {/* Bottom spacer — breathing room after last section */}
      <s-box paddingBlockEnd="base" />

    </s-page>
  );
}
