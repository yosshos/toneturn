# Reharmonization and color harmony: the app's canonical reference

Every reharm lesson, drill, ear item and AI explanation in the app follows this file. When content disagrees with it, the content is wrong. Items marked **(verify)** wait for a teacher's confirmation.

All examples are in C or hold the note F. Everything applies in all 12 keys, and every drill is built in all 12.

The music of every drill and ear item comes from one pure module, `src/engine/commonTone.ts`; the borrowed devices live in `src/engine/reharm.ts`. Research and the build plan: `docs/research/REHARM-AND-COLOR.md` (Parts B–D).

---

## 1. Two families of reharm

- **Functional:** the new chord does the old chord's job (pull or rest). Secondary dominants, tritone sub, added ii–V, backdoor, passing diminished.
- **Color:** the new chord changes the light, not the direction. Common tone, chromatic mediants, modal interchange, pedal point, planing, side-slip.

A reharm is valid when the melody note is a chord tone or an available tension of the new chord (never an avoid note). It is good when the voices move smoothly.

## 2. One note, many chords (common-tone reharm)

Hold the melody note; change what it means.

| Note F is… | Chord | Tones |
|---|---|---|
| 1 | F, Fm, Fmaj7, Fm6 | F A C · F A♭ C · F A C E · F A♭ C D |
| ♭3 | Dm7 | D F A C |
| 3 | D♭maj7 | D♭ F A♭ C |
| 5 | B♭maj7, B♭m6 | B♭ D F A · B♭ D♭ F G |
| 6 / 13 | A♭6, A♭13 | A♭ C E♭ F · A♭ C E♭ G♭ + F |
| ♭7 | G7, Gm7, Gø7 | G B D F · G B♭ D F · G B♭ D♭ F |
| maj7 | G♭maj7 | G♭ B♭ D♭ F |
| 9 | E♭9 | E♭ G B♭ D♭ + F |
| ♭9 | E7♭9 | E G♯ B D F |
| 11 | C7sus4 | C F G B♭ |
| ♭13 | A7♭13 | A C♯ E G F |
| ♯9, ♯11 | D7♯9, B7♯11 | spelled E♯ (= F). In teaching use the C examples: A7♯9 (B♯ = C), G♭7♯11 (C) |

The same E♯ spelling holds for the ♯5: over Amaj7♯5 the held F is E♯. The engine spells the held note from the chord's root letter (`spellHeld`): the 9th is written on the letter above the root, the ♯11 on the 4th letter, the ♯5 on the 5th. Enharmonics are the same note for grading; they are never offered as decoys.

**The ladder** (keys `k-ctone`, guitar `g-ctone`, ear `ct-degree`): the six triads (F, Fm, Dm, D♭, B♭, B♭m) → seven 7th chords (Fmaj7, Dm7, D♭maj7, B♭maj7, G7, G♭maj7, Gm7) → the same in drop 2 with the note on top, voice-led → tensions (E♭9, C7sus4, A♭13, E7♭9, B7♯11, A7♭13, D7♯9) → a 4-bar phrase in tempo → the player's own eight chords.

Drop 2 with the note on top: write the close voicing under the note, then drop the second voice from the top an octave. G7 under F: close G B D F → drop 2 D G B F. D♭maj7 under F: A♭ C D♭ F → D♭ A♭ C F.

**The player's own chords** (k-ctone 7) are graded by `ctFreeAnalyze.ts`: the held pitch on top, a chord that can carry it (the same melody table as `holdsMelody`), no chord twice, the inner voices moving by step (at most 4 semitones a voice on average).

**The common-tone diminished.** C6 – C°7 – C6: C and A stay, E and G move a half step (E → E♭, G → G♭). (Same as the Barry Harris auxiliary diminished, BARRY-HARRIS-THEORY.)

## 3. Chromatic mediants

Two major (or two minor) chords a 3rd apart, with one common tone:

| From C | Mediant | Tones | Common tone |
|---|---|---|---|
| up M3 | E | E G♯ B | E |
| down M3 | A♭ | A♭ C E♭ | C |
| down m3 | A | A C♯ E | E |
| up m3 | E♭ | E♭ G B♭ | G |

**Doubly chromatic:** C ↔ A♭m (A♭ C♭ E♭) and C ↔ E♭m (E♭ G♭ B♭) share no tone. It is the most distant sound in the system.

**Coltrane.** C – A♭ – E are major-third mediants of one another; their roots spell the augmented triad C E G♯/A♭. The Coltrane-link drill (k-mediant 4) holds E on top: the 3rd of Cmaj7, the ♯5 of A♭maj7♯5 (A♭ C E G), the root of Emaj7.

**Lens (brief).** P = parallel (C ↔ Cm), R = relative (C ↔ Am), L = leading-tone exchange (C ↔ Em). Alternating P and L gives the hexatonic cycle C – Cm – A♭ – A♭m – E – Em (notes C E♭ E G A♭ B). Alternating P and R gives the octatonic cycle C – Am – A – F♯m – F♯ – E♭m – E♭ – Cm. Its roots C A F♯ E♭ are the minor-third cycle of the family of dominants (BARRY-HARRIS-THEORY §2).

