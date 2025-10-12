'use client';

import { useEffect, useState, useCallback } from 'react';
import { offlineQueue, OfflineTransaction } from '@/lib/offline-queue';
import { toast } from 'sonner';

export function useOfflineQueue() {
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Update unsynced count
  const updateUnsyncedCount = useCallback(async () => {
    try {
      const count = await offlineQueue.getUnsyncedCount();
      setUnsyncedCount(count);
    } catch (error) {
      console.error('[useOfflineQueue] Failed to get unsynced count:', error);
    }
  }, []);

  // Add transaction to offline queue
  const addToQueue = useCallback(async (transactionData: any) => {
    try {
      const id = await offlineQueue.addToQueue(transactionData);
      await updateUnsyncedCount();

      toast.info('Transaction saved offline', {
        description: 'It will be synced when you\'re back online',
      });

      // Register background sync
      await offlineQueue.registerBackgroundSync();

      return id;
    } catch (error) {
      console.error('[useOfflineQueue] Failed to add to queue:', error);
      toast.error('Failed to save transaction offline');
      throw error;
    }
  }, [updateUnsyncedCount]);

  // Sync all unsynced transactions
  const syncAll = useCallback(async () => {
    if (!navigator.onLine) {
      toast.error('Cannot sync while offline');
      return { success: 0, failed: 0 };
    }

    setIsSyncing(true);
    try {
      const result = await offlineQueue.syncToServer();
      await updateUnsyncedCount();

      if (result.success > 0) {
        toast.success(`Synced ${result.success} transaction(s)`, {
          description: result.failed > 0 ? `${result.failed} failed to sync` : undefined,
        });
      }

      if (result.failed > 0 && result.success === 0) {
        toast.error(`Failed to sync ${result.failed} transaction(s)`);
      }

      return result;
    } catch (error) {
      console.error('[useOfflineQueue] Sync failed:', error);
      toast.error('Sync failed');
      return { success: 0, failed: 0 };
    } finally {
      setIsSyncing(false);
    }
  }, [updateUnsyncedCount]);

  // Get all unsynced transactions
  const getUnsynced = useCallback(async (): Promise<OfflineTransaction[]> => {
    try {
      return await offlineQueue.getUnsyncedTransactions();
    } catch (error) {
      console.error('[useOfflineQueue] Failed to get unsynced transactions:', error);
      return [];
    }
  }, []);

  // Clear all synced transactions
  const clearSynced = useCallback(async () => {
    try {
      await offlineQueue.clearSynced();
      await updateUnsyncedCount();
      toast.success('Cleared synced transactions');
    } catch (error) {
      console.error('[useOfflineQueue] Failed to clear synced:', error);
      toast.error('Failed to clear synced transactions');
    }
  }, [updateUnsyncedCount]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      console.log('[useOfflineQueue] Back online, attempting to sync...');

      // Wait a bit for connection to stabilize
      setTimeout(async () => {
        const count = await offlineQueue.getUnsyncedCount();
        if (count > 0) {
          toast.info('Connection restored', {
            description: `Syncing ${count} pending transaction(s)...`,
          });
          await syncAll();
        }
      }, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are offline', {
        description: 'New transactions will be saved locally and synced later',
      });
    };

    // Set initial state
    setIsOnline(navigator.onLine);

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SYNC_COMPLETE') {
          console.log('[useOfflineQueue] Background sync complete:', event.data.count);
          updateUnsyncedCount();

          if (event.data.count > 0) {
            toast.success(`Background sync completed: ${event.data.count} transaction(s)`);
          }
        }
      });
    }

    // Update count on mount
    updateUnsyncedCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncAll, updateUnsyncedCount]);

  return {
    unsyncedCount,
    isSyncing,
    isOnline,
    addToQueue,
    syncAll,
    getUnsynced,
    clearSynced,
    updateUnsyncedCount,
  };
}
