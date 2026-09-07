"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signUpAction } from "@/server/actions/auth";

export function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await signUpAction({ fullName, phone, email, password });

    if (!result.success) {
      setError(result.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    if (result.needsEmailConfirmation) {
      setNeedsConfirmation(true);
      setSubmitting(false);
      return;
    }

    router.push("/onboarding");
    router.refresh();
  }

  if (needsConfirmation) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="font-display text-xl">Check your email</h1>
        <p className="text-sm text-ink/70">
          We sent a confirmation link to <span className="font-medium">{email}</span>. Open it on this
          device to finish setting up your account.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h1 className="font-display text-xl">Create your account</h1>

      <div>
        <label className="mb-1 block text-sm font-medium">Your name</label>
        <Input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
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

      <div>
        <label className="mb-1 block text-sm font-medium">Password</label>
        <Input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-12 text-base"
          required
          minLength={8}
        />
        <p className="mt-1 text-xs text-ink/50">At least 8 characters.</p>
      </div>

      {error && <p className="text-sm text-tamarind">{error}</p>}

      <Button
        type="submit"
        disabled={submitting}
        className="h-12 bg-marigold text-base font-medium text-white hover:bg-marigold/90"
      >
        {submitting ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-ink/60">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-marigold">
          Log in
        </Link>
      </p>
    </form>
  );
}
