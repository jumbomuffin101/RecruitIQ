import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BrainCircuit, BriefcaseBusiness, CheckCircle2, CircleAlert, ExternalLink, FileSearch, FolderKanban, GraduationCap, ListChecks, Mail, MapPin, MessageSquareText, Phone, Target, UsersRound, Wrench } from "lucide-react";
import { generateCandidateAnalysis, updateCandidateStatus } from "@/app/actions";
import { CandidateAvatar } from "@/components/CandidateAvatar";
import { DatabaseNotice } from "@/components/DatabaseNotice";
import { FitScoreBar } from "@/components/FitScoreBar";
import { GenerateAnalysisButton } from "@/components/GenerateAnalysisButton";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { formatEnum } from "@/lib/utils";
import { getCandidateDetail } from "@/lib/data";

export const dynamic = "force-dynamic";

const statuses = ["APPLIED", "SCREENED", "INTERVIEW", "OFFER", "REJECTED"];

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const candidate = await getCandidateDetail(id);

    if (!candidate) {
      notFound();
    }

    const analysis = candidate.resumeAnalyses[0];
    const kit = candidate.interviewKits[0];
    const application = candidate.applications[0];
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
    const analysisSourceLabel = analysis?.source === "openrouter" ? "AI-enhanced" : "Deterministic fallback";
    const questionGroups = [
      { title: "Technical", questions: technicalQuestions, icon: Wrench, tone: "bg-blue-50 text-blue-950" },
      { title: "Behavioral", questions: behavioralQuestions, icon: UsersRound, tone: "bg-emerald-50 text-emerald-950" },
      { title: "Resume-specific", questions: resumeSpecificQuestions, icon: FileSearch, tone: "bg-violet-50 text-violet-950" },
    ];

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
              <StatusBadge status={candidate.status} />
              <form action={generateCandidateAnalysis}>
                <input type="hidden" name="candidateId" value={candidate.id} />
                <GenerateAnalysisButton hasAnalysis={Boolean(analysis)} />
              </form>
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

            <form action={updateCandidateStatus} className="surface rounded-lg p-5">
              <input type="hidden" name="candidateId" value={candidate.id} />
              <h2 className="text-lg font-semibold text-slate-950">Pipeline stage</h2>
              <select name="status" defaultValue={candidate.status} className="focus-ring mt-4 w-full rounded-lg border border-slate-200 px-3 py-2">
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {formatEnum(status)}
                  </option>
                ))}
              </select>
              <button className="mt-3 w-full rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">
                Update status
              </button>
            </form>

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
                    <div className="rounded-lg border border-violet-100 bg-violet-50 p-4">
                      <h3 className="flex items-center gap-2 font-semibold text-violet-950"><ListChecks className="h-4 w-4" />Suggested next step</h3>
                      <p className="mt-3 text-xl font-semibold text-violet-950">Move to {formatEnum(analysis.recommendedStage)}</p>
                      <p className="mt-2 text-sm leading-6 text-violet-900">{analysis.nextStep || "Use the interview kit below to validate strengths and close the highest-priority gaps."}</p>
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
  } catch (error) {
    return <DatabaseNotice message={error instanceof Error ? error.message : "Connect PostgreSQL to view candidate details."} />;
  }
}
