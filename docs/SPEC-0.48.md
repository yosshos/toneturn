# SPEC 0.48 – 0.50 — Fill the content gaps (owner 2026-11-08)

Owner's order: **content gaps (every domain, every level) → paid content & payments control → last polish → marketing.**
This spec covers the first part. Audit basis: `docs/CURRICULUM_GAPS.md` (2026-11-07) re-checked against the code on 2026-11-08
(110 topics, 24 skills; vocal ladders incl. 11 vibrato kinds, long holds, messa di voce; 17 songs; 3 backing charts).

Every new item obeys the standing rules: fits one phone screen, brief page before it, short path name, feeds path / map / XP /
leagues / level test / workout, no memorisable items (random key / tempo / seed), Hebrew musicians' terms.

## D — Depth: no topic with fewer than 3 levels (0.48)

| Topic | Today | Add |
|---|---|---|
| `form` | 2 | 3 AABA / 32-bar, 4 verse–chorus–bridge with a pre-chorus, 5 rondo vs ternary |
| `ornaments` | 2 | 3 trill vs mordent vs turn in a phrase, 4 count the ornaments in a line |
| `width-ear` | 2 | 3 three widths (mono / medium / wide), 4 which instrument is wider |
| `chromatic-added` | 2 | 3 the added note in any key, 4 bebop scales descending at tempo |
| `bh-tone`, `bh-keys`, `bh-brothers`, `bh-convert-2`, `bh-pivot` | 2 | one or two harder levels each: minor-6 side, all 12 keys, faster, longer lines |

## V — Voice (0.48)

- **V1 Recordings & then-vs-now.** Optional "keep my take" on vocal exercises; the last takes per exercise live on the device
  (IndexedDB, small Opus/WebM). A *Then & now* card plays the first kept take next to the latest one.
- **V2 My warm-up.** A 5-minute routine built from the saved range: hum glide, lip-trill sirens, 5-note scales rising by half
  steps, an arpeggio, a long hold. Uses the existing vocal kinds; counts as a workout block.
- **V3 Register bridge.** Slide across the break (passaggio): the grader finds pitch jumps / drop-outs on the glide; levels
  widen the slide and slow it down.
- **V4 Lessons.** Mini-lessons: breath support, healthy voice (warm-up, hydration, when to stop), registers.

## I — Instruments (0.49)

- **I1 Chord check (guitar & piano by mic).** Strum / play a chord, chroma template match says which notes rang and which were
  missing or muted. Topic `play-chord` (open majors → minors → 7ths → power & barre → sus/add9) and **Minute changes**:
  switch between two chords for 60 s, count clean changes.
- **I2 Strumming.** Patterns per style (down beats → 8ths → folk D DU UDU → reggae / funk 16ths), graded by mic onset timing on
  the pattern grid; levels raise the tempo.
- **I3 Songbook 17 → 40+.** More public-domain tunes; every song in three arrangements generated from melody + chords:
  *melody*, *melody + chords* (roots / shell), *two hands* (bass pattern by style).

## P — For experienced players (0.50)

- **P1 Practice log.** Log practice done outside the app (minutes, what, a note); counts toward streak and the daily goal,
  shows in Activity.
- **P2 My charts.** Type a chord chart (bars of chord symbols, form, key, style, tempo) → backing track (existing
  `backingTrack` generalised from 3 fixed charts to any chart) + practice loop; a few public progression templates
  (blues variants, rhythm changes A, ii-V-I in all keys, I-vi-ii-V, minor blues, bossa).
- **P3 Slow-down & loop.** Open your own audio file (stays on the device): speed 50–100 % without pitch change, A–B loop,
  pitch shift ±12; for transcribing.
- **C1 Write 8 bars.** Compose a melody over a progression on the staff/keys; checks (chord tones on strong beats, stepwise
  motion, ending on 1), play it back with the backing.

## Not in this round

Technique videos / avatar demonstrations (need assets), native wrappers, payments (next part).

## L — Lessons & written content, full but light (owner 2026-11-08)

The 134 mini-lessons were written short for the first, kid-game version of the app. Pass over every one: each topic gets a
complete, clear explanation (what it is, how it sounds, how to hear / play it, a common mistake, where it shows up in real
music) with examples — but stays light: short steps, one idea per step, skippable, no wall of text. Topics whose lesson is
only a definition get the most work. Glossary entries get one-line examples.

## G — Growth (owner 2026-11-08, "how to become a leading app" 2–4)

- **G1 Markets we can win.**
  - *Israel:* a **Bagrut & conservatory prep** track (music Bagrut ear / theory parts, conservatory entrance tests): a goal in
    the path ("Bagrut prep"), mock exams in the exam format, Hebrew terms as used in schools.
  - *Middle-Eastern music:* maqam and iqa'at as a complete track (more maqamat, quarter-tone hearing, sayr, modulation,
    tapping iqa'at) — the goal "Middle-Eastern music".
  - *Jazz:* the Barry Harris track complete (done in §D), a goal "Jazz".
- **G2 Teachers.** Classes grow into a teacher tool: assign homework (a topic + level + due date), see each student's
  progress, rank and weak spots, a weekly class report, invite by link / QR.
- **G3 Sharing loops.** A shareable daily-challenge result card (Wordle-style, no spoilers), duel invitations by link
  (open the link → play the same seed → result back to both), joint streaks with a friend (both practise → the streak grows).

## Status (0.48.0, 2026-11-08)

Built: §D (no topic below 3 levels), §L (all 134 lessons have *In depth*, 37.7k words; glossary 30 → 137 terms with
examples), §I1 chord ring-check (chroma, `src/engine/chroma.ts`), §P1 practice log, §P2 My charts (14 templates, 6 styles),
§P3 Slow down & loop, and the piece coach v1 (SPEC-PIECE phases A + a first B).

Already existed before this round (found in the audit): take recordings + then-and-now, vocal warm-up room, vibrato
ladder, strumming / one-minute changes (g-rhythm, g-chords).

Left: V3 register-bridge track; C1 write 8 bars; I3 songbook (in progress); G1 Bagrut / conservatory mock exams (needs the
real exam format first), G2 teacher assignments + dashboards, G3 sharing loops; SPEC-PIECE phases B (real score view),
C (teacher), D (audio, PDF).
