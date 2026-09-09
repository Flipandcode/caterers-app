import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getActiveBusinessId } from "@/lib/business-context";
import { fetchOrderDetail } from "@/lib/order-detail-data";
import { OrderDetailScreen } from "@/features/orders/components/OrderDetailScreen";

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const businessId = await getActiveBusinessId();
  const supabase = createServerSupabaseClient();

  const [order, { data: business }] = await Promise.all([
    fetchOrderDetail(businessId, params.id),
    supabase.from("businesses").select("name, display_name").eq("id", businessId).single(),
  ]);

  const businessDisplayName = business?.display_name ?? business?.name ?? "Your business";

  return <OrderDetailScreen order={order} businessDisplayName={businessDisplayName} />;
}
