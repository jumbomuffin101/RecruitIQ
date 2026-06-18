import Link from "next/link";
import { updateCandidateStatus } from "@/app/actions";
import { StatusBadge } from "@/components/StatusBadge";
import { formatEnum } from "@/lib/utils";

type PipelineColumnProps = {
  status: string;
  candidates: {
    id: string;
    name: string;
    roleAppliedFor: string;
    skills: string[];
    status: string;
    resumeAnalyses?: { fitScore: number }[];
  }[];
};

const statuses = ["APPLIED", "SCREENED", "INTERVIEW", "OFFER", "REJECTED"];

export function PipelineColumn({ status, candidates }: PipelineColumnProps) {
  return (
    <section className="min-w-72 flex-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex items-center justify-between">
        <StatusBadge status={status} />
        <span className="text-sm font-semibold text-slate-500">{candidates.length}</span>
      </div>
      <div className="space-y-3">
        {candidates.map((candidate) => (
          <article key={candidate.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <Link href={`/candidates/${candidate.id}`} className="font-semibold text-slate-950 hover:underline">
              {candidate.name}
            </Link>
            <p className="mt-1 text-sm text-slate-500">{candidate.roleAppliedFor}</p>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-600">
                Score {candidate.resumeAnalyses?.[0]?.fitScore ?? "Pending"}
              </span>
            </div>
            <form action={updateCandidateStatus} className="mt-3">
              <input type="hidden" name="candidateId" value={candidate.id} />
              <select
                name="status"
                defaultValue={candidate.status}
                className="focus-ring w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {statuses.map((option) => (
                  <option key={option} value={option}>
                    {formatEnum(option)}
                  </option>
                ))}
              </select>
              <button className="mt-2 w-full rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
                Update
              </button>
            </form>
          </article>
        ))}
        {candidates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
            No candidates in this stage
          </div>
        ) : null}
      </div>
    </section>
  );
}
