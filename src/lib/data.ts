import { getPrisma } from "@/lib/prisma";
import { analyzeCandidateForJob } from "@/lib/ai";
import { getCandidateRecommendation } from "@/lib/recommendations";
import { applicationStages, countApplicationsByStage, getApplicationConversions } from "@/lib/applications/metrics";
import { getCurrentUserContext } from "@/lib/auth-context";

export async function getWorkspaceOrganization() {
  const context = await getCurrentUserContext();
  return { id: context.organizationId, name: context.organizationName };
}

export async function getJobs() {
  const org = await getWorkspaceOrganization();
  return getPrisma().job.findMany({
    where: { organizationId: org.id },
    include: {
      applications: true,
      jobRequirements: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
      evaluationRubric: true,
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function getCandidates() {
  const org = await getWorkspaceOrganization();
  return getPrisma().candidate.findMany({
    where: { organizationId: org.id },
    include: {
      applications: { include: { job: true }, orderBy: { createdAt: "desc" } },
      resumeAnalyses: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCandidateDetail(id: string) {
  const org = await getWorkspaceOrganization();
  return getPrisma().candidate.findFirst({
    where: { id, organizationId: org.id },
    include: {
      applications: { include: { job: true, statusHistory: { orderBy: { changedAt: "desc" } } }, orderBy: { createdAt: "desc" } },
      resumeAnalyses: { orderBy: { createdAt: "desc" } },
      interviewKits: { orderBy: { createdAt: "desc" } },
      interviewScorecards: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          job: true,
          evaluation: { select: { id: true, overallScore: true, createdAt: true } },
          criteria: {
            orderBy: { sortOrder: "asc" },
            include: {
              requirementResult: { select: { id: true, status: true, requirementText: true } },
              responses: { orderBy: { updatedAt: "desc" }, include: { submittedByUser: { select: { name: true } } } },
            },
          },
        },
      },
      evaluations: {
        orderBy: { createdAt: "desc" },
        include: {
          job: { include: { evaluationRubric: true } },
          categories: true,
          requirementResults: {
            include: {
              requirement: true,
              evidence: true,
            },
          },
          evidence: true,
        },
      },
    },
  });
}

export async function getDashboardData() {
  const org = await getWorkspaceOrganization();
  const [jobs, candidates, applications, recentActivity] = await Promise.all([
    getJobs(),
    getCandidates(),
    getPrisma().application.findMany({ where: { organizationId: org.id }, include: { candidate: { include: { resumeAnalyses: { orderBy: { createdAt: "desc" }, take: 1 } } } } }),
    getPrisma().activityLog.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const openJobs = jobs.filter((job) => job.status === "OPEN").length;
  const applicationsInInterview = applications.filter((application) => application.status === "INTERVIEW").length;
  const scored = applications
    .map((application) => application.fitScore ?? application.candidate.resumeAnalyses.find((analysis) => analysis.jobId === application.jobId)?.fitScore)
    .filter((score): score is number => typeof score === "number");
  const averageFitScore = scored.length
    ? Math.round(scored.reduce((total, score) => total + score, 0) / scored.length)
    : 0;
  const topCandidates = [...candidates]
    .sort((a, b) => (b.resumeAnalyses[0]?.fitScore ?? 0) - (a.resumeAnalyses[0]?.fitScore ?? 0))
    .slice(0, 4);
  const applicationsNeedingReview = applications.filter((application) => application.status === "APPLIED").length;
  const highFitApplications = applications.filter((application) => {
    const score = application.fitScore ?? application.candidate.resumeAnalyses.find((analysis) => analysis.jobId === application.jobId)?.fitScore ?? 0;
    return score >= 80 && ["APPLIED", "SCREENED"].includes(application.status);
  }).length;
  const jobsWithLowPipeline = jobs.filter((job) => job.status === "OPEN" && job.applications.length < 3).length;
  const candidatesMissingAnalysis = candidates.filter((candidate) => candidate.resumeAnalyses.length === 0).length;

  return {
    jobs,
    candidates,
    openJobs,
    totalCandidates: candidates.length,
    totalApplications: applications.length,
    applicationsInInterview,
    stageCounts: countApplicationsByStage(applications),
    averageFitScore,
    recentCandidates: candidates.slice(0, 5),
    topCandidates,
    recentActivity,
    actionCenter: {
      applicationsNeedingReview,
      highFitApplications,
      jobsWithLowPipeline,
      candidatesMissingAnalysis,
    },
  };
}

export async function getPipelineData(jobId?: string) {
  const org = await getWorkspaceOrganization();
  const [jobs, applications] = await Promise.all([
    getJobs(),
    getPrisma().application.findMany({
      where: { organizationId: org.id, ...(jobId ? { jobId } : {}) },
      include: {
        job: true,
        candidate: {
          include: {
            evaluations: { where: { status: "COMPLETED" }, orderBy: { createdAt: "desc" } },
            interviewScorecards: { orderBy: { createdAt: "desc" } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const cards = applications.map((application) => {
    const evaluation = application.candidate.evaluations.find((item) => item.jobId === application.jobId);
    const scorecard = application.candidate.interviewScorecards.find((item) => item.jobId === application.jobId);
    return {
      id: application.id,
      status: application.status,
      createdAt: application.createdAt,
      fitScore: evaluation?.overallScore ?? application.fitScore,
      recommendation: evaluation?.recommendation ?? null,
      scorecardStatus: scorecard?.status ?? null,
      candidate: application.candidate,
      job: application.job,
    };
  });
  return {
    jobs,
    selectedJobId: jobId ?? null,
    columns: applicationStages.map((status) => ({ status, applications: cards.filter((application) => application.status === status) })),
  };
}

export async function getAnalyticsData() {
  const org = await getWorkspaceOrganization();
  const [jobs, candidates, applications] = await Promise.all([getJobs(), getCandidates(), getPrisma().application.findMany({ where: { organizationId: org.id } })]);
  const stageCounts = countApplicationsByStage(applications);
  const jobStatusCounts = ["DRAFT", "OPEN", "PAUSED", "CLOSED"].map((status) => ({
    status,
    count: jobs.filter((job) => job.status === status).length,
  }));
  const scores = applications
    .map((application) => application.fitScore)
    .filter((score): score is number => typeof score === "number");
  const averageFitScore = scores.length
    ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length)
    : 0;
  const skillCounts = candidates
    .flatMap((candidate) => candidate.skills)
    .reduce<Record<string, number>>((acc, skill) => {
      acc[skill] = (acc[skill] ?? 0) + 1;
      return acc;
    }, {});

  return {
    stageCounts,
    jobStatusCounts,
    averageFitScore,
    totalApplications: applications.length,
    totalCandidates: candidates.length,
    conversions: getApplicationConversions(applications),
    topSkills: Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([skill, count]) => ({ skill, count })),
  };
}

export async function getCompareData(jobId?: string) {
  const jobs = await getJobs();
  const selectedJob = jobs.find((job) => job.id === jobId) ?? jobs.find((job) => job.status === "OPEN") ?? jobs[0];

  if (!selectedJob) {
    return {
      jobs,
      selectedJob: null,
      rankedCandidates: [],
    };
  }

  const applications = await getPrisma().application.findMany({
    where: { organizationId: selectedJob.organizationId, jobId: selectedJob.id },
    include: {
      candidate: {
        include: {
          resumeAnalyses: { orderBy: { createdAt: "desc" } },
          evaluations: {
            where: { jobId: selectedJob.id, status: "COMPLETED" },
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { categories: true, requirementResults: { include: { requirement: true } } },
          },
          interviewScorecards: { where: { jobId: selectedJob.id }, orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  const rankedCandidates = applications
    .map((application) => {
      const candidate = application.candidate;
      const savedAnalysis = candidate.resumeAnalyses.find((analysis) => analysis.jobId === selectedJob.id);
      const structuredEvaluation = candidate.evaluations[0];
      const analysis = savedAnalysis
        ? {
            fitScore: savedAnalysis.fitScore,
            summary: savedAnalysis.summary,
            strengths: savedAnalysis.strengths,
            gaps: savedAnalysis.gaps,
            recommendedStage: savedAnalysis.recommendedStage,
            interviewQuestions: [],
          }
        : analyzeCandidateForJob(candidate, selectedJob);
      const fitScore = structuredEvaluation?.overallScore ?? application.fitScore ?? analysis.fitScore;
      const recommendation = getCandidateRecommendation({
        fitScore,
        currentStatus: application.status,
      });
      const jobText = `${selectedJob.title} ${selectedJob.description} ${selectedJob.requirements}`.toLowerCase();
      const matchingSkills = candidate.skills.filter((skill) => jobText.includes(skill.toLowerCase()));

      return {
        id: candidate.id,
        name: candidate.name,
        roleAppliedFor: candidate.roleAppliedFor,
        status: application.status,
        skills: candidate.skills,
        matchingSkills: matchingSkills.length ? matchingSkills : candidate.skills.slice(0, 3),
        fitScore,
        strengths: analysis.strengths,
        gaps: analysis.gaps,
        recommendedStage: recommendation.recommendedStage,
        recommendedNextAction: recommendation.nextStep,
        recommendationDescription: recommendation.description,
        recommendationTone: recommendation.tone,
        scoreSource: structuredEvaluation ? "Persisted evaluation" : "Deterministic preview",
        categoryScores: structuredEvaluation?.categories ?? [],
        requirementResults: structuredEvaluation?.requirementResults ?? [],
        scorecardStatus: candidate.interviewScorecards[0]?.status ?? null,
        isStale: structuredEvaluation
          ? selectedJob.evaluationRubric
            ? structuredEvaluation.createdAt < selectedJob.evaluationRubric.updatedAt
            : false
          : false,
      };
    })
    .sort((a, b) => b.fitScore - a.fitScore);

  return {
    jobs,
    selectedJob,
    rankedCandidates,
    requirements: selectedJob.jobRequirements,
    rubric: selectedJob.evaluationRubric,
  };
}
