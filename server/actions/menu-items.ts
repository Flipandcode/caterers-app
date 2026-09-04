"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MenuItem } from "@/types/domain";

const foodTypeSchema = z.enum(["veg", "non_veg", "egg"]);

const createSchema = z.object({
  businessId: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required").max(120),
  foodType: foodTypeSchema,
  description: z.string().trim().max(500).nullable(),
  defaultExtraPricePaise: z.number().int().min(0).max(10_000_000), // sanity ceiling: ₹1,00,000/plate
});

const updateSchema = createSchema
  .omit({ businessId: true })
  .extend({ itemId: z.string().uuid() });

const toggleSchema = z.object({
  itemId: z.string().uuid(),
  isActive: z.boolean(),
});

function mapRow(row: any): MenuItem {
  return {
    id: row.id,
    businessId: row.business_id,
    categoryId: row.category_id,
    name: row.name,
    foodType: row.food_type,
    description: row.description,
    defaultExtraPricePaise: row.default_extra_price_paise,
    isActive: row.is_active,
    isArchived: row.is_archived,
    displayOrder: row.display_order,
  };
}

export async function createMenuItemAction(input: z.infer<typeof createSchema>): Promise<MenuItem> {
  const parsed = createSchema.parse(input);
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      business_id: parsed.businessId,
      category_id: parsed.categoryId,
      name: parsed.name,
      food_type: parsed.foodType,
      description: parsed.description,
      default_extra_price_paise: parsed.defaultExtraPricePaise,
    })
    .select()
    .single();

  if (error) throw new Error("We couldn't save this item. Please try again.");

  revalidatePath("/menus");
  return mapRow(data);
}

export async function updateMenuItemAction(input: z.infer<typeof updateSchema>): Promise<MenuItem> {
  const parsed = updateSchema.parse(input);
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("menu_items")
    .update({
      category_id: parsed.categoryId,
      name: parsed.name,
      food_type: parsed.foodType,
      description: parsed.description,
      default_extra_price_paise: parsed.defaultExtraPricePaise,
    })
    .eq("id", parsed.itemId)
    .select()
    .single();

  if (error) throw new Error("We couldn't save this item. Please try again.");

  revalidatePath("/menus");
  return mapRow(data);
}

/** Deactivating hides an item from new orders without touching history. */
export async function toggleMenuItemActiveAction(input: z.infer<typeof toggleSchema>): Promise<void> {
  const parsed = toggleSchema.parse(input);
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("menu_items")
    .update({ is_active: parsed.isActive })
    .eq("id", parsed.itemId);

  if (error) throw new Error("We couldn't update this item. Please try again.");

  revalidatePath("/menus");
}

/**
 * Archive (not delete) — safe even if the item is referenced by past orders,
 * since order_menu_items stores its own name/price snapshot independent of
 * this row.
 */
export async function archiveMenuItemAction(itemId: string): Promise<void> {
  const parsed = z.string().uuid().parse(itemId);
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("menu_items")
    .update({ is_archived: true, is_active: false })
    .eq("id", parsed);

  if (error) throw new Error("We couldn't remove this item. Please try again.");

  revalidatePath("/menus");
}
