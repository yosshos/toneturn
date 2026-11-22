# Licks in improvisation: another door to the licks (draft for the owner, 2026-11-22)

**What the owner asked (2026-11-22):** another door into the licks, through improvisation. After I learn a lick and practise it, improvisation gives me a rule that asks for it, for example "use one of your licks once every 4 bars". Or I get a reward every time I use a lick I learned. Several doors to the same thing are fine, as long as the menu doesn't get crowded.

**The goal behind it:** a lick drilled in 12 keys is not yet language. It becomes language when it comes out by itself in improvisation, over the right chord, in a key it wasn't drilled in, and slightly changed. So this door measures the last step: from "I know it" to "it's mine".

## 0. What exists

| Exists | Where | Limit |
|---|---|---|
| The rule card "use a lick you learned" | ruleCards.ts `use-lick` | It is enough to find **one** lick, **once**. The pool is only the 27 library licks: not my phrases (Encore) and not the approach licks. |
| Lick detection in what was played | lickDetect.ts `findLick` | It is transposition-invariant and checks the chord. It can tell an exact use from a varied one (minShare / shape), but nothing uses that difference. |
| Improvise → "Lick" mode | ImprovStudio.tsx | One lick over four keys. It records a rating event, then disappears into the studio. |
| Spaced review of licks | licks.ts (FSRS) | A use in improvisation does not count as a review. |

## 1. The pool: "my vocabulary"

A lick enters the pool after it is **learned**: played clean at its target tempo in at least one key (owner question 1).

The pool holds:
- the library licks;
- my phrases (Mine / Encore);
- what I transcribed (from a piece in Repertoire);
- the approach licks (k-keylick) as **cells** (lick 1, 2, 3 before a shape), identified by their pattern, not by their notes.

A lick knows its context (the chord quality / the progression it sits on). It counts only when played over a matching chord in the chart.

## 2. The rule cards (the "Licks" family in Improvise)

| Card | What it asks | How it is measured | Level |
|---|---|---|---|
| **A lick in the chorus** (exists, upgraded) | one of my licks, once, over its chord | at least 1 hit | 2 |
| **A lick every 4 bars** (owner) | in each 4-bar window with notes, at least one lick of mine | windows with a hit ÷ windows with notes (like the other "every 4 bars" cards) | 3 |
| **Today's lick** | one lick the app picks (due for review, or the newest learned) at least once a chorus; the chart marks where it fits | a hit of that lick over the right chord | 2 |
| **A lick in a new key** | a lick of mine in a key where it isn't closed yet | a hit in a key outside its closed keys | 4 |
| **A lick, varied** | a lick of mine, changed: displaced in rhythm, starting on another degree, shortened or extended | a partial hit (about 60% of the notes, the shape kept) and **not** exact | 4 |
| **Three different licks** | at least three different licks of mine in the chorus | the number of distinct licks found | 4 |

Each card joins the existing rule slots (vocabulary / notes / rhythm / shape). It can be combined with the scale rotation (SPEC-RBI-ROTATION): for example "lick every 4 bars" together with "altered on the V".

## 3. Detection

- **The engine:** `findLick` against the notes played and the chart, transposed to any key, with rhythm tolerance.
  - **Exact:** at least 80% of the notes in order.
  - **Varied:** at least 60% with the shape kept.
- **One hit per occurrence:** overlapping hits are merged.
- **Over the right chord:** the lick's first chord is matched by quality, so a minor ii–V lick counts over a minor ii–V or over the tritone sub with the same notes.
- **Clean:** the hit counts only when the timing inside it is within the tier's tolerance. A lick thrown in out of time is not language.
- **Approach cells:** pattern detection (a half step below → target, an enclosure, etc.) arriving on a chord tone.

## 4. The reward (and how it connects to everything)

**During play:** a small lick mark on the bar where a lick was detected, on the chart and on the bar map. No sound and no popup, so the take isn't interrupted.

**In the debrief:**
- "You used 3 licks: maj-enclose (in B♭), 'Tuesday's phrase' (in E♭, new key), lick 2 before the 3rd of D7."
- Each one can be replayed from the take.

**Points:**
- every use gives XP in improv / vocabulary (league and course share);
- a use in a new key, or varied, is worth more;
- **the same lick again in the same chorus:** half, then nothing from the third time (so the improvisation doesn't turn into lick repetition);
- **a variety bonus:** for distinct licks.

**A lick's status:**

| Status | When | Shown |
|---|---|---|
| Learned | closed in one key | in the library |
| In practice | on the way through the 12 keys | the keys map |
| **In my language** | used in improvisation in at least 3 different sessions and at least 2 keys (owner question 2) | its own mark in the library, with "used N times, in K keys" |

**Other connections:**
- **Spaced review:** a clean use in improvisation counts as a successful review, so the lick comes back later and there's less drilling (owner question 3).
- **Skill map:** the "vocabulary in use" share (licks in my language ÷ learned) shows in the improvisation area.
- **Daily workout:** the improvisation block may carry the rule "today's lick" for a lick due for review. This replaces a drill review with real use.

## 5. The doors (no new menu entry)

1. **Improvise:** the "Licks" family of rule cards, plus "today's lick" at the top of the setup.
2. **The lick page in Licks:** a "use it in improvisation" button. It opens Improvise with "today's lick" = this lick, over a chart that has its context:
   - the progression in the key;
   - or **a piece from Repertoire that contains it** (for example a minor ii–V lick goes to bars 5–6 of Autumn Leaves).
3. **The piece page in Repertoire:** "improvise on it" shows the licks of mine that fit its progression.
4. **The key session:** after a lick closes in the key, the coach can suggest "now improvise with it" (a short improvisation over the key's ii–V–I with "today's lick").

The current "Lick" mode in Improvise is folded into "today's lick". Its rating events are kept.

## 6. Data

- **Usage log** (on the device, in the lick book): `{lickId, key, chord, exact|varied, at, sessionId}`.
- **Derived from it:** "in my language", usage counts, the review.
- **Not kept:** the notes of the take. They stay in the recording only if the player chose to keep it.

## 7. Tests (acceptance)

- A lick played over the right chord in a new key is found and gets "new key".
- The same lick over the wrong chord is not counted.
- A varied version (displaced by a beat, the first note dropped) is found as "varied", not "exact".
- The same lick 4 times in a chorus: XP drops (full, half, 0, 0).
- "Every 4 bars": a chorus of 16 bars with licks in 3 of the 4 windows gives 75%.
- A clean use moves the lick's spaced-review date. 3 sessions in 2 keys gives "in my language".
- E2E: lick page → "use it" → Improvise with "today's lick" over a chart, debrief with the mark.

## 8. Questions for the owner

1. **When does a lick enter the pool:** after it closes in one key (proposed), or already at 70% of target in one key?
2. **"In my language":** 3 different sessions and 2 keys (proposed), or something else?
3. **A use as a review:** should a clean use in improvisation count as a spaced review (less drilling of a lick that is already in use)?
