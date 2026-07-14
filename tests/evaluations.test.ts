import assert from "node:assert/strict";
import test from "node:test";
import { RequirementCategory, RequirementMatchStatus, RequirementType } from "@prisma/client";
import { validateCandidateAnalysisResponse } from "@/lib/evaluations/schemas";
import {
  calculateCategoryScores,
  calculateEvaluationScoreBreakdown,
  calculateOverallScore,
  parseJobRequirementDrafts,
} from "@/lib/evaluations/scoring";
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
      sortOrder: 0,
    },
    {
      id: "salesforce",
      text: "Salesforce",
      type: RequirementType.REQUIRED,
      category: RequirementCategory.SKILL,
      weight: 12,
      keywords: ["Salesforce"],
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
  assert.equal(calculateOverallScore([{ score: 26, maxScore: 30 }, { score: 9, maxScore: 10 }]), 88);
  const categories = calculateCategoryScores(
    [{
      id: "react",
      text: "React",
      type: RequirementType.REQUIRED,
      category: RequirementCategory.SKILL,
      weight: 12,
      keywords: ["React"],
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
  assert.equal(categories[0].maxScore, 12);
});

test("evidence excerpts originate from supplied resume text", () => {
  const requirement = {
    id: "next",
    text: "Next.js",
    type: RequirementType.REQUIRED,
    category: RequirementCategory.SKILL,
    weight: 12,
    keywords: ["Next.js"],
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
