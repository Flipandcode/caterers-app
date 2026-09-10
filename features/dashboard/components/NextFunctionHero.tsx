import Link from "next/link";
import { OrderListRow } from "@/lib/orders-data";
import { formatPaise } from "@/lib/money";

function daysUntilParts(dateISO: string): { big: string; small: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateISO + "T00:00:00");
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { big: "Today", small: "" };
  if (diffDays === 1) return { big: "Tomorrow", small: "" };
  if (diffDays > 1) return { big: String(diffDays), small: diffDays === 1 ? "day to go" : "days to go" };
  return { big: "Past due", small: "" };
}

/**
 * The one deliberately bold moment in the app — per the spec, "the nearest
 * upcoming function should receive the strongest visual attention." An
 * oversized countdown numeral in the display serif, on a warm marigold
 * wash used nowhere else in the app. Every other card stays flat and quiet.
 */
export function NextFunctionHero({ order }: { order: OrderListRow }) {
  const { big, small } = daysUntilParts(order.eventDate);
  const balancePaise = order.grandTotalPaise - order.totalPaidPaise;

  return (
    <Link
      href={`/orders/${order.id}`}
      className="block overflow-hidden rounded-lg border border-marigold/25 bg-gradient-to-br from-marigold/12 via-marigold/5 to-transparent p-5 shadow-marigold hover:border-marigold/40"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-marigold">Next function</p>

      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-4xl leading-none">{big}</span>
        {small && <span className="text-sm text-ink/50">{small}</span>}
      </div>

      <p className="mt-3 font-display text-xl">{order.eventName}</p>
      <p className="text-sm text-ink/60">{order.customerName}</p>

      <div className="mt-4 flex items-center gap-4 border-t border-marigold/20 pt-3 text-sm">
        <div>
          <p className="text-ink/50">Guests</p>
          <p className="font-medium">{order.guestCount}</p>
        </div>
        <div>
          <p className="text-ink/50">Total</p>
          <p className="font-medium">{formatPaise(order.grandTotalPaise)}</p>
        </div>
        {balancePaise > 0 && (
          <div>
            <p className="text-ink/50">Due</p>
            <p className="font-medium text-tamarind">{formatPaise(balancePaise)}</p>
          </div>
        )}
      </div>
    </Link>
  );
}
