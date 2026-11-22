# Rule-based improv: the scale per chord, rotated (draft for the owner, 2026-11-22)

Owner, 2026-11-22. Over every chord the player improvises with the notes of a scale set for that chord, with or without extra rules. The app changes the set scale from time to time to test command of more modes:
- on V7, sometimes altered, Lydian dominant, Phrygian dominant, half-whole and so on;
- on I, the different options;
- logical subs on half bars, which bring their own scales.

The player sees a lead sheet: the chords, the scale over each one, and a colour per scale family. The scales change as part of the workout.

**Research:** docs/research/CHORD-SCALE-ROTATION.md. It holds the menus, avoid notes, subs, pedagogy and sources, with every claim tagged [V], [C] or [?].

**Primary-source finding:** Barry Harris rejected mode thinking. His words on p. 26 of the Smithsonian oral history (2010), which I read myself: "I never knew a mode in my life... the Phrygian, the dorian, the mixolydian, and all that kind of nonsense". So:
- Track A (the chord-scale method: Aebersold, Levine, Berklee) carries no Harris label.
- Track B is the same idea in Harris's own terms.

## 0. What exists and what is new

- **Exists** (src/engine/improvRules.ts, ruleCards.ts):
  - a chart with a scale for each bar, set automatically by `autoScale` or by the player or teacher;
  - the "stay in the scale" rule;
  - 51 rules and the rule cards, a compliance score and a bar map.
- **New:**
  1. the rotation engine;
  2. half-bar scales and subs;
  3. the lead-sheet view with a colour per scale family;
  4. a grader that knows colour notes and avoid notes;
  5. Track B;
  6. links to the daily workout and to the player profile.

## 1. The menus (per chord function, mild → tense; detail in the research §1)

The dominant menu is filtered by the quality of the chord it resolves to, not by the chord symbol.

| Function | Menu |
|---|---|
| I maj7 / 6 | Ionian (avoid 4) · major pentatonic · Lydian · major bebop (= Harris C6-dim) · (T5) Lydian augmented on maj7♯5 |
| IV maj7 | Lydian · Ionian |
| ii m7 | Dorian · (iii, vi) Phrygian / Aeolian, diatonic · minor pentatonic |
| i minor (m6, mMaj7) | melodic minor · Dorian · harmonic minor · m6-dim |
| ii ø (in minor) | Locrian · Locrian ♮2 |
| V7 → major | Mixolydian · bebop dominant · half-whole · altered (bebop practice) · Lydian dominant (non-resolving) |
| V7 → minor | Phrygian dominant (HM5) · altered · Mixolydian ♭13 · half-whole (owner question 2) |
| V7 non-resolving (tritone sub, backdoor, ♭VI7, II7 held) | Lydian dominant · Mixolydian |
| Secondary dominants | by the target's quality: A7 → Dm takes HM5 / altered; D7 → G7 takes Mixolydian / Lydian dominant |
| dim7 (passing) | whole-half from the dim's root (= the half-whole of the implied V7♭9) |
| sus4 | Mixolydian without the 3rd · major pentatonic on the ♭7 · (T5) Phrygian / Dorian ♭2 on sus♭9 |

## 2. Logical subs on a half bar (research §2)

A sub enters only when it meets all of these:
- it leads to the next chord (a fifth down, a half step, or the backdoor);
- its guide tones move by step;
- the bass moves chromatically or by fifths;
- a held melody note (if the tune has one) fits the sub's scale;
- at most one sub every 2–4 bars at low tiers.

| Tier | Subs |
|---|---|
| 1–2 | sus before V · VI7 (V/ii) · iii for I · minor iv (Fm6 before C) · passing diminished |
| 3 | tritone sub of V · backdoor ii–V · temporary ii–V into a minor target |
| 4 | related ii of the sub (A♭m7 D♭7) · tritone subs in the turnaround · ♭VI7 · the minor-key subs (D♭7, A♭m7 D♭7, the A♭7–G7 cadence) |
| 5 | the Coltrane cycle (advanced only) |

Each sub brings its scale. For example D♭7 brings D♭ Lydian dominant, which has the same notes as G altered. The app says so the first time ("same notes as G altered, over a different bass").

## 3. The rotation

- **When:**
  - T1–2: once per chorus, announced 2 bars ahead;
  - T3: every 4 bars, 1 bar ahead;
  - T4: every 2–4 bars, each sub with its own scale;
  - T5: per chord.
  - Never mid-phrase without a warning (the "next" chip). Every change has its now-cue, under the timing-cue rule.
