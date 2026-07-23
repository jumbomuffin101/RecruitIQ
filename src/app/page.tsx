import Link from "next/link";
import { LandingAuthActions } from "@/components/LandingAuthActions";
import {
  Bell,
  BrainCircuit,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  GitCompareArrows,
  Layers3,
  Sparkles,
  UserRoundCheck,
  Users,
} from "lucide-react";

const workflow = [
  { title: "Ingest & organize", detail: "Resumes, job requirements, and candidate applications.", icon: FileSearch },
  { title: "Structured evaluation", detail: "Deterministic rubric-based scoring with resume evidence.", icon: Sparkles },
  { title: "Explainable insights", detail: "See exactly why each score and recommendation was produced.", icon: ClipboardCheck },
  { title: "Human validation", detail: "Interview scorecards and recruiter feedback complete the picture.", icon: UserRoundCheck },
];

const features = [
  ["Explainable candidate scoring", "Deterministic, rubric-based fit scores."],
  ["Resume-grounded evidence", "Trace each signal back to candidate information."],
  ["Configurable job rubrics", "Evaluate candidates against the criteria that matter."],
  ["Multi-job application pipelines", "Track a candidate across the roles they pursue."],
  ["Interview scorecards", "Give every interviewer a shared, structured guide."],
  ["Role-based workspaces", "Keep hiring data scoped to the right organization."],
];

function DashboardPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.14)]">
      <div className="grid min-h-[440px] grid-cols-[76px_1fr] sm:grid-cols-[142px_1fr]">
        <aside className="flex flex-col bg-emerald-950 px-3 py-5 text-emerald-50 sm:px-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-emerald-800"><BrainCircuit className="h-4 w-4" /></span>
          <nav aria-label="Dashboard preview navigation" className="mt-8 grid gap-2 text-[11px] font-medium sm:text-xs">
            {["Dashboard", "Candidates", "Jobs", "Evaluations", "Reports"].map((item, index) => (
              <span key={item} className={`rounded-md px-2 py-2 ${index === 0 ? "bg-emerald-800 text-white" : "text-emerald-100/85"}`}>{item}</span>
            ))}
          </nav>
          <span className="mt-auto hidden text-[10px] text-emerald-200 sm:block">RecruitIQ workspace</span>
        </aside>

        <div className="min-w-0 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-5">
            <p className="font-semibold text-slate-950">Dashboard</p>
            <div className="flex items-center gap-3"><Bell className="h-4 w-4 text-slate-500" /><span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">RQ</span></div>
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-sm font-semibold text-slate-950">Hiring overview</p><p className="mt-1 text-xs text-slate-500">Your hiring pipeline at a glance.</p></div>
              <span className="hidden rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 sm:block">This week</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 xl:grid-cols-4">
              {[
                ["Active jobs", "4", BriefcaseBusiness, "text-emerald-700 bg-emerald-50"],
                ["Candidates", "12", Users, "text-violet-700 bg-violet-50"],
                ["Evaluations", "10", ClipboardCheck, "text-sky-700 bg-sky-50"],
                ["In interview", "3", GitCompareArrows, "text-amber-700 bg-amber-50"],
              ].map(([label, value, Icon, color]) => {
                const MetricIcon = Icon as typeof BriefcaseBusiness;
                return <div key={label as string} className="border border-slate-200 p-3"><div className="flex items-center justify-between"><span className="text-[10px] font-medium text-slate-500">{label as string}</span><span className={`flex h-6 w-6 items-center justify-center rounded-md ${color as string}`}><MetricIcon className="h-3.5 w-3.5" /></span></div><p className="mt-3 text-xl font-semibold text-slate-950">{value as string}</p></div>;
              })}
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-[1.45fr_0.75fr]">
              <section className="border border-slate-200 p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-medium text-slate-500">Candidate evaluation</p><p className="mt-1 text-sm font-semibold text-slate-950">Product Engineer</p></div><span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-800">91 / 100</span></div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {[["Skills match", "38 / 40"], ["Experience", "28 / 30"], ["Projects", "17 / 20"]].map(([label, score]) => <div key={label} className="bg-slate-50 p-2"><p className="text-[9px] text-slate-500">{label}</p><p className="mt-1 text-xs font-semibold text-slate-800">{score}</p><span className="mt-2 block h-1.5 bg-emerald-700" /></div>)}
                </div>
                <div className="mt-3 border border-emerald-100 bg-emerald-50/60 p-2.5"><p className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" />Recommended next step: Interview</p><p className="mt-1 text-[10px] leading-4 text-slate-600">Validate system-design depth with a structured scorecard.</p></div>
              </section>
              <section className="hidden border border-slate-200 p-3 lg:block"><p className="text-[10px] font-semibold text-slate-700">Recent activity</p><div className="mt-3 grid gap-3">{["Candidate advanced to offer", "Candidate evaluation completed", "Application moved to interview"].map((activity, index) => <div key={activity} className="flex gap-2"><span className={`mt-0.5 h-2 w-2 rounded-full ${index === 0 ? "bg-emerald-500" : index === 1 ? "bg-amber-400" : "bg-violet-400"}`} /><p className="text-[10px] leading-4 text-slate-600">{activity}</p></div>)}</div></section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="overflow-hidden bg-[#f8fbfa] text-slate-950">
      <header className="relative z-10 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-[86px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-3 font-semibold text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-800"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-800 text-white shadow-sm"><BrainCircuit className="h-5 w-5" /></span><span className="text-lg">RecruitIQ</span></Link>
          <nav aria-label="Public navigation" className="hidden items-center gap-9 text-sm font-medium text-slate-700 md:flex"><Link href="#features" className="hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-800">Features</Link><Link href="#workflow" className="hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-800">How it works</Link></nav>
          <LandingAuthActions variant="header" />
        </div>
      </header>

      <section className="relative border-b border-slate-100 bg-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(209,250,229,0.72),transparent_25%),radial-gradient(circle_at_94%_28%,rgba(236,253,245,0.9),transparent_28%)]" />
        <div className="pointer-events-none absolute left-[34%] top-6 grid grid-cols-5 gap-4 opacity-50">{Array.from({ length: 25 }).map((_, index) => <span key={index} className="h-1.5 w-1.5 rounded-full bg-emerald-100" />)}</div>
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800"><Sparkles className="h-4 w-4" />AI-powered hiring intelligence</p>
            <h1 className="mt-7 text-4xl font-semibold leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-[4.25rem]">Make better hiring decisions with <span className="text-emerald-700">explainable AI.</span></h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">RecruitIQ turns resumes, job requirements, and interview feedback into structured, evidence-backed hiring decisions.</p>
            <div className="mt-9"><LandingAuthActions variant="hero" /></div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm text-slate-500"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Explainable scores</span><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Grounded evidence</span><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Human review</span></div>
          </div>
          <DashboardPreview />
        </div>
      </section>

      <section id="workflow" className="scroll-mt-24 border-b border-emerald-100 bg-[#f2fbf7]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="text-center"><p className="text-sm font-semibold text-emerald-800">A smarter hiring workflow</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Evidence first. Judgment stays human.</h2></div>
          <ol className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {workflow.map((step, index) => <li key={step.title} className="relative flex gap-4 xl:block"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-white text-emerald-800 shadow-[0_8px_18px_rgba(5,150,105,0.12)]"><step.icon className="h-5 w-5" /></span><div className="xl:mt-5"><p className="text-sm font-semibold text-slate-950">{step.title}</p><p className="mt-2 text-sm leading-6 text-slate-600">{step.detail}</p></div>{index < workflow.length - 1 ? <span className="absolute right-[-15px] top-6 hidden h-px w-6 border-t border-dotted border-emerald-500 xl:block" /> : null}</li>)}
          </ol>
        </div>
      </section>

      <section id="features" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-2xl"><p className="text-sm font-semibold text-emerald-800">Built for accountable hiring teams</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">A complete record of how each decision came together.</h2><p className="mt-4 text-base leading-7 text-slate-600">RecruitIQ combines data organization, scoring, interviews, and human feedback without obscuring the reasoning behind a recommendation.</p></div>
          <div className="mt-10 grid gap-px overflow-hidden border border-slate-200 bg-slate-200 md:grid-cols-2 xl:grid-cols-3">{features.map(([title, detail]) => <article key={title} className="bg-white p-6"><Layers3 className="h-5 w-5 text-emerald-700" /><h3 className="mt-5 text-base font-semibold text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p></article>)}</div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-8 text-sm text-slate-500 sm:px-6 lg:px-8"><span className="font-semibold text-slate-800">RecruitIQ</span><span>Explainable hiring intelligence.</span><span>Created by Aryan Rawat.</span></div></footer>
    </main>
  );
}
