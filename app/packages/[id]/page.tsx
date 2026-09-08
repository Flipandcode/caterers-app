import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getActiveBusinessId } from "@/lib/business-context";
import { fetchPackagesWithComposition } from "@/lib/packages-data";
import { PackageBuilder } from "@/features/packages/components/PackageBuilder";
import { MenuCategoryWithItems } from "@/types/domain";

export default async function EditPackagePage({ params }: { params: { id: string } }) {
  const businessId = await getActiveBusinessId();
  const supabase = createServerSupabaseClient();

  const [packages, { data: categories }, { data: items }] = await Promise.all([
    fetchPackagesWithComposition(businessId, { packageId: params.id }),
    supabase
      .from("menu_categories")
      .select("*")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("menu_items")
      .select("*")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .eq("is_archived", false)
      .order("display_order"),
  ]);

  const existingPackage = packages[0];
  if (!existingPackage) notFound();

  const categoriesWithItems: MenuCategoryWithItems[] = (categories ?? []).map((c) => ({
    id: c.id,
    businessId: c.business_id,
    name: c.name,
    displayOrder: c.display_order,
    isActive: c.is_active,
    items: (items ?? [])
      .filter((i) => i.category_id === c.id)
      .map((i) => ({
        id: i.id,
        businessId: i.business_id,
        categoryId: i.category_id,
        name: i.name,
        foodType: i.food_type,
        description: i.description,
        defaultExtraPricePaise: i.default_extra_price_paise,
        isActive: i.is_active,
        isArchived: i.is_archived,
        displayOrder: i.display_order,
      })),
  }));

  return (
    <PackageBuilder businessId={businessId} categories={categoriesWithItems} existingPackage={existingPackage} />
  );
}
