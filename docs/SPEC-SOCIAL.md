# Social version (0.42) — profile, privacy, duet streaks, nudges

Owner, 2026-11-07. Builds on what exists: friends by code (`toneturn_friendships`), practice days on the server
(`toneturn_streak_days`, `toneturn_practised_on`), the evening push reminder (edge function
`toneturn-streak-reminder`), weekly league, area boards, duels and online rooms.

Principles: minimal app buttons and little text (SPEC-TODAY §7); everything connects (badges, stats, streak); every
permission is enforced on the server too, never only hidden in the app.

---------------------------------------------------------------------------------------------------------------------

## 1. Profile: nickname, flag, picture

### 1.1 Nickname
- **When:** first entry, inside the welcome flow, before Find my level. Existing players: one small row on Today,
  once ("Choose a nickname"), until they pick one.
- **Suggestions:** 4 at a time, 🎲 for more, or type your own. Pattern: a musical word + a playful noun + a number
  (2–3 digits): `CodaFox42`, `FermataPanda7`, `SyncopatedOtter19`, `BluesyBassoon88`, `AllegroLlama5`, `MinorMango12`.
  Lists of ~150 musical words (tempo, form, harmony, ornaments, genres, instrument parts) × ~150 nouns, in English
  (nicknames are Latin-only, so everyone can read them on a shared board).
- **Rules:** 3–20 characters, letters / digits / `_`; case-insensitive unique; an offensive-word filter (several
  languages, also inside words) on suggestions and on typed names.
- **Unique:** signed in → checked live against the server; suggestions shown are already free (the server reserves
  nothing until saved). Not signed in → kept on the device, checked at sign-in; if taken, the player picks again.
- **Change:** Settings → Account. At most once every 30 days (so boards stay readable).

### 1.2 Country flag
- Suggested from the device (time zone, then language) — no location permission, nothing sent. A searchable list
  of countries to change it; "No flag" is an option.
