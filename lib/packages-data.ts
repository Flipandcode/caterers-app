import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Package } from "@/types/domain";

/**
 * Fetches packages with their category rules and preselected items fully
 * hydrated (including denormalized category/menu-item names for display).
 * Shared by the packages list, the package edit page, and the order wizard
 * — this join was previously duplicated in the order wizard's page route.
 */
export async function fetchPackagesWithComposition(
  businessId: string,
  opts?: { packageId?: string; activeOnly?: boolean }
): Promise<Package[]> {
  const supabase = createServerSupabaseClient();

  let packagesQuery = supabase
    .from("packages")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_archived", false);

  if (opts?.activeOnly) packagesQuery = packagesQuery.eq("is_active", true);
  if (opts?.packageId) packagesQuery = packagesQuery.eq("id", opts.packageId);

  const [{ data: packages }, { data: rules }, { data: pkgItems }] = await Promise.all([
    packagesQuery,
    supabase.from("package_category_rules").select("*, menu_categories(name)"),
    supabase.from("package_items").select("*, menu_items(name)"),
  ]);

  return (packages ?? []).map((p) => ({
    id: p.id,
    businessId: p.business_id,
    name: p.name,
    description: p.description,
    foodType: p.food_type,
    basePricePerPlatePaise: p.base_price_per_plate_paise,
    minGuestCount: p.min_guest_count,
    isActive: p.is_active,
    isArchived: p.is_archived,
    categoryRules: (rules ?? [])
      .filter((r: any) => r.package_id === p.id)
      .map((r: any) => ({
        id: r.id,
        packageId: r.package_id,
        categoryId: r.category_id,
        categoryName: r.menu_categories?.name ?? "",
        allowedSelectionCount: r.allowed_selection_count,
        displayOrder: r.display_order,
      })),
    preselectedItems: (pkgItems ?? [])
      .filter((pi: any) => pi.package_id === p.id)
      .map((pi: any) => ({
        id: pi.id,
        packageId: pi.package_id,
        menuItemId: pi.menu_item_id,
        menuItemName: pi.menu_items?.name ?? "",
        displayOrder: pi.display_order,
      })),
  }));
}
