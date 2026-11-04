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
