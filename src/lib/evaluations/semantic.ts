import { AiRequirementAssessment } from "@prisma/client";
import { z } from "zod";
import { PROMPT_VERSION } from "@/lib/evaluations/constants";
import { logger } from "@/lib/logger";
import { callOpenRouterJsonWithStatus, getOpenRouterModelName } from "@/lib/openrouter";
import type { CandidateForEvaluation, GroundedAiEvidence, JobForEvaluation, RequirementForScoring, RequirementScore, SemanticRequirementAssessment } from "@/lib/evaluations/types";

const MAX_EVIDENCE_PER_REQUIREMENT = 2;

const semanticResponseSchema = z.object({
  assessments: z.array(z.object({
    requirementId: z.string().trim().min(1).max(100),
    assessment: z.nativeEnum(AiRequirementAssessment),
    confidence: z.number().min(0).max(1),
    evidence: z.array(z.object({
      excerpt: z.string().trim().min(6).max(500),
      resumeSection: z.string().trim().min(2).max(80).optional(),
    })).max(MAX_EVIDENCE_PER_REQUIREMENT),
    explanation: z.string().trim().min(8).max(500),
  })).max(24),
});

type SemanticResponse = z.infer<typeof semanticResponseSchema>;

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function groundExcerpt(resumeText: string, excerpt: string, resumeSection?: string): GroundedAiEvidence | null {
  const normalizedExcerpt = normalize(excerpt);
  if (normalizedExcerpt.length < 6 || !normalize(resumeText).includes(normalizedExcerpt)) return null;

  const tokens = normalizedExcerpt.split(" ").filter((token) => token.length > 1);
  const pattern = tokens.map(escapeRegex).join("[^a-z0-9]+");
  const match = new RegExp(pattern, "i").exec(resumeText);
  if (!match || match.index === undefined) return null;

  return {
    excerpt: match[0],
    resumeSection,
    startOffset: match.index,
    endOffset: match.index + match[0].length,
  };
}

export function validateSemanticRequirementResponse({
  value,
  requirements,
  resumeText,
}: {
  value: unknown;
  requirements: RequirementForScoring[];
  resumeText: string;
}): { success: true; assessments: SemanticRequirementAssessment[] } | { success: false; reason: string } {
  const parsed = semanticResponseSchema.safeParse(value);
  if (!parsed.success) return { success: false, reason: "schema_validation" };

  const validIds = new Set(requirements.map((requirement) => requirement.id));
  const ids = parsed.data.assessments.map((assessment) => assessment.requirementId);
  if (ids.some((id) => !validIds.has(id))) return { success: false, reason: "unknown_requirement_id" };
  if (new Set(ids).size !== ids.length) return { success: false, reason: "duplicate_requirement_id" };
  if (ids.length !== validIds.size) return { success: false, reason: "missing_requirement_assessment" };

  const assessments = parsed.data.assessments.map((assessment) => {
    const evidence = assessment.evidence
      .map((item) => groundExcerpt(resumeText, item.excerpt, item.resumeSection))
      .filter((item): item is GroundedAiEvidence => Boolean(item));
    return {
      requirementId: assessment.requirementId,
      assessment: evidence.length ? assessment.assessment : AiRequirementAssessment.NO_EVIDENCE,
      confidence: assessment.confidence,
      explanation: assessment.explanation,
      evidence,
    };
  });

  return { success: true, assessments };
}

function truncate(value: string | null | undefined, length: number) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, length);
}

