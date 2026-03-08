'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConnections } from '@/modules/ecommerce/hooks/use-ecommerce-connections';
import { useComponents, type WidgetType } from '@/modules/ecommerce/hooks/use-components';
import { getProducts, type DataProduct } from '@/modules/ecommerce/service/data.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/modules/shadcnui/components/ui/card';
import { Button } from '@/modules/shadcnui/components/ui/button';
import { Input } from '@/modules/shadcnui/components/ui/input';
import { Label } from '@/modules/shadcnui/components/ui/label';
import { Alert, AlertDescription } from '@/modules/shadcnui/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/modules/shadcnui/components/ui/select';
import { Textarea } from '@/modules/shadcnui/components/ui/textarea';
import { Loader2, LayoutGrid, Copy, CheckCircle } from 'lucide-react';

export default function ComponentsPage() {
  const { connections, activeConnectionId, setActiveConnection } = useConnections();
  const { html, isLoading, error, fetchWidget, generateEmbedCode } = useComponents();

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
  const [copied, setCopied] = useState(false);

  // Product dropdown state (for cross-sell, upsell, similar widget types)
  const [products, setProducts] = useState<DataProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsFetched, setProductsFetched] = useState(false);

  const needsProductId = widgetType !== 'bestsellers';
  const needsLookback = widgetType === 'bestsellers' || widgetType === 'cross-sell';
  const needsMethod = widgetType === 'bestsellers';
  const needsMinPriceIncrease = widgetType === 'upsell';

  // Fetch products when a non-bestseller widget type is selected and connection is active
  useEffect(() => {
    if (!needsProductId || !activeConnectionId || productsFetched) return;

    const fetchProductList = async () => {
      setProductsLoading(true);
      const response = await getProducts(activeConnectionId);
      setProducts(response.products);
      setProductsFetched(true);
      setProductsLoading(false);
    };

    fetchProductList();
  }, [needsProductId, activeConnectionId, productsFetched]);

  // Reset fetched state when connection changes (need to re-fetch for new connection)
  useEffect(() => {
    setProductsFetched(false);
    setProducts([]);
    setProductId('');
  }, [activeConnectionId]);

  const handleGenerate = async () => {
    if (!activeConnectionId) return;
    if (needsProductId && !productId) return;

    await fetchWidget(widgetType, {
      connection_id: activeConnectionId,
      product_id: needsProductId ? productId : undefined,
      top,
      lookback_days: needsLookback ? lookbackDays : undefined,
      method: needsMethod ? method : undefined,
      min_price_increase: needsMinPriceIncrease ? minPriceIncrease : undefined,
      style,
      columns,
      size,
      primary_color: primaryColor,
      text_color: textColor,
      bg_color: bgColor,
      border_radius: borderRadius,
    });
  };

  const handleCopy = useCallback(() => {
    const code = generateEmbedCode();
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generateEmbedCode]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Components</h1>
        <p className="text-muted-foreground">
          Generate and preview embeddable recommendation widgets
        </p>
      </div>

      {/* Connection Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
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

      {/* Widget Configuration */}
      {activeConnectionId && (
        <Card>
          <CardHeader>
            <CardTitle>Widget Configuration</CardTitle>
            <CardDescription>Customize the appearance and behavior of your widget</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Widget Type */}
              <div className="space-y-2">
                <Label>Widget Type</Label>
                <Select value={widgetType} onValueChange={(v) => setWidgetType(v as WidgetType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bestsellers">Bestsellers</SelectItem>
                    <SelectItem value="cross-sell">Cross-Sell</SelectItem>
                    <SelectItem value="upsell">Upsell</SelectItem>
                    <SelectItem value="similar">Similar Products</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Product — dropdown shown when needed (cross-sell, upsell, similar) */}
              {needsProductId && (
                <div className="space-y-2">
                  <Label>Product</Label>
                  <Select value={productId} onValueChange={(v) => setProductId(v)} disabled={productsLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder={productsLoading ? 'Loading products...' : 'Select a product'} />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.product_id} value={p.product_id}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Number of items */}
              <div className="space-y-2">
                <Label>Items to Show</Label>
                <Input type="number" min={1} max={20} value={top} onChange={(e) => setTop(parseInt(e.target.value) || 4)} />
              </div>

              {/* Lookback Days — only for bestsellers and cross-sell (order-based algorithms) */}
              {needsLookback && (
                <div className="space-y-2">
                  <Label>Lookback Days</Label>
                  <Input type="number" min={1} max={3650} value={lookbackDays} onChange={(e) => setLookbackDays(parseInt(e.target.value) || 30)} />
                </div>
              )}

              {/* Method — only for bestsellers */}
              {needsMethod && (
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select value={method} onValueChange={(v) => setMethod(v as 'volume' | 'value' | 'balanced')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="volume">Volume</SelectItem>
                      <SelectItem value="value">Value</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Min Price Increase — only for upsell */}
              {needsMinPriceIncrease && (
                <div className="space-y-2">
                  <Label>Min Price Increase (%)</Label>
                  <Input type="number" min={0} max={500} value={minPriceIncrease} onChange={(e) => setMinPriceIncrease(parseInt(e.target.value) || 10)} />
                </div>
              )}

              {/* Style */}
              <div className="space-y-2">
                <Label>Style</Label>
                <Select value={style} onValueChange={(v) => setStyle(v as 'card' | 'carousel')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">Card Grid</SelectItem>
                    <SelectItem value="carousel">Carousel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Columns */}
              <div className="space-y-2">
                <Label>Columns</Label>
                <Input type="number" min={2} max={6} value={columns} onChange={(e) => setColumns(parseInt(e.target.value) || 4)} />
                <p className="text-xs text-muted-foreground">Max columns at full width (2–6). Responsive: 1→2→N.</p>
              </div>

              {/* Size */}
              <div className="space-y-2">
                <Label>Size</Label>
                <Select value={size} onValueChange={(v) => setSize(v as 'compact' | 'default' | 'spacious')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="spacious">Spacious</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Colors */}
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex gap-2">
                  <Input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-12 h-9 p-1" />
                  <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Text Color</Label>
                <div className="flex gap-2">
                  <Input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-12 h-9 p-1" />
                  <Input value={textColor} onChange={(e) => setTextColor(e.target.value)} className="flex-1" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Background Color</Label>
                <div className="flex gap-2">
                  <Input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-12 h-9 p-1" />
                  <Input value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="flex-1" />
                </div>
              </div>

              {/* Border Radius */}
              <div className="space-y-2">
                <Label>Border Radius</Label>
                <Input value={borderRadius} onChange={(e) => setBorderRadius(e.target.value)} placeholder="8px" />
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={isLoading || (needsProductId && !productId)}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Preview'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Live Preview */}
      {html && (
        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
            <CardDescription>This is how the widget will look on your site</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="border rounded-lg p-4 overflow-auto"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </CardContent>
        </Card>
      )}

      {/* Embed Code */}
      {html && (
        <Card>
          <CardHeader>
            <CardTitle>Embed Code</CardTitle>
            <CardDescription>Copy and paste this code into your website</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              readOnly
              value={generateEmbedCode() || ''}
              rows={6}
              className="font-mono text-sm"
            />
            <Button variant="outline" onClick={handleCopy}>
              {copied ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
