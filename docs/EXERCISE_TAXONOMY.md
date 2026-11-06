# Exercise taxonomy & weighting — specification

*2026-11-06 · spec addendum AD (draft for product-owner review)*

**Goal.** At launch, every well-known exercise of Western ear training, rhythm, voice and theory that fits a phone app is **in the app**. Each one is **mapped** by domain → skill → sub-skill → difficulty. Exercises that train more than one thing are **weighted** explicitly, so ratings, the path, Today's plan and Find my level all agree on what a player knows.

This document:

- defines the model (§1–2);
- defines how multi-skill exercises are credited (§3);
- defines how difficulty is built and calibrated (§4);
- defines how content is chosen and weighted for each player (§5);
- includes the full catalogue, with status for every exercise: what exists, what is partial, what is missing (§6);
- lists the decisions needed from the product owner (§7) and the build plan (§8).

The inventory in §6 was generated from the code on 2026-11-06:

| Content | Count |
|---|---|
| Topics | 45, with 137 levels |
| Path lessons | 26 |
| Quick lessons | 86 |
| Find-my-level ladders | 20 |
| Vocal exercise kinds | ~25, in 7 vocal ladders |

---

## 1. The model — five layers

```
Domain            (5–6)    what kind of musicianship        e.g. Time
 └ Skill          (~24)    rated; shown on the Skill Map     e.g. Rhythm dictation
    └ Sub-skill   (~110)   a specific competence; tracked    e.g. Displacement by ear
       └ Exercise type     a task template:                  e.g. "Hear pattern, then moved: how far?"
          (stimulus × response × content family)
          └ Level → Item   generated instance with a difficulty number
```

| Layer | Rated? | Shown to player | Stored per player |
|---|---|---|---|
| Domain | derived (weighted mean of its skills) | Skill Map rings | — |
| Skill | **yes**: Elo-style rating plus an uncertainty value | Skill Map, Find my level | rating, RD, last practised |
| Sub-skill | **yes, lightweight**: accuracy EWMA plus exposure count | inside a skill's detail, Today's plan reasons | ewma, n, last seen |
| Exercise type | no | the topic / level name | — |
| Item | — | the question | result log (already kept) |

**Why sub-skills.**

- A single "rhythm-dictation" rating hides that a player is perfect at swing and lost at displacement.
- Sub-skills let Today's plan say *why* it picked something ("your displacement is behind your other rhythm skills").
- Sub-skills let the coverage tests prove that nothing is missing.

**Two axes every exercise type also declares** (they are not part of the tree, but they matter for difficulty and weighting):

- **Stimulus modality:**
  - *sound*;
  - *notation* (staff or grid);
  - *names* (letters or solfège);
  - *numbers* (degrees, Roman numerals);
  - *symbol* (chord symbol, time signature).
- **Response modality:**
  - *choice* (tap one);
  - *say* (voice names);
  - *sing*;
  - *tap* (rhythm pad);
  - *write* (build on staff or grid — future);
  - *play* (MIDI or instrument — future).

The same content with a different modality is a **different exercise type**. "Hear the interval → tap its name" and "see the interval → sing it" share content but not skills.

## 2. Domains and skills

### Today

There are 21 skills in 5 domains:

| Domain | Skills |
|---|---|
| pitch | degrees, intervals, chords, cadences, modes, pitch, absolute |
| time | rhythm-dictation, rhythm-reading, timing, tempo |
| memory | sequences, rhythm (memory) |
| voice | singing, technique, agility |
| reading | notes, theory, transpose, sight, improv |

### Proposed

The proposal is 24 skills in 6 domains. All changes are backward-compatible: old ratings carry over.

