import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BrainCircuit, CheckCircle2, CircleAlert, Mail, MapPin, Phone } from "lucide-react";
import { generateCandidateAnalysis, updateCandidateStatus } from "@/app/actions";
import { DatabaseNotice } from "@/components/DatabaseNotice";
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

    return (
      <>
        <Link href="/candidates" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
          <ArrowLeft className="h-4 w-4" />
          Back to candidates
        </Link>
        <PageHeader
          eyebrow="Candidate profile"
          title={candidate.name}
          description={`${candidate.roleAppliedFor}${application?.job ? ` for ${application.job.title}` : ""}`}
          action={<StatusBadge status={candidate.status} />}
        />

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
              </div>
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
                  <h2 className="text-lg font-semibold text-slate-950">AI fit analysis</h2>
                  <p className="mt-1 text-sm text-slate-500">Deterministic scoring based on skills, resume text, and job requirements.</p>
                </div>
                <form action={generateCandidateAnalysis}>
                  <input type="hidden" name="candidateId" value={candidate.id} />
                  <button className="inline-flex items-center gap-2 rounded-lg bg-emerald-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900">
                    <BrainCircuit className="h-4 w-4" />
                    {analysis ? "Regenerate" : "Generate"}
                  </button>
                </form>
              </div>
              {analysis ? (
                <div className="mt-6">
                  <div className="flex items-end gap-3">
                    <span className="text-6xl font-semibold tracking-tight text-slate-950">{analysis.fitScore}</span>
                    <span className="pb-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Fit score</span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{analysis.summary}</p>
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
                        Gaps
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
                <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-6 text-sm leading-6 text-slate-600">
                  Generate analysis to calculate a fit score, strengths, gaps, and tailored interview questions.
                </div>
              )}
            </div>

            <div className="surface rounded-lg p-5">
              <h2 className="text-lg font-semibold text-slate-950">Resume summary</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{candidate.experienceSummary}</p>
              <div className="mt-5 max-h-72 overflow-auto rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                {candidate.resumeText}
              </div>
            </div>

            <div className="surface rounded-lg p-5">
              <h2 className="text-lg font-semibold text-slate-950">Generated interview questions</h2>
              {kit ? (
                <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                  {kit.questions.map((question, index) => (
                    <li key={question} className="rounded-lg bg-slate-50 p-3">
                      <span className="font-semibold">{index + 1}. </span>
                      {question}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-sm text-slate-500">No interview kit generated yet.</p>
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
