import {
  AiRequirementAssessment,
  EvaluationScoreCategory,
  RequirementCategory,
  RequirementMatchStatus,
  RequirementType,
} from "@prisma/client";
import { AI_STRONG_MATCH_MIN_CONFIDENCE, DEFAULT_REQUIREMENT_WEIGHTS, DEFAULT_RUBRIC_WEIGHTS, REQUIREMENT_MATCH_CREDIT } from "@/lib/evaluations/constants";
import type {
  CandidateForEvaluation,
  EvaluationScoreBreakdown,
  JobForEvaluation,
  RequirementDraft,
  RequirementForScoring,
  RequirementScore,
  RubricWeights,
  SemanticRequirementAssessment,
  ScoreTraceCategory,
} from "@/lib/evaluations/types";
import { clamp } from "@/lib/utils";

type RequirementSignal = {
  label: string;
  aliases: string[];
};

// These phrases intentionally describe qualifications, not arbitrary prose tokens.
const requirementSignals: RequirementSignal[] = [
  { label: "Python", aliases: ["python"] },
  { label: "Java", aliases: ["java"] },
  { label: "JavaScript", aliases: ["javascript", "js"] },
  { label: "TypeScript", aliases: ["typescript", "ts"] },
  { label: "React", aliases: ["react"] },
  { label: "Next.js", aliases: ["next.js", "nextjs", "next js"] },
  { label: "Node.js", aliases: ["node.js", "nodejs", "node js"] },
  { label: "PostgreSQL", aliases: ["postgresql", "postgres", "postgre"] },
  { label: "SQL", aliases: ["sql"] },
  { label: "Prisma", aliases: ["prisma"] },
  { label: "Docker", aliases: ["docker", "containers", "containerization"] },
  { label: "AWS", aliases: ["aws", "amazon web services"] },
  { label: "REST APIs", aliases: ["rest api", "rest apis", "restful api", "restful apis"] },
  { label: "Git", aliases: ["git", "version control"] },
  { label: "CI/CD", aliases: ["ci/cd", "ci cd", "continuous integration", "continuous delivery", "github actions", "jenkins"] },
  { label: "Testing", aliases: ["testing", "test automation", "unit testing", "integration testing"] },
  { label: "Data Structures and Algorithms", aliases: ["data structures and algorithms", "data structures", "algorithms"] },
  { label: "Software Engineering Experience", aliases: ["software engineering", "software development", "software engineer intern", "engineering internship"] },
  { label: "Computer Science Education", aliases: ["computer science", "cs degree", "bachelor of science", "b s degree"] },
  { label: "Software Projects", aliases: ["software projects", "software project", "technical projects", "project portfolio"] },
  { label: "Customer Success", aliases: ["customer success"] },
  { label: "Product Design", aliases: ["product design"] },
  { label: "User Research", aliases: ["user research"] },
  { label: "Figma", aliases: ["figma"] },
  { label: "CRM", aliases: ["crm", "salesforce", "hubspot"] },
  { label: "Analytics", aliases: ["analytics", "product analytics", "data analysis"] },
  { label: "Accessibility", aliases: ["accessibility", "a11y"] },
  { label: "Experimentation", aliases: ["experimentation", "a b testing", "ab testing"] },
];

