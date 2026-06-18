import { PrismaClient, ActivityType, CandidateStatus, JobStatus, JobType } from "@prisma/client";
import { analyzeCandidateForJob } from "../src/lib/ai";

const prisma = new PrismaClient();

async function main() {
  await prisma.organization.deleteMany({ where: { slug: "recruitiq-demo" } });

  const org = await prisma.organization.create({
    data: {
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

  const jobs = await Promise.all([
    prisma.job.create({
      data: {
        organizationId: org.id,
        title: "Product Engineer",
        department: "Engineering",
        location: "Remote, US",
        type: JobType.FULL_TIME,
        status: JobStatus.OPEN,
        description:
          "Build customer-facing workflow features for a fast-moving B2B SaaS product. Partner with design, product, and founders to ship high-quality interfaces.",
        requirements:
          "React, Next.js, TypeScript, PostgreSQL, API design, product analytics, strong communication, and comfort working with lean teams.",
      },
    }),
    prisma.job.create({
      data: {
        organizationId: org.id,
        title: "Growth Operations Associate",
        department: "Operations",
        location: "New York, NY",
        type: JobType.FULL_TIME,
        status: JobStatus.OPEN,
        description:
          "Own recruiting operations, outbound campaigns, funnel reporting, and candidate coordination for campus and startup customers.",
        requirements:
          "Operations, analytics, CRM, customer communication, sourcing, process design, spreadsheet modeling, and strong written communication.",
      },
    }),
    prisma.job.create({
      data: {
        organizationId: org.id,
        title: "Design Intern",
        department: "Product",
        location: "Hybrid",
        type: JobType.INTERNSHIP,
        status: JobStatus.PAUSED,
        description:
          "Support product design, prototype review, and customer research for hiring teams using RecruitIQ.",
        requirements:
          "Figma, product design, user research, communication, visual systems, prototyping, and collaboration with engineering.",
      },
    }),
  ]);

  const candidateInputs = [
    {
      name: "Maya Chen",
      email: "maya.chen@example.com",
      phone: "415-555-0112",
      location: "San Francisco, CA",
      roleAppliedFor: "Product Engineer",
      skills: ["React", "Next.js", "TypeScript", "PostgreSQL", "Analytics"],
      experienceSummary:
        "Full-stack engineer who shipped onboarding, billing, and analytics workflows at two early-stage SaaS companies.",
      resumeText:
        "Built React and Next.js dashboards using TypeScript, Prisma, PostgreSQL, and event-based product analytics. Led API design for user onboarding and partnered with product managers to improve activation by 18%. Comfortable working directly with founders and customers in ambiguous environments.",
      status: CandidateStatus.INTERVIEW,
      job: jobs[0],
      notes: "Strong product sense and clear ownership examples.",
    },
    {
      name: "Jordan Patel",
      email: "jordan.patel@example.com",
      phone: "212-555-0144",
      location: "Brooklyn, NY",
      roleAppliedFor: "Growth Operations Associate",
      skills: ["Operations", "CRM", "Analytics", "Customer Communication", "Sourcing"],
      experienceSummary:
        "Operations generalist with experience improving recruiting funnels and customer onboarding programs.",
      resumeText:
        "Managed CRM hygiene, candidate sourcing, outbound campaigns, and weekly funnel reports for a student-run consulting group. Created spreadsheet models for conversion tracking and wrote customer-facing documentation for onboarding workflows.",
      status: CandidateStatus.SCREENED,
      job: jobs[1],
      notes: "Good match for ops-heavy customer workflows.",
    },
    {
      name: "Elena Rodriguez",
      email: "elena.rodriguez@example.com",
      phone: "305-555-0199",
      location: "Miami, FL",
      roleAppliedFor: "Design Intern",
      skills: ["Figma", "Product Design", "User Research", "Prototyping"],
      experienceSummary:
        "Product design student focused on hiring marketplace flows, accessibility, and polished interactive prototypes.",
      resumeText:
        "Designed Figma prototypes for a campus job board, ran user research with 18 students, and documented a small visual system for cards, forms, and navigation. Collaborated with engineers to clarify responsive behavior and edge states.",
      status: CandidateStatus.APPLIED,
      job: jobs[2],
      notes: "Portfolio has strong UX process.",
    },
    {
      name: "Samir Khan",
      email: "samir.khan@example.com",
      phone: "646-555-0120",
      location: "Jersey City, NJ",
      roleAppliedFor: "Product Engineer",
      skills: ["JavaScript", "Node", "SQL", "AWS"],
      experienceSummary:
        "Backend-leaning engineer with solid API and SQL experience, newer to React and product analytics.",
      resumeText:
        "Built Node APIs, SQL reporting jobs, and AWS Lambda utilities for internal operations tooling. Has production debugging experience and collaborated with sales operations, but has limited direct React or Next.js project work.",
      status: CandidateStatus.APPLIED,
      job: jobs[0],
      notes: "Potential backend fit; validate frontend depth.",
    },
    {
      name: "Avery Brooks",
      email: "avery.brooks@example.com",
      phone: "617-555-0155",
      location: "Boston, MA",
      roleAppliedFor: "Growth Operations Associate",
      skills: ["Marketing", "Sales", "Communication", "CRM"],
      experienceSummary:
        "Early-career marketer with strong outbound writing and customer follow-up experience.",
      resumeText:
        "Supported sales campaigns, customer research calls, CRM cleanup, and event follow-up. Wrote outbound email sequences and summarized customer feedback for leadership. Developing deeper analytics and operations skills.",
      status: CandidateStatus.REJECTED,
      job: jobs[1],
      notes: "Good communicator, but weaker analytics fit for this role.",
    },
  ];

  for (const input of candidateInputs) {
    const candidate = await prisma.candidate.create({
      data: {
        organizationId: org.id,
        name: input.name,
        email: input.email,
        phone: input.phone,
        location: input.location,
        roleAppliedFor: input.roleAppliedFor,
        skills: input.skills,
        experienceSummary: input.experienceSummary,
        resumeText: input.resumeText,
        status: input.status,
        notes: input.notes,
      },
    });

    const analysis = analyzeCandidateForJob(candidate, input.job);

    await prisma.application.create({
      data: {
        organizationId: org.id,
        candidateId: candidate.id,
        jobId: input.job.id,
        status: input.status,
        fitScore: analysis.fitScore,
      },
    });

    await prisma.resumeAnalysis.create({
      data: {
        candidateId: candidate.id,
        jobId: input.job.id,
        fitScore: analysis.fitScore,
        summary: analysis.summary,
        strengths: analysis.strengths,
        gaps: analysis.gaps,
        recommendedStage: analysis.recommendedStage,
      },
    });

    await prisma.interviewKit.create({
      data: {
        candidateId: candidate.id,
        jobId: input.job.id,
        questions: analysis.interviewQuestions,
        focusAreas: analysis.gaps,
      },
    });
  }

  await prisma.activityLog.createMany({
    data: [
      {
        organizationId: org.id,
        type: ActivityType.JOB_CREATED,
        message: "Seeded demo jobs for RecruitIQ.",
      },
      {
        organizationId: org.id,
        type: ActivityType.CANDIDATE_CREATED,
        message: "Seeded demo candidates and applications.",
      },
      {
        organizationId: org.id,
        type: ActivityType.ANALYSIS_GENERATED,
        message: "Generated deterministic AI analysis for demo candidates.",
      },
    ],
  });

  console.log("Seeded RecruitIQ demo data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
