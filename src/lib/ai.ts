import { PROMPT_VERSION } from "@/lib/evaluations/constants";
import type { NarrativeStatus } from "@/lib/evaluations/outcome";
import { validateCandidateAnalysisResponse } from "@/lib/evaluations/schemas";
import { calculateEvaluationScoreBreakdown, parseJobRequirementDrafts } from "@/lib/evaluations/scoring";
import type { EvaluationScoreBreakdown, RequirementForScoring, RubricWeights } from "@/lib/evaluations/types";
import { RequirementMatchStatus } from "@prisma/client";
import { callOpenRouterJsonWithStatus } from "@/lib/openrouter";
import { logger } from "@/lib/logger";
import { getCandidateRecommendation, getDeterministicFitBand } from "@/lib/recommendations";

type CandidateLike = {
  name: string;
  skills: string[];
  resumeText: string;
  resumeSummary?: string | null;
  experienceSummary: string;
  educationSummary?: string | null;
  currentTitle?: string | null;
  currentCompany?: string | null;
  projectsSummary?: string | null;
  status?: string | null;
};

type JobLike = {
  title: string;
  description: string;
  requirements: string;
};

export type CandidateAnalysisResult = {
  fitScore: number;
  summary: string;
  roleMatch: string;
  strengths: string[];
  gaps: string[];
  recommendedStage: "APPLIED" | "SCREENED" | "INTERVIEW" | "OFFER" | "REJECTED";
  nextStep: string;
  technicalQuestions: string[];
  behavioralQuestions: string[];
  resumeSpecificQuestions: string[];
  interviewQuestions: string[];
};

type OpenRouterAnalysisResult = {
  summary: string;
  roleMatch: string;
  strengths: string[];
  gaps: string[];
  nextStep: string;
  technicalQuestions: string[];
  behavioralQuestions: string[];
  resumeSpecificQuestions: string[];
};

