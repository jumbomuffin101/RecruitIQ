import { EvaluationSource } from "@prisma/client";

export type EvaluationActionState =
  | {
      status: "idle";
      message?: undefined;
      evaluationId?: undefined;
      usedFallback?: undefined;
    }
  | {
      status: "success";
      message: string;
      evaluationId: string;
      usedFallback: boolean;
    }
  | {
      status: "error";
      message: string;
      evaluationId?: undefined;
      usedFallback?: undefined;
    };

export const initialEvaluationActionState: EvaluationActionState = { status: "idle" };

export function createEvaluationSuccessState({
  evaluationId,
  source,
}: {
  evaluationId: string;
  source: EvaluationSource;
}): EvaluationActionState {
  const usedFallback = source !== EvaluationSource.HYBRID;

  return {
    status: "success",
    message: usedFallback
      ? "Evaluation completed using deterministic scoring because AI commentary was unavailable."
      : "Candidate evaluation completed.",
    evaluationId,
    usedFallback,
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

  if (state.status === "success" && state.usedFallback) {
    return "info";
  }

  if (state.status === "success") {
    return "success";
  }

  return "idle";
}
