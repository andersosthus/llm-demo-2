import { useEffect, useState, type FormEvent } from "react";

import type { Sequence } from "../sequenceStore";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface RenameDialogProps {
  open: boolean;
  sequence: Sequence | null;
  onCancel: () => void;
  onConfirm: (name: string) => string | null;
}

export function RenameDialog({ open, sequence, onCancel, onConfirm }: RenameDialogProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || sequence === null) {
      return;
    }

    setName(sequence.name);
    setError(null);
  }, [open, sequence]);

  if (!open || sequence === null) {
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(onConfirm(name));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-sequence-title"
        className="w-full max-w-md rounded-[2rem] border border-amber-400/20 bg-stone-900 p-6 shadow-[0_28px_70px_rgba(0,0,0,0.55)]"
      >
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/80">
              Library
            </p>
            <h2 id="rename-sequence-title" className="mt-2 font-serif text-2xl text-stone-50">
              Rename sequence
            </h2>
            <p className="mt-2 text-sm text-stone-300">
              Update the saved name for {sequence.name}.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="rename-sequence-name" className="text-sm font-semibold text-stone-100">
              Sequence name
            </label>
            <Input
              id="rename-sequence-name"
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
            <Button type="submit">Rename sequence</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
