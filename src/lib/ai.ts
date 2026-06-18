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

type AnalysisWithSource = CandidateAnalysisResult & {
  source: "openrouter" | "mock";
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

function normalizeAnalysis(value: CandidateAnalysisResult): CandidateAnalysisResult {
  const validStages = new Set(["APPLIED", "SCREENED", "INTERVIEW", "OFFER", "REJECTED"]);

  return {
    fitScore: Math.round(clamp(Number(value.fitScore) || 0, 0, 100)),
    summary: String(value.summary || "Candidate analysis generated.").slice(0, 900),
    strengths: Array.isArray(value.strengths) && value.strengths.length
      ? value.strengths.map(String).slice(0, 5)
      : ["Profile has enough information for structured review."],
    gaps: Array.isArray(value.gaps) && value.gaps.length
      ? value.gaps.map(String).slice(0, 5)
      : ["No major gaps were identified from the provided resume text."],
    recommendedStage: validStages.has(value.recommendedStage) ? value.recommendedStage : "SCREENED",
    interviewQuestions: Array.isArray(value.interviewQuestions) && value.interviewQuestions.length
      ? value.interviewQuestions.map(String).slice(0, 6)
      : ["What experience best prepares you for this role?"],
  };
}

async function analyzeWithOpenRouter(
  candidate: CandidateLike,
  job: JobLike,
): Promise<CandidateAnalysisResult | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return null;
  }

  const baseUrl = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-OpenRouter-Title": "RecruitIQ",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content:
              "You are RecruitIQ, a careful AI recruiting copilot. Return only structured JSON that matches the schema. Do not invent credentials. Prefer concrete evidence from the resume and job requirements.",
          },
          {
            role: "user",
            content: JSON.stringify({
              candidate,
              job,
              task:
                "Evaluate this candidate for this job. Score fit from 0-100, summarize evidence, list strengths and gaps, recommend one stage, and generate tailored interview questions.",
            }),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "candidate_analysis",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                fitScore: { type: "number", minimum: 0, maximum: 100 },
                summary: { type: "string" },
                strengths: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
                gaps: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
                recommendedStage: {
                  type: "string",
                  enum: ["APPLIED", "SCREENED", "INTERVIEW", "OFFER", "REJECTED"],
                },
                interviewQuestions: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 3,
                  maxItems: 6,
                },
              },
              required: [
                "fitScore",
                "summary",
                "strengths",
                "gaps",
                "recommendedStage",
                "interviewQuestions",
              ],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json() as {
      choices?: { message?: { content?: string | CandidateAnalysisResult } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    const parsed = typeof content === "string" ? JSON.parse(content) : content;

    if (!parsed) {
      return null;
    }

    return normalizeAnalysis(parsed as CandidateAnalysisResult);
  } catch {
    return null;
  }
}

export async function analyzeCandidateForJobWithFallback(
  candidate: CandidateLike,
  job: JobLike,
): Promise<AnalysisWithSource> {
  const realAnalysis = await analyzeWithOpenRouter(candidate, job);

  if (realAnalysis) {
    return { ...realAnalysis, source: "openrouter" };
  }

  return { ...analyzeCandidateForJob(candidate, job), source: "mock" };
}
