"use client";

import { useState, type ReactNode } from "react";
import { BrainCircuit, ChevronRight, FileText, History, ListChecks, MessageSquareText, X } from "lucide-react";
import { FitScoreBar } from "@/components/FitScoreBar";
import { StatusBadge } from "@/components/StatusBadge";
import { CATEGORY_SCORE_LABELS } from "@/lib/evaluations/constants";
import { formatEnum } from "@/lib/utils";

type Evidence = { id: string; excerpt: string; resumeSection: string | null; confidence: number | null };
type Requirement = {
  id: string;
  status: string;
  deterministicStatus: string | null;
  aiAssessment: string | null;
  aiConfidence: number | null;
  aiExplanation: string | null;
  score: number;
  maxScore: number;
  confidence: number | null;
  explanation: string | null;
  requirementText: string | null;
  requirementType: string | null;
  requirementIsCritical: boolean;
  requirement: { text: string; type: string };
  evidence: Evidence[];
};
type Category = { id: string; category: keyof typeof CATEGORY_SCORE_LABELS; score: number; maxScore: number; explanation: string | null };
type Evaluation = {
  id: string;
  overallScore: number | null;
  source: string;
  status: string;
  recommendation: string | null;
  summary: string | null;
  scoringVersion: string;
  createdAt: Date;
  completedAt: Date | null;
  categories: Category[];
  requirementResults: Requirement[];
  evidence: Evidence[];
};
type Copilot = { fitScore: number; summary: string; roleMatch?: string | null; strengths: string[]; gaps: string[]; nextStep?: string | null };
type Resume = { resumeText: string; resumeSummary: string | null; experienceSummary: string; educationSummary: string | null; projectsSummary: string | null; skills: string[]; yearsExperience: number | null };
type Activity = { id: string; label: string; detail: string; date: Date };

const tabs = [
  { id: "evaluation", label: "Evaluation", icon: ListChecks },
  { id: "interview", label: "Interview", icon: MessageSquareText },
  { id: "resume", label: "Resume", icon: FileText },
  { id: "activity", label: "Activity", icon: History },
] as const;
type TabId = (typeof tabs)[number]["id"];

function toneForStatus(status: string) {
  if (status === "MATCHED") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "PARTIAL") return "bg-amber-50 text-amber-700 ring-amber-100";
  return "bg-rose-50 text-rose-700 ring-rose-100";
}

