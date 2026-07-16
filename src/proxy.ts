import { NextResponse } from "next/server";
import { auth } from "@/auth";

const protectedPrefixes = ["/dashboard", "/jobs", "/candidates", "/pipeline", "/compare", "/analytics", "/architecture", "/quick-start", "/demo", "/onboarding"];

export default auth((request) => {
  const isProtected = protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix));
  if (isProtected && !request.auth) {
    return NextResponse.redirect(new URL("/sign-in", request.nextUrl));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
