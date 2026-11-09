# Bass course audit (2026-11-09)

Independent audit of the bass course (0.63.0, branch `redesign-v2`) against `docs/research/BASS_CURRICULUM.md`.
Read-only: no code was changed. Every claim below was checked in code. Claims marked **[run]** were also confirmed by a
throw-away vitest script (since deleted) that generated every level in every key on 4-, 5- and 6-string and drop-D
tunings, ran the pitch tracker on synthetic bass tones, and fed made-up takes to `analyzeGuitarTake`.

Short version: the **content** (14 families, 120 levels, generators) is broad, and most generated lines are musically
right. But the **measurement and pass path** has P0 holes. Because of them, most levels can't honestly be called
"validated":

1. **On a phone mic, pitch isn't checked for most bass notes.** The YIN tracker has a 70 Hz floor and a 2048-sample
   window. Every note from E1 to C♯2 (MIDI 28–37) returns no pitch [run]. That's the register `rootOf()` puts nearly
   every root in. Unpitched onsets are then *snapped to the expected note and scored correct*
   (`normalizeGuitarTake` step 4). A take made only of muted thumps, played in time, is **clean** on chord roots,
   ghost notes, the walking line and kick lock [run].
2. **A level passes on almost nothing.** A path step is "done" at 1 star. That means `min(3, items)` items with *one*
   clean take each, at *any* tempo (`ladderFacts.techStars`, `path.isDone`). The take can even be after pressing
   "Slower" down to 30 bpm. The stored level target tempo is never read. 23 levels have ≤ 2 items, so one or two clean
   takes pass them.
3. **The notation view draws bass in the treble clef** at sounding pitch (`DrillStaff` → `draw(rh,'treble')`), and
   **the tab view cuts every drill after 32 notes** (`DrillTab`: `Math.min(cols.length, 32)`). Most bass drills run
   40–130 notes.
4. **The "free choice" levels aren't free.** These are chord L8–9, walk L7 and L11, and read L6–8. The exact notes are
   written out and judged note-for-note: any other chord tone is "wrong" [run]. `walkRules()` exists but isn't used.
5. **No drums play during a take.** So every "lock with the kick", "follow the fills" and style level is really rhythm
   reading against a click.

---

## 0. How a bass take is judged today (verified)

| Step | Code | What actually happens |
|---|---|---|
| Capture | `DrillTake.tsx` → `BrowserPitchCapture` (`pitchCapture.ts`) | 2048-sample analyser, `yin(buf, sr, {minRms})` with the default **minHz = 70**, frame every ~25 ms by `setInterval` (`hopMs`) |
| Onsets | `guitarAnalyze.detectOnsets` | Energy rise. Pitch = median f0 20–80 ms after the onset, else `UNPITCHED` |
| Normalise | `normalizeGuitarTake` | Octave errors folded (≤ 24 st). **Unpitched onsets snap to the nearest single expected note and take its pitch** |
| Score | `analyze.analyzeTake` | Clean = 100 % accuracy, 0 wrong, no hesitation, CV/SD under the tempo-band thresholds (SD 30/25/20 ms, CV .05/.04/.03). **No \|timingMean\| check.** `chordTonesOnBeats` adds a factor but never relaxes exact-pitch matching (only the `harris` family gets that) |
| Bass extras | `analyzeGuitarTake` + `bassAnalyze.ts` | `asym`, `loudSd`, `crossing`, `kick` (kick lane = the written notes), `lengths` (**mic frames only**: skipped with MIDI even though MIDI has note-offs), `ghostDb`. Each can only lower the verdict |
| Item ladder | `ladder.applyTake` | 3 clean at goal → +4 %. `goalBpm` rises with no cap at the level target |
| Level done (hub) | `plan.levelDone` | ≥ 75 % of items have `cleanBpm > 0` (any tempo) |
| Path step done | `ladderFacts.techStars` ≥ 1 | `min(3, items)` items with one clean take each (any tempo). The next level opens |
| Placement | `Drills.tsx TechLevelTest.finish` + `bassProbes.ts` | Level = **tempo band of the best clean bpm − 1**, copied to seeded families. Levels below the start are ✓ "by test" |

---

## 1. Level-by-level conformance

Legend. **Impl**: Y = drill as the doc describes, P = partial (drill or measure differs), N = not built.
**Gate** = what really decides "clean" beyond the shared default (pitch + timing SD/CV, as in §0). "default" means
nothing bass-specific. Every row also inherits the global P0s above (mic pitch hole, 1-star pass, no tempo target).
Item counts are for the default key order **[run]**.

### F1 `b-pluck` (9)
| L | Impl | Drill / keys / tempo / sub vs doc | Gate in code | Doc pass | Notes |
|---|---|---|---|---|---|
| 1 | Y | Open strings 8 each + cycle, E, 60→100, 8ths ✓ | `loudSd ≤ 3 dB` | default + RMS SD ≤ 3 dB | **1 item**: one clean take passes the step |
| 2 | P | Same line in pairs; asym ≤ 8 ms / 2.5 dB ✓ | `asym` | asym ≤ 8 ms, 2.5 dB | 1 item. `oddEvenAsym` indexes odd/even by *played onset order*, so one extra or missed onset flips the parity for the rest of the take |
| 3 | Y | 1 and 2 per string ✓ | `crossing ≤ 8` | ≤ 8 ms | Open strings only, so with 1 per string *every* note is a crossing. `crossingPenalty` needs same-string notes too and returns null for option 0, so **the gate is skipped** |
| 4 | P | Octave shapes I-IV-V-I, 6 keys ✓ | `crossing ≤ 10` | + no ring-through on the skipped string | Ring-through not measured |
| 5 | P | 2 bars root + I-vi-IV-V in 16ths, 4 keys ✓ | default | CV ≤ .07, **drift ≤ 15 %** | No drift measure. The tempo-band CV limit (.03 at ≥ 5.5 notes/s) is *stricter* than the doc's .07 and hard on a mic |
| 6 | P | Accents on 1/e/&/a + crescendo ✓ | accent gap (velocity) / crescendo R² | +4 dB, R² ≥ .6 | Accent gap needs +15 velocity units (≈ 7 dB in `velOf`), stricter than the doc's 4 dB |
| 7 | P | Descending triads, 6 keys ✓ | `crossing ≤ 8` (all crossings, not only descending) | descending only | Placement makes 7-fret jumps on one string in an 8th (e.g. key D/G, f10→f3 on E) **[run]**. That defeats "raking across strings" |
| 8 | P | Gallop (8th+16+16) on i-♭VI-♭VII-i, E/A/D minor ✓ | default | ratio 2:1:1 ± 10 % | Ratio not measured, but onset timing against the written gallop is an implicit stand-in |
| 9 | P | Same line at the neck, then the bridge | default | centroid shift | **No centroid measure**: passes as plain timing. Tempo 80→80 |

