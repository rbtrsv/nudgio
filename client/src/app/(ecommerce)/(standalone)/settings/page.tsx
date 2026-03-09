'use client';

import { useEffect, useState } from 'react';
import { useConnections } from '@/modules/ecommerce/hooks/use-ecommerce-connections';
import { useSettings } from '@/modules/ecommerce/hooks/use-recommendation-settings';
import { type BestsellerMethod } from '@/modules/ecommerce/schemas/recommendation-settings.schemas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/modules/shadcnui/components/ui/card';
import { Button } from '@/modules/shadcnui/components/ui/button';
import { Input } from '@/modules/shadcnui/components/ui/input';
import { Label } from '@/modules/shadcnui/components/ui/label';
import { Alert, AlertDescription } from '@/modules/shadcnui/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/modules/shadcnui/components/ui/select';
import { Loader2, Settings } from 'lucide-react';
import { getPlatformLabel } from '@/modules/ecommerce/utils/format-utils';

export default function SettingsPage() {
  const { connections, activeConnectionId, setActiveConnection } = useConnections();
  const {
    currentSettings,
    isLoading,
    error,
    fetchSettings,
    createOrUpdateSettings,
    resetSettings,
  } = useSettings();

  // Local form state — matches backend RecommendationSettings model fields
  const [bestsellerMethod, setBestsellerMethod] = useState<BestsellerMethod>('volume');
  const [bestsellerLookbackDays, setBestsellerLookbackDays] = useState(30);
  const [crosssellLookbackDays, setCrosssellLookbackDays] = useState(30);
  const [maxRecommendations, setMaxRecommendations] = useState(10);
  const [minPriceIncreasePercent, setMinPriceIncreasePercent] = useState(10);
  const [shopBaseUrl, setShopBaseUrl] = useState('');
  const [productUrlTemplate, setProductUrlTemplate] = useState('');

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

  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Populate form when settings are loaded
  useEffect(() => {
    if (currentSettings) {
      // Algorithm fields
      setBestsellerMethod(currentSettings.bestseller_method);
      setBestsellerLookbackDays(currentSettings.bestseller_lookback_days);
      setCrosssellLookbackDays(currentSettings.crosssell_lookback_days);
      setMaxRecommendations(currentSettings.max_recommendations);
      setMinPriceIncreasePercent(currentSettings.min_price_increase_percent);
      setShopBaseUrl(currentSettings.shop_base_url || '');
      setProductUrlTemplate(currentSettings.product_url_template || '');
      // Brand identity visual fields — use DB value if saved, else keep hardcoded default
      if (currentSettings.widget_style) setWidgetStyle(currentSettings.widget_style as 'card' | 'carousel');
      if (currentSettings.widget_columns != null) setWidgetColumns(currentSettings.widget_columns);
      if (currentSettings.widget_size) setWidgetSize(currentSettings.widget_size as 'compact' | 'default' | 'spacious');
      if (currentSettings.primary_color) setPrimaryColor(currentSettings.primary_color);
      if (currentSettings.text_color) setTextColor(currentSettings.text_color);
      if (currentSettings.bg_color) setBgColor(currentSettings.bg_color);
      if (currentSettings.border_radius) setBorderRadius(currentSettings.border_radius);
      if (currentSettings.cta_text) setCtaText(currentSettings.cta_text);
      if (currentSettings.show_price != null) setShowPrice(currentSettings.show_price);
      if (currentSettings.image_aspect) setImageAspect(currentSettings.image_aspect as 'square' | 'portrait' | 'landscape');
      if (currentSettings.widget_title != null) setWidgetTitle(currentSettings.widget_title);
    }
  }, [currentSettings]);

  // Fetch settings when connection changes
  useEffect(() => {
    if (activeConnectionId) {
      fetchSettings(activeConnectionId);
    }
  }, [activeConnectionId, fetchSettings]);

  const handleSave = async () => {
    if (!activeConnectionId) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // connection_id is passed via URL path, not in the body
      const success = await createOrUpdateSettings(activeConnectionId, {
        // Algorithm fields
        bestseller_method: bestsellerMethod,
        bestseller_lookback_days: bestsellerLookbackDays,
        crosssell_lookback_days: crosssellLookbackDays,
        max_recommendations: maxRecommendations,
        min_price_increase_percent: minPriceIncreasePercent,
        shop_base_url: shopBaseUrl || null,
        product_url_template: productUrlTemplate || null,
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
      });

      if (success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!activeConnectionId) return;

    setIsResetting(true);
    try {
      await resetSettings(activeConnectionId);
      // Re-fetch to update form
      await fetchSettings(activeConnectionId);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure recommendation settings for your connections
        </p>
      </div>

      {/* Connection Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Select Connection
          </CardTitle>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <p className="text-muted-foreground">No connections available. Create a connection first.</p>
          ) : (
            <Select
              value={activeConnectionId ? String(activeConnectionId) : ''}
              onValueChange={(value) => setActiveConnection(parseInt(value))}
            >
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue placeholder="Select a connection" />
              </SelectTrigger>
              <SelectContent>
                {connections.map((conn) => (
                  <SelectItem key={conn.id} value={String(conn.id)}>
                    {conn.connection_name} ({getPlatformLabel(conn.platform)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {saveSuccess && (
        <Alert>
          <AlertDescription>Settings saved successfully!</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Settings Form */}
      {activeConnectionId && !isLoading && (
        <>
          {/* Algorithm Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Algorithm Configuration</CardTitle>
              <CardDescription>Configure recommendation algorithm parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bestseller-method">Bestseller Method</Label>
                  <Select
                    value={bestsellerMethod}
                    onValueChange={(value) => setBestsellerMethod(value as BestsellerMethod)}
                  >
                    <SelectTrigger id="bestseller-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="volume">Volume (sales count)</SelectItem>
                      <SelectItem value="value">Value (revenue)</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-recommendations">Max Recommendations (1-100)</Label>
                  <Input
                    id="max-recommendations"
                    type="number"
                    min={1}
                    max={100}
                    value={maxRecommendations}
                    onChange={(e) => setMaxRecommendations(parseInt(e.target.value) || 10)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bestseller-lookback">Bestseller Lookback Days (1-365)</Label>
                  <Input
                    id="bestseller-lookback"
                    type="number"
                    min={1}
                    max={365}
                    value={bestsellerLookbackDays}
                    onChange={(e) => setBestsellerLookbackDays(parseInt(e.target.value) || 30)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crosssell-lookback">Cross-sell Lookback Days (1-365)</Label>
                  <Input
                    id="crosssell-lookback"
                    type="number"
                    min={1}
                    max={365}
                    value={crosssellLookbackDays}
                    onChange={(e) => setCrosssellLookbackDays(parseInt(e.target.value) || 30)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min-price-increase">Min Upsell Price Increase (%)</Label>
                  <Input
                    id="min-price-increase"
                    type="number"
                    min={0}
                    max={1000}
                    value={minPriceIncreasePercent}
                    onChange={(e) => setMinPriceIncreasePercent(parseInt(e.target.value) || 0)}
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shop URLs */}
          <Card>
            <CardHeader>
              <CardTitle>Shop URLs</CardTitle>
              <CardDescription>Configure product URL generation for HTML components</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shop-base-url">Shop Base URL</Label>
                <Input
                  id="shop-base-url"
                  value={shopBaseUrl}
                  onChange={(e) => setShopBaseUrl(e.target.value)}
                  placeholder="https://mystore.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-url-template">Product URL Template</Label>
                <Input
                  id="product-url-template"
                  value={productUrlTemplate}
                  onChange={(e) => setProductUrlTemplate(e.target.value)}
                  placeholder="/products/{handle}"
                />
              </div>
            </CardContent>
          </Card>

          {/* Brand Identity */}
          <Card>
            <CardHeader>
              <CardTitle>Brand Identity</CardTitle>
              <CardDescription>Default visual settings for recommendation widgets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">

                {/* Layout Style */}
                <div className="space-y-2">
                  <Label htmlFor="widget-style">Layout Style</Label>
                  <Select
                    value={widgetStyle}
                    onValueChange={(value) => setWidgetStyle(value as 'card' | 'carousel')}
                  >
                    <SelectTrigger id="widget-style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">Card Grid</SelectItem>
                      <SelectItem value="carousel">Carousel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Columns */}
                <div className="space-y-2">
                  <Label htmlFor="widget-columns">Columns (2-6)</Label>
                  <Input
                    id="widget-columns"
                    type="number"
                    min={2}
                    max={6}
                    value={widgetColumns}
                    onChange={(e) => setWidgetColumns(parseInt(e.target.value) || 4)}
                  />
                  <p className="text-xs text-muted-foreground">Max columns at full width. Responsive: 1 col mobile, 2 col tablet, N col desktop.</p>
                </div>

                {/* Size */}
                <div className="space-y-2">
                  <Label htmlFor="widget-size">Size</Label>
                  <Select
                    value={widgetSize}
                    onValueChange={(value) => setWidgetSize(value as 'compact' | 'default' | 'spacious')}
                  >
                    <SelectTrigger id="widget-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="spacious">Spacious</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Controls text, padding, and gap proportionally.</p>
                </div>

                {/* Primary Color */}
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <Input
                    id="primary-color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#3B82F6"
                  />
                </div>

                {/* Text Color */}
                <div className="space-y-2">
                  <Label htmlFor="text-color">Text Color</Label>
                  <Input
                    id="text-color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    placeholder="#1F2937"
                  />
                </div>

                {/* Background Color */}
                <div className="space-y-2">
                  <Label htmlFor="bg-color">Background Color</Label>
                  <Input
                    id="bg-color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    placeholder="#FFFFFF"
                  />
                </div>

                {/* Border Radius */}
                <div className="space-y-2">
                  <Label htmlFor="border-radius">Border Radius</Label>
                  <Input
                    id="border-radius"
                    value={borderRadius}
                    onChange={(e) => setBorderRadius(e.target.value)}
                    placeholder="8px"
                  />
                  <p className="text-xs text-muted-foreground">CSS value (e.g. 8px, 0.5rem, 0).</p>
                </div>

                {/* Widget Title */}
                <div className="space-y-2">
                  <Label htmlFor="widget-title">Widget Title</Label>
                  <Input
                    id="widget-title"
                    value={widgetTitle}
                    onChange={(e) => setWidgetTitle(e.target.value)}
                    placeholder="Leave empty for auto-default"
                  />
                  <p className="text-xs text-muted-foreground">Leave empty for auto-default based on widget type.</p>
                </div>

                {/* CTA Text */}
                <div className="space-y-2">
                  <Label htmlFor="cta-text">Button Text</Label>
                  <Input
                    id="cta-text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="View"
                  />
                  <p className="text-xs text-muted-foreground">Call-to-action button text (e.g. View, Shop Now, Add to Cart).</p>
                </div>

                {/* Image Aspect Ratio */}
                <div className="space-y-2">
                  <Label htmlFor="image-aspect">Image Aspect Ratio</Label>
                  <Select
                    value={imageAspect}
                    onValueChange={(value) => setImageAspect(value as 'square' | 'portrait' | 'landscape')}
                  >
                    <SelectTrigger id="image-aspect">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="square">Square (1:1)</SelectItem>
                      <SelectItem value="portrait">Portrait (3:4)</SelectItem>
                      <SelectItem value="landscape">Landscape (16:9)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>

              {/* Show Price — full width toggle below the grid */}
              <div className="flex items-center space-x-2">
                <input
                  id="show-price"
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="show-price">Show Price</Label>
              </div>

            </CardContent>
          </Card>

          {/* Save / Reset Buttons */}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={isResetting}>
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset to Defaults'
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
