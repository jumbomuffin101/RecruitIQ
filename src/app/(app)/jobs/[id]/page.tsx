import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { ArrowLeft, BriefcaseBusiness, MapPin, Users } from "lucide-react";
import { deleteJob } from "@/app/actions";
import { DatabaseNotice } from "@/components/DatabaseNotice";
import { DeleteConfirmationButton } from "@/components/DeleteConfirmationButton";
import { StatusBadge } from "@/components/StatusBadge";
import { getPrisma } from "@/lib/prisma";
import { getWorkspaceOrganization } from "@/lib/data";
import { formatEnum } from "@/lib/utils";

export const dynamic = "force-dynamic";

type JobDetail = Prisma.JobGetPayload<{
  include: {
    applications: {
      include: { candidate: true };
    };
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
          include: { candidate: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  } catch (error) {
    return <DatabaseNotice message={error instanceof Error ? error.message : "Connect PostgreSQL to view this job."} />;
  }

  if (!job) {
    notFound();
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/jobs" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
          <ArrowLeft className="h-4 w-4" />
          Back to jobs
        </Link>
        <DeleteConfirmationButton
          action={deleteJob}
          hiddenFields={{ jobId: job.id }}
          buttonLabel="Delete Job"
          title="Delete job"
          description="Are you sure you want to delete this job? This action cannot be undone."
          confirmLabel="Delete Job"
        />
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
              <h2 className="text-sm font-semibold text-emerald-950">Requirements</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-emerald-900">{job.requirements}</p>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-slate-950">Applicants</h2>
            {job.applications.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {job.applications.map((application) => (
                  <Link
                    key={application.id}
                    href={`/candidates/${application.candidate.id}`}
                    className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <p className="font-semibold text-slate-950">{application.candidate.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{application.candidate.email}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No candidates are attached to this job yet.</p>
            )}
          </div>
        </section>
    </>
  );
}
