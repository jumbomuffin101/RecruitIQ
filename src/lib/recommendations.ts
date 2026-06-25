export type CandidateStage = "APPLIED" | "SCREENED" | "INTERVIEW" | "OFFER" | "REJECTED";

export type RecommendationTone = "advance" | "review" | "reject" | "neutral";

export type CandidateRecommendation = {
  recommendedStage: CandidateStage;
  nextStep: string;
  description: string;
  tone: RecommendationTone;
};

export function getDeterministicRecommendedStage(fitScore: number): CandidateStage {
  if (fitScore >= 85) return "INTERVIEW";
  if (fitScore >= 70) return "SCREENED";
  if (fitScore >= 50) return "APPLIED";
  return "REJECTED";
}

export function getCandidateRecommendation({
  fitScore,
  currentStatus,
}: {
  fitScore: number;
  currentStatus?: string | null;
}): CandidateRecommendation {
  const recommendedStage = getDeterministicRecommendedStage(fitScore);

  if (currentStatus === "REJECTED") {
    return {
      recommendedStage: "REJECTED",
      nextStep: "No further action",
      description: "This candidate is already archived for the selected role. Revisit only if a better-fit opening becomes available.",
      tone: "neutral",
    };
  }

  if (fitScore < 50) {
    return {
      recommendedStage,
      nextStep: "Reject candidate",
      description: "This candidate has limited alignment with the selected role requirements. Consider rejecting or keeping only as a backup.",
      tone: "reject",
    };
  }

  if (currentStatus === "INTERVIEW") {
    return {
      recommendedStage,
      nextStep: "Prepare interview kit",
      description: "The candidate is already in Interview. Use the interview kit to validate strengths and close priority gaps.",
      tone: "advance",
    };
  }

  if (fitScore >= 85) {
    return {
      recommendedStage,
      nextStep: "Advance to Interview",
      description: "Strong role alignment. Prioritize a structured interview with focused validation around the remaining risks.",
      tone: "advance",
    };
  }

  if (fitScore >= 70) {
    return currentStatus === "SCREENED"
      ? {
          recommendedStage,
          nextStep: "Keep Screened for calibration",
          description: "The candidate is already screened. Compare against stronger applicants before moving to interview.",
          tone: "review",
        }
      : {
          recommendedStage,
          nextStep: "Move to Screened",
          description: "Good baseline alignment. Run a focused screen before deciding whether to interview.",
          tone: "advance",
        };
  }

  return {
    recommendedStage,
    nextStep: currentStatus === "APPLIED" ? "Keep in Applied for review" : "Hold for review",
    description: "Some useful overlap exists, but the evidence is not strong enough to advance. Review manually or keep as a backup.",
    tone: "review",
  };
}