const ignoredRequirementTerms = new Set([
  "customer",
  "communication",
  "seeking",
  "team",
  "role",
  "work",
  "strong",
  "experience",
  "knowledge",
  "ability",
  "including",
  "responsibilities",
  "preferred",
  "required",
]);

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/c\+\+/g, "c plus plus")
    .replace(/c#/g, "c sharp")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsPhrase(text: string, phrase: string) {
  const normalizedText = ` ${normalize(text)} `;
  const normalizedPhrase = normalize(phrase);
  return normalizedPhrase.length > 1 && normalizedText.includes(` ${normalizedPhrase} `);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function titleCase(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isMeaningfulPhrase(value: string) {
  const normalized = normalize(value);
  if (!normalized || ignoredRequirementTerms.has(normalized)) return false;
  if (requirementSignals.some((signal) => signal.aliases.some((alias) => normalize(alias) === normalized))) return true;
  return /\b(degree|bachelor|master|university|college|project|portfolio|internship|software development|software engineering|data structures|algorithms|testing|cloud|backend|frontend|stakeholder|work authorization)\b/.test(normalized);
}

export function extractRequirementKeywords(text: string, existingKeywords: string[] = []) {
  const sources = [text, ...existingKeywords].filter(Boolean);
  const canonical = requirementSignals
    .filter((signal) => sources.some((source) => signal.aliases.some((alias) => containsPhrase(source, alias))))
    .map((signal) => signal.label);
  const meaningfulExplicit = existingKeywords
    .map((keyword) => titleCase(keyword))
    .filter((keyword) => isMeaningfulPhrase(keyword));

  return unique([...canonical, ...meaningfulExplicit]).slice(0, 8);
}

export function inferRequirementType(text: string): RequirementType {
  return /\b(preferred|nice to have|bonus|plus|familiarity)\b/i.test(text)
    ? RequirementType.PREFERRED
    : RequirementType.REQUIRED;
}

export function inferRequirementCategory(text: string): RequirementCategory {
  if (/\b(degree|b\.s|bachelor|master|education|university|college|computer science)\b/i.test(text)) return RequirementCategory.EDUCATION;
  if (/\b(project|portfolio|case study|prototype|shipped)\b/i.test(text)) return RequirementCategory.PROJECT;
  if (extractRequirementKeywords(text).some((keyword) => requirementSignals.slice(0, 17).some((signal) => signal.label === keyword))) return RequirementCategory.SKILL;
  if (/\b(years|managed|led|owned|experience|internship|stakeholder|customer success|onboarding|renewal)\b/i.test(text)) return RequirementCategory.EXPERIENCE;
  if (/\b(saas|recruiting|healthcare|finance|domain|b2b)\b/i.test(text)) return RequirementCategory.DOMAIN;
  return RequirementCategory.OTHER;
}

function cleanRequirementText(value: string) {
  return value
    .replace(/^\s*[-*\u2022]\s*/, "")
    .replace(/^\s*qualifications?\s*:\s*/i, "")
    .trim();
}

function splitRequirementText(requirements: string) {
  return requirements
    .replace(/\u2022/g, "\n")
    .split(/\r?\n|;|\|/)
    .flatMap((line) => line.split(/,(?![^()]*\))/))
    .map(cleanRequirementText)
    .filter(Boolean);
}

export function parseJobRequirementDrafts(requirements: string): RequirementDraft[] {
  const seen = new Set<string>();
  const entries = splitRequirementText(requirements).flatMap((text) => {
    const keywords = extractRequirementKeywords(text);
    const looksLikeProse = text.split(/\s+/).length > 8;
    if (keywords.length && looksLikeProse) return keywords;
    return isMeaningfulPhrase(text) || keywords.length ? [text] : [];
  });

  return entries.flatMap((text) => {
    const keywords = extractRequirementKeywords(text);
    const normalizedKey = normalize(keywords[0] ?? text);
    if (!normalizedKey || seen.has(normalizedKey)) return [];
    seen.add(normalizedKey);
    const type = inferRequirementType(text);
    return [{
      text,
      type,
      category: inferRequirementCategory(text),
      weight: type === RequirementType.REQUIRED ? DEFAULT_REQUIREMENT_WEIGHTS.required : DEFAULT_REQUIREMENT_WEIGHTS.preferred,
      keywords,
      isCritical: false,
      sortOrder: seen.size - 1,
    }];
  });
}

function candidateSearchText(candidate: CandidateForEvaluation) {
  return [
    candidate.name,
    candidate.skills.join(" "),
    candidate.resumeText,
    candidate.resumeSummary,
    candidate.experienceSummary,
    candidate.educationSummary,
    candidate.currentTitle,
    candidate.currentCompany,
    candidate.projectsSummary,
  ]
    .filter(Boolean)
    .join(" ");
}

function getMatchedKeywords(keywords: string[], candidateText: string) {
  return keywords.filter((keyword) => {
    const signal = requirementSignals.find((item) => item.label === keyword);
    return signal
      ? signal.aliases.some((alias) => containsPhrase(candidateText, alias))
      : containsPhrase(candidateText, keyword);
  });
}

function assessmentRank(assessment: AiRequirementAssessment) {
  return [AiRequirementAssessment.NO_EVIDENCE, AiRequirementAssessment.WEAK_EVIDENCE, AiRequirementAssessment.PARTIAL_MATCH, AiRequirementAssessment.STRONG_MATCH].indexOf(assessment);
}

function deterministicAssessment(status: RequirementMatchStatus, ratio: number) {
  if (status === RequirementMatchStatus.MATCHED) return AiRequirementAssessment.STRONG_MATCH;
  if (status === RequirementMatchStatus.PARTIAL) {
    return ratio >= 0.5 ? AiRequirementAssessment.PARTIAL_MATCH : AiRequirementAssessment.WEAK_EVIDENCE;
  }
  return AiRequirementAssessment.NO_EVIDENCE;
}

function statusForAssessment(assessment: AiRequirementAssessment) {
  return assessment === AiRequirementAssessment.STRONG_MATCH
    ? RequirementMatchStatus.MATCHED
    : assessment === AiRequirementAssessment.NO_EVIDENCE
      ? RequirementMatchStatus.MISSING
      : RequirementMatchStatus.PARTIAL;
}

function scoreOneRequirement(
  requirement: RequirementForScoring,
  candidateText: string,
  maxScore: number,
  aiAssessment?: SemanticRequirementAssessment,
): RequirementScore {
  const keywords = extractRequirementKeywords(requirement.text, requirement.keywords);
  const matchedKeywords = getMatchedKeywords(keywords, candidateText);
  const ratio = keywords.length ? matchedKeywords.length / keywords.length : 0;
  const deterministicStatus = ratio >= 0.7
    ? RequirementMatchStatus.MATCHED
    : ratio > 0 ? RequirementMatchStatus.PARTIAL : RequirementMatchStatus.MISSING;
  const deterministic = deterministicAssessment(deterministicStatus, ratio);
  const groundedAiAssessment = aiAssessment?.evidence.length
    ? aiAssessment.assessment === AiRequirementAssessment.STRONG_MATCH && aiAssessment.confidence < AI_STRONG_MATCH_MIN_CONFIDENCE
      ? AiRequirementAssessment.PARTIAL_MATCH
      : aiAssessment.assessment
    : undefined;
  const assessment = groundedAiAssessment && assessmentRank(groundedAiAssessment) > assessmentRank(deterministic)
    ? groundedAiAssessment
    : deterministic;
  const status = statusForAssessment(assessment);
  const score = Math.round(maxScore * REQUIREMENT_MATCH_CREDIT[assessment]);

  return {
    requirementId: requirement.id,
    status,
    score: Math.min(score, maxScore),
    maxScore,
    confidence: requirement.isCritical && status === RequirementMatchStatus.MISSING
      ? 0.2
      : aiAssessment?.confidence ?? (status === RequirementMatchStatus.MATCHED ? 0.86 : status === RequirementMatchStatus.PARTIAL ? 0.58 : 0.34),
    explanation: aiAssessment && assessment !== deterministic
      ? `${aiAssessment.explanation} Grounded semantic evidence upgraded the deterministic assessment.`
      : status === RequirementMatchStatus.MATCHED
      ? `Matched ${matchedKeywords.slice(0, 4).join(", ")}.`
      : status === RequirementMatchStatus.PARTIAL
        ? `Partially matched ${matchedKeywords.slice(0, 4).join(", ")}; needs validation.`
        : requirement.type === RequirementType.REQUIRED
          ? "No supporting evidence found in the submitted resume for this required qualification."
          : "No supporting evidence found in the submitted resume for this preferred qualification.",
    matchedKeywords,
    assessment,
    deterministicStatus,
    aiAssessment: aiAssessment?.assessment,
    aiConfidence: aiAssessment?.confidence,
    aiExplanation: aiAssessment?.explanation,
    aiEvidence: aiAssessment?.evidence ?? [],
  };
}

export function scoreCategoryForRequirement(requirement: RequirementForScoring): EvaluationScoreCategory {
  if (requirement.type === RequirementType.PREFERRED) return EvaluationScoreCategory.PREFERRED_QUALIFICATIONS;
  if (requirement.category === RequirementCategory.EXPERIENCE) return EvaluationScoreCategory.RELEVANT_EXPERIENCE;
  if (requirement.category === RequirementCategory.PROJECT) return EvaluationScoreCategory.PROJECT_ALIGNMENT;
  if (requirement.category === RequirementCategory.EDUCATION) return EvaluationScoreCategory.EDUCATION;
  if (requirement.category === RequirementCategory.DOMAIN) return EvaluationScoreCategory.DOMAIN_ALIGNMENT;
  return EvaluationScoreCategory.REQUIRED_SKILLS;
}

export function normalizeRequirementMaxScores(requirements: RequirementForScoring[], rubric: RubricWeights) {
  const grouped = new Map<EvaluationScoreCategory, RequirementForScoring[]>();
  for (const requirement of requirements) {
    const category = scoreCategoryForRequirement(requirement);
    grouped.set(category, [...(grouped.get(category) ?? []), requirement]);
  }

  const maxScores = new Map<string, number>();
  for (const [category, categoryRequirements] of grouped.entries()) {
    const categoryMax = rubric[category];
    const totalWeight = categoryRequirements.reduce((total, requirement) => total + Math.max(0, requirement.weight), 0);
    let allocated = 0;
    categoryRequirements.forEach((requirement, index) => {
      const isLast = index === categoryRequirements.length - 1;
      const raw = totalWeight ? (Math.max(0, requirement.weight) / totalWeight) * categoryMax : categoryMax / categoryRequirements.length;
      const maxScore = isLast ? Math.max(0, categoryMax - allocated) : Math.round(raw);
      allocated += maxScore;
      maxScores.set(requirement.id, maxScore);
    });
  }
  return maxScores;
}

export function calculateCategoryScores(
  requirements: RequirementForScoring[],
  requirementScores: RequirementScore[],
  rubric: RubricWeights = DEFAULT_RUBRIC_WEIGHTS,
) {
  const byRequirement = new Map(requirementScores.map((score) => [score.requirementId, score]));
  const grouped = new Map<EvaluationScoreCategory, { score: number; maxScore: number; weight: number; matched: number; total: number }>();
  for (const requirement of requirements) {
    const category = scoreCategoryForRequirement(requirement);
    const score = byRequirement.get(requirement.id);
    const current = grouped.get(category) ?? { score: 0, maxScore: 0, weight: 0, matched: 0, total: 0 };
    current.score += score?.score ?? 0;
    current.maxScore = rubric[category];
    current.weight += requirement.weight;
    current.total += 1;
    if (score?.status === RequirementMatchStatus.MATCHED) current.matched += 1;
    grouped.set(category, current);
  }
  return Array.from(grouped.entries()).map(([category, value]) => ({
    category,
    score: Math.min(value.score, value.maxScore),
    maxScore: value.maxScore,
    weight: value.weight,
    explanation: `${value.matched} of ${value.total} requirements fully matched.`,
  }));
}

export function calculateOverallScore(categoryScores: { score: number; maxScore: number }[]) {
  return Math.round(clamp(categoryScores.reduce((total, category) => total + Math.min(category.score, category.maxScore), 0), 0, 100));
}

function buildScoreTrace(requirements: RequirementForScoring[], requirementScores: RequirementScore[], rubric: RubricWeights): ScoreTraceCategory[] {
  const byRequirement = new Map(requirementScores.map((score) => [score.requirementId, score]));
  const grouped = new Map<EvaluationScoreCategory, ScoreTraceCategory>();
  for (const requirement of requirements) {
    const category = scoreCategoryForRequirement(requirement);
    const score = byRequirement.get(requirement.id);
    const current = grouped.get(category) ?? {
      category,
      maxPoints: rubric[category],
      earnedPoints: 0,
      requirements: [],
    };
    current.earnedPoints += score?.score ?? 0;
    current.requirements.push({
      id: requirement.id,
      text: requirement.text,
      matchStatus: score?.status ?? RequirementMatchStatus.MISSING,
      deterministicStatus: score?.deterministicStatus ?? RequirementMatchStatus.MISSING,
      assessment: score?.assessment ?? AiRequirementAssessment.NO_EVIDENCE,
      aiAssessment: score?.aiAssessment,
      aiConfidence: score?.aiConfidence,
      contribution: score?.score ?? 0,
      maxPoints: score?.maxScore ?? 0,
      evidence: score?.matchedKeywords ?? [],
    });
    grouped.set(category, current);
  }
  return Array.from(grouped.values()).map((category) => ({ ...category, earnedPoints: Math.min(category.earnedPoints, category.maxPoints) }));
}

export function calculateEvaluationScoreBreakdown({
  candidate,
  job,
  requirements,
  rubric = DEFAULT_RUBRIC_WEIGHTS,
  semanticAssessments = [],
}: {
  candidate: CandidateForEvaluation;
  job: JobForEvaluation;
  requirements: RequirementForScoring[];
  rubric?: RubricWeights;
  semanticAssessments?: SemanticRequirementAssessment[];
}): EvaluationScoreBreakdown {
  const validStructuredRequirements = requirements.filter((requirement) =>
    extractRequirementKeywords(requirement.text, requirement.keywords).length > 0 || isMeaningfulPhrase(requirement.text),
  );
  const effectiveRequirements = validStructuredRequirements.length
    ? validStructuredRequirements
    : parseJobRequirementDrafts(job.requirements).map((draft, index) => ({ ...draft, id: `derived-${index}` }));
  const candidateText = candidateSearchText(candidate);
  const semanticByRequirement = new Map(semanticAssessments.map((assessment) => [assessment.requirementId, assessment]));
  const maxScores = normalizeRequirementMaxScores(effectiveRequirements, rubric);
  const requirementScores = effectiveRequirements.map((requirement) =>
    scoreOneRequirement(requirement, candidateText, maxScores.get(requirement.id) ?? requirement.weight, semanticByRequirement.get(requirement.id)),
  );
  const categoryScores = calculateCategoryScores(effectiveRequirements, requirementScores, rubric);
  const hasMissingCritical = requirementScores.some((score) => {
    const requirement = effectiveRequirements.find((item) => item.id === score.requirementId);
    return requirement?.isCritical && score.status === RequirementMatchStatus.MISSING;
  });
  const confidence = requirementScores.length
    ? Number(((requirementScores.reduce((total, score) => total + score.confidence, 0) / requirementScores.length) - (hasMissingCritical ? 0.15 : 0)).toFixed(2))
    : 0.4;

  return {
    overallScore: calculateOverallScore(categoryScores),
    confidence: clamp(confidence, 0, 1),
    hasMissingCritical,
    categoryScores,
    requirementScores,
    scoreTrace: buildScoreTrace(effectiveRequirements, requirementScores, rubric),
  };
}
