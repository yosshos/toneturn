# AUDIT-7-GAPS: holes and shallow spots, every course and level band (2026-11-15)

Read-only audit of `redesign-v2` at `ef468a71` (0.96.0). The only file this audit added is this one.

**The question (owner):** "Do we still have holes or shallowness anywhere, in any course or level, in content, exercises or games?"

**Method.**
1. Outside first. Each course's checklist comes from the graded syllabi that AUDIT-5 and AUDIT-6 fetched and cited (see §10):
   - ABRSM piano 2021 and ABRSM aural 2024; RCM Musicianship 2024;
   - RSL / Rockschool piano and keys, guitar, bass, drums 2018 and vocals;
   - Trinity Rock & Pop;
   - ABRSM Jazz Piano G1–5 and the Jazz Performance grades 6–8;
   - Berklee ET-111; Aebersold Vol. 1; Siskind *Jazz Piano Fundamentals* 1.
   This session fetched nothing new. Items marked **[PK]** come from the methods' known contents and were not re-checked online. ABRSM Music Theory G1–5 is [PK].
2. Then the app. I dumped the live step catalogue with temporary vitest scripts. They ran from the scratchpad, so no repo file was touched. The calls were:
   - `stepCatalogue()` × `eligible()` × `courseInput()`;
   - the course's ladder families from `ladderFamiliesFor()`;
   - default drill settings.
   Jazz was dumped for a pianist, a guitarist, a bassist, a singer and no instrument. The dump has 2,506 path steps. I also dumped every drill level's key list (`shownFamilies`) for piano, guitar and bass.
3. **What changed since AUDIT-6.** AUDIT-6 was written earlier on the same day. Since then, three content stages landed:
   - **Stage A** (`9b55da35`): placement by grade in `levelPlacement.ts`, the course membership rule, a real Jazz beginner band, repertoire spread across the path.
   - **Stage B** (`adbbb4c5`): measured first steps on keys, guitar, bass and drums; `k-read`; `g-riff`; four Ear topics.
   - **Stage C** (`af706eb9`): guitar grades 9–11, the drums past 1400 (`d-pas` and others), the voice's top ladder, three-voice / one-hearing / features in Ear.
   - Also: nine new games and the verified-content gate (`cee602b2`).

   Many AUDIT-6 items are therefore **closed**. Each table says so, and §8 lists them.

**Status codes.**
- **DEEP**: performed or produced, measured, with enough levels, all keys where relevant and an applied context.
- **SHALLOW**: too few levels, few keys, recognition only, or placed far from its grade.
- **MISSING**: not on the course path.
- **HIDDEN**: gated in `src/engine/verifiedContent.ts`.

**Bands.** The app's own grade formula is `G(g) = 700 + 90·g` (`levelPlacement.ts`):

| Band | Grades | App rating |
|---|---|---|
| Beginner | Debut–G3 | 700–999 |
| Intermediate | G4–G7 | 1000–1399 |
| Advanced | G8 and diploma | 1400–1699 |
| Professional | — | 1700–1900 |

---

## 0. Path shape today (steps per band, from the dump)

| Course | < 700 | 700–999 | 1000–1399 | 1400–1899 | 1900 | Top | Widest gap between steps |
|---|---|---|---|---|---|---|---|
| Keys | 1 | 86 | 216 | 236 | 8 | 1900 | ≤ 50 |
| Guitar | 0 | 49 | 170 | 123 | 0 | 1880 | ≤ 50 |
| Bass | 0 | 71 | 150 | 166 | 8 | 1900 | ≤ 50 |
| Drums | 0 | 52 | 109 | 86 | 0 | 1880 | 60 (1820→1880) |
| Voice | 2 | 24 | 93 | 86 | 0 | 1890 | 70 (v-first 560→630→700) |
| Ear & theory | 1 | 48 | 206 | 193 | 1 | 1900 | ≤ 50 |
| Jazz (pianist) | 0 | 22 | 107 | 190 | 3 | 1900 | ≤ 50 |
| Jazz (guitar / bass / voice / none) | 0 | 11 / 14 / 10 / 10 | 101 / 101 / 88 / 84 | 180 / 192 / 184 / 168 | — | 1900 | — |

