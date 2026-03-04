import { z } from 'zod';

// ==========================================
// Input Schemas
// ==========================================
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
export type WidgetResponse = {
  success: boolean;
  html?: string;
  error?: string;
};
