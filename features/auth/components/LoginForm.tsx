"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signInAction } from "@/server/actions/auth";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await signInAction({ email, password });

    if (!result.success) {
      setError(result.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    router.push("/menus");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h1 className="font-display text-xl">Log in</h1>

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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-12 text-base"
          required
        />
      </div>

      <div className="text-right">
        <Link href="/forgot-password" className="text-sm text-marigold">
          Forgot password?
        </Link>
      </div>

      {error && <p className="text-sm text-tamarind">{error}</p>}

      <Button
        type="submit"
        disabled={submitting}
        className="h-12 bg-marigold text-base font-medium text-white shadow-marigold hover:bg-marigold/90"
      >
        {submitting ? "Logging in…" : "Log in"}
      </Button>

      <p className="text-center text-sm text-ink/60">
        New here?{" "}
        <Link href="/signup" className="font-medium text-marigold">
          Create an account
        </Link>
      </p>
    </form>
  );
}
