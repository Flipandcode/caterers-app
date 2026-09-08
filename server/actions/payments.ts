"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const recordPaymentSchema = z.object({
  businessId: z.string().uuid(),
  orderId: z.string().uuid(),
  amountPaise: z.number().int().positive().max(1_000_000_000), // sanity ceiling: ₹1 crore
  paymentType: z.enum(["advance", "part_payment", "final_payment", "refund", "adjustment"]),
  paymentMethod: z.enum(["cash", "upi", "bank_transfer", "card", "cheque", "other"]),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  referenceNumber: z.string().trim().max(80).nullable(),
  notes: z.string().trim().max(500).nullable(),
});

export interface RecordPaymentResult {
  success: boolean;
  error?: string;
}

export async function recordPaymentAction(
  input: z.infer<typeof recordPaymentSchema>
): Promise<RecordPaymentResult> {
  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Please check the payment details." };
  }

  const supabase = createServerSupabaseClient();

  const { error } = await supabase.rpc("record_payment", {
    p_business_id: parsed.data.businessId,
    p_order_id: parsed.data.orderId,
    p_amount_paise: parsed.data.amountPaise,
    p_payment_type: parsed.data.paymentType,
    p_payment_method: parsed.data.paymentMethod,
    p_payment_date: parsed.data.paymentDate,
    p_reference_number: parsed.data.referenceNumber,
    p_notes: parsed.data.notes,
  });

  if (error) {
    return { success: false, error: "We couldn't record this payment. Please try again." };
  }

  revalidatePath(`/orders/${parsed.data.orderId}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/payments");

  return { success: true };
}
