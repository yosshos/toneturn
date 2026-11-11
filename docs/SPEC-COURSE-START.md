# How a course starts (SPEC-COURSE-START, draft for the owner, 2026-11-11)

**Problem.** Opening a course today offers "Find my level" first: a test before any music. For a newcomer it is
intimidating; for an experienced player it is a cold exam; and in the instrument courses it opened the ear test (fixed
in b61f4db — Find my level now follows the course). The owner's direction: a course should start with a motivating
experience and a few real tries, and only then a level test.

## Principles
1. **Music in the first 60 seconds.** The first thing the player does is make (or hear) real music with the app — never a
   form, never a test.
2. **A first win, measured.** The first session ends with something the player actually did, measured and celebrated
   (only measured practice counts — the win is real, so it can be easy but not fake).
3. **Teach before testing.** Placement is woven into the first sessions (adaptive probe steps), and an explicit level
   test is offered *after* the player has tasted the course — or skipped to by an experienced player.
4. **The destination is visible from day one.** The course shows where it leads (the repertoire ladder: foundations →
   blues → standards → advanced; for prog: grooves → odd meters → …), so simple first material reads as a first step,
   not as the point of the app (positioning: sophisticated music, pop as on-ramp).
5. **Per course, always.** Everything below is the active course's own: its taste, its probes, its level test.
6. **Never lose progress; one screen each; mature tone; no emoji.**

## The first session (≈ 5 minutes)

| Step | What happens | Time |
|---|---|---|
| 1. Welcome card | One screen: what this course gets you ("You'll comp a jazz blues by ear and hand"), the destination ladder, and one question: **"Where are you?"** — *New to this* / *I play a bit* / *I play well*. | 15 s |
| 2. Setup as part of the music | The instrument check is a musical moment, not a settings page: piano — "play any key" (MIDI or mic detects it, a chord answers you); guitar/bass — "pluck the low string" (the tuner shows it, the band answers); drums — kit wizard short form; voice — "sing any note" (Toni echoes it); ear/jazz — headphones/volume check with a chord. | 30 s |
| 3. The taste lesson | A short, satisfying lesson at the self-reported level, **with the band** (see below). It teaches one thing and lets the player do it immediately. | 2–3 min |
| 4. First win | A measured result ("You held the groove 16 bars, 92% on the beat"), Toni celebrates, first badge "First session", XP, streak day 1. | 20 s |
| 5. What next | Three choices, one highlighted by the self-report: **Continue the path** (default for New / A bit), **Find my level** (default for "I play well"), **Set a daily goal** (minutes + reminder). | 15 s |

### The taste lesson per course (examples — own material, legal sources)
| Course | New | A bit | Well |
|---|---|---|---|
| Ear & theory | Hear high/low and "home" note, then sing/tap it back over a groove | Major vs minor chords over a band | ii–V–I by ear, name the chord qualities |
| Piano | Play a 4-note melody (C–D–E–G) over a soft band, notes lit on the keys | Left-hand roots + right-hand triads I–IV–V | Shell voicings over a blues in F with the band |
| Guitar | Two chords (Em, A) with a simple strum over the band | Power chords / a riff in time | Drop-2 shells on a ii–V |
| Bass | Roots on the beat with the drummer | Root–5th over a progression | Walk two bars of a blues |
| Drums | A basic rock groove with the band, 8 bars | Groove + one fill landing on 1 | Shuffle or funk with ghosts |
| Voice | Sing a 3-note phrase back (Toni models it) | Sing a short public-domain tune with the band | Sing a standard's opening phrase (PD) / scat 2 bars on chord tones |
| Jazz & improv | Hear and tap swing vs straight | Comp/play guide tones on a blues | Trade 2s with the band on a blues |

## Sessions 2–3: placement woven in
- The path's existing **probe steps** (first step of a skill never measured = short adaptive probe) carry the placement:
  each new session includes 1–2 probes in different skills; a right answer jumps the difficulty up, a wrong one
  settles it. The player never sees "test" — they see normal steps that move fast if they know the material.
- After 2–3 sessions (or ~10 probe items) the course has a provisional level per skill and the path **skips ahead**
  automatically where the player is clearly ahead ("You know this — 3 steps marked ✓"), with the cautious ✓ rule.

## The explicit level test
- Offered (not forced) on the path card and Home: after the first session for "I play well", after session 3 for the rest,
  and any time from Settings.
- **Per course:** Ear → ear placement; Piano / Guitar / Bass / Drums → the course's playing test (technique probes + the
  course's ear-through-the-instrument items); Voice → range + pitch + a sung phrase; Jazz → harmony/changes by ear + a
  comping probe.
- 3–6 minutes, adaptive, resumable, ends with the same first-win style result and the path rebuilt.

## Returning players and course switches
- A player adding a second course gets the same flow for that course (steps 1–5), but setup is skipped when the
  instrument was already checked, and the ear level is reused where the courses share skills (ratings are shared).
- A player who abandons the taste lesson keeps it in "continue" (never lose progress).

## Motivation pieces
- The destination ladder on the welcome card and the path header ("Next goal: your first standard").
- A **personal goal** (optional, one tap): e.g. "Comp Autumn Leaves' changes in 6 weeks" → the path shows progress toward it.
- First-week rhythm: day 1 taste + win; day 2 a new piece of the same skill + first probe; day 3 the first "real music" moment (a full chorus with the band); then the level test offer.
- Toni appears on the welcome, the first win and the day-3 moment (never on every screen).

## What changes in the app (for implementation)
- Onboarding (src/ui/Onboarding.tsx, App.tsx onboarding handlers): no automatic placement after choosing a course; open the welcome card + taste lesson instead.
- A `courseStart` state per course in settings (welcome seen, self-report, taste done, sessions since start, test offered/done).
- Taste lessons: one generated lesson per course × self-report (content table above), using existing engines (band, drills, topics).
- Home / Path: the first-run CTA becomes "Start: <taste lesson>" with "Find my level" as the secondary button for "I play well".
- Placement offer timing per the rules above; Find my level per course (done).
- Tests: per-course first-run flow e2e (welcome → setup → taste → win → next), resumable.

## Open questions for the owner
1. Self-report wording and whether "I play well" should open the level test right after the taste (recommended) or keep the path default.
2. The personal goal: optional one tap (recommended) or skip for now.
3. Day-1 daily-goal and reminder prompt: on the first win screen (recommended) or later.
