'use client';

import { useEffect, useState } from 'react';
import { useConnections } from '@/modules/ecommerce/hooks/use-ecommerce-connections';
import { useSettings } from '@/modules/ecommerce/hooks/use-recommendation-settings';
import { type BestsellerMethod } from '@/modules/ecommerce/schemas/recommendation-settings.schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/modules/shadcnui/components/ui/card';
import { Button } from '@/modules/shadcnui/components/ui/button';
import { Input } from '@/modules/shadcnui/components/ui/input';
import { Label } from '@/modules/shadcnui/components/ui/label';
import { Alert, AlertDescription } from '@/modules/shadcnui/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/modules/shadcnui/components/ui/select';
import { Checkbox } from '@/modules/shadcnui/components/ui/checkbox';
import { Loader2, Settings } from 'lucide-react';

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

  // Local form state
  const [defaultLimit, setDefaultLimit] = useState(10);
  const [defaultLookbackDays, setDefaultLookbackDays] = useState(30);
  const [bestsellerMethod, setBestsellerMethod] = useState<BestsellerMethod>('volume');
  const [crossSellEnabled, setCrossSellEnabled] = useState(true);
  const [upsellEnabled, setUpsellEnabled] = useState(true);
  const [similarProductsEnabled, setSimilarProductsEnabled] = useState(true);
  const [minUpsellPriceIncrease, setMinUpsellPriceIncrease] = useState(10);
  const [cacheRecommendations, setCacheRecommendations] = useState(true);
  const [cacheDurationMinutes, setCacheDurationMinutes] = useState(60);
  const [shopBaseUrl, setShopBaseUrl] = useState('');
  const [productUrlTemplate, setProductUrlTemplate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Populate form when settings are loaded
  useEffect(() => {
    if (currentSettings) {
      setDefaultLimit(currentSettings.default_limit);
      setDefaultLookbackDays(currentSettings.default_lookback_days);
      setBestsellerMethod(currentSettings.bestseller_method);
      setCrossSellEnabled(currentSettings.cross_sell_enabled);
      setUpsellEnabled(currentSettings.upsell_enabled);
      setSimilarProductsEnabled(currentSettings.similar_products_enabled);
      setMinUpsellPriceIncrease(currentSettings.min_upsell_price_increase);
      setCacheRecommendations(currentSettings.cache_recommendations);
      setCacheDurationMinutes(currentSettings.cache_duration_minutes);
      setShopBaseUrl(currentSettings.shop_base_url || '');
      setProductUrlTemplate(currentSettings.product_url_template || '');
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
      const success = await createOrUpdateSettings(activeConnectionId, {
        connection_id: activeConnectionId,
        default_limit: defaultLimit,
        default_lookback_days: defaultLookbackDays,
        bestseller_method: bestsellerMethod,
        cross_sell_enabled: crossSellEnabled,
        upsell_enabled: upsellEnabled,
        similar_products_enabled: similarProductsEnabled,
        min_upsell_price_increase: minUpsellPriceIncrease,
        cache_recommendations: cacheRecommendations,
        cache_duration_minutes: cacheDurationMinutes,
        shop_base_url: shopBaseUrl || null,
        product_url_template: productUrlTemplate || null,
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
                    {conn.connection_name} ({conn.platform})
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
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Default parameters for recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="default-limit">Default Limit (1-100)</Label>
                  <Input
                    id="default-limit"
                    type="number"
                    min={1}
                    max={100}
                    value={defaultLimit}
                    onChange={(e) => setDefaultLimit(parseInt(e.target.value) || 10)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default-lookback">Lookback Days (1-365)</Label>
                  <Input
                    id="default-lookback"
                    type="number"
                    min={1}
                    max={365}
                    value={defaultLookbackDays}
                    onChange={(e) => setDefaultLookbackDays(parseInt(e.target.value) || 30)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bestseller-method">Bestseller Method</Label>
                <Select
                  value={bestsellerMethod}
                  onValueChange={(value) => setBestsellerMethod(value as BestsellerMethod)}
                >
                  <SelectTrigger id="bestseller-method" className="w-full sm:w-60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="volume">Volume (sales count)</SelectItem>
                    <SelectItem value="value">Value (revenue)</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommendation Types</CardTitle>
              <CardDescription>Enable or disable recommendation types</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cross-sell"
                  checked={crossSellEnabled}
                  onCheckedChange={(checked) => setCrossSellEnabled(checked === true)}
                />
                <Label htmlFor="cross-sell">Cross-sell recommendations</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="upsell"
                  checked={upsellEnabled}
                  onCheckedChange={(checked) => setUpsellEnabled(checked === true)}
                />
                <Label htmlFor="upsell">Upsell recommendations</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="similar"
                  checked={similarProductsEnabled}
                  onCheckedChange={(checked) => setSimilarProductsEnabled(checked === true)}
                />
                <Label htmlFor="similar">Similar product recommendations</Label>
              </div>
              <div className="space-y-2 pt-2">
                <Label htmlFor="min-upsell">Min Upsell Price Increase (%)</Label>
                <Input
                  id="min-upsell"
                  type="number"
                  min={0}
                  max={1000}
                  value={minUpsellPriceIncrease}
                  onChange={(e) => setMinUpsellPriceIncrease(parseInt(e.target.value) || 0)}
                  className="w-full sm:w-40"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Caching</CardTitle>
              <CardDescription>Control recommendation caching behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cache"
                  checked={cacheRecommendations}
                  onCheckedChange={(checked) => setCacheRecommendations(checked === true)}
                />
                <Label htmlFor="cache">Cache recommendations</Label>
              </div>
              {cacheRecommendations && (
                <div className="space-y-2">
                  <Label htmlFor="cache-duration">Cache Duration (minutes)</Label>
                  <Input
                    id="cache-duration"
                    type="number"
                    min={1}
                    value={cacheDurationMinutes}
                    onChange={(e) => setCacheDurationMinutes(parseInt(e.target.value) || 60)}
                    className="w-full sm:w-40"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shop URLs</CardTitle>
              <CardDescription>Configure product URL generation</CardDescription>
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
