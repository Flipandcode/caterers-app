"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const onboardingSchema = z.object({
  name: z.string().trim().min(1, "Give your business a name").max(120),
  phone: z.string().trim().min(6, "Enter a valid phone number").max(20),
  whatsapp: z.string().trim().max(20).nullable(),
  email: z.string().trim().email("Enter a valid email").nullable().or(z.literal("")),
});

export interface OnboardingResult {
  success: boolean;
  error?: string;
}

/**
 * Minimal MVP onboarding: name + phone are enough to create a working
 * business and start using the app. The full 5-step wizard from the spec
 * (address, branding, payment details, default terms) belongs in Settings,
 * completable any time after — not a blocker to first use.
 */
export async function createBusinessAction(
  input: z.infer<typeof onboardingSchema>
): Promise<OnboardingResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("create_business_with_owner", {
    p_name: parsed.data.name,
    p_phone: parsed.data.phone,
    p_whatsapp: parsed.data.whatsapp || null,
    p_email: parsed.data.email || null,
  });

  if (error) {
    return { success: false, error: "We couldn't set up your business. Please try again." };
  }

  redirect("/menus");
}
