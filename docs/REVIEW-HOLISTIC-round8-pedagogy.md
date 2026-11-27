# Round 8: independent pedagogy / content review of SPEC-HOLISTIC-2 v9 + SPEC-SPIRAL-PRACTICE v6

## (1) Verdict: NOT CLEAN

There are no blockers for step 1. There are five major issues, and two of them sit in the core rank and entry rules.

## (2) Substantive issues

**M1. "Transfer forms feed level" cannot meet the pass rule (§1.6, §1.7, §1.10, §8.4, §8.7, §11.1). Major.**
- *Problem:* Learn-a-tune, k-accomp-voice and k-pop feed level only through transfer forms: a new key at sight, a chart at sight, an unseen head. But rank counts only `passedAt` passes. A pass needs 3 clean takes on 2 or more days, one of them cold on a later day. A take "at sight" happens once by definition, and the second take is no longer at sight. So these families can never produce a pass, and their level mapping can't be built. Builders would either drop them silently or weaken "at sight".
- *Fix:* Give transfer forms a reading-style tier pass. Example: a tier passes after 3 *distinct* unseen charts, keys or heads at that tier's difficulty card, clean on 2 or more days. Store it beside `cellPass`, and count each of them as one exercise toward rank.

**M2. Legal: modal and Coltrane forms (§8.4). Major.**
- *Problem:* §8.4 says "Non-US regions: rhythm changes, modal and Coltrane forms are learned only through the by-ear variant there." That implies US users get served melodies for modal and Coltrane forms. Those tunes (So What, Impressions, Giant Steps…) are protected in the US too. H7 says protected melodies are never served anywhere.
- *Fix:* Change it to "Rhythm changes: melody (I Got Rhythm, 1B) in the US only, by-ear elsewhere. Modal and Coltrane forms: by-ear variant everywhere."

**M3. Rank's "at that tier" is ambiguous (§0 H8, §1.7). Major.**
- *Problem:* "The highest tier with ≥ 3 distinct exercises passed" doesn't say whether passes *above* a tier count toward it. The entry rule (+1) and the rotation spread passes across neighbouring tiers. So a learner with 2 passes at T4, 2 at T5 and 1 at T6 gets rank T3 under a strict "at" reading. That contradicts "hardest items beaten" (promotion-not-full-bars). The rank guard tests and the "2 of 3" bar depend on the reading chosen.
- *Fix:* State it as "≥ 3 distinct exercises passed at tier ≥ t, in ≥ 2 keys". Add a guard test for scattered passes.

**M4. Two sources for the entry rule (§1.3 vs §1.7). Major.**
- *Problem:* §1.3 sets entry as `max(placedTier, rank) + 1`. §1.7 says the current-form posterior drives "adaptivity: entry, need, spacing". After a slump these give different pools, and SP §22 doesn't say which one wins.
- *Fix:* Pick one rule. Suggested: entry stays rank/placed-based (it never shrinks, which fits no locks). Current form changes only need weights and the tempo choice.

**M5. The curriculum-flow audit covers too little (§13.1). Major (project rule).**
- *Problem:* The curriculum-flow rule (memory) requires auditing ALL courses at ALL levels, and only Ear beginners is done. §13.1 audits only the 5 "bin" families. The upper Ear levels, voice, drums, bass, the rest of guitar and the new HOLISTIC families (learn-a-tune bands, k-pop to 15 levels, the k-accomp-voice ladder, the post-bop and free-improv levels) have no flow audit scheduled. New ladders added without that audit risk the same topic hopping AP §4 found.
- *Fix:* In §18, add a per-course flow audit (gaps, topic hopping, several success items per stage) as a gate for each new or changed ladder in steps 5, 7 and 8.

## (3) Minor notes

- **Reading pass store.** §1.7 says reading counts `cellPass` passes, but §1.6 and §1.15 define `cellPass` for voice and rhythm only. Add reading to it, or define where reading tier passes are stored, and what counts as one reading "exercise" for the ≥ 3 rule.
- **Goal projection (§6.1).** The projection uses the tempo gain rate G. Since H8, a "target tier" goal moves by passed exercises, so the projection should use the pass rate (passes per practice hour).
- **Rudiments (§1.2).** The content tier for drum rudiments is not stated. They are presumably tempo-based like scales; say so.
- **Swing band at slow tempos (SP §16.9).** It slides only at the fast end. Ballad and medium-slow lines (♩ < 100) are often wider than 0.68, and AP cites Friberg & Sundström on this. Widen the accept band upward below about ♩ 110. This is a tolerance only and keeps D9's target.
- **Trading and graded improvisation.** Trading 4s is specced only for drums (§8.4). Add trading inside the form for keys, guitar, bass and voice: it's central to jazz pedagogy and measurable by form position and density. Also, all improvisation except the improv-prep cards is coverage only. That's defensible until §9.4, but say explicitly that the line-jazz area carries improv-prep (SP A13 angle → area).
- **Goal tunes (§6.1).** "A served 1A head" leaves out 1B heads for US learners. Say "a head from the learner's region pool".
- **Embeds (§8.4 step 1, §8.6).** The 5 practice tunes and many 1A heads have no official-channel recording. State the fallback: the app's clean version only.
- **Scrapple from the Apple ↔ Honeysuckle Rose (§8.4).** Only the A sections match; the bridge is I Got Rhythm. Note this on the contrafact card.
- **Looks for current form (§1.7).** 2–4 confirmation slots per session across all areas means a re-promotion at P ≥ 0.95 takes weeks in a secondary area. That's acceptable, but the §9.1 report should show it.

## Checked, no issue found

- **Legal and recordings:** the 1A list against STANDARDS_LEGAL; the §303(b) recording test (US PD for 1925 releases, improvisers dying by 1955); the long-term country classes; the contrafact gate on the PD side.
- **Project rules:** no movable do (§16, SP item 17); Barry Harris content limited to verified material; no Claude-composed music (generated contours and readings count as stimuli, the soloist comes from rule-generated licks, model curves come only from humans); no locks; the hands-free exception confined to §7.
- **Pedagogy:** the learn-a-tune order (listen → sing → play → roots → guide tones → shells → memory → keys → solo) is sound, and the AP top-15 is fully covered.
