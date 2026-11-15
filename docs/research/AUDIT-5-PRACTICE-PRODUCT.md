# Audit 5: practice science and product gaps

**Date:** 2026-11-15 · **Branch:** redesign-v2 (after 0.92) · **Scope:** read-only. No code was changed.

**Method.** The audit starts from the research and from what serious practice apps do, not from the app's own lists.
Each principle or feature was then checked against the code (file:line). The citations are standard, peer-reviewed
references, quoted from the literature as known at the knowledge cutoff; no live web search was run for this pass.
Items marked **[M]** are well-known but secondary or contested, so treat them as weaker evidence. App features
describe the apps as of 2025–26.

**The goal being audited:** *the first professional app that measures practice quality and practice time continuously
and tracks improvement*, with a jazz / Barry Harris niche.

**Status scale.** EXISTS-DEEP = implemented and wired into path / workout / stats. SHALLOW = present but thin,
disconnected, or partly broken. MISSING = not found.

---

## 0. Headline findings (read these first)

1. **In-app practice time is not measured at all.** `StatsDay.ms` is filled only from `result.durationMs`
   (`src/engine/stats.ts:376`). Yet `LessonResult` has no such field (`src/storage/progress.ts:30-52`), and the only
   code that sets `durationMs` is the self-reported practice log (`src/engine/practiceLog.ts:43`,
   `src/storage/progress.ts:656`). The piece coach reuses that log (`src/ui/App.tsx:2533`). So the "Practice time"
   tile (`src/ui/Stats.tsx:312`) counts only logged minutes and piece minutes. Lessons, technique drills, games, ear
   work, My song and the improv studio add **0 minutes**. SPEC-STATS S5 promised "each result its `durationMs`"
   (`docs/SPEC-STATS.md:101`), and that was never built. This is the single biggest gap against the app's stated
   purpose.
2. **The off-app practice block counts time it never measured.** The handler books
   `Math.max(ms, b.minutes * 60000)` (`src/ui/App.tsx:2507`): pressing "Done" after 1 minute books the whole planned
   block. Its "What did you work on?" note (`src/ui/Workout.tsx:564`) is never saved: `onBlockDone(now - t0)` drops it
   (`src/ui/Workout.tsx:565`). The one journal entry point in the app is therefore a dead field.