export async function evaluateRequirementsSemantically({
  candidate,
  job,
  requirements,
  deterministicScores,
  evaluationId,
  operationId,
  organizationId,
}: {
  candidate: CandidateForEvaluation;
  job: JobForEvaluation;
  requirements: RequirementForScoring[];
  deterministicScores: RequirementScore[];
  evaluationId: string;
  operationId: string;
  organizationId: string;
}) {
  logger.info("hybrid_scoring_started", { evaluationId, operationId, organizationId, resourceType: "candidate", model: getOpenRouterModelName(), promptVersion: PROMPT_VERSION, reason: "semantic_requirement_evaluation" });
  const result = await callOpenRouterJsonWithStatus<SemanticResponse>({
    context: "semantic requirement evaluation",
    temperature: 0.1,
    maxTokens: 1800,
    timeoutMs: 55_000,
    retries: 1,
    systemPrompt: "You are RecruitIQ's evidence evaluator. Return strict JSON only. Assess supplied resume evidence; do not invent facts, scores, hiring decisions, or requirements.",
    prompt: "Assess every requirement independently. Use only the supplied candidate profile and resume text. Absence of evidence is not proof of absence. Cite exact resume excerpts for any assessment above NO_EVIDENCE. Do not produce a final score or hiring recommendation. Preserve every requirement ID exactly.",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        assessments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              requirementId: { type: "string" },
              assessment: { type: "string", enum: Object.values(AiRequirementAssessment) },
              confidence: { type: "number", minimum: 0, maximum: 1 },
              evidence: { type: "array", maxItems: MAX_EVIDENCE_PER_REQUIREMENT, items: { type: "object", properties: { excerpt: { type: "string" }, resumeSection: { type: "string" } }, required: ["excerpt"], additionalProperties: false } },
              explanation: { type: "string" },
            },
            required: ["requirementId", "assessment", "confidence", "evidence", "explanation"],
            additionalProperties: false,
          },
        },
      },
      required: ["assessments"],
    },
    input: {
      job: { title: job.title },
      requirements: requirements.map((requirement) => ({ id: requirement.id, text: requirement.text, type: requirement.type, category: requirement.category, weight: requirement.weight, critical: requirement.isCritical })),
      deterministicEvidenceCandidates: deterministicScores.map((score) => ({ requirementId: score.requirementId, status: score.status, matchedKeywords: score.matchedKeywords })),
      candidate: {
        skills: candidate.skills.slice(0, 30),
        currentTitle: candidate.currentTitle,
        currentCompany: candidate.currentCompany,
        experienceSummary: truncate(candidate.experienceSummary, 1200),
        educationSummary: truncate(candidate.educationSummary, 600),
        projectsSummary: truncate(candidate.projectsSummary, 900),
        resumeText: truncate(candidate.resumeText, 8000),
      },
    },
  });

  if (!result.ok) {
    logger.warn("hybrid_scoring_fallback", { evaluationId, operationId, organizationId, resourceType: "candidate", model: result.model, promptVersion: PROMPT_VERSION, reason: result.reason, status: result.status, errorCode: result.errorCode, errorMessage: result.errorMessage });
    return { usedAi: false as const, assessments: [] as SemanticRequirementAssessment[], reason: result.reason };
  }

  const validated = validateSemanticRequirementResponse({ value: result.data, requirements, resumeText: candidate.resumeText });
  if (!validated.success) {
    logger.warn("invalid_ai_requirement_assessment", { evaluationId, operationId, organizationId, resourceType: "candidate", model: result.model, promptVersion: PROMPT_VERSION, reason: validated.reason });
    return { usedAi: false as const, assessments: [] as SemanticRequirementAssessment[], reason: validated.reason };
  }

  const ungrounded = result.data.assessments.reduce((count, assessment, index) => count + assessment.evidence.length - validated.assessments[index].evidence.length, 0);
  if (ungrounded > 0) logger.warn("ungrounded_ai_evidence", { evaluationId, operationId, organizationId, resourceType: "candidate", model: result.model, promptVersion: PROMPT_VERSION, reason: `${ungrounded}_discarded` });
  logger.info("hybrid_scoring_completed", { evaluationId, operationId, organizationId, resourceType: "candidate", model: result.model, promptVersion: PROMPT_VERSION, reason: "validated_semantic_assessments" });
  return { usedAi: true as const, assessments: validated.assessments, model: result.model };
}
