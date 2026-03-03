'use client';

import { useState, useCallback } from 'react';
import { useConnections } from '@/modules/ecommerce/hooks/use-connections';
import { useComponents, type WidgetType } from '@/modules/ecommerce/hooks/use-components';
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
  const [style, setStyle] = useState<'card' | 'carousel' | 'list'>('card');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [textColor, setTextColor] = useState('#1F2937');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [borderRadius, setBorderRadius] = useState('8px');
  const [copied, setCopied] = useState(false);

  const needsProductId = widgetType !== 'bestsellers';

  const handleGenerate = async () => {
    if (!activeConnectionId) return;
    if (needsProductId && !productId) return;

    await fetchWidget(widgetType, {
      connection_id: activeConnectionId,
      product_id: needsProductId ? productId : undefined,
      top,
      style,
      device,
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

              {/* Product ID — shown when needed */}
              {needsProductId && (
                <div className="space-y-2">
                  <Label>Product ID</Label>
                  <Input value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="Enter product ID" />
                </div>
              )}

              {/* Number of items */}
              <div className="space-y-2">
                <Label>Items to Show</Label>
                <Input type="number" min={1} max={20} value={top} onChange={(e) => setTop(parseInt(e.target.value) || 4)} />
              </div>

              {/* Style */}
              <div className="space-y-2">
                <Label>Style</Label>
                <Select value={style} onValueChange={(v) => setStyle(v as 'card' | 'carousel' | 'list')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="carousel">Carousel</SelectItem>
                    <SelectItem value="list">List</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Device */}
              <div className="space-y-2">
                <Label>Device</Label>
                <Select value={device} onValueChange={(v) => setDevice(v as 'desktop' | 'mobile')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desktop">Desktop</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
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
