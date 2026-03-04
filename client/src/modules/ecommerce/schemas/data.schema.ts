import { z } from 'zod';

// ==========================================
// Entity Schemas
// ==========================================
export const ConnectionStatsSchema = z.object({
  connection_id: z.number(),
  connection_name: z.string(),
  platform: z.string(),
  products_count: z.number(),
  orders_count: z.number(),
  order_items_count: z.number(),
  last_sync: z.string().nullable(),
  data_freshness_days: z.number().nullable(),
});

// ==========================================
// Type Exports
// ==========================================
export type ConnectionStats = z.infer<typeof ConnectionStatsSchema>;

// ==========================================
// Response Types
// ==========================================
export type ConnectionStatsResponse = {
  success: boolean;
  data?: ConnectionStats;
  error?: string;
};