3. **Practice quality is measured per take, but never added up.** The data is rich: clean tempo, CV, hand sync, key
   mastery, groove, confusions and the profile. But no "quality minutes", "time at the edge" or "deliberate vs
   run-through" figure exists anywhere (grep: none). The idea is already written down in
   `docs/research/TECH_AND_FEATURE_IDEAS.md:22` (#6) and `docs/research/MARKET_REVIEW_2026-11.md:102`.
4. **The streak works against the app's own principle that only measured practice counts.** Any result, daily
   challenge or memory game makes a streak day (`src/storage/progress.ts:1010-1015`). The pushes are loss-framed,
   carry emoji and ask for "one short lesson" (`supabase/functions/toneturn-streak-reminder/index.ts:16-27`). That
   conflicts with the memory notes on mature, clean UI and on measured practice only, and it matches the documented
   downsides of streaks (§1.13).
5. **The core learning science is strong.** It has FSRS spacing, interleaved keys and areas, retrieval as the core
   loop, chunked pieces, rubato before the tempo ladder, a two-day pass rule, aids that fade, and a challenge-point
   scheduler. ToneTurn is ahead of every consumer competitor here. The gaps are in **reflection, the journal, goals,
   plateaus, performance readiness, and the time and quality ledger**: the self-regulation layer that adult musicians
   and Modacity-type apps care about.

---

## 1. Research principles (with sources)

| # | Principle | What the evidence says | Main sources |
|---|---|---|---|
| 1.1 | **Deliberate practice** | Effortful, goal-specific work at the edge of ability, with immediate informative feedback and repetition with refinement. Accumulated deliberate practice correlates with expert level. Later meta-analysis finds it explains a real but smaller share (~20–25 % in music), so it is necessary but not sufficient. | Ericsson, Krampe & Tesch-Römer 1993, *Psych. Review* 100:363; Macnamara, Hambrick & Oswald 2014, *Psych. Science* 25:1608; Ericsson & Harwell 2019 (reply) |
| 1.2 | **Spaced repetition** | Distributed practice beats massed practice for retention, both verbal and motor. Sleep consolidates motor sequences. Expanding intervals tuned to forgetting. | Cepeda et al. 2006, *Psych. Bull.* 132:354; Simmons 2012, *JRME* 59:357 (keyboard); Walker et al. 2002, *Neuron* 35:205; FSRS (Ye 2022–24, open-spaced-repetition) |
| 1.3 | **Interleaving / contextual interference** | Random or interleaved practice lowers performance during the session but improves retention and transfer, for both motor and perceptual-category learning. | Shea & Morgan 1979, *JEP:HLM* 5:179; Kornell & Bjork 2008, *Psych. Sci.* 19:585; Carter & Grahn 2016, *Front. Psych.* 7:1251 (clarinet); Abushanab & Bishara 2013, *Psych. of Music* 41:97 (piano) |
| 1.4 | **Retrieval practice** | Testing beats re-study for long-term retention, and low-stakes frequent tests work best. Rated "high utility". | Roediger & Karpicke 2006, *Psych. Sci.* 17:249; Dunlosky et al. 2013, *PSPI* 14:4 |
| 1.5 | **Chunking** | Experts encode larger meaningful units. Motor sequences are learned as chunks joined at boundaries, and seams are where errors live. | Chase & Simon 1973; Sakai, Kitaguchi & Hikosaka 2003, *Exp. Brain Res.* 152:229; Miller 1956 |
| 1.6 | **Slow practice and tempo ladders** | The best learners slowed down, isolated the error spot, fixed it and played correct repetitions before speeding up. Tempo increments matter less than *correct reps before the step*. | Duke, Simmons & Cash 2009, *JRME* 56:310; Maynard 2006, *JRME* 54:56 **[M]** |
| 1.7 | **Variability of practice** | Varying parameters (keys, rhythms, articulations, contexts) builds a generalised schema and transfer. The challenge-point framework fits difficulty to skill. | Schmidt 1975 (schema theory), *Psych. Review* 82:225; Guadagnoli & Lee 2004, *J. Motor Behav.* 36:212 |
| 1.8 | **Mental practice and audiation** | Mental rehearsal improves performance, though less than physical practice; it works best combined with it. In pianists, mental plus physical practice approaches physical practice alone. Audiation (hearing music not present) is a foundation of musicianship. | Driskell, Copper & Moran 1994, *J. Appl. Psych.* 79:481; Pascual-Leone et al. 1995, *J. Neurophys.* 74:1037; Bernardi et al. 2013, *Front. Hum. Neurosci.* 7:870; Gordon, *Learning Sequences in Music* |
| 1.9 | **Feedback timing and frequency** | Immediate, frequent feedback speeds acquisition but can create dependency (the guidance hypothesis). Reduced, faded, summary or bandwidth feedback improves retention. Feedback aimed at the self, not the task, can hurt. | Salmoni, Schmidt & Walter 1984, *Psych. Bull.* 95:355; Winstein & Schmidt 1990, *JEP:LMC* 16:677; Kluger & DeNisi 1996, *Psych. Bull.* 119:254 |
| 1.10 | **Self-regulated learning (SRL)** | A cycle of forethought (goals, strategy), performance (monitoring) and self-reflection (attribution, adaptation). Strategy use, not hours, separates effective music practisers. | Zimmerman 2002, *Theory into Practice* 41:64; McPherson & Zimmerman 2002; Miksza 2011, *JRME* 59:321; Hallam et al. 2012, *Psych. of Music* 40:652 |
| 1.11 | **Goal setting** | Specific, difficult-but-reachable goals beat "do your best". Process goals that shift to outcome goals beat outcome-only goals for skill learning. | Locke & Latham 2002, *Am. Psych.* 57:705; Zimmerman & Kitsantas 1997, *J. Ed. Psych.* 89:29 |
| 1.12 | **Practice logs** | Diaries are the field's standard measure of practice, but self-report overestimates. Logs imposed for accountability do not motivate. Logs that record *what and how* (strategy, reflection) support SRL. | Sloboda, Davidson, Howe & Moore 1996, *Brit. J. Psych.* 87:287; Lehmann & Ericsson 1997; Austin & Berg 2006, *Psych. of Music* 34:535 |
| 1.13 | **Motivation (SDT)** | Autonomy, competence and relatedness drive lasting intrinsic motivation. Controlling rewards undermine it (overjustification). Informational feedback supports it. In music, the same three needs predict persistence. | Deci & Ryan 2000, *Psych. Inquiry* 11:227; Deci, Koestner & Ryan 1999, *Psych. Bull.* 125:627; Evans 2015, *Psych. of Music* 43:65; Ryan, Rigby & Przybylski 2006, *Motiv. & Emotion* 30:344 (games) |
| 1.14 | **Streak psychology** | Streaks raise engagement (goal-gradient effect). A *broken* streak sharply lowers the chance of returning, and protection mechanics soften this. Streaks push toward minimum-viable sessions (do the least to keep the count) and rely on loss aversion, which can turn controlling. | Silverman & Barasch 2023, *J. Consumer Res.* 49:1095 **[M]**; Kivetz, Urminsky & Zheng 2006, *J. Marketing Res.* 43:39; Duolingo published A/B notes on streak freeze **[M]** |
| 1.15 | **Plateau handling** | Learning curves flatten (power law). Experts escape the "OK plateau" (arrested development) by deliberately going back to effortful, error-producing work, changing the task, or pushing tempo or difficulty beyond comfort. | Newell & Rosenbloom 1981; Ericsson 2008, *Acad. Emerg. Med.* 15:988; Gray & Lindstedt 2017, *Cog. Sci.* 41:1838 **[M]** |
| 1.16 | **Performance anxiety** | Music performance anxiety (MPA) is common. Graded exposure and performance simulation (stress inoculation) work, as do a pre-performance routine, cognitive reappraisal, and a brief written reappraisal or expressive writing before a high-stakes moment. | Kenny 2011, *The Psychology of Music Performance Anxiety* (OUP); Williamon et al. 2014, *Front. Psych.* 5:25 (distributed simulation); Ramirez & Beilock 2011, *Science* 331:211; Brooks 2014, *JEP:Gen* 143:1144 (anxiety reappraisal) |
| 1.17 | **Recording yourself** | Self-evaluation while playing is inaccurate. Listening back to or watching recordings improves self-assessment accuracy and strategy choice, especially with guiding criteria. | Bergee 1997, *JRME* 45:601; Daniel 2001, *Music Ed. Research* 3:215; Boucher, Creech & Dubé 2020, *Psych. of Music* 49:1170 **[M]** |
| 1.18 | **Dosage and health** | Expert practice comes in limited blocks (about 1 h, at most ~4 h a day). Excessive repetitive practice is linked to overuse and focal dystonia risk. Breaks help consolidation. | Ericsson et al. 1993; Altenmüller & Jabusch 2010, *J. Hand Ther.* 23:144 |

### 1.19 What the leading apps and methods do (features that matter)

| App / method | Features that matter for ToneTurn |
|---|---|
| **Yousician** | Real-time pitch and timing feedback over a song; daily "missions"; a song library graded by level; weekly challenges and leaderboards; per-section loop and slow-down. |
| **Simply Piano** | Song-first motivation; "wait for you" mode; split-hand practice; short daily sessions; level placement. |
| **Melodics** | MIDI lessons for keys, pads and drums; each lesson **passed at 3 tempos**; practice calendar with **minutes goal per week**; "Courses"; accuracy plus timing early/late map; progress by **practice time**. |
| **Tenuto / musictheory.net** | Fully customisable drills (choose intervals, chords, keys); exercise links for teachers; no fluff. |
| **EarMaster** | Wide ear and rhythm curriculum, jazz courses, sight-singing with mic, **teacher edition with assignments and results export**, detailed statistics, custom exercises. |
| **Functional Ear Trainer** | Cadence first, then the degree heard *in context*; resolution to tonic after each answer; very short loops. |
| **iReal Pro** | Charts of about 1,300 standards (user forums); backing in many styles; **transpose, loop sections, tempo up by N each chorus, transpose up each chorus**; practice-mode settings; mixer; import and share. |
| **Open Studio (Adam Maness, Peter Martin)** | Video curriculum; method pathways (incl. Barry Harris material); "practice plans"; licks in 12 keys; play-along tracks with the teacher; live classes; community. |
| **Modacity / Andante / Tonic / practice journals** | Practice list of *your* pieces; **timer per item**; **record and listen back each take**, rate it, add notes; "improvement" streaks per item; goals per piece; weekly totals; reminders; group practice (Tonic). |
| **Moises / Anytune / Transcribe!** | Stems, chord detection, pitch-preserving slow-down, A–B loops, markers, count-in, smart metronome. |

---

## 2. Status table

### 2A. Practice-science principles

| # | Principle / feature | Status | Evidence (file:line) and notes |
|---|---|---|---|
| P1 | Deliberate practice: edge-of-ability selection | **EXISTS-DEEP** | Priority scheduler: importance × gap × freshness × readiness (`src/engine/scheduler.ts:3-8`); technique works on the weakest items and keys (`src/engine/drills/plan.ts`, `src/engine/pathMastery.ts:1-7`); "strengthen" block (`src/engine/workout2.ts:21-23`). |
| P2 | Deliberate practice: specific, informative feedback | **EXISTS-DEEP** | Mistake-specific coaching (`src/engine/coach.ts:1-3`); per-note technique analysis; improv debrief by bar and chord (`src/engine/improvCoach.ts:1-3`); profile patterns with confidence floors (`src/engine/analysis/profile.ts:1-7`). |
| P3 | Deliberate practice: **measured time and quality ledger** | **MISSING** | See headline 1 and 3. `src/engine/stats.ts:376` reads `durationMs` that only `src/engine/practiceLog.ts:43` sets. No quality-minutes metric anywhere. |
| P4 | Spaced repetition (ear items) | **EXISTS-DEEP** | FSRS-4.5 (`src/engine/fsrs.ts:1-9`); review queue scheduled with FSRS (`src/storage/progress.ts:494-532`); Leitner state migrated. |
| P5 | Spaced repetition (licks, pieces, technique) | **EXISTS-DEEP** (technique partial) | Licks FSRS (`src/engine/licks.ts:14`, `:426`); piece maintenance `MAINT_DAYS = [1,3,7,14,30,60,90]` (`src/engine/piece/coach.ts:236`); a technique pass needs 3 clean takes on **2 different days** (`src/engine/drills/ladder.ts:26-29`); mastered steps fade to silver "refresh" after ~30 days (`src/engine/pathMastery.ts:20-21`). Gap: technique and curated repertoire use fixed recency, not per-item FSRS. |
| P6 | Interleaving | **EXISTS-DEEP** | Path areas interleaved (`src/engine/path.ts:1006`); mixed checkpoint (`src/engine/path.ts:1276`); keys interleaved in the ladder (`src/engine/drills/ladder.ts:273`, `src/engine/drills/plan.ts:352`); piece coach rotates chunks (`src/engine/piece/coach.ts:2`). Missing: an explicit *cross-skill* interleaved challenge (ear + technique + theory on one tune). |
| P7 | Retrieval practice | **EXISTS-DEEP** | The core loop is answer-first questions; hints cost difficulty and XP (`src/engine/aids.ts:74-90`); level test and placement measure without aids (`src/engine/aids.ts:71-75`). |
| P8 | Chunking | **EXISTS-DEEP** | Piece coach: chunks, spot chunks, seams and joins (`src/engine/piece/coach.ts:1-18`, `:99-108`); My song section loops (`src/ui/MySong.tsx:1-5`). |
| P9 | Slow practice and tempo ladder | **EXISTS-DEEP** | Rubato, then quarters at 60, then the ladder (`src/engine/drills/rubato.ts:1-16`); "Slower" takes never count (`src/engine/drills/ladder.ts:19-24`); accuracy-gated piece tempo ladder with step-back loops (`src/engine/piece/coach.ts:1`, `:99-102`); chart tempo climbs when clean (`src/ui/Charts.tsx:704`); metronome speed trainer (`src/ui/Metronome.tsx:23-24`). |
| P10 | Variability | **EXISTS-DEEP** | All 12 keys per drill and key mastery (`src/engine/analysis/keyMastery.ts:1-5`); keys move during the level test (`src/engine/drills/levelTest.ts:46`); variants in the ladder (`src/engine/drills/ladder.ts:273`). |
| P11 | Mental practice / audiation | **SHALLOW** | An ear topic "audiation" with 5 levels (`src/engine/topicsHarmony2.ts:1`, `:116-247`). No instrument-side "audiate, then play" or "hear the next bars in your head" mode; the idea is noted but unbuilt (`docs/research/MARKET_REVIEW_2026-11.md:101`). |
| P12 | Feedback timing / fading | **SHALLOW** | Aids fade automatically once a skill reaches Solid (`src/engine/aids.ts:16`, `:64`); level test gives no per-item help (SPEC-LEVEL-TEST); improv debrief is summary feedback. No faded or bandwidth mode for *answer* feedback, and no "delayed feedback" setting for advanced players. |
| P13 | Self-regulated learning: forethought | **SHALLOW** | The editable workout is a plan (`src/engine/workout2.ts:1-3`), but there is no per-session strategy or intention ("today: bars 9–12, left hand alone"). |
| P14 | SRL: self-reflection | **SHALLOW** | One-tap "easy/right/hard/long" only changes tomorrow's total (`src/ui/App.tsx:2520-2523`); AI card and weekly summary (`supabase/functions/toneturn-ai/index.ts:20-25`). No self-prediction or calibration ("how clean will this take be?") and no attribution prompt. |
| P15 | Goal setting | **SHALLOW** | Daily XP goal (`src/storage/progress.ts:227`); questionnaire goal (`src/ui/SettingsScreen.tsx:107-113`); one-tap personal goal "N path steps in W weeks" (`src/engine/courseStart.ts:30`, `:343`); piece target tempo (`src/ui/Pieces.tsx:1-2`). Missing: user-authored goals (a tune and tempo by a date, "all 12 keys of X"), process goals, and a weekly **minutes** goal. |
| P16 | Practice log | **SHALLOW** | Kind plus minutes only, no notes (`src/engine/practiceLog.ts:6-45`, `src/ui/PracticeLog.tsx:1-3`); the workout note is discarded (`src/ui/Workout.tsx:564-565`); off-app block time is inflated (`src/ui/App.tsx:2507`). |
| P17 | SDT: autonomy, competence, relatedness | **EXISTS-DEEP** | Autonomy: workout fully editable, hide topics, rebuild the path (`src/ui/SettingsScreen.tsx:95-101`). Competence: measured ranks, "promotion not full bars", trends (`src/ui/Trends.tsx:1-5`). Relatedness: friends, duets, classes and leagues (`src/ui/Duets.tsx:1-3`, `src/engine/league.ts:1-3`). |
| P18 | Streaks: protections against the downsides | **EXISTS-DEEP** (with risks) | Free weekly freezes, repairs, milestones (`src/engine/streak.ts:1-15`, `:60-66`). Risks: any activity counts (`src/storage/progress.ts:1010-1015`); loss-framed, emoji push copy (`supabase/functions/toneturn-streak-reminder/index.ts:16-27`); no weekly-target or rest-day mode. |
| P19 | Plateau detection and handling | **MISSING** | No plateau logic (grep "plateau\|stalled": none). The profile marks a pattern as "recurring for N weeks" (`src/engine/analysis/profile.ts:2-4`) and trends show slopes, but nothing detects a flat curve on an item or skill and changes the approach. |
| P20 | Performance anxiety / performance simulation | **SHALLOW** | One-take level test (`src/engine/drills/levelTest.ts:1-3`); voice-course "performance take" (`src/content/mini/voiceCourse.ts:149`); tournaments. No instrument "recital mode" (one pass, no restarts, recorded, simulated audience), no pre-performance routine, no reappraisal. |
| P21 | Recording yourself | **SHALLOW** | Voice: opt-in weekly best take for "a month ago vs now" (`src/storage/takes.ts:1-3`); charts listen-back in memory only (`src/ui/Charts.tsx:278`); My song and slow-down work on the player's own files (`src/ui/SlowDown.tsx:1-2`). MIDI drill takes are recorded for analysis (`src/ui/DrillTake.tsx:1`), but there is no take library, A/B against your best, or self-rating. |
| P22 | Dosage and health (breaks, rep caps) | **MISSING** | No fatigue or pain guidance or rep cap in the drill flow (grep: none in `plan.ts` or `workout2.ts`). The research doc proposes it (`docs/research/TECHNIQUE_DRILLS_RESEARCH.md`, §6.2). |
| P23 | Fluency / automaticity (speed in scoring) | **EXISTS-DEEP** | Personal pace goal per skill × modality (`src/engine/fluency.ts:1-6`). |
| P24 | Long-term error patterns (player model) | **EXISTS-DEEP** | Profile timeline: new, recurring, gone, with "gone" only counting while the player keeps practising (`src/engine/analysis/profile.ts:1-7`); insights link every finding to the exercise that trains it (`src/ui/Insights.tsx:1-3`). |

### 2B. App-feature benchmarks

| # | Feature (from §1.19) | Status | Evidence |
|---|---|---|---|
| A1 | Pass a unit at several tempos (Melodics) | **EXISTS-DEEP** | Start tempo plus target tempo with 3 takes on 2 days (`src/engine/drills/ladder.ts:26-40`). |
| A2 | Weekly practice-**minutes** goal and calendar (Melodics, Modacity) | **MISSING** | Only the daily XP ring (`src/storage/progress.ts:227`); the time data does not exist (headline 1). |
| A3 | Timer per practice item, notes, and a rating per take (Modacity) | **MISSING** | — |
| A4 | Custom drills (Tenuto, EarMaster) | **EXISTS-DEEP** | Drill creator (`src/ui/DrillCreator.tsx`, `src/engine/drills/custom.ts`). |
| A5 | Cadence context and functional degrees (FET) | **EXISTS-DEEP** | Degrees and cadence topics on the ear path (`src/engine/topicsEar.ts`). |
| A6 | iReal-style tempo-up and transpose-each-chorus | **SHALLOW** | Tempo climbs when clean (`src/ui/Charts.tsx:704`); transposing a chart exists (`src/engine/charts.ts:159`). No "up a fourth every chorus" cycle mode for 12-key coverage on a tune. |
| A7 | Teacher edition with export (EarMaster) | **EXISTS-DEEP** (export shallow) | Assignments, grading inbox, class heat map, parent digest (`src/cloud/teacher.ts:1-6`, `src/ui/TeacherLoop.tsx:1-5`). No CSV or PDF report. |
| A8 | Licks in 12 keys (Open Studio) | **EXISTS-DEEP** | Lick trainer in 12 keys with FSRS (`src/engine/licks.ts:1`, `:328`, `:426`). |
| A9 | Wait mode (Simply Piano) | **EXISTS-DEEP** | `src/ui/WaitMode.tsx:1-2`. |
| A10 | Daily missions (Yousician) | **EXISTS-DEEP** | Two quests a day (`src/engine/quests.ts:1-2`). |

### 2C. Product and learning-experience items (Area 2)

| # | Item | Status | Evidence |
|---|---|---|---|
| G1 | Practice journal and notes | **SHALLOW** | Practice log has no notes (`src/engine/practiceLog.ts:32-45`); the workout note is not saved (`src/ui/Workout.tsx:511`, `:564-565`); no per-take notes; no auto-journal. |
| G2 | Setting your own goals | **SHALLOW** | Template personal goals only (`src/engine/courseStart.ts:308-343`); piece target tempo. No free-form goal of tune, tempo, keys and date. |
| G3 | Teacher mode | **EXISTS-DEEP** | `src/cloud/teacher.ts:1-6`, `src/ui/TeacherLoop.tsx:1-5`, `src/ui/Classes.tsx`, `src/cloud/classes.ts`. |
| G4 | Repertoire list | **SHALLOW** | Curated four-tier road (`src/engine/repertoire.ts:1-10`, `src/ui/Repertoire.tsx:1-3`); own pieces (`src/ui/Pieces.tsx:1-2`); own charts (`src/ui/Charts.tsx:1-2`). There is no single "My tunes" list (head, changes, keys, tempo, readiness, spaced re-check) as proposed in `docs/research/TECH_AND_FEATURE_IDEAS.md` #3. Piece maintenance exists; tune maintenance does not. |
| G5 | Metronome | **EXISTS-DEEP** | Pendulum metronome, accents and mutes per beat, subdivisions, sounds, speed trainer, groove bank (`src/ui/Metronome.tsx:1-4`, `:23`). Missing: a **gap click** (random or fixed silent bars) and a click on 2 and 4 only. Drum drills cover the gap idea, but the tool does not. |
| G6 | Drone tool | **SHALLOW** | Voice degree-singing over a drone in **7 keys only** (`src/ui/Drone.tsx:11`, `src/engine/drone.ts:1-2`). No general drone (any of 12 keys, root–fifth, chord pad) for instrumental intonation, scale practice or modal improvisation. |
| G7 | Looping a hard spot | **EXISTS-DEEP** | A–B loop (`src/ui/SlowDown.tsx:1-2`); piece coach step-back loop on the bar with the error (`src/engine/piece/coach.ts:76`, `:100`); chart loops (`src/engine/charts.ts:144`, `:200`). |
| G8 | Slow-down | **EXISTS-DEEP** | Pitch-preserving speeds 0.5–1 (`src/ui/SlowDown.tsx:10`); WSOLA in My song (`src/ui/MySong.tsx:4`); slow replay of the call phrase (`src/ui/DrillTake.tsx:187-210`). |
| G9 | Play-along with a band | **EXISTS-DEEP** | Seeded band: walking bass, comping, drums (`src/engine/band.ts:1-6`); play-along backings (`src/engine/perform.ts:1-2`); solo chorus and improv studio (`src/ui/SoloChorus.tsx`, `src/ui/ImprovStudio.tsx`). Gap: the band does not *listen* (idea #4 in TECH_AND_FEATURE_IDEAS). |
| G10 | iReal-style chart practice | **EXISTS-DEEP** | Chart editor, styles, keys, tempo, loop (`src/engine/charts.ts:1-5`); iReal Pro link import (`src/engine/leadsheet.ts:5`, `:305`); 45 standards as chord charts (`src/engine/standards.ts`). See A6 for the per-chorus modes. |
| G11 | Exporting progress | **SHALLOW** | Full JSON dump (`src/ui/SettingsScreen.tsx:378`, `:937-942`); PNG share cards (`src/ui/Stats.tsx:1005`); parent digest link (`src/cloud/teacher.ts:96`). No readable report (PDF or CSV) of time, tempos, keys and pieces for a teacher, audition or exam board. |
| G12 | Offline use | **EXISTS-DEEP** | Service worker precaches the shell, samples and voice (`src/sw-template.js:2`, `:26-44`); progress is local-first. The AI coach and social features need a network (`src/cloud/ai.ts:1-3`). |
| G13 | Accessibility: screen reader | **SHALLOW** | 547 `aria-label`s and 139 `aria-live` / status regions across `src/ui`; TTS cues and rate settings (`src/ui/App.tsx:491-492`). Notation, staff and fretboard answers have no non-visual equivalent; there has been no screen-reader audit. |
| G14 | Accessibility: colour-blindness | **EXISTS-DEEP** | `cvd` setting (`src/storage/progress.ts:208-210`) switches mark colours (`src/ui/NoteViews.tsx:139`); 15 CSS hooks; trends never use colour alone (`src/ui/Trends.tsx:3`). |
| G15 | Accessibility: left-handed | **SHALLOW** | Guitar and bass neck and chord boxes flip (`src/storage/progress.ts:258`, `src/ui/Instrument.tsx:67-80`, `src/ui/ChordFinder.tsx:191`). No left-handed drum kit mapping (the owner tests drums on an e-kit). |
| G16 | Accessibility: text size and motion | **EXISTS-DEEP** | `textScale` (`src/storage/progress.ts:209`); `reducedMotion` follows the OS (`src/storage/progress.ts:165`); 57 reduced-motion hooks. |
| G17 | Hebrew / English parity | **EXISTS-DEEP** | `const he: Strings` is type-checked against `en` (`src/i18n/strings.ts:7`, `:961`); mini-lessons have 5,800 `en:` and 5,805 `he:` strings; push copy is bilingual (`supabase/functions/toneturn-streak-reminder/index.ts:16-27`); the AI writes natural Hebrew (`supabase/functions/toneturn-ai/index.ts:32-35`). |
| G18 | Advanced-player onboarding (placement) | **EXISTS-DEEP** | Placement 3.0: ranges, accelerating search (`src/engine/placement.ts:1-5`); playing level test by sections (`src/engine/drills/levelTest.ts:1-3`); course start offers it to "I play" players (`src/engine/courseStart.ts:4`). |
| G19 | Social layer | **EXISTS-DEEP** | Friends, compare (`src/ui/Compare.tsx:1-4`), duet streaks and nudges (`src/cloud/social.ts:240`, `:271`), leagues, community, bingo, rooms, groove-off. |
| G20 | Reminders | **EXISTS-DEEP** (copy issue) | User-chosen hour (`src/storage/progress.ts:167`, `:391`); hourly Web Push, one merged social push a day, quiet hours (`supabase/functions/toneturn-streak-reminder/index.ts:1-6`). The copy is streak and loss-framed with emoji, and nothing in it is about the plan ("Your Dm ii–V in B♭ is due"). |

---

## 3. Status counts

Totals across the 54 rows (P = 24, A = 10, G = 20):

- **EXISTS-DEEP: 33.** P1 P2 P4 P5 P6 P7 P8 P9 P10 P17 P18 P23 P24 · A1 A4 A5 A7 A8 A9 A10 · G3 G5 G7 G8 G9 G10 G12 G14 G16 G17 G18 G19 G20. Three of these carry caveats: P18, A7 and G20.
- **SHALLOW: 16.** P11 P12 P13 P14 P15 P16 P20 P21 · A6 · G1 G2 G4 G6 G11 G13 G15.
- **MISSING: 5.** P3 P19 P22 · A2 A3.

(G5 counts as DEEP, with the gap click noted as a sub-gap.)

---

## 4. Priority list

Ranked by the stated goal: measuring practice quality and time and tracking improvement for serious adult musicians.

| Rank | Gap | Why | Effort |
|---|---|---|---|
| **1** | **Measure active practice time everywhere** (P3, headline 1): add `durationMs` (active, idle-trimmed: pause on `visibilitychange` and after 60 s without input) to every `LessonResult`, drill take, game, My song and chart session. Fix the off-app block to book the measured time (`src/ui/App.tsx:2507`). | The app's core claim. Today the "Practice time" tile is self-report only. | S–M |
| **2** | **Practice-quality ledger** (P3): split each minute into *edge* (an item below its goal, with errors being fixed), *consolidation* (clean reps at goal), *run-through* and *review*, built from data the app already has. Show a weekly "quality minutes" figure and a ratio. | No competitor can do this; it turns the measurement into a product. | M |
| **3** | **Journal 2.0** (P16, G1, A3): save the workout note (fix `Workout.tsx:565`); add a note per take and per session; an auto-journal entry per day (what you played, the tempos gained, the key mastery change, the minutes by kind) with a one-line "what next" the player writes. | SRL reflection; Modacity parity; an input for the AI weekly summary. | S (fix) / M |
| **4** | **Streak re-alignment** (P18): count a streak day only with ≥ N measured minutes or one measured take, or offer a **weekly-target** mode (e.g. 5 of 7 days) with rest days. Rewrite pushes as plan-framed and emoji-free ("Your ii–V in D♭ is due for review"). | Research on minimum-viable sessions; memory notes on mature UI and measured practice only. | S |
| **5** | **Plateau detector** (P19): flag an item or skill with flat clean tempo or rating over ≥ 3 weeks *with* practice. Then offer a change: variability (a new rhythm or articulation), a step back to rubato, a chunk split, an over-tempo burst, or a different key order. Surface it in the profile and the AI weekly summary. | Ericsson's "OK plateau"; turns the profile into an intervention. | M |
| **6** | **"My tunes" repertoire tracker** (G4): one list across the curated repertoire, charts, pieces and standards, with per-tune readiness (head, changes in 12 keys, solo chorus, memorised) and FSRS re-checks. | Jazz players think in tunes. It links charts, the improv studio and the piece coach (TECH_AND_FEATURE_IDEAS #3). | M–L |
| **7** | **Take library and record-compare** (P21): keep the best and the latest audio or MIDI take per item (opt-in, on device), A/B them, add a self-rating *before* seeing the score (a calibration score), and send to the teacher. | Self-assessment accuracy research; the teacher loop. | M |
| **8** | **User-authored goals** (P15, G2, A2): a goal of tune or skill, a target (tempo, keys, a clean run) and a date, broken into weekly process goals; a weekly-minutes goal; the scheduler weights items by goal. | Locke & Latham; process-to-outcome goals. | M |
| **9** | **Performance mode** (P20): a recital take for any piece, tune or drill (one pass, no restart, recorded, count-in, optional simulated room noise and "audience"), a 60-second pre-performance routine, and a reappraisal line. A "performance readiness" score per tune. | Performance simulation research; audition and exam users (Bagrut). | M |
| **10** | **Drone, gap click and per-chorus cycles** (G6, G5, A6): a drone in 12 keys with root, root–fifth or a modal chord pad; a gap-click metronome; iReal-style "tempo +N / key up a fourth each chorus". | Cheap, expected by professionals; serves 12-key coverage. | S |
| 11 | Audiation before playing (P11): "hear it, sing the first note, then play" steps in technique and licks. | Mental-practice evidence. | S–M |
| 12 | Faded / summary feedback option for advanced players (P12). | Guidance hypothesis. | S |
| 13 | Readable progress report (G11): PDF / CSV of time, tempos, keys and repertoire. | Teachers, auditions, self-tracking. | S |
| 14 | Rep caps and break prompts (P22). | Health; dystonia risk. | S |
| 15 | Screen-reader audit plus left-handed drum mapping (G13, G15). | Accessibility. | M |

---

## 5. Game and motivation ideas grounded in the research

Each idea names the principle it rests on and the existing code it builds on. All are measured: none rewards mere
opening of the app.

1. **Rescue quests (spacing + loss aversion, used kindly).** When a mastered step turns silver
   (`src/engine/pathMastery.ts:20-21`), or an FSRS card's recall falls below 80 %, it becomes a "rescue" quest: one
   clean run brings it back, and doing it on the due day earns double. Framing: "Keep what you built", not "you are
   losing it". Builds on `quests.ts`, `fsrs.ts` and the silver refresh.
2. **Interleaved gauntlet (contextual interference).** A timed 8-item run that mixes one tune's ear item, its ii–V
   voicing, a lick in a random key, a BH scale move and a rhythm read. The score tracks the *delayed* retest (the next
   day's first try), not only the run itself, so players learn that the "harder" mode sticks. Builds on the
   checkpoint generator (`src/engine/path.ts:1276`).
3. **Me vs me a month ago (recording + competence).** A weekly card plays your take from 4 weeks ago next to today's,
   with the measured deltas (clean tempo, CV, intonation). The player guesses which is newer and how much better
   before the reveal (self-assessment calibration). Builds on `src/storage/takes.ts` and drill metrics.
4. **Calibration score (SRL monitoring).** Before each take the player predicts "clean / 1–2 slips / rough". The
   app keeps a calibration percentage; good judges of their own playing earn a quiet badge and can switch to faded
   feedback (idea 9). This trains the inner critic that teachers want.
5. **Twelve-key cycle chorus (variability + iReal parity).** A chart loops and moves up a fourth (or down a half step)
   each chorus. Keys you finish cleanly light the circle of fifths on the key map
   (`src/engine/analysis/keyMastery.ts`). A full circle on a standard is a "cycle crown" for that tune.
6. **Plateau breaker (handling plateaus).** When the detector finds a flat curve, it offers a 3-day "breaker" with
   one of: an over-tempo burst at +15 % for 4 bars, a rhythm displacement, a fresh key order, or rubato again.
   Completing it with a measured gain earns a "broke through" mark on the trend line (`src/ui/Trends.tsx`).
7. **Quality minutes league (deliberate practice, effort not level).** An optional weekly league scored on *edge* and
   *consolidation* minutes (§4 #2), not XP. Run-through minutes and quiz-spam count for little, which aligns the
   social engine with good practice. Builds on `league.ts` and course splits.
8. **Recital night (performance simulation).** A weekly opt-in "recital" for one piece or tune: one take, no restart,
   scored and kept as a card. Friends or a class can listen and leave one comment (teacher loop). Distributed,
   repeated exposure is the MPA-research recipe.
9. **Fade the scaffolding (guidance hypothesis).** A per-skill "pro mode" unlocked at Solid: feedback only at the end
   of a set (summary), or only when off by more than a bandwidth. A small multiplier rewards using it. Builds on
   `src/engine/aids.ts:64`.
10. **Inner-ear first (audiation).** A lick or phrase step where the line is shown but silent: audiate it, sing the
    first and last notes (mic check), then play. A "heard it first" streak per lick counts consecutive successes.
    Builds on the audiation topic and `licks.ts`.
11. **Seam hunter (chunking).** In the piece coach, seams between chunks become small boss fights. Joining the
    hardest seam cleanly at target tempo three days in a row "welds" it. Builds on `src/engine/piece/coach.ts`
    `seam` / `join`.
12. **Duet goal (relatedness + goals).** Two friends set the same measurable goal (e.g. "Autumn Leaves changes in
    6 keys by Friday"), and both progress bars are visible. It extends duet streaks (`src/ui/Duets.tsx`) from "both
    practised" to "both progressed".
13. **Weekly-target flame (streak without the minimum-viable trap).** The flame grows by measured minutes against a
    weekly target the player sets. Rest days are built in, so a missed day is not a break while the week is still
    reachable. This keeps the goal-gradient pull and drops the all-or-nothing loss.
14. **Rubato-to-tempo ladder race (slow practice made visible).** For each new item a five-rung ladder (free →
    quarters → start → mid → target). Climbing a rung only counts on a new day, which makes the two-day rule
    (`src/engine/drills/ladder.ts:28`) a visible, satisfying mechanic instead of a hidden gate.

---

## 6. Notes for whoever picks this up

- The quickest wins: two bug-level fixes (save the workout note at `Workout.tsx:565`; book measured minutes at
  `App.tsx:2507`) and the `durationMs` plumbing.
- Per the memory note "Everything connects": the time and quality ledger must feed the path, the map, XP, leagues,
  the level test and the workout.
- Per the memory note "Mature clean UI": the push copy is a remnant to clean. It uses emoji (🔥 ❄ ⚔️ 🎉) and loss
  framing.
