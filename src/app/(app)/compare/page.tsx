import Link from "next/link";
import { ArrowRight, BrainCircuit, Scale, Users } from "lucide-react";
import { CandidateAvatar } from "@/components/CandidateAvatar";
import { DatabaseNotice } from "@/components/DatabaseNotice";
import { FitScoreBar } from "@/components/FitScoreBar";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { getCompareData } from "@/lib/data";

export const dynamic = "force-dynamic";

const recommendationCardStyles = {
  advance: "bg-blue-50 text-blue-950",
  review: "bg-amber-50 text-amber-950",
  reject: "bg-red-50 text-red-950",
  neutral: "bg-slate-50 text-slate-950",
};

const recommendationTextStyles = {
  advance: "text-blue-900",
  review: "text-amber-900",
  reject: "text-red-900",
  neutral: "text-slate-700",
};

const recommendationIconStyles = {
  advance: "text-blue-700",
  review: "text-amber-700",
  reject: "text-red-700",
  neutral: "text-slate-600",
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const { jobId } = await searchParams;

  try {
    const data = await getCompareData(jobId);

    return (
      <>
        <PageHeader
          eyebrow="Decision room"
          title="Candidate comparison"
          description="Select a role and review a ranked, job-specific short list with strengths, gaps, and recommended next actions."
          action={
            <div className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
              {data.rankedCandidates.length} ranked
            </div>
          }
        />

        <form className="surface mb-6 flex flex-col gap-3 rounded-lg p-4 md:flex-row md:items-end">
          <label className="flex-1">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Compare against job</span>
            <select name="jobId" defaultValue={data.selectedJob?.id} className="focus-ring w-full rounded-lg border border-slate-200 px-3 py-2">
              {data.jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} - {job.department}
                </option>
              ))}
            </select>
          </label>
          <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-950 px-4 py-2.5 text-sm font-semibold text-white">
            <Scale className="h-4 w-4" />
            Rank candidates
          </button>
        </form>

        {data.selectedJob ? (
          <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-950">Current role: {data.selectedJob.title}</p>
            <p className="mt-1 text-sm leading-6 text-blue-900">{data.selectedJob.requirements}</p>
          </div>
        ) : null}

        {data.selectedJob && data.rankedCandidates.length ? <section className="space-y-4">
          {data.rankedCandidates.map((candidate, index) => (
            <article key={candidate.id} className="surface rounded-lg p-5">
              <div className="grid gap-5 xl:grid-cols-[1fr_0.7fr_0.7fr] xl:items-start">
                <div>
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <CandidateAvatar name={candidate.name} size="lg" />
                      <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                        {index + 1}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/candidates/${candidate.id}`} className="text-xl font-semibold text-slate-950 hover:underline">
                          {candidate.name}
                        </Link>
                        <StatusBadge status={candidate.status} />
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{candidate.roleAppliedFor}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {candidate.matchingSkills.slice(0, 5).map((skill) => (
                          <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-5">
                    <FitScoreBar score={candidate.fitScore} size="lg" />
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {candidate.scoreSource}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-emerald-50 p-4">
                  <h3 className="text-sm font-semibold text-emerald-950">Strengths</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-emerald-900">
                    {candidate.strengths.slice(0, 3).map((strength) => (
                      <li key={strength}>{strength}</li>
                    ))}
                  </ul>
                </div>

                <div className={`rounded-lg p-4 ${recommendationCardStyles[candidate.recommendationTone]}`}>
                  <h3 className="text-sm font-semibold">Gaps and next action</h3>
                  <ul className={`mt-3 space-y-2 text-sm leading-6 ${recommendationTextStyles[candidate.recommendationTone]}`}>
                    {candidate.gaps.slice(0, 2).map((gap) => (
                      <li key={gap}>{gap}</li>
                    ))}
                  </ul>
                  <div className="mt-4 rounded-lg bg-white/70 p-3">
                    <p className="flex items-start gap-2 text-sm font-semibold leading-6 text-slate-900">
                      <BrainCircuit className={`mt-0.5 h-4 w-4 shrink-0 ${recommendationIconStyles[candidate.recommendationTone]}`} />
                      {candidate.recommendedNextAction}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{candidate.recommendationDescription}</p>
                  </div>
                </div>
              </div>
              <Link href={`/candidates/${candidate.id}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900">
                Open candidate profile
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </section> : (
          <EmptyState
            icon={Users}
            title={data.selectedJob ? "No candidates available" : "Create a job to begin comparing"}
            description={data.selectedJob ? "Add candidates to this workspace, then return here to rank them against the selected role." : "Candidate comparison needs at least one job with requirements."}
            action={<Link href={data.selectedJob ? "/candidates" : "/jobs"} className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">{data.selectedJob ? "Add candidates" : "Create a job"}</Link>}
          />
        )}
      </>
    );
  } catch (error) {
    return <DatabaseNotice message={error instanceof Error ? error.message : "Connect PostgreSQL to compare candidates."} />;
  }
}
