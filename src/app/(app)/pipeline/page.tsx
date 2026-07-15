import { PageHeader } from "@/components/PageHeader";
import { PipelineColumn } from "@/components/PipelineColumn";
import { DatabaseNotice } from "@/components/DatabaseNotice";
import { getPipelineData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  try {
    const { jobId } = await searchParams;
    const data = await getPipelineData(jobId);

    return (
      <>
        <PageHeader
          eyebrow="Hiring flow"
          title="Pipeline"
          description="Each card is a candidate's application for a specific job. Stage changes affect only that application."
        />
        <form className="surface mb-6 flex flex-col gap-3 rounded-lg p-4 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm font-semibold text-slate-700">
            Job filter
            <select name="jobId" defaultValue={data.selectedJobId ?? ""} className="focus-ring mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
              <option value="">All jobs</option>
              {data.jobs.map((job) => <option key={job.id} value={job.id}>{job.title} - {job.department}</option>)}
            </select>
          </label>
          <button className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Apply filter</button>
        </form>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {data.columns.map((column) => (
            <PipelineColumn key={column.status} status={column.status} applications={column.applications} />
          ))}
        </div>
      </>
    );
  } catch (error) {
    return <DatabaseNotice message={error instanceof Error ? error.message : "Connect PostgreSQL to view the pipeline."} />;
  }
}
