/**
 * Offline Queue System using IndexedDB
 * Stores transactions locally when offline and syncs when connection is restored
 */

const DB_NAME = 'cashbook-offline';
const DB_VERSION = 2; // Incremented to trigger migration
const STORE_NAME = 'offline-queue';

export interface OfflineTransaction {
  id?: number;
  data: any;
  timestamp: number;
  synced: number; // 0 = false (unsynced), 1 = true (synced)
}

class OfflineQueueManager {
  private db: IDBDatabase | null = null;

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[OfflineQueue] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OfflineQueue] Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;

        // Create object store if it doesn't exist (version 0 -> 1)
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });

          // Create indexes
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('synced', 'synced', { unique: false });

          console.log('[OfflineQueue] Object store created');
        } else if (oldVersion === 1) {
          // Migration from version 1 to 2: convert boolean to number
          const transaction = (event.target as IDBOpenDBRequest).transaction!;
          const objectStore = transaction.objectStore(STORE_NAME);

          // Delete old index
          if (objectStore.indexNames.contains('synced')) {
            objectStore.deleteIndex('synced');
          }

          // Recreate index (will work with numeric values)
          objectStore.createIndex('synced', 'synced', { unique: false });

          // Convert existing boolean values to numbers
          const cursorRequest = objectStore.openCursor();
          cursorRequest.onsuccess = (e) => {
            const cursor = (e.target as IDBRequest).result;
            if (cursor) {
              const value = cursor.value;
              if (typeof value.synced === 'boolean') {
                value.synced = value.synced ? 1 : 0;
                cursor.update(value);
              }
              cursor.continue();
            }
          };

          console.log('[OfflineQueue] Migrated to version 2');
        }
      };
    });
  }

  /**
   * Add a transaction to the offline queue
   */
  async addToQueue(transactionData: any): Promise<number> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const queueItem: OfflineTransaction = {
        data: transactionData,
        timestamp: Date.now(),
        synced: 0, // 0 = unsynced
      };

      const request = store.add(queueItem);

      request.onsuccess = () => {
        const id = request.result as number;
        console.log('[OfflineQueue] Added to queue:', id);
        resolve(id);
      };

      request.onerror = () => {
        console.error('[OfflineQueue] Failed to add to queue:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all unsynced transactions from the queue
   */
  async getUnsyncedTransactions(): Promise<OfflineTransaction[]> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('synced');
      const request = index.getAll(IDBKeyRange.only(0)); // 0 = unsynced

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('[OfflineQueue] Failed to get unsynced transactions:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all transactions from the queue
   */
  async getAllTransactions(): Promise<OfflineTransaction[]> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('[OfflineQueue] Failed to get all transactions:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Mark a transaction as synced
   */
  async markAsSynced(id: number): Promise<void> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const data = request.result;
        if (data) {
          data.synced = 1; // 1 = synced
          const updateRequest = store.put(data);

          updateRequest.onsuccess = () => {
            console.log('[OfflineQueue] Marked as synced:', id);
            resolve();
          };

          updateRequest.onerror = () => {
            console.error('[OfflineQueue] Failed to mark as synced:', updateRequest.error);
            reject(updateRequest.error);
          };
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        console.error('[OfflineQueue] Failed to get transaction:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Remove a transaction from the queue
   */
  async removeFromQueue(id: number): Promise<void> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('[OfflineQueue] Removed from queue:', id);
        resolve();
      };

      request.onerror = () => {
        console.error('[OfflineQueue] Failed to remove from queue:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all synced transactions from the queue
   */
  async clearSynced(): Promise<void> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('synced');
      const request = index.openCursor(IDBKeyRange.only(1)); // 1 = synced

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          console.log('[OfflineQueue] Cleared synced transactions');
          resolve();
        }
      };

      request.onerror = () => {
        console.error('[OfflineQueue] Failed to clear synced transactions:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all transactions from the queue
   */
  async clearAll(): Promise<void> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[OfflineQueue] Cleared all transactions');
        resolve();
      };

      request.onerror = () => {
        console.error('[OfflineQueue] Failed to clear all transactions:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get the count of unsynced transactions
   */
  async getUnsyncedCount(): Promise<number> {
    const db = await this.init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('synced');
      const request = index.count(IDBKeyRange.only(0)); // 0 = unsynced

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('[OfflineQueue] Failed to get unsynced count:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Sync all unsynced transactions to the server
   */
  async syncToServer(): Promise<{ success: number; failed: number }> {
    const unsynced = await this.getUnsyncedTransactions();
    let success = 0;
    let failed = 0;

    console.log('[OfflineQueue] Syncing', unsynced.length, 'transactions to server');

    for (const item of unsynced) {
      try {
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(item.data),
        });

        if (response.ok) {
          await this.removeFromQueue(item.id!);
          success++;
        } else {
          console.error('[OfflineQueue] Failed to sync transaction:', item.id, await response.text());
          failed++;
        }
      } catch (error) {
        console.error('[OfflineQueue] Error syncing transaction:', item.id, error);
        failed++;
      }
    }

    console.log('[OfflineQueue] Sync complete:', { success, failed });
    return { success, failed };
  }

  /**
   * Register for background sync (if supported)
   */
  async registerBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-transactions');
        console.log('[OfflineQueue] Background sync registered');
      } catch (error) {
        console.error('[OfflineQueue] Background sync registration failed:', error);
      }
    } else {
      console.log('[OfflineQueue] Background sync not supported');
    }
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueueManager();

// Initialize on module load (browser only)
if (typeof window !== 'undefined') {
  offlineQueue.init().catch(console.error);
}