- **What is fixed.** The structural holes AUDIT-6 found are gone: the guitar ceiling (was 1566), the drums' advanced band (was 35 steps), the voice's top (was 3 steps above 1700) and the index staircases. No course has a path gap over 70.
- **What remains structural.** The beginner band is thin in three courses: **Voice (24 steps), Jazz (10–22) and Ear (48)**. In each of them, the 1000–1399 band is 4–9 times denser.

---

## 1. Piano / keys

| Band | Syllabus item (source) | Status | Evidence |
|---|---|---|---|
| Beg | Posture, black-key groups, C / G / F positions, first chords (Faber / Alfred [PK]) | DEEP (closed) | `k-first` 1–11, 690–900 (`keysFirst.ts`; dump) |
| Beg | One- to two-octave scales, contrary motion, chromatic (ABRSM Initial–G3) | DEEP | `scales` 1–4, 16, 17; chromatic re-placed by Stage A |
| Beg | Pentatonic, blues, A Dorian (RSL G1–G3) | DEEP (closed) | Re-placed by `levelPlacement.ts` (Stage A) |
| Beg | Performed sight-reading, every grade | DEEP to G6 (closed) | `k-read` 1–10 (800–1400), generated per seed, 12 keys; `control-11` 780, `control-12` 1000 |
| Beg | Pedalling basics (RCM G2–G3 [PK]) | **SHALLOW** | One level only: `control-10` at 940 (dump). No half pedal, no pedal through harmony, no una corda |
| Beg–Int | Pop accompaniment from chord symbols; RSL Improvisation & Interpretation over a chart | **SHALLOW** | `accomp-7` *Pop left-hand patterns* (1214) and `accomp-10` (1401); the `song-strum` topic. No pop / rock / gospel ladder. Improvising outside jazz is drone-only (`k-impro` 1–7) |
| Beg–Adv | Graded classical pieces: minuets, sonatinas, inventions (ABRSM / RCM pieces) | **MISSING** as a path ladder | 34 repertoire steps (760–1880), all folk or jazz (dump). The classical works exist only as melodies (`songbook.ts:298` *Minuet in G*, `pdTunes.ts:35-46`). The piece coach (Pieces row) takes the player's own scores |
| Int | All keys, 3rds / 6ths, dominant and diminished 7th arpeggios (ABRSM G4–G7) | DEEP | `scales` 5–10 and 18, `arpeggios` 4–5; 12 keys (§7) |
| Int | Ornaments (ABRSM Baroque pieces, G4–G6) | **SHALLOW** | One level, `fingers-9` (1260) |
| Int | Jazz shells, rootless, comping, solo piano | DEEP, with one **HIDDEN** hole | `voicings` 1–17, `k-lh`, `k-tex` 1–20, `accomp` stride 11–18. **`k-comp` has 3 levels left (1300 / 1500 / 1650)**, because `siskind-comp-rhythms` (`verifiedContent.ts:144`) hides `cp-beat3`, `cp-basie`, `cp-pushoff` and `cp-accent`. **`k-lh` jumps 1200 → 1580**: levels 10–16 are hidden by `siskind-tenths` and `siskind-stride-variations` (`:134`) |
| Adv | **Sight-reading G7–G8 and quick study (ABRSM, RSL G6–G8)** | **MISSING above 1400** | `k-read` ends at 1400 and `control-12` sits at 1000. The keys path has no reading step from 1400 to 1900 |
| Adv | Double 3rds / 6ths, tremolo, velocity studies | SHALLOW | `advanced-4` (1330) and `-8` (1610); `fingers-13` (1540); no tremolo |
| Adv–Pro | Jazz solo piano, reharm, improvising, repertoire to 1880 | DEEP | `k-solo` 13 levels to 1900, `k-sixdim` 13, `k-reharm` 22, `k-ctx` 13; repertoire tiers to 1880 (closed) |
| — | Balance | Note | One family dominates: `k-sharm` has **41 levels** (900–1700), against one level each for pedalling and ornaments |

**Verdict.** The best-filled course. Two kinds of holes remain:
- classical and pop (repertoire, pedalling, a pop on-ramp);
- reading above G6.

---

## 2. Guitar

