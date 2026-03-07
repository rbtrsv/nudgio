/**
 * Shopify Embedded App — Billing Page
 *
 * Polaris web component version for managing Shopify app subscriptions.
 * Runs inside the Shopify Admin iframe.
 *
 * Displays:
 * - Current plan info from EmbeddedContext (billing data from init)
 * - Plan comparison: FREE / PRO ($12/mo) / ENTERPRISE ($36/mo)
 * - Subscribe button → redirects to Shopify charge approval (exits iframe via _top)
 * - Cancel button → cancels active subscription
 *
 * On load, checks ?shopify_billing= query param for callback result:
 * - success — show success banner
 * - declined — show warning banner
 * - error — show error banner
 *
 * No connection selector — connection is auto-resolved from Shopify session token.
 *
 * Backend: /server/apps/ecommerce/subrouters/shopify_embedded_subrouter.py
 * - POST /shopify/embedded/billing/subscribe
 * - POST /shopify/embedded/billing/cancel
 * - GET  /shopify/embedded/billing/status
 *
 * Billing callback: /server/apps/ecommerce/subrouters/shopify_billing_subrouter.py
 * - GET /shopify/billing/callback?embedded=true → redirects back to /shopify/billing
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEmbedded } from '../layout';
import {
  subscribeBilling,
  cancelBilling,
} from '@/modules/ecommerce/service/shopify-embedded.service';

// ==========================================
// Plan Data
// ==========================================

const PLANS = [
  {
    name: 'FREE',
    price: '$0',
    period: '/mo',
    features: [
      'Up to 100 products',
      'Bestseller recommendations',
      'Basic widget styles',
    ],
  },
  {
    name: 'PRO',
    price: '$12',
    period: '/mo',
    features: [
      'Up to 10,000 products',
      'All recommendation types',
      'All widget styles',
      'Custom colors',
      'Priority support',
    ],
  },
  {
    name: 'ENTERPRISE',
    price: '$36',
    period: '/mo',
    features: [
      'Unlimited products',
      'All recommendation types',
      'All widget styles',
      'Custom colors',
      'Advanced analytics',
      'Dedicated support',
    ],
  },
];

// ==========================================
// Billing Page
// ==========================================

/**
 * Page wrapper — Suspense boundary required for useSearchParams() in Next.js.
 * Without this, Next.js build fails with "useSearchParams() should be wrapped in a suspense boundary".
 */
export default function ShopifyBillingPage() {
  return (
    <Suspense fallback={
      <s-page heading="Billing">
        <s-section heading="Loading...">
          <s-spinner />
        </s-section>
      </s-page>
    }>
      <ShopifyBillingContent />
    </Suspense>
  );
}

