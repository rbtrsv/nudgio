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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/modules/shadcnui/components/ui/tabs';
import {
  Loader2,
  PlugZap,
  CheckCircle,
  XCircle,
  Trash2,
  AlertTriangle,
  Package,
  ShoppingCart,
  Settings,
  Eye,
  EyeOff,
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
    updateConnection,
    fetchConnections,
  } = useConnections();

  const { connectionStats, fetchConnectionStats } = useAnalytics();

  const connection = connections.find((c) => c.id === connectionId);

  // Settings state — Connection Details
  const [editConnectionName, setEditConnectionName] = useState('');
  const [editStoreUrl, setEditStoreUrl] = useState('');
  const [editApiKey, setEditApiKey] = useState('');
  const [editApiSecret, setEditApiSecret] = useState('');
  const [editDbHost, setEditDbHost] = useState('');
  const [editDbName, setEditDbName] = useState('');
  const [editDbUser, setEditDbUser] = useState('');
  const [editDbPassword, setEditDbPassword] = useState('');
  const [editDbPort, setEditDbPort] = useState('');

  // Settings state — Password visibility toggles
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [showDbPassword, setShowDbPassword] = useState(false);

  // Settings state — Actions
  const [isUpdating, setIsUpdating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Initialize edit form when connection loads
  useEffect(() => {
    if (connection) {
      setEditConnectionName(connection.connection_name);
      setEditStoreUrl(connection.store_url || '');
      // api_key, api_secret, db_password are not exposed by backend — leave empty
      // User can fill them to update, or leave empty to keep current values
      setEditApiKey('');
      setEditApiSecret('');
      setEditDbHost(connection.db_host || '');
      setEditDbName(connection.db_name || '');
      setEditDbUser(connection.db_user || '');
      setEditDbPassword('');
      setEditDbPort(connection.db_port ? String(connection.db_port) : '');
    }
  }, [connection]);

  // Fetch connections on mount (store may be empty on direct navigation)
  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Fetch stats for this connection (only if active — inactive connections have no stats)
  useEffect(() => {
    if (connectionId && connection?.is_active) {
      fetchConnectionStats(connectionId).catch(() => {
        // Stats fetch failure is non-critical
      });
    }
  }, [connectionId, connection?.is_active, fetchConnectionStats]);

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

  // Delete confirmation uses connection name
  const deleteConfirmTarget = connection.connection_name;

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-0">
      {/* Header */}
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

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">
            <PlugZap className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* ========== OVERVIEW TAB ========== */}
        <TabsContent value="overview" className="space-y-4">
          {/* Connection Information */}
          <Card>
            <CardHeader>
              <CardTitle>Connection Information</CardTitle>
              <CardDescription>Details about this connection</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Platform</p>
                <p className="text-lg font-medium capitalize">{connection.platform}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Connection Method</p>
                <p className="text-lg font-medium uppercase">{connection.connection_method}</p>
              </div>
              {/* API connection fields */}
              {connection.connection_method === 'api' && connection.store_url && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Store URL</p>
                  <p className="text-lg font-medium">{connection.store_url}</p>
                </div>
              )}
              {/* Database connection fields */}
              {connection.connection_method === 'database' && (
                <>
                  {connection.db_host && (
                    <div>
                      <p className="text-sm text-muted-foreground">Database Host</p>
                      <p className="text-lg font-medium">{connection.db_host}</p>
                    </div>
                  )}
                  {connection.db_port && (
                    <div>
                      <p className="text-sm text-muted-foreground">Port</p>
                      <p className="text-lg font-medium">{connection.db_port}</p>
                    </div>
                  )}
                  {connection.db_name && (
                    <div>
                      <p className="text-sm text-muted-foreground">Database Name</p>
                      <p className="text-lg font-medium">{connection.db_name}</p>
                    </div>
                  )}
                  {connection.db_user && (
                    <div>
                      <p className="text-sm text-muted-foreground">Database User</p>
                      <p className="text-lg font-medium">{connection.db_user}</p>
                    </div>
                  )}
                </>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-lg font-medium">{new Date(connection.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Updated</p>
                <p className="text-lg font-medium">
                  {connection.updated_at ? new Date(connection.updated_at).toLocaleDateString() : '—'}
                </p>
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
                    // Refresh connections to update is_active status
                    await fetchConnections();
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
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ========== SETTINGS TAB ========== */}
        <TabsContent value="settings" className="space-y-4">
          {/* Connection Details */}
          <Card>
            <CardHeader>
              <CardTitle>Connection Details</CardTitle>
              <CardDescription>Update connection name and credentials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-connection-name">Connection Name</Label>
                <Input
                  id="edit-connection-name"
                  value={editConnectionName}
                  onChange={(e) => setEditConnectionName(e.target.value)}
                />
              </div>

              {/* API connection fields */}
              {connection.connection_method === 'api' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-store-url">Store URL</Label>
                    <Input
                      id="edit-store-url"
                      value={editStoreUrl}
                      onChange={(e) => setEditStoreUrl(e.target.value)}
                      placeholder="https://mystore.com"
                    />
                  </div>
                  {/* WooCommerce needs both api_key (consumer_key) and api_secret (consumer_secret) */}
                  {connection.platform === 'woocommerce' && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-api-key">Consumer Key</Label>
                      <div className="relative">
                        <Input
                          id="edit-api-key"
                          type={showApiKey ? 'text' : 'password'}
                          value={editApiKey}
                          onChange={(e) => setEditApiKey(e.target.value)}
                          placeholder="Leave empty to keep current value"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                          tabIndex={-1}
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="edit-api-secret">
                      {connection.platform === 'woocommerce'
                        ? 'Consumer Secret'
                        : connection.platform === 'shopify'
                          ? 'Access Token'
                          : 'Access Token'}
                    </Label>
                    <div className="relative">
                      <Input
                        id="edit-api-secret"
                        type={showApiSecret ? 'text' : 'password'}
                        value={editApiSecret}
                        onChange={(e) => setEditApiSecret(e.target.value)}
                        placeholder="Leave empty to keep current value"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiSecret(!showApiSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                        tabIndex={-1}
                      >
                        {showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Database connection fields */}
              {connection.connection_method === 'database' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-db-host">Database Host</Label>
                      <Input
                        id="edit-db-host"
                        value={editDbHost}
                        onChange={(e) => setEditDbHost(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-db-port">Port</Label>
                      <Input
                        id="edit-db-port"
                        type="number"
                        value={editDbPort}
                        onChange={(e) => setEditDbPort(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-db-name">Database Name</Label>
                    <Input
                      id="edit-db-name"
                      value={editDbName}
                      onChange={(e) => setEditDbName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-db-user">Database User</Label>
                      <Input
                        id="edit-db-user"
                        value={editDbUser}
                        onChange={(e) => setEditDbUser(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-db-password">Database Password</Label>
                      <div className="relative">
                        <Input
                          id="edit-db-password"
                          type={showDbPassword ? 'text' : 'password'}
                          value={editDbPassword}
                          onChange={(e) => setEditDbPassword(e.target.value)}
                          placeholder="Leave empty to keep current value"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowDbPassword(!showDbPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                          tabIndex={-1}
                        >
                          {showDbPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button
            onClick={async () => {
              setIsUpdating(true);
              try {
                // Build update payload — only include non-empty fields
                const updateData: Record<string, string | number | null | undefined> = {};
                updateData.connection_name = editConnectionName || undefined;

                if (connection.connection_method === 'api') {
                  updateData.store_url = editStoreUrl || undefined;
                  // Only send credentials if user typed something (empty = keep current)
                  if (editApiKey) updateData.api_key = editApiKey;
                  if (editApiSecret) updateData.api_secret = editApiSecret;
                } else {
                  updateData.db_host = editDbHost || undefined;
                  updateData.db_name = editDbName || undefined;
                  updateData.db_user = editDbUser || undefined;
                  if (editDbPassword) updateData.db_password = editDbPassword;
                  updateData.db_port = editDbPort ? parseInt(editDbPort, 10) : undefined;
                }

                await updateConnection(connectionId, updateData);
                // Refresh list data after update to keep store in sync
                await fetchConnections();
              } finally {
                setIsUpdating(false);
              }
            }}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>

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
                    Type <span className="font-semibold">{deleteConfirmTarget}</span> to confirm
                  </Label>
                  <Input
                    id="confirm-delete"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Connection name"
                  />
                </div>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (deleteConfirmText !== deleteConfirmTarget) return;
                    setIsDeleting(true);
                    try {
                      const success = await deleteConnection(connectionId);
                      if (success) {
                        await fetchConnections();
                        router.push('/connections');
                      }
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  disabled={isDeleting || deleteConfirmText !== deleteConfirmTarget}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
