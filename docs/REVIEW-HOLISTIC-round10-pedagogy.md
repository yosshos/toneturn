# Round 10: independent pedagogy / content review of SPEC-HOLISTIC-2 v11 + SP v6

## (1) Verdict: NOT CLEAN

The spec is broad, the sequencing is sound (learn-a-tune order, band-1 variants, capstones, accompaniment levels, story ladder), and the legal frame is correct on the facts I checked: the 1930 / 1925 US PD dates, §303(b) and unpublished improvisations, the Ain't Misbehavin' / Body and Soul / Star Dust 1B calls, the core 1A list, and the contrafact pairings. Four problems would still make a builder build the wrong thing, or make a learner stall.

## (2) Substantive issues

**S1. Reading and transfer passes count every attempt since the tier started, so a learner who is improving can't pass (§1.6). Major, close to a blocker.**
- **Problem:** the Beta(1,1) test assumes p never changes. Entry offers t+1 items early (§1.3), so a learner normally has early failures at that tier.
- **Example:** with 2 of the first 10 at sight clean, the learner then needs about 18–20 clean in a row to reach P(p ≥ 0.6) ≥ 0.9. At a realistic 85 % success rate it takes 30+ attempts. Each attempt is a new unseen chart, head or lick, at roughly 1–2 a day.
- **Why it matters:** that is weeks to months per tier, against the stated 1–3 weeks. It punishes trying early, which the entry rule encourages. The §9.1 climb test only covers technique rotation, so nothing would catch this.
- **Fix:**
  - use the posterior over recency-discounted counts (for example, a half-life of about 10 attempts, all attempts kept in order, so no windows can be cherry-picked), or reset the counts after a tier re-entry;
  - add a harness test: an improving learner reaches a reading pass and a transfer pass within the per-tier time target, with false passes still < 10 % at p = 0.5.

**S2. For scales and arpeggios, exercise identity doesn't match the content tier (§1.2, §1.7). Major.**
- **Problem:** §1.2 says the content tier of scales and arpeggios is their nps tier, so tempo *is* the tier. But `exerciseId` = spec + option, with no tempo, and each spec or option carries a single `contentTier`.
- **Why it matters:** a builder can't tell whether passing the same scale at a T4 nps target is a new T4 pass or nothing.
  - If it is nothing, the scales area can only rise when a new scale option appears at each tier, and tempo growth never moves rank.
  - If it is a new pass, the `passedAt` record and `exerciseIdOf` must hold the nps rung.
- **Fix:** state that for scale and arpeggio families an exercise = spec + option + nps rung, with one `passedAt` per rung. Add a guard test: one scale passed at 3 tempo tiers counts as 1 exercise per tier, never 3 at one tier.

**S3. Trading 4s is graded by "form position and density" and placed in the line-jazz area (§8.4). Major.**
- **Problem:** density is not a valid measure of improvising quality. The right number of notes in the right bars can be played with no musical sense.
- **Contradiction:** §1.10's area table doesn't list trading 4s, and §8.4 says that inside learn-a-tune "only transfer forms feed level". It is therefore unclear whether a trading pass raises line-jazz rank.
- **Fix:** make trading 4s coverage only (like the story ladder and free improvisation). If it must feed level, grade it on verifiable criteria: entering and leaving on the right bar, a time / SD band, and the share of chord tones on strong beats against the chart. Add it to the §1.10 table either way.

**S4. Voice cold takes have no warm-up guarantee (§1.4, §1.6, §11.2). Major (vocal health and validity).**
- **Problem:** a voice pass needs the cell's first cold take of a later day. Nothing makes the planner or key session play SOVT or other warm-up items before a voice cell's cold check. The SP key-session order puts cold checks first, and `sessionMs` is only a covariate.
- **Why it matters:** a counted voice take could be the first phonation of the day. That is poor vocal pedagogy, it conflicts with the §11.2 health card, and it measures an unwarmed voice rather than the skill.
- **Fix:** voice cold checks are never scheduled before ≥ 2–3 minutes of warm-up (SOVT, or other voice cells) in that session. Coldness per cell already allows this, so no other rule changes.

**S5. Charts have no difficulty card (§8.2, §8.3, §1.6). Major.**
- **Problem:** the card is defined only from melody features (reading features, range, chromatic share). Charted standards and pop charts have no melody served, so they have no card.
- **What depends on it:**
  - the transfer tiers for "chart at sight", k-pop at sight and k-accomp-voice at sight ("a chart … at that tier's difficulty card");
  - tier matching for by-ear goals;
  - section suggestions for the 120+ charted standards.

  None of these can be computed.
- **Fix:** define a chart card from harmonic rhythm, the share of non-diatonic chords, key-centre changes, the set of chord qualities, form length and key distance, mapped to T by quantiles. Add it to the §16 course-change checklist.

## (3) Minor notes

- **§17.1:** Honeysuckle Rose is the wrong example of "composer died by 1955, lyricist later". Andy Razaf died in 1953, so both terms have ended. Tea for Two (Caesar, died 1996) is a correct example. Replace it with another song, for example Ain't Misbehavin' (whose case is the co-composer) or a Gershwin song (Ira died 1983).
- **§1.7 voice:** say that the planner offers a voice item at its tier's required cents band by default. Otherwise learners keep passing at 60 ¢ cells that never count toward rank.
- **§1.10 / §8.4:** voice has no line area, so the "line or harmony area by step" mapping for voice learn-a-tune steps is undefined. Name the voice areas (pitch, time). Also note that a sung new key is weak evidence of transfer, because relative pitch makes it trivial.
- **§8.4 / §8.7 / §13.6:** state that the lick-bank "soloist" plays bank licks as they are, with no generative phrasing or reactive density. Otherwise a builder may drift into the forbidden "AI band".
- **§13.4 / §11.1:** "Latin included" (H7) has no matching rhythm ladder in §13.4 (clave, bossa and montuno comping). Either confirm that the style-focus families cover it, or add it to the flow audit.
- **SP §22:** the header still says "(v9: …)". Cosmetic only; HOLISTIC v11 keeps the section numbers.
