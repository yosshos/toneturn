# SPEC-PHRASE-STUDIO — "Encore / הדרן": keep a phrase, make it yours in 12 keys

Status: proposal for the owner, 2026-11-16 (branch `redesign-v2`, 0.98). Nothing here is built.
Screens: `docs/phrase-studio-preview/index.html` (full-screen slideshow, phone + wide side by side, he RTL, light/dark).
Internal code name: **phrase studio** (files, ids). Product name: see §1.

The owner's sentence, kept as the north star:

> A musician improvises and suddenly plays a beautiful phrase — "wow, I want to do that again". Mark up to 8 bars,
> set a target tempo, go through all 12 keys. Or just play something and the app catches it. Or a teacher plays it on
> MIDI and assigns it.

Three owner additions on the same day are folded in: a first-class **Recordings library** (§6), a **community
challenge** loop (§12), and the mental model for that loop — "TikTok challenges for musicians", but the currency is
measured mastery, not likes (§12.1).

---

## 0. Contents

1. Name
2. What exists today (audit, with file:line)
3. The product in one page
4. Entry points
5. Capture → trim → clean-up
6. Recordings library ("ההקלטות שלי")
7. Practice plan generation
8. The practice run and its feedback
9. How it connects (Today, workout, diary, key mastery, XP, leagues, path, level test)
10. Phrase difficulty and XP
11. Teacher flow
12. Community: shared phrases as challenges
13. Data model
14. Algorithms
15. Storage, offline, iPhone memory
16. Accessibility, RTL, edge cases
17. Where it lives in the app
18. Phased delivery
19. Open questions for the owner (product only)

---

## 1. Name

The owner's working words are "drill editor", "my drills", "my licks". The new thing is bigger than an editor: it is
a place where *your own music* comes back to you and becomes vocabulary. Three candidates:

| # | English | Hebrew | For | Against |
|---|---|---|---|---|
| A | **Encore** | **הדרן** | One word, says "again" — exactly the owner's sentence. In Hebrew it carries *הדרן עלך*, "we will return to you": the phrase comes back on spaced review until it is yours. Mature, musical, not a gimmick. Works as a verb in copy ("keep it for Encore"). | Not everyone knows *הדרן* is the Hebrew "encore"; the subtitle fixes that. |
| B | Phrasebook | ספר המשפטים | Clear: a book of your phrases; matches the app's "phrase" vocabulary (ImprovStudio "משפט"). | Sounds like a static notebook, not practice; "ספר" collides with books/lessons. |
| C | Lick Lab | מעבדת ליקים | Jazz-native, catchy in English. | "Lab" is the kid-app register the owner removed; "ליק" is jazz slang that singers/classical players won't own; the Hebrew is clumsy. |

**Chosen: A — Encore / הדרן**, shown everywhere with the subtitle **"המשפטים שלי · My phrases"** so it is
self-explaining. Reasons: it names the *action* the owner described (play it again, faster, everywhere), it carries
the spaced-return idea for free, it fits the serious design language (a concert word, not a game word), and it is
short enough for a sidebar entry and a tab label at 320 px. The recordings shelf is plainly named
**"ההקלטות שלי · My recordings"**; community challenges are **"אתגר הדרן · Encore challenge"**.

The tab glyph: the app's tilted note head inside a repeat sign (`𝄆 ● 𝄇`) — "review is shown as a repeat sign" is
already a motif in SPEC-REDESIGN.md:27.

---

## 2. What exists today (audit)

### 2.1 Drill creator (the "drill editor")

- `CustomDrill` is a **pattern in scale degrees** run through every key — `src/engine/drills/types.ts:924`. The v2
  fields already cover a lot of the plan: `keys` (`:950`), `startBpm`/`goalBpm` (`:956`), `inToday`/`inWorkout`/
  `inPath` (`:962`), `instrument` + neck placement (`:966`), `marks`, `lh`, `handsMode`.
- The engine turns it into a regular `Drill` per key (`customToDrill`, `src/engine/drills/custom.ts:500`), so it gets
  the full take engine, ladder, grading and Today inclusion (`customIncluded`, `custom.ts:198`; `todayDrills(...,
  settings.customDrills)`, `src/ui/App.tsx:1351`).
- MIDI recording exists but is a side input of the editor: `entry: 'tap' | 'type' | 'record'`
  (`src/ui/DrillCreator.tsx:285`), MIDI only ("Connect a MIDI keyboard to record", `DrillCreator.tsx:82`), quantised by
  `quantizePlayed` (`custom.ts:763`, options `custom.ts:743`: key, scale, bpm, grid 8/16/triplet, split).
- Its weakness for the owner's idea: **degrees within one scale** (+ alteration ±1) is the right model for Hanon-like
  sequences, but a chromatic bebop line over a ii–V wants **semitones above a tonic plus a chord chart** — which is
  exactly what a `Lick` is (below).
- It lives four levels deep: Practice → Train → Technique → Drills hub → "Create" (`src/ui/Drills.tsx:345`).
  Saved drills go into `settings.customDrills` (`src/storage/progress.ts:342`), synced as part of the profile's
  settings JSON (`src/cloud/cloud.ts:132`).
- Share codes exist (`shareCode`/`readShareCode`, `custom.ts:1032`/`:1043`).

### 2.2 Licks (the closest existing model)

- `Lick` = chords + notes as `[semi, beat, dur]` above the key's tonic (`src/engine/licks.ts:41`, `:43`), with `own`
  for the player's licks.
- 12-key × tempo grid (`lickGrid`, `licks.ts:349`) over `LICK_KEYS`, the cycle of 4ths from C (`licks.ts:346`); item
  ids `lick:<id>:<inst>:<key>` (`licks.ts:301`) so every key is an ordinary `ItemState` on the drills ladder.
- Stars (`lickStars`, `licks.ts:365`), "known" at 3 stars (`LICK_KNOWN_STARS`, `:375`), next key to practise
  (`nextLickKey`, `:378`), tempo rungs (`lickTempos`, `:292`), XP (`lickXp`, `:424`).
- FSRS spaced review (`reviewAfter`, `licks.ts:468`; `dueLicks`, `:477`), the `LickBook` in settings
  (`licks.ts:492`; `progress.ts:344`) with `mine`, `own`, `review`, `used`.
- Range-aware transposition per instrument (`windowOf`/`lickPitches`, `licks.ts:197`/`:205`) and a neck placer for
  guitar/bass (`placeOnNeck`, `licks.ts:230`).
- "Use it": find the lick (exact or by shape, transposed) in an improvisation over the right chord
  (`findLick`, `src/engine/lickDetect.ts:63`; `useItPassed`, `:121`; `useItChart`, `:130`).
- The transcription coach already turns a phrase into an own lick (`lickFromPhrase`, `licks.ts:513`) — but it forces
  `ctx: 'major-251'` and a C-major-7 chart when there are no chords, and guesses the tonic from the first note.
- Lick review already gets a 2-minute workout block (`src/engine/workout2.ts:62`, `:180–186`).

**Conclusion:** Encore is built on `Lick` (notes + chords + 12-key grid + review + Use it) with the practice-plan
fields of `CustomDrill` v2 added. Degree patterns (old custom drills) stay as a second kind in the same library.

### 2.3 What is recorded and kept today — per course

This answers the owner's "I don't know how it's set up now". Short version: **almost nothing a player plays is kept
after they leave the screen**, and nothing is browsable by date.

| Where | What is captured | What is kept | Where / how long | Cite |
|---|---|---|---|---|
| Technique drills (piano/guitar/bass/drums) | MIDI or mic notes (`PlayedNote`, `types.ts:731`) graded into `TakeMetrics` (`types.ts:758`) | Only the metrics of the last take, in a React ref, for the "last take" ghost; the notes are dropped. The item's tempo history (`ItemState.history`, `types.ts:895`) is kept. | memory → gone on leave | `src/ui/Drills.tsx:901`, `:931–932` |
| Charts / improv over a band (comp, rules, improvise) | MIDI notes, or mic audio + pitch frames | The last take only, for "Listen back" (MIDI replayed or the mic audio) | memory (`useRef`) → gone on leave | `src/ui/Charts.tsx:250–251`, `:384`, `:410` |
| ↳ on iPhone/iPad | — | **No audio at all**: a second mic stream is refused on iOS, so recording is skipped | — | `src/ui/Charts.tsx:254–256` |
| Improvisation studio (phrasing, vary, trading 4s) | MIDI/on-screen notes | Nothing persisted (component state only) | memory | `src/ui/ImprovStudio.tsx` (no storage calls) |
| Vocal exercises (pitch, range, intervals) and timed singing | Pitch frames + audio on the **same** stream (works on iOS) | **Opt-in** "keep takes" (`settings.keepTakes`, `progress.ts:352`; checkbox `Vocal.tsx:576`): one take per exercise per week, the best-scoring | IndexedDB `toneturn-takes`, forever until cleared; only shown as "then and now" | `src/storage/takes.ts:1–3`, `:33`; `Vocal.tsx:1065`; `VoiceTimed.tsx:820`; capture `src/speech/pitchCapture.ts:47–52` |
| My song (every course) | An **imported** audio file (file picker, `audio/*`) | The file + its analysis, scores per course | IndexedDB `toneturn-mysongs`; ≤ 60 MB, ≤ 10 min per file | `src/storage/mySongs.ts:1–4`, `:87`, `:169–170`; `src/ui/MySong.tsx:243` |
| Pieces | Imported MusicXML/MIDI scores (not the player's playing) | the score | IndexedDB `toneturn-pieces` | `src/ui/Pieces.tsx:34`, `:197` |
| Level tests, lessons, games | answers / metrics | results only (XP, ratings, `RatingEvent`s) | progress + sync | — |
| Practice diary | time, quality, notes | minutes per day/item, journal notes | `src/storage/practice.ts:263`; limits `src/engine/practiceTime.ts:27–31` | |

What already works in our favour: the iOS-safe way to record is to let the **one** capture stream also feed a
`MediaRecorder` (`pitchCapture.ts:47–52`); MIDI notes are tiny; there is an IndexedDB pattern with a memory fallback
and quota handling (`mySongs.ts:57`, `:149–159`).

### 2.4 Loop a span, teacher loop, social

- "Loop the spot": `sliceDrill` cuts bars from any drill, re-based to beat 0, with its own item id that never moves the
  item's ladder (`src/engine/drills/slice.ts:1–3`, `:34`), 10 % slower (`loopBpm`, `:25`), 2 clean passes
  (`LOOP_PASSES`, `:27`); the take review's Loop button (`src/ui/TakeReview.tsx:84–87`).
- Ladder and pass rules: `itemPass` (3 clean takes on 2 days at ≥ 95 %, `src/engine/drills/ladder.ts:27–37`),
  `applyTake` (`:91`), `ladderStep` (`:53`), `todaysItems` (`:275`); rubato first (2 free-time clean, then quarters at
  ♩60: `src/engine/drills/rubato.ts:13–17`).
- Teacher loop: `AssignKind = 'lesson' | 'topic' | 'drill' | 'chart' | 'piece'` (`src/cloud/teacher.ts:5`),
  `AssignItem` with strictness, `targetBpm`, note, due (`:20`), `assignItem` (`:75`), `submitResult(score, minutes,
  metrics)` (`:86`), pass thresholds 0.6/0.75/0.9 (`:110`); UI `src/ui/TeacherLoop.tsx:1–4`.
- Social: friends + weekly board (`src/cloud/social.ts:6`, `:80`), duet streaks and nudges (`:264`, `:272`), privacy
  settings table (`docs/SPEC-SOCIAL.md` §2), block/report with automatic actions (`src/cloud/community.ts:26–33`,
  SPEC-SOCIAL §9), friends' activity + one-tap "Bravo" (`community.ts:99–107`, `ActivityKind`
  `src/engine/socialRound.ts:66`), challenge links "beat my score" with 8-char opaque codes, 14 days, 50 opens
  (`community.ts:136–160`), weekly friend quest, class board. Young-player mode turns off feed/sharing.
- Analysis we can reuse for audio: offline beat tracking with confidence (`src/engine/beatTrack.ts:325`,
  `BEAT_CONFIDENT` `:31`, 3/4 detection `:266`), chords and key from audio and melody (`src/engine/chordTrack.ts:344`,
  `:373`, `:392`).

---

## 3. The product in one page

**Encore turns anything you played into a phrase you own.** Four ways in, one way through:

```
 improv / guided improv / any take ─┐
 the Recordings shelf (past takes) ─┤
 Record mode (just play)           ─┼─► Capture ─► Trim (≤ 8 bars) ─► Context (key, chords, hands) ─► Plan ─► Practise ─► Yours
 teacher assignment / shared link  ─┤                                                                      │
 old custom drills / own licks     ─┘                                                                      └─► review, Use it, share
```

- **Keep** — one tap after any take: "לשמור את המשפט". The app proposes the best 1–8 bars (phrase boundaries from
  rests and the harmony) and you nudge two handles.
- **Understand** — the app tells you, in one line, what you caught: "ii–V–I ב־<bdi>F</bdi> · ♩160 · 4 תיבות ·
  סווינג", with a confidence mark; one tap fixes anything.
- **Plan** — target tempo (default: 125 % of the tempo you played it at, rounded), keys (all 12 in an order the app
  chooses for *this* phrase — easiest first), hands. Starts rubato, then a tempo ladder (owner rule).
