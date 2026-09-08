import { getActiveBusinessId } from "@/lib/business-context";
import { fetchOrderDetail } from "@/lib/order-detail-data";
import { OrderDetailScreen } from "@/features/orders/components/OrderDetailScreen";

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const businessId = await getActiveBusinessId();
  const order = await fetchOrderDetail(businessId, params.id);

  return <OrderDetailScreen order={order} />;
}
