import { BarChart3 } from "lucide-react";
import { DatabaseNotice } from "@/components/DatabaseNotice";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { getAnalyticsData } from "@/lib/data";

export const dynamic = "force-dynamic";

function BarRow({ label, value, max }: { label: React.ReactNode; value: number; max: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="font-semibold text-slate-700">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-blue-600"
          style={{ width: `${value === 0 ? 0 : Math.max(8, (value / max) * 100)}%` }}
        />
      </div>
    </div>
  );
}

export default async function AnalyticsPage() {
  try {
    const data = await getAnalyticsData();
    const maxStage = Math.max(...data.stageCounts.map((item) => item.count), 1);
    const maxJobStatus = Math.max(...data.jobStatusCounts.map((item) => item.count), 1);
    const maxSkill = Math.max(...data.topSkills.map((item) => item.count), 1);

    return (
      <>
        <PageHeader
          eyebrow="Hiring intelligence"
          title="Analytics"
          description="Application-aware pipeline health, conversion signals, job status, fit score quality, and skill demand."
        />
        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard label="Unique candidates" value={data.totalCandidates} detail="People represented in the workspace" icon={BarChart3} />
          <StatCard label="Total applications" value={data.totalApplications} detail="Candidate and job relationships" icon={BarChart3} />
          <StatCard label="Average fit score" value={data.averageFitScore || "Pending"} detail="Across evaluated applications" icon={BarChart3} />
          <StatCard label="Rejection rate" value={`${data.conversions.rejectionRate}%`} detail="Across all applications" icon={BarChart3} />
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="surface rounded-lg p-5">
            <h2 className="mb-5 text-lg font-semibold text-slate-950">Applications by stage</h2>
            <div className="space-y-5">
              {data.stageCounts.map((item) => (
                <BarRow key={item.stage} label={<StatusBadge status={item.stage} />} value={item.count} max={maxStage} />
              ))}
            </div>
          </div>
          <div className="surface rounded-lg p-5">
            <h2 className="mb-5 text-lg font-semibold text-slate-950">Jobs by status</h2>
            <div className="space-y-5">
              {data.jobStatusCounts.map((item) => (
                <BarRow key={item.status} label={<StatusBadge status={item.status} />} value={item.count} max={maxJobStatus} />
              ))}
            </div>
          </div>
          <div className="surface rounded-lg p-5">
            <h2 className="mb-5 text-lg font-semibold text-slate-950">Pipeline conversion</h2>
            <div className="space-y-5 text-sm text-slate-700">
              <BarRow label="Applied to Screened" value={data.conversions.appliedToScreened} max={100} />
              <BarRow label="Screened to Interview" value={data.conversions.screenedToInterview} max={100} />
              <BarRow label="Interview to Offer" value={data.conversions.interviewToOffer} max={100} />
            </div>
          </div>
          <div className="surface rounded-lg p-5">
            <h2 className="mb-5 text-lg font-semibold text-slate-950">Top skills</h2>
            <div className="space-y-5">
              {data.topSkills.map((item) => (
                <BarRow key={item.skill} label={<span className="font-medium text-slate-700">{item.skill}</span>} value={item.count} max={maxSkill} />
              ))}
            </div>
          </div>
        </section>
      </>
    );
  } catch (error) {
    return <DatabaseNotice message={error instanceof Error ? error.message : "Connect PostgreSQL to view analytics."} />;
  }
}
