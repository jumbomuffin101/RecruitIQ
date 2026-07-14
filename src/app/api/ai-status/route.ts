import { NextResponse } from "next/server";
import { getOpenRouterStatus } from "@/lib/openrouter";

export const runtime = "nodejs";

export function GET() {
  const status = getOpenRouterStatus();

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({
      openRouterConfigured: status.openRouterConfigured,
      diagnostics: "restricted",
    });
  }

  return NextResponse.json(status);
}
