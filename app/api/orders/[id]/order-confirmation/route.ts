import { generateOrderPdfResponse } from "@/lib/pdf/generate";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return generateOrderPdfResponse(params.id, "order_confirmation");
}