## 4. Modal interchange (borrowed chords)

Chords from the parallel minor (or another mode on the same tonic) used in major.

| Chord in C | Tones | From | Function |
|---|---|---|---|
| iv / ivm6 / ivm7 | F A♭ C / + D / + E♭ | Aeolian / Dorian minor | PD, minor plagal |
| iiø7 | D F A♭ C | Aeolian | PD (into V7♭9) |
| ♭IIImaj7 | E♭ G B♭ D | Aeolian | T color |
| ♭VImaj7 | A♭ C E♭ G | Aeolian | PD or deceptive target |
| ♭VII7 | B♭ D F A♭ | Aeolian / Mixolydian | D (backdoor) |
| v m7 | G B♭ D F | Mixolydian | weak D, a ii of IV |
| ♭IImaj7 | D♭ F A♭ C | Phrygian | D substitute / plagal color |

**Minor plagal** = any of iv, ivm6, ♭VI, ♭VII7, ♭IImaj7 going straight to I. In minor the borrowing reverses: Picardy I, IV7 (Dorian), ii m7.

**In a tune** (reharm studio, k-tune 10): the borrowed devices of `reharm.ts`, each checked against the melody like the functional ones (`checkMelody`, `roleOf`):

| Device | Where it applies | Becomes |
|---|---|---|
| `minorIV` | a whole bar of IV (major) | iv m6 (Fmaj7 → Fm6) |
| `bVI` | the second bar of a held major tonic | ♭VImaj7 (C \| C → C \| A♭maj7) |
| `bVII` | a whole bar of V7 into the major tonic | ♭VII7 (G7 → B♭7) |
| `iiHalfDim` | a ii m7 going to its V7 | iiø7 (Dm7 → Dm7♭5) |
| `minorPlagal` | a V7 (or ii–V) bar into the major tonic | ivm6, straight to I |

They apply in major keys only. A melody note the new chord cannot carry is a conflict (A over Fm6, E over A♭maj7, A over B♭7, A over Dm7♭5, B over Fm6).

## 5. Other devices (one line each)

- **Pedal point:** the bass holds (tonic or dominant) while the chords above change: Dm7/G – F/G – A♭/G – G7.
- **Planing:** one shape in parallel. Diatonic planing keeps the key; exact planing (constant structure) keeps the quality. Under a given melody the melody picks each chord (maj7 drop 2 with the root on top: −13, −8, −5, 0 semitones under the note; m7: −14, −9, −5, 0; fourths: −15, −10, −5, 0).
- **Side-slip:** a half step out and back on purpose (Dm7 → E♭m7 → Dm7).
- **Chromatic approach chord:** the target's voicing a half step above or below just before it (D♭maj7 → Cmaj7).
- **Deceptive (jazz):** V7 to anything but I: ♭VImaj7, iii, IV, V/ii.
- **Line cliché:** one voice moves chromatically inside a held chord (Cm – Cm(maj7) – Cm7 – Cm6).
- **Counter-line:** the melody holds; the bass walks by step; each bass note renames the chord (C, Cmaj7/B, C7/B♭, Am7, A♭maj7, G7sus4 under a held C).
- **Upper structure / slash:** a triad over a bass (D/C = Cmaj7♯11 sound; F/G = G9sus4).
- **Sus reharm:** ii–V → V7sus4 (F/G).
- **maj7♯5:** the lydian-augmented tonic color (Cmaj7♯5 = E/C: E G♯ B over C).
- **Non-functional sequences:** sus or maj7 chords on a freely moving bass. The app's sequences are its own (C7sus – A♭7sus – B♭7sus – G7sus; Cmaj7 – Amaj7 – A♭maj7 – E♭maj7); no tune is reproduced.

## 6. Organ comping (Goldings)

The left hand walks the bass (half notes, then quarters), the right hand holds a 3-note pad (3, ♭7, 9) voice-led; one inner voice may move (the line cliché inside the pad); texture is thin (two notes, 3 and 7) under a soloist and full (four notes) at the climax; a ballad holds the pad and runs the common-tone ladder on the top voice. The drills play on the modelled tonewheel organ (`Drill.sound = 'tonewheel'`); the drawbar lesson is text only.

## 7. In the app (2026-11-15)

