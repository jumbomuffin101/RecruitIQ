import { CreateOrganization, OrganizationSwitcher } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthenticationRequiredError, requireClerkUser } from "@/lib/auth-context";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  try {
    await requireClerkUser();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/clerk/sign-in");
    logger.error("onboarding_user_sync_failed", {
      reason: error instanceof Error ? error.name : "unknown",
    });
    throw error;
  }

  const { userId, orgId } = await auth();
  logger.info("clerk_onboarding_context", {
    clerkUserId: userId ?? undefined,
    clerkOrganizationId: orgId ?? undefined,
    reason: orgId ? "organization_active_redirect_dashboard" : "organization_missing_render_onboarding",
  });
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
