"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ruleSchema = z.object({
  categoryId: z.string().uuid(),
  allowedSelectionCount: z.number().int().min(1).max(20),
});

const preselectSchema = z.object({
  menuItemId: z.string().uuid(),
});

const savePackageSchema = z.object({
  packageId: z.string().uuid().optional(), // absent = create
  businessId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable(),
  foodType: z.enum(["veg", "non_veg", "mixed"]),
  basePricePerPlatePaise: z.number().int().positive().max(10_000_000),
  minGuestCount: z.number().int().min(1).max(100_000),
  categoryRules: z.array(ruleSchema),
  preselectedItems: z.array(preselectSchema),
});

/**
 * Creates or updates a package plus its category rules and preselected
 * items in one call. This uses a Postgres function (see migration
 * 0003_save_package.sql) so the three-table write is atomic — a failure
 * partway through must not leave a package with a half-written composition.
 */
export async function savePackageAction(input: z.infer<typeof savePackageSchema>): Promise<{ id: string }> {
  const parsed = savePackageSchema.parse(input);
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.rpc("save_package_with_composition", {
    p_package_id: parsed.packageId ?? null,
    p_business_id: parsed.businessId,
    p_name: parsed.name,
    p_description: parsed.description,
    p_food_type: parsed.foodType,
    p_base_price_per_plate_paise: parsed.basePricePerPlatePaise,
    p_min_guest_count: parsed.minGuestCount,
    p_category_rules: parsed.categoryRules.map((r) => ({
      category_id: r.categoryId,
      allowed_selection_count: r.allowedSelectionCount,
    })),
    p_preselected_items: parsed.preselectedItems.map((p) => ({ menu_item_id: p.menuItemId })),
  });

  if (error) throw new Error("We couldn't save this package. Please try again.");

  revalidatePath("/packages");
  return { id: data as string };
}

export async function archivePackageAction(packageId: string): Promise<void> {
  const parsed = z.string().uuid().parse(packageId);
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("packages")
    .update({ is_archived: true, is_active: false })
    .eq("id", parsed);

  if (error) throw new Error("We couldn't remove this package. Please try again.");
  revalidatePath("/packages");
}

export async function duplicatePackageAction(packageId: string): Promise<{ id: string }> {
  const parsed = z.string().uuid().parse(packageId);
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.rpc("duplicate_package", { p_package_id: parsed });
  if (error) throw new Error("We couldn't duplicate this package. Please try again.");

  revalidatePath("/packages");
  return { id: data as string };
}
