import { generateOrderPdfResponse } from "@/lib/pdf/generate";

// @react-pdf/renderer needs Node APIs internally (font/image handling) — not Edge-compatible.
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return generateOrderPdfResponse(params.id, "quotation");
}
