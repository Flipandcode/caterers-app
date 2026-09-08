import type { ReactElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getActiveBusinessId } from "@/lib/business-context";
import { fetchOrderDetail } from "@/lib/order-detail-data";
import { fetchBusinessPdfData } from "@/lib/pdf/business-data";
import { QuotationDocument } from "@/lib/pdf/QuotationDocument";
import { KitchenSheetDocument } from "@/lib/pdf/KitchenSheetDocument";

export type DocKind = "quotation" | "order_confirmation" | "kitchen_sheet";

/**
 * Shared by all three PDF route handlers. Handles auth, fetches the order,
 * assigns/reuses the quotation number + version via record_document_generation
 * (see migration 0010), renders the right template, and returns it as a
 * downloadable response.
 */
export async function generateOrderPdfResponse(orderId: string, kind: DocKind): Promise<NextResponse> {
  const businessId = await getActiveBusinessId();
  const supabase = createServerSupabaseClient();

  let order;
  try {
    order = await fetchOrderDetail(businessId, orderId);
  } catch (err: any) {
    // fetchOrderDetail calls notFound(), which throws a digest-tagged error
    // rather than returning null — translate that into a plain 404 here
    // since there's no React tree in a route handler to catch it normally.
    if (err?.digest === "NEXT_NOT_FOUND") {
      return new NextResponse("Order not found", { status: 404 });
    }
    throw err;
  }

  const { data: docMeta, error: docError } = await supabase.rpc("record_document_generation", {
    p_business_id: businessId,
    p_order_id: orderId,
    p_document_type: kind,
  });

  if (docError) {
    return new NextResponse("Could not generate document", { status: 500 });
  }

  const meta = docMeta?.[0] ?? { quotation_number: null, version: 1 };
  const quotationNumber = meta.quotation_number ?? order.orderNumber;
  const version = meta.version ?? 1;

  let pdfElement: ReactElement;
  let filename: string;

  if (kind === "kitchen_sheet") {
    pdfElement = <KitchenSheetDocument order={order} />;
    filename = `kitchen-sheet-${order.orderNumber}.pdf`;
  } else {
    const business = await fetchBusinessPdfData(businessId);
    const documentTitle = kind === "quotation" ? "CATERING QUOTATION" : "CATERING ORDER CONFIRMATION";
    pdfElement = (
      <QuotationDocument
        order={order}
        business={business}
        quotationNumber={quotationNumber}
        version={version}
        documentTitle={documentTitle}
      />
    );
    filename = `${kind}-${quotationNumber}.pdf`;
  }

  const buffer = await renderToBuffer(pdfElement);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
