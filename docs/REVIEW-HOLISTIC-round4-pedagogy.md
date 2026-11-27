# Round 4 — independent pedagogy / content / legal review of SPEC-HOLISTIC-2 v5 (H2) + SPEC-SPIRAL-PRACTICE v6 (SP)

**Verdict:**
NOT CLEAN

The content scope is now broad and well matched to the audit. All 15 audit priorities have a home, and the project rules (no movable do, no locks, H4 sourcing, human-only rubato, "teacher or recording needed") are respected. Five substantive issues remain. Two are contradictions in the cold/level rules that would block step 1, which is where building starts.

---

## Substantive issues

### 1. "Only the first cold take in a session counts toward level" (H2 §1.4) — **blocker**
- **Problem:** the rule has no scope (per session? per area? per cell?), and either reading breaks something.
  - (a) If it also limits `itemPass`, which the text implies ("later cold takes count only toward FSRS and the staircase"), it contradicts SP §4.2 and the SP §9 3-day several-keys test ("every exercise gets a qualifying cold take each day, promotion by day 2–3"). It also contradicts the key-session-must-develop rule: only one item a session could pass.
  - (b) If it limits only Phase A confirmations, a learner gets one confirmation per session across all six areas. Promotion needs ~12 confirmations at the candidate tier, in ≥ 2 keys, on ≥ 2 days, for each area. Rank is the 2nd-best area. So a tier takes months, and the §1.3/§9.1 harness test "climbs T0 → T5 on rotation alone" will fail or get tuned around.
- **Validity:** it also mixes two different things. *Item-specific* coldness (retention: no rehearsal of this item or cell for hours) is what matters for learning. *General motor warm-up* is not laundering: every real performance comes after warm-up. Counting only the first take after sitting down adds a physical warm-up decrement to the level that Phase A has no way to remove (only Phase B models it).
- **Fix:**
  - Scope the rule as: the first cold take **per cell (or per angle) per session** counts toward level, with `sessionMs` logged.
  - State plainly that `itemPass`'s cold requirement accepts any H2 cold take.
  - If laundering is still a worry, cap level evidence at the first N minutes, or one confirmation per angle per session, rather than one per session.

### 2. The Phase A statistic contradicts itself (H2 §1.7) — **major**
- **Problem:** "a cumulative log-likelihood ratio over a sliding window of the last 12 … floored at the lower bound and never restarted" describes two different statistics. A cumulative floored SPRT is not a 12-item window sum, and the two behave very differently.
  - With p0 = 0.5, p1 = 0.85, α = 0.05 and β = 0.2, the window form needs about 10 of 12 clean.
  - At true p = 0.55, a single window crosses with p ≈ 0.04. Over a 6-month horizon of sliding looks, wrong promotions will far exceed 5 %.
  - The bounds tuned to meet 5 % will then make promotion very slow, which compounds issue 1.
- **Fix:** pick one statistic, either a fixed-n window with a k-of-n rule or a CUSUM-style floored LLR without a window. Write down its exact update rule, and only then let §9.1 tune its bounds.

### 3. "Band", the entry rule and the beginner definition collide across the two specs — **major**
- **"Band" means two things.** In SP §14, band is the 4-step grouping of T (band 1 = T0–1 …), and H2 §8.4's "band 1 / 2+" uses that meaning. In H2 §1.3, "band" is the *tempo tier* (`areaTier.band`, "confirmed band").
- **The beginner definition is changed silently.** H2 says the confirmed band drives "the beginner definition (SP A3)". SP A3 defines a beginner by the placement **content** tier. So these are now two different rules.
- **The entry rule differs:**