| Band | Syllabus item | Status | Evidence |
|---|---|---|---|
| Beg | Tune, hold, pick, open strings, first changes, TAB, rhythm reading (RSL Debut; Hal Leonard 1 [PK]) | DEEP (closed) | `g-first` 1–8 (700–870), the tuner check ±15 cents |
| Beg | Riffs at every grade (RSL group C) | DEEP (closed) | `g-riff` 1–5 (798–1158), 12 keys |
| Beg | Power chords (RSL G1–G2) | Mostly closed | `g-riff-2` palm-muted power chords at 888. The technique level `g-chords-4` is still at 978 (grade 3) |
| Beg | 4-bar rock / blues improvisation (RSL G1–G3) | **SHALLOW** | The first improvising level is jazz: `g-impro-1` *Roots on beat 1: blues, minor blues, ii–V–I, a standard* (960) |
| Beg | Fingerpicking basics (Hal Leonard 1, Trinity [PK]) | SHALLOW (add-on) | `g-fingerstyle` exists, but only when the player ticks the add-on (`guitarMeta.ts:125-131`) |
| Int | **Harmonic minor (RSL G5); Dorian / Mixolydian (G6); Lydian / Phrygian (G7)** | **SHALLOW (late)** | All of them sit in one level, `g-scales-7` *Modes, minor, symmetric and altered* at **1452 (grade 8)** (dump). Still open from AUDIT-6 GI-2 / GI-3 |
| Int | Funk 16ths, styles (reggae, country, metal, bossa, neo-soul, Mizrahi) | SHALLOW | One level each, `g-rhythm` 3–11 (986–1256) |
| Int | Reading in positions | DEEP | `g-reading` 3–7 |
| Adv | Advanced reading (jazz-chart sight-reading, Leavitt 3 [PK]) | **SHALLOW** | `g-reading` stops at 1402 |
| Adv–Pro | Above grade 8 | DEEP (closed) | Grades 9–11; `g-speed`, `g-fusion`, `g-cmarr`, `g-solojazz`, `g-hlfast` (1614–1846) |
| Adv | Gypsy jazz, Latin guajeo, slide, open tunings | MISSING | AUDIT-5 G-19, G-35 to G-37, unchanged |

**Verdict.** Healthy now from first steps to diploma. One real misplacement is left: the modes and harmonic minor arrive about three grades late.

---

## 3. Bass

| Band | Syllabus item | Status | Evidence |
|---|---|---|---|
| Beg | Hold, strap, tune, rest strokes, first roots | DEEP (closed) | `b-first` 1–8 (700–860) |
| Beg | Riffs at every grade (RSL group C) | **SHALLOW** | Guitar has `g-riff`; bass has no riff family. Only `b-styles-1` *Rock* (840), `b-styles-15` (930) and the Riff Echo bonus at 1050 |
| Int | 2-octave scales, 7th arpeggios, modes, harmonic minor (RSL G4–G6) | DEEP in content, **SHALLOW in keys** | Most arpeggio and scale levels use **4–6 keys, not 12**: `b-chord-1`, `-7`, `-10`, `-11`, `-12`, `-14` have 6 keys, `-13` has 4; `b-scale-1` has 6, `-5` / `-10` have 4 (levels dump; `K6 = [4, 9, 2, 7, 0, 5]`, `bass.ts:2511`). That breaks the owner's "all 12 keys on bass" rule, unless this is a deliberate range limit (to check) |
| Int | Slap, ghosts, pick, walking (Friedland [PK]) | DEEP | `b-slap` 8, `b-ghost` 6, `b-pick` 10, `b-walk` 15 |
| Int | Broken feel, ballad, two-feel on standards (Reid [PK]) | **SHALLOW** | `b-walk-13` and `-14` stay retired (`plan.ts:46`). Ballads appear only as two `b-std` tunes, `misty` and `valentine` (`bass.ts:1242-1243`), at 1610+. No teaching ladder |
| Int | Country two-beat | MISSING | AUDIT-5 B-26 |
| Adv–Pro | Latin, extended technique, odd meter, standards, Harris | DEEP | `b-latin` 9 (to 1900), `b-ext`, `b-odd`, `b-poly`, `b-std`, `b-barry` |

**Verdict.** Deep and well shaped. The holes:
- no riff ladder;
- no broken-feel ladder;
- half the arpeggio and scale levels are not in all 12 keys.

