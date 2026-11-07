# Social version review (before building SPEC-SOCIAL)

Research, 2026-11-07. Reviews `docs/SPEC-SOCIAL.md` against ~30 learning, music and fitness apps. Our current
social features: friends by code, weekly XP league (chord ladder), friend board with stats comparison, area ranks,
duels, online rooms vs bots and friends, daily challenge, ghost race, teacher classes, and the evening push.

Evidence quality: Duolingo's blog and Strava's study are first-hand. Many other details come from help centers
or third-party guides. "Not found" means we found no social feature, not that there is none.

---------------------------------------------------------------------------------------------------------------------

## 1. Apps reviewed

| App | Relevant social mechanics (and what backfired) | Source |
|---|---|---|
| **Duolingo** | Friend Streak: up to 5 shared streaks, preset nudges. +22% daily-lesson completion for learners with at least one. The biggest drop-off is sending the first invite. | [blog](https://blog.duolingo.com/product-lessons-friend-streak/), [friend streak](https://blog.duolingo.com/friend-streak/) |
| Duolingo | Friends Quests: weekly co-op goal (XP / perfect lessons, 5 days), random friend pairing, preset nudges, can gift an XP boost, opt-out toggle. Bugs in 2025 broke year-long streaks, and users were furious. | [blog](https://blog.duolingo.com/friends-quests/), [bug report](https://piunikaweb.com/2025/11/05/duolingo-friend-quest-bugged/) |
| Duolingo | Feed with fixed "Celebrate" reactions on milestones. In 2026 the feed was mixed with strangers' posts; users stopped reading it and asked for "friends only". | [blog](https://blog.duolingo.com/friends-social-features/), [Android Authority](https://androidauthority.com/duolingo-random-strangers-cluttering-social-feeds-3694884/) |
| Duolingo | Under-13: profile private, no search or follow, and nudges, challenges and quests only with followers. Teachers can switch leagues and friend requests off for a class. Guilt-trip pushes are a meme, with anecdotal churn ("flooded, stopped opening"). Pushes are rationed by a bandit with a recency penalty. | [Common Sense](https://privacy.commonsense.org/evaluation/duolingo), [policy](https://conductatlas.com/platform/duolingo/duolingo-privacy-policy/child-interactive-features-restricted-to-followers-only/), [UXP](https://www.universityxp.com/news/2025/7/25/we-havent-seen-you-in-a-while-duolingos-passive-aggressive-strategy-for-keeping-users-hooked), [KDD'20](https://research.duolingo.com/papers/yancey.kdd20.pdf) |
| Duolingo | Duolingo Score and Year-in-Review share cards. The quest card names both friends ("Nico and I completed…"). | [score](https://blog.duolingo.com/duolingo-score/), [2020 review](https://blog.duolingo.com/duolingo-2020-year-in-review) |
| **Chess.com** | Block from the profile menu (stops messages, challenges, friend requests, matching), and "Report + block" in one step. Safe Mode turns off chat, messages and comments. Under-age players need parental consent and are steered to ChessKid. Clubs with club matches, Vote Chess and a Clubs League. Fair Play closes about 100k accounts a month. | [block](https://support.chess.com/en/articles/8609264-how-can-i-block-another-user), [report](https://support.chess.com/en/articles/8562517-how-do-i-report-someone), [child safety](https://support.chess.com/en/articles/16208488-how-does-chess-com-help-keep-children-safe), [clubs league](https://www.chess.com/news/view/announcing-chess-coms-official-clubs-league), [fair play](https://www.chess.com/news/view/100k-accounts-closed-anti-cheating-systems-improve) |
| **Lichess** | Kid mode removes all communication. "Who can challenge or message me": never / friends / all. Puzzle Racer has private link races (up to 10). Lichess says "where there is a leaderboard, there is cheating". Teams for kids require kid mode. | [kid mode](https://lichess.org/blog/VStlbikAAK0yJ2UC/new-features-kid-mode-simuls-and-more), [racer](https://lichess.org/blog/YFOLzhMAACIAarsp/new-feature-puzzle-racer), [kids team](https://lichess.org/team/young-peoples-chess-club) |
| **Simply Piano / Guitar** | No friends. Family plan with up to 5 profiles on one account, which counts as social for households. | [help](https://piano-help.hellosimply.com/en/articles/6816433-learn-with-your-family-multiple-profiles) |
| **Yousician** | Song leaderboards (My level / Global / Friends), Weekly Challenge boards, follow model; profile must be public to use social. | [leaderboards](https://support.yousician.com/hc/en-us/articles/208014795-Song-scoring-and-leaderboards), [social](https://support.yousician.com/hc/en-us/articles/201682871-Social-tab) |
| **Melodics** | Daily 5-minute goal and streak. Trophies keep accumulating after a missed day. No friends found. | [streaks](https://support.melodics.com/en/articles/6777043-what-are-streaks) |
| **Flowkey, Skoove, Tenuto / musictheory.net, Perfect Ear** | No social features found. These are single-player tools. | [Fender/Flowkey search](https://equipboard.com/items/flowkey) |
| **Complete Ear Trainer** | Game Center / Play Games leaderboards per chapter and level, 25 achievements, "challenge friends". | [App Store](https://apps.apple.com/app/id1012455471) |
| **EarMaster Cloud** | Teacher dashboard: class and personal assignments, results visible at once, export. | [cloud](https://www.earmaster.com/products/ear-training-sight-singing/earmaster-cloud-edition.html) |
| **Fender Play** | Community lives in a Facebook group (office hours, performance videos), streaks in the app, a chord-change speed challenge against your own best. | [community](https://play-support.fender.com/hc/en-us/articles/44538080307739-What-is-the-Fender-Play-Community-and-how-do-I-join) |
| **Musora / Pianote** | Forum with a "student progress thread", feedback on uploaded playing, monthly challenges, live Q&A. Slow teacher review caused complaints. | [FAQ](https://faq.musora.com/article/1279-how-do-i-join-the-members-only-facebook-groups), [reviews](https://www.shopperapproved.com/reviews/Musora.com/product/Pianote+Membership/79348450) |
| **Smule** | Duets (sing with strangers or with recordings). Minimum age 13 (US) / 16 (EEA). Unkind comments, and strangers seeking duets with children are the main parent warnings. | [Common Sense](https://www.commonsensemedia.org/app-reviews/smule-the-1-singing-app), [privacy](https://smule.zendesk.com/hc/en-us/articles/16043986315924-How-to-manage-your-privacy) |
| **Busuu** | Peer correction: native speakers correct your writing and speaking, or you can choose friends. Quality is uneven, and some submissions never get answered. | [help](https://help.busuu.com/hc/en-us/articles/16746012938001-How-do-I-get-other-learners-to-correct-my-exercises), [review](https://mezzoguild.com/busuu-review) |
| **Babbel / Memrise** | Babbel has almost no social features. Memrise removed friends and leaderboards (2024) and narrowed to its own courses. | [Memrise help](https://memrisebeta.zendesk.com/hc/en-us/articles/29599764770705-Can-I-add-or-follow-my-friends-on-Memrise) |
| **Brilliant** | Weekly XP leagues of 30. Friends and profiles are "being explored", so it runs leagues with no friends. | [leagues](https://help.brilliant.org/en/articles/6399120-leagues-faq) |
| **Mimo** | Weekly leagues (top 10 promote), emotes on the leaderboard, friend challenges. | [help](https://support.mimo.org/hc/en-us/articles/24330086777874-What-is-the-Mimo-Leaderboard-and-how-does-it-work) |
| **Khan Academy / Kids** | Under-13: parent or teacher creates the account. The child shares only username and progress with a teacher. No forums or profile info. Parents can approve or deny teacher access. | [help](https://support.khanacademy.org/hc/en-us/articles/202487460-If-my-child-is-under-age-13-what-login-options-are-there-), [Common Sense](https://privacy.commonsense.org/evaluation/khan-academy) |
| **Quizlet** | Quizlet Live: random teams race in class (join by code). Classes with shared sets. | [Quizlet Live](https://techcrunch.com/2016/04/12/quizlet-creates-a-game-for-groups-in-the-classroom-quizlet-live/) |
| **Kahoot** | Live games plus assigned async challenges. The friendly nickname generator (two words, 3 spins, ~800 combos) blocks rude names. Teachers complain they cannot hide the leaderboard in assignments. | [nicknames](https://kahoot.com/blog/2017/11/09/generate-funny-nicknames-players-live-kahoots/), [assign](https://support.kahoot.com/hc/articles/360039411334) |
| **Lumosity / Elevate** | Percentile against your age group (needs birth year). Little friend play. | [help](https://lumositybeta.zendesk.com/hc/en-us/articles/31133254146199-Can-I-see-how-I-compare-to-other-Lumosity-members) |
| **Photomath** | No social features (a solver, not practice). Not verified this session. | — |
| **Strava** | Kudos on every activity. A Radboud study found more kudos means more running, but the activity of close club friends mattered more than kudos. Private Group Challenges (≤25 friends, 1–365 days), clubs, segments. Social-comparison stress is reported. | [study](https://runningmagazine.ca/?p=91520), [group challenges](https://www.techradar.com/news/huge-strava-update-lets-you-challenge-friends-in-mini-competitions-heres-how) |
| **Peloton** | High-fives during class ("Here Now") and on the feed. Tags filter the leaderboard to your group (school, team, city). | [blog](https://www.onepeloton.com/blog/peloton-community-features), [tags](https://www.pelobuddy.com/demo-tutorial-and-faqs-for-pelotons-new-tag-leaderboard-community-feature/) |
| **Headspace** | Buddies see each other's minutes and send a reminder. "Do it together" existed only as a Snapchat mini (parallel, not synced). | [Healthline](https://www.healthline.com/health/mental-health/headspace-review), [Snapchat mini](https://www.axios.com/2020/07/20/snapchat-launches-meditation-feature-with-headspace) |
| **BeReal** | One prompt a day, friends only, and you see friends' posts only after you post. Late posts are labelled, not blocked. | [help](https://help.bereal.com/hc/articles/15416869159197) |

**Patterns:**
- Music-learning apps are socially thin. Simply, Flowkey, Melodics and Skoove are solo, and community sits in Facebook groups (Fender, Musora). The space is open, and the winning mechanics come from Duolingo, Strava and chess.
- What works: small, mutual, cooperative loops (friend streak, co-op quest, kudos from close friends) plus one weekly league.
- What backfires: guilt and too many pushes, strangers in feeds, free chat and comments with minors, global boards (cheating), and a single bug that kills a long shared streak.

---------------------------------------------------------------------------------------------------------------------

## 2. What our spec already covers well

- **Duet streak = Duolingo Friend Streak**, including the cap of 5, one-tap accept, shared freeze logic, milestones and a quiet end. This is the single best-evidenced mechanic (+22%).
- **No free chat; preset quick messages and reactions only.** This matches Lichess kid mode, chess.com Safe Mode and Kahoot, and avoids Smule's comment problem.
- **Mutual friends by code, no search.** Safer than follow (Duolingo under-13 rules, Duolingo feed backlash).
- **Block from every surface, and blocking ends the friendship and duet.** Matches chess.com.
- **Generated nicknames from a musical word list, plus a filter.** Kahoot proved friendly generators prevent rude names. Ours also teach vocabulary.
- **Server-enforced permissions through RPCs.** Not just hidden buttons.
- **Share link with `?add=CODE` and an image card.** Duolingo's own lesson: the first invite is the bottleneck.
- **Nudges are preset, limited to 1 per friend per day, and credited ("✓ it worked").** Headspace and Duolingo use preset nudges, and our credit loop is a nice touch.
- **"Everything connects"**: duet days and nudges feed badges and stats.
- **Existing pieces that already cover "suggestions"**: async duels (seeded), the ghost race, the friend stats comparison, class rosters with streaks, and the monthly area challenge.

---------------------------------------------------------------------------------------------------------------------

## 3. Gaps and additions

| # | Addition | Who does it | Why for us | Effort | Priority |
|---|---|---|---|---|---|
| A | **Age gate and Young-player mode.** Ask for birth year once, in the welcome flow. Under 13 (16 in the EU): no photo upload, icon only. Boards show the nickname only to friends and class, and "Player" elsewhere. Quick messages are friends-only. Friend requests need a code. No online status. Achievement share sheet is off (in-app friends' activity only). Teachers can switch boards off per class. | Duolingo, Khan, Lichess, chess.com, Smule age floor | Ear training is common in kids' music lessons, and teachers are a channel. Israel's privacy law, COPPA and GDPR-K all apply once photos and contact exist. Cheap to do now and expensive to retrofit. | M | **must** |
| B | **Notification budget.** At most **1 social push per day** in total, plus the reminder (2 max). Quiet hours 21:00–08:00 local (kids) or after the reminder hour. Merge items into one push ("CodaFox42 and 2 friends nudged you"). Never push for 👏. Our spec says nudges push "immediately", which conflicts with "one reminder per evening". | Duolingo bandit with recency penalty, BeReal (1 a day), Duolingo guilt backlash | Duets × 5 + nudges + challenges + requests can mean 8 pushes a day, and push opt-out is permanent on the web. | S | **must** |
| C | **Report flow with outcomes.** "Report + block" in one step. The reason list includes "seems younger than 13 / unsafe". Auto-action: after 3 distinct reports on a nickname, it resets to a generated one and the player must re-pick; after 2 reports a photo is hidden for everyone until reviewed. A small admin view (Supabase table plus a page). | chess.com, Lichess | The spec stores reports but nobody reads them. Automatic actions keep it safe without daily moderation by the owner. | S–M | **must** |
| D | **Real-name leak check.** Today `display_name` can come from the Google account. Boards, rooms and duels must show only the nickname. A real name is shown to accepted friends only if the player turns it on. | — | Spec §1 adds nicknames but doesn't say what happens to `display_name`. That is the biggest privacy hole for minors. | S | **must** |
| E | **Friend quest (weekly co-op).** Each week, pair with one friend (or a duet partner) for a shared goal such as "300 XP together" or "40 perfect intervals together", with a progress bar for both, a reward (gems + a quest badge) and the existing nudges. | Duolingo Friends Quests, Strava group challenges | Cooperation suits beginners and kids better than ranking. It uses data we already have (week XP) and gives a reason to nudge that isn't guilt. | M | **should** |
| F | **Async challenge link ("Beat my score").** From any game result, ↗ sends the exact seed. The friend plays the same items, and both see the result. Our duels already have seeds, so this reuses them. Replaces the nudge text "Bet you can't beat my score" with a real challenge. | Lichess Puzzle Racer link, Yousician weekly challenge, Strava segments, Fender chord challenge | A ready-made spec item that turns sharing into play. The same link works for non-users (install, then play). | S–M | **should** |
| G | **Friends' activity: automatic milestones, friends only, fixed 👏 set.** Post automatically (setting on by default for 13+) instead of a "Tell my friends" button on every celebration. Only big moments: unit, rank, duet or streak milestone, personal best, quest done. One line each, grouped by day. No comments. | Strava kudos, Duolingo Celebrate, Peloton high-fives | Strava's data: activity from close friends drives practice more than kudos. A button-per-celebration gets skipped and adds UI (against SPEC-TODAY §7). | S | **should** |
| H | **Class board and class quest for teachers.** In Classes: a weekly class board (XP, practice days), which the teacher can hide; a class-wide co-op goal ("the class sings 500 intervals this week"); and a duet streak with the teacher off. | Kahoot (hide-leaderboard complaint), Quizlet Live, EarMaster, Peloton tags | Teachers are our distribution channel. A co-op class goal motivates without shaming the weakest student. | M | **should** |
| I | **Profile showcase.** Tap any name to see a profile card: picture, flag, instrument, 3 pinned badges, area ranks crest row, best duet, and "Compare skill maps" (reuse the friend stats compare, side by side on the Skill Map). | chess.com profiles, Duolingo profile, Peloton tags | Gives badges a purpose (479 of them) and makes ranks visible to friends. The compare view partly exists. | S–M | **should** |
| J | **Fair-play basics.** Server-side sanity checks on submitted scores (answer times faster than 150 ms, perfect runs at impossible speed). Area and daily boards stay friends / class / level-band, never all-time global. | Lichess, chess.com | Leaderboards draw cheating, and kids copying answers ruins it for friends. | S | **should** |
| K | **Referral reward, light.** The Band Leader badge, plus both players get a streak freeze when the invited friend completes 3 practice days (not on install). | Duolingo invite funnel | Rewarding the action that matters avoids farming. Gems for installs invite abuse. | S | later |
| L | **Bands (small groups, ≤8).** A named group with a shared weekly goal and its own board. Created by code, so effectively a mini-class without a teacher. | chess.com clubs, Strava clubs, Peloton tags | Belonging beyond pairs (choir friends, a rock band). Needs moderation of group names and more UI. Do after quests prove co-op works. | M–L | later |
| M | **Seasonal events.** 2–3 a year (e.g. a Hanukkah / holiday "Harmony week", a summer festival), where community total XP unlocks a shared reward. | Duolingo, Strava monthly challenges | The monthly area challenge already covers most of this. Only add a community goal. | S–M | later |
| N | **Ensemble challenge (harmony parts).** Async: each friend sings or plays a part of a short 2-voice line, graded locally. The app shows a combined "ensemble score" and plays both parts **synthesized from the pitch data** (never the raw voices). | Smule duets (with the voice-sharing risk), our harmony singing | Unique to a music app and fits voice-first. Synthesized playback avoids sharing children's voices. | L | later |
| O | **Live "practice together".** Both players see each other's progress in the same workout in real time. | Headspace Snapchat mini, Peloton Here Now | Rooms already cover live play. Low value for its cost. | M | later / skip |

Evaluated and **not** recommended:
- **Follow (one-way).** Strangers in feeds and minors' safety problems, and mutual friends are enough at our size.
- **Free-text chat, comments, sharing raw audio or video of playing** (Busuu and Musora-style peer feedback). This is the main source of harm in Smule and Musora, and it carries a moderation cost we can't staff.
- **Global all-time boards.**
- **Paid boosts in competitions.** Gem repairs are fine, but nothing should buy rank or XP in leagues or duels; that is pay-to-win.

---------------------------------------------------------------------------------------------------------------------

## 4. Things to change or drop in the spec

1. **§1.3 photo upload: limit the scope.** Allow it for 13+ only, with "Who sees my photo" set to friends / no one, and **drop "everyone"**. Public photos are where moderation cost and risk live. Strangers see the instrument icon, which also looks better on boards.
2. **§2 "Show when I'm online": drop it.** The app is async, and presence is a stalking signal for minors. A "practised today ✓" mark on friends (which duets already show) carries the useful signal. For rooms, the invite itself shows availability.
3. **§2 "Who can send me friend requests: everyone": rename and change the default.** Without search, "everyone" means anyone who sees you on a league or room board can tap add. Default to *only with my code / link* for under-16s. For 13+, keep everyone as the default but rate-limit (10 requests a day).
4. **§2 settings: 10 rows is too many for the minimal-UI principle.** Show **one preset** (Open / Friends only / Private, with Friends only as the default) and an "Advanced" fold holding the per-item rows. Young-player mode locks the preset.
5. **§2 "Quick messages in games: everyone" default.** For under-16s, use friends-only. Rate-limit reactions to 1 every 3 s so 🔥🔥🔥 spam doesn't happen.
6. **§4 nudge texts.** Drop 🎹 "Bet you can't beat my score" (replace with the real challenge link, F). Soften 👋 "Miss you on the board" to something like 👋 "Practise with me today?". Keep the tone warm and never guilt (Duolingo backlash). Add a *receive* cap: at most 1 nudge push a day, with the rest merged into the Today row.
7. **§4 nudge push "immediately" conflicts with §3 "at most one reminder per evening".** Unify under the notification budget (B): a nudge sent before the receiver's reminder hour waits and joins that push, unless they have pushes on and it's before 20:00 and it's the first social push of the day.
8. **§4b "👥 Tell my friends" button: replace it with auto-posting** (G) controlled by one privacy setting. Keep ↗ Share. Fewer buttons on celebrations, and more feed content, which is what drives the effect.
9. **§4b external share for minors: hide ↗ Share under 13** (the link carries their nickname and friend code). The in-app activity stays.
10. **§3 duet repair by gems: keep it, but protect against bugs** (the Duolingo 2025 lesson). If the server missed a day (sync lag, timezone), auto-heal it for free. Add a "restore a lost duet" support path in the admin view.
11. **§1.1 nickname rules: also filter transliterated Hebrew and Arabic slurs and impersonation** ("admin", "7thsense", "teacher"). Allow a forced re-pick after reports (C).
12. **§5 server: add** `toneturn_profiles.birth_year` (or an `age_band` only, to store less), `toneturn_quests`, a `toneturn_push_log` for the budget, and report status and action columns.

---------------------------------------------------------------------------------------------------------------------

## 5. Recommended final list (build order)

1. **Safety foundation:** age band in the welcome flow and Young-player mode (A). Nickname replaces `display_name` everywhere (D). Privacy preset plus Advanced (§4.4). Photo friends-only, 13+.
2. **Profile:** nickname generator and filter, flag, instrument icon, photo crop. Profile card with 3 pinned badges and the rank row (I, basic).
3. **Block and report with auto-actions and a small admin view** (C). Server checks for challenges, invites and requests. Score sanity checks (J).
4. **Notification budget** (B): one push log, merging, quiet hours. Build it before any new push source.
5. **Duet streaks** (§3, with the free auto-heal).
6. **Nudges** (§4 with the revised texts, the receive cap and credit).
7. **Quick messages** in duels and rooms (rate-limited, friends-only for minors).
8. **Friends' activity** (auto milestones + 👏) and **↗ Share** with the image card and the `?add=` link (13+).
9. **Async challenge link** "Beat my score" (F).
10. **Friend quest**, weekly co-op (E).
11. **Class board and class quest** for teachers (H).
12. Later: referral freeze (K), bands (L), community seasonal goal (M), ensemble challenge (N).