### F2 `b-fret` (8)
| L | Impl | Drill vs doc | Gate | Doc pass | Notes |
|---|---|---|---|---|---|
| 1 | Y | `spider` opt 0, keys [A,G,F] as positions | default | default | |
| 2 | Y | 5 permutations | default | default | |
| 3 | P | 1-2-4 on the 2 lowest strings, keys F, G, B♭ | default | + self-check "used 1-2-4" | No self-check row. B♭ = fret 6 (not "½–II"); G = III |
| 4 | P | Major scale on one string (A or D) | default | **shift gap ≤ 40 ms** | No shift-gap measure. **Options 0 and 1 give identical notes in 2 keys** (string fallback collapses) **[run]** |
| 5 | P | 2-octave major, all 12 ✓ | default | + gap ≤ 40 ms | No shift gap |
| 6 | Y | 5-fret stretches low / high | default | default | |
| 7 | Y | Octaves / broken 10ths over I-IV-V-I, all 12 | default | default | 13 octave-shape jumps ≥ 7 frets in an 8th at bar lines **[run]** |
| 8 | P | Above fret 12 | default | exact octave | **Octave isn't checked**: `normalizeGuitarTake` folds octave errors to the written note |

### F3 `b-length` (7)
| L | Impl | Drill vs doc | Gate | Doc pass | Notes |
|---|---|---|---|---|---|
| 1 | P | Play/rest patterns, open + fretted ✓ | `lengths` (class: rest after the note = "short" ≤ .6) | ≤ 1 ring-through / 8 bars | A note-length proxy, not ring-through. Mic only (MIDI skips it) |
| 2 | P | Legato then staccato ✓ | `lengths` (full ≥ .75, short ≤ .6) | legato ≥ 85 %, staccato ≤ 55 % | Thresholds looser than the doc |
| 3 | **wrong** | Open E/A traps + high notes | `lengths` | no E/A sympathetic ring | **The "high" notes are placed on the A string (e.g. s3 f7, f11)** **[run]**, the very string that should stay silent. `releaseTime` uses total RMS, so idle-string ring isn't measured at all |
| 4 | P | Notes held to the "and" | `lengths` | release ±40 ms of target | Only "short" (≤ .6) is checked, so a staccato player passes. **Gameable** |
| 5 | P | Disco octaves | `lengths` (all "full") | overlap ≤ 30 ms | Overlap not measured. All-full lengths *reward* letting notes ring |
| 6 | Y | Thumb + palm mute | `palmMuteShare ≥ .75` | ≥ 80 % | OK (threshold .75 vs .80) |
| 7 | Y | Mixed written lengths | `lengths` ≥ 85 % | ≥ 85 % | Closest to spec. Mic only |

### F4 `b-time` (10)
| L | Impl | Drill vs doc | Gate | Doc pass | Notes |
|---|---|---|---|---|---|
| 1 | Y | Root quarters I-IV-V-I | default | default | **No \|timingMean\| ≤ 15 ms** anywhere in the engine |
| 2 | P | 8ths ↔ triplets | default | per-sub \|mean\| ≤ 15 | No per-subdivision stats |
| 3 | P | ♩→8→trip→16 | default | per-sub default | Same |
| 4 | Y | Click on 2 & 4 (`clickHeard`) | default (SD by band) | SD ≤ 22 | |
| 5 | Y | Woodblock on "and" | default | same | |
| 6 | P | Click on 1 only | default | **drift ≤ 20 ms / bar** | No drift measure |
| 7 | P | Click every beat 2 bars, on 1 for 2 bars, then silent | default | `heldSilent` through round 4 | Not `fadePlan` / `heldSilent`. One fixed fade per take |
| 8 | Y | Anticipations tied over the bar | default | default | |
| 9 | P | Random 16th rhythm cards | default | per-position bias | No per-position stats |
| 10 | P | 5/4, 7/4, 7/8 (2+2+3) | default + accents | + accent on 1 | **7/8 spec tempo 140 (eighth-note bpm) is above the level target 120** and shown as "♩ 140". The time signature on the staff reads 7/4 for 7/8 (meter = 7 beats) |

### F5 `b-pocket` (8): drums never sound
| L | Impl | Drill vs doc | Gate | Doc pass | Notes |
|---|---|---|---|---|---|
| 1 | P | Root on the kick lane (rock-8, rock-8b, pop-1, pop-2) | `kick ±25` (= the written notes) | ≥ 90 % lock, ≤ 1 stray / bar | No drums are heard, so this is rhythm reading. The kick list is the bass's own notes |
| 2 | P | Kick + 4-chord chart | `kick ±25` | + pitch | Same |
| 3 | P | Triplet shuffle on roots | default | swing ratio ±.15 | No swing-ratio measure (timing against written triplets is a stand-in) |
| 4 | P | 16th kick lanes (funk-1, funk-2, boombap) | `kick ±20` | ≥ 90 % | No drums |
| 5 | **weak** | "Swung 16ths" over rnb / boombap kicks | `kick ±25` | 16th swing ratio | **rnb kick has no 16th offbeats, so the line contains no swung note at all. Boombap has one per bar** **[run]** |
| 6 | **N (gate)** | Same groove ×3 | `kick ±25` around 0 | ≥ 70 % within ±12 ms of the *chosen* offset | Title promises behind/ahead, but the gate punishes it (admitted) |
| 7 | Y | Rock-8b then half-time | `kick ±25` | default per section | |
| 8 | **N (meaning)** | 3 bars + 1 empty bar, land on 1 | default | landing ±15 ms | There is no drummer and no fill. The empty bar is just a rest |