---

## 4. Drums

| Band | Syllabus item (RSL Drums 2018) | Status | Evidence |
|---|---|---|---|
| Beg | Grip, rebound, counting, 8th-note paradiddle, 2/4–3/4–6/8 reading, buzz roll | DEEP (closed) | `d-first` 1–8 (700–880) |
| Beg | Flams (G2) | DEEP (closed) | `d-diddles-5` at 920 |
| Int | Paradiddle around the kit (G4) | DEEP (closed) | `d-diddles-10` at 1060 |
| Int | **Triple paradiddle (RSL G4–G5)** | **SHALLOW (late)** | `d-pas-3` at **1470**, about four grades late. The whole `d-pas` family is bunched at 1420–1740, including the triple-stroke roll and the 10- and 11-stroke rolls |
| Int | Improvisation & Interpretation: develop a written groove, then a 2-bar solo (G4–G5) | **SHALLOW** | `d-fills-8` *Your own fill* (1372). `d-trade` starts at 1500. No groove-development level |
| Adv | Pataflafla, triple ratamacue, combined rolls (G8) | DEEP (closed) | `d-pas` 6–12 |
| Adv | Linear funk, displacement, odd tempos, Chapin, brushes | DEEP (closed) | `d-linear`, `d-oddtempo`, `d-chapin`, `d-brush` 1–4, `d-synco`, `d-stick` |
| Adv | **Afro-Cuban kit: mambo, songo, Mozambique** | **HIDDEN** | `latin-kit-patterns` (`verifiedContent.ts:155`) hides `d-latin` 8–10. Latin on the kit now ends at baião, 1421 |
| Adv | Rock / metal beyond the groove families | SHALLOW | `d-rock` ends at 1267 and `d-feet` at 1470 |

**Verdict.** The biggest improvement since AUDIT-6. Three gaps remain:
- the I&I groove-development task;
- some G4–G6 rudiments placed at grade 8+;
- the hidden advanced Latin.

---

## 5. Voice

| Band | Syllabus item (RSL Vocals, ABRSM / Trinity singing) | Status | Evidence |
|---|---|---|---|
| Beg | Posture, breath, tone, range, songs with the band, unaccompanied song | DEEP | `v-first` 1–3, `v-breath`, `v-songs`, `v-range` |
| Beg | **The beginner band itself** | **SHALLOW** | 24 steps in 700–999, 5 of them repertoire (dump). `v-first` is 3 levels (560–700), and those are the only steps below 759 |
| Beg | Improvise over a 4-bar diatonic sequence, non-jazz (RSL G1–G3 option, Trinity "Improvising") | **MISSING** | The first improvising is `v-scat` 1 (1246, jazz). The next is `v-quick` (1720) |
| Beg | Sing back a 2-bar rhythm on "da" (RSL ear test 2) | **MISSING** | `v-time` 1 *On the click* times sung notes, but no level plays a rhythm to echo |
| Int | Scales, modes, intervals, harmony vocals, backing vocals | DEEP | `v-scale` 9, `sing-intervals` 6, `v-harmony` 8 |
| Int | Sight-singing, fresh every session | DEEP (closed) | Seeded `sightMelody` (`vocal.ts:1090-1099`); `v-sight` 9 levels, `sight-modulate` 5 |
| Int | **Pop / R&B / MT repertoire and style between G4 and G7** | **SHALLOW** | The pop style family `v-style` starts at **1700**. Between `v-songs` (≤ 1311) and 1700 the only styled singing is jazz (`v-standards`, `v-scat`). Belt and mix are deliberately unscored |
| Adv–Pro | Dim / aug / dim7 arpeggios, leaps, runs, Quick Study, one part from the score, top of the range | DEEP (closed) | `v-arp2`, `v-leaps`, `v-runs`, `v-quick`, `v-part`, `v-top` (1720–1880) |
| Adv | Vocal jazz | DEEP | `v-scat` 10, `v-scat2`, `v-standards` 10. `v-barry` has 7 levels left: `vocal:308`, `309` and `310` are HIDDEN |

**Verdict.** Strong at the top and in jazz. Thin at the bottom, and a non-jazz singer gets no improvising and no pop styling until 1700.

