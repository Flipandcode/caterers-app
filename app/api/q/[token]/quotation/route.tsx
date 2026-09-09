import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { fetchPublicQuotation } from "@/lib/public-quotation-data";
import { PublicQuotationDocument } from "@/lib/pdf/PublicQuotationDocument";

export const runtime = "nodejs";

/**
 * No auth, no session — access is entirely by knowing the token. Doesn't
 * touch record_document_generation (that's a caterer action that assigns
 * numbers/versions); this just re-renders the current live data under
 * whatever number/version the caterer already assigned.
 */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const quotation = await fetchPublicQuotation(params.token);

  if (!quotation) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buffer = await renderToBuffer(<PublicQuotationDocument quotation={quotation} />);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="quotation-${quotation.quotationNumber ?? quotation.orderNumber}.pdf"`,
    },
  });
}
