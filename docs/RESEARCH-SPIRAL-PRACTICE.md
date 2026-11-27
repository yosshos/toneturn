# Spiral vs. blocked technique practice: evidence and a recommendation for the key session

Prepared 2026-11-27. Evidence marks: **[V]** I read the abstract, or a reliable abstract record, in this session. **[B]** I confirmed the citation, but the findings come from secondary descriptions. **[U]** From memory, not checked in this session. Treat [U] as a lead to check, not a fact.

## Executive summary

- **The evidence supports moving to interleaving, but the effect is moderate, not dramatic.** Interleaved (random) practice gives worse performance during practice and better retention. The music studies show this: piano melodies [V], beginner clarinet [B] and advanced clarinet [V]. But the samples are small (n = 10–41), and an applied-sport meta-analysis calls the effect small and non-significant [B]. Expect a modest gain in retention and a clear gain in interest. Do not expect a big jump in speed.
- **During practice, blocked practice makes progress look better than it is, to the student and to our metrics.** Pianists wrongly predicted that fixed-order practice would help them more (Abushanab & Bishara 2013) [V]. An app that measures in-session peak tempo will reward blocked practice. Move promotion to *cold* evidence: the first take of an item in a session, or the next day.
- **Blocked practice is still right at first exposure.** That means a new pattern, a new hand configuration, and beginners in general. Contextual interference (CI) helps less when the learner is new or the task is complex (Wulf & Shea 2002 [B]; Guadagnoli & Lee 2004 challenge-point framework [V]). Keep the stage ladder for the *first* contact. Interleave once the notes and fingering are stable.
- **Switch in mini-blocks of 2–4 takes, not every take.** A switch costs time in our app: the brief, the count-in, and re-finding the tempo. Pure per-take randomisation would break the tempo ladder. "Interleaved mini-blocks" give most of the CI benefit and keep the ladder intact.
- **Spacing has stronger evidence than in-session interleaving.** Gaps of a day between sessions, with sleep, and early short rests help motor-sequence retention on a keyboard (Simmons 2011/12 [B], Cash 2009 [B]). Cepeda et al. 2006 is the general spacing review [V]. The app's per-key resume across days already spaces practice. Make it deliberate: an item should come back in 1–3 days.
- **Varying a pattern (rhythms, intervals between the hands, keys) is reasonable under schema theory, but the direct music evidence is thin.** The one piano study of variable practice found only partial support (Bangert et al. 2014) [V]. Present the forms as *coordination and range challenges*. Do not present them as proven speed-builders.
- **The current key session is already a hybrid.** Within each rung it is blocked: stages A-1…A-7 in order. Across rungs it is interleaved at block level: scale → harmonised rung → one rotating block → a closing return to the scale. The old family coach (`coach.ts`) is the most blocked part. It interleaves only through a weak-item review every 5 takes, and it requires 2 keys before promotion. The proposal below moves the stable stages into a rotation and leaves the first-exposure stages blocked.

## 1. How the current design maps onto blocked vs. interleaved

- **`SPEC-KEY-SESSION-2` §2 is a blocked part-to-whole ladder inside one rung.** The order is RH → LH → hands together → 2 octaves → contrary → speed → 3–4 octaves. Its rule "coordination and range before speed" is sound for first exposure. But each stage is repeated until it passes, which is blocked practice.
- **§5 (one session) interleaves at the block level.** The session runs the scale, then a B rung (3rds, triads, 7ths), then a rotating C/D/E block (licks, fingers, cadences). It closes with a return to A-6. The closing return is a genuine spaced, interleaved revisit, and the spec labels it so. It is a weak one: one return, at the end, and only for the scale.
- **`coach.ts` (teacher assignments and the daily plan) is mostly blocked.** It walks one family's levels in order, key by key. `REVIEW_EVERY = 5` inserts a weak item every 5 takes, which is a small amount of interleaving. `KEYS_TO_PROMOTE = 2` requires a clean step in 2 keys, which is a form of variable practice.
- **`SCALE_FORMS` (`src/engine/itemAssign.ts`) holds contrary motion, rhythm variations and 3rd/6th/10th apart.** These are queued *after* the timed scale's target is reached, at most two tiers up. That is sequential, the opposite of spiral.