---

## 6. Ear & theory (incl. exam-prep)

| Band | Syllabus item (ABRSM aural 2024, RCM 2024, ABRSM theory [PK]) | Status | Evidence |
|---|---|---|---|
| Beg | Pulse, metre, clap-back by ear, spot the change, features | DEEP (closed) | `basics-*`; `rhythm-echo` 1–7 (720–1200); `melody-change` 1–4; `mood` / `dynamics` / `articulation` moved into Ear |
| Beg | **Interval naming: ascending m3 / M3, P4 / P5 (RCM L1–L3)** | **SHALLOW (inverted)** | Descending intervals arrive first: `intervals-down` 1 at 800. **The first ascending interval naming is `intervals-all` 1 at 1050** (`topicsSkills.ts:121`). `intervals-all` 4 *Down* (1450) now duplicates `intervals-down` |
| Beg | Triad quality, root / 3rd / 5th | DEEP (closed) | `triads` 1 (950), `chord-member` 1–3 (950–1100) |
| Beg | **Written theory G1–G3**: key signatures to 1–3 sharps / flats, C / G / D / F scales, interval *numbers*, tonic triads, note values and rests (ABRSM theory G1–G3 [PK]) | **SHALLOW (late)** | `key-signatures` 1 at **1150**, `scale-spelling` 1 at 1050, `chord-spelling` 1 *Triads* at **1320**, `interval-spelling` 1 at 1280 (`topicsTheory.ts:67,120,178`; `topicsWritten.ts:804`). There is no written item for interval numbers or for note values. Written theory starts about 3–4 grades after ABRSM does |
| Int | Cadences, modulation, 7th chords, harmonic / melodic dictation, two-part | DEEP | `cadence-types`, `modulation`, `harmonic-dictation`, `staff-dictation` 1–10, `two-part` 1–6 |
| Adv | Three-part lowest voice, single hearing, features with partial credit | DEEP (closed) | `three-voice` 1–4, `one-hearing` 1–4, `features` 1–4 |
| Adv | **Species counterpoint (conservatory theory)** | **MISSING on the path (misfiled)** | `counterpoint` 1–5 exists (`topicsWritten.ts:1217`) but is tagged as the **post-tonal pack** (`path.ts:256`), which is off by default |
| Adv | Four-part writing (SATB from a bass or a melody) | SHALLOW | `figured-bass` 1–4 (alto / tenor fill, find the error, a cadence) and `chorale-rn` 1–5 are analysis and fill-in. No full realisation |
| Adv | Instrument / timbre recognition (Bagrut / GCSE style [PK]) | MISSING | Only the production pack (`pan-ear`, `eq-ear`) |
| Exam-prep | Mock exams | SHALLOW (scope) | Israeli exams only: Bagrut ×4, JAMD ×2, TAU, Bar-Ilan, Rimon (`content/bagrut.ts:27-227`). No ABRSM / Trinity / RCM graded aural mock |

**Verdict.** Ear training is the most complete area in the app. Written theory is the weak part:
- its beginner material sits 3–4 grades late;
- counterpoint is hidden in a pack.

---

## 7. Jazz

