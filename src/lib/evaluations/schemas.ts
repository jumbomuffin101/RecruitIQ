import { z } from "zod";

const textField = z
  .string()
  .trim()
  .min(12)
  .max(1200)
  .transform((value) => value.replace(/\s+/g, " "));

const listField = z
  .array(z.string().trim().min(4).max(300))
  .default([])
  .transform((items) => items.map((item) => item.replace(/\s+/g, " ")).filter(Boolean).slice(0, 5));

export const candidateAnalysisResponseSchema = z.object({
  summary: textField,
  roleMatch: textField,
  strengths: listField.refine((items) => items.length > 0, "At least one strength is required."),
  gaps: listField.refine((items) => items.length > 0, "At least one gap is required."),
  nextStep: textField,
  technicalQuestions: listField,
  behavioralQuestions: listField,
  resumeSpecificQuestions: listField,
});

export type ValidatedCandidateAnalysis = z.infer<typeof candidateAnalysisResponseSchema>;

export function validateCandidateAnalysisResponse(value: unknown) {
  const result = candidateAnalysisResponseSchema.safeParse(value);
  if (!result.success) {
    return {
      success: false as const,
      error: result.error.issues.map((issue) => issue.message).join("; ") || "Invalid AI response shape.",
    };
  }

  return {
    success: true as const,
    data: result.data,
  };
}
