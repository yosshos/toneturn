# SPEC — The role of the path (2026-11-14)

Approved by the owner on 2026-11-14, including both decisions in §6.

## 1. One job for each part

| Part | Question it answers | Axis |
|---|---|---|
| **Path** | What am I learning now? | **New**: concepts in a good order, with a story and units |
| **Today's workout** | What do I strengthen today? | **Depth**: 12 keys, the tempo ladder, spaced review, weak spots |
| **Practice** | What do I feel like doing? | **Choice**: the whole library |
| **AI teacher** | How am I doing, and what's next? | **Direction**: balances the three, weekly plan |

## 2. “Opened” vs “mastered”

- **A path step is done when it is *opened*.** Opened means the lesson is done and there is a first clean measured pass.
  - A technique step needs its first stars on the existing star scale (memory: technique-star-scale; 3 keys open the next step).
  - It does not need all 12 keys or the top tempo.
- **Mastery lives in the workout.**
  - Once opened, the item joins the workout's strengthen pool: weak keys first (keyMastery, 0.90), the tempo ladder, and stars 4–5.
  - On the path it shows separately from the ✓: the 12-key strip or the stars.
- **This is consistent with earlier decisions:**
  - the cautious ✓ (learning-path-design);
  - rank = the hardest item beaten, never “full” below Master (promotion-not-full-bars).

## 3. Today's workout = new + strengthen + review

Current state:
- workout2.ts `suggestBase` gives the path block most of the time.
- “The path is WHAT, the workout is HOW MUCH TODAY; blocks serve path steps first”.
- In an instrument course the warm-up is today's drills, and the path, about half of it technique, does the rest.

New default shares of the total time (rounded to whole blocks; the player can still edit everything):

| Block | Share | Content |
|---|---|---|
| New (path) | ~20–25% | the next path steps (lesson + first pass) |
| Strengthen | ~45–50% | opened technique items. Weak keys first and the tempo ladder (planWithFocus). Ear sub-skills that are opened but weak |
| Review | ~25–30% | spaced reviews, lick and piece review, a game |

Rules:
- If nothing is opened yet (a new player), the path takes the strengthen share too.
- When the path has no open step (the unit is waiting for its checkpoint), the checkpoint takes the new block.
- Theory/ear course: strengthen = the weakest opened sub-skills (weakestSkills) and the ear topics in more keys or registers.
- Path progress still counts from every block (“everything connects”): a strengthen take on an opened step can raise its stars.

## 4. Unit checkpoint = promotion

- **Today:**
  - A checkpoint is 8 mixed questions from the unit.
  - A technique-only unit is checked by its own playing.
- **New:**
  - The checkpoint adds a technique part: the unit's technique items in **4 random keys** at the unit's target tempo, 2 for a short unit.
  - Passing the checkpoint raises the rank, and passing the technique part marks the unit's items as “checked in keys”.
- **Decided (§6 Q2):** the checkpoint is not a gate. The next unit opens anyway; only the rank waits for the checkpoint.

## 5. Practice and the path

- Anything can be opened from Practice. An item ahead of the path shows a small “ahead of the path” mark.
- Playing it there counts toward the path when the path reaches it (existing “tested” / placed logic).

## 6. Decisions (owner, 2026-11-14)

1. **Q2 — Is the checkpoint a gate?**
   - **Decided: no.** It gates only promotion (rank); the path continues.
2. **Q3 — Workout without the path for advanced players?**
   - **Decided: yes.** A setting “Path: guide me / I choose” (מסלול: הדריכו אותי / אני בוחר).
   - With “I choose”, the workout has no New block (strengthen + review + the AI's weekly suggestions), and the path fills in from what the player does.

## 7. Build list

1. workout2.ts: three blocks (new / strengthen / review) with the shares in §3. The strengthen block runs a new `strengthen` target that draws from opened items: technique via planWithFocus, ear via weakestSkills. Migrate saved templates, keeping the player's own.
2. Path UI per §8: three node states, unit mastery ring and seal, the 'what's missing' sheet, silver refresh.
3. Checkpoint: the technique part in 4 random keys at the target tempo, feeding rank and keyMastery.
4. Practice: the “ahead of the path” mark.
5. Setting “Path: guide me / I choose” (default: guide me).
6. Tests: shares, a new player with nothing opened, checkpoint keys, template migration. e2e: workout blocks fit a 320×720 phone, and the checkpoint technique part.

## 8. Opened vs mastered: what the player sees (owner, 2026-11-14)

**Stars, one scale for every step:**
- 1–3★ means the step is opened. On technique, ✓ comes with 3 keys at the base tempo; this replaces today's ✓ on the first star.
- 4★ means half the keys at the target tempo.
- 5★ means all 12 keys at the target tempo: **mastered**.
- Ear and theory steps earn stars by accuracy and speed across the topic's levels, and are mastered at 5★.

**Three node states on the path:**
- **Open** (to do): highlighted.
- **Opened**: the glyph with a thin ring that fills with the stars, so it visibly looks unfinished.
- **Mastered**: a full gold ring.

**Unit:**
- The header reads "Unit 4 · mastered 5/9", with a ring.
- When every step is at 5★ and the checkpoint is passed, the unit gets a "mastered" seal and a badge.

**What's missing, in words:**
- Tapping a step opens a sheet with the next concrete action, e.g. "missing: D♭, F♯, B at ♩100", and one Practice button that starts exactly that.

**Refresh:**
- Mastery decays without practice (keyMastery recency).
- A mastered step that drops below the threshold turns silver with "refresh", which pulls the player back.

**Drive:**
- The workout's strengthen block says what it leads to, e.g. "2 more steps and unit 3 is mastered".
- Mastering a unit gives bonus XP, league points and a badge.
- The weekly AI summary names units close to mastery.
- Rank is unchanged (hardest item beaten). Unit mastery is a separate completion axis.
