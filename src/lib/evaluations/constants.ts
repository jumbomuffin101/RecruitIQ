export const SCORING_VERSION = "evaluation-v2";
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

export const DEFAULT_RUBRIC_WEIGHTS = {
  REQUIRED_SKILLS: 30,
  RELEVANT_EXPERIENCE: 25,
  PROJECT_ALIGNMENT: 15,
  EDUCATION: 10,
  PREFERRED_QUALIFICATIONS: 10,
  DOMAIN_ALIGNMENT: 10,
} as const;

export const RUBRIC_TOTAL = 100;
export const MAX_REQUIREMENTS_PER_JOB = 24;
export const MAX_REQUIREMENT_WEIGHT = 50;
