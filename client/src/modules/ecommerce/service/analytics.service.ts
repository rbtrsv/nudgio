'use client';

import { ConnectionStats, ConnectionStatsResponse } from '../schemas/analytics.schema';
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
    // Backend returns ConnectionStats object directly
    const data = await fetchClient<ConnectionStats>(
      DATA_ENDPOINTS.STATS(connectionId),
      { method: 'GET' }
    );

    return {
      success: true,
      data,
      error: undefined,
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
