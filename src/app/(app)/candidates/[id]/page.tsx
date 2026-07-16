import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BrainCircuit, BriefcaseBusiness, CheckCircle2, CircleAlert, ExternalLink, FileSearch, FolderKanban, GraduationCap, ListChecks, Mail, MapPin, MessageSquareText, Phone, Target, UsersRound, Wrench } from "lucide-react";
import { deleteCandidate, updateApplicationStatus } from "@/app/actions";
import { AddApplicationForm } from "@/components/AddApplicationForm";
import { CandidateAvatar } from "@/components/CandidateAvatar";
import { DatabaseNotice } from "@/components/DatabaseNotice";
import { DeleteConfirmationButton } from "@/components/DeleteConfirmationButton";
import { FitScoreBar } from "@/components/FitScoreBar";
import { GenerateAnalysisForm } from "@/components/GenerateAnalysisForm";
import { InterviewScorecardPanel } from "@/components/InterviewScorecardPanel";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { CATEGORY_SCORE_LABELS } from "@/lib/evaluations/constants";
import { formatEnum } from "@/lib/utils";
import { getCandidateDetail, getJobs } from "@/lib/data";
import { getCurrentUserContext } from "@/lib/auth-context";
import { type CandidateStage, getCandidateRecommendation } from "@/lib/recommendations";

export const dynamic = "force-dynamic";

const statuses = ["APPLIED", "SCREENED", "INTERVIEW", "OFFER", "REJECTED"];
const recommendationStageStyles = {
  REJECTED: {
    card: "border-red-100 bg-red-50 text-red-950",
    body: "text-red-900",
    icon: "text-red-700",
  },
  INTERVIEW: {
    card: "border-emerald-100 bg-emerald-50 text-emerald-950",
    body: "text-emerald-900",
    icon: "text-emerald-700",
  },
  OFFER: {
    card: "border-emerald-100 bg-emerald-50 text-emerald-950",
    body: "text-emerald-900",
    icon: "text-emerald-700",
  },
  SCREENED: {
    card: "border-blue-100 bg-blue-50 text-blue-950",
    body: "text-blue-900",
    icon: "text-blue-700",
  },
  APPLIED: {
    card: "border-amber-100 bg-amber-50 text-amber-950",
    body: "text-amber-900",
    icon: "text-amber-700",
  },
};

function getRecommendationActionLabel(stage: CandidateStage, currentStatus: CandidateStage) {
  if (stage === "REJECTED") return currentStatus === "REJECTED" ? "No further action" : "Reject candidate";
  if (stage === "INTERVIEW") return "Advance to Interview";
  if (stage === "OFFER") return "Move to Offer";
  if (stage === "SCREENED") return "Move to Screened";
  return "Keep under review";
}

