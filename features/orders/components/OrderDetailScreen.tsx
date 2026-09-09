import type { ReactNode } from "react";
import { OrderDetail } from "@/lib/order-detail-data";
import { formatPaise } from "@/lib/money";
import { OrderPaymentsPanel } from "./OrderPaymentsPanel";
import { OrderStatusControl } from "./OrderStatusControl";
import { PreparationChecklist } from "./PreparationChecklist";
import { ActivityTimeline } from "./ActivityTimeline";

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

      <Section title="Status">
        <OrderStatusControl
          businessId={order.businessId}
          orderId={order.id}
          currentStatus={order.status}
          isCancelled={order.isCancelled}
        />
      </Section>

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
        <OrderPaymentsPanel
          businessId={order.businessId}
          orderId={order.id}
          grandTotalPaise={order.grandTotalPaise}
          totalPaidPaise={order.totalPaidPaise}
          eventDateISO={order.eventDate}
          payments={order.payments}
        />
      </Section>

      <Section title="Documents">
        <div className="flex flex-col gap-2">
          <a
            href={`/api/orders/${order.id}/quotation`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-surface px-4 py-2.5 text-center text-sm font-medium"
          >
            Quotation PDF
          </a>
          <a
            href={`/api/orders/${order.id}/order-confirmation`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-surface px-4 py-2.5 text-center text-sm font-medium"
          >
            Order Confirmation PDF
          </a>
          <a
            href={`/api/orders/${order.id}/kitchen-sheet`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-surface px-4 py-2.5 text-center text-sm font-medium"
          >
            Kitchen Sheet (no pricing)
          </a>
        </div>
        <p className="mt-2 text-xs text-ink/40">
          Opens in a new tab — use your browser's share or download option from there. Each generation is
          tracked as a new version; older versions aren't deleted.
        </p>
      </Section>

      {order.termsSnapshot && (
        <Section title="Terms">
          <p className="whitespace-pre-line text-sm text-ink/70">{order.termsSnapshot}</p>
        </Section>
      )}

      <Section title="Preparation">
        <PreparationChecklist orderId={order.id} tasks={order.preparationTasks} />
      </Section>

      <Section title="Activity">
        <ActivityTimeline entries={order.activityLog} />
      </Section>
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
