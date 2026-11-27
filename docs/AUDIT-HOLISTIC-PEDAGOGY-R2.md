# Re-audit: content and pedagogy vs SPEC-HOLISTIC-2 (+ SP v6), 2026-11-27

Sources: AUDIT-HOLISTIC-PEDAGOGY (AP), SPEC-HOLISTIC-2 (§), SPEC-SPIRAL-PRACTICE v6 (SP), `heads.ts`, `docs/research/STANDARDS_LEGAL.md`, memory us-copyright-law. [V] = checked now, [B] = law or literature, not re-checked.

## 1. Coverage

**Top-15 and owner questions**

| AP item | Status | Where | Still needed |
|---|---|---|---|
| #1 US-PD heads | covered, with caveats | H2, §8.1 | Region default, beginner tier, verification load (§2) |
| #2 Learn-a-tune + harmonic map | covered | §8.2 | Drums; cold memory step; ref "§10.1" should be §10.3 |
| #3 Unit capstones | covered | §8.3 | Material for beginner and Ear units; say "skippable" |
| #4 Accompany a singer | covered | §8.4 | Rubato source and grading proxy wrong (§2) |
| #5 Listening lab / transcription | covered | §10.1–2 | Who annotates timelines; no listening canon |
| #6 Pop library, k-pop 15 | covered | §11.1 | Chart policy; rhythm patterns; ACUM |
| #7 Voice registration / text / health | covered | §11.2 | Invalid vowel criterion; belting; diction; mic |
| #8 Story ladder | covered | §10.3 | Fixed arc bar; detector validity |
| #9 How to practise | covered | §11.3, §7 | §11.3 tap contradicts §15 "§7 only exception" |
| #10 120 charts + contrafacts | covered | §8.2 | Who transcribes/verifies; add PD-head pairs Scrapple ↔ Honeysuckle Rose, Dig ↔ Sweet Georgia Brown |
| #11 Composition + arranging | covered | §11.4 | One screen; grading criteria |
| #12 Teacher rubrics / model | covered | §12 | Lesson-plan templates missing |
| #13 PD repertoire | covered | §14 | Jazz-bridge links (Joplin→stride, Debussy/Satie→planing) unstated |
| #14 Expression + swing by tempo | partial | §14; SP §16.9 (key-session lines only) | Swing band app-wide; human model source |
| #15 Flow audit + de-cloning | covered | §13, §8.5 | Drums absent from §8.5 |
| Q1 Legal frame | answered | H2 | Region default (§2) |
| Q2 Own melodies vs no-Claude-music | **open** | H4 assumption | Owner answer; where rule-generated drill melodies sit |
| Q3 YouTube embeds | answered | H3 | Official channels only |

**Other AP findings**

| Status | Findings |
|---|---|
| Covered | Ear on real recordings; guitar (Freddie Green, singer, capo/DADGAD, Sor/Carcassi); bass (lines by ear, Bach/Simandl, duo); singer leads band; tune gate; goal tune; plateau → model; contour feedback |
| Partial | Ballad performance capstone (contour only); performance-take ritual (named in §8.3, no announce / one take / listen back / self-rate); repertoire spiral (§8.2 is one pass; add revisits via §4.3 piece FSRS) |
| **Missing** | Ear: line-implication ear, "tunes you know" bank, dictation of real heads, ballad harmonic rhythm · Voice: diction/consonant timing, mic technique · **Drums: all four items** (balance, supporting a soloist, melodic soloing, tuning brief) · **Games: all three** (Contour Draw for the open beginner gap, voice/drum games, first-phrase recall) · Reading: swing-8ths/kicks ladder, gig sight-read capstone, transposing instruments · Rhythm: deliberate behind/ahead placement for keys/guitar (not in SP §16) · Free improvisation · post-bop tune levels · ensemble-roles unit · responsive comping · Israeli idioms (deferred, acceptable) |

## 2. Critical review of the new sections

