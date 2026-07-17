"use client";

import { useEffect } from "react";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // The server records diagnostics; the UI intentionally never exposes them.
  }, []);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6">
      <section className="max-w-md rounded-lg border border-slate-200 bg-white p-7 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-950">We could not load this workspace</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Please try again. If the issue continues, verify your workspace access and database connection.</p>
        <button type="button" onClick={reset} className="mt-5 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Try again</button>
      </section>
    </main>
  );
}
