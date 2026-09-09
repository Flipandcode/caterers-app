import Link from "next/link";
import { OrderListRow } from "@/lib/orders-data";
import { OrderCard } from "@/features/orders/components/OrderCard";
import { formatPaise } from "@/lib/money";

interface DashboardScreenProps {
  upcomingOrders: OrderListRow[];
  thisMonthRevenuePaise: number;
  pendingPaymentsPaise: number;
  totalBookings: number;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardScreen({
  upcomingOrders,
  thisMonthRevenuePaise,
  pendingPaymentsPaise,
  totalBookings,
}: DashboardScreenProps) {
  const nextOrder = upcomingOrders[0];
  const restOfUpcoming = upcomingOrders.slice(1);

  return (
    <div className="pb-24">
      <header className="px-4 pb-2 pt-6">
        <h1 className="font-display text-2xl">{greeting()}</h1>
        <p className="text-sm text-ink/60">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 px-4">
        <SummaryCard label="Upcoming orders" value={String(upcomingOrders.length)} />
        <SummaryCard label="This month revenue" value={formatPaise(thisMonthRevenuePaise)} />
        <SummaryCard label="Pending payments" value={formatPaise(pendingPaymentsPaise)} emphasize={pendingPaymentsPaise > 0} />
        <SummaryCard label="Total bookings" value={String(totalBookings)} />
      </div>

      {nextOrder && (
        <div className="px-4 pt-5">
          <p className="mb-2 text-sm font-medium text-ink/60">Next function</p>
          <OrderCard order={nextOrder} />
        </div>
      )}

      <div className="px-4 pt-6">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="font-display text-lg">Upcoming functions</p>
          <Link href="/orders" className="text-sm font-medium text-marigold">
            View all
          </Link>
        </div>

        {upcomingOrders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="font-display text-lg">No upcoming functions.</p>
            <Link
              href="/orders/new"
              className="mt-1 rounded-lg bg-marigold px-5 py-2.5 text-sm font-medium text-white"
            >
              Create your first order
            </Link>
          </div>
        ) : restOfUpcoming.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink/50">That's everything coming up.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {restOfUpcoming.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${emphasize ? "border-tamarind/40 bg-tamarind/5" : "border-surface"}`}>
      <p className="text-xs text-ink/50">{label}</p>
      <p className={`mt-1 font-display text-xl ${emphasize ? "text-tamarind" : ""}`}>{value}</p>
    </div>
  );
}
