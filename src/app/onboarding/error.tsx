"use client";

export default function OnboardingError({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-7 shadow-xl shadow-slate-950/5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">Workspace setup</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-950">We could not prepare your workspace</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your account is signed in, but RecruitIQ could not finish workspace setup. Please retry. If this continues, contact your workspace administrator.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Retry setup
        </button>
      </section>
    </main>
  );
}
