# Bass course vs the "sophisticated music" niche: gap analysis and plan (2026-11-10)

The owner's niche (2026-11-10): measured practice for **jazz and rock/prog players**. Pop and simple songs are only the
on-ramp, and the top levels must reach a serious jazz / prog standard. This file is research only, with no code changes. It builds on
`BASS_CURRICULUM.md`, `BASS_AUDIT.md`, `BASS_VALIDATION.md` and `BASS_FINAL_CHECK.md` (0.66) and the code on this branch
(`src/engine/drills/bass.ts`, `upright.ts`, `bassEar.ts`, `bassBand.ts`, `bassAnalyze.ts`, `topicsInstrument.ts`,
`grooves.ts`, `standards.ts`, `barry.ts`, `improvRules.ts`).

House rules kept: every new level is generated from rules (never a copied line, transcription or method exercise),
measured by mic or MIDI (onset, pitch, length, loudness, rule checks), and fed into path / XP / league / level test /
workout like the existing `b-*` families. Barry Harris material is used only as **concepts** (already encoded in
`barry.ts`). No Open Studio exercises, course order or wording is copied.

Size key: **S** = a few generator cases and levels on existing measures (≈ 1 day). **M** = a new family of 6–10 levels
reusing engines, with maybe one small new measure. **L** = a new analysis or engine change.

---

## 1. What exists today (inventory)

17 electric families, **168 levels**, plus 6 upright families with **40 levels** and 4 bass topics. Tempos are
start → target bpm on the clean-take ladder.

### 1.1 Electric bass

| Family | Lv | Content (titles, condensed) | Measured by | Niche relevance |
|---|---|---|---|---|
| `b-pluck` Plucking | 12 | rest strokes, even i/m, crossing, skipping, 16th stamina, accents/cresc, raking, 3-finger gallop, tone zones, skip patterns, i-m-a triplets, thumb+fingers (60→100…140) | timing, IOI CV, odd/even asym, crossing penalty, RMS slope, zone centroid | technique, all styles |
| `b-fret` Fretting | 8 | OFPF, permutations, Simandl 1-2-4, one-string shifts, 2-oct scales, pivots, octaves/10ths, upper register | pitch, timing, shift gap | technique |
| `b-length` Muting | 7 | real rests, staccato/legato, idle-string mute, release on "and", muted octaves, thumb/palm mute, lengths in a groove | release ms, ring-through, palm-mute score | all styles |
| `b-time` Time | 10 | quarters, 8ths/triplets, switching, click on 2&4, on "and", 1 per bar, drop-out, syncopation, 16th syncopation, **odd meters 5/4, 7/4, 7/8 (2+2+3) on roots** | timing mean/SD, drift, sub-bias | L10 is the only odd-meter time level |
| `b-pocket` Pocket | 8 | play the kick, kick+changes, shuffle, 16th funk lock, swung 16ths, pocket on purpose, half-time, fills | kick lock vs kick lane, swing ratio, pocket target, landing | groove (pop/funk bias) |
| `b-ghost` Ghosts | 6 | dead notes, 16th ghosts, ghost before octave, quieter ghosts, 2-bar funk, 8-bar study | ghost class, ghost dB | funk/fusion |
| `b-chord` Chord tones | 14 | roots, R-5, R-5-8, triads, inversions, 7ths, 2-oct, ct through prog, nearest ct, slash/pedal, 2-oct 7ths, 9ths, **altered arps**, high-register chords | pitch, rules `chordTones` / `nearest` | jazz harmony base |
| `b-scale` Scales | 11 | pentatonics, major, minor+blues, Dorian/Mixo 2 pos, linked pentas, 3rds/4ths, harmonic/melodic minor, Lydian/Phrygian, **WT/dim/altered**, 5 penta positions, 3nps (6-str) | pitch, timing | modes: covered as scales only |
| `b-walk` Walking | 18 | 2-feel R-5, quarter R-5, arpeggio walk, chromatic / dominant / scale approach, mixed, ghosted skips & triplets, ii–V–I all keys, rhythm changes, **36 standards** (L11/13/14/18: walk, two, bossa, ballad feels; Giant Steps, Solar, Stella…), up-tempo 2&4 (160→**240**), 2-chorus blues solo, sight-read walk, low B | rules `walk` (ct on 1, approaches), chordTonesOnBeats, evenness | **the jazz core** |
| `b-impro` Fills/targets | 6 | fills to root, to 3rd, 2-bar answers on a vamp, penta solo, **blues solo on 3rds/7ths**, **ii–V–I guide tones** | rule `target` (landing share) | jazz solo on-ramp; top = ii–V guide tones |
| `b-legato` | 7 | slides, H/P, legato lines, sliding octave double stops, **natural harmonics (1 item)**, vibrato, pedal tones | legato ratio, pitch | fusion: thin |
| `b-pick` Pick | 8 | down 8ths (80→150), alt 16ths, crossing, palm-mute chug, gallops, skipping, economy, inside/outside | timing, odd/even asym, palm-mute | rock/prog base: solid |
| `b-slap` Slap | 8 | thumb, octave pop, LH ghost slaps, hammer, 16th grooves, crossing, double thumb, triplet combos | timing, pitch (class advice-only) | funk/fusion |
| `b-read` Reading | 13 | clef, rhythm, melodies, key sigs, position, chord charts, Nashville, written groove, 16th funk, Nashville switch, roadmaps, quick study, rock/pop session chart | score match, rules | both |
| `b-posread` | 6 | low range, positions II/V/VII, shift at bar line, IX/XII | score match | both |
| `b-styles` Styles | 17 | rock, pop ballad, Motown, shuffle, disco, reggae, bossa, samba, **tumbao (1 level)**, funk, gospel, **metal + 7/8 riff**, Hijaz maqsum + **10/8**, 5-string gospel, études rock / funk / **jazz upper register** | timing, kick, ghost class, swing | mostly pop/rock on-ramp |
| `b-ear` Bass ear | 9 | higher/lower, tonic, roots I-IV-V, roots ii-iii-vi-V7, rhythm recall, melodic recall, **transcribe 2 bars of walking**, inversions/slash by ear, **quality → arpeggio (maj7/m7/7; + m7♭5, dim7)** | answer played on bass, pitch + timing | partial for the niche |

### 1.2 Upright and topics

