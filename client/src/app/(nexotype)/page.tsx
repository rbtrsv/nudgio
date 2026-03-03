'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/modules/shadcnui/components/ui/card';
import { Button } from '@/modules/shadcnui/components/ui/button';
import { Building, ArrowRight } from 'lucide-react';

// Route state and navigation.
// Domain data comes from typed hooks.
// Handlers preserve API behavior and keep flows explicit.
// Dashboard widgets read provider-backed stores.
// Charts and summary cards are presentation-only here.
// Navigation links route users into typed entity pages.
export default function NexotypePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome to Nexotype</h1>
        <p className="text-muted-foreground">
          Manage your organizations and subscriptions
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:border-primary transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Organizations
            </CardTitle>
            <CardDescription>
              Manage your organizations, members, and subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/organizations">
              <Button className="w-full">
                View Organizations
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
