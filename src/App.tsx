import { Fretboard } from "./components/Fretboard";
import { Button } from "./components/ui/button";

export function App() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1c1917,_#0c0a09_55%)] px-6 py-8 text-stone-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-amber-400/20 bg-stone-950/60 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/80">
                Mode
              </p>
              <h1 className="font-serif text-2xl text-stone-50">Static Fretboard</h1>
            </div>
            <Button type="button" disabled>
              Recording Placeholder
            </Button>
          </div>
        </section>

        <section className="rounded-[2rem] border border-stone-700/60 bg-stone-900/85 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
          <Fretboard />
        </section>
      </div>
    </main>
  );
}
