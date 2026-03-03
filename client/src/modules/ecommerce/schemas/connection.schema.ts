import { z } from 'zod';

// ==========================================
// Enums & Types
// ==========================================
export const platformTypeEnum = z.enum(['shopify', 'woocommerce', 'magento']);
export type PlatformType = z.infer<typeof platformTypeEnum>;

// ==========================================
// Entity Schemas
// ==========================================
export const ConnectionSchema = z.object({
  id: z.number(),
  connection_name: z.string(),
  platform: platformTypeEnum,
  db_host: z.string(),
  db_name: z.string(),
  db_user: z.string(),
  db_port: z.number(),
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
  db_host: z.string().min(1, 'Host is required'),
  db_name: z.string().nullable().optional(),
  db_user: z.string().nullable().optional(),
  db_password: z.string().min(1, 'Password / access token is required'),
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
  total?: number;
  error?: string;
};

export type ConnectionTestResponse = {
  success: boolean;
  message: string;
  sample_products_count?: number;
};
