"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { CalendarIcon, Loader2, Upload, X } from "lucide-react";

interface Category {
  id: string;
  name: string;
  type: string;
  color?: string;
}

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

interface QuickTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "cash_in" | "cash_out";
  onSuccess?: (transaction: Transaction) => void;
  editingTransaction?: Transaction | null;
}

function formatDateForDisplay(date: Date | undefined) {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateForAPI(date: Date | undefined) {
  if (!date) return new Date().toISOString().split('T')[0];
  return date.toISOString().split('T')[0]; // yyyy-MM-dd
}

function isValidDate(date: Date | undefined) {
  if (!date) return false;
  return !isNaN(date.getTime());
}

export function QuickTransactionModal({
  open,
  onOpenChange,
  type,
  onSuccess,
  editingTransaction,
}: QuickTransactionModalProps) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dateInputValue, setDateInputValue] = useState(formatDateForDisplay(new Date()));
  const [description, setDescription] = useState("");
  const [partyName, setPartyName] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  // Populate form when editing
  useEffect(() => {
    if (editingTransaction) {
      setAmount(editingTransaction.amount.toString());
      const txDate = new Date(editingTransaction.transaction_date);
      setDate(txDate);
      setDateInputValue(formatDateForDisplay(txDate));
      setDescription(editingTransaction.description || "");
      setPartyName(editingTransaction.party_name || "");
      setCategoryId(editingTransaction.category_id || undefined);
      // Note: receipt file cannot be pre-filled from URL
    } else {
      // Reset form when creating new
      setAmount("");
      const today = new Date();
      setDate(today);
      setDateInputValue(formatDateForDisplay(today));
      setDescription("");
      setPartyName("");
      setCategoryId(undefined);
      setReceiptFile(null);
    }
  }, [editingTransaction]);

  // Fetch categories when modal opens
  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open, type]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`/api/categories?type=${type}`);
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories);
        console.log(`Fetched ${data.categories.length} categories for type ${type}`);
      } else {
        console.error("Failed to fetch categories:", data.error);
        toast.error(data.error || "Failed to load categories");
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      toast.error("Failed to load categories");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("type", type);
      formData.append("amount", amount);
      formData.append("transaction_date", formatDateForAPI(date));
      if (description) formData.append("description", description);
      if (partyName) formData.append("party_name", partyName);
      if (categoryId) formData.append("category_id", categoryId);
      if (receiptFile) formData.append("receipt", receiptFile);

      const isEditing = !!editingTransaction;
      const url = isEditing
        ? `/api/transactions/${editingTransaction.id}`
        : "/api/transactions";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${isEditing ? "update" : "create"} transaction`);
      }

      // Success! (toast is handled by parent component after refetch)

      // Reset form
      setAmount("");
      const today = new Date();
      setDate(today);
      setDateInputValue(formatDateForDisplay(today));
      setDescription("");
      setPartyName("");
      setCategoryId(undefined);
      setReceiptFile(null);

      // Close modal
      onOpenChange(false);

      // Trigger optimistic update via callback with the created/updated transaction
      if (onSuccess && data.transaction) {
        onSuccess(data.transaction);
      }
    } catch (error: any) {
      console.error("Transaction error:", error);
      toast.error(error.message || `Failed to ${editingTransaction ? "update" : "create"} transaction`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setReceiptFile(file);
    }
  };

  const removeFile = () => {
    setReceiptFile(null);
  };

  const isEditing = !!editingTransaction;
  const modalTitle = isEditing
    ? `✏️ Edit ${type === "cash_in" ? "Cash In" : "Cash Out"}`
    : type === "cash_in"
    ? "💸 Cash In"
    : "💳 Cash Out";
  const buttonColor = type === "cash_in"
    ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
    : "bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[425px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-2xl">{modalTitle}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 mt-2 sm:mt-4">
          {/* Amount Field - Large and Prominent */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium">
              Amount <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              required
              disabled={loading}
              autoFocus
              className="h-12 sm:h-14 text-xl sm:text-2xl font-bold px-3 sm:px-4"
            />
          </div>

          {/* Transaction Date */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="transaction-date" className="text-sm font-medium">
              Date
            </Label>
            <div className="relative flex gap-2">
              <Input
                id="transaction-date"
                value={dateInputValue}
                placeholder="Jan 01, 2025"
                className="bg-background pr-10"
                disabled={loading}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  setDateInputValue(e.target.value);
                  if (isValidDate(newDate)) {
                    setDate(newDate);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setDatePickerOpen(true);
                  }
                }}
              />
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={loading}
                    className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                  >
                    <CalendarIcon className="size-3.5" />
                    <span className="sr-only">Select date</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto overflow-hidden p-0"
                  align="end"
                  alignOffset={-8}
                  sideOffset={10}
                >
                  <Calendar
                    mode="single"
                    selected={date}
                    captionLayout="dropdown"
                    onSelect={(selectedDate) => {
                      if (selectedDate) {
                        setDate(selectedDate);
                        setDateInputValue(formatDateForDisplay(selectedDate));
                        setDatePickerOpen(false);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Party Name - Optional */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="partyName" className="text-sm font-medium">
              {type === "cash_in" ? "Received From" : "Paid To"}{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="partyName"
              type="text"
              placeholder={type === "cash_in" ? "e.g., Customer name" : "e.g., Vendor name"}
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Category - Optional */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="category" className="text-sm font-medium">
              Category <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Select value={categoryId} onValueChange={(value) => setCategoryId(value)} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder={categories.length === 0 ? "No categories available" : "Select a category (optional)"} />
              </SelectTrigger>
              <SelectContent>
                {categories.length === 0 ? (
                  <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                    No categories found. Create one in Settings.
                  </div>
                ) : (
                  categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        {cat.color && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                        )}
                        <span>{cat.name}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Description Field - Optional */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Add a note about this transaction..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          {/* Receipt Upload - Optional */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="receipt" className="text-sm font-medium">
              Receipt <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>

            {receiptFile ? (
              <div className="flex items-center gap-2 p-2 sm:p-3 bg-muted rounded-lg">
                <Upload className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm flex-1 truncate">{receiptFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  disabled={loading}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  disabled={loading}
                  className="cursor-pointer"
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Upload an image or PDF (max 5MB)
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 sm:gap-3 pt-2 sm:pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 h-10 sm:h-11"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !amount}
              className={`flex-1 h-10 sm:h-11 ${buttonColor}`}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Updating..." : "Saving..."}
                </>
              ) : (
                isEditing ? "Update" : "Save"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
