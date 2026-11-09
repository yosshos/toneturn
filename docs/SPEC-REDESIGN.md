# SPEC-REDESIGN — "v2" design language, everywhere

Approved by the owner on 2026-11-09 after a slide-by-slide review. The source of truth is the design canvas at https://claude.ai/artifact/S964kpkybEwXQYNeGXnatY (private to the owner). It opens on a Tour of every screen.

**Rule: no leftovers.** Every screen, sheet, exercise, celebration and string moves to v2. The last stage is a crawl that hunts for old tokens and classes on phone and wide, in Hebrew and in English.

## Language
- **Colours:**
  - ink `#1E1033` and paper `#FBF7FF`;
  - purple `#6D28D9` and lilac `#A78BFA`;
  - lemon `#FFD43B`, used only for "active / now";
  - one colour per domain: sky `#3AB8FF` ear, pink `#FF5FA2` rhythm, teal `#12C9B4` voice, lemon play, lilac harmony, tangerine `#FF8A3D` theory;
  - no green, no gradients, no glow.
- **Shapes:**
  - outline 2.5px ink;
  - radius 18–26;
  - a hard offset shadow of 4px, down and toward the inline-start;
  - on press, the button sinks into its shadow like a piano key.
- **Type:** Secular One for headings, big numbers, main buttons and chord letters; Rubik for everything else; Noto Music only for ♭ ♯ ♮ 𝄞 𝄢. Note and chord names are always LTR-isolated (`<bdi>`).
- **Motifs:**
  - a tilted note head is the recurring shape (nodes, symbols, medals, play button);
  - the staff appears as texture;
  - progress is shown as waveform bars;
  - levels are dynamics pp–ff; leagues are chord tones from 1 to 13;
  - lives are breath marks; a streak is measured in bars, and a streak freeze is a fermata;
  - review is shown as a repeat sign, and the end of a lesson as a final barline with a fermata.
- **Mascot: Toni,** an eighth note. The flag is both a hand and a mood meter. There are 12 states (idle, listen, think, hint, correct, streak, wrong, close, wow, missed-you, draw flag, bye). Faces are built from parts: 5 eyes, 4 brows, 7 mouths. Every move is tied to a sound, and there is a reduced-motion version.
- **Copy:** questions are a few words; feedback is one line; detail sits behind "למה?" and appears only on wrong answers. No emoji anywhere.
- **Icons:**
  - our note-head glyph set for exercise types and domains;
  - 123 avatar icons (IconOven MIT plus 10 of our own);
  - logo A (ear, F-clef, 7 and a sound wave) in ink line.
- **Slogan:** "לשמוע. להבין. לבצע."

## Stages (each one ships as a release)
1. **Foundation.**
   - Tokens for light (paper, the default) and dark (ink), plus high contrast.
   - Font loading: add Noto Music, drop Fraunces and Frank Ruhl.
   - Base components: button, card, chip, tabs, icon-button, sheet, toggle.
   - `<Toni state>`, the `<Glyph kind>` set, and a `<Note>` / `<bdi>` helper.
2. **Shell.**
   - Top bar: course · streak · menu, with update/install as small icons.
   - Bottom nav, and a sidebar with the course switcher and shared section.
   - Menu sheet and search (Ctrl K).
3. **Courses engine (SPEC-COURSES):**
   - course-aware path, workout and practice;
   - migration of existing players;
   - the switcher sheet and "add course" with a placement test;
   - the new opening flow (splash → welcome → taste → courses → level → start → save after the first lesson).
4. **Core loop.**
   - Today and the staff path.
   - Exercise shell with the compact feedback and "Why?".
   - The answer ladder (names → name+hint → pick a staff → two notes → write), mixed per skill.
   - Recap.
5. **Practice per course:** technique and take results, piece coach (real grand staff), songs, sing-along, vocal, improv studio, perform, lead-sheet library and the full-window lead-sheet player, exams, learned, mini lessons.
6. **Progress and social:** per-course progress, insights (confusion map, groove fingerprint, circle of fifths), achievements, month review, what's new (sheet on phone, dialog on wide), league, streak and shop, plans, friends, compare, duel, class (teacher and student), live room, daily, ghost, parent digest.
7. **Games and celebrations:** Voice Flight, Truth or Bluff (the note rides the arc), Highway, Rush, the puzzles, Peak Hunter, Tune-up, Echo; all celebrations; Toni's states wired to events and sound.
8. **Tools and states:** tuner, metronome, drone, slow-down, mixer, groove trainer, practice log; mic, offline, empty, install, error.
9. **Crawl:**
   - every route on phone and wide, in Hebrew and English (LTR mirrors; staff, keys, neck and charts stay LTR);
   - no old tokens, no emoji;
   - axe contrast check;
   - e2e.

## Open decisions
- **Colour themes:** what happens to the current themes and to the colour themes sold in the shop (see the question to the owner, 2026-11-09).
- **Instrument photos in Sound settings:** they would need licensed images. Line drawings are used for now.
