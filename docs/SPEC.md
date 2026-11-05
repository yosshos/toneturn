# ToneTurn — Master implementation prompt for Claude Code

You are the lead web engineer and product designer. Build a polished voice-first ear-training game for beginners through jazz players. Follow the product direction and milestone order below. The engineering specifications that follow expand those milestones. Inspect the repository and its instructions first. If empty, build a responsive web app for desktop and Android with TypeScript, React and Vite, installable as a PWA when supported. Keep the musical engine independent of browser and native adapters. Develop in milestones and implement a runnable first slice. Consider a dedicated Kotlin Android client only if real-device evidence shows the web app cannot meet required hands-free behavior.


## ToneTurn product direction

The product is **ToneTurn**, a musical game for beginners through jazz musicians. Treat the existing `toneturn-alpha.html` as a reference if supplied. It demonstrated that the B-flat lesson content works, but users found the presentation office-like, the synth unconvincing, and the voice flow unreliable. The reported failure is “Microphone or speech service: permission denied” on a **desktop computer**. Inspect what is actually in the repository before deciding what to reuse. Preserve working material, follow repository instructions, and implement the first playable milestone in this session. Do not stop after returning a plan. Keep later milestones scoped and distinguish implemented features from seeded demonstrations and future work.

### The first five minutes

- Open to an illustrated music-game home with a prominent Practice action, a short lesson path, and a clear next unlock. Make the Practice entry the single intentional Start gesture for the chosen mode. Do not insert a second Play Lesson or per-question activation step. A system permission prompt is allowed when needed.
- Use the existing B-flat comparison as the first teaching moment. The same B-flat is home in B-flat major and degree five in E-flat major. Establish each tonic audibly, use the same B-flat pitch and timbre, and make the contrast easy to hear. Follow with three scored questions that accept “one” or “five.” The three-question desktop smoke test is separate from the expanded five-question slice that includes singing. Award 10 XP for each correct answer in the initial challenge and show a replayable recap.
- Build a game screen around the current musical task. Use expressive colour, chunky readable type, illustrated lesson nodes, audio-synced motion, a live listening indicator, three-round progress, and a satisfying score reveal. Respect reduced motion and pair every cue with a readable state. Keep instructional text short during play. Avoid dashboard panels and tiny controls. Use the ToneTurn logo if available.
- Use a warm, piano-like sound with clear attacks, natural decays and normalized playback. Keep exercise sounds, narration and musical feedback distinct. Test audibility of inner voices and extensions. Start with a bundled, legally usable sampled instrument if practical, or an improved procedural instrument. Document any sample licensing. Compare by listening and check clipping, consistency and perceived quality. Keep a lightweight offline-friendly audio path.

### Desktop permission triage and voice flow

- Serve the prototype in a standalone HTTPS tab for the first desktop test. Localhost is acceptable for development. Record the origin, browser/version, OS, and whether the page is embedded. An embedded preview and a standalone tab are separate test surfaces. Avoid treating the HTML attachment preview as the release environment.
- Probe microphone capture and speech recognition independently. Show whether microphone capture opened and yielded a signal, whether the recognizer started, and the actual error code and stage. When available, identify insecure context, iframe policy, blocked site or OS permission, no input device, unsupported recognizer, recognition-service denial, network errors and silence. A successful permission request for capture does not establish that the speech service works. Provide browser-appropriate recovery instructions and Retry without resetting the exercise. Never label a denial as a wrong answer.
- In Voice, unlock audio and request needed access from Start. After each prompt and example, arm recognition automatically, cue when it actually starts, wait for the player, grade, speak feedback, and advance automatically. Keep the mic inactive during narration and stimulus so playback is not mistaken for the player. Use a bounded retry for silence or unclear input and allow repeat, skip and stop by voice. On stop, leave Practice in a coherent state and release capture. If the recognizer rejects automatic restarts, record the exact failure and evaluate another adapter against the same test.
- Keep the Voice / Buttons switch at the top throughout play. Switching cancels pending playback, feedback timers and recognition results. Preserve question position, attempt history and score. In Buttons mode, show touch controls immediately. For singing tasks, use an explicit recording action or offer a comparable non-singing exercise. A mid-question switch back to Voice replays the current prompt automatically. Verify switching while prompting, listening and giving feedback.
- First manually verify three full consecutive spoken rounds on desktop with no taps after Start and permission. Also verify permission denial, recovery and a mid-session mode switch. Run automated state-machine and browser tests with fake adapters, then separately measure real recognition. Continue with Android Chrome in a standalone tab, then installed PWA. Report foreground, lock, Bluetooth and interruptions separately. Use the observed device results to decide whether a Kotlin client is warranted for the required experience.

### Progression, placement and Skill Map

- Track musical skill independently from XP, streak, lesson count and gems. Use independent adaptive ratings for melodic intervals, harmonic intervals, chord identification and extensions, progressions and cadences, melodic sequences, and sung pitch accuracy. Treat chord inversions and slash chords as planned content and consider a separate rating once there is enough distinct material.
- Run a short optional placement session with difficulty adjusted within each skill based on results. Let players skip and choose a starting level. Implement a simple explainable Elo-style model in the prototype with separate skill ratings and item difficulty, larger provisional updates, bounded updates and minimum evidence thresholds. An example is expected success 1 / (1 + 10^((difficulty − rating) / 400)), followed by an update proportional to observed minus expected performance. Treat initial values and update constants as tuning choices. Record item difficulty, correct/incorrect result and rating change. Permission failures, unrecognized answers, skipped questions and revealed answers carry no rating penalty. Avoid replay farming and double updates.
- After placement, show an interactive two-dimensional radar Skill Map. Normalize axes against documented difficulty bands and visibly distinguish unmeasured, provisional and measured skills. Use an accessible textual equivalent and never imply that an unmeasured skill is zero. Each axis opens a diagnosis and a suitable next practice, such as distinguishing minor from major sixths. Show one actionable recommendation after the recap. Later support historical snapshots so players can compare their own growth.
- Build a targeted review queue from recurring mistakes. Let players hear their choice next to the correct musical example. Use musical phrases and realistic voice leading for later capstones.
- Add inversions and slash chords after the core loop. Teach C, C/E and C/G with the bass audible, then distinguish a non-chord bass such as C/D from a triad inversion. Use voicings that support the requested classification and model the bass separately from root and quality.

### Challenge modes and online progression

1. **Local challenge.** Allow two players to take turns on one device without accounts. Use comparable difficulty and item counts, clearly announce whose turn it is, and provide voice and button modes. Award one point per correct answer. Reopen the turn when audio is unclear without a penalty. End with a score screen and spoken recap in Voice, support ties, and offer a rematch.
2. **Weekly puzzle.** Start with a local example assigned by skill band, slightly above its ordinary difficulty. Give the same versioned puzzle to everyone within an eligible band once online. First-attempt solve earns gold, second-attempt solve earns silver. After two scored attempts, unlock practice and an explanation. Unrecognized speech does not consume an attempt. A later jazz puzzle can ask for the degrees of a short progression and then the audible dominant extension. Track puzzle attempts separately from lesson retries and league XP.
3. **Accounts, leagues and global scoreboard.** Add these after the voice, scoring and placement foundations work. Provide opt-in public visibility, a nickname, and private groups. Create weekly leagues with comparable cohorts informed by skill placement and rank players by earned weekly XP. Provide an overall scoreboard as well. Display rank, nickname, weekly XP, streak, lessons completed and skill levels or profile drill-down. Define ties and weekly boundaries explicitly. Store gems in a separate ledger, award them for milestones and challenges, and let players unlock cosmetic themes or instrument sounds. Gem purchases confer no competitive advantage. Make completion and reward writes idempotent, prevent repeated events from awarding XP or gems twice, and move competitive validation server-side before calling any leaderboard live.
4. **Friends.** Add private rooms with join codes for play from separate devices and asynchronous three-question friend duels later. Keep difficulty, hint policy and attempts comparable across players. Keep offline and local play usable.

### Milestone order and delivery

1. Inspect the project and reproduce or instrument the desktop permission failure. Deliver a standalone dev URL and a reliable manual fallback. Implement the first polished three-question lesson as a playable game with a persistent Voice / Buttons switch.
2. Expand to the five-question vertical slice with a short sung sequence, spoken per-note feedback, local progress and review. Verify desktop voice before making Android or installed PWA claims.
3. Add placement, per-skill ratings, radar Skill Map, a weekly puzzle example and local multiplayer. Clearly label local or simulated scores.
4. Expand curriculum and game progression, then add online leagues, global scoreboard, friends and private rooms with authenticated server-side scoring. Keep the first build free of required accounts, paid APIs or services.

At handoff, report what runs, how to launch it, the exact tests executed, the real-device/browser results, and each pending test. Include an explicit acceptance matrix for desktop standalone HTTPS, Android Chrome, installed PWA and any other tested surface. Record permission and recognition outcomes separately. Call out which milestones are implemented and which are still backlog. Never report voice recognition as fixed from syntax checks or mocked tests.

## Product contract

The player hears a prompt and musical stimulus, then answers out loud by naming notes, intervals, chords or harmonic degrees, or by singing. The session gives immediate audible feedback and advances hands-free. Offer short sessions, a lesson path, optional focused practice, XP, daily streaks and a review queue. The core is learning to hear melody and harmony. Rhythm is a later module. Use no account, cloud service, subscription, commercial audio pack or paid plugin for the prototype. Save settings and progress locally.

## Milestone 0 — audio feasibility gate

Build a diagnostic screen and a real-device test script before investing in the lesson map. Reproduce the reported issue on desktop first, then verify Android.

