# Round 5: independent pedagogy / legal review of SPEC-HOLISTIC-2 v6 + SPEC-SPIRAL-PRACTICE v6

## (1) Verdict: NOT CLEAN

There are no blockers for steps 1–4 (level semantics, quick fixes, rotation, retention); those can start now. There are four major issues in the content part, all in step 5 or later, and they must be fixed in the spec before step 5 starts. Coverage of the audit's top 15 is otherwise complete, and the sequencing is sound.

## (2) Substantive issues

**M1. Recordings and §303(b): Armstrong's solos are not PD (§10.1 canon, §8.1/H2/H3, §19.10 source flags). Major, a legal error.**
- **Problem:** the spec treats "US-PD recording" as meaning release ≤ 1925, and on that basis plans to ship the Hot Five (Nov 1925) and King Oliver 1923 sides.
- **Why it's wrong:** under 17 USC §303(b), selling a 78 before 1978 did not publish the musical work on it. An improvised solo, or a tune that was only recorded and never printed or registered, is therefore an *unpublished* work, protected for life + 70.
  - Armstrong died in 1971, so his solos are protected through 2041. He plays the 2nd-cornet breaks on the 1923 Oliver sides too, and Lil Hardin (also died 1971) is on both sets of sides.
  - The repo's own docs/research/PD-JAZZ-SOURCES.md §3 works this exact example ("the 1925 recording is PD, but the notes of the solo are probably not"), and the us-copyright-law memory warns about it.
- **Knock-on effect:** §19.10's sharing gate keys on "protected recording". A transcription of a PD-flagged Armstrong side would pass the gate and could reach the community.
- **Fix:**
  - `servable(recording)` requires all three of: (a) the recording was released ≤ 1925; (b) every composition on it was published or registered ≤ 1930, with its tier; (c) every featured improviser died ≤ 1955 (the unpublished-work term), and in long-term countries `pdFrom` uses the improviser's death year.
  - Phrase source flags follow the same test.
  - Replace the Armstrong and Oliver-with-Armstrong entries with clean sides, e.g. Morton solo piano 1923–24, or James P. Johnson once he is checked (he died 1955, so his term ended in 2025).

**M2. The app-written heads are used as filler without owner approval (§8.2 "H4 filler"; compare §0 H4, §8.1, and the no-claude-composed-music memory). Major, a project-rule conflict.**
- **Problem:** §8.2 lists "the app-written heads" (the 5 `original` heads in heads.ts: Corner Bench, Long Way Round, Back Porch Blues, Night Ferry, Quiet Hours) as region-safe filler. H4 does not approve them.
  - H4 and the owner clarification of 2026-11-27 approve only the songbook's **7** originals, the voice-course practice melodies, and rule-generated licks.
  - §8.1's own pool list leaves the heads out, so the spec contradicts itself.
- **Why it matters:** in denied regions these would become the learn-a-tune, tune-of-the-week, capstone and goal-tune material. That puts Claude-composed jazz tunes in the role of the model music, which is exactly what the owner rejected.
- **Fix:** strike "app-written heads" from §8.2, or put an explicit question to the owner. Until he answers, the region-safe pool is the 1A heads, the songbook (including its 7 originals), the voice practice melodies and the rule-generated licks.

**M3. The improvisation story ladder has no grading proxy (§10.3, §13.6 melodic drum soloing). Major, unbuildable as written.**
- **Problem:** the spec says "the analysis exists (`improvPhrasing`)", but `improvPhrasing` / `phraseOrg.ts` returns only coarse bands (monotonous / organized / varied / random) and a play-rest check.
  - It has no detector for paraphrase, motif identity, sequence, displacement or answer.
  - Drum "motif matching on pad and rhythm" doesn't exist either.
