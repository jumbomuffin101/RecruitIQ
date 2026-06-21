import Link from "next/link";
import { BarChart3, BrainCircuit, BriefcaseBusiness, CheckCircle2, FileText, Scale, Workflow } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const demoSteps = [
  {
    title: "Create a job",
    description: "Add the target role, department, location, requirements, and status.",
    href: "/jobs",
    cta: "Open Jobs",
    icon: BriefcaseBusiness,
  },
  {
    title: "Add candidate with resume text/upload",
    description: "Upload a .txt resume or paste resume text and save it to PostgreSQL.",
    href: "/candidates",
    cta: "Add Candidate",
    icon: FileText,
  },
  {
    title: "Generate AI analysis",
    description: "Open any candidate profile and generate fit score, summary, strengths, gaps, and interview questions.",
    href: "/candidates",
    cta: "View Candidates",
    icon: BrainCircuit,
  },
  {
    title: "Compare ranked candidates",
    description: "Select a job and review the ranked shortlist with next actions.",
    href: "/compare",
    cta: "Open Compare",
    icon: Scale,
  },
  {
    title: "Move candidate through pipeline",
    description: "Use the Kanban board or profile status selector to update the hiring stage.",
    href: "/pipeline",
    cta: "Open Pipeline",
    icon: Workflow,
  },
  {
    title: "View analytics",
    description: "Show stage counts, job status, average fit score, and top skills.",
    href: "/analytics",
    cta: "Open Analytics",
    icon: BarChart3,
  },
];

export default function DemoPage() {
  return (
    <>
      <PageHeader
        eyebrow="Judge walkthrough"
        title="Guided demo"
        description="Use this checklist to test the highest-signal RecruitIQ workflows in five minutes."
        action={
          <Link href="/architecture" className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">
            View architecture
          </Link>
        }
      />

      <section className="rounded-lg border border-blue-100 bg-blue-50 p-5">
        <div className="flex gap-3">
          <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-blue-700" />
          <div>
            <h2 className="font-semibold text-blue-950">Seeded demo data is available when the database has been seeded.</h2>
            <p className="mt-1 text-sm leading-6 text-blue-900">
              Run `npm run db:seed` after `prisma db push` to load realistic jobs, candidates, analyses, and interview kits.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {demoSteps.map((step, index) => (
          <article key={step.title} className="surface rounded-lg p-5">
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <step.icon className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                Step {index + 1}
              </span>
            </div>
            <h2 className="mt-5 text-lg font-semibold text-slate-950">{step.title}</h2>
            <p className="mt-2 min-h-16 text-sm leading-6 text-slate-600">{step.description}</p>
            <Link
              href={step.href}
              className="mt-5 inline-flex rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {step.cta}
            </Link>
          </article>
        ))}
      </section>
    </>
  );
}
