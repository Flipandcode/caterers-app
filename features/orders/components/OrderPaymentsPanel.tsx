"use client";

import { useState } from "react";
import { Payment } from "@/types/domain";
import { formatPaise, paymentStatus } from "@/lib/money";
import { RecordPaymentForm } from "./RecordPaymentForm";

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  advance: "Advance",
  part_payment: "Part payment",
  final_payment: "Final payment",
  refund: "Refund",
  adjustment: "Adjustment",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank transfer",
  card: "Card",
  cheque: "Cheque",
  other: "Other",
};

interface OrderPaymentsPanelProps {
  businessId: string;
  orderId: string;
  grandTotalPaise: number;
  totalPaidPaise: number;
  eventDateISO: string;
  payments: Payment[];
}

export function OrderPaymentsPanel({
  businessId,
  orderId,
  grandTotalPaise,
  totalPaidPaise,
  eventDateISO,
  payments,
}: OrderPaymentsPanelProps) {
  const [formOpen, setFormOpen] = useState(false);
  const balancePaise = grandTotalPaise - totalPaidPaise;
  const status = paymentStatus(grandTotalPaise, totalPaidPaise, eventDateISO);

  return (
    <div>
      <div className="flex items-center justify-between py-0.5 text-sm">
        <span className="text-ink/60">Total paid</span>
        <span>{formatPaise(totalPaidPaise)}</span>
      </div>
      <div className="flex items-center justify-between py-0.5 text-sm">
        <span className="text-ink/60">Balance due</span>
        <span className={balancePaise > 0 ? "font-medium text-tamarind" : ""}>{formatPaise(balancePaise)}</span>
      </div>
      {status === "overdue" && <p className="mt-1 text-sm font-medium text-tamarind">Payment overdue</p>}

      <button
        onClick={() => setFormOpen(true)}
        className="mt-3 rounded-lg bg-marigold px-4 py-2 text-sm font-medium text-white"
      >
        Record payment
      </button>

      {payments.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 border-t border-surface pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Payment history</p>
          {payments.map((p) => (
            <div key={p.id} className="flex items-baseline justify-between text-sm">
              <div>
                <span>{PAYMENT_TYPE_LABELS[p.paymentType] ?? p.paymentType}</span>
                <span className="ml-1.5 text-xs text-ink/40">
                  {PAYMENT_METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod} ·{" "}
                  {new Date(p.paymentDate + "T00:00:00").toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
              <span className={p.paymentType === "refund" ? "text-tamarind" : "font-medium"}>
                {p.paymentType === "refund" ? "− " : ""}
                {formatPaise(p.amountPaise)}
              </span>
            </div>
          ))}
        </div>
      )}

      <RecordPaymentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        businessId={businessId}
        orderId={orderId}
        balancePaise={balancePaise}
      />
    </div>
  );
}
