import {
  AiRequirementAssessment,
  InterviewCriterionType,
  InterviewScorecardStatus,
  InterviewSignal,
  RequirementMatchStatus,
} from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

export type InterviewScorecardActionState =
  | { status: "idle"; message?: undefined; scorecardId?: undefined }
  | { status: "success"; message: string; scorecardId: string }
  | { status: "error"; message: string; scorecardId?: undefined };

export const initialInterviewScorecardActionState: InterviewScorecardActionState = { status: "idle" };

const signalForRating: Record<number, InterviewSignal> = {
  1: InterviewSignal.STRONG_NEGATIVE,
  2: InterviewSignal.NEGATIVE,
  3: InterviewSignal.NEUTRAL,
  4: InterviewSignal.POSITIVE,
  5: InterviewSignal.STRONG_POSITIVE,
};

function questionForRequirement(text: string, status: RequirementMatchStatus) {
  if (status === RequirementMatchStatus.MISSING) {
    return `What direct experience do you have with ${text}? Describe the context, your ownership, and the outcome.`;
  }
  if (status === RequirementMatchStatus.PARTIAL) {
    return `Walk us through the strongest example of ${text} from your recent work. What was your specific contribution and how did you measure success?`;
  }
  return `Tell us about a recent situation where you applied ${text}. What tradeoffs did you make and what did you learn?`;
}

function guidanceForRequirement({
  status,
  evidence,
}: {
  status: RequirementMatchStatus;
  evidence?: string;
}) {
  const screeningSignal =
    status === RequirementMatchStatus.MATCHED
      ? "The resume indicates a match. Confirm depth, ownership, and recency."
      : status === RequirementMatchStatus.PARTIAL
        ? "The resume has partial support. Clarify scope and direct contribution."
        : "The resume has no supporting evidence. Treat this as an open validation area, not a negative conclusion.";
  return evidence ? `${screeningSignal} Resume evidence: “${evidence.slice(0, 220)}”` : screeningSignal;
}

export async function createInterviewScorecard({
  candidateId,
  jobId,
  evaluationId,
}: {
  candidateId: string;
  jobId: string;
  evaluationId: string;
}) {
  const prisma = getPrisma();
  const evaluation = await prisma.candidateEvaluation.findUnique({
    where: { id: evaluationId },
    include: {
      requirementResults: {
        orderBy: { createdAt: "asc" },
        include: { evidence: { orderBy: { createdAt: "asc" }, take: 1 } },
      },
    },
  });

  if (!evaluation || evaluation.candidateId !== candidateId || evaluation.jobId !== jobId) {
    throw new Error("A completed evaluation is required before creating an interview scorecard.");
  }

  const previousCount = await prisma.interviewScorecard.count({ where: { candidateId, jobId } });
  const requirements = [...evaluation.requirementResults].sort((left, right) => {
    const priority = (result: (typeof evaluation.requirementResults)[number]) =>
      (result.requirementIsCritical ? 8 : 0)
      + (result.status === RequirementMatchStatus.MISSING ? 5 : result.status === RequirementMatchStatus.PARTIAL ? 3 : 0)
      + (result.aiAssessment === AiRequirementAssessment.WEAK_EVIDENCE ? 3 : 0)
      + (result.aiConfidence !== null && result.aiConfidence < 0.5 ? 2 : 0);
    return priority(right) - priority(left);
  });
  if (!requirements.length) {
    throw new Error("The selected evaluation has no requirement results to validate.");
  }

  return prisma.interviewScorecard.create({
    data: {
      candidateId,
      jobId,
      evaluationId,
      status: InterviewScorecardStatus.DRAFT,
      version: `scorecard-v${previousCount + 1}`,
      criteria: {
        create: requirements.map((result, index) => {
          const requirementText = result.requirementText || "Role requirement";
          return {
            requirementResultId: result.id,
            requirementText,
            type: InterviewCriterionType.REQUIREMENT_VALIDATION,
            title: `Validate: ${requirementText}`,
            question: questionForRequirement(requirementText, result.status),
            evaluationGuidance: guidanceForRequirement({
              status: result.status,
              evidence: result.evidence[0]?.excerpt,
            }),
            weight: Math.max(1, result.maxScore),
            sortOrder: index,
          };
        }),
      },
    },
  });
}

export function getInterviewSignalForRating(rating: number | null) {
  return rating ? signalForRating[rating] : null;
}

export function isSubstantiveInterviewResponse({
  rating,
  signal,
  notes,
  evidence,
}: {
  rating: number | null;
  signal: InterviewSignal | null;
  notes: string | null;
  evidence: string | null;
}) {
  return Boolean(rating || signal || notes?.trim() || evidence?.trim());
}
