import { NextResponse } from "next/server";
import { getOpenRouterStatus } from "@/lib/openrouter";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(getOpenRouterStatus());
}
