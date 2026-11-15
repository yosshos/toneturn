# SPEC-COURSES — separate courses instead of one mixed path

Approved by the owner on 2026-11-09. Design: the "Courses" row on the design canvas, with a phone switcher, a wide sidebar switcher and the structure board.

## The change

Today there is one learning path. It mixes every area by goal weights (SPEC-PATH, `src/engine/path.ts`), and the daily workout and Practice screen mix them the same way.

From now on the app has **courses**:
- A player has several courses but only one is active at a time.
- They switch courses from the course chip: the top bar on phone, the top of the sidebar on wide screens.
- Nothing from another course appears in the active course's path, daily workout or Practice screen.

## Courses

| id | Name (he) | What it holds |
|---|---|---|
| `ear` | שמיעה ותיאוריה | The pitch, time, memory and reading domains. No sung steps and no instrument-only (`forPlays`) steps. |
| `voice` | שירה | The voice domain, plus the sung steps from pitch and reading (sight-singing, singing intervals back). |
| `keys` | פסנתר וקלידים | The instrument domain with `forPlays: keys`. Also keys technique (SPEC-TECHNIQUE), reading at the keyboard, the piece coach, and harmony at the keys. |
| `guitar` | גיטרה | The same for guitar (SPEC-GUITAR-TECHNIQUE), including the fretboard topics. |
| `bass` | בס | The same for bass. |
| `jazz` | ג׳אז ואלתור | The `jazz` pack, the creative domain (improv), improv-rules challenges, lead sheets and standards. |
| ~~`exam`~~ | ~~בגרות ומבחני כניסה~~ | **0.67 (owner 2026-11-10): no longer a course.** Exam prep ("הכנה לבגרות") is a mode of the Ear course (`Settings.examPrep`): exam-goal path and workout weighting, mock exams first on Practice, an exam card and an exam-topic quest on Today. Old `exam` data migrates to Ear with the mode on (`migrateExamCourse`). |

**Still open:** `maqam`, `production`, `absolute` and `post-tonal` stay packs inside `ear` for now. Each can become its own course later.

## The four decisions (owner, 2026-11-09)

1. **Ear and theory is its own course.** Instrument courses hold only instrument-specific ear work, for example recognising a chord shape on the fretboard.
2. **One daily goal for the whole account**, like the streak. Minutes in any course count toward it.
3. **Existing players keep everything.** On first launch the mixed path splits into courses using `intake.goal` and `intake.plays`:
   - every player gets `ear`;
   - `plays` includes keys, guitar or bass → that instrument course;
   - goal `sing`, or voice in `plays` → `voice`;
   - goal `jazz` → `jazz`;
   - goal `exam` → `ear` with exam prep on (0.67).

   Each done step moves to the course that owns it. The active course is the one that matches the goal.
4. **Jazz and Bagrut are full courses**, not packs inside another course.

## Shared vs per course

| Shared (account) | Per course |
|---|---|
| Streak, daily goal, XP, league, friends | Path: units, checkpoints, reviews |
| Profile, avatar, settings, sound | Daily workout (SPEC-WORKOUT / SPEC-TODAY) |
| Tools: metronome, tuner, drone | Practice screen: the course's domains and games only |
| **Skill ratings** (`Ratings`), so evidence counts everywhere | Rank (pp–ff) and placement test |
| | Skill map, filtered to the course's skills |

Because ratings are shared, a player who masters intervals in `ear` gets the cautious ✓ (SPEC-PATH §6) on interval steps in `voice`, so nothing is repeated. The ✓ rules themselves do not change.

## Data

- `Settings.courses: CourseId[]` and `Settings.activeCourse: CourseId`.
- Path facts (done steps, test-outs, frozen units) are stored per course: `pathByCourse[courseId]`.
- `buildPath(input)` gets `course` as an input and filters the candidate steps by the course table above. Areas and goal weights then act inside the course.
- The daily workout and Practice read `activeCourse`. Games carry a `courses` tag, for example: Voice Flight → voice and ear; Rhythm Highway → ear, keys, guitar, bass; Truth or Bluff → ear and exam.

