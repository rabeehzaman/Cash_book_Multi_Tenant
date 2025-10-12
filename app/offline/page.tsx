'use client';

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    }
  };

  const goHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Icon */}
        <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100">
          <WifiOff className="w-10 h-10 text-gray-600" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          You're Offline
        </h1>

        {/* Description */}
        <p className="text-gray-600 mb-6">
          {isOnline
            ? 'Connection restored! You can now access the app.'
            : 'It looks like you lost your internet connection. Some features may not be available until you reconnect.'}
        </p>

        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6 p-3 rounded-lg bg-gray-50">
          <div
            className={`w-3 h-3 rounded-full ${
              isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}
          />
          <span className="text-sm font-medium text-gray-700">
            {isOnline ? 'Back Online' : 'Offline Mode'}
          </span>
        </div>

        {/* Features Available Offline */}
        <div className="text-left mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            Available Offline:
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• View cached transactions</li>
            <li>• Add new transactions (synced when online)</li>
            <li>• Browse previous data</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleRetry}
            disabled={!isOnline}
            className="w-full"
            size="lg"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {isOnline ? 'Reload Page' : 'Waiting for Connection...'}
          </Button>

          <Button
            onClick={goHome}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Go to Home
          </Button>
        </div>

        {/* Tip */}
        <p className="text-xs text-gray-500 mt-6">
          Tip: Check your Wi-Fi or mobile data connection
        </p>
      </div>
    </div>
  );
}
