import { EvaluationSource } from "@prisma/client";
import { getEvaluationCompletionMessage, getEvaluationCompletionTone, type NarrativeSource } from "@/lib/evaluations/outcome";

export type EvaluationActionState =
  | {
      status: "idle";
      message?: undefined;
      evaluationId?: undefined;
      tone?: undefined;
    }
  | {
      status: "success";
      message: string;
      evaluationId: string;
      tone: "success" | "info";
    }
  | {
      status: "error";
      message: string;
      evaluationId?: undefined;
      tone?: undefined;
    };

export const initialEvaluationActionState: EvaluationActionState = { status: "idle" };

export function createEvaluationSuccessState({
  evaluationId,
  source,
  narrativeSource,
}: {
  evaluationId: string;
  source: EvaluationSource;
  narrativeSource: NarrativeSource;
}): EvaluationActionState {
  return {
    status: "success",
    message: getEvaluationCompletionMessage({ scoringMode: source, narrativeSource }),
    evaluationId,
    tone: getEvaluationCompletionTone({ scoringMode: source, narrativeSource }),
  };
}

export function createEvaluationErrorState(message: string): EvaluationActionState {
  return {
    status: "error",
    message,
  };
}

export function getEvaluationActionTone(state: EvaluationActionState) {
  if (state.status === "error") {
    return "error";
  }

  if (state.status === "success") return state.tone;

  return "idle";
}
