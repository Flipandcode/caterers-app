"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OrderStatus } from "@/types/domain";
import { updateOrderStatusAction, cancelOrderAction } from "@/server/actions/order-lifecycle";

type NonCancelledStatus = Exclude<OrderStatus, "cancelled">;

const STATUS_FLOW: { value: NonCancelledStatus; label: string }[] = [
  { value: "enquiry", label: "Enquiry" },
  { value: "quotation_sent", label: "Quotation sent" },
  { value: "tentative", label: "Tentative" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparation", label: "Preparation" },
  { value: "completed", label: "Completed" },
];

interface OrderStatusControlProps {
  businessId: string;
  orderId: string;
  currentStatus: OrderStatus;
  isCancelled: boolean;
}

export function OrderStatusControl({ businessId, orderId, currentStatus, isCancelled }: OrderStatusControlProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  async function handleStatusClick(newStatus: NonCancelledStatus) {
    if (newStatus === currentStatus || saving) return;
    setSaving(true);
    setError(null);
    const result = await updateOrderStatusAction({ businessId, orderId, newStatus });
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error ?? "Something went wrong.");
    }
    setSaving(false);
  }

  async function handleCancel() {
    setSaving(true);
    setError(null);
    const result = await cancelOrderAction({ businessId, orderId });
    if (result.success) {
      setConfirmingCancel(false);
      router.refresh();
    } else {
      setError(result.error ?? "Something went wrong.");
    }
    setSaving(false);
  }

  if (isCancelled) {
    return (
      <div className="rounded-lg border border-tamarind/30 bg-tamarind/5 px-3 py-2 text-sm text-tamarind">
        This order was cancelled and its status can no longer be changed.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {STATUS_FLOW.map((s) => {
          const isCurrent = s.value === currentStatus;
          return (
            <button
              key={s.value}
              onClick={() => handleStatusClick(s.value)}
              disabled={saving}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                isCurrent ? "border-marigold bg-marigold/15" : "border-surface text-ink/60"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {error && <p className="mt-2 text-sm text-tamarind">{error}</p>}

      <div className="mt-3">
        {confirmingCancel ? (
          <div className="rounded-lg border border-tamarind/30 bg-tamarind/5 p-3">
            <p className="text-sm">Cancel this order? This can't be undone.</p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="rounded-lg bg-tamarind px-3 py-1.5 text-sm font-medium text-white"
              >
                {saving ? "Cancelling…" : "Yes, cancel order"}
              </button>
              <button
                onClick={() => setConfirmingCancel(false)}
                className="rounded-lg border border-surface px-3 py-1.5 text-sm"
              >
                Keep order
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmingCancel(true)} className="text-sm font-medium text-tamarind">
            Cancel order
          </button>
        )}
      </div>
    </div>
  );
}