| Domain | Skills (★ = new) | Notes |
|---|---|---|
| **Pitch & harmony** | pitch, degrees, intervals, chords, cadences → **harmony**, modes, absolute | rename `cadences` to "Harmony & progressions"; it already holds progressions |
| **Time** | timing, tempo, rhythm-dictation, rhythm-reading, **★ meter** | meter by ear (2/3/4, simple/compound, hemiola) is today scattered |
| **Memory & structure** | sequences, rhythm (memory), **★ form & texture** | form, two-voice and texture leave `sequences` |
| **Voice** | singing, technique, agility | unchanged |
| **Reading & theory** | notes, theory, sight | |
| **Creative & applied** ★ | improv, **transform** (from `transpose`), **★ expression** | improv leaves *reading*, where it never belonged |

**Transform** (renamed from `transpose`) is the skill of re-saying the same music somewhere else:

- **pitch:** transposition, mode mutation, inversion, retrograde;
- **time:** displacement, augmentation and diminution, re-barring.

It answers the product owner's question of whether transposition, including rhythmic transposition, is its own skill: **yes, one skill, "Transformations", with a pitch branch and a time branch.**

Why one skill and not two:

- The mental operation is the same: hold a pattern, apply a rule, produce the result.
- Both are taught together in classical and jazz pedagogy (sequence, displacement, "play it from beat 2").
- Its exercises always carry a second weight on the content skill (degrees or rhythm-dictation, see §3), so the rhythm and pitch ratings are fed too.

**Expression** covers dynamics, articulation, timbre and instrument families, and style. It is the most beginner-friendly missing area (see §6.6).

## 3. Multi-skill exercises — tagging and crediting

### 3.1 Tags

Every exercise type gets a **tag vector**: 1–3 `(skill, sub-skill, weight)` entries with weights summing to 1. The primary tag must have w ≥ 0.5.

```ts
interface Tag { skill: SkillId; sub: SubSkillId; w: number }
interface ExerciseType {
  id: string;                     // 'displacement.ear.how-far'
  family: string;                 // 'displacement'
  stimulus: Modality; response: Modality;
  tags: Tag[];                    // Σw = 1, tags[0].w ≥ 0.5
  levels: { n: number; label: Bi; band: [number, number]; factors: Record<string, number | string> }[];
}
```

Examples:

| Exercise type | Tags |
|---|---|
| Hear 1-2-3 in C, say it in D | transform/pitch-transpose 0.6 · degrees/diatonic 0.25 · notes/key-names 0.15 |
| Sing it in the new key | transform/pitch-transpose 0.5 · singing/sing-sequence 0.3 · degrees 0.2 |
| Charleston from beat 2, which grid? (paper) | transform/displacement 0.5 · rhythm-reading/syncopation 0.5 |
| How far did it move? (ear) | transform/displacement 0.6 · rhythm-dictation/syncopation 0.4 |
| Harmonic dictation, write I–vi–IV–V | harmony/progressions 0.6 · sequences/chord-memory 0.2 · theory/roman 0.2 |
| Sight-sing a 4-bar melody | sight/sight-sing 0.5 · singing/accuracy 0.3 · notes/staff 0.2 |
| Call & response: which answer fits the chord? | improv/phrase-fit 0.6 · chords/function 0.4 |

### 3.2 How a result updates ratings

Today `skillAs` picks one skill per item. The proposal is a **compensatory multidimensional Elo**, a light version of MIRT:

1. **Expected score** uses the weighted composite of the tagged skills:
   - `R_c = Σ wₛ · Rₛ`
   - `E = 1 / (1 + 10^((D − R_c)/400))`
   - D = item difficulty.
2. **Update** each tagged skill by its share:
   - `ΔRₛ = K · κₛ · wₛ · (S − E)`
   - κₛ = uncertainty factor (larger while the skill is new or untested, so new skills move faster).
   - The existing cap `|ΔR| ≤ MAX_STEP` applies per skill.
3. **Blame on failure follows weakness.** When S < E, the loss is split by `wₛ · (1 + λ·zₛ)`, renormalised, where zₛ is how far *below* the composite that skill is (λ ≈ 0.5).
   - Example: a player strong in degrees but weak in key names who fails a transposition loses more in `notes` than in `degrees`.
   - This is the main reason to tag at all.