| Family / topic | Lv | Content | Niche relevance |
|---|---|---|---|
| `b-up-pos` | 6 | Simandl ½ → thumb | technique |
| `b-up-arco` | 9 | long tones … bowed études Gr 1–8 style | classical |
| `b-up-scales` | 10 | ABRSM-style 1–3 octaves, dom7, dim7, 3rds (♩40→76) | classical |
| `b-up-pizz` | 4 | long pizz quarters, ii–V–I, sustain at tempo (140→200), pizz étude | jazz feel |
| `b-up-walk` | 5 | two-feel → free blues walk | jazz, stops early |
| `b-up-read` | 6 | 1st position … tenor clef, treble clef | classical |
| topics `bass-notes`, `bass-shapes`, `bass-intervals`, `bass-scales` | 4 / 3 / 5 / 3 | neck notes, R-5-8 and arpeggio shapes, interval shapes, boxes | fretboard |

Engines already in the app that the niche plan can reuse: `band.ts` (walking bass, comping per style, standards),
`bassBand.ts` (harmony band under bass takes, with the headphones gate), `grooves.ts` (5/4, 7/8, 7/4, 9/8, clave 3-2,
tumbao, songo, cha-cha, jazz waltz, 6/8 afro), drum course (`d-latin`, `d-mideast` 7/8, 9/8 and 10/8, `d-jazz` trading 4s
with a `landing` goal), `barry.ts` (dim moves, 6th-diminished chords, half-step rules, pivots), `improvRules.ts` and
`improvCoach.ts` (constraint improvisation and debrief), `standards.ts` (41 charts), the `upright` and
`bass-fretless` tunings with the cents gate, the chroma ring-check (`chroma.ts`, used for guitar chords), and the
`bassAnalyze` rule kinds `walk`, `chordTones`, `nearest` and `target`.

### 1.3 Where it stops short of the niche (summary)

- **Jazz:** good walking construction and a wide standards list, but the top is "correct notes at 240". Swing *time*
  (long quarters, placement against the ride, no drift over choruses), up-tempo (260–320), Barry Harris / bebop line
  language, soloing past ii–V guide tones, form and arrangement (2→4, pedals, hits, endings), 3/4 walking, Latin jazz
  and trading are missing or thin.
- **Prog / fusion:** odd meter is 3 levels on roots (`b-time` 10) plus 3 style riffs (7/8, 10/8). There's no 9/8, 11/8,
  13/8 or 15/8, no grouping rotations, no mixed meters, polymeter, polyrhythm, metric modulation or displacement, no
  unisons with guitar/keys, no tapping, chordal bass or fretless-specific levels, and harmonics are one item.
- **Ear:** roots, slash bass and 5 chord qualities are there. Extended/altered qualities, tritone-sub/backdoor motion,
  form ("where am I in the tune"), longer transcription and meter/grouping ear are missing.

---

## 2. Reference: what a serious jazz / prog bassist curriculum covers

Summarised in our own words, from course catalogues and method contents (sources in §7). The ✓ / ~ / ✗ column is our
status.

| Area | Typical content at the serious level | Ours |
|---|---|---|
| Walking (Friedland, Reid, Goldsby, Fuqua, Stinnett/Berklee) | construction order (✓ ours), then **feel**: long quarters, on-top placement, ride lock, 3–5 choruses without drift; up-tempo 260–320 in 2 and 4; melodic contour and register over long forms | ✓ construction / ✗ feel / ~ tempo (≤240) |
| Two-feel and ballads | two-feel with skips, anticipations and pushes; 2 → 4 at the bridge or second chorus; ballad halves with pedals | ~ (feelLine plays halves only) |
| Jazz waltz | 3/4 walking, dotted-half 2-feel in 3 | ✗ (groove and the blues-waltz chart exist) |
| Bebop line language | 8th-note lines with chord tones on downbeats, chromatic passing, enclosures, approach patterns, bebop scales | ✗ (scales only) |
| Barry Harris concepts on bass | the 6th-diminished scale, dim as a passing chord between chords, the half-step rules on the dominant scale, pivots. Forum consensus: mostly applied to bass **solos/lines**, and the downbeat chord-tone idea carries over to walking | ✗ (`barry.ts` exists for piano/jazz) |
| Chord-scale and modal soloing | scale per chord, guide-tone lines, modal vamps (Dorian, Lydian, sus), altered dominants, upper structures; a solo chorus on standards | ~ (blues + ii–V only) |
| Form and arrangement | AABA/ABAC/blues/rhythm forms, intros/vamps, tags, stop-time, pedal intros, "Latin A, swing B", keeping the form when lost | ✗ |
| Trading 4s / 8s | solo for 4 bars, land the next 1 with the drums | ✗ for bass (drums have it) |
| Latin / Afro-Cuban (Goines & Ameen; Berklee labs) | tumbao (anticipated 2& and 4, no 1), clave direction 2-3/3-2, cha-cha, songo, mozambique, guaguancó, 6/8 Afro-Cuban; Brazilian bossa, samba, partido alto, baião; Latin jazz anticipating the changes | ~ (1 tumbao, bossa, samba levels) |
| Standards repertoire ladder | graded tune list (blues → rhythm changes → standard ii–V tunes → modal → minor → bebop up-tempo → Coltrane) with tempo targets; whole-tune performance (head, walk, solo, trade) | ~ (36 tunes, not graded, one chorus) |
| Odd meters (Berklee "Playing in Odd Meters"; Bero; Malaman) | 5, 7, 9, 10, 11, 13, 15 in 8ths and 16ths, groupings and rotations, mixed meters, odd groupings over 4/4 | ~ (5/4, 7/4, 7/8, 10/8) |
| Polymeter / polyrhythm / metric modulation / displacement | riff cycles against 4/4, 3:2 and 4:3, dotted-8th or triplet pivots to a new tempo, riffs moved by an 8th/16th | ✗ |
| Unisons | tight unison riffs and runs with guitar/keys, octave-doubled lines, fast 16th unisons | ✗ |
| Extended techniques | two-hand tapping, natural + artificial harmonics and harmonic chords, chordal bass (double-stops, shells, 10ths), fretless intonation and vibrato, 6-string range | ~ (10ths, high chords, 1 harmonics item, vibrato) |
| Fusion harmony | non-functional slash chords, constant structure, Lydian/sus vamps, 16th fingerstyle lines through them | ~ (slash/pedal L10) |
| Rock | pick down/alt, palm mute, riffs, stamina at 160–200 | ✓ (pick 1–8, length 6, styles 1/12/15) |
| Ear (the bass seat) | chord quality incl. extended/altered, inversions, ii–V / backdoor / tritone sub by the bass motion, form, transcription of whole lines and solos, meter/grouping | ~ |