- **What it picks, by need** (the same rule as the key session):
  1. a scale never played on this function;
  2. the lowest colour coverage and in-set rate;
  3. the longest since played.
  - Scales the player is good at come back for maintenance at a low rate (about 15%).
  - The profile keeps a mode × function map ("Lydian dominant on non-resolving V7: 62%"). The skill map and the AI coach read it.
- **The key:** the key of the day from the key session. If today's technique was E♭, the improv is in E♭ too: a ii–V–I, then a tune in E♭.

## 4. The screen (one screen, no scrolling)

- **The lead sheet:**
  - The bars of the form, with the chord symbol large.
  - Above the chord, the scale name, small (Track B: "think A♭m6").
  - A half bar with a sub shows the sub's chord above the original, in a smaller line.
- **A colour per scale family** (the same colour across the app), so the eye sees which "world" the notes come from:
  - major and its modes;
  - melodic minor and its modes (altered, Lydian dominant, Locrian ♮2, Mixolydian ♭13);
  - harmonic minor and its modes (HM5);
  - symmetric (half-whole, whole-tone);
  - pentatonic and blues;
  - the colours are chosen for contrast (readable-contrast rule).
- **A mini keyboard or a ring of 12** with the scale's notes, which the player can switch off:
  - the colour notes (what sets this scale apart from the default) in an accent;
  - avoid notes outlined;
  - guitar and bass: the notes on the neck in the current position.
- **The next scale:** a chip slides in 1–2 bars ahead.

## 5. Grading (research §5.5)

Every note is classed against the scale active at its onset:
- chord tone;
- tension;
- **colour note**;
- avoid note;
- passing note: off the beat, short, resolving by half step;
- wrong.

The anticipation window is an eighth before the change.

| Metric | Use |
|---|---|
| In-set rate | stayed in the scale |
| Chord tones on strong beats | beats 1 and 3 |
| Avoid handling | an avoid note on a strong beat that lasts ≥ 1 beat, or leaves by a leap, is a fault |
| **Colour coverage** | at least one colour note in each chord span of ≥ 2 beats. This is the key metric: without it, a player who plays only chord tones passes every scale, and the rotation tests nothing. |
| Resolution (T3+) | the first note of the new chord is a chord tone reached by step |
| The rules | the existing rules (bar starts on the 3rd, limited notes, rhythm...) layered on top |

## 6. Track B: the Harris way (no modes, no "half-whole")

The same lead sheet. The line over the chord is a thought chord or a rule, not a mode.

- **H1, the starting degree:** the chord's scale with the half-step rules, from the root, then from the 3rd, the 5th and the 7th.
- **H2, the thought chord over V7:** G7 itself; the family (B♭7, D♭7, E7); the important minor (Dm6); the tritone's minor (A♭m6, "the perfect altered scale"); Fm6.
- **H3, the conversion:** ii is played as its V; ø is played as the dominant a major 3rd below (Dø → B♭7).
- **H4, the rule set:** the plain scale → the half-step rules → triplets → the chromatic scale → pivot / arpeggio up, scale down.
- **H5, the scale of chords:** 6-dim (Dm7 = F6).
- **H6, the ♭9 dim:** the dim from the 3rd (B D F A♭).
- **H7, the family movement:** inside one V.

**Grading:**
- chord tones of the thought chord on the beat;
- any half step off the beat that resolves is allowed;
- instead of colour coverage, the thought chord's identity notes (A♭ + E♭ for A♭m6 over G7).

Tiers H-1…H-5 are in the research §5.3. Every item comes from a source listed there (Rees, Smithsonian, Open Studio Harris courses, docs/BARRY-HARRIS-THEORY.md). The use of Bm6 over V7 is not verified, so it stays out until the owner confirms it.

## 7. In the daily workout

- Rule-based improv takes its share of the technique window:
  - beginners about 15%;
  - advanced 25–33% (the owner: 70/30);
  - improvising on a tune counts here.
- Its key is the key of the day.
- The weak modes from the profile come first.
- The AI coach may tilt the share by up to ±10%, with a reason the player can accept or decline.

## 8. Open questions for the owner

1. **Naming:** "Scale rotation" for Track A and "The Barry Harris way" for Track B. Both are in the app, side by side?
2. **Half-whole over V7 → minor:** its natural 13 (E over a G7 going to C minor) clashes with the key's E♭. Exclude it, or allow it as an advanced colour at T4+?
3. **Altered over V7 → major:** allow it from T2 as bebop practice, or from T3?
4. **Open Studio:** if a specific Open Studio lesson drills mode rotation, a link lets me check it. The public pages show only the Harris courses, which are non-modal.
