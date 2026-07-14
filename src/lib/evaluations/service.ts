import {
  ActivityType,
  EvaluationSource,
  EvaluationStatus,
  Prisma,
  RequirementMatchStatus,
} from "@prisma/client";
import { analyzeCandidateForJobWithFallback } from "@/lib/ai";
import { PROMPT_VERSION, SCORING_VERSION } from "@/lib/evaluations/constants";
import { collectEvidence } from "@/lib/evaluations/evidence";
import {
  calculateEvaluationScoreBreakdown,
  parseJobRequirementDrafts,
} from "@/lib/evaluations/scoring";
import type { RequirementForScoring } from "@/lib/evaluations/types";
import { getOpenRouterModelName } from "@/lib/openrouter";
import { getPrisma } from "@/lib/prisma";
import { getCandidateRecommendation } from "@/lib/recommendations";

type EvaluateCandidateForJobInput = {
  organizationId: string;
  candidateId: string;
  jobId: string;
};

export class EvaluationOwnershipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvaluationOwnershipError";
  }
}

function toRequirementForScoring(requirement: {
  id: string;
  text: string;
  type: RequirementForScoring["type"];
  category: RequirementForScoring["category"];
  weight: number;
  keywords: string[];
  sortOrder: number;
}) {
  return {
    id: requirement.id,
    text: requirement.text,
    type: requirement.type,
    category: requirement.category,
    weight: requirement.weight,
    keywords: requirement.keywords,
    sortOrder: requirement.sortOrder,
  };
}

async function ensureJobRequirements(job: { id: string; requirements: string }) {
  const prisma = getPrisma();
  const existing = await prisma.jobRequirement.findMany({
    where: { jobId: job.id },
    orderBy: { sortOrder: "asc" },
  });

  if (existing.length) {
    return existing.map(toRequirementForScoring);
  }

  const drafts = parseJobRequirementDrafts(job.requirements);
  if (!drafts.length) {
    return [];
  }

  await prisma.jobRequirement.createMany({
    data: drafts.map((draft) => ({
      jobId: job.id,
      text: draft.text,
      type: draft.type,
      category: draft.category,
      weight: draft.weight,
      keywords: draft.keywords,
      sortOrder: draft.sortOrder,
    })),
  });

  const created = await prisma.jobRequirement.findMany({
    where: { jobId: job.id },
    orderBy: { sortOrder: "asc" },
  });

  return created.map(toRequirementForScoring);
}

function safeErrorMessage(error: unknown) {
  if (error instanceof EvaluationOwnershipError) return error.message;
  if (error instanceof Error && error.message) return error.message.slice(0, 240);
  return "Evaluation failed before completion.";
}

