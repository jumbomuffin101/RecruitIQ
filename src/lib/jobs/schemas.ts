import { JobStatus, JobType, RequirementCategory, RequirementType } from "@prisma/client";
import { z } from "zod";
import {
  DEFAULT_RUBRIC_WEIGHTS,
  MAX_REQUIREMENT_WEIGHT,
  MAX_REQUIREMENTS_PER_JOB,
  RUBRIC_TOTAL,
} from "@/lib/evaluations/constants";

const keywordSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .transform((value) => value.replace(/\s+/g, " "));

export const jobRequirementInputSchema = z.object({
  id: z.string().optional(),
  text: z.string().trim().min(3, "Requirement text is required.").max(260),
  type: z.nativeEnum(RequirementType),
  category: z.nativeEnum(RequirementCategory),
  weight: z.coerce.number().int().min(1).max(MAX_REQUIREMENT_WEIGHT),
  keywords: z.array(keywordSchema).max(12).default([]),
  isCritical: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const rubricInputSchema = z
  .object({
    requiredSkillsWeight: z.coerce.number().int().min(0).max(100).default(DEFAULT_RUBRIC_WEIGHTS.REQUIRED_SKILLS),
    preferredWeight: z.coerce.number().int().min(0).max(100).default(DEFAULT_RUBRIC_WEIGHTS.PREFERRED_QUALIFICATIONS),
    experienceWeight: z.coerce.number().int().min(0).max(100).default(DEFAULT_RUBRIC_WEIGHTS.RELEVANT_EXPERIENCE),
    projectWeight: z.coerce.number().int().min(0).max(100).default(DEFAULT_RUBRIC_WEIGHTS.PROJECT_ALIGNMENT),
    educationWeight: z.coerce.number().int().min(0).max(100).default(DEFAULT_RUBRIC_WEIGHTS.EDUCATION),
    domainWeight: z.coerce.number().int().min(0).max(100).default(DEFAULT_RUBRIC_WEIGHTS.DOMAIN_ALIGNMENT),
  })
  .superRefine((value, context) => {
    const total =
      value.requiredSkillsWeight +
      value.preferredWeight +
      value.experienceWeight +
      value.projectWeight +
      value.educationWeight +
      value.domainWeight;

    if (total !== RUBRIC_TOTAL) {
      context.addIssue({
        code: "custom",
        message: `Rubric weights must total ${RUBRIC_TOTAL}%. Current total is ${total}%.`,
      });
    }
  });

export const jobFormSchema = z
  .object({
    title: z.string().trim().min(2, "Job title is required.").max(120),
    department: z.string().trim().min(2, "Department is required.").max(80),
    location: z.string().trim().min(2, "Location is required.").max(120),
    type: z.nativeEnum(JobType),
    status: z.nativeEnum(JobStatus),
    description: z.string().trim().min(10, "Description is required.").max(4000),
    requirements: z.string().trim().min(3).max(5000),
    structuredRequirements: z.array(jobRequirementInputSchema).min(1).max(MAX_REQUIREMENTS_PER_JOB),
    rubric: rubricInputSchema,
  })
  .superRefine((value, context) => {
    const seen = new Set<string>();
    for (const [index, requirement] of value.structuredRequirements.entries()) {
      const key = requirement.text.toLowerCase().replace(/\s+/g, " ").trim();
      if (seen.has(key)) {
        context.addIssue({
          code: "custom",
          path: ["structuredRequirements", index, "text"],
          message: "Duplicate requirements are not allowed.",
        });
      }
      seen.add(key);
    }

    const hasRequiredWeight = value.structuredRequirements.some(
      (requirement) => requirement.type === RequirementType.REQUIRED && requirement.weight > 0,
    );
    if (!hasRequiredWeight) {
      context.addIssue({
        code: "custom",
        path: ["structuredRequirements"],
        message: "At least one required qualification should have positive weight.",
      });
    }
  });

export type JobRequirementInput = z.infer<typeof jobRequirementInputSchema>;
export type RubricInput = z.infer<typeof rubricInputSchema>;
export type JobFormInput = z.infer<typeof jobFormSchema>;

export type JobActionState = {
  status: "idle" | "error";
  message?: string;
};

export const initialJobActionState: JobActionState = { status: "idle" };

export function parseJsonField<T>(value: FormDataEntryValue | null, fallback: T) {
  if (typeof value !== "string" || !value.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function getJobFormInput(formData: FormData): JobFormInput {
  const structuredRequirements = parseJsonField<unknown[]>(formData.get("structuredRequirements"), []);
  const rubric = parseJsonField<Record<string, unknown>>(formData.get("rubric"), {});
  const requirementsText =
    String(formData.get("requirements") ?? "").trim() ||
    structuredRequirements
      .map((requirement) => {
        if (typeof requirement === "object" && requirement && "text" in requirement) {
          return String((requirement as { text?: unknown }).text ?? "");
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");

  return jobFormSchema.parse({
    title: formData.get("title"),
    department: formData.get("department"),
    location: formData.get("location"),
    type: formData.get("type") || JobType.FULL_TIME,
    status: formData.get("status") || JobStatus.OPEN,
    description: formData.get("description"),
    requirements: requirementsText,
    structuredRequirements,
    rubric,
  });
}

export function formatJobFormError(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Review the job rubric and requirements.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "The job could not be saved. Please review the form and try again.";
}
