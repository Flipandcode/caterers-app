import { getActiveBusinessId } from "@/lib/business-context";
import { fetchOrdersWithBalances } from "@/lib/orders-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DashboardScreen } from "@/features/dashboard/components/DashboardScreen";

export default async function DashboardPage() {
  const businessId = await getActiveBusinessId();
  const supabase = createServerSupabaseClient();

  const [{ data: business }, allOrders] = await Promise.all([
    supabase.from("businesses").select("name").eq("id", businessId).single(),
    fetchOrdersWithBalances(businessId),
  ]);

  const todayISO = new Date().toISOString().slice(0, 10);
  const upcomingOrders = allOrders
    .filter((o) => o.status !== "cancelled" && o.eventDate >= todayISO)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonthRevenuePaise = allOrders
    .filter((o) => {
      const d = new Date(o.eventDate + "T00:00:00");
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && o.status !== "cancelled";
    })
    .reduce((sum, o) => sum + o.grandTotalPaise, 0);

  const pendingPaymentsPaise = allOrders
    .filter((o) => o.status !== "cancelled" && o.status !== "completed")
    .reduce((sum, o) => sum + Math.max(0, o.grandTotalPaise - o.totalPaidPaise), 0);

  return (
    <DashboardScreen
      businessName={business?.name ?? "Your business"}
      upcomingOrders={upcomingOrders}
      thisMonthRevenuePaise={thisMonthRevenuePaise}
      pendingPaymentsPaise={pendingPaymentsPaise}
      totalBookings={allOrders.length}
    />
  );
}
