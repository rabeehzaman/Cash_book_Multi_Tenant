"use client";

import { Card } from "@/components/ui/card";

interface BalanceCardProps {
  cashIn: number;
  cashOut: number;
}

export function BalanceCard({ cashIn, cashOut }: BalanceCardProps) {
  const netBalance = cashIn - cashOut;
  const isPositive = netBalance >= 0;

  return (
    <Card className="p-4 md:p-6">
      <div className="space-y-6">
        {/* Current Balance */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-medium">Current Balance</p>
          <p className={`text-3xl md:text-4xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          {/* Cash In */}
          <div className="space-y-1">
            <p className="text-xs md:text-sm text-muted-foreground">Cash In</p>
            <p className="text-lg md:text-2xl font-bold text-green-600">
              {cashIn.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Cash Out */}
          <div className="space-y-1">
            <p className="text-xs md:text-sm text-muted-foreground">Cash Out</p>
            <p className="text-lg md:text-2xl font-bold text-red-600">
              {cashOut.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
