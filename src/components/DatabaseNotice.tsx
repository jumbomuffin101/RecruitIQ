import { Database } from "lucide-react";

export function DatabaseNotice({ message }: { message: string }) {
  const isProduction = process.env.NODE_ENV === "production";
  const safeMessage = isProduction ? "RecruitIQ could not load this data. Please try again shortly." : message;

  return (
    <div className="surface rounded-lg p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
          <Database className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{isProduction ? "Workspace temporarily unavailable" : "Database setup needed"}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{safeMessage}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            RecruitIQ stores hiring data in Amazon Aurora PostgreSQL through Prisma ORM.
          </p>
          {!isProduction ? (
            <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs text-slate-700">
              cp .env.example .env && npx prisma migrate deploy && npm run db:seed
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
