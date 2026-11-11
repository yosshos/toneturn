# Repertoire (0.70, built 2026-11-11)

Owner concept (2026-11-10): the niche is sophisticated music. Simple songs are the on-ramp, shown as the first step on a visible road to standards. This file describes what was built.

## What the player sees

- **Practice → Repertoire** (he "רפרטואר") replaces the "Songs" row. It is now in **every** course: ear, jazz, voice, keys, guitar, bass and drums. The tile's status line shows the next goal, for example "Your first standard · 2/5".
- **List screen** (one phone screen, 390×844):
  - A **Next goal** card with a bar and "Next: <item>". Tapping it opens that item.
  - Four **tier tabs**: 1 Foundations, 2 Blues & progressions, 3 Standards, 4 Advanced. Each tab shows learned/total.
  - The tier's items. Each row is labelled by **what it teaches** ("Three chords: I–IV–V", "Minor ii–V–i", "Rhythm changes, A section"), with the tune title underneath, and a mark: ✓ learned, a % when started, empty when new.
  - Instrument courses (keys, guitar, bass) also get a link to the full public-domain songbook. This is the old Songs list: melody or chords, filtered by the chords you know. Its Back now returns to Repertoire.
- **Item page**:
  - Tier and "Standard" kicker, what it teaches, and status ("Best 64% · learned at 80%").
  - **Where it leads**, with a chip to that item. For example: "This progression is the start of Autumn Leaves (Cm7–F7–B♭maj7)" or "II7 going to V: bars 3–4 of Take the A Train". When an item has no "leads to", the page shows "Comes from" chips instead.
  - The **ways to practise**. The first is the main one.
  - The "Listen to the original" row (Spotify / YouTube) for standards.
  - A legal line: public-domain melody / chord changes only / our own material.
- **Today**: a **Next repertoire goal** card under the daily-goal and league cards (hidden in exam-prep mode). It opens the next item.

## Tiers and content (src/engine/repertoire.ts)

| Course | 1 Foundations | 2 Blues & progressions | 3 Standards | 4 Advanced |
|---|---|---|---|---|
| keys | Twinkle (I–IV–V), Saints (I–I7–IV), Jingle Bells (II7), O Tannenbaum (ii–V7–I), Canon (vi, iii), Greensleeves (minor) | 12-bar blues, I–vi–ii–V, ii–V–I all keys, minor ii–V–i, jazz blues, dorian vamp | Autumn Leaves, Fly Me to the Moon (A), Blue Bossa, A Train, So What, Misty (A), Satin Doll, All the Things You Are | Rhythm changes A, whole rhythm changes, Bird blues, Stella, Solar, Giant Steps |
| jazz | progressions by ear, guide-tone lines | blues, jazz blues, ii–V–I, minor blues | Autumn Leaves, Blue Bossa, So What, Satin Doll, Song for My Father (A), Misty | rhythm changes, Bird blues, Lady Bird, Giant Steps |
| ear | pop progressions, sing tunes back | the blues, ii–V–I, turnarounds by ear | read Autumn Leaves' chart, chord functions, tritone subs and backdoor | rhythm changes, which blues, Coltrane changes, odd-time grooves |
| voice | Twinkle, Ode to Joy, Morning Line (ours), Greensleeves, all with the band | Blue Window (our 12-bar head), roots of I–IV–V, scat guide tones | Saints (jazz head), Swing Low (jazz), Corner Light, Slow Harbor, Rio Gray | Fast Tracks (rhythm changes A), scat chord-tone landing |
| guitar | Twinkle, Oh! Susanna, Saints, Greensleeves (strummed chords / melody), strumming patterns | blues + shuffle, minor blues, shells ii–V–I, jazz blues | Autumn Leaves, Blue Bossa, Fly Me to the Moon, So What, A Train | rhythm changes, Bird blues, Giant Steps, 12-beat compás |
| bass | Twinkle, Saints, Ode (melody on the neck), roots of a chart | 12-bar blues walked, I–vi–ii–V, ii–V–I all keys, jazz blues | Fly, Autumn Leaves, Blue Bossa, A Train, So What, Misty | rhythm changes, Bird blues, Stella, Giant Steps |
| drums | rock beat, groove and fill | shuffle, slow blues 12/8, swing ride | swing a standard (Autumn Leaves form), bossa (Blue Bossa), jazz waltz, samba | up-tempo rhythm changes, trading 4s, 9/8, 7/8 and 10/8 |

