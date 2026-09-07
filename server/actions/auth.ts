"use server";

import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const signUpSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name").max(120),
  phone: z.string().trim().min(6, "Enter a valid phone number").max(20),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
});

const updatePasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export interface AuthActionResult {
  success: boolean;
  error?: string;
  /** true when Supabase requires email confirmation before a session exists */
  needsEmailConfirmation?: boolean;
}

export async function signUpAction(input: z.infer<typeof signUpSchema>): Promise<AuthActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, phone: parsed.data.phone },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // If email confirmation is required, Supabase returns a user but no session.
  if (data.user && !data.session) {
    return { success: true, needsEmailConfirmation: true };
  }

  return { success: true };
}

export async function signInAction(input: z.infer<typeof signInSchema>): Promise<AuthActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, error: "That email or password doesn't look right." };
  }

  return { success: true };
}

export async function signOutAction(): Promise<void> {
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();
}

export async function requestPasswordResetAction(
  input: z.infer<typeof forgotPasswordSchema>
): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Enter a valid email." };
  }

  const supabase = createServerSupabaseClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });

  // Always report success to the caller regardless of whether the email
  // exists — don't let this endpoint be used to enumerate registered users.
  if (error) {
    // eslint-disable-next-line no-console
    console.error("resetPasswordForEmail error:", error.message);
  }

  return { success: true };
}

/** Called from /reset-password, where the user already has a recovery session
 *  established via the emailed link (see app/auth/callback/route.ts). */
export async function updatePasswordAction(
  input: z.infer<typeof updatePasswordSchema>
): Promise<AuthActionResult> {
  const parsed = updatePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Please check your password." };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { success: false, error: "We couldn't update your password. The reset link may have expired." };
  }

  return { success: true };
}