| § | Issue | Fix |
|---|---|---|
| H2/§8.1 | "Unknown region → US" inverts the repo's own legal research. STANDARDS_LEGAL recommends a US **allow-list** for Tier 1B until a lawyer rules on the rule of the shorter term [V]. Most listed heads are 1B: their authors died after 1955 (Gershwin, Porter, Berlin, Carmichael, Waller/Razaf, Green, Caesar). In Israel/EU they may be protected into the 2050s, or freed by the shorter-term rule (EU Art. 7; not Germany, 1892 treaty) [B] | Unknown → **deny** for 1B; `tier` + `pdWorldwideFrom` per head. The 4 Tier-1A heads already in heads.ts serve everywhere. Add a verify/preview mode, since the owner (in Israel) must see what he checks. Lawyer question before charging |
| §8.1 | Later layers on "old" songs (Basin Street verse lyrics about 1931; Body and Soul first published in London) [B] | Serve only the ≤1930 print's content; record print year and publisher |
| §8.1 | The list is intermediate–advanced; beginners and capstones get no real tunes | Beginner tier (to check): Memphis / St. Louis / Royal Garden Blues, Saints, Bill Bailey, Ain't She Sweet, Five Foot Two, Dinah, Sweet Sue, Bye Bye Blackbird, Blue Skies, Muskrat Ramble, Mood Indigo |
| §8.1 | Period prints are straight vocal lines; jazz changes and some melody notes differ | Per head: "as printed" melody + jazz chart + reconciliation note; swing via §14 |
| §8.1 | Some period lyrics are offensive today (dialect, minstrel-era verses) | Lyric curation pass |
| §8.2 | Step 1 plays a synthetic head before any human recording | Embed first (H3), then the clean version |
| §8.2 | "From memory" in the same sitting is not memory | Step 7 graded cold, ≥ 8 h later (matches §1.2) |
| §8.2 | Voice "2 more keys"; drums missing despite "all courses"; 32 bars ≠ one screen | Voice: "find your key" from voiceRange. Drums: sing the head while keeping time, kicks, trading inside the form. 4–8-bar windows with the playhead |
| §8.4 L4 | A synthetic voice song "speeds and slows" = an algorithmic rubato curve, i.e. the rejected humanize layer | Rubato only from human takes (teacher, calibration accounts, a voice student via §12.3) |
| §8.4 L4 | "Follow the melody's onsets" is wrong: good comping avoids melody onsets | Grade chord onsets against the singer's beat map; add comp velocity below melody |
| §10.1 | The app cannot mark embed timelines (no extraction), and I cannot listen | An owner/teacher annotation tool is a prerequisite; about 1 recording per theme; fallback for removed or region-blocked videos |
| H3 | Embedding unauthorised uploads: a for-profit linker is presumed to know (GS Media) [B] | Official artist/label/"Topic" channels only; store the channel id. The IFrame API's seekTo/setPlaybackRate also allow loop/slow on embeds |
| §10.1 | "Listen for" prompts without a lineage | Per-instrument listening canon by era; US-PD sides: Hot Five (Nov 1925), King Oliver 1923, Morton 1923–24, James P. Johnson (to check) |
| §10.3 | "Rising to bar 25 of 32" is prescriptive; motif detectors are unvalidated | "Clear peak in the last third, then release"; descriptive feedback until teacher agreement (§9.4) |
| §11.1 | No one named to write the 120 + pop charts. I cannot hear recordings, and copying UG/Real Book charts risks compilation/database claims [B]. Israeli songs: ACUM claims chords [V] | Chart policy like heads (source + human verifier); no Israeli copyrighted songs until ACUM is asked |
| §11.1 | Lyric-less pop charts are hard to follow; no groove content | Bar grid + sections synced to the embed; k-pop comping patterns and anticipations |
| §11.2 | Vowels: "no **level** change" is physically invalid (vowel intrinsic intensity differs) [B] | Pitch steadiness + transition smoothness; per-vowel level tolerance |
| §11.2 | Spectral-slope break detection on phone mics is unvalidated; app-taught belt is a health risk | Pitch discontinuity + level dip, hint-only until teacher-labelled validation; belt teacher-assigned only |
| §11.2 | Back-phrasing as onset offset rewards being late | Low lag SD + landing on the phrase target |
| §11.3 | Extra tap (contradicts §15); "effect on next cold take" is n = 1 noise | Use the §7 slot; show the effect aggregated over ≥ 5 uses; teach the strategy just in time at the detected error |
| §11.4 | 32-bar staff entry on a phone; "chord tones on strong beats" rewards bland lines | Play it in (phrase studio), auto-notated, 8 bars per screen. Feedback, not pass/fail, on guide tones, repetition/form, rhythm, range. Models: teacher/PD, never Claude |
| §12.3 | Layering needs a clicked first take + latency compensation | Click + calibrated round trip; grade against the first take's beat map |
| §14 | "Terraced dynamics" graded as "the" Baroque style is contested; articulation/pedal are measurable on MIDI only; model curve source unstated | "A common starting choice", graded on the instruction given; MIDI-only grading; human model curves only |
| §15 | Sung steps (§8.2.2, §10.2.3, §10.3) do not name the syllables | Neutral syllable / degree numbers / letters (no movable do) |

