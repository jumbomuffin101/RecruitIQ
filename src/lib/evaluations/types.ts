import type {
  EvaluationScoreCategory,
  RequirementCategory,
  RequirementMatchStatus,
  RequirementType,
} from "@prisma/client";

export type RequirementDraft = {
  text: string;
  type: RequirementType;
  category: RequirementCategory;
  weight: number;
  keywords: string[];
  isCritical: boolean;
  sortOrder: number;
};

export type RequirementForScoring = RequirementDraft & {
  id: string;
};

export type CandidateForEvaluation = {
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

export type JobForEvaluation = {
  title: string;
  description: string;
  requirements: string;
};

export type RequirementScore = {
  requirementId: string;
  status: RequirementMatchStatus;
  score: number;
  maxScore: number;
  confidence: number;
  explanation: string;
  matchedKeywords: string[];
};

export type CategoryScore = {
  category: EvaluationScoreCategory;
  score: number;
  maxScore: number;
  weight: number;
  explanation: string;
};

export type EvaluationScoreBreakdown = {
  overallScore: number;
  confidence: number;
  hasMissingCritical: boolean;
  categoryScores: CategoryScore[];
  requirementScores: RequirementScore[];
  scoreTrace: ScoreTraceCategory[];
};

export type ScoreTraceCategory = {
  category: EvaluationScoreCategory;
  maxPoints: number;
  earnedPoints: number;
  requirements: Array<{
    id: string;
    text: string;
    matchStatus: RequirementMatchStatus;
    contribution: number;
    maxPoints: number;
    evidence: string[];
  }>;
};

export type RubricWeights = {
  REQUIRED_SKILLS: number;
  PREFERRED_QUALIFICATIONS: number;
  RELEVANT_EXPERIENCE: number;
  PROJECT_ALIGNMENT: number;
  EDUCATION: number;
  DOMAIN_ALIGNMENT: number;
};

export type EvidenceMatch = {
  requirementId: string;
  resumeSection: string | null;
  excerpt: string;
  startOffset: number;
  endOffset: number;
  confidence: number;
};