- Use Web Audio for polyphonic synthesis and playback, getUserMedia for mic capture in a secure context, and an AudioWorklet for PCM when supported. Unlock audio with the initial Start gesture. Use browser speech synthesis behind a prompt-player adapter and verify Hebrew and English voice availability. Provide readable prompts and pre-recorded essential cues where needed. Centralize audio ownership and stop mic tracks on pause, interruption and exit.
- Put browser speech recognition behind a SpeechTranscriber interface. Probe availability and local-processing support per browser and language. Browser recognition may use a remote service, so require explicit disclosure and opt-in before remote processing. Evaluate local multilingual Whisper in a worker only if needed and measure model size, memory and latency on Android. Preserve a manual answer mode. Keep the prototype free of required paid plugins, APIs and accounts.
- Use a separate monophonic PitchDetector over PCM. Start with YIN and a confidence/voicing gate. Express the difference from target as 1200 × log2(measuredHz / targetHz). Aggregate stable frames, ignore the attack, detect silence and low confidence, and segment note changes for sequences. Calibrate singing register. Choose octave-sensitive scoring per exercise. Initial tuning target is ±35 cents for a stable sustained note, configurable after user testing. Distinguish sharp, flat, wrong note and unusable capture.
- Turn-taking states are idle, prompting, playback, listening, evaluating, feedback, paused and complete. Capture only during listening. Add a configurable short settle delay after playback, a soft ready cue, bounded silence/answer timeouts and cancellation. Guard against stale callbacks and duplicate scoring. Implement “repeat,” “skip,” “pause,” and “resume” with an explicit bounded resume interaction. In a paused state with the mic released, resume is initiated through a user action. Start sessions while stationary. Check Bluetooth playback versus mic route quality, route changes, calls, foreground/lock behavior and recovery. Only promise combinations that pass. CarPlay is outside the initial release.
- Benchmark at least 60 spoken answers across note names, accidentals, intervals, chord symbols and progressions, balanced across Hebrew, English and Hebrew-English mixes. Include multiple speakers where available. Compare quiet and parked-car cabin noise. Report normalized exact-match rate, false acceptance, retry rate and median/P95 time from end of answer to feedback by category and route. Proposed quiet targets are at least 95% canonical matches, under 2% false acceptances on intentionally wrong answers and P95 under 2 seconds. Treat these as gates to measure, not claims. Test synthetic pitch fixtures and real singing separately. Run an airplane-mode session on each supported route and locale.

## Answer language and grading

Expose independent settings for UI language, spoken input language and spoken output language (Hebrew or English), plus note naming (fixed Do–Re–Mi or A–B–C). Apply naming to prompts, answers, explanations and summaries. For example, Hebrew narration can say “בי פלאט” using letter naming, and English narration can say “Si flat” using fixed note names. Degrees remain relative to the stated tonic. Test all eight combinations of input locale, output locale and naming preference, including mixed-language music vocabulary and unavailable voices.

Define typed canonical answers for NoteName, Interval, ChordSymbol, Progression and SungSequence. Keep displayed labels separate from scoring. Accept common aliases in the selected vocabulary, including accidental placement and speech variants. Support mixed phrases such as “מי במול מייג'ור שלוש עשרה פלט פייב.” Build a deterministic, exercise-aware parser from transcript to structured answer. Never choose the expected answer to resolve an ambiguous transcript. Return correct, musically incorrect, ambiguous or unrecognized. In the latter two states ask for repetition without penalizing. Have the app repeat back an ambiguous candidate where useful.

Keep chord root, quality, seventh, extensions, alterations and bass separate. Distinguish flat five from sharp eleven in the symbolic answer and avoid asking the learner to infer a unique spelling from acoustically equivalent material. Define when enharmonic equivalents count and when explicit spelling is the lesson. Parse numeric degrees, spoken Roman numeral equivalents and, where asked, quality. “Two five one” is sufficient for a degrees-only exercise. Require qualities explicitly only when the prompt requests them. Show examples of accepted spoken answers during onboarding.

## Six exercise directions

Represent prompt and answer independently using three forms: heard/sung pitch, note name, and scale degree. Provide all six directions in the note and melody tracks and analogous conversions where musically meaningful in other tracks. Use E-flat major as a test case.

| Prompt | Answer | Example |
| --- | --- | --- |
| Degree | Sung pitch | Say “five”; player sings B-flat |
| Heard pitch | Degree | Play B-flat; player says “five” |
| Note name | Sung pitch | Say “B-flat”; player sings B-flat |
| Heard pitch | Note name | Play B-flat after a known reference; player names it |
| Note name | Degree | Ask which degree B-flat is; player says “five” |
| Degree | Note name | Ask for degree five; player says “B-flat” |

Explicitly state key and mode for relative tasks and establish tonic by ear where applicable. Give an audible reference before asking for an absolute sung pitch or heard note name in relative training. Symbolic conversions can omit the target playback. Use B-flat then F ↔ 5 then 2 in E-flat major as a sequence fixture. In harmonic tracks map heard chords, chord names and Roman numerals in both directions where applicable. For production use a defined response such as playing voicings on a virtual keyboard or singing requested arpeggios. For cadences teach cadence classification separately from degree or chord naming. Vary the key while preserving the musical relationship.

## Teaching before drills

Every topic has an optional introduction before first practice, available again by a spoken “explain” command. Flow: explain one idea, compare two audible examples, let the player try with guidance, then offer independent practice. Support full audio delivery and visual companion material. Provide lessons for singing, melodic and harmonic intervals, chords, progressions and cadences. For jazz melodic minor, compare natural and melodic minor with a common tonic, isolate raised degrees six and seven, sing a short pattern, then transpose. For intervals use the same two pitches sequentially and simultaneously. For cadences compare a phrase ending on V with one resolving V–I. Returning from a hint preserves the exercise and avoids awarding challenge credit for a revealed answer.

## Vocal range and per-note feedback

During onboarding and anytime from Settings, let the player manually choose or sing their comfortable low and high notes. Offer a skip path with a conservative editable default. Reject unreliable calibration samples and let the player preview or retake the range. Fit the entire required sung sequence by octave placement or transposing the key when the lesson permits. Regenerate or simplify a drill that cannot fit; never silently change intervals. Keep audible references consistent with the final exercise.

For sequences align detected note segments with targets in order, tolerating pauses, repeated notes, extra notes and missing notes without shifting every subsequent result. Report each note’s target, detected pitch, signed cents error where reliable, and status (accurate, sharp, flat, wrong note, missed or unclear). Show a per-note strip with accessible labels and offer a spoken summary in hands-free mode. Timing is diagnostic unless the exercise explicitly grades it.

## Curriculum and generation

| Track | Early | Advanced |
| --- | --- | --- |
| Sing | Given C, sing F. Given a tonic, sing an ascending minor sixth | Sing 4–5–flat 2 relative to one tonic, then scales such as ascending jazz melodic minor |
| Melodic recognition | Hear a named reference and identify one target or a two-note sequence | Recognize up to six notes, answer one by one with feedback and retry at the same index |
| Harmonic intervals | Hear two notes together and name the upper note given the lower note | Name the interval, vary register and voicing |
| Chords | Recognize major, minor, diminished and augmented triads | Sevenths, inversions, extensions and alterations, including dominant sharp eleven |
| Progressions and cadences | Establish tonic first, then V–I and I–IV | ii–V–I, I–vi–IV–V, major/minor cadences and voicings with extensions |

Represent prompts, stimulus events, scoring policy, prerequisites and explanations separately. Use deterministic seeded generation in tests. Change key and register within sensible ranges. Specify direction and whether scale degrees are all measured from the tonic. When asking for absolute note names, provide a reference or clearly mark an optional absolute-pitch drill. For chord quality drills, ask for quality alone unless the tonic/root reference makes absolute naming fair. In extension lessons ensure the tested extension is audible in the actual voicing. Avoid ambiguous distractors and distinguish cadence type from merely naming the chord sequence.

## UX requirements

Design a warm, playful musical identity with a lesson path, a prominent Continue action and large touch targets. The first-run flow asks for naming preference, plays one sample exercise, then requests mic access in context and calibrates the voice. Provide a manual fallback for spoken-answer exercises and a clear permission recovery screen. Make the active lesson screen show one task, a clear listening state, progress and controls for repeat, skip and pause. Add large readable type, VoiceOver labels, reduced motion, right-to-left Hebrew layouts and left-to-right chord symbols where needed. Use distinguishable audio cues and visual labels together. Correct answer: brief musical cue and a point. Wrong answer: a helpful retry, then play and explain the answer after a configurable attempt limit. For singing, speak the direction of pitch error. Do not count an unclear recording as a musical mistake. Session recap shows the skill practised and one concrete review target. No screen interaction is required once a supported hands-free session has started, except to recover from system permissions or interruptions where the OS requires it. Avoid eyes-on-screen demands and test car audio while parked.

### Practice input mode

Keep a visible, accessible Voice / Buttons switch at the top of Practice throughout the session. Show the active mode and remember the player's choice locally, with Voice as the initial default. Switching works in both directions and preserves the current exercise, completed answers, attempts and score. Cancel pending audio and recognition callbacks so a late result cannot submit an answer or advance the lesson twice.

In Voice mode, the initial Start action and any required system permission prompt are the only taps in normal play. Run the prompt, musical example, listening, spoken feedback and next question automatically. Switching to Buttons stops microphone capture immediately and shows the controls for the current exercise. Switching to Voice checks access from the switch gesture and replays the current prompt before listening. Singing exercises still require a microphone for pitch scoring in either mode.

If microphone access or the speech service is denied, preserve the exercise and offer an explicit switch to Buttons. Distinguish capture permission from recognition-service errors where the platform exposes that detail. Test first on desktop in a standalone HTTPS tab, and record whether any failure occurs in the embedded preview or on the standalone page. Verify three consecutive spoken rounds after one Start action, mid-question switching in both directions, and recovery from denied access.


## Implementation sequence and verification

1. Build the diagnostic and document hardware results or pending checks.
2. Ship a vertical slice with onboarding, one five-question lesson, a named reference and spoken note identification, one sung interval, repeat/retry, session recap and persisted progress. Include a deterministic simulator/demo mode clearly labeled as simulated.
3. Add the parser fixtures and expand the curriculum tracks. Add per-skill mastery, reviewing errors first and keeping daily XP separate from mastery. Persist completion and XP idempotently. A repeated callback or app resume must not award points twice.
4. Polish UI, localizations and accessibility. Test the full real-device experience, including denied permissions, silence, invalid audio, Bluetooth disconnect, interruption, lock behavior and missing local recognition support. Add automated tests for transposition, chord parsing, octave policy, pitch offsets, state transitions, streak date boundaries and one-time scoring. Add only instrumentation needed to validate the gates. Do not retain raw voice by default.

Deliver runnable source, build instructions, architecture notes, a QA checklist and a milestone report with build/test results and unverified device capabilities. Use IndexedDB for progress and settings, a versioned content schema and an app-shell service worker for offline loading. Keep offline speech claims separate from offline app loading. Use browser-based end-to-end tests with deterministic audio adapters and verify on Android Chrome both in browser and installed. Record foreground, lock-screen and Bluetooth results separately. Report any mode that fails and the criteria for a native fallback. No specialized Claude Code plugin is required. Before any paid service or distribution enrollment, document evidence and tradeoffs.

## Definition of done

A clean checkout runs from documented commands. Deliver a playable lesson, reproducible automated tests, a device QA matrix, and a short status report that clearly separates measured results from pending hardware tests. Do not claim support for background capture, offline transcription or car Bluetooth until measured.
## Addendum — 2026-11-04 (product owner)

### A. Narration voice choice
- Let the player choose the narration voice, with several **female and male** options per narration language.
- Offer a quick gender preference (Any / Female / Male) plus an explicit voice list with a Preview button. Remember the choice locally per language.
- Voices come from the device/browser (`speechSynthesis`); availability differs per OS and browser. When the chosen voice is missing, fall back to the gender preference, then to any voice of that language, and show it in Settings. Never claim a gender option that the device does not offer.