export async function evaluateCandidateForJob({
  organizationId,
  candidateId,
  jobId,
}: EvaluateCandidateForJobInput) {
  const prisma = getPrisma();
  const [candidate, job] = await Promise.all([
    prisma.candidate.findFirst({
      where: { id: candidateId, organizationId },
      include: { applications: true },
    }),
    prisma.job.findFirst({
      where: { id: jobId, organizationId },
    }),
  ]);

  if (!candidate) {
    throw new EvaluationOwnershipError("Candidate not found in the active workspace.");
  }

  if (!job) {
    throw new EvaluationOwnershipError("Job not found in the active workspace.");
  }

  const requirements = await ensureJobRequirements(job);
  const pendingEvaluation = await prisma.candidateEvaluation.create({
    data: {
      candidateId: candidate.id,
      jobId: job.id,
      source: EvaluationSource.DETERMINISTIC,
      status: EvaluationStatus.PENDING,
      scoringVersion: SCORING_VERSION,
      promptVersion: PROMPT_VERSION,
    },
  });

  try {
    const analysis = await analyzeCandidateForJobWithFallback(candidate, job);
    const breakdown = calculateEvaluationScoreBreakdown({ candidate, job, requirements });
    const evidence = collectEvidence({
      resumeText: candidate.resumeText,
      requirements,
      scores: breakdown.requirementScores,
    });
    const recommendation = getCandidateRecommendation({
      fitScore: analysis.fitScore,
      currentStatus: candidate.status,
    });
    const source = analysis.source === "openrouter" ? EvaluationSource.HYBRID : EvaluationSource.DETERMINISTIC;
    const modelName = analysis.source === "openrouter" ? getOpenRouterModelName() : null;

    await prisma.$transaction(async (tx) => {
      await tx.candidateEvaluation.update({
        where: { id: pendingEvaluation.id },
        data: {
          overallScore: analysis.fitScore,
          confidence: breakdown.confidence,
          recommendation: recommendation.nextStep,
          summary: analysis.summary,
          source,
          status: EvaluationStatus.COMPLETED,
          scoringVersion: SCORING_VERSION,
          promptVersion: PROMPT_VERSION,
          modelName,
          completedAt: new Date(),
        },
      });

      await tx.evaluationCategoryScore.createMany({
        data: breakdown.categoryScores.map((category) => ({
          evaluationId: pendingEvaluation.id,
          category: category.category,
          score: category.score,
          maxScore: category.maxScore,
          weight: category.weight,
          explanation: category.explanation,
        })),
      });

      for (const score of breakdown.requirementScores) {
        const requirement = requirements.find((item) => item.id === score.requirementId);
        if (!requirement) continue;

        const createdResult = await tx.requirementResult.create({
          data: {
            evaluationId: pendingEvaluation.id,
            requirementId: requirement.id,
            status: score.status,
            score: score.score,
            maxScore: score.maxScore,
            confidence: score.confidence,
            explanation: score.explanation,
          },
        });
        const matchedEvidence = evidence.find((item) => item.requirementId === score.requirementId);

        if (matchedEvidence && score.status !== RequirementMatchStatus.MISSING) {
          await tx.evaluationEvidence.create({
            data: {
              evaluationId: pendingEvaluation.id,
              requirementResultId: createdResult.id,
              resumeSection: matchedEvidence.resumeSection,
              excerpt: matchedEvidence.excerpt,
              startOffset: matchedEvidence.startOffset,
              endOffset: matchedEvidence.endOffset,
              confidence: matchedEvidence.confidence,
            },
          });
        }
      }

      await tx.resumeAnalysis.create({
        data: {
          candidateId: candidate.id,
          jobId: job.id,
          fitScore: analysis.fitScore,
          summary: analysis.summary,
          roleMatch: analysis.roleMatch,
          strengths: analysis.strengths,
          gaps: analysis.gaps,
          recommendedStage: analysis.recommendedStage,
          nextStep: analysis.nextStep,
          technicalQuestions: analysis.technicalQuestions,
          behavioralQuestions: analysis.behavioralQuestions,
          resumeSpecificQuestions: analysis.resumeSpecificQuestions,
          source: analysis.source,
        },
      });

      await tx.interviewKit.create({
        data: {
          candidateId: candidate.id,
          jobId: job.id,
          questions: analysis.interviewQuestions,
          focusAreas: analysis.gaps,
        },
      });

      await tx.candidate.update({
        where: { id: candidate.id },
        data: { status: analysis.recommendedStage },
      });

      await tx.application.upsert({
        where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } },
        create: {
          organizationId,
          candidateId: candidate.id,
          jobId: job.id,
          status: analysis.recommendedStage,
          fitScore: analysis.fitScore,
        },
        update: {
          status: analysis.recommendedStage,
          fitScore: analysis.fitScore,
        },
      });

      await tx.activityLog.create({
        data: {
          organizationId,
          type: ActivityType.ANALYSIS_GENERATED,
          message: `Evaluation generated for ${candidate.name}.`,
          metadata: {
            candidateId: candidate.id,
            jobId: job.id,
            evaluationId: pendingEvaluation.id,
            fitScore: analysis.fitScore,
            source: analysis.source,
          } satisfies Prisma.InputJsonObject,
        },
      });
    });

    return prisma.candidateEvaluation.findUniqueOrThrow({
      where: { id: pendingEvaluation.id },
      include: {
        job: true,
        categories: true,
        requirementResults: {
          include: {
            requirement: true,
            evidence: true,
          },
        },
        evidence: true,
      },
    });
  } catch (error) {
    await prisma.candidateEvaluation.update({
      where: { id: pendingEvaluation.id },
      data: {
        status: EvaluationStatus.FAILED,
        errorMessage: safeErrorMessage(error),
      },
    });
    throw error;
  }
}