4. **Sub-skills** update an accuracy EWMA (α = 0.2) and an exposure count for every tagged sub-skill. These are not Elo.
5. **Items are rated too (calibration).** Each exercise type and level keeps a running difficulty that moves opposite to the player's update, with a small K (≈ 4).
   - After enough plays, the authored difficulty is replaced by the measured one (see §4.3).

Guard rails:

- Primary weight ≥ 0.5 keeps the main skill dominant.
- At most 3 tags, to keep identifiability.
- A skill with < 0.15 weight is not updated; it only feeds the sub-skill EWMA.

### 3.3 Lessons and topics inherit weights

- A **lesson's skill mix** is the mean tag vector of its items. This is shown as "trains: transposition 55%, degrees 25%, note names 20%".
- A **topic level's** mix is the mix of its exercise type.
- The **overall rating** stays `Σ OVERALL_WEIGHT[s] · R_s`. The proposal is per-track weights (§5.4).

## 4. Difficulty

### 4.1 One scale

All items live on the same difficulty scale as ratings. Today that is roughly 700–2000:

| Band | Name | Typical player |
|---|---|---|
| 600–900 | **Starter** | never studied music (the basics) |
| 900–1150 | **Beginner** | first months; first path lessons |
| 1150–1400 | **Intermediate** | hobby musician; amateur choir |
| 1400–1650 | **Advanced** | music student; working semi-pro |
| 1650–1900 | **Expert** | conservatory level |
| 1900+ | **Master** | specialist (10-cent pitch, 11/8, post-tonal) |

### 4.2 Difficulty is built from factors

Each family declares its **difficulty factors**. A level is a point in factor space.

```
D = base(family) + Σ fᵢ(factorᵢ) + modality offset
```

**Modality offsets** (initial, then calibrated):

| Response | Offset |
|---|---|
| choice | 0 |
| say | +60 |
| tap | +80 |
| sing | +120 |
| write | +150 |

Stimulus *notation* instead of *sound* is −40 for readers and +40 for ear-only players. That depends on the player, so it is applied as a personal adjustment and not stored on the item.

**Factor tables per family** (the main ones):

| Family | Factors (each adds difficulty) |
|---|---|
| Melodic (degrees, sequences, transposition) | length (3 → 9 notes); range (5th → 10th); leaps; chromatic notes; key distance on the circle (transposition); reference (cadence → tonic only → none); tempo; repetitions allowed |
| Harmonic | chord size (triad → 7th → extensions); inversion; voicing spread; progression length; borrowed/secondary chords; bass vs. top-voice question |
| Rhythm | grid (quarter → 8th → 16th → triplet → mixed); syncopation density; ties and rests; meter (simple → compound → odd); tempo; bars; displacement amount (beat → 8th → 16th → dotted) |
| Pitch | cents (50 → 10); register; timbre; duration |
| Voice | range position (comfort → edges); duration; interval size; accompaniment (none → drone → chords → counter-line); tolerance |
| Reading | clef (treble → bass → alto/tenor); ledger lines; accidentals; key signature size; speed |

### 4.3 Calibration

- Authored difficulty is a prior. After **N ≥ 200 results** per exercise-type level, the calibrated difficulty (from §3.2 item Elo) replaces it.
- A nightly job (or a client-side aggregate via Supabase) publishes `difficulty_overrides.json`.
- **Monotonic check:** within a sub-skill, levels must rise. Two current violations were found in the inventory:
  - `in-tune` level 3 (1600) is easier than level 2 (1650);
  - `sight-read` level 4 (1420) is easier than level 3 (1500).
- Either reorder or relabel them. The coverage test (§8) will enforce this.

## 5. Weighting content for a player

### 5.1 What "need" means for each sub-skill

Each sub-skill gets a priority score:

