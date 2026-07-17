import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { assertClerkEnvironment } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  title: "RecruitIQ | AI-powered ATS for lean teams",
  description: "RecruitIQ helps lean hiring teams manage jobs, candidates, pipelines, and interview prep with deterministic AI scoring.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Do not render navigation controls that cannot initialize Clerk.
  assertClerkEnvironment();

  return (
    <html lang="en">
      <body>
        <ClerkProvider
          afterSignOutUrl="/"
          signInUrl="/clerk/sign-in"
          signUpUrl="/clerk/sign-up"
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
