import { NextResponse, type NextMiddleware } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { auth } from "@/auth";

const protectedPrefixes = ["/dashboard", "/jobs", "/candidates", "/pipeline", "/compare", "/analytics", "/architecture", "/quick-start", "/demo", "/onboarding"];

const authJsProxy = auth((request) => {
  const isProtected = protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix));
  if (isProtected && !request.auth) {
    return NextResponse.redirect(new URL("/sign-in", request.nextUrl));
  }
  return NextResponse.next();
}) as unknown as NextMiddleware;

// Auth.js remains the active access-control layer during the Clerk migration.
// Clerk middleware establishes Clerk request context without changing existing sessions.
export default clerkMiddleware(async (_clerkAuth, request, event) => authJsProxy(request, event));

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
