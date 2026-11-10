# Technologies and feature ideas: the best measured-practice app for serious musicians

*Research done 2026-11-10, against the app at 0.68.0. Research only: no app code was changed.*
*This report builds on `MARKET_REVIEW_2026-11.md` (written after 0.48). Most of that review's "Now" list has since shipped,
so this report does not repeat it. It looks for what is still missing for a jazz and serious-music audience, and at which
technologies can now run in a PWA.*
*Prices come from vendor pages, app stores, resellers or aggregators. Many conflict, so treat every price as approximate
and check it again before quoting it. Licences marked "check" were not confirmed from the project's LICENSE file.
Items marked **[lawyer]** need legal review. This report is not legal advice.*

---

## 0. TL;DR: the top 10

| # | Idea | Why it matters for the niche | Effort | Priority |
|---|---|---|---|---|
| 1 | **Transcription coach.** You hear a phrase, sing or play it back, and the app compares it note by note (pitch, rhythm, articulation). Then you write it down and play it in 12 keys. | Transcribing is *the* jazz learning method. No app measures it. It builds on what the app already has: slow-down, pitch capture and phrase analysis. | M | **P1** |
| 2 | **Lick and vocabulary trainer in 12 keys.** A grid of keys × tempo per lick, measured by MIDI or mic, with spaced repetition. Then you use the lick over a chart, and the vocabulary detector confirms it. | This is Open Studio's core teaching move (licks, enclosures, Barry Harris cells). Today it is taught by video, without measurement. It also makes a natural partner content pack. | M | **P1** |
| 3 | **Repertoire tracker ("My tunes").** Each standard has head, changes, keys, tempo and form, each measured, with "tune readiness" and spaced re-checks of the tunes you know. | Serious jazz players think in tunes, not lessons. It ties the charts, the improv studio and the piece coach into one goal. | M | **P1** |
| 4 | **A band that listens.** The band follows your tempo, dynamics and density (it lays out when you rest, builds when you build) and answers your phrases. It stays rule-based, extending `band.ts`. | "Accompaniment that follows you" is a 2025–26 trend (Metronaut, Magenta RT 2). A rule-based band is feasible on phones today; the neural models are not. | M–L | **P1** |
| 5 | **Take review with measured overlays.** Every take is recorded locally, with a timeline of pitch, timing and dynamics. Compare take to take or to your best take, tag your own moments, and send the take to a teacher. | Self-review is one of the most effective practice habits. Teachers need it for async feedback, and it turns raw measurement into insight. | M | **P1** |
| 6 | **Auto practice journal and "plan of the week".** Built from measurements: deliberate practice vs run-throughs, time spent at the edge of your ability, what improved. The scheduler proposes next week, and an optional LLM narrates it. | It makes "only measured practice counts" visible and motivating. Serious players keep journals by hand today. | S–M | **P1** |
| 7 | **FSRS scheduling plus per-item knowledge tracing.** Replace the Leitner boxes with FSRS (`ts-fsrs`, MIT) for ear items, licks and tunes, and add an Elo or BKT estimate per item. | Better review timing and an honest "readiness" number. It is a small change with a large compounding effect. | S | **P1** |
| 8 | **iOS MIDI and Bluetooth MIDI via a thin native shell** (Capacitor or similar). Web MIDI does not exist in Safari or on iOS. | Pianists on iPads are a core audience. Without MIDI the measured piano practice loses most of its accuracy on iOS. | M | **P1** (platform) |
| 9 | **Bring-your-own-audio lab.** On-device stem separation (Demucs on WebGPU), beat grid (Beat This!) and note draft (Basic Pitch) for the user's own files. It feeds the transcription coach and "figure it out". | Moises and Chordify proved the demand. Doing it on the device keeps it legal (see `MUSIC_SOURCES_LEGAL.md`) and server-free. The models are 1–170 MB, so the download is opt-in. | L | **P2** |
| 10 | **Horns course (sax, trumpet, trombone) with transposed charts.** It measures intonation per note, tone steadiness, articulation and range, and the charts read in B♭ and E♭. | Half the jazz world plays horns, and no course serves them today. Tonestro is the only measured app for winds, and it is classical and beginner-oriented. The mic pitch engine already exists. | L | **P2** (high value) |

Close runners-up: a grounded LLM coach (P2), camera hand and posture checks with MediaPipe (P2), interval jamming
("relay choruses") for online play that tolerates latency (P2), a partner content-pack format (P1 if the Open Studio
talks move forward), and verifiable certificates mapped to exam boards (P2).

---

## 1. What already exists (so the ideas do not duplicate it)

A skim of `src/engine`, `src/ui`, `docs/SPEC-*.md`, `docs/research/*` and memory notes gives this list:

- **Measurement.** YIN pitch (`yin.ts`), chroma ring-check for chords (`chroma.ts`), latency calibration per input
  (`latency.ts`), MIDI technique ladders, guitar and bass drill analysis, drum acoustic detection, groove fingerprint
  and groove trainer (`analysis/groove*.ts`), and voice fault analysis (`vocal.ts`).
