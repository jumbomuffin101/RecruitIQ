import { cn } from "@/lib/utils";

export function FitScoreBar({
  score,
  size = "md",
  inverted = false,
}: {
  score: number | null | undefined;
  size?: "sm" | "md" | "lg";
  inverted?: boolean;
}) {
  const value = typeof score === "number" ? Math.max(0, Math.min(100, score)) : 0;
  const tone = value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-blue-600" : value >= 40 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span className={inverted ? "text-slate-300" : ""}>Fit score</span>
        <span className={inverted ? "text-white" : "text-slate-950"}>{typeof score === "number" ? `${value}/100` : "Pending"}</span>
      </div>
      <div className={cn("rounded-full", inverted ? "bg-white/15" : "bg-slate-100", size === "lg" ? "h-3" : size === "sm" ? "h-1.5" : "h-2")}>
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
