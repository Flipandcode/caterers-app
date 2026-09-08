"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import {
  Customer,
  MenuCategoryWithItems,
  MenuItem,
  OrderFoodType,
  Package,
} from "@/types/domain";
import { calculateOrderTotals, formatPaise, rupeesToPaise } from "@/lib/money";
import { CustomerPicker } from "./CustomerPicker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Minus, Plus, X } from "lucide-react";
import { createOrderAction } from "@/server/actions/orders";

interface OrderWizardProps {
  businessId: string;
  categories: MenuCategoryWithItems[];
  packages: Package[];
}

const STEPS = ["Customer", "Event", "Food type", "Package", "Menu", "Charges", "Review"] as const;

const FOOD_TYPES: { value: OrderFoodType; label: string }[] = [
  { value: "veg", label: "Veg" },
  { value: "non_veg", label: "Non-veg" },
  { value: "mixed", label: "Mixed" },
];

interface ExtraItemDraft {
  menuItemId: string;
  name: string;
  categoryName: string;
  foodType: MenuItem["foodType"];
  priceRupees: string;
  isFlat: boolean;
}

/**
 * The core "create a 300-person wedding order in under 3 minutes" flow.
 * Seven short steps rather than one long form, since each maps to a
 * decision a caterer makes in sequence on a call with a customer.
 */
