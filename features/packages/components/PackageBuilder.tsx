"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MenuCategoryWithItems,
  OrderFoodType,
  Package,
  PackageCategoryRule,
  PackageItem,
} from "@/types/domain";
import { formatPaise, rupeesToPaise, paiseToRupees } from "@/lib/money";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Minus, Plus, X, ChevronDown } from "lucide-react";
import { savePackageAction } from "@/server/actions/packages";

interface PackageBuilderProps {
  businessId: string;
  categories: MenuCategoryWithItems[];
  existingPackage?: Package;
}

const FOOD_TYPES: { value: OrderFoodType; label: string }[] = [
  { value: "veg", label: "Veg" },
  { value: "non_veg", label: "Non-veg" },
  { value: "mixed", label: "Mixed" },
];

interface DraftRule {
  categoryId: string;
  allowedSelectionCount: number;
}

interface DraftPreselect {
  menuItemId: string;
}

/**
 * Package builder: define a base price/plate, then two independent
 * mechanisms per the spec —
 *   1. Category rules ("choose N from Sabji")
 *   2. Preselected fixed items ("always include Jeera Rice")
 * A category can carry both at once, or neither if it's unused.
 */
export function PackageBuilder({ businessId, categories, existingPackage }: PackageBuilderProps) {
  const router = useRouter();
  const [name, setName] = useState(existingPackage?.name ?? "");
  const [description, setDescription] = useState(existingPackage?.description ?? "");
  const [foodType, setFoodType] = useState<OrderFoodType>(existingPackage?.foodType ?? "veg");
  const [pricePerPlateRupees, setPricePerPlateRupees] = useState(
    existingPackage ? String(paiseToRupees(existingPackage.basePricePerPlatePaise)) : ""
  );
  const [minGuestCount, setMinGuestCount] = useState(existingPackage?.minGuestCount ?? 50);

  const [rules, setRules] = useState<DraftRule[]>(
    existingPackage?.categoryRules.map((r) => ({
      categoryId: r.categoryId,
      allowedSelectionCount: r.allowedSelectionCount,
    })) ?? []
  );
  const [preselected, setPreselected] = useState<DraftPreselect[]>(
    existingPackage?.preselectedItems.map((p) => ({ menuItemId: p.menuItemId })) ?? []
  );

  const [pickerCategoryId, setPickerCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoriesById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );
  const menuItemsById = useMemo(() => {
    const map = new Map<string, { name: string; categoryId: string }>();
    categories.forEach((c) => c.items.forEach((i) => map.set(i.id, { name: i.name, categoryId: c.id })));
    return map;
  }, [categories]);

  const usedCategoryIds = new Set(rules.map((r) => r.categoryId));
  const availableCategoriesForNewRule = categories.filter((c) => !usedCategoryIds.has(c.id));

  function addRule(categoryId: string) {
    setRules((prev) => [...prev, { categoryId, allowedSelectionCount: 1 }]);
  }

  function updateRuleCount(categoryId: string, count: number) {
    setRules((prev) =>
      prev.map((r) => (r.categoryId === categoryId ? { ...r, allowedSelectionCount: Math.max(1, count) } : r))
    );
  }

  function removeRule(categoryId: string) {
    setRules((prev) => prev.filter((r) => r.categoryId !== categoryId));
  }

  function togglePreselect(menuItemId: string) {
    setPreselected((prev) =>
      prev.some((p) => p.menuItemId === menuItemId)
        ? prev.filter((p) => p.menuItemId !== menuItemId)
        : [...prev, { menuItemId }]
    );
  }

  async function handleSave() {
    if (!name.trim()) return setError("Give the package a name.");
    const priceValue = parseFloat(pricePerPlateRupees);
    if (!priceValue || priceValue <= 0) return setError("Enter a price per plate.");

    setSaving(true);
    setError(null);
    try {
      await savePackageAction({
        packageId: existingPackage?.id,
        businessId,
        name: name.trim(),
        description: description.trim() || null,
        foodType,
        basePricePerPlatePaise: rupeesToPaise(priceValue),
        minGuestCount,
        categoryRules: rules,
        preselectedItems: preselected,
      });
      router.push("/packages");
      router.refresh();
    } catch {
      setError("We couldn't save this package. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-28">
      <header className="px-4 pb-2 pt-5">
        <h1 className="font-display text-2xl">{existingPackage ? "Edit package" : "New package"}</h1>
      </header>

      <div className="flex flex-col gap-5 px-4">
        <section>
          <label className="mb-1 block text-sm font-medium">Package name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Gold Wedding Package"
            className="h-12 text-base"
          />
        </section>

        <section>
          <label className="mb-1 block text-sm font-medium">Food type</label>
          <div className="flex gap-2">
            {FOOD_TYPES.map((ft) => (
              <button
                key={ft.value}
                onClick={() => setFoodType(ft.value)}
                className={`h-11 flex-1 rounded-lg border text-sm font-medium ${
                  foodType === ft.value
                    ? "border-[hsl(var(--color-marigold))] bg-[hsl(var(--color-marigold))]/15"
                    : "border-[hsl(var(--color-surface))]"
                }`}
              >
                {ft.label}
              </button>
            ))}
          </div>
        </section>

        <section className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Price per plate</label>
            <Input
              inputMode="decimal"
              value={pricePerPlateRupees}
              onChange={(e) => setPricePerPlateRupees(e.target.value)}
              placeholder="250"
              className="h-12 text-base"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Minimum guests</label>
            <div className="flex h-12 items-center rounded-lg border border-[hsl(var(--color-surface))]">
              <button
                type="button"
                onClick={() => setMinGuestCount((n) => Math.max(1, n - 10))}
                className="flex h-full w-11 items-center justify-center text-[hsl(var(--color-ink))]/60"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="flex-1 text-center text-base font-medium">{minGuestCount}</span>
              <button
                type="button"
                onClick={() => setMinGuestCount((n) => n + 10)}
                className="flex h-full w-11 items-center justify-center text-[hsl(var(--color-ink))]/60"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <section>
          <label className="mb-1 block text-sm font-medium">
            Description <span className="font-normal text-[hsl(var(--color-ink))]/50">(optional)</span>
          </label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </section>

        {/* ---- Category rules: "choose N from category" ---- */}
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-display text-lg">Included categories</h2>
            <span className="text-xs text-[hsl(var(--color-ink))]/50">Choose how many from each</span>
          </div>

          <div className="flex flex-col gap-2">
            {rules.map((rule) => {
              const category = categoriesById.get(rule.categoryId);
              if (!category) return null;
              return (
                <div
                  key={rule.categoryId}
                  className="flex items-center justify-between rounded-lg border border-[hsl(var(--color-surface))] px-3 py-2.5"
                >
                  <span className="font-medium">{category.name}</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateRuleCount(rule.categoryId, rule.allowedSelectionCount - 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[hsl(var(--color-surface))]"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm">{rule.allowedSelectionCount}</span>
                      <button
                        type="button"
                        onClick={() => updateRuleCount(rule.categoryId, rule.allowedSelectionCount + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[hsl(var(--color-surface))]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRule(rule.categoryId)}
                      aria-label={`Remove ${category.name}`}
                      className="text-[hsl(var(--color-ink))]/40"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {availableCategoriesForNewRule.length > 0 && (
            <div className="relative mt-2">
              <select
                value=""
                onChange={(e) => e.target.value && addRule(e.target.value)}
                className="h-11 w-full appearance-none rounded-lg border border-dashed border-[hsl(var(--color-surface))] bg-transparent px-3 text-sm text-[hsl(var(--color-ink))]/70"
              >
                <option value="" disabled>
                  + Add a category
                </option>
                {availableCategoriesForNewRule.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--color-ink))]/40" />
            </div>
          )}
        </section>

        {/* ---- Preselected fixed items ---- */}
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-display text-lg">Always included</h2>
            <span className="text-xs text-[hsl(var(--color-ink))]/50">Fixed items, no choice needed</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {preselected.map((p) => {
              const item = menuItemsById.get(p.menuItemId);
              if (!item) return null;
              return (
                <span
                  key={p.menuItemId}
                  className="flex items-center gap-1.5 rounded-full bg-[hsl(var(--color-green))]/10 px-3 py-1.5 text-sm"
                >
                  {item.name}
                  <button onClick={() => togglePreselect(p.menuItemId)} aria-label={`Remove ${item.name}`}>
                    <X className="h-3.5 w-3.5 text-[hsl(var(--color-ink))]/50" />
                  </button>
                </span>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setPickerCategoryId(categories[0]?.id ?? null)}
            className="mt-2 text-sm font-medium text-[hsl(var(--color-marigold))]"
          >
            + Add fixed item
          </button>

          {pickerCategoryId && (
            <FixedItemPicker
              categories={categories}
              selectedIds={new Set(preselected.map((p) => p.menuItemId))}
              onToggle={togglePreselect}
              onClose={() => setPickerCategoryId(null)}
            />
          )}
        </section>

        {error && <p className="text-sm text-[hsl(var(--color-tamarind))]">{error}</p>}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-[hsl(var(--color-surface))] bg-[hsl(var(--color-bg))] p-4">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-12 w-full bg-[hsl(var(--color-marigold))] text-base font-medium text-white hover:bg-[hsl(var(--color-marigold))]/90"
        >
          {saving ? "Saving…" : existingPackage ? "Save changes" : "Create package"}
        </Button>
      </div>
    </div>
  );
}

function FixedItemPicker({
  categories,
  selectedIds,
  onToggle,
  onClose,
}: {
  categories: MenuCategoryWithItems[];
  selectedIds: Set<string>;
  onToggle: (menuItemId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end bg-black/30" onClick={onClose}>
      <div
        className="max-h-[70vh] overflow-y-auto rounded-t-2xl bg-[hsl(var(--color-bg))] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg">Choose fixed items</h3>
          <button onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {categories.map((category) => (
          <div key={category.id} className="mb-4">
            <p className="mb-1.5 text-sm font-medium text-[hsl(var(--color-ink))]/60">{category.name}</p>
            <div className="flex flex-col gap-1">
              {category.items
                .filter((i) => !i.isArchived)
                .map((item) => (
                  <label key={item.id} className="flex items-center gap-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => onToggle(item.id)}
                      className="h-4 w-4 accent-[hsl(var(--color-marigold))]"
                    />
                    <span>{item.name}</span>
                  </label>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
