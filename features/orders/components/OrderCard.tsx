import { OrderListRow } from "@/lib/orders-data";
import { formatPaise, paymentStatus } from "@/lib/money";

const STATUS_LABELS: Record<string, string> = {
  enquiry: "Enquiry",
  quotation_sent: "Quotation sent",
  tentative: "Tentative",
  confirmed: "Confirmed",
  preparation: "Preparation",
  completed: "Completed",
  cancelled: "Cancelled",
};

function daysUntil(dateISO: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateISO + "T00:00:00");
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1) return `${diffDays} days`;
  if (diffDays === -1) return "Yesterday";
  return `${Math.abs(diffDays)} days ago`;
}

export function OrderCard({ order }: { order: OrderListRow }) {
  const balancePaise = order.grandTotalPaise - order.totalPaidPaise;
  const status = paymentStatus(order.grandTotalPaise, order.totalPaidPaise, order.eventDate);
  const isSoon = ["Today", "Tomorrow"].includes(daysUntil(order.eventDate));

  return (
    <div
      className={`rounded-lg border p-4 ${
        isSoon ? "border-marigold bg-marigold/5" : "border-surface"
      }`}
    >
      <div className="flex items-baseline justify-between">
        <p className="font-display text-lg">{order.customerName}</p>
        <span className="text-xs font-medium text-marigold">{daysUntil(order.eventDate)}</span>
      </div>
      <p className="text-sm text-ink/70">{order.eventName}</p>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink/50">
        <span>
          {new Date(order.eventDate + "T00:00:00").toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })}
          {order.eventStartTime ? ` · ${order.eventStartTime.slice(0, 5)}` : ""}
        </span>
        <span>{order.guestCount} guests</span>
        {order.venueName && <span>{order.venueName}</span>}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm">
          <span className="font-medium">{formatPaise(order.grandTotalPaise)}</span>
          {balancePaise > 0 && (
            <span className="ml-2 text-tamarind">{formatPaise(balancePaise)} due</span>
          )}
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            order.status === "cancelled"
              ? "bg-tamarind/10 text-tamarind"
              : order.status === "completed"
                ? "bg-green/10 text-green"
                : "bg-marigold/10 text-marigold"
          }`}
        >
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      {status === "overdue" && (
        <p className="mt-1.5 text-xs font-medium text-tamarind">Payment overdue</p>
      )}
    </div>
  );
}
