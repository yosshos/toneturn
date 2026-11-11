# The prog / band engine (2026-11-10)

Shared engine pieces for the prog and jazz levels of the **bass** (`BASS_NICHE_PLAN.md`), **guitar**
(`GUITAR_DEEPENING.md` §4.3) and **drums** (`DRUMS_NICHE_PLAN.md` §2, §5) courses. Built once, before any course
content. This page is the contract for the course agents that follow.

Every field below is optional on `Drill`. A drill without them runs exactly as before: the same clicks, the same
backing, the same analysis. `tests/progEngine.test.ts` checks this on every drum, bass and guitar level drill (the
click plan and the drum hits are compared with the old code). The synthetic-take sweeps are unchanged.

Units, as everywhere in the drills engine: a **drill beat** is a quarter note, or an eighth when `drill.pulse === 8`.
The take's `bpm` counts drill beats in the **first** bar. Times are ms from beat 0.

| Piece | File | Main API |
|---|---|---|
| 1. Meter per bar | `src/engine/drills/timeline.ts` | `MeterSpec`, `withBarPlan`, `buildTimeMap` / `timeMapOf`, `clickPlan`, `staffLines` |
| 2. Tempo map | `timeline.ts` (+ `progAnalyze.ts`) | `Drill.tempoMap`, `MODULATIONS`, `metricRatio`, `tempoChecks` |
| 3. Band unison and polymeter | `src/engine/drills/bandTimeline.ts` | `Drill.unison`, `Drill.bandMeter`, `drillDrumHits`, `drillBandHits`, `unisonLine`, `realignBeat` |
| 4. Road map | `src/engine/drills/roadmap.ts` | `FormPlan`, `applyForm`, `expandForm`, `analyzeForm` |
| 5. Analysis rules | `bassAnalyze.ts`, `guitarAnalyze.ts`, `progAnalyze.ts` | `downbeatCt` rule, `anticipate`, `swingWalk`, `doubleStopMatch`, `withProg` |
| Groove bank | `src/engine/grooves.ts` | 5/8, 7/8 rotations, 9/8, 11/8, 13/8, 15/8 grooves with `groups` |

---

## 1. Meter per bar

```ts
interface MeterSpec { num: number; den: 2 | 4 | 8 | 16; groups?: number[]; unit?: 4 | 8 | 16 }
interface MeterChange { bar: number; meter: MeterSpec }      // Drill.meters
parseMeter('7/8 2+2+3')      // { num: 7, den: 8, groups: [2, 2, 3] }
parseMeter('4/4 3+3+2/8')    // 4/4 grouped 3+3+2 in eighths (unit 8)
```

- **Build a drill:** `withBarPlan(drill, ['7/8 2+2+3', ['4/4', 2], '7/8 3+2+2'], tempo?)`. It sets `meters` (changes
  only), `tempoMap`, `meter` (the **first bar's** length in drill beats, so the count-in and old readers stay right)
  and `groups` for an eighth pulse. It throws when a bar isn't a whole number of drill beats. Any x/8 bar with an odd
  numerator needs `pulse: 8`. Write the notes bar by bar with `planBars(plan, pulse)` (start, length, group starts).
- **Default groupings** (`defaultGroups`): x/8 in 3s when it divides by 3; 5 = 3+2, 7 = 2+2+3, 8 = 3+3+2,
  11 = 3+3+3+2, 13 = 3+3+3+2+2. Without groups an x/4 bar groups by its quarters, even on an eighth pulse.
- **The time map:** `timeMapOf(drill, bpm)` (cached) gives `bars[]` (`start`, `beats`, `meter`, `groups`, `sigChange`,
  `ms`, `bpm`), `msAt(beat)`, `beatAt(ms)`, `bpmAt(beat)`, `barAt(beat)` and `position(beat)` → `{ bar, inBar, group,
  inGroup }`. Past the last bar the last meter repeats.
- **Analysis:** `analyze.ts expTimeMs` uses the time map for any drill with `meters` or `tempoMap`. So `analyzeTake`,
  `analyzeGuitarTake` (and the bass measures) and `analyzeDrumTake` all time a mixed-meter or modulating take
  correctly with no other change. Swung 8ths sit at 2/3 of their own beat. `progAnalyze.notePositions` names each
  note's bar, beat-in-bar and group.
- **Click and count-in:** `clickPlan(drill, bpm, { drums })` → `{ clicks, wood, countIn, responseAt, responseEnd,
  at(beat) }`. `DrillTake` now uses it. Old drills get the old plan. On a timeline drill:
  - the count-in is one bar of the first meter at the first tempo, with clicks on its group starts (`count: true`);
  - then a click per drill beat, heard on group starts only, with the bar's 1 accented (`level` 2 / 1 / 0 is in the
    plan; the audio plays accent / normal);
  - the click mode (`one`, `24`, `gap`, `fade`, `and`) is read per bar;
  - `at(beat)` is the backing's clock (it follows the tempo map).
