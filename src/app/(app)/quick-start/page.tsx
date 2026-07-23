import Link from "next/link";
import { BarChart3, BrainCircuit, BriefcaseBusiness, CheckCircle2, FileText, Scale, Workflow } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const workflowSteps = [
  ["Create a job", "Define the role, requirements, location, and hiring status.", "/jobs", "Open Jobs", BriefcaseBusiness],
  ["Add a candidate", "Upload a PDF or TXT resume, review extracted text, and save the profile.", "/candidates", "Add Candidate", FileText],
  ["Run Recruiter Copilot", "Generate fit score, executive summary, risks, next step, and interview kit.", "/candidates", "View Candidates", BrainCircuit],
  ["Compare the shortlist", "Rank candidates against a selected job and focus on the strongest matches.", "/compare", "Open Compare", Scale],
  ["Advance the pipeline", "Update stages from applied through offer using the hiring board.", "/pipeline", "Open Pipeline", Workflow],
  ["Review hiring health", "Track stage distribution, fit scores, job status, and skill demand.", "/analytics", "Open Analytics", BarChart3],
] as const;

export default function QuickStartPage() {
  return (
    <>
      <PageHeader
        eyebrow="Workspace guide"
        title="Quick Start"
        description="Follow this workflow to experience RecruitIQ from role creation through hiring decision."
        action={<Link href="/architecture" className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">View architecture</Link>}
      />
      <section className="rounded-lg border border-blue-100 bg-blue-50 p-5">
        <div className="flex gap-3">
          <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-blue-700" />
          <div>
            <h2 className="font-semibold text-blue-950">Build your hiring workspace.</h2>
            <p className="mt-1 text-sm leading-6 text-blue-900">Start with a job, then add candidates, evaluations, and interview feedback as your process takes shape.</p>
          </div>
        </div>
      </section>
      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {workflowSteps.map(([title, description, href, cta, Icon], index) => (
          <article key={title} className="surface rounded-lg p-5">
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><Icon className="h-5 w-5" /></span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">Step {index + 1}</span>
            </div>
            <h2 className="mt-5 text-lg font-semibold text-slate-950">{title}</h2>
            <p className="mt-2 min-h-16 text-sm leading-6 text-slate-600">{description}</p>
            <Link href={href} className="mt-5 inline-flex rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">{cta}</Link>
          </article>
        ))}
      </section>
    </>
  );
}
