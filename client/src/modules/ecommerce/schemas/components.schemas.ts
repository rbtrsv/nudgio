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
  // Algorithm / data params
  connection_id: z.number(),
  product_id: z.string().optional(),
  top: z.number().default(4),
  lookback_days: z.number().optional(),
  method: z.enum(['volume', 'value', 'balanced']).optional(),
  min_price_increase: z.number().optional(),
  device: z.enum(['desktop', 'mobile']).default('desktop'),
  // Group 1: Widget Container
  widget_bg_color: z.string().default('#FFFFFF'),
  widget_padding: z.string().default('md'),
  // Group 2: Widget Title
  widget_title: z.string().default(''),
  title_color: z.string().default('#111827'),
  title_size: z.string().default('lg'),
  title_alignment: z.string().default('left'),
  // Group 3: Layout
  widget_style: z.string().default('grid'),
  widget_columns: z.number().min(2).max(6).default(4),
  gap: z.string().default('md'),
  // Group 4: Product Card
  card_bg_color: z.string().default('#FFFFFF'),
  card_border_radius: z.string().default('8px'),
  card_border_width: z.string().default('0'),
  card_border_color: z.string().default('#E5E7EB'),
  card_shadow: z.string().default('md'),
  card_padding: z.string().default('md'),
  card_hover: z.string().default('lift'),
  // Group 5: Product Image
  image_aspect: z.string().default('square'),
  image_fit: z.string().default('cover'),
  image_radius: z.string().default('8px'),
  // Group 6: Product Title in Card
  product_title_color: z.string().default('#1F2937'),
  product_title_size: z.string().default('sm'),
  product_title_weight: z.string().default('semibold'),
  product_title_lines: z.number().min(1).max(3).default(2),
  product_title_alignment: z.string().default('left'),
  // Group 7: Price
  show_price: z.boolean().default(true),
  price_color: z.string().default('#111827'),
  price_size: z.string().default('md'),
  // Group 8: CTA Button
  button_text: z.string().default('View'),
  button_bg_color: z.string().default('#3B82F6'),
  button_text_color: z.string().default('#FFFFFF'),
  button_radius: z.string().default('6px'),
  button_size: z.string().default('md'),
  button_variant: z.string().default('solid'),
  button_full_width: z.boolean().default(false),
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
