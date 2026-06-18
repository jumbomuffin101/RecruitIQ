import { clamp } from "@/lib/utils";

type CandidateLike = {
  name: string;
  skills: string[];
  resumeText: string;
  experienceSummary: string;
};

type JobLike = {
  title: string;
  description: string;
  requirements: string;
};

export type CandidateAnalysisResult = {
  fitScore: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  recommendedStage: "APPLIED" | "SCREENED" | "INTERVIEW" | "OFFER" | "REJECTED";
  interviewQuestions: string[];
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

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9.+#\s-]/g, " ");
}

function includesSkill(text: string, skill: string) {
  return normalize(text).includes(skill.toLowerCase());
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
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

export function analyzeCandidateForJob(
  candidate: CandidateLike,
  job: JobLike,
): CandidateAnalysisResult {
  const jobSignals = extractJobSignals(job);
  const candidateText = normalize(
    `${candidate.skills.join(" ")} ${candidate.resumeText} ${candidate.experienceSummary}`,
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

  return {
    fitScore,
    summary: `${candidate.name} appears to be a ${fitScore >= 74 ? "strong" : fitScore >= 58 ? "moderate" : "developing"} fit for ${job.title}. The score is based on matched requirements, direct skill overlap, resume depth, and unresolved requirement gaps.`,
    strengths,
    gaps,
    recommendedStage,
    interviewQuestions: [
      `Walk me through a project where you used ${focusSkill} to create a measurable outcome.`,
      `What would you need to learn or clarify first to be effective in this ${job.title} role?`,
      `Tell us about a time you worked through ambiguity with a lean team.`,
      `How would you close the gap around ${gapFocus} in your first 30 days?`,
      `Which part of this role best matches your strongest recent experience, and why?`,
    ],
  };
}
