"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Trash2, X } from "lucide-react";

type DeleteConfirmationButtonProps = {
  action: (formData: FormData) => void | Promise<void>;
  hiddenFields: Record<string, string>;
  buttonLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
};

function ConfirmSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-70"
    >
      <Trash2 className="h-4 w-4" />
      {pending ? "Deleting" : label}
    </button>
  );
}

export function DeleteConfirmationButton({
  action,
  hiddenFields,
  buttonLabel,
  title,
  description,
  confirmLabel,
}: DeleteConfirmationButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
      >
        <Trash2 className="h-4 w-4" />
        {buttonLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title" className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="delete-dialog-title" className="text-lg font-semibold text-slate-950">
                  {title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close confirmation dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <form action={action}>
                {Object.entries(hiddenFields).map(([name, value]) => (
                  <input key={name} type="hidden" name={name} value={value} />
                ))}
                <ConfirmSubmitButton label={confirmLabel} />
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
