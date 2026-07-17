import Link from "next/link";
import { signInWithGitHub, signInWithTestAccount } from "@/app/auth-actions";
import { isTestAuthEnabled } from "@/lib/test-auth";

export default function SignInPage() {
  const testAuthEnabled = isTestAuthEnabled();
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-7 shadow-xl shadow-slate-950/5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">RecruitIQ</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Sign in to your hiring workspace</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Use your GitHub account to create or access an organization-scoped RecruitIQ workspace.</p>
        <form action={signInWithGitHub} className="mt-6">
          <button data-testid="github-sign-in" className="w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Continue with GitHub</button>
        </form>
        {testAuthEnabled ? (
          <form action={signInWithTestAccount} className="mt-3 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <label className="block text-xs font-semibold text-amber-950" htmlFor="testUserKey">Test account</label>
            <select id="testUserKey" name="testUserKey" data-testid="test-user-key" defaultValue="admin" className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-slate-900">
              <option value="admin">Administrator</option>
              <option value="recruiter">Recruiter</option>
              <option value="interviewer">Interviewer</option>
              <option value="onboarding">New workspace owner</option>
              <option value="otherAdmin">Other organization administrator</option>
            </select>
            <button data-testid="test-sign-in" className="w-full rounded-md bg-amber-700 px-3 py-2 text-sm font-semibold text-white">Sign in with test account</button>
          </form>
        ) : null}
        <p className="mt-5 text-center text-xs text-slate-500">New here? Your organization setup starts after secure sign-in.</p>
        <Link href="/" className="mt-6 block text-center text-sm font-semibold text-blue-700 hover:text-blue-900">Back to RecruitIQ</Link>
      </section>
    </main>
  );
}
