import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  accent?: "blue" | "emerald" | "violet" | "amber";
};

const accentStyles = {
  blue: "bg-blue-50 text-blue-700",
  emerald: "bg-emerald-50 text-emerald-700",
  violet: "bg-violet-50 text-violet-700",
  amber: "bg-amber-50 text-amber-700",
};

export function StatCard({ label, value, detail, icon: Icon, accent = "blue" }: StatCardProps) {
  return (
    <div className="surface rounded-lg p-5 transition hover:-translate-y-0.5 hover:shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${accentStyles[accent]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-sm text-slate-500">{detail}</p>
    </div>
  );
}