- **Practise** — the drills take engine: count-in, click, a moving now-cue, live marks on the notes, one-line
  feedback. Each key is a cell on the phrase's **12-key × tempo map**.
- **Yours** — when every key is clean at the target tempo, the phrase is *yours*: a quiet, serious moment (final
  barline with a fermata, your first take vs. today, the phrase played back in the last key by the band). It then
  joins spaced review and "Use it" in improvisation.
- **Keep listening** — every measured take is kept in **My recordings** (by date, named, starred, foldered), playable
  on a loop on the way to work, and one tap from any recording back into Encore.
- **Share** — with your teacher, friends, or the community, as a challenge others practise through the same plan;
  the board ranks mastery (tempo × keys × cleanness), not likes.

---

## 4. Entry points

### 4.1 "Keep this phrase" after any take (v1)

Shown in the take review of: Charts improv/comp (Charts.tsx), Improvisation studio (all four modes), guided improv
(ImprovRules challenges), technique drills (TakeReview), Use-it runs, My song play-along, the vocal timed takes, and
Record mode. One small icon button in the review row (the repeat-note glyph) with the label "לשמור משפט" on wide
screens; on the phone it sits beside Again/Loop/Next and never pushes the review past one screen.

- If the take was **graded against written notes** (a drill, a piece), "Keep" defaults to the bars the player chose
  with Loop (or the worst bars) — useful for "this passage, faster, in all keys".
- If the take was **free** (improv), the app proposes up to three candidate phrases (§14.4), best first, each a chip
  "תיבות 5–8" with a 2-second preview on long-press.
- Keep never loses the take: the take is already in My recordings (§6) before the button is pressed; Keep opens the
  trim screen on it.

### 4.2 From past takes — the shelf (v1)

Encore's home shows **"מהנגינה האחרונה שלך"** (from your recent playing): the last 10 free takes (improv, Record mode,
guided improv) as compact rows — title (auto: "אלתור על <bdi>Autumn Leaves</bdi>"), date, length, instrument, a
mini piano-roll thumbnail. Tapping opens the trim screen. "All recordings" opens §6. Retention and size: §6.2.

### 4.3 Record mode — "just play" (v1 MIDI, v2 audio)

A dedicated screen: big round record button (an exercise-style mega control, allowed: it is the exercise), an
optional click and drone, and the instrument picker inherited from the course.

1. **Armed**: "נגנו כשתרצו" — nothing is recorded until the first note (MIDI note-on, or audio onset above the noise
   floor measured in the first 500 ms). No count-in is forced; a click is optional ("עם מטרונום" toggle, default
   off — free playing is the point; if on, the tempo is known and bar lines are exact).
2. **Listening**: a live piano roll (MIDI) or pitch trace (audio) scrolls; a level meter; elapsed time; the detected
   key and tempo appear as soon as they are confident ("<bdi>F</bdi> מז׳ור · ♩≈160", dim until confident).
3. **End**: after **2.5 s of silence** (configurable 1.5–5 s), or Stop. The tail silence is trimmed.
4. **Caught**: a summary card — start/end, bars, key, meter, tempo, swing, each with a confidence mark (●●● / ●●○ /
   ●○○). Low-confidence values are shown as questions ("<bdi>F</bdi> מז׳ור או <bdi>D</bdi> מינור?") with two chips.
   Then the trim screen.

Max capture: 3 minutes per take in Record mode (longer playing belongs in a session recording, §6.3). Audio input in
v2: monophonic instruments and voice through the existing pitch capture; piano by mic through the existing piano-mic
path with a "lower confidence" mark (§14.2).

### 4.4 Import from the old drill editor (v1)

- Existing `CustomDrill`s appear in Encore's library as **"תבניות" (patterns)** — degree patterns that sequence
  through a scale. They open in the existing creator (kept, restyled) and practise exactly as before. No migration of
  data is needed (§13.4).
- "Make it a phrase": converts a pattern rendered in one key into a phrase (notes + chords), for players who want the
  phrase model (transposition by semitone, chord context, review).
- Old own licks (`LickBook.own`, from the transcription coach) appear as phrases at once.

### 4.5 Teacher-assigned (v2) and shared links (v3)

A teacher's phrase arrives in the student's Assignments and in Encore with a "מהמורה" tag (§11). A community or
friend's shared phrase opens a challenge page (§12) and can be added to Encore with one tap ("לקבל את האתגר").

### 4.6 From the Lick library, pieces and lessons

"Add to my phrases" on any built-in lick (it already has "add to my licks", `LickTrainer.tsx:489`) and on any span of
a piece or a lesson example — they open the same trim → plan flow (the source notes are exact, so no clean-up).

---

## 5. Capture → trim → clean-up

All screens fit one phone screen at 320×720 (owner rule); the score and roll scale to the space, never scroll.

### 5.1 Views

The trim screen shows the take in two linked views; one is large, the other a strip:

- **Piano roll** (default for MIDI and free takes): notes as rounded bars, velocity as fill opacity, bar lines and
  beat ticks, chord symbols above (detected or from the chart played over), a playhead.
- **Score** (default when the source was written, and for readers): the existing staff renderer, beamed, with
  accidentals spelled from the detected key and chord (enharmonics treated as the same note, owner rule).
- **Waveform** strip (audio takes only): the recorded audio's envelope under the roll, aligned.

A segmented control `נוטות · תווים` swaps which is large. On wide screens both are shown full size, roll above score.

### 5.2 Selecting up to 8 bars

- The app pre-selects its best phrase (§14.4). The selection is a lilac band with **two drag handles** (44 px hit
  areas, ink outline), snapping to **bars** by default and to **beats** when the handle is held still for 300 ms (a
  small "פעמה" badge appears) — a pickup phrase starting on "4&" is common in jazz, so beat-snap matters; with Shift on
  desktop, snap to the 8th.
- A counter "4 תיבות מתוך 8" ; past 8 bars the band turns tangerine and the handle stops (hard limit 8; teacher can
  assign up to 16, see Q5).
- **Suggested boundaries** are shown as small ink ticks under the roll; the handles feel a soft magnet at them.
- Play controls: play the selection (loops), at 50 / 75 / 100 % speed; a click toggle.
- Pickup handling: if the phrase starts before a bar line, the first bar becomes a pickup bar (anacrusis) and the
  phrase's beat 0 is the next downbeat.

### 5.3 Context: key, chords, meter, feel

One card under the roll, each field a chip that opens a small picker:

- **Key / tonal centre**: e.g. "<bdi>F</bdi> מז׳ור". Alternatives with their likelihood ("<bdi>D</bdi> מינור 18 %").
- **Chords**: the detected chart over the selection ("<bdi>Gm7 | C7 | Fmaj7 | Fmaj7</bdi>"); tap a chord to change
  root/quality (the LICK_Q qualities, `licks.ts:21`), or "ללא אקורדים" (a line without harmony — then the band plays
  a drone on the tonic). If the take was over a chart, the chart is exact and shown without a confidence mark.
- **Meter** 4/4 · 3/4 · 6/8 · 5/4 (detected; 3/4 from `meterOf`, `beatTrack.ts:266`); **feel** straight / swing
  (swing ratio detected from the 8th-note long-short ratio, shown as "סווינג 62 %").
- **Context tag** (for the library and "Use it"): major ii–V, minor ii–V, dominant, altered, blues, Barry Harris,
  enclosure, guide tones, or "free" — proposed from the chords (the existing `LickContext`, `licks.ts:17`).

### 5.4 Fixing notes

Tap a note → a small bar above it: ▲ / ▼ (semitone), delete, split, length ◀ ▶, "תו שגוי" quick-fix (snaps to the
nearest chord/scale tone — the most common fix for a slipped finger). Long-press on the roll adds a note. Undo/redo
(10 steps). Ghost notes (velocity < 25 or < 40 ms) are pre-marked dim with "להסיר תווי רפאים?" (one tap removes all).

### 5.5 Quantisation

Shown as a slider, not a setting: **"מדויק ← → טבעי"** (tight ← → natural) with three stops — grid (strict 16th /
triplet, `quantizePlayed` grids, `custom.ts:743`), *swing-aware* (default: onsets to the swung 8th grid, keeps the
detected swing), and *as played* (no quantisation; grading then uses the played onsets as the reference and a wider
timing window). The roll updates live so the player sees what moved.

### 5.6 Hands and fingering

- Piano: hands split proposed by register and voice crossing (§14.6); a draggable split line on the roll; LH notes in
  lilac, RH in purple. Two-hand phrases can still be practised one hand at a time.
- Fingering: optional, off by default. "להציע אצבוע" fills piano fingering with the existing drill fingering rules;
  each number editable. Guitar/bass: a position and string set (§7.4).

### 5.7 Name and save

The phrase gets an automatic name from its context and source ("ii–V ב־<bdi>F</bdi> · מהאלתור של 14.11"), editable.
Save goes straight to the plan screen. Everything is saved continuously (owner rule "never lose progress"): the trim
state lives in a resume slot (`saveSlot`, `src/storage/resume.ts:152`), so Back or reload returns to the same handles.

---

## 6. Recordings library — "ההקלטות שלי · My recordings"

The owner: *a place to look back by date, name, rename, star, folders; listen again and again; decide to improve it;
singing or playing, audio or MIDI; on the commute, find it and loop it.* This is a first-class part of the app, not
a sub-screen of Encore.

### 6.1 What is kept automatically

