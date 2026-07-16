import { NextResponse } from "next/server";
import { getOpenRouterStatus } from "@/lib/openrouter";
import { getCurrentUserContext } from "@/lib/auth-context";

export const runtime = "nodejs";

export async function GET() {
  try {
    await getCurrentUserContext();
  } catch {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }
  const status = getOpenRouterStatus();

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({
      openRouterConfigured: status.openRouterConfigured,
      diagnostics: "restricted",
    });
  }

  return NextResponse.json(status);
}