---

## 3. Gap plan (what to build)

Tempos are the clean-take ladder (start → target). Odd-meter tempos count the **8th** where the meter is x/8 (as in
`grooves.ts`). "Path" says where the family opens on the bass path.

### 3.1 Jazz

| # | Gap → what to build | Levels (start → target) | Measured how (mic / MIDI) | Reuse | Path | Pri | Size |
|---|---|---|---|---|---|---|---|
| J1 | **`b-swing` Swing time** (feel, not notes) | 1 long quarters (each note ≥ 85% of the beat) 100→160 · 2 on top of the beat (pocket target −10…−20 ms vs the ride) 120→180 · 3 centre / laid-back on request 120→180 · 4 ride drops out for 4 of 8 bars 140→200 · 5 three choruses of a blues, no drift 160→220 · 6 up-tempo walk 220→**280** · 7 up-tempo 2-feel / 4-feel 260→**320** | `release` (note length), `pocket` target offset vs the swing ride lane, `drift` / `barDrift` over choruses, timing SD; walk rules stay on (a roots-only line fails, N6) | genWalk `refWalk` + rules, b-pocket `pocket`, b-time drop-out plan, BassGoal `release` / `drift` | after `b-walk` 7 | **P1** | M |
| J2 | **`b-barry` Barry Harris on bass** (concepts from `barry.ts`, own material) | 1 the 6th-diminished scale in position (8ths) 80→140 · 2 dim7 as a passing chord in a walk (I – ♯I° – ii, IV – ♯IV° – I/5) 100→160 · 3 dominant scale descending with the half-step rule: chord tones on every downbeat (8ths) 90→160 · 4 the same rule in a quarter-note walk (ct on 1 and 3) 110→180 · 5 pivots (octave break) in an 8th-note line 100→160 · 6 a chorus of bebop lines over ii–V–I / rhythm-changes A 120→200 | new rule kind `downbeatCt` (pitch class on each downbeat is a chord tone, extending `ruleCheck`); dim-passing rule (the chosen dim is a valid passing chord); swing ratio on 8ths | `barry.ts` (`moveDim`, half-step rules), `bassAnalyze.ruleCheck`, b-impro solo builder | after `b-walk` 9 and `b-impro` 6 | **P1** | M |
| J3 | **Bebop and chord-scale soloing**: extend `b-impro` 7–14 | 7 enclosures into 3rds/7ths 80→140 · 8 chromatic passing / bebop scale, 8ths with cts on beats 90→160 · 9 ii–V–I solo lines in all 12 keys 100→160 · 10 minor ii–V–i and altered dominants 90→150 · 11 modal vamps (Dorian, Lydian, sus) 90→140 · 12 a solo chorus on a rhythm-changes chart 120→180 · 13 a solo chorus on a standard (picked from `BASS_STD`) 100→180 · 14 **trading 4s with the drums** (4 bars time, 4 bars solo, land on 1) 120→200 | `target` / `chordTones` rules with per-chord scales, landing share, **swing ratio** (missing today on impro 5–6: add `swing {ratio 1.6–2, tol}`, S), `landing` goal for trading | b-impro `solo()` builder, `targetRules`, drums `d-jazz` trading pattern + `landing`, `improvRules` constraint sets | from `b-impro` 6 | **P1** | M |
| J3b | **ImprovRules for bass**: the constraint-improvisation screen (`ImprovRules.tsx`) with bass capture | none; open it from the bass hub with `captureOptsFor(bass)` (the 41–98 Hz window) | as the jazz course | improvRules, improvCoach | hub "styles" | P1 | S (check capture) |
| J4 | **`b-jform` Form and arrangement** | 1 two-feel with skips and pushes ("and" of 4) 100→160 · 2 2 → 4 on the bridge (AABA) 120→180 · 3 pedal intros and dominant pedals 100→160 · 4 stop-time and ensemble hits 120→200 · 5 tags and endings (I–vi–ii–V ×3, final hit) 120→180 · 6 Latin A / swing B 120→180 · 7 a whole tune: head in 2, 2 choruses walking, out-head in 2 120→200 | per-section rules (halves in 2-feel sections, quarters in 4: onset density per bar), `landing` on hits, pedal pitch held, walk rules | `feelLine`, `standards.ts` AABA texts, `landing` goal, bassBand comping | after `b-walk` 11 | **P1** | M |
| J5 | **Jazz waltz walking** (add to `b-walk` 19–20) | 19 3/4 walking (3 quarters, approach on 3) 120→180 · 20 blues waltz chorus (`blues-waltz` chart) 120→200 | walk rules with `beatsPerBar = 3` (already a parameter) | genWalk, `jazz-waltz` groove | after `b-walk` 11 | P2 | S |
| J6 | **Graded standards ladder**: regroup the 36 `BASS_STD` tunes into 5 tiers with tier tempos (T1 blues / two-chord modal 100→160; T2 rhythm changes, ii–V tunes 120→200; T3 minor, bossa, ballads; T4 bebop up-tempo 200→280; T5 Coltrane / Giant Steps slow → 200) + a "set list" badge; add charts that serious players expect (bebop heads on standard changes, Cherokee-type fast form, Countdown-type subs, more ballads), as changes only, to `standards.ts` (shared with piano and jazz) | 5 tier levels replacing L11/13/14/18 grouping | walk / chordTones rules (as now) | `BASS_STD`, `standards.ts` | `b-walk` from L11 | P2 | M |
| J7 | **Upright jazz top**: `b-up-walk` 6–9 (rule-judged standards on the upright tuning with the cents gate; up-tempo pizz 160→260; a thumb-position solo; an arco head-style line) | 4 | rules + cents | genWalk with `tuning: 'upright'`, upright `withCents` | upright track | P2 | S |

### 3.2 Latin and Afro-Cuban (jazz side)