type AnalysisWithSource = CandidateAnalysisResult & {
  source: "openrouter" | "deterministic";
  status: NarrativeStatus;
  reason: string;
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function cleanText(value: unknown, fallback: string, maxLength = 900) {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return (text || fallback).slice(0, maxLength);
}

function cleanList(value: unknown, fallback: string[], maxItems: number) {
  const items = Array.isArray(value)
    ? value.map((item) => String(item).replace(/\s+/g, " ").trim()).filter(Boolean)
    : [];
  return (items.length ? items : fallback).slice(0, maxItems);
}

function truncateText(value: string | null | undefined, maxLength: number) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

type AnalysisInput = {
  requirements?: RequirementForScoring[];
  rubric?: RubricWeights;
  breakdown?: EvaluationScoreBreakdown;
};

function buildInterviewQuestions(
  technicalQuestions: string[],
  behavioralQuestions: string[],
  resumeSpecificQuestions: string[],
) {
  return [...technicalQuestions, ...behavioralQuestions, ...resumeSpecificQuestions].slice(0, 9);
}

export function analyzeCandidateForJob(
  candidate: CandidateLike,
  job: JobLike,
  input: AnalysisInput = {},
): CandidateAnalysisResult {
  const requirements = input.requirements?.length
    ? input.requirements
    : parseJobRequirementDrafts(job.requirements).map((requirement, index) => ({ ...requirement, id: `derived-${index}` }));
  const breakdown = input.breakdown ?? calculateEvaluationScoreBreakdown({
    candidate,
    job,
    requirements,
    rubric: input.rubric,
  });
  const requirementById = new Map(requirements.map((requirement) => [requirement.id, requirement]));
  const matchedScores = breakdown.requirementScores.filter((score) => score.status !== RequirementMatchStatus.MISSING);
  const missingScores = breakdown.requirementScores.filter((score) => score.status === RequirementMatchStatus.MISSING);
  const primaryMatches = unique(matchedScores.flatMap((score) => score.matchedKeywords)).slice(0, 4);
  const matchedRequirementText = unique(
    matchedScores.map((score) => requirementById.get(score.requirementId)?.text ?? ""),
  ).slice(0, 3);
  const missingRequirementText = unique(
    missingScores.map((score) => requirementById.get(score.requirementId)?.text ?? ""),
  ).slice(0, 3);
  const fitScore = breakdown.overallScore;
  const fitBand = getDeterministicFitBand(fitScore);

  const recommendation = getCandidateRecommendation({
    fitScore,
    currentStatus: candidate.status,
  });
  const recommendedStage = recommendation.recommendedStage;

  const strengths = [
    primaryMatches.length
      ? `Matched requirement evidence: ${primaryMatches.join(", ")}.`
      : "No directly matched structured requirements were found in the submitted profile.",
    matchedRequirementText.length
      ? `Supporting qualifications include ${matchedRequirementText.join("; ")}.`
      : "Recruiter validation is needed before relying on transferable experience.",
    breakdown.hasMissingCritical
      ? "A critical requirement is missing and should be validated before advancing."
      : "The evaluation is based on the job's structured requirements and rubric.",
  ];

  const gaps = missingRequirementText.length
    ? missingRequirementText.map((requirement) => `Needs validation around ${requirement}.`)
    : ["No major gaps detected from the provided resume text."];

  const focusSkill = primaryMatches[0] ?? matchedRequirementText[0] ?? job.title;
  const gapFocus = missingRequirementText[0] ?? "role-specific execution";
  const technicalQuestions = [
    `Walk me through a project where you used ${focusSkill} to create a measurable outcome.`,
    `How would you approach the first technical deliverable for this ${job.title} role?`,
  ];
  const behavioralQuestions = [
    "Tell us about a time you worked through ambiguity with a lean team.",
    "How do you communicate tradeoffs when priorities change quickly?",
  ];
  const resumeSpecificQuestions = [
    `What would you need to learn or clarify first to be effective in this ${job.title} role?`,
    `How would you close the gap around ${gapFocus} in your first 30 days?`,
    `Which part of your recent experience best maps to ${job.title}, and why?`,
  ];

  return {
    fitScore,
    summary: `${candidate.name} shows ${fitBand.summaryPhrase} for ${job.title}. The ${fitScore}/100 score is derived from matched structured requirements, weighted category contributions, and unresolved gaps.`,
    roleMatch: primaryMatches.length
      ? `${candidate.name} directly matches ${primaryMatches.join(", ")} in the ${job.title} requirements.`
      : `${candidate.name} has no verified direct match against the structured requirements yet.`,
    strengths,
    gaps,
    recommendedStage,
    nextStep: recommendation.nextStep,
    technicalQuestions,
    behavioralQuestions,
    resumeSpecificQuestions,
    interviewQuestions: buildInterviewQuestions(technicalQuestions, behavioralQuestions, resumeSpecificQuestions),
  };
}

function normalizeAnalysis(
  value: Partial<OpenRouterAnalysisResult>,
  deterministic: CandidateAnalysisResult,
): CandidateAnalysisResult {
  const technicalQuestions = cleanList(value.technicalQuestions, deterministic.technicalQuestions, 4);
  const behavioralQuestions = cleanList(value.behavioralQuestions, deterministic.behavioralQuestions, 4);
  const resumeSpecificQuestions = cleanList(value.resumeSpecificQuestions, deterministic.resumeSpecificQuestions, 4);

  return {
    fitScore: deterministic.fitScore,
    summary: cleanText(value.summary, deterministic.summary),
    roleMatch: cleanText(value.roleMatch, deterministic.roleMatch),
    strengths: cleanList(value.strengths, deterministic.strengths, 5),
    gaps: cleanList(value.gaps, deterministic.gaps, 5),
    recommendedStage: deterministic.recommendedStage,
    nextStep: deterministic.nextStep,
    technicalQuestions,
    behavioralQuestions,
    resumeSpecificQuestions,
    interviewQuestions: buildInterviewQuestions(technicalQuestions, behavioralQuestions, resumeSpecificQuestions),
  };
}

async function analyzeWithOpenRouter(
  candidate: CandidateLike,
  job: JobLike,
  deterministic: CandidateAnalysisResult,
): Promise<{ analysis: CandidateAnalysisResult; status: "success"; reason: "validated" } | { analysis: null; status: Exclude<NarrativeStatus, "success">; reason: string }> {
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: { type: "string" },
      roleMatch: { type: "string" },
      strengths: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
      gaps: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
      nextStep: { type: "string" },
      technicalQuestions: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
      behavioralQuestions: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
      resumeSpecificQuestions: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
    },
    required: [
      "summary",
      "roleMatch",
      "strengths",
      "gaps",
      "nextStep",
      "technicalQuestions",
      "behavioralQuestions",
      "resumeSpecificQuestions",
    ],
  };

  const result = await callOpenRouterJsonWithStatus<OpenRouterAnalysisResult>({
    context: "candidate analysis",
    schema,
    temperature: 0.2,
    maxTokens: 1500,
    timeoutMs: 55_000,
    retries: 1,
    systemPrompt:
      "You are RecruitIQ, a careful AI recruiting copilot. Return strict JSON only. Be concise, recruiter-friendly, and evidence-based. Do not invent employers, degrees, dates, or credentials.",
    prompt:
      `Create an executive candidate summary, role match explanation, strengths, risks or gaps, suggested next step, and interview kit. Prompt version: ${PROMPT_VERSION}. Explain the deterministic score; do not create a new score or override the deterministic recommendation.`,
    input: {
      deterministicFitScore: deterministic.fitScore,
      deterministicRecommendedStage: deterministic.recommendedStage,
      deterministicNextStep: deterministic.nextStep,
      candidate: {
        name: candidate.name,
        currentTitle: candidate.currentTitle,
        currentCompany: candidate.currentCompany,
        skills: candidate.skills.slice(0, 24),
        resumeSummary: truncateText(candidate.resumeSummary, 900),
        experienceSummary: truncateText(candidate.experienceSummary, 1200),
        educationSummary: truncateText(candidate.educationSummary, 600),
        projectsSummary: truncateText(candidate.projectsSummary, 800),
        resumeTextExcerpt: truncateText(candidate.resumeText, 7000),
      },
      job: {
        title: job.title,
        description: truncateText(job.description, 2000),
        requirements: truncateText(job.requirements, 2000),
      },
    },
  });

  if (!result.ok) {
    logger.warn("candidate_analysis_openrouter_fallback", {
      resourceType: "candidate_analysis",
      status: result.status,
      reason: result.reason,
    });
    return { analysis: null, status: result.reason === "invalid_json" ? "invalid_output" : "provider_error", reason: result.reason };
  }

  const validated = validateCandidateAnalysisResponse(result.data);
  if (!validated.success) {
    logger.warn("openrouter_analysis_schema_invalid", { resourceType: "candidate_analysis", reason: "invalid_ai_output" });
    return { analysis: null, status: "invalid_output", reason: "schema_validation" };
  }

  return { analysis: normalizeAnalysis(validated.data, deterministic), status: "success", reason: "validated" };
}

export async function analyzeCandidateForJobWithFallback(
  candidate: CandidateLike,
  job: JobLike,
  input: AnalysisInput = {},
): Promise<AnalysisWithSource> {
  const deterministic = analyzeCandidateForJob(candidate, job, input);
  const aiResult = await analyzeWithOpenRouter(candidate, job, deterministic);

  if (aiResult.analysis) {
    return { ...aiResult.analysis, source: "openrouter", status: aiResult.status, reason: aiResult.reason };
  }

  return { ...deterministic, source: "deterministic", status: aiResult.status, reason: aiResult.reason };
}
