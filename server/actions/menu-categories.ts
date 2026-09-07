"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MenuCategory } from "@/types/domain";

const createSchema = z.object({
  businessId: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required").max(80),
});

function mapRow(row: any): MenuCategory {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    displayOrder: row.display_order,
    isActive: row.is_active,
  };
}

export async function createMenuCategoryAction(
  input: z.infer<typeof createSchema>
): Promise<MenuCategory> {
  const parsed = createSchema.parse(input);
  const supabase = createServerSupabaseClient();

  const { count } = await supabase
    .from("menu_categories")
    .select("id", { count: "exact", head: true })
    .eq("business_id", parsed.businessId);

  const { data, error } = await supabase
    .from("menu_categories")
    .insert({
      business_id: parsed.businessId,
      name: parsed.name,
      display_order: count ?? 0,
    })
    .select()
    .single();

  if (error) throw new Error("We couldn't add this category. Please try again.");

  revalidatePath("/menus");
  return mapRow(data);
}
