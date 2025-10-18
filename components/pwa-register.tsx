'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

export function PWARegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Service worker is registered automatically by next-pwa
      // This component just handles additional setup and messaging

      // Listen for service worker updates
      navigator.serviceWorker.ready.then((registration) => {
        console.log('[PWA] Service Worker ready:', registration);

        // Check for updates periodically
        const checkForUpdates = () => {
          registration.update().catch((error) => {
            console.error('[PWA] Update check failed:', error);
          });
        };

        // Check for updates every hour
        const updateInterval = setInterval(checkForUpdates, 60 * 60 * 1000);

        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker installed, prompt user to reload
                toast.info('App update available', {
                  description: 'Click to refresh and get the latest version',
                  action: {
                    label: 'Refresh',
                    onClick: () => window.location.reload(),
                  },
                  duration: 10000,
                });
              }
            });
          }
        });

        return () => {
          clearInterval(updateInterval);
        };
      });

      // Listen for service worker messages (for offline sync)
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('[PWA] Message from service worker:', event.data);

        if (event.data && event.data.type === 'SYNC_COMPLETE') {
          // Dispatch custom event for offline queue hook
          window.dispatchEvent(new CustomEvent('sw-sync-complete', {
            detail: { count: event.data.count },
          }));
        }
      });

      // Handle install prompt
      let deferredPrompt: any;
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        console.log('[PWA] Install prompt available');

        // Show install prompt after 30 seconds if not already installed
        setTimeout(() => {
          if (deferredPrompt && !window.matchMedia('(display-mode: standalone)').matches) {
            toast.info('Install Cash Book', {
              description: 'Add to home screen for the best experience',
              action: {
                label: 'Install',
                onClick: () => {
                  deferredPrompt.prompt();
                  deferredPrompt.userChoice.then((choiceResult: any) => {
                    if (choiceResult.outcome === 'accepted') {
                      console.log('[PWA] User accepted install prompt');
                    }
                    deferredPrompt = null;
                  });
                },
              },
              duration: 10000,
            });
          }
        }, 30000);
      });

      // Log if running as PWA
      if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('[PWA] Running as installed app');
      }
    }
  }, []);

  return null;
}
