'use client';

import { ConnectionStats, ConnectionStatsResponse } from '../schemas/data.schemas';
import { DATA_ENDPOINTS } from '../utils/api.endpoints';
import { fetchClient } from '@/modules/accounts/utils/fetch.client';

// Type for errors thrown by fetchClient
interface FetchError extends Error {
  status?: number;
}

/**
 * Fetch connection statistics (products count, orders count, etc.)
 * @param connectionId Connection ID
 * @returns Promise with connection stats response
 */
export const getConnectionStats = async (connectionId: number): Promise<ConnectionStatsResponse> => {
  try {
    // Backend returns { success, data: ConnectionStats } — unwrap the envelope
    const response = await fetchClient<{ success: boolean; data: ConnectionStats; error?: string }>(
      DATA_ENDPOINTS.STATS(connectionId),
      { method: 'GET' }
    );

    return {
      success: response.success,
      data: response.data,
      error: response.error,
    };
  } catch (error) {
    if ((error as FetchError)?.status === 401) {
      const { clearAuthCookies } = await import('@/modules/accounts/utils/token.client.utils');
      clearAuthCookies();
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : `Failed to fetch stats for connection ${connectionId}`,
      data: undefined,
    };
  }
};