### B. Language priority and Hebrew compatibility
- **English is the default** language (UI, spoken answers, narration). Hebrew is fully supported as an equal alternative.
- Accidentals in Hebrew are always **דיאז / במול** (never "שארפ / פלאט"), in narration, on screen, and in accepted spoken answers. The parser still tolerates the anglicised forms as aliases, but the app never produces them.
- Default note naming follows the language: **Hebrew → fixed Do–Re–Mi (דו, רה, מי…)**, **English → letters (A, B, C…)**. The player can override this (Auto / Letters / Do-Re-Mi). With Auto, naming follows each channel's language: on-screen labels follow the UI language and narration follows the narration language.

## Addendum — 2026-11-04 (product owner): melodic & rhythmic memory games

### C. Memory games (solo and same-device challenges)
Two growing-sequence memory games, designed first of all for the **local same-device challenge** (pass-the-device, 1–4 players), and playable solo for a personal best. Use ToneTurn's own look and names — do not reproduce an existing commercial game's name, colours or layout.

1. **Echo Chain (melodic memory).** The app plays a short melody from a small set of scale degrees in a stated key (start with 1, 2, 3, 5 in a comfortable range; later 5-note pentatonic and full scale). The player repeats it by **singing** (pitch capture, octave-insensitive, per-note segmentation) or by **tapping note pads** labelled with degree and note name. Each correct round adds one note. Pads light in sync with playback.
   - Singing: segment the capture into notes, align them with the target in order (tolerating short scoops, re-attacks and pauses), and show a per-note strip (✓ / wrong / missed / extra). An unusable capture reopens the turn without penalty.
