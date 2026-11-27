# Round 6: pedagogy, content and legal review of SPEC-HOLISTIC-2 v7 and SPEC-SPIRAL-PRACTICE v6

**Verdict: NOT CLEAN.** There are 5 major issues and no blocker. Coverage of AP #1–#15 is complete, the sequencing is sound, and the §303(b) recording test is right. What remains is one contradiction in the level model, one invalid grading proxy, and three legal gaps that no lawyer question in §17 covers yet.

## Substantive issues

**1. §20.3 vs §1.2: the voice tier (major)**
- **Problem:** §1.2 orders voice lexicographically: item level → cents band → timing band. §20.3 instead adds the cents band to the item level as 0/+1/+2. Under §20.3, a T3 item sung within 30 ¢ equals a T5 item sung within 60 ¢. Two more gaps:
  - It doesn't say which tier's posterior a take feeds. A take within 30 ¢ also passes the 45 ¢ and 60 ¢ bands.
  - There is no clamp at T8.
- **Why it matters:** intonation precision on easy material gets promoted as content level. That breaks the "content first" rule, and the rule can't be built without a choice.
- **Fix:**
  - Define a voice cell as item level × target cents band.
  - A take is one look for its own cell's tier only.
  - Either keep the lexicographic order (cents as a band within the item's T), or state the additive mapping and drop the §1.2 row.
  - Clamp the result to ≤ T8.

**2. §8.8 free improvisation "graded by variety metrics" (major)**
- **Problem:** this is an invalid proxy. Random playing maximises variety. It also contradicts the policy elsewhere: the story ladder, arc and back-phrasing are all descriptive until teacher agreement (§9.4).
- **Fix:**
  - Grade task compliance only (e.g. "only register and dynamics changed", "rhythm only, no pitch").
  - Give descriptive variety feedback.
  - Map it to coverage only (add it to the §19.10/§20.6 mapping).

**3. §8.1 / §19.10: the 1A definition and unknown region (major, legal)**
- **Problem:** §8.1 still defines 1A as "PD worldwide" and says "Unknown region → 1A only". §19.10 redefines 1A as "US + life+70" and denies it only in *known* long-term countries. A user whose region can't be resolved gets heads that are protected under life+80/+100 (e.g. Donaldson, d. 1947 → Mexico 2047, Spain 2027).
- **Fix:**
  - Unknown region → only items PD under the longest term class (life+100), plus the H4 pool.
  - Rewrite the §8.1 definition to match §19.10.
  - Add a life+75 class (Guatemala, Honduras, Samoa) to `pdFrom`.

**4. §19.10 / §20.6: user-shared content has no takedown regime (major, legal)**
- **Problem:** the sharing gate rests on source flags. A phrase played freely into the phrase studio gets no protected flag, so a user can share a protected melody to the community, challenges or gifts.
- **Why it matters:** STANDARDS_LEGAL §3 and §5 already require these, but HOLISTIC never adopts them:
  - user-responsibility terms;
  - a registered DMCA agent;
  - notice-and-takedown and a repeat-infringer policy;
  - EU DSA notice-and-action.

  Without them there is no safe harbour for user-generated content.
- **Fix:**
  - Add these to §20.6 as a precondition for any community, challenge or gift distribution of melody-bearing content.
  - Default the source flag to "unknown → private" when the source isn't declared.
  - Add student ↔ student studio exchange (§12.3 duets, §8.7 duet assignments) explicitly. It falls under neither the 1:1 teacher rule nor "class-wide".

**5. §6.1 / §8.4: goal tunes are limited to served PD heads (major, pedagogy)**
- **Problem:** the adult's real goal tune (AP §4's own example, "Autumn Leaves with a singer") can never be a goal. Learn-a-tune only exists for served heads, yet the by-ear mode (embed + chords-only chart + self or teacher check) is legal for any of the ~120 charted standards.
- **Why it matters:** relevance is the #1 adult motivator (AP §4). The PD pool is Tin Pan Alley from 1917–1930, with no modern standard.
- **Fix:**
  - Allow a goal and a learn-a-tune "by-ear variant" for every charted standard.
  - Melody steps are self- or teacher-checked, never served or graded against a stored melody.
  - Graded steps: roots, guide tones, shells, chords from memory.
  - Completion = chords from memory (cold) + a teacher or self check of the melody.

## Unverified legal point (I did not check the policy text; worth a §17.1 line)
YouTube API Services Developer Policies limit monetising access to YouTube audiovisual content. If the listening lab, learn-a-tune step 1 or the pop library sit behind a subscription, confirm that the embeds stay outside the paywall or are allowed. Add it to §17.1 next to the embed rules.

## Minor notes
- **Stale body text still contradicts §19–§20:**
  - §11.1's Billy Joel example (§19.10 says use a curated artist);
  - §17.1 lists Ain't Misbehavin' as a composer-died-by-1955 case (§20.6: it is 1B);
  - §10.1's canon still lists the Hot Five and King Oliver;
  - §8.2 still has Indiana twice;
  - §1.6/§19.2 still exclude the passing take (§20.1 now includes it).

  Merge these at the next consolidation.
- **King Oliver 1923:** collective improvisation includes Baby Dodds (d. 1959). Apply test (c) to every improvising ensemble member, not only "featured" soloists.
- **§8.4 band 1 table:** it has no voice or guitar variant ("melody + LH roots" is piano-specific). Add the §20.6 sung steps for voice, and bass notes on strings 6/5 + triads for guitar.
- **§8.9 vs §13.6:** "Drum supporting a soloist" is labelled "teacher or recording needed", yet rule-generated licks are allowed as the soloist. Pick one.
- **§10.1 / §11.1 tap grading against embeds:** set tolerance windows that cover IFrame `getCurrentTime` jitter and unknown output latency (Bluetooth). Use beat-level windows for "tap the changes", plus a per-device offset. These never feed level.
- **§11.1 one-screen rule:** pop bar grids beside a ≥ 200×200 player need windowing (4–8 bars, like the score). A 60–100-bar song won't fit.
- **§8.2 period prints:** state how dotted-8th/16th pairs in period prints are rendered and graded under the swing feel (accept both straight-dotted and swung), so "as printed" and the feel layer don't conflict.
- **§19.10/§20.6 area mapping:** it misses §14 PD repertoire and piece-coach pieces (coverage only?). §1.10's per-instrument area table also omits rhythm/time for piano, guitar and bass, though §1.2 and §20.3 define a rhythm tier.
- **§13.6 drum balance:** per-pad velocity ratios depend on the module's per-pad gain. Calibrate per kit or label the feedback as intent, not loudness.
- **AP §2.14** (klezmer / Israeli idioms with PD tunes) is not addressed. That is acceptable given the "global, not Israeli" decision, but say it is deferred.
- **H4's Happy Birthday note:** the ruling was September 2015 (settled in 2016). This doesn't affect the conclusion.
