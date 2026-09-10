import { getActiveBusinessId } from "@/lib/business-context";
import { fetchOrdersWithBalances } from "@/lib/orders-data";
import { OrderCard } from "@/features/orders/components/OrderCard";
import { formatPaise } from "@/lib/money";
import { CircleCheck } from "lucide-react";

export default async function PaymentsPage() {
  const businessId = await getActiveBusinessId();
  const orders = await fetchOrdersWithBalances(businessId);

  const withBalance = orders
    .filter((o) => o.status !== "cancelled" && o.grandTotalPaise - o.totalPaidPaise > 0)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  const totalPendingPaise = withBalance.reduce(
    (sum, o) => sum + (o.grandTotalPaise - o.totalPaidPaise),
    0
  );

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-10 bg-bg/95 px-4 pb-3 pt-5 backdrop-blur">
        <h1 className="font-display text-2xl">Payments</h1>
        <p className="mt-1 text-sm text-ink/60">
          {withBalance.length === 0
            ? "Nothing pending."
            : `${formatPaise(totalPendingPaise)} pending across ${withBalance.length} order${withBalance.length === 1 ? "" : "s"}`}
        </p>
      </header>

      <div className="flex flex-col gap-3 px-4">
        {withBalance.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green/10">
              <CircleCheck className="h-6 w-6 text-green" />
            </div>
            <p className="font-display text-lg">All caught up.</p>
            <p className="text-sm text-ink/60">No orders have an outstanding balance right now.</p>
          </div>
        ) : (
          withBalance.map((order) => <OrderCard key={order.id} order={order} />)
        )}
      </div>
    </div>
  );
}