## 2. The evidence

### 2.1 Contextual interference in general

- **Shea & Morgan (1979)** [V]. In a laboratory arm-movement task, random practice was worse during acquisition and better at retention and transfer than blocked practice. The advantage was largest on the most complex transfer task. This is the founding motor demonstration.
- **Magill & Hall (1990)** [B]. This is the standard review. Its well-known conclusion is that CI is most reliable when the tasks use different motor programs, and weaker when they vary only in parameters such as speed or size [U as to exact wording]. This matters here. Scale vs. arpeggio vs. lick are plausibly different programs. The same scale at another tempo is mostly a parameter change.
- **Brady (2004) meta-analysis** [B]. This covers 61 studies and uses delayed tests only. Secondary sources report a medium effect in laboratory studies (d ≈ 0.57) and a negligible one in applied settings.
- **Recent meta-analyses disagree.**
  - Czyż et al. (2024, *Frontiers*) [V] found a medium CI effect on transfer (SMD 0.55), significant in adults.
  - Ammar et al. (2023, *Educational Research Review*) [B] call the CI benefit in sport practice a "myth": small, non-significant pooled effects.
  - Each side has published critiques of the other. The honest summary: there is a real but modest effect, and it is less reliable outside the laboratory.
- **Wulf & Shea (2002)** [B]. Principles taken from simple laboratory tasks often do not carry over to complex skills. For CI, random practice helps most when the task's memory and attention load is low, or when the learner is experienced. It can hurt novices on complex tasks.
- **Guadagnoli & Lee (2004), the challenge point** [V]. The best amount of difficulty depends on skill level × task difficulty. More difficulty lowers practice performance but can raise learning, up to a point. This is the theoretical basis for *increasing* CI as skill grows. Porter & Magill (2010) tested an increasing-CI schedule directly [U].
- **Bjork's "desirable difficulties"** [B/U]. Interleaving, spacing and variation slow acquisition and improve long-term learning. Performance during practice is a poor sign of learning. See Soderstrom & Bjork (2015) [B] for the learning-vs-performance review.

### 2.2 Music and keyboard studies specifically

| Study | Who / task | Result | Mark |
|---|---|---|---|
| Abushanab & Bishara 2013, *Memory & Cognition* | 25 piano-trained adults, short melodies, within-subjects, fixed vs. random order, retest after 2 days | Fixed order faster in practice; random order faster at retention. Participants wrongly predicted fixed would be better ("illusion of competence"). | V |
| Stambaugh 2011, *JRME* 58:368–383 | Beginning clarinetists (N ≈ 41), three 7-note exercises | No difference immediately after practice; random faster at retention, and blocked lost speed. No transfer difference. | B |
| Stambaugh, later study | University wind players | CI effect for woodwinds, not for brass (secondary report) | B |
| Carter & Grahn 2016, *Frontiers in Psychology* | 10 advanced clarinetists, concerto + technical excerpts, blocked vs. interleaved, test next day | Interleaved rated better, inconsistently across raters. Players said interleaving helped focus, goal-setting and spotting mistakes. | V |
| Wong (Western U. thesis) | 21 proficient pianists | Interleaved slightly better, not significant | B |
| Bangert, Wiedemann & Jabusch 2014, *Frontiers in Human Neuroscience* | 36 piano-minor students, fast LH leap of a 10th; variable vs. fixed vs. spaced | Error rates did not differ; only partial support for variable practice | V |
| Simmons 2011/2012, *JRME* 59(4):357–368 | 29 musicians (non-pianists), 9-note keyboard sequence, gaps of 5 min / 6 h / 24 h between sessions | Distributed practice and sleep-based consolidation helped. Exact statistics not seen. | B |
| Cash 2009, *JRME* | 36 non-musicians, 5-element keyboard sequence | An early 5-minute rest gave continued in-session gains and the largest overnight gain | B |
| Duke, Simmons & Cash 2009, *JRME* 56(4):310–321 | 17 advanced piano majors, a Shostakovich excerpt to target tempo | How much they practised did not predict retention. *How* they practised did: the best players addressed errors right away, stopped before an error, and varied tempo deliberately (secondary descriptions). | B |

