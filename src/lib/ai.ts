import { requestOpenRouterJson } from "@/lib/openrouter";
import { clamp } from "@/lib/utils";

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
  recommendedStage: "Applied" | "Screened" | "Interview" | "Offer" | "Rejected";
  nextStep: string;
  technicalQuestions: string[];
  behavioralQuestions: string[];
  resumeSpecificQuestions: string[];
};

type AnalysisWithSource = CandidateAnalysisResult & {
  source: "openrouter" | "deterministic";
};

const stopWords = new Set([
  "and",
  "the",
  "for",
  "with",
  "you",
  "are",
  "our",
  "will",
  "from",
  "that",
  "this",
  "have",
  "has",
  "into",
  "role",
  "team",
  "work",
  "using",
  "build",
  "ability",
  "experience",
]);

const importantSkills = [
  "react",
  "next.js",
  "typescript",
  "javascript",
  "node",
  "postgresql",
  "sql",
  "prisma",
  "aws",
  "python",
  "analytics",
  "sales",
  "customer",
  "operations",
  "design",
  "figma",
  "marketing",
  "leadership",
  "communication",
  "recruiting",
  "sourcing",
  "crm",
  "api",
];

const stageMap = {
  Applied: "APPLIED",
  Screened: "SCREENED",
  Interview: "INTERVIEW",
  Offer: "OFFER",
  Rejected: "REJECTED",
} as const;

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9.+#\s-]/g, " ");
}

function includesSkill(text: string, skill: string) {
  return normalize(text).includes(skill.toLowerCase());
}

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

