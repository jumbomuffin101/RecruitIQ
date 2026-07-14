import { RequirementMatchStatus } from "@prisma/client";
import type { EvidenceMatch, RequirementForScoring, RequirementScore } from "@/lib/evaluations/types";

const sectionHeadings = ["education", "experience", "work experience", "professional experience", "projects", "skills", "technical skills"];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9.+#\s-]/g, " ");
}

function findResumeSection(resumeText: string, offset: number) {
  const before = resumeText.slice(0, offset).toLowerCase();
  const candidates = sectionHeadings
    .map((heading) => ({ heading, index: before.lastIndexOf(heading) }))
    .filter((entry) => entry.index >= 0)
    .sort((a, b) => b.index - a.index);

  return candidates[0]?.heading.replace(/\b\w/g, (letter) => letter.toUpperCase()) ?? null;
}

function createExcerpt(resumeText: string, start: number, end: number) {
  const excerptStart = Math.max(0, start - 120);
  const excerptEnd = Math.min(resumeText.length, end + 160);
  return {
    excerpt: resumeText.slice(excerptStart, excerptEnd).trim(),
    startOffset: excerptStart,
    endOffset: excerptEnd,
  };
}

export function findEvidenceForRequirement({
  resumeText,
  requirement,
  score,
}: {
  resumeText: string;
  requirement: RequirementForScoring;
  score: RequirementScore;
}): EvidenceMatch | null {
  if (score.status === RequirementMatchStatus.MISSING) {
    return null;
  }

  const normalizedResume = normalize(resumeText);
  const keyword = score.matchedKeywords.find((item) => normalize(item).trim().length > 1);
  if (!keyword) {
    return null;
  }

  const normalizedKeyword = normalize(keyword).trim();
  const normalizedIndex = normalizedResume.indexOf(normalizedKeyword);
  if (normalizedIndex < 0) {
    return null;
  }

  const rawNeedle = resumeText
    .slice(Math.max(0, normalizedIndex - 10), Math.min(resumeText.length, normalizedIndex + normalizedKeyword.length + 10));
  const rawMatch = rawNeedle.match(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  const startOffset = rawMatch?.index !== undefined ? Math.max(0, normalizedIndex - 10) + rawMatch.index : normalizedIndex;
  const endOffset = Math.min(resumeText.length, startOffset + keyword.length);
  const excerpt = createExcerpt(resumeText, startOffset, endOffset);

  return {
    requirementId: requirement.id,
    resumeSection: findResumeSection(resumeText, startOffset),
    excerpt: excerpt.excerpt,
    startOffset: excerpt.startOffset,
    endOffset: excerpt.endOffset,
    confidence: score.confidence,
  };
}

export function collectEvidence({
  resumeText,
  requirements,
  scores,
}: {
  resumeText: string;
  requirements: RequirementForScoring[];
  scores: RequirementScore[];
}) {
  const byRequirement = new Map(requirements.map((requirement) => [requirement.id, requirement]));

  return scores
    .map((score) => {
      const requirement = byRequirement.get(score.requirementId);
      return requirement ? findEvidenceForRequirement({ resumeText, requirement, score }) : null;
    })
    .filter((item): item is EvidenceMatch => Boolean(item));
}
