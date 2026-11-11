# Licks & vocabulary trainer · Transcription coach

*Built 2026-11-11 on 0.70.1. Items #1 and #2 of `docs/research/TECH_AND_FEATURE_IDEAS.md` (owner approved).*
*Together they close the jazz loop the research describes: **hear → own → use → keep**. Only measured practice counts.*

## 0. Material (legal)

- **Licks** are our own, written for the app in the tradition: chord tones on the beats, chromatic approach notes,
  enclosures, the bebop scale's passing half step, Barry Harris's "arpeggio up, scale down". None is copied from a book,
  course or recording. `lickProblems()` checks every lick against its chords (tests).
- **Transcription phrases** are generated from rules (levels 1–3, 5), the first bars of the public-domain songbook
  (level 4), or the app's own licks (levels 5–8). No recording or published transcription is used.
- The player's own phrases (from the coach) become *own licks*, stored in their settings.

## 1. Engines (pure, tested)

| File | What |
|---|---|
| `src/engine/licks.ts` | Library (`LICKS`, 27 licks, 8 contexts × levels 1–4), the line language, validity, register per instrument, neck placement, `lickDrill()` (a `Drill` per key and instrument), the 4-rung tempo ladder, the 12-key grid, the 5-star scale, rated events, Leitner review, the lick book, `lickFromPhrase()` |
| `src/engine/lickDetect.ts` | "Use it": `findLick()` (exact = same intervals transposed, one slip allowed; shape = same contour + rhythm), "over the right chord" (lick chords moved by the same transposition and time shift land on chart chords with the same root and family), `useItPassed()` (≥ 2 times), `useItChart()` (the lick's changes through 4 keys a whole step apart) |
| `src/engine/transcribe.ts` | 8 levels (`phraseFor`), `comparePhrase()` — DP alignment (missing / extra notes), take octave folded, rhythm on the player's own pulse (least-squares fit, 0.6–1.7× tempo), per note ok / pitch / early / late / missing, the first error in words; degree writing and grading; stars; rated events |

Contexts: major ii–V–I, minor ii–V–i, dominant, altered, blues, Barry Harris lines, bebop enclosures, guide-tone lines.

### Measurement
A lick is practised as an ordinary drill (`family: 'licks'`, item `lick:<id>:<instrument>:<key>`), so the take,
MIDI / microphone capture, latency, the ✓/✗ marks, `analyzeTake` and the tempo ladder (`applyTake` with the lick's
target) are the drills engine's. Piano: MIDI or mic; guitar / bass: the guitar analysis on the neck (one hand position
per lick); voice: the lick in the player's range, sung (the piano-mic onset path: pitch + time).

### Stars (the technique scale)
1 = clean at the start tempo in 3 keys · 2 = one key passed at the target · 3 = three keys (**known**: opens *Use it*,
joins the review, enters *my licks*) · 4 = six keys · 5 = all 12. A key passes with 3 clean takes at ≥ 95 % of the
target on ≥ 2 days (`itemPass`). The grid shows per key the highest of 4 tempo rungs reached clean.

### Review
Leitner boxes (`REVIEW_DAYS = 0,1,3,7,14,30,60`): a known lick is due the next day; a review is one take in a key the
app picks (never the last one) at the item's goal tempo — clean moves a box up, otherwise back to box 1. Stored in
`Settings.lickBook.review`. (FSRS is research item #7; the interface is one function, `reviewAfter`.)

### Transcription flow
1 **Hear** (loop, 50 / 75 / 100 % — synthesised, so the pitch stays; band under it when the phrase has chords) →
2 **Play back** (count-in, the phrase as a drill on the player's instrument; "Show the notes" is allowed but the phrase
then counts less) → note-by-note result with marks on the staff and the first error ("Note 3: 1 half step too high")
→ 3 **Write** as degrees (12-button pad) → 4 **12 keys** (lick drills of the phrase) and *Keep in my licks*.
Stars per phrase: 3 = played back clean and written right. A level's stars = 3-star phrases (max 5); 3 opens the next.

## 2. Wiring (everything connects)

- **Practice → Train**: tiles *Licks* and *Transcribe* in Jazz, Piano, Guitar, Bass and Voice (`courseRows.ts`,
  `Arcade.tsx`), routes `#/licks`, `#/transcribe`, each opening with its quick lesson the first time.
- **Course instrument**: keys → piano, guitar, bass, voice; Jazz / Ear use the player's instrument setting.
- **Path**: game steps `licks:<course>:<level>` / `transcribe:<course>:<level>` (`MEASURED_STEP_LEVELS` in
  `path.ts`): jazz 4 + 5, keys / guitar 3 + 3, bass 2 + 2, voice 2 + 3. They pass only by measured playing
  (`checkStep` never ticks them from ratings); the screen reports stars (≤ 3) when the player leaves.
- **XP / course**: every take is `store.recordDrill` (XP 5 / 2 / 1 per lick take, 1–8 per phrase); the session is one
  result with the active course (`techResult('licks' | 'transcribe')`).
- **Ratings**: lick takes rate `improv/vocab` (0.6) + the instrument or `singing/sequence` (0.4); phrases rate
  `dictation/transcribe` (0.6) + `sequences/melody`; *Use it* rates `improv/vocab` + `improv/play`. New sub-skills in
  `taxonomy.ts`.
- **Quests**: `lick3` (3 clean lick takes — jazz, keys, bass), `tx2` (2 phrases ≥ 70 % — jazz, voice).
- **Badges** (technique, Jazz + the instrument courses): First Words, Vocabulary (10 licks), All Around the Cycle (one
  lick clean in 12 keys), Took It Down, Bebop Ears (a level-8 phrase clean). Own art in `BadgeArt.tsx`.
- **Workout**: with licks due, a 2-minute *Lick review* block after the path block (not in Drums / Ear, not with a saved
  template); it opens the trainer on the review.
- **Improv studio**: a *Use a lick* tab (when the player has licks in *my licks*) running the same challenge.
- **Glyphs**: `lick`, `transcribe` (path steps, quests, Practice).
- **Quick lessons**: `lick-trainer`, `transcribe-coach` (core + in depth), Hebrew and English.

## 3. One screen
`e2e/licks.spec.ts` checks the library, a lick page (grid), a run, and the coach's hear / play-back steps at 390×844
(no vertical or horizontal scroll, no emoji).

## 4. Not yet / later
- Recorded narration for the two new quick lessons (English lines are not in `public/voice` yet).
- Licks from the repertoire tracker (a tune's licks) — the lick book takes any `Lick`, so the tracker can add them.
- Partner packs (#9) can ship licks in the same `Lick` shape.
- Swing ratio / ghost notes in the transcription comparison (the groove analysis can be added to `comparePhrase`).
