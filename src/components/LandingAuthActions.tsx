"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";

export function LandingAuthActions() {
  return (
    <div className="flex items-center gap-2">
      <SignInButton
        mode="redirect"
        forceRedirectUrl="/dashboard"
        fallbackRedirectUrl="/dashboard"
      >
        <button
          type="button"
          className="inline-flex rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Sign in
        </button>
      </SignInButton>
      <SignUpButton
        mode="redirect"
        forceRedirectUrl="/onboarding"
        fallbackRedirectUrl="/onboarding"
      >
        <button
          type="button"
          className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          Sign up
        </button>
      </SignUpButton>
    </div>
  );
}
