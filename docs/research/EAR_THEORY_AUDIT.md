# Ear & theory + Jazz & improv: audit (2026-11-10)

Owner direction: Ear & theory, including its exam-prep mode, and the Jazz course must be complete and closed before work moves to other courses. The niche is "sophisticated music". Pop is only the on-ramp. The top levels should bring a player to a jazz-level ear (dense harmony) and to rock and prog rhythm. All material is our own: every item is generated from rules.

## 1. Method

- **Seeded sweep.** Every level of every topic in both course paths was generated with 300 seeds each. The sweep checked: the answer is among the choices, labels are unique in English and in Hebrew, there is something to hear or see, no emoji, no `undefined`/`NaN`, two choices never share the same audition sound, the answer is not the same every time, and no answer takes more than 70% of items. Key-aware spelling was also checked: no flats in sharp keys and no sharps in flat keys, except deliberate distractors and chromatic chords. A permanent, lighter version lives in `tests/earTheoryAudit.test.ts`.
- **Hand spot-check.** Six seeds per level were printed with the answer, the choices and the played notes for about 45 topics: theory, chords, cadences, transposition and jazz. They were read against the theory.
- **Screens.** `scripts/shots.mjs` was run at 390×844, Hebrew, with a seeded player on its own port (5213). Every new level and the longest-label levels were checked.

## 2. Curriculum coverage map

