"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requestPasswordResetAction } from "@/server/actions/auth";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await requestPasswordResetAction({ email });
    setSubmitting(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="font-display text-xl">Check your email</h1>
        <p className="text-sm text-ink/70">
          If an account exists for <span className="font-medium">{email}</span>, we've sent a link to
          reset your password.
        </p>
        <Link href="/login" className="text-sm font-medium text-marigold">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h1 className="font-display text-xl">Reset your password</h1>
      <p className="text-sm text-ink/60">Enter your email and we'll send you a reset link.</p>

      <div>
        <label className="mb-1 block text-sm font-medium">Email</label>
        <Input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 text-base"
          required
        />
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="h-12 bg-marigold text-base font-medium text-white hover:bg-marigold/90"
      >
        {submitting ? "Sending…" : "Send reset link"}
      </Button>

      <p className="text-center text-sm text-ink/60">
        <Link href="/login" className="font-medium text-marigold">
          Back to login
        </Link>
      </p>
    </form>
  );
}
