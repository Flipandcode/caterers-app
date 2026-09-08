"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentMethod, PaymentType } from "@/types/domain";
import { formatPaise, rupeesToPaise } from "@/lib/money";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { recordPaymentAction } from "@/server/actions/payments";

const PAYMENT_TYPES: { value: PaymentType; label: string }[] = [
  { value: "advance", label: "Advance" },
  { value: "part_payment", label: "Part payment" },
  { value: "final_payment", label: "Final payment" },
  { value: "refund", label: "Refund" },
  { value: "adjustment", label: "Adjustment" },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

interface RecordPaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  orderId: string;
  balancePaise: number;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RecordPaymentForm({ open, onOpenChange, businessId, orderId, balancePaise }: RecordPaymentFormProps) {
  const router = useRouter();
  const [amountRupees, setAmountRupees] = useState(balancePaise > 0 ? String(balancePaise / 100) : "");
  const [paymentType, setPaymentType] = useState<PaymentType>("advance");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(amountRupees);
    if (!amount || amount <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setSaving(true);
    setError(null);

    const result = await recordPaymentAction({
      businessId,
      orderId,
      amountPaise: rupeesToPaise(amount),
      paymentType,
      paymentMethod,
      paymentDate,
      referenceNumber: referenceNumber.trim() || null,
      notes: notes.trim() || null,
    });

    if (result.success) {
      onOpenChange(false);
      router.refresh();
    } else {
      setError(result.error ?? "Something went wrong. Please try again.");
    }
    setSaving(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Record payment</SheetTitle>
        </SheetHeader>

        {balancePaise > 0 && (
          <p className="mb-2 text-sm text-ink/60">{formatPaise(balancePaise)} balance remaining</p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Amount</label>
            <Input
              autoFocus
              inputMode="decimal"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              placeholder="0"
              className="h-12 text-base"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Payment type</label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setPaymentType(t.value)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                    paymentType === t.value
                      ? "border-marigold bg-marigold/15"
                      : "border-surface text-ink/70"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Payment method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="h-12 w-full rounded-lg border border-surface bg-transparent px-3 text-base"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Payment date</label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Reference number <span className="font-normal text-ink/50">(optional)</span>
            </label>
            <Input
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="UPI transaction ID, cheque number, etc."
              className="h-12 text-base"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Notes <span className="font-normal text-ink/50">(optional)</span>
            </label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          {error && <p className="text-sm text-tamarind">{error}</p>}

          <Button
            type="submit"
            disabled={saving}
            className="mt-2 h-12 bg-marigold text-base font-medium text-white hover:bg-marigold/90"
          >
            {saving ? "Saving…" : "Record payment"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
