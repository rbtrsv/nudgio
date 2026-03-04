import { z } from 'zod';

// ==========================================
// Enums & Types
// ==========================================
export const bestsellerMethodEnum = z.enum(['volume', 'value', 'balanced']);
export type BestsellerMethod = z.infer<typeof bestsellerMethodEnum>;

// ==========================================
// Entity Schemas
// ==========================================
export const RecommendationSettingsSchema = z.object({
  id: z.number(),
  connection_id: z.number(),
  default_limit: z.number(),
  default_lookback_days: z.number(),
  bestseller_method: bestsellerMethodEnum,
  cross_sell_enabled: z.boolean(),
  upsell_enabled: z.boolean(),
  similar_products_enabled: z.boolean(),
  min_upsell_price_increase: z.number(),
  cache_recommendations: z.boolean(),
  cache_duration_minutes: z.number(),
  shop_base_url: z.string().nullable(),
  product_url_template: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});

// ==========================================
// Input Schemas
// ==========================================
export const CreateOrUpdateSettingsSchema = z.object({
  connection_id: z.number(),
  default_limit: z.number().min(1).max(100).default(10),
  default_lookback_days: z.number().min(1).max(365).default(30),
  bestseller_method: bestsellerMethodEnum.default('volume'),
  cross_sell_enabled: z.boolean().default(true),
  upsell_enabled: z.boolean().default(true),
  similar_products_enabled: z.boolean().default(true),
  min_upsell_price_increase: z.number().min(0).max(1000).default(10),
  cache_recommendations: z.boolean().default(true),
  cache_duration_minutes: z.number().default(60),
  shop_base_url: z.string().nullable().optional(),
  product_url_template: z.string().nullable().optional(),
});

// ==========================================
// Type Exports
// ==========================================
export type RecommendationSettings = z.infer<typeof RecommendationSettingsSchema>;
export type CreateOrUpdateSettingsInput = z.infer<typeof CreateOrUpdateSettingsSchema>;

// ==========================================
// Connection Settings (list response item)
// ==========================================
export const ConnectionSettingsSchema = z.object({
  connection_id: z.number(),
  connection_name: z.string(),
  platform: z.string(),
  settings: RecommendationSettingsSchema.nullable(),
});
export type ConnectionSettings = z.infer<typeof ConnectionSettingsSchema>;

// ==========================================
// Response Types
// ==========================================
export type SettingsResponse = {
  success: boolean;
  data?: RecommendationSettings;
  error?: string;
};

export type SettingsListResponse = {
  success: boolean;
  data?: ConnectionSettings[];
  error?: string;
};
