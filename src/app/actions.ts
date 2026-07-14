"use server";

import {
  ActivityType,
  CandidateStatus,
  JobStatus,
  JobType,
  Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getWorkspaceOrganization } from "@/lib/data";
import {
  createEvaluationErrorState,
  createEvaluationSuccessState,
  type EvaluationActionState,
} from "@/lib/evaluations/action-state";
import { evaluateCandidateForJob } from "@/lib/evaluations/service";
import { parseJobRequirementDrafts } from "@/lib/evaluations/scoring";
import { getPrisma } from "@/lib/prisma";
import { extractResumeWithFallback } from "@/lib/resume-extract";

function requiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}

function optionalString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length ? value : null;
}

function parseSkills(value: string) {
  return value
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
}

function optionalFloat(formData: FormData, key: string) {
  const rawValue = String(formData.get(key) ?? "").trim();
  if (!rawValue) return null;
  const value = Number(rawValue);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export type CandidateFormState = {
  error: string;
  duplicateEmail?: string;
} | null;

function isPrismaKnownError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

function safeEvaluationActionError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message.slice(0, 220);
  }

  return "Candidate evaluation could not be completed. Please try again.";
}

export async function parseResumeAction(formData: FormData) {
  const resumeText = requiredString(formData, "resumeText");
  if (resumeText.length > 100_000) {
    return { success: false as const, error: "Resume text is too long. Please keep it under 100,000 characters." };
  }
  try {
    const data = await extractResumeWithFallback(resumeText);
    return { success: true as const, data };
  } catch {
    return { success: false as const, error: "We could not extract candidate details. You can continue with manual entry." };
  }
}

export async function createJob(formData: FormData) {
  const prisma = getPrisma();
  const org = await getWorkspaceOrganization();
  const requirements = requiredString(formData, "requirements");

  await prisma.$transaction(async (tx) => {
    const job = await tx.job.create({
      data: {
        organizationId: org.id,
        title: requiredString(formData, "title"),
        department: requiredString(formData, "department"),
        location: requiredString(formData, "location"),
        type: String(formData.get("type") ?? "FULL_TIME") as JobType,
        description: requiredString(formData, "description"),
        requirements,
        status: String(formData.get("status") ?? "OPEN") as JobStatus,
      },
    });

    const requirementDrafts = parseJobRequirementDrafts(requirements);
    if (requirementDrafts.length) {
      await tx.jobRequirement.createMany({
        data: requirementDrafts.map((requirement) => ({
          jobId: job.id,
          text: requirement.text,
          type: requirement.type,
          category: requirement.category,
          weight: requirement.weight,
          keywords: requirement.keywords,
          sortOrder: requirement.sortOrder,
        })),
      });
    }

    await tx.activityLog.create({
      data: {
        organizationId: org.id,
        type: ActivityType.JOB_CREATED,
        message: "A new job was created.",
      },
    });
  });

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  redirect("/jobs");
}