export default async function CandidateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ applicationId?: string }>;
}) {
  const { id } = await params;
  const { applicationId } = await searchParams;
  let candidate: Awaited<ReturnType<typeof getCandidateDetail>>;

  try {
    candidate = await getCandidateDetail(id);
  } catch (error) {
    return <DatabaseNotice message={error instanceof Error ? error.message : "Connect PostgreSQL to view candidate details."} />;
  }

  if (!candidate) {
    notFound();
  }

    const [jobs, context] = await Promise.all([getJobs(), getCurrentUserContext()]);
    const availableJobs = jobs.filter((job) => !candidate.applications.some((item) => item.jobId === job.id));
    const canManage = context.role !== "INTERVIEWER";
    const canDelete = context.role === "ADMIN";

    const application = candidate.applications.find((item) => item.id === applicationId) ?? candidate.applications[0];
    const selectedJobId = application?.jobId;
    const latestEvaluation = candidate.evaluations.find((evaluation) => evaluation.jobId === selectedJobId && evaluation.status === "COMPLETED") ?? candidate.evaluations.find((evaluation) => evaluation.jobId === selectedJobId);
    const evaluationHistory = candidate.evaluations.filter((evaluation) => evaluation.jobId === selectedJobId).slice(0, 5);
    const analysis = candidate.resumeAnalyses.find((item) => item.jobId === selectedJobId);
    const kit = candidate.interviewKits.find((item) => item.jobId === selectedJobId);
    const latestScorecard = candidate.interviewScorecards.find((item) => item.jobId === selectedJobId) ?? null;
    const jobText = `${application?.job.description ?? ""} ${application?.job.requirements ?? ""}`.toLowerCase();
    const matchedSkills = candidate.skills.filter((skill) => jobText.includes(skill.toLowerCase()));
    const technicalQuestions = analysis?.technicalQuestions?.length
      ? analysis.technicalQuestions
      : kit ? [kit.questions[0], kit.questions[3]].filter(Boolean) : [];
    const behavioralQuestions = analysis?.behavioralQuestions?.length
      ? analysis.behavioralQuestions
      : kit ? [kit.questions[2]].filter(Boolean) : [];
    const resumeSpecificQuestions = analysis?.resumeSpecificQuestions?.length
      ? analysis.resumeSpecificQuestions
      : kit ? [kit.questions[1], ...kit.questions.slice(4)].filter(Boolean) : [];
    const analysisSourceLabel = analysis?.source === "openrouter" ? "AI-enhanced via OpenRouter" : "Deterministic fallback";
    const recommendation = analysis
      ? getCandidateRecommendation({
          fitScore: analysis.fitScore,
          currentStatus: application?.status ?? "APPLIED",
        })
      : null;
    const recommendationStage: CandidateStage = recommendation?.recommendedStage ?? "APPLIED";
    const recommendationStyles = recommendationStageStyles[recommendationStage];
    const recommendationActionLabel = getRecommendationActionLabel(recommendationStage, (application?.status ?? "APPLIED") as CandidateStage);
    const questionGroups = [
      { title: "Technical", questions: technicalQuestions, icon: Wrench, tone: "bg-blue-50 text-blue-950" },
      { title: "Behavioral", questions: behavioralQuestions, icon: UsersRound, tone: "bg-emerald-50 text-emerald-950" },
      { title: "Resume-specific", questions: resumeSpecificQuestions, icon: FileSearch, tone: "bg-violet-50 text-violet-950" },
    ];
    const requirementGroups = latestEvaluation
      ? {
          matched: latestEvaluation.requirementResults.filter((result) => result.status === "MATCHED"),
          partial: latestEvaluation.requirementResults.filter((result) => result.status === "PARTIAL"),
          missing: latestEvaluation.requirementResults.filter((result) => result.status === "MISSING"),
        }
      : null;
    const isEvaluationStale = latestEvaluation?.job.evaluationRubric
      ? latestEvaluation.createdAt < latestEvaluation.job.evaluationRubric.updatedAt
      : false;
    const missingCriticalRequirements = latestEvaluation?.requirementResults.filter(
      (result) => result.status === "MISSING" && result.requirementIsCritical,
    ) ?? [];

    return (
      <>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/candidates" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
            <ArrowLeft className="h-4 w-4" />
            Back to candidates
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link href="/pipeline" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              View pipeline
            </Link>
            <Link href="/compare" className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
              Compare candidates
            </Link>
          </div>
        </div>
        <div className="surface mb-8 rounded-lg p-5">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <CandidateAvatar name={candidate.name} size="lg" />
              <div>
                <PageHeader
                  eyebrow="Candidate profile"
                  title={candidate.name}
                  description={`${candidate.roleAppliedFor}${application?.job ? ` for ${application.job.title}` : ""}`}
                  action={null}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {canDelete ? <DeleteConfirmationButton
                action={deleteCandidate}
                hiddenFields={{ candidateId: candidate.id }}
                buttonLabel="Delete Candidate"
                title="Delete candidate"
                description="Are you sure you want to delete this candidate? This action cannot be undone."
                confirmLabel="Delete Candidate"
              /> : null}
              {canManage ? <GenerateAnalysisForm candidateId={candidate.id} jobId={selectedJobId} hasAnalysis={Boolean(analysis)} /> : null}
            </div>
          </div>
        </div>

        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-6">
            <div className="surface rounded-lg p-5">
              <h2 className="text-lg font-semibold text-slate-950">Profile</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {candidate.email}
                </p>
                {candidate.phone ? (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {candidate.phone}
                  </p>
                ) : null}
                {candidate.location ? (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {candidate.location}
                  </p>
                ) : null}
                {candidate.linkedinUrl ? <a href={candidate.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-700 hover:underline"><ExternalLink className="h-4 w-4" />LinkedIn profile</a> : null}
                {candidate.githubUrl ? <a href={candidate.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-700 hover:underline"><ExternalLink className="h-4 w-4" />GitHub profile</a> : null}
              </div>
              {(candidate.currentTitle || candidate.currentCompany || candidate.yearsExperience !== null) ? (
                <div className="mt-5 rounded-lg bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-950">{candidate.currentTitle || "Professional experience"}</p>
                  <p className="mt-1 text-sm text-slate-600">{[candidate.currentCompany, candidate.yearsExperience !== null ? `${candidate.yearsExperience} years estimated experience` : ""].filter(Boolean).join(" | ")}</p>
                </div>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-2">
                {candidate.skills.map((skill) => (
                  <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="surface rounded-lg p-5">
              <h2 className="text-lg font-semibold text-slate-950">Applications</h2>
              <p className="mt-1 text-sm text-slate-500">Each job has its own stage, evaluation, and interview record.</p>
              <div className="mt-4 space-y-3">
                {candidate.applications.map((item) => {
                  const evaluation = candidate.evaluations.find((entry) => entry.jobId === item.jobId && entry.status === "COMPLETED");
                  const scorecard = candidate.interviewScorecards.find((entry) => entry.jobId === item.jobId);
                  return <div key={item.id} className={`rounded-lg border p-3 ${item.id === application?.id ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Link href={`/candidates/${candidate.id}?applicationId=${item.id}`} className="font-semibold text-slate-950 hover:underline">{item.job.title}</Link>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{item.job.department} · Applied {item.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                    <p className="mt-2 text-xs font-medium text-slate-600">Fit {evaluation?.overallScore ?? item.fitScore ?? "Pending"} · Scorecard {scorecard ? formatEnum(scorecard.status) : "Not started"}</p>
                    {evaluation?.recommendation ? <p className="mt-1 text-xs leading-5 text-slate-500">{evaluation.recommendation}</p> : null}
                    {item.statusHistory.length ? <div className="mt-2 text-xs text-slate-500">History: {item.statusHistory.slice(0, 3).map((entry) => `${entry.fromStatus ? `${formatEnum(entry.fromStatus)} to ` : ""}${formatEnum(entry.toStatus)}`).join(" · ")}</div> : null}
                    {canManage ? <form action={updateApplicationStatus} className="mt-3 flex gap-2">
                      <input type="hidden" name="applicationId" value={item.id} />
                      <select name="status" defaultValue={item.status} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">
                        {statuses.map((status) => <option key={status} value={status}>{formatEnum(status)}</option>)}
                      </select>
                      <button className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white">Update</button>
                    </form> : null}
                  </div>;
                })}
              </div>
              {canManage ? <AddApplicationForm candidateId={candidate.id} jobs={availableJobs.map((job) => ({ id: job.id, title: job.title, department: job.department }))} /> : null}
            </div>

            <div className="surface rounded-lg p-5">
              <h2 className="text-lg font-semibold text-slate-950">Notes</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{candidate.notes || "No notes added yet."}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="surface rounded-lg p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950">
                    <BrainCircuit className="h-5 w-5 text-blue-700" />
                    Recruiter Copilot
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">Uses OpenRouter when configured, with deterministic scoring as a reliable fallback.</p>
                </div>
              </div>
              {analysis ? (
                <div className="mt-6">
                  <div className="rounded-lg bg-slate-950 p-5 text-white">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-end gap-3">
                        <span className="text-6xl font-semibold tracking-tight">{analysis.fitScore}</span>
                        <span className="pb-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Fit score</span>
                      </div>
                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                        {analysisSourceLabel}
                      </span>
                    </div>
                    <div className="mt-5">
                      <FitScoreBar score={analysis.fitScore} size="lg" inverted />
                    </div>
                    <div className="mt-5 border-t border-white/10 pt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Executive summary</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{analysis.summary}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-[1fr_0.6fr]">
                    <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                      <h3 className="flex items-center gap-2 font-semibold text-blue-950"><Target className="h-4 w-4" />Role match explanation</h3>
                      <p className="mt-3 text-sm leading-6 text-blue-900">
                        {analysis.roleMatch
                          ? analysis.roleMatch
                          : matchedSkills.length
                          ? `${candidate.name} directly matches ${matchedSkills.join(", ")} for the ${application?.job.title ?? candidate.roleAppliedFor} role.`
                          : `The profile shows transferable experience, but direct overlap with the role requirements needs validation.`}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(matchedSkills.length ? matchedSkills : candidate.skills.slice(0, 3)).map((skill) => (
                          <span key={skill} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-blue-800">{skill}</span>
                        ))}
                      </div>
                    </div>
                    <div className={`rounded-lg border p-4 ${recommendationStyles.card}`}>
                      <h3 className="flex items-center gap-2 font-semibold"><ListChecks className={`h-4 w-4 ${recommendationStyles.icon}`} />Suggested next step</h3>
                      <p className="mt-3 text-xl font-semibold">{recommendationActionLabel}</p>
                      {recommendation ? (
                        <p className={`mt-1 text-xs font-semibold uppercase tracking-[0.16em] ${recommendationStyles.body}`}>
                          Recommended stage: {formatEnum(recommendation.recommendedStage)}
                        </p>
                      ) : null}
                      <p className={`mt-2 text-sm leading-6 ${recommendationStyles.body}`}>
                        {recommendation?.description || analysis.nextStep || "Use the interview kit below to validate strengths and close the highest-priority gaps."}
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg bg-emerald-50 p-4">
                      <h3 className="flex items-center gap-2 font-semibold text-emerald-900">
                        <CheckCircle2 className="h-4 w-4" />
                        Strengths
                      </h3>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-emerald-900">
                        {analysis.strengths.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-4">
                      <h3 className="flex items-center gap-2 font-semibold text-amber-900">
                        <CircleAlert className="h-4 w-4" />
                        Risks and gaps
                      </h3>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-900">
                        {analysis.gaps.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <BrainCircuit className="mx-auto h-8 w-8 text-slate-400" />
                  <h3 className="mt-3 font-semibold text-slate-950">Copilot analysis is ready to run</h3>
                  <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">Generate a role-specific fit score, executive summary, evidence, risks, next step, and structured interview kit.</p>
                </div>
              )}
            </div>

            <InterviewScorecardPanel
              candidateId={candidate.id}
              jobId={selectedJobId}
              scorecard={latestScorecard}
              hasEvaluation={Boolean(latestEvaluation && latestEvaluation.status === "COMPLETED")}
            />

            <div className="surface rounded-lg p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Structured evaluation</h2>
                  <p className="mt-1 text-sm text-slate-500">Versioned scoring, requirement results, and resume-grounded evidence.</p>
                </div>
                {latestEvaluation ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {latestEvaluation.scoringVersion}
                  </span>
                ) : null}
              </div>
              {latestEvaluation ? (
                <div className="mt-5 space-y-5">
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-lg bg-slate-950 p-4 text-white">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Overall</p>
                      <p className="mt-2 text-3xl font-semibold">{latestEvaluation.overallScore ?? "Pending"}</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Status</p>
                      <p className="mt-2 text-sm font-semibold text-blue-950">{formatEnum(latestEvaluation.status)}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Source</p>
                      <p className="mt-2 text-sm font-semibold text-emerald-950">{formatEnum(latestEvaluation.source)}</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Generated</p>
                      <p className="mt-2 text-sm font-semibold text-amber-950">
                        {(latestEvaluation.completedAt ?? latestEvaluation.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-950">Recommendation</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{latestEvaluation.recommendation || "No recommendation recorded."}</p>
                  </div>

                  {isEvaluationStale ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-semibold text-amber-950">Evaluation may be outdated</p>
                      <p className="mt-2 text-sm leading-6 text-amber-900">This candidate was evaluated before the job rubric was last updated. Regenerate the evaluation to use the latest scoring criteria.</p>
                    </div>
                  ) : null}

                  {missingCriticalRequirements.length ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <p className="text-sm font-semibold text-red-950">Critical gap</p>
                      <ul className="mt-2 space-y-2 text-sm leading-6 text-red-900">
                        {missingCriticalRequirements.map((result) => (
                          <li key={result.id}>{result.requirementText || result.requirement.text}: no supporting evidence found in the submitted resume.</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {latestEvaluation.categories.length ? (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">Category breakdown</h3>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {latestEvaluation.categories.map((category) => (
                          <div key={category.id} className="rounded-lg bg-slate-50 p-4">
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="font-semibold text-slate-800">{CATEGORY_SCORE_LABELS[category.category]}</span>
                              <span className="font-semibold text-slate-950">{category.score} / {category.maxScore}</span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">Configured weight: {category.weight}%</p>
                            <div className="mt-2 h-2 rounded-full bg-white">
                              <div className="h-2 rounded-full bg-blue-600" style={{ width: `${category.maxScore ? Math.round((category.score / category.maxScore) * 100) : 0}%` }} />
                            </div>
                            {category.explanation ? <p className="mt-2 text-xs leading-5 text-slate-500">{category.explanation}</p> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {requirementGroups ? (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">Requirement results</h3>
                      <div className="mt-3 space-y-3">
                        {latestEvaluation.requirementResults.map((result) => {
                          const tone = result.status === "MATCHED"
                            ? "border-emerald-100 bg-emerald-50 text-emerald-950"
                            : result.status === "PARTIAL"
                              ? "border-amber-100 bg-amber-50 text-amber-950"
                              : result.requirementType === "REQUIRED"
                                ? "border-red-100 bg-red-50 text-red-950"
                                : "border-slate-200 bg-slate-50 text-slate-800";
                          return (
                            <div key={result.id} className={`rounded-lg border p-4 ${tone}`}>
                              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                                <span className="rounded-full bg-white/70 px-2.5 py-1">{formatEnum(result.status)}</span>
                                <span className="rounded-full bg-white/70 px-2.5 py-1">{formatEnum(result.requirementType || result.requirement.type)}</span>
                                <span className="rounded-full bg-white/70 px-2.5 py-1">{formatEnum(result.requirementCategory || result.requirement.category)}</span>
                                {result.requirementIsCritical ? <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-800">Critical</span> : null}
                              </div>
                              <p className="mt-3 text-sm font-semibold">{result.requirementText || result.requirement.text}</p>
                              <p className="mt-2 text-sm leading-6">Score contribution: {result.score} / {result.maxScore}. {result.explanation}</p>
                              {result.status === "MISSING" ? (
                                <p className="mt-2 text-xs font-semibold">No supporting evidence found in the submitted resume.</p>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {latestEvaluation.evidence.length ? (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">Supporting evidence</h3>
                      <div className="mt-3 space-y-3">
                        {latestEvaluation.evidence.slice(0, 4).map((evidence) => (
                          <blockquote key={evidence.id} className="rounded-lg border-l-4 border-blue-500 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-950">
                            {evidence.excerpt}
                            {evidence.resumeSection ? <span className="mt-2 block text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{evidence.resumeSection}</span> : null}
                          </blockquote>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {evaluationHistory.length ? (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">Evaluation history</h3>
                      <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
                        {evaluationHistory.map((evaluation) => (
                          <div key={evaluation.id} className="grid gap-2 px-4 py-3 text-sm text-slate-600 md:grid-cols-[1fr_1fr_0.5fr_0.7fr_0.9fr]">
                            <span>{evaluation.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                            <span className="font-medium text-slate-800">{evaluation.job.title}</span>
                            <span>{evaluation.overallScore ?? "-"}</span>
                            <span>{formatEnum(evaluation.source)}</span>
                            <span>{evaluation.scoringVersion}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Generate Copilot analysis to create the first structured evaluation record.</p>
              )}
            </div>

            <div className="surface rounded-lg p-5">
              <h2 className="text-lg font-semibold text-slate-950">Resume profile</h2>
              <p className="mt-3 text-sm leading-6 text-slate-700">{candidate.resumeSummary || candidate.experienceSummary}</p>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-blue-50 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-950"><BriefcaseBusiness className="h-4 w-4" />Experience</h3>
                  <p className="mt-2 text-sm leading-6 text-blue-900">{candidate.experienceSummary || "No experience summary available."}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-950"><GraduationCap className="h-4 w-4" />Education</h3>
                  <p className="mt-2 text-sm leading-6 text-emerald-900">{candidate.educationSummary || "No education details provided."}</p>
                </div>
                <div className="rounded-lg bg-violet-50 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-violet-950"><FolderKanban className="h-4 w-4" />Projects</h3>
                  <p className="mt-2 text-sm leading-6 text-violet-900">{candidate.projectsSummary || "No project highlights provided."}</p>
                </div>
              </div>
              <details className="mt-5 rounded-lg border border-slate-200 bg-slate-50">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">View raw resume text</summary>
                <div className="max-h-80 overflow-auto border-t border-slate-200 px-4 py-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{candidate.resumeText}</div>
              </details>
            </div>

            <div className="surface rounded-lg p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950"><MessageSquareText className="h-5 w-5 text-blue-700" />Interview kit</h2>
              {kit ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  {questionGroups.map((group) => (
                    <div key={group.title} className={`rounded-lg p-4 ${group.tone}`}>
                      <h3 className="flex items-center gap-2 text-sm font-semibold"><group.icon className="h-4 w-4" />{group.title}</h3>
                      <ol className="mt-3 space-y-3 text-sm leading-6">
                        {group.questions.map((question, index) => <li key={question}><span className="font-semibold">{index + 1}. </span>{question}</li>)}
                      </ol>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Generate Copilot analysis to create technical, behavioral, and resume-specific questions.</p>
              )}
            </div>
          </div>
        </section>
      </>
    );
}
