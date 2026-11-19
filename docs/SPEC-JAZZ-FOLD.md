# SPEC-JAZZ-FOLD — the Jazz course folds into the other courses

Owner decision, 2026-11-19. Modelled on how the Exams course became the Ear course's exam-prep mode (0.67, `migrateExamCourse`).

## 1. What moves where

| Was in the Jazz course | Goes to | Gate |
|---|---|---|
| The jazz pack's ear and theory topics (`PACK_TOPICS` / `PACK_LEVELS` in path.ts: swing, blues on-ramp, shells and guide tones, Barry Harris by ear, reharm and colour harmony, voicing types, ii–V chains, jazz forms, dictation…) | **Ear & theory**, as its top levels | jazz pack |
| The jazz lessons (`jazz-welcome`, `jazz-1`, `jazz-2`, `six-dim`) | Ear | jazz pack |
| The creative area's improvising skill without an instrument (licks `licks:jazz:*`, call-and-response, improv theory), `transcribe:jazz:*` | Ear (theory of improvising) | jazz pack |
| The jazz bonus games (`bonus:jazz:*`: Voicing Spy, Name That Standard, Reharm Spotter, Border Control, Which Brother, Comp Caller, Guide-Tone Runner, Crossword, Hold the Note, Dark Side, Third Jump, Which Pair, Enclosure, 5-4-3-2 Call) | Ear | jazz pack |
| Jazz repertoire (`rep:jazz:*`) | Ear | jazz pack |
| The performed jazz families (`JAZZ_LADDER_FAMILIES`: k-impro, k-lh, voicings, jazz, k-comp, k-solo; g-impro, g-jazz, g-jblues, g-solo; b-walk, b-impro, b-swing; d-jazz; v-scat, v-standards, v-jazz1) | stay in their instrument / voice course only (they were shared before) | jazz pack (see §2 for the exact family list) |
| Jazz-pack steps played on an instrument (`forPlays`) | that instrument's course (they were shown nowhere before: the instrument courses stripped the pack) | jazz pack |
| Jazz games on the Practice tab (incl. the Mirror game) | Ear's rows; the jazz-only ones hide while the pack is closed | jazz pack |

Step ids do not change (`bonus:jazz:…`, `rep:jazz:…`, `licks:jazz:…` keep their names), so every ✓ and star moves with the facts.

## 2. Gating rule — "is the jazz pack open in this course?"

`jazzOpenIn(settings, course)` (src/engine/jazzFold.ts) is true when any of:
1. **Background**: the packs (`pathPacks`, else `defaultPacks(track, plays, goal)`) include `jazz` — i.e. the intake put the player on the *student* or *pro* track, or the goal is jazz. Explorer / hobby ("no background / beginner") do not get it at the start.
2. **Jazz focus** is on in that course (`Settings.jazzFocus` lists the course).
3. **Auto-opened** by climbing (`Settings.jazzOpen` lists the course).
4. An explicit instrument choice: piano emphasis "jazz", a guitarist who ticked the jazz add-on themselves, a bassist on the jazz track.

A step is a *jazz step* (`isJazzStep`, courses.ts) when its pack is `jazz`, or it is the creative area's improvising skill, or it is a level of a jazz technique family (`JAZZ_FAMILIES`):
- piano: the families of style `jazz` except `accomp` (Alberti / pop / boogie hands) and with `voicings-1`, `voicings-2` (triads, root-position 7ths) left free;
- guitar: the jazz add-on families (g-jazz, g-jblues, g-theory, g-harris, g-harrisline, g-ctone, g-color, g-tpair, g-keys, g-bebop, g-phrase, g-cmel, g-tune, g-ctx, g-solo, g-gig, g-cmarr, g-solojazz, g-hlfast);
- bass: the jazz-track families (`BASS_TRACK` = jazz) plus b-walk and b-swing;
- drums: d-jazz, d-brush, d-trade; voice: v-scat, v-standards, v-jazz1, v-barry.
Generic improvising habits (k-impro, g-impro, b-impro) stay open for everyone.

Closed pack → `eligible()` drops every jazz step (path, workout, Practice rows) and the Find-my-level ladders drop their jazz rungs (`placementNoJazz`); the instrument level tests drop their jazz strand.

## 3. Auto-open on climbing

When a course's level (courseSocial `courseLevel`, the pp–ff dynamics) reaches **mf (rating ≥ 1100)** and the pack is closed there, the course is added to `Settings.jazzOpen` (persisted) and a one-time notice says so.

Why mf: 1100 is where the *student* track starts its path (`START.student`), i.e. the level at which a player with an intermediate background gets jazz from day one; it is also the top of the "developing" section (`sectionOf` < 1150), above which most of Ear's non-jazz harmony (seventh chords, modes, progressions) is passed and the jazz top levels are the next material. A beginner who earns that level has earned what an intermediate player starts with. Never locked out: jazz focus opens it at any time too.

## 4. Jazz focus ("מיקוד ג׳אז")

A per-course switch (Ear, keys, guitar, bass, drums, voice) beside the exam-prep switch on the Path and Practice screens and in Settings. On:
- opens the jazz pack in that course regardless of background;
- **Ear** uses the `jazz` goal (area weights and the chords / cadences / modes boost);
- every course: jazz steps are preferred when a unit picks among near steps (the same pull a unit theme has), so jazz arrives earlier — never before its prerequisites (curriculum flow unchanged);
- the workout's game rotation leads with the jazz games; the Practice tab lists the jazz rows first.

Settings: `jazzFocus?: CourseId[]`.

## 5. Migration (`migrateJazzCourse`, courses.ts, run in `withCourses`)

A player whose `courses` include `jazz`, whose active course is `jazz`, or who has parked jazz facts:
- `jazz` leaves every list; Ear is added if missing; the instrument courses stay;
- the jazz path's facts and kept steps merge into Ear's (`mergeFacts`; the same step ids). Ladder-step facts come from measured takes, so instrument progress is untouched;
- jazz focus turns on for Ear and for every instrument / voice course they have, and those courses are added to `jazzOpen` (so switching focus off later keeps the jazz steps they did on the path);
- `courseStart.jazz` and `openers.course.jazz` move to Ear when Ear has none; league / XP history needs nothing (results recorded as `jazz` read as Ear through `normCourse`);
- a pending one-time notice (`Settings.jazzNotice = 'fold'`): "The Jazz course is now part of your courses, as jazz focus".

Old data that still says `jazz` anywhere (results, friends' `course_levels`, `normCourse`, `courseOf`) reads as Ear and never crashes.

## 6. Everything that listed Jazz

Course switcher, onboarding course choice, the `jazz` goal (→ Ear + jazz focus), course openers (Ear / instrument / voice openers gain a jazz station only while the pack is open), course start tastes, Practice rows, workout games (`WORKOUT_GAMES.jazz` → Ear + instrument lists), Stats radar, COURSE_AREAS (Ear gains `creative`), duel sets, badges, leagues per course, e2e and unit tests.
