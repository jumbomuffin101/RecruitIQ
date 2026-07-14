import { getPrisma } from "@/lib/prisma";
import { analyzeCandidateForJob } from "@/lib/ai";
import { getCandidateRecommendation } from "@/lib/recommendations";

export async function getWorkspaceOrganization() {
  const prisma = getPrisma();

  return prisma.organization.upsert({
    where: { slug: "recruitiq-demo" },
    update: { name: "Northstar Labs" },
    create: {
      name: "Northstar Labs",
      slug: "recruitiq-demo",
      users: {
        create: {
          name: "Alex Morgan",
          email: "alex@northstarlabs.example",
        },
      },
    },
  });
}

export async function getJobs() {
  const org = await getWorkspaceOrganization();
  return getPrisma().job.findMany({
    where: { organizationId: org.id },
    include: { applications: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function getCandidates() {
  const org = await getWorkspaceOrganization();
  return getPrisma().candidate.findMany({
    where: { organizationId: org.id },
    include: {
      applications: true,
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
      applications: { include: { job: true }, orderBy: { createdAt: "desc" } },
      resumeAnalyses: { orderBy: { createdAt: "desc" }, take: 1 },
      interviewKits: { orderBy: { createdAt: "desc" }, take: 1 },
      evaluations: {
        orderBy: { createdAt: "desc" },
        include: {
          job: true,
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
  const [jobs, candidates, recentActivity] = await Promise.all([
    getJobs(),
    getCandidates(),
    getPrisma().activityLog.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const openJobs = jobs.filter((job) => job.status === "OPEN").length;
  const interviewsScheduled = candidates.filter((candidate) => candidate.status === "INTERVIEW").length;
  const scored = candidates
    .map((candidate) => candidate.resumeAnalyses[0]?.fitScore ?? candidate.applications.find((app) => app.fitScore)?.fitScore)
    .filter((score): score is number => typeof score === "number");
  const averageFitScore = scored.length
    ? Math.round(scored.reduce((total, score) => total + score, 0) / scored.length)
    : 0;
  const topCandidates = [...candidates]
    .sort((a, b) => (b.resumeAnalyses[0]?.fitScore ?? 0) - (a.resumeAnalyses[0]?.fitScore ?? 0))
    .slice(0, 4);
  const candidatesNeedingReview = candidates.filter((candidate) => candidate.status === "APPLIED").length;
  const highFitCandidates = candidates.filter((candidate) => {
    const score = candidate.resumeAnalyses[0]?.fitScore ?? 0;
    return score >= 80 && ["APPLIED", "SCREENED"].includes(candidate.status);
  }).length;
  const jobsWithLowPipeline = jobs.filter((job) => job.status === "OPEN" && job.applications.length < 3).length;
  const candidatesMissingAnalysis = candidates.filter((candidate) => candidate.resumeAnalyses.length === 0).length;

  return {
    jobs,
    candidates,
    openJobs,
    totalCandidates: candidates.length,
    interviewsScheduled,
    averageFitScore,
    recentCandidates: candidates.slice(0, 5),
    topCandidates,
    recentActivity,
    actionCenter: {
      candidatesNeedingReview,
      highFitCandidates,
      jobsWithLowPipeline,
      candidatesMissingAnalysis,
    },
  };
}

export async function getPipelineData() {
  const candidates = await getCandidates();
  const stages = ["APPLIED", "SCREENED", "INTERVIEW", "OFFER", "REJECTED"];

  return stages.map((stage) => ({
    status: stage,
    candidates: candidates.filter((candidate) => candidate.status === stage),
  }));
}

export async function getAnalyticsData() {
  const [jobs, candidates] = await Promise.all([getJobs(), getCandidates()]);
  const stageCounts = ["APPLIED", "SCREENED", "INTERVIEW", "OFFER", "REJECTED"].map((stage) => ({
    stage,
    count: candidates.filter((candidate) => candidate.status === stage).length,
  }));
  const jobStatusCounts = ["DRAFT", "OPEN", "PAUSED", "CLOSED"].map((status) => ({
    status,
    count: jobs.filter((job) => job.status === status).length,
  }));
  const scores = candidates
    .map((candidate) => candidate.resumeAnalyses[0]?.fitScore)
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

  const fullCandidates = await getPrisma().candidate.findMany({
    where: { organizationId: selectedJob.organizationId },
    include: {
      applications: true,
      resumeAnalyses: { orderBy: { createdAt: "desc" } },
      evaluations: {
        where: { jobId: selectedJob.id, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          requirementResults: { include: { requirement: true } },
        },
      },
    },
  });

  const rankedCandidates = fullCandidates
    .map((candidate) => {
      const savedAnalysis = candidate.resumeAnalyses.find((analysis) => analysis.jobId === selectedJob.id);
      const savedApplication = candidate.applications.find((application) => application.jobId === selectedJob.id);
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
      const fitScore = structuredEvaluation?.overallScore ?? savedApplication?.fitScore ?? analysis.fitScore;
      const recommendation = getCandidateRecommendation({
        fitScore,
        currentStatus: candidate.status,
      });
      const jobText = `${selectedJob.title} ${selectedJob.description} ${selectedJob.requirements}`.toLowerCase();
      const matchingSkills = candidate.skills.filter((skill) => jobText.includes(skill.toLowerCase()));

      return {
        id: candidate.id,
        name: candidate.name,
        roleAppliedFor: candidate.roleAppliedFor,
        status: candidate.status,
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
      };
    })
    .sort((a, b) => b.fitScore - a.fitScore);

  return {
    jobs,
    selectedJob,
    rankedCandidates,
  };
}
