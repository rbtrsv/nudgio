import { z } from 'zod';

// ==========================================
// Enums & Types
// ==========================================
export const platformTypeEnum = z.enum(['shopify', 'woocommerce', 'magento']);
export type PlatformType = z.infer<typeof platformTypeEnum>;

export const connectionMethodEnum = z.enum(['api', 'database']);
export type ConnectionMethod = z.infer<typeof connectionMethodEnum>;

// ==========================================
// Entity Schemas
// ==========================================
export const ConnectionSchema = z.object({
  id: z.number(),
  connection_name: z.string(),
  platform: platformTypeEnum,
  connection_method: connectionMethodEnum,
  // API fields (api_key/api_secret excluded — backend never exposes secrets)
  store_url: z.string().nullable(),
  // Database fields (db_password excluded — backend never exposes secrets)
  db_host: z.string().nullable(),
  db_name: z.string().nullable(),
  db_user: z.string().nullable(),
  db_port: z.number().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});

// ==========================================
// Input Schemas
// ==========================================
export const CreateConnectionSchema = z.object({
  connection_name: z.string().min(3, 'Connection name must be at least 3 characters'),
  platform: platformTypeEnum,
  connection_method: connectionMethodEnum.default('api'),
  // API-based fields
  store_url: z.string().nullable().optional(),
  api_key: z.string().nullable().optional(),
  api_secret: z.string().nullable().optional(),
  // Database-based fields
  db_host: z.string().nullable().optional(),
  db_name: z.string().nullable().optional(),
  db_user: z.string().nullable().optional(),
  db_password: z.string().nullable().optional(),
  db_port: z.number().nullable().optional(),
});

// ==========================================
// Type Exports
// ==========================================
export type Connection = z.infer<typeof ConnectionSchema>;
export type CreateConnectionInput = z.infer<typeof CreateConnectionSchema>;

// ==========================================
// Response Types
// ==========================================
export type ConnectionResponse = {
  success: boolean;
  data?: Connection;
  error?: string;
};

export type ConnectionsResponse = {
  success: boolean;
  data?: Connection[];
  count?: number;
  error?: string;
};

export type ConnectionTestResponse = {
  success: boolean;
  message: string;
  sample_products_count?: number;
};