**What this does *not* show:**
- No controlled study I found tests interleaving *scale/arpeggio technique within one key*.
- No study tests whether a "key from all angles" session beats a "scale until target" session for tempo gains.
- All the music effects are on short melodies or excerpts, with small samples.

The inference to our design is reasonable, but it is an extrapolation.

### 2.3 Spacing

- **Cepeda et al. 2006, *Psychological Bulletin*** [V]. The best gap between sessions grows with how long the material must be retained. The data are verbal-recall studies. Do not quote a fixed "10–20 % rule": I could not confirm the ratio in Cepeda et al. 2008.
- **Keyboard-specific work points the same way** (Simmons, Cash) [B]. Sleep consolidation of finger-sequence skill is widely reported (Walker et al. 2002) [U].
- **Practical reading:** a day's gap, with sleep, is valuable. Several short returns are better than one long massed block.

## 3. Variable practice and schema theory

- **Schmidt (1975)** [B/U]. A generalised motor program is learned as an invariant structure (order, relative timing) plus parameters (speed, force, size). Varying the parameters builds a recall "schema" that generalises to new parameter values.
- **What this predicts for scales:**
  - Varying tempo, octave range, dynamics and articulation trains *parameters* of the same program. This is good for flexible control.
  - Rhythmic variants (dotted, groups of 3 or 4) and hand offsets (10ths, contrary motion) change relative timing or coordination. They are closer to *new programs*, and that is where CI should matter most (Magill & Hall).
  - Different keys change the fingering map, which also makes them close to new programs.
- **Caveat:** the variability-of-practice hypothesis holds best for children and is inconsistent in adults [U]. The one piano test (Bangert 2014) gave partial support at best [V].
- **The claim we can defend:** a pattern played in many forms is more robust and transfers better to real music. The claim we cannot defend: that rhythm variants make a scale faster. That is a teacher belief (Cortot). It is not shown by research.

## 4. What established pedagogy does (documented vs. folk)

- **Exam syllabi (ABRSM, Trinity, LCM)** [B for the categories, U for exact grade placement]. They spiral across *grades*. Each grade adds keys, octaves and forms:
  - parallel motion;
  - contrary motion (early grades);
  - hands a 3rd and a 6th apart (higher grades; ABRSM: in sixths, the tonic is the upper note);
  - legato and staccato scales in 3rds, then 6ths (Grades 7–8 / diploma);
  - chromatic scales in contrary motion, a minor 3rd apart, and in double minor 3rds.

  The current ABRSM grade-by-grade tables were not accessible. Check them against the official *Scales & Arpeggios* books before citing a grade.
- **Within a grade, syllabi do not prescribe practice order.** Exam preparation is typically blocked by key [folk].
- **Cortot, *Rational Principles of Pianoforte Technique* (1928)** [U, well known]:
  - rhythmic and accent variants;
  - exercises transposed through all keys;
  - "preparatory" isolation of the hardest motion (e.g., the thumb passing under).

  This is systematic *variation* of one pattern, close to variable practice.
- **Hanon (1873)** [U]. Repetition of a single fixed pattern, with scales and arpeggios in all keys in Part III. Practising all the exercises in all keys is a later teaching practice, not in the original instructions [U].
- **Barry Harris** [B, secondary; the repo has `docs/BARRY-HARRIS-THEORY.md`]. Scales are practised *descending from chord tones* with half-step rules, so chord tones land on the beat. They are then played in thirds, triads and 7th arpeggios built on the scale, and with chromatic pickups. That is literally "one key from several angles", and it feeds improvisation directly. Do not invent other Harris "methods" (see the repo rule on verified theory only).
- **Jazz pedagogy: "all 12 keys", "key of the week", "practise a key from all angles"** [folk]. This is widespread teacher lore: scale, arpeggios, ii–V–I voicings and a lick in one key in one sitting. No controlled studies. It is consistent with CI and spacing, so it is reasonable, but it remains lore.
- **Bruner's spiral curriculum (*The Process of Education*, 1960)** [U, well known]. It is about revisiting *concepts* at increasing depth across months or years. It is not a motor-learning finding. It justifies the *path* design (returning to a key with harder forms over weeks). It does not by itself justify switching every few minutes. Those are different time scales.