function ShopifyBillingContent() {
  const { billing, getSessionToken, refresh, isLoading: contextLoading, error: contextError } = useEmbedded();
  const searchParams = useSearchParams();

  // Action states
  const [isSubscribing, setIsSubscribing] = useState<string | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Callback result from ?shopify_billing= query param
  const [callbackResult, setCallbackResult] = useState<string | null>(null);

  // ==========================================
  // Check for billing callback result on mount
  // ==========================================

  useEffect(() => {
    const billingParam = searchParams.get('shopify_billing');
    if (billingParam) {
      setCallbackResult(billingParam);
      // Refresh dashboard data to get updated billing status
      refresh();
    }
  }, [searchParams, refresh]);

  // ==========================================
  // Subscribe to a plan
  // ==========================================

  const handleSubscribe = async (planName: string) => {
    try {
      setIsSubscribing(planName);
      setError(null);

      const token = await getSessionToken();
      const response = await subscribeBilling(token, planName);

      if (response.success && response.confirmation_url) {
        // Redirect to Shopify charge approval page — must exit iframe
        window.open(response.confirmation_url, '_top');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create subscription';
      setError(message);
      console.error('Subscribe error:', err);
    } finally {
      setIsSubscribing(null);
    }
  };

  // ==========================================
  // Cancel subscription
  // ==========================================

  const handleCancel = async () => {
    try {
      setIsCanceling(true);
      setError(null);

      const token = await getSessionToken();
      await cancelBilling(token);

      window.shopify?.toast.show('Subscription canceled');

      // Refresh to update billing status
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel subscription';
      setError(message);
      console.error('Cancel error:', err);
    } finally {
      setIsCanceling(false);
    }
  };

  // ==========================================
  // Loading / Error — context level
  // ==========================================

  if (contextLoading) {
    return (
      <s-page heading="Billing">
        <s-section heading="Loading...">
          <s-spinner />
        </s-section>
      </s-page>
    );
  }

  if (contextError) {
    return (
      <s-page heading="Billing">
        <s-section>
          <s-banner tone="critical" heading="Error">
            <s-paragraph>{contextError}</s-paragraph>
          </s-banner>
        </s-section>
      </s-page>
    );
  }

  // Current plan from context
  const currentPlan = billing?.plan_name || 'FREE';
  const isActive = billing?.billing_status === 'ACTIVE';

  return (
    <s-page heading="Billing">

      {/* Top spacer — breathing room between page heading and first section */}
      <s-box paddingBlockStart="base" />

      {/* Callback Result Banners */}
      {callbackResult === 'success' && (
        <s-section>
          <s-banner tone="success" heading="Subscription activated">
            <s-paragraph>
              Your {billing?.plan_name} plan is now active. Thank you!
            </s-paragraph>
          </s-banner>
        </s-section>
      )}

      {callbackResult === 'declined' && (
        <s-section>
          <s-banner tone="warning" heading="Subscription declined">
            <s-paragraph>
              The charge was not approved. You can try again below.
            </s-paragraph>
          </s-banner>
        </s-section>
      )}

      {callbackResult === 'error' && (
        <s-section>
          <s-banner tone="critical" heading="Billing error">
            <s-paragraph>
              Something went wrong with the billing process. Please try again.
            </s-paragraph>
          </s-banner>
        </s-section>
      )}

      {/* Error Banner */}
      {error && (
        <s-section>
          <s-banner tone="critical" heading="Error">
            <s-paragraph>{error}</s-paragraph>
          </s-banner>
        </s-section>
      )}

      {/* Current Plan Status */}
      <s-section heading="Current Plan">
        <s-box padding="base" borderWidth="base" borderRadius="base">
          <s-stack direction="block" gap="base">
            <s-stack direction="inline" gap="base">
              <s-text type="strong">Plan</s-text>
              <s-badge tone={isActive ? 'success' : 'info'}>
                {currentPlan}
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
            {isActive && (
              <s-button
                variant="primary"
                tone="critical"
                onClick={handleCancel}
                disabled={isCanceling || undefined}
              >
                {isCanceling ? 'Canceling...' : 'Cancel Subscription'}
              </s-button>
            )}
          </s-stack>
        </s-box>
      </s-section>

      {/* Plan Comparison */}
      <s-section heading="Available Plans">
        <s-stack direction="inline" gap="base">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.name && isActive;
            const canSubscribe = plan.name !== 'FREE' && !isCurrent;

            return (
              <s-box
                key={plan.name}
                padding="base"
                borderWidth="base"
                borderRadius="base"
                background={isCurrent ? 'subdued' : undefined}
              >
                <s-stack direction="block" gap="base">
                  <s-stack direction="inline" gap="small">
                    <s-heading>{plan.name}</s-heading>
                    {isCurrent && (
                      <s-badge tone="success">Current</s-badge>
                    )}
                  </s-stack>

                  <s-stack direction="inline" gap="small">
                    <s-heading>{plan.price}</s-heading>
                    <s-text>{plan.period}</s-text>
                  </s-stack>

                  {/* Feature list */}
                  <s-stack direction="block" gap="small">
                    {plan.features.map((feature) => (
                      <s-text key={feature}>{feature}</s-text>
                    ))}
                  </s-stack>

                  {/* Subscribe button */}
                  {canSubscribe && (
                    <s-button
                      variant="primary"
                      onClick={() => handleSubscribe(plan.name)}
                      disabled={isSubscribing !== null || undefined}
                    >
                      {isSubscribing === plan.name ? 'Redirecting...' : `Subscribe to ${plan.name}`}
                    </s-button>
                  )}

                  {/* Current plan indicator */}
                  {isCurrent && (
                    <s-text type="strong" tone="success">Active</s-text>
                  )}

                  {/* Free plan — no action needed */}
                  {plan.name === 'FREE' && !isCurrent && (
                    <s-text>Default plan — no subscription needed</s-text>
                  )}
                </s-stack>
              </s-box>
            );
          })}
        </s-stack>
      </s-section>

      {/* Bottom spacer — breathing room after last section */}
      <s-box paddingBlockEnd="base" />

    </s-page>
  );
}