export function OrderWizard({ businessId, categories, packages }: OrderWizardProps) {
  const [step, setStep] = useState(0);

  // Step 0: customer
  const [customer, setCustomer] = useState<Customer | null>(null);

  // Step 1: event details
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [guestCount, setGuestCount] = useState(100);
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Step 2: food type
  const [foodType, setFoodType] = useState<OrderFoodType>("veg");

  // Step 3: package
  const [selectedPackage, setSelectedPackage] = useState<Package | "custom" | null>(null);

  // Step 4: menu selection
  const [ruleSelections, setRuleSelections] = useState<Record<string, string[]>>({});
  const [customSelections, setCustomSelections] = useState<string[]>([]);
  const [customPricingMode, setCustomPricingMode] = useState<"perPlate" | "fixedTotal">("perPlate");
  const [customPricePerPlateRupees, setCustomPricePerPlateRupees] = useState("");
  const [customFixedTotalRupees, setCustomFixedTotalRupees] = useState("");
  const [extraItems, setExtraItems] = useState<ExtraItemDraft[]>([]);

  // Step 5: charges
  const [serviceChargeRupees, setServiceChargeRupees] = useState("");
  const [transportChargeRupees, setTransportChargeRupees] = useState("");
  const [equipmentChargeRupees, setEquipmentChargeRupees] = useState("");
  const [staffChargeRupees, setStaffChargeRupees] = useState("");
  const [otherChargesRupees, setOtherChargesRupees] = useState("");
  const [discountRupees, setDiscountRupees] = useState("");
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxPercentage, setTaxPercentage] = useState("5");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const relevantPackages = useMemo(
    () => packages.filter((p) => p.isActive && (p.foodType === foodType || foodType === "mixed")),
    [packages, foodType]
  );

  const menuItemsById = useMemo(() => {
    const map = new Map<string, MenuItem & { categoryName: string }>();
    categories.forEach((c) => c.items.forEach((i) => map.set(i.id, { ...i, categoryName: c.name })));
    return map;
  }, [categories]);

  const pricePerPlatePaise = useMemo(() => {
    if (selectedPackage && selectedPackage !== "custom") return selectedPackage.basePricePerPlatePaise;
    if (customPricingMode === "perPlate") {
      return rupeesToPaise(parseFloat(customPricePerPlateRupees) || 0);
    }
    const fixedTotalPaise = rupeesToPaise(parseFloat(customFixedTotalRupees) || 0);
    return guestCount > 0 ? Math.round(fixedTotalPaise / guestCount) : 0;
  }, [selectedPackage, customPricingMode, customPricePerPlateRupees, customFixedTotalRupees, guestCount]);

  const extraLineItemsPaise = useMemo(
    () =>
      extraItems.map((e) => {
        const paise = rupeesToPaise(parseFloat(e.priceRupees) || 0);
        return e.isFlat ? paise : paise * guestCount;
      }),
    [extraItems, guestCount]
  );

  const totals = useMemo(
    () =>
      calculateOrderTotals({
        guestCount,
        pricePerPlatePaise,
        extraLineItemsPaise,
        serviceChargePaise: rupeesToPaise(parseFloat(serviceChargeRupees) || 0),
        transportChargePaise: rupeesToPaise(parseFloat(transportChargeRupees) || 0),
        equipmentChargePaise: rupeesToPaise(parseFloat(equipmentChargeRupees) || 0),
        staffChargePaise: rupeesToPaise(parseFloat(staffChargeRupees) || 0),
        otherChargesPaise: rupeesToPaise(parseFloat(otherChargesRupees) || 0),
        discountPaise: rupeesToPaise(parseFloat(discountRupees) || 0),
        taxEnabled,
        taxPercentage: parseFloat(taxPercentage) || 0,
      }),
    [
      guestCount,
      pricePerPlatePaise,
      extraLineItemsPaise,
      serviceChargeRupees,
      transportChargeRupees,
      equipmentChargeRupees,
      staffChargeRupees,
      otherChargesRupees,
      discountRupees,
      taxEnabled,
      taxPercentage,
    ]
  );

  function canProceed(): boolean {
    switch (step) {
      case 0:
        return customer !== null;
      case 1:
        return eventName.trim() !== "" && eventDate !== "" && guestCount > 0;
      case 2:
        return true;
      case 3:
        return selectedPackage !== null;
      case 4:
        return pricePerPlatePaise > 0;
      default:
        return true;
    }
  }

  function toggleRuleSelection(categoryId: string, menuItemId: string, maxCount: number) {
    setRuleSelections((prev) => {
      const current = prev[categoryId] ?? [];
      if (current.includes(menuItemId)) {
        return { ...prev, [categoryId]: current.filter((id) => id !== menuItemId) };
      }
      if (current.length >= maxCount) {
        // at the limit: replace the oldest pick when the rule only allows one,
        // otherwise just ignore the extra tap
        return maxCount === 1
          ? { ...prev, [categoryId]: [menuItemId] }
          : prev;
      }
      return { ...prev, [categoryId]: [...current, menuItemId] };
    });
  }

  function toggleCustomSelection(menuItemId: string) {
    setCustomSelections((prev) =>
      prev.includes(menuItemId) ? prev.filter((id) => id !== menuItemId) : [...prev, menuItemId]
    );
  }

  function addExtraItem(item: MenuItem & { categoryName: string }) {
    setExtraItems((prev) => [
      ...prev,
      {
        menuItemId: item.id,
        name: item.name,
        categoryName: item.categoryName,
        foodType: item.foodType,
        priceRupees: item.defaultExtraPricePaise ? String(item.defaultExtraPricePaise / 100) : "",
        isFlat: false,
      },
    ]);
  }

  function removeExtraItem(menuItemId: string) {
    setExtraItems((prev) => prev.filter((e) => e.menuItemId !== menuItemId));
  }

  async function handleSubmit() {
    if (!customer) return;
    setSubmitting(true);
    setError(null);

    const menuLines =
      selectedPackage === "custom"
        ? customSelections.map((id) => {
            const item = menuItemsById.get(id)!;
            return {
              menuItemId: item.id,
              nameSnapshot: item.name,
              categorySnapshot: item.categoryName,
              foodType: item.foodType,
              isExtra: false,
              extraPricePaise: 0,
              extraPriceIsFlat: false,
            };
          })
        : [
            // preselected fixed items from the package
            ...(selectedPackage
              ? selectedPackage.preselectedItems.map((p) => ({
                  menuItemId: p.menuItemId,
                  nameSnapshot: p.menuItemName,
                  categorySnapshot:
                    menuItemsById.get(p.menuItemId)?.categoryName ?? "Included",
                  foodType: menuItemsById.get(p.menuItemId)?.foodType ?? "veg",
                  isExtra: false,
                  extraPricePaise: 0,
                  extraPriceIsFlat: false,
                }))
              : []),
            // rule-based selections
            ...Object.values(ruleSelections)
              .flat()
              .map((id) => {
                const item = menuItemsById.get(id)!;
                return {
                  menuItemId: item.id,
                  nameSnapshot: item.name,
                  categorySnapshot: item.categoryName,
                  foodType: item.foodType,
                  isExtra: false,
                  extraPricePaise: 0,
                  extraPriceIsFlat: false,
                };
              }),
          ];

    const extraLines = extraItems.map((e) => ({
      menuItemId: e.menuItemId,
      nameSnapshot: e.name,
      categorySnapshot: e.categoryName,
      foodType: e.foodType,
      isExtra: true,
      extraPricePaise: rupeesToPaise(parseFloat(e.priceRupees) || 0),
      extraPriceIsFlat: e.isFlat,
    }));

    const result = await createOrderAction({
      businessId,
      customerId: customer.id,
      eventName,
      eventDate,
      eventStartTime: eventStartTime || null,
      eventEndTime: eventEndTime || null,
      venueName: venueName || null,
      venueAddress: venueAddress || null,
      guestCount,
      specialInstructions: specialInstructions || null,
      foodType,
      packageId: selectedPackage === "custom" ? null : selectedPackage?.id ?? null,
      packageNameSnapshot: selectedPackage === "custom" ? "Custom Menu" : selectedPackage?.name ?? null,
      pricePerPlatePaise,
      serviceChargePaise: rupeesToPaise(parseFloat(serviceChargeRupees) || 0),
      transportChargePaise: rupeesToPaise(parseFloat(transportChargeRupees) || 0),
      equipmentChargePaise: rupeesToPaise(parseFloat(equipmentChargeRupees) || 0),
      staffChargePaise: rupeesToPaise(parseFloat(staffChargeRupees) || 0),
      otherChargesPaise: rupeesToPaise(parseFloat(otherChargesRupees) || 0),
      discountPaise: rupeesToPaise(parseFloat(discountRupees) || 0),
      taxEnabled,
      taxName: taxEnabled ? "GST" : null,
      taxPercentage: taxEnabled ? parseFloat(taxPercentage) || 0 : 0,
      termsSnapshot: null,
      menuItems: [...menuLines, ...extraLines],
    });

    // A successful call redirects server-side and never returns here.
    if (result && !result.success) {
      setError(result.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="pb-28">
      <header className="sticky top-0 z-10 bg-bg/95 px-4 pb-3 pt-5 backdrop-blur">
        <h1 className="font-display text-2xl">New order</h1>
        <div className="mt-3 flex gap-1">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-marigold" : "bg-surface"}`}
            />
          ))}
        </div>
        <p className="mt-1.5 text-xs text-ink/50">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
      </header>

      <div className="px-4">
        {step === 0 && <CustomerPicker businessId={businessId} selected={customer} onSelect={setCustomer} />}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <Field label="Event name">
              <Input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. Wedding Reception"
                className="h-12 text-base"
              />
            </Field>
            <Field label="Event date">
              <Input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="h-12 text-base"
              />
            </Field>
            <div className="flex gap-3">
              <Field label="Start time" className="flex-1">
                <Input
                  type="time"
                  value={eventStartTime}
                  onChange={(e) => setEventStartTime(e.target.value)}
                  className="h-12 text-base"
                />
              </Field>
              <Field label="End time" className="flex-1">
                <Input
                  type="time"
                  value={eventEndTime}
                  onChange={(e) => setEventEndTime(e.target.value)}
                  className="h-12 text-base"
                />
              </Field>
            </div>
            <Field label="Venue name">
              <Input
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                className="h-12 text-base"
              />
            </Field>
            <Field label="Venue address">
              <Textarea
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
                rows={2}
              />
            </Field>
            <Field label="Number of guests">
              <div className="flex h-12 items-center rounded-lg border border-surface">
                <button
                  type="button"
                  onClick={() => setGuestCount((n) => Math.max(1, n - 10))}
                  className="flex h-full w-12 items-center justify-center text-ink/60"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="flex-1 text-center text-lg font-medium">{guestCount}</span>
                <button
                  type="button"
                  onClick={() => setGuestCount((n) => n + 10)}
                  className="flex h-full w-12 items-center justify-center text-ink/60"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </Field>
            <Field label="Special instructions (optional)">
              <Textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={2}
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-2">
            {FOOD_TYPES.map((ft) => (
              <button
                key={ft.value}
                onClick={() => setFoodType(ft.value)}
                className={`rounded-lg border p-4 text-left font-medium ${
                  foodType === ft.value ? "border-marigold bg-marigold/15" : "border-surface"
                }`}
              >
                {ft.label}
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-3">
            {relevantPackages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg)}
                className={`rounded-lg border p-4 text-left ${
                  selectedPackage !== "custom" && selectedPackage?.id === pkg.id
                    ? "border-marigold bg-marigold/10"
                    : "border-surface"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <p className="font-display text-lg">{pkg.name}</p>
                  <p className="font-display text-lg">{formatPaise(pkg.basePricePerPlatePaise)} / plate</p>
                </div>
                {pkg.description && <p className="mt-1 text-sm text-ink/60">{pkg.description}</p>}
                <p className="mt-2 text-xs text-ink/50">
                  {[
                    ...pkg.categoryRules.map((r) => `${r.allowedSelectionCount} ${r.categoryName}`),
                    ...pkg.preselectedItems.map((p) => p.menuItemName),
                  ].join(" · ")}
                </p>
              </button>
            ))}

            <button
              onClick={() => setSelectedPackage("custom")}
              className={`rounded-lg border border-dashed p-4 text-left font-medium ${
                selectedPackage === "custom" ? "border-marigold bg-marigold/10" : "border-surface"
              }`}
            >
              Build Custom Menu
            </button>
          </div>
        )}

        {step === 4 && selectedPackage === "custom" && (
          <CustomMenuStep
            categories={categories}
            foodType={foodType}
            selectedIds={customSelections}
            onToggle={toggleCustomSelection}
            pricingMode={customPricingMode}
            onPricingModeChange={setCustomPricingMode}
            pricePerPlateRupees={customPricePerPlateRupees}
            onPricePerPlateChange={setCustomPricePerPlateRupees}
            fixedTotalRupees={customFixedTotalRupees}
            onFixedTotalChange={setCustomFixedTotalRupees}
          />
        )}

        {step === 4 && selectedPackage && selectedPackage !== "custom" && (
          <PackageMenuStep
            pkg={selectedPackage}
            categories={categories}
            ruleSelections={ruleSelections}
            onToggleRule={toggleRuleSelection}
            extraItems={extraItems}
            onAddExtra={addExtraItem}
            onRemoveExtra={removeExtraItem}
            onChangeExtraPrice={(id, price) =>
              setExtraItems((prev) => prev.map((e) => (e.menuItemId === id ? { ...e, priceRupees: price } : e)))
            }
            onToggleExtraFlat={(id) =>
              setExtraItems((prev) => prev.map((e) => (e.menuItemId === id ? { ...e, isFlat: !e.isFlat } : e)))
            }
          />
        )}

        {step === 5 && (
          <div className="flex flex-col gap-4">
            <ChargeField label="Service charge" value={serviceChargeRupees} onChange={setServiceChargeRupees} />
            <ChargeField label="Transport" value={transportChargeRupees} onChange={setTransportChargeRupees} />
            <ChargeField label="Equipment" value={equipmentChargeRupees} onChange={setEquipmentChargeRupees} />
            <ChargeField label="Staff charge" value={staffChargeRupees} onChange={setStaffChargeRupees} />
            <ChargeField label="Other charges" value={otherChargesRupees} onChange={setOtherChargesRupees} />
            <ChargeField label="Discount" value={discountRupees} onChange={setDiscountRupees} />

            <div className="flex items-center justify-between rounded-lg border border-surface p-3">
              <span className="font-medium">Apply tax</span>
              <Switch checked={taxEnabled} onCheckedChange={setTaxEnabled} />
            </div>
            {taxEnabled && (
              <Field label="Tax percentage">
                <Input
                  inputMode="decimal"
                  value={taxPercentage}
                  onChange={(e) => setTaxPercentage(e.target.value)}
                  className="h-12 text-base"
                />
              </Field>
            )}

            <PricingSummary totals={totals} guestCount={guestCount} pricePerPlatePaise={pricePerPlatePaise} />
          </div>
        )}

        {step === 6 && (
          <div className="flex flex-col gap-4">
            <SummaryRow label="Customer" value={customer?.name ?? ""} />
            <SummaryRow label="Event" value={`${eventName} · ${eventDate}`} />
            <SummaryRow label="Venue" value={venueName || "—"} />
            <SummaryRow label="Guests" value={String(guestCount)} />
            <SummaryRow
              label="Menu"
              value={selectedPackage === "custom" ? "Custom Menu" : selectedPackage?.name ?? ""}
            />
            <PricingSummary totals={totals} guestCount={guestCount} pricePerPlatePaise={pricePerPlatePaise} />
            {error && <p className="text-sm text-tamarind">{error}</p>}
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 flex gap-3 border-t border-surface bg-bg p-4">
        {step > 0 && (
          <Button variant="outline" className="h-12 flex-1" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button
            disabled={!canProceed()}
            className="h-12 flex-1 bg-marigold text-white hover:bg-marigold/90"
            onClick={() => setStep((s) => s + 1)}
          >
            Next
          </Button>
        ) : (
          <Button
            disabled={submitting}
            className="h-12 flex-1 bg-marigold text-white hover:bg-marigold/90"
            onClick={handleSubmit}
          >
            {submitting ? "Creating order…" : "Create order"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function ChargeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <Input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="h-12 text-base"
      />
    </Field>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-surface py-2">
      <span className="text-sm text-ink/60">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function PricingSummary({
  totals,
  guestCount,
  pricePerPlatePaise,
}: {
  totals: ReturnType<typeof calculateOrderTotals>;
  guestCount: number;
  pricePerPlatePaise: number;
}) {
  return (
    <div className="rounded-lg bg-surface/40 p-4">
      <div className="flex justify-between text-sm">
        <span className="text-ink/60">
          {guestCount} guests × {formatPaise(pricePerPlatePaise)}
        </span>
        <span>{formatPaise(totals.foodAmountPaise)}</span>
      </div>
      {totals.extrasPaise > 0 && (
        <div className="mt-1 flex justify-between text-sm">
          <span className="text-ink/60">Extras</span>
          <span>{formatPaise(totals.extrasPaise)}</span>
        </div>
      )}
      {totals.chargesPaise > 0 && (
        <div className="mt-1 flex justify-between text-sm">
          <span className="text-ink/60">Other charges</span>
          <span>{formatPaise(totals.chargesPaise)}</span>
        </div>
      )}
      {totals.taxAmountPaise > 0 && (
        <div className="mt-1 flex justify-between text-sm">
          <span className="text-ink/60">Tax</span>
          <span>{formatPaise(totals.taxAmountPaise)}</span>
        </div>
      )}
      <div className="mt-2 flex justify-between border-t border-surface pt-2 font-display text-xl">
        <span>Total</span>
        <span>{formatPaise(totals.grandTotalPaise)}</span>
      </div>
    </div>
  );
}

function CustomMenuStep({
  categories,
  foodType,
  selectedIds,
  onToggle,
  pricingMode,
  onPricingModeChange,
  pricePerPlateRupees,
  onPricePerPlateChange,
  fixedTotalRupees,
  onFixedTotalChange,
}: {
  categories: MenuCategoryWithItems[];
  foodType: OrderFoodType;
  selectedIds: string[];
  onToggle: (id: string) => void;
  pricingMode: "perPlate" | "fixedTotal";
  onPricingModeChange: (m: "perPlate" | "fixedTotal") => void;
  pricePerPlateRupees: string;
  onPricePerPlateChange: (v: string) => void;
  fixedTotalRupees: string;
  onFixedTotalChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          onClick={() => onPricingModeChange("perPlate")}
          className={`h-10 flex-1 rounded-lg border text-sm font-medium ${
            pricingMode === "perPlate" ? "border-marigold bg-marigold/15" : "border-surface"
          }`}
        >
          Price per plate
        </button>
        <button
          onClick={() => onPricingModeChange("fixedTotal")}
          className={`h-10 flex-1 rounded-lg border text-sm font-medium ${
            pricingMode === "fixedTotal" ? "border-marigold bg-marigold/15" : "border-surface"
          }`}
        >
          Fixed event price
        </button>
      </div>
      <Input
        inputMode="decimal"
        value={pricingMode === "perPlate" ? pricePerPlateRupees : fixedTotalRupees}
        onChange={(e) =>
          pricingMode === "perPlate"
            ? onPricePerPlateChange(e.target.value)
            : onFixedTotalChange(e.target.value)
        }
        placeholder={pricingMode === "perPlate" ? "e.g. 350" : "e.g. 87500"}
        className="h-12 text-base"
      />

      {categories.map((category) => {
        const relevant = category.items.filter(
          (i) => !i.isArchived && (foodType === "mixed" || i.foodType === "veg" || i.foodType === foodType)
        );
        if (relevant.length === 0) return null;
        return (
          <div key={category.id}>
            <p className="mb-1.5 text-sm font-medium text-ink/60">{category.name}</p>
            <div className="flex flex-col gap-1">
              {relevant.map((item) => (
                <label key={item.id} className="flex items-center gap-3 py-1.5">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => onToggle(item.id)}
                    className="h-4 w-4 accent-marigold"
                  />
                  <span>{item.name}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PackageMenuStep({
  pkg,
  categories,
  ruleSelections,
  onToggleRule,
  extraItems,
  onAddExtra,
  onRemoveExtra,
  onChangeExtraPrice,
  onToggleExtraFlat,
}: {
  pkg: Package;
  categories: MenuCategoryWithItems[];
  ruleSelections: Record<string, string[]>;
  onToggleRule: (categoryId: string, menuItemId: string, maxCount: number) => void;
  extraItems: ExtraItemDraft[];
  onAddExtra: (item: MenuItem & { categoryName: string }) => void;
  onRemoveExtra: (menuItemId: string) => void;
  onChangeExtraPrice: (menuItemId: string, price: string) => void;
  onToggleExtraFlat: (menuItemId: string) => void;
}) {
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const usedInRules = new Set(pkg.categoryRules.map((r) => r.categoryId));
  const extraItemIds = new Set(extraItems.map((e) => e.menuItemId));
  const preselectedIds = new Set(pkg.preselectedItems.map((p) => p.menuItemId));

  return (
    <div className="flex flex-col gap-5">
      {pkg.preselectedItems.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink/60">Always included</p>
          <div className="flex flex-wrap gap-2">
            {pkg.preselectedItems.map((p) => (
              <span key={p.id} className="rounded-full bg-green/10 px-3 py-1.5 text-sm">
                {p.menuItemName}
              </span>
            ))}
          </div>
        </div>
      )}

      {pkg.categoryRules.map((rule) => {
        const category = categoriesById.get(rule.categoryId);
        if (!category) return null;
        const selected = ruleSelections[rule.categoryId] ?? [];
        return (
          <div key={rule.id}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <p className="text-sm font-medium">{category.name}</p>
              <span className="text-xs text-ink/50">
                {selected.length} of {rule.allowedSelectionCount} selected
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {category.items
                .filter((i) => !i.isArchived)
                .map((item) => (
                  <label key={item.id} className="flex items-center gap-3 py-1.5">
                    <input
                      type={rule.allowedSelectionCount === 1 ? "radio" : "checkbox"}
                      name={`rule-${rule.categoryId}`}
                      checked={selected.includes(item.id)}
                      onChange={() => onToggleRule(rule.categoryId, item.id, rule.allowedSelectionCount)}
                      className="h-4 w-4 accent-marigold"
                    />
                    <span>{item.name}</span>
                  </label>
                ))}
            </div>
          </div>
        );
      })}

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink/60">Add extra items</p>
        <div className="flex flex-col gap-2">
          {extraItems.map((e) => (
            <div key={e.menuItemId} className="flex items-center gap-2 rounded-lg border border-surface p-2.5">
              <span className="flex-1 text-sm">{e.name}</span>
              <Input
                inputMode="decimal"
                value={e.priceRupees}
                onChange={(ev) => onChangeExtraPrice(e.menuItemId, ev.target.value)}
                placeholder="Price"
                className="h-9 w-20 text-sm"
              />
              <button
                onClick={() => onToggleExtraFlat(e.menuItemId)}
                className="text-xs text-ink/50 underline"
              >
                {e.isFlat ? "flat" : "per plate"}
              </button>
              <button onClick={() => onRemoveExtra(e.menuItemId)} aria-label={`Remove ${e.name}`}>
                <X className="h-4 w-4 text-ink/40" />
              </button>
            </div>
          ))}
        </div>

        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-medium text-marigold">Browse items to add</summary>
          <div className="mt-2 flex flex-col gap-3">
            {categories.map((category) => {
              const available = category.items.filter(
                (i) =>
                  !i.isArchived &&
                  !extraItemIds.has(i.id) &&
                  !preselectedIds.has(i.id) &&
                  !(usedInRules.has(category.id) && (ruleSelections[category.id] ?? []).includes(i.id))
              );
              if (available.length === 0) return null;
              return (
                <div key={category.id}>
                  <p className="mb-1 text-xs font-medium text-ink/50">{category.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {available.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onAddExtra({ ...item, categoryName: category.name })}
                        className="rounded-full border border-surface px-3 py-1 text-sm"
                      >
                        + {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      </div>
    </div>
  );
}
