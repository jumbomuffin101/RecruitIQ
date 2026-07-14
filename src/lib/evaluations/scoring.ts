import {
  EvaluationScoreCategory,
  RequirementCategory,
  RequirementMatchStatus,
  RequirementType,
} from "@prisma/client";
import { DEFAULT_REQUIREMENT_WEIGHTS } from "@/lib/evaluations/constants";
import type {
  CandidateForEvaluation,
  EvaluationScoreBreakdown,
  JobForEvaluation,
  RequirementDraft,
  RequirementForScoring,
  RequirementScore,
} from "@/lib/evaluations/types";
import { clamp } from "@/lib/utils";

const stopWords = new Set([
  "and",
  "or",
  "the",
  "with",
  "for",
  "from",
  "role",
  "team",
  "work",
  "strong",
  "experience",
  "knowledge",
  "ability",
  "including",
]);

const knownSkills = [
  "React",
  "Next.js",
  "TypeScript",
  "JavaScript",
  "Node",
  "PostgreSQL",
  "SQL",
  "Prisma",
  "AWS",
  "Python",
  "Analytics",
  "CRM",
  "Figma",
  "Product Design",
  "User Research",
  "Customer Success",
  "Onboarding",
  "Renewals",
  "Operations",
  "Experimentation",
  "API",
  "Communication",
  "Accessibility",
];

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9.+#\s-]/g, " ");
}

function titleCase(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function extractRequirementKeywords(text: string) {
  const normalized = normalize(text);
  const matchedKnownSkills = knownSkills.filter((skill) => normalized.includes(skill.toLowerCase()));
  const tokens = normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !stopWords.has(token));

  return Array.from(new Set([...matchedKnownSkills, ...tokens.map(titleCase)])).slice(0, 8);
}

export function inferRequirementType(text: string): RequirementType {
  return /\b(preferred|nice to have|bonus|plus|familiarity)\b/i.test(text)
    ? RequirementType.PREFERRED
    : RequirementType.REQUIRED;
}

export function inferRequirementCategory(text: string): RequirementCategory {
  if (/\b(degree|b\.s|bachelor|master|education|university|college)\b/i.test(text)) return RequirementCategory.EDUCATION;
  if (/\b(project|portfolio|case study|prototype|shipped)\b/i.test(text)) return RequirementCategory.PROJECT;
  if (/\b(years|managed|led|owned|experience|stakeholder|customer|onboarding|renewal)\b/i.test(text)) return RequirementCategory.EXPERIENCE;
  if (/\b(saas|recruiting|healthcare|finance|domain|b2b)\b/i.test(text)) return RequirementCategory.DOMAIN;
  if (knownSkills.some((skill) => text.toLowerCase().includes(skill.toLowerCase()))) return RequirementCategory.SKILL;
  return RequirementCategory.OTHER;
}

function splitRequirementText(requirements: string) {
  return requirements
    .split(/\n|;|,(?=\s*[A-Z0-9])/)
    .map((item) => item.replace(/^[-*•]\s*/, "").trim())
    .filter((item) => item.length > 1);
}

export function parseJobRequirementDrafts(requirements: string): RequirementDraft[] {
  const items = splitRequirementText(requirements);
  const drafts = items.length ? items : [requirements.trim()].filter(Boolean);

  return drafts.map((text, index) => {
    const type = inferRequirementType(text);
    return {
      text,
      type,
      category: inferRequirementCategory(text),
      weight: type === RequirementType.REQUIRED ? DEFAULT_REQUIREMENT_WEIGHTS.required : DEFAULT_REQUIREMENT_WEIGHTS.preferred,
      keywords: extractRequirementKeywords(text),
      sortOrder: index,
    };
  });
}

