import Link from "next/link";
import { MapPin } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatEnum } from "@/lib/utils";

type JobCardProps = {
  job: {
    id: string;
    title: string;
    department: string;
    location: string;
    type: string;
    status: string;
    description: string;
    applications?: unknown[];
  };
};

export function JobCard({ job }: JobCardProps) {
  return (
    <div className="surface rounded-lg p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{job.title}</h3>
          <p className="mt-1 text-sm text-slate-500">{job.department}</p>
        </div>
        <StatusBadge status={job.status} />
      </div>
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{job.description}</p>
      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {job.location}
        </span>
        <span>{formatEnum(job.type)}</span>
        <span>{job.applications?.length ?? 0} applicants</span>
      </div>
      <Link
        href="/candidates"
        className="mt-5 inline-flex rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        View candidates
      </Link>
    </div>
  );
}
