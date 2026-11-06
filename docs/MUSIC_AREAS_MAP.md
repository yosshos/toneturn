# Music areas map — transposition, and what Western music still lacks

*2026-11-06 · spec addendum AC · the full taxonomy and weighting spec is `docs/EXERCISE_TAXONOMY.md` · status: transposition and the basics shipped in 0.34.0; the "missing areas" are proposals.*

## 1. Transposition

### Is it a separate skill?

**Yes.** In 0.34.0 it is the 21st skill on the Skill Map (`transpose`, in the *Reading & theory* domain, overall weight 0.75).

Why it is separate and not part of "theory" or "degrees":

- **It mixes two skills under time pressure.** You need relative hearing (degrees) *and* key knowledge (the notes of the target key). Being good at one does not make you good at the other.
- **The failures are different.**
  - A strong degree-hearer who doesn't know key signatures says "F" instead of "F♯".
  - A theory-strong reader who can't hold the melody's shape in their ear moves one note wrong.
  - Separate ratings show which half is weak.
- **Teachers and exams treat it on its own.** Conservatory solfège and aural exams ask "sing it a tone higher" and "write it for a B♭ instrument". Singers move songs to fit their voice, and horn players transpose every day.

Both transposition topics now count toward it:

- the older **written** one, *Transposition on paper* (`transposition`);
- the new **melodic** one, *Same tune, new key* (`transpose`).

### Difficulty ladder

| Level | Task | Input → output | Where it lives | Rating band |
|---|---|---|---|---|
| T1 | Three notes (1-2-3) to a neighbouring key | names → names | topic `transpose` L1, lesson q1–q2 | ~1050 |
| T2 | Move a few notes up by an interval (M2, m3, P4, P5) | names → names | topic `transpose` L2 | ~1180 |
| T3 | Five notes, any key (sharps and flats) | names → names | topic `transpose` L3, lesson q5–q6 | ~1250 |
| T4 | **By ear:** which of three versions is the same tune in the new key? | sound → choice | topic `transpose` L4 | ~1300 |
| T5 | **Sing it in the new key** (cadence of the old key, the tune, then the cadence of the new key) | sound → voice | lesson q7 (`transposeSingQuestion`) | ~1200 (voice mode) |
| W1 | One note up by an interval | name → name | topic `transposition` L1 | ~1320 |
| W2 | Transposing instruments, concert → written (B♭ clarinet/trumpet, E♭ alto sax, F horn) | name → name | topic `transposition` L2 | ~1490 |
| W3 | Written → concert | name → name | topic `transposition` L3 | ~1660 |

**Find my level** has a six-rung `transpose` ladder (1050–1420) that mixes choice items and "say it in the new key" items.

**Next levels (proposed, not built):**

| Level | Task | Notes |
|---|---|---|
| T6 | Melodies with a chromatic note (♯4, ♭7) | a step up in key-knowledge load |
| T7 | Major tune → minor ("mutation"), or into a mode | also trains modes |
| T8 | Sight-transpose from the staff: read in C, say or sing in B♭ | ties into `sight` |
| T9 | Transpose a chord progression (Nashville numbers) | ties into `progressions` |
| T10 | Clef transposition (read treble as alto or tenor) | for orchestral players |
| T11 | Sung, with only the new tonic given (no cadence) | the hardest pure-ear version |

### Where it appears in the app

- **The path:** the *Same tune, new key* lesson comes right after *Note sequences* and requires *Notes and degrees* (prerequisite in the intake path).
- **Topics:**
  - *Written theory* group: `transposition` and `transpose`;
  - *Ear basics* group: the basics.
- **Find my level** and the **Skill Map** (*Reading & theory* domain).
- **Today's plan:** when transposition is a weak skill, it pulls `transpose` level 4.
- **Quick lesson:** *Same tune, new key*, 5 steps, including why musicians do it.
- **Next (proposed):**
  - a **"Key change" duel round** (both players get the same tune; the first correct transposition wins);
  - a Truth-or-Bluff topic: "C–E–G in F is F–A–C".

## 2. The basics (for players who are not musicians)

Shipped in 0.34.0 as the *Ear basics — no theory needed* group. For explorer and hobby players it opens the path:

