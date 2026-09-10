"use client";

import * as React from "react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateBrandingAction } from "@/server/actions/branding";

interface BrandingFormProps {
  businessId: string;
  currentDisplayName: string;
  currentLogoUrl: string | null;
  legalName: string;
}

export function BrandingForm({ businessId, currentDisplayName, currentLogoUrl, legalName }: BrandingFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const formData = new FormData();
    formData.set("businessId", businessId);
    formData.set("displayName", displayName);
    if (selectedFile) formData.set("logo", selectedFile);

    const result = await updateBrandingAction(formData);

    if (result.success) {
      setSaved(true);
      setSelectedFile(null);
      if (result.logoUrl) setPreviewUrl(result.logoUrl);
      router.refresh();
    } else {
      setError(result.error ?? "Something went wrong.");
    }
    setSaving(false);
  }

  const initial = (displayName || legalName).trim().charAt(0).toUpperCase() || "?";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 pb-24 pt-5">
      <h1 className="font-display text-2xl">Branding</h1>

      <div className="flex items-center gap-4">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- preview of a user-selected file / Supabase Storage URL
          <img src={previewUrl} alt="Logo preview" className="h-16 w-16 rounded-full border border-surface object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-marigold font-display text-2xl font-bold text-white">
            {initial}
          </div>
        )}
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-surface px-4 py-2 text-sm font-medium"
          >
            {previewUrl ? "Change logo" : "Upload logo"}
          </button>
          <p className="mt-1 text-xs text-ink/50">PNG, JPEG, or WebP. Max 2MB.</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Display name</label>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={legalName}
          className="h-12 text-base"
        />
        <p className="mt-1 text-xs text-ink/50">
          Shown throughout the app and on customer quotations. Leave blank to use "{legalName}".
        </p>
      </div>

      {error && <p className="text-sm text-tamarind">{error}</p>}
      {saved && !error && <p className="text-sm text-green">Saved.</p>}

      <Button
        type="submit"
        disabled={saving}
        className="h-12 bg-marigold text-base font-medium text-white shadow-marigold hover:bg-marigold/90"
      >
        {saving ? "Saving…" : "Save branding"}
      </Button>
    </form>
  );
}
