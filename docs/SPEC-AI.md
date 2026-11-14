# SPEC-AI (English notes)

The main AI spec is docs/SPEC-AI.he.md (the coach, the player profile, "Explain more", hints). This file holds
English-language sections added later.

## Key mastery (owner 2026-11-14)

Every technique and jazz skill is practised in all 12 keys on piano, guitar and bass. The app knows, per skill, which
keys the player controls and which are weak, and leans on the weak ones.

**Engine** (`src/engine/analysis/keyMastery.ts`, pure)
- Skill = drill family (optionally split by drill kind: `keyMastery(items, now, 'kind')`). Drums, the player's own
  drills, licks and transcription have no key map.
- Per item: mastery = (0.65 × clean tempo ÷ the item's target tempo — or the variant's best tempo in any key when it
  has none — + 0.35 × accuracy) × recency. Recency = 0.6 + 0.4 × ½^(days / 30): a key not played for long keeps at
  least 60 %.
- Per key: the takes-weighted mean of its items. Fewer than 3 takes in a key = **untried** (never weak). A tried key is
  **weak** below 0.5, or 0.2 below the skill's median when at least 3 keys are tried; **strong** from 0.85; else **ok**.
- Per instrument: the mean over the skills where the key was tried; a key weak in half of them (or below 0.5) is weak.
  The three weakest are named ("your weakest keys on piano: D♭, F♯, B").

**Practice** (`plan.ts` `planWithFocus`, behind `todayDrills`, so Today, the workout block and the path's drill steps)
- Setting "Focus on weak keys" / "דגש על סולמות חלשים" (`DrillSettings.focusWeakKeys`, on unless false).
- The candidates are ordered weak keys (weakest first) → untried keys of a skill already measured → the rest in the
  player's key order. A skill with nothing measured keeps the key order.
- After the ladder's pick, 40–60 % of the slots go to weak / untried keys (n = 5: 2–3). Above 60 % the least urgent
  ones give way to other keys, longest unplayed first, so every key keeps rotating in.
- Runs go through the normal drill run: XP, the technique result, leagues, the level test and the workout all count
  them as before.

**UI**
- Family cards (piano, guitar, bass): a thin 12-cell strip, fifths order, LTR; a coral bar under weak keys.
- A family's page: the 12-key map with names; tap a key = the skill's current level in that key (or the nearest level
  that has it). Untried keys are dashed; weak ones carry the marker; never colour alone (title: status and %).
- Insights → "Keys" (keys, guitar, bass and jazz courses): per instrument the map, the weakest keys and one line:
  "Next: <skill> in E♭, A♭, D♭ · ♩80", with Practice (starts the skill in its weakest key, back to Insights after).

**Profile and coach**
- Profile source `keys`: one row per weak key (`k:<family>:<pc>`), up to 3 per instrument, new / recurring like the
  others. Gone = no longer weak and at least 5 clean takes in that key since it was last seen. The snapshot keeps the
  clean-take counts of its own key rows only.
- `profileDigest` adds `weakKeys`: a line of at most 300 characters, e.g.
  `piano: weakest D♭, F♯, B; ii–V lines weak in E♭, A♭, D♭ (goal ♩80)`. Summarised data only.
- Edge function `toneturn-ai`: the card and weekly prompts name the weak keys and propose a short key-focused plan
  ("this week: ii–V lines in E♭, A♭, D♭ at ♩80"). Models, caps and token limits unchanged. Needs a redeploy.
- Sim mode (`?sim=1`) scripted card / weekly answers mention keys (the digest's line when present).
