import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Order, OrderStatus } from "@/types/domain";

// Deliberately omits menuItems: the list/dashboard cards don't render
// per-order menu detail, so hydrating it here would mean an extra join for
// every order just to satisfy the type. Order detail pages (Phase 4) should
// fetch menuItems separately, scoped to the one order being viewed.
export interface OrderListRow extends Omit<Order, "menuItems"> {
  customerName: string;
  totalPaidPaise: number;
}

function mapRow(row: any, balance: number): OrderListRow {
  return {
    id: row.id,
    businessId: row.business_id,
    customerId: row.customer_id,
    orderNumber: row.order_number,
    eventName: row.event_name,
    eventDate: row.event_date,
    eventStartTime: row.event_start_time,
    eventEndTime: row.event_end_time,
    venueName: row.venue_name,
    venueAddress: row.venue_address,
    guestCount: row.guest_count,
    specialInstructions: row.special_instructions,
    foodType: row.food_type,
    packageId: row.package_id,
    packageNameSnapshot: row.package_name_snapshot,
    pricePerPlatePaise: row.price_per_plate_paise,
    serviceChargePaise: row.service_charge_paise,
    transportChargePaise: row.transport_charge_paise,
    equipmentChargePaise: row.equipment_charge_paise,
    staffChargePaise: row.staff_charge_paise,
    otherChargesPaise: row.other_charges_paise,
    discountPaise: row.discount_paise,
    taxEnabled: row.tax_enabled,
    taxName: row.tax_name,
    taxPercentage: row.tax_percentage,
    subtotalPaise: row.subtotal_paise,
    taxAmountPaise: row.tax_amount_paise,
    grandTotalPaise: row.grand_total_paise,
    termsSnapshot: row.terms_snapshot,
    status: row.status as OrderStatus,
    isCancelled: row.is_cancelled,
    customerName: row.customers?.name ?? "Unknown",
    totalPaidPaise: balance,
  };
}

/**
 * Shared by both the Orders list and the Dashboard — fetches non-cancelled
 * orders with their customer name and running payment balance in one round
 * trip (two queries, joined client-side, since PostgREST can't easily join
 * a view onto a table in a single request).
 */
export async function fetchOrdersWithBalances(
  businessId: string,
  opts?: { upcomingOnly?: boolean; limit?: number }
): Promise<OrderListRow[]> {
  const supabase = createServerSupabaseClient();

  let query = supabase
    .from("orders")
    .select("*, customers(name)")
    .eq("business_id", businessId)
    .eq("is_cancelled", false)
    .order("event_date", { ascending: true });

  if (opts?.upcomingOnly) {
    const today = new Date().toISOString().slice(0, 10);
    query = query.gte("event_date", today);
  }
  if (opts?.limit) {
    query = query.limit(opts.limit);
  }

  const { data: orders, error } = await query;
  if (error || !orders) return [];

  const { data: balances } = await supabase
    .from("order_balances")
    .select("order_id, total_paid_paise")
    .eq("business_id", businessId);

  const balanceByOrderId = new Map((balances ?? []).map((b) => [b.order_id, b.total_paid_paise as number]));

  return orders.map((row: any) => mapRow(row, balanceByOrderId.get(row.id) ?? 0));
}
