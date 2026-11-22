# Today's workout v2: the key × exercise matrix, the time window, language in the key (draft for the owner, 2026-11-22)

This builds on docs/SPEC-WORKOUT.md: blocks of a target plus minutes, editable, presets. It also uses the key session (SPEC-KEY-SESSION) and rule-based improv with rotating scales (SPEC-RBI-ROTATION).

**What the owner said (2026-11-22):**
- The full set of exercises for a key may run past an hour for a serious musician; an amateur takes shorter chunks.
- Once the app knows how long *all* the exercises of a key take, it can split the daily workout by the player's time window and the AI coach's advice.
- The player can then finish all keys in all exercises, or all exercises in all keys, by a chosen date. They pick the view, or "weakest first".
- Split: technique in the key (with licks, voicings, cadences, groove) about 70%; rule-based improv 25–33%.
- Aeolian sits inside the major key, practised from the 6th degree. Advanced players get the modes from the root.
- The lick library should not be a separate thing outside (§6).

## 1. The matrix

- **A cell** = one rung of the ladder × one key: for example "lick 2 into triads, E♭ major".
- **Closed** = passed clean at its target tempo in that key, the same rule as everywhere.
- **What counts:** only the rungs open at the player's tier. Rungs open as the player climbs, so the count stays honest and never discouraging.
- **Rows (keys):**
  - **12 major keys.** Each holds the full ladder, plus:
    - the relative Aeolian, practised from the 6th degree. The explanation shown: "A minor = the C major scale from its 6th degree".
    - (T4+) the modes from the root. Each mode gets only the scale, 7th chords along it and the licks, not every rung (otherwise 7× the size).
  - **12 harmonic minor keys** (from T2): the harmonised scale, the licks, the minor ii–V–i, the cadences.
  - **12 melodic minor keys** (from T3–4): the scale and its harmonisation, the altered scale on its 7th, the minor 6th-diminished (Harris).
- **Columns (exercises):** the ladder's blocks:
  - A, the scale;
  - S, the spine (3rds, triads, 7ths);
  - B, other forms;
  - C, the approach licks;
  - D, fingers and hands;
  - E, cadences and voicings;
  - F, jazz;
  - **G, language in the key (new, §6).**

## 2. Time per cell

- **Before any play:** an estimate from the notes, the tempo, the rubato takes and the average takes to the limit. Roughly: (bars × beats ÷ tempo) × takes, plus the gaps between takes.
- **After play:** the player's own measured minutes per cell. The estimate moves toward the real time (moving average).
- **What the app can then say:**
  - "E♭ major, everything open at your level: about 70 minutes";
  - "triads in all 12 keys: about 45 minutes".

## 3. Views (the player's choice, remembered)

| View | Order |
|---|---|
| **Weakest first** (default for a new player, owner-approved) | by need: never played → lowest share of target → longest since played; weaker keys rise over time |
| **By key** | one key deep, every exercise (the key session) |
| **By exercise** | one exercise through the 12 keys. To keep the practice interleaved, it changes exercise every 3 keys. |

## 4. Splitting today's window

**The window:** minutes a day from the settings. The current limit of 60 rises to 180, for serious musicians.

**The split** (jazz focus; owner 2026-11-22):

| Share | Beginner | Advanced |
|---|---|---|
| Technique in the key (the matrix: scale forms, licks, language, voicings, cadences, groove) | 85% | 65–70% |
| Rule-based improv, in the key of the day; on a tune counts here | 15% | 25–30% |
| By ear (a line or bass line in the key of the day) | (inside the 15%) | 5–10% |

- **Classical focus:** no improv; that share goes to repertoire (the pieces coach).
- **The AI coach:** may tilt each share by up to ±10%, with a reason the player can accept or decline. For example: "your left hand lags: more hand independence this week".
- **Maintenance:** 15–20% of the technique share revisits closed cells at growing intervals (spaced review). This keeps "I finished everything" true a month later.
- **Encore:** stays its own place (owner). Encore phrases that are due join the maintenance queue.
- **The run:**
  - Today's technique block = the next cells in the chosen view until the minutes run out.
  - Each cell runs under the coach: the tempo climbs to the target or the player's limit, then moves on.
  - Stopping mid-way resumes at the same cell (never-lose-progress).

