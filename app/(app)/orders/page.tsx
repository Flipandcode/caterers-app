import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { getActiveBusinessId } from "@/lib/business-context";
import { fetchOrdersWithBalances } from "@/lib/orders-data";
import { OrderCard } from "@/features/orders/components/OrderCard";

export default async function OrdersPage() {
  const businessId = await getActiveBusinessId();
  const orders = await fetchOrdersWithBalances(businessId);

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-10 bg-bg/95 px-4 pb-3 pt-5 backdrop-blur">
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-2xl">Orders</h1>
          <span className="text-sm text-ink/50">{orders.length} total</span>
        </div>
      </header>

      <div className="flex flex-col gap-3 px-4">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-marigold/10">
              <ClipboardList className="h-6 w-6 text-marigold" />
            </div>
            <p className="font-display text-lg">No orders yet.</p>
            <p className="text-sm text-ink/60">Create your first catering order to see it here.</p>
            <Link
              href="/orders/new"
              className="mt-2 rounded-lg bg-marigold px-5 py-2.5 text-sm font-medium text-white shadow-marigold"
            >
              New order
            </Link>
          </div>
        ) : (
          orders.map((order) => <OrderCard key={order.id} order={order} />)
        )}
      </div>
    </div>
  );
}
