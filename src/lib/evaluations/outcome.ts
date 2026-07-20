import { EvaluationSource } from "@prisma/client";

export type SemanticAssessmentStatus = "success" | "provider_error" | "invalid_output" | "ungrounded_evidence";
export type NarrativeStatus = "success" | "provider_error" | "invalid_output";
export type NarrativeSource = "openrouter" | "deterministic";

export function getEvaluationCompletionMessage({
  scoringMode,
  narrativeSource,
}: {
  scoringMode: EvaluationSource;
  narrativeSource: NarrativeSource;
}) {
  if (scoringMode === EvaluationSource.HYBRID && narrativeSource === "openrouter") {
    return "AI-assisted evaluation completed.";
  }
  if (scoringMode === EvaluationSource.HYBRID) {
    return "AI-assisted scoring completed. A deterministic summary was used because AI commentary was unavailable.";
  }
  if (narrativeSource === "openrouter") {
    return "Evaluation completed using deterministic scoring with AI-generated commentary.";
  }
  return "Evaluation completed using deterministic scoring because AI analysis was unavailable.";
}

export function getEvaluationCompletionTone({
  scoringMode,
  narrativeSource,
}: {
  scoringMode: EvaluationSource;
  narrativeSource: NarrativeSource;
}) {
  return scoringMode === EvaluationSource.HYBRID && narrativeSource === "openrouter"
    ? "success"
    : "info";
}
