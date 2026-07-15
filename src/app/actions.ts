"use server";

import {
  ActivityType,
  CandidateStatus,
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
import {
  formatJobFormError,
  getJobFormInput,
  initialJobActionState,
  type JobActionState,
} from "@/lib/jobs/schemas";
import { getPrisma } from "@/lib/prisma";
import { extractResumeWithFallback } from "@/lib/resume-extract";
import {
  createInterviewScorecard,
  getInterviewSignalForRating,
  isSubstantiveInterviewResponse,
  type InterviewScorecardActionState,
} from "@/lib/interviews/scorecards";

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

export async function createJob(_previousState: JobActionState, formData: FormData): Promise<JobActionState> {
  const prisma = getPrisma();
  const org = await getWorkspaceOrganization();
  let jobId = "";

  try {
    const input = getJobFormInput(formData);
    const job = await prisma.$transaction(async (tx) => {
      const createdJob = await tx.job.create({
        data: {
          organizationId: org.id,
          title: input.title,
          department: input.department,
          location: input.location,
          type: input.type,
          description: input.description,
          requirements: input.requirements,
          status: input.status,
        },
      });

      await tx.jobRequirement.createMany({
        data: input.structuredRequirements.map((requirement, index) => ({
          jobId: createdJob.id,
          text: requirement.text,
          type: requirement.type,
          category: requirement.category,
          weight: requirement.weight,
          keywords: requirement.keywords,
          isCritical: requirement.isCritical,
          sortOrder: index,
        })),
      });

      await tx.jobEvaluationRubric.create({
        data: {
          jobId: createdJob.id,
          requiredSkillsWeight: input.rubric.requiredSkillsWeight,
          preferredWeight: input.rubric.preferredWeight,
          experienceWeight: input.rubric.experienceWeight,
          projectWeight: input.rubric.projectWeight,
          educationWeight: input.rubric.educationWeight,
          domainWeight: input.rubric.domainWeight,
        },
      });

      await tx.activityLog.create({
        data: {
          organizationId: org.id,
          type: ActivityType.JOB_CREATED,
          message: `${createdJob.title} was created with a structured evaluation rubric.`,
        },
      });

      return createdJob;
    });
    jobId = job.id;
  } catch (error) {
    return { status: "error", message: formatJobFormError(error) };
  }

  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  redirect(`/jobs/${jobId}`);
}

export async function updateJob(_previousState: JobActionState, formData: FormData): Promise<JobActionState> {
  const prisma = getPrisma();
  const org = await getWorkspaceOrganization();
  const jobId = requiredString(formData, "jobId");

  try {
    const input = getJobFormInput(formData);
    const existingJob = await prisma.job.findFirst({
      where: { id: jobId, organizationId: org.id },
      include: { jobRequirements: true, evaluationRubric: true },
    });

    if (!existingJob) {
      return { status: "error", message: "Job not found in the active workspace." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id: existingJob.id },
        data: {
          title: input.title,
          department: input.department,
          location: input.location,
          type: input.type,
          description: input.description,
          requirements: input.requirements,
          status: input.status,
        },
      });

      const submittedIds = new Set(input.structuredRequirements.map((requirement) => requirement.id).filter(Boolean));
      const activeExistingRequirements = existingJob.jobRequirements.filter((requirement) => !requirement.deletedAt);
      const removedRequirements = activeExistingRequirements.filter((requirement) => !submittedIds.has(requirement.id));

      if (removedRequirements.length) {
        await tx.jobRequirement.updateMany({
          where: { id: { in: removedRequirements.map((requirement) => requirement.id) }, jobId: existingJob.id },
          data: { deletedAt: new Date() },
        });
      }

      for (const [index, requirement] of input.structuredRequirements.entries()) {
        if (requirement.id && activeExistingRequirements.some((existing) => existing.id === requirement.id)) {
          await tx.jobRequirement.update({
            where: { id: requirement.id },
            data: {
              text: requirement.text,
              type: requirement.type,
              category: requirement.category,
              weight: requirement.weight,
              keywords: requirement.keywords,
              isCritical: requirement.isCritical,
              sortOrder: index,
              deletedAt: null,
            },
          });
        } else {
          await tx.jobRequirement.create({
            data: {
              jobId: existingJob.id,
              text: requirement.text,
              type: requirement.type,
              category: requirement.category,
              weight: requirement.weight,
              keywords: requirement.keywords,
              isCritical: requirement.isCritical,
              sortOrder: index,
            },
          });
        }
      }

      await tx.jobEvaluationRubric.upsert({
        where: { jobId: existingJob.id },
        create: {
          jobId: existingJob.id,
          requiredSkillsWeight: input.rubric.requiredSkillsWeight,
          preferredWeight: input.rubric.preferredWeight,
          experienceWeight: input.rubric.experienceWeight,
          projectWeight: input.rubric.projectWeight,
          educationWeight: input.rubric.educationWeight,
          domainWeight: input.rubric.domainWeight,
        },
        update: {
          requiredSkillsWeight: input.rubric.requiredSkillsWeight,
          preferredWeight: input.rubric.preferredWeight,
          experienceWeight: input.rubric.experienceWeight,
          projectWeight: input.rubric.projectWeight,
          educationWeight: input.rubric.educationWeight,
          domainWeight: input.rubric.domainWeight,
          version: { increment: 1 },
        },
      });

      await tx.activityLog.create({
        data: {
          organizationId: org.id,
          type: ActivityType.JOB_CREATED,
          message: `${input.title} rubric and requirements were updated.`,
          metadata: { jobId: existingJob.id },
        },
      });
    });
  } catch (error) {
    return { status: "error", message: formatJobFormError(error) };
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
  revalidatePath("/compare");
  revalidatePath("/dashboard");
  return initialJobActionState;
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

export async function generateInterviewScorecard(
  _previousState: InterviewScorecardActionState,
  formData: FormData,
): Promise<InterviewScorecardActionState> {
  try {
    const prisma = getPrisma();
    const org = await getWorkspaceOrganization();
    const candidateId = requiredString(formData, "candidateId");
    const candidate = await prisma.candidate.findFirst({
      where: { id: candidateId, organizationId: org.id },
      include: {
        evaluations: {
          where: { status: "COMPLETED" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!candidate) return { status: "error", message: "Candidate not found in the active workspace." };
    const evaluation = candidate.evaluations[0];
    if (!evaluation) return { status: "error", message: "Generate a structured evaluation before creating an interview scorecard." };

    const scorecard = await createInterviewScorecard({
      candidateId: candidate.id,
      jobId: evaluation.jobId,
      evaluationId: evaluation.id,
    });
    revalidatePath(`/candidates/${candidateId}`);
    return { status: "success", message: "Interview scorecard generated from the latest evaluation.", scorecardId: scorecard.id };
  } catch (error) {
    return { status: "error", message: safeEvaluationActionError(error) };
  }
}

export async function saveInterviewScorecard(
  _previousState: InterviewScorecardActionState,
  formData: FormData,
): Promise<InterviewScorecardActionState> {
  try {
    const prisma = getPrisma();
    const org = await getWorkspaceOrganization();
    const scorecardId = requiredString(formData, "scorecardId");
    const intent = String(formData.get("intent") ?? "save");
    const scorecard = await prisma.interviewScorecard.findFirst({
      where: { id: scorecardId, candidate: { organizationId: org.id } },
      include: { criteria: true },
    });
    if (!scorecard) return { status: "error", message: "Interview scorecard not found in the active workspace." };
    if (scorecard.status === "COMPLETED") return { status: "error", message: "Completed scorecards are preserved as historical records and cannot be changed." };

    let substantiveResponses = 0;
    await prisma.$transaction(async (tx) => {
      for (const criterion of scorecard.criteria) {
        const ratingRaw = String(formData.get(`rating:${criterion.id}`) ?? "").trim();
        const rating = ratingRaw ? Number(ratingRaw) : null;
        if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
          throw new Error("Interview ratings must be whole numbers from 1 to 5.");
        }
        const signalRaw = String(formData.get(`signal:${criterion.id}`) ?? "").trim();
        const signal = signalRaw || getInterviewSignalForRating(rating);
        if (signal && !["STRONG_NEGATIVE", "NEGATIVE", "NEUTRAL", "POSITIVE", "STRONG_POSITIVE"].includes(signal)) {
          throw new Error("Interview signal is invalid.");
        }
        const notes = optionalString(formData, `notes:${criterion.id}`);
        const evidence = optionalString(formData, `evidence:${criterion.id}`);
        if ((notes?.length ?? 0) > 3_000 || (evidence?.length ?? 3_000) > 3_000) {
          throw new Error("Interview notes and evidence must be 3,000 characters or fewer.");
        }

        const substantive = isSubstantiveInterviewResponse({
          rating,
          signal: signal as never,
          notes,
          evidence,
        });
        if (substantive) {
          substantiveResponses += 1;
          await tx.interviewResponse.upsert({
            where: { scorecardId_criterionId: { scorecardId: scorecard.id, criterionId: criterion.id } },
            create: { scorecardId: scorecard.id, criterionId: criterion.id, rating, signal: signal as never, notes, evidence },
            update: { rating, signal: signal as never, notes, evidence },
          });
        } else {
          await tx.interviewResponse.deleteMany({ where: { scorecardId: scorecard.id, criterionId: criterion.id } });
        }
      }

      if (intent === "complete" && substantiveResponses === 0) {
        throw new Error("Add at least one rating, signal, note, or observed evidence before completing this scorecard.");
      }
      await tx.interviewScorecard.update({
        where: { id: scorecard.id },
        data: {
          status: intent === "complete" ? "COMPLETED" : substantiveResponses ? "IN_PROGRESS" : "DRAFT",
          completedAt: intent === "complete" ? new Date() : null,
        },
      });
    });

    revalidatePath(`/candidates/${scorecard.candidateId}`);
    return {
      status: "success",
      message: intent === "complete" ? "Scorecard completed and preserved as an interview record." : "Interview feedback saved.",
      scorecardId,
    };
  } catch (error) {
    return { status: "error", message: safeEvaluationActionError(error) };
  }
}