export function CandidateWorkspace({
  evaluation,
  evaluationHistory,
  copilot,
  resume,
  activity,
  interview,
}: {
  evaluation: Evaluation | null;
  evaluationHistory: Evaluation[];
  copilot: Copilot | null;
  resume: Resume;
  activity: Activity[];
  interview: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("evaluation");
  const [showWhy, setShowWhy] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const score = evaluation?.overallScore ?? copilot?.fitScore ?? 0;
  const mode = evaluation?.source === "HYBRID" ? "AI-assisted hybrid" : "Deterministic";

  return (
    <section className="surface overflow-hidden rounded-lg">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-emerald-700" />
              <h2 className="text-lg font-semibold text-slate-950">Recruiter Copilot</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">AI evaluates semantic evidence. The rubric calculates the final score.</p>
          </div>
          <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{mode}</span>
        </div>

        {copilot ? (
          <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-[0.65fr_1fr_1fr]">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-4xl font-semibold text-slate-950">{score}</p>
              <p className="mt-1 text-sm font-medium text-slate-500">Fit score</p>
              <div className="mt-3"><FitScoreBar score={score} size="sm" /></div>
            </div>
            <div className="border-l-0 border-slate-100 px-0 py-2 sm:border-l sm:px-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Recommendation</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{evaluation?.recommendation || copilot.nextStep || "Keep under review"}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{copilot.gaps[0] || "Review the strongest evidence before moving stages."}</p>
            </div>
            <div className="border-l-0 border-slate-100 px-0 py-2 sm:border-l sm:px-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Decision signals</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {copilot.strengths.slice(0, 3).map((strength) => <span key={strength} className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">{strength}</span>)}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">Generate an evaluation to see a role-specific decision summary.</div>
        )}

        {copilot ? <div className="mt-4">
          <button type="button" onClick={() => setShowWhy((current) => !current)} className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-900">
            Why this score <ChevronRight className={`h-4 w-4 transition-transform ${showWhy ? "rotate-90" : ""}`} />
          </button>
          {showWhy ? <div className="mt-3 grid gap-3 border-l-2 border-emerald-200 pl-4 text-sm leading-6 text-slate-600 md:grid-cols-2">
            <p>{copilot.summary}</p>
            <p>{copilot.roleMatch || "The fit is based on the role rubric, structured resume signals, and evidence-backed requirement results."}</p>
          </div> : null}
        </div> : null}
      </div>

      <div className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>
            <Icon className="h-4 w-4" />{tab.label}
          </button>;
        })}
      </div>

      <div className="p-5">
        {activeTab === "evaluation" ? <div className="space-y-6">
          {evaluation ? <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="font-semibold text-slate-950">Structured evaluation</h3><p className="mt-1 text-sm text-slate-500">{evaluation.scoringVersion} · generated {(evaluation.completedAt ?? evaluation.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p></div>
              <StatusBadge status={evaluation.status} />
            </div>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {evaluation.categories.map((category) => {
                const matching = evaluation.requirementResults.filter((result) => result.requirementType === "PREFERRED" ? category.category === "PREFERRED_QUALIFICATIONS" : result.requirementType === "REQUIRED");
                return <details key={category.id} className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-slate-50">
                    <span className="min-w-0 flex-1 text-sm font-semibold text-slate-800">{CATEGORY_SCORE_LABELS[category.category]}</span>
                    <span className="text-sm font-semibold text-slate-950">{category.score} / {category.maxScore}</span>
                    <span className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-emerald-600" style={{ width: `${category.maxScore ? (category.score / category.maxScore) * 100 : 0}%` }} /></span>
                    <ChevronRight className="h-4 w-4 text-slate-400 transition group-open:rotate-90" />
                  </summary>
                  <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2">
                    {matching.length ? matching.map((result) => <button key={result.id} type="button" onClick={() => setSelectedRequirement(result)} className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-white">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${toneForStatus(result.status)}`}>{formatEnum(result.status)}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{result.requirementText || result.requirement.text}</span><span className="text-xs font-semibold text-slate-500">{result.score}/{result.maxScore}</span>
                    </button>) : <p className="py-2 text-sm text-slate-500">No detailed requirements in this category.</p>}
                  </div>
                </details>;
              })}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500"><span>{evaluation.requirementResults.filter((result) => result.status === "MATCHED").length} matched</span><span>·</span><span>{evaluation.requirementResults.filter((result) => result.status === "PARTIAL").length} partial</span><span>·</span><span>{evaluation.requirementResults.filter((result) => result.status === "MISSING").length} missing</span></div>
            {evaluationHistory.length > 1 ? <details className="rounded-lg border border-slate-200"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">View evaluation history ({evaluationHistory.length})</summary><div className="divide-y divide-slate-100 border-t border-slate-100">{evaluationHistory.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm"><span className="text-slate-600">{item.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span><span className="font-semibold text-slate-900">{item.overallScore ?? "-"}</span><span className="text-xs text-slate-500">{item.source === "HYBRID" ? "AI-assisted hybrid" : "Deterministic"}</span></div>)}</div></details> : null}
          </> : <p className="rounded-lg bg-slate-50 p-5 text-sm text-slate-600">Generate Copilot analysis to create the first structured evaluation record.</p>}
        </div> : null}

        {activeTab === "interview" ? interview : null}
        {activeTab === "resume" ? <div className="space-y-5"><div><h3 className="font-semibold text-slate-950">Resume profile</h3><p className="mt-2 text-sm leading-6 text-slate-600">{resume.resumeSummary || resume.experienceSummary}</p></div><div className="grid gap-3 sm:grid-cols-3"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Experience</p><p className="mt-2 text-sm leading-6 text-slate-700">{resume.experienceSummary || "No experience summary."}</p></div><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Education</p><p className="mt-2 text-sm leading-6 text-slate-700">{resume.educationSummary || "No education details."}</p></div><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Projects</p><p className="mt-2 text-sm leading-6 text-slate-700">{resume.projectsSummary || "No project highlights."}</p></div></div><div className="flex flex-wrap gap-2">{resume.skills.map((skill) => <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{skill}</span>)}</div><details className="rounded-lg border border-slate-200"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">View raw resume text</summary><pre className="max-h-96 overflow-auto border-t border-slate-100 p-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{resume.resumeText}</pre></details></div> : null}
        {activeTab === "activity" ? <div><h3 className="font-semibold text-slate-950">Recent activity</h3><div className="mt-4 space-y-4 border-l border-slate-200 pl-5">{activity.length ? activity.map((item) => <div key={item.id} className="relative"><span className="absolute -left-[1.42rem] top-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-white" /><p className="text-sm font-semibold text-slate-800">{item.label}</p><p className="mt-1 text-sm text-slate-500">{item.detail}</p><p className="mt-1 text-xs text-slate-400">{item.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p></div>) : <p className="text-sm text-slate-500">No activity recorded yet.</p>}</div></div> : null}
      </div>

      {selectedRequirement ? <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30" role="dialog" aria-modal="true" aria-label="Requirement detail">
        <button aria-label="Close requirement detail" className="flex-1 cursor-default" onClick={() => setSelectedRequirement(null)} />
        <aside className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Requirement detail</p><h3 className="mt-2 text-lg font-semibold text-slate-950">{selectedRequirement.requirementText || selectedRequirement.requirement.text}</h3></div><button type="button" onClick={() => setSelectedRequirement(null)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Close requirement detail"><X className="h-5 w-5" /></button></div><div className="mt-5 flex flex-wrap gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${toneForStatus(selectedRequirement.status)}`}>{formatEnum(selectedRequirement.status)}</span>{selectedRequirement.aiAssessment ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{formatEnum(selectedRequirement.aiAssessment)}</span> : null}</div><dl className="mt-6 grid grid-cols-2 gap-4 border-y border-slate-100 py-4 text-sm"><div><dt className="text-slate-500">Contribution</dt><dd className="mt-1 font-semibold text-slate-950">{selectedRequirement.score} / {selectedRequirement.maxScore}</dd></div><div><dt className="text-slate-500">Confidence</dt><dd className="mt-1 font-semibold text-slate-950">{selectedRequirement.aiConfidence !== null ? `${Math.round(selectedRequirement.aiConfidence * 100)}%` : selectedRequirement.confidence !== null ? `${Math.round(selectedRequirement.confidence * 100)}%` : "-"}</dd></div></dl><div className="mt-6 space-y-3 text-sm leading-6 text-slate-600"><p>{selectedRequirement.explanation}</p>{selectedRequirement.aiExplanation ? <p><span className="font-semibold text-slate-900">AI assessment:</span> {selectedRequirement.aiExplanation}</p> : null}</div><div className="mt-6"><h4 className="text-sm font-semibold text-slate-950">Grounded evidence</h4>{selectedRequirement.evidence.length ? <div className="mt-3 space-y-3">{selectedRequirement.evidence.map((evidence) => <blockquote key={evidence.id} className="border-l-2 border-emerald-400 pl-3 text-sm leading-6 text-slate-600">{evidence.excerpt}{evidence.resumeSection ? <span className="mt-1 block text-xs font-semibold text-slate-400">{evidence.resumeSection}</span> : null}</blockquote>)}</div> : <p className="mt-2 text-sm text-slate-500">No resume excerpt was found for this requirement.</p>}</div></aside>
      </div> : null}
    </section>
  );
}