No new Harris content is proposed (rule respected). No locks: the capstone and tune gate must be explicitly skippable.

## 3. Fresh findings

| # | Finding | Proposal | I/E |
|---|---|---|---|
| N1 | The SP key of the week never meets repertoire | Tune of the week in the key of the week (a head's key or a transposition) | H/L |
| N2 | The level test and skill map have no real-music items | One tune section per course (head slice from memory, a chart at sight) | M/M |
| N3 | Owner verification is the bottleneck of H1 steps 4–5 (20 heads × 32 bars + charts) | A side-by-side verify screen (period scan vs engraving); budget it in §16 | H/M |
| N4 | Hebrew-first singers on 1920s English lyrics | English diction help with a teacher/human audio model | M/M |
| N5 | The Ear course ignores the new heads | EAR v2 songs-by-ear and sight-singing draw from served heads | M/L |
| N6 | Performance takes have no reflection beyond self-rating | "Listen back with one question" (time / sound / shape) | M/L |

## 4. Verdict and remaining fixes

**Verdict:** substantially covered. All 15 top items are in the spec (14 covered, 1 partial), and 2 of 3 owner questions are answered. It is **not yet OK** on three fronts:
- the region default contradicts the repo's legal research;
- several proxies (§8.4, §11.2, §11.4, §10.3) are invalid as written;
- drums, games and reading are absent from the pedagogy sections.

| # | Fix | Impact | Effort |
|---|---|---|---|
| 1 | Region: 1B deny-by-default, tier/pdWorldwideFrom, owner verify mode, lawyer question | H | L |
| 2 | Human-only rubato and expressive models; beat-map accompaniment grading | H | L |
| 3 | Fix proxies: vowel level, back-phrasing, arc bar, composition grading, register hint-only | H | L |
| 4 | Learn-a-tune: recording first, cold memory, voice key, 4–8-bar windows, syllables | H | L |
| 5 | Ask H4; add beginner US-PD/1A tier | H | M |
| 6 | Chart/annotation/verification policy + verify screen; official channels | H | M |
| 7 | Tune of the week ↔ key of the week | H | L |
| 8 | Drums in §8.2/§8.5/§10.3 + AP §2.6 items | M | M |
| 9 | Games: Contour Draw, first-phrase recall, groove match, voice game | M | M |
| 10 | §11.3 into the §7 slot; aggregated effect | M | L |
| 11 | Ear: head dictation, line-implication ear, tunes-you-know | M | L |
| 12 | Reading ladder + behind/ahead feel on keys/guitar + app-wide swing band | M | M |
| 13 | Performance ritual, roles unit, responsive comping, lesson templates, diction/mic | M | L–M |
| 14 | Listening canon + PD early-jazz sides | M | M |
| 15 | §8.2 ref fix; "skippable" wording | L | L |
