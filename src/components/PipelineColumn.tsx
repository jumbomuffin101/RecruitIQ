import Link from "next/link";
import { updateApplicationStatus } from "@/app/actions";
import { StatusBadge } from "@/components/StatusBadge";
import { formatEnum } from "@/lib/utils";

type PipelineColumnProps = {
  status: string;
  applications: {
    id: string;
    status: string;
    fitScore: number | null;
    recommendation: string | null;
    scorecardStatus: string | null;
    candidate: { id: string; name: string; roleAppliedFor: string };
    job: { title: string; department: string };
  }[];
};

const statuses = ["APPLIED", "SCREENED", "INTERVIEW", "OFFER", "REJECTED"];

export function PipelineColumn({ status, applications, canManage = true }: PipelineColumnProps & { canManage?: boolean }) {
  return (
    <section className="min-w-72 flex-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex items-center justify-between">
        <StatusBadge status={status} />
        <span className="text-sm font-semibold text-slate-500">{applications.length}</span>
      </div>
      <div className="space-y-3">
        {applications.map((application) => (
          <article key={application.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <Link href={`/candidates/${application.candidate.id}`} className="font-semibold text-slate-950 hover:underline">
              {application.candidate.name}
            </Link>
            <p className="mt-1 text-sm font-medium text-slate-600">{application.job.title}</p>
            <p className="mt-1 text-xs text-slate-500">{application.job.department}</p>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-600">
                Fit {application.fitScore ?? "Pending"}
              </span>
            </div>
            {application.recommendation ? <p className="mt-2 text-xs leading-5 text-slate-500">{application.recommendation}</p> : null}
            <p className="mt-2 text-xs font-semibold text-slate-500">Interview scorecard: {application.scorecardStatus ? formatEnum(application.scorecardStatus) : "Not started"}</p>
            {canManage ? <form action={updateApplicationStatus} className="mt-3">
              <input type="hidden" name="applicationId" value={application.id} />
              <select
                name="status"
                defaultValue={application.status}
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
            </form> : null}
          </article>
        ))}
        {applications.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
            No applications in this stage
          </div>
        ) : null}
      </div>
    </section>
  );
}
