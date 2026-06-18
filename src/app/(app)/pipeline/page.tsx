import { PageHeader } from "@/components/PageHeader";
import { PipelineColumn } from "@/components/PipelineColumn";
import { DatabaseNotice } from "@/components/DatabaseNotice";
import { getPipelineData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  try {
    const columns = await getPipelineData();

    return (
      <>
        <PageHeader
          eyebrow="Hiring flow"
          title="Pipeline"
          description="Move candidates through applied, screened, interview, offer, and rejected stages."
        />
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <PipelineColumn key={column.status} status={column.status} candidates={column.candidates} />
          ))}
        </div>
      </>
    );
  } catch (error) {
    return <DatabaseNotice message={error instanceof Error ? error.message : "Connect PostgreSQL to view the pipeline."} />;
  }
}
