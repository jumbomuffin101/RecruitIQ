import { BriefcaseBusiness } from "lucide-react";
import { createJob } from "@/app/actions";
import { DatabaseNotice } from "@/components/DatabaseNotice";
import { EmptyState } from "@/components/EmptyState";
import { JobCard } from "@/components/JobCard";
import { PageHeader } from "@/components/PageHeader";
import { getJobs } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  try {
    const jobs = await getJobs();

    return (
      <>
        <PageHeader
          eyebrow="Role planning"
          title="Jobs"
          description="Create roles, capture requirements, and connect candidates to the right hiring funnel."
        />
        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <form action={createJob} className="surface rounded-lg p-5">
            <h2 className="text-lg font-semibold text-slate-950">Create job</h2>
            <div className="mt-5 grid gap-4">
              <input name="title" required placeholder="Title" className="focus-ring rounded-lg border border-slate-200 px-3 py-2" />
              <input name="department" required placeholder="Department" className="focus-ring rounded-lg border border-slate-200 px-3 py-2" />
              <input name="location" required placeholder="Location" className="focus-ring rounded-lg border border-slate-200 px-3 py-2" />
              <div className="grid gap-4 sm:grid-cols-2">
                <select name="type" defaultValue="FULL_TIME" className="focus-ring rounded-lg border border-slate-200 px-3 py-2">
                  <option value="FULL_TIME">Full time</option>
                  <option value="PART_TIME">Part time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERNSHIP">Internship</option>
                </select>
                <select name="status" defaultValue="OPEN" className="focus-ring rounded-lg border border-slate-200 px-3 py-2">
                  <option value="OPEN">Open</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PAUSED">Paused</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
              <textarea name="description" required placeholder="Description" rows={4} className="focus-ring rounded-lg border border-slate-200 px-3 py-2" />
              <textarea name="requirements" required placeholder="Requirements" rows={4} className="focus-ring rounded-lg border border-slate-200 px-3 py-2" />
              <button className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                Create job
              </button>
            </div>
          </form>

          <div>
            {jobs.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            ) : (
              <EmptyState icon={BriefcaseBusiness} title="No jobs yet" description="Create your first role to start ranking candidates." />
            )}
          </div>
        </section>
      </>
    );
  } catch (error) {
    return <DatabaseNotice message={error instanceof Error ? error.message : "Connect PostgreSQL to manage jobs."} />;
  }
}