| # | Gap → what to build | Levels | Measured how | Reuse | Path | Pri | Size |
|---|---|---|---|---|---|---|---|
| L1 | **`b-latin` Afro-Cuban and Brazilian bass** | 1 tumbao on one chord: anticipated "2&" and 4, nothing on 1, clave sounding (3-2) 80→120 · 2 the same in 2-3 · 3 tumbao over montuno changes (I–IV–V–IV, ii–V) 90→140 · 4 cha-cha 100→130 · 5 songo (funk-songo) 100→130 · 6 mozambique 100→130 · 7 Afro-Cuban 6/8 (bembé bell) 160→240 (8ths) · 8 partido alto and baião 80→110 · 9 Latin jazz: tumbao on a minor standard's changes, **the root of each new chord anticipated** on the "and" of 4 100→160 | timing vs the clave grid; rest check "no onset on beat 1" (the `release` / rest measure of b-length 1); the anticipation rule (the next chord's root sounds an 8th early, a new rule flag on `target`); kick/tumbadora lock where a lane exists | `grooves.ts` (clave-32, tumbao, songo, cha-cha, 6-8-afro), drum course `d-latin` grooves for the band, styles 9 generator, bassBand `latin` comping | from `b-styles` 9 | **P1** | M |

### 3.3 Prog, fusion and rock

