import { callOpenRouterJson } from "@/lib/openrouter";

export type ResumeExtraction = {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  githubUrl: string;
  educationSummary: string;
  currentTitle: string;
  currentCompany: string;
  skills: string[];
  experienceSummary: string;
  projectsSummary: string;
  resumeSummary: string;
  yearsExperience: number | null;
};

const sectionNames = ["EDUCATION", "EXPERIENCE", "WORK EXPERIENCE", "PROFESSIONAL EXPERIENCE", "PROJECTS", "SKILLS", "TECHNICAL SKILLS", "CERTIFICATIONS", "AWARDS"];
const knownSkills = [
  "Python", "Java", "C++", "C#", "Go", "Ruby", "SQL", "TypeScript", "JavaScript", "HTML", "CSS",
  "FastAPI", "NestJS", "Node.js", "React", "Next.js", "PostgreSQL", "MySQL", "MongoDB", "Prisma",
  "Docker", "Kubernetes", "AWS", "Azure", "GCP", "CI/CD", "REST APIs", "GraphQL", "Git", "Figma",
  "Analytics", "CRM", "Salesforce", "HubSpot", "Customer Success", "Product Design", "User Research",
];

function compact(value: string, maxLength = 700) {
  const cleaned = value.replace(/[•●▪]/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  const shortened = cleaned.slice(0, maxLength);
  return `${shortened.slice(0, Math.max(shortened.lastIndexOf("."), shortened.lastIndexOf(" ")))}.`;
}

function prepareSections(rawText: string) {
  let prepared = rawText.replace(/\r/g, "\n");
  for (const section of sectionNames.sort((a, b) => b.length - a.length)) {
    prepared = prepared.replace(new RegExp(`\\s*\\b${section}\\b\\s*`, "gi"), `\n${section}\n`);
  }
  return prepared.replace(/\n{3,}/g, "\n\n").trim();
}

function extractSection(prepared: string, names: string[]) {
  const headings = sectionNames.join("|");
  for (const name of names) {
    const match = prepared.match(new RegExp(`(?:^|\\n)${name}\\n([\\s\\S]*?)(?=\\n(?:${headings})\\n|$)`, "i"));
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function extractName(rawText: string) {
  const firstLine = rawText.split(/\r?\n|\|/).map((line) => line.trim()).find(Boolean) ?? "";
  const words = firstLine.match(/[A-Z][A-Za-z'-]+/g) ?? [];
  return words.slice(0, 2).join(" ");
}

function extractLocation(rawText: string, name: string) {
  const header = rawText.slice(0, 500).replace(name, " ");
  const states = "Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming";
  const match = header.match(new RegExp(`\\b([A-Z][a-zA-Z.'-]+(?:\\s+[A-Z][a-zA-Z.'-]+){0,2}),\\s*(?:[A-Z]{2}|${states})\\b`));
  return match?.[0] ?? "";
}

function extractUrl(rawText: string, domain: "linkedin.com" | "github.com") {
  const match = rawText.match(new RegExp(`(?:https?:\\/\\/)?(?:www\\.)?${domain.replace(".", "\\.")}\\/[^\\s|,)]+`, "i"));
  if (!match) return "";
  return match[0].startsWith("http") ? match[0] : `https://${match[0]}`;
}

function extractSkills(skillsSection: string, rawText: string) {
  const sectionTokens = skillsSection
    .replace(/\b(?:languages|frameworks|libraries|databases|tools|technologies|cloud)\s*:/gi, " ")
    .split(/[,|;\n•●▪]+/)
    .map((skill) => skill.trim())
    .filter((skill) => skill.length >= 2 && skill.length <= 35 && !/^(education|experience|projects)$/i.test(skill));
  const scanned = knownSkills.filter((skill) => new RegExp(`(^|[^a-z0-9])${skill.replace(/[.+/#-]/g, "\\$&")}([^a-z0-9]|$)`, "i").test(rawText));
  return Array.from(new Set([...sectionTokens, ...scanned])).slice(0, 24);
}

function extractRecentRole(experience: string) {
  const lines = experience.split(/\n|\|/).map((line) => compact(line, 140)).filter(Boolean).slice(0, 10);
  const titlePattern = /engineer|developer|intern|assistant|manager|designer|analyst|researcher|consultant|specialist|director|lead|coordinator|associate/i;
  const currentTitle = lines.find((line) => titlePattern.test(line) && !/responsib|built|managed|developed|created/i.test(line)) ?? "";
  const titleIndex = lines.indexOf(currentTitle);
  const candidates = [lines[titleIndex + 1], lines[titleIndex - 1]].filter(Boolean) as string[];
  const currentCompany = candidates.find((line) => !titlePattern.test(line) && !/\b(19|20)\d{2}\b/.test(line) && line.length < 90) ?? "";
  return { currentTitle, currentCompany };
}

function estimateYears(rawText: string, experience: string) {
  const explicit = rawText.match(/(\d+(?:\.\d+)?)\+?\s+years?(?:\s+of)?\s+experience/i);
  if (explicit) return Math.min(40, Number(explicit[1]));
  const years = Array.from(experience.matchAll(/\b(19\d{2}|20\d{2})\b/g), (match) => Number(match[1]));
  if (!years.length) return null;
  const earliest = Math.min(...years);
  const latest = Math.max(new Date().getFullYear(), ...years);
  return Math.max(0, Math.min(40, latest - earliest));
}

export function extractResumeDeterministically(rawText: string): ResumeExtraction {
  const prepared = prepareSections(rawText);
  const name = extractName(rawText);
  const email = rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const phone = rawText.match(/(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}/)?.[0]?.trim() ?? "";
  const education = extractSection(prepared, ["EDUCATION"]);
  const experience = extractSection(prepared, ["EXPERIENCE", "WORK EXPERIENCE", "PROFESSIONAL EXPERIENCE"]);
  const projects = extractSection(prepared, ["PROJECTS"]);
  const skillsSection = extractSection(prepared, ["SKILLS", "TECHNICAL SKILLS"]);
  const skills = extractSkills(skillsSection, rawText);
  const { currentTitle, currentCompany } = extractRecentRole(experience);
  const yearsExperience = estimateYears(rawText, experience);
  const experienceSummary = compact(experience, 650);
  const educationSummary = compact(education, 350);
  const projectsSummary = compact(projects, 450);
  const summaryParts = [
    `${name || "This candidate"}${currentTitle ? ` is a ${currentTitle}` : " is a professional"}${yearsExperience !== null ? ` with approximately ${yearsExperience} years of experience` : ""}.`,
    experienceSummary ? `Recent experience includes ${compact(experienceSummary, 240)}` : "",
    skills.length ? `Core skills include ${skills.slice(0, 8).join(", ")}.` : "",
    educationSummary ? `Education includes ${compact(educationSummary, 180)}` : "",
  ].filter(Boolean);

  return {
    name,
    email,
    phone,
    location: extractLocation(rawText, name),
    linkedinUrl: extractUrl(rawText, "linkedin.com"),
    githubUrl: extractUrl(rawText, "github.com"),
    educationSummary,
    currentTitle,
    currentCompany,
    skills,
    experienceSummary,
    projectsSummary,
    resumeSummary: compact(summaryParts.join(" "), 850),
    yearsExperience,
  };
}

function normalizeExtraction(value: Partial<ResumeExtraction>, fallback: ResumeExtraction): ResumeExtraction {
  return {
    ...fallback,
    ...Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== null && entry !== undefined && entry !== "")),
    skills: Array.isArray(value.skills) && value.skills.length ? value.skills.map(String).slice(0, 24) : fallback.skills,
    yearsExperience: typeof value.yearsExperience === "number" ? Math.max(0, Math.min(40, value.yearsExperience)) : fallback.yearsExperience,
  };
}

async function extractWithOpenRouter(rawText: string, fallback: ResumeExtraction) {
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      name: { type: "string" },
      email: { type: "string" },
      phone: { type: "string" },
      location: { type: "string" },
      linkedinUrl: { type: "string" },
      githubUrl: { type: "string" },
      educationSummary: { type: "string" },
      currentTitle: { type: "string" },
      currentCompany: { type: "string" },
      skills: { type: "array", items: { type: "string" } },
      experienceSummary: { type: "string" },
      projectsSummary: { type: "string" },
      resumeSummary: { type: "string" },
      yearsExperience: { type: ["number", "null"] },
    },
    required: [
      "name",
      "email",
      "phone",
      "location",
      "linkedinUrl",
      "githubUrl",
      "educationSummary",
      "currentTitle",
      "currentCompany",
      "skills",
      "experienceSummary",
      "projectsSummary",
      "resumeSummary",
      "yearsExperience",
    ],
  };

  const parsed = await callOpenRouterJson<ResumeExtraction>({
    context: "resume extraction",
    schema,
    temperature: 0,
    maxTokens: 1400,
    timeoutMs: 45_000,
    systemPrompt:
      "Extract factual candidate data from the resume. Return strict JSON only. Do not invent missing facts. Summaries must be concise and professional, not raw resume dumps.",
    prompt:
      "Improve structured resume extraction. Improve resumeSummary, educationSummary, experienceSummary, projectsSummary, currentTitle, currentCompany, and skills only when the resume supports it. Preserve contact fields from the resume.",
    input: {
      deterministicFallback: fallback,
      resumeTextExcerpt: rawText.slice(0, 8_000),
    },
  });

  return parsed ? normalizeExtraction(parsed, fallback) : null;
}

export async function extractResumeWithFallback(rawText: string) {
  const fallback = extractResumeDeterministically(rawText);
  return (await extractWithOpenRouter(rawText, fallback)) ?? fallback;
}