## Adding a course

"+ קורס חדש" opens a list of the courses not taken yet. Each one starts with a short placement test (SPEC-PLACEMENT, scoped to the course's skills), or the player can start from the beginning.

## Everything-connects checklist

Each course feeds its own path and map. XP, the league and the streak stay global. The level test is per course, and the workout belongs to the active course.

## Stages

1. Engine: `CourseId`, the course table, a course-aware `buildPath`, migration, and per-course path storage. Unit tests for the split and the migration.
2. UI: the course chip and switcher on phone and wide, a course-scoped Today, Path and Practice, and the "add course" flow with placement.
3. Games tagged by course, and the skill map filtered by course.
4. A crawl of every screen on phone and wide, checking that no screen still shows mixed content.

## Course membership (AUDIT-6 Stage A, 2026-11-15)

The rule lives in `inCourse()` (`src/engine/courses.ts`), with the jazz list in `path.ts` (`PACK_TOPICS`, `PACK_LEVELS`).

- **Instrument courses** (keys, guitar, bass, drums): every step whose `forPlays` names the instrument.
- **Voice**: every sung step (and the vocal ladders).
- **Jazz**: the jazz pack plus the improvising skill (licks, call and response, jazz repertoire). The jazz pack is jazz ear and jazz harmony:
  - swing feel, the blues on-ramp (`blues-ear`), shells and guide tones, comping;
  - rootless and upper-structure voicings, voicing types by ear;
  - the jazz grids (tritone subs and backdoor, the 12-bar jazz blues, the 32-bar AABA), bebop scales, jazz progressions, ii–V chains, reading a lead sheet;
  - Barry Harris, reharm and colour, jazz forms and jazz dictation.
  A mixed topic can send single levels to Jazz (`PACK_LEVELS`, for example `voicings:3–5`, `extensions:2–8`, `grid-dictation:5/7/8`). Its other levels stay in Ear.
- **Jazz also teaches the performed jazz families** (`JAZZ_LADDER_FAMILIES`): k-impro, k-lh, voicings, jazz, k-comp, k-solo (piano); g-impro, g-jazz, g-solo (guitar); b-walk, b-impro, b-swing (bass); d-jazz (drums); v-scat, v-standards (voice, only when the player sings). A player gets the families of the instruments they play. These steps keep the same step id in both courses. Their facts come from the measured takes, so the progress is shared and a result still counts for one course (`courseOfResult`).
- **Ear**: everything else that is heard, read or written. This includes expression (mood, dynamics, articulation, character: the ABRSM aural "features"), Nashville numbers, transposition, and melodic and rhythmic transformations. The `creative` area used to pull these into Jazz.
- **Game-only topics** (`TopicDef.gameOnly`: Name That Standard, Interval Sprint cells, melodic-minor modes, altered-chord reading) are never path steps. `stepCatalogue()` skips them, so the path is the same whether or not a game's module is loaded.

## Level placement (AUDIT-6 Stage A)

Each technique or vocal level sits on its course path at a rating for what it asks. The rating comes from `src/engine/levelPlacement.ts`, in this order:

1. **`LEVEL_PLACEMENT`**: curated per-level ratings, one table per instrument. Each entry cites its syllabus grade, and `G(grade) = 700 + 90·grade` (Debut 700, G3 970, G8 1420).
2. **Vocal levels**: placed from their items' mean rating (`voiceItemRating`). Each family keeps rising in its teaching order.
3. **Otherwise** the old index placement. Drums are staggered by family (`DRUM_STAGGER`), so the families no longer share the same rungs.

Other work streams add their own exported table to `PLACEMENT_TABLES`. `tests/pathShape.test.ts` guards every course: no gap over 150, a minimum density per band, the known misplacements in their grade band, a real Jazz beginner band, and a catalogue that doesn't depend on module load order.
