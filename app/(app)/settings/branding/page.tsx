import { getActiveBusinessId } from "@/lib/business-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BrandingForm } from "@/features/settings/components/BrandingForm";

export default async function BrandingSettingsPage() {
  const businessId = await getActiveBusinessId();
  const supabase = createServerSupabaseClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const [{ data: business }, { data: membership }] = await Promise.all([
    supabase.from("businesses").select("name, display_name, logo_url").eq("id", businessId).single(),
    session?.user
      ? supabase
          .from("business_members")
          .select("role")
          .eq("business_id", businessId)
          .eq("user_id", session.user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const isOwner = membership?.role === "owner";

  if (!isOwner) {
    return (
      <div className="px-4 pb-24 pt-5">
        <h1 className="mb-2 font-display text-2xl">Branding</h1>
        <p className="text-sm text-ink/60">Only the business owner can change branding settings.</p>
      </div>
    );
  }

  return (
    <BrandingForm
      businessId={businessId}
      currentDisplayName={business?.display_name ?? ""}
      currentLogoUrl={business?.logo_url ?? null}
      legalName={business?.name ?? "Your business"}
    />
  );
}
