import {
  ActivityType,
  ApplicationStatus,
  EvaluationSource,
  EvaluationStatus,
  JobEvaluationRubric,
  Prisma,
} from "@prisma/client";
import { analyzeCandidateForJobWithFallback } from "@/lib/ai";
import { DEFAULT_RUBRIC_WEIGHTS, PROMPT_VERSION, SCORING_VERSION } from "@/lib/evaluations/constants";
import { collectEvidence } from "@/lib/evaluations/evidence";
import { evaluateRequirementsSemantically } from "@/lib/evaluations/semantic";
import {
  calculateEvaluationScoreBreakdown,
  parseJobRequirementDrafts,
} from "@/lib/evaluations/scoring";
import type { RequirementForScoring, RubricWeights } from "@/lib/evaluations/types";
import { getOpenRouterModelName } from "@/lib/openrouter";
import { getPrisma } from "@/lib/prisma";
import { getCandidateRecommendation } from "@/lib/recommendations";
import { createOperationId, logger } from "@/lib/logger";

type EvaluateCandidateForJobInput = {
  organizationId: string;
  candidateId: string;
  jobId: string;
  actorUserId?: string;
};

export type EvaluateCandidateForJobResult = {
  evaluationId: string;
  source: EvaluationSource;
  usedFallback: boolean;
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
  isCritical: boolean;
  sortOrder: number;
}) {
  return {
    id: requirement.id,
    text: requirement.text,
    type: requirement.type,
    category: requirement.category,
    weight: requirement.weight,
    keywords: requirement.keywords,
    isCritical: requirement.isCritical,
    sortOrder: requirement.sortOrder,
  };
}

function rubricToWeights(rubric: JobEvaluationRubric | null | undefined): RubricWeights {
  if (!rubric) return DEFAULT_RUBRIC_WEIGHTS;

  return {
    REQUIRED_SKILLS: rubric.requiredSkillsWeight,
    PREFERRED_QUALIFICATIONS: rubric.preferredWeight,
    RELEVANT_EXPERIENCE: rubric.experienceWeight,
    PROJECT_ALIGNMENT: rubric.projectWeight,
    EDUCATION: rubric.educationWeight,
    DOMAIN_ALIGNMENT: rubric.domainWeight,
  };
}

async function ensureJobRubric(jobId: string) {
  const prisma = getPrisma();
  const existing = await prisma.jobEvaluationRubric.findUnique({ where: { jobId } });
  if (existing) return existing;

  return prisma.jobEvaluationRubric.create({
    data: {
      jobId,
      requiredSkillsWeight: DEFAULT_RUBRIC_WEIGHTS.REQUIRED_SKILLS,
      preferredWeight: DEFAULT_RUBRIC_WEIGHTS.PREFERRED_QUALIFICATIONS,
      experienceWeight: DEFAULT_RUBRIC_WEIGHTS.RELEVANT_EXPERIENCE,
      projectWeight: DEFAULT_RUBRIC_WEIGHTS.PROJECT_ALIGNMENT,
      educationWeight: DEFAULT_RUBRIC_WEIGHTS.EDUCATION,
      domainWeight: DEFAULT_RUBRIC_WEIGHTS.DOMAIN_ALIGNMENT,
    },
  });
}

function buildRubricSnapshot({
  rubric,
  requirements,
}: {
  rubric: JobEvaluationRubric;
  requirements: RequirementForScoring[];
}) {
  return {
    scoringVersion: SCORING_VERSION,
    rubricVersion: rubric.version,
    categoryWeights: rubricToWeights(rubric),
    requirements: requirements.map((requirement) => ({
      id: requirement.id,
      text: requirement.text,
      type: requirement.type,
      category: requirement.category,
      weight: requirement.weight,
      keywords: requirement.keywords,
      isCritical: requirement.isCritical,
      sortOrder: requirement.sortOrder,
    })),
  } satisfies Prisma.InputJsonObject;
}

