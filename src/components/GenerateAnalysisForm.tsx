"use client";

import { useActionState } from "react";
import { generateCandidateAnalysis } from "@/app/actions";
import { GenerateAnalysisButton } from "@/components/GenerateAnalysisButton";
import {
  getEvaluationActionTone,
  initialEvaluationActionState,
} from "@/lib/evaluations/action-state";

export function GenerateAnalysisForm({
  candidateId,
  jobId,
  hasAnalysis,
}: {
  candidateId: string;
  jobId?: string;
  hasAnalysis: boolean;
}) {
  const [state, formAction] = useActionState(generateCandidateAnalysis, initialEvaluationActionState);
  const tone = getEvaluationActionTone(state);

  return (
    <div className="flex flex-col items-start gap-2">
      <form action={formAction}>
        <input type="hidden" name="candidateId" value={candidateId} />
        {jobId ? <input type="hidden" name="jobId" value={jobId} /> : null}
        <GenerateAnalysisButton hasAnalysis={hasAnalysis} />
      </form>
      {state.status !== "idle" ? (
        <p
          className={
            tone === "error"
              ? "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800"
              : tone === "info"
                ? "rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800"
                : "rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800"
          }
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
