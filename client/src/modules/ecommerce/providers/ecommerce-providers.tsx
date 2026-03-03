'use client';

import { ReactNode } from 'react';
import { ConnectionProvider } from './connections-provider';
import { SettingsProvider } from './settings-provider';
import { AnalyticsProvider } from './analytics-provider';

/**
 * EcommerceProviders props
 */
interface EcommerceProvidersProps {
  children: ReactNode;
}

/**
 * Complete ecommerce providers component
 *
 * Provides all required providers for ecommerce hooks to work properly.
 *
 * Note: This should be nested inside AccountsProviders since ecommerce
 * depends on organization context from accounts module.
 */
export function EcommerceProviders({ children }: EcommerceProvidersProps) {
  return (
    <ConnectionProvider>
      <SettingsProvider>
        <AnalyticsProvider>
          {children}
        </AnalyticsProvider>
      </SettingsProvider>
    </ConnectionProvider>
  );
}

/**
 * Default export
 */
export default EcommerceProviders;
