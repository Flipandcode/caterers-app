"use client";

import * as React from "react";
import { useState } from "react";
import { MenuCategory, FoodType, MenuItem } from "@/types/domain";
import { formatPaise, rupeesToPaise, paiseToRupees } from "@/lib/money";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const FOOD_TYPES: { value: FoodType; label: string }[] = [
  { value: "veg", label: "Veg" },
  { value: "non_veg", label: "Non-veg" },
  { value: "egg", label: "Egg" },
];

interface MenuItemFormValues {
  name: string;
  categoryId: string;
  foodType: FoodType;
  description: string;
  defaultExtraPriceRupees: string;
}

interface MenuItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: MenuCategory[];
  existingItem?: MenuItem;
  onSubmit: (values: {
    name: string;
    categoryId: string;
    foodType: FoodType;
    description: string | null;
    defaultExtraPricePaise: number;
  }) => Promise<void>;
}

/**
 * Bottom sheet for adding or editing a single menu item. Kept deliberately
 * small — one item per open — so it's fast to add a whole catalogue on a
 * phone: name, category, food type, optional per-plate extra price.
 */
export function MenuItemForm({
  open,
  onOpenChange,
  categories,
  existingItem,
  onSubmit,
}: MenuItemFormProps) {
  const [values, setValues] = useState<MenuItemFormValues>(() => ({
    name: existingItem?.name ?? "",
    categoryId: existingItem?.categoryId ?? categories[0]?.id ?? "",
    foodType: existingItem?.foodType ?? "veg",
    description: existingItem?.description ?? "",
    defaultExtraPriceRupees: existingItem
      ? String(paiseToRupees(existingItem.defaultExtraPricePaise))
      : "",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(existingItem);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.name.trim()) {
      setError("Give the item a name.");
      return;
    }
    if (!values.categoryId) {
      setError("Choose a category.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name: values.name.trim(),
        categoryId: values.categoryId,
        foodType: values.foodType,
        description: values.description.trim() || null,
        defaultExtraPricePaise: values.defaultExtraPriceRupees
          ? rupeesToPaise(parseFloat(values.defaultExtraPriceRupees))
          : 0,
      });
      onOpenChange(false);
    } catch {
      setError("We couldn't save this item. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">
            {isEditing ? "Edit item" : "Add menu item"}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Item name</label>
            <Input
              autoFocus
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              placeholder="e.g. Paneer Butter Masala"
              className="h-12 text-base"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Category</label>
            <select
              value={values.categoryId}
              onChange={(e) => setValues((v) => ({ ...v, categoryId: e.target.value }))}
              className="h-12 w-full rounded-lg border border-[hsl(var(--color-surface))] bg-transparent px-3 text-base"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Food type</label>
            <div className="flex gap-2">
              {FOOD_TYPES.map((ft) => (
                <button
                  key={ft.value}
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, foodType: ft.value }))}
                  className={`h-11 flex-1 rounded-lg border text-sm font-medium transition-colors ${
                    values.foodType === ft.value
                      ? "border-[hsl(var(--color-marigold))] bg-[hsl(var(--color-marigold))]/15"
                      : "border-[hsl(var(--color-surface))]"
                  }`}
                >
                  {ft.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Extra price per plate <span className="font-normal text-[hsl(var(--color-ink))]/50">(optional)</span>
            </label>
            <Input
              inputMode="decimal"
              value={values.defaultExtraPriceRupees}
              onChange={(e) =>
                setValues((v) => ({ ...v, defaultExtraPriceRupees: e.target.value }))
              }
              placeholder="0"
              className="h-12 text-base"
            />
            <p className="mt-1 text-xs text-[hsl(var(--color-ink))]/50">
              Charged when a customer adds this beyond their package allowance.
              {values.defaultExtraPriceRupees &&
                ` Preview: ${formatPaise(rupeesToPaise(parseFloat(values.defaultExtraPriceRupees) || 0))}`}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Description <span className="font-normal text-[hsl(var(--color-ink))]/50">(optional)</span>
            </label>
            <Textarea
              value={values.description}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              rows={2}
              className="text-base"
            />
          </div>

          {error && <p className="text-sm text-[hsl(var(--color-tamarind))]">{error}</p>}

          <Button
            type="submit"
            disabled={saving}
            className="mt-2 h-12 bg-[hsl(var(--color-marigold))] text-base font-medium text-white hover:bg-[hsl(var(--color-marigold))]/90"
          >
            {saving ? "Saving…" : isEditing ? "Save changes" : "Add item"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
