import { Users } from "lucide-react";
import { createCandidate } from "@/app/actions";
import { CandidateCard } from "@/components/CandidateCard";
import { DatabaseNotice } from "@/components/DatabaseNotice";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { getCandidates } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CandidatesPage() {
  try {
    const candidates = await getCandidates();

    return (
      <>
        <PageHeader
          eyebrow="Talent pool"
          title="Candidates"
          description="Add applicants, store resume context, and generate structured AI analysis for each profile."
        />
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <form action={createCandidate} className="surface rounded-lg p-5">
            <h2 className="text-lg font-semibold text-slate-950">Add candidate</h2>
            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <input name="name" required placeholder="Name" className="focus-ring rounded-lg border border-slate-200 px-3 py-2" />
                <input name="email" type="email" required placeholder="Email" className="focus-ring rounded-lg border border-slate-200 px-3 py-2" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input name="phone" placeholder="Phone" className="focus-ring rounded-lg border border-slate-200 px-3 py-2" />
                <input name="location" placeholder="Location" className="focus-ring rounded-lg border border-slate-200 px-3 py-2" />
              </div>
              <input name="roleAppliedFor" required placeholder="Role applied for" className="focus-ring rounded-lg border border-slate-200 px-3 py-2" />
              <input name="skills" required placeholder="Skills, comma separated" className="focus-ring rounded-lg border border-slate-200 px-3 py-2" />
              <select name="status" defaultValue="APPLIED" className="focus-ring rounded-lg border border-slate-200 px-3 py-2">
                <option value="APPLIED">Applied</option>
                <option value="SCREENED">Screened</option>
                <option value="INTERVIEW">Interview</option>
                <option value="OFFER">Offer</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <textarea name="experienceSummary" required placeholder="Experience summary" rows={3} className="focus-ring rounded-lg border border-slate-200 px-3 py-2" />
              <textarea name="resumeText" required placeholder="Resume text" rows={6} className="focus-ring rounded-lg border border-slate-200 px-3 py-2" />
              <textarea name="notes" placeholder="Notes" rows={3} className="focus-ring rounded-lg border border-slate-200 px-3 py-2" />
              <button className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                Add candidate
              </button>
            </div>
          </form>

          <div>
            {candidates.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {candidates.map((candidate) => (
                  <CandidateCard key={candidate.id} candidate={candidate} />
                ))}
              </div>
            ) : (
              <EmptyState icon={Users} title="No candidates yet" description="Add a candidate to start analysis and pipeline tracking." />
            )}
          </div>
        </section>
      </>
    );
  } catch (error) {
    return <DatabaseNotice message={error instanceof Error ? error.message : "Connect PostgreSQL to manage candidates."} />;
  }
}