```
priority(sub) =  importance(sub, track)
              ×  (1 + intakeBoost(domain))                 // the player's ranked areas
              ×  gap(sub)                                   // how far behind
              ×  freshness(sub)                             // spaced review
              ×  ready(sub)                                 // prerequisites met (0 or 1)
```

| Term | Definition |
|---|---|
| `gap` | `clamp( (target_band_mid − R_skill)/200 + (0.85 − ewma_sub) , 0.2, 2 )` |
| `freshness` | `1 + min(1, days_since/7)` for learned subs; 1 for new |
| `ready` | from a **sub-skill prerequisite graph**, which replaces today's lesson-level `PREREQ` |

Example prerequisite edges:

- `degrees/diatonic → transform/pitch-transpose`
- `rhythm-reading/syncopation → transform/displacement`
- `pitch/higher-lower → intervals/melodic-asc`

### 5.2 From sub-skill to item

1. Pick the sub-skill by priority (soft-max, temperature 0.5, for variety).
2. Pick the **exercise type** that maximises its tag weight on that sub-skill, while preferring the player's chosen response modality (voice mode → say or sing).
3. Pick the **level** whose band contains `R_skill + 50` (the "stretch" zone ≈ 65–75% expected success).

### 5.3 Path vs. plan

- The **path** stays an ordered, hand-curated list of lessons.
  - The intake order (weighted round-robin) is unchanged.
  - Each path lesson declares the sub-skills it introduces.
  - A lesson counts as "covered" when its subs reach ewma ≥ 0.75.
- **Today's plan** uses §5.1–5.2 directly.
- **Find my level** walks skill ladders. Each rung records its sub-skill, so after placement the sub-skills start with a prior, not empty.

### 5.4 Importance by track

The importance weights below are initial, to tune with the product owner. A skill with weight 0 is reachable but never pushed.

| Skill | explorer | hobby | student | pro |
|---|---|---|---|---|
| pitch, timing | 1.0 | 0.8 | 0.5 | 0.3 |
| degrees, intervals, chords | 0.6 | 1.0 | 1.0 | 1.0 |
| harmony (cadences) | 0.3 | 0.8 | 1.0 | 1.0 |
| rhythm-dictation, rhythm-reading | 0.5 | 0.9 | 1.0 | 1.0 |
| meter, tempo | 0.6 | 0.7 | 0.8 | 0.8 |
| sequences, rhythm memory | 0.8 | 0.8 | 0.8 | 0.7 |
| form & texture | 0.3 | 0.5 | 0.8 | 0.9 |
| singing, technique, agility | intake-driven (0.3–1.0) | ← | ← | ← |
| notes, sight | 0.3 | 0.7 | 1.0 | 1.0 |
| theory | 0.1 | 0.4 | 1.0 | 0.9 |
| transform | 0.2 | 0.6 | 0.9 | 1.0 |
| improv | 0.4 | 0.8 | 0.6 | 0.9 |
| expression | 1.0 | 0.8 | 0.6 | 0.5 |
| modes, absolute | 0.1 | 0.4 | 0.7 | 0.8 |

The **overall rating** uses the same table, normalised, so a pro is not judged on "higher or lower" and an explorer is not judged on Roman numerals.

---

## 6. The catalogue

**Legend:**

- ✅ exists (where);
- 🟡 partial (what is missing);
- ⬜ missing, with priority **P1** (launch), **P2** (soon after) or **P3** (later or needs assets).

**Bands:** S = Starter, B = Beginner, I = Intermediate, A = Advanced, E = Expert, M = Master.

**Modality:** in → out.

### 6.1 Pitch & harmony

