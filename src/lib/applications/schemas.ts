import { ApplicationStatus } from "@prisma/client";
import { z } from "zod";

export const applicationStatusSchema = z.nativeEnum(ApplicationStatus);

export const createApplicationSchema = z.object({
  candidateId: z.string().min(1),
  jobId: z.string().min(1),
});

export const updateApplicationStatusSchema = z.object({
  applicationId: z.string().min(1),
  status: applicationStatusSchema,
  note: z.string().trim().max(500).optional().transform((value) => value || undefined),
});

export function parseApplicationActionInput(formData: FormData) {
  return updateApplicationStatusSchema.parse({
    applicationId: formData.get("applicationId"),
    status: formData.get("status"),
    note: formData.get("note"),
  });
}
