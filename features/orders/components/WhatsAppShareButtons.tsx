"use client";

import { useState } from "react";
import { formatPaise } from "@/lib/money";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { getOrCreateShareLinkAction } from "@/server/actions/sharing";

interface WhatsAppShareButtonsProps {
  businessId: string;
  orderId: string;
  businessDisplayName: string;
  customerName: string;
  customerPhone: string | null;
  eventName: string;
  eventDateISO: string;
  guestCount: number;
  grandTotalPaise: number;
  totalPaidPaise: number;
}

export function WhatsAppShareButtons({
  businessId,
  orderId,
  businessDisplayName,
  customerName,
  customerPhone,
  eventName,
  eventDateISO,
  guestCount,
  grandTotalPaise,
  totalPaidPaise,
}: WhatsAppShareButtonsProps) {
  const [loading, setLoading] = useState<"quotation" | "reminder" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const balancePaise = grandTotalPaise - totalPaidPaise;
  const formattedDate = new Date(eventDateISO + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  async function share(kind: "quotation" | "reminder") {
    if (!customerPhone) {
      setError("Add a phone number for this customer first.");
      return;
    }
    setLoading(kind);
    setError(null);

    const result = await getOrCreateShareLinkAction({ businessId, orderId });
    if (!result.success || !result.token) {
      setError(result.error ?? "Something went wrong.");
      setLoading(null);
      return;
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const link = `${siteUrl}/q/${result.token}`;

    const message =
      kind === "quotation"
        ? `Hi ${customerName}, here's your catering quotation from ${businessDisplayName} for "${eventName}" on ${formattedDate} (${guestCount} guests). Total: ${formatPaise(grandTotalPaise)}. View details and download the PDF here: ${link}`
        : `Hi ${customerName}, this is a reminder that ${formatPaise(balancePaise)} is pending for your "${eventName}" event on ${formattedDate}, from ${businessDisplayName}. View your quotation and payment details here: ${link}`;

    window.open(buildWhatsAppLink(customerPhone, message), "_blank");
    setLoading(null);
  }

  return (
    <div>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => share("quotation")}
          disabled={loading !== null}
          className="rounded-lg border border-surface px-4 py-2.5 text-center text-sm font-medium"
        >
          {loading === "quotation" ? "Preparing…" : "Share Quotation via WhatsApp"}
        </button>
        {balancePaise > 0 && (
          <button
            onClick={() => share("reminder")}
            disabled={loading !== null}
            className="rounded-lg border border-tamarind/30 bg-tamarind/5 px-4 py-2.5 text-center text-sm font-medium text-tamarind"
          >
            {loading === "reminder" ? "Preparing…" : "Send Payment Reminder via WhatsApp"}
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-tamarind">{error}</p>}
      <p className="mt-2 text-xs text-ink/40">
        Opens WhatsApp with a message and link pre-filled — you'll still tap send. The link lets the
        customer view the quotation and download the PDF without an account.
      </p>
    </div>
  );
}
