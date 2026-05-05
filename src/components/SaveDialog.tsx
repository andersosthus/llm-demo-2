import { useEffect, useState, type FormEvent } from "react";

import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface SaveDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: (name: string) => string | null;
}

export function SaveDialog({ open, onCancel, onConfirm }: SaveDialogProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName("");
    setError(null);
  }, [open]);

  if (!open) {
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextError = onConfirm(name);

    setError(nextError);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-sequence-title"
        className="w-full max-w-md rounded-[2rem] border border-amber-400/20 bg-stone-900 p-6 shadow-[0_28px_70px_rgba(0,0,0,0.55)]"
      >
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/80">
              Draft
            </p>
            <h2 id="save-sequence-title" className="mt-2 font-serif text-2xl text-stone-50">
              Save sequence
            </h2>
            <p className="mt-2 text-sm text-stone-300">
              Name this draft to add it to your saved exercise list.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="sequence-name" className="text-sm font-semibold text-stone-100">
              Sequence name
            </label>
            <Input
              id="sequence-name"
              autoFocus
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (error !== null) {
                  setError(null);
                }
              }}
            />
            {error === null ? null : (
              <p role="alert" className="text-sm text-rose-300">
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Save sequence</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
