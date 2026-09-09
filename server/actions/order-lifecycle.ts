"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ORDER_STATUSES = [
  "enquiry",
  "quotation_sent",
  "tentative",
  "confirmed",
  "preparation",
  "completed",
] as const; // deliberately excludes "cancelled" — that goes through cancelOrderAction

export interface LifecycleActionResult {
  success: boolean;
  error?: string;
}

const updateStatusSchema = z.object({
  businessId: z.string().uuid(),
  orderId: z.string().uuid(),
  newStatus: z.enum(ORDER_STATUSES),
});

export async function updateOrderStatusAction(
  input: z.infer<typeof updateStatusSchema>
): Promise<LifecycleActionResult> {
  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid status." };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc("update_order_status", {
    p_business_id: parsed.data.businessId,
    p_order_id: parsed.data.orderId,
    p_new_status: parsed.data.newStatus,
  });

  if (error) {
    return { success: false, error: "We couldn't update the status. Please try again." };
  }

  revalidatePath(`/orders/${parsed.data.orderId}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  return { success: true };
}

const cancelOrderSchema = z.object({
  businessId: z.string().uuid(),
  orderId: z.string().uuid(),
});

export async function cancelOrderAction(
  input: z.infer<typeof cancelOrderSchema>
): Promise<LifecycleActionResult> {
  const parsed = cancelOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc("cancel_order", {
    p_business_id: parsed.data.businessId,
    p_order_id: parsed.data.orderId,
  });

  if (error) {
    return { success: false, error: "We couldn't cancel this order. Please try again." };
  }

  revalidatePath(`/orders/${parsed.data.orderId}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/payments");
  return { success: true };
}

const toggleTaskSchema = z.object({
  taskId: z.string().uuid(),
  isCompleted: z.boolean(),
  orderId: z.string().uuid(), // only used to revalidate the right page
});

export async function togglePreparationTaskAction(
  input: z.infer<typeof toggleTaskSchema>
): Promise<LifecycleActionResult> {
  const parsed = toggleTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc("toggle_preparation_task", {
    p_task_id: parsed.data.taskId,
    p_is_completed: parsed.data.isCompleted,
  });

  if (error) {
    return { success: false, error: "We couldn't update this task. Please try again." };
  }

  revalidatePath(`/orders/${parsed.data.orderId}`);
  return { success: true };
}
