"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { addCandidateToJob, type ApplicationActionState } from "@/app/actions";

const initialApplicationActionState: ApplicationActionState = { status: "idle" };

export function AddApplicationForm({
  candidateId,
  jobs,
}: {
  candidateId: string;
  jobs: Array<{ id: string; title: string; department: string }>;
}) {
  const [state, formAction, pending] = useActionState(addCandidateToJob, initialApplicationActionState);
  if (!jobs.length) return null;
  return (
    <form action={formAction} className="mt-4 flex flex-col gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 sm:flex-row sm:items-end">
      <input type="hidden" name="candidateId" value={candidateId} />
      <label className="flex-1 text-xs font-semibold text-slate-700">Attach to another job
        <select name="jobId" defaultValue="" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
          <option value="" disabled>Select job</option>
          {jobs.map((job) => <option key={job.id} value={job.id}>{job.title} - {job.department}</option>)}
        </select>
      </label>
      <button disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"><Plus className="h-4 w-4" />{pending ? "Adding" : "Add application"}</button>
      {state.status !== "idle" ? <p className={`text-xs font-medium ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}>{state.message}</p> : null}
    </form>
  );
}
