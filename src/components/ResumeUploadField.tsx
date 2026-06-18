"use client";

import { useCallback, useRef, useState } from "react";
import { FileText, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

export function ResumeUploadField() {
  const [fileName, setFileName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback(async (file: File) => {
    setError("");
    setFileName(file.name);

    if (!file.name.toLowerCase().endsWith(".txt") && file.type !== "text/plain") {
      setError("For this MVP, upload a .txt resume or paste resume text manually below.");
      return;
    }

    const text = (await file.text()).trim();
    setResumeText(text);
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
          accept=".txt,text/plain"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void parseFile(file);
            }
          }}
        />
        <UploadCloud className="mx-auto h-7 w-7 text-slate-500" />
        <p className="mt-3 text-sm font-semibold text-slate-950">Upload resume text</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">Drag and drop a .txt file, or click to browse. PDF support is intentionally manual for this stable demo.</p>
      </div>

      {fileName ? (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <FileText className="h-4 w-4 text-blue-700" />
          <span className="font-medium">{fileName}</span>
        </div>
      ) : null}

      {error ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p> : null}

      <textarea
        name="resumeText"
        required
        value={resumeText}
        onChange={(event) => setResumeText(event.target.value)}
        placeholder="Parsed resume preview and manual fallback"
        rows={7}
        className="focus-ring w-full rounded-lg border border-slate-200 px-3 py-2 text-sm leading-6"
      />
    </div>
  );
}
