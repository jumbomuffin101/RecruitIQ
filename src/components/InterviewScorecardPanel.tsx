"use client";

import { useActionState } from "react";
import { ClipboardCheck, FileCheck2, LoaderCircle, Save, ShieldQuestion } from "lucide-react";
import { generateInterviewScorecard, saveInterviewScorecard } from "@/app/actions";
import {
  initialInterviewScorecardActionState,
  type InterviewScorecardActionState,
} from "@/lib/interviews/scorecards";
import { getInterviewValidationOutcome, getValidationSummary } from "@/lib/interviews/validation";

type ScorecardCriterion = {
  id: string;
  title: string;
  question: string;
  requirementText: string | null;
  evaluationGuidance: string | null;
  weight: number;
  requirementResult: { status: "MATCHED" | "PARTIAL" | "MISSING"; requirementText: string | null } | null;
  responses: Array<{ rating: number | null; signal: "STRONG_NEGATIVE" | "NEGATIVE" | "NEUTRAL" | "POSITIVE" | "STRONG_POSITIVE" | null; notes: string | null; evidence: string | null; submittedByUser: { name: string | null } | null }>;
};

type Scorecard = {
  id: string;
  status: "DRAFT" | "IN_PROGRESS" | "COMPLETED";
  version: string;
  criteria: ScorecardCriterion[];
};

const statusStyles = {
  DRAFT: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
};

function ActionMessage({ state }: { state: InterviewScorecardActionState }) {
  if (state.status === "idle") return null;
  return (
    <p className={`mt-3 rounded-lg border px-3 py-2 text-sm font-medium ${state.status === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
      {state.message}
    </p>
  );
}

function GenerateScorecard({ candidateId, jobId, disabled }: { candidateId: string; jobId?: string; disabled: boolean }) {
  const [state, formAction, pending] = useActionState(generateInterviewScorecard, initialInterviewScorecardActionState);
  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="candidateId" value={candidateId} />
        {jobId ? <input type="hidden" name="jobId" value={jobId} /> : null}
        <button disabled={disabled || pending} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
          Generate interview scorecard
        </button>
      </form>
      <ActionMessage state={state} />
    </div>
  );
}

export function InterviewScorecardPanel({ candidateId, jobId, scorecard, hasEvaluation }: { candidateId: string; jobId?: string; scorecard: Scorecard | null; hasEvaluation: boolean }) {
  const [state, formAction, pending] = useActionState(saveInterviewScorecard, initialInterviewScorecardActionState);

  if (!scorecard) {
    return (
      <section className="surface rounded-lg p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950"><ClipboardCheck className="h-5 w-5 text-blue-700" />Interview scorecard</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Turn the resume evaluation into requirement-specific questions and an evidence-based interviewer feedback record.</p>
          </div>
          <GenerateScorecard candidateId={candidateId} jobId={jobId} disabled={!hasEvaluation || !jobId} />
        </div>
        {!hasEvaluation ? <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Generate a structured evaluation first. Scorecards are always grounded in a specific evaluation version.</p> : null}
      </section>
    );
  }

  const responses = scorecard.criteria.map((criterion) => criterion.responses[0] ?? null);
  const summary = getValidationSummary(scorecard.criteria.map((criterion, index) => getInterviewValidationOutcome({
    screeningStatus: criterion.requirementResult?.status ?? null,
    rating: responses[index]?.rating ?? null,
    signal: responses[index]?.signal ?? null,
  })));
  const isCompleted = scorecard.status === "COMPLETED";

  return (
    <section className="surface rounded-lg p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950"><ClipboardCheck className="h-5 w-5 text-blue-700" />Interview scorecard</h2>
          <p className="mt-1 text-sm text-slate-500">Human feedback validates screening signals; it does not change the deterministic fit score.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{scorecard.version}</span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[scorecard.status]}`}>{scorecard.status.replace("_", " ")}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-emerald-50 p-3"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Confirmed</p><p className="mt-1 text-2xl font-semibold text-emerald-950">{summary.confirmed}</p></div>
        <div className="rounded-lg bg-red-50 p-3"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">Weakened</p><p className="mt-1 text-2xl font-semibold text-red-950">{summary.weakened}</p></div>
        <div className="rounded-lg bg-amber-50 p-3"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Unresolved</p><p className="mt-1 text-2xl font-semibold text-amber-950">{summary.unresolved}</p></div>
      </div>

      <form action={formAction} className="mt-5 space-y-4">
        <input type="hidden" name="scorecardId" value={scorecard.id} />
        {scorecard.criteria.map((criterion) => {
          const response = criterion.responses[0];
          const outcome = getInterviewValidationOutcome({ screeningStatus: criterion.requirementResult?.status ?? null, rating: response?.rating ?? null, signal: response?.signal ?? null });
          const outcomeStyle = outcome === "CONFIRMED" ? "bg-emerald-100 text-emerald-800" : outcome === "WEAKENED" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800";
          return (
            <article key={criterion.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{criterion.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{criterion.question}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${outcomeStyle}`}>{outcome.toLowerCase()}</span>
              </div>
              {criterion.evaluationGuidance ? <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600"><ShieldQuestion className="mr-1 inline h-3.5 w-3.5" />{criterion.evaluationGuidance}</p> : null}
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700">Rating
                  <select name={`rating:${criterion.id}`} defaultValue={response?.rating ?? ""} disabled={isCompleted} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-50">
                    <option value="">No numerical rating</option>
                    {[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-700">Interview signal
                  <select name={`signal:${criterion.id}`} defaultValue={response?.signal ?? ""} disabled={isCompleted} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 disabled:bg-slate-50">
                    <option value="">Derive from rating when provided</option>
                    <option value="STRONG_NEGATIVE">Strong negative</option><option value="NEGATIVE">Negative</option><option value="NEUTRAL">Neutral</option><option value="POSITIVE">Positive</option><option value="STRONG_POSITIVE">Strong positive</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-700">Observed evidence
                  <textarea name={`evidence:${criterion.id}`} defaultValue={response?.evidence ?? ""} disabled={isCompleted} maxLength={3000} rows={3} placeholder="What did the interviewer observe or hear?" className="mt-1 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 disabled:bg-slate-50" />
                </label>
                <label className="text-xs font-semibold text-slate-700">Interviewer notes
                  <textarea name={`notes:${criterion.id}`} defaultValue={response?.notes ?? ""} disabled={isCompleted} maxLength={3000} rows={3} placeholder="Context, concerns, and follow-up details." className="mt-1 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 disabled:bg-slate-50" />
                </label>
              </div>
              {response?.submittedByUser?.name ? <p className="mt-3 text-xs font-medium text-slate-500">Submitted by {response.submittedByUser.name}</p> : null}
            </article>
          );
        })}
        {!isCompleted ? <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="submit" name="intent" value="save" disabled={pending} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60"><Save className="h-4 w-4" />Save feedback</button>
          <button type="submit" name="intent" value="complete" disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"><FileCheck2 className="h-4 w-4" />Mark scorecard complete</button>
        </div> : <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">This completed scorecard is preserved as a historical interview record. Generate a new version to collect another round of feedback.</p>}
      </form>
      <ActionMessage state={state} />
    </section>
  );
}
