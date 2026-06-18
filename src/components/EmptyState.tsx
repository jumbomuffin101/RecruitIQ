import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="surface flex min-h-56 flex-col items-center justify-center rounded-lg p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Icon className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
