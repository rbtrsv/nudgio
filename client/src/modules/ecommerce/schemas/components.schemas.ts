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
  style: z.enum(['card', 'carousel', 'list']).default('card'),
  device: z.enum(['desktop', 'mobile']).default('desktop'),
  primary_color: z.string().default('#3B82F6'),
  text_color: z.string().default('#1F2937'),
  bg_color: z.string().default('#FFFFFF'),
  border_radius: z.string().default('8px'),
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
 */
export type WidgetResponse = {
  success: boolean;
  html?: string;
  error?: string;
};
