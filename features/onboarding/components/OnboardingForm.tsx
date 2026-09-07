"use client";

import * as React from "react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createBusinessAction } from "@/server/actions/onboarding";

export function OnboardingForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createBusinessAction({
      name,
      phone,
      whatsapp: whatsapp || null,
      email: email || null,
    });

    // A successful call redirects server-side and never returns here.
    if (result && !result.success) {
      setError(result.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="mb-1 font-display text-2xl">Set up your business</h1>
        <p className="mb-6 text-sm text-ink/60">
          Just the basics for now — you can fill in branding, payment details, and terms later from
          Settings.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Business name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Shree Ganesh Caterers"
              className="h-12 text-base"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Phone number</label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91"
              className="h-12 text-base"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              WhatsApp number <span className="font-normal text-ink/50">(optional)</span>
            </label>
            <Input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+91"
              className="h-12 text-base"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Business email <span className="font-normal text-ink/50">(optional)</span>
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          {error && <p className="text-sm text-tamarind">{error}</p>}

          <Button
            type="submit"
            disabled={submitting}
            className="mt-2 h-12 bg-marigold text-base font-medium text-white hover:bg-marigold/90"
          >
            {submitting ? "Setting up…" : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
