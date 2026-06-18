import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RecruitIQ | AI-powered ATS for lean teams",
  description:
    "RecruitIQ helps lean hiring teams manage jobs, candidates, pipelines, and interview prep with deterministic AI scoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