| Skill | Sub-skill | Exercise types (in → out) | Bands | Status |
|---|---|---|---|---|
| pitch | higher / lower | sound → choice | S–B | ✅ `basics-highlow` 1–3 |
| | fine pitch (cents) | sound → choice | A–M | ✅ `fine-pitch` 1–3 |
| | in tune / sharp / flat | sound → choice | A–M | ✅ `in-tune` 1–5 (fix order) |
| | pitch matching | sound → sing | S–B | ✅ basics-voice, vocal `hold` |
| | octave equivalence ("same note, other octave?") | sound → choice | S–B | ⬜ P1 |
| | pitch across timbres | sound → choice | I | ⬜ P3 (samples) |
| degrees | 1-3-5 / home notes | sound → choice/say | B | ✅ `degrees-135`, `bflat-two-homes` |
| | all diatonic degrees | sound → choice/say | B–I | ✅ path, ladder |
| | minor & chromatic degrees | sound → choice | I–A | ✅ `degrees-ext` 1–2 |
| | find the tonic of a melody | sound → choice/sing | B–I | ⬜ P1 |
| | degree without a cadence (re-orient) | sound → choice | A | 🟡 ladder top only |
| intervals | melodic up / down | sound → choice | B–I | ✅ `intervals`, `intervals-all` 1,2,4 |
| | harmonic | sound → choice | I | ✅ `intervals-all` 3 |
| | compound (9th, 10th) | sound → choice | A | ⬜ P2 |
| | sing an interval from a given note | sound → sing | I | 🟡 vocal `leap`, harmony-hold |
| | interval from song references ("Here Comes the Bride") | sound → choice | B | ✅ `songs` |
| chords | major / minor | sound → choice | B | ✅ `major-minor` |
| | dim / aug / sus | sound → choice | I | 🟡 aug/dim in ladder; sus in `extensions` 4 |
| | inversions | sound → choice | I | ✅ `inversions`, `voicings` 2 |
| | sevenths | sound → choice | I | ✅ `jazz-1` |
| | extensions & alterations | sound → choice | A–E | ✅ `extensions` 1–4 |
| | voicing type | sound → choice | A | ✅ `voicings` 1,3 |
| | post-tonal sets | sound → choice | E–M | ✅ `set-classes` 1–3 |
| | chord tones: sing root / 3rd / 5th of a heard chord | sound → sing | I | ⬜ P1 |
| harmony | cadence types (authentic / half) | sound → choice | B–I | ✅ `cadences` |
| | plagal / deceptive cadences | sound → choice | I | ⬜ P1 (add levels) |
| | progressions (pop / jazz / borrowed) | sound → choice | I–A | ✅ `progressions` 1–3 |
| | bass line under chords | sound → choice | I | ✅ `slash-chords` |
| | **harmonic dictation** (write the numerals) | sound → write | A–E | ⬜ P2 |
| | **modulation**: changed? where to? | sound → choice | I–A | ⬜ P1 |
| | **harmonise a melody** (which chord fits?) | sound → choice | I–A | ⬜ P1 |
| | non-chord tones by ear (passing, neighbour, suspension) | sound → choice | A | ⬜ P2 |
| modes | church modes | sound → choice | A | ✅ modes lesson, `chord-scale` |
| | scales (melodic / harmonic minor, bebop, diminished) | sound → choice / sing | A–E | ✅ Barry Harris topics, vocal MODE |
| | maqam / jins | sound → choice | A–E | ✅ `maqam` 1–3 |
| | pentatonic & blues scale ID | sound → choice | I | 🟡 vocal only → add ear topic, P2 |
| absolute | name a note without reference | sound → choice | A–M | ✅ absolute corner (optional) |

### 6.2 Time

