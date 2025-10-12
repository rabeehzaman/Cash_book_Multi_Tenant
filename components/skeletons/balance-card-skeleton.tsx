import { Card } from "@/components/ui/card";

export function BalanceCardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Bank Account Info Skeleton */}
      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
        </div>
      </Card>

      {/* Summary Card Skeleton */}
      <Card className="p-4 md:p-6">
        <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-3" />
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="h-3 w-12 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-14 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-8 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </Card>
    </div>
  );
}
