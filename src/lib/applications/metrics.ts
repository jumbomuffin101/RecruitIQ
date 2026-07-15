import { ApplicationStatus } from "@prisma/client";

export const applicationStages = [
  ApplicationStatus.APPLIED,
  ApplicationStatus.SCREENED,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.OFFER,
  ApplicationStatus.REJECTED,
] as const;

export function countApplicationsByStage(applications: Array<{ status: ApplicationStatus }>) {
  return applicationStages.map((stage) => ({
    stage,
    count: applications.filter((application) => application.status === stage).length,
  }));
}

export function getApplicationConversions(applications: Array<{ status: ApplicationStatus }>) {
  const counts = Object.fromEntries(countApplicationsByStage(applications).map(({ stage, count }) => [stage, count]));
  const percentage = (numerator: number, denominator: number) => denominator ? Math.round((numerator / denominator) * 100) : 0;
  return {
    appliedToScreened: percentage((counts.SCREENED ?? 0) + (counts.INTERVIEW ?? 0) + (counts.OFFER ?? 0), counts.APPLIED ?? 0),
    screenedToInterview: percentage((counts.INTERVIEW ?? 0) + (counts.OFFER ?? 0), counts.SCREENED ?? 0),
    interviewToOffer: percentage(counts.OFFER ?? 0, counts.INTERVIEW ?? 0),
    rejectionRate: percentage(counts.REJECTED ?? 0, applications.length),
  };
}