### F6 `b-ghost` (6)
| L | Impl | Drill vs doc | Gate | Doc pass | Notes |
|---|---|---|---|---|---|
| 1 | **N (gate)** | Pitched/dead 8ths ✓ | default | ≥ 90 % classified | **All-pitched take = clean, all-unpitched take = clean** **[run]**: dead notes carry pitch R and unpitched onsets snap to anything |
| 2 | P | Root 1 & 3, ghosts in 16ths | default | class + timing | Same |
| 3 | P | R-x-O figures | default | same | Same |
| 4 | Y | Ghost RMS gap | `ghostDb ≥ 8` | ≥ 8 dB | Only if the ghosts were *played* as matched notes (they always are, see above) |
| 5 | P | Generated 2-bar cells, all 12 | default | lock ≥ 88 % + class | No lock, no class |
| 6 | P | 8 bars with H/S | default | all | `legatoRatio` is used on hammers |

### F7 `b-chord` (10)
| L | Impl | Drill vs doc | Gate | Doc pass | Notes |
|---|---|---|---|---|---|
| 1 | P | Root 8ths on 3 charts, 6 keys | default | default | Doc: "chart shown as chords, **no notes**". We show the notes |
| 2 | Y | R-5 above/below | default | chord tones ≥ 95 % | |
| 3 | Y | R-5-8-5 | default | same | |
| 4 | Y | Triads, major + minor | default | default | |
| 5 | Y | 1st and 2nd inversions | default | default | 9 large jumps **[run]** |
| 6 | Y | maj7, m7, 7, m7♭5, °7 (60 items) | default | default | |
| 7 | P | 2-octave arpeggios | default | + shift gap | |
| 8 | **N (free choice)** | One fixed generated line | `chordTonesOnBeats` + **exact pitch** | any chord tone, rule check | Not free: a valid alternative chord tone = "wrong" **[run]** |
| 9 | **N (free choice)** | Fixed line | same | ≥ 90 % moves ≤ 4 st | No interval-size measure |
| 10 | Y | Descending slash bass / pedal | default | default | |

### F8 `b-scale` (9)
| L | Impl | Notes |
|---|---|---|
| 1 | Y | Major + minor pentatonic, 6 keys (doc: 6 → all 12) |
| 2–4 | Y | Major; natural minor + blues; Dorian/Mixolydian in 2 positions (all 12). Position 2 = root on the next string |
| 5 | P | 2-octave minor pentatonic "through positions", placed by the greedy hand model. No shift-gap gate |
| 6–9 | Y | 3rds/4ths; harmonic/melodic minor; Lydian/Phrygian; whole-tone, half-whole, altered |

All of F8 uses the default gate. The doc agrees.

### F9 `b-walk` (12)
| L | Impl | Drill vs doc | Gate | Doc pass | Notes |
|---|---|---|---|---|---|
| 1 | Y | Blues half notes R/5, F & B♭ | ct-on-beats + exact | ≥ 95 % valid | |
| 2 | Y | R-R-5-5 / R-5-R-5, 6 keys | same | default | |
| 3 | Y | R-3-5-3 / R-3-5-6, all 12 | same | default | |
| 4 | P | ii-V-I-I ×2, beat 4 chromatic | same | approach rule ≥ 90 % | **Last bar approaches the wrap-around ii (E♭ in C), then the line ends on C** **[run]** (`overProg` wraps `next`). Same in L5/L6 |
| 5 | P | Dominant approach | same | same | Beat 4 often repeats beat 3 (G2 G2) **[run]** |
| 6 | P | Scale-step approach | same | same | **3 of 4 bars repeat beat 3 on beat 4** (A A, D D, G…) **[run]**, against our own "repeats ≤ 5 %" rule |
| 7 | **N (free)** | Plays `walkingBass()` reference line | exact pitch | beat-1 CT ≥ 90 %, repeats ≤ 5 % | Admitted. `walkRules()` not hooked |
| 8 | P | Ref line + forced triplet skips | default (evenness off) | skip timing | |
| 9 | P | ii-V-I in 4 keys a whole step apart (doc: cycle of 4ths, all keys) | exact | rules | Ends on `key − 6` (a tritone away), not the last chord's tonic. Check intent |
| 10 | Y | Rhythm-changes A, B♭ E♭ F | exact | rules | |
| 11 | P | 4 standards, own keys | exact | rules + kick/ride lock | Only 4 of 36. **"Fly Me" is the 8-bar A section labelled "One chorus"**. **Blue Bossa is walked** (should be a bossa pattern). **Title says "· C" and the key signature is C for all four** **[run]** |
| 12 | P | Blues in 2 then in 4, 160→240 | default | per-section | |

### F10 `b-slap` (8): slap/pop classification is advice-only by design, and not built
| L | Impl | Notes (gate: default unless stated) |
|---|---|---|
| 1 | P | Thumb E/A, **1 item**. No transient class |
| 2 | P | Octave slap-pop. The octave is folded, so a thumb-only take on the root passes the pops' pitch |
| 3 | P | T-x-P: the ghost "x" isn't checked (see F6) |
| 4 | Y | Uses `legatoRatio` on the hammer |
| 5–6 | P | No kick lock (doc ≥ 88 %) |
| 7 | Y | Evenness on (CV by band) |
| 8 | Y | Triplet T-H-P |

