import { CreateOrganization, OrganizationSwitcher } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  await requireAuthenticatedUser();
  const { orgId } = await auth();
  if (orgId) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-7 shadow-xl shadow-slate-950/5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Workspace setup</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Choose your organization</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">RecruitIQ uses Clerk Organizations as workspaces. Create one or select an existing organization to continue.</p>
        <div className="mt-6"><CreateOrganization afterCreateOrganizationUrl="/dashboard" /></div>
        <div className="mt-6 border-t border-slate-200 pt-5"><p className="mb-3 text-sm font-semibold text-slate-700">Already belong to a workspace?</p><OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/dashboard" /></div>
      </section>
    </main>
  );
}
