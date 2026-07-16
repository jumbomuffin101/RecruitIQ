import Link from "next/link";
import { signInWithGitHub } from "@/app/auth-actions";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-7 shadow-xl shadow-slate-950/5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">RecruitIQ</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Sign in to your hiring workspace</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Use your GitHub account to create or access an organization-scoped RecruitIQ workspace.</p>
        <form action={signInWithGitHub} className="mt-6">
          <button className="w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Continue with GitHub</button>
        </form>
        <p className="mt-5 text-center text-xs text-slate-500">New here? Your organization setup starts after secure sign-in.</p>
        <Link href="/" className="mt-6 block text-center text-sm font-semibold text-blue-700 hover:text-blue-900">Back to RecruitIQ</Link>
      </section>
    </main>
  );
}
