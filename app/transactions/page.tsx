"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Search } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Transaction {
  id: string;
  transaction_date: string;
  amount: number;
  type: "cash_in" | "cash_out";
  description?: string | null;
  receipt_url?: string | null;
  party_name?: string | null;
  category_id?: string | null;
  category?: {
    id: string;
    name: string;
    type: string;
    color?: string;
    icon?: string;
  } | null;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "cash_in" | "cash_out">("all");
  const [search, setSearch] = useState("");

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== "all") params.append("type", filter);
      if (search) params.append("search", search);

      const response = await fetch(`/api/transactions?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setTransactions(result.transactions);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [filter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions();
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold">All Transactions</h1>
            <p className="text-sm text-muted-foreground">
              View and manage your cash flow
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="cash_in" className="text-emerald-600">
              Cash In
            </TabsTrigger>
            <TabsTrigger value="cash_out" className="text-rose-600">
              Cash Out
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Transactions List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-4 shadow-sm border animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-5 w-32 bg-slate-200 rounded" />
                    <div className="h-4 w-24 bg-slate-200 rounded" />
                  </div>
                  <div className="h-6 w-20 bg-slate-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-lg font-medium mb-2">No transactions found</p>
            <p className="text-muted-foreground mb-6">
              {search
                ? "Try a different search term"
                : "Start by adding your first transaction"}
            </p>
            <Link href="/">
              <Button>Back to Dashboard</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">
                        {transaction.type === "cash_in" ? "💸" : "💳"}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-base">
                          {transaction.description ||
                            (transaction.type === "cash_in"
                              ? "Cash In"
                              : "Cash Out")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(transaction.transaction_date)}
                        </p>
                      </div>
                    </div>

                    {/* Party Name */}
                    {transaction.party_name && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground pl-12">
                        <span className="font-medium">
                          {transaction.type === "cash_in" ? "From:" : "To:"}
                        </span>
                        <span>{transaction.party_name}</span>
                      </div>
                    )}

                    {/* Category */}
                    {transaction.category && (
                      <div className="flex items-center gap-2 pl-12">
                        {transaction.category.color && (
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: transaction.category.color }}
                          />
                        )}
                        <span className="text-sm text-muted-foreground">
                          {transaction.category.name}
                        </span>
                      </div>
                    )}

                    {/* Receipt */}
                    {transaction.receipt_url && (
                      <a
                        href={transaction.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline pl-12 inline-flex items-center gap-1"
                      >
                        📎 View Receipt
                      </a>
                    )}
                  </div>

                  <div className="text-right">
                    <p
                      className={`text-2xl font-bold ${
                        transaction.type === "cash_in"
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }`}
                    >
                      {transaction.type === "cash_in" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results Count */}
        {!loading && transactions.length > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            Showing {transactions.length} transaction
            {transactions.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
