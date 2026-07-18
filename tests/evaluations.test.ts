import assert from "node:assert/strict";
import test from "node:test";
import { ApplicationStatus, EvaluationScoreCategory, RequirementCategory, RequirementMatchStatus, RequirementType, UserRole } from "@prisma/client";
import { analyzeCandidateForJob } from "@/lib/ai";
import { validateCandidateAnalysisResponse } from "@/lib/evaluations/schemas";
import {
  calculateCategoryScores,
  calculateEvaluationScoreBreakdown,
  calculateOverallScore,
  extractRequirementKeywords,
  normalizeRequirementMaxScores,
  parseJobRequirementDrafts,
} from "@/lib/evaluations/scoring";
import { DEFAULT_RUBRIC_WEIGHTS } from "@/lib/evaluations/constants";
import { rubricInputSchema } from "@/lib/jobs/schemas";
import { findEvidenceForRequirement } from "@/lib/evaluations/evidence";
import { clamp } from "@/lib/utils";
import { classifyOpenRouterFailure, classifyOpenRouterStatus, parseOpenRouterJson, resolveOpenRouterEndpoint } from "@/lib/openrouter";
import { getCandidateRecommendation, getDeterministicRecommendedStage } from "@/lib/recommendations";
import { getInterviewValidationOutcome, getValidationSummary } from "@/lib/interviews/validation";
import { countApplicationsByStage, getApplicationConversions } from "@/lib/applications/metrics";
import { canDeleteHiringData, canManageHiring, canSubmitInterviewFeedback } from "@/lib/permissions";

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

test("OpenRouter endpoint resolution produces one canonical chat-completions URL", () => {
  const endpoint = "https://openrouter.ai/api/v1/chat/completions";
  assert.equal(resolveOpenRouterEndpoint("https://openrouter.ai/api/v1"), endpoint);
  assert.equal(resolveOpenRouterEndpoint("https://openrouter.ai/api/v1/"), endpoint);
  assert.equal(resolveOpenRouterEndpoint(endpoint), endpoint);
  assert.throws(() => resolveOpenRouterEndpoint(`${endpoint}/chat/completions`), /OPENROUTER_BASE_URL/);
  assert.throws(() => resolveOpenRouterEndpoint("https://openrouter.ai/api/v1/api/v1"), /OPENROUTER_BASE_URL/);
  assert.throws(() => resolveOpenRouterEndpoint("http://openrouter.ai/api/v1"), /HTTPS/);
  assert.throws(() => resolveOpenRouterEndpoint("https://proxy.example.com/api/v1"), /openrouter.ai/);
});

