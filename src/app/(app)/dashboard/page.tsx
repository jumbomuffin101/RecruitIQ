import Link from "next/link";
import { Activity, AlertCircle, BarChart3, BriefcaseBusiness, CalendarCheck, Scale, Sparkles, UserCheck, Users, Workflow } from "lucide-react";
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
    const stageCounts = data.stageCounts;
    const maxStageCount = Math.max(...stageCounts.map((stage) => stage.count), 1);
    const actionItems = [
      { label: "Needs review", value: data.actionCenter.applicationsNeedingReview, description: "New applications awaiting triage", href: "/pipeline", icon: AlertCircle, tone: "bg-amber-50 text-amber-700" },
      { label: "Ready for interview", value: data.actionCenter.highFitApplications, description: "High-fit applications in early stages", href: "/compare", icon: UserCheck, tone: "bg-emerald-50 text-emerald-700" },
      { label: "Low pipeline volume", value: data.actionCenter.jobsWithLowPipeline, description: "Open jobs with fewer than 3 applicants", href: "/jobs", icon: BriefcaseBusiness, tone: "bg-blue-50 text-blue-700" },
      { label: "Missing analysis", value: data.actionCenter.candidatesMissingAnalysis, description: "Profiles that need Copilot review", href: "/candidates", icon: Sparkles, tone: "bg-violet-50 text-violet-700" },
    ];

    return (
      <>
        <PageHeader
          eyebrow="Command center"
          title="Hiring dashboard"
          description="Track open roles, application volume, interview-stage activity, and fit scores across your hiring team."
          action={
            <Link href="/compare" className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">
              <Scale className="h-4 w-4" />
              Compare candidates
            </Link>
          }
        />
        {data.candidates.length > 0 ? (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950">
            Northstar Labs sample workspace is active with {data.jobs.length} jobs, {data.totalCandidates} candidates, and {data.totalApplications} applications.
          </div>
        ) : null}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Open jobs" value={data.openJobs} detail="Active roles accepting candidates" icon={BriefcaseBusiness} accent="emerald" />
          <StatCard label="Unique candidates" value={data.totalCandidates} detail="People in the talent workspace" icon={Users} accent="blue" />
          <StatCard label="Applications in Interview" value={data.applicationsInInterview} detail="No calendar scheduling implied" icon={CalendarCheck} accent="violet" />
          <StatCard label="Total applications" value={data.totalApplications} detail="Candidate and job relationships" icon={BarChart3} accent="amber" />
        </section>

        <section className="mt-8">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Recruiter intelligence</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">Action Center</h2>
            </div>
            <p className="text-sm text-slate-500">Prioritized signals across your active hiring portfolio.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {actionItems.map((item) => (
              <Link key={item.label} href={item.href} className="surface rounded-lg p-4 transition hover:-translate-y-0.5 hover:shadow-xl">
                <div className="flex items-start justify-between gap-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.tone}`}><item.icon className="h-4 w-4" /></span>
                  <span className="text-2xl font-semibold text-slate-950">{item.value}</span>
                </div>
                <h3 className="mt-4 text-sm font-semibold text-slate-950">{item.label}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
              </Link>
            ))}
          </div>
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

        <section className="surface mt-8 rounded-lg p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950"><Activity className="h-5 w-5 text-blue-700" />Recent activity</h2>
            <Link href="/quick-start" className="text-sm font-semibold text-blue-700 hover:text-blue-900">Quick Start</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {data.recentActivity.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <p className="text-sm leading-6 text-slate-700">{item.message}</p>
                <time className="shrink-0 text-xs text-slate-400">{item.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</time>
              </div>
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