| Lesson | Skill | What it trains |
|---|---|---|
| High and low | pitch | which sound is higher, with the gap narrowing |
| The shape of a tune | sequences | same or different; up, down, hill or valley |
| Feel the beat | timing | steady or wobbly; faster or slower |
| Match a note | singing | hum one comfortable note back (voice mode) |

Each lesson opens with a quick lesson in plain words. Jargon in the quick lessons is now explained in place:

- Every quick-lesson sentence shows its music words as **tappable chips** ("?"). Tapping one pauses the lesson, shows a one-line explanation and plays an example.
- *Topics I learned* has a **Music words** glossary with 21 terms:
  - pitch, note, melody, key, scale, home note;
  - degree, interval, half step, third, fifth, octave;
  - chord, major/minor, cadence, bass, sharp/flat;
  - beat, tempo, rhythm, transpose.
- The first Hebrew titles were made plain. For example, "טוניקה, טרצה, קווינטה" (tonic, third, fifth) became "הבית, השלוש והחמש" (home, three and five).
- A skipped quick lesson no longer opens again each time. It stays available in *Topics I learned*.

## 3. Western-music areas not yet covered

Already covered (for reference):

- degrees, intervals, chords, inversions and voicings, cadences and progressions, modes, fine pitch and intonation, absolute pitch;
- rhythm dictation and reading, timing, tempo, swing, odd meters, polyrhythms;
- melodic, rhythmic and chord memory, two voices, form;
- singing, technique, agility;
- note reading, key signatures, spelling, Roman numerals, circle of fifths, sight-reading;
- call & response, jazz and Barry Harris, maqam, post-tonal sets.

**Recommended additions, in order of value for this app:**

| # | Area | Why | Fits as | Levels | Effort |
|---|---|---|---|---|---|
| 1 | **Harmonizing a melody** ("which chord fits under this note/bar?") | The practical bridge from ear to playing and songwriting. Most players want it. | new topic, skill `improv` (or a new "harmony in use" skill later) | I/IV/V under a tune → add vi and ii → secondary dominants | M: the synth already plays chords |
| 2 | **Modulation / key change** (did the key change? where to: up a step, to the dominant, to the relative minor?) | Common in pop ("the truck-driver change") and in all classical music. Missing today. | topic under `cadences` | heard or not → direction → target key | M |
| 3 | **Dynamics & articulation** (loud/soft, crescendo, staccato/legato, accents) | Perfect for non-musicians, and expressive playing starts here. | basics group, skill `pitch` → later a "musicianship" skill | louder or softer → crescendo or diminuendo → staccato, legato or accent | S: velocity and length only |
| 4 | **Meter by ear** (in 2, 3 or 4? simple or compound?) | Basic conducting / dance feel. Odd-meter exists, but the basic "waltz or march" doesn't. | topic under `timing` | 3 or 4 → 2/4, 3/4, 4/4 → 6/8 vs 3/4 | S |
| 5 | **Harmonic dictation** (write the 4-chord progression in numerals, with the bass line) | The classic conservatory skill. Today we only *identify* progressions. | levels on `progressions` | bass only → I/IV/V/vi → inversions and secondary dominants | M |
| 6 | **Non-chord tones & voice leading** (passing, neighbour, suspension; parallel fifths) | Theory students need it, and it explains why melodies sound smooth. | `theory` topic plus an ear version | spot the passing note → name it → hear a suspension | M |
| 7 | **Timbre: instrument families & recognition** | Very appealing to beginners (orchestra families, "which instrument?"). | basics plus a new topic | family → instrument → section | **L: needs recorded samples (licensing and size)** |
| 8 | **Style and period recognition** (Baroque, Classical, Romantic, jazz, pop) | General music literacy. | topic, not rated | — | L: needs recordings |
| 9 | **Composition sketches** (finish the phrase, set words to rhythm) | Creative, fits the "play & improvise" area. | `improv` | choose an ending → build 4 bars → sing your own | M |

Recommended order:

1. **3 and 4 first** — small effort, and they serve the non-musician audience right away.
2. **1 and 2 next** — high value for hobby players.
3. **5 and 6 for the student/pro track.**
4. **7–8 only when there is a sample budget.**