### F11 `b-legato` (7)
| L | Impl | Notes |
|---|---|---|
| 1 | P | Slide from 2 frets below. Glides are only *dropped*; no "≥ 90 % slides detected" check |
| 2–3 | Y | `legatoRatio ≥ .5` |
| 4 | P | Octave double-stops: chord groups are judged with ring-check if chroma is on. OK-ish |
| 5 | Y | Harmonics 12/7/5 (pitches correct: E2/B2/E3…), **1 item** |
| 6 | Y | `analyzeVibrato`; tempo 60→60 |
| 7 | Y | Pedal + moving line |

### F12 `b-pick` (5)
| L | Impl | Notes |
|---|---|---|
| 1 | Y | Down 8ths. Stroke direction can't be heard (doc agrees) |
| 2 | Y | `asym` 8 ms / 3 dB |
| 3 | Y | `crossing ≤ 10` |
| 4 | Y | `palmMuteShare` |
| 5 | P | Gallop: option 1 forces drop-D even for a 5-string player (spec `tuning` overrides `withBassTuning`) |

### F13 `b-read` (9): view defaults to TAB
| L | Impl | Notes |
|---|---|---|
| 1 | P | Timed walk, 40→60. No untimed "name the note", no response time ≤ 2 s |
| 2 | Y | One-string rhythms on E (RSL Debut model) |
| 3–4 | Y | 4-bar melodies; 8 bars in 7 keys |
| 5 | P | "TAB ↔ notation transfer" is implemented as reading in position II/V/VII, but TAB is shown, so nothing is transferred |
| 6 | **N** | Chord-symbol chart: notes are written out under it. No slashes, repeats, endings or D.S. |
| 7 | **N** | Nashville: numbers shown, but the notes are also written out. No "key switches on repeat" |
| 8 | **N** | "Improvised continuation" is written out (comment: "for now written out too") |
| 9 | Y | 16th funk cells |

Reading levels never force notation (admitted). Notation itself is in the wrong clef (P0-3).

### F14 `b-styles` (12)
| L | Impl | Notes |
|---|---|---|
| 1 | Y | Rock 8ths + octave pump. **Only level with `kick` gate**. The doc wants the F5 lock rule on all 12 |
| 2 | **bug** | Pop ballad: the bass goes 1 – 7 – 6 – 4 under chart **C G Am F** (chart doesn't show G/B). **On the G bar the "5th" is taken from the slash bass B, which gives F♯ under G** **[run]** |
| 3 | Y | Motown R-5-6-8 + chromatic approach |
| 4 | Y | Boogie R-3-5-6-♭7 in triplets (12-bar) |
| 5 | Y | Disco octaves + ghost (ghost unchecked) |
| 6 | Y | One-drop: space on 1, thumb mute |
| 7 | Y | Bossa R (dotted ♩) – 5 – 5 – R anticipation |
| 8 | Y | Samba surdo figure |
| 9 | Y | Tumbao: "and" of 2 + beat 4 anticipation |
| 10 | P | Funk cells. **The `position: 1` spec ignores `position`: 6 duplicate items** **[run]** |
| 11 | P | Gospel chromatic runs. "Swung 16ths" not applied (straight) |
| 12 | P | Gallop drop-D + 7/8 riff. 7/8 spec tempo 180 = the level target (starts at the top) |
| opt | N | Middle-Eastern / Hijaz 10/8, 6/8 |

### F15 `b-ear` (8): **not built** (admitted)
L1–L8 all N. No root-finder, rhythm/melodic recall, transcription, or inversion-by-ear for the bass course. The
general ear games aren't bass-register or bass-course aware.

### 5.1 Upright track (6 families): **not built** (admitted)
No `upright` / `fretless` tuning (`fretted:false` exists only for bowed strings), no cents/intonation gate for bass, no
bow flag.

---

## 2. Bugs and quality issues

### P0-class (wrong results)
| # | Issue | Where | Evidence |
|---|---|---|---|
| B1 | **YIN can't read bass fundamentals below 70 Hz.** E1–C♯2 (and the 5-string B0–D♯1) return `null` | `src/engine/yin.ts` default `minHz=70`; `src/speech/pitchCapture.ts` (fftSize 2048, no `minHz`) | Synthetic tones: MIDI 23/28/31/33/36 → null, 38+ → exact **[run]** |
| B2 | **Unpitched onsets count as the right note.** Combined with B1, pitch accuracy on mic is mostly fiction; muted-thump takes are clean | `guitarAnalyze.normalizeGuitarTake` step 4; no limit on `extra.unpitched` | roots / ghost8 / walk free / kick: all `clean, acc=1` from unpitched-only input **[run]** |
| B3 | **Ghost notes aren't classified.** Dead notes carry pitch R, so pitched notes match. Ghost levels pass with no ghosts | `bass.ts cellNote('x')`, analysis | all-pitched ghost8 = clean **[run]** |
| B4 | **Level pass ignores tempo.** One clean take per item at any bpm, including after "Slower" (min 30). The path needs only `min(3, items)` items | `plan.levelDone`, `ladderFacts.techStars`, `path.isDone`, `Drills.tsx onSlower` | Code |
| B5 | Notation in the treble clef for bass | `DrillTake.tsx DrillStaff` → `draw(rh,'treble')` | Code |
| B6 | Tab truncates at 32 notes; most bass drills run 40–130 notes | `DrillTake.tsx DrillTab` | Code + note counts |
| B7 | Free-choice levels judged note-for-note | `analyze.ts accClean` (relaxed only for `harris`) | variant walk = `not` **[run]** |
| B8 | Placement maps the tempo band to a level number. Walk and pocket probes can't place above ~L2, the scale probe ~L4, pluck ~L6. That level is then copied to the seeded families (`b-length` gets pluck's level) and their lower levels are ✓ "by test" | `Drills.tsx TechLevelTest.finish` | Code. Staircase max = start × 1.15 × 1.3 × 1.6 |

