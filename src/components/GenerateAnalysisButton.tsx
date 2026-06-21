"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle, Sparkles } from "lucide-react";

export function GenerateAnalysisButton({ hasAnalysis }: { hasAnalysis: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-emerald-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {pending ? "Analyzing candidate" : hasAnalysis ? "Refresh Copilot Analysis" : "Generate Copilot Analysis"}
    </button>
  );
}
