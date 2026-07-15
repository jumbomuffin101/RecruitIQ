import { InterviewSignal, RequirementMatchStatus } from "@prisma/client";

export type InterviewValidationOutcome = "CONFIRMED" | "WEAKENED" | "UNRESOLVED";

export function getInterviewValidationOutcome({
  screeningStatus,
  rating,
  signal,
}: {
  screeningStatus: RequirementMatchStatus | null;
  rating: number | null;
  signal: InterviewSignal | null;
}): InterviewValidationOutcome {
  if (screeningStatus === null && rating === null && signal === null) return "UNRESOLVED";
  const positive = rating !== null && rating >= 4 || signal === "POSITIVE" || signal === "STRONG_POSITIVE";
  const negative = rating !== null && rating <= 2 || signal === "NEGATIVE" || signal === "STRONG_NEGATIVE";
  if (positive) return "CONFIRMED";
  if (negative) return "WEAKENED";
  return "UNRESOLVED";
}

export function getValidationSummary(outcomes: InterviewValidationOutcome[]) {
  const confirmed = outcomes.filter((outcome) => outcome === "CONFIRMED").length;
  const weakened = outcomes.filter((outcome) => outcome === "WEAKENED").length;
  const unresolved = outcomes.filter((outcome) => outcome === "UNRESOLVED").length;
  return { confirmed, weakened, unresolved };
}
