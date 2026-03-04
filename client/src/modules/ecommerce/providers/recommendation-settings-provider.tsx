'use client';

import React, { createContext, useEffect, useMemo } from 'react';
import { useSettingsStore } from '../store/recommendation-settings.store';
import { useConnectionStore } from '../store/ecommerce-connections.store';
import { type RecommendationSettings, type ConnectionSettings } from '../schemas/recommendation-settings.schema';

/**
 * Context type for the settings provider
 */
export interface SettingsContextType {
  // State
  allSettings: ConnectionSettings[];
  currentSettings: RecommendationSettings | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  clearError: () => void;
}

// Create the context
export const SettingsContext = createContext<SettingsContextType | null>(null);

/**
 * Provider component for settings-related state and actions
 *
 * Auto-fetches settings when activeConnectionId changes
 */
export function SettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get state and actions from the store
  const {
    allSettings,
    currentSettings,
    isLoading,
    error,
    isInitialized,
    initialize,
    fetchSettings,
    clearError,
  } = useSettingsStore();

  // Get active connection from connection store
  const activeConnectionId = useConnectionStore((state) => state.activeConnectionId);

  // Initialize settings on mount
  useEffect(() => {
    let isMounted = true;

    if (!isInitialized) {
      initialize().catch((initError) => {
        if (isMounted) {
          console.error('Error initializing settings:', initError);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [isInitialized, initialize]);

  // Auto-fetch settings when activeConnectionId changes
  useEffect(() => {
    if (activeConnectionId) {
      fetchSettings(activeConnectionId).catch((fetchError) => {
        console.error('Error fetching settings for connection:', fetchError);
      });
    }
  }, [activeConnectionId, fetchSettings]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<SettingsContextType>(
    () => ({
      allSettings,
      currentSettings,
      isLoading,
      error,
      isInitialized,
      initialize,
      clearError,
    }),
    [
      allSettings,
      currentSettings,
      isLoading,
      error,
      isInitialized,
      initialize,
      clearError,
    ]
  );

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

/**
 * Default export
 */
export default SettingsProvider;
