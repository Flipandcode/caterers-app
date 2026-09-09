/**
 * Builds a wa.me click-to-chat URL. No API account needed — this just
 * pre-fills a message in the customer's own WhatsApp; they still tap send.
 * True automated sending needs the WhatsApp Business API (paid, requires
 * pre-approved message templates) — a separate, later integration.
 */
export function buildWhatsAppLink(phoneRaw: string, message: string): string {
  const digitsOnly = phoneRaw.replace(/\D/g, "");
  // Assume Indian numbers if no country code is present (10-digit local
  // number) — reasonable default given the target market, but a business
  // outside India entering a 10-digit local number would need this adjusted.
  const withCountryCode = digitsOnly.length === 10 ? `91${digitsOnly}` : digitsOnly;
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`;
}
