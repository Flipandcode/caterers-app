import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface PublicQuotationMenuItem {
  menuItemNameSnapshot: string;
  categoryNameSnapshot: string;
  foodType: "veg" | "non_veg" | "egg";
  isExtra: boolean;
  extraPricePaise: number;
  extraPriceIsFlat: boolean;
}

export interface PublicQuotation {
  orderNumber: string;
  quotationNumber: string | null;
  eventName: string;
  eventDate: string;
  eventStartTime: string | null;
  venueName: string | null;
  guestCount: number;
  foodType: "veg" | "non_veg" | "mixed";
  packageNameSnapshot: string | null;
  pricePerPlatePaise: number;
  serviceChargePaise: number;
  transportChargePaise: number;
  equipmentChargePaise: number;
  staffChargePaise: number;
  otherChargesPaise: number;
  discountPaise: number;
  taxEnabled: boolean;
  taxName: string | null;
  taxPercentage: number;
  taxAmountPaise: number;
  grandTotalPaise: number;
  totalPaidPaise: number;
  termsSnapshot: string | null;
  customerName: string;
  businessName: string;
  businessDisplayName: string | null;
  businessLogoUrl: string | null;
  businessPhone: string | null;
  upiId: string | null;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  menuItems: PublicQuotationMenuItem[];
}

/** No auth required — anyone holding the token can view. Returns null for an invalid/cancelled-order token. */
export async function fetchPublicQuotation(token: string): Promise<PublicQuotation | null> {
  const supabase = createServerSupabaseClient();

  const [{ data: orderRows, error }, { data: menuRows }] = await Promise.all([
    supabase.rpc("get_order_by_share_token", { p_token: token }),
    supabase.rpc("get_order_menu_items_by_share_token", { p_token: token }),
  ]);

  if (error || !orderRows || orderRows.length === 0) return null;
  const row = orderRows[0];

  return {
    orderNumber: row.order_number,
    quotationNumber: row.quotation_number,
    eventName: row.event_name,
    eventDate: row.event_date,
    eventStartTime: row.event_start_time,
    venueName: row.venue_name,
    guestCount: row.guest_count,
    foodType: row.food_type,
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
    taxAmountPaise: row.tax_amount_paise,
    grandTotalPaise: row.grand_total_paise,
    totalPaidPaise: row.total_paid_paise,
    termsSnapshot: row.terms_snapshot,
    customerName: row.customer_name,
    businessName: row.business_name,
    businessDisplayName: row.business_display_name,
    businessLogoUrl: row.business_logo_url,
    businessPhone: row.business_phone,
    upiId: row.upi_id,
    bankName: row.bank_name,
    accountName: row.account_name,
    accountNumber: row.account_number,
    ifsc: row.ifsc,
    menuItems: (menuRows ?? []).map((m: any) => ({
      menuItemNameSnapshot: m.menu_item_name_snapshot,
      categoryNameSnapshot: m.category_name_snapshot,
      foodType: m.food_type,
      isExtra: m.is_extra,
      extraPricePaise: m.extra_price_paise,
      extraPriceIsFlat: m.extra_price_is_flat,
    })),
  };
}
