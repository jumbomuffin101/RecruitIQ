import { getPrisma } from "@/lib/prisma";

export async function getDemoOrganization() {
  const prisma = getPrisma();

  return prisma.organization.upsert({
    where: { slug: "recruitiq-demo" },
    update: {},
    create: {
      name: "RecruitIQ Demo Co.",
      slug: "recruitiq-demo",
      users: {
        create: {
          name: "Demo Recruiter",
          email: "demo@recruitiq.app",
        },
      },
    },
  });
}

export async function getJobs() {
  const org = await getDemoOrganization();
  return getPrisma().job.findMany({
    where: { organizationId: org.id },
    include: { applications: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function getCandidates() {
  const org = await getDemoOrganization();
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
  const org = await getDemoOrganization();
  return getPrisma().candidate.findFirst({
    where: { id, organizationId: org.id },
    include: {
      applications: { include: { job: true }, orderBy: { createdAt: "desc" } },
      resumeAnalyses: { orderBy: { createdAt: "desc" }, take: 1 },
      interviewKits: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

export async function getDashboardData() {
  const [jobs, candidates] = await Promise.all([getJobs(), getCandidates()]);

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

  return {
    jobs,
    candidates,
    openJobs,
    totalCandidates: candidates.length,
    interviewsScheduled,
    averageFitScore,
    recentCandidates: candidates.slice(0, 5),
    topCandidates,
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
