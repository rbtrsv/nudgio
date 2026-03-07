/**
 * Shopify Embedded App — Dashboard Page
 *
 * Main dashboard page for the Shopify embedded app.
 * Renders inside the Shopify Admin iframe using Polaris web components.
 *
 * Displays:
 * - Connection status (shop domain, active/inactive, created date)
 * - Product count + order count stats
 * - Current billing plan with upgrade prompt
 *
 * Data comes from EmbeddedContext (populated by layout.tsx via POST /init).
 * All UI uses Polaris web components (s-page, s-section, s-box, etc.).
 */

'use client';

import { useEmbedded } from './layout';

// ==========================================
// Loading State
// ==========================================

function DashboardSkeleton() {
  return (
    <s-page heading="Nudgio Dashboard">
      <s-section heading="Loading...">
        <s-spinner />
      </s-section>
    </s-page>
  );
}

// ==========================================
// Error State
// ==========================================

function DashboardError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <s-page heading="Nudgio Dashboard">
      <s-section>
        <s-banner tone="critical" heading="Failed to load dashboard">
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
// Dashboard Page
// ==========================================

export default function ShopifyDashboardPage() {
  const { connection, stats, billing, isLoading, error, refresh } = useEmbedded();

  // Loading state — show spinner while POST /init is in progress
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Error state — show error banner with retry button
  if (error || !connection) {
    return (
      <DashboardError
        error={error || 'No connection found'}
        onRetry={refresh}
      />
    );
  }

  return (
    <s-page heading="Nudgio Dashboard">

      {/* Connection Status Section */}
      <s-section heading="Connection">
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="base">
            <s-stack direction="inline" gap="base">
              <s-text type="strong">Store</s-text>
              <s-text>{connection.store_url}</s-text>
            </s-stack>
            <s-stack direction="inline" gap="base">
              <s-text type="strong">Status</s-text>
              <s-badge tone={connection.is_active ? 'success' : 'critical'}>
                {connection.is_active ? 'Active' : 'Inactive'}
              </s-badge>
            </s-stack>
            <s-stack direction="inline" gap="base">
              <s-text type="strong">Connected</s-text>
              <s-text>
                {connection.created_at
                  ? new Date(connection.created_at).toLocaleDateString()
                  : 'Unknown'}
              </s-text>
            </s-stack>
          </s-stack>
        </s-box>
      </s-section>

      {/* Stats Section */}
      <s-section heading="Store Stats">
        <s-stack direction="inline" gap="base">
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text type="strong">Products</s-text>
              <s-heading>
                {stats?.products_count?.toLocaleString() ?? '0'}
              </s-heading>
            </s-stack>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text type="strong">Orders (12 months)</s-text>
              <s-heading>
                {stats?.orders_count?.toLocaleString() ?? '0'}
              </s-heading>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      {/* Billing Section */}
      <s-section heading="Current Plan">
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="base">
            <s-stack direction="inline" gap="base">
              <s-text type="strong">Plan</s-text>
              <s-badge tone={billing?.has_subscription ? 'success' : 'info'}>
                {billing?.plan_name ?? 'FREE'}
              </s-badge>
              {billing?.test && (
                <s-badge tone="warning">Test</s-badge>
              )}
            </s-stack>
            {billing?.billing_status && (
              <s-stack direction="inline" gap="base">
                <s-text type="strong">Status</s-text>
                <s-text>{billing.billing_status}</s-text>
              </s-stack>
            )}
            {billing?.start_date && (
              <s-stack direction="inline" gap="base">
                <s-text type="strong">Since</s-text>
                <s-text>{new Date(billing.start_date).toLocaleDateString()}</s-text>
              </s-stack>
            )}
          </s-stack>
        </s-box>
      </s-section>

    </s-page>
  );
}
