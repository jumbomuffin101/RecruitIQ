import Link from "next/link";
import { Users } from "lucide-react";
import { CandidateCard } from "@/components/CandidateCard";
import { CandidateIntakeForm } from "@/components/CandidateIntakeForm";
import { DatabaseNotice } from "@/components/DatabaseNotice";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { getCandidates, getJobs } from "@/lib/data";
import { getCurrentUserContext } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  try {
    const { deleted } = await searchParams;
    const [candidates, jobs, context] = await Promise.all([getCandidates(), getJobs(), getCurrentUserContext()]);
    const canManage = context.role !== "INTERVIEWER";

    return (
      <>
        <PageHeader
          eyebrow="Talent pool"
          title="Candidates"
          description="Add applicants, store resume context, and generate structured AI analysis for each profile."
        />
        {deleted === "candidate" ? (
          <div className="mb-5 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
            Candidate deleted successfully.
          </div>
        ) : null}
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          {canManage ? <CandidateIntakeForm jobs={jobs.map((job) => ({ id: job.id, title: job.title, department: job.department }))} /> : <div className="surface rounded-lg p-5 text-sm leading-6 text-slate-600">Interviewers can review candidate context and submit scorecard feedback, but cannot create candidates or applications.</div>}

          <div>
            {candidates.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {candidates.map((candidate) => (
                  <CandidateCard key={candidate.id} candidate={candidate} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="Add your first candidate"
                description="Add a candidate with resume text to unlock scoring, interview prep, comparison, and pipeline tracking."
                action={
                  <Link href="/jobs" className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">
                    Create a job first
                  </Link>
                }
              />
            )}
          </div>
        </section>
      </>
    );
  } catch (error) {
    return <DatabaseNotice message={error instanceof Error ? error.message : "Connect PostgreSQL to manage candidates."} />;
  }
}
