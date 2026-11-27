# Re-audit round 2: content and pedagogy vs SPEC-HOLISTIC-2 §17 (v2 + §17.7), 2026-11-27

Sources: R2 = AUDIT-HOLISTIC-PEDAGOGY-R2; § = SPEC-HOLISTIC-2; SP = SPEC-SPIRAL-PRACTICE v6; SL = research/STANDARDS_LEGAL; `heads.ts`. [V] = checked in the repo, [B] = law or literature, not re-checked.

## 1. Coverage of R2

**The 15 fixes**

| # | Status | Ref / gap |
|---|---|---|
| 1 Region, 1B deny | covered | §17.4 Region. Base text §8.1 still says "unknown region → US". §17 overrides it, but the line should be struck so the build doesn't read it |
| 2 Human rubato, beat map | covered | §17.4 Accompanying |
| 3 Proxies | **partial** | Vowel, register, arc, composition: OK. Back-phrasing is still invalid (§2 below) |
| 4 Learn-a-tune | covered | §17.4. The syllable rule is scoped to learn-a-tune only. R2 also named §10.2.3 (transcription "sing it") and §10.3 (sing what you play): put it in §15 |
| 5 H4 + beginner tier | **partial / contradicted** | H4 is still "open" (§0) and nothing asks it. The beginner list says "from 1A where possible", yet 10 of its 12 tunes are 1B [B]: Handy †1958, C. & S. Williams †1965, Ager †1979, Henderson †1970, Akst †1963, V. Young †1956, Berlin †1989, Ory †1973. Only Saints (trad.) and Bill Bailey are 1A |
| 6 Chart/verify policy, channels | covered | §17.4, §17.7 |
| 7 Tune ↔ key of the week | covered | §17.5 |
| 8 Drums | covered | §17.4, §17.5 |
| 9 Games | covered | §17.5 |
| 10 §11.3 in the §7 slot | covered | §17.4 |
| 11 Ear items | covered | §17.5 |
| 12 Reading, behind/ahead feel, swing band | covered | §17.5 |
| 13 Ritual, roles, comping, templates, diction/mic | covered | Ballad performance capstone: still partial (only the ritual is generic) |
| 14 Listening canon | covered, with an error | PD-recording dates (§2 below) |
| 15 Ref fix, "skippable" | covered | §17.4 |

**R2 "still needed" and missing rows:** all Ear, voice, drums, games, reading, rhythm, free-improvisation, post-bop, roles and comping rows are now **covered** (§17.5). Israeli idioms are moot (§17.7).

Still open:
- **#3:** capstone material for **Ear** units is missing.
- **#13:** the jazz-bridge links (Joplin → stride, Debussy/Satie → planing) are **missing**.
- **N4:** this should now be generalised beyond Hebrew-first singers (see §3).

## 2. Critical review of §17.4–17.7

**Legality**

