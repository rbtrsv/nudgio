'use client';

import * as React from "react"
import { usePathname } from "next/navigation"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/modules/shadcnui/components/ui/sidebar"
import { TooltipProvider } from "@/modules/shadcnui/components/ui/tooltip"
import { NexotypeSidebar } from "@/modules/nexotype/components/nexotype-sidebar"
import { Separator } from "@/modules/shadcnui/components/ui/separator"
import { NexotypeBreadcrumb } from "@/modules/nexotype/components/nexotype-breadcrumb"
import { AccountsProviders } from '@/modules/accounts/providers/accounts-providers'
import { NexotypeProviders } from '@/modules/nexotype/providers/nexotype-providers'
import { StripeSuccessHandler } from '@/modules/accounts/components/stripe-success-handler'
import { usePermissions } from '@/modules/nexotype/hooks/shared/use-permissions'
import { UpgradeRequired } from '@/modules/nexotype/components/shared/upgrade-required'
import { Loader2 } from 'lucide-react'

// ==========================================
// PageGate — route-level access check
// ==========================================

/**
 * Wraps children and checks if the current route is locked behind a higher tier.
 * Must be rendered INSIDE NexotypeProviders so usePermissions() has context.
 *
 * - Routes not in permissions.routes (e.g. /organizations, /settings) → pass through
 * - Known routes before isInitialized → loading spinner (prevents flash of content)
 * - Locked routes → UpgradeRequired card
 * - Accessible routes → render children
 */
function PageGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { permissions, isInitialized, isRouteLocked, getRouteTier, getRouteDisplayName } = usePermissions();

  // Extract first path segment (e.g. "/genes/123" → "genes")
  const segments = pathname.split('/').filter(Boolean);
  const routeSegment = segments[0];

  // Route not in permissions.routes (e.g. /organizations, /settings) → pass through immediately
  if (!routeSegment || (isInitialized && !permissions?.routes?.[routeSegment])) {
    return <>{children}</>;
  }

  // Why: known Nexotype route but permissions not loaded yet — show loading
  // Prevents flash of page content before we know if it's locked
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  // Route is locked → show UpgradeRequired instead of page content
  if (isRouteLocked(routeSegment)) {
    return (
      <UpgradeRequired
        requiredTier={getRouteTier(routeSegment) ?? 'PRO'}
        currentTier={permissions?.tier ?? 'FREE'}
        featureName={getRouteDisplayName(routeSegment) ?? routeSegment}
      />
    );
  }

  return <>{children}</>;
}

// ==========================================
// Nexotype Layout
// ==========================================

export default function NexotypeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const defaultOpen = true;

  return (
    <AccountsProviders>
      <NexotypeProviders>
        <StripeSuccessHandler />
        <TooltipProvider>
          <SidebarProvider defaultOpen={defaultOpen}>
            <NexotypeSidebar />
            <SidebarInset>
              <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                <div className="flex items-center gap-2 px-4">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <NexotypeBreadcrumb />
                </div>
              </header>
              <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <PageGate>{children}</PageGate>
              </div>
            </SidebarInset>
          </SidebarProvider>
        </TooltipProvider>
      </NexotypeProviders>
    </AccountsProviders>
  );
}