### Wrong notes / lines
| # | Issue | Where |
|---|---|---|
| B9 | Pop ballad F♯ under G (and chart missing the slash bass "G/B") | `genStyle` case 1 |
| B10 | Walk L4–6 last approach targets the wrap-around ii, then the line ends on I | `genWalk` → `overProg` next = `prog[(bar+1)%len]` |
| B11 | Scale/dominant approach repeats beat 3 on beat 4 in most bars | `genWalk.approach` (needs `from !== result` / pick the other side) |
| B12 | Idle-string drill puts the "high" notes on the A string | `genLength 'idle'` (no `s` pinned, so `placeLine` chooses A) |
| B13 | Standards: Fly Me = A section only; Blue Bossa walked; title/key signature C | `genWalk 'standard'`, `drillOf` title, `keySig` |
| B14 | "Swung 16ths" level has no (rnb) or one (boombap) swung note | `genPocket 'swing16'` |
| B15 | One-string option 0/1 duplicate in 2 keys; styles L10 `position:1` duplicates 6 items | `genFret 'one-string'`, `genStyle` |
| B16 | Greedy placement: same-string 7–9 fret leaps in an 8th (rake ×6, oct10 ×13, inversions ×9 …) | `placeLine` (no look-ahead per bar) |
| B17 | Crossing gate is a no-op on pluck L3 option 0 (no same-string notes, so null) | `crossingPenalty` |
| B18 | `oddEvenAsym` parity from played onsets: one extra or missed onset swaps i/m for the rest | `bassAnalyze.oddEvenAsym` (use the *expected* index via `perNote`) |
| B19 | `lengths` needs mic frames. MIDI basses skip it, though `PlayedNote.off` exists | `analyzeGuitarTake` `if (bg.lengths && frames.length)` |
| B20 | Walk L9 ends on `key − 6` | `genWalk 'cycle'` |

### Tempo / scale inconsistencies
- 7/8 levels use eighth-note bpm (b-time L10 option 2: 140 > target 120; styles L12: start = target 180) but are shown as "♩".
- Ladder `goalBpm` grows past the level target forever (no cap, no "level target reached" state).
- Level tempo ranges [80,80] (pluck 9) and [60,60] (legato 6) mean there's no ladder at all.
- Tempo-band thresholds (CV .03 / SD 20 ms at ≥ 5.5 notes/s) are stricter than the doc's mic default (SD ≤ 28, CV ≤ .06–.07). With a 25 ms `setInterval` frame clock, a mic onset can't be measured much better than ±10 ms, so fast 16th levels are near-impossible by mic while slow ones pass with junk pitch.
- There's no `|timingMean|` rule. A player 40 ms late on every note can be clean (latency calibration aside).

### Titles / language
- "and" is rendered `וְ` in Hebrew titles and the 16th syllables stay Latin ("e", "a"). Acceptable, but inconsistent with
  how the app counts elsewhere. Pick one convention.
- Standards titles carry the wrong key ("· C").
- Hub topic grouping puts `b-time` / `b-pocket` under "Styles & jazz" and `b-read` under "Scales" (`Drills.tsx TOPIC_OF`).

### Gameable / trivially passing
- Muted thumps in time (B2), skipping ghosts (B3), staccato through "release on the and" (F3 L4), playing slower (B4).
- One-item levels: pluck 1, 2; slap 1; legato 5. Two-item levels: 19 more, most `ANY` key lists `[E, A]`.
- `kick` gate = timing ±25 ms against the written notes. That duplicates the timing rule; it's not about drums.

### "Everything connects" gaps
- Bass takes are tagged only `instrument/guitar-tech`. `b-time` / `b-pocket` / `b-walk` don't feed `timing/*` or
  harmony sub-skills (`events.drillEvents`; drills with `evenness:false` get no timing tag at all).
- No badges for `b-*` (admitted; `badges.ts` line 321).

---

## 3. Curriculum validation

