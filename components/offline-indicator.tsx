'use client';

import { useOfflineQueue } from '@/lib/hooks/use-offline-queue';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { unsyncedCount, isSyncing, isOnline, syncAll } = useOfflineQueue();

  // Don't show if online and no pending transactions
  if (isOnline && unsyncedCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-50">
      <div
        className={cn(
          'rounded-lg shadow-lg border p-3 backdrop-blur-sm transition-all',
          isOnline
            ? 'bg-blue-50/90 border-blue-200 text-blue-900'
            : 'bg-amber-50/90 border-amber-200 text-amber-900'
        )}
      >
        <div className="flex items-center gap-3">
          {/* Status Icon */}
          <div
            className={cn(
              'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
              isOnline ? 'bg-blue-100' : 'bg-amber-100'
            )}
          >
            {isSyncing ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : isOnline ? (
              <Wifi className="w-5 h-5" />
            ) : (
              <WifiOff className="w-5 h-5" />
            )}
          </div>

          {/* Status Text */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">
              {isSyncing
                ? 'Syncing...'
                : isOnline
                ? 'Pending Sync'
                : 'Offline Mode'}
            </p>
            <p className="text-xs opacity-75">
              {isSyncing
                ? 'Syncing transactions to server'
                : unsyncedCount > 0
                ? `${unsyncedCount} transaction${unsyncedCount > 1 ? 's' : ''} pending`
                : 'Working offline'}
            </p>
          </div>

          {/* Sync Button */}
          {isOnline && unsyncedCount > 0 && !isSyncing && (
            <Button
              size="sm"
              variant="outline"
              onClick={syncAll}
              className="flex-shrink-0 border-current hover:bg-white/50"
            >
              <Cloud className="w-4 h-4 mr-1" />
              Sync
            </Button>
          )}
        </div>

        {/* Progress indicator */}
        {isSyncing && (
          <div className="mt-2 h-1 bg-blue-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full animate-pulse w-2/3" />
          </div>
        )}
      </div>
    </div>
  );
}