- **Notation:** `staffLines(drill, perLine = 8)` gives lines of whole bars in quarter notes. Each bar has `len`, `cur`
  (its signature), `sig` (only where the meter changes) and beam `groups` for x/8 bars. `beamGroupAt(drill, q)` gives
  the beam-group start. `DrillStaff` uses these for timeline drills, and `NoteStaff` takes a `bars` prop: bar lines at
  each bar's end and a time-signature note where it changes.
- **Groove bank** (`grooves.ts`): `Groove.groups` (accents). New grooves: `five-8` (3+2), `five-8-23`,
  `seven-8-322`, `seven-8-232` (beside `seven-8` = 2+2+3), `nine-8-333` (beside `nine-8` = 2+2+2+3), `eleven-8`
  (3+3+3+2), `eleven-8-22322`, `thirteen-8` (3+3+3+2+2), `fifteen-8` (7+8 = 2+2+3+2+2+2+2). The kick is on the 1
  and the snare (or kick) on each group start. `defaultAccents(beats, den, groups?)` accents group starts. The
  metronome offers 11, 13 and 15 and shows a groove's group accents. Use the grooves as `drill.drums.groove` (bass,
  guitar, drums) or in `drums.sections` per bar.

## 2. Tempo map (metric modulation)

```ts
interface TempoChange { bar: number; ratio: number }   // Drill.tempoMap: from `bar`, tempo = tempo before × ratio
MODULATIONS.tripletQuarterToQuarter   // 1.5   (120 → 180)
MODULATIONS.dottedEighthToQuarter     // 4/3   (120 → 160)
MODULATIONS.quarterToDottedQuarter    // 2/3 … also tripletEighthToEighth, quarterToTripletQuarter
metricRatio(from, to)                 // "old `from` becomes the new `to`" (values in quarter notes)
```

- The click, the count-in, the band and the analysis all follow it (one time map). `bpm` is the first bar's tempo.
  The ladder still raises it, and every section scales with it.
- **Check:** with `goal.prog.tempoRatio = { tol: 0.02, landMs: 30 }`, `withProg` measures each change. The played
  tempo before (up to 2 bars) and after (up to 2 bars) is the median written ÷ played IOI, so the rhythm doesn't
  matter. The check also finds the offset on the new 1. More than `tol` off lowers the verdict (over 2 × tol =
  "not"). A change it can't measure gives "almost". `m.prog.tempo[]` = `{ bar, want, got, err, land }`.

## 3. The band: unison part and polymeter

