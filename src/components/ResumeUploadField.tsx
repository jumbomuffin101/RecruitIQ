"use client";

import { useCallback, useRef, useState } from "react";
import { FileCheck2, FileText, LoaderCircle, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

export function ResumeUploadField() {
  const [fileName, setFileName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [error, setError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback(async (file: File) => {
    setError("");
    setFileName(file.name);
    setIsParsing(true);

    const fileNameLower = file.name.toLowerCase();
    if (!fileNameLower.endsWith(".txt") && !fileNameLower.endsWith(".pdf")) {
      setError("Choose a PDF or TXT resume, or paste the resume text manually below.");
      setIsParsing(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.set("resume", file);
      const response = await fetch("/api/resume/parse", { method: "POST", body: formData });
      const result = await response.json() as { text?: string; error?: string };

      if (!response.ok || !result.text) {
        setError(result.error || "We could not read this resume. Please paste the text manually.");
        return;
      }

      setResumeText(result.text);
    } catch {
      setError("We could not read this resume. Please paste the text manually below.");
    } finally {
      setIsParsing(false);
    }
  }, []);

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          if (file) {
            void parseFile(file);
          }
        }}
        className={cn(
          "focus-ring rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center transition hover:border-blue-300 hover:bg-blue-50/40",
          error ? "border-amber-300 bg-amber-50/60" : "",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void parseFile(file);
            }
          }}
        />
        {isParsing ? (
          <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-blue-700" />
        ) : (
          <UploadCloud className="mx-auto h-7 w-7 text-slate-500" />
        )}
        <p className="mt-3 text-sm font-semibold text-slate-950">
          {isParsing ? "Extracting resume text" : "Upload a resume"}
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Drag and drop a PDF or TXT file up to 4 MB. Files are processed privately and are not retained.
        </p>
      </div>

      {fileName ? (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          {resumeText && !error ? <FileCheck2 className="h-4 w-4 text-emerald-700" /> : <FileText className="h-4 w-4 text-blue-700" />}
          <span className="font-medium">{fileName}</span>
          {resumeText && !error ? <span className="ml-auto text-xs font-semibold text-emerald-700">Text extracted</span> : null}
        </div>
      ) : null}

      {error ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p> : null}

      <textarea
        name="resumeText"
        required
        value={resumeText}
        onChange={(event) => setResumeText(event.target.value)}
        placeholder="Extracted resume preview. You can edit this text or paste it manually."
        rows={7}
        className="focus-ring w-full rounded-lg border border-slate-200 px-3 py-2 text-sm leading-6"
      />
    </div>
  );
}
