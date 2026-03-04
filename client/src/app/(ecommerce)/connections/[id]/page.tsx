'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useConnections } from '@/modules/ecommerce/hooks/use-ecommerce-connections';
import { useAnalytics } from '@/modules/ecommerce/hooks/use-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/modules/shadcnui/components/ui/card';
import { Alert, AlertDescription } from '@/modules/shadcnui/components/ui/alert';
import { Badge } from '@/modules/shadcnui/components/ui/badge';
import { Button } from '@/modules/shadcnui/components/ui/button';
import { Input } from '@/modules/shadcnui/components/ui/input';
import { Label } from '@/modules/shadcnui/components/ui/label';
import {
  Loader2,
  PlugZap,
  CheckCircle,
  XCircle,
  Trash2,
  AlertTriangle,
  Package,
  ShoppingCart,
  ListOrdered,
} from 'lucide-react';
import Link from 'next/link';

export default function ConnectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const connectionId = parseInt(params.id as string);

  const {
    connections,
    isLoading,
    error,
    deleteConnection,
    testConnection,
    fetchConnections,
  } = useConnections();

  const { connectionStats, fetchConnectionStats } = useAnalytics();

  const connection = connections.find((c) => c.id === connectionId);

  // Test connection state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Delete state
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  // Fetch stats for this connection
  useEffect(() => {
    if (connectionId) {
      fetchConnectionStats(connectionId).catch(() => {
        // Stats fetch failure is non-critical
      });
    }
  }, [connectionId, fetchConnectionStats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!connection) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Connection not found</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-0">
      <div>
        <Link href="/connections">
          <Button variant="ghost" size="sm" className="mb-2">
            ← Back to Connections
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <PlugZap className="h-8 w-8 hidden sm:block" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{connection.connection_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="capitalize">{connection.platform}</Badge>
              <Badge variant="outline" className="uppercase">{connection.connection_method}</Badge>
              <Badge variant={connection.is_active ? 'default' : 'secondary'}>
                {connection.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Info */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Information</CardTitle>
          <CardDescription>Details about this connection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* API connection fields */}
            {connection.connection_method === 'api' && connection.store_url && (
              <div>
                <p className="text-sm text-muted-foreground">Store URL</p>
                <p className="font-medium">{connection.store_url}</p>
              </div>
            )}
            {/* Database connection fields */}
            {connection.connection_method === 'database' && (
              <>
                {connection.db_host && (
                  <div>
                    <p className="text-sm text-muted-foreground">Database Host</p>
                    <p className="font-medium">{connection.db_host}</p>
                  </div>
                )}
                {connection.db_port && (
                  <div>
                    <p className="text-sm text-muted-foreground">Port</p>
                    <p className="font-medium">{connection.db_port}</p>
                  </div>
                )}
                {connection.db_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Database Name</p>
                    <p className="font-medium">{connection.db_name}</p>
                  </div>
                )}
                {connection.db_user && (
                  <div>
                    <p className="text-sm text-muted-foreground">Database User</p>
                    <p className="font-medium">{connection.db_user}</p>
                  </div>
                )}
              </>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">{new Date(connection.created_at).toLocaleDateString()}</p>
            </div>
            {connection.updated_at && (
              <div>
                <p className="text-sm text-muted-foreground">Updated</p>
                <p className="font-medium">{new Date(connection.updated_at).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Connection */}
      <Card>
        <CardHeader>
          <CardTitle>Test Connection</CardTitle>
          <CardDescription>Verify connectivity and sample data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {testResult && (
            <Alert variant={testResult.success ? 'default' : 'destructive'}>
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription>{testResult.message}</AlertDescription>
              </div>
            </Alert>
          )}
          <Button
            onClick={async () => {
              setIsTesting(true);
              setTestResult(null);
              try {
                const result = await testConnection(connectionId);
                setTestResult({
                  success: result.success,
                  message: result.success
                    ? `Connection successful! Found ${result.sample_products_count ?? 0} sample products.`
                    : result.message,
                });
              } catch {
                setTestResult({ success: false, message: 'Failed to test connection' });
              } finally {
                setIsTesting(false);
              }
            }}
            disabled={isTesting}
          >
            {isTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Data Stats */}
      {connectionStats && connectionStats.connection_id === connectionId && (
        <Card>
          <CardHeader>
            <CardTitle>Data Statistics</CardTitle>
            <CardDescription>Imported data summary</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{connectionStats.products_count}</p>
                  <p className="text-sm text-muted-foreground">Products</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{connectionStats.orders_count}</p>
                  <p className="text-sm text-muted-foreground">Orders</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ListOrdered className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{connectionStats.order_items_count}</p>
                  <p className="text-sm text-muted-foreground">Order Items</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-destructive p-4 space-y-4">
            <div>
              <h4 className="font-medium">Delete this connection</h4>
              <p className="text-sm text-muted-foreground">
                Once you delete a connection, there is no going back. This will permanently delete the connection, its settings, and all associated data.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-delete">
                Type <span className="font-semibold">{connection.connection_name}</span> to confirm
              </Label>
              <Input
                id="confirm-delete"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder="Connection name"
              />
            </div>
            <Button
              variant="destructive"
              onClick={async () => {
                if (deleteConfirmName !== connection.connection_name) {
                  return;
                }
                setIsDeleting(true);
                try {
                  const success = await deleteConnection(connectionId);
                  if (success) {
                    await fetchConnections();
                    router.push('/connections');
                  }
                } catch {
                  setIsDeleting(false);
                }
              }}
              disabled={isDeleting || deleteConfirmName !== connection.connection_name}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Connection
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