- **Unison** (`Drill.unison: { inst: 'bass' | 'guitar' | 'keys'; line?; transpose?; vel? }`): the band doubles a
  written line, separately from the comping. Without `line` it doubles the drill's own pitched notes. Use
  `transpose: 12` for an octave above, `-12` for an octave below and `-5` for a 5th below. It is silent in
  `band.rests` and in `tacet` sections. `unisonLine(drill)` gives the notes. The backing plays them under the
  headphones gate, like the rest of the band. Sound: bass on the bass samples; guitar and keys on the piano for now (a
  guitar voice in `NoteEvent.inst` is the sound track's call). **Measure:** `goal.prog.unison = { mean: 12, sd: 18 }`.
  `unisonLock` pairs each played onset with the band's note (± a quarter beat): mean offset (+ = behind the band),
  SD and n.
- **Polymeter** (`Drill.bandMeter: MeterSpec`): the band (drums and comping) counts its own bars on the same beat
  clock, for example a 7/8 riff (`meters`) over a band in 4/4. `bandBars(drill)` gives the band's bar grid, and
  `realignBeat(drill)` the first shared bar line (7/8 over 4/4 on an eighth pulse: 56). Chart bars follow the band's
  bars. The click follows the player's meter.
- **Drums on the timeline:** `drillDrumHits(drill)` is the old `drumHits` for old drills. On a timeline drill each bar
  plays its section's groove for the bar's own length, and a quarter-beat groove under an eighth pulse counts a
  quarter as 2 beats. The special section grooves are `'-'` (drums lay out) and `'stop'` (kick + crash on each 1).
- **Comping on the timeline:** `drillBandHits(drill)` is the old `bandHits` for old drills. Otherwise runs of bars
  with one style and one length use `bandComping` as before, and each x/8 bar gets a chord on each group start.
  `band.sections: { bar, style | 'tacet' | 'stop' }[]` change the style per bar.

## 4. The road map (sections)

```ts
interface FormSection {
  name: string; kind: 'intro'|'verse'|'pre'|'chorus'|'bridge'|'solo'|'interlude'|'head'|'tag'|'vamp'|'outro';
  bars: number; meter?: MeterSpec | string; chart?: string[]; groove?: string;   // '-' / 'stop' allowed
  band?: BandStyle | 'tacet' | 'stop'; feel?: '2'|'4'|'half'|'double'; tempo?: number /* ratio */;
  fillBefore?: boolean; hits?: number[]; dynamic?: 'p'|'mf'|'f'; cue?: { en; he };
}
interface FormPlan { sections: FormSection[]; order?: number[] }   // order: AABA = [0, 0, 1, 0]
```

- `expandForm(plan, pulse)` lists the sections in play order (`section`, `pass`, `startBar`, `bars`, `startBeat`,
  `beats`, `meter`). `spanAtBar(spans, bar)` finds the section a bar is in.
- `applyForm(drill, plan)` sets `beats`, the bar plan (`meters` and `tempoMap` from the section meters and tempos),
  `chart` (each section's chords over its bars), `drums` (`sections` with grooves, `fills` for `fillBefore`),
  `band.sections` (style / tacet / stop) and `form`. **The notes stay the course's job:** write the part per section
  with the course's generators. A 2 → 4 feel change means a section with `feel: '4'`, the walking groove, and the
  matching bass part; the rule that halves sound in 2-feel bars is per course.
- **Measure** (`analyzeForm(drill, bpm, played, { landingMs })`, also run by `withProg` when `drill.form` is set):
  - **Lost bars:** the take is aligned bar by bar against the form with a small dynamic program, using a shift of −2…+2
    bars, matching on pitch class (drums: the voice's note) within 0.2 beat. Changing the shift costs, so identical
    bars keep shift 0 until a section change shows the slip, and a tie puts the switch as late as possible.
    `lost[] = { bar, shift (+1 = a bar too many), section }`.
  - **Per section** (on the aligned positions): `hit` share, timing `mean` / `sd`, played `tempo` ÷ written
    (> 1 = rushing), and `landing` = |offset| of the note on the section's 1.
  - **Form:** `drift` = max |tempo − 1| over the sections; `landings = { ok, of }`.
  - **Goal:** `goal.prog.form = { lost: 0, landMs: 30, drift: 0.02 }`. A lost bar is "not", and its line becomes the
    "Why?" line even when the base verdict is already "not" (it is the cause of the wrong notes that follow).
- The road-map screen (sections as blocks, the current bar lit, a cue one bar ahead) is UI work for the first course
  that uses it. `expandForm` and `timeMapOf(...).barAt` give it everything.

## 5. Analysis rules

- **`downbeatCt` rule** (bass J2, Barry Harris): `goal.bass.rules = { kind: 'downbeatCt', chart, every }`. Every
  note on a downbeat (each `every` beats: 1 for an 8th line, 2 for beats 1 and 3 of a quarter walk) must be a chord
  tone. Notes between may be chord tones, tensions, or anything a step or less from the next note (the half-step
  rule's passing notes). Gate: `rules.downbeat ≥ 0.9` (under 0.75 = "not"). The usual `validShare` gate applies too.
- **Anticipation on target rules** (bass L1 tumbao, Latin jazz): `goal.bass.rules = { kind: 'target', chart,
  anticipate: 0.5 }`. A note half a beat before a chord change is that chord's landing (`land`, default any chord
  tone), and the downbeat after it is an ordinary note. Gate: `rules.anticipated ≥ 0.9` = share of the chord changes
  after beat 0 landed early. A missing slot counts as missed. Without the flag `target` is unchanged.
  `ruleCheck(kind, chart, notes, meter, maxMove, { every, anticipate })`.
- **Walking swing** (bass J1): `goal.bass.swingWalk = { long: 0.85, ride: [-20, -10], drift: 0.02, chorusBeats }`.
  - Long quarters: each note sounds ≥ 85 % of its beat, from mic release or MIDI note-off. Gate: 85 % of notes.
  - Placement vs the ride: the mean offset (+ = behind) against the swing groove's ride lane must sit in `ride`. Off
  by more than 15 ms = "not".
  - Drift: the played beat length of the first chorus vs the last.
  - Pure parts: `longShare`, `ridePlacement`, `chorusDrift`, `swingWalk`. Results in `guitar.bass.swingWalk`.
- **Double-stops / shells by chroma** (bass P4 L6–7, also usable for guitar): `goal.bass.doubleStops = 0.8`. Notes
  that share a `chordId` are one chord. The mean chroma 50–400 ms after its onset must hold every pitch class (≥ 25 %
  of the strongest) and no strong foreign class (≥ 60 %). Microphone only; without chroma it is not measured.
  `doubleStopMatch(frames, chords)`. Results in `guitar.bass.doubleStops`.
- **Group accents** (odd meters, guitar g-prog 4, drums d-prog 2): `goal.prog.groupAccent = 0.3`. The mean velocity
  of group-start notes minus the others, as a share of the take's velocity range. Not measured without loudness
  (mic pitch-only takes).
- **`withProg(m, drill, bpm, played)`** (`progAnalyze.ts`): `DrillTake` runs it on every result. It attaches
  `m.prog` (`positions`, `tempo`, `unison`, `groupAccent`, `form`) and can only lower the verdict. It returns
  untouched metrics for drills with none of: a timeline, `unison`, `form`, `goal.prog`.

---

## Left for the course agents

- **Content:** every level (`b-odd`, `b-poly`, `b-prog`, `b-swing`, `b-barry`, `b-latin`, `b-jform`, `g-prog`,
  `d-prog`, `d-song` …) still has to be written with these APIs: generators, glyphs, path slots, voice lines and
  synthetic-take sweeps per family.
- **Drums specifics** not built here: the coincidence rule (linear grooves), the limb ratio rule (polyrhythm between
  limbs), quintuplet / sextuplet subdivisions, tuplet brackets in `drumNotation.ts`, the per-limb verdict per section
  and the dynamics arc for `d-song`. `analyzeForm` and the time map are the base. Drum takes pass through `withProg`
  as notes with the voice's GM pitch.
- **Bass `kickLane`** (`bass.ts drillOf`) still uses the constant-grid `drumHits`. On a timeline drill, build it from
  `drillDrumHits(drill)` after `withBarPlan` / `applyForm`.
- **Old bar-based measures** (`barDrift`, `ioiDrift`, `fillLandings`, `ruleCheck`'s worst-bar pointer, drums'
  `silentBar`) still read `drill.meter` as a constant bar. On mixed-meter drills use the timeline measures above
  (`analyzeForm`, `notePositions`, `tempoChecks`), or pass bar starts from `timeMapOf`.
- **UI:** the road-map strip, a cue line one bar ahead, the beat dot's accent on group starts (it still uses
  `drill.meter`), and showing `m.prog` in the result. `DrumViews` lanes and the guitar tab view still draw constant
  bars (`DrillStaff` and `NoteStaff` handle mixed meters).
- **Sound:** a guitar voice for unison parts (today guitar and keys unisons play on the piano). A distinct
  group-start click level (`Click.level` is in the plan; `playTimeline` only knows accent / normal / count) is the
  sound track's call.
