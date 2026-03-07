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
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Populate form when settings are loaded
  useEffect(() => {
    if (currentSettings) {
      setBestsellerMethod(currentSettings.bestseller_method);
      setBestsellerLookbackDays(currentSettings.bestseller_lookback_days);
      setCrosssellLookbackDays(currentSettings.crosssell_lookback_days);
      setMaxRecommendations(currentSettings.max_recommendations);
      setMinPriceIncreasePercent(currentSettings.min_price_increase_percent);
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
      // connection_id is passed via URL path, not in the body
      const success = await createOrUpdateSettings(activeConnectionId, {
        bestseller_method: bestsellerMethod,
        bestseller_lookback_days: bestsellerLookbackDays,
        crosssell_lookback_days: crosssellLookbackDays,
        max_recommendations: maxRecommendations,
        min_price_increase_percent: minPriceIncreasePercent,
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
