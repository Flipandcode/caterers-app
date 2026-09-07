import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <p className="mb-8 text-center font-display text-2xl">Caterers App</p>
        {children}
      </div>
    </div>
  );
}