| Band | Syllabus item (ABRSM Jazz, Aebersold, Siskind, Open Studio [PK]) | Status | Evidence |
|---|---|---|---|
| Beg | Swing feel, the blues by ear, guide tones, comping rhythms, a first solo | DEEP for a pianist (closed) | `swing-ratio` 1 at 800, `blues-ear` 1–3 (820–960), `guide-tones` 1 (950), `comping` 1 (900), `k-impro` 4 (950), `k-lh` 1–5 |
| Beg | **The same for a guitarist, bassist or singer** | **SHALLOW** | 10–14 steps below 1000, almost all choice items (dump). A singer's first performed jazz is `v-scat` / `v-standards` at **1246**. Guitarists and singers are also shown `lh-tex-ear` *The solo left hand by ear* at 920, a piano item |
| Beg–Int | Performed comping and improvising inside the course | SHALLOW | 216 of the 322 pianist steps are topic (choice / place) steps; 60 are performed levels. For a singer, 20 are performed |
| Int | ii–V–I, turnarounds, rootless, minor ii–V, bebop | DEEP | `jazz-changes`, `turnarounds`, `voicing-type`, `upper-rootless`, `jazz-phrase`. Membership is fixed by Stage A |
| Int | **A comping-rhythm ladder by ear and in the hands** | **HIDDEN hole** | `comp-rhythm-ear` 1–3 is hidden entirely (`verifiedContent.ts:144`), and so are `k-comp` 1, 3, 4 and 5. Only `comping` 1–3 (choice, 900–1400) remains |
| Int–Adv | Barry Harris | DEEP but overweight; part **HIDDEN** | 70 of 322 steps are BH, 62 of them in 1250–1650. Hidden: harrisLines items, 5-4-3-2 (and its game), seven-down, chromatic scale. These need the owner's checks (`docs/THEORY-QUESTIONS.md`); not fillable by guessing |
| Adv–Pro | Reharm, colour, triad pairs, dictation, swing at tempo | DEEP | `reharm-*`, `triad-pairs`, `pent-super`, `jazz-dictation`, `swing-ratio` 4 |
| Adv | Outside playing, free improvisation, interactive comping | MISSING | AUDIT-5, unchanged |

**Verdict.** Rich for a pianist. For other instruments, the course is mostly a jazz-ear course at the start. The comping-rhythm ladder was emptied by the verification gate.

---

## 8. Exercises: cross-course facts

| Rule | State | Evidence |
|---|---|---|
| Measured, never self-report | **Holds** | `plan.ts:197` ("Self-report never counts"); `DrillTake.tsx:525`; drum probes measured only (`drums.ts:1220`). Unscored by design: belt / mix, brush sweeps (`d-jazz-9` scores taps only) |
| Rubato, then a tempo ladder | Holds for technique levels | `ladder.ts`, `rubato.ts`; Stage C tests (`tests/stageC.test.ts`) |
| All 12 keys | Piano: 425 of 457 levels have 12 keys (the rest are first steps and position work). Guitar: 215 of 277 (the rest are open chords, first steps and meter work). **Bass: 176 of 377** | Levels dump. The bass shortfall includes arpeggios and scales (§3). Games: `INST_KEYS` now has all 12 (`instGames.ts:58`) |
| Recognition vs production | Instruments, voice: production. Ear: choice / place / tap (sung items go to Voice by design). Jazz: mostly recognition except for pianists | §0 dump |
| One screen | Not re-measured here | AUDIT-GAMES fixes landed in 0.95 (`ad160551`); e2e at 320×720 for Stage B and C families |

**Closed since AUDIT-6** (verified in the dump):
- keys `k-first` and `k-read`; the scale and pedal placements;
- guitar `g-first`, `g-riff` and grades 9–11;
- `b-first`; `d-first`, `d-pas` and the drums' advanced band;
- the voice's top ladders and seeded sight-singing;
- Ear `rhythm-echo`, `intervals-down`, `chord-member`, `melody-change`, `three-voice`, `one-hearing` and `features`;
- the jazz beginner re-rating and the membership rule;
- repertoire up to 1880.

---

## 9. Games

| Course | Games shown (after the gate) | Path | Band coverage | Gaps |
|---|---|---|---|---|
| Ear | 24 | unit games + 2 bonus | all bands | No swing game, no scale-degree game (Degree Darts) |
| Jazz | 20 (`call5432` hidden) | 10 bonus steps (`pathBonus.ts:20-41`) | 1000+ only | **No beginner jazz game**: Swing-o-meter and Blues Bus were not built. **Comp Caller is not gated, yet it drills Siskind's Beat-3 / Basie / push-off / Red Garland rhythms** (`compCaller.ts:5-9`), which the gate hides everywhere else. That is a verification leak |
| Keys | 19 | unit + `bhtime`, `polylock` bonus | 1000+ heavy | No beginner performed reading game (Grand-Staff Runner not built). No stride game. `call5432` hidden |
| Guitar | 15 | unit + `riffecho` bonus | good | One-Minute Changes not built (`changerace` covers part of it) |
| Bass | 11 | unit + `riffecho` bonus | thin | No beginner game (Root Rescue not built). Partly covered by `rootsear` and `walkchanges` (minDiff 880 / 950) |
| Drums | 10 | unit + `polylock` bonus | middle | No beginner rebound game. No rudiment-by-grade game (Rudiment Slot not built). Rudiment Rush still lacks some flams and drags (AUDIT-GAMES fix 13, not re-checked) |
| Voice | 8 | Flight only as a unit game | thin | No rhythm or time game for singers. Nothing between Flight (pitch) and Run Catcher / Harmony Hold (advanced) |

