"use client";

import { useMemo, useState } from "react";
import { MenuCategoryWithItems, MenuItem, FoodType } from "@/types/domain";
import { MenuCategorySection } from "./MenuCategorySection";
import { MenuItemForm } from "./MenuItemForm";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import {
  createMenuItemAction,
  updateMenuItemAction,
  toggleMenuItemActiveAction,
} from "@/server/actions/menu-items";

interface MenuCatalogueScreenProps {
  businessId: string;
  initialCategories: MenuCategoryWithItems[];
}

type FoodFilter = "all" | FoodType;

const FOOD_FILTERS: { value: FoodFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "veg", label: "Veg" },
  { value: "non_veg", label: "Non-veg" },
  { value: "egg", label: "Egg" },
];

/**
 * Top-level screen for "Menus" in the bottom nav. Search + food-type filter
 * sit above a scrollable list of category sections, with a floating add
 * button that opens the item form as a bottom sheet — no full-page navigation
 * needed to add a single dish, since caterers add these one at a time,
 * mid-conversation with a customer.
 */
export function MenuCatalogueScreen({ businessId, initialCategories }: MenuCatalogueScreenProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [query, setQuery] = useState("");
  const [foodFilter, setFoodFilter] = useState<FoodFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | undefined>(undefined);

  const flatCategories = useMemo(() => categories.map((c) => ({ id: c.id, name: c.name })), [categories]);

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => {
          const matchesQuery = !q || item.name.toLowerCase().includes(q);
          const matchesFood = foodFilter === "all" || item.foodType === foodFilter;
          return matchesQuery && matchesFood && !item.isArchived;
        }),
      }))
      .filter((c) => c.items.length > 0);
  }, [categories, query, foodFilter]);

  const totalActiveItems = categories.reduce(
    (sum, c) => sum + c.items.filter((i) => !i.isArchived).length,
    0
  );

  function openAddForm() {
    setEditingItem(undefined);
    setFormOpen(true);
  }

  function openEditForm(item: MenuItem) {
    setEditingItem(item);
    setFormOpen(true);
  }

  async function handleFormSubmit(values: {
    name: string;
    categoryId: string;
    foodType: FoodType;
    description: string | null;
    defaultExtraPricePaise: number;
  }) {
    if (editingItem) {
      const updated = await updateMenuItemAction({ itemId: editingItem.id, ...values });
      setCategories((prev) => moveItemAcrossCategories(prev, updated));
    } else {
      const created = await createMenuItemAction({ businessId, ...values });
      setCategories((prev) => insertItem(prev, created));
    }
  }

  async function handleToggleActive(item: MenuItem, isActive: boolean) {
    // optimistic update
    setCategories((prev) => patchItem(prev, item.id, { isActive }));
    try {
      await toggleMenuItemActiveAction({ itemId: item.id, isActive });
    } catch {
      // revert on failure
      setCategories((prev) => patchItem(prev, item.id, { isActive: !isActive }));
    }
  }

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-10 bg-[hsl(var(--color-bg))]/95 px-4 pb-3 pt-5 backdrop-blur">
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-2xl">Menus</h1>
          <span className="text-sm text-[hsl(var(--color-ink))]/50">{totalActiveItems} items</span>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-lg border border-[hsl(var(--color-surface))] px-3">
          <Search className="h-4 w-4 shrink-0 text-[hsl(var(--color-ink))]/40" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dishes"
            className="h-11 border-0 px-0 text-base focus-visible:ring-0"
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto">
          {FOOD_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFoodFilter(f.value)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium ${
                foodFilter === f.value
                  ? "border-[hsl(var(--color-marigold))] bg-[hsl(var(--color-marigold))]/15"
                  : "border-[hsl(var(--color-surface))] text-[hsl(var(--color-ink))]/70"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <div className="mt-2">
        {filteredCategories.length === 0 ? (
          <EmptyState hasAnyItems={totalActiveItems > 0} onAdd={openAddForm} />
        ) : (
          filteredCategories.map((category) => (
            <MenuCategorySection
              key={category.id}
              category={category}
              onEditItem={openEditForm}
              onToggleActive={handleToggleActive}
            />
          ))
        )}
      </div>

      <button
        onClick={openAddForm}
        aria-label="Add menu item"
        className="fixed bottom-24 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--color-marigold))] text-white shadow-lg"
      >
        <Plus className="h-6 w-6" />
      </button>

      <MenuItemForm
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={flatCategories.map((c) => ({
          id: c.id,
          name: c.name,
          businessId,
          displayOrder: 0,
          isActive: true,
        }))}
        existingItem={editingItem}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}

function EmptyState({ hasAnyItems, onAdd }: { hasAnyItems: boolean; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-8 py-16 text-center">
      <p className="font-display text-lg">
        {hasAnyItems ? "No dishes match that search." : "Build your food catalogue."}
      </p>
      {!hasAnyItems && (
        <>
          <p className="text-sm text-[hsl(var(--color-ink))]/60">
            Add dishes once, then reuse them across every package and order.
          </p>
          <button
            onClick={onAdd}
            className="mt-2 rounded-lg bg-[hsl(var(--color-marigold))] px-5 py-2.5 text-sm font-medium text-white"
          >
            Add menu item
          </button>
        </>
      )}
    </div>
  );
}

// ---- local state helpers (kept pure so they're easy to unit test) ----

function patchItem(
  categories: MenuCategoryWithItems[],
  itemId: string,
  patch: Partial<MenuItem>
): MenuCategoryWithItems[] {
  return categories.map((c) => ({
    ...c,
    items: c.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
  }));
}

function insertItem(categories: MenuCategoryWithItems[], item: MenuItem): MenuCategoryWithItems[] {
  return categories.map((c) => (c.id === item.categoryId ? { ...c, items: [...c.items, item] } : c));
}

function moveItemAcrossCategories(
  categories: MenuCategoryWithItems[],
  updated: MenuItem
): MenuCategoryWithItems[] {
  const withoutOld = categories.map((c) => ({
    ...c,
    items: c.items.filter((i) => i.id !== updated.id),
  }));
  return insertItem(withoutOld, updated);
}