| Skill | Sub-skill | Exercise types | Bands | Status |
|---|---|---|---|---|
| timing | steady beat | sound → choice | S | ✅ `basics-beat` |
| | tap along / stay in time | sound → tap | S–B | 🟡 rhythm reading taps; no "keep the beat" item → P1 |
| | tap after the music stops (internal pulse) | sound → tap | B–I | ⬜ P1 |
| tempo | faster / slower; accel. / rit. | sound → choice | B–I | ✅ `tempo` 1,2,4 |
| | BPM estimation | sound → choice | I–E | ✅ `tempo` 3,5,6 |
| meter ★ | in 2, 3 or 4? | sound → choice | S–B | ⬜ P1 |
| | simple vs compound (3/4 vs 6/8) | sound → choice | I | ⬜ P1 |
| | odd meters & groupings | sound → choice | A–E | ✅ `odd-meter` 1–4 |
| | hemiola | sound → choice | A | ⬜ P2 |
| | find beat 1 (downbeat) | sound → tap/choice | B–I | ⬜ P1 |
| rhythm-reading | levels R1–R8 (quarters → swing) | notation → tap | B–E | ✅ `rhythm-r1…r8` |
| | read with ties and rests, tap and hold | notation → tap | I | ✅ hold grading |
| | displacement on paper | notation → choice | I | ✅ `displacement` 2 (new) |
| rhythm-dictation | R1–R8 by ear | sound → choice | B–E | ✅ |
| | swing feel / ratio | sound → choice | A | ✅ `swing-ratio` |
| | polyrhythm | sound → choice | A–E | ✅ `polyrhythm` |
| | Middle-Eastern rhythms | sound → choice | A | ✅ `eastern-rhythm` |
| | syncopation spotting ("which beat is pushed?") | sound → choice | I | 🟡 inside R5; own topic P2 |
| | write a heard rhythm (build on a grid) | sound → write | I–A | ⬜ P2 (needs the grid editor) |

**Rhythmic transformations** (skill `transform`, time branch; requested 2026-11-06):

| # | Exercise type | Example | Bands | Status |
|---|---|---|---|---|
| T-t1 | Displacement by ear: how far did it move? | Charleston, then the same from beat 2 | I | ✅ `displacement` 1 |
| T-t2 | Displacement on paper: start it later | grid → which grid | I | ✅ `displacement` 2 |
| T-t3 | Displacement by ear: which version starts on beat X? | 3 versions | I–A | ✅ `displacement` 3 |
| T-t4 | Sixteenth displacements (16th, dotted 8th) | funk cells | A | ✅ `displacement` 4 |
| T-t5 | **Tap it displaced**: hear or see a pattern, tap it starting on beat 2 or the "and" | tap pad | A | ⬜ P1 |
| T-t6 | Displacement in 3/4 and 6/8 (the shift crosses the bar differently) | waltz figure moved an 8th | A | ⬜ P2 |
| T-t7 | Augmentation / diminution (twice as slow or fast) | which is the same rhythm, doubled? | I–A | ⬜ P2 |
| T-t8 | Re-barring: the same rhythm in another meter (4/4 → 3/4 cycle drift, "3 over 4") | | A–E | ⬜ P2 |
| T-t9 | Clave direction 3-2 ↔ 2-3 | | A | ⬜ P2 |
| T-t10 | Metric modulation (old dotted quarter = new quarter: what is the new tempo?) | | E | ⬜ P3 |
| T-t11 | Displaced repetition inside a phrase (pattern of 3 over 4/4: where does it land in bar 3?) | | E | ⬜ P3 |

### 6.3 Memory & structure

| Skill | Sub-skill | Exercise types | Bands | Status |
|---|---|---|---|---|
| sequences | same / different | sound → choice | S–B | ✅ `basics-samediff` |
| | contour | sound → choice | S–B | ✅ `basics-contour` |
| | melodic memory (echo by degrees or names) | sound → say / sing | B–A | ✅ `note-sequences`, `songs`, `dictation` |
| | wrong-note detection | sound + notation → choice | I | ✅ wrong-notes mode, `sight-read` 2 |
| | chord memory | sound → choice | I–A | ✅ `chord-memory` |
| | melodic dictation (write it) | sound → write | I–E | 🟡 `dictation` answers as degrees; staff writing P2 |
| rhythm (memory) | rhythm memory | sound → choice | B–E | ✅ `rhythm-memory` 1–5 |
| form & texture ★ | phrase form (AABA, ABAC) | sound → choice | I | ✅ `form` 1–2 |
| | two voices (motion, upper, lower) | sound → choice / sing | A | ✅ `two-voice` |
| | how many voices or instruments? | sound → choice | B–I | ⬜ P2 |
| | song form (verse / chorus / bridge) | sound → choice | B | ⬜ P3 (needs recordings) |

