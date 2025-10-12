"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TransactionForm } from "@/components/transaction-form";
import { ArrowLeft } from "lucide-react";

function AddTransactionContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") as "cash_in" | "cash_out" | null;

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {type === "cash_in" ? "Cash In" : type === "cash_out" ? "Cash Out" : "Add Transaction"}
          </h1>
          <p className="text-sm text-muted-foreground">Create a new cash transaction</p>
        </div>
      </div>

      {/* Transaction Form */}
      <TransactionForm initialType={type} />
    </div>
  );
}

export default function AddTransactionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-6 max-w-2xl mx-auto">Loading...</div>}>
      <AddTransactionContent />
    </Suspense>
  );
}
