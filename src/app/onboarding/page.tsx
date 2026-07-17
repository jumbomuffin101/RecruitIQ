import { redirect } from "next/navigation";
import { createOrganization } from "@/app/onboarding/actions";
import { requireAuthenticatedUser } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await requireAuthenticatedUser();
  if (user.organizationId) redirect("/dashboard");
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-7 shadow-xl shadow-slate-950/5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Workspace setup</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Create your organization</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">RecruitIQ will keep your jobs, candidates, feedback, and hiring records isolated within this workspace.</p>
        <form action={createOrganization} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-slate-700">Organization name<input name="organizationName" required minLength={2} maxLength={80} placeholder="Northstar Labs" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /></label>
          <button className="w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Create workspace</button>
        </form>
      </section>
    </main>
  );
}