- **Pieces.** Piece coach with chunks and a tempo ladder, score view (VexFlow) with cursor, wait mode, trouble bars.
- **Jazz and improvisation.** 51 improvisation rules with challenges, an improv studio with phrasing, motif returns, "vary it" and
  **trading fours** (`improvPhrasing.ts`), a debrief after each chorus, lead-sheet import (MusicXML, iReal, text),
  36 standards, Barry Harris pedagogy, a generated band (walking bass, voice-led comping, brushes).
- **Ear and theory.** Many generated topics, exam prep, Bagrut mapping, spaced review with **Leitner boxes** (`adaptive.ts`),
  confusion maps and an "Ear Index" in Insights.
- **Tools.** Tuner, metronome, groove trainer, drone, slow-down and A–B loop of the user's own file (`SlowDown.tsx`),
  my charts with backing, sing-along.
- **Motivation and social.** Paths with stars, XP, leagues, streaks, badges, rushes, highway, duels, online rooms,
  tournaments, bingo, friends, duet streaks, compare.
- **Teaching.** Classes, assignments, inbox, heat map, parent digest.
- **Speech.** Kokoro TTS plus 2,426 pre-recorded narration lines.

**Not found in the code:** camera or pose input, a YouTube embed practice mode, stem separation or any neural audio
model, polyphonic transcription, OMR, an LLM coach, certificates, a lick library, a repertoire tracker, a horns course,
an automatic journal or weekly plan, and FSRS.

---

## 2. Competitors and adjacent products

| Product | What it does best | Price (approx.) | What's missing for jazz and serious players |
|---|---|---|---|
| **Yousician** | Mic-graded game play for guitar, piano, bass, voice and ukulele; huge song library | ~$120–180/yr (Premium / Premium+) [1] | Pop and beginner focus. No jazz harmony, no improvisation grading, no teacher programme (closed). |
| **Melodics** | Hit-by-hit timing feedback for MIDI keys, pads and drums; short daily lessons | ~$120–180/yr [2] | Groove-only; no ear training, harmony or jazz vocabulary; electronic-genre content. |
| **Simply Piano** | Polished onboarding; polyphonic mic detection | ~$120–170/yr [3] | Pop songs; no improvisation, voicings or comping. |
| **flowkey** | Real-pianist video synced with notation; wait mode | ~$120/yr [3] | Learning songs only; minimal feedback depth. |
| **Skoove** | Mic/MIDI feedback on a structured course (Fraunhofer tech); optional live tutor | ~$150–200/yr [3] | Beginner level; no jazz path. |
| **Playground Sessions** | MIDI-graded songs, videos, lifetime option | $10–25/mo; ~$290 lifetime [3] | Beginner and intermediate pop; no improvisation. |
| **Fender Play** | Clean video curriculum for guitar, bass and ukulele | $19.99/mo, $149.99/yr [4] | No measurement at all. |
| **Guitar Tricks** | Large video library incl. some jazz | ~$19.95/mo, ~$180/yr [4] | Video only, no measurement. |
| **Rocksmith+** | Real-guitar game with adaptive difficulty, 5,000+ songs, piano included | Subscription [4] | Rock/pop songs; no theory or jazz. |
| **Drumeo / Pianote (Musora)** | Top-tier video lessons and community; all instruments in one plan | ~$240/yr list, frequent ~$115 deals; lifetime option [5] | Video and community; feedback is human and slow, not measured. |
| **Open Studio** | The best jazz pedagogy online (Peter Martin, Adam Maness, many artists); live daily classes in Pro | ~$25–39/mo base; Pro ~$47–97/mo [6] | **No measured practice at all**: the student watches, then practises alone. This is the gap our app fills, and why a partnership makes sense. |
| **iReal Pro** | The standard jazz chart and backing app: 1,000s of crowd charts, practice loops, key cycling, B♭/E♭ transposition | $19.99 one-time (iOS) [7] | Does not listen to you; the band does not react to you. |
| **Band-in-a-Box** | Deep generation (RealTracks recorded players), Soloist and Melodist | Pro $129, MegaPAK $269 [8] | Desktop, dated UI, no feedback on the user. |
| **Chordify** | Chords from any song, synced to playback | Freemium (price not verified) | No measurement of the user; pop harmony, so jazz chords come out simplified. |
| **Moises** | Stem separation, chord detection, smart metronome, pitch and speed change | Premium ~$40/yr; Pro ~$30/mo [9] | A tool, not a coach; it does not grade you. |
| **Soundslice** | Notation synced to video or audio; loop and slow-down; course marketplace; licensing for teachers | Free, Plus ~$5/mo; teacher and licensing tiers [10] | Very good for viewing, but measures nothing. |
| **Klangio (Piano2Notes etc.)** | Audio → notation transcription | Pro ~$100/yr; all-apps ~$249/yr [11] | Transcription only; no practice loop. |
| **tonestro** | Mic feedback (pitch, rhythm) for wind instruments | Free + Premium IAP (varies by region) [12] | Beginner and classroom repertoire; no jazz or improvisation. |
| **SmartMusic (MakeMusic Cloud)** | School ensembles: assign, record, auto-grade, teacher dashboards | ~$14–30 per student/yr; teachers ~$40–60/yr [13] | Concert-band repertoire; jazz ensemble charts only; no improvisation grading. |
| **EarMaster 7** | 2,500+ ear exercises, sight-singing by mic, jazz workshop | ~$3–6/mo or all-access pass [14] | Desktop-first; rhythm and intonation by mic only; not tied to an instrument path. |
| **Functional Ear Trainer** | Scale degrees heard against a key, with resolution to the tonic | Free / low cost (not verified) | One skill only. |
| **Musition / Auralia** | School theory and ear curricula, LMS integration | School licences (not verified) | Theory without instrument measurement. |
| **Perfect Ear** | Broad mobile ear and rhythm trainer | Freemium (not verified) | Users complain about tap latency (see the market review); no instrument loop. |