async function ensureJobRequirements(job: { id: string; requirements: string }) {
  const prisma = getPrisma();
  const existing = await prisma.jobRequirement.findMany({
    where: { jobId: job.id, deletedAt: null },
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
      isCritical: draft.isCritical,
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
  actorUserId,
}: EvaluateCandidateForJobInput): Promise<EvaluateCandidateForJobResult> {
  const operationId = createOperationId();
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
  const rubric = await ensureJobRubric(job.id);
  const rubricWeights = rubricToWeights(rubric);
  const rubricSnapshot = buildRubricSnapshot({ rubric, requirements });
  const pendingEvaluation = await prisma.candidateEvaluation.create({
    data: {
      candidateId: candidate.id,
      jobId: job.id,
      source: EvaluationSource.DETERMINISTIC,
      status: EvaluationStatus.PENDING,
      scoringVersion: SCORING_VERSION,
      promptVersion: PROMPT_VERSION,
      rubricSnapshot,
    },
  });

  try {
    const deterministicBreakdown = calculateEvaluationScoreBreakdown({ candidate, job, requirements, rubric: rubricWeights });
    const semantic = await evaluateRequirementsSemantically({
      candidate,
      job,
      requirements,
      deterministicScores: deterministicBreakdown.requirementScores,
      evaluationId: pendingEvaluation.id,
      operationId,
      organizationId,
    });
    const breakdown = calculateEvaluationScoreBreakdown({
      candidate,
      job,
      requirements,
      rubric: rubricWeights,
      semanticAssessments: semantic.assessments,
    });
    const analysis = await analyzeCandidateForJobWithFallback(candidate, job, {
      requirements,
      rubric: rubricWeights,
      breakdown,
    });
    if (process.env.NODE_ENV !== "production") {
      logger.info("candidate_evaluation_score_trace", {
        operationId,
        userId: actorUserId,
        organizationId,
        resourceType: "candidate",
        resourceId: candidate.id,
        scoreTrace: breakdown.scoreTrace,
      });
    }
    const deterministicEvidence = collectEvidence({
      resumeText: candidate.resumeText,
      requirements,
      scores: breakdown.requirementScores,
    });
    const aiEvidence = breakdown.requirementScores.flatMap((score) => score.aiEvidence.map((evidence) => ({
      requirementId: score.requirementId,
      resumeSection: evidence.resumeSection ?? null,
      excerpt: evidence.excerpt,
      startOffset: evidence.startOffset,
      endOffset: evidence.endOffset,
      confidence: score.aiConfidence ?? score.confidence,
    })));
    const evidence = [...deterministicEvidence, ...aiEvidence];
    const recommendation = getCandidateRecommendation({
      fitScore: breakdown.overallScore,
      currentStatus: candidate.applications.find((application) => application.jobId === job.id)?.status ?? ApplicationStatus.APPLIED,
    });
    const recommendedStage =
      breakdown.hasMissingCritical && ["INTERVIEW", "OFFER"].includes(recommendation.recommendedStage)
        ? "SCREENED"
        : recommendation.recommendedStage;
    const nextStep = breakdown.hasMissingCritical ? "Recruiter review required" : recommendation.nextStep;
    const source = semantic.usedAi ? EvaluationSource.HYBRID : EvaluationSource.DETERMINISTIC;
    const modelName = semantic.usedAi ? semantic.model : analysis.source === "openrouter" ? getOpenRouterModelName() : null;

    await prisma.$transaction(async (tx) => {
      await tx.candidateEvaluation.update({
        where: { id: pendingEvaluation.id },
        data: {
          overallScore: breakdown.overallScore,
          confidence: breakdown.confidence,
          recommendation: nextStep,
          summary: analysis.summary,
          source,
          status: EvaluationStatus.COMPLETED,
          scoringVersion: SCORING_VERSION,
          promptVersion: PROMPT_VERSION,
          modelName,
          rubricSnapshot,
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
            deterministicStatus: score.deterministicStatus,
            aiAssessment: score.aiAssessment,
            aiConfidence: score.aiConfidence,
            aiExplanation: score.aiExplanation,
            score: score.score,
            maxScore: score.maxScore,
            confidence: score.confidence,
            explanation: score.explanation,
            requirementText: requirement.text,
            requirementType: requirement.type,
            requirementCategory: requirement.category,
            requirementWeight: requirement.weight,
            requirementIsCritical: requirement.isCritical,
          },
        });
        const matchedEvidence = evidence.filter((item) => item.requirementId === score.requirementId);

        for (const item of matchedEvidence) {
          await tx.evaluationEvidence.create({
            data: {
              evaluationId: pendingEvaluation.id,
              requirementResultId: createdResult.id,
              resumeSection: item.resumeSection,
              excerpt: item.excerpt,
              startOffset: item.startOffset,
              endOffset: item.endOffset,
              confidence: item.confidence,
            },
          });
        }
      }

      await tx.resumeAnalysis.create({
        data: {
          candidateId: candidate.id,
          jobId: job.id,
          fitScore: breakdown.overallScore,
          summary: analysis.summary,
          roleMatch: analysis.roleMatch,
          strengths: analysis.strengths,
          gaps: analysis.gaps,
          recommendedStage: recommendedStage,
          nextStep,
          technicalQuestions: analysis.technicalQuestions,
          behavioralQuestions: analysis.behavioralQuestions,
          resumeSpecificQuestions: analysis.resumeSpecificQuestions,
          source: semantic.usedAi ? "openrouter" : analysis.source,
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

      const existingApplication = candidate.applications.find((application) => application.jobId === job.id);
      if (existingApplication) {
        await tx.application.update({ where: { id: existingApplication.id }, data: { fitScore: breakdown.overallScore } });
      } else {
        const application = await tx.application.create({
          data: {
          organizationId,
          candidateId: candidate.id,
          jobId: job.id,
          status: ApplicationStatus.APPLIED,
          fitScore: breakdown.overallScore,
        },
        });
        await tx.applicationStatusHistory.create({
          data: { applicationId: application.id, toStatus: ApplicationStatus.APPLIED, note: "Application created during job-specific evaluation.", changedByUserId: actorUserId },
        });
      }

      await tx.activityLog.create({
        data: {
          organizationId,
          actorUserId,
          type: ActivityType.ANALYSIS_GENERATED,
          message: `Evaluation generated for ${candidate.name}.`,
          metadata: {
            candidateId: candidate.id,
            jobId: job.id,
            evaluationId: pendingEvaluation.id,
            fitScore: breakdown.overallScore,
            source: source === EvaluationSource.HYBRID ? "hybrid" : "deterministic",
            rubricVersion: rubric.version,
            hasMissingCritical: breakdown.hasMissingCritical,
          } satisfies Prisma.InputJsonObject,
        },
      });
    });

    logger.info("candidate_evaluation_completed", { operationId, userId: actorUserId, organizationId, resourceType: "candidate", resourceId: candidate.id, status: "completed" });
    return {
      evaluationId: pendingEvaluation.id,
      source,
      usedFallback: source !== EvaluationSource.HYBRID,
    };
  } catch (error) {
    logger.error("candidate_evaluation_failed", { operationId, userId: actorUserId, organizationId, resourceType: "candidate", resourceId: candidateId, reason: error instanceof Error ? error.name : "unknown" });
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
