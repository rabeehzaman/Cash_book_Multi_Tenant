"use client";

import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Transaction {
  id: string;
  transaction_date: string;
  amount: number;
  type: "cash_in" | "cash_out";
  category: string;
  party_name: string;
  description?: string | null;
  receipt_url?: string | null;
}

interface TransactionCardProps {
  transaction: Transaction;
}

export function TransactionCard({ transaction }: TransactionCardProps) {
  const isCashIn = transaction.type === "cash_in";

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          {/* Date */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {format(new Date(transaction.transaction_date), "dd MMM yyyy")}
            </p>
            <span className={`text-xs px-2 py-0.5 rounded ${
              isCashIn ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {isCashIn ? '💰 Cash In' : '💸 Cash Out'}
            </span>
          </div>

          {/* Party and Category */}
          <div>
            <p className="font-semibold">{transaction.party_name}</p>
            <p className="text-sm text-muted-foreground">{transaction.category}</p>
          </div>

          {/* Description */}
          {transaction.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {transaction.description}
            </p>
          )}

          {/* Receipt */}
          {transaction.receipt_url && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-8"
              onClick={() => window.open(transaction.receipt_url!, "_blank")}
            >
              <FileText className="h-3 w-3" />
              View Receipt
            </Button>
          )}
        </div>

        {/* Amount */}
        <div className="flex flex-col items-end">
          <p className={`text-xl font-bold ${isCashIn ? 'text-green-600' : 'text-red-600'}`}>
            {isCashIn ? '+' : '-'}{Math.abs(transaction.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </Card>
  );
}