Sources: the doc's §3.8 / §9 sources, plus an RSL check (Gr 3 groups A scales / B arpeggios / C riff; Gr 7–8 groups
A–E incl. stylistic studies; Gr 8 scales 1 octave at 100 bpm; Gr 3 ears = melodic + rhythmic recall; unseen tests incl.
Quick Study Piece; technical exercises 15 / 100 marks)
([RSL bass](https://www.rslawards.com/music/graded-music-exams/bass),
[Grade 3](https://www.rslawards.com/tabbed-content/bass-guitar-grade-three/),
[Grade 8](https://www.rslawards.com/products/bass-grade-8/),
[AMEB guide](https://rockschool.ameb.edu.au/wp-content/uploads/2025/01/20240215-Instrument-Guides-Bass-D-8-2018_G6-amend.pdf)).
Trinity pages were partly unreachable in the original research. Trinity rows rely on the doc's excerpts.

| Requirement | Ours | Status |
|---|---|---|
| **RSL Debut**: maj/min pentatonic E, A at 70 | scale L1 (6 keys, 70→110) | covered (pitch caveat B1) |
| RSL Debut: 4-bar rhythm reading on E | read L2 | covered |
| RSL Debut–Gr 3: rhythmic recall (echo 2 bars to drums) | F15 L5 | **missing** |
| RSL Gr 1–3: major, natural minor, pentatonic, blues; triad + dom7 arps at 70–90 | scale L1–3, chord L4, L6 | covered |
| RSL Gr 1–3: riff (transposed to backing) | styles (no backing track) | partial |
| RSL Gr 3–6: melodic recall | F15 L6 | **missing** |
| RSL Gr 4–5: 1-oct scales in 8ths at 80, harmonic minor (Gr 5) | scale L2–7 | covered |
| RSL Gr 5: 2-octave maj7 / m7 / dom7 arps | chord L7 has only major, minor, dom7 triads 2-oct | **partial** (no 2-oct maj7/m7) |
| RSL Gr 4–6: harmonic recall (roots of I-IV-V-vi by ear) | F15 L3–4 | **missing** |
| RSL Gr 4–5: Improvisation & Interpretation (written + improvised bars) | read L8 (written out) | **missing** in substance |
| RSL Gr 6: 5 minor-pentatonic positions | scale L5 (one run, no per-position drill) | partial |
| RSL Gr 6: Dorian/Mixolydian 2 positions at 100 | scale L4 (target 110) | covered |
| RSL Gr 6: m7♭5, dim arps; 7th-chord shapes | chord L6 | covered |
| RSL Gr 6–8: stylistic studies (rock 16th + legato / funk slap / jazz upper register) | ghost L6, slap L5–6, legato L3, fret L8 | partial (no "study"-length pieces with backing) |
| RSL Gr 7: Lydian, Phrygian, melodic minor | scale L7–8 | covered |
| RSL Gr 7: 9th arpeggios; high-register chords | none | **missing** |
| RSL Gr 7–8: natural harmonics | legato L5 | covered |
| RSL Gr 8: whole-tone, diminished, altered | scale L9 | covered |
| RSL Gr 8: 7♯5, 7♭5, 7♯9, 7♭9 arpeggios at 100 | none | **missing** |
| RSL Gr 8: odd-time grooves; up-tempo walking | time L10, styles L12; walk L12 | covered |
| RSL Gr 6–8: Quick Study Piece (lead sheet + improvised sections) | read L6–8 written out | **missing** |
| **Trinity**: slides, rests, dynamics (Gr 2) | legato L1, length L1, pluck L6 | covered |
| Trinity Gr 4: repeated 16ths with crescendo, articulation, note lengths, stamina | pluck L5–6, length L2/L7 | covered (stamina drift unmeasured) |
| Trinity Gr 7: feel changes, sliding octave double-stops, slap accents, fast picking | pocket L7, legato L4, slap, pick L5 | covered |
| Trinity session skills: playback / improvising | F15 L6, free walking | **missing** |
| **ABRSM double bass**: scales/arps from memory, arco/slurred, ♩40→76; Simandl positions; 3rds, dom7, dim7; tenor/treble clef | upright track | **missing** (only fret L3 Simandl on electric) |
| ABRSM jazz bass: walking from chord symbols, improvisation | walk L1–12 (fixed lines) | partial |
| **Bagrut 5 units**: memorised transcription with the recording + 2-chorus solo | F15 L7, no solo family | **missing** |
| Bagrut: blues, ballad, medium, fast pieces with a band | styles L2/L4, walk L11 | partial (no band during takes) |
| Bagrut: improvisation in every piece; sight-read improvisation over a progression | walk L7, read L8 (not free) | **missing** |
| Bagrut: theory (intervals, scales, modes, key signatures, chord types, tensions) | general theory course, not tied to bass | partial |
| Bagrut: ensemble interaction / leadership | none | missing (out of scope for a solo app; drummer play-along is the nearest) |
| **Berklee / MI core**: time and groove with a drummer | F4, F5 (no drums) | partial |
| Berklee/MI: chord tones, approach notes, walking construction (Friedland order) | F7, F9 | covered as fixed lines, **not as free-choice skill** |
| Berklee: Appleman style reading | read L9 | partial |
| MI: slap / funk / styles | F6, F10, F14 | covered |
| Fretless / 5-string low register | 5/6-string, drop-D tunings exist. Roots never go below E1 (`floorOf` = 28 for 5+ strings). No fretless | partial |

---

## 4. Missing features (doc §7 and §6)

| § | Feature | What exists | Gap |
|---|---|---|---|
| 7.1 | Lock with the kick | `kickLock()` against the *written* notes, line built from `GROOVES` kick lanes | **No drum audio during the take**, no kick/bass timeline, no headphones check |
| 7.2 | Walking coach over 36 standards | 4 standards as fixed lines; `walkRules()` written and unit-tested | Not hooked; no band; no per-beat labels in the UI; no free play |
| 7.3 | Root-finder / bass-line ear games | nothing bass-specific | F15 entirely |
| 7.4 | Click 2&4 / and / once-per-bar / drop-out | all four in `clickHeard` | No drop-out *drummer*, no `fadePlan` / `heldSilent` scoring |
| 7.5 | Groove fingerprint from bass onsets | `analysis/groove.ts` (tap-based) | Bass onsets not fed in |
| 7.6 | 5/6-string, drop-D, fretless | 3 tunings + `withBassTuning`; tab strings follow | No fretless/upright; low B range unused; tuning shared with guitar (admitted) |
| 7.7 | Note-length / muting analyzer | `releaseTime`, `lengthClass`, `lengthMatch` | No ring-through, overlap or release-accuracy measures; MIDI note-off unused |
| 7.8 | Style groove generator | 12 style rules | 1 level kick-gated; no drums |
| 7.9 | Reading drills | F13 | Charts / Nashville / continuation written out; wrong clef |
| 7.10 | TAB + notation toggle | `guitarView` tab/staff/both | Wrong clef; tab capped at 32 notes |
| 7.11 | Fills trainer | pocket L8 (empty bar) | No drummer, no landing score |
| 7.12 | Transcription from band engine | none | missing |
| 7.13 | Exam / bagrut mapping | none | No RSL/Trinity grade tags, no bagrut checklist |
| 7.14 | Slap detection | none | (research item) |
| 7.15 | Upright intonation trainer | `drone.ts`, cents in vibrato code | No bass intonation trainer |
| 7.16 | Tone / EQ cards | none | content only |
| 7.17 | Duet streak | none | later |
| 6 | Placement probe | 4 probes (pocket, scale, pluck accent16, walk chrom) | Task 0 (tuner + 4 vs 5 strings), task 5 (ear), task 6 (slap) missing. Decision rules (lock %, walk rule report) replaced by tempo-band → level, which caps walk/pocket at ~L2 (B8) |

---

## 5. Prioritised fix list

Two parallel tracks, so the two developers don't touch the same files.

- **Track A (analysis and measurement):** `src/engine/yin.ts`, `src/speech/pitchCapture.ts`,
  `src/engine/drills/guitarAnalyze.ts`, `bassAnalyze.ts`, `analyze.ts`, `ladder.ts`, `plan.ts`, `ladderFacts.ts`,
  `events.ts`, related tests.
- **Track B (content, UI and placement):** `src/engine/drills/bass.ts`, `bassProbes.ts`, `src/ui/DrillTake.tsx`,
  `src/ui/Drills.tsx`, `src/ui/NoteViews.tsx`, `src/engine/drills/types.ts` (only the new `BassGoal` fields, agreed up
  front), `tests/bassFamilies.test.ts`.

Where an item needs both, the split is stated. Run `npx tsc -b` before every commit.

### P0: must fix before calling the course "complete and correct"

| ID | Fix | Track / files | Approach | How to measure / test | Effort |
|---|---|---|---|---|---|
| A1 | Bass-capable pitch tracking | A: `pitchCapture.ts`, `yin.ts`, `guitarAnalyze.detectOnsets` | For bass drills, pass `minHz: 28` (or 22 when a 5/6-string tuning is set) and use a 4096-sample analyser (≈ 85 ms at 48 kHz). Keep 2048 for guitar. Judge *timing* on the energy onset (already) and *pitch* from frames 40–120 ms after it for bass | New test `tests/bassPitch.test.ts`: synthetic E1/A1/B0 tones (fundamental + harmonics, and a weak-fundamental variant) → correct MIDI ± octave fold. Mirror the [run] script in this audit | M |
| A2 | Stop crediting unpitched onsets as right notes | A: `guitarAnalyze.normalizeGuitarTake`, `analyzeGuitarTake` | Snap unpitched onsets for *timing only*: mark `ok=false` for pitch unless the expected note is `dead` / `mute` / `harmonic`. Add a factor "N notes not heard clearly": verdict `almost` if unpitched > 10 % of pitched expected notes, `not` > 25 % | Test: the unpitched-only take on `b-chord roots` must be `not`. A real pitched take stays clean | S |
| A3 | Ghost classification | A: `analyzeGuitarTake` | Expected `dead` notes need an unpitched/short onset; expected pitched notes need a pitch. Report share ≥ 90 % (`bass.ghostClass`). Gate F6 L1–3, L5, F10 L3 | Tests: all-pitched ghost8 → not; correct mix → clean | S |
| A4 | Level pass = 3 clean at the target tempo | A: `ladder.ts`, `plan.levelDone`, `ladderFacts.techStars`; B: show target in `Drills.tsx` | Store `targetBpm` per item from `level.tempo[1]` (scaled for 7/8, see B7). Item "passed" = `history` has 3 clean takes on ≥ 2 days at ≥ target, or ≥ 95 % of target. Stars: 1 = 3 items at start tempo, 2 = half at target, 3 = 75 % at target. Path `isDone` should need stars ≥ 2. Cap `goalBpm` at target and stop raising, then show "level tempo reached". "Slower" takes never count toward pass | Tests: one clean take at 30 bpm → 0 stars; 3 clean at target → passed | M |
| A5 | Rule-pass verdict for free-choice drills (`walkRules`) | A: `analyze.ts` (new `goal.rules`), `bassAnalyze.walkRules`; B: `bass.ts` sets `goal.rules = { kind: 'walk' \| 'chordTones' \| 'nearest', chart }` on chord L8–9, walk L7, L11, read L8 (free bars) | When `goal.rules` is set: pitch correctness = rule validity per beat (beat-1 chord tone, chord tones elsewhere, approach on the beat before a change, repeats ≤ 5 %, nearest-tone moves ≤ 4 st for L9). Timing as usual. Expose `labels` + `worst` for a one-line "Why?" | Tests: the [run] variant line (5th on beat 3) → clean; an "other" note on beat 1 → not, with `worst` pointing at it | M |
| B1 | Bass clef + octave-up notation | B: `DrillTake.DrillStaff`, `NoteViews` | For `isGuitarDrill` with instrument bass: draw `clef='bass'`, written an octave above sounding (standard bass notation). Guitar: treble 8vb (same bug class, own ticket) | Unit test on the staff items' clef. e2e screenshot of read L3 | S |
| B2 | Tab shows the whole drill (paged or scrolling with the take cursor) | B: `DrillTake.DrillTab` | Remove the 32-column cap. Lay out by bars (2 bars a line, like the staff) and follow `onBeat` with a moving window so it fits one phone screen | e2e: walk L7 tab shows bar 12 | S–M |
| B3 | Free-choice levels hide the line | B: `Drills.tsx DrillScore`, `bass.ts` | With `goal.rules` (A5), show only the chart (chord L1 too, read L6–7). Offer "show a model line" as an opt-in reference | e2e: no notes rendered for walk L7 | S |
| B4 | Wrong notes / lines B9–B13 | B: `bass.ts` | Ballad: take the 5th from the *chord* root, chart "G/B". Walk approaches: last bar targets the closing tonic (pass `next` = the final chord). Pick the approach side that ≠ beat 3. Idle: pin the high notes to strings ≤ n−2. Standards: full 32-bar Fly Me (or rename "A section"), drop Blue Bossa or give it the bossa figure, real key in title + `keySig` | Extend `tests/bassFamilies.test.ts`: (a) every note in a chord-chart drill is a chord tone or a marked approach/passing tone; (b) beat 4 ≠ beat 3 in walk L5–6; (c) idle notes on strings ≤ n−2; (d) standards' `keySig` = the chart's key | S |
| B5 | Headphones gate + drum backing for pocket / styles | B: `DrillTake.tsx` (play `GROOVES` lanes in `playTimeline`), `Drills.tsx` (headphones check); A: `bleed.ts` if a bleed filter is used | Play the drum groove only when headphones are confirmed (or MIDI / line-in), otherwise the click. Kick lock then compares against the *drum* kick lane. Pocket L8 plays a real fill | e2e with a fake audio sink. Unit test: `kickLock` against the lane, not the notes | M |
| B6 | Placement by the doc's rules | B: `bassProbes.ts`, `Drills.tsx TechLevelTest.finish` | Per-probe decision functions: pocket lock % (≥ 90 → pocket L3, < 60 → time L1 + pocket L1); scale best clean bpm → level by tempo table; walk via `walkRules` report (L7 / L4 / L2); pluck asym/CV → L5–6. Seed only the families the doc lists (pluck must not seed `b-length`). Add task 0 (lowest string → 4/5-string tuning) | Unit-test the decision function with synthetic metrics | M |

### P1: important

| ID | Fix | Track / files | Approach / test | Effort |
|---|---|---|---|---|
| A6 | `|timingMean|` rule (default ≤ 15 MIDI / ≤ 25 mic) plus `targetOffsetMs` for pocket L6 | A: `analyze.ts`; B: `bass.ts` sets `goal.pocket = [0, +15, −10]` per third | Pocket score = share within ±12 ms of the section target. Test with shifted takes | S |
| A7 | Mic thresholds for bass | A: `analyze.thresholds` | Bass mic: SD ≤ 28, CV ≤ .06 (doc §4), independent of tempo band | S |
| A8 | Shift gap, drift, swing ratio, per-subdivision bias | A: `bassAnalyze.ts` (`shiftGap`, `ioiDrift`, `swingRatio`, `subBias`), `analyzeGuitarTake`; B: `BassGoal` fields on fret 4–5, chord 7, scale 5, pluck 5, time 2–3, 6, 9, pocket 3, 5 | Pure functions + unit tests like the existing ones | M |
| A9 | Note-length suite: ring-through, release accuracy (±40 ms), overlap; MIDI note-off path | A: `bassAnalyze.ts`, `analyzeGuitarTake` | Ring-through = energy at the previous pitch / open-string pitches during written rests (chroma frames). Overlap = previous pitch still present after the next onset. With MIDI use `off` directly | M |
| A10 | Parity from expected index in `oddEvenAsym`; crossing gate valid with open strings | A: `bassAnalyze.ts`, `analyzeGuitarTake` | Use `m.perNote` order. For crossing, compare against the take's own non-crossing baseline or the mean \|dev\| when there's no same-string group | S |
| A11 | Feed bass into skills | A: `events.ts` | Tag `b-time` / `b-pocket` with `timing/*`, `b-walk` / `b-chord` with harmony subs, bass sub `instrument/bass-tech` | S |
| B7 | Eighth-note meters shown and laddered correctly | B: `bass.ts` (7/8 specs), `Drills.tsx` header | Show "♪ = 140" for 7/8. Level tempo ranges in one unit. Fix 7/8 start ≤ target. Staff time signature 7/8 | S |
| B8 | Duplicates and placement jumps | B: `bass.ts` | Drop styles L10 `position:1` (or make it a different cell set). One-string fallback must differ. `placeLine`: plan one position per bar, cost ≥ 7-fret leaps within 0.5 beat | Test: no two items in a level with identical notes; no same-string leap ≥ 7 frets in ≤ ½ beat | M |
| B9 | Swung-16th content | B: `bass.ts swing16` | Build 16th lines that actually use the swung "e"/"a" (≥ 4 per bar) | S |
| B10 | Reading levels force notation, plus an untimed clef level | B: `Drills.tsx DrillScore` (override `guitarView` for `b-read`), `bass.ts 'clef'` | Read L1 untimed name-the-note with response time ≤ 2 s | S–M |
| B11 | F15 bass ear family (8 levels) | B: new `src/engine/drills/bassEar.ts` + UI reuse; A: none | Root-finder from the band engine (play progression → user plays roots on the repeat, scored per bar), rhythm/melodic recall, short `walkingBass()` transcription, slash-bass by ear | L |
| B12 | Separate bass tuning setting (admitted) | B: `SettingsScreen.tsx`, `Instrument.tsx`, `Rush.tsx`, settings type | `bassTuning` key; migrate the old `tuning` when it's a bass id | S |
| B13 | Low-B use on 5/6-string | B: `bass.ts floorOf` | Optional `lowB` mode: roots from B0 when the tuning has it (gospel / metal / walking low register) | S |

### P2: nice to have

| ID | Fix | Files | Effort |
|---|---|---|---|
| A12 | Plucking-zone centroid gate (pluck L9), with calibration | `bassAnalyze.ts` | M |
| A13 | Slap / pop transient classifier (advice only first) | `bassAnalyze.ts` | L |
| A14 | Groove fingerprint from bass onsets | `analysis/groove.ts` | S |
| B14 | Badges for b-* families, exam/bagrut tags per level (RSL grade where §3 maps) | `badges.ts`, `bass.ts` level metadata | S |
| B15 | Missing curriculum content: 2-oct 7th arps, 9th / altered-dominant arps, high-register chords, 5 pentatonic positions as separate items, Middle-Eastern style, Nashville key-switch on repeat, chart roadmaps (repeats / endings / D.S.) | `bass.ts` | M |
| B16 | Upright track (6 families) with cents gate | new `upright.ts`, `fretboard.ts` tuning `upright`/`fretless` (`fretted:false`) | L |
| B17 | Topic grouping (time/pocket → its own "Time & groove" topic) | `Drills.tsx TOPIC_OF` | S |
| B18 | More standards (doc: 36) with per-tune style (two-feel, bossa pattern) | `bass.ts` | M |

**Suggested order.** Track A: A2 → A1 → A3 → A4 → A5 → A6/A7 → A8–A11. Track B: B4 → B1 → B2 → B3 (after A5's
`goal.rules` type lands; agree the type first) → B6 → B5 → B7–B13. The only shared file is `types.ts`. Add the new
`BassGoal` / `DrillGoal` fields in one small PR on day 1.