1. **Deny-by-default empties the real-music plan outside the US.**
   - Except Indiana, every one of §8.1's 20 heads is 1B, and so are all four new contrafact sources (Honeysuckle Rose, Sweet Georgia Brown, What Is This Thing Called Love, I Got Rhythm).
   - §17.5's own goal example, "Body and Soul by June", is 1B (Green †1989).
   - So in Israel (the owner's own region) and in the EU, and with the app now multilingual (§17.7), almost no learner can get:
     - learn-a-tune;
     - capstones;
     - tune of the week;
     - first-phrase recall;
     - head dictation;
     - the level-test tune section.
   - **Fix:** a **1A-first** core list, drawn from SL §2.1's verified list [V]. Candidates:
     - beginner: Bill Bailey, Ain't We Got Fun, Yes Sir That's My Baby, Somebody Stole My Gal, Nobody Knows You, spirituals, Saints;
     - core: Indiana, Rose Room, Avalon, Japanese Sandman, Love Me or Leave Me, Mean to Me, I'll Get By, My Blue Heaven, Makin' Whoopee, If I Could Be with You, King Porter Stomp, Charleston.
   - 1B is a US-only layer on top of that.
   - **Add a rule:** every real-music feature picks from the heads available in the learner's region (1A + originals, + 1B in the US). A guard test checks that each course has ≥ N served heads per tier in a non-US region.
2. **Widen the lawyer question.** Melody-only use (no words) of songs whose composer died ≤ 1955 but whose lyricist died later, e.g. Tea for Two (Youmans †1946), Honeysuckle Rose and Ain't Misbehavin' (Waller †1943).
   - EU Dir. 2011/77 joins the terms of a "composition with words" [B]. Whether that reaches the music used alone, and whether Israel has any such rule, is open (SL already flags Israel) [V].
   - A yes would move several 1B heads to 1A for melody use.
3. **PD recordings.**
   - US recording PD is counted from **release**, not from the session. The Hot Five sessions of Nov 1925 were largely released in 1926, so they become PD in 2027 [B]. Check each side's release date.
   - A PD recording still **embodies a composition**. Armstrong (†1971) and Oliver/Armstrong pieces are 1B as compositions, so shipping those sides needs the same region gate. Morton and J.P. Johnson are 1A.
4. **§17.7 global pop.**
   - The chords-only defence is weakest where the harmony itself is the original expression: Jacob Collier reharms, Steely Dan voicings. Selection and arrangement can be protected (SL §1) [V].
   - **Rule:** lead-sheet-level symbols only, no voicings and no signature riffs or intros. The `band.ts` riff guard (SL §4) must extend to pop: Superstition, Jamiroquai bass lines.
   - Prefer songs whose bridge concept is a common progression.
   - Name the song exactly: "Just the Way You Are" must say Billy Joel 1977, not Bruno Mars.
   - The single collecting-society question is fine.
5. **Owner verify mode** (1B shown in Israel): fine as private review. It should be logged and kept off any public build.

**Grading proxies**

6. **Back-phrasing.**
   - "Low SD of the lag" rewards a constant delay. That is laid-back time, not back-phrasing, which delays the start and then compresses to land.
   - **Grade:** the phrase starts deliberately late (lag ≥ x) **and** the target onset lands within the tier's tolerance.
   - Keep it descriptive until it agrees with teacher labels.
7. **Comp velocity "below the melody".** The melody is a recorded voice, so a MIDI velocity can't be compared with an audio level. Grade the comp's dynamic contour against the voice's phrase envelope, on MIDI only ("needs MIDI" per M7).
8. **Drums.**
   - Per-pad balance and Groove Match per limb work on an e-kit only (memory: drums-tested-on-ekit) → "needs MIDI".
   - "Sing the head while keeping time" can't be measured on an acoustic kit with a mic → self-rate or teacher.
   - Melodic tom soloing: `improvPhrasing` assumes pitched lines. Specify motif matching on the pad + rhythm sequence.
9. **§11.3 effect over ≥ 5 uses** is confounded with learning. Label it "your notes", not a cause.

**Rules**

10. **No Claude-composed music.**
    - Drum "supporting a soloist" uses "the lick bank's lines (PD or teacher)". The lick content is app-written or rule-generated (`keyLicks.ts`: "own exercises generated from the rules" [V]).
    - The 5 original heads, the songbook and the voice songs are app-written too.
    - With 1B denied, these are the main region-safe filler. **So H4 is now load-bearing:** ask it before step 5, and record provenance per lick and per head.
11. **No memorizable items** (memory: sound-and-voice-direction).
    - Head dictation, sight-singing from served heads, and Contour Draw on learned tunes turn into recall.
    - Draw only from heads the learner hasn't learned, as random slices, in transposition, and track exposure.
12. **Level-test tune section.** "A head slice from memory" is invalid for new users, who haven't learned the app's heads, and it conflicts with SPEC-LEVEL-TEST's one take per step.
    - Make it an opt-in "tunes I know" pick from region-safe heads.
    - The "chart at sight" item is fine.
13. **Performance ritual.** "No restarts" vs never-lose-progress: a reload or interruption must resume the take, not count as a restart.
14. **Post-bop.** Its tunes are copyrighted → chords only, with the riff guard (Footprints' bass line).
    - 3 levels straight after bebop is a jump under the curriculum-flow rule. It needs modal / slash-chord / non-functional prerequisites, cross-linked.
15. **Contrafact accuracy.** Scrapple from the Apple = Honeysuckle Rose A sections + the I Got Rhythm bridge. Say so.
16. **Transposing-instruments ladder.** No audience is named: the app has no horn course. Is it for teachers, or for singers reading horn charts? Name it, or defer it.

**Consistency and feasibility**

17. **SP v6.**
    - Tune of the week adds load to the time-first session. Give it an SP minute budget, or a rotation slot.
    - The app-wide swing band needs per-tier tolerances (SP §16.9 only defines key-session lines).
18. **§17.6.** Step 5 should also include:
    - the **official-channel embed registry** (learn-a-tune step 1 needs it);
    - the **1A-first list**.

    Contour Draw has no dependencies and fills the open beginner gap: it can ship earlier.
19. **§17.4 step 7** (cold, ≥ 8 h): it needs a resumable "pending memory check" on Today across days.

## 3. Fresh findings

| # | Finding | Proposal |
|---|---|---|
| F1 | Multilingual voice (7 voice languages, languages-plan) has only English US-PD lyrics | PD lyric sets per language (Lieder, chansons, folk); the diction help covers every non-native-English singer |
| F2 | In denied regions a learner can still listen to a 1B tune via an official embed, but gets no graded head | A "learn it by ear" path: the embed + a Tier-2 chart + teacher or self check, with no stored melody |
| F3 | Ear unit capstones have no material | Region-safe head slices (1A), plus the listening-lab tasks as Ear capstones |
| F4 | Jazz-bridge links are missing | Joplin → stride, Debussy/Satie → planing, Bach → bebop lines, as tagged cross-course steps |
| F5 | Ballad performance capstone | A performance ritual on a 1A ballad (Mean to Me, Poor Butterfly), with expression contour plus a teacher rubric |
| F6 | Lyric curation applies to 1A too (minstrel-era verses in 1900s–1910s songs) | Same pass for every served lyric |

## 4. Verdict

**Not OK yet, but close.** Every R2 row is now addressed in the text. One structural problem remains: the core content lists are US-only under the spec's own deny rule. That makes the real-music plan contradict the legal frame for the owner's region and the multilingual market. H4, now load-bearing, is still unasked, and one proxy is still invalid.

**Prioritised fixes**
1. A 1A-first head list (beginner + core) from SL §2.1; 1B as a US layer; a region-pool rule with a guard test; goal and contrafact examples from 1A (H, L).
2. Ask the owner H4, and record provenance for the lick bank and the original heads (H, L).
3. Lawyer question: melody-only use for composer-†≤1955 songs; recording release dates; a region gate on PD recordings of 1B compositions (H, L).
4. §17.7: lead-sheet symbols only, the pop riff guard, exact song identification, caution on Collier and Steely Dan (M, L).
5. Back-phrasing proxy; comp dynamics against the voice envelope; "needs MIDI" for drum balance, Groove Match and singing while drumming (M, L).
6. No-memorizable-items rule for dictation, sight-singing and Contour Draw; the level-test tune section opt-in (M, L).
7. Syllable rule into §15; strike §8.1's "unknown → US"; the Scrapple bridge note (L, L).
8. Tune-of-the-week budget in SP; app-wide swing-band tolerances; the embed registry in step 5; Contour Draw earlier (M, L).
9. F1–F6, ritual resume, post-bop prerequisites, the transposing-ladder audience (M, M).