- **Why it matters:** these are 6 of the ladder's rungs, plus the drum soloing family. A builder would invent the metrics, or ship the bands as feedback, which would be invalid.
- **Fix:** define the detectors in the spec. For example:
  - motif = a recurring interval + IOI n-gram (≥ 3 notes);
  - sequence = the same interval pattern transposed;
  - displacement = the same pattern at a different beat offset;
  - answer = a contour-inverted or rhythm-matched reply after a rest;
  - paraphrase = structural head notes hit (DTW alignment) within a rhythmic-deviation band.

  All of these stay descriptive, not pass/fail, until teacher agreement (§9.4), as the arc already is.

**M4. Teacher-to-student sharing is the wrong way round (§19.10 user-made content; §12.2, §12.3). Major, a contradiction with a pedagogical cost.**
- **Problem:** content carrying a protected melody "goes only to the learner's own teacher" (student → teacher is allowed). But teacher content that carries a melody goes through `servable()`, so the teacher's demo of Autumn Leaves to their own student is denied.
- **Why it matters:** "teacher as the model" (§12.2) on standards is the most common studio use, and SPEC-TEACHER-CLASS is studio-first. The two rules are also asymmetric for no stated reason.
- **Fix:** private 1:1 studio exchange is allowed both ways (user content, private, not distributed). Only community, challenge, gift and class-wide distribution goes through `servable()`. Add this to the §17.1 lawyer list rather than blocking it silently.

## (3) Minor notes

1. **The promotion test effectively demands p ≈ 0.85–0.9, not p\* = 0.7 (§19.1).**
   - With Beta(1,1), a 20-take window and a 95 % credibility bar, promotion needs 18/20 clean once the window is full (17/20 gives 0.91). A learner at true p = 0.75 promotes mainly through early runs (8/8 = 0.96).
   - With at most one confirmation per day, even a perfect learner needs ≥ 8 practice days per tier.
   - The harness's operating-characteristic report will show this. Either restate the level as "≈ 0.85 cold" or loosen the knobs. Given key-session-must-develop, put the days-per-tier figure in front of the owner.
2. **The SP pointer edits are not done.** SP v6 has no reference to HOLISTIC, `established`, `paceTier` or `lastSound`. SP §3's `max(0.9 × best, 0.95 × target)`, §14/§15.5's "acquired" and §4.1's `lastQual` gap still read as binding. Make the edits before step 1 starts, not during it.
3. **§19.10's area mapping is incomplete.** It doesn't map voice registration, text and diction (hint-only → coverage?), the story ladder, the listening lab and Ear capstones (do they write Ear course skills? §1.14 must say), the jazz reading ladder, or Groove Match. Everything-connects needs each of these.
4. **§17.1 has a fact error:** Ain't Misbehavin' has a co-*composer*, Harry Brooks (died 1981). It is plainly 1B, not a "lyricist died later" case.
5. **§16's syllable rule omits fixed do,** which the ear-intelligence decision allows. In the Romance-language locales, note names *are* fixed do. State that "letters" means localized note names, fixed do included.
6. **§8.4 is unclear in two places:**
   - "One protocol … (band 2+)" sits beside a band-1 table.
   - The voice variants of steps 3–5 (play the melody, roots, guide tones) are undefined beyond step 6.
   - Also state octave-equivalent pitch grading when instrumentalists sing (step 2).
7. **§14 expression grading has gaps:**
   - Romantic rubato has no stated proxy. Articulation and dynamics don't cover it; it needs human model curves, so label it "teacher or recording needed".
   - "Terraced dynamics" as a graded Baroque target teaches a contested cliché. Keep it as a brief, not graded.
8. **Owner workload in §8.6:** Ear capstones need an annotated embed per Ear unit, which is a large annotation load. Scope them to path themes first, as §10.1 already does.
9. **Duplicate in §8.2:** Indiana is listed both as core 1A and as a US-PD candidate.
10. **Legal coverage otherwise looks right:**
    - The 1A beginner and core list checks out under life + 70 (all composers and lyricists died ≤ 1955, published ≤ 1930).
    - The term classes, including Spain's life + 80 for Johnson, are handled.
    - Also correct: lyrics limited to the ≤ 1930 print, the official-channel embed rules (nocookie, ≥ 200×200, no extraction), and the chords-only bebop side of the contrafact pairs.