test("OpenRouter provider failures retain actionable, sanitized categories", () => {
  assert.deepEqual(classifyOpenRouterFailure(401), { reason: "authentication_error", retryable: false });
  assert.deepEqual(classifyOpenRouterFailure(402), { reason: "billing_error", retryable: false });
  assert.deepEqual(classifyOpenRouterFailure(404), { reason: "endpoint_not_found", retryable: false });
  assert.deepEqual(
    classifyOpenRouterFailure(404, { code: "MODEL_NOT_FOUND", message: "No endpoints found for this model." }),
    { reason: "model_not_found", retryable: false },
  );
  assert.deepEqual(classifyOpenRouterFailure(429), { reason: "rate_limited", retryable: true });
  assert.deepEqual(classifyOpenRouterFailure(500), { reason: "server_error", retryable: true });
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

test("interview feedback validates resume screening without changing the fit score", () => {
  assert.equal(getInterviewValidationOutcome({ screeningStatus: RequirementMatchStatus.MATCHED, rating: 5, signal: null }), "CONFIRMED");
  assert.equal(getInterviewValidationOutcome({ screeningStatus: RequirementMatchStatus.PARTIAL, rating: 2, signal: null }), "WEAKENED");
  assert.equal(getInterviewValidationOutcome({ screeningStatus: RequirementMatchStatus.MISSING, rating: null, signal: null }), "UNRESOLVED");
  assert.deepEqual(getValidationSummary(["CONFIRMED", "WEAKENED", "UNRESOLVED"]), { confirmed: 1, weakened: 1, unresolved: 1 });
});

test("application stages are independent and pipeline counts applications rather than candidates", () => {
  const applications = [
    { candidateId: "maya", jobId: "product", status: ApplicationStatus.INTERVIEW },
    { candidateId: "maya", jobId: "designer", status: ApplicationStatus.SCREENED },
    { candidateId: "noah", jobId: "product", status: ApplicationStatus.APPLIED },
  ];
  const counts = countApplicationsByStage(applications);
  assert.equal(counts.find((entry) => entry.stage === ApplicationStatus.INTERVIEW)?.count, 1);
  assert.equal(counts.find((entry) => entry.stage === ApplicationStatus.SCREENED)?.count, 1);
  assert.equal(counts.find((entry) => entry.stage === ApplicationStatus.APPLIED)?.count, 1);
  assert.equal(applications.filter((application) => application.jobId === "product").length, 2);
});

test("application conversion metrics are deterministic and based on application stages", () => {
  const applications = [
    { status: ApplicationStatus.APPLIED },
    { status: ApplicationStatus.SCREENED },
    { status: ApplicationStatus.INTERVIEW },
    { status: ApplicationStatus.OFFER },
    { status: ApplicationStatus.REJECTED },
  ];
  const metrics = getApplicationConversions(applications);
  assert.equal(metrics.rejectionRate, 20);
  assert.equal(metrics.interviewToOffer, 100);
});

test("role permissions keep interview feedback available without exposing hiring management", () => {
  assert.equal(canManageHiring(UserRole.ADMIN), true);
  assert.equal(canManageHiring(UserRole.RECRUITER), true);
  assert.equal(canManageHiring(UserRole.INTERVIEWER), false);
  assert.equal(canDeleteHiringData(UserRole.ADMIN), true);
  assert.equal(canDeleteHiringData(UserRole.RECRUITER), false);
  assert.equal(canSubmitInterviewFeedback(UserRole.INTERVIEWER), true);
});

test("SWE internship evaluation uses structured requirements, aliases, and one deterministic fit band", () => {
  const sweCandidate = {
    name: "Aryan Rawat",
    skills: ["Python", "Java", "JavaScript", "TypeScript", "React", "Next.js", "PostgreSQL", "SQL", "REST APIs", "Docker", "AWS", "Git", "CI/CD", "Jenkins"],
    resumeText: "EDUCATION B.S. Computer Science. EXPERIENCE Software Engineering Intern building production frontend and backend services. PROJECTS Built full-stack software projects using React, NextJS, Postgres, RESTful APIs, Docker, AWS, GitHub Actions, Jenkins, testing, and data structures and algorithms.",
    resumeSummary: "Computer science student and software engineering intern with full-stack product experience.",
    experienceSummary: "Software Engineering Intern delivering production backend and frontend work with APIs, SQL, and cloud tooling.",
    educationSummary: "B.S. Computer Science.",
    currentTitle: "Software Engineering Intern",
    currentCompany: "Atlas Labs",
    projectsSummary: "Built multiple full-stack software projects using React, Next.js, PostgreSQL, Docker, and CI/CD.",
    status: "APPLIED",
  };
  const sweJob = {
    title: "Software Engineer Intern",
    description: "Build reliable product features for a SaaS platform.",
    requirements: "Python, Java, JavaScript, TypeScript; Data Structures and Algorithms; SQL and PostgreSQL; Git and version control; Software Engineering Experience; Computer Science Education; Software Projects; Preferred: React and Next.js; Preferred: REST APIs and backend development; Preferred: AWS, Docker, CI/CD, and testing.",
  };
  const requirements = [
    { id: "languages", text: "Python, Java, JavaScript, and TypeScript", type: RequirementType.REQUIRED, category: RequirementCategory.SKILL, weight: 10, keywords: ["Python", "Java", "JavaScript", "TypeScript"], isCritical: false, sortOrder: 0 },
    { id: "algorithms", text: "Data Structures and Algorithms", type: RequirementType.REQUIRED, category: RequirementCategory.SKILL, weight: 9, keywords: ["Data Structures and Algorithms"], isCritical: false, sortOrder: 1 },
    { id: "database", text: "SQL and PostgreSQL", type: RequirementType.REQUIRED, category: RequirementCategory.SKILL, weight: 9, keywords: ["SQL", "PostgreSQL"], isCritical: false, sortOrder: 2 },
    { id: "git", text: "Git and version control", type: RequirementType.REQUIRED, category: RequirementCategory.SKILL, weight: 5, keywords: ["Git"], isCritical: false, sortOrder: 3 },
    { id: "experience", text: "Software Engineering Experience", type: RequirementType.REQUIRED, category: RequirementCategory.EXPERIENCE, weight: 10, keywords: ["Software Engineering Experience"], isCritical: false, sortOrder: 4 },
    { id: "education", text: "Computer Science Education", type: RequirementType.REQUIRED, category: RequirementCategory.EDUCATION, weight: 10, keywords: ["Computer Science Education"], isCritical: false, sortOrder: 5 },
    { id: "projects", text: "Software Projects", type: RequirementType.REQUIRED, category: RequirementCategory.PROJECT, weight: 10, keywords: ["Software Projects"], isCritical: false, sortOrder: 6 },
    { id: "frontend", text: "React and Next.js", type: RequirementType.PREFERRED, category: RequirementCategory.SKILL, weight: 5, keywords: ["React", "Next.js"], isCritical: false, sortOrder: 7 },
    { id: "apis", text: "REST APIs and backend development", type: RequirementType.PREFERRED, category: RequirementCategory.SKILL, weight: 5, keywords: ["REST APIs"], isCritical: false, sortOrder: 8 },
    { id: "delivery", text: "AWS, Docker, CI/CD, and testing", type: RequirementType.PREFERRED, category: RequirementCategory.SKILL, weight: 5, keywords: ["AWS", "Docker", "CI/CD", "Testing"], isCritical: false, sortOrder: 9 },
  ];

  const keywords = extractRequirementKeywords("We are seeking customer communication skills alongside RESTful APIs, GitHub Actions, Postgres, and NextJS.");
  assert.deepEqual(keywords, ["Next.js", "PostgreSQL", "REST APIs", "CI/CD"]);
  assert.equal(keywords.includes("Seeking"), false);
  assert.equal(keywords.includes("Customer"), false);
  assert.equal(keywords.includes("Communication"), false);
  const fallbackDrafts = parseJobRequirementDrafts("We are seeking customer communication skills alongside RESTful APIs, GitHub Actions, Postgres, and NextJS.");
  assert.equal(fallbackDrafts.some((draft) => /\b(seeking|customer|communication)\b/i.test(draft.text)), false);

  const breakdown = calculateEvaluationScoreBreakdown({ candidate: sweCandidate, job: sweJob, requirements });
  const categories = new Map(breakdown.categoryScores.map((category) => [category.category, category]));
  assert.ok((categories.get(EvaluationScoreCategory.RELEVANT_EXPERIENCE)?.score ?? 0) > 0);
  assert.ok((categories.get(EvaluationScoreCategory.PROJECT_ALIGNMENT)?.score ?? 0) > 0);
  assert.ok((categories.get(EvaluationScoreCategory.EDUCATION)?.score ?? 0) > 0);
  assert.ok((categories.get(EvaluationScoreCategory.PREFERRED_QUALIFICATIONS)?.score ?? 0) > 0);
  assert.ok(breakdown.overallScore >= 85 && breakdown.overallScore <= 90);
  assert.equal(breakdown.scoreTrace.some((category) => category.requirements.some((requirement) => requirement.text === "seeking")), false);

  const analysis = analyzeCandidateForJob(sweCandidate, sweJob, { requirements, breakdown });
  assert.equal(analysis.fitScore, breakdown.overallScore);
  assert.match(analysis.summary, /strong fit/i);
  assert.notEqual(analysis.recommendedStage, "REJECTED");
});

test("limited alignment never produces strong-fit language", () => {
  const lowCandidate = { ...candidate, skills: [], resumeText: "Entry-level generalist profile.", experienceSummary: "", projectsSummary: "", educationSummary: "" };
  const requirements = [{ id: "python", text: "Python", type: RequirementType.REQUIRED, category: RequirementCategory.SKILL, weight: 10, keywords: ["Python"], isCritical: false, sortOrder: 0 }];
  const breakdown = calculateEvaluationScoreBreakdown({ candidate: lowCandidate, job, requirements });
  const analysis = analyzeCandidateForJob(lowCandidate, job, { requirements, breakdown });

  assert.ok(analysis.fitScore < 50);
  assert.equal(analysis.recommendedStage, "REJECTED");
  assert.equal(analysis.nextStep, "Reject candidate");
  assert.doesNotMatch(analysis.summary, /strong fit/i);
});

test("legacy prose fragments do not consume structured scoring weight", () => {
  const requirements = [
    { id: "python", text: "Python", type: RequirementType.REQUIRED, category: RequirementCategory.SKILL, weight: 10, keywords: ["Python"], isCritical: false, sortOrder: 0 },
    { id: "seeking", text: "seeking", type: RequirementType.REQUIRED, category: RequirementCategory.SKILL, weight: 10, keywords: ["Seeking"], isCritical: false, sortOrder: 1 },
    { id: "customer", text: "customer", type: RequirementType.REQUIRED, category: RequirementCategory.EXPERIENCE, weight: 10, keywords: ["Customer"], isCritical: false, sortOrder: 2 },
  ];
  const breakdown = calculateEvaluationScoreBreakdown({ candidate: { ...candidate, skills: ["Python"] }, job, requirements });

  assert.deepEqual(breakdown.requirementScores.map((score) => score.requirementId), ["python"]);
  assert.equal(breakdown.overallScore, DEFAULT_RUBRIC_WEIGHTS.REQUIRED_SKILLS);
});
