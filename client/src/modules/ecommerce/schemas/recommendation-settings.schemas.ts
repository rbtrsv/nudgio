/**
 * Recommendation Settings Schemas
 *
 * Zod validation schemas for RecommendationSettings model.
 * Field names and validation rules match backend exactly (snake_case).
 *
 * Backend sources:
 * - Model: /server/apps/ecommerce/models.py → RecommendationSettings
 * - Schema: /server/apps/ecommerce/schemas/recommendation_settings_schemas.py
 * - Router: /server/apps/ecommerce/subrouters/recommendation_settings_subrouter.py
 */

import { z } from 'zod';

// ==========================================
// Enums
// ==========================================

/**
 * Bestseller method options - matches backend BestsellerMethod enum
 * Backend: class BestsellerMethod(str, Enum)
 */
export const BestsellerMethodEnum = z.enum(['volume', 'value', 'balanced']);

// ==========================================
// Settings Schema (Full Representation)
// ==========================================

/**
 * Recommendation settings schema - full representation
 * Used for GET operations (single and list)
 *
 * Backend equivalent: class RecommendationSettingsDetail(BaseModel)
 */
export const RecommendationSettingsSchema = z.object({
  id: z.number(),
  connection_id: z.number(),
  bestseller_method: BestsellerMethodEnum,
  bestseller_lookback_days: z.number(),
  crosssell_lookback_days: z.number(),
  max_recommendations: z.number(),
  min_price_increase_percent: z.number(),
  shop_base_url: z.string().nullable(),
  product_url_template: z.string().nullable(),
  // Brand identity defaults — visual settings for widget rendering
  widget_style: z.string().nullable(),
  widget_columns: z.number().nullable(),
  widget_size: z.string().nullable(),
  primary_color: z.string().nullable(),
  text_color: z.string().nullable(),
  bg_color: z.string().nullable(),
  border_radius: z.string().nullable(),
  cta_text: z.string().nullable(),
  show_price: z.boolean().nullable(),
  image_aspect: z.string().nullable(),
  widget_title: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});

// ==========================================
// Input Schemas
// ==========================================

/**
 * Schema for creating or updating recommendation settings (PUT)
 * connection_id is passed in the URL path, not in the body
 *
 * Backend equivalent: class RecommendationSettingsCreateOrUpdate(BaseModel)
 */
export const CreateOrUpdateSettingsSchema = z.object({
  // connection_id is passed in the URL path, not in the body
  bestseller_method: BestsellerMethodEnum.default('volume'),
  bestseller_lookback_days: z.number().min(1).max(365).default(30),
  crosssell_lookback_days: z.number().min(1).max(365).default(30),
  max_recommendations: z.number().min(1).max(100).default(10),
  min_price_increase_percent: z.number().min(0).max(1000).default(10),
  shop_base_url: z.string().nullable().optional(),
  product_url_template: z.string().nullable().optional(),
  // Brand identity defaults — visual settings for widget rendering
  widget_style: z.string().nullable().optional(),
  widget_columns: z.number().min(2).max(6).nullable().optional(),
  widget_size: z.string().nullable().optional(),
  primary_color: z.string().nullable().optional(),
  text_color: z.string().nullable().optional(),
  bg_color: z.string().nullable().optional(),
  border_radius: z.string().nullable().optional(),
  cta_text: z.string().nullable().optional(),
  show_price: z.boolean().nullable().optional(),
  image_aspect: z.string().nullable().optional(),
  widget_title: z.string().nullable().optional(),
});

// ==========================================
// Type Exports
// ==========================================

export type BestsellerMethod = z.infer<typeof BestsellerMethodEnum>;
export type RecommendationSettings = z.infer<typeof RecommendationSettingsSchema>;
export type CreateOrUpdateSettings = z.infer<typeof CreateOrUpdateSettingsSchema>;

// ==========================================
// Connection Settings (list response item)
// ==========================================

/**
 * Connection settings schema - used in list response
 * Shows connection info alongside its settings
 */
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

/**
 * Response containing a single settings object
 * Backend equivalent: class RecommendationSettingsResponse(BaseModel)
 */
export type SettingsResponse = {
  success: boolean;
  data?: RecommendationSettings;
  error?: string;
};

/**
 * Response containing list of connection settings
 * Backend equivalent: class RecommendationSettingsListResponse(BaseModel)
 */
export type SettingsListResponse = {
  success: boolean;
  data?: ConnectionSettings[];
  error?: string;
};
