"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/lib/hooks/use-organization";
import { Button } from "@/components/ui/button";
import { QuickTransactionModal } from "@/components/quick-transaction-modal";
import { ArrowDownCircle, ArrowUpCircle, LogOut, Settings, User, List, Pencil, Trash2, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
}

interface DashboardData {
  transactions: Transaction[];
  balance: {
    total_cash_in: number;
    total_cash_out: number;
    net_balance: number;
  };
}

export default function Home() {
  const router = useRouter();
  const { organization, userRole, hasPermission, loading: orgLoading } = useOrganization();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cashInModalOpen, setCashInModalOpen] = useState(false);
  const [cashOutModalOpen, setCashOutModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/transactions?limit=10");
      const result = await response.json();

      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionSuccess = (newTransaction: Transaction) => {
    if (!data) return;

    // Add new transaction to the top of the list
    const updatedTransactions = [newTransaction, ...data.transactions].slice(0, 10);

    // Update balance calculations
    const amount = newTransaction.amount;
    const updatedBalance = {
      total_cash_in: data.balance.total_cash_in + (newTransaction.type === "cash_in" ? amount : 0),
      total_cash_out: data.balance.total_cash_out + (newTransaction.type === "cash_out" ? amount : 0),
      net_balance: data.balance.net_balance + (newTransaction.type === "cash_in" ? amount : -amount),
    };

    // Update state with new transaction and balance
    setData({
      transactions: updatedTransactions,
      balance: updatedBalance,
    });
  };

  const handleTransactionUpdate = (updatedTransaction: Transaction) => {
    if (!data) return;

    // Find the old transaction to calculate balance difference
    const oldTransaction = data.transactions.find((t) => t.id === updatedTransaction.id);
    if (!oldTransaction) return;

    // Calculate the difference in amounts
    const oldAmount = oldTransaction.type === "cash_in" ? oldTransaction.amount : -oldTransaction.amount;
    const newAmount = updatedTransaction.type === "cash_in" ? updatedTransaction.amount : -updatedTransaction.amount;
    const difference = newAmount - oldAmount;

    // Update transactions list
    const updatedTransactions = data.transactions.map((t) =>
      t.id === updatedTransaction.id ? updatedTransaction : t
    );

    // Update balance calculations
    const updatedBalance = {
      total_cash_in: data.balance.total_cash_in - (oldTransaction.type === "cash_in" ? oldTransaction.amount : 0) + (updatedTransaction.type === "cash_in" ? updatedTransaction.amount : 0),
      total_cash_out: data.balance.total_cash_out - (oldTransaction.type === "cash_out" ? oldTransaction.amount : 0) + (updatedTransaction.type === "cash_out" ? updatedTransaction.amount : 0),
      net_balance: data.balance.net_balance + difference,
    };

    setData({
      transactions: updatedTransactions,
      balance: updatedBalance,
    });

    setEditingTransaction(null);
  };

  const handleDelete = async () => {
    if (!deletingTransaction || !data) return;

    try {
      const response = await fetch(`/api/transactions/${deletingTransaction.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete transaction");
      }

      // Remove transaction from list
      const updatedTransactions = data.transactions.filter((t) => t.id !== deletingTransaction.id);

      // Update balance calculations
      const amount = deletingTransaction.amount;
      const updatedBalance = {
        total_cash_in: data.balance.total_cash_in - (deletingTransaction.type === "cash_in" ? amount : 0),
        total_cash_out: data.balance.total_cash_out - (deletingTransaction.type === "cash_out" ? amount : 0),
        net_balance: data.balance.net_balance - (deletingTransaction.type === "cash_in" ? amount : -amount),
      };

      setData({
        transactions: updatedTransactions,
        balance: updatedBalance,
      });

      toast.success("Transaction deleted successfully");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete transaction");
    } finally {
      setDeletingTransaction(null);
    }
  };

  useEffect(() => {
    if (!orgLoading && organization) {
      fetchData();
    }
  }, [orgLoading, organization]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  if (orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-500 to-blue-500 rounded-2xl animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <span className="text-3xl">💰</span>
              Cash Book
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              {organization?.name || "Loading..."}
              {userRole && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  {userRole.role}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/transactions">
              <Button variant="ghost" size="icon" title="All Transactions">
                <List className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="icon" title="Settings">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Balance Card - Large and Prominent */}
        <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 rounded-3xl p-6 md:p-8 text-white shadow-xl">
          <p className="text-sm md:text-base text-emerald-100 mb-2">
            Current Balance
          </p>
          {loading ? (
            <div className="h-12 w-48 bg-white/20 rounded-lg animate-pulse" />
          ) : (
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              {formatCurrency(data?.balance?.net_balance || 0)}
            </h2>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <p className="text-xs md:text-sm text-emerald-100 mb-1">
                Total Cash In
              </p>
              <p className="text-lg md:text-2xl font-semibold">
                {loading ? "..." : formatCurrency(data?.balance?.total_cash_in || 0)}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <p className="text-xs md:text-sm text-emerald-100 mb-1">
                Total Cash Out
              </p>
              <p className="text-lg md:text-2xl font-semibold">
                {loading ? "..." : formatCurrency(data?.balance?.total_cash_out || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions - Large, Beautiful Buttons (Editors and above) */}
        {hasPermission("editor") && (
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <Button
              onClick={() => setCashInModalOpen(true)}
              className="h-16 md:h-20 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all text-base md:text-lg font-semibold"
              size="lg"
            >
              <ArrowDownCircle className="mr-2 h-5 w-5 md:h-6 md:w-6" />
              Cash In
            </Button>
            <Button
              onClick={() => setCashOutModalOpen(true)}
              className="h-16 md:h-20 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-lg hover:shadow-xl transition-all text-base md:text-lg font-semibold"
              size="lg"
            >
              <ArrowUpCircle className="mr-2 h-5 w-5 md:h-6 md:w-6" />
              Cash Out
            </Button>
          </div>
        )}

        {/* Viewer Message */}
        {!hasPermission("editor") && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
            <p className="text-blue-800 font-medium">
              You have view-only access
            </p>
            <p className="text-sm text-blue-600 mt-1">
              Contact an admin to get edit permissions
            </p>
          </div>
        )}

        {/* Recent Transactions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Transactions</h2>
            {!loading && data && data.transactions.length > 0 && (
              <Link href="/transactions">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
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
          ) : data && data.transactions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-lg font-medium mb-2">No transactions yet</p>
              <p className="text-muted-foreground mb-6">
                {hasPermission("editor")
                  ? "Start tracking your cash flow"
                  : "No transactions to display"}
              </p>
              {hasPermission("editor") && (
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => setCashInModalOpen(true)}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                  >
                    Add Cash In
                  </Button>
                  <Button
                    onClick={() => setCashOutModalOpen(true)}
                    className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700"
                  >
                    Add Cash Out
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {data?.transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">
                          {transaction.type === "cash_in" ? "💸" : "💳"}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-sm md:text-base">
                            {transaction.description || (transaction.type === "cash_in" ? "Cash In" : "Cash Out")}
                          </p>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {formatDate(transaction.transaction_date)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <p
                        className={`text-lg md:text-xl font-bold ${
                          transaction.type === "cash_in"
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {transaction.type === "cash_in" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </p>
                      {(hasPermission("editor") || hasPermission("admin")) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {hasPermission("editor") && (
                              <DropdownMenuItem onClick={() => setEditingTransaction(transaction)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {hasPermission("admin") && (
                              <DropdownMenuItem
                                onClick={() => setDeletingTransaction(transaction)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Modals */}
      <QuickTransactionModal
        open={cashInModalOpen}
        onOpenChange={setCashInModalOpen}
        type="cash_in"
        onSuccess={handleTransactionSuccess}
      />
      <QuickTransactionModal
        open={cashOutModalOpen}
        onOpenChange={setCashOutModalOpen}
        type="cash_out"
        onSuccess={handleTransactionSuccess}
      />

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <QuickTransactionModal
          open={!!editingTransaction}
          onOpenChange={(open) => !open && setEditingTransaction(null)}
          type={editingTransaction.type}
          onSuccess={handleTransactionUpdate}
          editingTransaction={editingTransaction}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingTransaction} onOpenChange={(open) => !open && setDeletingTransaction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
