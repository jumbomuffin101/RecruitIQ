import { BarChart3, BriefcaseBusiness, CalendarCheck, Users, Workflow } from "lucide-react";
import { CandidateCard } from "@/components/CandidateCard";
import { DatabaseNotice } from "@/components/DatabaseNotice";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { getDashboardData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    const data = await getDashboardData();
    const stageCounts = ["APPLIED", "SCREENED", "INTERVIEW", "OFFER", "REJECTED"].map((stage) => ({
      stage,
      count: data.candidates.filter((candidate) => candidate.status === stage).length,
    }));
    const maxStageCount = Math.max(...stageCounts.map((stage) => stage.count), 1);

    return (
      <>
        <PageHeader
          eyebrow="Command center"
          title="Hiring dashboard"
          description="Track open roles, candidate volume, interview activity, and fit scores across your lean hiring team."
        />
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Open jobs" value={data.openJobs} detail="Active roles accepting candidates" icon={BriefcaseBusiness} accent="emerald" />
          <StatCard label="Total candidates" value={data.totalCandidates} detail="Across every pipeline stage" icon={Users} accent="blue" />
          <StatCard label="Interviews scheduled" value={data.interviewsScheduled} detail="Candidates currently in interview" icon={CalendarCheck} accent="violet" />
          <StatCard label="Average fit score" value={data.averageFitScore || "Pending"} detail="From generated AI analysis" icon={BarChart3} accent="amber" />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="surface rounded-lg p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-950">Recent candidates</h2>
              <Users className="h-5 w-5 text-slate-400" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {data.recentCandidates.map((candidate) => (
                <CandidateCard key={candidate.id} candidate={candidate} />
              ))}
            </div>
          </div>

          <div className="surface rounded-lg p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-950">Pipeline overview</h2>
              <Workflow className="h-5 w-5 text-slate-400" />
            </div>
            <div className="space-y-4">
              {stageCounts.map((stage) => (
                <div key={stage.stage}>
                  <div className="mb-2 flex items-center justify-between">
                    <StatusBadge status={stage.stage} />
                    <span className="text-sm font-semibold text-slate-600">{stage.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-blue-600"
                      style={{ width: `${Math.max(8, (stage.count / maxStageCount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-slate-950">Top candidates</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {data.topCandidates.map((candidate) => (
              <CandidateCard key={candidate.id} candidate={candidate} />
            ))}
          </div>
        </section>
      </>
    );
  } catch (error) {
    return (
      <DatabaseNotice
        message={error instanceof Error ? error.message : "Connect PostgreSQL and run Prisma setup to load dashboard data."}
      />
    );
  }
}
