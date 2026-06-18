import Link from "next/link";
import { Mail, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

type CandidateCardProps = {
  candidate: {
    id: string;
    name: string;
    email: string;
    location: string | null;
    roleAppliedFor: string;
    skills: string[];
    status: string;
    resumeAnalyses?: { fitScore: number }[];
    applications?: { fitScore: number | null }[];
  };
};

export function CandidateCard({ candidate }: CandidateCardProps) {
  const score =
    candidate.resumeAnalyses?.[0]?.fitScore ?? candidate.applications?.find((app) => app.fitScore)?.fitScore;

  return (
    <Link
      href={`/candidates/${candidate.id}`}
      className="surface block rounded-lg p-5 transition hover:-translate-y-0.5 hover:shadow-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{candidate.name}</h3>
          <p className="mt-1 text-sm text-slate-500">{candidate.roleAppliedFor}</p>
        </div>
        <StatusBadge status={candidate.status} />
      </div>
      <div className="mt-4 space-y-2 text-sm text-slate-500">
        <p className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          {candidate.email}
        </p>
        {candidate.location ? (
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {candidate.location}
          </p>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {candidate.skills.slice(0, 4).map((skill) => (
          <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
            {skill}
          </span>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Fit score</span>
        <span className="text-lg font-semibold text-slate-950">{score ?? "Pending"}</span>
      </div>
    </Link>
  );
}
