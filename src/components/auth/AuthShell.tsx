import Link from "next/link";
import { BrainCircuit, CheckCircle2 } from "lucide-react";

type AuthShellProps = {
  mode: "sign-in" | "sign-up";
  children: React.ReactNode;
};

const featurePoints = [
  "Explainable candidate scoring",
  "Resume-grounded evaluations",
  "Structured interview scorecards",
];

export function AuthShell({ mode, children }: AuthShellProps) {
  const isSignUp = mode === "sign-up";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7fbf9] px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_18%_20%,rgba(110,231,183,0.28),transparent_32%),radial-gradient(circle_at_72%_12%,rgba(220,252,231,0.9),transparent_28%)]" />
      <div className="pointer-events-none absolute left-[18%] top-16 h-56 w-56 rounded-full border border-emerald-100/80" />
      <div className="pointer-events-none absolute right-[10%] top-24 grid grid-cols-5 gap-3 opacity-40">
        {Array.from({ length: 20 }).map((_, index) => <span key={index} className="h-1.5 w-1.5 rounded-full bg-emerald-200" />)}
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1fr_minmax(420px,0.84fr)] lg:gap-16">
        <section className="mx-auto w-full max-w-xl lg:mx-0">
          <Link href="/" className="inline-flex items-center gap-3 font-semibold text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-800">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-800 text-white shadow-sm"><BrainCircuit className="h-5 w-5" /></span>
            <span className="text-lg">RecruitIQ</span>
          </Link>
          <p className="mt-14 text-sm font-semibold text-emerald-800">{isSignUp ? "Build a clearer hiring process" : "Welcome back"}</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">Make better hiring decisions with <span className="text-emerald-700">explainable AI.</span></h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-600">Evaluate candidates with structured rubrics, resume-grounded evidence, and human interview feedback.</p>
          <ul className="mt-8 grid gap-3 text-sm font-medium text-slate-700 sm:grid-cols-2 lg:grid-cols-1">
            {featurePoints.map((point) => <li key={point} className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />{point}</li>)}
          </ul>
        </section>

        <section className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-6">
          <div className="mb-5 border-b border-slate-100 pb-5">
            <p className="text-sm font-semibold text-emerald-800">RecruitIQ account</p>
            <p className="mt-1 text-sm text-slate-500">{isSignUp ? "Create your workspace to begin." : "Sign in to return to your workspace."}</p>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
