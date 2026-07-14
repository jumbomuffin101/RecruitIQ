export const SCORING_VERSION = "evaluation-v1";
export const PROMPT_VERSION = "candidate-analysis-v2";

export const RECOMMENDATION_THRESHOLDS = {
  interview: 85,
  screened: 70,
  applied: 50,
} as const;

export const DEFAULT_REQUIREMENT_WEIGHTS = {
  required: 12,
  preferred: 6,
} as const;

export const CATEGORY_SCORE_LABELS = {
  REQUIRED_SKILLS: "Required Skills",
  PREFERRED_QUALIFICATIONS: "Preferred Qualifications",
  RELEVANT_EXPERIENCE: "Relevant Experience",
  PROJECT_ALIGNMENT: "Project Alignment",
  EDUCATION: "Education",
  DOMAIN_ALIGNMENT: "Domain Alignment",
} as const;
