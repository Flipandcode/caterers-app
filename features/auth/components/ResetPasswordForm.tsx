"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updatePasswordAction } from "@/server/actions/auth";

/**
 * Reached only after app/auth/callback/route.ts has already exchanged the
 * emailed reset code for a session — so this page just needs the new
 * password, not the email or a token.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await updatePasswordAction({ password });

    if (!result.success) {
      setError(result.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    router.push("/login");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h1 className="font-display text-xl">Set a new password</h1>

      <div>
        <label className="mb-1 block text-sm font-medium">New password</label>
        <Input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-12 text-base"
          required
          minLength={8}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Confirm password</label>
        <Input
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="h-12 text-base"
          required
          minLength={8}
        />
      </div>

      {error && <p className="text-sm text-tamarind">{error}</p>}

      <Button
        type="submit"
        disabled={submitting}
        className="h-12 bg-marigold text-base font-medium text-white hover:bg-marigold/90"
      >
        {submitting ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
