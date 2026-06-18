import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  BriefcaseBusiness,
  CheckCircle2,
  Users,
  Workflow,
} from "lucide-react";

const features = [
  {
    title: "Candidate ranking",
    description: "Score applicants against role requirements with explainable strengths and gaps.",
    icon: BrainCircuit,
  },
  {
    title: "Lean team pipeline",
    description: "Move candidates through a practical ATS workflow without enterprise complexity.",
    icon: Workflow,
  },
  {
    title: "Interview prep",
    description: "Generate targeted questions from resume text, skills, and role requirements.",
    icon: Users,
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3 font-semibold">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-950 text-white">
            <BrainCircuit className="h-5 w-5" />
          </span>
          RecruitIQ
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Open dashboard
        </Link>
      </header>

      <section className="border-y border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_70%)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
              AI-powered ATS for lean teams
            </p>
            <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-slate-950 md:text-7xl">
              Hire faster with a smarter, smaller recruiting stack.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              RecruitIQ helps startups, small businesses, and student organizations manage jobs,
              rank candidates, and generate interview prep from applicant data.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900"
              >
                View demo dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/jobs"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Create a job
              </Link>
            </div>
          </div>

          <div className="surface rounded-lg p-5">
            <div className="grid gap-4">
              {[
                ["Open jobs", "6", BriefcaseBusiness],
                ["Total candidates", "24", Users],
                ["Avg fit score", "82", BarChart3],
              ].map(([label, value, Icon]) => (
                <div key={label as string} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500">{label as string}</span>
                    <Icon className="h-5 w-5 text-blue-700" />
                  </div>
                  <p className="mt-3 text-3xl font-semibold">{value as string}</p>
                </div>
              ))}
              <div className="rounded-lg bg-slate-950 p-5 text-white">
                <p className="text-sm font-semibold">Top recommendation</p>
                <p className="mt-2 text-2xl font-semibold">Move Maya Chen to Interview</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  91 fit score with strong TypeScript, product analytics, and customer discovery overlap.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight">One workflow from job post to offer.</h2>
          <p className="mt-3 text-slate-600">
            RecruitIQ keeps the MVP tight: jobs, candidates, pipeline stages, scoring, notes, and interview kits.
          </p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="surface rounded-lg p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <feature.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 md:grid-cols-3">
          {["Post roles", "Analyze applicants", "Run better interviews"].map((step) => (
            <div key={step} className="flex gap-3">
              <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-400" />
              <div>
                <h3 className="font-semibold">{step}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  A practical, demo-ready flow designed for hackathon judges and real hiring operators.
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
