import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MenuCatalogueScreen } from "@/features/menus/components/MenuCatalogueScreen";
import { getActiveBusinessId } from "@/lib/business-context";
import { MenuCategoryWithItems } from "@/types/domain";

export default async function MenusPage() {
  const businessId = await getActiveBusinessId();
  const supabase = createServerSupabaseClient();

  const [{ data: categories }, { data: items }] = await Promise.all([
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
      .eq("is_archived", false)
      .order("display_order"),
  ]);

  const initialCategories: MenuCategoryWithItems[] = (categories ?? []).map((c) => ({
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

  return <MenuCatalogueScreen businessId={businessId} initialCategories={initialCategories} />;
}
