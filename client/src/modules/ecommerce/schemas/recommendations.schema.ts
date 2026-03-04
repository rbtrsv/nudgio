import { z } from 'zod';

// ==========================================
// Enums & Types
// ==========================================
export const recommendationTypeEnum = z.enum([
  'bestseller',
  'cross_sell',
  'up_sell',
  'similar',
  'user_based',
]);
export type RecommendationType = z.infer<typeof recommendationTypeEnum>;

// ==========================================
// Entity Schemas
// ==========================================
export const ProductRecommendationSchema = z.object({
  product_id: z.string(),
  title: z.string(),
  price: z.number(),
  handle: z.string().nullable(),
  vendor: z.string().nullable(),
  sku: z.string().nullable(),
  position: z.number(),
  metrics: z.record(z.string(), z.unknown()).nullable(),
  co_occurrence_count: z.number().nullable(),
  price_increase_percent: z.number().nullable(),
  similarity_score: z.number().nullable(),
});

export const RecommendationResultSchema = z.object({
  recommendations: z.array(ProductRecommendationSchema),
  count: z.number(),
  method: z.string().nullable(),
  base_product_id: z.string().nullable(),
  lookback_days: z.number(),
  generated_at: z.string(),
});

// ==========================================
// Input Schemas
// ==========================================
export const BestsellersInputSchema = z.object({
  connection_id: z.number(),
  limit: z.number().default(10),
  lookback_days: z.number().default(30),
  method: z.enum(['volume', 'value', 'balanced']).default('volume'),
});

export const CrossSellInputSchema = z.object({
  connection_id: z.number(),
  product_id: z.string().min(1, 'Product ID is required'),
  limit: z.number().default(10),
  lookback_days: z.number().default(30),
});

export const UpsellInputSchema = z.object({
  connection_id: z.number(),
  product_id: z.string().min(1, 'Product ID is required'),
  limit: z.number().default(10),
  lookback_days: z.number().default(30),
  min_price_increase_percent: z.number().default(10),
});

export const SimilarInputSchema = z.object({
  connection_id: z.number(),
  product_id: z.string().min(1, 'Product ID is required'),
  limit: z.number().default(10),
  lookback_days: z.number().default(30),
});

// ==========================================
// Type Exports
// ==========================================
export type ProductRecommendation = z.infer<typeof ProductRecommendationSchema>;
export type RecommendationResult = z.infer<typeof RecommendationResultSchema>;
export type BestsellersInput = z.infer<typeof BestsellersInputSchema>;
export type CrossSellInput = z.infer<typeof CrossSellInputSchema>;
export type UpsellInput = z.infer<typeof UpsellInputSchema>;
export type SimilarInput = z.infer<typeof SimilarInputSchema>;

// ==========================================
// Response Types
// ==========================================
export type RecommendationResponse = {
  success: boolean;
  data?: RecommendationResult;
  error?: string;
};
