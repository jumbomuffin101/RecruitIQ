"use server";

import {
  ActivityType,
  CandidateStatus,
  JobStatus,
  JobType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { analyzeCandidateForJob } from "@/lib/ai";
import { getDemoOrganization } from "@/lib/data";
import { getPrisma } from "@/lib/prisma";

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

export async function createJob(formData: FormData) {
  const prisma = getPrisma();
  const org = await getDemoOrganization();

  await prisma.job.create({
    data: {
      organizationId: org.id,
      title: requiredString(formData, "title"),
      department: requiredString(formData, "department"),
      location: requiredString(formData, "location"),
      type: String(formData.get("type") ?? "FULL_TIME") as JobType,
      description: requiredString(formData, "description"),
      requirements: requiredString(formData, "requirements"),
      status: String(formData.get("status") ?? "OPEN") as JobStatus,
    },
  });

  await prisma.activityLog.create({
    data: {
      organizationId: org.id,
      type: ActivityType.JOB_CREATED,
      message: "A new job was created.",
    },
  });

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  redirect("/jobs");
}

export async function createCandidate(formData: FormData) {
  const prisma = getPrisma();
  const org = await getDemoOrganization();
  const roleAppliedFor = requiredString(formData, "roleAppliedFor");
  const candidate = await prisma.candidate.create({
    data: {
      organizationId: org.id,
      name: requiredString(formData, "name"),
      email: requiredString(formData, "email"),
      phone: optionalString(formData, "phone"),
      location: optionalString(formData, "location"),
      roleAppliedFor,
      resumeText: requiredString(formData, "resumeText"),
      skills: parseSkills(requiredString(formData, "skills")),
      experienceSummary: requiredString(formData, "experienceSummary"),
      status: String(formData.get("status") ?? "APPLIED") as CandidateStatus,
      notes: optionalString(formData, "notes"),
    },
  });

  const matchingJob = await prisma.job.findFirst({
    where: {
      organizationId: org.id,
      title: { contains: roleAppliedFor, mode: "insensitive" },
    },
  });

  if (matchingJob) {
    await prisma.application.create({
      data: {
        organizationId: org.id,
        candidateId: candidate.id,
        jobId: matchingJob.id,
        status: candidate.status,
      },
    });
  }

  await prisma.activityLog.create({
    data: {
      organizationId: org.id,
      type: ActivityType.CANDIDATE_CREATED,
      message: `${candidate.name} was added to the pipeline.`,
    },
  });

  revalidatePath("/candidates");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  redirect(`/candidates/${candidate.id}`);
}

export async function updateCandidateStatus(formData: FormData) {
  const prisma = getPrisma();
  const candidateId = requiredString(formData, "candidateId");
  const status = String(formData.get("status") ?? "APPLIED") as CandidateStatus;
  const org = await getDemoOrganization();

  const candidate = await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      status,
      applications: { updateMany: { where: {}, data: { status } } },
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

export async function generateCandidateAnalysis(formData: FormData) {
  const prisma = getPrisma();
  const candidateId = requiredString(formData, "candidateId");
  const org = await getDemoOrganization();
  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, organizationId: org.id },
    include: { applications: { include: { job: true } } },
  });

  if (!candidate) {
    throw new Error("Candidate not found");
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
    throw new Error("Create a job before generating candidate analysis.");
  }

  // TODO: Replace this deterministic scorer with OpenAI or Amazon Bedrock for production AI analysis.
  const analysis = analyzeCandidateForJob(candidate, job);

  await prisma.$transaction([
    prisma.resumeAnalysis.create({
      data: {
        candidateId: candidate.id,
        jobId: job.id,
        fitScore: analysis.fitScore,
        summary: analysis.summary,
        strengths: analysis.strengths,
        gaps: analysis.gaps,
        recommendedStage: analysis.recommendedStage,
      },
    }),
    prisma.interviewKit.create({
      data: {
        candidateId: candidate.id,
        jobId: job.id,
        questions: analysis.interviewQuestions,
        focusAreas: analysis.gaps,
      },
    }),
    prisma.candidate.update({
      where: { id: candidate.id },
      data: { status: analysis.recommendedStage },
    }),
    prisma.application.upsert({
      where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } },
      create: {
        organizationId: org.id,
        candidateId: candidate.id,
        jobId: job.id,
        status: analysis.recommendedStage,
        fitScore: analysis.fitScore,
      },
      update: {
        status: analysis.recommendedStage,
        fitScore: analysis.fitScore,
      },
    }),
    prisma.activityLog.create({
      data: {
        organizationId: org.id,
        type: ActivityType.ANALYSIS_GENERATED,
        message: `AI analysis generated for ${candidate.name}.`,
        metadata: { candidateId: candidate.id, jobId: job.id, fitScore: analysis.fitScore },
      },
    }),
  ]);

  revalidatePath(`/candidates/${candidate.id}`);
  revalidatePath("/candidates");
  revalidatePath("/pipeline");
  revalidatePath("/analytics");
  revalidatePath("/dashboard");
}
