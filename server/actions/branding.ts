"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export interface BrandingResult {
  success: boolean;
  error?: string;
  logoUrl?: string;
}

const displayNameSchema = z.string().trim().max(120);

/**
 * Handles both the display name and an optional logo file in one submit.
 * Only the business owner can change these — matches the existing
 * businesses table RLS policy (owner-only update), so a manager can't end
 * up in a half-succeeded state where the file uploads but the business
 * record update is rejected.
 */
export async function updateBrandingAction(formData: FormData): Promise<BrandingResult> {
  const businessId = formData.get("businessId");
  const displayNameRaw = formData.get("displayName");
  const file = formData.get("logo");

  if (typeof businessId !== "string" || !z.string().uuid().safeParse(businessId).success) {
    return { success: false, error: "Invalid request." };
  }

  const displayNameParsed = displayNameSchema.safeParse(displayNameRaw ?? "");
  if (!displayNameParsed.success) {
    return { success: false, error: "Display name is too long." };
  }

  const supabase = createServerSupabaseClient();
  let logoUrl: string | undefined;

  if (file instanceof File && file.size > 0) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { success: false, error: "Logo must be a PNG, JPEG, or WebP image." };
    }
    if (file.size > MAX_LOGO_BYTES) {
      return { success: false, error: "Logo must be under 2MB." };
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${businessId}/logo.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("business-logos")
      .upload(path, bytes, { contentType: file.type, upsert: true });

    if (uploadError) {
      return { success: false, error: "We couldn't upload the logo. Please try again." };
    }

    const { data: publicUrlData } = supabase.storage.from("business-logos").getPublicUrl(path);
    // Cache-bust so the new logo shows immediately instead of a stale
    // browser-cached image at the same URL.
    logoUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;
  }

  const updatePayload: Record<string, string | null> = {
    display_name: displayNameParsed.data || null,
  };
  if (logoUrl) updatePayload.logo_url = logoUrl;

  const { error: updateError } = await supabase
    .from("businesses")
    .update(updatePayload)
    .eq("id", businessId);

  if (updateError) {
    return { success: false, error: "We couldn't save your branding. Please try again." };
  }

  // Route groups like (app) have no URL of their own — revalidating via any
  // real page path that uses that layout invalidates the whole shared layout,
  // which is where the branded header actually lives.
  revalidatePath("/dashboard", "layout");

  return { success: true, logoUrl };
}
