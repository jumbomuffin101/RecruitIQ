"use client";

import { useActionState, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import type { JobActionState } from "@/lib/jobs/schemas";
import { DEFAULT_RUBRIC_WEIGHTS, RUBRIC_TOTAL } from "@/lib/evaluations/constants";

type RequirementRow = {
  id?: string;
  clientId: string;
  text: string;
  type: "REQUIRED" | "PREFERRED";
  category: "SKILL" | "EXPERIENCE" | "EDUCATION" | "PROJECT" | "DOMAIN" | "OTHER";
  weight: number;
  keywordsText: string;
  isCritical: boolean;
};

type RubricState = {
  requiredSkillsWeight: number;
  preferredWeight: number;
  experienceWeight: number;
  projectWeight: number;
  educationWeight: number;
  domainWeight: number;
};

type JobRubricFormProps = {
  mode: "create" | "edit";
  action: (previousState: JobActionState, formData: FormData) => Promise<JobActionState>;
  job?: {
    id: string;
    title: string;
    department: string;
    location: string;
    type: string;
    status: string;
    description: string;
    requirements: string;
    jobRequirements?: {
      id: string;
      text: string;
      type: string;
      category: string;
      weight: number;
      keywords: string[];
      isCritical: boolean;
      sortOrder: number;
      deletedAt?: Date | null;
    }[];
    evaluationRubric?: (RubricState & { version: number }) | null;
  };
};

const fieldClass = "focus-ring w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm";

function newRequirement(): RequirementRow {
  return {
    clientId: crypto.randomUUID(),
    text: "",
    type: "REQUIRED",
    category: "SKILL",
    weight: 10,
    keywordsText: "",
    isCritical: false,
  };
}

function defaultRows(job?: JobRubricFormProps["job"]) {
  const rows = job?.jobRequirements
    ?.filter((requirement) => !requirement.deletedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((requirement) => ({
      id: requirement.id,
      clientId: requirement.id,
      text: requirement.text,
      type: requirement.type as RequirementRow["type"],
      category: requirement.category as RequirementRow["category"],
      weight: requirement.weight,
      keywordsText: requirement.keywords.join(", "),
      isCritical: requirement.isCritical,
    }));

  return rows?.length ? rows : [newRequirement()];
}

function defaultRubric(job?: JobRubricFormProps["job"]): RubricState {
  return {
    requiredSkillsWeight: job?.evaluationRubric?.requiredSkillsWeight ?? DEFAULT_RUBRIC_WEIGHTS.REQUIRED_SKILLS,
    preferredWeight: job?.evaluationRubric?.preferredWeight ?? DEFAULT_RUBRIC_WEIGHTS.PREFERRED_QUALIFICATIONS,
    experienceWeight: job?.evaluationRubric?.experienceWeight ?? DEFAULT_RUBRIC_WEIGHTS.RELEVANT_EXPERIENCE,
    projectWeight: job?.evaluationRubric?.projectWeight ?? DEFAULT_RUBRIC_WEIGHTS.PROJECT_ALIGNMENT,
    educationWeight: job?.evaluationRubric?.educationWeight ?? DEFAULT_RUBRIC_WEIGHTS.EDUCATION,
    domainWeight: job?.evaluationRubric?.domainWeight ?? DEFAULT_RUBRIC_WEIGHTS.DOMAIN_ALIGNMENT,
  };
}

export function JobRubricForm({ mode, action, job }: JobRubricFormProps) {
  const [state, formAction] = useActionState(action, { status: "idle" });
  const [requirements, setRequirements] = useState<RequirementRow[]>(() => defaultRows(job));
  const [rubric, setRubric] = useState<RubricState>(() => defaultRubric(job));
  const total = Object.values(rubric).reduce((sum, value) => sum + Number(value || 0), 0);
  const duplicateRequirement = useMemo(() => {
    const normalized = requirements.map((row) => row.text.toLowerCase().replace(/\s+/g, " ").trim()).filter(Boolean);
    return new Set(normalized).size !== normalized.length;
  }, [requirements]);
  const payloadRequirements = requirements.map((requirement, index) => ({
    id: requirement.id,
    text: requirement.text,
    type: requirement.type,
    category: requirement.category,
    weight: Number(requirement.weight),
    keywords: requirement.keywordsText.split(",").map((keyword) => keyword.trim()).filter(Boolean),
    isCritical: requirement.isCritical,
    sortOrder: index,
  }));
  const example = {
    required: Math.round(rubric.requiredSkillsWeight * 0.86),
    experience: Math.round(rubric.experienceWeight * 0.8),
    project: Math.round(rubric.projectWeight * 0.78),
    education: Math.round(rubric.educationWeight * 0.9),
    preferred: Math.round(rubric.preferredWeight * 0.7),
    domain: Math.round(rubric.domainWeight * 0.65),
  };
  const exampleTotal = example.required + example.experience + example.project + example.education + example.preferred + example.domain;

  function updateRequirement(clientId: string, patch: Partial<RequirementRow>) {
    setRequirements((current) => current.map((row) => row.clientId === clientId ? { ...row, ...patch } : row));
  }

  function moveRequirement(index: number, direction: -1 | 1) {
    setRequirements((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <form action={formAction} className="surface rounded-lg p-5">
      {job ? <input type="hidden" name="jobId" value={job.id} /> : null}
      <input type="hidden" name="structuredRequirements" value={JSON.stringify(payloadRequirements)} />
      <input type="hidden" name="rubric" value={JSON.stringify(rubric)} />
      <input type="hidden" name="requirements" value={requirements.map((requirement) => requirement.text).filter(Boolean).join("\n")} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{mode === "create" ? "Create job" : "Edit job and rubric"}</h2>
          <p className="mt-1 text-sm text-slate-500">Structured requirements are the source of truth for scoring.</p>
        </div>
        <button
          disabled={total !== RUBRIC_TOTAL || duplicateRequirement}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {mode === "create" ? "Create job" : "Save changes"}
        </button>
      </div>

      {state.status === "error" ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {state.message}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <input name="title" required defaultValue={job?.title} placeholder="Title" className={fieldClass} />
        <input name="department" required defaultValue={job?.department} placeholder="Department" className={fieldClass} />
        <input name="location" required defaultValue={job?.location} placeholder="Location" className={fieldClass} />
        <div className="grid gap-4 sm:grid-cols-2">
          <select name="type" defaultValue={job?.type ?? "FULL_TIME"} className={fieldClass}>
            <option value="FULL_TIME">Full time</option>
            <option value="PART_TIME">Part time</option>
            <option value="CONTRACT">Contract</option>
            <option value="INTERNSHIP">Internship</option>
          </select>
          <select name="status" defaultValue={job?.status ?? "OPEN"} className={fieldClass}>
            <option value="OPEN">Open</option>
            <option value="DRAFT">Draft</option>
            <option value="PAUSED">Paused</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        <textarea name="description" required defaultValue={job?.description} placeholder="Description" rows={4} className={`${fieldClass} md:col-span-2`} />
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold text-slate-950">Requirements</h3>
          <button type="button" onClick={() => setRequirements((current) => [...current, newRequirement()])} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Plus className="h-4 w-4" />
            Add requirement
          </button>
        </div>
        {duplicateRequirement ? <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">Duplicate requirements must be removed before saving.</p> : null}
        <div className="space-y-3">
          {requirements.map((requirement, index) => (
            <div key={requirement.clientId} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_0.45fr_0.5fr_0.28fr]">
                <input value={requirement.text} onChange={(event) => updateRequirement(requirement.clientId, { text: event.target.value })} required placeholder="Requirement text" className={fieldClass} />
                <select value={requirement.type} onChange={(event) => updateRequirement(requirement.clientId, { type: event.target.value as RequirementRow["type"] })} className={fieldClass}>
                  <option value="REQUIRED">Required</option>
                  <option value="PREFERRED">Preferred</option>
                </select>
                <select value={requirement.category} onChange={(event) => updateRequirement(requirement.clientId, { category: event.target.value as RequirementRow["category"] })} className={fieldClass}>
                  <option value="SKILL">Skill</option>
                  <option value="EXPERIENCE">Experience</option>
                  <option value="EDUCATION">Education</option>
                  <option value="PROJECT">Project</option>
                  <option value="DOMAIN">Domain</option>
                  <option value="OTHER">Other</option>
                </select>
                <input type="number" min="1" max="50" value={requirement.weight} onChange={(event) => updateRequirement(requirement.clientId, { weight: Number(event.target.value) })} className={fieldClass} />
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
                <input value={requirement.keywordsText} onChange={(event) => updateRequirement(requirement.clientId, { keywordsText: event.target.value })} placeholder="Keywords, comma separated" className={fieldClass} />
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input type="checkbox" checked={requirement.isCritical} onChange={(event) => updateRequirement(requirement.clientId, { isCritical: event.target.checked })} />
                  Critical
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => moveRequirement(index, -1)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" onClick={() => moveRequirement(index, 1)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600"><ArrowDown className="h-4 w-4" /></button>
                </div>
                <button type="button" onClick={() => setRequirements((current) => current.filter((row) => row.clientId !== requirement.clientId))} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-950">Scoring Rubric</h3>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${total === RUBRIC_TOTAL ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>Total {total}%</span>
          </div>
          {([
            ["requiredSkillsWeight", "Required Skills"],
            ["experienceWeight", "Relevant Experience"],
            ["projectWeight", "Project Alignment"],
            ["educationWeight", "Education"],
            ["preferredWeight", "Preferred Qualifications"],
            ["domainWeight", "Domain Alignment"],
          ] as const).map(([key, label]) => (
            <label key={key} className="mb-3 grid grid-cols-[1fr_5rem] items-center gap-3 text-sm font-semibold text-slate-700">
              {label}
              <input type="number" min="0" max="100" value={rubric[key]} onChange={(event) => setRubric((current) => ({ ...current, [key]: Number(event.target.value) }))} className={fieldClass} />
            </label>
          ))}
          {total !== RUBRIC_TOTAL ? <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">Rubric weights must total 100% before saving.</p> : null}
        </div>

        <div className="rounded-lg bg-blue-50 p-4">
          <h3 className="font-semibold text-blue-950">Example score composition</h3>
          <div className="mt-4 space-y-3 text-sm text-blue-900">
            <p className="flex justify-between"><span>Required Skills</span><strong>{example.required} / {rubric.requiredSkillsWeight}</strong></p>
            <p className="flex justify-between"><span>Experience</span><strong>{example.experience} / {rubric.experienceWeight}</strong></p>
            <p className="flex justify-between"><span>Projects</span><strong>{example.project} / {rubric.projectWeight}</strong></p>
            <p className="flex justify-between"><span>Education</span><strong>{example.education} / {rubric.educationWeight}</strong></p>
            <p className="flex justify-between"><span>Preferred</span><strong>{example.preferred} / {rubric.preferredWeight}</strong></p>
            <p className="flex justify-between"><span>Domain</span><strong>{example.domain} / {rubric.domainWeight}</strong></p>
            <p className="flex justify-between border-t border-blue-200 pt-3 font-semibold"><span>Total</span><strong>{exampleTotal} / 100</strong></p>
          </div>
        </div>
      </div>
    </form>
  );
}
