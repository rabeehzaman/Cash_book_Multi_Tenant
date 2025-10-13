"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReceiptUpload } from "@/components/receipt-upload";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

const categories = [
  "Sales",
  "Services",
  "Other Income",
  "Expenses",
  "Salary",
  "Rent",
  "Utilities",
  "General",
];

interface TransactionFormProps {
  initialType?: "cash_in" | "cash_out" | null;
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

export function TransactionForm({ initialType }: TransactionFormProps) {
  const router = useRouter();
  const [type, setType] = useState<"cash_in" | "cash_out">(initialType || "cash_out");
  const [date, setDate] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dateInputValue, setDateInputValue] = useState(formatDateForDisplay(new Date()));
  const [amount, setAmount] = useState<string>("");
  const [partyName, setPartyName] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = () => {
    return amount && parseFloat(amount) > 0 && partyName && category;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);

      // Prepare form data
      const formData = new FormData();
      formData.append("type", type);
      formData.append("transaction_date", formatDateForAPI(date));
      formData.append("amount", amount);
      formData.append("party_name", partyName);
      formData.append("category", category);
      formData.append("description", description || "");

      if (receipt) {
        formData.append("receipt", receipt);
      }

      const response = await fetch("/api/transactions", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create transaction");
      }

      toast.success("Transaction created successfully!");
      router.push("/");
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">New Transaction</h2>
        <p className="text-sm text-muted-foreground">Add a cash in or cash out transaction</p>
      </div>

      {/* Transaction Type */}
      <div className="space-y-2">
        <Label>Transaction Type</Label>
        <Tabs value={type} onValueChange={(v) => setType(v as "cash_in" | "cash_out")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cash_in">💰 Cash In</TabsTrigger>
            <TabsTrigger value="cash_out">💸 Cash Out</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Transaction Date */}
      <div className="space-y-2">
        <Label htmlFor="transaction-date">Transaction Date</Label>
        <div className="relative flex gap-2">
          <Input
            id="transaction-date"
            value={dateInputValue}
            placeholder="Jan 01, 2025"
            className="bg-background pr-10"
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

      {/* Amount */}
      <div className="space-y-2">
        <Label>Amount *</Label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onFocus={(e) => e.target.select()}
          onWheel={(e) => e.currentTarget.blur()}
          placeholder="0.00"
          step="0.01"
          required
        />
      </div>

      {/* Party Name */}
      <div className="space-y-2">
        <Label>{type === "cash_in" ? "From" : "To"} *</Label>
        <Input
          value={partyName}
          onChange={(e) => setPartyName(e.target.value)}
          placeholder={type === "cash_in" ? "Who is this payment from?" : "Who is this payment to?"}
          required
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label>Category *</Label>
        <Select value={category} onValueChange={setCategory} required>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label>Description (Optional)</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add notes..."
          rows={3}
        />
      </div>

      {/* Receipt Upload */}
      <ReceiptUpload value={receipt} onChange={setReceipt} />

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={!canSubmit() || loading}
        className="w-full"
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {loading ? "Creating..." : "Create Transaction"}
      </Button>
    </Card>
  );
}
