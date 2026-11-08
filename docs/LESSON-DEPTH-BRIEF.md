# Brief — "In depth" for every mini-lesson (SPEC-0.48 §L)

Owner (2026-11-08): the lessons were written short when the app was a kids' game. Every topic must now get a
**comprehensive and clear** treatment, but **not long or heavy**.

## The format
`src/content/miniTypes.ts` — every `MiniLesson` gets a new optional field `more: MiniStep[]` ("In depth").
- `steps` (the core) stays the short spoken intro played before an exercise. Keep it 5–10 steps, 100–240 English words,
  ≥ 3 examples (tests/minilessons.test.ts). You may lightly edit core wording to sound adult and professional (drop
  childish cheers like "You got this!", "Hey {name}!" may stay once), but do not lengthen it.
- `more` is the full topic, offered after the core and in Practice → Lessons. Contract (tested):
  5–12 steps, 150–420 English words in total, ≤ 60 English words per step, ≥ 2 steps with a `play` example,
  every example renders (same Stimulus kinds as the core: note, notes, chord, melody, cadence, phrase, jazz, rhythm,
  events, rest, fx …), `show.notes` within MIDI 28–96, Hebrew text on every step.

## What "In depth" covers (adapt to the topic; skip what does not apply)
1. **What it is, precisely** — the real definition and the theory behind it (names, numbers, spelling, why it works).
2. **How it sounds** — contrasting examples (this vs. the thing it is confused with).
3. **How to hear / recognise it** — a concrete listening strategy.
4. **How to do it** — sing / play / write it; a practice tip.
5. **The common mistake** — what people confuse and how to avoid it.
6. **In real music** — where it shows up (styles, typical uses). Name songs/composers only when the fact is certain;
   never quote lyrics.
7. **Recap** — one or two sentences to keep.

## Voice
- Adult, warm, clear, professional — a good teacher, not a game show. Second person ("you"; Hebrew plural אתם).
- One idea per step, short sentences, an example after the idea.
- **Exact facts.** Every note in an example must match what the sentence says (spelling, interval, chord, degree).
  Re-check each example's MIDI numbers.
- Hebrew: the terms Israeli musicians actually use — מז׳ור, מינור, קווינטה, ספטימה (not ספטים), טנשנים, אקורדי סלאש,
  דרון, אצ׳קטורה, סקסופון. Ordinals as degree numbers (5, not החמישית). 9 / 11 / 13 as numbers (not נונה).
  English for Shell, Upper structure, Backdoor, Drop 2. Natural Hebrew, not a translation.
- Look at `src/content/mini/example.ts` and the file's own lessons for the stimulus helpers and conventions; reuse
  the file's helpers.

## Rules
- Edit only the files assigned to you. No git commands. Do not run e2e tests or a dev server.
- Run `npx vitest run tests/minilessons.test.ts` and `npx tsc --noEmit -p .` until both are clean for your lessons.
- Finish by reporting: lessons done, anything you were unsure of musically, anything you corrected in the core.
