"use client";

import Link from "next/link";
import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";

type LandingAuthActionsProps = {
  variant: "header" | "hero";
};

const styles = {
  header: {
    primary: "inline-flex h-11 items-center justify-center rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800",
    secondary: "inline-flex h-11 items-center justify-center rounded-lg px-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950",
    signedIn: "inline-flex h-11 items-center justify-center rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800",
  },
  hero: {
    primary: "inline-flex h-12 items-center justify-center rounded-lg bg-emerald-800 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800",
    secondary: "inline-flex h-12 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950",
    signedIn: "inline-flex h-12 items-center justify-center rounded-lg bg-emerald-800 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800",
  },
};

export function LandingAuthActions({ variant }: LandingAuthActionsProps) {
  const classNames = styles[variant];
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return <div aria-label="Loading account controls" className="h-11 w-28" />;

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className={classNames.signedIn}>Go to dashboard</Link>
        {variant === "header" ? <UserButton /> : null}
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        <SignUpButton mode="redirect" forceRedirectUrl="/onboarding" fallbackRedirectUrl="/onboarding">
          <button type="button" className={classNames.primary}>Get started free</button>
        </SignUpButton>
        <Link href="#workflow" className={classNames.secondary}>See how it works</Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <SignInButton mode="redirect">
        <button type="button" className={classNames.secondary}>Sign in</button>
      </SignInButton>
      <SignUpButton mode="redirect" forceRedirectUrl="/onboarding" fallbackRedirectUrl="/onboarding">
        <button type="button" className={classNames.primary}>Sign up free</button>
      </SignUpButton>
    </div>
  );
}
