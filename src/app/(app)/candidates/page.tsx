import Link from "next/link";
import { Users } from "lucide-react";
import { CandidateCard } from "@/components/CandidateCard";
import { CandidateIntakeForm } from "@/components/CandidateIntakeForm";
import { DatabaseNotice } from "@/components/DatabaseNotice";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { getCandidates, getJobs } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CandidatesPage() {
  try {
    const [candidates, jobs] = await Promise.all([getCandidates(), getJobs()]);

    return (
      <>
        <PageHeader
          eyebrow="Talent pool"
          title="Candidates"
          description="Add applicants, store resume context, and generate structured AI analysis for each profile."
        />
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <CandidateIntakeForm jobTitles={jobs.map((job) => job.title)} />

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
                title="No candidates yet"
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
