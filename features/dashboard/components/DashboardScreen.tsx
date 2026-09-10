import type { ComponentType } from "react";
import Link from "next/link";
import { CalendarClock, Wallet, AlertCircle, ClipboardList, PartyPopper } from "lucide-react";
import { OrderListRow } from "@/lib/orders-data";
import { OrderCard } from "@/features/orders/components/OrderCard";
import { NextFunctionHero } from "./NextFunctionHero";
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

      {nextOrder && (
        <div className="px-4 pt-4">
          <NextFunctionHero order={nextOrder} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 px-4 pt-4">
        <SummaryCard icon={CalendarClock} label="Upcoming orders" value={String(upcomingOrders.length)} />
        <SummaryCard icon={Wallet} label="This month revenue" value={formatPaise(thisMonthRevenuePaise)} />
        <SummaryCard
          icon={AlertCircle}
          label="Pending payments"
          value={formatPaise(pendingPaymentsPaise)}
          emphasize={pendingPaymentsPaise > 0}
        />
        <SummaryCard icon={ClipboardList} label="Total bookings" value={String(totalBookings)} />
      </div>

      <div className="px-4 pt-6">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="font-display text-lg">Upcoming functions</p>
          <Link href="/orders" className="text-sm font-medium text-marigold">
            View all
          </Link>
        </div>

        {upcomingOrders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-marigold/10">
              <PartyPopper className="h-6 w-6 text-marigold" />
            </div>
            <p className="font-display text-lg">The calendar's wide open.</p>
            <p className="text-sm text-ink/60">Create an order and it'll show up here.</p>
            <Link
              href="/orders/new"
              className="mt-1 rounded-lg bg-marigold px-5 py-2.5 text-sm font-medium text-white shadow-marigold"
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
  icon: Icon,
  label,
  value,
  emphasize,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 shadow-warm-sm transition-shadow hover:shadow-warm ${
        emphasize ? "border-tamarind/30 bg-tamarind/5" : "border-surface bg-bg"
      }`}
    >
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full ${
          emphasize ? "bg-tamarind/15" : "bg-marigold/12"
        }`}
      >
        <Icon className={`h-3.5 w-3.5 ${emphasize ? "text-tamarind" : "text-marigold"}`} />
      </div>
      <p className="mt-2 text-xs text-ink/50">{label}</p>
      <p className={`mt-0.5 font-display text-xl ${emphasize ? "text-tamarind" : ""}`}>{value}</p>
    </div>
  );
}
