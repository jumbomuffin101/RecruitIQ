import Link from "next/link";
import { LandingAuthActions } from "@/components/LandingAuthActions";
import {
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  GitCompareArrows,
  ShieldCheck,
  Sparkles,
  Waypoints,
} from "lucide-react";

const pillars = [
  {
    title: "Explainable scoring",
    description: "A deterministic rubric evaluates role requirements and makes every score traceable.",
    icon: ClipboardCheck,
  },
  {
    title: "Resume evidence",
    description: "Candidate signals stay grounded in resume excerpts instead of opaque summaries.",
    icon: FileSearch,
  },
  {
    title: "Structured interviews",
    description: "Versioned scorecards connect interviewer feedback directly to job requirements.",
    icon: GitCompareArrows,
  },
  {
    title: "Human validation",
    description: "Compare hiring signals with interview feedback before any final decision is made.",
    icon: ShieldCheck,
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-950">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-900 text-white shadow-sm">
            <BrainCircuit className="h-5 w-5" />
          </span>
          <span>RecruitIQ</span>
        </Link>
        <LandingAuthActions variant="header" />
      </header>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.04fr_0.96fr] lg:items-center lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-900">
              <Sparkles className="h-4 w-4" />
              AI-assisted hiring intelligence
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Make better hiring decisions with explainable candidate evaluation.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              RecruitIQ turns resumes, job requirements, and interview feedback into structured, evidence-backed hiring decisions.
            </p>
            <div className="mt-8"><LandingAuthActions variant="hero" /></div>
            <p className="mt-5 text-sm text-slate-500">Built for focused recruiting teams that need clarity, consistency, and control.</p>
          </div>

          <div className="border border-slate-200 bg-slate-950 p-4 shadow-xl shadow-slate-950/10 sm:p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">Candidate evaluation</p>
                <p className="mt-1 text-lg font-semibold text-white">Maya Chen · Product Engineer</p>
              </div>
              <span className="rounded-md bg-emerald-400 px-2.5 py-1 text-sm font-bold text-emerald-950">91 / 100</span>
            </div>
            <div className="grid gap-3 py-4 sm:grid-cols-3">
              {[
                ["Required skills", "38 / 40"],
                ["Relevant experience", "28 / 30"],
                ["Project alignment", "17 / 20"],
              ].map(([label, value]) => (
                <div key={label} className="border border-slate-800 bg-slate-900 p-3">
                  <p className="text-xs font-medium text-slate-400">{label}</p>
                  <p className="mt-1 text-base font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-800 pt-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> Recommended next step: interview
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">Strong TypeScript and product analytics evidence. Validate system-design depth with a structured interview scorecard.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-emerald-800">A clearer hiring workflow</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Evidence first. Judgment stays human.</h2>
          <p className="mt-3 text-base leading-7 text-slate-600">RecruitIQ gives lean hiring teams a shared, defensible picture of every candidate without pretending to make the decision for them.</p>
        </div>
        <div className="mt-10 grid gap-px overflow-hidden border border-slate-200 bg-slate-200 md:grid-cols-2">
          {pillars.map((pillar) => (
            <article key={pillar.title} className="bg-white p-6 sm:p-7">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
                <pillar.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-slate-950">{pillar.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{pillar.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="flex max-w-3xl items-center gap-3">
            <Waypoints className="h-6 w-6 shrink-0 text-emerald-800" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">From intake to a defensible decision</p>
              <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">One connected hiring record.</h2>
            </div>
          </div>
          <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {["Resume", "Structured evaluation", "Interview scorecard", "Human feedback", "Decision support"].map((step, index) => (
              <li key={step} className="border border-slate-200 bg-slate-50 p-4">
                <span className="text-xs font-bold text-emerald-800">0{index + 1}</span>
                <p className="mt-6 text-sm font-semibold text-slate-950">{step}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-slate-500">RecruitIQ organizes evidence and recommendations. Hiring teams retain the final decision.</p>
        </div>
      </section>

      <section className="bg-emerald-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-20">
          <div>
            <p className="text-sm font-semibold text-emerald-300">Technical credibility</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">AI explains. Your rubric decides.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Deterministic scoring keeps fit scores explainable.",
              "AI enriches summaries and interview preparation, not numerical judgment.",
              "Role-based organization isolation keeps hiring data scoped.",
              "Versioned evaluations preserve the reasoning behind each review.",
            ].map((statement) => (
              <div key={statement} className="border border-emerald-900 bg-emerald-900/40 p-4 text-sm leading-6 text-emerald-50">
                <CheckCircle2 className="mb-3 h-4 w-4 text-emerald-300" />
                {statement}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-8 text-sm text-slate-500 sm:px-6 lg:px-8">
          <span className="font-semibold text-slate-800">RecruitIQ</span>
          <span>Explainable hiring intelligence.</span>
          <span>Created by Aryan Rawat.</span>
        </div>
      </footer>
    </main>
  );
}