export async function createCandidate(_previousState: CandidateFormState, formData: FormData): Promise<CandidateFormState> {
  const prisma = getPrisma();
  const org = await getWorkspaceOrganization();
  const roleAppliedFor = requiredString(formData, "roleAppliedFor");
  const experienceSummary = requiredString(formData, "experienceSummary");
  const resumeSummary = optionalString(formData, "resumeSummary") ?? experienceSummary;
  const resumeText = optionalString(formData, "resumeText") ?? resumeSummary;
  const email = requiredString(formData, "email");
  let candidateId: string;

  try {
    const candidate = await prisma.$transaction(async (tx) => {
      const createdCandidate = await tx.candidate.create({
        data: {
          organizationId: org.id,
          name: requiredString(formData, "name"),
          email,
          phone: optionalString(formData, "phone"),
          location: optionalString(formData, "location"),
          linkedinUrl: optionalString(formData, "linkedinUrl"),
          githubUrl: optionalString(formData, "githubUrl"),
          educationSummary: optionalString(formData, "educationSummary"),
          currentTitle: optionalString(formData, "currentTitle"),
          currentCompany: optionalString(formData, "currentCompany"),
          projectsSummary: optionalString(formData, "projectsSummary"),
          yearsExperience: optionalFloat(formData, "yearsExperience"),
          resumeSummary,
          roleAppliedFor,
          resumeText,
          skills: parseSkills(requiredString(formData, "skills")),
          experienceSummary,
          status: String(formData.get("status") ?? "APPLIED") as CandidateStatus,
          notes: optionalString(formData, "notes"),
        },
      });

      const matchingJob = await tx.job.findFirst({
        where: {
          organizationId: org.id,
          title: { contains: roleAppliedFor, mode: "insensitive" },
        },
      });

      if (matchingJob) {
        await tx.application.create({
          data: {
            organizationId: org.id,
            candidateId: createdCandidate.id,
            jobId: matchingJob.id,
            status: createdCandidate.status,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          organizationId: org.id,
          type: ActivityType.CANDIDATE_CREATED,
          message: `${createdCandidate.name} was added to the pipeline.`,
        },
      });

      return createdCandidate;
    });
    candidateId = candidate.id;
  } catch (error) {
    if (isPrismaKnownError(error) && error.code === "P2002") {
      return {
        error: "A candidate with that email already exists in this workspace. Open the existing profile or use a different email.",
        duplicateEmail: email,
      };
    }

    console.error("[Candidate] create failed", error);
    return { error: "Candidate could not be saved. Please review the details and try again." };
  }

  revalidatePath("/candidates");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  redirect(`/candidates/${candidateId}`);
}

export async function updateCandidateStatus(formData: FormData) {
  const prisma = getPrisma();
  const candidateId = requiredString(formData, "candidateId");
  const status = String(formData.get("status") ?? "APPLIED") as CandidateStatus;
  const org = await getWorkspaceOrganization();

  const existingCandidate = await prisma.candidate.findFirst({
    where: { id: candidateId, organizationId: org.id },
    select: { id: true },
  });

  if (!existingCandidate) {
    throw new Error("Candidate not found in the active workspace.");
  }

  const candidate = await prisma.candidate.update({
    where: { id: existingCandidate.id },
    data: {
      status,
      applications: { updateMany: { where: { organizationId: org.id }, data: { status } } },
    },
  });

  await prisma.activityLog.create({
    data: {
      organizationId: org.id,
      type: ActivityType.STATUS_CHANGED,
      message: `${candidate.name} moved to ${status}.`,
      metadata: { candidateId, status },
    },
  });

  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  revalidatePath(`/candidates/${candidateId}`);
}

export async function deleteCandidate(formData: FormData) {
  const prisma = getPrisma();
  const candidateId = requiredString(formData, "candidateId");
  const org = await getWorkspaceOrganization();

  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, organizationId: org.id },
    select: { id: true },
  });

  if (!candidate) {
    throw new Error("Candidate not found");
  }

  await prisma.candidate.delete({ where: { id: candidate.id } });

  revalidatePath("/candidates");
  revalidatePath("/dashboard");
  revalidatePath("/pipeline");
  revalidatePath("/analytics");
  revalidatePath("/compare");
  redirect("/candidates?deleted=candidate");
}

export async function deleteJob(formData: FormData) {
  const prisma = getPrisma();
  const jobId = requiredString(formData, "jobId");
  const org = await getWorkspaceOrganization();

  const job = await prisma.job.findFirst({
    where: { id: jobId, organizationId: org.id },
    select: { id: true },
  });

  if (!job) {
    throw new Error("Job not found");
  }

  await prisma.$transaction([
    prisma.resumeAnalysis.deleteMany({ where: { jobId: job.id } }),
    prisma.interviewKit.deleteMany({ where: { jobId: job.id } }),
    prisma.application.deleteMany({ where: { jobId: job.id } }),
    prisma.job.delete({ where: { id: job.id } }),
  ]);

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  revalidatePath("/pipeline");
  revalidatePath("/analytics");
  revalidatePath("/compare");
  redirect("/jobs?deleted=job");
}

export async function generateCandidateAnalysis(
  _previousState: EvaluationActionState,
  formData: FormData,
): Promise<EvaluationActionState> {
  let candidateId = "";
  let result: Awaited<ReturnType<typeof evaluateCandidateForJob>>;

  try {
    const prisma = getPrisma();
    candidateId = requiredString(formData, "candidateId");
    const org = await getWorkspaceOrganization();
    const candidate = await prisma.candidate.findFirst({
      where: { id: candidateId, organizationId: org.id },
      include: { applications: { include: { job: true } } },
    });

    if (!candidate) {
      return createEvaluationErrorState("Candidate not found in the active workspace.");
    }

    const job =
      candidate.applications[0]?.job ??
      (await prisma.job.findFirst({
        where: {
          organizationId: org.id,
          title: { contains: candidate.roleAppliedFor, mode: "insensitive" },
        },
      })) ??
      (await prisma.job.findFirst({ where: { organizationId: org.id, status: "OPEN" } }));

    if (!job) {
      return createEvaluationErrorState("Create a job before generating candidate analysis.");
    }

    result = await evaluateCandidateForJob({
      organizationId: org.id,
      candidateId: candidate.id,
      jobId: job.id,
    });
  } catch (error) {
    return createEvaluationErrorState(safeEvaluationActionError(error));
  }

  revalidatePath(`/candidates/${candidateId}`);
  revalidatePath("/candidates");
  revalidatePath("/pipeline");
  revalidatePath("/analytics");
  revalidatePath("/dashboard");
  revalidatePath("/compare");

  return createEvaluationSuccessState({
    evaluationId: result.evaluationId,
    source: result.source,
  });
}