## 5. Catalogue of hands-together configurations

Tiers are rough: **1** early, **2** intermediate, **3** advanced, **4** virtuoso.

| Configuration | Trains | Tier |
|---|---|---|
| Parallel, an octave apart, 1→2→3→4 octaves | Basic coordination, thumb-passing synchrony, range | 1→2 |
| Contrary motion, both thumbs on the tonic | Mirror fingering (easy synchrony), symmetrical reach | 1 |
| Contrary motion from other notes (e.g., a 3rd apart), or chromatic contrary | Asymmetric fingering in contrary motion | 2–3 |
| Hands a 10th apart (RH starts on the 3rd) | Independent thumb crossings, the most idiomatic sound (jazz and classical) | 2 |
| Hands a 3rd apart (close) | Same as 10ths with the hands crowded; hand-crossing traffic | 2–3 |
| Hands a 6th apart (tonic in the upper part) | Different crossing offsets per hand | 2–3 |
| Formula pattern (parallel up, contrary out and in, parallel down in one cycle, in 10ths/3rds/6ths) [U as to the name in syllabi] | Switching modes without stopping | 3 |
| One hand twice as fast (RH 2 octaves, LH 1) | Rate independence, a 1:2 subdivision | 2–3 |
| Polyrhythm: 3 vs 2, then 4 vs 3 (one hand triplets) | Rhythmic independence; the hands no longer meet on every note | 3–4 |
| Canon: one hand a beat or a note behind | Independence while sharing a pattern | 3 |
| Legato in one hand, staccato in the other | Touch independence | 2–3 |
| Opposed dynamics (one cresc., other dim.) or one hand melody-loud | Weight independence, voicing | 2–3 |
| Accent groupings (3s, 4s, 5s, 7s against the beat) | Evenness, metric control, Cortot-style variants | 2 |
| Dotted rhythms (long-short / short-long) | Evenness and control of single notes; traditional speed preparation (folk claim) | 1–2 |
| Swing eighths, off-beat accents, displacement across the bar | Jazz time feel | 2 |
| Scale against a held chord, a walking bass, Alberti bass or LH roots | Accompaniment-and-line independence, harmonic context | 2–3 |
| Harris: descending from each chord tone with half steps, in a bar of eighths | Scale-to-chord alignment, bebop line | 2–3 |
| Scale in thirds, triads or 7ths (one hand, then together) | Already block B | 2–3 |
| Double 3rds / double 6ths in one hand (legato) | Finger independence, a crucial advanced technique | 4 |
| Chromatic scale, hands a minor 3rd / major 3rd / 6th apart; chromatic in double minor 3rds | Chromatic fingering under offset | 3–4 |
| Scales in octaves (both hands) | Wrist and forearm technique | 3–4 |

## 6. Recommendation for the app

### 6.1 Structure of one key session ("spiral within the key")

1. **Retention probe first (cold).**
   - One take of each item due in this key that was played on an earlier day, at 0.9 × its last clean tempo. That is the existing warm-up rule, reframed.
   - This take is the *measure*. Do not coach on it.
2. **First exposure stays blocked.**
   - A new rung, or a new coordination stage (A-1…A-5, B-1…B-5), runs blocked until the *acquisition criterion*: 2 clean takes at a comfortable tempo.
   - Beginners (tier 0–1) stay blocked longer: 3 clean takes, and at most 2 items in rotation.
3. **Then rotate.** Once two or more items in this key are past their criterion, the session becomes a round-robin:
   - **Mini-blocks:** 2–4 takes per visit (default 3), or about 2–3 minutes.
   - **Rotation set:** 3–4 items. For example: scale (speed or the next form) → harmonised rung → arpeggio, or a coordination form from §5 → lick or cadence in the same key.
   - **Return to each item 2–3 times per 30 minutes.** This turns the single closing return into a real spiral.
   - **Order:** never two items of the same kind back to back. Vary the form, not only the item.
