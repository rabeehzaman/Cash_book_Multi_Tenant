/* eslint-disable no-restricted-globals */
// Custom Service Worker for Cash Book PWA
// This file adds background sync support for offline transactions

const CACHE_NAME = 'cashbook-v1';
const SYNC_TAG = 'sync-transactions';

// Listen for background sync
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync triggered:', event.tag);

  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncTransactions());
  }
});

// Sync offline transactions to server
async function syncTransactions() {
  try {
    // Open IndexedDB
    const db = await openDB();
    const tx = db.transaction('offline-queue', 'readonly');
    const store = tx.objectStore('offline-queue');
    const allTransactions = await getAllFromStore(store);

    console.log('[Service Worker] Syncing', allTransactions.length, 'offline transactions');

    // Sync each transaction
    for (const item of allTransactions) {
      try {
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(item.data),
        });

        if (response.ok) {
          // Remove from offline queue
          const deleteTx = db.transaction('offline-queue', 'readwrite');
          const deleteStore = deleteTx.objectStore('offline-queue');
          await deleteStore.delete(item.id);
          console.log('[Service Worker] Successfully synced transaction:', item.id);
        }
      } catch (error) {
        console.error('[Service Worker] Failed to sync transaction:', item.id, error);
      }
    }

    // Notify clients that sync is complete
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        count: allTransactions.length,
      });
    });

  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
    throw error; // Retry sync later
  }
}

// Helper to open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('cashbook-offline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline-queue')) {
        db.createObjectStore('offline-queue', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Helper to get all items from store
function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Listen for messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Install event
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME;
          })
          .map((cacheName) => {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - let next-pwa handle most caching
self.addEventListener('fetch', (event) => {
  // Let next-pwa handle the fetch
  // This is just a placeholder for custom fetch handling if needed
});

console.log('[Service Worker] Loaded');