2. **Beat Echo (rhythmic memory).** A metronome count-in (one bar), then a rhythm played on a woodblock over a steady pulse, then a second count-in and the player taps it back. Each correct round adds one beat. Input by **tapping the screen / keyboard**, or **knocking on a table** picked up by the microphone (onset detection; the response window ignores the app's own count-in).
   - Grade each onset against the beat grid with a tempo-aware tolerance (default ±100 ms at 90 BPM), compensate measured audio output latency, and report early/late per onset. Extra or missing taps fail the round.
3. **Local challenge rules.** Each player gets a **different sequence of the same length** each round (comparable difficulty, no advantage from listening to the previous player). Clear spoken + on-screen "whose turn" announcements with a player colour. A failed round eliminates the player; all players finish the round before eliminations take effect. Last player standing wins; if everyone fails in the same round it's a tie at the previous length. Solo mode continues until the first miss. Show a scoreboard (longest chain per player), rematch, and keep personal bests locally. Unclear audio never eliminates anyone.
4. **Later.** Tempo ladder (speed up every N rounds), call-and-response with swing feel, jazz phrases, online friend duels with the same seeds.

## Addendum — 2026-11-04 (product owner): versions, install/update, push reminders, friends

### D. App shell menu
- A top menu (☰) on the home screen with: current **version** and a "What's new" changelog, **Install app** (when the browser offers installation; otherwise short platform instructions), **Check for updates / Update now** (a new service worker waits until the player chooses to reload; never interrupt a lesson), **Notifications**, **Friends**, Settings and Voice check.
- Every build carries a semantic version, build time and git commit, shown in the menu and in the Voice check report.

### E. Streak reminders (push)
- A Notifications control asks for permission only from an explicit tap, explains why first, and can be turned off. Choose a daily reminder hour (default 19:00 local).
- Reminders are Web Push sent by the server once a day, only to signed-in players who have a streak and have not practised yet that local day. No reminder content reveals private data. Subscriptions are stored per device and removed on sign-out / turn-off / expiry.
- iOS requires the app to be installed to the Home Screen before push works; say so in the UI.

### F. Friends (compare achievements)
- Signed-in players get a public nickname and a short **friend code**. Add a friend by code; the other side accepts or declines. Remove at any time.
- A Friends screen compares: **this week's XP** (ranked, like a weekly league), current streak, total XP, lessons completed, and Echo Chain / Beat Echo best chains, with "you" highlighted.
- Stats come from the server (computed from synced lesson results); game bests are self-reported and labelled as such until server validation exists. Only accepted friends can see each other's stats.

## Addendum — 2026-11-04 (product owner + design): G. Rhythm reading & rhythm dictation

### G.1 Why separate skills
Pitch already separates *recognition* (degrees, intervals, chords — hearing and naming) from *performance* (singing in tune) and *memory* (melodic memory). Rhythm gets the same structure:

| | Pitch | Rhythm |
| --- | --- | --- |
| Understand by ear (sound → name) | scale degrees, intervals, chords | **Rhythm dictation** (new) |
| Perform from symbols (name → sound) | sing a degree / note | **Rhythm reading** (new) |
| Hold in memory (sound → sound) | Echo Chain (melodic memory) | Beat Echo (rhythmic memory) |
| Precision of execution | singing in tune (cents) | rhythmic precision (ms) |

Rhythm reading and rhythm dictation are two new Skill Map axes. Performance in rhythm reading also feeds *rhythmic precision* (precision is general), but never rhythmic memory (the rhythm is visible or described, nothing has to be remembered).

### G.2 Three representations, six directions
Like pitch (heard pitch / note name / degree), every rhythm exists in three forms:

1. **Heard** — played on a woodblock or a single piano pitch, durations audible (long notes ring for their value), over an optional metronome.
2. **Notation** — a one-line rhythm staff: note heads, stems, beams, flags, dots, ties, rests, tuplet brackets, time signature, bar lines.
3. **Words** — either *note-value names* or *counting syllables* (player setting, see G.4).

| Prompt → Answer | Example | Skill |
| --- | --- | --- |
| Notation → performance | see ♩ ♫ ♩ 𝄽, tap / say it on the metronome | rhythm reading |
| Words → performance | "eighth-note triplet, dotted quarter, eighth rest…" → perform | rhythm reading |
| Heard → notation | hear 1–2 bars, choose or build the notation | rhythm dictation |
| Heard → words | hear it, say "ta ti-ti ta" or "quarter, two eighths, quarter" | rhythm dictation |
| Notation → words | name what you see | rhythm theory (symbolic, no audio) |
| Words → notation | build what you are told | rhythm theory (symbolic, no audio) |
| *Heard → performance* | *(this is Beat Echo = rhythmic memory, already exists)* | *rhythmic memory* |

Symbolic conversions (theory) count toward rhythm dictation at a reduced weight, like symbolic pitch conversions.

### G.3 Canonical model
- Time grid: **12 ticks per quarter note** (LCM of eighth = 6, sixteenth = 3, eighth-triplet = 4, quarter-triplet = 8, dotted quarter = 18). Meters: 2/4, 3/4, 4/4 first; 6/8 (dotted-quarter beat) and 12/8 later.
- A rhythm = bars of events `{ start, duration, rest, tieToNext, tuplet? }`. Display labels are separate from scoring (as with pitch).
- **What is graded is what is heard:** onset positions, plus rests / silence where audible. Notations that sound identical are equivalent (a quarter = two tied eighths; a dotted quarter = quarter tied to an eighth) **unless the item explicitly teaches that spelling** (e.g. a ties lesson) — the same rule as enharmonic spelling for pitch.
- Durations are graded only where they are audible and taught (long vs short, legato / staccato, a sustained "taaa"). Default grading is onsets only, and the UI says so.

### G.4 Words: names and counting systems (player setting)
- **Note-value names**: US (whole, half, quarter, eighth, sixteenth, triplet, dotted, rest, tie), UK (semibreve, minim, crotchet, quaver, semiquaver), **Hebrew** (שלם, חצי, רבע, שמינית, שש-עשרית, טריולה, מנוקד, הפסקה, ליגטורה).
- **Counting syllables**: Kodály (ta, ti-ti, tika-tika, tri-o-la, ta-a; common in Israeli schools as טָה, טִי-טִי), Takadimi (ta, ta-di, ta-ka-di-mi, ta-ki-da), Numbers ("1 & 2 &", "1 e & a", "1 trip-let").
- Defaults: Hebrew → Kodály syllables + Hebrew names; English → numbers + US names. Overridable, like note naming.
- Parser: deterministic and exercise-aware, transcript → canonical rhythm per beat; accepts both names and syllables; reports ambiguous / unrecognized instead of guessing (same rules as the pitch parser). Spoken dictation answers are per beat or per bar, and the app repeats back what it understood.

### G.5 Performing (rhythm reading): input and grading
- **Input**: tap (screen / Space / keys), **voice syllables** ("ta ta ta" — detected as *onsets* from the microphone signal envelope, never through speech recognition, which is too slow and imprecise for timing), or knock (existing). Later: hold-to-sustain for duration lessons.
- **Metronome**: one-bar count-in; clicks on beats; optional subdivision clicks at early levels; tempo per level (60–72 → 80–100 → 100–120; jazz swing 120–180 later). A visual beat light is always on.
- **Length**: 1 bar → 2 bars → 4 bars. Longer passages are graded **per bar**, with "retry this bar" and a per-bar strip (✓ / early / late / missed / extra), like the per-note strip for singing.
- **Tolerance follows the grid that must be distinguished**: it must be less than half the distance between the correct onset and the nearest plausible wrong onset. Straight eighths vs eighth-triplets differ by 1/6 beat → tolerance ≤ 1/12 beat (about 55 ms at 90 BPM). Quarter-only levels can be more lenient. Device tap latency is calibrated first (existing feature).
- Report early / late per onset and a mean offset. Precision events feed *rhythmic precision*; pattern correctness feeds *rhythm reading*.

### G.6 Dictation (hear → notate / name): answer modes
- **Choose**: 3–4 notated options that differ minimally (one beat changed — "minimal pairs"), never distractors that sound alike.
- **Build**: tap rhythm blocks into beat slots (quarter, eighth pair, four sixteenths, triplet, rest, dotted quarter + eighth spanning two beats, tie); length and meter are fixed by the item.
- **Say**: syllables or names per beat, parsed as above.
- Playback: count-in, the rhythm twice, then again on request (a replay never costs an attempt). Optional slow replay at early levels.

### G.7 Curriculum (tempo and length grow inside each level)
| Level | New material | Example (4/4) |
| --- | --- | --- |
| R1 | quarter, half, whole, quarter rest | ♩ ♩ 𝅗𝅥 \| ♩ 𝄽 ♩ ♩ |
| R2 | eighth pairs | ♩ ♫ ♩ ♫ |
| R3 | dotted quarter + eighth, ties over the beat | ♩. ♪ ♩ ♩ |
| R4 | sixteenths and eighth/sixteenth combinations | ♫ ♬♬ ♩ 𝄽 |
| R5 | syncopation (♪ ♩ ♪), eighth rests, pickups | ♪ ♩ ♪ ♩ ♩ |
| R6 | eighth-note triplets; triplets vs straight eighths | ♩ ³♫♪ ♫ ♩ |
| R7 | 3/4 and **6/8 / 12/8** (compound beat) | ♩. ♩. \| ♩ ♪ ♩ ♪ |
| R8 (jazz) | swing eighths (written straight, played long-short), anticipations, quarter-note triplets | swing ratio graded 1.5–2.5 |

Each level has an optional explanation (hear it, see it, count it), guided practice with subdivision clicks, then independent practice. Hints never award challenge credit.

### G.8 Skill Map, ratings, review
- New axes: **Rhythm reading** and **Rhythm dictation**. Axis order groups the map: listening (degrees, intervals, chords, cadences, rhythm dictation) → performance (singing in tune, rhythm reading) → memory (melodic, rhythmic) → precision (rhythmic precision).
- Item difficulty from level, tempo, number of bars and density of off-beat onsets; same rating rules (first attempt only, no rating for unclear input, per-bar items for long passages).
- Mistakes go to the review queue as rhythm tags (level + pattern) and are replayed as "your rhythm, then the right one", both heard and shown.

### G.9 Notation rendering
Use an established music-notation library rather than hand-drawing (e.g. VexFlow, MIT licence, bundled for offline use); keep the canonical model independent of the renderer. Notation must be readable at phone width, high-contrast in dark mode, and have a text alternative (the words form).

## Addendum — 2026-11-04 (product owner): H. Full melodic matrix — sound × degree × note name

Every melodic exercise is defined by a **prompt form** and an **answer form** taken from three representations: **sound** (heard by the player as a prompt, or produced by the player — sung, or later played on an instrument / MIDI keyboard — as an answer), **scale degree** (number, given or answered) and **note name** (given or answered, in the player's naming system). All meaningful combinations exist, each **for a single note and for a sequence** (2–6 notes), each in **every key**, with the key stated and established by ear for relative tasks.

| # | Prompt → Answer | Single note (example in E♭ major) | Sequence | Skill | Status (0.9.0) |
| --- | --- | --- | --- | --- | --- |
| 1 | Heard sound → degree | B♭ → "five" | B♭ F → "five two" | Scale degrees | ✓ single (lessons 1–2) · ✓ sequence (weekly puzzle) |
| 2 | Heard sound → note name | (after a reference) B♭ → "B-flat" | → "B-flat F" | Note naming | ✓ single (lesson 8) · ✓ sequence (lesson 20) |
| 3 | Degree → sung sound | "five" → sing B♭ | "five two" → sing B♭ F | Singing in tune | ✓ single (lesson 5) · ✓ sequence (lesson 10) |
| 4 | Note name → sung sound | "B-flat" → sing B♭ (after a reference) | "B-flat F" → sing | Singing in tune | ✓ single (lesson 9) · ✓ sequence (lesson 20) |
| 5 | Note name → degree | "Which degree is B-flat?" → "five" | "B-flat F" → "five two" | Theory (symbolic) | ✓ single (lesson 8) · ✓ sequence (lesson 20) |
| 6 | Degree → note name | "Degree five?" → "B-flat" | "five two" → "B-flat F" | Theory (symbolic) | ✓ single (lesson 8) · ✓ sequence (lesson 20) |
| 7 | Heard sound → sung sound (echo) | hear B♭ → sing it back | hear B♭ F → sing them back | Pitch matching / melodic memory | ✓ single (lesson 9) · ✓ sequence (Echo Chain, sing mode) |

Rules carried over from the main spec: an audible reference precedes any absolute note-name task (#2, #4) unless an optional absolute-pitch drill is chosen; symbolic conversions (#5, #6) need no playback; sequences are graded note by note with alignment and a per-note strip; octave policy is per exercise; naming follows the player's setting (letters / Do-Re-Mi, Hebrew דיאז/במול).

The Skill Map gains a **Note naming** axis (#2); #5–#6 feed a small **Theory** weight inside Scale degrees. Rhythm (addendum G) uses the same idea with sound × notation × words.

## Addendum — 2026-11-04 (product owner): I. Live tournament (proposal for review)

Players get **the same question at the same moment** and are scored on **accuracy and speed**.

**Modes**
- **Online room** (separate devices, sign-in): host creates a room → join code / QR → lobby with nicknames → host picks a set (skill, level, 10 rounds) → start. Uses Supabase Realtime channels for presence and round broadcast.
- **Same device, 2 players** ("buzzer" split screen): the screen is split into two halves, each with its own answer buttons; the first correct answer scores more. Voice can't tell two speakers apart, so this mode is buttons-only.
- **Async tournament / daily challenge**: everyone plays the same seeded set within a time window; leaderboard when it closes (works without being online at the same time).

**Round flow**: synced countdown → the same stimulus plays on every device → answer window (e.g. 10 s) → reveal + "your answer vs the right one" → live leaderboard with movement arrows → next round. Podium at the end, rematch.

**Scoring**: wrong or no answer = 0. Correct = 500 + up to 500 for speed (linear over the window), × streak bonus (1.0 → 1.5 for consecutive correct). Ties broken by total response time. Unclear speech re-opens the answer without penalty (the clock keeps running).

**Fairness**
- Each device measures its own reaction time **from the moment its playback finished** (local audio clock), so network lag and download speed don't count; the server checks plausibility (no faster than ~150 ms, not after the window).
- The server holds the answer key and grades; clients only receive the stimulus (good enough for friends; ranked play would also need server-rendered audio).
- Same item difficulty for everyone; voice and buttons both allowed but shown in the results (voice is slower, so offer a "buttons only" option for competitive rooms).

**Status (0.11.0)**: daily challenge (local, share card) and same-device duel are built (`src/engine/tournament.ts`, `src/game/tournamentController.ts`, `src/ui/Tournament.tsx`). **Status (0.12.0)**: online rooms built (`supabase/migrations/20261111000000_toneturn_rooms.sql`, `src/cloud/rooms.ts`, `src/game/roomController.ts`, `src/ui/Online.tsx`): server-held key and grading, Realtime on the room row + polling, host/any-member fallbacks, 20 players max. Decided: tournament points do not feed XP or the Skill Map; nicknames are 1–16 chars, control characters stripped. Known limit: the stimulus is generated on the device from the room seed, so a player who reads the code could derive answers — fine for friends, not for ranked play. **Status (0.13.0)**: async daily leaderboard built (migration 9 + seed): server-graded first play, global count/rank/top %, friends-only names. Still open: QR code for the room; re-seeding keys before 2029.

**Open decisions**: max players per room (suggest 2–20), whether tournament points feed weekly XP (suggest a separate tournament rating), moderation of nicknames.

## Addendum — 2026-11-04 (product owner): J. Scoring model — accuracy, attempts and response time

Every answer produces one **evidence record**. Three different scores are derived from it, each for a different purpose, so that one weighting never has to serve conflicting goals:

| Score | Purpose | Time matters? | Attempts matter? |
| --- | --- | --- | --- |
| **Skill rating** (Elo, per skill) | honest estimate of ability → Skill Map, placement, recommendations | a little (fluency), never in untimed mode | yes, with guessing correction |
| **XP** (weekly league, streak, daily goal) | motivation and effort | small speed bonus only | yes |
| **Tournament points** | competition between players on the same item | strongly | single attempt only |

### J.1 Evidence record (logged for every answer)
`item id, item type, difficulty, input modality (buttons / voice / sing / tap / knock), attempts used k, attempt limit L, number of choices m (categorical items), replays, hints / explain used, reaction time t_r, completion time t_c, accuracy components, untimed flag, timing reliable flag`.
Unclear speech, silence, permission failures and interruptions are **not attempts** and never enter the record as errors.

### J.2 Accuracy a ∈ [0, 1] — per item type
- **Categorical** (degree, chord quality, cadence, interval, bass, note name): 1 if correct, else 0.
- **Sung pitch**: 1 within the item tolerance (default ±35 ¢), falling linearly to 0 at ±100 ¢ (a "near miss" earns partial credit); a different note = 0. Octave policy per item.
- **Sequences** (degree sequence, sung melody, note-name sequence): from the note-by-note alignment, `a = correct / (target length + extra notes)` — one wrong note in five ≈ 0.8, not 0.
- **Rhythm performance**: pattern part = fraction of onsets hit in the lenient window minus extras; precision part = `1 − mean|offset| / (¼ beat)` (already used for rhythmic precision). Reading items combine them 70 / 30.
- **Dictation answers** (rhythm or melody): per-beat / per-note fraction correct.

### J.3 Attempts — g(k), with correction for guessing
A retry after a wrong answer is worth less, and for items with few options it is worth almost nothing, because elimination makes guessing easy:
- `g(1) = 1`.
- For a categorical item with `m` choices, after one wrong answer the chance of guessing right is `1/(m−1)`. Credit for a correct 2nd attempt: `g(2) = 0.5 × (1 − 1/(m−1))` → m = 2: 0 · m = 3: 0.25 · m = 4: 0.33 · m = 7: 0.42.
- Graded items (pitch, sequences, rhythm): `g(2) = 0.5`, `g(3) = 0.25` (no guessing correction; the answer space is continuous / large).
- Revealed answers: 0 for rating and tournament; XP gives a small effort credit (see J.6).

### J.4 Response time — measured fairly
- **Clock start**: when the stimulus *finishes being heard* (audio output clock, latency-corrected), or when a symbolic prompt has finished being shown / spoken. Each replay restarts the clock and is counted.
- **Clock stop**: buttons → the tap's event timestamp; voice → the recognizer's *speech-start* event (not the transcript, which adds 0.5–2 s of service delay); singing → the first stable voiced frame; sequences → both reaction (first input) and completion; rhythm performance → not applicable (timing *is* the task).
- **Paused**: pauses, app switches, permission prompts and "explain" stop the clock. After an unclear utterance, the clock for the next utterance starts at that listen's start (the recognizer's failure is not the player's time).
- **Reliability flag**: false when the timing source is unknown (e.g. no speech-start event); then time is ignored for that answer.

### J.5 Speed factor f(t) — relative, log-scaled, never harsh
- Reference time `T_ref` depends on item type, modality and size: initial values buttons 1.5 s (+0.3 s per choice beyond 2), voice 2.0 s, singing 1.0 s to stable pitch, sequences +0.6 s per note, symbolic theory items +1 s. Recalibrated later from collected records (median of players at that difficulty).
- `f(t) = clamp(1 − 0.25 × log2(t / T_ref), 0.5, 1)`: at or below T_ref → 1; twice as slow → 0.75; four times → 0.5; never below 0.5 for a correct answer.
- **Untimed mode** (player setting, default on for the first week and available always; recommended for young children and for players with motor or speech difficulties): `f ≡ 1` everywhere except tournaments.

### J.6 The three scores
- **Skill rating** — graded Elo score `S = a × g(k) × (0.8 + 0.2 × f(t)) × 0.95^replays` (replay factor floored at 0.8). Time can move S by at most 20 %, so knowledge dominates and fluency still counts. Unreliable timing / untimed → the time term is 1.
- **XP per item** = `max(1, round(base × a × g(k)))` + speed bonus `round(3 × (f(t) − 0.5) × 2)` (0–3, only when timed and a ≥ 0.8). The minimum of 1 is the effort point for any completed item (including revealed); base is 10 (15 for singing, 5 for review, 0 for placement / puzzle). Never negative. Lesson XP keeps the idempotent award rules. *Server plausibility check:* `xp ≤ total × 20` (implemented 0.8.0).
- **Tournament points** (single attempt, buttons-only rooms optional) = `round(1000 × a × (0.5 + 0.5 × f_T(t)))` with `f_T` linear from 1 at 0 s to 0 at the answer window's end; × streak multiplier 1.0 → 1.5. Ties broken by total response time.

### J.7 Feedback the player sees
- After each answer, small chips: **accuracy** (✓ / 80 % / −12 ¢), **time** (⏱ 1.4 s, green when ≤ T_ref), **attempts** (×2), and the XP earned with its parts on tap.
- Recap: accuracy, median response time and its trend vs the player's last 10 sessions ("faster than last week"), attempts used.
- Skill Map diagnosis: fluency trend (median time at the current level) next to the rating.

### J.8 Constraints and tests
- All constants live in one config object with these documented defaults.
- Unit-tested properties: more time never increases any score; more attempts never increase a score; higher accuracy never decreases a score; untimed mode makes scores independent of time; unclear input never changes a score; tournament points are bounded 0–1500.
- Changing weights must not rewrite history: records are stored raw, scores are recomputed.

## Addendum — 2026-11-04 (product owner): K. Vocal agility — riffs and runs

Singing in tune on a held note and singing a fast **run** (a quick scale-like passage) or **riff** (a short ornamented figure, e.g. a pentatonic or blues lick) are different abilities. A run is graded on pitch **and** agility, with a difficulty that reflects how hard it is to sing, so a 60 % accurate fast blues run can rate higher than a perfect slow three-note step.

### K.1 Exercise directions
- **Hear → sing back** (echo the run; feeds melodic memory too, like Echo Chain).
- **See / be told → sing** ("descending pentatonic run from 5 to 1, sixteenths at 80 BPM"; or shown on a one-line staff / as degrees).
- **Hear → identify** (which scale or shape was that: major, minor pentatonic, blues; up / down / turn) — a recognition item.
Always with an audible tonic / drone and a count-in; the run is sung on a vowel ("ah", "oo") or a syllable the player chooses.

### K.2 Difficulty factors (each scored, summed into the item difficulty)
| Factor | Easier → harder |
| --- | --- |
| Speed (notes per second) | 2 → 4 → 6 → 8+ (8th notes at 80 BPM ≈ 2.7 n/s; 16ths at 100 BPM ≈ 6.7 n/s) |
| Length (notes) | 3 → 5 → 8 → 12+ |
| Step size | stepwise → thirds → mixed leaps (≥ 4th) |
| Direction changes | one direction → one turn → zig-zag / turns around a note |
| Scale material | major / minor scale steps → major / minor pentatonic → blues (♭3, ♭5, ♭7) → chromatic passing tones |
| Range | within a 5th → an octave → beyond an octave, crossing the register break |
| Ornaments | none → passing tones → turns / mordents / "fall-offs" |
| Rhythm | even notes → mixed values / syncopated start → rubato phrase ending |

Item difficulty (rating scale) = 900 + weighted sum of the factor levels (weights in the scoring config, calibrated from player data). Levels map to a curriculum from "three-note step at 2 n/s" up to "R&B / gospel run, 12 notes, blues scale, 7 n/s".

### K.3 Pitch accuracy for fast notes
- **Segmentation**: per-note segments from the pitch track (as in Echo Chain), aligned to the target with edit-distance alignment; short notes need shorter analysis windows (≈ 20–30 ms hop) — the detector settings adapt to the item's notes-per-second.
- **What pitch counts**: the stable middle of each note (ignore the first and last ~20 % — scoops and transitions are natural in runs).
- **Tolerance scales with speed**: ±35 ¢ for held / slow notes, widening to about ±50 ¢ at 6–8 n/s, because nobody centres a 120 ms note like a held one. Wrong-note threshold stays at a semitone.
- **Per-note statuses** as for melodies: accurate / sharp / flat / wrong / missed / smeared (no stable pitch — glided through), shown on the per-note strip, spoken as a short summary ("notes 4 and 5 were flat").

### K.4 Agility and timing
- **Note clarity**: fraction of target notes that produced a stable, separate pitch segment (a run that smears into a glide scores low even if start and end are right).
- **Evenness** (for even runs): spread of note durations; **timing**: onset error against the metronome grid when the item is metered.
- **Accuracy a** for the scoring model (J.2) = `0.6 × pitch (mean per-note pitch accuracy) + 0.25 × clarity + 0.15 × timing/evenness`, with notes missing or extra counting as 0 pitch.

### K.5 Skill Map
- A new axis **Vocal agility** (runs and riffs), next to *Singing in tune* (held / slow notes) and *Melodic memory*. A run sung back from hearing also feeds melodic memory (pattern correct), as Beat Echo feeds rhythmic memory.
- Diagnosis names the weakest factor ("leaps", "speed above 5 n/s", "blues ♭5") and recommends the next run at that factor's level.

### K.6 Practice aids
**Status (0.14.0)**: built — `src/engine/runs.ts` (8-level curriculum, factor levels and difficulty, speed-scaled tolerance, 20 ms hop for fast runs, smear detection by pitch slope in the note middle, clarity, evenness, a = 0.6/0.25/0.15), lesson 14 *Riffs & runs* (2 recognition + 3 sung, echo and told), *Runs workshop* (60/80/100 %), Skill Map axis *Vocal agility*, review tags. Simplifications: echo runs feed only Vocal agility (not melodic memory); diagnosis by weakest factor and the visual pitch trace are not built yet; weights not yet calibrated with real singers.

Slow-down practice (the same run at 60 % → 80 % → 100 % tempo, unlocking the faster version on success), loop a single turn, hear the model at half speed, and a visual pitch trace over the target notes after each attempt.

## Status of the accepted extra ideas (2026-11-05)

| Idea | Status |
| --- | --- |
| Daily challenge (Wordle-style) + server leaderboard | ✓ 0.11 / 0.13 |
| Same-device duel, online rooms | ✓ 0.11 / 0.12 |
| Ghost race | ✓ 0.19 |
| Spaced repetition for review | ✓ 0.17 |
| Drone singing | ✓ 0.17 (drone practice screen) |
| MIDI keyboard / instrument input | ✓ 0.17 (Web MIDI keyboards; acoustic instruments still go through the microphone pitch detector) |
| Teacher / class mode | ✓ 0.19 |
| Jazz track | ✓ 0.18 (Jazz 1: sevenths, ii–V–I family) — licks and swing-feel melodies are a later Jazz 2 |
| Real public-domain melodies | ✓ 0.18 (Songs you know) |

## Addendum — 2026-11-05 (product owner, user testing): L. Overall rating next to every name

Inspired by chess.com: one number that says "how good am I overall", always visible next to the player's name, and an exact account after every session of how it moved — overall and per skill.

### L.1 The number
- **Ninth Sense rating** (overall), on the same scale as the skill ratings (Elo-like, start 1000; bands: < 900 beginner · 900–1099 developing · 1100–1299 solid · ≥ 1300 advanced).
- **Formula** — a confidence-weighted mean of the measured skill ratings:
  - per skill k: confidence `cₖ = min(1, nₖ / 12)` and effective rating `r'ₖ = 1000 + cₖ · (rₖ − 1000)` (a skill measured with 2 answers moves the overall only a little);
  - importance `wₖ`: listening skills (degrees, notes, intervals, chords, cadences, rhythm dictation, melodic memory) **1.0**; performance (singing in tune, rhythm reading, vocal agility) **1.0**; game-only axes (rhythmic memory, rhythmic precision) **0.5**;
  - `overall = Σ wₖ·cₖ·r'ₖ / Σ wₖ·cₖ` over measured skills, rounded.
- **Provisional** (shown with "?", e.g. *1084?*) until at least 4 skills are measured **and** at least 30 rated answers exist in total — like chess.com's provisional rating.
- **Peak** (highest overall ever) and **change over 7 / 30 days** are kept.

### L.2 Where it appears ("next to every name tag")
| Place | What is shown |
| --- | --- |
| Home header | a name chip: initial + display name (or "You") + rating with a band-coloured ring; tap → Skill Map |
| Friends list | each friend's rating next to the name; sort by rating or by XP this week |
| Online room lobby, round board, podium | rating next to every nickname |
| Daily challenge friends board | rating next to each friend |
| Class roster (teacher) | rating column |
| Same-device duel, ghost race | local players have no account → no rating (the ghost shows your rating at the time) |

Server: `toneturn_profiles` gains `rating`, `rating_provisional`, `rating_peak`, `rating_at`; the client reports after every sync through `toneturn_report_rating` (range-checked 100–3000; self-reported, the same trust model as game bests, documented). The friends, rooms, daily and class functions return it.

### L.3 After every session ("how did my rating move?")
The recap gains a **rating card**:
- the overall rating counting from the old value to the new one, with **▲ +12 / ▼ −6** (arrow + sign + colour, never colour alone);
- one row per skill the session touched: name, new rating, change, and a small before→after bar;
- crossing a band boundary: "You reached **Solid** in Chords" with a short celebration;
- a new peak: "New best: 1131";
- first-try accuracy of the session next to the change.
Sessions that do not rate (practice replays) say so: "Practice — rating unchanged".

### L.4 History
The Skill Map opens with the overall rating, its trend chart (same component as the per-skill trends of 0.21), peak and 30-day change; the per-skill trends follow.

### L.5 Later (needs server aggregates)
"Players at your level solve this in …" on the weekly puzzle and the daily challenge.

## Addendum — 2026-11-05 (product owner, user testing): M. Visual aids — keyboard, notation, guitar tab

### M.1 Choice of display (non-rhythm exercises)
Settings → *Show notes as*: **Keyboard**, **Notation** (treble staff with key signature), **Guitar tab** (6 strings, standard tuning) — any combination; default Keyboard + Notation. The same notes are drawn in each chosen view.

### M.2 When views may show the sounding notes
Unchanged rule (0.21): for listening tasks the sounding notes stay hidden until the question is answered, in every view; afterwards they light up so "your answer, then the right one" is visible. Exceptions where the sound is only context (singing from a degree / name / description): the views stay live.

### M.3 Aids during the question count as a hint (9a)
Some views help without giving the answer away. These are **aids**:
| Aid | On | Example |
| --- | --- | --- |
| *Key map*: the key's scale outlined, tonic highlighted, no sounding note | degree / note-name / interval / sequence questions | "Which degree is this?" with the E♭ scale outlined |
| *Target*: the note(s) to perform | singing from a degree / name, runs from a description | "Sing 5" with B♭ marked on keyboard / staff / tab |
| *Lookup*: the key's notes with their degree numbers | name ↔ degree conversions | "Which note is degree 6 in E♭?" |

- **Scoring**: an item answered with an aid on counts as easier — difficulty −120 (key map) or −150 (target / lookup) in the rating update, and XP × 0.8. A small "💡 aid" chip on the question makes this visible.
- **Default (Auto)**: aids are on while that skill is below *Solid* (< 1100) and switch off by themselves once it reaches Solid — they fade as the level rises. Settings → *Aids*: Auto · Always · Never. Placement and the daily challenge never show aids.

### M.4 Guitar tab (9b)
- Standard tuning E A D G B E. Single notes in the lowest position that fits (frets 0–5, moving up only when the range needs it); chords as one tab column using common shapes; sequences and runs as a tab line left to right.
- Drawn with VexFlow's TabStave (already bundled), under or instead of the staff; the timing rule (M.2) and the aid rule (M.3) apply.

## Addendum — 2026-11-05 (product owner, user testing): N. Streak 2.0 — freezes, gems, milestones, celebration

Inspired by Duolingo.

### N.1 What keeps a streak
One completed session in the local day: a path lesson, review, placement, the weekly puzzle, the daily challenge (first play), the runs workshop, or a memory game of at least 3 rounds.

### N.2 The moment the streak grows
The first qualifying session of the day ends with a **streak screen** before the recap: the flame grows from grey to lit, the number rolls N → N+1, a short rising sound and a haptic tick, and the week strip fills today's dot. "See you tomorrow!" With reduced motion: an instant change, no rolling.

### N.3 Streak freeze
- **One free freeze per week**, granted on Monday (local) when fewer than 2 are equipped. A freeze is used automatically for a missed day; two missed days need two freezes, otherwise the streak resets.
- Used freezes show as ❄ days in the streak calendar; the next visit shows "Your freeze kept your 12-day streak" with an ice animation.
- At most **2 freezes equipped** (free and bought together).

### N.4 Gems
A soft currency, earned for effort and spent on streak items — never needed for lessons.

| Earn | Gems |
| --- | --- |
| Lesson / review / workshop completed with ≥ 80 % first-try | 5 |
| Daily goal reached (30 XP) | 10 |
| Weekly puzzle gold / silver | 20 / 10 |
| Daily challenge, first play | 5 |
| Streak milestone 7 / 30 / 100 / 365 | 50 / 150 / 500 / 1500 |

| Spend | Gems |
| --- | --- |
| Streak freeze (max 2 equipped) | 200 |
| Streak repair (within 48 h of a broken streak, when no freeze was left) | 400 |

Earnings are **derived from results** (deterministic, so a cloud rebuild gives the same balance); purchases are an append-only list synced with the profile. Balance = earned − spent, never negative.

### N.5 Milestones
3, 7, 14, 30, 50, 100, 200, 365 days → confetti, a badge on the profile and a share card; the next milestone shows as a progress ring around the flame ("4 days to 30").

### N.6 Notifications (push, opt-in — the existing reminder service)
- Evening reminder at the chosen hour (exists).
- **Streak at risk**: 2 hours before local midnight if today is not done and the streak is 3 or more.
- **Freeze used**: next morning, "Your freeze saved your 12-day streak".
- **Milestone tomorrow**: "1 more day to 30 🔥".
At most one push per day. The server counts freeze days as practised (freeze days are stored server-side when used).

### N.7 Animations (all respect reduced motion)
Home flame: grey and gently breathing while today is not done, lit afterwards; tap → streak calendar (month view, ❄ days, milestones). Gems: a counter that flies from the recap to the header chip.

## Addendum — 2026-11-05 (product owner, user testing): O. "True or false?" — a speed game on intervals

Built on the home-screen art: three notes appear (left, middle, right) with two interval labels. **Are both labels right?** Answer ✓ / ✗ as fast as possible.
- **Solo**: a 60-second run; +1 per right answer with a streak multiplier; a wrong answer costs 2 seconds; best score kept (and raceable as a ghost).
- **Duel on one device**: split screen like the duel; the first correct tap wins the round; a wrong tap locks that player out of the round.
- **Levels**: P5 / P8 / M3 only → all qualities → note names in Do-Re-Mi → ear mode (hear the notes instead of reading the names).
- Feeds the *Intervals* skill (first taps only, rated like other items; difficulty from level and response time).
- Wrong labels are near misses (m3 ↔ M3, P4 ↔ ♯4, ♭5 ↔ P5), never absurd ones.

## Audit — 2026-11-05: spec items not built yet

| Item (spec section) | State |
| --- | --- |
| Vocal range calibration — sing / choose lowest and highest comfortable notes, fit sung drills into the range ("Vocal range and per-note feedback") | **not built** — sung drills are octave-insensitive instead. Becomes P.0 below. |
| Slash chords (C/D) — bass modelled apart from root and quality (Progression…) | not built (triad inversions are built) |
| Review: hear your answer next to the right one (Progression…) | not built (recap shows the text only) |
| Weekly leagues with cohorts, global scoreboard (Challenge modes 3) | partial — weekly XP among friends, daily-challenge global rank; no cohort leagues |
| Gems for cosmetic themes / instrument sounds (Challenge modes 3) | not built (gems buy freezes only) → Q below |
| Asynchronous 3-question friend duels (Challenge modes 4) | not built |
| Weekly puzzle: the same versioned puzzle for everyone online (Challenge modes 2) | local only |
| Room QR code, daily keys re-seed before 2029 (I) | not built |
| Memory games later: tempo ladder, swing call-and-response, jazz phrases, online (C.4) | not built → R below |
| Rhythm later: 12/8, hold-to-sustain durations (G) | not built |
| Runs: diagnosis by weakest factor, visual pitch trace (K) | not built → the trace is P.3 |
| Jazz 2: licks, swing melodies; melodic-minor teaching example (Teaching) | not built |
| "Players at your level solve this in …" (L.5) | not built (needs server aggregates) |

## Addendum — 2026-11-05 (product owner): P. Vocal technique — a measurable singing track

Singing so far tests *which* note was sung (intervals, degrees, runs). This track trains *how* it is sung, from one steady note up to fast passages, and every step is **measured** from the pitch track (YIN, 20 ms hop) so progress shows on the Skill Map and in trends.

### P.0 Before the first exercise: the voice profile
- **Range calibration** (the unbuilt spec item): a slow guided glide down and up on "ah", or pick the notes by hand; keep the comfortable low / high (not the extremes) and show them on a keyboard. Retake any time in Settings. Never label the person with a voice type; it is only "your range".
- Every sung exercise is placed inside this range (transpose the key; never change the intervals).
- **Headphones advised.** Without them the reference note stops as soon as the voice starts, so the piano never leaks into the measurement; an echo check warns when it does.
- **Voice care**: a 2-minute warm-up suggestion before the session, no exercise sits at the range edges until the player opts in, a break suggestion after ~15 minutes of singing, and "stop if it hurts" in the intro.

### P.1 Metrics (pure functions over the frames, unit-tested on synthetic tracks)
| Metric | How | Initial bands (calibrate with real singers) |
| --- | --- | --- |
| **Onset / settle** | time from voice onset until the pitch stays within ±25 ¢; scoop size at onset | ≤150 ms excellent · ≤300 good · ≤600 fair |
| **Intonation** | mean signed cents over the sustained part (centre of the vibrato when there is one) | ≤10 ¢ · ≤20 · ≤35 |
| **Stability (straight tone)** | standard deviation of cents after removing the slow trend | ≤6 ¢ · ≤12 · ≤20 |
| **Drift** | slope of the slow trend (¢/s) — going flat at the end of the breath | ≤3 · ≤6 · ≤10 ¢/s |
| **Vibrato rate** | cycles per second from the detrended curve (≥3 cycles) | 5–6.5 Hz ideal · 4.5–7 good |
| **Vibrato extent** | mean half peak-to-peak in cents; target by style: *pop / musical* 20–50 ¢, *classical* 40–100 ¢ (player setting) | inside the style band |
| **Vibrato regularity** | coefficient of variation of cycle lengths and of extents | ≤10 % excellent · ≤20 % good |
| **Vibrato control** | straight → vibrato on cue (delay error), vibrato → straight (stop error) | ≤300 ms good |
| **Breath / duration** | longest stretch that keeps intonation and stability inside "good" | per level (3 → 5 → 8 → 12 s) |
| **Transition** (melodies) | time from leaving one note to settling on the next; overshoot / scoop at landing; legato = no voice break | per tempo |
| **Timing** (rhythmic passages) | each note's settle moment vs. the beat grid (latency-compensated) | ±60 ms good at 90 BPM |

Unclear frames (low confidence / noise) are left out; a take with too little clean voice is "unclear" and is never penalised.

### P.2 The ladder (each level: 3–5 short items with its own pass bands)
1. **Match and hold** — one note in the middle of the range, unison with the reference; 3 s, then 5 s, then 8 s. Then *without* the reference sounding while singing.
2. **Straight tone** — the same with no vibrato allowed (stability scored).
3. **Vibrato** — *delayed vibrato* (2 s straight, then vibrato), *on / off on cue*, and *steady vibrato* graded on rate, extent and regularity. Optional pulse guide at 5.5 Hz for beginners.
4. **Across the range** — the same holds on 5 notes spread over the calibrated range. Result: a **range map** showing where stability, intonation or vibrato break down.
5. **Messa di voce** — hold one note, swell and fade (≥ 6 dB change) while the pitch stays within ±15 ¢.
6. **Glides (sirens)** — slide between two notes smoothly and land in tune.
7. **Given melodies, stepwise** — 3–6 notes, seconds only, shown and heard once; per-note intonation + transitions + legato.
8. **Wider intervals** — thirds → fifths → sixths → octaves; landing accuracy, overshoot, settle time.
9. **Faster transitions** — the same melodies on a metronome: quarters → eighths → triplets → sixteenths; timing and transitions scored together.
10. **Agility** — continues into *Riffs & runs* (addendum K), the top of the track.

Side drill at any level: **clean onsets (staccato)** — short notes that start on pitch with no scoop.

### P.3 Feedback
- **Live pitch trace** (also fills the gap in K): the target band, the sung curve on top, vibrato visible as a wave; text summary for screen readers.
- **After each take**: the 3 most relevant metrics as bars against their bands, one rule-based tip from the weakest metric (e.g. drifts flat → "keep the air going to the end of the note"), and *listen back* (kept in memory for this screen only, never uploaded).
- **Trends per metric** (same chart component as the skill trends).

### P.4 Ratings
- New Skill Map axis **Vocal technique** (sub-scores: intonation, stability, vibrato, range evenness, transitions). *Sung pitch accuracy* and *Vocal agility* stay.
- Item difficulty from level, duration, register position and tolerance; a take's score a ∈ [0, 1] is the weighted mean of its metric scores (weights per level, documented in code).
- Placement gets one short hold item for this axis (voice mode only).

### P.5 Where it lives
A **Vocal technique** section on Home (voice mode), plus a 3-minute **daily vocal warm-up** built from levels 1–6 that also counts for the streak.

## Addendum — 2026-11-05 (product owner): Q. Instrument sounds

- A **Sound** setting used by every exercise: *Classic* (today's synthesised piano — offline, no download, the default), *Grand piano* (Salamander Grand Piano V3, CC BY 3.0 — credit Alexander Holm on the About screen), and more instruments from **VCSL** (CC0): e.g. upright piano, organ, celesta / glockenspiel, plucked strings.
- Samples **hosted with the app** (no third-party CDN), every 3rd semitone, compressed (~1–3 MB per instrument), downloaded only when chosen, then cached offline; progress bar; fall back to Classic on failure.
- Rhythm keeps its percussion; the drone gets a matching sustained timbre.
- Gems may unlock **cosmetic** extras only (themes, extra instruments beyond the base set) — nothing that changes difficulty or scoring.

## Addendum — 2026-11-05 (product owner): R. Every game for groups — same device and live between devices

- **Same device** wherever it fits: 1–4 players (turns, or split screen for speed games). To add: Riffs & runs, daily challenge in practice mode, ghost race against a friend's run.
- **Live between devices ("Kahoot-style")**: one device hosts (plays the sound, shows a join code + QR); players join from phones with a nickname; everyone answers at once; the server grades and scores accuracy + speed; a live leaderboard with movement after every question; podium; rematch.
- Games: question sets (built), True or false?, Echo Chain / Beat Echo as simultaneous elimination rounds, vocal holds (P) as "who holds steadiest".
- Extends the existing room migration with game kinds; reuses grading, nicknames and limits from I.

## Proposals for review — 2026-11-05: S. Further ideas

1. **Daily workout planner** — "I have 5 / 10 / 20 minutes": a plan mixing the weakest skill, due reviews, a vocal warm-up and a game.
2. **Record and compare** — one short local take per vocal level each week; "you a month ago vs now".
3. **Harmony singing** — sing a third / sixth above a played melody, or the missing chord tone; scored like P.
4. **Combined dictation** — a 2-bar melody with rhythm: hear it, write it on the staff.
5. **Slash chords and bass lines** — finish the spec item.
6. **Hear your answer** — in the recap and review, play what you answered next to the right one.
7. **Weekly leagues** — cohorts of ~30 by level, promotion / relegation by weekly XP.
8. **Async friend duels** — 3 questions, the friend plays later; result as a notification.
9. **Achievements** — "8-second steady hold", "even vibrato", "first octave leap in tune", "100 true-or-false in a row".
10. **Song sing-along** — public-domain songs with a scrolling staff and live pitch scoring (own design).
11. **Absolute pitch corner** (optional, clearly labelled), tracked apart from relative skills.
12. **Instrument mode** — answer on an acoustic instrument through the microphone, with per-instrument transposition.
13. **Teacher additions** — assign vocal technique levels and see per-metric results per student.

### P.6 Advanced vibrato (product owner, 2026-11-05) — levels 10–11
Measures follow voice research: **rate** (Hz; trained singers ≈ 5–7 Hz), **extent** (± cents; larger in operatic than Broadway / jazz style), and regularity as **vibrato jitter** (cycle-to-cycle change of the period) and **shimmer** (cycle-to-cycle change of the extent) — both fall with training. Exercises follow voice pedagogy: delayed vibrato, alternating straight / vibrato, vibrato only on the closing (long) note, rate pulses.
- **Level 10 — Vibrato control**: rate on demand (≈ 5 Hz, then ≈ 6.3 Hz, with a pulsing guide), width on demand (narrow ±18–35 ¢, wide ±55–95 ¢), alternating straight / vibrato on five cues inside one long note.
- **Level 11 — Vibrato in phrases**: vibrato only on the marked notes of a phrase (straight on the short notes), the same vibrato on low / middle / high notes (consistency of rate and width across the range), vibrato kept identical through a swell (first vs. second half).
- New metrics: jitter, shimmer, placement (share of notes with vibrato exactly where asked), consistency. On-demand rate / width gate the take score.
Sources: Heid & Fan, *Real-time vocal vibrato training system* (U. Rochester, 2014); Mitchell & Kenny, change in vibrato rate and extent during tertiary training (J. Voice); vibrato jitter / shimmer in operatic vs. jazz singers; NATS, *Shaken not stirred* (vibrato and non-vibrato singing); U. Pretoria dissertation on vibrato as a diagnostic tool.

### P.7 Scales & modes — sung (product owner, 2026-11-05)
Eight levels: Ionian pentachord → Ionian octave up / down, Aeolian, pentatonic → Dorian, Mixolydian → Lydian, Phrygian, blues → harmonic and melodic minor, Locrian, Phrygian dominant → Lydian dominant, whole tone, altered, diminished → up in one mode, down in another (C Ionian / Aeolian, D Dorian / Mixolydian …) → master: G Mixolydian up / G altered down, B♭ Lydian dominant / altered, A harmonic minor / Phrygian, E diminished / whole tone, C Lydian augmented / altered. Early levels play the whole figure first (echo); later only the tonic (told — the notes stay hidden until the take is graded). The named tonic is kept when the figure fits the player's range, else the nearest tonic that does. Wrong notes dominate the score (score × (0.4 + 0.6 · right-note share)).

### P.8 Modes by ear (product owner, 2026-11-05)
Hear a scale from its tonic (up and down; up only at the top level) and name the mode, by voice or buttons. Six levels: Ionian vs Aeolian → Ionian / Dorian / Mixolydian / Aeolian → all seven church modes → minor colours (Aeolian, harmonic minor, melodic minor, Dorian, Phrygian dominant, Phrygian, Lydian dominant, Mixolydian) → all modes of melodic minor and harmonic minor (Dorian ♭2, Lydian augmented, Lydian dominant, Mixolydian ♭6, Locrian ♮2, altered; Locrian ♮6, Ionian ♯5, Dorian ♯4, Phrygian dominant, Lydian ♯2, ultralocrian) → everything incl. whole tone and diminished, faster. Distractors are the nearest modes (one or two notes apart). After a miss: your mode, then the right one. New Skill Map axis **Modes by ear**; review / spaced repetition rebuild the question from its tag.

### P.9 Reference requests and melodic memory (product owner, 2026-11-05)
Every sung passage in a scale or mode, and every given melody, starts with a reference (the tonic, or the whole figure at the early levels). During the exercise the player may ask for the reference again (🔁). The first reference is part of the task; **each extra request lowers the melodic-memory score by 15 % (never below 40 %)**. Pitch quality (Vocal technique) is not affected. The sound of a requested reference is cut out of the take (those frames are ignored). The same rule applies to sung lessons (sing-seq, sing-run): their replays reduce a separate melodic-memory rating event.

### P.10 The app's own sound never counts as the singer (bleed gate)
Whenever the app sounds while the player sings — the drone, a held reference, a chord or a melody for harmony singing — and headphones are not confirmed, the microphone also hears that sound. Before singing, the app plays it for 0.6 s while the player waits ("measuring the sound in the room") and learns its level at the microphone; then a frame is dropped when it sits on a sounding pitch (±35 ¢) without being clearly louder (×2.5) than that leak, or when it is no louder than the room at all. In sung lessons the first 450 ms after the microphone opens (reference tail, ready chime) never count. Sing-along's guide melody (the same pitches the player sings) is off by default and marked "headphones only".

### Status (0.27.0, 2026-11-05)
- **P vocal technique**: built — range calibration, 11 measured levels + Riffs & runs, advanced vibrato (P.6), scales & modes (P.7, 8 levels incl. blues, pentatonic, bebop, double harmonic, Hungarian minor), modes by ear (P.8, 8 levels), harmony singing (5 levels incl. intervals over a held note), daily warm-up, live pitch trace, tips, listen-back, trends, range map, then-and-now (opt-in, on device), reference rule (P.9), bleed gate (P.10). Simplification: placement has no vocal-technique item (the axis is measured from the vocal track).
- **Q instrument sounds**: built — Salamander grand (CC BY), upright, harpsichord, harp, marimba, vibraphone, organ (VCSL, CC0), on-demand download, offline cache. Not built: a sampled drone timbre (the drone stays synthesised); gem-unlocked cosmetics.
- **R group play**: built — rooms and duels for every question game (modes, wrong notes, true-or-false, rhythm dictation, Echo Chain together, steadiest voice), big-screen mode, per-kind answer windows. Needs migration 17.
- **S ideas**: built — 1 workout planner, 2 then-and-now, 3 harmony singing, 4 combined dictation (lesson 24), 5 slash chords & bass lines (lesson 23), 6 hear your answer, 7 weekly leagues, 8 async friend duels (no push notification yet: the duel appears in Friends), 9 achievements, 10 sing-along, 11 absolute pitch corner, 12 instrument mode (written-pitch names in the vocal track and sing-along; lessons stay in concert pitch), 13 teacher tools (assign vocal / modes / wrong-notes, per-student vocal metrics). Leagues, duels, puzzle stats and teacher vocal metrics need migration 18.
- **Audit gaps**: built — vocal range calibration, slash chords, hear-your-answer, leagues, async duels, weekly puzzle online stats, daily keys through 2031, memory-game tempo ladder / swing / pad sets, rhythm 12/8 and hold-to-sustain, runs diagnosis + trace, Jazz 2 (lesson 25), players-at-your-level (L.5). Still open: room QR code (needs a QR library — awaiting approval), gem-unlocked cosmetics.
- Voice synonyms: one canonical spoken vocabulary (#11 = ♯4 = ♭5 = tritone; Δ = maj7; ø = m7♭5; mode aliases, Hebrew included).

## Addendum — 2026-11-05 (product owner, approved): T–W. Barry Harris, more ear/theory areas, performance, views, precise feedback

The content proposal (docs/PROPOSAL-T-content.he.md) is approved in full. Every topic runs in the app's matrix where it makes sense — sound → identify, name/degree → sing, sing → the app identifies what was sung — at graded levels.

### T. Barry Harris
- **T.1 6th diminished scales**: major 6-dim (C6 + Bdim7 = C D E F G A♭ A B) and minor 6-dim (Cm6 + Bdim7). Hear: 6-dim vs major vs harmonic major; is this note from the 6 chord or from the dim chord. Sing: the scale up/down (reference rule P.9); only the 6-chord notes / only the dim notes; harmonised: the app plays the alternating chord under each sung note.
- **T.2 Diminished conversions**: lowering one note of a dim7 a half step gives one of four dominant 7ths (roots a minor third apart); raising one gives one of four minor-6 chords. Hear → name the chord and which note moved; name → sing the note that must move over the held dim7; degree → sing ("lower the 3rd note"); sing → identify (the player chooses a note, the app names the chord made); resolve (sing the tonic the dominant goes to); the four keys a dim7 can lead to.
- **T.3 Chromatic scale**: sung in sections with half-step evenness; hear which chromatic note was added.
- **T.4 Barry Harris chromatic rules / T.5 pivots**: verified against a published Barry Harris worksheet (half steps: from a chord tone 1–♭7; from 3, 5, 7 three; from 2, 4, 6 two; each extra half step once) and built (hear: where is the half step, how many, did the chord tones land on the beats, where did the line pivot; sing: half-step lines). Also: brother dominants (the four dominants that share one diminished chord).

### U. Ear and theory
1 extensions and alterations (9, ♭9, ♯9, ♯11, 13, ♭13, alt, sus4, add9, with the tension audible on top) · 2 voicings (shell, drop-2, rootless, quartal, close vs open) · 3 progressions (secondary dominant, tritone sub, backdoor, modal interchange, blues turnaround, ii–V–I) · 4 form (AABA / ABAB / AABB / ABAC from phrases) · 5 fine pitch (higher/lower and in-tune/sharp/flat down to 10 ¢) · 6 two-voice dictation (top line, then bass line) · 7 post-tonal (trichord set classes 012 015 016 024 027 037 048) · 8 maqamat (Hijaz, Bayati, Rast with quarter tones, Nahawand, Kurd, Saba) and Middle-Eastern rhythms (maqsum, saidi, baladi, malfuf, ayyub) · 9 advanced rhythm (polyrhythm, odd meters 5/4 7/8, swing ratio, internal clock: the metronome drops out) · 10 written theory (key signatures, interval and chord spelling, Roman numerals, circle of fifths, transposition, chord-scale, note reading in treble / bass / alto clef).

### V. Performance
1 **sight-singing / sight-reading**: a melody with rhythm shown as notation, tab or keyboard (the player's choice), only the tonic as reference; sung (or played) and graded on pitch and timing · 2 ornaments (trill, mordent, turn, grace note) and dynamics (crescendo / decrescendo to a target curve) · 3 **choir rooms**: every phone gets a part of the chord, everyone sings at once, each part scored on intonation · 4 **guided improvisation** over a ii–V–I loop: chord tones on strong beats, ending on a chord tone, rhythmic variety, range, chromatic approaches · 5 MIDI keyboard drills (play a named voicing, even scales, play back a melody, ii–V–I in all keys) · 6 guitar drills from tab through the microphone · 7 play-along backing tracks (ii–V–I, blues; key and tempo).

### Views (product owner)
Wherever notes are shown — lessons, Echo Chain (answered notes), vocal technique, sight-reading, sing-along — the player chooses keyboard, staff, guitar tab or any combination (Settings → Show notes as), and the views stay hidden while showing them would give the answer away.

### W. Precise singing feedback (product owner)
Feedback on a sung note says how and where, not only right/wrong, in the player's language:
- **Average offset**: spot on (< 10 ¢) · a touch flat/sharp (10–25) · a bit flat/sharp (25–50) · quite flat/sharp (> 50).
- **Where**: "you went flat/sharp at the end" (the last third drifts ≥ 15 ¢ from the first), "you slid up/down into the note" (scoop at the onset ≥ 40 ¢), "a bit unsteady" (wobble ≥ 20 ¢).
- **Melodies**: the same per note, summarised ("note 3 was a bit flat, note 5 went sharp at the end").
- Used in lessons (spoken + caption), vocal technique (take card), Echo Chain (sung turns), sing-along and sight-singing. At most two remarks per take, the most important first.

### Status T–W (0.28.0, 2026-11-05)
- **T**: built — topics bh-convert (3 levels), bh-convert-2 (2), bh-keys, bh-scale (3), bh-tone, bh-six-over (3), bh-lines (3), bh-pivot, bh-brothers (2), chromatic-added (2); Barry Harris singing track, 7 levels.
- **U**: built — 1 extensions (7/9/13, altered, major colours), 2 voicings (close / drop 2 / spread, inversions, shell / rootless / quartal / upper structure), 3 progressions (pop, jazz incl. tritone sub and turnaround, borrowed incl. backdoor), 4 form, 5 fine pitch (50 / 25 / 10 ¢) and in tune, 6 two voices (motion, lower line, upper line), 7 trichords (three sets of levels), 8 maqamat (Hijaz, Nahawand, Kurd, Ajam; Rast, Bayati, Saba, Sikah with quarter tones; jins) and iqa‘at (maqsum, baladi, saidi, malfuf, samai 10/8, karsilama 9/8), 9 polyrhythms, odd meters, swing feel, 10 written theory (key signatures, interval & chord spelling, Roman numerals incl. secondary dominants, circle of fifths, transposition incl. B♭ / E♭ / F instruments, chord-scale, note reading in treble / bass / alto). Also built: internal-clock drill, sus4 / 7sus4 / add9 / alt. Not built: ayyub (pattern not verified).
- **V**: built — 1 sight-singing (5 levels; the guitar tab variant in Play & improvise), 2 ornaments & dynamics (4 levels), 3 choir rooms (a vocal-hold room whose seed is ≥ 2^32; parts round-robin by join order, moved to each singer's octave), 4 guided improvisation (report: strong-beat chord tones, ending, rhythmic variety, range, chromatic approaches), 5 MIDI drills (voicings any / shell / rootless, play it back, even scale, ii–V–I around the circle; on-screen keys without a device), 6 guitar from tab, 7 backing tracks (ii–V–I, minor ii–V–i, 12-bar blues; any key, 60–220 bpm).
- **Views / W**: built as specified.

- **Open items closed (0.28.0)**: gem cosmetics (colour themes), recorded drone sound (organ), duel push notifications (migration 19 + function; to be applied).

- **Leagues (product owner, 2026-11-05)**: superseded by Y below (the chord ladder).

## Addendum — 2026-11-05 (product owner): X. Quick lessons before every unit, a collection, personal coaching

- **X.1 Quick lessons.** Every unit — each learning-path lesson, practice topic, vocal track, Play & improvise tab and game — opens with a 60–90 second spoken lesson: short sentences (also shown as captions), a played example after almost every idea, notes in the player's chosen views (keyboard / staff with key and clef / tab) or a big symbol line. Tone: personal ("you", the player's first name once when known), playful, encouraging — and exact, relevant to what the exercise asks. It ends with "your turn", saying how to answer. Content lives in `src/content/mini/*.ts` (format `src/content/miniTypes.ts`, unit map `src/content/units.ts`); a test checks every unit has a lesson, 5–10 steps, 100–240 English words, at least 3 examples, both languages.
- **X.2 When it appears.** Automatically when a unit starts, until the player has heard it to the end; "Skip to practice" always available; pause, back, next, replay the example. A setting turns automatic lessons off. (Test runs with `?sim` or `?unlock` skip them unless `?mini` is given.)
- **X.3 Collection.** Hearing every step plays a celebration (the topic card flips in, confetti) and files the topic in **Topics I learned**, by area (ear, harmony, rhythm, written theory, jazz & Barry Harris, voice, world music, play & games). Topics still to discover show as silhouettes; any card replays its lesson. Synced with the settings.
- **X.4 Personal coaching.** After a wrong try, a hint about *your* answer that does not give the right one away ("not 5 — this one is lower than 5", "the first 2 notes were right", "listen to the 6th note — that's where Dorian and Aeolian differ"); after the reveal, what makes the two different; at the end of a session, the pair you mixed up most with a tip, or praise. Spoken and shown. (`src/engine/coach.ts`.)

## Addendum — 2026-11-05 (product owner): Y. The league ladder is a chord

- **Y.1 Seven leagues**, built as a chord stacked in thirds from middle C — every league adds a note: **Root** (C) · **Third** (E) · **Fifth** (G) · **Seventh** (B♭) · **Ninth** (D, the brand league) · **♯11** (F♯) · **13** (A). The full stack is C13♯11, the Lydian-dominant chord — the chord the overtone series spells (partials 7, 9, 11, 13 ≈ ♭7, 9, ♯11, 13). Hebrew: שורש · טרצה · קווינטה · ספטימה · נונה · ♯11 · 13. Tiers 1–5 keep their numbers (no one moves when this ships).
- **Y.2 Rules** (weekly XP from every saved session; the server caps 20 XP per item; cohorts of up to 30):

  | League | Moves up | Also needs (weekly XP) | Moves down (cohort ≥ 10) |
  |---|---|---|---|
  | Root | top 5 | > 0 | — |
  | Third, Fifth | top 5 | > 0 | bottom 5 |
  | Seventh | top 4 | > 0 | bottom 5 |
  | Ninth | top 3 | ≥ 500 | bottom 5 |
  | ♯11 | 1st place only | ≥ 900 | bottom 6 |
  | 13 | — | — | bottom 8 (the summit is re-earned weekly) |

  First placement from the overall rating, never above the Seventh: the Ninth and higher are only earned in play. The live table marks ▲ (moving up), △ (in the places but short of the XP), ▼ (moving down). Client and server share the rule (`src/engine/league.ts`, `toneturn_league_move` in migration 20).
- **Y.3 Look.** The badge is a small staff that fills with the chord: middle C on its ledger line, then E, G, B♭ (with its flat), D, F♯, A (top ledger line); the newest note glows in the league colour and pulses softly, the next note shows as a dashed outline. Colours: Root stone grey, Third turquoise, Fifth sky blue, Seventh violet, **Ninth gold** (its D stays gold with a small "9" in every higher badge, and the badge glows), ♯11 magenta, 13 an aurora frame that slowly shifts colour. The league card is tinted with the league colour and shows the whole ladder (reached / current / ahead) and the goal for this week.
- **Y.4 Ties.** *Your ear's chord* on the Skill Map: the overall rating in the same seven steps (Root < 850 · Third 850 · Fifth 1000 · Seventh 1150 · Ninth 1300 · ♯11 1450 · 13 1600) — ability, next to the league that measures weekly effort. Achievements: **The Ninth** (reach the Ninth league), **The full chord** (reach 13), plus Ten topics learned / Every quick lesson (spec X).
