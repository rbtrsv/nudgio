/**
 * Component / Widget Schemas
 *
 * Zod validation schemas for embeddable HTML widget parameters.
 * Field names and validation rules match backend exactly (snake_case).
 *
 * Backend sources:
 * - Router: /server/apps/ecommerce/subrouters/components_subrouter.py
 */

import { z } from 'zod';

// ==========================================
// Input Schemas
// ==========================================

/**
 * Widget parameters schema
 * Used to configure embeddable recommendation widgets
 *
 * Backend equivalent: query params on GET /components/{type}
 */
export const WidgetParamsSchema = z.object({
  connection_id: z.number(),
  product_id: z.string().optional(),
  top: z.number().default(4),
  lookback_days: z.number().optional(),
  method: z.enum(['volume', 'value', 'balanced']).optional(),
  min_price_increase: z.number().optional(),
  style: z.enum(['card', 'carousel']).default('card'),
  device: z.enum(['desktop', 'mobile']).default('desktop'),
  columns: z.number().min(2).max(6).default(4),
  size: z.enum(['compact', 'default', 'spacious']).default('default'),
  primary_color: z.string().default('#3B82F6'),
  text_color: z.string().default('#1F2937'),
  bg_color: z.string().default('#FFFFFF'),
  border_radius: z.string().default('8px'),
  widget_title: z.string().default(''),
  cta_text: z.string().default('View'),
  show_price: z.boolean().default(true),
  image_aspect: z.enum(['square', 'portrait', 'landscape']).default('square'),
});

// ==========================================
// Type Exports
// ==========================================

export type WidgetParams = z.infer<typeof WidgetParamsSchema>;

// ==========================================
// Response Types
// ==========================================

/**
 * Response containing rendered widget HTML
 * status: optional backend status code (e.g., "waiting_for_data" for ingest connections with no data)
 */
export type WidgetResponse = {
  success: boolean;
  html?: string;
  error?: string;
  status?: string;
};