function candidateSearchText(candidate: CandidateForEvaluation) {
  return normalize(
    [
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
      .join(" "),
  );
}

function scoreOneRequirement(requirement: RequirementForScoring, candidateText: string): RequirementScore {
  const keywords = requirement.keywords.length ? requirement.keywords : extractRequirementKeywords(requirement.text);
  const matchedKeywords = keywords.filter((keyword) => normalize(candidateText).includes(normalize(keyword).trim()));
  const ratio = keywords.length ? matchedKeywords.length / keywords.length : 0;
  const requiredPenalty = requirement.type === RequirementType.REQUIRED ? 0.5 : 0.65;
  const status =
    ratio >= 0.7
      ? RequirementMatchStatus.MATCHED
      : ratio > 0
        ? RequirementMatchStatus.PARTIAL
        : RequirementMatchStatus.MISSING;
  const score =
    status === RequirementMatchStatus.MATCHED
      ? requirement.weight
      : status === RequirementMatchStatus.PARTIAL
        ? Math.round(requirement.weight * ratio * requiredPenalty)
        : 0;

  return {
    requirementId: requirement.id,
    status,
    score,
    maxScore: requirement.weight,
    confidence: status === RequirementMatchStatus.MATCHED ? 0.86 : status === RequirementMatchStatus.PARTIAL ? 0.58 : 0.34,
    explanation:
      status === RequirementMatchStatus.MATCHED
        ? `Matched ${matchedKeywords.slice(0, 4).join(", ")}.`
        : status === RequirementMatchStatus.PARTIAL
          ? `Partially matched ${matchedKeywords.slice(0, 4).join(", ")}; needs validation.`
          : "No direct resume evidence found for this requirement.",
    matchedKeywords,
  };
}

function scoreCategoryForRequirement(requirement: RequirementForScoring): EvaluationScoreCategory {
  if (requirement.type === RequirementType.PREFERRED) return EvaluationScoreCategory.PREFERRED_QUALIFICATIONS;
  if (requirement.category === RequirementCategory.EXPERIENCE) return EvaluationScoreCategory.RELEVANT_EXPERIENCE;
  if (requirement.category === RequirementCategory.PROJECT) return EvaluationScoreCategory.PROJECT_ALIGNMENT;
  if (requirement.category === RequirementCategory.EDUCATION) return EvaluationScoreCategory.EDUCATION;
  if (requirement.category === RequirementCategory.DOMAIN) return EvaluationScoreCategory.DOMAIN_ALIGNMENT;
  return EvaluationScoreCategory.REQUIRED_SKILLS;
}

export function calculateCategoryScores(
  requirements: RequirementForScoring[],
  requirementScores: RequirementScore[],
) {
  const byRequirement = new Map(requirementScores.map((score) => [score.requirementId, score]));
  const grouped = new Map<EvaluationScoreCategory, { score: number; maxScore: number; weight: number; matched: number; total: number }>();

  for (const requirement of requirements) {
    const category = scoreCategoryForRequirement(requirement);
    const score = byRequirement.get(requirement.id);
    const current = grouped.get(category) ?? { score: 0, maxScore: 0, weight: 0, matched: 0, total: 0 };
    current.score += score?.score ?? 0;
    current.maxScore += score?.maxScore ?? requirement.weight;
    current.weight += requirement.weight;
    current.total += 1;
    if (score?.status === RequirementMatchStatus.MATCHED) current.matched += 1;
    grouped.set(category, current);
  }

  return Array.from(grouped.entries()).map(([category, value]) => ({
    category,
    score: value.score,
    maxScore: value.maxScore,
    weight: value.weight,
    explanation: `${value.matched} of ${value.total} requirements fully matched.`,
  }));
}

export function calculateOverallScore(categoryScores: { score: number; maxScore: number }[]) {
  const score = categoryScores.reduce((total, category) => total + category.score, 0);
  const maxScore = categoryScores.reduce((total, category) => total + category.maxScore, 0);
  return maxScore ? Math.round(clamp((score / maxScore) * 100, 0, 100)) : 0;
}

export function calculateEvaluationScoreBreakdown({
  candidate,
  job,
  requirements,
}: {
  candidate: CandidateForEvaluation;
  job: JobForEvaluation;
  requirements: RequirementForScoring[];
}): EvaluationScoreBreakdown {
  const effectiveRequirements = requirements.length
    ? requirements
    : parseJobRequirementDrafts(`${job.title}. ${job.requirements}`).map((draft, index) => ({
        ...draft,
        id: `derived-${index}`,
      }));
  const candidateText = candidateSearchText(candidate);
  const requirementScores = effectiveRequirements.map((requirement) => scoreOneRequirement(requirement, candidateText));
  const categoryScores = calculateCategoryScores(effectiveRequirements, requirementScores);
  const overallScore = calculateOverallScore(categoryScores);
  const confidence = requirementScores.length
    ? Number((requirementScores.reduce((total, score) => total + score.confidence, 0) / requirementScores.length).toFixed(2))
    : 0.4;

  return {
    overallScore,
    confidence,
    categoryScores,
    requirementScores,
  };
}
