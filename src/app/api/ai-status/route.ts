import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getOpenRouterStatus, probeOpenRouter } from "@/lib/openrouter";
import { AuthorizationError, getCurrentUserContext, requireRole } from "@/lib/auth-context";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const probe = new URL(request.url).searchParams.get("probe") === "1";
  try {
    if (probe) {
      await requireRole(UserRole.ADMIN);
    } else {
      await getCurrentUserContext();
    }
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    }
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  if (probe) {
    return NextResponse.json(await probeOpenRouter());
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
