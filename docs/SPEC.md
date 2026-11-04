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
| 2 | Heard sound → note name | (after a reference) B♭ → "B-flat" | → "B-flat F" | Note naming | ✓ single (lesson 8) · ☐ sequence |
| 3 | Degree → sung sound | "five" → sing B♭ | "five two" → sing B♭ F | Singing in tune | ✓ single (lesson 5) · ✓ sequence (lesson 10) |
| 4 | Note name → sung sound | "B-flat" → sing B♭ (after a reference) | "B-flat F" → sing | Singing in tune | ✓ single (lesson 9) · ☐ sequence |
| 5 | Note name → degree | "Which degree is B-flat?" → "five" | "B-flat F" → "five two" | Theory (symbolic) | ✓ single (lesson 8) · ☐ sequence |
| 6 | Degree → note name | "Degree five?" → "B-flat" | "five two" → "B-flat F" | Theory (symbolic) | ✓ single (lesson 8) · ☐ sequence |
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
Slow-down practice (the same run at 60 % → 80 % → 100 % tempo, unlocking the faster version on success), loop a single turn, hear the model at half speed, and a visual pitch trace over the target notes after each attempt.
