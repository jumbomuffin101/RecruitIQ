import Link from "next/link";
import { BriefcaseBusiness } from "lucide-react";
import { createJob } from "@/app/actions";
import { DatabaseNotice } from "@/components/DatabaseNotice";
import { EmptyState } from "@/components/EmptyState";
import { JobRubricForm } from "@/components/JobRubricForm";
import { JobCard } from "@/components/JobCard";
import { PageHeader } from "@/components/PageHeader";
import { getJobs } from "@/lib/data";
import { getCurrentUserContext } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  try {
    const { deleted } = await searchParams;
    const [jobs, context] = await Promise.all([getJobs(), getCurrentUserContext()]);
    const canManage = context.role !== "INTERVIEWER";

    return (
      <>
        <PageHeader
          eyebrow="Role planning"
          title="Jobs"
          description="Create roles, capture requirements, and connect candidates to the right hiring funnel."
        />
        {deleted === "job" ? (
          <div className="mb-5 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
            Job deleted successfully.
          </div>
        ) : null}
        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          {canManage ? <JobRubricForm mode="create" action={createJob} /> : <div className="surface rounded-lg p-5 text-sm leading-6 text-slate-600">Interviewers can review hiring context and submit scorecard feedback, but cannot create or edit jobs.</div>}

          <div>
            {jobs.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={BriefcaseBusiness}
                title="No jobs yet"
                description="Create your first role to start ranking candidates against real requirements."
                action={
                  <Link href="/quick-start" className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">
                    Open Quick Start
                  </Link>
                }
              />
            )}
          </div>
        </section>
      </>
    );
  } catch (error) {
    return <DatabaseNotice message={error instanceof Error ? error.message : "Connect PostgreSQL to manage jobs."} />;
  }
}
