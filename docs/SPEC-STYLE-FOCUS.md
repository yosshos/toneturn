# Style focus: one setting instead of six, every style open from the start (draft for the owner, 2026-11-22)

**What the owner said (2026-11-22):** style focus is the direction, and every style is open from the start. A thorough specification.

**Builds on:** SPEC-JAZZ-NEIGHBOURS (the styles and their content), SPEC-JAZZ-FOLD (jazz folded into the courses), SPEC-DAILY-WORKOUT, SPEC-PATH-TODAY-PRACTICE.

## 0. What exists today: six overlapping settings

| Setting | Where | What it does |
|---|---|---|
| `jazzFocus[]` | per course | jazz first, opens the jazz pack |
| The jazz pack (`jazzOpenWhy`) | per course | jazz content closed until background / climbing / an instrument choice |
| `drills.emphasis` | piano | both / classical / jazz |
| `guitarAddOns` | guitar | genre add-ons (rock, blues, metal, funk, jazz, classical, fingerstyle, flamenco, Latin…) |
| `guitarStyle` | guitar (old, bass still reads it) | a single genre filter |
| `bassTrack` | bass | jazz / prog / both |

The player doesn't understand why something is open or closed, and the code checks six places. Style focus replaces all of them with one model per course.

## 1. The model

```
styleFocus: { [course]: { main: StyleId; also: StyleId[] /* up to 2 */ } }
```

**The styles (StyleId):**

| Style | Courses |
|---|---|
| **jazz** (the default; the app is jazz first) | all |
| **brazil** (bossa, samba, baião) | keys, guitar, bass, drums, voice |
| **afrocuban** (clave, montuno, tumbao, cha-cha, mambo, songo, 6/8; Latin jazz) | keys, guitar, bass, drums |
| **soul** (soul-jazz, gospel, funk-jazz, boogaloo) | keys, guitar, bass, drums, voice |
| **neworleans** (second line, stride, boogie-woogie, the blues) | keys, bass, drums |
| **classical** | keys, guitar, voice |
| **pop** (pop / rock, the on-ramp, as in the positioning) | all |
| **prog** (the existing bass track) | bass, drums |
| Guitar add-ons: **fingerstyle, flamenco, metal, country, reggae** | guitar (as "also" only) |

**The Mediterranean touch** is not a style of its own (owner). It is included in **jazz** as odd meters and the hijaz colour, and the existing drum levels stay as they are.

## 2. "Open from the start" (owner)

- **Every style is open in every course from the first day.** There is no pack that closes content.
- **Difficulty is set by the level, not by locking:**
  - a beginner who chose bossa gets beginner bossa (bass on 1 and 3, two chords);
  - a beginner who chose jazz gets beginner jazz (shells, a slow blues).
- **The jazz pack is removed as a lock.** What decided whether it was open (background, climbing) now only decides **the starting level** in jazz harmony.
- **Focus changes the weight, not the access.** Content in a style that isn't the focus is still visible and playable; it just comes up less in the daily workout and the path.

## 3. Choosing the focus

- **When the player chooses an instrument** (alongside the two self-ratings, ear and reading, 1–5): "What do you want to play?"
  - chips: up to 3 choices; the first is the main style;
  - **jazz pre-selected first,** and it can be changed;
  - for an experienced player, a short explanation beside each style ("bossa nova, samba").
- **In settings:** the same chips, per course, changeable at any time. Progress is never lost; only the weights change.
- **The teacher** can suggest a focus for a student (an assignment "focus: Latin jazz"). The student approves.

## 4. What focus does in each place

**Weights (the main style / an "also" style / everything else):**

| Place | Effect |
|---|---|
| **The daily workout** | Within technique, the style block (§5) draws about **60%** from the main style, **30%** from the "also" styles and **10%** from the rest (exposure). Within the improvisation share: the band and the tune in the main style in about 60% of sessions. **Jazz focus keeps the jazz core:** with another main style, the basic jazz harmony (ii–V–I, guide tones) is still at least 25% of improvisation (the app is jazz first). |
| **Technique** | The per-key matrix gets **a style block (H)**: comping patterns and grooves of the focus styles in every key. "Weakest first" weights by the shares above. |
| **Repertoire** | The default tab opens on the main style; the next-goal card follows it ("your third bossa"); "All styles" is one tap away. |
| **Improvise** | The band's default style = the main style; improvisation levels and rules by style ("on the clave", "a samba phrase"); "today's improvisation" in the main style. |
| **Licks** | The context filter opens on the main style; "today's lick" prefers the focus styles. |
| **Path** | The core units stay in their order. **Style units** of the main style are interleaved every 2–3 core units; the "also" styles come later; the rest stay open in Practice and are not pushed in the path. |
| **Ear** | The style-recognition game focuses on the focus styles (and every style appears now and then). |
| **Level test** | The core as today, plus one short check in the main style (a groove / comping pattern) to place the starting level in it. |
| **Skill map** | No new axis (styles aren't skills). Instead, **a "My styles" strip:** each focus style with its status (cells closed in its block, pieces closed). |
| **Leagues / XP** | Unchanged. XP is the same in every style. |

## 5. The style block in the per-key matrix (H)

- **Each style brings rungs** like the other blocks:
  - bossa comping in the key;
  - a montuno on the key's ii–V;
  - a tumbao on the key's I–IV–V;
  - a gospel progression in the key.
- **Open at the tier** like everything else (beginner style rungs exist from T0).
- **Not every style suits every instrument.** Each rung is in the courses where it makes sense (montuno on piano and guitar; tumbao on bass).
- **Drums have no keys.** On drums the style block is the grooves by tempo, under the same weighting.

## 6. Migrating the old settings (no users yet; the owner only)

| Old | New |
|---|---|
| `jazzFocus` includes the course | main: jazz |
| `emphasis: 'classical'` | main: classical, also: jazz |
| `emphasis: 'both'` | main: jazz, also: classical |
| `guitarAddOns` | also: up to 2 of them (the rest stay open, unweighted) |
| `bassTrack: 'prog'` | main: prog, also: jazz |
| The jazz pack open by background / climbing | the starting level in jazz (§2) |

The old fields are kept read-only for one version, then removed.

## 7. Order of work (inside the styles stage, after BUILD-PLAN-2026-11)

1. The model, the migration, and one function `styleWeight(course, style)` that every place reads. Remove the locks (the jazz pack as a lock).
2. The choice at the instrument (chips) and in settings; the teacher's suggestion.
3. The weights in the daily workout, the path (interleaving) and the default in each place.
4. The style block (H) in the matrix, filled as the styles are built (Brazilian and Afro-Cuban first).
5. The "My styles" strip on the skill map; the check in the level test; the recognition game.

## 8. Questions for the owner

1. **The jazz pack as a lock:** remove it (everything open, with difficulty set by level), as "open from the start" implies? This changes the SPEC-JAZZ-FOLD decision that jazz opens by background.
2. **How many styles in focus:** a main one plus up to 2 more (proposed), or a main one only?
3. **A floor for jazz:** with another main style, keep basic jazz harmony at least 25% of improvisation (proposed), or let the player decide entirely?
