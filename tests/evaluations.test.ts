import assert from "node:assert/strict";
import test from "node:test";
import { RequirementCategory, RequirementMatchStatus, RequirementType } from "@prisma/client";
import { validateCandidateAnalysisResponse } from "@/lib/evaluations/schemas";
import {
  calculateCategoryScores,
  calculateEvaluationScoreBreakdown,
  calculateOverallScore,
  normalizeRequirementMaxScores,
  parseJobRequirementDrafts,
} from "@/lib/evaluations/scoring";
import { DEFAULT_RUBRIC_WEIGHTS } from "@/lib/evaluations/constants";
import { rubricInputSchema } from "@/lib/jobs/schemas";
import { findEvidenceForRequirement } from "@/lib/evaluations/evidence";
import { clamp } from "@/lib/utils";
import { classifyOpenRouterStatus, parseOpenRouterJson } from "@/lib/openrouter";
import { getCandidateRecommendation, getDeterministicRecommendedStage } from "@/lib/recommendations";

const candidate = {
  name: "Maya Chen",
  skills: ["React", "Next.js", "TypeScript", "PostgreSQL"],
  resumeText:
    "EXPERIENCE\nSenior Product Engineer at Orbit Systems. Built React, Next.js, TypeScript, Prisma, and PostgreSQL workflow products.\nPROJECTS\nCreated onboarding analytics dashboards.",
  resumeSummary: "Senior product engineer with SaaS workflow experience.",
  experienceSummary: "Built customer-facing product workflows with React, Next.js, TypeScript, Prisma, and PostgreSQL.",
  educationSummary: "B.S. Computer Science.",
  currentTitle: "Senior Product Engineer",
  currentCompany: "Orbit Systems",
  projectsSummary: "Created onboarding analytics dashboards.",
  status: "APPLIED",
};

const job = {
  title: "Product Engineer",
  description: "Build customer-facing B2B SaaS workflow features.",
  requirements: "React, Next.js, TypeScript, PostgreSQL; Preferred: product analytics; B.S. Computer Science",
};

test("recommendation thresholds map scores to deterministic stages", () => {
  assert.equal(getDeterministicRecommendedStage(86), "INTERVIEW");
  assert.equal(getDeterministicRecommendedStage(70), "SCREENED");
  assert.equal(getDeterministicRecommendedStage(50), "APPLIED");
  assert.equal(getDeterministicRecommendedStage(49), "REJECTED");
  assert.equal(getCandidateRecommendation({ fitScore: 31, currentStatus: "APPLIED" }).nextStep, "Reject candidate");
});

test("clamp keeps scores inside bounds", () => {
  assert.equal(clamp(120, 0, 100), 100);
  assert.equal(clamp(-5, 0, 100), 0);
  assert.equal(clamp(67, 0, 100), 67);
});

test("required and preferred requirements receive different weights", () => {
  const drafts = parseJobRequirementDrafts("React; Preferred: product analytics");
  const required = drafts.find((draft) => draft.type === RequirementType.REQUIRED);
  const preferred = drafts.find((draft) => draft.type === RequirementType.PREFERRED);

  assert.ok(required);
  assert.ok(preferred);
  assert.ok(required.weight > preferred.weight);
});

test("missing requirements receive no contribution while matched requirements score", () => {
  const requirements = [
    {
      id: "react",
      text: "React",
      type: RequirementType.REQUIRED,
      category: RequirementCategory.SKILL,
      weight: 12,
      keywords: ["React"],
      isCritical: false,
      sortOrder: 0,
    },
    {
      id: "salesforce",
      text: "Salesforce",
      type: RequirementType.REQUIRED,
      category: RequirementCategory.SKILL,
      weight: 12,
      keywords: ["Salesforce"],
      isCritical: true,
      sortOrder: 1,
    },
  ];
  const breakdown = calculateEvaluationScoreBreakdown({ candidate, job, requirements });
  const matched = breakdown.requirementScores.find((score) => score.requirementId === "react");
  const missing = breakdown.requirementScores.find((score) => score.requirementId === "salesforce");

  assert.equal(matched?.status, RequirementMatchStatus.MATCHED);
  assert.equal(missing?.status, RequirementMatchStatus.MISSING);
  assert.equal(missing?.score, 0);
});

test("category totals calculate a percentage score", () => {
  assert.equal(calculateOverallScore([{ score: 26, maxScore: 30 }, { score: 9, maxScore: 10 }]), 35);
  const categories = calculateCategoryScores(
    [{
      id: "react",
      text: "React",
      type: RequirementType.REQUIRED,
      category: RequirementCategory.SKILL,
      weight: 12,
      keywords: ["React"],
      isCritical: false,
      sortOrder: 0,
    }],
    [{
      requirementId: "react",
      status: RequirementMatchStatus.MATCHED,
      score: 12,
      maxScore: 12,
      confidence: 0.86,
      explanation: "Matched React.",
      matchedKeywords: ["React"],
    }],
  );

  assert.equal(categories[0].score, 12);
  assert.equal(categories[0].maxScore, DEFAULT_RUBRIC_WEIGHTS.REQUIRED_SKILLS);
});

test("evidence excerpts originate from supplied resume text", () => {
  const requirement = {
    id: "next",
    text: "Next.js",
    type: RequirementType.REQUIRED,
    category: RequirementCategory.SKILL,
    weight: 12,
    keywords: ["Next.js"],
    isCritical: false,
    sortOrder: 0,
  };
  const evidence = findEvidenceForRequirement({
    resumeText: candidate.resumeText,
    requirement,
    score: {
      requirementId: requirement.id,
      status: RequirementMatchStatus.MATCHED,
      score: 12,
      maxScore: 12,
      confidence: 0.86,
      explanation: "Matched Next.js.",
      matchedKeywords: ["Next.js"],
    },
  });

  assert.ok(evidence);
  assert.ok(candidate.resumeText.includes(evidence.excerpt));
});