- 12 of the 22 ranked new games from AUDIT-GAMES §4.2 are **not built**: ranks 11–22 (Dark Side, Degree Darts, Stride Survival, Third Jump, Sub on V, Rudiment Slot, Grand-Staff Runner, One-Minute Changes, Root Rescue, Rebound Ball, Six or Dim, Swing-o-meter).
- Built in 0.96: ranks 1–10. 5-4-3-2 Call is built but hidden.

---

## 10. The 15 most important holes (impact × effort)

| # | Hole | Course · band | Impact | Effort | One-line fix |
|---|---|---|---|---|---|
| 1 | Written theory G1–G3 sits 3–4 grades late; no interval-number or note-value item | Ear · beginner | High: every Bagrut / ABRSM beginner | S–M | Re-rate `key-signatures` 1 → 790, `scale-spelling` 1 → 800, `chord-spelling` 1 → 880; add an "interval number" level and a "note values and rests" level at 760–850 |
| 2 | Jazz beginner band for guitar, bass and voice is ear-only (10–14 steps); singers perform first at 1246 | Jazz · beginner | High: the positioning course | M | Add `JAZZ_LADDER_FAMILIES` entry levels below 1000 for each instrument: a one-note blues solo sung or played, a root-and-guide-tone walk, Freddie Green quarters. Hide `lh-tex-ear` from non-pianists |
| 3 | Comping-rhythm ladder emptied by the gate; Comp Caller drills the same hidden rhythms ungated | Jazz / Keys · intermediate | High (consistency) | S | Gate Comp Caller's hidden rhythms, or confirm the claim. Rebuild `k-comp` / `comp-rhythm-ear` 1 from generic sourced rhythms (Charleston, reverse Charleston, anticipation; Levine [PK]) |
| 4 | Keys sight-reading stops at 1400 (ABRSM G7–G8, RSL quick study) | Keys · advanced | High | M | `k-read` 11–15 (1450–1800): 4 voices, ornaments, changing metres, lead sheet with hits, 30-second look; same generator |
| 5 | Ascending interval naming starts at 1050, after descending (800) | Ear · beginner | Medium-high | S | Re-rate `intervals-all` 1 → 820 and 2 → 1000; retire or merge `intervals-all` 4 into `intervals-down` |
| 6 | Bass arpeggios and scales in 4–6 keys | Bass · int–adv | Medium-high (owner rule) | S–M | Extend `K6` levels to 12 keys, with octave displacement where range is the reason; add to `keys12` tests |
| 7 | Guitar modes and harmonic minor only at grade 8 (`g-scales-7`) | Guitar · intermediate | Medium-high | S | Split into `g-scales` levels at grade 5 (harmonic minor), 6 (Dorian / Mixolydian), 7 (Lydian / Phrygian / melodic minor) |
| 8 | Voice beginner band thin (24 steps) and no non-jazz improvisation | Voice · beginner | Medium-high | M | `v-first` 4–6 (pitch match, five-note echo, a 4-bar song) and a diatonic improv family over I–IV–V (900 / 1000 / 1100 / 1250) graded on time and chord-tone landings |
| 9 | Pop / MT singing between G4 and G7 (`v-style` only from 1700) | Voice · intermediate | Medium | M | Add `v-style` entry levels at 1150–1400 (pop phrasing, R&B riffs in context, MT text-driven phrasing), with the same measured grading |
| 10 | Keys pop on-ramp and pedalling are single levels | Keys · beg–int | Medium | M | `k-pop` 1–6 (chord-symbol LH patterns, 8th / 16th pop patterns, RSL-style chart improvisation, 820–1250) and pedal levels 2–4 (syncopated, half, through harmony) |
| 11 | No graded classical repertoire on keys | Keys · all | Medium (classical students) | M–L | Public-domain tier through the piece coach: Petzold minuet, Clementi Op. 36, Bach inventions, Chopin preludes (820–1700) |
| 12 | Drums I&I groove development missing; triple paradiddle at 1470 | Drums · intermediate | Medium | S | A `d-fills` / `d-song` level "develop 2 written bars for 6, then a 2-bar solo" at 1060–1150; re-place `d-pas-2` / `-3` to G4–G5 (1060–1150) |
| 13 | Counterpoint in the post-tonal pack | Ear · advanced | Medium (conservatory) | S | Move `counterpoint` out of `PACK_TOPICS` post-tonal into Ear (`path.ts:256`) |
| 14 | Beginner games per instrument missing (Grand-Staff Runner, Root Rescue, Rebound Ball, Swing-o-meter) | Keys, Bass, Drums, Jazz · beginner | Medium (motivation) | S each | Build them on existing engines: `rush-note` + MIDI, `rootsear`, the drum velocity grader, the `swing-ratio` topic | **Closed in 0.98** (beginner games).
| 15 | Bass riff ladder and broken-feel ladder | Bass · beg / int | Medium | M | `b-riff` 1–5 by grade (as `g-riff`) and `b-feel` 1–4 (two-feel, ballad broken feel, stop-time, bossa) at 1250–1550 |

