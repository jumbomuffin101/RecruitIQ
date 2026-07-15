import { PrismaClient, ActivityType, CandidateStatus, EvaluationSource, EvaluationStatus, JobStatus, JobType, RequirementMatchStatus } from "@prisma/client";
import { analyzeCandidateForJob } from "../src/lib/ai";
import { PROMPT_VERSION, SCORING_VERSION } from "../src/lib/evaluations/constants";
import { collectEvidence } from "../src/lib/evaluations/evidence";
import { calculateEvaluationScoreBreakdown, parseJobRequirementDrafts } from "../src/lib/evaluations/scoring";
import { getCandidateRecommendation } from "../src/lib/recommendations";

const prisma = new PrismaClient();

async function main() {
  await prisma.organization.deleteMany({ where: { slug: "recruitiq-demo" } });

  const org = await prisma.organization.create({
    data: {
      name: "Northstar Labs",
      slug: "recruitiq-demo",
      users: { create: { name: "Alex Morgan", email: "alex@northstarlabs.example" } },
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
        description: "Build customer-facing workflow features for a fast-moving B2B SaaS platform and partner directly with product, design, and customers.",
        requirements: "React, Next.js, TypeScript, PostgreSQL, Prisma, API design, product analytics, testing, and strong communication.",
      },
    }),
    prisma.job.create({
      data: {
        organizationId: org.id,
        title: "Customer Success Manager",
        department: "Customer Success",
        location: "New York, NY",
        type: JobType.FULL_TIME,
        status: JobStatus.OPEN,
        description: "Own onboarding, adoption, renewals, and executive relationships for a portfolio of growing B2B customers.",
        requirements: "Customer success, onboarding, SaaS, analytics, CRM, stakeholder management, communication, renewals, and process design.",
      },
    }),
    prisma.job.create({
      data: {
        organizationId: org.id,
        title: "Growth Operations Specialist",
        department: "Growth",
        location: "Austin, TX",
        type: JobType.FULL_TIME,
        status: JobStatus.OPEN,
        description: "Improve acquisition and recruiting funnels through campaign operations, CRM systems, reporting, and experimentation.",
        requirements: "Operations, analytics, CRM, SQL, lifecycle marketing, experimentation, spreadsheet modeling, and written communication.",
      },
    }),
    prisma.job.create({
      data: {
        organizationId: org.id,
        title: "Product Designer",
        department: "Product",
        location: "Hybrid - San Francisco, CA",
        type: JobType.FULL_TIME,
        status: JobStatus.OPEN,
        description: "Own end-to-end product design for complex recruiting workflows, from customer research through production-ready interaction design.",
        requirements: "Figma, product design, user research, prototyping, design systems, accessibility, analytics, and engineering collaboration.",
      },
    }),
  ]);
  const requirementsByJobId = new Map<string, Awaited<ReturnType<typeof prisma.jobRequirement.findMany>>>();

  for (const job of jobs) {
    const drafts = parseJobRequirementDrafts(job.requirements);
    await prisma.jobRequirement.createMany({
      data: drafts.map((draft) => ({
        jobId: job.id,
        text: draft.text,
        type: draft.type,
        category: draft.category,
        weight: draft.weight,
        keywords: draft.keywords,
        isCritical: draft.type === "REQUIRED" && draft.category === "SKILL",
        sortOrder: draft.sortOrder,
      })),
    });
    await prisma.jobEvaluationRubric.create({
      data: { jobId: job.id },
    });
    requirementsByJobId.set(
      job.id,
      await prisma.jobRequirement.findMany({ where: { jobId: job.id }, orderBy: { sortOrder: "asc" } }),
    );
  }

  const candidateInputs = [
    {
      name: "Maya Chen", email: "maya.chen@example.com", phone: "415-555-0112", location: "San Francisco, CA", roleAppliedFor: "Product Engineer",
      skills: ["React", "Next.js", "TypeScript", "PostgreSQL", "Prisma", "Analytics"],
      experienceSummary: "Senior product engineer who has shipped onboarding, billing, analytics, and workflow automation at two B2B SaaS companies.",
      resumeText: "Led React and Next.js product development with TypeScript, Prisma, PostgreSQL, API design, automated testing, and event-based product analytics. Improved activation by 18%, mentored three engineers, and regularly joined customer discovery calls.",
      status: CandidateStatus.OFFER, job: jobs[0], notes: "Exceptional product judgment and complete technical match.", analyzed: true, scoreOverride: 94,
    },
    {
      name: "Noah Williams", email: "noah.williams@example.com", phone: "206-555-0182", location: "Seattle, WA", roleAppliedFor: "Product Engineer",
      skills: ["React", "TypeScript", "Node", "PostgreSQL", "API"],
      experienceSummary: "Full-stack engineer with four years of experience building customer-facing workflow products and internal analytics tools.",
      resumeText: "Built React and TypeScript applications backed by Node APIs and PostgreSQL. Owned an integration platform, improved test coverage, and partnered with designers on accessible responsive interfaces. Learning Next.js and Prisma.",
      status: CandidateStatus.INTERVIEW, job: jobs[0], notes: "Strong fundamentals; validate Next.js depth.", analyzed: true, scoreOverride: 82,
    },
    {
      name: "Samir Khan", email: "samir.khan@example.com", phone: "646-555-0120", location: "Jersey City, NJ", roleAppliedFor: "Product Engineer",
      skills: ["JavaScript", "Node", "SQL", "AWS", "API"],
      experienceSummary: "Backend-leaning engineer with solid API and SQL experience who is transitioning toward product engineering.",
      resumeText: "Built Node APIs, SQL reporting jobs, and AWS Lambda utilities for operations tooling. Experienced in production debugging and service ownership, with limited direct React, Next.js, and product analytics work.",
      status: CandidateStatus.SCREENED, job: jobs[0], notes: "Potential platform fit; frontend depth remains a gap.", analyzed: true, scoreOverride: 66,
    },
    {
      name: "Tessa Green", email: "tessa.green@example.com", phone: "312-555-0166", location: "Chicago, IL", roleAppliedFor: "Product Engineer",
      skills: ["WordPress", "HTML", "CSS"],
      experienceSummary: "Freelance web producer focused on marketing websites and content updates.",
      resumeText: "Maintained WordPress sites, created landing pages with HTML and CSS, and coordinated content launches. No production TypeScript, React, PostgreSQL, API, or SaaS product engineering experience.",
      status: CandidateStatus.REJECTED, job: jobs[0], notes: "Experience does not meet the core engineering requirements.", analyzed: true, scoreOverride: 31,
    },
    {
      name: "Priya Shah", email: "priya.shah@example.com", phone: "917-555-0134", location: "New York, NY", roleAppliedFor: "Customer Success Manager",
      skills: ["Customer Success", "SaaS", "CRM", "Analytics", "Onboarding", "Renewals"],
      experienceSummary: "Customer success leader who managed a $2.4M SaaS portfolio with 96% gross retention.",
      resumeText: "Owned onboarding, adoption, executive business reviews, renewal forecasting, CRM hygiene, and health-score analytics for 42 B2B customers. Built playbooks that reduced time-to-value by 25% and improved expansion pipeline.",
      status: CandidateStatus.OFFER, job: jobs[1], notes: "Top candidate with strong commercial and operational depth.", analyzed: true, scoreOverride: 91,
    },
    {
      name: "Liam O'Connor", email: "liam.oconnor@example.com", phone: "617-555-0108", location: "Boston, MA", roleAppliedFor: "Customer Success Manager",
      skills: ["Customer Success", "Onboarding", "Communication", "CRM", "SaaS"],
      experienceSummary: "Customer success professional with strong onboarding and relationship management experience.",
      resumeText: "Managed 28 mid-market SaaS accounts, led onboarding plans, documented customer risks in CRM, and partnered with support and product. Limited ownership of renewals forecasting and quantitative health scoring.",
      status: CandidateStatus.SCREENED, job: jobs[1], notes: "Strong communicator; probe commercial ownership.", analyzed: true, scoreOverride: 73,
    },
    {
      name: "Camille Martin", email: "camille.martin@example.com", phone: "404-555-0194", location: "Atlanta, GA", roleAppliedFor: "Customer Success Manager",
      skills: ["Support", "Communication", "Training", "CRM"],
      experienceSummary: "Customer support team lead moving into proactive customer success.",
      resumeText: "Led an eight-person support team, created customer training content, tracked escalations in CRM, and partnered with product on feedback. Seeking first role with direct ownership of onboarding, adoption, and renewals.",
      status: CandidateStatus.APPLIED, job: jobs[1], notes: "New application; needs structured review.", analyzed: false, scoreOverride: 58,
    },
    {
      name: "Jordan Patel", email: "jordan.patel@example.com", phone: "212-555-0144", location: "Brooklyn, NY", roleAppliedFor: "Growth Operations Specialist",
      skills: ["Operations", "CRM", "Analytics", "SQL", "Experimentation", "Sourcing"],
      experienceSummary: "Growth operations generalist who improved acquisition funnels and automated weekly performance reporting.",
      resumeText: "Owned CRM architecture, SQL funnel reporting, lifecycle experiments, outbound operations, and spreadsheet forecasting. Automated lead routing and improved qualified conversion by 22% across two quarters.",
      status: CandidateStatus.INTERVIEW, job: jobs[2], notes: "Excellent analytical and systems fit.", analyzed: true, scoreOverride: 86,
    },
    {
      name: "Zoe Nguyen", email: "zoe.nguyen@example.com", phone: "512-555-0175", location: "Austin, TX", roleAppliedFor: "Growth Operations Specialist",
      skills: ["Analytics", "CRM", "Lifecycle Marketing", "Operations", "Excel"],
      experienceSummary: "Lifecycle marketer with hands-on CRM operations and campaign analytics experience.",
      resumeText: "Built lifecycle campaigns, maintained CRM segments, analyzed conversion cohorts, and created spreadsheet models for channel performance. Comfortable running experiments; developing SQL proficiency.",
      status: CandidateStatus.SCREENED, job: jobs[2], notes: "Good operating profile; validate SQL fluency.", analyzed: true, scoreOverride: 76,
    },
    {
      name: "Avery Brooks", email: "avery.brooks@example.com", phone: "617-555-0155", location: "Boston, MA", roleAppliedFor: "Growth Operations Specialist",
      skills: ["Marketing", "Sales", "Communication", "CRM"],
      experienceSummary: "Early-career marketer with outbound writing and event follow-up experience.",
      resumeText: "Supported sales campaigns, basic CRM cleanup, event logistics, and email writing. Has not owned analytics, SQL, experimentation, lifecycle operations, or forecasting workflows.",
      status: CandidateStatus.REJECTED, job: jobs[2], notes: "Limited analytical depth for this role.", analyzed: true, scoreOverride: 43,
    },
    {
      name: "Elena Rodriguez", email: "elena.rodriguez@example.com", phone: "305-555-0199", location: "Miami, FL", roleAppliedFor: "Product Designer",
      skills: ["Figma", "Product Design", "User Research", "Prototyping", "Design Systems", "Accessibility"],
      experienceSummary: "Product designer with deep workflow UX experience and a strong track record partnering with engineering.",
      resumeText: "Led Figma design for complex B2B workflows, ran customer research, maintained a multi-product design system, shipped accessible interaction patterns, and used analytics to validate onboarding improvements.",
      status: CandidateStatus.INTERVIEW, job: jobs[3], notes: "Excellent craft and systems thinking.", analyzed: true, scoreOverride: 89,
    },
    {
      name: "Marcus Lee", email: "marcus.lee@example.com", phone: "510-555-0188", location: "Oakland, CA", roleAppliedFor: "Product Designer",
      skills: ["Figma", "Visual Design", "Prototyping", "Brand"],
      experienceSummary: "Visual designer expanding into product UX and interaction design.",
      resumeText: "Created polished Figma prototypes, brand systems, campaign assets, and marketing websites. Collaborated with developers but has limited user research, product analytics, accessibility, and complex workflow experience.",
      status: CandidateStatus.APPLIED, job: jobs[3], notes: "Portfolio review needed before screening.", analyzed: false, scoreOverride: 62,
    },
  ];

  const currentTitles = ["Senior Product Engineer", "Full-Stack Engineer", "Backend Engineer", "Web Producer", "Senior Customer Success Manager", "Customer Success Manager", "Customer Support Lead", "Growth Operations Manager", "Lifecycle Marketing Specialist", "Marketing Coordinator", "Senior Product Designer", "Visual Designer"];
  const currentCompanies = ["Orbit Systems", "Atlas Cloud", "Keystone Financial", "Independent", "Beacon SaaS", "Relay Health", "Copper Support", "Northwind Growth", "Juniper Commerce", "Cedar Events", "Canvas Works", "Studio Meridian"];
  const yearsExperience = [7, 4, 5, 2, 8, 4, 3, 5, 3, 1.5, 6, 3];
  const educationSummaries = [
    "B.S. Computer Science, University of California, Berkeley.", "B.S. Software Engineering, University of Washington.",
    "B.S. Computer Engineering, Rutgers University.", "B.A. Digital Media, DePaul University.",
    "B.A. Business Administration, New York University.", "B.A. Communications, Boston University.",
    "B.A. Psychology, Georgia State University.", "B.S. Information Systems, University of Texas at Austin.",
    "B.B.A. Marketing, Texas State University.", "B.A. Marketing, Northeastern University.",
    "B.F.A. Interaction Design, Savannah College of Art and Design.", "B.F.A. Graphic Design, California College of the Arts.",
  ];

  for (const [index, input] of candidateInputs.entries()) {
    const profileSlug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const candidate = await prisma.candidate.create({
      data: {
        organizationId: org.id, name: input.name, email: input.email, phone: input.phone, location: input.location,
        linkedinUrl: `https://linkedin.com/in/${profileSlug}`,
        githubUrl: input.roleAppliedFor === "Product Engineer" ? `https://github.com/${profileSlug}` : null,
        educationSummary: educationSummaries[index],
        currentTitle: currentTitles[index],
        currentCompany: currentCompanies[index],
        projectsSummary: `Selected work includes ${input.resumeText.split(".").slice(0, 2).join(".").trim()}.`,
        yearsExperience: yearsExperience[index],
        resumeSummary: `${input.experienceSummary} Core capabilities include ${input.skills.slice(0, 6).join(", ")}.`,
        roleAppliedFor: input.roleAppliedFor, skills: input.skills, experienceSummary: input.experienceSummary,
        resumeText: input.resumeText, status: input.status, notes: input.notes,
      },
    });
    const analysis = analyzeCandidateForJob(candidate, input.job);
    await prisma.application.create({
      data: {
        organizationId: org.id, candidateId: candidate.id, jobId: input.job.id, status: input.status,
        fitScore: input.analyzed ? input.scoreOverride : null,
      },
    });
    if (input.analyzed) {
      const requirements = (requirementsByJobId.get(input.job.id) ?? []).map((requirement) => ({
        id: requirement.id,
        text: requirement.text,
        type: requirement.type,
        category: requirement.category,
        weight: requirement.weight,
        keywords: requirement.keywords,
        isCritical: requirement.isCritical,
        sortOrder: requirement.sortOrder,
      }));
      const breakdown = calculateEvaluationScoreBreakdown({ candidate, job: input.job, requirements });
      const recommendation = getCandidateRecommendation({ fitScore: input.scoreOverride, currentStatus: input.status });
      const evaluation = await prisma.candidateEvaluation.create({
        data: {
          candidateId: candidate.id,
          jobId: input.job.id,
          overallScore: input.scoreOverride,
          confidence: breakdown.confidence,
          recommendation: recommendation.nextStep,
          summary: analysis.summary,
          source: EvaluationSource.DETERMINISTIC,
          status: EvaluationStatus.COMPLETED,
          scoringVersion: SCORING_VERSION,
          promptVersion: PROMPT_VERSION,
          completedAt: new Date(),
        },
      });
      await prisma.evaluationCategoryScore.createMany({
        data: breakdown.categoryScores.map((category) => ({
          evaluationId: evaluation.id,
          category: category.category,
          score: category.score,
          maxScore: category.maxScore,
          weight: category.weight,
          explanation: category.explanation,
        })),
      });
      const evidence = collectEvidence({ resumeText: candidate.resumeText, requirements, scores: breakdown.requirementScores });

      for (const score of breakdown.requirementScores) {
        const requirementEvidence = evidence.find((item) => item.requirementId === score.requirementId);
        const result = await prisma.requirementResult.create({
          data: {
            evaluationId: evaluation.id,
            requirementId: score.requirementId,
            status: score.status,
            score: score.score,
            maxScore: score.maxScore,
            confidence: score.confidence,
            explanation: score.explanation,
          },
        });

        if (requirementEvidence && score.status !== RequirementMatchStatus.MISSING) {
          await prisma.evaluationEvidence.create({
            data: {
              evaluationId: evaluation.id,
              requirementResultId: result.id,
              resumeSection: requirementEvidence.resumeSection,
              excerpt: requirementEvidence.excerpt,
              startOffset: requirementEvidence.startOffset,
              endOffset: requirementEvidence.endOffset,
              confidence: requirementEvidence.confidence,
            },
          });
        }
      }
      await prisma.resumeAnalysis.create({
        data: {
          candidateId: candidate.id, jobId: input.job.id, fitScore: input.scoreOverride,
          summary: analysis.summary, roleMatch: analysis.roleMatch, strengths: analysis.strengths, gaps: analysis.gaps,
          recommendedStage: analysis.recommendedStage, nextStep: analysis.nextStep,
          technicalQuestions: analysis.technicalQuestions, behavioralQuestions: analysis.behavioralQuestions,
          resumeSpecificQuestions: analysis.resumeSpecificQuestions, source: "deterministic",
        },
      });
      await prisma.interviewKit.create({
        data: { candidateId: candidate.id, jobId: input.job.id, questions: analysis.interviewQuestions, focusAreas: analysis.gaps },
      });
    }
  }

  const now = Date.now();
  await prisma.activityLog.createMany({
    data: [
      { organizationId: org.id, type: ActivityType.STATUS_CHANGED, message: "Maya Chen advanced to Offer for Product Engineer.", createdAt: new Date(now - 2 * 60 * 60 * 1000) },
      { organizationId: org.id, type: ActivityType.ANALYSIS_GENERATED, message: "Recruiter Copilot analysis completed for Elena Rodriguez.", createdAt: new Date(now - 5 * 60 * 60 * 1000) },
      { organizationId: org.id, type: ActivityType.CANDIDATE_CREATED, message: "Marcus Lee applied for Product Designer.", createdAt: new Date(now - 20 * 60 * 60 * 1000) },
      { organizationId: org.id, type: ActivityType.STATUS_CHANGED, message: "Jordan Patel advanced to Interview for Growth Operations Specialist.", createdAt: new Date(now - 30 * 60 * 60 * 1000) },
      { organizationId: org.id, type: ActivityType.ANALYSIS_GENERATED, message: "Recruiter Copilot analysis completed for Priya Shah.", createdAt: new Date(now - 48 * 60 * 60 * 1000) },
      { organizationId: org.id, type: ActivityType.CANDIDATE_CREATED, message: "Camille Martin applied for Customer Success Manager.", createdAt: new Date(now - 60 * 60 * 60 * 1000) },
      { organizationId: org.id, type: ActivityType.JOB_CREATED, message: "Product Designer opened in San Francisco.", createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000) },
      { organizationId: org.id, type: ActivityType.JOB_CREATED, message: "Northstar Labs hiring workspace initialized.", createdAt: new Date(now - 7 * 24 * 60 * 60 * 1000) },
    ],
  });

  console.log("Seeded Northstar Labs sample workspace with 4 jobs and 12 candidates.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
