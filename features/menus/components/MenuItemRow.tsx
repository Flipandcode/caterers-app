"use client";

import { MenuItem } from "@/types/domain";
import { formatPaise } from "@/lib/money";
import { Switch } from "@/components/ui/switch";
import { Pencil } from "lucide-react";

const FOOD_TYPE_BAR: Record<MenuItem["foodType"], string> = {
  veg: "bg-[hsl(160,35%,17%)]",     // bottle green
  non_veg: "bg-[hsl(351,51%,32%)]", // tamarind
  egg: "bg-[hsl(33,78%,49%)]",      // marigold
};

const FOOD_TYPE_LABEL: Record<MenuItem["foodType"], string> = {
  veg: "Veg",
  non_veg: "Non-veg",
  egg: "Egg",
};

interface MenuItemRowProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onToggleActive: (item: MenuItem, isActive: boolean) => void;
}

export function MenuItemRow({ item, onEdit, onToggleActive }: MenuItemRowProps) {
  return (
    <div className="flex items-stretch gap-3 rounded-lg border-b border-[hsl(var(--color-surface))] px-1 py-3 transition-colors last:border-b-0 hover:bg-[hsl(var(--color-marigold))]/5">
      <div className={`w-1 shrink-0 rounded-full ${FOOD_TYPE_BAR[item.foodType]}`} aria-hidden />

      <button
        type="button"
        onClick={() => onEdit(item)}
        className="flex flex-1 items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <p className="truncate text-base font-medium leading-tight">{item.name}</p>
          <p className="text-sm text-[hsl(var(--color-ink))]/60">
            {FOOD_TYPE_LABEL[item.foodType]}
            {item.defaultExtraPricePaise > 0 && (
              <span> · +{formatPaise(item.defaultExtraPricePaise)} extra</span>
            )}
          </p>
        </div>
        <Pencil className="h-4 w-4 shrink-0 text-[hsl(var(--color-ink))]/40" />
      </button>

      <div className="flex items-center pl-1">
        <Switch
          checked={item.isActive}
          onCheckedChange={(checked) => onToggleActive(item, checked)}
          aria-label={`${item.isActive ? "Deactivate" : "Activate"} ${item.name}`}
        />
      </div>
    </div>
  );
}
