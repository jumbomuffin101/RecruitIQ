import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
};

export function StatCard({ label, value, detail, icon: Icon }: StatCardProps) {
  return (
    <div className="surface rounded-lg p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-sm text-slate-500">{detail}</p>
    </div>
  );
}