## 5. The projection

- "At 45 minutes a day: all major keys, every exercise at your level, in about 6 weeks."
- It updates from the real pace and is shown on the Progress page and the key page.
- When the tier rises and new cells open, the projection says so: "+38 new exercises opened".

## 6. Language in the key: the lick library merged into practice by key

**Today the same thing lives in four places:**
- the Licks tile (27 licks, written for the app, 12 keys, spaced review);
- the technique families k-bebop (bebop lines), k-vocab (bebop language), jazz (jazz lines) and k-harrisline (Harris lines);
- the approach licks (k-keylick);
- the "use a lick" card in improv.

**The proposal:**
1. **Block G, language in the key.** Every lick and line sits on a progression *in the key*:
   - the key's ii–V–I;
   - the minor ii–V–i (in the minor rows);
   - the key's turnaround;
   - the blues in the key;
   - V → I.

   The existing licks already run in 12 keys. They get filed on the key page and in the ladder by need, like every rung.
2. **One place for licks (owner 2026-11-22): the Licks tile stays on the Practice page and Encore moves inside it.**
   - **Why:** a feature outside this area would be found less; people would not understand what it is. So everything about licks sits together.
   - **Inside the tile:**
     - **Library:** our licks and the known devices, filtered by chord context and level, with the keys each one is closed in. This is also where spaced review is due.
     - **Mine** (what Encore was): add a lick by playing it, recording it or writing it; it becomes yours in 12 keys up a tempo ladder.
     - **Challenges** (Encore's challenges and featured phrase).
   - **Share:** after a lick is played clean at a tempo, a share card names the lick, the key and the tempo (♩).
   - **The key session's block G** draws from the same library, both ours and the player's own.
   - **The "use a lick" improv card** accepts any lick closed in that key.
   - Encore's own entry point (the Practice tile and the sidebar item) goes. Its data and its review carry over unchanged.
3. **The technique families of lines** (k-bebop, k-vocab, jazz, k-harrisline) feed block G instead of standing as separate rows of exercises. Their levels stay (path, level test, skill map), so nothing measured is lost.
4. **Expanding the library:**
   - **Can go in:** known vocabulary *devices*, written in our own notes. These are generic material, not anyone's solo:
     - the 1-2-3-5 cell;
     - 3 to ♭9;
     - the bebop scale with chord tones on the beats;
     - double chromatic approaches;
     - the triplet turn;
     - the ♭9 diminished;
     - guide-tone lines;
     - the "Barry" lines (from the Harris theory doc, verified);
     - pentatonics a 5th up over V;
     - the half step up into the altered.
   - **Cannot go in:**
     - etude books (Snidero, Ligon, Bergonzi, Aebersold): copyrighted;
     - transcribed solos of players: copyrighted.
   - **Etudes (owner 2026-11-22: option C):** only from public-domain sources, judged by **US copyright law** (the customers are in the US). Research: docs/research/PD-JAZZ-SOURCES.md. One open point: an improvised solo on a pre-1978 record may count as an unpublished work protected for life+70, even when the recording itself is PD.

## 7. Order of work

1. The matrix, time per cell (the estimate) and the three views; the key session reads the matrix.
2. The workout window to 180 minutes; the shares; the technique block runs cells; resuming.
3. Block G: licks and lines on the key's progressions, filed by key; the Licks tile moves to "My vocabulary".
4. The minor rows: Aeolian inside major; harmonic and melodic minor as rows.
5. Measured time per cell; the projection; maintenance.
6. Rule-based improv with rotating scales (SPEC-RBI-ROTATION) in the improv share, in the key of the day.
7. The AI coach's tilt.

## 8. Owner's answers and open questions

1. **Licks and Encore: answered** (see §6.2). One tile, with Encore inside it.
2. **Etudes: answered.** Public domain only, under US law.
3. **Open:** the default window for a new jazz player. Proposed: 30 minutes.
