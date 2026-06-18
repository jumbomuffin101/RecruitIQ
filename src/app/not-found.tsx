import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="surface max-w-md rounded-lg p-8 text-center">
        <h1 className="text-2xl font-semibold text-slate-950">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">The page or candidate you are looking for does not exist.</p>
        <Link href="/dashboard" className="mt-6 inline-flex rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