| Area | Bagrut (core + tracks) | ABRSM / Trinity aural & theory 1–8 | College aural skills / Berklee ET 1–4 | Where in the app |
|---|---|---|---|---|
| Pitch, octave, fine pitch, tuning | – | G1–3 (higher/lower) | ET1 | basics-highlow, octave, fine-pitch, in-tune |
| Intervals (melodic, harmonic, down, compound) | core | G1–8 (sing/name intervals) | ET1–2 | lesson intervals, intervals-all 1–4, compound-intervals |
| Scale degrees, tonic, chromatic degrees | – | G4–6 | ET1–3 | degrees-135, notes-degrees, find-tonic, degrees-ext |
| Triads, inversions, sevenths | core (triads by ear) | G5–8 | ET2–3 | triads, seventh-chords, chord-read |
| Extensions and alterations (maj9, 9, m11, 13, 7♭9, 7♯9, 7♯11, 7alt, 13♭9, m7♭5, °7, maj7♯5, m(maj7)) | jazz track | – | ET3–4 | extensions 1–4 and **new 5–8** |
| Voicing type (close, drop 2, shell, rootless A/B, quartal, upper structure) | – | – | ET4, jazz piano | voicings 1–3 and **new 4–5** |
| Cadences, progressions, harmonic dictation | classical / pop / jazz tracks | G5–8 (cadences, chords) | ET2–4 | cadence-types, where-home, next-chord, progressions, harmonic-dictation, chorale-rn |
| Chromatic harmony (N6, aug 6, secondary dominants, borrowed chords) | – | theory G6–8 | ET3–4 | chromatic-harmony, chromatic-theory, roman-numerals 3 |
| Modulation | classical | G6–8 | ET3 | modulation 1–5 |
| Modes by ear | jazz track (written) | – | ET2–3 | **new modes-ear 1–5** (also scale-types; written: scale-spelling 5) |
| Melodic dictation, two-voice, bass | core | – | ET1–4 | staff-dictation 1–10, two-part, bass-dictation, figure-out |
| Rhythm, meter, syncopation, dictation | all tracks | G1–8 (pulse, meter) | ET1–4 | meter-feel, downbeat, syncopation, rhythm-build 1–8, rhythm-errors |
| Odd meters, groupings, polyrhythm, polymeter, metric modulation | Arabic track (iqa'at) | – | rhythm ear (Berklee, Rimon) | odd-meter, polyrhythm, eastern-rhythm, **new prog-meter 1–5**, rhythm-transform 4 |
| Form, texture, style | classical / pop | G6–8 (style, period, texture) | – | form, song-form, voice-count, style |
| Written theory (keys, scales, intervals, chords, terms, figured bass, voice leading, counterpoint) | core | theory G1–8 | – | key-signatures … counterpoint |
| Sight-reading by ear, clefs | – | G1–8 sight-singing (voice course) | ET1–4 | sight-read, note-reading 1–6 |
| Jazz: changes, tritone sub, backdoor, modal interchange, Coltrane | jazz track (analysis) | – | ET3–4, jazz harmony | turnarounds, chart-analysis, **new jazz-changes 1–5** |
| Reharmonization spotting | – | – | jazz harmony | reharm-swap (ear) and **new reharm-spot 1–4** (jazz) |
| Guide-tone lines | – | – | jazz ear | guide-tones (which line), **new guide-line 1–3** (write the line) |
| Transcription (hear → write) | – | – | ET3–4 | **new jazz-phrase 1–4** (degrees: arpeggio, line, enclosure, bebop) |
| Comping rhythms, swing, time feel | jazz track | – | – | comping 1–3, swing-ratio 1–4 (on top / laid back / rushing) |
| Jazz forms (AABA, blues, rhythm changes) | jazz track | – | – | song-form 3, 4 and 6 (ear), **new jazz-form 1–3** (jazz) |

Sung skills (sight-singing, singing intervals) belong to the Voice course by design (SPEC-COURSES). ABRSM "sing back" and "sight-sing" are covered there, not in Ear & theory.

## 3. Checked and fixed

| # | Finding | Fix |
|---|---|---|
| F1 | figure-out 1: the tune always ended on degree 1, so "1" was always right | It now ends on a tone of its last chord (1, 2, 3 or 5), after a home cadence |
| F2 | reharm-swap 2: both items changed chord 2, so the answer never varied | 3 more swaps, so every position occurs. 4 more swaps at level 3 |
| F3 | bh-six-over 3: the four 6 chords played in key order, and the right one was always heard first | They play in the buttons' order, each after its marker |
| F4 | bh-lines 1: "yes" was right 75% of the time | 50% |
| F5 | voice-leading: "the leading note G♭ in G major", "A7 → D: the seventh resolves to G♭" | Spelled in the key with the new `pcNameKey()` (F♯) |
| F6 | nashville in sharp keys: "G♭m" in D major | F♯m |
| F7 | chord-read: "D♭m/F♭" | Minor-family chords on C♯ and G♯ are spelled C♯m/E and G♯m |
| F8 | Progression games: "IV7" was a major 7th chord, but a jazz reader takes IV7 as a dominant | Renamed IVmaj7 |
| F9 | next-chord: distractors that are also valid answers (I–V–vi → iii as in the Canon; I–IV–V → vi, deceptive) | Replaced |
| F10 | Hebrew: "1 דיאזים" | "דיאז אחד" / "במול אחד" |
| F11 | voicings 3: Hebrew labels "Shell", "Upper structure" were in English | "שלד", "משולש עליון (אפר סטרקצ׳ר)" |
| F12 | compound-intervals: "More than an octave apart" while "Octave" is an answer | "An octave or wider" |
| F13 | Basics: ⬆⬇ render as emoji | ↑↓ |
| F14 | About 35 prompts of 15–25 words (chorale-rn, audiation, dyn-ear, rhythm-errors, syncopation, melodic-transform, bh-*…) | Cut to a few words. The detail lives in the lesson and the "Why?" |
| F15 | chord-scale 3: "Dmin(maj7)" | "Dm(maj7)" (the surface rule now treats "m(" as a chord name, so it is never transposed) |
| F16 | **The whole Hebrew UI**: choice labels with no Hebrew letters ("♭7 1 2 3", "7–3–7", "♭9", chord lists) were laid out RTL, so degree lines read backwards and ♭7 showed as "7♭" | A label with no Hebrew letters is `dir="ltr"` (Lesson.tsx) |

Checked and correct (sampled): key signatures (incl. D♯ minor), relative minors, the circle of fifths, interval and chord spelling incl. double accidentals, Roman numerals in major and harmonic minor (III+), secondary dominants and leading-note chords, the Neapolitan, It/Fr/Ger sixths, figured bass, cadence naming in score, transposing instruments (B♭, E♭, F), clef transposition, chord–scale (modes, melodic-minor modes), triads, sevenths and inversions, rootless / quartal / upper-structure voicings.

Order and difficulty: within each sub-skill, levels never get easier (taxonomy test). The new levels sit at the top of each section (1300–1900).

## 4. Built

Ear & theory course (the top, where it fits):
- **extensions 5–8**: minor colours (m7, m9, m11, m6/9); dominants by name (9, 13, 7♭9, 7♯9, 7♯11, 7alt, 13♭9); near neighbours (maj7♯5 / maj7♯11 / maj9 / 6/9, m7♭5 / °7 / m6 / m7, …); the V of a ii–V–I.
- **voicings 4–5**: rootless A or B; which upper-structure triad (II, ♭VI, VI, ♭V) over a dominant.
- **modes-ear 1–5**: bright modes, dark modes, all seven, in a tune over a drone, melodic- and harmonic-minor modes (Lydian dominant, Altered, Mixolydian ♭6, Phrygian dominant).
- **prog-meter 1–5**: 5/4 as 3+2 or 2+3; 9/8 groupings; 11/8 groupings; polymeter (a riff of 3, 5 or 7 beats over 4/4); metric modulation (×3/2, ×4/3, ×2/3, ×3/4, with the pivot subdivision on the hat).

Jazz & improv course (pack `jazz`):
- **jazz-changes 1–5**: major or minor ii–V; ii–V, tritone sub or backdoor; where the next ii–V goes (IV, vi, a whole step down, up a minor 3rd); modal interchange (iv m6, ♭VImaj7, ♭VII7, ♭IIImaj7, iiø7); Coltrane changes, ii–V chains, the chromatic dominant chain, the dominant cycle.
- **reharm-spot 1–4**: tritone sub, secondary dominant, backdoor, diminished passing chord, Coltrane substitution.
- **guide-line 1–3**: write the guide-tone line (spelled from each chord) over ii–V–I, I–vi–ii–V–I, and a seven-chord cycle.
- **jazz-phrase 1–4**: transcribe as degrees: arpeggios, lines over a dominant, enclosures, bebop lines (the passing half step).
- **jazz-form 1–3**: major or minor blues; rhythm changes A or bridge; major, jazz or Bird blues.

All of it is played in a trio texture: upright bass, comped voicings, swung ride (`topicsJazzEar.ts`).

## 5. Everything connects

- **Path**: catalogue steps with difficulties, packs (`PACK_TOPICS`), the unit theme (cadences/reharm in "Harmony moves"), and a prerequisite (`SUB_PREREQ`).
- **Symbols**: every topic and every hand-made lesson on the ear and jazz paths has its own symbol (`src/ui/stepMarks.ts`: a short mark in the note head, or a drawn symbol). Before, these paths used five domain icons, and eq/eq and mixer/mixer were shared. The test checks uniqueness per course and against unit games.
- **Quick lessons**: six new core + in-depth lessons (`content/mini/jazzEar.ts`). guide-line uses the guide-tones lesson.
- **Short names, coach hints, Practice groups**: done for each new topic.
- **Skill map / rating**: one new sub-skill, cadences/reharm. Its badge comes automatically. Tags are set for every new level.
- **Placement**: extensions 6 at the top of the chords ladder, jazz-changes 2 at the top of cadences, prog-meter 2 at the top of meter.
- **Quests**: a jazz-course "5 harmony answers right" quest.
- **Exam prep**: new sections in the JAMD jazz exam (jazz-changes, guide-line, dominants by name) and in the Rimon placement (modes-ear, reharm-spot, prog-meter). The exam goal's skill boosts already cover cadences and dictation.

## 6. Remaining

- **Duel / room question sets**: there is no jazz-harmony set. Set kinds are checked by a DB constraint (`toneturn_rooms_kind_check`), so adding one needs a migration. The UI and engine side would be a new `SetKind` drawing from jazz-changes 1–2 and extensions 6.
- **Voice recordings** for the new English lesson lines (the owner renders these; `voiceFiles` "every static line is recorded" fails until then).
- ~~A dedicated "upper structures and rootless voicings" lesson~~ — built 2026-11-12 (see §8).
- ~~jazz-form does not play a whole 32-bar AABA~~ — built 2026-11-12: jazz-form 4 (see §8).
- The basics' contour arrows ↗↘ are kept: they have a text-default presentation.
- The Hebrew chord symbols in guide-line are shown in Latin letters, as on lead sheets.

## 7. Owner decisions

1. **Courses are disjoint.** Chord quality with extensions and voicing type went to the top of **Ear & theory**, deepening extensions and voicings. Progressions, reharmonization, guide-tone lines, transcription and jazz forms went to the **Jazz** course. Should some of them appear in both courses? (Ratings are shared, so a player who learned them in one course already gets the cautious ✓ in the other.)
2. **A jazz duel set** needs a small DB migration (a new kind in the rooms and duels check). OK to add?
3. **Bagrut jazz track**: should the mock exam also test tritone sub and backdoor (jazz-changes 2)? It is in the JAMD jazz mock now, not in the Bagrut one.

## 8. Built after the audit (2026-11-12)

- **upper-rootless** (Ear & theory, no pack; `topicsJazzEar.ts`), its own topic and quick lesson (`upper-rootless`,
  `content/mini/jazzEar.ts`): 1 a rootless voicing over the root in the bass — maj9, m9, 13 or 7alt (1650); 2 a rootless
  ii–V–I — does the ii start in A (♭3 at the bottom) or B (♭7 at the bottom)? The forms alternate A–B–A / B–A–B (1720);
  3 upper structure II or ♭VI over the 3rd and ♭7 (1760); 4 which of five triads (II, ♭III, ♭V, ♭VI, VI) over the V of a
  ii–V–I (1860). Mark `UST`, short name, coach hint, the Practice harmony group; tags chords/voicing (level 2 also
  cadences/progression).
- **jazz-form 4** (Jazz & improv): a whole 32-bar AABA — rhythm changes at 216 or an own ballad-style AABA at 200,
  each A ending differently (turnaround, close on I into the bridge, the last A) with a top line of each chord's 3rd so
  the A sections sound alike — and a bell at one bar: the second A begins (bar 9), the bridge begins (17), the last A
  returns (25), or the middle of a section (5, 13, 21, 29). 1700. The jazz-form quick lesson has a new in-depth step
  (bars 13–20: the end of the second A into the bridge).
- Tests: `tests/earPianoP3.test.ts`; the audit's uniqueness / well-formedness tests cover the new levels.
- Not verified: the 35-second AABA item on a phone screen (Playwright not run in this pass); the new lesson lines are
  not in the recorded narration (`tests/voiceFiles` "every static line is recorded" lists them until rendered).
