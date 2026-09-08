import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Order, OrderMenuItem, OrderStatus, Customer, Payment, PaymentType, PaymentMethod } from "@/types/domain";

export interface OrderDetail extends Order {
  customer: Customer;
  totalPaidPaise: number;
  payments: Payment[];
}

function mapMenuItem(row: any): OrderMenuItem {
  return {
    id: row.id,
    orderId: row.order_id,
    menuItemId: row.menu_item_id,
    menuItemNameSnapshot: row.menu_item_name_snapshot,
    categoryNameSnapshot: row.category_name_snapshot,
    foodType: row.food_type,
    isExtra: row.is_extra,
    extraPricePaise: row.extra_price_paise,
    extraPriceIsFlat: row.extra_price_is_flat,
  };
}

function mapCustomer(row: any): Customer {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    phone: row.phone,
    whatsappNumber: row.whatsapp_number,
    email: row.email,
    address: row.address,
    notes: row.notes,
  };
}

function mapPayment(row: any): Payment {
  return {
    id: row.id,
    businessId: row.business_id,
    orderId: row.order_id,
    paymentNumber: row.payment_number,
    amountPaise: row.amount_paise,
    paymentType: row.payment_type as PaymentType,
    paymentMethod: row.payment_method as PaymentMethod,
    paymentDate: row.payment_date,
    referenceNumber: row.reference_number,
    notes: row.notes,
  };
}

/** Fetches one order with everything the detail screen needs. 404s if the order doesn't exist or isn't visible to this business under RLS. */
export async function fetchOrderDetail(businessId: string, orderId: string): Promise<OrderDetail> {
  const supabase = createServerSupabaseClient();

  const [{ data: order, error }, { data: menuItems }, { data: balance }, { data: payments }] = await Promise.all([
    supabase
      .from("orders")
      .select("*, customers(*)")
      .eq("id", orderId)
      .eq("business_id", businessId)
      .single(),
    supabase.from("order_menu_items").select("*").eq("order_id", orderId).order("display_order"),
    supabase
      .from("order_balances")
      .select("total_paid_paise")
      .eq("order_id", orderId)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("*")
      .eq("order_id", orderId)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (error || !order) notFound();

  return {
    id: order.id,
    businessId: order.business_id,
    customerId: order.customer_id,
    orderNumber: order.order_number,
    eventName: order.event_name,
    eventDate: order.event_date,
    eventStartTime: order.event_start_time,
    eventEndTime: order.event_end_time,
    venueName: order.venue_name,
    venueAddress: order.venue_address,
    guestCount: order.guest_count,
    specialInstructions: order.special_instructions,
    foodType: order.food_type,
    packageId: order.package_id,
    packageNameSnapshot: order.package_name_snapshot,
    pricePerPlatePaise: order.price_per_plate_paise,
    serviceChargePaise: order.service_charge_paise,
    transportChargePaise: order.transport_charge_paise,
    equipmentChargePaise: order.equipment_charge_paise,
    staffChargePaise: order.staff_charge_paise,
    otherChargesPaise: order.other_charges_paise,
    discountPaise: order.discount_paise,
    taxEnabled: order.tax_enabled,
    taxName: order.tax_name,
    taxPercentage: order.tax_percentage,
    subtotalPaise: order.subtotal_paise,
    taxAmountPaise: order.tax_amount_paise,
    grandTotalPaise: order.grand_total_paise,
    termsSnapshot: order.terms_snapshot,
    status: order.status as OrderStatus,
    isCancelled: order.is_cancelled,
    menuItems: (menuItems ?? []).map(mapMenuItem),
    customer: mapCustomer(order.customers),
    totalPaidPaise: balance?.total_paid_paise ?? 0,
    payments: (payments ?? []).map(mapPayment),
  };
}