### 6.4 Voice

| Skill | Sub-skill | Exercise types | Bands | Status |
|---|---|---|---|---|
| singing | match & hold | sound → sing | S–B | ✅ vocal L1, basics-voice |
| | sing degrees / names / sequences | names/numbers → sing | B–I | ✅ `sing-*`, sing-seq |
| | sight-singing | notation → sing | I–A | ✅ SIGHT ladder |
| | harmony singing (hold / line) | sound → sing | I–A | ✅ HARMONY ladder |
| | sing transposed | sound → sing | I | ✅ `transpose` q7 |
| technique | range, glide, leap, sustain, straight tone | sound → sing | B–A | ✅ VOCAL ladder |
| | dynamics: messa di voce, crescendo | sound → sing | I–A | ✅ messa, DYN |
| | vibrato (rate, width, on/off) | sound → sing | A–E | ✅ VIBRATO ladder |
| agility | runs & riffs | sound → sing | I–E | ✅ `runs`, runs workshop |
| | ornaments (grace, mordent, turn) | sound → sing | A | ✅ ORNAMENT ladder |
| | staccato / articulation | sound → sing | I | 🟡 one item |

### 6.5 Reading & theory

| Skill | Sub-skill | Exercise types | Bands | Status |
|---|---|---|---|---|
| notes | note names ↔ degrees | names → say / choice | B | ✅ `notes-degrees` |
| | staff reading, 4 clefs | notation → choice | B–A | ✅ `note-reading` 1–4 |
| | tenor clef | notation → choice | A | ⬜ P3 |
| theory | key signatures | symbol → choice | B–A | ✅ |
| | interval & chord spelling | names → choice | I–A | ✅ |
| | Roman numerals | names → choice | I–A | ✅ |
| | circle of fifths | symbol → choice | B–I | ✅ |
| | chord-scale theory | names → choice | A | ✅ |
| | time signatures & note values (written) | notation → choice | S–B | 🟡 `theory-facts` 1; own topic P1 |
| | voice-leading rules (parallel 5ths, resolution of 7th) | notation → choice | A–E | ⬜ P2 |
| | non-chord tones (on paper) | notation → choice | A | ⬜ P2 |
| | musical terms (Italian tempo and dynamic markings) | symbol → choice | B | ⬜ P1 |
| sight | does it match? / which differs? / three versions | notation + sound → choice | B–A | ✅ `sight-read` 1–6 (fix order) |
| | read rhythm + pitch together, tap or sing | notation → sing | A | ✅ SIGHT ladder |

**Pitch transformations** (skill `transform`, pitch branch):

| # | Exercise type | Bands | Status |
|---|---|---|---|
| T-p1 | Three notes to a near key (names) | B | ✅ `transpose` 1 |
| T-p2 | Move by an interval (names) | I | ✅ `transpose` 2 |
| T-p3 | Five notes, any key (names) | I | ✅ `transpose` 3 |
| T-p4 | By ear: which version is the same tune? | I | ✅ `transpose` 4 |
| T-p5 | Sing it in the new key | I | ✅ `transpose` lesson |
| T-p6 | Written single note by interval; transposing instruments (both directions) | I–E | ✅ `transposition` 1–3 |
| T-p7 | Melodies with chromatic notes | A | ⬜ P2 |
| T-p8 | Mode mutation: major → minor, or into a mode | A | ⬜ P2 |
| T-p9 | Sight-transpose from the staff (read in C, say or sing in B♭) | A–E | ⬜ P2 |
| T-p10 | Transpose a chord progression (Nashville numbers) | I–A | ⬜ P1 |
| T-p11 | Melodic inversion (mirror) and retrograde: which is it? | A | ⬜ P2 |
| T-p12 | Sequence: continue the pattern a step higher (sing or say) | I | ⬜ P1 |
| T-p13 | Sung transposition with only the new tonic (no cadence) | E | ⬜ P3 |

