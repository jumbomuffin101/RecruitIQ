import { ArrowRight, BrainCircuit, Cloud, Database, Layers3, ServerCog, UserRound, Workflow } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const architectureSteps = [
  {
    title: "Recruiter",
    subtitle: "Authenticated organization user",
    description: "Clerk resolves the signed-in user, active organization membership, and role before hiring data is loaded.",
    icon: UserRound,
  },
  {
    title: "Vercel",
    subtitle: "Next.js App Router",
    description: "Server-rendered React UI, responsive Tailwind screens, and production deployment.",
    icon: Cloud,
  },
  {
    title: "Backend Logic",
    subtitle: "Server Actions / API routes",
    description: "Create jobs, add candidates, update stages, generate analysis, and revalidate app views.",
    icon: ServerCog,
  },
  {
    title: "Prisma",
    subtitle: "Prisma ORM",
    description: "Typed models, relations, enums, and PostgreSQL-safe queries for all hiring workflows.",
    icon: Layers3,
  },
  {
    title: "Amazon Aurora",
    subtitle: "PostgreSQL",
    description: "Jobs, candidates, applications, resume analyses, interview kits, users, organizations, and activity logs.",
    icon: Database,
  },
];

const proofCards = [
  ["Production database", "Amazon Aurora PostgreSQL"],
  ["Deployment", "Vercel with Next.js server functions"],
  ["ORM", "Prisma with a PostgreSQL datasource"],
  ["AI service", "Optional OpenRouter; deterministic fallback always available"],
  ["Access control", "Clerk sessions, organization-scoped queries, and server-side role checks"],
];

export default function ArchitecturePage() {
  return (
    <>
      <PageHeader
        eyebrow="Submission proof"
        title="Architecture"
        description="RecruitIQ is a Vercel-hosted Next.js app with a PostgreSQL-first data layer designed to run on Amazon Aurora PostgreSQL."
      />

      <section className="surface rounded-lg p-5">
        <div className="grid gap-4 lg:grid-cols-5">
          {architectureSteps.map((step, index) => (
            <div key={step.title} className="relative rounded-lg border border-slate-200 bg-white p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <step.icon className="h-5 w-5" />
              </span>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {step.subtitle}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-950">{step.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
              {index < architectureSteps.length - 1 ? (
                <ArrowRight className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 rounded-full bg-white text-slate-400 lg:block" />
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <div className="surface rounded-lg p-6">
          <h2 className="text-xl font-semibold text-slate-950">PostgreSQL-compatible by design</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            RecruitIQ uses Prisma with a PostgreSQL datasource and models recruiting data as relational
            records: organizations own jobs, candidates, applications, resume analyses, interview kits, and
            activity logs. Production data is stored in Amazon Aurora PostgreSQL, providing transactional
            integrity and a scalable relational foundation for recruiting operations.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {proofCards.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-950">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface rounded-lg bg-slate-950 p-6 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 text-emerald-300">
              <BrainCircuit className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">AI analysis path</p>
              <p className="text-xs text-slate-300">Provider optional, fallback built in</p>
            </div>
          </div>
          <div className="mt-6 space-y-3 text-sm leading-6 text-slate-300">
            <p className="rounded-lg bg-white/10 p-3">If `OPENROUTER_API_KEY` exists, Server Actions call OpenRouter server-side.</p>
            <p className="rounded-lg bg-white/10 p-3">If the provider is absent or fails, deterministic scoring keeps every workflow available.</p>
            <p className="rounded-lg bg-white/10 p-3">No API keys are exposed to client components.</p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex gap-3">
          <Workflow className="mt-1 h-5 w-5 shrink-0 text-emerald-700" />
          <p className="text-sm leading-6 text-emerald-950">
            Submission explanation: Vercel serves the Next.js app, Server Actions execute trusted mutations,
            Prisma maps those actions to normalized PostgreSQL tables stored in Amazon Aurora PostgreSQL.
          </p>
        </div>
      </section>
    </>
  );
}