- Tiers 3–4 are flagged `standard` and count towards the goal and the badge. Tiers 1–2 never do (a test enforces this).
- **Legal** (docs/research/STANDARDS_LEGAL.md):
  - Melodies come only from the public-domain songbook (`content/songbook.ts`) or our own voice songs (`content/voiceSongs.ts`).
  - Standards are our chord-only charts (`engine/standards.ts`), shown with their real titles.
  - Grooves and topics are our own material.

## Everything measured: what each way opens (src/engine/repertoireDrills.ts, App `openRepWay`)

| Way | Opens | Result |
|---|---|---|
| `song` | the songbook song as a drill (piano melody / chords / both, guitar strummed chords or melody, bass melody) | clean takes ÷ takes |
| `chartDrill` | the standard's changes as a piano voicing / comping / stride drill (`chart~std:<id>~…`) | clean takes ÷ takes |
| `bassStd` | the standard walked on the bass (b-walk `standard`, its own key and feel; new export `bassStandardSpec`) | clean takes ÷ takes |
| `level` | a technique level as a queue (drum grooves, guitar jazz / rhythm / impro, bass styles) | clean takes ÷ takes |
| `vocal` | a vocal level of the voice course (F13 songs with the band, F14 standards, F15 scat) | the session's first-try share |
| `topic` | a lesson topic at a level (ear, theory, singing) | the session's first-try share |
| `chart` | Charts with the standard loaded: play along with the band and improvise | the improvisation take's score |

- Each finished practice is stored as a `LessonResult`:
  - `lessonId` = `rep-<course>-<item>`, with the course attached.
  - The score is stored as first-try out of 10.
- Because it is a normal result, the history, streak, daily goal, league XP and per-course split all see it. Drill XP is counted take by take (`xpCounted`). A chart take adds score × 12 XP.
- Best scores are read back from `progress.lessons` (`repResults`). An item counts as learned at 80%.

## Goal (repGoal)

1. **Your first standard**, in 5 steps: 2 Foundations + 2 Blues & progressions + 1 standard. "Next" points to an item you already started before a fresh one.
2. **Five standards** (tier 3).
3. **Your first advanced piece**.
4. **The whole repertoire**.

## Connections

- **Quests**:
  - `rep1` "Practise a repertoire piece" in every course.
  - `rep2` "A piece from Blues & progressions" in keys, guitar, bass and jazz.
  - Both are appended to the course rotations; the drums rotation keeps the rhythm quest's spacing.
- **Badges**: three per course in Specials, shown in that course:
  - first standard (never for simple tunes)
  - five standards
  - an advanced piece

  They come from `BadgeInput.repertoire`, built by `repertoireOf(progress)` in `rankBadges.ts`, and use a new lead-sheet glyph `special:rep`.
- **Today**: the Next repertoire goal card.
- **Navigation**:
  - Route `#/repertoire` is added to the command palette as "Repertoire". The old Songs entry is now "Songbook".
  - The sidebar maps the route to Practice.
  - Back from a practice returns to the item page.
- **Per-course XP**: every result carries its course.

## Not built / follow-ups

- **"Listen to the original"**: rendered. `src/content/references.ts` arrived with 0.70.2, so an item that refers to a standard (`item.ref.kind === 'standard'`) shows the `ListenOriginal` row (compact). Songbook tunes and our own material have no entry, so nothing is shown for them.
- **Path steps pointing to repertoire items**: not added to the path generator. The hooks are in place (`repItem`, `repLessonId`, and `openRepWay` in App), so a path step kind `rep` can open an item and read its result.
- A guitar way that comps a specific standard's chart does not exist. Guitar standards use the closest guitar levels (shells / drop-2 / guide tones / bossa) plus the Charts play-along.
- Ear and jazz "standards" items use topics that draw from many standards, not only the named one. The named chart is offered as the play-along.