| Spec | Entry rule |
|---|---|
| SP §14 / §15.5 | band ≤ area tier, prerequisites **acquired** |
| H2 §1.3 | content tier ≤ areaTier.content **+ 1**, prerequisites **established** |

  - H2 calls its version "how SP §15.5 reads the tier", but it is a real change.
  - Stacked with SP §17.3's "band entry ± 1 step", a T1 learner could reach band-3 items.
  - "Established" (a cold take on a later day) also means that in the early sessions no item with a prerequisite (35, 3b, 7, forms whose own prerequisites aren't met) can enter. It is unclear whether owner D2's "forms join once the anchor is acquired" still holds.
- **H2's governance line is too narrow.** H2 says it governs only "SP §4 and §17". It actually amends SP §2.5, §3, §14, §15.4, §15.5, §17.3 and A12.
- **Fix:**
  - Rename H2's tempo axis (e.g. `paceTier`).
  - Keep the SP A3 beginner definition.
  - Write one entry formula that says whether the +1 and the rate's ±1 stack, with a cap of at most one band above.
  - Say whether D2's anchor gate counts as a prerequisite.
  - Widen H2's governance line to list every SP section it amends.

### 4. Real-music items have no home in the level model and no difficulty metadata (H2 §8.2–8.7, §13.6, §1.2, §1.10) — **major**
- **Problem:**
  - The tune content (learn-a-tune steps, accompanying-a-singer levels, capstones, drum balance and soloist work, composition, pop `k-pop` levels) is not mapped to any §1.10 area.
  - Heads carry no `contentTier`, even though §1.2 has a guard test that fails on any spec without one, and §16 claims "everything connects".
  - Heads have no difficulty criteria: range (critical for voice), syncopation, chromaticism, reading complexity, tempo. "Beginner" vs "core" is a hand label with no definition. Yet band-1 learn-a-tune, goal tunes (§6.1), section-boundary tune suggestions (§13.1) and tune of the week all have to match a tune to the learner.
  - Without this, a T0 pianist can be offered Ain't We Got Fun or King Porter Stomp.
- **Fix:**
  - Give each head a difficulty card computed from the §1.2 reading-complexity features plus range and harmonic rhythm, mapped to T.
  - Map each new family or step to an area (or mark it explicitly "coverage-only, not level evidence").
  - Add both to the course-change checklist.

### 5. Legal gaps — **major**
- **(a) "1A = PD worldwide" really means "US + life+70".** 1A is served everywhere (§8.1) before the §17.1 lawyer answers arrive. But several 1A heads have authors who died 1938–1955: Donaldson 1947, Ahlert 1953, J. P. Johnson 1955, Jolson and DeSylva 1950. Those heads are protected in long-term countries unless the rule of the shorter term applies there:
  - Mexico: life + 100;
  - Colombia: life + 80;
  - Côte d'Ivoire: life + 99;
  - others at life + 75–95;
  - Spain: life + 80 for authors who died before 1987.

  The languages plan targets Spanish-speaking jazz markets.
  - **Fix:** store `pdFrom` per term class (70/75/80/95/100) on each head, and have `servable()` deny long-term countries until the lawyer clears the shorter-term question.
- **(b) Guided transcription (§10.2) and teacher or ensemble content can be shared.** The output of transcription ("write it", saved recordings) feeds an app that has public sharing: Encore community, challenges and gifts (src/engine/encore/community.ts, src/cloud/challenges.ts). A transcribed solo or line from a copyrighted record (pre-1978 solos are protected; memory us-copyright-law, §303(b)) is a derivative of a protected work. The same problem applies to teacher-model recordings (§12.2) and async-ensemble takes (§12.3) of 1B or post-1930 heads that cross regions.
  - **Fix:** a source flag on every user-made phrase or transcription. Content from own audio of a protected source stays on the device, or goes to the learner's own teacher for lesson use only. It never goes to community, challenges or gifts. Teacher and ensemble content that carries a served melody goes through `servable()` for the recipient's region.

---

## Minor notes
- **§8.4 step 1** ("embed first, then the app's version") must stay click-to-play, so it doesn't break the no-auto-play brief rule (path-names-and-brief).
- **§1.7 range:** a single lucky clean cold take sets the top of the range. Use ≥ 2 clean cold takes on different days.
- **§10.1 Hot Five:** this is a release-date fact check, not a lawyer question (Nov-1925 sessions released in 1926 become US-PD on 2027-01-01). 78-rpm transfers need recorded provenance (a PD-clean digitisation, not a label remaster).
- **§8.2 head list ignores style focus.** STANDARDS_LEGAL's 1A choro and tango tunes (Tico-Tico, Odeon, El Choclo) and the 1A blues (Jelly Roll Blues, Careless Love, C.C. Rider) are missing, so Latin-focus and blues-focus learners get no real tunes.
- **§14 PD repertoire:** consider adding Tárrega (guitar) and the 1894 Schirmer Italian arias (voice), as the audit suggested.
- **§8.7 L2–3** need a stated melody source (the app's synth playback of a served head is fine). Only L4 needs a human.
- **SP §3 vs H2 `lastSound`:** coordination stages now close the cold gap. State that the key session plays the cell's cold check *before* any coordination stage of that cell, or a learner still in progress never gets a key-session cold take.
- **§11.1:** the "Just the Way You Are" example artist (Billy Joel) is not on the curated list. This is a consistency nit only.
- **Barry Harris, movable do, Claude-composed music, hands-free, one screen, mature UI:** no violations found. §16's syllable rule and H4's sourcing are clear.