| # | Gap → what to build | Levels (start → target) | Measured how | Reuse | Path | Pri | Size |
|---|---|---|---|---|---|---|---|
| P1 | **`b-odd` Odd meters and groupings** | 1 5/4 as 3+2 and 2+3 70→140 · 2 7/8 rotations 2+2+3 / 3+2+2 / 2+3+2 (accents on group starts) 140→240 · 3 9/8 2+2+2+3 vs 3+3+3 160→260 · 4 11/8 (3+3+3+2, 2+2+3+2+2) 160→260 · 5 13/8 and 15/8 (7+8) 160→240 · 6 odd groupings over 4/4 (3+3+2 in 8ths; 3+3+3+3+4 in 16ths) 70→110 · 7 **mixed meter** from a chart (7/8–4/4, 4/4–3/4–2/4 bars) 80→130 · 8 **displacement**: the same riff moved by an 8th / a 16th 70→110 | per-note timing on the meter grid, **accent pattern** (loudness on group starts vs the others, the existing accent analysis), `barDrift`, pitch | b-time `odd` case, `pulse: 8`, `meter`, b-styles 12–14; **new grooves** in `grooves.ts`: 5/8, 11/8, 13/8, 15/8 and the 7/8 rotations (also used by the metronome and drums); **per-bar meter** for L7 (Drill + `drumHits`) | after `b-time` 10 | **P1** | M (L for L7's per-bar meter) |
| P2 | **`b-poly` Polymeter, polyrhythm, metric modulation** | 1 a 5-note riff over 4/4 drums (cycle realigns every 5 bars) 70→110 · 2 a 7-note riff over 4/4 · 3 3:2 (dotted quarters over 4/4) 70→110 · 4 4:3 over a 3/4 or 6/8 groove 70→100 · 5 **metric modulation**: triplet quarter → new quarter (e.g. 120 → 180) · 6 dotted 8th → new quarter (120 → 160) · 7 a riff in 7/8 against drums in 4/4 (prog polymeter) 70→110 | timing on the riff's own grid against the drum grid; for modulation: the median IOI of the new section vs the target ratio (±2%), plus timing on the new grid | b-time engine, drum lanes in another meter (`drumHits` with a separate meter for the band) | after `b-odd` 4 | **P1** | M–L |
| P3 | **`b-prog` Riffs and unisons** | 1 pick riffs with an octave pedal in 16ths 70→120 · 2 **unison riff with a guitar/keys line** (the band plays the same line) 80→130 · 3 octave-doubled and 5th-below unisons 80→130 · 4 fast 16th unison runs (chromatic, whole-tone, diminished) 80→140 · 5 odd-meter unison riff (7/8, 11/8) 160→240 · 6 sequenced riff through moving chords (riff transposition) 80→130 · 7 ostinato under changing harmony (pedal riff) 80→130 · 8 a 16-bar prog étude (mixed meter + unison + pedal) 70→120 | timing vs the score (unison "tightness": target \|mean offset\| ≤ 12 ms, SD ≤ 18 ms), pitch, evenness; band only with the headphones gate, as now | b-pick / b-styles 12 / 15 generators, **bassBand: a "lead unison" part** (band.ts plays a melody line; a small engine add), the études builder (`genStudy`) | after `b-pick` 5 and `b-odd` 2 | **P1** | M |
| P4 | **`b-ext` Extended techniques (fusion)** | 1 natural harmonics at 12/7/5/4/3 (from 1 item) 60→90 · 2 harmonic chords and melodies 60→80 · 3 artificial harmonics (one item set) 60→80 · 4 two-hand tapping: R-5-8-10 with a fretting-hand pedal 60→100 · 5 tapped arpeggios through a ii–V 60→100 · 6 chordal bass: double-stops (3rds, 10ths) and shells (R-7, 3-7) on a ii–V 60→100 · 7 comping on bass (shells in rhythm) 80→120 · 8 **fretless intonation**: slides into target notes, long tones with vibrato (`bass-fretless`) 60→90 | pitch per note (harmonic pitches are clean; check octave folding), legato ratio for tapping (hands can't be seen: self-check), **chroma match** for double-stops/shells (as the guitar chord ring-check), **cents gate** for fretless (as upright) | b-legato `harm` / `vib`, `chroma.ts`, upright `withCents`, the `bass-fretless` tuning (no levels use it yet) | after `b-legato` 5 | P2 | M |
| P5 | **Fusion harmony lines** (add to `b-impro` or `b-prog`) | 3–4 levels: 16th fingerstyle lines over Lydian / sus vamps, non-functional slash-chord sequences (constant structure), 7alt lines in 16ths, upper-structure arpeggios 70→110 | `target` rule with a scale per chord | `targetRules`, b-chord 10 slash, b-scale 8–9 | after `b-impro` 11 | P2 | S |
| P6 | **Rock stamina top** (add `b-pick` 9–10) | 9 downstroke 8ths 150→200 for 2 minutes · 10 alternate 16ths 120→150 with palm mute | timing, drift, palm-mute score | b-pick 1 / 4 | after `b-pick` 4 | P3 | S |

### 3.4 Ear (bass seat)

| # | Gap → what to build | Levels | Measured how | Reuse | Pri | Size |
|---|---|---|---|---|---|---|
| E1 | **Wider chord quality** (`b-ear` 10–11) | 10 m6, maj6, 7sus4, m(maj7) · 11 7alt / 7♯9 / 7♭9, maj7♯11 → play the chord's arpeggio or its defining tone | answer pitch played on the bass, as `quality` | bassEar `quality` | **P1** | S |
| E2 | **Harmonic motion from the bass** (`b-ear` 12–13) | 12 ii–V–I vs backdoor (iv–♭VII–I) vs tritone sub (♭II7): play the bass line you hear · 13 secondary dominants and dim passing chords: play the roots / bass notes | pitch + timing of the played answer | bassEar `roots` / `slash`, band comping | **P1** | S–M |
| E3 | **Form: "where am I"** (`b-ear` 14–16) | 14 hear 8 bars, play the first root of the next section (blues / AABA) · 15 band drops in at a random bar of a known standard; join with the right root on the next downbeat · 16 hear a chorus, play the bridge's roots | right root at the right bar (pitch + bar index), timing | band.ts walking + comping, `standards.ts` | **P1** | M |
| E4 | **Longer play-back / transcription** (`b-ear` 17–19) | 17 4 bars of walking 80→140 · 18 8 bars, or a 2-bar bebop phrase in 8ths · 19 an odd-meter riff / a tumbao by ear | hidden-reference score match (existing) | bassEar `transcribe` / `melodic` | **P1** | S |
| E5 | **Meter and grouping by ear** (`b-ear` 20–21) | 20 hear a groove, play roots on its group starts (7/8 2+2+3 vs 3+2+2, 9/8) · 21 hear a metric modulation, play the new pulse | onset timing on the right grid | grooves, drumEar ideas | P2 | S |
| E6 | **Transcribe from your own recording** | load your own audio (legal per my-songs-legal), loop/slow, then play the line with it | needs beat tracking of the recording to time the take: L. Until then, unmeasured practice, so it doesn't count | piece coach | P3 | L |

### 3.5 Cross-cutting

| # | What | Pri | Size |
|---|---|---|---|
| X1 | **Endpoint goals on the path.** Name the two summits so the top ranks mean something: *Jazz standard* = three choruses of a Tier-4/5 standard at ≥ 260 with swing-time gates, plus a bebop solo chorus and trading 4s. *Prog standard* = 11/8 and mixed-meter riffs at target, a unison étude and one metric modulation. Level test and Master rank read from these capstones | P1 | S |
| X2 | **Track goal** in the bass intake: "jazz / prog-fusion / both" weights the scheduler and path unit order (the goal+rank system already exists) | P2 | S |
| X3 | **Measurement fixes** found here: swing ratio on b-impro 5–6 (labelled swung, not measured); verify bass capture in ImprovRules; the long-form drift check on standards (L11+) | P1 | S |
| X4 | New `grooves.ts` meters and per-bar meter (P1/P2) also serve the drums course and the metronome: build once | P1 | with P1 |
| X5 | Glyphs: every new family/step needs its own symbol (`Glyph.tsx`, `stepGlyphs.ts`); voice lines for new mini-lessons (narration pipeline) | P1 | S each |

---

## 4. Pop-centred content and how to frame it as the on-ramp

Keep all of it. It is good groove training. Put it in the first unit band of the path, labelled as the foundation for
the two summits, not as the destination.

| Existing | Why it reads pop | Framing / small change |
|---|---|---|
| `b-styles` 1–6, 10–11, 14 (rock, pop ballad, Motown, shuffle, disco, reggae, funk, gospel) | mainstream grooves | Unit name "Groove foundations". Each card says what it trains for the niche (e.g. Motown → chromatic approach = walking; funk → 16th time = fusion; disco octaves → unisons) |
| `b-chord` 1–3, `b-pocket` 1–2, `b-ear` 3–4 on pop progressions (`PROGS.pop`, `p145`) | I–V–vi–IV material | After the first pass, rotate in `jazz`, `iivi` and `minor` progressions at the same level (generator option), so the on-ramp already hears the niche's harmony |
| `b-read` 7, 10, 13 (Nashville, the rock/pop session chart) | session-pop skill | Keep it as "session skills". Add a sibling level reading a jazz lead sheet (slashes + hits) |
| `b-impro` 1–4 (fills to root/3rd, pentatonic solo) | rock/pop fills | Bill as step 1 of the solo ladder that ends at J3 (trading 4s, a standard's chorus) |
| `b-styles` 15 rock étude, `b-pick` | rock, not pop | Rock is in the niche (rock/prog players). Frame it as the **prog track's base** and route it to P1/P3 |
| Song practice (my songs) | pop songs | The on-ramp and motivation. Path weight stays on measured families |

---

## 5. Priorities and order

| Order | Item | Why first |
|---|---|---|
| 1 | **J1 Swing time** + X3 fixes | Turns "right notes" into "swings at a pro tempo": the clearest jazz-standard gap, built on existing measures |
| 2 | **P1 Odd meters** (+ X4 grooves) | The prog core. Today it stops at 7/8 on roots |
| 3 | **J3 Bebop/chord-scale solos + trading** and **J2 Barry Harris** | The owner's own jazz background. `barry.ts` and `improvRules` are already in the app |
| 4 | **E1–E4 ear** | Small, high value, all reuse `bassEar` |
| 5 | **P3 Riffs and unisons**, **P2 polymeter / metric modulation** | Prog identity. P2 needs the per-bar / dual-meter grid |
| 6 | **J4 Form**, **L1 Latin** | Jazz completeness (the bagrut and gig reality) |
| 7 | P2-priority rest: J5, J6, J7, P4, P5, E5, X2 | Breadth and repertoire |
| 8 | P3: P6, E6 | Nice to have |

Rough total: about **95 new levels**. J1 7, J2 6, J3 8, J4 7, J5 2, J6 5, J7 4, L1 9, P1 8, P2 7, P3 8, P4 8, P5 4, P6 2,
ear 12. Engine work: one new rule kind (`downbeatCt`), an anticipation flag on `target`, new grooves, per-bar meter,
dual-meter band grid, a lead-unison band part, a modulation tempo check, and chroma for bass double-stops. The rest is
generator cases on existing measures. Per the path-effort note (N11), new families should be **gated by goal (X2)** so
a jazz player isn't sent through all of prog and vice versa.

## 6. What a mic / MIDI can't see here (stand-ins)

| Skill | Limit | Stand-in |
|---|---|---|
| Tapping vs fretting | hands are invisible | legato ratio + timing at tempo; self-check |
| Artificial vs natural harmonics | similar pitch result | pitch + item design (pitches only reachable one way); self-check |
| "Swing feel" beyond placement | subjective | measurable parts only: note length, offset vs the ride, drift, 8th swing ratio; never a "feel score" |
| Phrasing quality in solos | subjective | rule compliance + landing share + the improvCoach debrief (by design, as walk 15) |
| Fretless "mwah" / tone | timbre | cents and slide target only |
| Real-recording transcription | no reference grid | P3 (E6) needs beat tracking first |

## 7. Sources

- Berklee bass department: [Studying Bass at Berklee](https://college.berklee.edu/node/2206648) (40+ classes);
  [Playing in Odd Meters ILBS-263](https://college.berklee.edu/node/2271001); [Funk/Fusion Styles for Bass](https://college.berklee.edu/node/2270966);
  [Finger Style R&B/Fusion Lab](https://college.berklee.edu/node/2270976); [Survey of Bass Styles](https://college.berklee.edu/node/2273866);
  [Metal Bass](https://college.berklee.edu/node/2271096); Berklee Online [Jazz Bass (Stinnett)](https://www.springest.net/berklee-college-of-music/jazz-bass).
- Jazz bass methods: John Goldsby, [books](https://john.goldsby.de/books/) and [Jazz Bass Vol. 2: Stretching Out](https://courses.discoverdoublebass.com/courses/598835)
  (fast walking, triad pairs, soloing); [Lay It Down](https://courses.discoverdoublebass.com/p/lay-it-down);
  Ed Fuqua, [Walking Bassics](https://www.jazzbooks.com/jazz/product/WB); Chuck Sher, [The Improvisor's Bass Method](https://www.shermusic.com/0961470100.php);
  Ed Friedland, *Building Walking Bass Lines*; Rufus Reid, *The Evolving Bassist* (contents from `BASS_CURRICULUM.md` §11, not rechecked here).
- Barry Harris concepts: [Extra half steps (Jazz Education Abroad PDF)](https://www.jazzeducationabroad.org/wp-content/uploads/2020/11/Improvisation-Barry-Harris-Extra-Half-Steps-1.pdf);
  [jazzguitar.be: Barry Harris bass lines?](https://www.jazzguitar.be/forum/theory/95178-there-barry-harris-bass-lines.html) (forum, secondhand:
  the concepts are mostly applied to bass solos/lines). Sources in `src/engine/barry.ts`.
- Afro-Cuban: Goines & Ameen, *Funkifying the Clave* ([contents](https://catalogosiidca.csuca.org/Record/UCR.000523204/TOC):
  clave and tumbao, songo, guaguancó, Afro-Cuban 6/8, cha-cha and mozambique).
- Odd meter: Marek Bero, [Bass Gym 101: Odd Time Bass Grooves](https://www.notreble.com/?p=78255) (5, 7, 9, 10, 11, 13, 15 and combinations);
  [MalaOdd bass course](https://shop.federicomalaman.com/mala-odd-bass-course) (5/4, 7/4, 11/8, compound);
  [Mixdown: odd time on bass](https://mixdownmag.com.au/features/how-to-play-bass-in-odd-time-signatures-to-develop-new-ideas-and-grooves/);
  [Soundbrenner: groupings](https://www.soundbrenner.com/blogs/articles/make-odd-time-signatures-groove-not-counting).
  No bass-specific metric-modulation course was found; P2's content is built from general rhythm pedagogy.
- Earlier bass research in this repo: `BASS_CURRICULUM.md` §11 (RSL, Trinity, ABRSM, Friedland, Wooten, SBL, TalkingBass, …).

---

## 8. Implemented (P1, 2026-11-11)

Code: `src/engine/drills/bassNiche.ts` (the new families, b-impro 7–14, track filter, summits, the improv capture),
`bassEar.ts` (b-ear 10–19), `bass.ts` (catalogue and dispatch), tests in `tests/bassNiche.test.ts` (+ `tests/bassTake.ts`).
70 new levels: 7 families with 52 levels, b-impro 7–14 (8), b-ear 10–19 (10). Built on the prog engine
(`PROG_ENGINE.md`): `withBarPlan` meters, tempo maps, `bandMeter`, `unison`, `applyForm`, the `downbeatCt` /
`anticipate` / `swingWalk` rules.

| Item | Family / levels | Measured by |
|---|---|---|
| J1 | `b-swing` 1–7: long quarters 100→160 · on top 120→180 · centred / laid back 120→180 · drums drop out 140→200 · three choruses 160→220 · up-tempo walk (blues, rhythm changes) 220→280 · in 2 then in 4 240→320 | walk rules + `swingWalk` (long ≥ 85 %, ride window −20…−10 / ±6 / +6…+16 ms, chorus drift ≤ 2 %) |
| J2 | `b-barry` 1–6: 6th-diminished scale (major, minor) · passing diminished in a walk · half-step rules from 1/3 and 5/7 · the rule in a walk (1 and 3) · pivots · a chorus of bebop lines (ii–V–I, rhythm A) | note for note (L1); walk rules (L2); `downbeatCt` every 1 / every 2 (L3–6); only `barry.ts` lines whose downbeats are chord tones are used |
| J3 | `b-impro` 7–14: enclosures (major, minor) · bebop scales · ii–V–I in 12 keys · minor ii–V–i altered · modal vamps (Dorian, Lydian, sus) · rhythm-changes chorus · a standard's chorus (5 tunes) · trading 4s | `target` rules with guide-tone landings and the new `passing` option (a non-scale note a step or less from the next); bebop scales `downbeatCt`; swing ratio 1.8 ± 0.3; trading: the band lays out in the drum bars, re-entry on 1 within 40 ms (`landing`) |
| J3b | constraint improvisation (Charts / RulesPanel) on a bass | `improvCaptureOpts`: YIN down to 28 Hz (22 with a low B), 4096 frame, in the bass course |
| J4 | `b-jform` 1–7: two-feel with skips and pushes · AABA 2→4 on the bridge · pedal intro / interlude · stop-time hits · tag ending ×3 + hit · Latin A / swing B · a whole tune (head in 2, 2 choruses, out-head) | `applyForm` road map (drums and band per section) + `goal.prog.form` (no lost bars, section starts ±40 ms, drift ≤ 2 %); lines written per section |
| L1 | `b-latin` 1–9: tumbao 3-2 · tumbao 2-3 over i–V7 · tumbao over montuno changes (free) · cha-cha · songo · Mozambique · Afro-Cuban 6/8 · partido alto / baião · Latin jazz on Blue Bossa / Song for My Father (free) | written lines (a note on 1 is an extra note); montuno: `target` + `anticipate: 1` (the next root on 4); Latin jazz: `anticipate: 0.5`; new groove `clave-23` |
| P1 | `b-odd` 1–8: 5/4 3+2 / 2+3 · 7/8 rotations · 9/8 · 11/8 · 13/8 and 15/8 · odd groupings over 4/4 (3+3+2 8ths, 3+3+3+3+4 16ths) · mixed meters (7/8–4/4, 4/4–3/4–2/4) · displacement (8th, 16th) | timing on the time map (per-bar meters, drums per bar), `groupAccent` 0.3 (0.25 mixed) and the accent check |
| P2 | `b-poly` 1–7: 5-note and 7-note riffs over 4/4 · dotted quarters (3:2) · 4:3 over 3/4 · metric modulation triplet ♩ → ♩ and dotted ♪ → ♩ · 7/8 riff vs 4/4 drums | `bandMeter` 4/4 under the riff's meter; `tempoRatio` ±2 % with the new 1 within 30 ms |
| P3 | `b-prog` 1–8: pick riffs over a pedal (16ths) · unison with the guitar · octave / 5th unisons · 16th unison runs (chromatic, whole-tone, diminished) · odd-meter unisons · sequenced riff · ostinato under moving chords · 16-bar étude (7/8 riff, unison line, pedal) | `unison` band part + `goal.prog.unison` (|mean| ≤ 12 ms, SD ≤ 18 ms); group accents in the odd meters |
| E1–E4 | `b-ear` 10–19: 6ths / sus / m(maj7) · 7♭9 / 7♯9 / maj7♯11 / 7alt · cadences by the bass (ii–V, backdoor, tritone sub) · secondary dominants and passing dim · where am I (blues bars 9–12, the bridge after A A) · the band drops in anywhere · a chorus then the bridge · 4 bars (and written) · 8 bars or a Barry line · 7/8 riff or tumbao | the answer played on the bass (pitch + timing), hidden until the result |
| X1 | summits | `BASS_SUMMITS` (jazz: swing 5–7, Barry 6, impro 13–14, jform 7; prog: odd 4/5/7, prog 8, poly 5/7) and two diamond badges `tech:g-bass:summit-jazz / -prog` |
| X3 | fixes | b-impro 5–6 are swung now (`swing: true`: the "and" at 2/3, swing ratio checked; item ids gained `:sw`, so their old progress starts over); ImprovRules bass capture (above) |
| Track | owner decision | `DrillSettings.bassTrack` (jazz / prog / both, default both) — Drills settings "Track" chips on the bass; `BASS_TRACK` filters the jazz families (swing, Barry, form, Latin) and the prog families (odd, prog, poly) out of the hub and the path; b-impro and b-ear are on both |

Wiring: own symbols (`swingtime`, `barrybass`, `roadmap`, `tumbao`, `oddmeter`, `unison`, `polymeter`), path
placement after each family's prerequisite (`BASS_NICHE_LATER` in `path.ts`), teaching order (jazz families after
b-impro, prog families after b-pick), rating tags (`events.ts`: steady, meter odd / compound, subdivide, Barry,
progression, improv play / answer, the ear levels' own skills), Technique hub topics, family milestone badges (automatic)
and exam tags, the walk placement probe seeds `b-swing` 2, seven quick lessons (`src/content/mini/bassNiche.ts`) that
open each family's first path step (`gate('tech:<family>')` in App.tsx). Tests: every level in every key on 4/5/6
strings; model lines keep their rules; a steady synthetic MIDI take (6 ms jitter, ride offset where asked) is clean at
the start and target tempo of every item checked, a sloppy one (45 ms; ear: half the answers a half step off) never;
per family a failing take (short notes, flat accents, the old tempo after a modulation, 30 ms behind the unison, a
lost bar, no anticipation, a non-chord tone on the downbeat, straight 8ths, a late re-entry). One phone screen 390 × 844
checked with a temporary Playwright spec on one level of each family.

Not built / not verified:

- **Patterns to check with a teacher**: the cha-cha, songo, Mozambique, Afro 6/8, partido alto and baião bass lines are
  generated from general descriptions (as the drums plan defers Mozambique / songo for a teacher's check). The drums
  under Mozambique use `songo`, under partido alto / baião `samba` (no own grooves yet).
- **Road-map strip UI** (sections as blocks, the current bar lit, a cue a bar ahead) is not built; b-jform drills show
  the notation / tab and the result's form report only.
- **Real takes**: everything is checked on synthetic MIDI takes. The ride placement windows assume a calibrated audio
  delay; mic takes of 16th unisons and up-tempo walking (280–320) are untested on a real bass.
- No entry from the bass hub into the constraint-improvisation screen (it is reached from Practice → charts; only its
  capture was fixed). The Perform screen's improv capture is unchanged.
- The track is chosen in Drills settings only, not in the bass intake (X2, P2).
- The seven quick lessons' English lines need recordings (`tests/voiceFiles` "every static line is recorded" fails
  until then).
- P2 items (J5–J7, P4–P6, E5–E6, X2) are not started. (Built since: §9.)

---

## 9. Implemented (P2, 2026-11-11)

Code: `src/engine/drills/bassNiche2.ts` (b-walk 19–20, `b-std`, `b-up-walk` 6–9, `b-ext`, b-impro 15–18, b-pick 9–10,
the set-list badge data), `bassEar.ts` (b-ear 20–21), `bass.ts` / `upright.ts` (catalogue and dispatch),
`src/ui/RoadMap.tsx` (the road-map strip), `CourseStart.tsx` (the track in the bass welcome), tests in
`tests/bassNiche2.test.ts`. 27 new levels: 2 new families with 13 levels, and 14 levels added to five families.

| Item | Levels | Measured by |
|---|---|---|
| J5 | `b-walk` 19 jazz waltz (I–vi–ii–V–iii–VI–ii–V; minor i–iv–ii°–V) 120→180 · 20 a blues-waltz chorus (the `blues-waltz` changes in the level's key) 120→200 | walk rules on a 3/4 chart (`parseChart(text, 3)`, the band's walker in 3), the `jazz-waltz` groove |
| J6 | `b-std` 1–5 (jazz track): T1 blues and modal 100→160 · T2 rhythm changes and ii–V tunes 120→200 · T3 minor, bossas, ballads 80→160 · T4 bebop up-tempo 200→280 · T5 Coltrane changes and moving keys 120→200. 40 charts (`STD_LADDER`): the 36 walking standards regrouped plus five new practice forms in `standards.ts` (an up-tempo AABA with a ii–V-cycle bridge, a bebop form on I–VI7–II7–V7, Coltrane substitutions on a ii–V–I, a minor ballad with a line cliché, a ballad with back-cycling dominants; chord progressions only, listed in `NO_REFERENCE`) | walk rules (chord tones in 2-feel / bossa / ballad); walking choruses of 16+ bars also `swingWalk` long quarters + drift ≤ 2 % between the halves (the long-form drift check, X3). Badge "Set list" (`tech:g-bass:setlist`) |
| J7 | `b-up-walk` 6 standards on the upright (5 tunes) 100→180 · 7 up-tempo pizz walking 160→260 · 8 a solo in thumb position (A2…D4, guide tones) 90→150 · 9 an arco head-style line (guide tones in halves) 60→90 | the upright tuning's cents gate (±15 / ±20 up-tempo / ±12 arco) + walk rules / swing-time measures / target rules + swing ratio |
| P4 | `b-ext` 1 natural harmonics 12-7-5-4-3 · 2 harmonic chords and a harmonic melody · 3 artificial harmonics (the tab shows the touch point, fret + 12) · 4 tapping R-5-8-10 over I–vi–ii–V · 5 tapped arpeggios through ii–V–I · 6 double-stops (10ths; root–7th shells) · 7 comping shells in the Charleston rhythm · 8 fretless intonation (`bass-fretless`: slide into the guide tone, hold, vibrato) | pitch per note (the 3rd-fret harmonic = 2 octaves + a 5th, added to `guitar.ts finish`); timing / evenness for tapping (hands not seen: self-check, §6); `doubleStops` 0.8 chroma for 2, 6, 7 (mic only); cents ±12 for 8 (shown only on a fretless or an upright tuning) |
| P5 | `b-impro` 15 fusion vamps (Lydian, sus) · 16 constant structure (maj7♯11 chords, II/I slash triads) · 17 altered lines (minor ii–V7alt–i) · 18 upper-structure triads on the dominant (II, ♭VI), all 16ths 70→110 | `target` rules with a scale per chord (landing on chord tones; the UST bars land on the triad), straight 16ths, evenness |
| P6 | `b-pick` 9 down-strokes for two minutes (100 bars at 200) 150→200 · 10 palm-muted alternate 16ths 120→150 | timing, the evenness of the last bars against the first (`drift` 0.15) for 9; stroke asymmetry for 10 |
| E5 | `b-ear` 20 hear an odd-meter groove (7/8 in 3 rotations, 9/8 in 2), play a root on each group start; the count-in is ungrouped and the click off, so the grouping is only heard · 21 hear a metric modulation (triplet ♩ → ♩, dotted ♪ → ♩) and play quarters on the new beat, alone | onset timing on the time map (per-bar groups; a tempo map from the answer bar), hidden answers |
| X2 | the bass welcome card (course start) asks the direction — both / jazz / prog-fusion — and writes `bassTrack` (the same setting as Drills → Track) | — |
| UI | road-map strip (`RoadMapStrip`): any drill with a `form` (b-jform 1–7) shows its sections as blocks sized by bars, the bar being played lit, and a cue line one bar before each new section ("B — in 4", "Stops — stop-time hits") | — |

Wiring: symbols `setlist` and `harmonics`; path placement (`b-std` after walk 11, `b-ext` after legato 5; the new
levels of existing families sit at the end of their family); teaching order (`b-std` after `b-latin`, `b-ext` after
`b-legato`); `BASS_TRACK['b-std'] = 'jazz'`, `b-ext` on both tracks; rating tags (progressions; chord voicing / fine
pitch / subdivision by kind; meter by ear); Practice-hub topic; automatic family milestone badges; exam tags; two quick
lessons (`src/content/mini/bassNiche2.ts`) opening the two families' first steps. Tests: every level in every key on
4/5/6 strings; model lines keep their rules; steady synthetic takes clean at start and target tempo, sloppy never; per
level a failing take (a non-chord tone on the waltz's 1, a dragging second half, a wrong note on each fusion change, the
old tempo after the modulation); the 3rd-fret harmonic's pitch; double-stops as chords; the road-map strip's cue.

Not built / not verified (P2):

- **E6** (transcribe from your own recording, measured): not built. It needs beat tracking of the recording (size L,
  P3). The Slow-down screen already loops and slows a recording, unmeasured, so it does not count.
- **The walker and 6th chords**: band.ts's walking line treats m6 / 6 chords as 7th chords (an F on Gm6). The ladder
  repairs such notes to the nearest chord tone; the old `b-walk` standards levels (L11/13/14/18) are unchanged and 7 of
  their model lines keep only 95–99 % of their own rules (Autumn Leaves, Fly Me to the Moon, Blues in F, All the Things,
  There Will Never Be Another You, Stella, the minor ii–V–i cycle). Fix in band.ts (shared with piano / jazz) or reuse the
  ladder's repair — owner's call.
- **Patterns to check with a teacher**: the artificial-harmonic and tapping fingerings are self-check (§6); comping
  shells on the bass are root–7th only (no 3–7 shells).
- **Real takes**: synthetic MIDI takes only; harmonic pitch detection on a real bass (the 4th / 3rd fret partials are
  quiet), double-stop chroma and the fretless cents gate are untested on a real instrument.
- The track is asked on the welcome card only (and in Drills); the scheduler's weighting is the track filter itself.
- The two new quick lessons' English lines need recordings (`tests/voiceFiles` fails until then).