function extractJobSignals(job: JobLike) {
  const text = normalize(`${job.title} ${job.description} ${job.requirements}`);
  const explicitSkills = importantSkills.filter((skill) => includesSkill(text, skill));
  const tokens = text
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 3 && !stopWords.has(token));

  return unique([...explicitSkills, ...tokens]).slice(0, 18);
}

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
): CandidateAnalysisResult {
  const jobSignals = extractJobSignals(job);
  const candidateText = normalize(
    `${candidate.skills.join(" ")} ${candidate.resumeText} ${candidate.resumeSummary ?? ""} ${candidate.experienceSummary} ${candidate.projectsSummary ?? ""}`,
  );
  const candidateSkills = candidate.skills.map((skill) => skill.toLowerCase());

  const matchedSignals = jobSignals.filter((signal) => includesSkill(candidateText, signal));
  const missingSignals = jobSignals.filter((signal) => !includesSkill(candidateText, signal)).slice(0, 5);
  const directSkillMatches = importantSkills.filter(
    (skill) => includesSkill(`${job.description} ${job.requirements}`, skill)
      && (candidateSkills.includes(skill) || includesSkill(candidateText, skill)),
  );

  const matchRatio = jobSignals.length ? matchedSignals.length / jobSignals.length : 0.45;
  const directSkillBonus = Math.min(directSkillMatches.length * 5, 20);
  const resumeDepthBonus = candidate.resumeText.length > 700 ? 8 : candidate.resumeText.length > 350 ? 4 : 0;
  const missingPenalty = Math.min(missingSignals.length * 4, 18);
  const fitScore = Math.round(
    clamp(42 + matchRatio * 45 + directSkillBonus + resumeDepthBonus - missingPenalty, 18, 96),
  );

  const recommendedStage =
    fitScore >= 88
      ? "OFFER"
      : fitScore >= 74
        ? "INTERVIEW"
        : fitScore >= 58
          ? "SCREENED"
          : fitScore >= 40
            ? "APPLIED"
            : "REJECTED";

  const primaryMatches = matchedSignals.slice(0, 4);
  const strengths = [
    primaryMatches.length
      ? `Matches key role signals: ${primaryMatches.join(", ")}.`
      : "Shows transferable experience that may map to the role.",
    directSkillMatches.length
      ? `Has direct skill overlap in ${directSkillMatches.slice(0, 4).join(", ")}.`
      : "Resume includes enough context for a structured screening conversation.",
    candidate.experienceSummary.length > 80
      ? "Experience summary gives clear evidence to evaluate scope and ownership."
      : "Profile is concise and easy to review quickly.",
  ];

  const gaps = missingSignals.length
    ? missingSignals.slice(0, 3).map((signal) => `Needs validation around ${signal}.`)
    : ["No major gaps detected from the provided resume text."];

  const focusSkill = directSkillMatches[0] ?? matchedSignals[0] ?? jobSignals[0] ?? job.title;
  const gapFocus = missingSignals[0] ?? "role-specific execution";
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
    summary: `${candidate.name} appears to be a ${fitScore >= 74 ? "strong" : fitScore >= 58 ? "moderate" : "developing"} fit for ${job.title}. The score is based on matched requirements, direct skill overlap, resume depth, and unresolved requirement gaps.`,
    roleMatch: primaryMatches.length
      ? `${candidate.name} matches ${primaryMatches.join(", ")} against the ${job.title} requirements.`
      : `${candidate.name} may have transferable experience, but direct requirement overlap needs validation.`,
    strengths,
    gaps,
    recommendedStage,
    nextStep: recommendedStage === "REJECTED"
      ? "Hold for now unless a better-fit role opens."
      : recommendedStage === "OFFER"
        ? "Prioritize final hiring-manager calibration and references."
        : recommendedStage === "INTERVIEW"
          ? "Schedule a structured interview focused on the strongest matched skills and unresolved gaps."
          : "Run a focused recruiter screen before advancing.",
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
  const recommendedStage = value.recommendedStage && value.recommendedStage in stageMap
    ? stageMap[value.recommendedStage]
    : deterministic.recommendedStage;
  const technicalQuestions = cleanList(value.technicalQuestions, deterministic.technicalQuestions, 4);
  const behavioralQuestions = cleanList(value.behavioralQuestions, deterministic.behavioralQuestions, 4);
  const resumeSpecificQuestions = cleanList(value.resumeSpecificQuestions, deterministic.resumeSpecificQuestions, 4);

  return {
    fitScore: deterministic.fitScore,
    summary: cleanText(value.summary, deterministic.summary),
    roleMatch: cleanText(value.roleMatch, deterministic.roleMatch),
    strengths: cleanList(value.strengths, deterministic.strengths, 5),
    gaps: cleanList(value.gaps, deterministic.gaps, 5),
    recommendedStage,
    nextStep: cleanText(value.nextStep, deterministic.nextStep, 500),
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
): Promise<CandidateAnalysisResult | null> {
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: { type: "string" },
      roleMatch: { type: "string" },
      strengths: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
      gaps: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
      recommendedStage: {
        type: "string",
        enum: ["Applied", "Screened", "Interview", "Offer", "Rejected"],
      },
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
      "recommendedStage",
      "nextStep",
      "technicalQuestions",
      "behavioralQuestions",
      "resumeSpecificQuestions",
    ],
  };

  const parsed = await requestOpenRouterJson<OpenRouterAnalysisResult>({
    context: "candidate analysis",
    schemaName: "candidate_analysis",
    schema,
    temperature: 0.15,
    maxTokens: 1300,
    messages: [
      {
        role: "system",
        content:
          "You are RecruitIQ, a careful AI recruiting copilot. Return strict JSON only. Be concise, recruiter-friendly, and evidence-based. Do not invent employers, degrees, dates, or credentials.",
      },
      {
        role: "user",
        content: JSON.stringify({
          deterministicFitScore: deterministic.fitScore,
          deterministicRecommendedStage: deterministic.recommendedStage,
          candidate: {
            name: candidate.name,
            currentTitle: candidate.currentTitle,
            currentCompany: candidate.currentCompany,
            skills: candidate.skills,
            resumeSummary: candidate.resumeSummary,
            experienceSummary: candidate.experienceSummary,
            educationSummary: candidate.educationSummary,
            projectsSummary: candidate.projectsSummary,
            resumeTextExcerpt: candidate.resumeText.slice(0, 8000),
          },
          job,
          instructions:
            "Create an executive candidate summary, role match explanation, strengths, risks or gaps, suggested next step, and interview kit. Explain the deterministic score; do not create a new score.",
        }),
      },
    ],
  });

  return parsed ? normalizeAnalysis(parsed, deterministic) : null;
}

export async function analyzeCandidateForJobWithFallback(
  candidate: CandidateLike,
  job: JobLike,
): Promise<AnalysisWithSource> {
  const deterministic = analyzeCandidateForJob(candidate, job);
  const aiAnalysis = await analyzeWithOpenRouter(candidate, job, deterministic);

  if (aiAnalysis) {
    return { ...aiAnalysis, source: "openrouter" };
  }

  return { ...deterministic, source: "deterministic" };
}
