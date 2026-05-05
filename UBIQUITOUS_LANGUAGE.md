# Ubiquitous Language

## Fretboard & music theory

| Term | Definition | Aliases to avoid |
|------|------------|------------------|
| **Fretboard** | The 6-string × 24-fret grid in standard tuning that fills the page. | Neck, board |
| **String** | One of six horizontal lines on the **Fretboard**, indexed 0 (low E) through 5 (high E). | Course |
| **Fret** | One of 25 vertical slots on a **String**, indexed 0 (open string) through 24. | — |
| **Tuning** | The mapping from **String** index to its open-string pitch. Always EADGBE in v1. | — |
| **Position** | A `(string, fret)` pair — an addressable cell on the **Fretboard**. | Cell, slot |
| **Note** | The letter (A B C D E F G or a sharp/flat) at a **Position** in a given **Tuning**. | Pitch, tone |
| **Natural** | A **Note** that is one of A, B, C, D, E, F, G — the only **Notes** labeled and clickable. | Diatonic note, white-key note |
| **Fret marker** | A dot rendered between strings at frets 3, 5, 7, 9, 15, 17, 19, 21 (single) and 12, 24 (double). | Inlay |
| **Preview** | Playing the **Note** at a **Position** once with no other state change, in response to an idle click. | Probe, audition |

## Sequence model

| Term | Definition | Aliases to avoid |
|------|------------|------------------|
| **Sequence** | A named, ordered list of **Steps** with its own BPM, persisted to localStorage. | **Exercise**, recording, song, pattern |
| **Step** | A single **Position** at one slot in a **Sequence**'s order. | Note (when used in sequence context), entry |
| **Draft** | An in-memory **Sequence** under construction that has not been saved. | Buffer, working copy |
| **BPM** | The tempo at which a **Sequence** plays back, stored per-**Sequence** and editable during playback. | Tempo |
| **Selection** | The at-most-one **Sequence** currently chosen from the saved list, whose static shape is rendered on the **Fretboard**. | Active sequence, current sequence |

## App modes

| Term | Definition | Aliases to avoid |
|------|------------|------------------|
| **Idle** | The app state when no **Sequence** is being recorded and none is being played. | Resting, ready |
| **Recording** | The app state in which clicks on **Naturals** append **Steps** to a **Draft**. Subdivides into the live and draft sub-states. | Capture mode |
| **Playback** | The app state in which a **Sequence** (saved or **Draft**) is being played by the audio engine, with the **Current Step** highlighted on the **Fretboard**. | Playing |
| **Current Step** | The **Step** whose **Position** is highlighted by the playback overlay at any given moment during **Playback**. | Cursor, playhead |
| **Count-in** | A 4-beat metronome preamble at the active BPM that runs before **Playback** of step 0. Global preference. | Lead-in, intro click |
| **Loop** | A mode that re-triggers a **Sequence** from step 0 with a one-beat gap after the last **Step**, until **Playback** is stopped. Global preference. | Repeat, cycle |

## UI elements

| Term | Definition | Aliases to avoid |
|------|------------|------------------|
| **Mode bar** | The bar above the **Fretboard** whose contents change based on app mode (Record / Stop / Clear / Save / Play / BPM / Count-in / Loop). | Toolbar, header |
| **Numbered badge** | A small numbered marker rendered on a **Position** indicating that **Position**'s order in the current **Draft** or **Selection**. | Pin, dot |
| **Sequence strip** | The horizontal list below the **Fretboard** that renders the **Steps** of the current **Draft** or **Selection** in order. | Timeline, ribbon |
| **Saved list** | The list of all persisted **Sequences**, sorted by creation date descending. | Library, exercises panel |
| **Empty state** | The helper card shown in place of the **Saved list** when no **Sequences** exist. | Placeholder |

## Relationships

- A **Sequence** owns one or more **Steps** in order. A **Sequence** with zero **Steps** cannot exist (saving an empty **Draft** is rejected silently).
- A **Step** references exactly one **Position**. The same **Position** may appear as multiple **Steps** in a **Sequence** (repeats are intentional).
- A **Position** maps to exactly one **Note** under a given **Tuning**. Only **Positions** whose **Note** is a **Natural** are recordable.
- A **Sequence** has exactly one **BPM**, which is updated on every slider change during **Playback** and persisted.
- A **Sequence** has a **Name** that is unique among all saved **Sequences**.
- The **Selection** is at most one **Sequence**; entering **Recording** clears it.
- **Recording** and **Playback** are mutually exclusive — at most one is active at any time.
- A **Draft** can also be played, but its BPM is transient (defaults to 80, not persisted) since it has not yet become a saved **Sequence**.
- **Count-in** and **Loop** are global preferences that apply to **Playback** of any **Sequence** or **Draft**, not per-**Sequence** state.

## Example dialogue

> **Dev:** "When the user clicks a **Position** on the **Fretboard**, what happens?"

> **Domain expert:** "It depends on the app mode. In **Idle** or with a **Selection** active, a click on a **Natural** triggers a **Preview** — one note plays, no state changes. In **Recording**, the same click both **Previews** the **Note** and appends a **Step** to the **Draft**."

> **Dev:** "So a **Step** is just the **Position** I clicked, in order?"

> **Domain expert:** "Right. A **Step** carries a **Position**; the **Position** carries the **Note** under the current **Tuning**. The **Sequence** keeps **Steps** in click-order, and clicking the same **Position** twice produces two **Steps** — repeats are part of the exercise, not a duplicate."

> **Dev:** "And the **Numbered badges** I see on the **Fretboard** during **Recording** — those are the **Steps**?"

> **Domain expert:** "Yes. Each **Step** renders as a **Numbered badge** at its **Position**. If the same **Position** appears in three **Steps**, you'll see three badges stacked there. The **Sequence strip** below the **Fretboard** shows the same information laid out linearly."

> **Dev:** "Once I save the **Draft** as a **Sequence** and select it later, does the **BPM** I set during **Playback** stick?"

> **Domain expert:** "It does. **BPM** is stored on the **Sequence**, so when you re-**Select** it the slider snaps back to wherever you left it. **Count-in** and **Loop** don't — those are global preferences across all **Playback**."

## Flagged ambiguities

- **"Exercise" vs "Sequence"** — the user's original brief called these "exercises"; the PRD and code use **Sequence**. Resolved: **Sequence** is canonical (it accurately describes the data shape — an ordered list of **Steps** — without implying pedagogical intent). "Exercise" survives only as informal shorthand in user-story text and the empty-state copy.
- **"Note" overloaded** — "note" can mean (a) the abstract music-theory letter at a **Position**, or (b) a recorded item in a **Sequence**. Resolved: use **Note** strictly for the music-theory letter, and **Step** for the recorded item. A **Step** *carries* a **Position** which *resolves to* a **Note**.
- **"Position" vs "Step"** — a **Position** is the abstract `(string, fret)` address on the **Fretboard**. A **Step** is the use of a **Position** at one slot in a **Sequence**. Two **Steps** can share a **Position**; a **Position** itself is not ordered.
- **"Recording" as state vs verb** — "recording" the app state (`recording.live`, `recording.draft`) is distinct from "to record" the act of clicking notes during that state. When the state is meant, prefer **Recording** (capitalised, noun); the verb "record" describes only the user action.
- **"Playing" / "Playback"** — prefer **Playback** for the app state to avoid collision with the act of "playing a note" (which **Preview** covers when there is no **Sequence** involved).
