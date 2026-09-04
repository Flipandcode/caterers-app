"use client";

import { MenuCategoryWithItems, MenuItem } from "@/types/domain";
import { MenuItemRow } from "./MenuItemRow";

interface MenuCategorySectionProps {
  category: MenuCategoryWithItems;
  onEditItem: (item: MenuItem) => void;
  onToggleActive: (item: MenuItem, isActive: boolean) => void;
}

export function MenuCategorySection({
  category,
  onEditItem,
  onToggleActive,
}: MenuCategorySectionProps) {
  if (category.items.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-1 px-4 font-display text-lg">{category.name}</h2>
      <div className="mx-4 rounded-xl bg-[hsl(var(--color-surface))]/40 px-3">
        {category.items.map((item) => (
          <MenuItemRow
            key={item.id}
            item={item}
            onEdit={onEditItem}
            onToggleActive={onToggleActive}
          />
        ))}
      </div>
    </section>
  );
}
