import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { ArrowLeft, BriefcaseBusiness, CircleAlert, MapPin, Users } from "lucide-react";
import { deleteJob, updateApplicationStatus, updateJob } from "@/app/actions";
import { DatabaseNotice } from "@/components/DatabaseNotice";
import { DeleteConfirmationButton } from "@/components/DeleteConfirmationButton";
import { JobRubricForm } from "@/components/JobRubricForm";
import { StatusBadge } from "@/components/StatusBadge";
import { getPrisma } from "@/lib/prisma";
import { getWorkspaceOrganization } from "@/lib/data";
import { getCurrentUserContext } from "@/lib/auth-context";
import { formatEnum } from "@/lib/utils";

export const dynamic = "force-dynamic";

type JobDetail = Prisma.JobGetPayload<{
  include: {
    applications: {
      include: {
            candidate: {
              include: {
                evaluations: true;
                interviewScorecards: true;
          };
        };
      };
    };
    jobRequirements: true;
    evaluationRubric: true;
  };
}>;

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let job: JobDetail | null;

  try {
    const org = await getWorkspaceOrganization();
    job = await getPrisma().job.findFirst({
      where: { id, organizationId: org.id },
      include: {
        applications: {
          include: {
            candidate: {
              include: {
                evaluations: {
                  where: { jobId: id, status: "COMPLETED" },
                  orderBy: { createdAt: "desc" },
                  take: 1,
                },
                interviewScorecards: {
                  where: { jobId: id },
                  orderBy: { createdAt: "desc" },
                  take: 1,
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        jobRequirements: { orderBy: { sortOrder: "asc" } },
        evaluationRubric: true,
      },
    });
  } catch (error) {
    return <DatabaseNotice message={error instanceof Error ? error.message : "Connect PostgreSQL to view this job."} />;
  }

  if (!job) {
    notFound();
  }
  const activeRequirements = job.jobRequirements.filter((requirement) => !requirement.deletedAt);
  const context = await getCurrentUserContext();
  const canManage = context.role !== "INTERVIEWER";
  const canDelete = context.role === "ADMIN";
  const rubric = job.evaluationRubric;
  const rubricTotal = rubric
    ? rubric.requiredSkillsWeight + rubric.preferredWeight + rubric.experienceWeight + rubric.projectWeight + rubric.educationWeight + rubric.domainWeight
    : 100;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/jobs" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
          <ArrowLeft className="h-4 w-4" />
          Back to jobs
        </Link>
        {canDelete ? <DeleteConfirmationButton
          action={deleteJob}
          hiddenFields={{ jobId: job.id }}
          buttonLabel="Delete Job"
          title="Delete job"
          description="Are you sure you want to delete this job? This action cannot be undone."
          confirmLabel="Delete Job"
        /> : null}
      </div>

        <section className="surface rounded-lg p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Job detail</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{job.title}</h1>
              <p className="mt-2 text-sm text-slate-500">{job.department}</p>
            </div>
            <StatusBadge status={job.status} />
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-sm font-medium text-slate-600">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
              <MapPin className="h-4 w-4" />
              {job.location}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5">{formatEnum(job.type)}</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
              <Users className="h-4 w-4" />
              {job.applications.length} applicants
            </span>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <div className="rounded-lg bg-blue-50 p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-blue-950">
                <BriefcaseBusiness className="h-4 w-4" />
                Description
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-blue-900">{job.description}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-4">
              <h2 className="text-sm font-semibold text-emerald-950">Requirement summary</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-emerald-900">{job.requirements}</p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.75fr]">
          <div className="surface rounded-lg p-5">
            <h2 className="text-lg font-semibold text-slate-950">Requirements</h2>
            <div className="mt-4 space-y-3">
              {activeRequirements.map((requirement) => (
                <div key={requirement.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${requirement.type === "REQUIRED" ? "bg-blue-100 text-blue-800" : "bg-violet-100 text-violet-800"}`}>{formatEnum(requirement.type)}</span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">{formatEnum(requirement.category)}</span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">Weight {requirement.weight}</span>
                    {requirement.isCritical ? <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-800"><CircleAlert className="h-3 w-3" />Critical</span> : null}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-950">{requirement.text}</p>
                  {requirement.keywords.length ? <p className="mt-2 text-xs text-slate-500">Keywords: {requirement.keywords.join(", ")}</p> : null}
                </div>
              ))}
            </div>
          </div>

          <div className="surface rounded-lg p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-950">Scoring Rubric</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${rubricTotal === 100 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{rubricTotal}%</span>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p className="flex justify-between"><span>Required Skills</span><strong>{rubric?.requiredSkillsWeight ?? 30}%</strong></p>
              <p className="flex justify-between"><span>Relevant Experience</span><strong>{rubric?.experienceWeight ?? 25}%</strong></p>
              <p className="flex justify-between"><span>Project Alignment</span><strong>{rubric?.projectWeight ?? 15}%</strong></p>
              <p className="flex justify-between"><span>Education</span><strong>{rubric?.educationWeight ?? 10}%</strong></p>
              <p className="flex justify-between"><span>Preferred Qualifications</span><strong>{rubric?.preferredWeight ?? 10}%</strong></p>
              <p className="flex justify-between"><span>Domain Alignment</span><strong>{rubric?.domainWeight ?? 10}%</strong></p>
            </div>
            <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm leading-6 text-blue-900">Requirement weights are normalized inside each category, so the category maximum stays fixed by this rubric.</p>
          </div>
        </section>

        <section className="surface mt-6 rounded-lg p-5">
            <h2 className="text-lg font-semibold text-slate-950">Applicants</h2>
            {job.applications.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {job.applications.map((application) => (
                  <div key={application.id} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3"><Link href={`/candidates/${application.candidate.id}?applicationId=${application.id}`} className="font-semibold text-slate-950 hover:underline">{application.candidate.name}</Link><StatusBadge status={application.status} /></div>
                    <p className="mt-1 text-sm text-slate-500">{application.candidate.email}</p>
                    {application.candidate.evaluations[0] ? (
                      <p className="mt-2 text-sm font-semibold text-blue-700">
                        Latest score {application.candidate.evaluations[0].overallScore ?? "Pending"} - {application.candidate.evaluations[0].recommendation ?? "No recommendation"}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs font-semibold text-slate-500">Interview scorecard: {application.candidate.interviewScorecards[0] ? formatEnum(application.candidate.interviewScorecards[0].status) : "Not started"}</p>
                    {canManage ? <form action={updateApplicationStatus} className="mt-3 flex gap-2"><input type="hidden" name="applicationId" value={application.id} /><select name="status" defaultValue={application.status} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">{["APPLIED", "SCREENED", "INTERVIEW", "OFFER", "REJECTED"].map((status) => <option key={status} value={status}>{formatEnum(status)}</option>)}</select><button className="rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white">Update</button></form> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No candidates are attached to this job yet.</p>
            )}
        </section>

        <section className="mt-6">
          {canManage ? <JobRubricForm mode="edit" action={updateJob} job={job} /> : null}
        </section>
    </>
  );
}