**Takeaways.**
1. **Nobody combines Open Studio-level jazz content with measurement.** Video sites (Open Studio, Musora, Fender Play,
   Guitar Tricks) measure nothing. Measurement apps (Yousician, Melodics, Simply Piano) teach no jazz.
2. **Tool apps** (iReal, Moises, Chordify, Soundslice, Band-in-a-Box) are where serious players actually spend their practice
   time. The winning move is to absorb their core jobs (loops, transposed charts, stems, a responsive band) *and* add
   measurement on top.
3. **Horn players are unserved** by any measured jazz product.

---

## 3. Technologies available today

Legend for "PWA feasibility": **Now** means it runs well in the browser on mid-range phones today. **Desktop/WebGPU** means
it works in the browser but needs WebGPU or a strong device. **Server** means it needs a GPU server or native code.

| Area | Best options (2024–26) | Licence | Size / speed | PWA feasibility | Verdict for us |
|---|---|---|---|---|---|
| **Monophonic pitch** | YIN (in app); CREPE; SPICE; **SwiftF0** (2025: 95,842 params, ~42× faster than CREPE on CPU) [15]; **PESTO** (2025 real-time version, <10 ms latency) [16] | CREPE MIT; SPICE Apache; SwiftF0 / PESTO: check | SwiftF0 and PESTO are tiny (hundreds of KB) | **Now** (WASM / TF.js / onnxruntime-web) | Keep YIN for speed. Add SwiftF0 or PESTO as an optional robust path for noisy rooms, voice and horns. Benchmark against YIN on our own test takes. |
| **Polyphonic transcription** | **Spotify Basic Pitch** (~17k params, instrument-agnostic, outputs notes plus pitch bends, TS package) [17]; Onsets & Frames (piano; Magenta); MT3 / YourMT3+ (multi-instrument transformer) [18] | Basic Pitch Apache-2.0; O&F Apache; YourMT3: check | Basic Pitch: ~1–20 MB depending on format; offline (whole file), not live | Basic Pitch **Now** on files; MT3 **Server** | Use Basic Pitch for *files* (the user's own audio and recorded takes). Live acoustic-piano grading stays on MIDI plus chroma checks. Be aware: some newer models (e.g. MuScriptor) ship **non-commercial weights** [18]. |
| **Stem separation** | **HTDemucs v4** in the browser: demucs-rs (Rust→WASM+WebGPU, 84 MB 4-stem model), demucs-web (onnxruntime-web), ~3× real time with WebGPU [19]; Spleeter (older, lower quality) | Demucs MIT; Spleeter MIT | 84–172 MB download; slow without WebGPU | **Desktop/WebGPU**; phones marginal | An opt-in download for "Audio lab" on desktop and tablets. Cache it with the Storage API, and process off the main thread. |
| **Beat / tempo / downbeat** | **Beat This!** (ISMIR 2024, no DBN post-processing; ONNX and Rust ports exist) [20]; BeatNet (online); madmom | Beat This! MIT; madmom code BSD, models non-commercial (check) | Small to medium | **Now** for files; live tempo following: rule-based onset tracking is enough | Beat This! gives a bar grid for the user's audio (loops, the transcription coach). Live band-following uses our own onset detector. |
| **Chord recognition** | Essentia models; Chordino (Vamp); research models (BTC etc.); commercial (Chordify, Moises) | **Essentia: AGPL code, pre-trained models CC BY-NC-ND** [21]; Chordino GPL | Medium | Possible, but open models with commercial licences are scarce | Build our own: chroma (we have it) or Basic Pitch notes → an HMM / Viterbi over a jazz chord vocabulary. Jazz extensions are exactly where generic models fail, and where our harmony engine helps. |
| **Score following / auto page turn** | Antescofo / Metronaut (commercial) [mkt review]; on-line DTW / OLTW on chroma (open algorithms) | Algorithms are free; Antescofo is proprietary | Cheap on chroma | **Now** | Feasible: we already have chroma and the score model. Gives acoustic-piano "follow me" plus page turns in the score view. |
| **OMR (photo/PDF → score)** | Audiveris (mature, desktop; structural elements recalled >75% in a 2023 evaluation) [22]; oemer (phone photos → MusicXML; last push Apr 2025) [23]; research (SMT, Polyphonic-TrOMR) | Audiveris **AGPL**; oemer: check | Heavy (Java / Python + models) | **Server** | Accuracy still needs a correction UI. Use it later, as a server feature for teachers, or license a vendor. Lead-sheet import (MusicXML, iReal) already covers jazz. |
| **AI accompaniment that follows** | **Magenta RealTime 2** (2026; Apache code, CC-BY weights; ~200 ms latency; runs on strong Macs) [24]; **ReaLchords** (ICML 2024; online chords for a live melody, RL-tuned to recover from mistakes; no public product) [25]; Band-in-a-Box Soloist; Impro-Visor (GPL) | See left | Gigabytes; GPU | **Not on phones**; desktop at best | Do not wait for these. Extend `band.ts` with rule-based listening (tempo, dynamics, density, rests, reharmonising on cue). ReaLchords' idea of *recovering when the soloist goes elsewhere* is a good design target. |
| **LLM tutor** | Hosted LLM APIs with tool-calling; on-device via WebLLM (1–3B models, ~1–2 GB, WebGPU) | Commercial API terms / open weights | API: network and cost per call | API **Now** via a Supabase edge function; on-device too big for phones | Ground it strictly: the LLM never decides correctness, it only *explains* engine facts (`theoryFacts.ts`, `coach.ts`, the debrief data) and picks drills through tools. Cache the narrations. |
| **Spaced repetition / knowledge tracing** | **FSRS** via `ts-fsrs` (TypeScript, browser build) [26]; Elo-per-item; Bayesian Knowledge Tracing | ts-fsrs MIT | Tiny | **Now** | Replace the Leitner boxes. Model a lick, a tune or an ear item as a "card". Add a per-item Elo for difficulty, so a level reflects the hardest items beaten (see memory: promotion, not full bars). |
| **Video / pose** | **MediaPipe Hand Landmarker** (21 3-D landmarks per hand, 2 hands, `@mediapipe/tasks-vision`) [27]; Pose Landmarker for posture; ROLI's AI coach already uses camera hand tracking [mkt review] | Apache-2.0 | ~10 MB; real time on recent phones, weak on old ones [27] | **Now** (WebGL/WASM) | Use it for coarse, high-value checks: wrist height and collapse, thumb under, a flat hand in octaves, guitar thumb position, stick height symmetry. It cannot replace MIDI for note accuracy. |
| **Web MIDI / BLE MIDI** | Web MIDI in Chrome, Edge, Firefox and Android Chrome; **not in Safari / iOS** [28]; BLE MIDI pairs at the OS level (Android, macOS, Windows) | — | — | iOS needs a native shell | A Capacitor (or similar) wrapper with a CoreMIDI plugin for iPad and iPhone. |
| **WebGPU** | Shipped in Chrome / Edge 113+, **Safari 26 (iOS / iPadOS 26)**, Firefox (Windows) [29] | — | — | **Now** on new devices; keep a WASM fallback | Enables Demucs, larger pitch models and faster Kokoro on many devices from 2026. |
| **Online real-time ensemble** | JackTrip (uncompressed, ~2 Mbps), Jamulus (UDP + Opus), SonoBus; browser via WebRTC | Open source | Comfortable only at ≲20–30 ms round trip; 40–50 ms is the limit for most music [30] | Real-time ensemble in the browser is **not reliable** beyond nearby players | Design for latency instead: interval jamming (NINJAM-style, one chorus behind), relay choruses and trading fours over the network. All of these are compatible with WebRTC data channels and Supabase. |
| **Reference data for jazz** | **Weimar Jazz Database**: 456 hand-transcribed solos, 78 players, ~200k notes with chords and beats; DTL1000: ~1,750 automatic transcriptions [31] | "Open access", exact terms: check; the solos are copyrighted performances **[lawyer]** | Small (MIDI / SQL) | **Now** | Excellent for *analysis* (vocabulary statistics, a lick detector trained on patterns, difficulty calibration). Do not ship the solos as content without legal review. |

---

## 4. Feature ideas, ranked

Effort: **S** = days, **M** = 1–3 weeks, **L** = 1–2 months, **XL** = a quarter or more (one developer plus agents).
"Measured fit" asks whether the feature produces or uses measurements. "Niche fit" is relevance to jazz and serious players.

| # | Idea | What it is | Who does it now | PWA feasibility | Effort | Measured fit | Niche fit | Priority |
|---|---|---|---|---|---|---|---|---|
| 1 | **Transcription coach** | Short phrases (generated, PD or from the user's file) → loop and slow down → sing or play it back → note-by-note comparison (pitch, onset, length, ghost notes, swing ratio) → notate it (staff entry) → play it in 12 keys. The final step is "use it over a chart". | Nobody grades transcription; Transcribe! and Anytune are tools only | Now (YIN + MIDI + `SlowDown`); optional Basic Pitch for a draft | M | ★★★ | ★★★ | **P1** |
| 2 | **Lick and vocabulary trainer** | A lick library (Barry Harris cells, enclosures, ii–V lines, bebop scale moves) in a keys × tempo grid; FSRS review; "use it" mode in the improv studio, where a vocabulary detector confirms the lick appeared over the right chord. | Open Studio and others teach licks by video; nothing measures them | Now (MIDI / mic; `improvPhrasing` already finds motifs) | M | ★★★ | ★★★ | **P1** |
| 3 | **Repertoire tracker ("My tunes")** | Per standard: melody from memory, changes (comp / bass line), solo chorus, keys known, tempo reached, form. Each is measured, rolled into "tune readiness", and re-checked over time with spaced repetition. Gig and jam-session prep ("10 tunes for Thursday"). | iReal has lists without measurement; nothing else | Now (charts, standards, improv studio, lead-sheet import) | M | ★★★ | ★★★ | **P1** |
| 4 | **A band that listens** | The band tracks your tempo (with an optional "push and pull" range), dynamics (mic RMS / MIDI velocity), density and rests. The drummer lays out or builds. The comping answers your phrase ends, and at higher levels it reharmonises on a cue. It is scored on whether you *react* to the band (e.g. land on the 3rd of the substitute chord). | Metronaut (classical); Magenta RT 2 (desktop, generative) | Now (rule-based in `band.ts`) | M–L | ★★ | ★★★ | **P1** |
| 5 | **Take review with measured overlays** | Every exercise or piece take is saved locally (IndexedDB, opt-in) with a timeline: pitch curve, onset offsets, velocity and dynamics, wrong notes. A/B against your best take or last week's, tag moments, export a short clip. | SmartMusic (assessment), Soundslice (recording, no analysis) | Now (MediaRecorder + existing analysers) | M | ★★★ | ★★ | **P1** |
| 6 | **Auto journal and plan of the week** | Each week: minutes by kind (deliberate, run-through, games), "time at the edge" (items at 60–85 % success), what moved (Trends), stuck items, and next week's plan (scheduler + goals). Optional LLM narration in Hebrew or English; shareable with the teacher. | Modacity and paper journals (by hand) | Now | S–M | ★★★ | ★★ | **P1** |
| 7 | **FSRS + per-item difficulty** | Swap the Leitner boxes for `ts-fsrs`; Elo per item and per player; "readiness" and "forecast" per skill. | Anki-style apps; not music apps | Now | S | ★★★ | ★★ | **P1** |
| 8 | **iOS / iPad MIDI via a native shell** | Wrap the PWA; a CoreMIDI and BLE MIDI bridge into the same `midi.ts` interface; also a way into App Store discovery. | All native competitors | Needs a native shell | M | ★★★ | ★★★ (pianists) | **P1** |
| 9 | **Partner course-pack format** | A JSON content pack: units, lessons (video embed via Vimeo / YouTube from the partner), charts, licks, improvisation rules, drills and pass criteria. A partner such as Open Studio authors packs that slot into paths, XP and leagues. Revenue share. | Soundslice marketplace (sheet + video); Musora (in-house) | Now | M | ★★★ (the packs carry pass criteria) | ★★★ | **P1** if the partnership moves, otherwise P2 |
| 10 | **Bring-your-own-audio lab** | For the user's own file: stems (Demucs, WebGPU), beat and bar grid (Beat This!), note draft (Basic Pitch), our own jazz chord draft. Feeds "figure it out", the transcription coach and "play along with the stem muted". | Moises, Chordify, Klangio (server-side) | Desktop / WebGPU; phones partial | L | ★★ | ★★★ | **P2** |
| 11 | **Horns course** | Sax, trumpet, trombone, clarinet, flute: intonation map per note (sharp or flat tendencies by register), long-tone steadiness, articulation onsets, overtone and lip slurs, range ladder; charts in B♭ / E♭ / F; jazz phrasing (ghost notes, falls by pitch contour). | tonestro (classical, beginner); SmartMusic (band) | Now (mic pitch; latency calibration exists) | L | ★★★ | ★★★ | **P2** (strategically high) |
| 12 | **YouTube embed practice** | Paste an official video: loop A–B, rates 0.25–2× through the IFrame API, our chord chart beside it, mic measures you *playing along* (never the video audio). | Soundslice (synced video), Chordify | Now | S–M | ★★ (measures the user only) | ★★ | **P2** |
| 13 | **Grounded LLM coach** | Explains a miss from engine facts; chats about the debrief ("why did my bar 7 sound wrong?"); proposes drills through tools; never grades. A Supabase edge function with a strict schema; Hebrew and English. | ROLI AI coach, Yousician AI, MusPal (ungrounded; some hallucinate) | Now (API) | M | ★★ (uses measurements) | ★★ | **P2** |
| 14 | **Camera checks (MediaPipe)** | Opt-in short posture and hand checks inside technique drills: wrist level, finger curvature, thumb-under motion, guitar fretting thumb, drum stick heights. Produces a few clear findings, not a live score. | ROLI (camera hand tracking) | Now on recent phones | M–L | ★★ | ★★ | **P2** |
| 15 | **Async teacher feedback on takes** | Teachers (and later partner artists) get takes with overlays, leave time-stamped voice or text notes, and assign the fix drill. Extends the existing inbox. | SmartMusic, Soundslice, Open Studio Pro (human feedback) | Now (Supabase storage) | M | ★★★ | ★★★ | **P2** |
| 16 | **Interval jamming / relay choruses** | Online "jam" that tolerates latency: each player hears the others one chorus late (NINJAM-style), or players take turns soloing chorus by chorus over the shared band. Every chorus is graded under the room's rules. | NINJAM (desktop), JamKazam (real time, native) | Now (WebRTC / Supabase realtime) | M–L | ★★ | ★★★ | **P2** |
| 17 | **Score following for acoustic instruments** | Chroma-based on-line DTW against the piece → cursor follows you, automatic page turns, "where did I lose it" bars without MIDI. | Metronaut / Antescofo; Tomplay | Now | M–L | ★★★ | ★★ | **P2** |
| 18 | **Verifiable certificates + exam-board mapping** | A level certificate backed by measured takes (a signed link with the recording and scores), mapped to ABRSM / Trinity / RSL / Bagrut / conservatory requirements. Teachers can co-sign. | Exam boards (in person); Piano Marvel SASR | Now | S–M | ★★★ | ★★ | **P2** |
| 19 | **Play with the record (alignment)** | Align your take of a head or solo to the user's reference file (DTW) → ahead / behind per beat and pitch differences against the record; "phrasing like the master". | Nothing measured | Now (files) | M | ★★★ | ★★★ | **P2** (after #1 and #10) |
| 20 | **Practice-quality analytics** | Deliberate vs run-through ratio, slow-practice share, repetitions to stability, warm-up effect, best time of day. | None in a measured way | Now | S | ★★★ | ★★ | **P2** (folds into #6) |
| 21 | **Teacher marketplace** | Find a teacher, book, pay, review; teachers sell packs. | Lessonface, TakeLessons (closed), Open Studio Pro | Payments, trust, moderation | XL | ★ | ★★ | **P3** (partner instead) |
| 22 | **OMR import** | Photo or PDF → MusicXML with a correction UI. | Soundslice, Newzik, Klangio | Server | L | ★ | ★ (jazz uses lead sheets) | **P3** |
| 23 | **Real-time online ensemble** | True live jam across cities | JackTrip, Jamulus, JamKazam (native) | Not reliable in the browser [30] | XL | ★ | ★★ | **P3** |
| 24 | **Neural generative band** | Magenta RT-style audio band | Magenta RT 2, Lyria | Desktop GPU only | XL | ★ | ★★ | **P3** (watch) |

---

## 5. Notes on the top ideas

### 5.1 Transcription coach (P1, M)
- **Flow.** The steps are: pick a phrase (2–4 bars), listen and loop it, sing it back, play it back, notate it, then play it in 3 → 12 keys
  and use it in a solo. Each step is measured. The singing step uses `memory.ts` note segmentation plus YIN. The playing step uses MIDI or
  mic. The notation step uses the existing staff entry. Swing ratio and ghost notes come from `improvPhrasing` / groove analysis.
- **Content, legally.** (a) Phrases the app generates in a given style. The generator already exists for the band, the trade
  replies and Barry Harris cells. (b) The user's own audio, on the device ([`MUSIC_SOURCES_LEGAL.md`]). (c) Public-domain
  recordings, after a per-recording check **[lawyer]**. WJazzD solos may be used for *analysis* (difficulty calibration,
  the vocabulary detector) but not as shipped content **[lawyer]**.
- **Scoring.** Pitch accuracy per note; onset error relative to the phrase's own grid; articulation (length ratio); and
  "by ear" (whether you used the reveal). It feeds the path, XP, leagues and Insights.

### 5.2 Lick and vocabulary trainer (P1, M)
- A grid of cells (12 keys × 4 tempos) per lick, and a heat map in Insights. The badge pattern already does "all 12 keys clean".
- A "use it" challenge in the improv studio: a rule such as "play lick X over a ii–V at least twice". The detector reuses motif
  matching with transposition and displacement.
- This is the natural place for Open Studio content: their licks become measured packs (see #9).

### 5.3 Repertoire tracker (P1, M)
- The tune card holds head (memory / reading), changes (comp in time, bass line), a solo under rules, keys, tempo and form.
  Each is a measured check that already exists somewhere in the app.
- "Readiness" is the product of these checks with FSRS decay. It answers the question serious players actually ask: *which tunes can I call
  at a jam tonight?*

### 5.4 A band that listens (P1, M–L)
- **Inputs** (already available): onsets and tempo from MIDI or mic, velocity / RMS, phrase boundaries (`improvPhrasing`).
- **Behaviours:** tempo following inside a set tolerance; dynamic following; laying out on long rests; drum fills that answer
  phrase ends; comping density that moves against the soloist; at higher levels, tritone subs or a reharmonisation on a cue.
- **Measure the player too:** did they *hear* the band? (land on the new chord's guide tone, match the dynamic build).
  This matches ReaLchords' finding that good accompaniment must recover when the soloist goes somewhere unexpected [25].

### 5.5 Take review (P1, M)
- Store takes in IndexedDB (opt-in, size-capped), with analysis JSON next to the audio. The overlays use existing renderers
  (score view colour marks, groove charts, pitch curves). A "best take" is kept per item.
- Teachers get the same view (#15). Privacy: local by default, uploaded only when the user sends a take.

### 5.6 Auto journal and weekly plan (P1, S–M)
- The data already exists (practice log, Trends, Insights, scheduler). Missing is a weekly *story*: what you did, what moved,
  what is stuck, and the plan.
- "Time at the edge" (items at 60–85 % success) is a defensible deliberate-practice proxy, and it rewards the right
  behaviour.

### 5.7 FSRS (P1, S)
- `ts-fsrs` is MIT, typed and browser-ready [26]. Map our grades to FSRS ratings: wrong → Again, slow → Hard, clean → Good,
  fast and clean → Easy. Keep the current boxes as a fallback during migration, and back-fill from history.

### 5.8 iOS MIDI (P1, M)
- Safari has no Web MIDI [28]. A thin native wrapper (Capacitor plus a CoreMIDI / BLE-MIDI plugin) gives iPad pianists the
  full measured experience, plus native mic latency improvements. Keep one codebase: the wrapper only bridges MIDI and audio
  session settings.

### 5.9 Audio lab (P2, L)
- Demucs in the browser is real but heavy (84–172 MB, ~3× real time with WebGPU) [19]. Offer it as a downloadable
  "studio pack" on desktop and tablet, with a WASM fallback warning. Basic Pitch (Apache-2.0, tiny) [17] and Beat This! (MIT) [20]
  are cheap enough for every device.
- Chords: avoid Essentia's NC models [21]. Build an HMM over our chroma and a jazz vocabulary, and let the user correct the
  result bar by bar. Every correction becomes an ear item, which the market review already proposed.

### 5.10 Horns course (P2, L, high strategic value)
- It reuses the mic pitch path (consider SwiftF0 or PESTO for robustness [15][16]), latency calibration, the tuner and the drone.
- Measures: cents per note across the range (an intonation map, like the piano hand map), long-tone steadiness, attack
  clarity, slur and overtone accuracy, and a range ladder. The jazz part uses the same improv studio with transposed charts.

---

## 6. Platform constraints and risks

| Topic | Fact | Consequence |
|---|---|---|
| Web MIDI on iOS | Not supported in Safari [28] | Native shell for iPad and iPhone pianists (#8) |
| WebGPU | Shipped across major browsers including Safari 26 / iOS 26 [29] | Heavy models are viable on new devices; keep WASM fallbacks |
| Model downloads | Demucs 84–172 MB; Basic Pitch ~1–20 MB; MediaPipe ~10 MB | Opt-in packs; cache in Storage; show size before download (the app's permission rules say the same) |
| Model licences | Essentia models CC BY-NC-ND; some new transcription weights are NC; Magenta RT weights are CC-BY | Check every weight file's licence, not only the code's |
| Copyright of content | Jazz solos and melodies of standards after 1930 are protected; YouTube audio must not be analysed (`MUSIC_SOURCES_LEGAL.md`) | Generated, PD or user-supplied content only; WJazzD for analysis only **[lawyer]** |
| Online latency | Comfortable ≲20–30 ms, limit ~40–50 ms round trip [30] | Latency-tolerant designs (interval jamming, relays, trading) instead of live ensemble |
| LLM risks | Ungrounded music tutors hallucinate (market review) | The LLM only explains engine facts; the engine decides; log and evaluate |
| Camera privacy | Video of minors / classrooms | On-device only, never uploaded; findings only; clear opt-in |

---

## 7. Suggested order

1. **Quick, compounding:** FSRS (#7), journal and weekly plan (#6), practice-quality analytics (#20).
2. **Jazz core:** lick trainer (#2) → transcription coach (#1) → repertoire tracker (#3). Together they form one loop
   (hear → own → use → keep) and give a partner such as Open Studio a measured home for its content (#9).
3. **Feel and review:** a band that listens (#4), take review (#5) → async teacher feedback (#15).
4. **Platform:** iOS MIDI shell (#8); WebGPU audio lab (#10) on desktop.
5. **Audience growth:** horns course (#11), certificates (#18), relay jams (#16), camera checks (#14), grounded LLM coach (#13).

---

## Sources

1. Yousician pricing (aggregators): https://subger.com/en/service/yousician · https://www.guitarchalk.com/yousician-cost/
2. Melodics pricing tracker: https://visualping.io/pages/melodics-pricing-alerts-4896311 · plans: https://melodics.com/info/ai-info-page
3. Piano apps pricing: https://preply.com/en/blog/best-piano-learning-apps/ · https://hackernoon.com/best-piano-learning-apps-in-2026-an-in-depth-comparison-of-music-education-technology · https://equipboard.com/items/flowkey
4. Guitar platforms: https://www.guitarworld.com/reviews/fender-play-review · https://www.guitarchalk.com/guitar-tricks-vs-fender-play/ · https://www.windowscentral.com/gaming/is-rocksmith-worth-the-subscription-cost
5. Musora: https://help.musora.com/article/1034-musora-membership-options · https://slickdeals.net/f/18889021-musora-annual-membership-drumeo-pianote-singeo-guitareo-playbass · https://pianote.com/lifetime
6. Open Studio: https://openstudio.helpscoutdocs.com/article/429-whats-the-difference-between-the-open-studio-membership-and-open-studio-pro · https://www.openstudiojazz.com/product/open-studio-pro/ · https://pianoers.com/open-studio-jazz-review/
7. iReal Pro (App Store): https://apps.apple.com/gb/app/ireal-pro/id298206806
8. Band-in-a-Box: https://pgmusic.com/bbwin.packages.htm · https://www.jazzguitar.be/store/band-in-a-box-windows.php
9. Moises: https://moises.ai/ · https://aitoolsatlas.ai/tools/moises/pricing · https://apppricinglab.com/iap/apple/1515796612
10. Soundslice: https://soundslice.com/music-practice · https://soundslice.com/licensing · https://www.saascounter.com/products/soundslice
11. Klangio Piano2Notes (App Store): https://apps.apple.com/py/app/piano2notes/id1589420929
12. tonestro: https://apps.apple.com/us/app/tonestro-music-lessons/id1365630760
13. SmartMusic / MakeMusic Cloud pricing: https://www.makemusic.com/?p=38128
14. EarMaster: https://www.thomann.co.uk/earmaster_one_year_all_access_pass.htm · https://alternativeto.net/software/earmaster/about/
15. SwiftF0 paper: https://arxiv.org/abs/2508.18440v1 (code: https://github.com/lars76/swift-f0)
16. PESTO real-time: https://arxiv.org/abs/2508.01488 · original: https://arxiv.org/abs/2309.02265
17. Basic Pitch: https://github.com/spotify/basic-pitch · https://github.com/spotify/basic-pitch-ts · paper https://ar5iv.labs.arxiv.org/html/2203.09893 · https://huggingface.co/schism-audio/basic-pitch-mlx
18. YourMT3+: https://arxiv.org/html/2407.04822v3 · MuScriptor (NC weights): https://huggingface.co/MuScriptor/muscriptor-large/blob/main/README.md
19. Demucs in the browser: https://github.com/nikhilunni/demucs-rs · https://github.com/timcsy/demucs-web · https://github.com/bakkot/demucs-js · https://huggingface.co/monteslu/htdemucs-web-onnx
20. Beat This!: https://fugumt.com/fugumt/paper_check/2407.21658v1_enmode (arXiv 2407.21658) · https://docs.rs/crate/beat-this/1.0.0 · https://huggingface.co/schism-audio/beat-this-mlx
21. Essentia licensing: https://essentia.upf.edu/licensing_information.html · https://essentia.upf.edu/models/LICENSE
22. OMR evaluation incl. Audiveris: https://arxiv.org/pdf/2312.12908
23. oemer: https://pypi.org/project/oemer/ · https://gittrend.io/repo/BreezeWhite/oemer
24. Magenta RealTime: https://simonwillison.net/2025/Jun/20/magenta-realtime · https://huggingface.co/google/magenta-realtime-2 · https://arxiv.org/html/2508.04651v3
25. ReaLchords: https://proceedings.mlr.press/v235/wu24c.html · https://arxiv.org/pdf/2506.14723
26. ts-fsrs: https://open-spaced-repetition.github.io/ts-fsrs · https://www.jsdelivr.com/package/npm/ts-fsrs
27. MediaPipe Hand Landmarker (web): https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js
28. Web MIDI browser support: https://caniuse.com/midi
29. WebGPU in Safari 26 / all major browsers: https://appdevelopermagazine.com/webgpu-in-ios-26/ · https://hn.jakechampion.name/reader/https://videocardz.com/newz/webgpu-is-now-supported-by-all-major-browsers
30. Online jamming latency: https://www.pressreader.com/uk/bbc-music-magazine/20200806/282273847695049 · https://www.danielharper.org/yauu/?p=8490 · https://community.justinguitar.com/t/online-jamming/189712/5
31. Weimar Jazz Database: https://jazzomat.hfm-weimar.de/dbformat/dboverview.html · https://www.frontiersin.org/articles/10.3389/fdigh.2018.00001/full

Earlier in-repo research this builds on: `docs/research/MARKET_REVIEW_2026-11.md`, `docs/research/MUSIC_SOURCES_LEGAL.md`.
