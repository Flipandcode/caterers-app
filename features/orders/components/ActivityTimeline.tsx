import { ActivityLogEntry } from "@/types/domain";
import { formatPaise } from "@/lib/money";

const ACTION_LABELS: Record<string, string> = {
  order_created: "Order created",
  status_changed: "Status changed",
  order_cancelled: "Order cancelled",
  payment_recorded: "Payment recorded",
  quotation_generated: "Document generated",
};

function describeDetails(entry: ActivityLogEntry): string | null {
  const d = entry.details as any;
  if (!d) return null;

  switch (entry.action) {
    case "status_changed":
      return `${formatLabel(d.from)} → ${formatLabel(d.to)}`;
    case "order_cancelled":
      return d.from ? `Was: ${formatLabel(d.from)}` : null;
    case "payment_recorded":
      return `${formatPaise(d.amount_paise)} · ${formatLabel(d.payment_type)}`;
    case "quotation_generated":
      return `${formatLabel(d.document_type)} · v${d.version}`;
    default:
      return null;
  }
}

function formatLabel(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function ActivityTimeline({ entries }: { entries: ActivityLogEntry[] }) {
  if (entries.length === 0) return <p className="text-sm text-ink/50">No activity yet.</p>;

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry) => (
        <div key={entry.id} className="flex gap-3">
          <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-marigold" />
          <div>
            <p className="text-sm">{ACTION_LABELS[entry.action] ?? formatLabel(entry.action)}</p>
            {describeDetails(entry) && <p className="text-xs text-ink/50">{describeDetails(entry)}</p>}
            <p className="text-xs text-ink/40">
              {new Date(entry.createdAt).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
