"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { calculateOrderTotals } from "@/lib/money";

const menuLineSchema = z.object({
  menuItemId: z.string().uuid().nullable(),
  nameSnapshot: z.string().min(1),
  categorySnapshot: z.string().min(1),
  foodType: z.enum(["veg", "non_veg", "egg"]),
  isExtra: z.boolean(),
  extraPricePaise: z.number().int().min(0),
  extraPriceIsFlat: z.boolean(),
});

const createOrderSchema = z.object({
  businessId: z.string().uuid(),
  customerId: z.string().uuid(),
  eventName: z.string().trim().min(1).max(120),
  eventDate: z.string().min(1), // ISO date, e.g. "2026-09-12"
  eventStartTime: z.string().nullable(),
  eventEndTime: z.string().nullable(),
  venueName: z.string().trim().max(200).nullable(),
  venueAddress: z.string().trim().max(500).nullable(),
  guestCount: z.number().int().positive().max(50_000),
  specialInstructions: z.string().trim().max(1000).nullable(),
  foodType: z.enum(["veg", "non_veg", "mixed"]),
  packageId: z.string().uuid().nullable(),
  packageNameSnapshot: z.string().nullable(),
  pricePerPlatePaise: z.number().int().nonnegative(),
  serviceChargePaise: z.number().int().nonnegative(),
  transportChargePaise: z.number().int().nonnegative(),
  equipmentChargePaise: z.number().int().nonnegative(),
  staffChargePaise: z.number().int().nonnegative(),
  otherChargesPaise: z.number().int().nonnegative(),
  discountPaise: z.number().int().nonnegative(),
  taxEnabled: z.boolean(),
  taxName: z.string().trim().max(40).nullable(),
  taxPercentage: z.number().min(0).max(100),
  termsSnapshot: z.string().nullable(),
  menuItems: z.array(menuLineSchema),
});

export interface CreateOrderResult {
  success: boolean;
  error?: string;
}

export async function createOrderAction(
  input: z.infer<typeof createOrderSchema>
): Promise<CreateOrderResult> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Please check the order details." };
  }
  const d = parsed.data;

  // Recompute totals server-side rather than trusting client-sent totals —
  // the client's numbers are only ever a preview.
  const extraLineItemsPaise = d.menuItems
    .filter((m) => m.isExtra)
    .map((m) => (m.extraPriceIsFlat ? m.extraPricePaise : m.extraPricePaise * d.guestCount));

  const totals = calculateOrderTotals({
    guestCount: d.guestCount,
    pricePerPlatePaise: d.pricePerPlatePaise,
    extraLineItemsPaise,
    serviceChargePaise: d.serviceChargePaise,
    transportChargePaise: d.transportChargePaise,
    equipmentChargePaise: d.equipmentChargePaise,
    staffChargePaise: d.staffChargePaise,
    otherChargesPaise: d.otherChargesPaise,
    discountPaise: d.discountPaise,
    taxEnabled: d.taxEnabled,
    taxPercentage: d.taxPercentage,
  });

  const supabase = createServerSupabaseClient();

  // Terms snapshot is always computed server-side from the business's
  // current active terms, never trusted from the client — this is a
  // legally-relevant document, and the wizard doesn't have a terms editor
  // yet anyway (it always sends null).
  const { data: terms } = await supabase
    .from("business_terms")
    .select("title, body")
    .eq("business_id", d.businessId)
    .eq("is_active", true)
    .order("display_order");

  const termsSnapshot =
    terms && terms.length > 0
      ? terms.map((t) => `${t.title}\n${t.body}`).join("\n\n")
      : null;

  const { data: orderId, error } = await supabase.rpc("create_order", {
    p_business_id: d.businessId,
    p_customer_id: d.customerId,
    p_event_name: d.eventName,
    p_event_date: d.eventDate,
    p_event_start_time: d.eventStartTime,
    p_event_end_time: d.eventEndTime,
    p_venue_name: d.venueName,
    p_venue_address: d.venueAddress,
    p_guest_count: d.guestCount,
    p_special_instructions: d.specialInstructions,
    p_food_type: d.foodType,
    p_package_id: d.packageId,
    p_package_name_snapshot: d.packageNameSnapshot,
    p_price_per_plate_paise: d.pricePerPlatePaise,
    p_service_charge_paise: d.serviceChargePaise,
    p_transport_charge_paise: d.transportChargePaise,
    p_equipment_charge_paise: d.equipmentChargePaise,
    p_staff_charge_paise: d.staffChargePaise,
    p_other_charges_paise: d.otherChargesPaise,
    p_discount_paise: d.discountPaise,
    p_tax_enabled: d.taxEnabled,
    p_tax_name: d.taxName,
    p_tax_percentage: d.taxPercentage,
    p_subtotal_paise: totals.subtotalPaise,
    p_tax_amount_paise: totals.taxAmountPaise,
    p_grand_total_paise: totals.grandTotalPaise,
    p_terms_snapshot: termsSnapshot,
    p_menu_items: d.menuItems.map((m) => ({
      menu_item_id: m.menuItemId,
      name_snapshot: m.nameSnapshot,
      category_snapshot: m.categorySnapshot,
      food_type: m.foodType,
      is_extra: m.isExtra,
      extra_price_paise: m.extraPricePaise,
      extra_price_is_flat: m.extraPriceIsFlat,
    })),
  });

  if (error) {
    return { success: false, error: "We couldn't save this order. Please try again." };
  }

  redirect(`/orders/${orderId}`);
}
