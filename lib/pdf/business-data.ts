import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface BusinessPdfData {
  name: string;
  displayName: string | null;
  logoUrl: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pinCode: string | null;
  phone: string | null;
  email: string | null;
  upiId: string | null;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  qrImageUrl: string | null;
}

export async function fetchBusinessPdfData(businessId: string): Promise<BusinessPdfData> {
  const supabase = createServerSupabaseClient();

  const [{ data: business }, { data: settings }] = await Promise.all([
    supabase
      .from("businesses")
      .select("name, display_name, logo_url, address, city, state, pin_code, phone, email")
      .eq("id", businessId)
      .single(),
    supabase
      .from("business_settings")
      .select("upi_id, bank_name, account_name, account_number, ifsc, qr_image_url")
      .eq("business_id", businessId)
      .maybeSingle(),
  ]);

  return {
    name: business?.name ?? "",
    displayName: business?.display_name ?? null,
    logoUrl: business?.logo_url ?? null,
    address: business?.address ?? null,
    city: business?.city ?? null,
    state: business?.state ?? null,
    pinCode: business?.pin_code ?? null,
    phone: business?.phone ?? null,
    email: business?.email ?? null,
    upiId: settings?.upi_id ?? null,
    bankName: settings?.bank_name ?? null,
    accountName: settings?.account_name ?? null,
    accountNumber: settings?.account_number ?? null,
    ifsc: settings?.ifsc ?? null,
    qrImageUrl: settings?.qr_image_url ?? null,
  };
}
