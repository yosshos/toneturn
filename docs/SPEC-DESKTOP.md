# SPEC — The 7th Sense on a computer (responsive desktop layout)

Owner, 2026-11-08: "On the computer the app is a narrow column in the middle — a phone app sitting on a desktop. It must fit the screen: a menu like desktop software (a full side menu with nested items, or a top menu by topic), and the look should change with the screen size."

Today: every screen is capped at `max-width: 720px` (`styles.css:76`, `arcade.css:485`), centred; navigation is a phone tab bar at the bottom (`TabBar`, Arcade.tsx) plus a slide-up menu sheet (Menu.tsx); dialogs are bottom sheets. Nothing changes with width except a few `clamp()` sizes.

## 1. Principles

1. **One app, three layouts**: the same screens and routes, laid out by width. No separate "desktop version" to maintain.
2. **Navigation becomes a sidebar** on wide screens: always visible, grouped, with nested items that open in place. That is how desktop learning software (Duolingo web, Coursera, Notion, Ableton's browser) is navigated — not with a bottom tab bar.
3. **Content gets columns, not stretched lines**: text stays at a readable measure (≈ 60–75 characters); extra width shows *more* (a side panel, a second column), never wider paragraphs or giant buttons.
4. **Exercises stay focused**: on a computer the exercise uses the width for the instrument (a wider keyboard, the full staff) and a side panel for progress; one screen, no scrolling (existing rule) — now also no wasted margins.
5. **Mouse and keyboard are first-class**: hover states, keyboard shortcuts for every exercise action, focus rings, right-click never needed.
6. **RTL-correct**: in Hebrew the sidebar is on the **right** (the start side); in English on the left. Use logical CSS properties (`inset-inline-start`, `margin-inline`), never left/right.

## 2. Breakpoints

| Name | Width | Navigation | Content |
|---|---|---|---|
| Phone | < 700px | bottom tab bar + menu sheet (today) | one column, full width |
| Tablet | 700–1099px | **rail**: a narrow icon column on the start side (icons + short labels), menu opens as a flyout | one column up to 760px, centred in the remaining space |
| Desktop | ≥ 1100px | **sidebar** 248px, full labels, groups, nested items | main column 760–960px + an optional **side panel** 300–340px |
| Wide | ≥ 1500px | sidebar | main + side panel, max total 1440px, centred |

Height matters for exercises: below 700px height, the exercise uses a compact header (see §5).

## 3. The shell on a computer

```
┌───────────────┬──────────────────────────────────────────────┬──────────────┐
│  SIDEBAR      │  TOP BAR: page title · search · streak · XP  │              │
│  logo         ├──────────────────────────────────────────────┤  SIDE PANEL  │
│  Today        │                                              │  (contextual)│
│  Path ▸       │   MAIN CONTENT (760–960px)                   │              │
│  Practice ▾   │                                              │              │
│    Songs      │                                              │              │
│    Technique  │                                              │              │
│    Games      │                                              │              │
│    Lessons    │                                              │              │
│  Progress ▸   │                                              │              │
│  Community ▸  │                                              │              │
│  ───────      │                                              │              │
│  Tools ▸      │                                              │              │
│  Check ▸      │                                              │              │
│  ───────      │                                              │              │
│  me · ⚙       │                                              │              │
└───────────────┴──────────────────────────────────────────────┴──────────────┘
```
(In Hebrew, mirrored: the sidebar on the right.)

### 3.1 Sidebar (replaces the tab bar and the menu sheet)
- **Sections** (top to bottom), each an icon + label, the current one highlighted:
  - Today
  - Path ▸ (units)
  - Practice ▾: Songs · Technique (piano / guitar / voice) · Games · Lessons · My pieces · Charts
  - Progress ▸: Skill map · Insights · Achievements
  - Community ▸: Friends · League · Duels · Class
  - divider
  - Tools ▸: Tuner · Metronome · Drone · Groove · Slow down · Mixer · Log
  - Check yourself ▸: Find my level · Mic & sound check
  - divider
  - the profile row (picture, name, level), then Settings.
- **Nested items**: a section with children shows a chevron. Clicking the label opens the section's page; clicking the chevron expands the children *in place* (accordion, one open at a time, remembered). The open section follows the current route.
- **Collapsible**: a button at the bottom collapses the sidebar to the tablet rail (icons only, labels as tooltips); the choice is remembered per device.
- **Badges**: the dots of today's tab bar (something new) appear next to the item; counts where they exist (friend requests, assignments).
- The whole Menu sheet content moves here; on desktop there is no menu sheet.

### 3.2 Top bar
- Page title (and a breadcrumb inside a section, e.g. Practice › Technique › Piano).
- **Search** (Ctrl/⌘ K): jump to any topic, lesson, song, tool or setting by name — a desktop staple; it reuses the topic titles, glossary and songbook indexes.
- On the end side: streak, XP/gems, notifications bell, the account.
- What is in the phone header today (install / update, what's new icon) moves here.

### 3.3 Side panel (contextual, desktop and wide only)
A narrow column that shows what helps *next to* the main content, instead of below it:
| Screen | Side panel |
|---|---|
| Today | streak & week, the daily challenge, friends' activity |
| Path | the selected unit's lessons and its In-depth text |
| Practice / Technique | the selected drill's settings and last results |
| Progress | Insights summary (Ear Index, top 3 findings) |
| Lessons | the glossary terms of the open lesson |
| Exercise | progress through the session, the placement meter, the topic strip, Hint / Repeat / Skip |
On tablet and phone the panel's content goes back to where it is today (inline).

## 4. Pages on a computer

- **Grids instead of lists**: hub cards (Practice), songbook, games list, lessons and achievements become responsive grids (`repeat(auto-fill, minmax(220px, 1fr))`).
- **Two-pane screens** (list ↔ detail), the standard desktop pattern:
  - Settings: categories on the start side, the open category on the other (instead of the accordion);
  - Lessons: topics list ↔ the lesson;
  - Songs: list ↔ the song;
  - My pieces: library ↔ setup;
  - Community: friends ↔ profile.
- **Path**: the road keeps its shape but is centred in the main column; the unit details open in the side panel instead of a bottom sheet.
- **Dialogs**: bottom sheets become centred dialogs (max 560px) with a backdrop; Esc closes; focus is trapped.
- **Tables** where data is tabular (league standings, practice log, records): real tables with sortable columns on desktop; cards on phone.
- **Charts** (Insights, Progress) get their natural width; the sparklines become full charts with axes and hover tooltips.

## 5. Exercises on a computer

- Layout: question and answers in the main column (max 760px); the instrument (keyboard, staff, fretboard) can take the full main width; progress, meter, topic strip and controls in the side panel.
- **Keyboard shortcuts** (shown once as a hint, and in a "?" overlay):
  - answers: `1`–`9`;
  - `Space`: repeat (or tap the beat in rhythm reading — the existing rule);
  - `Enter`: Continue;
  - `C`: Compare;
  - `H`: Hint;
  - `S`: Skip;
  - `Esc`: Pause.
- Hover: answer buttons and keys show hover states; the on-screen keyboard plays on click (where allowed) and maps the computer keyboard (A-W-S-E-D-F-T-G-Y-H-U-J-K) as an alternative to MIDI.
- Buttons inside exercises keep their exercise style but at desktop size (not stretched to 960px; answer grids of up to 4 columns).

## 6. Visual system adjustments
- **Type scale** by breakpoint: base 16px on phone, 15–16px on desktop with denser line height for lists; headings a step smaller than on phone (no giant phone headings on a big screen).
- **Density**: list rows 44px on phone, 36–40px on desktop; card padding a step tighter.
- **Pointer vs touch**: `@media (hover: hover) and (pointer: fine)` adds hover states and shrinks hit targets that are oversized for a mouse; touch laptops keep touch sizes.
- **Scrollbars**: thin, themed; the sidebar scrolls on its own.

## 7. Implementation plan (phased, each shippable)

1. **Shell** (largest win): CSS grid shell with breakpoints; `Sidebar` component built from one navigation model (the same model the tab bar and the menu sheet use, so the three never drift); top bar; tablet rail; collapse toggle; RTL. Remove the 720px caps behind a `--main-max` variable per breakpoint.
2. **Pages**: grids for hubs and lists; dialogs instead of sheets on desktop; Settings two-pane; Path details in the side panel.
3. **Exercises**: side-panel layout, keyboard shortcuts with the "?" overlay, hover states, computer-keyboard piano.
4. **Polish**: search (Ctrl K), tables, full charts, density and type scale tuning, screenshots at 1280×800, 1440×900, 1920×1080 in both languages, light and dark.

**Checks for every phase**: e2e at 375×780 (phone, unchanged), 820×1180 (tablet) and 1440×900 (desktop) in he + en; no horizontal scroll; exercises fit one screen at 1366×768; keyboard-only navigation works; RTL mirror correct.

## 8. Open questions for the owner
- Sidebar vs top menu: this spec picks the **sidebar** (scales to our ~25 destinations; a top menu fits ~7). OK?
- Should the computer-keyboard piano (A–K keys) be on by default on desktop, or opt-in?