| Kind | Kept automatically | Default | Opt-out |
|---|---|---|---|
| **Notes** of every measured take (MIDI or notes from pitch capture) — drills, licks, phrases, charts, improv, pieces, guided improv, Record mode, vocal sung notes | yes, always | on | Settings → Recordings → "לשמור תווים של כל ניסיון" (off = only starred/Encore takes) |
| **Audio** of mic takes where the capture already records (singing, mic piano/guitar/bass/drums, mic improv) | yes | **on** (replaces today's opt-in `keepTakes`, which becomes this switch; see Q2) | "לשמור שמע של ניסיונות במיקרופון" |
| **Session recording** — one continuous file per practice session (all takes back to back, with the band/click if wanted) | opt-in | off | per session: a small "להקליט את כל האימון" toggle on the session start page |
| Imported "My song" files | as today | — | — |
| Level tests | notes only, tagged "מבחן רמה" | on | same switch as notes |

Very short or empty takes (< 3 notes or < 2 s of sound) and takes the player aborted in the count-in are not kept.

**iPhone audio**: every mic take records through the capture's own stream (`pitchCapture.ts:47–52` pattern), never a
second `getUserMedia` (the reason Charts records nothing on iOS today, `Charts.tsx:254`). Charts' mic path moves onto
the same approach in v1. MIDI takes keep notes only; their "audio" is rendered on demand with the app's instruments
(the band too, if it played).

### 6.2 Storage, retention, cleanup

- **Where**: IndexedDB database `toneturn-recordings` with three stores — `sessions` (metadata), `takes` (metadata +
  packed notes), `audio` (blobs, keyed by take id). Blobs in IndexedDB are the most reliable cross-browser choice on
  iOS today; OPFS is an optional faster path for session recordings on Chromium (v2), behind the same interface
  (`RecordingStore`, like `SongStore`, `mySongs.ts:27`), with an in-memory fallback for private mode and tests.
- **Formats**: audio as the browser's `MediaRecorder` output — Opus in WebM/Ogg on Chrome/Android/Firefox, AAC in MP4
  on Safari/iOS — mono, **48 kbps** target (`audioBitsPerSecond`), ≈ 0.36 MB per minute. Notes packed as a typed
  array (pitch u8, onset Δms u16/varint, duration u16, velocity u8 ≈ 6 bytes/note): a 10-minute improvisation of
  ~3 000 notes ≈ 18 KB.
- **Budget** (defaults, see Q3): audio up to **500 MB** (≈ 23 hours); notes up to 50 MB (practically unlimited).
  The Recordings header shows "בשימוש: 212 MB מתוך 500" as waveform bars (the progress motif).
- **Cleanup** (never silent for starred items): unstarred audio older than **60 days** is pruned to its notes (the take
  stays in the timeline, marked "תווים בלבד", still playable through the app's instruments when it has notes);
  starred items, items in folders, items linked to an Encore phrase or a teacher submission are never pruned.
  When the device is low (`roomFor` 'low', `mySongs.ts:151`), the app asks once with a list and sizes; it never deletes
  without that.
- **Persistence**: request `navigator.storage.persist()` the first time a recording is starred or the library passes
  50 MB, with a one-line explanation. Note for iOS: Safari may evict script-written storage of a website not used
  for 7 days; a **home-screen PWA is exempt** from that cap — the install prompt says "so your recordings are kept".
  Encourage "Export" of favourites (§6.6) as the backup.
- **Privacy**: recordings never leave the device unless the player shares one (teacher, friend, community). The
  current privacy line says the app "stores no recordings" (`src/i18n/strings.ts:1063`, he; the en string near
  `:109`) — it must be rewritten in v1 to "your recordings stay on this device unless you share them". Cloud
  sync carries only small metadata of *starred/foldered* items (name, date, folder, star, linked phrase id) so a
  second device shows "on your phone" placeholders — never audio, never notes unless the player turns on "לסנכרן
  תווים" (notes are small; audio is never synced in v1–v2).

### 6.3 The library screen

Reachable from the sidebar/tab "ההקלטות" (§17), from every take review ("לכל ההקלטות"), from the diary (each day lists
its recordings), and from Encore.

- **Timeline by date**: sections "היום", "אתמול", then dates. Each **session** is a card (time, course, duration,
  number of takes, measured minutes) that expands into its **takes**. A take row: title, instrument glyph, sung /
  played, source tag (MIDI / mic), length, the result summary as the app's mark row (e.g. "נקי · ♩144 · 96 %"), star,
  and a tiny waveform (audio) or roll (MIDI) thumbnail.
- **Filters** (chips, one row, horizontally scrollable — the library is not an exercise, so the list scrolls; chips
  never wrap): course (piano, guitar, bass, voice, drums, ear), type (sung / played), source (audio / MIDI), "starred",
  "Encore", "teacher", "level test".
- **Search**: by name, tag, piece/standard/lick name, key ("<bdi>F</bdi>"), date ("נובמבר").
- **Rename** (inline, ≤ 60 chars like `NAME_MAX`, `mySongs.ts:38`), **star**, **folders** (player-made, e.g. "הסולואים
  הטובים", "לשלוח למורה"), **tags** (free words), **delete** (to a 30-day "נמחקו לאחרונה", then gone), **bulk
  select** (star, move, delete, export, add to playlist).
- Empty state: one line ("כל מה שתנגנו או תשירו נשמר כאן") and the Record button.

### 6.4 The player

A full-screen player (not an exercise, so it may use normal controls; still one screen, no scroll):

- **Transport**: play/pause (the tilted-note play button), ±5 s, a scrub bar with bar numbers when the tempo is known
  (all MIDI takes and any take over a click/band; audio takes with a confident beat grid, `BEAT_CONFIDENT`).
- **Loop**: whole take, or **A–B** — two handles on the waveform/roll; when bars are known they snap to bars ("תיבות
  9–12"), else to 0.1 s. "לולאה" toggle.
- **Speed**: 50–125 % in 5 % steps, **pitch kept** (for audio: the media element's `preservesPitch`, supported on
  Safari/Chrome/Firefox; inside the app's audio graph the existing WSOLA slow-down of My song, `MySong.tsx:4`).
- **What you see**: the waveform with the sung pitch trace (voice) or the roll / score (MIDI), the take's marks if it
  was graded (per-note marks on the roll), the chord chart if one was played over.
- **Mix** (MIDI or over a band): "רק אני / עם הלהקה / רק הלהקה", instrument for MIDI rendering (the app's grand,
  Rhodes, etc.).
- **Actions**: "לתרגל את הקטע" (→ Encore trim with the A–B span pre-selected), "להשוות" (§6.6), star, rename, folder,
  share (§11, §12), export.

### 6.5 Commuting: background and lock-screen playback, playlists

- **Playlists**: "המועדפים בלולאה" (starred, automatic), folders as playlists, and a queue ("לנגן הבא"). Repeat one /
  repeat all / A–B.
- **How it plays in the background**: the Web Audio graph is suspended by iOS when the PWA goes to the background, so
  background playback uses a plain media element (`<audio>`) — which iOS keeps playing in an installed PWA and
  controls from the lock screen through the **Media Session API** (title, artist = "The 7th Sense", artwork = the
  take's thumbnail, play/pause/next/previous/seek). Consequences, handled:
  - MIDI takes are **rendered to audio** (OfflineAudioContext → WAV → AAC/Opus where `MediaRecorder` can encode, else
    WAV) when added to a playlist or when "background" is pressed; cached with the take.
  - **A–B loops in the background** cannot rely on JavaScript timers (throttled); the A–B span is "bounced" to its
    own short clip and played with `loop = true` — gapless enough for practice listening.
  - Speed in the background uses `playbackRate` + `preservesPitch` on the element.
  - Android Chrome PWAs: the same path works (Media Session is fully supported).
  - Lock-screen artwork: a flat, high-contrast square (ink on paper, the take's mini roll), not a photo.
- **Headphones-friendly**: remote play/pause/next work through Media Session; volume normalisation per take (−16
  LUFS-ish peak/RMS scaling on render) so a quiet sung take and a loud piano take sit together; a "mono" toggle.
- **Offline**: everything is local; nothing needs the network.

### 6.6 From listening to improving

- **Practise this span**: from the player, one tap with the A–B span → Encore trim (pre-selected) → plan.
- **A/B compare**: pick two takes of the **same item** (or any two) — the app aligns them by bar (or by onset
  correlation for free takes) and plays A, then B, alternating per loop ("A ← → B" switch, or "ברצף"); the screen shows
  both rolls stacked with differences highlighted (timing deviation lines, wrong notes), and one line of measured
  change: "♩120 → ♩152 · דיוק 82 % → 97 % · פיזור תזמון 34 → 19 מ״ש".
- **Progress of one item over time**: from any take, "כל הניסיונות של זה" lists every kept take of the item by date
  with tempo and accuracy as a small chart (the item's `history` is already kept, `types.ts:895`), each playable — the
  existing vocal "then and now" (`takes.ts:86`) becomes a special case of this.
- **Export**: a take as audio (m4a/webm), MIDI (.mid), or a phrase as MusicXML (v2); bulk export of a folder as a zip
  (v2).

### 6.7 Connections

- **Diary**: each day in the practice diary lists that day's recordings (and the session recording) with a play
  button; journal notes can attach a recording ("ההקלטה הזאת — הסולו הכי טוב שלי השבוע").
- **Teacher**: "לשלוח למורה" uploads that take (notes; audio only if the player ticks "כולל שמע") as a submission
  attachment (§11.4).
- **Encore**: every phrase links to its source take; the phrase's own takes are a filtered view of the library.
- Only measured takes ever count for XP/levels; listening counts as **no** practice time (the practice clock already
  ignores non-practice routes; playback is a "tool" route, `practiceTime.ts:35`), but it is shown in the diary as
  "האזנה" for the player's own record.

---

## 7. Practice plan generation

Opening the plan screen after trim (or tapping a phrase), the app proposes everything; the player changes only what
they want. One screen.

### 7.1 Target tempo

- Default target: the tempo the phrase was played at × 1.25, rounded to a ladder step (`ladderStep`,
  `ladder.ts:53`) — "a bit faster", the owner's words. For a phrase recorded without a beat (rubato), the default is
  the tempo whose note rate matches the played note rate.
- A big number with − / + (steps of the ladder) and a hint line "ניגנת ב־♩160". Cap: a note-rate ceiling per
  instrument (e.g. 16 notes/s on keys, 14 on guitar, 12 on bass, 8 sung) with a gentle note if exceeded.
- Start tempo: the lower of 60 % of the target and the played tempo − 15 %, never under ♩40.

### 7.2 The ladder (owner rule: rubato first)

Per key, the stages reuse the existing machinery:

1. **Free time** ("בלי קצב"): play the phrase in your own time, the app waits for each note (rubato stage,
   `rubato.ts:13`, 2 clean).
2. **Quarters at ♩60** (`rubato.ts:17`): every note on a quarter, to fix the notes before the rhythm.
3. **Tempo ladder** from start to target (`applyTake`, `ladder.ts:91`): count-in + click + now-cue, raise after a
   clean take, the level-pass rule for "reached" (3 clean takes on 2 days at ≥ 95 %, `ladder.ts:27–29`).
4. **With the band** at the target ("Use it in context", §7.6) — optional per key, required for the last stars.

Carry-over: the first key does the whole ladder; each later key starts free time once, skips quarters if its first
free take is clean, and its tempo ladder starts at 80 % of the best key's clean tempo — so the 12th key takes minutes,
not days.

### 7.3 Keys

- Default: **all 12**, in an order chosen for *this* phrase: **"קל קודם" (easiest first)** — keys scored by
  instrument-specific awkwardness (piano: black-key count and thumb-on-black events; guitar/bass: the best position's
  stretch and shifts; voice: distance from the comfortable middle of the range), starting with the key it was played
  in. Alternatives in the same chip: cycle of 4ths (`LICK_KEYS`, `licks.ts:346`), chromatic up, "my weak keys first"
  (key mastery, `DrillSettings.focusWeakKeys`), or **choose keys** — a 12-key ring picker (the circle of fifths drawn
  as 12 note-head buttons; tap to toggle; "הכול" / "רק המקור" / "4 קשים").
- "Yours" requires all 12 (see Q4); a subset is allowed and shows "4 מתוך 12" on the map, never as "full".

### 7.4 Transposition that stays playable

- **Keys**: the phrase moves by the shortest interval (−6…+5 semitones) from its home, then by octave so it stays in
  the instrument window (`windowOf`, `licks.ts:197`) — for piano the RH centroid within C4–C6, LH within C2–C4, hands
  never crossing more than in the original.
- **Guitar / bass**: per key, the phrase is placed on the neck with the existing placer (`placeOnNeck`,
  `licks.ts:230`), choosing a position that keeps the **same fingering shape** as the home key when possible (movable
  shape), else the position with the fewest shifts within a 4-fret span (6 with "stretch", `spanOf`, `custom.ts:220`);
  open strings allowed only when the home key used them. The plan shows the chosen position per key ("<bdi>Ab</bdi> ·
  פוזיציה 4") and lets the player lock "אותה פוזיציה בכל הסולמות" or "לפי הסולם".
- **Voice**: transposed into the singer's measured range (the voice course's range), choosing the octave with the
  fewest notes outside it; keys that cannot fit at all are marked "מחוץ לטווח" and excluded from "Yours" for that
  singer, with a one-line explanation.
- **Spelling**: note names follow the key and the chord (flat keys spell flats; leading tones as sharps over a
  dominant), enharmonics graded as the same note (owner rule).

### 7.5 Hands

Piano: "יד ימין / יד שמאל / שתי ידיים" (from `handsMode`, `types.ts:924`). Two-hand phrases default to **one hand
first** (RH then LH at the start tempo) then together, each a separate row on the map. A one-hand phrase can add "LH
plays the shell voicings" (guide tones from the chord) as a v2 option.

### 7.6 "Use it" in context

After a key reaches the target, "Use it" offers a 4-chorus run over the band in that key's chart (`useItChart`,
`lickDetect.ts:130`); the app listens for the phrase, exact or by shape (`findLick`, `lickDetect.ts:63`), and marks
the moments it heard it on the chart. Two uses over the right chord (`useItPassed`, `:121`) count for the phrase's
top rank.

### 7.7 What the plan becomes

A phrase's plan produces, per key and hand, an `ItemState` on the drills ladder with item id
`lick:<phraseId>:<inst>:<key>` (`licks.ts:301`, with a hand suffix for two-hand phrases). So Today, the workout, key
mastery, plateau detection and the diary see a phrase exactly like a built-in drill (§9).

---

## 8. The practice run and its feedback

### 8.1 The run screen (one phone screen)

Top to bottom: a thin header (phrase name, key chip "<bdi>Ab</bdi>", stage chip "♩144 → 200", close icon); the
**score** (or tab for guitar/bass, or the roll if the player prefers) with the **now-cue** — the staff playhead that
glides by real onsets (memory "staff playhead") and a lemon now-line with an ink outline (lemon is reserved for "now",
SPEC-REDESIGN.md:10; never pale yellow behind icons); the chord symbols above; under it the **count-in dots**
(four tilted note heads lighting in turn) and the **click** (audible; "ללא קליק" is not offered at tempo stages —
owner rule: every timed exercise has count-in + click + visual cue); the instrument (on-screen keys / neck) only when
no MIDI or mic input is present; and the mega "להתחיל / שוב" button (exercise context).

### 8.2 Live marks (per note, while playing)

Each note head is marked the moment it is judged (`liveMarks`, `types.ts:1008`, default "while learning"):

- **on time & right**: the head fills ink (dark mode: white) — quiet, the default state of success;
- **early / late** (outside ±35 ms at tempo, ±80 ms in free time): a tangerine tick before/after the head;
- **wrong note**: the head turns pink with the played pitch shown small beside it ("<bdi>B</bdi>");
- **missed**: a hollow dashed head.

No sounds for marks (the music is the sound); no shaking, no confetti.

### 8.3 After the take (one line + marks)

The existing take review layout (`TakeReview.tsx`: verdict, three chips Notes / Time / Even, Again / Loop / Next):

- One line: "נקי ב־♩152. הבא: ♩160." / "כמעט — תיבה 2 מוקדמת." / "עוד לא — התווים בתיבה 3." (owner rule: one-line
  feedback; "למה?" only on wrong answers).
- The marks stay on the score; the worst bar is outlined; "לולאה" loops it (`sliceDrill`, 90 % tempo).
- A tiny ladder strip: the rungs of this key, the current one outlined in lemon-on-ink, clean ones filled purple.

### 8.4 The phrase's 12-key × tempo map

The phrase's home page shows **one grid**: 12 columns (keys, in the plan's order, names in `<bdi>`), rows = the
ladder stages (free · quarters · tempo rungs · target · band). A cell is:

- empty (not tried), outlined (in progress, the current rung marked with a lemon outline + ink border),
- filled purple (clean at that rung), filled purple with an ink fermata (target reached = passed by the level rule),
- a small dot under a key = due for review.

Above the grid, the phrase's rank as the app's dynamics motif (levels are dynamics, SPEC-REDESIGN.md:24) with a bar to
the next promotion only — **never a "full" bar** below the top (owner rule "promotion, not full bars"):

| Rank | Mark | Earned by (measured only) |
|---|---|---|
| 0 | — "טיוטה" (sketch) | saved |
| 1 | **pp** | clean in free time in the home key |
| 2 | **p** | target tempo passed in the home key |
| 3 | **mp** | target in 3 keys (the phrase starts its spaced review, like `LICK_KNOWN_STARS`) |
| 4 | **mf** | target in 6 keys |
| 5 | **f — "שלך" (yours)** | target in all 12 keys (or all keys in range for voice) |
| 6 | **ff — "באוצר המילים" (in your vocabulary)** | yours + used it over the band twice + passed a review ≥ 7 days later |

Streaks: "ימים ברצף על המשפט" is not a separate streak (the app has one streak, in bars); instead the map shows the
**days practised** as small bar-line ticks under the grid — honest and calm.

### 8.5 "The phrase is yours" moment

When the 12th key passes at target:

1. The take review's line changes to "המשפט שלך." in Secular One, nothing else for a beat.
2. A full-screen card (one screen): the phrase drawn on a staff ending with a **final barline and a fermata** (the
   app's "end of lesson" motif), Toni in the "wow" state (small, beside — not dancing), and three facts in large
   numbers: "12 סולמות · ♩200 · 9 ימים".
3. **Then and now**: two play buttons — "הניסיון הראשון" (the original take from the recording, or the first measured
   take) and "היום" (the best take at target) — the single most motivating thing we can show, and true.
4. The band plays the phrase once, in the last key, at the target tempo, as a short coda (the user's own phrase is the
   celebration sound).
5. Actions: "להשתמש בזה באלתור" (Use it), "לשתף" (§12), "סגירה". It posts a friends' activity item if milestones
   sharing is on ("CodaFox42 הפך משפט לשלו", `ActivityKind`, `socialRound.ts:66`).

At **ff** a smaller toast-like line: "המשפט באוצר המילים שלך." with the repeat-sign glyph closing.

### 8.6 The library ("המשפטים שלי")

A list (scrolls — not an exercise) of phrase cards: name, context tag, home key, a mini roll, the dynamic mark, the
12-key strip (12 small cells: filled / outline / empty), "לחזרה היום" badge, source glyph (improv, record, teacher,
community, lick, pattern). Sort: due first · recently practised · rank · newest. Filters: instrument, context, rank,
source. A "+" icon button opens Record mode; long-press for rename/folder/share/delete.

---

## 9. How it connects (the 6-point checklist)

| Where | How a phrase shows up |
|---|---|
| **Path** | Not a path step by default (the path is curated). A course setting "לשלב את המשפטים שלי במסלול" (`inPath`, `types.ts:962`) lets due phrases appear as an optional review node in the current unit. |
| **Today** | A "הדרן" card when a phrase has a key in progress or a review is due: "ii–V ב־<bdi>F</bdi> · <bdi>Db</bdi> ב־♩168 · 3 דק׳". Candidates go through `todaysItems` (`ladder.ts:275`) like custom drills (`App.tsx:1351`). |
| **Workout** | The lick-review block (`workout2.ts:62`, `:180`) becomes "licks & phrases": 2–4 minutes from the review share, due reviews first, else the next key of the most recent phrase in progress. `inWorkout` respected. |
| **Diary** | Measured minutes booked as technique (`bookDrillTake`, `practice.ts:222`) with the phrase name; the day lists the recordings (§6.7). Plateau detection (`plateau.ts`) covers phrase items like drills (same `ItemState`). |
| **Key mastery** | Each phrase key is an item with a key: it feeds the per-key heat map and "weak keys first". |
| **XP / leagues** | XP per measured take from the phrase's own difficulty, tempo, key and cleanness (§10) — not a flat `lickXp` (`licks.ts:424`) — plus promotion bonuses, with a daily cap per phrase that scales with difficulty. XP feeds the single weekly league (per-course breakdown, memory "leagues per course"). |
| **Level test** | Not tested (player-made content). The ratings engine receives `RatingEvent`s from phrase takes under the technique/improv skills with a reduced weight (0.5), so own material helps but cannot define a level. |

Only measured takes count anywhere (owner rule). Listening, trimming and editing earn nothing.

---

## 10. Phrase difficulty and XP

The owner: *drilling C–D–E in all 12 keys should not give much XP, unless maybe at ♩150; a longer phrase with
enclosures, pivots, two hands gives more — even in three keys; and it differs between instruments and voice.*

So the app **measures the phrase itself**. A deterministic, versioned model computes a difficulty on the app's own
rating scale; XP, skill ratings and league points come from it. No AI is needed to score (and none is used) — the AI
"explain" (Sonnet, per the AI decisions) may only put the model's one-line reason into a longer sentence on request.

### 10.1 The scale

Difficulty is expressed on the same scale as every built-in level: **700–1900**, where `G(grade) = 700 + 90·grade`
(`src/engine/levelPlacement.ts:23`; Debut 700 · G1 790 · … · G8 1420 · beyond 1510+, cap 1900, `levelPlacement.ts:6`,
`:18`). So a phrase sits next to built-in content: "your phrase ≈ grade 6" means what it means on the path, and its
rating events are comparable to the drills' (`RatingEvent.difficulty`, `src/engine/rating.ts:42`).

A phrase does not have one difficulty; it has a function:

```
D(phrase, instrument, hands, key, bpm) = clamp(700, 1900,
      700 + M(phrase, hands)                    // material: what the notes ask, any key, any tempo
          + P(phrase, instrument, hands, key)   // physical cost on this instrument in this key
          + T(phrase, instrument, bpm) )        // tempo demand, scaled by the material
```

The **badge** shows `D` in the home key at the target tempo; the plan screen shows how it changes per key and tempo.

### 10.2 Material M (instrument- and key-independent, 0–600 points)

All features are computed on the selected phrase after quantisation, against its chord context (§5.3). Definitions are
generic and stated here so they can be tested; no method-specific claims.

| Feature | Definition | Why |
|---|---|---|
| **Effective length** `n_eff` | Notes after compressing repetition: the phrase is parsed into cells (2–6 notes); a cell that repeats exactly or transposed (same intervals and rhythm, a sequence) counts its notes at 0.25 after the first time. `n_eff = n_new + 0.25·n_repeated`. | A sequence of one short cell is easier than the same length of new material. |
| **Bars / span** | bars, and the longest run of notes without a rest (in beats) | Endurance and memory. |
| **Rhythmic density** | median notes per beat | More notes per beat at the same tempo = harder. |
| **Syncopation** | share of onsets on metrically weak positions not followed by a strong-position onset (a Longuet-Higgins–Lee style weight per onset, averaged) | Off-beat phrasing is harder to place. |
| **Subdivision mix** | count of beats whose subdivision differs from the previous beat (duple ↔ triplet ↔ 16ths), and tuplets | Switching grids is hard. |
| **Intervals** | mean absolute interval; share of leaps > 4 semitones; largest leap; direction changes per note | Leaps and zig-zags cost accuracy (and, on voice, much more). |
| **Range** | highest − lowest (semitones) | Wide range = more shifts / registers. |
| **Chromaticism** | share of notes outside the chord-scale of their chord (or of the key when there are no chords) | Outside notes are harder to hear and to find. |
| **Approach notes** | a note a semitone (or a scale step) away that resolves by step onto a chord tone on a stronger beat | A recognised device; harder than a plain scale step. |
| **Enclosures** | a chord-tone target on a strong beat preceded, within the last 2–4 notes, by notes both above and below it within a whole step | A recognised device; counted per occurrence. |
| **Direction pivots on chord tones** | a change of melodic direction on a chord tone in the middle of an arpeggio or scale run (generic definition: the run reverses at a chord tone and continues in the new direction ≥ 2 notes) | Turning a line on a target is harder than a straight run. |
| **Non-chord tones on strong beats** | share of strong-beat notes that are not chord tones (tensions and passing tones placed on the beat) | Harmonic difficulty; also the "sophisticated" signal for jazz phrases. |
| **Hands** | 0 one hand; parallel octaves +; contrary motion ++; independent (LH rhythm differs: IOI pattern correlation < 0.5) +++; plus density of simultaneous onsets | Two-hand independence is the largest single jump. |
| **Triviality** | a stepwise run inside one scale with ≤ 1 direction change, or repeated notes, with `n_eff ≤ 6` | Flags scale fragments (C–D–E) for the anti-gaming factor (§10.7). |

`M = Σ wⱼ · φⱼ(feature)` with each φ a saturating curve (e.g. `log2(1 + n_eff)`, `min(1, x / x₉₅)` where `x₉₅` is the
95th percentile over the built-in corpus), so no single feature runs away. Weights are fitted (§10.8).

### 10.3 Physical cost P per instrument and key (0–250 points)

Computed on the phrase **as transposed and placed in that key** (§7.4), so the same phrase is worth more in a key that
is genuinely harder *for it* on *this* instrument.

**Keys (piano)** — from the transposed notes and the suggested fingering:
- black-key density (share of notes on black keys) — weighted by *where*: a thumb or 5th finger on a black key costs
  most;
- thumb-under / finger-over crossings per note, and crossings that land on a black key;
- stretches beyond an octave, and fast repeated same-finger notes;
- for two hands, the sum of both hands plus a coordination term when both have crossings at the same time.

**Guitar / bass** — from the chosen position and strings in that key:
- position shifts per bar and their size (frets), string skips (non-adjacent strings in succession), stretches beyond
  the 4-fret span (6 with "stretch"), barre needs; high-fret cramping above the 12th fret and very low positions on
  bass add a little;
- the "same shape in every key" choice makes keys nearly equal (P varies only by fret height), while open-string
  phrases make E, A, D, G (guitar) and E, A, D, G (bass) cheaper and their opposites dearer.

**Voice** — against the singer's saved range (the voice course's measured range):
- notes outside the range: not scored for that key (the key is "out of range", §7.4);
- tessitura: the mean distance of the phrase from the comfortable middle of the range, and time spent in the top
  quarter;
- largest leap and leaps per second; breath length (the longest span without a rest, in seconds, at the tempo);
- crossings of the singer's register break (when known), counted per crossing.

A small fixed **key table** (per instrument) is used only for the UI hint before a phrase exists (e.g. the keys
picker colours) — never for scoring:

| Instrument | Easiest → hardest (typical, for scale-like material) |
|---|---|
| Piano | C, G, F → D, Bb, A, Eb → E, Ab → B, Db, F#/Gb (note: B and Db major *scales* sit well under the hand; the per-phrase computation decides) |
| Guitar | E, A, G, D, C (open strings) → F, Bb, B → Eb, Ab, Db, F#; with movable shapes ≈ equal |
| Bass | E, A, D, G → C, F, B, Bb → Eb, Ab, Db, F# |
| Voice | not by key — by the singer's range (above) |

### 10.4 Tempo T (0–450 points)

Tempo demand is measured as **notes per second** at the given tempo, `nps(bpm) = density · bpm / 60`, relative to an
instrument reference `nps_ref` (keys 8, guitar 7, bass 6, voice 4) — the speed at which a graded G8 player plays
running lines:

```
r = nps(bpm) / nps_ref
T = 450 · m̂^0.6 · r² / (1 + r²)        (saturating at 450; 225·m̂^0.6 at r = 1; m̂ = M / 600 in 0..1, floor 0.15)
```

- The curve rises slowly at moderate tempi and steeply as the tempo approaches the instrument's limit, then saturates.
- **Scaled by the material**: the `m̂^0.6` term means trivial material at an extreme tempo earns a **moderate**
  amount (C–D–E as 16ths at ♩150 on piano ≈ 830, about grade 1–2), while a complex line at the same tempo earns far more.
- The **rubato** and **quarters** stages use `T = 0` and are worth little (§10.5).

### 10.5 XP formula

Per measured take:

```
XP = round( base(D₀) × tempoFactor × keyFactor × clean × novelty )      then capped per phrase per day
```

- `D₀` = the phrase's difficulty *without* tempo, in this key: `700 + M + P(key)`.
- `base(D₀) = 1 + 11 · x^1.2`, `x = (D₀ − 700) / 1200` → 1 XP at 700, ≈ 4 at G5 (1150), ≈ 7 at G8, 12 at 1900. (The
  built-in clean lick take gives 5 today, `licks.ts:424` — the same order.)
- `tempoFactor`: rubato 0.3 · quarters 0.4 · at tempo `0.5 + 0.5 · (T / 225)`, so 0.5 at a slow tempo up to 1.5 at
  the top of the curve. Trivial material is capped at `1 + m̂` (≈ 1.1 for C–D–E).
- `keyFactor`: `1 + P(key) / 500` for the take (harder keys weigh more), and per newly **passed** key a promotion
  bonus with diminishing returns — the n-th key passed gives `B · base(D₀) / √n` (B = 3) — plus **all-12 completion**
  `6 · base(D₀)`. A take in a key already passed (maintenance) has `keyFactor × 0.5`.
- `clean`: clean 1.0 · almost 0.4 · not 0.15 (the existing 5 / 2 / 1 ratio).
- `novelty` (anti-gaming, §10.7): 1.0 normally, down to 0.1.
- A clean take at tempo always earns at least 1 XP (the habit is worth something).
- **Daily cap per phrase** `= 20 + 50·x` (20 for trivial, 70 for the hardest); promotion bonuses count toward it but a
  completion bonus is always paid in full (once).

Worked examples (piano, clean takes; illustrative numbers before calibration):

| Phrase | D at target | One clean take at target | Passing 3 keys | All 12 (total incl. bonuses, over days) |
|---|---|---|---|---|
| C–D–E, quarters, 12 keys, ♩100 | 715 (trivial) | 1 XP | ~4 | ~25 (novelty 0.3 applies) |
| C–D–E as 16ths at ♩150 | ≈ 830 | 1 XP | ~5 | ~35 |
| 4-bar RH bebop line, 2 enclosures, a pivot, ii–V–I, ♩200 | ≈ 1330 (G7) | 8 XP | ~45 | ~330 |
| Same line, two hands (LH shells, independent rhythm), ♩180 | ≈ 1520 | 10 XP | ~55 | ~420 |

The two-hand line in three keys earns more than C–D–E in all twelve — the owner's requirement.

### 10.6 Ratings, skills and leagues

- Each measured take at tempo emits one `RatingEvent` (`rating.ts:42`) with `difficulty = D(key, bpm)`, `score` = the
  take's graded accuracy, and **tags** like the games' (`src/engine/gameRating.ts:38`): `technique/phrase` 0.5,
  `agility/speed` 0.2 (more as `r` rises), `transpose/keys` 0.2 for non-home keys, `improv/vocabulary` 0.1 when the
  phrase came from an improvisation or has chord context; voice: `singing/line` instead of technique. The course
  sub-rating (`instrument/piano-tech` etc., `rating.ts:82`) receives the same event. Own-material events carry weight
  0.5 (§9) and `capGain` (`rating.ts:95`) already prevents a rating from jumping above the material's difficulty.
- **Leagues**: XP as above; the daily caps and the novelty factor make own phrases a fair, not dominant, XP source.
- **Community boards** (§12) rank by mastery, not XP; a shared phrase shows the same difficulty badge for every
  player on the same instrument (voice: per the singer's range).

### 10.7 Anti-gaming

- **Trivial material** (§10.2 triviality flag): novelty 0.3; never more than 1 XP per take at quarters/rubato.
- **Duplicates / near-duplicates**: each phrase gets a transposition- and tempo-invariant fingerprint (interval
  sequence + quantised rhythm, cells normalised). Similarity to the player's other phrases by a banded edit distance
  over (interval, duration) tokens; ≥ 0.85 similar to a phrase already passed in that key → novelty `1 − sim` (min
  0.1), and the two share one daily cap.
- **Self-edited easy copies**: a phrase whose source is another phrase (edit, trim, simplification) inherits the
  parent's cap and its passed keys; dropping notes to make an "easy" version earns only for the keys the parent has
  not passed.
- **Editing after progress**: changing notes of a phrase with progress creates a new version; progress carries over
  only if the change is small (≤ 2 notes), else the rank restarts (the old one stays in history).
- **Only measured takes count** (owner rule); MIDI timing sanity (§12.5) applies to XP too: a sequencer-perfect take
  earns nothing.

### 10.8 Calibration against the built-in content

The built-in corpus already has placed difficulties: every technique level has a rating from `LEVEL_PLACEMENT`
(grade-cited, `levelPlacement.ts:1–18`), the licks have levels 1–5 and tempo rungs (`licks.ts:292`), pieces have
verified grades. Every built-in item is a `Drill` with expected notes and a target tempo — so the model's features
can be computed on all of them.

1. **Compute** `M`, `P(home key)`, `T(target)` features for every built-in technique level (piano, guitar, bass),
   every lick (in C and in its hardest key) and every graded piece excerpt (8-bar windows), and for vocal items with
   `voiceItemRating` (`levelPlacement.ts:143`).
2. **Fit** the weights per instrument by ordinal (rank-preserving) regression of `D` onto the placed rating, with
   non-negativity on weights and an L2 penalty; hold out 20 % of families (not items) to test generalisation.
3. **Targets**: Spearman ρ ≥ 0.8 against the placements on the held-out families; mean absolute error ≤ 90 points
   (one grade); no family's levels out of order.
4. **Property tests** (tests/phraseDifficulty.test.ts): adding notes never lowers `M`; a faster tempo never lowers
   `D`; replacing new material by a repeat of a cell lowers `M`; C–D–E at any tempo ≤ the easiest built-in lick at its
   start tempo; two hands ≥ one hand of the same notes; a black-key-heavy phrase on piano costs more in the keys that
   put the thumb on black keys.
5. **Version** the model (`phraseDiffV`) — weights only change in a release, with a test snapshot of the corpus, so a
   player's XP never moves under them mid-week.
6. **Done (v2, `PHRASE_DIFF_V = 2`, piano):** 72 grade-cited piano levels (improvisation, pedal, gig left out); a level's
   D = the median over its items at their target tempo; a drill's chart is its chord context; without chords an
   approach / enclosure counts only when chromatic. Weights of M, piano P and the tempo curve (amp 480, m̂^0.75,
   nps_ref 7) fitted by coordinate search (loss = mean error / 100 + 4·(1 − ρ) + the worked examples as bands, six
   starts, floors on the named devices). Spearman ρ 0.59 → **0.84**, mean error 240 → **144** (k-classic 0.93 / 104,
   k-read 0.84 / 232, k-pop 0.71 / 117, k-first 0.68 / 126, k-tpair 0.61 / 147, scales 0.36 / 85, control 0.50 / 59).
   Holding out families (tpair + pop; read + first; classic + scales + control) gives ρ 0.14 / 0.76 / 0.71 on the held-out
   part: the families' placements reflect things the notes don't show (sight-reading, playing with a band, curricular
   order), so the 90-point target is not met yet. Scores are never stored: every badge / preview / XP is computed when
   shown, so v1 phrases read v2 numbers on load.
7. **Done (owner-approved recommendation, 2026-11-16): the calibration set is the note-measurable levels.** Levels
   placed by a skill the notes don't show leave the set, as improvisation / pedal / gig already did: the sight-reading
   quick-study levels **k-read 13–15** (changing metres at sight, a lead sheet with band hits, any key with a 30-second
   look) and every level **played with the band** (k-tpair 9, 11–16: vamp, ii–V–I, comping a chart, blues, side-slip,
   8-bar form, symmetric pairs). 62 levels remain: Spearman ρ **0.81**, mean error **123** (k-classic 0.93 / 104,
   k-read 0.84 / 161, k-pop 0.71 / 117, k-first 0.68 / 126, scales 0.36 / 85, control 0.50 / 59, k-tpair −0.27 / 131 on
   its 9 band-free levels — "spread across two hands" (placed 1560, model 1032) and "block chords" (1640 / 1382) are
   placed above what their notes show). A refit on the 62 (same coordinate search, same floors and anchor bands) found
   no real gain (ρ 0.809, mean error 122), so the v2 weights stay (`PHRASE_DIFF_V = 2`; anchors unchanged: C–D–E 710 at
   ♩100 ≈ 1 XP, two-hand bebop ≈ 1540 ≈ 10 XP; guitar / bass / voice terms untouched). The test locks n = 62, ρ ≥ 0.80,
   mean error ≤ 126 and the per-family numbers. The 90-point target stays open: what remains is the families'
   curricular order, which needs observed pass rates (8) rather than more note features.
8. **Later**: compare with observed data (pass rates vs players' ratings; an item whose empirical difficulty — the
   rating at which players pass it half the time — drifts > 150 points from the model is listed for review).

### 10.9 In the UI

- **Badge** on every phrase card, plan screen and challenge page: a small outlined chip "דרגה 7 · 1330" (grade from
  `G⁻¹`, the rating in Rubik small) — no colour coding by difficulty (no traffic lights).
- **One-line why**, the three biggest contributors in words: "שתי ידיים · עטיפות · 9 צלילים לשנייה ב־♩160", or for a
  trivial phrase "שלושה צלילים בסולם — שווה מעט נקודות" (honest, not scolding).
- **XP preview** on the plan screen: a compact strip per key in the plan's order (the key's physical cost shown as a
  thin bar under the key name) and a tempo row — "♩120: 4 · ♩160: 6 · ♩200: 8 XP לניסיון נקי" — plus the completion
  bonus "כל 12: +48". The preview updates as the target tempo or keys change.
- **Why?** expander: the feature list with their contributions in points (the model is transparent), and "להסביר"
  (AI explain) for a sentence in plain words, optional.

### 10.10 Risks

| Risk | Mitigation |
|---|---|
| Weights fitted on graded classical/technique material misjudge jazz or rock phrases | Include the lick library and the jazz/prog technique families in the fit; the property tests; owner review of 20 sample phrases per instrument before release. |
| Fingering/position heuristics wrong → wrong P | P is capped (250) and shown in the "why"; the player's own fingering/position choice is used when set. |
| Voice range unknown | Use the course's default range for the voice type until measured; mark the badge "משוער". |
| Mic-graded takes less precise | Same XP; the measurement already discounts unclear takes (they don't count). |
| Long random-note phrases inflate M | They are genuinely hard to play cleanly (measured); 8-bar limit; daily cap. |
| Model changes upset players | Versioned weights; changes only with release notes. |

---

## 11. Teacher flow

### 10.1 Making the assignment

In TeacherLoop's assign sheet, a new kind **"משפט" (phrase)** beside lesson/topic/drill/chart/piece
(`AssignKind`, `teacher.ts:5`). Three ways to fill it:

1. **Play it now**: a Record-mode strip inside the sheet (MIDI, or audio on a monophonic instrument); auto start/end;
   trim to ≤ 8 bars (Q5: 16 for teachers?); key and chords detected, editable.
2. **From my phrases / my recordings**.
3. **From the lick library** or a span of a piece.

Then: **target tempo** (and optional start tempo), **keys** (all 12 / the ring picker / "home key only"), **order**
(the app's easiest-first or cycle of 4ths), **hands** (RH / LH / both / "one then both"), **due date**,
**strictness** (lenient / moderate / strict → 0.6 / 0.75 / 0.9, `teacher.ts:110`), **with the band** (yes/no), a note.
One sheet, no scrolling on a phone (the less-used fields sit behind "עוד אפשרויות").

**Instrument (done 2026-11-16):** the sheet's first row picks the instrument the class plays it on — piano, guitar,
bass or voice (default: the picked phrase's own, else the teacher's course instrument). It travels in the phrase code
(`i`); off the piano the phrase is one line (hands do not apply). The student runs it on that instrument whatever
course is open, with their own part-1 placement (same-shape neck position per key, the singer's range); progress,
the key map and the submissions are per instrument (`metrics.inst`; the teacher's strip counts only the assignment's
instrument; old submissions read piano).

### 10.2 The student

- The assignment shows in Assignments and in Encore with a "מהמורה" tag and the teacher's name; Today shows it first
  while due ("מהמורה: ii–V ב־<bdi>F</bdi> · עד יום ה׳").
- Opening it shows the teacher's own playing first (notes rendered with the app's piano; the teacher's audio if they
  attached it), then the plan — locked fields (target, keys, hands) are shown with a small lock glyph; the student can
  still practise slower and in any order.
- Progress is the same 12-key map, with the teacher's required keys outlined.

### 10.3 Submissions and grading

- Automatic: each passed key sends one submission row via `submitResult(score, minutes, metrics)` (`teacher.ts:86`),
  score = the best clean take's accuracy × timing factor at ≥ the target tempo, metrics = `{ key, bpm, acc, timingSD,
  hands, takes }`. The assignment is "passed" when all required keys pass at the strictness threshold.
- The teacher's inbox shows a compact row per student: the 12-key strip with required keys, best tempo, minutes, and a
  play button for the student's best take **only if the student attached it** (notes are always available — small and
  part of the assignment; audio only by the student's choice per submission).
- The teacher comments with the existing marks (great / good / again) and a short text (`commentOn`, `teacher.ts:88`).

### 10.4 Sync model

| Data | Goes to the server? | Size |
|---|---|---|
| The assigned phrase (notes, chords, plan) | yes, in the assignment's `ref` payload / a `toneturn_phrases` row | ≤ 4 KB (≤ 8 bars: ~64 notes × 6 B + chords + plan JSON) |
| Teacher's audio of the phrase | only if attached | ≤ 30 s, ≤ 300 KB (48 kbps) in a private storage bucket, class-readable |
| Student progress per key | yes, as submissions | ~200 B each |
| Student's best take | notes: yes (≤ 4 KB); audio: only if the student attaches it | ≤ 30 s audio |
| All other recordings | **never** | — |

A teacher can **share with a class** (all students), and the class board shows "who has it in how many keys" if the
teacher enables it (class board visibility exists, SPEC-SOCIAL §9).

---

## 12. Community: shared phrases as challenges

### 11.1 The model: "TikTok challenges for musicians" — in our register

The loop is the familiar one: **post a short phrase → others take the challenge → their results appear on the
phrase's board → they reshare**. What is different, by design:

- **The currency is measured mastery**: tempo reached, keys passed, cleanness. A board row is "♩208 · 12 סולמות · 98 %",
  never a like count. There are **no follower counts** and no public play counts.
- **Short clips, not video, in v1**: the phrase is note data (rendered with the app's instruments) plus an optional
  ≤ 20 s audio clip of the sharer's own playing.
- **No infinite scroll, no autoplay**: the feed is a finite, curated page (this week's featured phrase, ~10 trending,
  friends' new phrases) with a clear end ("זה הכול לשבוע הזה"); nothing plays until tapped.
- **Mature, quiet design**: the same cards and type as the rest of the app; reactions are words, not emoji.

**Video later?** Worth a look only after the audio loop proves itself (v4+). Costs: a 20 s 720p clip is ~4–8 MB vs
~0.12 MB of audio (40–60× storage and bandwidth), moderation becomes much harder (faces, minors, backgrounds),
recording video while measuring MIDI/mic on iOS adds sync and memory risk, and it pulls the product toward
performance-for-likes. Recommendation: not before there is a real community; if added, friends-only first.

### 11.2 Sharing a phrase

From a phrase (or "yours" moment) → **"לשתף"** sheet:

- **Title** (prefilled, editable), **context** (chords/key, from the phrase), **level** (auto: 1–5 from note rate at
  target, range, chromaticism, hands — editable one step), **instrument**, **style tag** (bebop, blues, Barry
  Harris, modal, gospel, rock, classical, voice…).
- **Include my audio clip**: off by default; when on, the player picks a ≤ 20 s span of one of their takes of the
  phrase.
- **Who sees it**: **friends** (default) · my class · everyone (community). Young-player mode: friends/class only, no
  audio, no community (matches SPEC-SOCIAL §9).
- **Attestation** (one line, required once per share): "זה משפט שלי — לא לחן או הקלטה של מישהו אחר." (This is my own
  phrase — not someone else's melody or recording.)
- **Credit**: the sharer's nickname, flag and picture icon (by their privacy settings, SPEC-SOCIAL §2); "anonymous on
  boards" players appear as "נגן/ית" + icon.
- **Challenge settings** (defaults from the sharer's own plan): target tempo, keys (all 12 / home only), hands.

### 11.3 The challenge page

Opened from the feed, a friend's activity item, or a link:

- The phrase on a staff + chords, a play button (app instruments), the sharer's clip if any, the target ("♩200 · 12
  סולמות · שתי ידיים").
- **"לקבל את האתגר"**: adds it to Encore with the challenge's plan; the player practises through the same
  rubato → ladder → keys path. Nothing about the challenge skips the measured ladder.
- **The board** (per phrase): rows ranked by mastery score = keys passed at target (primary), then best clean tempo,
  then cleanest take accuracy; each row: rank number, nickname + icon, "12 סולמות · ♩208 · 98 %", input badge ("MIDI"
  / "מיק׳"), date. Tabs: "חברים" (default when the player has friends) · "כולם". The sharer's row is pinned with a
  small "יוצר/ת" tag. Rows offer "להאזין" only when that player attached audio.
- **"Beat my tempo"**: from your board row, send a friend a challenge link fixed at your tempo and keys (extends the
  existing `createChallenge` "beat" kind, `community.ts:136`, with `kind: 'phrase'`).
- **Weekly featured phrase** ("משפט השבוע"): one phrase chosen by an editor (the owner, at first) from shared phrases
  or the app's own; Today shows it once on Monday; its board resets weekly; finishing it in ≥ 4 keys counts toward the
  weekly friend quest.
- **Duet / streak hooks**: a duet pair can pick a shared phrase as this week's duet piece — both bars on one card
  (keys passed each); practising it counts as a duet practice day (extends `duetAction`, `social.ts:264`).
- Reactions: **"בראבו"** (one tap, counted back to the sharer like the existing cheers, `community.ts:107`) and
  **"למדתי את זה"** (automatic when someone reaches f on your phrase — the most meaningful signal a creator can get).
  No free-text comments in v3 (moderation, young players); fixed phrases only ("משפט יפה", "קשה!", "תודה").

### 11.4 Discovery

The **Community → "אתגרי הדרן"** page: featured this week (one large card) · from friends (new and recently passed) ·
trending (most "learned it" in 7 days, not most played) · filter chips: course/instrument, level 1–5, style, context
(ii–V, blues…). Search by title/tag. Each card: title, sharer, mini staff, level, the 12-key strip of *my* progress if
I took it, "N נגנים הגיעו ליעד" (a count of people who mastered it — the one number we show, because it is mastery).

### 11.5 Fairness, XP and anti-cheat

- XP from a challenge phrase follows the same difficulty model as any phrase (§10), with the same daily cap; **no XP for posting**, and no
  XP for reactions. A sharer earns a small fixed bonus (+5) when someone reaches f on their phrase, max 50/week —
  rewards making good material, not volume.
- Results are computed on the device from measured takes and sent as `{ keys, bestBpm, acc, source, digest }`. The
  server checks **plausibility**: note rate at the claimed tempo under the instrument ceiling (§7.1); a result can
  only rise by ladder steps over time (no jump from nothing to 12 keys at target in one minute: each key needs ≥ 3
  takes on 2 days per the pass rule); takes per minute within human limits.
- **MIDI timing sanity**: a take whose onsets have SD < 3 ms from the grid and identical velocities looks like a
  sequencer playing back the phrase — it is graded but marked "לא נמדד כנגינה" and does not enter boards. Mic takes
  are marked "מיק׳".
- The `digest` (a hash of per-note onset deviations + velocities of the best take) lets an admin request that take's
  notes on a report. Audio fingerprinting is **not** required.
- Reporting: "דיווח" on any board row or phrase → the existing report sheet (`reportUser`, `community.ts:33`) with
  new reasons "לא המשפט שלו/ה" (copied/copyrighted) and "תוצאה לא אמינה" (implausible result). Automatic action: 2
  distinct reports of "copyrighted" hide the phrase pending review; 3 "implausible" reports hide that board row.

### 11.6 Safety and legal

- Only the player's own phrases; the attestation; max 8 bars; audio ≤ 20 s of their own playing.
- **No copyrighted recordings**: shared audio must come from the app's own recording of the player (the share sheet
  only offers takes recorded in the app, never imported My song files).
- **No melodies of copyrighted songs**: a **known-melody check** (feasible partly): an index of interval + rhythm
  n-grams of the heads and melodies the app knows (standards' heads in `src/content/mini/heads.ts`, the pieces corpus)
  plus a curated list of famous riffs; a match ≥ 6 consecutive notes asks "זה לחן מוכר? אפשר לשתף רק משפטים שלך" and
  blocks community sharing (friends/class sharing of a short quote for study stays allowed). It cannot catch
  everything — the attestation and reporting cover the rest. Short jazz vocabulary (a few notes over a ii–V) is common
  property and is not blocked.
- **Age**: young-player mode (under 13) — no community, no audio sharing, class/friends only; community posting
  requires 13+ (see Q7 for 16+ on audio).
- **Server data**: note data + optional small audio; the owner can delete a shared phrase (its board goes with it)
  and their results at any time; account deletion deletes all.

### 11.7 Why this spreads

A share produces a **link + a card image** (title, a mini staff, "♩200 · 12 סולמות", the app's mark) — the card
looks like a page of a serious practice book, which musicians post. The link (`…/#/p/CODE`, 8 opaque characters,
nothing personal in the URL, like the existing challenge links) **opens even for non-users**: the phrase plays in the
browser with the app's instruments, the notation shows, and they can try it on the on-screen keys in free time
without an account; signing up is needed only to post a result to the board. Privacy defaults travel with it: a
friends-only phrase's link requires being a friend (or sends a friend request on open, as challenge links do today);
public phrases show nickname only; audio only if the sharer included it.

### 11.8 Server model (sketch — not run; the owner dry-runs migrations)

```sql
-- shared phrases (note data inline; audio in a storage bucket)
create table toneturn_shared_phrases (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users on delete cascade,
  code          text unique not null,            -- 8 opaque chars for links
  title         text not null check (char_length(title) <= 60),
  instrument    text not null,                   -- piano | guitar | bass | voice
  level         smallint not null check (level between 1 and 5),
  style         text, context text,
  home_key      smallint not null check (home_key between 0 and 11),
  data          jsonb not null check (pg_column_size(data) <= 16384),  -- notes, chords, meter, swing, plan
  audio_path    text,                            -- storage: phrases/<owner>/<id>.m4a  (≤ 400 KB)
  visibility    text not null default 'friends' check (visibility in ('friends','class','public')),
  class_id      uuid,
  status        text not null default 'live' check (status in ('live','held','removed')),
  attested_at   timestamptz not null,
  featured_week date,
  created_at    timestamptz not null default now()
);
create table toneturn_phrase_results (
  phrase_id  uuid references toneturn_shared_phrases on delete cascade,
  user_id    uuid references auth.users on delete cascade,
  keys_clean smallint not null default 0, best_bpm smallint, best_acc real,
  source     text check (source in ('midi','mic','screen')), digest text,
  audio_path text, flagged boolean not null default false,
  first_at timestamptz default now(), updated_at timestamptz default now(),
  primary key (phrase_id, user_id)
);
create table toneturn_phrase_reactions (
  phrase_id uuid references toneturn_shared_phrases on delete cascade,
  user_id uuid references auth.users on delete cascade,
  kind text check (kind in ('bravo','learned','nice','hard','thanks')),
  created_at timestamptz default now(), primary key (phrase_id, user_id, kind)
);
-- RLS (sketch):
--  select phrases: status='live' and not blocked(owner,me) and (visibility='public'
--                  or (visibility='friends' and is_friend(owner, auth.uid())) or (visibility='class' and in_class(class_id, auth.uid()))
--                  or owner_id = auth.uid())
--  insert/update/delete phrases: owner_id = auth.uid(); not young(auth.uid()) for visibility='public'; rate limit 10/day
--  results: insert/update only own row, through rpc toneturn_phrase_result(...) which runs the plausibility checks
--  reactions: own rows only; 'learned' only via the result rpc
--  storage bucket 'phrases': write own folder; read follows the phrase's visibility (signed URLs, 1 h)
```

Sizes: a phrase row ≈ 2–6 KB; a result row ≈ 150 B; an audio clip ≤ 400 KB. 10 000 shared phrases with 20 % audio ≈
60 MB DB + 0.8 GB storage — fine on Supabase's paid tier.

---

## 13. Data model

### 12.1 The phrase: a `Lick` with a plan (extend, do not duplicate)

```ts
// src/engine/licks.ts — Lick gains optional fields; built-in licks are unchanged.
export interface Lick {
  id: string; ctx: LickContext | 'free'; level: number; name: T2;
  chords: LickChord[];           // [root above tonic, quality, beats]; [] = no harmony (drone)
  notes: LickNote[];             // [semi above tonic, beat, dur]
  straight?: boolean; own?: boolean;
  // ── v3 (Encore). All optional. ──
  v?: 3;
  /** Left-hand notes for two-hand piano phrases (same [semi, beat, dur], semi from the tonic an octave below). */
  lh?: LickNote[];
  /** Per-note extras parallel to notes / lh (velocity, fingering, guitar string/fret in the home key, articulation). */
  marks?: (PhraseMark | null)[];
  lhMarks?: (PhraseMark | null)[];
  meter?: 3 | 4 | 5 | 6;         // beats per bar (6 = 6/8 in eighths)
  pickup?: number;               // beats before the first downbeat
  swing?: number;                // 0.5 straight … 0.67 hard swing (overrides `straight`)
  homeKey?: number;              // the key it was played in (0–11), shown first
  minor?: boolean;
  instrument?: LickInstrument;   // the instrument it was made for
  plan?: PhrasePlan;
  source?: PhraseSource;
  createdAt?: string;
  folder?: string; tags?: string[];
  shared?: { code: string; visibility: 'friends' | 'class' | 'public' };
}
export interface PhraseMark { vel?: number; finger?: number; string?: number; fret?: number; acc?: boolean; stac?: boolean; tech?: ExpNote['technique'] }
export interface PhrasePlan {
  startBpm: number; goalBpm: number;
  keys: number[] | 'all';
  order: 'easiest' | 'fourths' | 'chromatic' | 'weak' | 'custom';
  hands: 'R' | 'L' | 'RL' | 'R-then-RL';
  band: boolean;                 // the target stage is with the band
  position?: 'same' | 'per-key'; // guitar / bass
  locked?: ('goalBpm' | 'keys' | 'hands')[];   // set by a teacher / challenge
  inToday?: boolean; inWorkout?: boolean; inPath?: boolean;
}
export type PhraseSource =
  | { kind: 'take'; takeId: string; fromBeat: number; toBeat: number }   // My recordings
  | { kind: 'record'; takeId: string }
  | { kind: 'lick'; lickId: string } | { kind: 'piece'; pieceId: string; bars: [number, number] }
  | { kind: 'pattern'; drillId: string }                                   // converted CustomDrill
  | { kind: 'teacher'; assignmentId: string; teacher: string }
  | { kind: 'shared'; code: string; by: string };
```

Phrases live where own licks already live: `LickBook.own` (`licks.ts:492`). `LickBook` gains `patterns?: string[]`
(ordering of CustomDrills in the unified library) and `phraseRank?: Record<string, number>` (cached rank for the
promotion moments; recomputable from items). Progress per key is `ItemState` in `progress.drillItems` under
`lick:<id>:<inst>:<key>[:<hand>]` — no new progress store.

### 12.2 Recordings

```ts
// src/storage/recordings.ts (new) — IndexedDB 'toneturn-recordings', behind an interface (memory fallback).
export interface RecSession { id: string; startedAt: string; endedAt: string; course: CourseId | null; route: string; measuredMs: number; takeIds: string[]; audioId?: string /* session recording */ }
export interface RecTake {
  id: string; sessionId: string; at: string; durationMs: number;
  course: CourseId | null; instrument: LickInstrument | 'drums';
  kind: 'drill' | 'lick' | 'phrase' | 'chart' | 'improv' | 'guided' | 'record' | 'piece' | 'vocal' | 'song' | 'level-test';
  itemId?: string;               // drills / licks / phrases: the ItemState id
  title: T2 | string;            // auto title or the player's name
  sung: boolean; source: 'midi' | 'mic' | 'screen';
  notes?: Uint8Array;            // packed (pitch, Δonset, dur, vel); absent for pure-audio takes without pitch
  bpm?: number; meter?: number; t0?: number;    // beat 0 in seconds when the tempo is known
  chart?: string;                // chord chart text when played over one
  backing?: { kind: 'chart' | 'drill' | 'song'; ref: string; bpm: number };  // to re-render the band
  result?: { verdict?: Verdict; acc?: number; bpm?: number; score?: number };
  audioId?: string; audioBytes?: number; audioType?: string;
  star?: boolean; folder?: string; tags?: string[]; deletedAt?: string; prunedAt?: string;
  phraseIds?: string[]; sharedTo?: ('teacher' | 'friends' | 'public')[];
}
export interface RecPlaylist { id: string; name: T2 | string; takeIds: string[]; loop: 'one' | 'all' | 'ab'; ab?: [number, number] }
```

Synced metadata (opt-in for notes): `Settings.recordingsIndex?: { id; at; title; star; folder; phraseIds }[]` for
starred/foldered takes only (≤ 200 rows ≈ 20 KB).

### 12.3 Teacher and community

- `AssignKind` adds `'phrase'`; `AssignItem.ref` holds the shared phrase id; the phrase lives in
  `toneturn_shared_phrases` with `visibility = 'class'` and `class_id` (one table for teacher and community).
- `submitResult` metrics for phrases: `{ key, bpm, acc, timingSD, hands, takes, notes?: base64 packed }`.
- `createChallenge` gains `{ kind: 'phrase'; code; bpm; keys }`.

### 12.4 Migration

- **CustomDrill**: no data change. The library reads `settings.customDrills` and shows them as patterns; the creator
  stays the editor for patterns. `CustomDrill.v` stays ≤ 2. "Make it a phrase" writes a new `Lick` with
  `source: { kind: 'pattern', drillId }`; the pattern is kept.
- **Own licks** (`LickBook.own`, from `lickFromPhrase`): read as v3 phrases with defaults (`homeKey` from the first
  note, `plan` = lickTempos' start/target, keys all, order fourths — their existing items keep their ids, so no
  progress is lost). `lickFromPhrase` is fixed to take detected chords/context instead of forcing `major-251`.
- **Vocal kept takes** (`toneturn-takes`): copied once into `toneturn-recordings` as audio takes (kind 'vocal'),
  then the old database is left in place for one version and removed after.
- `settings.keepTakes` → renamed meaning "keep audio of mic takes"; existing `true` stays on; `undefined` becomes on
  only after the one-time explanation sheet (Q2).

### 12.5 Sizes

| Thing | Size |
|---|---|
| One phrase (8 bars, two hands, plan, marks) | 2–6 KB JSON in settings (synced) |
| 200 phrases | ≤ 1 MB — settings JSON grows; above 100 phrases, phrases move to their own synced row (`toneturn_phrases`, owner-only) to keep the profile upsert (`cloud.ts:132`) small |
| A take's notes | ~6 B/note → a 2-min drill take ~2 KB |
| A take's audio | 0.36 MB/min at 48 kbps |
| A rendered MIDI take for background play | AAC 64 kbps ≈ 0.48 MB/min (cached, prunable) |

### 12.6 Offline

Everything except sharing/teacher sync works offline. Teacher submissions and challenge results queue locally
(like the existing results queue) and send when online; a phrase received from a teacher is cached on open.

---

## 14. Algorithms

### 13.1 Onsets and beat from MIDI

- Notes from MIDI note-on/off with the device latency removed (calibration, `DrillCalibration`, `types.ts:740`).
- Tempo without a click: inter-onset intervals (IOIs) → a histogram on a log-tempo axis (40–320 ♩) with harmonic
  folding (×½, ×2, ×⅔ for triplets); the peak gives the beat period; then a **beat tracker** (the same dynamic
  programming as `trackBeats`, `beatTrack.ts:188`) on an onset-strength signal synthesised from the MIDI onsets
  (velocity-weighted impulses smoothed at 30 ms). Downbeat: the bar phase that maximises (a) onsets on strong beats,
  (b) chord changes on bar lines (if chords are detected), (c) phrase starts after rests near bar lines.
- With a click or band: beats are known exactly; skip detection.
- **Swing**: per beat, the ratio of the first 8th's IOI to the beat; median over beats with two 8ths → swing 0.5–0.72.

### 13.2 Onsets and pitch from audio

- Monophonic (voice, guitar single lines, bass, horns): the existing pitch capture frames (YIN-style, 20 ms hop) →
  notes by stable-pitch segmentation (≥ 60 ms within ±40 ¢, onset on energy rise or pitch jump > 70 ¢), pitch rounded
  to the nearest semitone after the take's median tuning offset is removed (a guitar tuned 15 ¢ flat still reads
  right). Vibrato is smoothed (median over 120 ms).
- Piano by mic (polyphonic): the existing piano-mic path (used for drills with `pianoMicOnly`, `types.ts:994`) for
  takes against known notes; for **free** polyphonic audio, v1–v2 only extract the top line (the melody, highest
  salient pitch per frame) with a "קו עליון בלבד" note and low confidence; full polyphonic transcription is v3 (the
  AI transcription plan, SPEC-AI).
- Beat and meter: `beatGrid` (`beatTrack.ts:325`) with its confidence; below `BEAT_CONFIDENT` the take is treated as
  rubato (bar lines are *suggested* from phrase breaks and the player confirms the tempo by tapping 4 beats — "הקישו
  4 פעמות").

### 13.3 Key / tonal centre and chords

- If played over a chart: exact; the key is the chart's key.
- Otherwise: **Krumhansl–Kessler** key profiles against the duration- and metric-weight-weighted pitch-class profile
  of the selection (the existing `detectKey`/`keyWeights`, `chordTrack.ts:344`/`:373`), plus a **jazz template
  pass**: score ii–V–I, ii–V, minor ii–V, blues and dominant-vamp templates over the bar-wise pitch-class sets
  (chord-tone hits on strong beats, guide tones 3/7 weighted). If a template beats plain key-finding by a margin, the
  chords come from it ("<bdi>Gm7 | C7 | Fmaj7</bdi>"); else chords are left empty and only the key is proposed.
- Confidence = the margin between the best and second-best key/template, mapped to ●●● / ●●○ / ●○○. Relative
  major/minor ties are shown as a two-chip question.
- For a single-line phrase without harmony, "tonal centre" is what matters for transposition: if the key is
  ambiguous, any choice transposes identically — only the spelling and the chord context change, so the app may
  proceed even at low confidence.

### 13.4 Phrase segmentation (auto-suggested boundaries)

Candidate boundaries scored by: rest length (≥ a quarter at tempo is strong), a long note followed by a rest
(cadence), arrival on a chord tone of a tonic/target chord, bar-line proximity, and melodic repetition (a motif
restarting — reuse `motifReturns`, `improvPhrasing.ts`). Candidate phrases = spans between strong boundaries of 1–8
bars; ranked by a "worth keeping" score: note density near the player's typical, rhythmic variety, chord-tone
landings on strong beats (the `phraseOrg` rubric, `TakeMetrics.phraseOrg`), contour arc, timing cleanness of the take
(steady phrases first), and not being a simple scale run. Top 3 offered.

### 13.5 Quantisation

Swing-aware grid: after beats are known, each onset gets the nearest of {beat, swung 8th (beat + swing×beat),
16ths, 8th-triplets}, with a cost that prefers the simplest grid consistent with neighbours (dynamic programming over
the bar, penalising a switch between duple and triplet within a beat). Durations snap to the next onset minus a gap,
rests ≥ an 8th are kept. Chords: onsets within 40 ms (as `quantizePlayed`, `custom.ts:763`). The player's slider
picks strict / swing-aware / as-played.

### 13.6 Hands split

Two-voice assignment by dynamic programming over the onsets: a cost for each hand's span > an octave+2, crossing, and
large jumps; a prior from the register (below ~E3 LH). MIDI from split keyboards uses the split. The player's split
line overrides.

### 13.7 Transposition and placement

Semitone shift as §7.4; spelling by key + chord; for guitar/bass, positions by a shortest-path over (string, fret)
choices per note (the existing placer with a shape-preserving term: cost 0 for the same relative fingers as the home
key). Voice: octave choice minimising notes out of range (weights for each semitone outside).

### 13.8 Grading

No new grader: each (phrase, key, hand) becomes a `Drill` through `lickDrill` (`licks.ts:304`), extended for `lh`,
`meter`, `pickup`, `swing`, and the drills engine measures it (accuracy, timing SD, evenness, hands together) with
the existing rubato/ladder/pass rules. "As played" phrases use their played onsets as the reference and a timing
window ×1.5.

**Sung phrases (done 2026-11-16).** A voice run uses the drill take's single microphone capture (never a second
stream — iOS refuses one), so the SingLane grader (frames against a target lane) is not reused there. Instead the
sung path's pitch rule matches the course's one pass band: a steady sung pitch within ±`passCents` (65 ¢ below 1300,
60 ¢ from 1300 — the phrase's own rating) of a written note counts as that note, octave kept; anything else rounds to
the nearest semitone as before (`engine/drills/sungPitch.ts`, `Drill.sungTolCents`). Timing keeps the voice's limits
(`VOICE_TIMING`). Built-in sung licks get the same band at the course's middle value (65 ¢).

### 13.9 Risks and fallbacks

| Risk | Fallback |
|---|---|
| Wrong tempo by ×2 / ×½ | Show "♩160 או ♩80?" chips; the roll redraws on choice. |
| No steady beat (rubato playing) | Treat as rubato; ask to tap 4 beats; or keep it rubato-only (free-time stage only, no tempo ladder until the player sets one). |
| Wrong key / chords | One tap to fix; the phrase transposes the same anyway (§14.3). |
| Audio pitch errors (octave jumps, noise) | Octave-error correction by continuity; low-confidence notes dashed; the player fixes in §5.4. |
| Polyphonic piano by mic | Top line only (v1–v2), explicit. |
| iOS mic + recording | One stream (`pitchCapture` pattern); if `MediaRecorder` is missing, keep notes only. |
| Storage full | Ask with a size list (§6.2); notes always kept (tiny). |
| Background playback stops on iOS when not installed | Show "התקינו את האפליקציה למסך הבית כדי לשמוע ברקע" once. |

---

## 15. Storage, offline, iPhone memory

- **Never hold a long take as PCM in memory**: decode audio only for the visible span; waveforms are precomputed peak
  arrays (one value per 10 ms, ≤ 18 KB per minute) stored with the take. A 3-minute decoded mono buffer at 48 kHz is
  ~35 MB of Float32 — too much to keep around on older iPhones; we decode on demand and release.
- MIDI rendering for background play runs in an OfflineAudioContext in 30 s chunks, encoding as it goes.
- The library list virtualises rows and loads thumbnails lazily (IndexedDB cursor by date, 30 at a time).
- Analysis (beat, key) of audio runs in the existing chunked, yielding style (`beatTrack.ts` `yieldEvery`) or a
  worker; MIDI analysis is instantaneous (≤ 3 000 notes).
- Peak memory budget for Encore screens: ≤ 60 MB above the app's baseline on an iPhone 12 (same rule of thumb as the
  sampled instruments). Test on the owner's iPhone with a 10-minute improv take.

---

## 16. Accessibility, RTL, edge cases

- **RTL**: the screens are RTL, but **musical time runs left → right** in every roll, score, waveform and map (as on
  the staff today); the handles, playhead and "next" arrows follow musical time, not reading direction. Note names,
  chord symbols, tempo marks and bar ranges are `<bdi>`-isolated. Hebrew copy is short (memory "compact questions").
- **Screen readers**: every note in the roll/score is reachable as a list ("תיבה 2, פעמה 3, <bdi>Db5</bdi>, שמינית,
  מוקדם 40 מ״ש"); handles are sliders with bar values; the 12-key map is a table with row/column headers; marks are
  announced in words after a take, not during.
- **Keyboard (desktop)**: ←/→ moves the focused handle by a bar (Shift: a beat), Space plays, L loops, A/B set
  points, [ ] speed.
- **Colour**: marks never rely on colour alone (fill vs tick vs hollow vs small pitch label); contrast checked with
  `contrast.mjs`/`yellow.mjs` (memory "readable contrast"); lemon is only an outline/now-line with ink, never a pale
  background behind icons.
- **Reduced motion**: the now-cue jumps per beat instead of gliding; the "yours" card appears without animation.
- **Edge cases**: a phrase of one note or a trill (refuse < 3 notes: "קצר מדי למשפט"); 8 bars of 32nd notes (allowed,
  note-rate cap warning); odd meters (5/4, 7/8 as 2+2+3) — meter chips include them in v2; tempo changes inside a
  take (the selection takes the local tempo); a phrase over two keys (modulating) — the home key is the first; the
  plan transposes the whole; drums (rhythm phrases: Encore for drums is a v3 question — the drum groove bank and lanes
  could host "keep this fill"); a phrase recorded on guitar practised on piano (allowed; transposition window changes;
  the source instrument is kept); deleting the source recording (the phrase keeps its notes; the "then" take in the
  yours moment becomes its first measured take).
- **Resume**: trim, plan and run state are saved after every change; a take interrupted by a call resumes at the same
  key/rung (owner rule).

---

## 17. Where it lives in the app

- **Practice page → Train** (SPEC-IA-2: Technique · Improvise · Games): Encore becomes the **first** Train card,
  "הדרן — המשפטים שלי", with the due count. The Drills hub keeps a link "תבניות שלי" for patterns.
- **Sidebar (desktop) / tab bar**: a new entry **"הדרן"** under Practice, and **"ההקלטות"** as its own entry — the
  owner asked for the most accessible place; recordings are not a sub-page of one course. On the phone, the bottom
  bar keeps its current tabs; Recordings and Encore are the first two rows of the "Practice" page's header area
  (two small icon buttons beside the page title: the repeat-note glyph and a waveform glyph), reachable in one tap
  from Practice and from every take review.
- **Take reviews**: "לשמור משפט" (Keep) and "להקלטה" (open this take in the player).
- **Today**: the Encore card (§9), the weekly featured phrase on Mondays (v3).
- **Diary**: each day's recordings; the journal can attach a recording.
- **Tools**: unchanged (Record mode is not a tool; it lives in Encore).

---

## 18. Phased delivery

### v1 — "Keep it and own it" (local, no server changes)

- Recordings store: notes of every measured take, audio of mic takes (single-stream on iOS, Charts moved onto it),
  sessions; retention, quota, prune-to-notes; migration of vocal kept takes.
- Recordings library: timeline by date, filters, rename, star, delete (30-day bin), player with whole/A–B loop and
  speed with pitch kept, open-in-Encore, simple "all takes of this item" list.
- Encore: "Keep this phrase" in improv/charts/guided improv/drill/lick reviews; the recent-takes shelf; trim on roll +
  score with ≤ 8-bar handles, snap, suggested boundaries; key/chords/meter/swing detection with override; note fixes;
  quantise slider; hands split (piano).
- Plan: target tempo, rubato → quarters → ladder, 12-key order (easiest first / 4ths / choose), hands, carry-over.
- Practice run on the drills engine, live marks, one-line feedback, the 12-key × tempo map, ranks pp → ff, the
  "yours" moment with then-and-now.
- Library "המשפטים שלי" (phrases + patterns), migration of own licks and custom drills, Record mode for **MIDI**.
- Difficulty model (§10) with the piano physical cost: badge, one-line why, XP preview; fitted on the built-in corpus
  with the property tests; rating events with tags.
- Connections: Today card, workout block, diary, key mastery, XP with cap, friends' activity item.
- Placement: Train first card, sidebar entries, take-review buttons.

### v2 — "Any instrument, any source, with a teacher"

- Record mode by **audio** (voice and monophonic instruments; piano top line); tap-tempo fallback.
- Guitar/bass position planner (same shape per key), voice range transposition, and their physical-cost terms in the
  difficulty model (§10.3).
- Fingering suggestions; meter chips for odd meters; "LH shells" option.
- Teacher: phrase assignments (record in the sheet, locked fields, auto-graded submissions, optional audio), class
  sharing; the `toneturn_shared_phrases` table with `class`/`friends` visibility (dry-run migration first).
- Recordings: folders/tags, search, bulk actions, playlists, **lock-screen/background playback** (rendered MIDI,
  bounced A–B, Media Session), **A/B compare**, export audio/MIDI, opt-in session recording, optional sync of notes.
- "Use it" counted toward ff.

**Closed 2026-11-16:** teacher phrases on guitar / bass / voice (§11.1); voice on the key-mastery map; the sung pitch
band = passCents (§13.8); the whole-session switch also on an exercise's gate page; the quarters stage for pickup
phrases and Keep's bar span after a pickup; calibration on the note-measurable levels (§10.8.7); a recordings folder
as one .zip (stored, audio or .mid per take) and a phrase as MusicXML (from v3, the phrase screen's "⋯"). Still open:
the optional sync of take notes (needs a server table and a restore path on another device — not started).

**Closed 2026-11-17 (client built; server and flags pending the owner):**
- *Sync of take notes* (§6.2): table `toneturn_take_notes` (owner-only RLS, ≤ 300 rows, notes ≤ 64 KB base64, never
  audio) in `20261207000000_toneturn_take_notes.sql` — NOT applied; client `src/cloud/takeNotes.ts` behind
  `VITE_TAKE_NOTES_SYNC=1` / localStorage `tt.flag.takeNotes=1` (off by default) plus the player's switch in Settings →
  My recordings. Starred / foldered / phrase takes go up; a take another device lacks comes down with its notes only
  ("notes from another device"); metadata merges three-way; a deletion moves the take to the bin elsewhere.
- *Fingering* (§5.6): piano suggestion by a shortest path over fingers (`encore/fingering.ts`, the drills' rules as
  costs), per key from that key's pitches; the player's own numbers in the home key win (`marks[].finger`); the plan's
  "Fingering" opens the fingering screen (`#/encore/fingers/<id>`, one bar at a time, tap to change, switch for practice).
  Guitar / bass keep the position fingering of §7.4. Help only, never graded.
- *Meter chips* (§5.3): 4/4 · 3/4 · 5/4 · 6/8; 6/8 counts eighths (the grid's tempo doubles, the drill has pulse 8 in
  3 + 3, tempos show ♪, MusicXML writes 6/8). 7/8 is left out (the phrase's meter field holds no grouping).
- *LH shells* (§7.5): root–3rd–7th or root–7th–3rd per chord, chosen by voice leading (roots E2–E♭3); 6 / m6 chords get
  root and 3rd only. The shells become the phrase's left hand (`lhShells`), so the plan practises R, L, together; the
  right hand's items keep their ids. Piano phrases in one hand with chords only.
- *Calibration* (§10.8.3 / §10.8.8): `encore/calibration.ts` — the empirical difficulty of an item from (rating, passed)
  observations on the Elo scale, the target check (ρ ≥ 0.8, mean error ≤ 90, families in order) and the > 150-point
  review list. The model's weights are unchanged; the 90-point target is measurable once pass data is gathered (no
  server aggregate exists yet).
- *Sharer's bonus* (§11.5): +5 XP per friend at the target on my phrase, once per friend and phrase, ≤ 50 a week, as a
  `challenge-learned` result (it counts in the league; never a practice day). *Today*: one shared phrase (a friend's,
  else the week's), small, dismissible on this device.

### v3 — "Challenges"

- Sharing with friends and the community, the challenge page and boards, "beat my tempo" links, the public web
  preview for non-users, the weekly featured phrase, duet hooks, reactions, the known-melody check, reports with the
  new reasons, plausibility checks in the result RPC, admin queue additions.
- Polyphonic audio transcription for free piano takes (the AI transcription plan).
- MusicXML export; drums "keep this fill" (if the owner wants it).
- Video clips: not planned; reconsider after the audio loop has real usage (§12.1).

---

## 19. Open questions for the owner (product only)

1. **Name**: Encore / הדרן with the subtitle "המשפטים שלי" — OK? (Alternatives: Phrasebook / ספר המשפטים, Lick Lab /
   מעבדת ליקים.)
2. **Audio by default**: keep the audio of every mic take automatically (with a clear switch), replacing today's
   opt-in "keep one take a week"? I recommend yes — hearing yourself is the point — with the one-time explanation.
3. **Storage budget**: 500 MB for audio by default, and turn unstarred audio older than 60 days into notes-only? Or a
   different budget/period?
4. **"Yours" = all 12 keys** at the target tempo (voice: all keys in range). Or may a player-chosen subset (e.g. the
   4 keys of a tune) also reach "yours", marked "4 מתוך 12"?
5. **Length**: hard limit 8 bars for everyone, or 16 bars for teacher assignments?
6. **XP**: phrase XP from the difficulty model (§10): a trivial cell earns ~1 XP a take, a two-hand bebop line ~10, capped 20–70 XP per phrase per day — agreed? Should own material count in
   the weekly league at all (my recommendation: yes, with the cap)?
7. **Community age**: community sharing from 13 (as other social features), but **audio clips in public only from
   16**? Or 13 for both?
8. **Public audio**: allow the sharer's audio clip on public phrases, or note data only in public and audio only for
   friends/class?
9. **Teacher grading**: submissions graded automatically by strictness (as other assignments), with the teacher's
   comment optional — or must the teacher confirm each passed phrase?
10. **Pricing**: are Encore and My recordings in the free tier (with limits — e.g. 5 phrases, 1 GB?) or part of the
    paid plan? (Launch order puts pricing before polish.)
11. **Session recording**: do you want the "record the whole practice session" option in v2, or is per-take enough?
12. **Weekly featured phrase**: will you pick it yourself at first (an admin screen), or should the app pick the
    most-learned phrase of the week automatically?

## 20. Owner decisions (2026-11-16)

The owner accepted every recommendation:
1. Name: **Encore / הדרן** ("המשפטים שלי · My phrases").
2. Audio of every mic take is kept by default, with a switch to turn it off (replaces the opt-in "one take a week").
3. Audio budget 500 MB; unstarred audio older than 60 days becomes notes only (starred is kept).
4. "Yours" requires all 12 keys; a chosen subset shows as "4 מתוך 12" and does not reach f.
5. Up to 8 bars; up to 16 bars for teacher assignments.
6. The XP model with its daily cap per phrase is accepted; own phrases count in the weekly league.
7. Community from age 13; public audio only from 16.
8. Public phrases may carry audio: only the sharer's own playing, up to 20 s.
9. Teacher submissions are graded automatically; the teacher can override.
10. Pricing: recordings and basic Encore free; a limit on the number of active phrases in the free tier (the number is the owner's later call).
11. Whole-session recording: yes, in v2.
12. The weekly featured phrase is chosen by the app; the owner can replace it.

### 20.1 Reactions and gifts between friends (owner, 2026-11-16 — built behind the challenges flag)

- **Reactions** replace "Bravo": **הדרן! / Encore!** (the Encore glyph) and three compliments — **גרוב** (Groove — the time
  feels great), **צליל** (Tone — the sound), **רעיון** (Idea — the line). Each once per viewer and phrase (a toggle), never on
  one's own phrase; per-kind counts reach the sharer only ("my shares", the sharer's challenge page). No public counts,
  no emoji. Board rows carry no reactions. Rules: `src/engine/encore/gifts.ts`; UI: `src/ui/encore/Reactions.tsx`.
- **Gifts** (`#/challenges/gifts[/<friend>[/dedicate]]`, also from a friend's row in Community, the challenge page of a
  friend's phrase, and the "For you" card in Community → Activity):
  - **One gift per practice day** (owner, same day): after today's 5 measured minutes a player may send ONE gift — a
    fermata OR a dedication. Today's allowance only; nothing accumulates. Copy: "מתנה אחת ליום תרגול — נשארה לך היום" /
    "המתנה של היום נשלחה" / "תרגלו היום כדי לשלוח מתנה". The server enforces it (unique (sender, day); the client sends
    today's measured ms as proof, or a result on the server that day counts).
  - **פרמטה / Fermata** — a streak freeze for the friend: an entry `kind: 'fermata'` in the synced purchase list (free,
    id `gift-<gift id>`). It holds the first missed day after it arrives (before the player's own freezes, so the gift is
    what holds it); the calendar draws a fermata on that day. Not capped by the two own freezes (sanity bound 7).
  - **הקדשת משפט / Dedicate a phrase** — one of my own Encore phrases (not a teacher's, not a taken challenge, not one
    dedicated to me) with an optional note (≤ 140 chars; none to or from a young player). It lands in the friend's
    library marked "הקדשה מאת <name>". When they make it "yours" (rank f) both get **+20 XP**, once per side (server
    flag per side + a local grant key). **Personal XP only**: it raises the total and the day's goal ring; it is never
    posted as a lesson result (so the weekly league, summed on the server from results, does not count it) and makes
    no rating events. A quiet line on the "yours" screen: "ההקדשה הושלמה".
  - **תרגל איתי עכשיו / Practise with me now** — up to **3 invites a day**, each open 30 minutes; a session ends after
    2 hours. My measured time counts from the moment the session is active on my device (practice ledger, measured
    only; the server caps it by the time since it started). A small live mark shows "יחד עם <name>" while both gained
    measured time within the same 10 minutes. When both reach 5 measured minutes, that day counts for the duet streak
    (a duet starts as active if the pair had none).
  - Anti-automation only: 60 gifts + invites an hour and 60 reactions an hour per player (never met in normal use).
- **Notifications**: gifts, invites and completed dedications join the one merged social push a day (quiet hours, the
  "duets" notification setting), Hebrew first, no emoji (`supabase/functions/_shared/socialPush.ts`).
- **Server**: reactions in `20261204000000_toneturn_phrase_challenges.sql` (edited in place — not applied yet); gifts,
  together sessions, duet days, the push kinds in `20261205000000_toneturn_friend_gifts.sql` (after it). Not building:
  sound as a gift, XP boosts, gems.
