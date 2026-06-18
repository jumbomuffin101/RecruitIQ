import { cn, formatEnum } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  OPEN: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
  PAUSED: "bg-amber-50 text-amber-700 ring-amber-200",
  CLOSED: "bg-slate-900 text-white ring-slate-900",
  APPLIED: "bg-blue-50 text-blue-700 ring-blue-200",
  SCREENED: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  INTERVIEW: "bg-violet-50 text-violet-700 ring-violet-200",
  OFFER: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        statusStyles[status] ?? "bg-slate-100 text-slate-700 ring-slate-200",
      )}
    >
      {formatEnum(status)}
    </span>
  );
}