**Needs method-specific knowledge (not to be filled by guessing):**
- the hidden Barry Harris lines (5-4-3-2, seven-down, chromatic scale, eight ways);
- Echols' elevator-under-a-melody, borrowing and voicing ladder;
- Siskind's stride variations and textures.
Each waits for the owner's answer in `docs/THEORY-QUESTIONS.md`.

The advanced Latin kit (`d-latin` 8–10) is not a method claim. It needs a check against a published Afro-Cuban drum-set transcription or a teacher before it is switched on.

---

## 11. Areas that are genuinely complete

- **Piano technique:** scales and arpeggios through ABRSM G8, all keys, exam-speed ladders, with a measured way in (`k-first`) and graded reading to G6.
- **Jazz piano performance:** solo piano, stride (`accomp` 11–18), voicings, `k-solo`, `k-sixdim`, reharm and context, from 760 to 1900.
- **Bass:** walking (Friedland-style ladder), slap, ghosts, pick, reading to 1680, Latin to 1900, first steps.
- **Drums:** the full PAS rudiment set, first steps, reading, jazz drumming with trading and solos over forms, linear and odd-tempo work.
- **Guitar** from first steps to grade 11: technique (picking, legato, lead), jazz comping, chord-melody.
- **Ear training:** pulse and clap-back, melodic, harmonic and two- / three-part dictation, cadences, modulation, single hearing, multi-feature questions, fine pitch, polyrhythm.
- **Voice, advanced end:** harmony singing, seeded sight-singing with modulation, Quick Study, part singing from the score, scat and standards.
- **Measurement:** every technique and vocal level is measured, and self-report never counts.
- **Path shape:** no gap over 70 in any course; repertoire across 760–1880.

---

## Sources

The syllabus links are the ones fetched for AUDIT-6 (`AUDIT-6-LEVELS-INSTRUMENTS.md` §Sources, `AUDIT-6-LEVELS-EAR-JAZZ-VOICE.md` §Sources):
- RSL Drums 2018: newschool.ie / AMEB PDFs.
- RSL guitar technical exercises: rockschool.ameb.edu.au.
- Rockschool piano: cloud.rslawards.com.
- ABRSM piano 2021: pianodao.com.
- ABRSM aural 2024: caswells-strings.co.uk cello syllabus pp. 46–53.
- RCM Musicianship 2024: teacherportal.rcmusic.com.
- RSL Vocals: newschool.ie.
- Trinity Rock & Pop: trinityrock.trinitycollege.com.
- ABRSM Jazz Piano and Jazz Performance G6–8: chimesmusic.com, pianodao.com.
- Berklee ET-111.

[PK] items:
- ABRSM Music Theory G1–5 content;
- Faber, Alfred, Hal Leonard, Leavitt, Friedland, Reid;
- Levine *The Jazz Piano Book* (comping rhythms);
- Bagrut / GCSE instrument recognition.

App evidence: the temporary dumps of `stepCatalogue()` and `shownFamilies()` at `ef468a71`, written to the session scratchpad and not committed.
