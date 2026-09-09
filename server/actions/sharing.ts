"use server";

import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const schema = z.object({
  businessId: z.string().uuid(),
  orderId: z.string().uuid(),
});

export interface ShareLinkResult {
  success: boolean;
  error?: string;
  token?: string;
}

/**
 * Ensures the order has a share token, generating one if this is the first
 * time it's being shared. Also triggers the initial quotation PDF
 * generation (assigning QT-2026-0001 etc.) if one hasn't been created yet,
 * so the very first "Share via WhatsApp" click just works without a
 * separate "generate PDF first" step.
 */
export async function getOrCreateShareLinkAction(
  input: z.infer<typeof schema>
): Promise<ShareLinkResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request." };

  const supabase = createServerSupabaseClient();

  const { data: order } = await supabase
    .from("orders")
    .select("quotation_number")
    .eq("id", parsed.data.orderId)
    .eq("business_id", parsed.data.businessId)
    .maybeSingle();

  if (!order) return { success: false, error: "Order not found." };

  if (!order.quotation_number) {
    const { error: genError } = await supabase.rpc("record_document_generation", {
      p_business_id: parsed.data.businessId,
      p_order_id: parsed.data.orderId,
      p_document_type: "quotation",
    });
    if (genError) return { success: false, error: "Couldn't prepare the quotation. Please try again." };
  }

  const { data: token, error } = await supabase.rpc("ensure_order_share_token", {
    p_business_id: parsed.data.businessId,
    p_order_id: parsed.data.orderId,
  });

  if (error || !token) return { success: false, error: "Couldn't create a share link. Please try again." };

  return { success: true, token: token as string };
}
