# Round 12 — independent pedagogy / content / legal review (HOLISTIC v12 + §19, SP v6 + §21/§22)

## (1) Verdict: NOT CLEAN (no blockers; 4 majors, each a small fix)

Legal facts I checked against STANDARDS_LEGAL and general references are correct. Death years: Cannon 1912, Cox 1925, Leo Wood 1929, Hickman 1930, Jolson/DeSylva 1950, Egan 1952, Ahlert 1953, J. P. Johnson Nov 1955, Morton 1941, Hanley 1942, Donaldson 1947, Nazareth 1934, Gonzaga 1935, Pixinguinha 1973 (so 2044), Handy 1958, Razaf 1973, Brooks 1970, Caesar 1996, Pinkard 1962, Baby Dodds 1959. The US rules are right: 1930 compositions became PD on 2026-01-01, 1925 recordings are PD under the MMA, and §303(b) improvisations need the improviser dead by 1955. The term classes are right too: Spain life+80 for authors who died before 1987, Mexico life+100, Côte d'Ivoire life+99, Guatemala/Honduras/Samoa life+75. So are the contrafact pairings, including the Scrapple bridge being I Got Rhythm. Every core and beginner head is 1A under the all-authors rule in §19. Outside the US, 4 of the 5 contrafact PD sides are 1B (WITTCL, Honeysuckle Rose, Sweet Georgia Brown, I Got Rhythm). That is handled correctly by the gate and is not an error. I found no Harris claims, no movable do, no locks and no Claude-composed backing.

## (2) Substantive issues

**M1. §1.2 vs §1.10 / §13.2: Groove Match is a game, yet it is mapped to a level area.**
- Problem: §1.2 says games never set a level ("excluded from Phase A level evidence"). The §1.10 table maps Groove Match to "drums grooves", and §13.2 repeats it.
- Why it matters: the builder has to pick one of two opposite rules, and the guard tests will contradict each other.
- Fix: Groove Match → need/coverage only. Or turn it into a non-game drum item, with imitation of a played groove counted as memorised (non-transfer) material.
- Severity: major.

**M2. §13.5 / §8.1: head-based sight-singing can be passed from memory.**
- Problem: head slices route to `repertoire-memory` only for dictation and "tunes you know". Sight-singing drawn from served heads is not routed, so it feeds the Ear skills. "Unlearned in the app" is not the same as "unknown to the learner". When the Saints, the spirituals, Bill Bailey and Ain't We Got Fun are widely known by ear, and a transposed random slice is still recognisable.
- Why it matters: this breaks the "no memorizable items" rule and inflates Ear evidence.
- Fix: route head-based sight-singing to `repertoire-memory` (generated items stay the measured core). Or tag well-known heads `familiar` and exclude them from Ear-evidence sight-singing, under the same 20 % cap as dictation.
- Severity: major.

**M3. §8.4 step 6 (bass): "melody + roots / walking" is not physically playable as written.**
- Problem: a bassist cannot play the head and a root or walking line at the same time. A builder could grade a simultaneous two-part take that no one can play.
- Fix: the bassist walks or plays roots while the app plays the melody, or while singing the melody (a standard jazz-bass exercise; graded octave-equivalent like step 2). Grade only the bass line against the chart.
- Severity: major.

**M4. §1.2 reading complexity: the features miss the main drivers of sight-reading difficulty.**
- Problem: the features are subdivision, accidentals, ledger lines, density and key distance. They leave out syncopation (ties across beats, off-beat onsets, rests), interval size and leap share, and texture (number of voices, two staves or hands, chords). For a jazz-first app, syncopation is the defining reading difficulty, and the jazz reading ladder in §13.3 sits in this area. Head difficulty cards reuse these features (§8.2).
- Why it matters: syncopated or leap-heavy items get tiered too low, so reading tiers and head cards are mis-tiered from day one. "Fit the weights later" cannot recover features that were never there.
- Fix: add a syncopation index, mean absolute interval or leap share, and a texture count. Normalise them like the others.
- Severity: major.

## (3) Minor notes

- **§13.5 + §19, "tunes you know":** the spec says "any key accepted, graded by intervals, after a tonic reference" and also grades "its starting degree". The starting degree can only be graded relative to the given tonic. State that the degree is graded relative to the reference, while the key of the sung phrase is free.
- **§1.10 + §19, "an unseen head" as a transfer form:** this can never occur inside learn-a-tune, because steps 1–2 expose the melody first. Say that it means a head presented at sight outside the protocol (reading or level test), so builders don't hunt for it in steps 3–6.
- **§8.7 order:** level 5 (transpose ±2 at sight) is easier than level 4 (follow human rubato), and level 4 is often unavailable ("teacher or recording needed"). Put transposition before rubato.
- **§8.7 grading:** "comp velocity below the melody" needs a MIDI-only note like the one on comp dynamics. `g-accomp-voice` on a mic cannot be graded on velocity.
- **§8.4 step 6 (guitar):** "melody + shells" is chord-melody, which is demanding at band 2. Consider melody-then-shells alternating at band 2 and simultaneous playing at band 3.
- **§8.4 step 2:** state the singing tolerance for instrumentalists (lenient, per the singing-timing-first rule), so non-singers are not stalled at step 2.
- **§8.5:** tune of the week for voice should pick the transposition from voiceRange, not force the key of the week.
- **AP §3 named guitar tone as a gap:** pick attack, vibrato quality and dynamics on guitar have no item. Teacher rubrics cover tone generically; one sentence assigning it to the §12.1 rubrics would close it explicitly.
- **§11.2:** the 30 ¢ T5+ band should state that it is measured on the steady-state mean pitch per note, with vibrato averaged out. Otherwise trained singers with normal vibrato fail.
- **§10.1:** the Oliver example could also name Armstrong (died 1971), the most consequential improviser on those sides.
