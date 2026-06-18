import { Database } from "lucide-react";

export function DatabaseNotice({ message }: { message: string }) {
  return (
    <div className="surface rounded-lg p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
          <Database className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Database setup needed</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
          <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs text-slate-700">
            cp .env.example .env && npx prisma db push && npm run db:seed
          </p>
        </div>
      </div>
    </div>
  );
}