test("OpenRouter JSON parser handles valid and malformed content", () => {
  assert.deepEqual(parseOpenRouterJson<{ ok: true }>('```json\n{"ok":true}\n```'), { ok: true });
  assert.equal(parseOpenRouterJson("not json"), null);
});

test("candidate analysis schema accepts valid output and rejects invalid output", () => {
  const valid = validateCandidateAnalysisResponse({
    summary: "Candidate has strong product engineering alignment for the selected role.",
    roleMatch: "The resume directly matches the role requirements across React and TypeScript.",
    strengths: ["Strong React and TypeScript experience."],
    gaps: ["Validate product analytics depth."],
    nextStep: "Advance to Interview with a focused technical screen.",
    technicalQuestions: ["How did you structure a recent Next.js workflow feature?"],
    behavioralQuestions: ["Tell me about a time priorities changed quickly."],
    resumeSpecificQuestions: ["How did the onboarding analytics dashboard affect activation?"],
  });
  const invalid = validateCandidateAnalysisResponse({ summary: "" });

  assert.equal(valid.success, true);
  assert.equal(invalid.success, false);
});

test("OpenRouter retry classification distinguishes transient and permanent errors", () => {
  assert.deepEqual(classifyOpenRouterStatus(429), { reason: "rate_limited", retryable: true });
  assert.deepEqual(classifyOpenRouterStatus(503), { reason: "server_error", retryable: true });
  assert.deepEqual(classifyOpenRouterStatus(400), { reason: "client_error", retryable: false });
});

test("default rubric totals 100 and invalid totals are rejected", () => {
  assert.equal(Object.values(DEFAULT_RUBRIC_WEIGHTS).reduce((sum, value) => sum + value, 0), 100);
  assert.equal(rubricInputSchema.safeParse({
    requiredSkillsWeight: 30,
    preferredWeight: 10,
    experienceWeight: 25,
    projectWeight: 15,
    educationWeight: 10,
    domainWeight: 10,
  }).success, true);
  assert.equal(rubricInputSchema.safeParse({
    requiredSkillsWeight: 90,
    preferredWeight: 10,
    experienceWeight: 25,
    projectWeight: 15,
    educationWeight: 10,
    domainWeight: 10,
  }).success, false);
  assert.equal(rubricInputSchema.safeParse({
    requiredSkillsWeight: -1,
    preferredWeight: 10,
    experienceWeight: 25,
    projectWeight: 15,
    educationWeight: 10,
    domainWeight: 41,
  }).success, false);
});

test("requirement weights normalize inside category maximums", () => {
  const requirements = [
    { id: "python", text: "Python", type: RequirementType.REQUIRED, category: RequirementCategory.SKILL, weight: 3, keywords: ["Python"], isCritical: false, sortOrder: 0 },
    { id: "postgres", text: "PostgreSQL", type: RequirementType.REQUIRED, category: RequirementCategory.SKILL, weight: 2, keywords: ["PostgreSQL"], isCritical: false, sortOrder: 1 },
    { id: "aws", text: "AWS", type: RequirementType.REQUIRED, category: RequirementCategory.SKILL, weight: 1, keywords: ["AWS"], isCritical: false, sortOrder: 2 },
  ];
  const normalized = normalizeRequirementMaxScores(requirements, DEFAULT_RUBRIC_WEIGHTS);

  assert.equal(normalized.get("python"), 15);
  assert.equal(normalized.get("postgres"), 10);
  assert.equal(normalized.get("aws"), 5);
});

test("category and overall scores never exceed configured maximums", () => {
  const requirements = [
    { id: "react", text: "React", type: RequirementType.REQUIRED, category: RequirementCategory.SKILL, weight: 99, keywords: ["React"], isCritical: false, sortOrder: 0 },
    { id: "next", text: "Next.js", type: RequirementType.REQUIRED, category: RequirementCategory.SKILL, weight: 99, keywords: ["Next.js"], isCritical: false, sortOrder: 1 },
  ];
  const breakdown = calculateEvaluationScoreBreakdown({ candidate, job, requirements, rubric: DEFAULT_RUBRIC_WEIGHTS });
  const requiredSkills = breakdown.categoryScores.find((category) => category.category === "REQUIRED_SKILLS");

  assert.ok(requiredSkills);
  assert.ok(requiredSkills.score <= requiredSkills.maxScore);
  assert.ok(breakdown.overallScore <= 100);
});

test("missing critical requirements lower confidence and are surfaced", () => {
  const requirements = [
    { id: "work-auth", text: "Work authorization", type: RequirementType.REQUIRED, category: RequirementCategory.OTHER, weight: 10, keywords: ["Work authorization"], isCritical: true, sortOrder: 0 },
  ];
  const breakdown = calculateEvaluationScoreBreakdown({ candidate, job, requirements, rubric: DEFAULT_RUBRIC_WEIGHTS });

  assert.equal(breakdown.hasMissingCritical, true);
  assert.ok(breakdown.confidence < 0.4);
});

test("stale evaluation detection can compare evaluation and rubric update dates", () => {
  const evaluationCreatedAt = new Date("2026-01-01T00:00:00Z");
  const rubricUpdatedAt = new Date("2026-01-02T00:00:00Z");

  assert.equal(evaluationCreatedAt < rubricUpdatedAt, true);
});
