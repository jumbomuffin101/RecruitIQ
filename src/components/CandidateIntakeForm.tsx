"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeft, CheckCircle2, FileSearch, LoaderCircle, Save, Sparkles } from "lucide-react";
import { createCandidate, parseResumeAction } from "@/app/actions";
import { CandidateAvatar } from "@/components/CandidateAvatar";
import { ResumeUploadField } from "@/components/ResumeUploadField";
import type { ResumeExtraction } from "@/lib/resume-extract";

const emptyExtraction: ResumeExtraction = {
  name: "", email: "", phone: "", location: "", linkedinUrl: "", githubUrl: "", educationSummary: "",
  currentTitle: "", currentCompany: "", skills: [], experienceSummary: "", projectsSummary: "", resumeSummary: "",
  yearsExperience: null,
};

const fieldClass = "focus-ring w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm";

function SaveCandidateButton() {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending}
      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {pending ? "Saving candidate" : "Save Candidate"}
    </button>
  );
}

export function CandidateIntakeForm({ jobs }: { jobs: Array<{ id: string; title: string; department: string }> }) {
  const [step, setStep] = useState<"resume" | "review">("resume");
  const [resumeText, setResumeText] = useState("");
  const [details, setDetails] = useState<ResumeExtraction>(emptyExtraction);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState("");
  const [formState, formAction] = useActionState(createCandidate, null);

  async function extractDetails() {
    if (!resumeText.trim()) {
      setError("Upload a resume or paste resume text before extracting details.");
      return;
    }
    setError("");
    setIsExtracting(true);
    const formData = new FormData();
    formData.set("resumeText", resumeText);
    const result = await parseResumeAction(formData);
    setIsExtracting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setDetails(result.data);
    setStep("review");
  }

  function update<K extends keyof ResumeExtraction>(key: K, value: ResumeExtraction[K]) {
    setDetails((current) => ({ ...current, [key]: value }));
  }

  if (step === "resume") {
    return (
      <section className="surface rounded-lg p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><FileSearch className="h-5 w-5" /></span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Step 1 of 2</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">Resume intake</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Upload or paste a resume. RecruitIQ extracts structured details before anything is saved.</p>
          </div>
        </div>
        <div className="mt-5"><ResumeUploadField value={resumeText} onTextChange={setResumeText} /></div>
        {error ? <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p> : null}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => void extractDetails()} disabled={isExtracting} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-950 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-70">
            {isExtracting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isExtracting ? "Extracting candidate details" : "Extract Candidate Details"}
          </button>
          <button type="button" onClick={() => { setDetails(emptyExtraction); setStep("review"); }} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Enter details manually</button>
        </div>
      </section>
    );
  }

  return (
    <form action={formAction} className="surface rounded-lg p-5">
      <input type="hidden" name="resumeText" value={resumeText} />
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <CandidateAvatar name={details.name || "New Candidate"} size="lg" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Step 2 of 2</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">Review candidate details</h2>
            <p className="mt-1 text-sm text-slate-500">Everything below is editable before saving.</p>
          </div>
        </div>
        <button type="button" onClick={() => setStep("resume")} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"><ArrowLeft className="h-4 w-4" />Back to resume</button>
      </div>

      {details.name || details.email || details.resumeSummary ? (
        <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-950"><CheckCircle2 className="h-4 w-4" />Structured profile extracted</p>
          <p className="mt-2 text-sm font-medium text-emerald-950">{details.name || "Candidate"}{details.currentTitle ? ` - ${details.currentTitle}` : ""}</p>
          <p className="mt-1 text-xs text-emerald-800">{[details.email, details.phone, details.location].filter(Boolean).join(" | ")}</p>
          {details.resumeSummary ? <p className="mt-3 text-sm leading-6 text-emerald-900">{details.resumeSummary}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">{details.skills.slice(0, 8).map((skill) => <span key={skill} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800">{skill}</span>)}</div>
        </div>
      ) : null}

      {formState?.error ? (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          {formState.error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">Name<input name="name" required value={details.name} onChange={(event) => update("name", event.target.value)} className={`${fieldClass} mt-2`} /></label>
        <label className="text-sm font-semibold text-slate-700">Email<input name="email" type="email" required value={details.email} onChange={(event) => update("email", event.target.value)} className={`${fieldClass} mt-2`} /></label>
        <label className="text-sm font-semibold text-slate-700">Phone<input name="phone" value={details.phone} onChange={(event) => update("phone", event.target.value)} className={`${fieldClass} mt-2`} /></label>
        <label className="text-sm font-semibold text-slate-700">Location<input name="location" value={details.location} onChange={(event) => update("location", event.target.value)} className={`${fieldClass} mt-2`} /></label>
        <label className="text-sm font-semibold text-slate-700">LinkedIn URL<input name="linkedinUrl" type="url" value={details.linkedinUrl} onChange={(event) => update("linkedinUrl", event.target.value)} className={`${fieldClass} mt-2`} /></label>
        <label className="text-sm font-semibold text-slate-700">GitHub URL<input name="githubUrl" type="url" value={details.githubUrl} onChange={(event) => update("githubUrl", event.target.value)} className={`${fieldClass} mt-2`} /></label>
        <label className="text-sm font-semibold text-slate-700">Most recent title<input name="currentTitle" value={details.currentTitle} onChange={(event) => update("currentTitle", event.target.value)} className={`${fieldClass} mt-2`} /></label>
        <label className="text-sm font-semibold text-slate-700">Most recent company<input name="currentCompany" value={details.currentCompany} onChange={(event) => update("currentCompany", event.target.value)} className={`${fieldClass} mt-2`} /></label>
        <label className="text-sm font-semibold text-slate-700">Years of experience<input name="yearsExperience" type="number" min="0" max="40" step="0.5" value={details.yearsExperience ?? ""} onChange={(event) => update("yearsExperience", event.target.value ? Number(event.target.value) : null)} className={`${fieldClass} mt-2`} /></label>
        <label className="text-sm font-semibold text-slate-700">Apply to job<select name="jobId" required defaultValue="" className={`${fieldClass} mt-2`}><option value="" disabled>Select a job</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.title} - {job.department}</option>)}</select></label>
      </div>

      <div className="mt-4 grid gap-4">
        <label className="text-sm font-semibold text-slate-700">Skills<input name="skills" required value={details.skills.join(", ")} onChange={(event) => update("skills", event.target.value.split(",").map((skill) => skill.trim()).filter(Boolean))} className={`${fieldClass} mt-2`} /></label>
        <label className="text-sm font-semibold text-slate-700">Concise resume summary<textarea name="resumeSummary" required rows={4} value={details.resumeSummary} onChange={(event) => update("resumeSummary", event.target.value)} className={`${fieldClass} mt-2 leading-6`} /></label>
        <label className="text-sm font-semibold text-slate-700">Experience summary<textarea name="experienceSummary" required rows={4} value={details.experienceSummary} onChange={(event) => update("experienceSummary", event.target.value)} className={`${fieldClass} mt-2 leading-6`} /></label>
        <label className="text-sm font-semibold text-slate-700">Education summary<textarea name="educationSummary" rows={3} value={details.educationSummary} onChange={(event) => update("educationSummary", event.target.value)} className={`${fieldClass} mt-2 leading-6`} /></label>
        <label className="text-sm font-semibold text-slate-700">Project highlights<textarea name="projectsSummary" rows={3} value={details.projectsSummary} onChange={(event) => update("projectsSummary", event.target.value)} className={`${fieldClass} mt-2 leading-6`} /></label>
        <label className="text-sm font-semibold text-slate-700">Recruiter notes<textarea name="notes" rows={2} className={`${fieldClass} mt-2`} /></label>
      </div>
      <SaveCandidateButton />
    </form>
  );
}