4. **Forms join the rotation instead of waiting.** `SCALE_FORMS` should not wait for the timed scale's target. Once A-3 (hands together) passes:
   - one form at a time (contrary, 10ths, a rhythm variant) enters the rotation as an alternate visit of the scale item, at a comfortable tempo;
   - the speed stage continues on its own visits.
5. **End on a success.** The last visit is the item that is closest to its next step.

### 6.2 Tempo ladders and interleaving

- **Keep a per-item "session tempo"** (last clean take this session).
- **Re-entry rule.** When the session returns to an item, the first take is one grid step below its session tempo (≈ 0.94–0.97×). If clean, resume the climb from the session tempo. Expect a short drop after each switch. That drop is the CI effect, not a regression: do not count it as a miss toward "two misses back".
- **Budget the climb, not the visit.** A speed stage gets about 2 climb steps per visit. The ladder advances over the session's visits and keeps the existing step and quality rules, the 10 % cap and the grid.
- **Cross-day resume.** Start from the *cold* probe result, not yesterday's peak. If the cold take is ≥ 0.95 × yesterday's best, set the start at that tempo; otherwise start at the cold tempo.

### 6.3 Spacing across days

- An item touched today should come back in 1–3 days, with expanding intervals once it is stable. That is light SRS on top of the key of the week.
- The key of the week already gives daily returns. Add a short cold probe of *last* week's key (1–2 items) at the start of the session, so retention is measured weeks later as well.

### 6.4 Fair measurement under interleaving

- **Level and promotion evidence = cold takes** (first take of the day, or next-day), plus the end-of-session best as a secondary signal. Peak tempo within the session overstates blocked practice and understates interleaved practice. This is the Abushanab "illusion".
- **Report the drop on switching as normal.** Show the student "cold today vs. cold last week". This also corrects the student's own illusion of competence.
- **Telemetry per take:** item, form, visit index, take index within the visit, time since the last visit, cold flag. Without these, blocked and interleaved sessions cannot be compared.

### 6.5 Risks and trade-offs

- **Switch overhead.** Each switch costs a brief, a count-in and re-orientation (the "brief before task" rule). Too-frequent switching wastes the session, so mini-blocks are needed, not per-take randomisation.
- **Frustration and perceived slowness.** Interleaving *feels* worse (V). The tempo bar will rise more slowly within a session. Tell the student why in one line, and show the cold-to-cold gain.
- **Beginner overload.** Novices on complex coordination may learn less from interleaving (Wulf & Shea; challenge point).
- **Ladder fragmentation.** A target can take more sessions to reach within the day, even if retention is better.
- **Effect size.** The evidence predicts modest retention gains. Engagement may be the larger, and more certain, benefit: Carter & Grahn's players reported better focus.

### 6.6 What to A/B test

- **Design:** within-subject by *key*, as in Abushanab's design. A player's keys are randomly assigned to "current hybrid" or "rotated mini-blocks", counterbalanced across weeks.
- **Primary outcome:** cold tempo at the clean criterion, 1 and 7 days later.
- **Secondary outcomes:**
  - takes needed to reach the target;
  - transfer: the first take of an untrained form or key;
  - session completion and next-day return;
  - a one-tap rating of how boring it was.
- **Second test:** mini-block size, 2 vs. 4 takes.
- **Third test:** when forms enter, after A-3 vs. after the A-6 target.
- **Sample size:** the owner's two calibration accounts are enough to check the mechanics, not to draw conclusions. A real comparison needs dozens of players over several weeks.

## References