| Concept | Ear | Keys | Guitar | Bass |
|---|---|---|---|---|
| One note, many chords | `ct-degree` 1–6 (1050–1800) | `k-ctone` 1–5, 7 (1050–1800) | `g-ctone` 1–6 | `b-counter` 1, 10 |
| Counter-line | `counter-line` 1–3 (1550–1650) | `k-ctone` 6 (1660) | — | `b-counter` 7 (1500) |
| Chromatic mediants | `mediants` 1–5 (1250–1800) | `k-mediant` 1–8 (1250–1800) | `g-color` 3–5 | `b-counter` 4 |
| Modal interchange | `modal-mix` 1–5 (1100–1700) | `k-reharm` 11, 13, 15, 17, 20 (1100–1700); `k-tune` 10 | `g-color` 1, 2, 6–9 | `b-counter` 2, 6, 8; `b-ear` 24 (1450) |
| Pedal point | `pedal-ear` 1–3 (1150–1550) | `k-reharm` 12 (1350) | `g-color` 13–15 (open-string pedal) | `b-counter` 3, 5, 9 |
| Planing under a melody | `planing` 4 (1650) | `k-reharm` 18 (1650) | `g-color` 10 | — |
| Approach chords, side-slip | `approach-chord` 1–3 (1400–1600) | `k-reharm` 14, 21 (1500, 1710) | `g-color` 11 | — |
| Modern colors | `modern-color` 1–3 (1550–1750) | `k-reharm` 16, 19, 22 (1560–1750) | `g-color` 12 | — |
| Organ comping | — | `k-organ` 1–7 (1300–1720) | — | — |
| Deceptive resolutions | `reharm-spot` 5 (1500) | — | — | — |
| Functional vs color | `func-color` 1–3 (1350–1550) | — | — | — |

Lessons (en + he, narrated): `ct-one-note`, `bass-counter-line`, `chromatic-mediants`, `modal-mix`, `pedal-point`, `planing-melody`, `approach-slip`, `modern-colours`, `organ-comping`, `pull-or-paint`, `jazz-deceptive`.

Games: **Hold the Note** (`holdnote`, 0.96: one note, many chords), **Third Jump** (`thirdjump`: chromatic mediants), **Dark Side** (`darkside`: modal interchange by ear, in time). Each has 6 tiers and feeds the path (Ear pitch units, Jazz bonus steps), the workout, XP, ratings, boards, badges and its own glyph.

Closed (2026-11-16; was "still open"):

- **The guitar open-string pedal** — done: `g-color` 13–15 (grades 5–6; lesson `pedal-point`). 13: shapes on strings 3-2-1 over the ringing open tonic (E, A, D: I – IV/I – V/I – I and I – ♭VII/I – IV/I – I). 14: the dominant pedal on an open string, then home (A: Bm/E – D/E – F/E – E7 – A; D on the open A; G on the open D). 15: open B and E ringing above moving shapes (E: E – C♯m7 – Aadd9 – E; A, D, G). They keep the keys whose open strings carry them (keys12.ts `FIXED_KEY_LEVELS`); rubato first, then the tempo ladder.
- **"Hold the note"** — done: it is the same idea as Hold the Note (`holdnote`, AUDIT-GAMES, 0.96): one held note, which chords keep it, its degree, a 4-bar chain, "8 ways" at ff.
- **"Third jump"** — done: `thirdjump`. A chord sounds with one note glowing; jump to the chromatic mediant that keeps it; the chord landed on starts the next jump; a streak builds the film cue. pp major triads · p + minor · mp + the doubly chromatic jump (keeps nothing) · mf by ear · f the glowing note's degree in the new chord · ff played on MIDI (feeds key mastery). Every 5th jump starts on the next key of the cycle of 4ths.
- **"Dark side"** — done: `darkside`. A count-in, then a 4-bar loop with a click on every beat and the now-cue; tap the borrowed chord the moment it arrives (earlier in the bar scores more), then name it. pp iv / ♭VII · p + ♭VI, ♭III · mp the jazz round (ivm6, iiø7, ♭VImaj7, ♭VII7) · mf every borrowed 7th (+ v m7, ♭IImaj7, ♭IIImaj7, ivm7) · f two or three borrowed chords, named as chord symbols in the key · ff + borrowing in minor (Dorian IV7 and ii m7, the Picardy third). All 12 keys.
- **A bass `b-ear` modal-interchange level** — done: `b-ear` 24 (1450): the band plays a loop with a borrowed chord, the bassist answers with the roots, one a bar (pop triads; jazz 7ths with iiø7 and ivm6 → I). All 12 keys; lesson `modal-mix`.
- **The player's own chords on the guitar** — done: `g-ctone` 6 (grade 9): eight different chords that hold the note, graded by `ctFreeAnalyze.ts` with `loose` (the held note anywhere in the strum; no inner-voice check, since a strum's voice order can't be heard reliably). All 12 keys.

**(verify)** The Larry Goldings presentation of "one note, many chords" (Open Studio). Align the wording when the owner shares the handout. Until then the content stays generic: no lesson, drill, game or badge names Goldings (checked 2026-11-16; the name appears only in code comments and this reference).

## Sources

- docs/research/REHARM-AND-COLOR.md (Part A sources: Open Studio "Jazz Organ Essentials", My Music Masterclass, DownBeat, WFAE, podcast transcripts).
- https://en.wikipedia.org/wiki/Chromatic_mediant (chromatic mediant background).