### 6.6 Creative & applied

| Skill | Sub-skill | Exercise types | Bands | Status |
|---|---|---|---|---|
| improv | call & response (finished? fits? echoes?) | sound → choice | B–A | ✅ `call-response` 1–4 |
| | improvise over a drone or backing | free → sing / play | B–E | ✅ Drone, Perform (unrated) |
| | finish the phrase (sing an ending on 1) | sound → sing | I | ⬜ P2 |
| | write 4 bars / set words to a rhythm | free → write | A | ⬜ P3 |
| expression ★ | louder / softer, crescendo / diminuendo | sound → choice | S | ⬜ **P1** |
| | staccato / legato / accent | sound → choice | S–B | ⬜ **P1** |
| | instrument families and recognition | sound → choice | S–I | ⬜ P3 (samples) |
| | style and period | sound → choice | I | ⬜ P3 (recordings) |
| | match the mood (major/minor plus tempo plus dynamics) | sound → choice | S | ⬜ P1 |

### 6.7 Totals

| | ✅ exists | 🟡 partial | ⬜ P1 | ⬜ P2 | ⬜ P3 |
|---|---|---|---|---|---|
| Catalogue rows (sub-skills / exercise types) | 73 | 9 | 17 | 17 | 9 |

**P1 means "known exercise, small effort, needed for launch".** At about 15 new generators, this is feasible in 3–4 releases. P3 items need recorded audio (licensing and app size) and are the only ones blocked on assets.

---

## 7. Decisions for the product owner

1. **Skill changes (§2):**
   - rename `transpose` → **Transformations** (pitch and time branches);
   - add **meter**, **form & texture** and **expression**;
   - move **improv** to a new *Creative & applied* domain;
   - rename `cadences` → *Harmony*.
   - Default: yes to all. This brings the Skill Map from 5 domains to 6.
2. **Multi-skill crediting (§3):** compensatory weighted Elo with weakness-weighted blame. The alternative is a simple primary-skill-only credit plus sub-skill EWMA, which is much simpler but less accurate.
3. **Track importance table (§5.4):** approve or tune.
4. **Sub-skill visibility:** show sub-skills on the Skill Map detail ("strong: swing · needs work: displacement"), or keep them internal?
5. **P3 audio:** budget for recorded instrument and style samples (CC0 or licensed), or leave out for v1?

## 8. Build plan

| Phase | What | Tests that lock it in |
|---|---|---|
| 1 | `src/engine/taxonomy.ts`: domains, skills, sub-skills, the prerequisite graph, and tag vectors for every existing exercise type (registry wraps `TOPIC_GEN`, lessons, vocal ladders) | **Coverage test:** every exercise type has tags (Σw = 1, primary ≥ 0.5); every sub-skill has ≥ 1 exercise type; every skill has a placement ladder; level bands are monotonic within a sub-skill |
| 2 | Weighted rating update and sub-skill EWMA (migrate `skillAs`); item calibration log | rating unit tests (blame split, caps); server-side rule parity (league migration pattern) |
| 3 | Priority scheduler (§5) for Today's plan; path lessons declare subs | plan tests per track; "no starvation" test (each sub reachable) |
| 4 | P1 content: octave, find the tonic, chord tones (sung), plagal/deceptive, modulation, harmonise, keep the beat, internal pulse, meter 2/3/4, simple/compound, downbeat, tap-displaced, Nashville transpose, sequence continuation, expression (dynamics, articulation, mood), musical terms, time signatures | each generator: deterministic, every answer reachable, playable, bilingual; quick lesson per new topic |
| 5 | Skill Map 6 domains plus sub-skill detail; calibration overrides | E2E: Skill Map, Find my level by area |
| 6 | P2, then P3 (assets) | — |