- Abushanab, B., & Bishara, A. J. (2013). Memory and metacognition for piano melodies: Illusory advantages of fixed- over random-order practice. *Memory & Cognition, 41*(6), 928–937. [V] https://pubmed.ncbi.nlm.nih.gov/23508339/
- Ammar, A., Trabelsi, K., Boujelbane, M. A., Boukhris, O., Glenn, J. M., Chtourou, H., & Schöllhorn, W. I. (2023). The myth of contextual interference learning benefit in sports practice: A systematic review and meta-analysis. *Educational Research Review, 39*. [B]
- Bangert, M., Wiedemann, A., & Jabusch, H.-C. (2014). Effects of variability of practice in music: A pilot study on fast goal-directed movements in pianists. *Frontiers in Human Neuroscience, 8*, 598. [V] https://doi.org/10.3389/fnhum.2014.00598
- Bjork, E. L., & Bjork, R. A. (2011). Making things hard on yourself, but in a good way: Creating desirable difficulties to enhance learning. In *Psychology and the Real World*. [U]
- Brady, F. (2004). Contextual interference: A meta-analytic study. *Perceptual and Motor Skills, 99*, 116–126. [B]
- Bruner, J. S. (1960). *The Process of Education*. Harvard University Press. [U]
- Carter, C. E., & Grahn, J. A. (2016). Optimizing music learning: Exploring how blocked and interleaved practice schedules affect advanced performance. *Frontiers in Psychology, 7*, 1251. [V] https://doi.org/10.3389/fpsyg.2016.01251
- Cash, C. D. (2009). Effects of early and late rest intervals on performance and overnight consolidation of a keyboard sequence. *Journal of Research in Music Education, 57*(3). doi:10.1177/0022429409343470 [B]
- Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. *Psychological Bulletin, 132*(3), 354–380. [V] https://pubmed.ncbi.nlm.nih.gov/16719566/
- Cortot, A. (1928). *Principes rationnels de la technique pianistique* (*Rational Principles of Pianoforte Technique*). Salabert. [U]
- Czyż, S. H., Wójcik, A. M., Solarská, P., et al. (2024). The effect of contextual interference on transfer in motor learning: A systematic review and meta-analysis. *Frontiers in Psychology, 15*, 1377122. [V]
- Duke, R. A., Simmons, A. L., & Cash, C. D. (2009). It's not how much; it's how: Characteristics of practice behavior and retention of performance skills. *Journal of Research in Music Education, 56*(4), 310–321. doi:10.1177/0022429408328851 [B]
- Guadagnoli, M. A., & Lee, T. D. (2004). Challenge point: A framework for conceptualizing the effects of various practice conditions in motor learning. *Journal of Motor Behavior, 36*(2), 212–224. [V]
- Hanon, C.-L. (1873). *Le pianiste virtuose*. [U]
- Magill, R. A., & Hall, K. G. (1990). A review of the contextual interference effect in motor skill acquisition. *Human Movement Science, 9*, 241–289. [B]
- Porter, J. M., & Magill, R. A. (2010). Systematically increasing contextual interference is beneficial for learning sport skills. *Journal of Sports Sciences, 28*(12), 1277–1285. [U]
- Schmidt, R. A. (1975). A schema theory of discrete motor skill learning. *Psychological Review, 82*(4), 225–260. [U]
- Shea, J. B., & Morgan, R. L. (1979). Contextual interference effects on the acquisition, retention, and transfer of a motor skill. *Journal of Experimental Psychology: Human Learning and Memory, 5*(2), 179–187. [V]
- Simmons, A. L. (2011/2012). Distributed practice and procedural memory consolidation in musicians' skill learning. *Journal of Research in Music Education, 59*(4), 357–368. doi:10.1177/0022429411424798 [B]
- Soderstrom, N. C., & Bjork, R. A. (2015). Learning versus performance: An integrative review. *Perspectives on Psychological Science, 10*(2), 176–199. [B]
- Stambaugh, L. A. (2011). When repetition isn't the best practice strategy: Effects of blocked and random practice schedules. *Journal of Research in Music Education, 58*(4), 368–383. doi:10.1177/0022429410385945 [B]
- Walker, M. P., Brakefield, T., Morgan, A., Hobson, J. A., & Stickgold, R. (2002). Practice with sleep makes perfect: Sleep-dependent motor skill learning. *Neuron, 35*, 205–211. [U]
- Wong, C. A. Optimizing music learning: The effects of contextual interference on [pianists]. Undergraduate honors thesis, Western University. [B] https://ir.lib.uwo.ca/psychd_uht/42
- Wulf, G., & Shea, C. H. (2002). Principles derived from the study of simple skills do not generalize to complex skill learning. *Psychonomic Bulletin & Review, 9*(2), 185–211. [B]
- Galliano, F. Notes on the method of Barry Harris (secondary source). [B] https://irfu.cea.fr/Pisp/frederic.galliano/Zique/barry_harris.html
