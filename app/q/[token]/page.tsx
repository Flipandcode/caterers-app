import { notFound } from "next/navigation";
import { fetchPublicQuotation } from "@/lib/public-quotation-data";
import { formatPaise } from "@/lib/money";

export default async function PublicQuotationPage({ params }: { params: { token: string } }) {
  const quotation = await fetchPublicQuotation(params.token);
  if (!quotation) notFound();

  const balancePaise = quotation.grandTotalPaise - quotation.totalPaidPaise;
  const businessLabel = quotation.businessDisplayName ?? quotation.businessName;
  const vegItems = quotation.menuItems.filter((i) => i.foodType !== "non_veg");
  const nonVegItems = quotation.menuItems.filter((i) => i.foodType === "non_veg");
  const showSplit = quotation.foodType === "mixed" && vegItems.length > 0 && nonVegItems.length > 0;

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-bg px-5 py-8">
      <div className="flex items-center gap-3">
        {quotation.businessLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL
          <img src={quotation.businessLogoUrl} alt={businessLabel} className="h-12 w-12 rounded-full border border-surface object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-marigold font-display text-xl font-bold text-white">
            {businessLabel.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-display text-lg">{businessLabel}</p>
          {quotation.businessPhone && <p className="text-xs text-ink/50">{quotation.businessPhone}</p>}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-surface p-4">
        <p className="text-xs uppercase tracking-wide text-ink/40">{quotation.quotationNumber ?? quotation.orderNumber}</p>
        <p className="mt-1 font-display text-xl">{quotation.eventName}</p>
        <p className="text-sm text-ink/60">Hi {quotation.customerName},</p>

        <div className="mt-3 flex flex-col gap-1 text-sm">
          <Row label="Date" value={new Date(quotation.eventDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} />
          {quotation.eventStartTime && <Row label="Time" value={quotation.eventStartTime.slice(0, 5)} />}
          {quotation.venueName && <Row label="Venue" value={quotation.venueName} />}
          <Row label="Guests" value={String(quotation.guestCount)} />
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-surface p-4">
        <p className="mb-2 text-sm font-medium">
          {quotation.packageNameSnapshot ?? "Custom menu"} — {formatPaise(quotation.pricePerPlatePaise)}/plate
        </p>
        {showSplit ? (
          <div className="flex flex-col gap-3">
            <MenuList title="Vegetarian" items={vegItems} />
            <MenuList title="Non-vegetarian" items={nonVegItems} />
          </div>
        ) : (
          <MenuList items={quotation.menuItems} />
        )}
      </div>

      <div className="mt-4 rounded-lg border border-surface p-4">
        <Row label="Food amount" value={formatPaise(quotation.pricePerPlatePaise * quotation.guestCount)} />
        {quotation.serviceChargePaise > 0 && <Row label="Service charge" value={formatPaise(quotation.serviceChargePaise)} />}
        {quotation.transportChargePaise > 0 && <Row label="Transport" value={formatPaise(quotation.transportChargePaise)} />}
        {quotation.equipmentChargePaise > 0 && <Row label="Equipment" value={formatPaise(quotation.equipmentChargePaise)} />}
        {quotation.staffChargePaise > 0 && <Row label="Staff" value={formatPaise(quotation.staffChargePaise)} />}
        {quotation.otherChargesPaise > 0 && <Row label="Other" value={formatPaise(quotation.otherChargesPaise)} />}
        {quotation.discountPaise > 0 && <Row label="Discount" value={`− ${formatPaise(quotation.discountPaise)}`} />}
        {quotation.taxEnabled && (
          <Row label={`${quotation.taxName ?? "Tax"} (${quotation.taxPercentage}%)`} value={formatPaise(quotation.taxAmountPaise)} />
        )}
        <div className="mt-1 border-t border-surface pt-1">
          <Row label="Total" value={formatPaise(quotation.grandTotalPaise)} bold />
        </div>
        <Row label="Paid" value={formatPaise(quotation.totalPaidPaise)} />
        <Row label="Balance due" value={formatPaise(balancePaise)} emphasize={balancePaise > 0} />
      </div>

      {(quotation.upiId || quotation.bankName) && (
        <div className="mt-4 rounded-lg border border-surface p-4">
          <p className="mb-2 text-sm font-medium">Payment details</p>
          {quotation.upiId && <Row label="UPI" value={quotation.upiId} />}
          {quotation.bankName && <Row label="Bank" value={quotation.bankName} />}
          {quotation.accountName && <Row label="Account name" value={quotation.accountName} />}
          {quotation.accountNumber && <Row label="Account no." value={quotation.accountNumber} />}
          {quotation.ifsc && <Row label="IFSC" value={quotation.ifsc} />}
        </div>
      )}

      <a
        href={`/api/q/${params.token}/quotation`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 block rounded-lg bg-marigold px-4 py-3 text-center text-sm font-medium text-white"
      >
        Download PDF
      </a>

      {quotation.termsSnapshot && (
        <div className="mt-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink/40">Terms & Conditions</p>
          <p className="whitespace-pre-line text-xs text-ink/60">{quotation.termsSnapshot}</p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold, emphasize }: { label: string; value: string; bold?: boolean; emphasize?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-0.5">
      <span className="text-ink/60">{label}</span>
      <span className={bold ? "font-display text-lg" : emphasize ? "font-medium text-tamarind" : ""}>{value}</span>
    </div>
  );
}

function MenuList({ title, items }: { title?: string; items: { menuItemNameSnapshot: string; categoryNameSnapshot: string }[] }) {
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
        <div key={category} className="mb-1">
          <p className="text-xs text-ink/40">{category}</p>
          {categoryItems.map((item, i) => (
            <p key={i} className="text-sm">
              {item.menuItemNameSnapshot}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}
