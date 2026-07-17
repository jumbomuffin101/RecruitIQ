import { NextResponse } from "next/server";
import { assertDatabaseEnvironment } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    assertDatabaseEnvironment();
    await getPrisma().$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ready" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    logger.error("readiness_check_failed", { resourceType: "database" });
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
