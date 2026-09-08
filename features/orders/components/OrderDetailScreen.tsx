import type { ReactNode } from "react";
import { OrderDetail } from "@/lib/order-detail-data";
import { formatPaise, paymentStatus } from "@/lib/money";

const STATUS_LABELS: Record<string, string> = {
  enquiry: "Enquiry",
  quotation_sent: "Quotation sent",
  tentative: "Tentative",
  confirmed: "Confirmed",
  preparation: "Preparation",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function OrderDetailScreen({ order }: { order: OrderDetail }) {
  const balancePaise = order.grandTotalPaise - order.totalPaidPaise;
  const status = paymentStatus(order.grandTotalPaise, order.totalPaidPaise, order.eventDate);

  const vegItems = order.menuItems.filter((i) => i.foodType !== "non_veg");
  const nonVegItems = order.menuItems.filter((i) => i.foodType === "non_veg");
  const showSplit = order.foodType === "mixed" && vegItems.length > 0 && nonVegItems.length > 0;

  return (
    <div className="pb-24">
      <header className="border-b border-surface px-4 pb-4 pt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-ink/40">{order.orderNumber}</p>
        <h1 className="mt-0.5 font-display text-2xl">{order.customer.name}</h1>
        <p className="text-sm text-ink/60">{order.eventName}</p>
        <span
          className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
            order.status === "cancelled"
              ? "bg-tamarind/10 text-tamarind"
              : order.status === "completed"
                ? "bg-green/10 text-green"
                : "bg-marigold/10 text-marigold"
          }`}
        >
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </header>

      <Section title="Event details">
        <Row label="Date" value={new Date(order.eventDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} />
        {order.eventStartTime && (
          <Row
            label="Time"
            value={`${order.eventStartTime.slice(0, 5)}${order.eventEndTime ? ` – ${order.eventEndTime.slice(0, 5)}` : ""}`}
          />
        )}
        {order.venueName && <Row label="Venue" value={order.venueName} />}
        {order.venueAddress && <Row label="Address" value={order.venueAddress} />}
        <Row label="Guests" value={String(order.guestCount)} />
        {order.specialInstructions && <Row label="Notes" value={order.specialInstructions} />}
      </Section>

      <Section title="Menu">
        <p className="mb-2 text-sm text-ink/60">
          {order.packageNameSnapshot ?? "Custom menu"} · {formatPaise(order.pricePerPlatePaise)}/plate
        </p>
        {showSplit ? (
          <div className="flex flex-col gap-4">
            <MenuGroup title="Vegetarian" items={vegItems} />
            <MenuGroup title="Non-vegetarian" items={nonVegItems} />
          </div>
        ) : (
          <MenuGroup items={order.menuItems} />
        )}
      </Section>

      <Section title="Pricing">
        <Row label="Food amount" value={formatPaise(order.pricePerPlatePaise * order.guestCount)} />
        {order.serviceChargePaise > 0 && <Row label="Service charge" value={formatPaise(order.serviceChargePaise)} />}
        {order.transportChargePaise > 0 && <Row label="Transport" value={formatPaise(order.transportChargePaise)} />}
        {order.equipmentChargePaise > 0 && <Row label="Equipment" value={formatPaise(order.equipmentChargePaise)} />}
        {order.staffChargePaise > 0 && <Row label="Staff" value={formatPaise(order.staffChargePaise)} />}
        {order.otherChargesPaise > 0 && <Row label="Other" value={formatPaise(order.otherChargesPaise)} />}
        {order.discountPaise > 0 && <Row label="Discount" value={`− ${formatPaise(order.discountPaise)}`} />}
        {order.taxEnabled && (
          <Row label={`${order.taxName ?? "Tax"} (${order.taxPercentage}%)`} value={formatPaise(order.taxAmountPaise)} />
        )}
        <div className="mt-2 flex items-baseline justify-between border-t border-surface pt-2">
          <span className="font-medium">Total</span>
          <span className="font-display text-lg">{formatPaise(order.grandTotalPaise)}</span>
        </div>
      </Section>

      <Section title="Payments">
        <Row label="Total paid" value={formatPaise(order.totalPaidPaise)} />
        <Row label="Balance due" value={formatPaise(balancePaise)} emphasize={balancePaise > 0} />
        {status === "overdue" && <p className="mt-1 text-sm font-medium text-tamarind">Payment overdue</p>}
        <p className="mt-3 text-sm text-ink/50">
          Recording payments and generating a customer quotation PDF are coming in the next phase — for now
          this screen confirms the order saved correctly.
        </p>
      </Section>

      {order.termsSnapshot && (
        <Section title="Terms">
          <p className="whitespace-pre-line text-sm text-ink/70">{order.termsSnapshot}</p>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-surface px-4 py-4">
      <p className="mb-2 font-display text-lg">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-0.5 text-sm">
      <span className="text-ink/60">{label}</span>
      <span className={emphasize ? "font-medium text-tamarind" : ""}>{value}</span>
    </div>
  );
}

function MenuGroup({ title, items }: { title?: string; items: OrderDetail["menuItems"] }) {
  if (items.length === 0) return null;
  const byCategory = new Map<string, typeof items>();
  items.forEach((item) => {
    const key = item.categoryNameSnapshot;
    byCategory.set(key, [...(byCategory.get(key) ?? []), item]);
  });

  return (
    <div>
      {title && <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink/40">{title}</p>}
      {Array.from(byCategory.entries()).map(([category, categoryItems]) => (
        <div key={category} className="mb-1.5">
          <p className="text-xs text-ink/40">{category}</p>
          {categoryItems.map((item) => (
            <p key={item.id} className="text-sm">
              {item.menuItemNameSnapshot}
              {item.isExtra && <span className="ml-1.5 text-xs text-marigold">extra</span>}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}
