import { noteAt } from "../fretboardMath";
import type { Step } from "../recordingMachine";

interface SequenceStripProps {
  steps: Step[];
}

function stringLabel(step: Step) {
  return 6 - step.string;
}

export function SequenceStrip({ steps }: SequenceStripProps) {
  return (
    <section
      aria-label="Draft sequence"
      className="rounded-[2rem] border border-amber-400/20 bg-stone-950/60 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
    >
      <ol className="flex flex-wrap gap-3">
        {steps.map((step, index) => {
          const note = noteAt(step.string, step.fret);

          return (
            <li
              key={`${index}-${step.string}-${step.fret}`}
              className="rounded-full border border-amber-300/30 bg-amber-400/10 px-4 py-2 text-sm text-stone-100"
            >
              {index + 1}. {note.name} string {stringLabel(step)}, fret {step.fret}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