- Flags are SVGs bundled with the app (emoji flags don't render on Windows), loaded only on screens that show them.

### 1.3 Picture
- **Instrument icons** (the 3D avatars are shelved): ~30 SVG icons in the app's style — electric / acoustic /
  classical guitar, bass, grand / upright piano, keys / synth, drums, cajón, violin, cello, double bass, trumpet,
  trombone, saxophone, clarinet, flute, oud, harmonica, ukulele, microphone, headphones, note, treble / bass clef,
  metronome, tuning fork, turntable. Each on a background colour from 8 → hundreds of combinations.
- **Upload a photo** (optional): gallery or camera → a round crop like WhatsApp: drag to move, pinch / wheel / slider
  to zoom. Only the cropped circle is kept (256×256 WebP, ~20 KB); the original never leaves the device. Signed in →
  Supabase Storage (bucket `avatars`, path `<uid>.webp`); otherwise on the device until sign-in. "Remove photo" goes
  back to the icon and deletes the file.
- Shown as a circle with the flag at its lower edge, next to every name: Friends, leagues, area boards, duels,
  online rooms, the class roster; a profile chip in the menu and on Progress.

## 2. Settings → "Privacy & friends" (new category)

| Setting | Options | Default |
|---|---|---|
| Who sees my photo | friends / everyone / no one (icon only) | friends |
| Show me on leaderboards and leagues | as my nickname / anonymous ("Player" + icon) | nickname |
| Show when I'm online | on / off | on (friends only) |
| Who can send me friend requests | everyone / only with my code / no one | everyone |
| Who can challenge me (duels, rooms) | friends / everyone / no one | friends |
| Who can nudge me | friends / no one | friends |
| Quick messages in games | everyone / friends / off | everyone |
| Don't disturb during practice | on / off — challenges and nudges wait until the exercise ends | on |
| Notifications: challenges, friend requests, nudges, duet streaks | each on / off | on |
| Blocked players | list with Unblock | — |

**Messages in games:** no free chat (moderation, young players). Quick messages and reactions only:
"Good luck!", "Nice one!", "Good game!", "Rematch?", 👏 🔥 🎵 😅.

**Block** (from any profile, challenge, invite, nudge or board row): a blocked player can't challenge, invite, nudge,
friend-request or join a room with me, and doesn't appear in my lists (friendship and duet streak end).
**Report** (same places): offensive nickname / photo / behaviour → stored for review; a reported photo is hidden for
the reporter at once.

## 3. Duet streak (friend streak)

A streak you keep **together** with a friend: a day counts only if **both** of you practised. Named for music —
two players, one line.

- **Who:** accepted friends. Up to **5** active duets per player. Start: "Start a duet" on a friend → the friend
  accepts (one tap; the invite waits 7 days).
- **A day counts** when both practised on their own local calendar day (the same rule as the personal streak:
  `toneturn_practised_on(user, day, tz)`). The duet starts at 1 on the day both have practised after accepting.
- **Freeze:** a day is covered for a player whose personal streak freeze covered it (one freeze protects both their
  streaks). No separate duet freezes.
- **Breaks** when a day passes that isn't covered for both. **Repair** within 2 days: either partner can repair it
  with gems (same price as the personal repair, 400); both get "repaired by X".
- **Today status** (per duet): both practised 🔥🔥 · you did, waiting for them 🔥· · they did, waiting for you ·🔥 ·
  neither yet. The partner's status updates when they finish (realtime, else on open).
- **Milestones:** 3, 7, 14, 30, 50, 100, 200, 365 — a celebration for both (the badge unlock overlay) and a badge
  family "Duets" (Duet 7, Duet 30 "Steady Duo", Duet 100 "Old Bandmates", Duet 365 "Lifelong Duo" …), feeding the
  badge count, stats and the personal streak sheet.
- **End:** either partner can end a duet (quietly, no notification beyond the duet disappearing); restarting needs a
  new invite and starts from 0.
- **Where shown:** the Friends tab, top: a row of up to 5 duet circles (picture + flag + number, the flame state
  above); tap → the duet card (both histories as a two-row calendar, best length, nudge, end). The streak sheet
  (🔥 on Today) lists duets under the personal streak. Today shows nothing extra — at most a dot on the Friends tab
  when a duet is waiting for you.
- **Reminders:** the evening push (existing reminder hour) mentions a duet at risk: "Your 12-day duet with
  CodaFox42 is waiting for you 🔥". At most one reminder per evening in total.

## 4. Nudge

- **What:** a one-tap poke to a friend who hasn't practised today. From the Friends list, a duet circle, or a
  friend's row on a board.
- **Messages** (pick one, no free text): 🎵 "Time to practise!" · 🔥 "Don't break our duet!" (only with a duet) ·
  👋 "Miss you on the board" · 🎹 "Bet you can't beat my score".
- **Limits:** one nudge per friend per day; only to friends who haven't practised today; respects "Who can nudge me",
  blocks and Don't-disturb. Server rate-limited.
- **Receiving:** a push (if on) "CodaFox42 nudged you: 🎵 Time to practise!" and one small row on Today ("👋 CodaFox42
  · 🎵") that disappears when tapped or after practising.
- **Credit:** if the friend practises within 12 hours of a nudge, the nudger sees "✓ it worked" and it counts toward
  a "Good Friend" badge family (1, 10, 50 successful nudges).

## 4b. Share an achievement (owner, same day)

When a player **finishes a unit**, **reaches a new rank** in an area, **earns a badge**, hits a **streak / duet
milestone** or **beats a personal best**, the celebration has two small buttons (minimal, not mega):

- **👥 Tell my friends** — posts to the friends' activity in the app: a row in their Friends tab ("CodaFox42 finished
  Unit 4 · Harmony 🎉") with 👏 reactions (one tap, counted back to the player). Respects privacy (friends only) and
  blocks. No push by default (a setting turns achievement pushes on).
- **↗ Share** — the system share sheet (Web Share API; copy-to-clipboard fallback) with a ready message and an
  image card:
  - Text, one line + link, per achievement, en / he, e.g. "I just finished Unit 4 — Harmony in The 7th Sense 🎹 Come
    practise with me:" · "Gold III in Rhythm & time 🥁 — can you beat me?" · "30 days in a row on The 7th Sense 🔥
    Join me:".
  - Link: the app URL with the player's friend code (`?add=CODE`). Opening it offers "Add CodaFox42 as a friend" after
    install / sign-in, and a duet invite if they like.
  - Image card (1080×1080 PNG drawn in the app): the badge or rank crest, the achievement line, the nickname, picture
    and flag, the app logo. Attached when the platform can share files; otherwise text + link.
- Offered once per achievement on its celebration; available later from the badge / rank in Progress.
- Everything connects: friends who join through your link count toward a "Band Leader" badge family.

## 5. Server (Supabase)

- `toneturn_activity (user_id, kind, payload jsonb, created_at)` + `toneturn_cheers (activity_id, from_user)`;
  friends read only their friends' rows (blocks respected).

- `toneturn_profiles` add: `nickname` (unique on `lower(nickname)`), `nickname_changed_at`, `country` (ISO 3166
  alpha-2), `avatar_icon`, `avatar_color`, `avatar_photo` (storage path or null), `privacy` jsonb (§2 values).
- `toneturn_blocks (blocker, blocked)`; `toneturn_reports (reporter, reported, kind, note, created_at)`.
- `toneturn_duets (a, b, status pending/active/ended, invited_by, started_day, best, created_at)` with `a < b`;
  current length computed from `toneturn_practised_on` + freeze days (a function, cached per day).
- `toneturn_nudges (from_user, to_user, day, message, created_at, worked_at)`; unique (from_user, to_user, day).
- Storage bucket `avatars`: write only `<own uid>.webp`; read according to the owner's photo setting (friends /
  everyone) through a signed-URL function.
- All actions via security-definer RPCs that check friendship, blocks and privacy (as the friends functions do).
- Push: the reminder edge function also sends nudges (immediately) and duet-at-risk lines (evening).

## 6. Everything connects

Duet days and nudges feed badges (Duets, Good Friend), stats (duet days, best duet), the streak sheet and the
Friends tab dot. Nicknames, flags and pictures appear on every board and in every multiplayer screen.

## 7. Order of work

1. Profile (nickname + suggestions + filter, flag, icons, photo crop) and the "Privacy & friends" settings.
2. Blocks, reports, permission checks on the server for challenges / invites / friend requests.
3. Duet streaks (server, Friends tab, streak sheet, milestones, badges, evening reminder).
4. Nudges (server, push, Today row, credit + badges).
5. Quick messages in duels and rooms.
6. Share an achievement (§4b): friends' activity + 👏, the share sheet with message, link and image card.

---------------------------------------------------------------------------------------------------------------------

## 8. After the review (docs/research/SOCIAL_REVIEW.md, ~30 apps) — changes adopted

**Added before anything else (safety foundation):**
- **Age gate:** birth year asked once (welcome flow / first social action). Under 13 (16 in the EU) → young-player mode:
  no photo upload (icons only), nickname visible only to friends and their class, friend requests by code only,
  quick messages friends-only, no external share sheet, challenges / nudges only from friends. (Duolingo, Lichess kid
  mode, Khan Kids, chess.com.)
- **Nickname everywhere:** boards, leagues, rooms, duels and classes show only the nickname — never the Google name
  (today `display_name` may be a real name). Classes may additionally show a teacher-set name.
- **Push budget:** at most one social push a day plus the practice reminder, merged ("CodaFox42 and 2 friends nudged
  you"), with quiet hours (21:00–08:00 local, adjustable). Nudges no longer push "immediately" — they join the budget
  (the in-app Today row is immediate). Built before any new push source.
- **Report + block in one step**, with automatic actions: 3 independent reports reset a nickname to a generated one,
  2 hide a photo until reviewed; a small admin list of open reports. Score sanity checks on the server for boards.

**Changed in this spec:**
- §2 privacy: one preset first — **Open / Friends only (default) / Private** — with the detailed rows under
  "Advanced". "Show when I'm online" is dropped. Photo visibility keeps "everyone" for adults (owner: the user
  decides), never for young players.
- §4 nudges: softer texts ("🎵 Practice time?", "🔥 Our duet is waiting", "👋 Come back to the board"); "Bet you can't
  beat my score" becomes a real **challenge link** (below).
- §4b sharing: "Tell my friends" becomes automatic, friends-only milestone posts (finish a unit, new rank, duet
  milestone) with 👏 — no button to remember (Strava: close friends' activity drives practice). The external ↗ Share
  stays as designed (owner's request), hidden in young-player mode.
- §3 duets: a free automatic repair when the server missed a day (Duolingo's 2025 friend-streak bug lesson).

**Added (should):**
- **"Beat my score" challenge link:** after any exercise / game, send a friend the same items (seeded, as duels
  already are); both scores show side by side. Async, no live presence needed.
- **Weekly friend quest:** a co-op goal with one friend (e.g. 150 XP together, or 5 days each) for a chest of gems and
  a badge. Co-op suits beginners and kids better than rankings.
- **Profile card:** nickname, picture, flag, 3 pinned badges, area ranks, duet count; "compare skill maps" with a
  friend.
- **Teachers:** a weekly class board the teacher can hide, a class-wide goal, and class-only safe mode.

**Later:** bands of up to 8 (small groups with a shared goal), a seasonal community goal, a light referral reward
("Band Leader"), ensemble challenges (each friend sings a harmony part; played back synthesized, never raw voice).
**Not doing:** one-way follow, free chat or comments, raw-audio sharing, global all-time boards, anything pay-to-win.

**Build order (replaces §7):** 1. safety foundation (age gate, nickname-only display, push budget) → 2. profile
(nickname, flag, icons, photo crop) + privacy presets → 3. block / report + auto actions → 4. duet streaks →
5. nudges → 6. quick messages → 7. milestone posts + ↗ share → 8. challenge link → 9. friend quest → 10. teacher
class features.
