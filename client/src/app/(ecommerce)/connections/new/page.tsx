'use client';

import { useForm } from '@tanstack/react-form';
import { useRouter } from 'next/navigation';

import { useConnections } from '@/modules/ecommerce/hooks/use-ecommerce-connections';
import { CreateConnectionSchema, type PlatformType } from '@/modules/ecommerce/schemas/ecommerce-connections.schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/modules/shadcnui/components/ui/card';
import { Button } from '@/modules/shadcnui/components/ui/button';
import { Input } from '@/modules/shadcnui/components/ui/input';
import { Label } from '@/modules/shadcnui/components/ui/label';
import { Alert, AlertDescription } from '@/modules/shadcnui/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/modules/shadcnui/components/ui/select';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateConnectionPage() {
  const router = useRouter();
  const { createConnection, error: storeError } = useConnections();

  const form = useForm({
    defaultValues: {
      connection_name: '',
      platform: 'shopify' as PlatformType,
      db_host: '',
      db_name: '',
      db_user: '',
      db_password: '',
      db_port: 443,
    },
    onSubmit: async ({ value }) => {
      try {
        // Validate with Zod
        const validation = CreateConnectionSchema.safeParse(value);
        if (!validation.success) {
          return;
        }

        const success = await createConnection(value);

        if (success) {
          router.push('/connections');
        }
        // Error is handled by store and displayed via storeError
      } catch {
        // Swallow — ensures TanStack Form resets isSubmitting on unhandled errors
      }
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4 sm:px-0">
      <div>
        <Link href="/connections">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Connections
          </Button>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Create Connection</h1>
        <p className="text-muted-foreground mt-2">
          Connect your ecommerce platform to start generating recommendations
        </p>
      </div>

      {storeError && (
        <Alert variant="destructive">
          <AlertDescription>{storeError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Connection Details</CardTitle>
          <CardDescription>
            Enter your ecommerce platform connection details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <div className="space-y-4">
              {/* Connection Name */}
              <form.Field
                name="connection_name"
                validators={{
                  onChange: ({ value }) => {
                    if (value.length < 3) return 'Connection name must be at least 3 characters';
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Connection Name</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="e.g., My Shopify Store"
                      disabled={form.state.isSubmitting}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* Platform */}
              <form.Field name="platform">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Platform</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => {
                        field.handleChange(value as PlatformType);
                        // Update default port based on platform
                        if (value === 'shopify') {
                          form.setFieldValue('db_port', 443);
                        } else {
                          form.setFieldValue('db_port', 3306);
                        }
                      }}
                      disabled={form.state.isSubmitting}
                    >
                      <SelectTrigger id={field.name}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shopify">Shopify</SelectItem>
                        <SelectItem value="woocommerce">WooCommerce</SelectItem>
                        <SelectItem value="magento">Magento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </form.Field>

              {/* Host */}
              <form.Field
                name="db_host"
                validators={{
                  onChange: ({ value }) => {
                    if (!value) return 'Host is required';
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>
                      {form.getFieldValue('platform') === 'shopify' ? 'Store Domain' : 'Database Host'}
                    </Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder={
                        form.getFieldValue('platform') === 'shopify'
                          ? 'mystore.myshopify.com'
                          : 'localhost or IP address'
                      }
                      disabled={form.state.isSubmitting}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* Database Name — hidden for Shopify */}
              {form.getFieldValue('platform') !== 'shopify' && (
                <form.Field name="db_name">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Database Name</Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g., woocommerce_db"
                        disabled={form.state.isSubmitting}
                      />
                    </div>
                  )}
                </form.Field>
              )}

              {/* Database User — hidden for Shopify */}
              {form.getFieldValue('platform') !== 'shopify' && (
                <form.Field name="db_user">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Database User</Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g., db_user"
                        disabled={form.state.isSubmitting}
                      />
                    </div>
                  )}
                </form.Field>
              )}

              {/* Password / Access Token */}
              <form.Field
                name="db_password"
                validators={{
                  onChange: ({ value }) => {
                    if (!value) return 'Password / access token is required';
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>
                      {form.getFieldValue('platform') === 'shopify' ? 'Access Token' : 'Database Password'}
                    </Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder={
                        form.getFieldValue('platform') === 'shopify'
                          ? 'shpat_xxxxxxxx'
                          : 'Database password'
                      }
                      disabled={form.state.isSubmitting}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* Port */}
              <form.Field name="db_port">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Port</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="number"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(parseInt(e.target.value) || 0)}
                      disabled={form.state.isSubmitting}
                    />
                  </div>
                )}
              </form.Field>

              <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row">
                <Button
                  type="submit"
                  disabled={form.state.isSubmitting}
                  className="flex-1"
                >
                  {form.state.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Connection'
                  )}
                </Button>
                <Link href="/connections" className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={form.state.isSubmitting}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
