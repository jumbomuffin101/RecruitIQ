import Link from "next/link";
import { notFound } from "next/navigation";
import { BriefcaseBusiness, ClipboardCheck, ExternalLink, GraduationCap, Mail, MapPin, MoreHorizontal, Phone } from "lucide-react";
import { deleteCandidate, updateApplicationStatus } from "@/app/actions";
import { AddApplicationForm } from "@/components/AddApplicationForm";
import { CandidateAvatar } from "@/components/CandidateAvatar";
import { CandidateWorkspace } from "@/components/candidates/CandidateWorkspace";
import { DatabaseNotice } from "@/components/DatabaseNotice";
import { DeleteConfirmationButton } from "@/components/DeleteConfirmationButton";
import { GenerateAnalysisForm } from "@/components/GenerateAnalysisForm";
import { InterviewScorecardPanel } from "@/components/InterviewScorecardPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { getCurrentUserContext } from "@/lib/auth-context";
import { getCandidateDetail, getJobs } from "@/lib/data";

export const dynamic = "force-dynamic";

const stages = ["APPLIED", "SCREENED", "INTERVIEW", "OFFER", "REJECTED"];

export default async function CandidateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ applicationId?: string }>;
}) {
  const { id } = await params;
  const { applicationId } = await searchParams;

  try {
    const candidate = await getCandidateDetail(id);
    if (!candidate) notFound();

    const [jobs, context] = await Promise.all([getJobs(), getCurrentUserContext()]);
    const application = candidate.applications.find((item) => item.id === applicationId) ?? candidate.applications[0];
    const selectedJobId = application?.jobId;
    const evaluation = candidate.evaluations.find((item) => item.jobId === selectedJobId && item.status === "COMPLETED") ?? candidate.evaluations.find((item) => item.jobId === selectedJobId) ?? null;
    const evaluationHistory = candidate.evaluations.filter((item) => item.jobId === selectedJobId).slice(0, 5);
    const analysis = evaluation?.resumeAnalysis ?? (!evaluation ? candidate.resumeAnalyses.find((item) => item.jobId === selectedJobId) ?? null : null);
    const copilot = evaluation
      ? {
          fitScore: evaluation.overallScore ?? analysis?.fitScore ?? 0,
          summary: evaluation.summary ?? analysis?.summary ?? "No executive summary was generated for this evaluation.",
          roleMatch: analysis?.roleMatch,
          strengths: analysis?.strengths ?? [],
          gaps: analysis?.gaps ?? [],
          nextStep: analysis?.nextStep,
        }
      : analysis
        ? { fitScore: analysis.fitScore, summary: analysis.summary, roleMatch: analysis.roleMatch, strengths: analysis.strengths, gaps: analysis.gaps, nextStep: analysis.nextStep }
        : null;
    const scorecard = candidate.interviewScorecards.find((item) => item.jobId === selectedJobId) ?? null;
    const availableJobs = jobs.filter((job) => !candidate.applications.some((item) => item.jobId === job.id));
    const canManage = context.role !== "INTERVIEWER";
    const canDelete = context.role === "ADMIN";
    const skills = candidate.skills.slice(0, 5);
    const remainingSkills = candidate.skills.slice(5);
    const matchedCount = evaluation?.requirementResults.filter((result) => result.status === "MATCHED").length ?? 0;
    const criticalGaps = evaluation?.requirementResults.filter((result) => result.status === "MISSING" && result.requirementIsCritical).length ?? 0;
    const activity = [
      ...evaluationHistory.map((item) => ({ id: `evaluation-${item.id}`, label: "Evaluation refreshed", detail: `${item.overallScore ?? "Pending"}/100 · ${item.source === "HYBRID" ? "AI-assisted hybrid" : "Deterministic"}`, date: item.completedAt ?? item.createdAt })),
      ...(application?.statusHistory ?? []).map((item) => ({ id: `stage-${item.id}`, label: `Moved to ${item.toStatus.toLowerCase().replace("_", " ")}`, detail: item.note || application.job.title, date: item.changedAt })),
      ...(candidate.notes ? [{ id: "note", label: "Candidate note", detail: candidate.notes.slice(0, 160), date: candidate.updatedAt }] : []),
    ].sort((left, right) => right.date.getTime() - left.date.getTime()).slice(0, 8);

    return <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link href="/candidates" className="text-sm font-semibold text-slate-500 hover:text-slate-950">Candidates</Link>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/pipeline" className="font-semibold text-slate-600 hover:text-slate-950">Pipeline</Link>
          <Link href="/compare" className="font-semibold text-slate-600 hover:text-slate-950">Compare</Link>
        </div>
      </div>

      <header className="mb-7 flex flex-col gap-5 border-b border-slate-200 pb-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <CandidateAvatar name={candidate.name} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold text-slate-950">{candidate.name}</h1>{application ? <StatusBadge status={application.status} /> : null}</div>
            <p className="mt-1 text-sm text-slate-600">{candidate.roleAppliedFor}{application?.job ? ` · ${application.job.title}` : ""}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500"><span>{candidate.currentTitle || "Candidate"}{candidate.currentCompany ? ` at ${candidate.currentCompany}` : ""}</span>{candidate.location ? <span>{candidate.location}</span> : null}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage ? <GenerateAnalysisForm candidateId={candidate.id} jobId={selectedJobId} hasAnalysis={Boolean(evaluation)} /> : null}
          {canManage && application ? <form action={updateApplicationStatus} className="flex items-center gap-2"><input type="hidden" name="applicationId" value={application.id} /><select aria-label="Move candidate stage" name="status" defaultValue={application.status} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">{stages.map((stage) => <option key={stage} value={stage}>{stage.charAt(0) + stage.slice(1).toLowerCase()}</option>)}</select><button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Move stage</button></form> : null}
          {canDelete ? <details className="relative"><summary aria-label="More candidate actions" className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><MoreHorizontal className="h-5 w-5" /></summary><div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg"><DeleteConfirmationButton action={deleteCandidate} hiddenFields={{ candidateId: candidate.id }} buttonLabel="Delete candidate" title="Delete candidate" description="Are you sure you want to delete this candidate? This action cannot be undone." confirmLabel="Delete Candidate" /></div></details> : null}
        </div>
      </header>

      <main className="grid gap-6 xl:grid-cols-12">
        <aside className="space-y-5 xl:col-span-4">
          <section className="surface rounded-lg p-5"><h2 className="text-sm font-semibold text-slate-950">Profile</h2><div className="mt-4 space-y-3 text-sm text-slate-600"><p className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" />{candidate.email}</p>{candidate.phone ? <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" />{candidate.phone}</p> : null}{candidate.location ? <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" />{candidate.location}</p> : null}{candidate.linkedinUrl ? <a className="flex items-center gap-2 font-semibold text-blue-700 hover:text-blue-900" href={candidate.linkedinUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />LinkedIn</a> : null}</div><div className="mt-5 border-t border-slate-100 pt-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Skills</p><div className="mt-3 flex flex-wrap gap-1.5">{skills.map((skill) => <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{skill}</span>)}{remainingSkills.length ? <details><summary className="cursor-pointer rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">+{remainingSkills.length} more</summary><div className="mt-2 flex flex-wrap gap-1.5">{remainingSkills.map((skill) => <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{skill}</span>)}</div></details> : null}</div></div></section>

          <section className="surface rounded-lg p-5"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-950">Applications</h2><span className="text-xs text-slate-400">{candidate.applications.length}</span></div><div className="mt-3 divide-y divide-slate-100">{candidate.applications.map((item) => <div key={item.id} className="py-3 first:pt-0"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-800">{item.job.title}</p><p className="mt-1 text-xs text-slate-500">{item.job.department}</p></div><StatusBadge status={item.status} /></div><div className="mt-2 flex items-center gap-3 text-xs text-slate-500"><span>Fit {item.fitScore ?? "-"}</span><span>Scorecard {scorecard?.status?.replace("_", " ") || "Not started"}</span></div>{item.statusHistory.length ? <details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-800">View history</summary><div className="mt-2 space-y-1 border-l border-slate-200 pl-3 text-xs text-slate-500">{item.statusHistory.map((history) => <p key={history.id}>{history.toStatus.toLowerCase()} · {history.changedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>)}</div></details> : null}</div>)}</div>{canManage ? <AddApplicationForm candidateId={candidate.id} jobs={availableJobs.map((job) => ({ id: job.id, title: job.title, department: job.department }))} /> : null}</section>

          <section className="surface rounded-lg p-5"><h2 className="text-sm font-semibold text-slate-950">Evaluation snapshot</h2><div className="mt-4 grid grid-cols-2 gap-4"><div><p className="text-2xl font-semibold text-slate-950">{evaluation?.overallScore ?? "-"}</p><p className="text-xs text-slate-500">Fit</p></div><div><p className="text-sm font-semibold text-slate-900">{application?.status ? application.status.charAt(0) + application.status.slice(1).toLowerCase() : "-"}</p><p className="text-xs text-slate-500">Stage</p></div><div><p className="text-sm font-semibold text-slate-900">{matchedCount}/{evaluation?.requirementResults.length ?? 0}</p><p className="text-xs text-slate-500">Matched</p></div><div><p className="text-sm font-semibold text-slate-900">{criticalGaps}</p><p className="text-xs text-slate-500">Critical gaps</p></div></div><div className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600"><ClipboardCheck className="mr-1 inline h-4 w-4 text-slate-400" />Interview: {scorecard?.status?.replace("_", " ") || "Not started"}</div></section>

          <section className="surface rounded-lg p-5"><h2 className="text-sm font-semibold text-slate-950">Resume highlights</h2><div className="mt-4 space-y-3 text-sm"><p className="flex gap-2 text-slate-600"><BriefcaseBusiness className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{candidate.experienceSummary || "Experience not summarized."}</p><p className="flex gap-2 text-slate-600"><GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{candidate.educationSummary || "Education not provided."}</p>{candidate.yearsExperience !== null ? <p className="font-semibold text-slate-700">{candidate.yearsExperience} years estimated experience</p> : null}</div></section>
        </aside>

        <div className="min-w-0 xl:col-span-8"><CandidateWorkspace evaluation={evaluation} evaluationHistory={evaluationHistory} copilot={copilot} resume={{ resumeText: candidate.resumeText, resumeSummary: candidate.resumeSummary, experienceSummary: candidate.experienceSummary, educationSummary: candidate.educationSummary, projectsSummary: candidate.projectsSummary, skills: candidate.skills, yearsExperience: candidate.yearsExperience }} activity={activity} interview={<InterviewScorecardPanel candidateId={candidate.id} jobId={selectedJobId} scorecard={scorecard} hasEvaluation={Boolean(evaluation && evaluation.status === "COMPLETED")} />} /></div>
      </main>
    </>;
  } catch (error) {
    return <DatabaseNotice message={error instanceof Error ? error.message : "Connect PostgreSQL to view candidate details."} />;
  }
}
