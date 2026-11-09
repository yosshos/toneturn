# Drums course: curriculum and measurement research

*Research for The 7th Sense, 2026-11-09. Written for the owner's question: "Should we add a DRUMS course?"
Constraint carried through the whole report: **only practice the app can measure counts** (MIDI from an e-kit,
or the microphone). Nothing is self-reported. Method books are summarized, never reproduced. Facts marked
**(verify)** come from community sources or could not be checked against an official document.*

---

## 1. Executive summary

1. **Build it.** Drums are the instrument where our "measured practice only" rule is *easiest* to keep: an e-kit
   reports every hit as a MIDI note with a time stamp, a velocity and a pad identity. That is cleaner data than
   our piano drills, and far cleaner than guitar by microphone.
2. **Who for:** adult and teen owners of MIDI e-kits (Roland TD, Alesis, Yamaha DTX, EFNOTE) on Chrome/Edge/Android,
   plus practice-pad players by microphone for rudiments and time. Secondary: bagrut and graded-exam candidates
   (Rockschool, Trinity, ABRSM drum kit since 2024) and our existing ear/rhythm users who own a pad.
3. **We already own ~60 % of the engine:** Web MIDI input with timestamps and velocity, latency calibration per
   input, the tempo ladder (3 clean → up; 2 fails → −10 %), timing evenness metrics (CV, SD, accent gap, velocity
   SD), a 45-groove bank with Middle-Eastern rhythms, the band engine with drum kits, the groove trainer (fading
   click, pocket, swing dial) and the Rhythm Highway game.
4. **What is missing:** a drum mode in `midi.ts` (no octave shift, CC4 hi-hat openness, poly-aftertouch chokes),
   a kit-mapping/calibration screen, four-limb drills (today a drill has only `R`/`L` hands), a kit lane view
   for Highway, and drum notation rendering.
5. **The gap we can own:** no competitor combines (a) measured e-kit feedback in the **browser with no install**,
   (b) **Hebrew** and Middle-Eastern rhythms (maqsum, baladi, saidi, ayyub, wahda) taught as drum-kit grooves,
   (c) ear training that feeds playing (hear a groove → play it back), and (d) a **band** play-along engine.
   Melodics is the closest rival (MIDI + mic scoring) but is native-only, English-only and has no Middle-Eastern
   track; Drumeo and Mike's Lessons do not listen at all.
6. **Biggest risk:** Web MIDI does not exist on iPhone/iPad Safari. iPad drummers can use only the microphone
   mode until a native wrapper exists. Second risk: Bluetooth headphones add 150–250 ms to the click; we must
   detect and warn.
7. **Version 1 must contain:** kit connect + auto-map wizard; 2–3 minute placement probe; six families
   (Strokes & dynamics, Rudiments core, Time & subdivision, Rock/pop grooves, Fills & landing, Reading level 1);
   tempo ladder on every drill; per-limb timing and velocity feedback; groove play-along with our band;
   "fill then land on 1"; a dynamics meter; a kit view that lights hits; mic mode for rudiments on a pad.
8. **Version 2:** funk/ghost notes, shuffle, jazz ride & comping, Latin, Middle-Eastern, independence, double
   bass, drum dictation, song-form play-along, Highway kit lanes.
9. **Not measurable, therefore not scored:** grip, stick height, Moeller motion, posture, brushes sweeps (on most
   kits). We teach them on the brief page and measure their *audible result* (velocity bands, evenness).
10. **Effort:** v1 is roughly the size of the 0.38 guitar release (M–L): mostly new UI on existing engines.

---

## 2. What drummers are taught

### 2.1 Institutions

**Berklee College of Music (Boston).** Every student takes private instruction levels 1–4 on the principal
instrument (performance majors 5–8), with a proficiency exam at the end of each semester and a placement audition
in week one ([Berklee private instruction](https://college.berklee.edu/node/2371966),
[Studying percussion at Berklee](https://college.berklee.edu/node/2206673)). The department lists drum-set focus
areas as snare technique and reading, chart and lead-sheet reading, **time feels**, improvisation, **brush
technique** and soloing; group labs cover grips, sticking, basic time feels, snare/kit reading, and later odd
meters and polyrhythms ([Berklee percussion](https://college.berklee.edu/percussion)). The entry course *Drum Set
Basics* covers grip, sticking, rhythmic studies, snare reading and the **26 American rudiments**
([Drum Set Basics](https://college.berklee.edu/node/2271396)). Rimon in Israel has a Berklee credit-transfer
pathway ([Berklee–Rimon](https://www.berklee.edu/academic-affairs/credit-transfer-rimon-school-music-berklee)), so
Israeli contemporary drum teaching largely follows this model.

**Musicians Institute (Los Angeles; the drum program historically called PIT, Percussion Institute of
Technology).** Core classes: drum technique, drum performance, drum reading, *Developing Your Groove*, brush
technique, plus harmony/theory/ear training; weekly Live Performance Workshops with a band; electives in
electronic drumming, cajón and Afro-Cuban percussion ([MI Drum](https://www.mi.edu/drum/),
[MI catalog](https://www.mi.edu/wp-content/catalog/MI-Catalog.pdf)). The emphasis is commercial: groove, reading
charts, and playing with a rhythm section.

**What schools share:** (1) hands first — grip, strokes, rudiments on snare; (2) time — click work, subdivision,
feel; (3) a broad style vocabulary; (4) reading, from snare rhythms to kit charts; (5) playing with others.
Our app can measure (1) partly, (2) fully, (3) fully, (4) fully, and simulate (5) with the band engine.

### 2.2 Graded exam boards

| Board | Structure (drums) | What it tells us |
|---|---|---|
| **RSL Rockschool** (new syllabus Sept 2024) | Pieces with backing tracks; **technical exercises** built from rudiment groups that grow by grade — Debut: single strokes, double strokes, paradiddles, a fill; Grade 3 adds flams, drags, triplets; Grades 6–8 end with a stylistic study (jazz, Latin or blues). Unseen tests: sight-reading (Debut: 4-bar snare rhythm at 80 bpm) or improvisation; ear tests. | A ready-made ladder of rudiment groups per level, and proof that "fill + groove + reading at a set tempo" is examinable ([RSL 2024](https://www.rslawards.com/new-rockschool-guitar-bass-drums-syllabuses-out-now/), [2012 syllabus PDF](https://cloud.rslawards.com/file/download/RockschoolDrums2012SyllabusNEW.pdf), [AMEB spotlight](https://www.utas.edu.au/australian-music-examinations-board/ameb-news-and-events/ameb/spotlights/spotlight-on-rockschool-drums-syllabus)) |
| **Trinity Rock & Pop Drums** | Three songs (one "technical focus" song) with backing tracks + a session skill (playback or improvising); 100 marks, pass 60. **E-kits accepted at all grades** in digital exams. | Exam boards now accept e-kits — our users can prepare on the same kit ([Trinity R&P grades](https://trinitycollege.com/qualifications/music/rock-and-pop/grades), [Digital](https://trinitycollege.com/qualifications/music/rock-and-pop/grades/digital), [Grade 5](https://trinityrock.trinitycollege.co.uk/instruments/drums/grade5)) |
| **ABRSM Drum Kit** (new, from 2024) | First-ever ABRSM drum-kit exams, Initial–Grade 8, nine pieces per grade in the books. | A mainstream classical board entering drum kit validates demand ([review](https://www.musicteachermagazine.co.uk/content/review/review-abrsm-drum-kit-syllabus), [Grade 8 book](https://boosey.com/shop/prod/ABRSM-Drum-Kit-Exam-Pieces-Grade-8-from-2024/2607837)) |
| **LCME (London College of Music)** | Drum kit syllabus from 2022: Steps 1–2, Grades 1–8; five-piece kit required; solo + accompanied pieces. | ([LCME drum kit syllabus](https://lcme.uwl.ac.uk/media/jfbezqmi/drum-kit-syllabus-2022-final.pdf)) |

### 2.3 Israeli context

* **Bagrut recital, percussion (5 units, Grade 12 only)** — Ministry of Education circular (tashpad): five pieces
  across instruments and styles; **Track B "drum set and multi-percussion"**: two notated drum-set/multi-percussion
  pieces, one snare piece (or timpani étude) in which the candidate must show **rudiments — paradiddle types,
  flam, drag, open and closed rolls**, one timpani piece and one mallet piece; plus a written analysis paper
  ([guide-percussions.pdf](https://meyda.education.gov.il/files/Pop/0files/Music/high-school/guide-percussions.pdf)).
  Drum kit also appears in the **pop/rock recital track**, where the candidate must play with at least two
  rhythm-section players ([guide-playingpop.pdf](https://meyda.education.gov.il/files/Pop/0files/Music/high-school/guide-playingpop.pdf)).
* **Arab/Eastern drumming recital** — separate track: at least 5 years of percussion study, three instruments
  (frame drum: bendir/daf/tar; darbuka/zarb/dohola; riq), five pieces from five schools (Turkish or Persian, North
  African, Iraqi/Gulf, Middle-Eastern, modern Arab), live melodic accompaniment, no playback, all from memory;
  **sight-reading is mandatory**; theory questions on maqamat and **basic rhythms (iqa'at) and the strokes dum, tak
  and the rest** ([guide-arabic-music-drumming.pdf](https://meyda.education.gov.il/files/Pop/0files/Music/high-school/guide-arabic-music-drumming.pdf)).
  *Opportunity:* our Middle-Eastern family can map dum → kick/low tom, tak → snare/rim, ka → hi-hat or left-hand
  rim, which works on any e-kit and serves both kit drummers and darbuka students with a pad.
* **Rimon School (Ramat HaSharon)** — performance and jazz-institute tracks; drummers follow a dedicated track
  (the jazz diploma's "secondary drums" course explicitly excludes drummers)
  ([Rimon jazz diploma](https://www.rimonschool.co.il/en/?p=166)). No public drum syllabus was found.

### 2.4 The rudiments (Percussive Arts Society)

The PAS **40 International Drum Rudiments** (1984) extend the 26 NARD rudiments of 1933 and fall in four
families: **roll** rudiments (single-stroke, multiple-bounce, double-stroke open rolls of 5–17 strokes) — 15 in
PAS's numbering, plus diddle (paradiddles, double/triple paradiddle, paradiddle-diddle) — 4, **flam** rudiments
(flam, flam accent, flam tap, flamacue, flam paradiddle, swiss army triplet, inverted flam tap, pataflafla,
flam drag…) — 11, and **drag** rudiments (drag, single/double drag tap, lesson 25, single/double/triple ratamacue)
— 10 ([PAS rudiments](https://pas.org/resources/rudiments),
[PAS PDF](https://pas.org/wp-content/uploads/2024/04/pas-rudiments.pdf),
[NARD 26 vs PAS 40](https://bloomdrums.com/nard-26-vs-pas-40/)). The official sheet is PAS-copyrighted; our app
should generate its own exercises from sticking strings (e.g. `RLRR LRLL`), which is a fact, not an expression.

### 2.5 Classic method books (summaries only)

| Book | What it trains | How we would use the *idea* (not the content) |
|---|---|---|
| **George Lawrence Stone — *Stick Control*** (1935) | Pages of single-line sticking permutations played on one surface with a metronome, repeated many times; also triplets, flams, short rolls. The archetype of "hands on a pad with a click". | Generator of sticking permutations; measure evenness and R/L velocity balance; tempo ladder. Perfect for mic-on-a-pad. |
| **Ted Reed — *Progressive Steps to Syncopation*** (1958) | Snare reading of syncopated eighth/quarter figures; teachers famously re-use the reading pages as a melody for kit applications (bass drum plays the line, ride swings, etc.). | Reading family; "line becomes kick/snare/fill" independence generator. |
| **Jim Chapin — *Advanced Techniques for the Modern Drummer*** (1948) | Jazz independence: steady ride cymbal + hi-hat on 2 & 4 while snare and bass drum play written comping figures. | Jazz family levels 4–8: ride ostinato + generated comping lines, per-limb timing. |
| **Gary Chester — *The New Breed*** (1985) | "Systems": a fixed multi-limb ostinato while reading a separate melody line, singing a part aloud, then rotating which limb reads. Builds four-way independence and internal time. | Independence family: ostinato + reading line on a chosen limb; "sing a part" replaced by our ear-training (call-and-response). |
| **Tommy Igoe — *Groove Essentials* 1.0/2.0** | ~100 grooves across rock, funk, jazz, Latin, world, each with play-along tracks at several tempi (47 + 53 grooves). | Model for our groove library: each groove = pattern + 3 tempi + band play-along ([Vic Firth Groove Essentials](https://ae.vicfirth.com/education/groove-essentials/), [Hudson 1.0](https://hudsonmusic.com/product/groove-essentials-1-0-book)). |
| **Marvin Dahlgren & Elliot Fine — *4-Way Coordination*** (1963) | Systematic independence: each limb plays against the others in combination (hands vs feet, one-against-three), then melodic figures around the kit. | Coordination matrix: generate every pair/triple of limb lines with the same rhythm cell ([Goodreads listing](https://www.goodreads.com/topic/list_book/163375)). |

### 2.6 Online programs

* **Drumeo / Musora** — the largest video library; courses (e.g. *Successful Drumming*, *Independence Made Easy*
  — 26 weeks), live streams, mentor video review. **No in-app listening or scoring**
  ([Upbeat comparison](https://upbeat.studio/compare/drum-learning-apps/), [Drumeo review](https://drumspy.com/reviews/drumeo-review/)).
* **Melodics** — e-kit lessons scored over MIDI per instrument; since 2023 also **acoustic drums by microphone**
  (with per-drum calibration; the vendor says it "isn't perfect": soft hits missed, double triggers); tempo ramp,
  looping; Windows/macOS/iOS, no Android ([Melodics drums](https://melodics.com/drums),
  [MIDI.org on Melodics](https://midi.org/melodics-using-midi-to-learn-music),
  [acoustic calibration](https://support.melodics.com/en/articles/8641253-guide-to-calibrating-acoustic-drums-with-melodics),
  [Modern Drummer](https://www.moderndrummer.com/article/melodics-now-for-acoustic-drums/)).
* **Mike's Lessons (Mike Johnston)** — web-only video curriculum + submitted-video feedback; also hosts the free
  **Groove Scribe** notation tool ([Groove Scribe](https://www.mikeslessons.com/groove),
  [source](https://github.com/montulli/GrooveScribe)).
* **180 Drums** — three tiers: *Fresh Sticks* (gear, setup, reading, beats, fills, independence), *180 Challenge*
  (90 lessons + 90 practice videos), *Master* ([Modern Drummer interview](https://moderndrummer.com/?p=59435)).
* **Drum Beats Online** — Jared Falk's earlier site, now folded into Drumeo (beginner beats, fills, the *Successful
  Drumming* course) ([Jared Falk](https://drumeo.com/jared)).

### 2.7 Skill map (what a complete drummer knows)

| Area | Content | Measurable by MIDI? | By mic? |
|---|---|---|---|
| Grip & strokes | Matched/traditional grip; full, down, tap, up strokes; **Moeller** (whip motion: down-tap-up triplet) ([Moeller overview](https://melodics.com/blog/the-moeller-method), [Drummer Cafe](https://drummercafe.com/education/lessons/moeller-method-four-basic-strokes)) | Result only: accent/tap velocity bands | Result only, roughly |
| Rudiments | 40 PAS; singles, doubles, paradiddles, flams, drags, rolls | Timing, velocity, flam spacing; sticking only via two-zone trick | Timing of singles/doubles on a pad; flams and buzz rolls poorly |
| Time & subdivision | Quarters → 8ths → triplets → 16ths → sextuplets; click on 2&4; gap click; tempo hold; pocket (ahead/behind) | Yes, precisely | Yes, single surface |
| Grooves by style | Rock, pop, funk, half-time, shuffle, swing ride/comping, bossa, samba, songo, cascara/clave, Afro-Cuban 6/8, reggae one-drop/steppers, maqsum, baladi, saidi, ayyub, wahda, malfuf, 7/8 & 10/8 Eastern meters | Yes, per limb | No (bleed between drums) |
| Fills & orchestration | 8th/16th/triplet fills around toms; landing on 1 with crash + kick | Yes | Partly (timing yes, which drum no) |
| Independence | Ostinato + reading on another limb (Chapin, Chester, Dahlgren–Fine) | Yes | No |
| Dynamics & ghost notes | Accent vs tap ratio; ghosts on snare; crescendo | Yes (after velocity calibration) | Relative only |
| Feet | Hi-hat foot (2&4, quarters, splash), heel-toe, double bass / double pedal singles | Yes (kick note + CC4/pedal note) | No |
| Reading | Snare reading, kit notation, charts with road map (repeats, D.S., codas), lead sheets | Yes (we score what they play from the score) | Snare reading yes |
| Song form & band | Counting form, set-ups, kicks/hits with the band, endings | Yes | Partly |
| Brushes | Sweeps, taps, ballad and swing patterns | Taps only; sweeps on a few Roland mesh snares | Taps only |

---

## 3. E-kit MIDI: what arrives, and what we can measure

### 3.1 General MIDI percussion map (channel 10, GM Level 1)

Notes 35–81. The ones a kit drummer uses: **35/36 kick**, **37 side stick (cross-stick)**, **38 snare**, 39 clap,
**40 snare (electric / commonly the rim shot)**, **41/43 floor toms**, **42 closed hi-hat**, **44 pedal hi-hat**,
**45/47 low/mid toms**, **46 open hi-hat**, **48/50 high toms**, **49 crash 1**, **51 ride**, 52 china, **53 ride
bell**, 55 splash, 56 cowbell, **57 crash 2**, 59 ride 2; Latin percussion 60–81 (bongos, congas, timbales,
agogo, cabasa, maracas, guiro, claves, woodblocks, cuica, triangle). Melodics' reference map uses exactly these
for kick 36, snare 38, rim 40, toms 41/43/45/47/48, crash 49, ride 51, hat 42/46 and **hi-hat pedal as CC 4**
([Melodics mapping guide](https://support.melodics.com/en/articles/11692696-fixing-e-drum-mapping-issues-in-melodics-advanced)).

### 3.2 How common modules send hits

| Brand | Hits | Hi-hat | Cymbal choke | Notes |
|---|---|---|---|---|
| **Roland TD** (TD-07/17/27/50) | Separate notes per zone: snare head 38, rim 40, cross-stick 37; tom head/rim pairs (e.g. 48/50, 45/47, 43/58); crash bow/edge (49/55); ride bow/edge/bell (51/59/53) **(verify per model; Roland publishes a "Default MIDI Note Map" and a Data List)** ([TD-17 note map](https://support.roland.com/hc/en-us/articles/360005173411-TD-17-Default-MIDI-Note-Map), [TD-50X MIDI implementation](https://static.roland.com/assets/media/pdf/TD-50X_MIDI_Imple_eng02_W.pdf)) | Open bow 46 / edge 26, closed bow 42 / edge 22, pedal 44; **CC4 = pedal position**, sent continuously. Some users report CC4 spanning only ~0–90 on some models **(verify)** ([forum](https://forums.steinberg.net/t/need-some-assistance-setting-cc4-scaling/660434)) | **Polyphonic Key Pressure (0xA0)** on the cymbal's note when a choke-capable pad is grabbed | Melodics needs a special "RolandHiHat" filter → Roland hats need care |
| **Alesis** (Nitro, Surge, Strike, Crimson, Nitro Max) | GM-like notes | Lower models send **different notes per pedal state** (closed 42, open 46, half-open 23, pedal 44, splash 21 — community report **(verify)**); higher models send one hi-hat note + CC for openness ([Alesis support](https://support.alesis.com/support/solutions/articles/69000851410-alesis-drums-why-does-the-hi-hat-send-the-same-midi-note-open-closed-), [Crimson II mapping](https://support.alesis.com/support/solutions/articles/69000827353-alesis-crimson-ii-mapping-the-crimson-ii-hi-hat-in-logic-pro-x)) | Model-dependent | Melodics: some Alesis models need a "no pedal note" filter; USB 2.0 ports help |
| **Yamaha DTX** (DTX402/432/452, DTX6/8) | Kick 36, crash 49, ride 51, GM-like | Open 46, closed 42, **foot close 44, foot splash 83** (older models 85); **CC4 transmitted** ([DTX402 reference manual](https://es.yamaha.com/files/download/other_assets/8/1181128/dtx402k_432k_452k_en_rm_a0.pdf)) | Model-dependent | Some Yamaha units (DD-75) send 40 for snare — mapping must be learned, not assumed |
| **EFNOTE** (3, 5, 7, PRO) | USB-MIDI and 5-pin MIDI out; note map in the reference guides ([EFNOTE 3/5/7 guide](https://fullcompass.com/common/files/86060-EFNOTE357UserGuide.pdf), [PRO guide](https://artesia-pro.com/wp-content/uploads/2023/08/EFNOTE_PRO_RG_en01.pdf)) | Not confirmed in sources found **(verify by monitoring a real kit)** | — | Treat as "unknown → learn by mapping wizard" |

**Design consequence:** never hard-code a brand map. Ship GM + Roland + Alesis + Yamaha presets, and always run a
**30-second "hit each pad" wizard** that learns the user's notes. Melodics' own support pages show that
auto-detection breaks often enough to need manual mapping and per-brand hi-hat filters.

### 3.3 Hi-hat model we need

The hi-hat is the hardest pad. Keep a live **openness state 0–1** from CC4 (normalised per kit: learn min/max in the
wizard by asking "press the pedal fully, then lift it"). Classify each hat stroke by openness at hit time:
closed (< 0.2), half (0.2–0.6), open (> 0.6) — thresholds tuneable. Accept either style of kit: (a) one note + CC4,
(b) separate notes per state, (c) both. Pedal **chick** = note 44 (or a CC4 fall crossing the closed threshold
with speed, for kits that send no pedal note). **Foot splash** = note 21/83/85 or a fast close-then-open.

### 3.4 Chokes, velocity curves, extra data

* **Chokes:** Roland sends poly aftertouch on the cymbal note; others may send nothing. Use only as a bonus
  ("crash choke on the and of 4" in a fill-ending drill), never as a required element on unknown kits.
* **Velocity curves:** every module applies its own curve ("linear", "exp", "log", plus per-pad sensitivity).
  Raw velocity numbers are therefore **not comparable between kits or even pads**. Solution: a **velocity
  calibration** in the wizard — 8 soft, 8 medium, 8 loud strokes on snare (and later hat and kick) → store each
  pad's soft/medium/loud medians; judge "ghost", "normal", "accent" relative to those, never to absolute 40/80/120.
* **Positional sensing** (Roland digital snares/rides send extra CCs for strike position) and **brush mode** on
  some Roland mesh snares — out of scope for v1.

### 3.5 Timing and latency in the browser

* **Timestamps:** `MIDIMessageEvent.timeStamp` is a `DOMHighResTimeStamp` on the same clock as
  `performance.now()`, with sub-millisecond resolution in Chromium; it records when the message *arrived*, so JS
  thread jank does not shift it ([Chrome high-res timestamps](https://developer.chrome.com/blog/high-res-timestamps),
  [W3C discussion](https://lists.w3.org/Archives/Public/public-audio/2012AprJun/0539.html)). Our `midi.ts` already
  passes `e.timeStamp` through.
* **Input chain:** pad → module scan/trigger detection (a few ms) → USB-MIDI (~1 ms) or 5-pin DIN
  (~1 ms per 3-byte message, so a kick+snare+hat chord serialises over ~3 ms). Melodics and Clone Hero both
  recommend **direct USB over MIDI-to-USB adapters**, especially for hi-hats
  ([Clone Hero MIDI drums](https://wiki.clonehero.net/books/guitars-drums-controllers/page/midi-drums)).
* **Output chain (the real problem):** the click/band the drummer hears is late by `AudioContext.baseLatency +
  outputLatency`; on Windows/Android wired this is 10–40 ms, on **Bluetooth headphones 150–250 ms**. We judge hits
  against what the drummer *heard*, so we must (1) map audio time to performance time with
  `AudioContext.getOutputTimestamp()`, and (2) run our existing **latency calibration** (`src/engine/latency.ts`,
  source `'midi'`: play along with clicks, the median offset is stored). Detect Bluetooth output (very large
  calibrated offset or `outputLatency > 100 ms`) and ask the user to use the kit's headphone jack — the best setup
  is: **module plays its own drum sounds**, our app sends only the click/band to the computer audio, the drummer
  listens through a mixer or the module's aux-in.
* **Browser support:** Web MIDI works in Chrome, Edge, Opera (desktop and Android) and Firefox (with a site
  permission); **not in Safari on macOS or any iOS browser** — the WebKit bug is still open
  ([caniuse](https://caniuse.com/midi), [WebKit 107250](https://bugs.webkit.org/show_bug.cgi?id=107250)). iPad
  users get microphone mode only.
* **Code impact on `src/speech/midi.ts`:** add a *drum profile*: skip the octave shift and pedal invert; forward
  0xA0 poly-pressure (choke) and keep CC4 state; ignore note-offs (kits send short or no meaningful offs);
  de-duplicate cross-talk (a second note on a neighbouring pad within 3 ms at < 25 % of the main velocity is
  bleed, not a hit — make this optional).

### 3.6 What we can measure precisely (MIDI)

| Metric | How | Reuse |
|---|---|---|
| **Per-limb timing vs grid** | Each expected event has a voice (kick/snare/hat/ride/tom/crash/hat-foot) and therefore a limb; match hits to expected events by voice within a window; mean signed offset (rush/drag) and SD per limb | `analyze.ts` timingMean/SD; extend `Hand` → `Limb = RH \| LH \| RF \| LF` |
| **Evenness** | IOI coefficient of variation per limb / per voice | `cvR`/`cvL` → per-limb CV |
| **Flam spacing** | Grace-to-main gap (target 15–40 ms, consistent) and grace/main velocity ratio | new, simple |
| **Dynamics** | Velocity bands relative to calibration: ghost hit rate, accent gap, crescendo slope (R²) | `velSD`, `accentGap`, `slope` |
| **Hi-hat articulation** | Openness at hit time (CC4); closed/open on the right steps; foot chick timing | new |
| **Groove fingerprint per limb** | Microtiming profile per 16th step per limb (e.g. "snare 2&4 sits 8 ms late, hat 16ths swing 55 %") | `analysis/groove.ts` fingerprint, groove trainer `swingOf` / `pocketScore` |
| **Wrong-voice hits** | Kick where a snare was due, open hat where closed was due | `wrong` count |
| **Tempo drift** | Linear fit of hit times vs grid in click-off bars | groove trainer `heldSilent` |
| **Sticking (partial)** | Only when the two hands are forced onto **different pads/zones** (see 3.7) | new |

### 3.7 What we cannot measure, and substitutes

| Not measurable | Why | Substitute that still counts as measured |
|---|---|---|
| **Which hand hit the snare** (sticking) | A pad reports pad + velocity, not the stick | **Two-zone sticking checker:** R on snare head, L on snare rim (or R on snare, L on floor tom / hi-hat pad); MIDI then *is* sticking. For mic mode: play each hand alone ("right hand only, then left only") to measure each hand's evenness separately; accent-on-one-hand patterns verify alternation by velocity shape |
| **Grip, stroke motion, Moeller, posture, stick height** | Not in the signal | Teach on the brief page; measure the *audible result*: accent/tap velocity separation, evenness at speed, endurance (minutes at tempo without CV rising) |
| **Buzz/press roll quality** | E-kits retrigger erratically on buzz; mic can't separate bounces | Measure only open double-stroke rolls (two clean hits per hand); closed roll = not scored |
| **Brush sweeps** | Most pads don't sense lateral motion | Brush taps scored; sweeps untaught by measurement (v3, Roland brush-capable snares only) |
| **Sound quality / tuning** | Irrelevant on an e-kit | — |

### 3.8 Microphone-only fallback (acoustic kits, practice pads)

* **Reliable:** onset times on **one surface** (practice pad, single snare). A pad stroke is a sharp transient;
  hand-annotated onset uncertainty for sharp strokes is under 1–2 ms ([hi-hat timing study](https://arxiv.org/pdf/1904.11752)),
  and simple envelope thresholding is adequate for a single instrument ([NIME 2015](https://zenodo.org/records/1179112/files/nime2015_147.pdf)).
  After our mic latency calibration, expect judging precision of roughly ±5–10 ms **(estimate)** — good enough for
  singles, doubles, paradiddles, accents, gap-click and tempo ladders up to ~10–12 notes/s.
* **Needs care:** request `getUserMedia` with `echoCancellation`, `noiseSuppression` and `autoGainControl` **off**
  (AGC destroys dynamics); adaptive threshold with a 25–40 ms refractory window (blocks double triggers but also
  merges **flams**, so flams are MIDI-only); room echo; the app's own click bleeding into the mic → use headphones.
* **Relative dynamics:** peak level of each stroke relative to the player's own calibrated soft/loud strokes is
  usable for accent/tap contrast; absolute loudness is not (distance, phone mic).
* **Not reliable:** which drum on a full acoustic kit (bleed; spectral classification is research-grade), hi-hat
  open/closed, kick under a loud snare, ghost notes inside a full groove, buzz rolls, any four-limb drill.
  Melodics' acoustic mode itself acknowledges missed soft hits and double triggers
  ([Melodics acoustic guide](https://support.melodics.com/en/articles/8641253-guide-to-calibrating-acoustic-drums-with-melodics)).
* **Rule:** in mic mode only the families Strokes & dynamics, Rudiments (no flams), Time & subdivision and Reading
  (snare) are offered and counted. Grooves require MIDI.

---

## 4. Proposed curriculum

### 4.1 Global conventions

* **Tempo ladder** (`src/engine/drills/ladder.ts`): start tempo → 3 *clean* takes raise the tempo one step;
  2 *not* takes drop it 10 %. A level is **passed** when the ladder reaches the target tempo with a clean take.
* **Take** = 4 bars (2 bars count-in), or 8 bars for grooves.
* **Verdicts (defaults ⚙, to calibrate with the owner and his drummer friends):**

| Tier | Window per hit | Hit rate | Timing SD (per limb) | |mean offset| | Wrong voice | Velocity rule |
|---|---|---|---|---|---|---|
| Beginner (L1–3) | ±60 ms | ≥ 90 % | ≤ 25 ms | ≤ 25 ms | ≤ 5 % | as level states |
| Intermediate (L4–7) | ±45 ms | ≥ 95 % | ≤ 16 ms | ≤ 15 ms | ≤ 3 % | |
| Advanced (L8+) | ±35 ms | ≥ 97 % | ≤ 11 ms | ≤ 10 ms | ≤ 2 % | |

  *clean* = all rules met; *almost* = one rule missed by < 25 %; *not* = otherwise. Windows tighten with tempo
  (never wider than 22 % of the shortest written IOI).
* **Velocity bands** come from the per-pad calibration: ghost ≤ soft median × 1.1; accent ≥ loud median × 0.9;
  "accent gap" = median accent − median tap.
* Every drill passes through the existing brief/gate page (text, refresher, Play), fits one phone screen, and
  feeds path, map, XP, leagues, level test and workout (house rules).
* Tempo below is ♩ unless noted; "16ths @ 80" means four notes per beat at ♩ = 80.

### 4.2 Families and levels

#### F1 — Strokes & dynamics (MIDI or mic)

| L | Drill | Tempo start → target | Subdiv | Measure | Pass |
|---|---|---|---|---|---|
| 1 | Even quarters, R hand only, then L only | 60 → 90 | 1/4 | SD per hand, velocity SD | clean @ target; velocity CV ≤ 15 % |
| 2 | Even 8ths alternating, one dynamic (mf) | 60 → 100 | 1/8 | per-hand CV, R/L velocity balance | balance gap ≤ 10 % |
| 3 | Three dynamic levels on cue (p, mf, f, 4 beats each) | 70 | 1/8 | band hit per segment | ≥ 85 % strokes in band |
| 4 | Accent on beat 1 of each group of 4 (down–tap–tap–up idea) | 60 → 100 | 1/16 | accent gap, tap velocity SD | gap ≥ 35 % of range; taps CV ≤ 15 % |
| 5 | Moving accent (accent on 1, then e, then &, then a) | 60 → 90 | 1/16 | accent position correctness, gap | ≥ 95 % accents on right note |
| 6 | Accented triplets (Moeller-style 3-note groups) | 60 → 100 | 1/8T | gap, evenness | clean @ target |
| 7 | Crescendo/decrescendo over 2 bars on 16ths | 70 | 1/16 | slope + R² | R² ≥ 0.8, range ≥ 50 % |
| 8 | Ghost/accent duel: accents at f, others at pp | 70 → 110 | 1/16 | ghost rate, accent gap | ghosts ≥ 90 % in ghost band |

#### F2 — Rudiments: singles, doubles, rolls (MIDI or mic)

| L | Drill | Tempo | Subdiv | Measure | Pass |
|---|---|---|---|---|---|
| 1 | Single strokes | 60 → 100 | 1/8 | CV, SD | clean |
| 2 | Single strokes | 70 → 110 | 1/16 | | clean |
| 3 | Double strokes (RRLL), open | 60 → 90 | 1/8 | second-stroke velocity ratio (≥ 0.8 of first), IOI evenness inside doubles | clean + ratio |
| 4 | Double strokes | 70 → 110 | 1/16 | same | |
| 5 | Single-stroke four / seven | 70 → 110 | 1/16T, 1/16 | grouping timing, landing accent | |
| 6 | 5-, 7-, 9-stroke rolls (open) | 70 → 100 | 1/16 / 1/32 | doubles ratio, release accent | |
| 7 | Triplet singles ↔ 16th singles switch every bar | 70 → 110 | mixed | transition error at bar line | ≤ 15 ms at switch |
| 8 | Speed ladder: singles until break | open | 1/16 | max clean nps (personal record) | ≥ 8 nps (= 16ths @ 120) |
| 9 | Endurance: singles 2 min at 80 % of record | — | 1/16 | CV drift over time | CV rise ≤ 30 % |
| 10 | Double-stroke roll 16ths→32nds | 60 → 100 | 1/32 | ratio, evenness | |

#### F3 — Rudiments: diddles, flams, drags (paradiddles mic-OK; flams/drags MIDI only)

| L | Drill | Tempo | Subdiv | Measure | Pass |
|---|---|---|---|---|---|
| 1 | Single paradiddle | 60 → 100 | 1/16 | CV, accent on first note | clean |
| 2 | Paradiddle with accents | 70 → 110 | 1/16 | accent gap | |
| 3 | Inverted / reverse paradiddle | 60 → 100 | 1/16 | | |
| 4 | Double paradiddle, paradiddle-diddle | 60 → 100 | 1/8T, 1/16 | | |
| 5 | Flams (alternating) | 50 → 80 | 1/4 | flam gap 15–40 ms, gap SD ≤ 8 ms, grace ≤ 50 % of main velocity | ≥ 90 % flams in spec |
| 6 | Flam accent, flam tap | 60 → 90 | 1/8T, 1/16 | + timing | |
| 7 | Drags / ruff, single drag tap | 60 → 90 | 1/8 | grace pair spacing, main on grid | |
| 8 | Swiss army triplet, flam paradiddle | 60 → 100 | 1/8T, 1/16 | | |
| 9 | Ratamacues | 60 → 90 | 1/8T | | |
| 10 | Rudiment-to-kit: paradiddle split RH hat / LH snare + kick on 1 | 70 → 100 | 1/16 | per-limb | |

#### F4 — Time & subdivision (MIDI, mic or tap)

| L | Drill | Tempo | Subdiv | Measure | Pass |
|---|---|---|---|---|---|
| 1 | Quarters with click | 60 → 120 | 1/4 | mean offset, SD | clean |
| 2 | Subdivision ladder: 4 beats each of 1/4, 1/8, 1/8T, 1/16 | 60 → 90 | mixed | switch errors | |
| 3 | Click on 2 & 4 only | 70 → 110 | 1/8 | | |
| 4 | Gap click: 2 bars on, 2 off (existing fading click) | 70 → 100 | 1/8 | drift in silent bars | |mean| ≤ 20 ms in gaps |
| 5 | Gap click 1 on / 3 off | 70 → 100 | 1/8 | | |
| 6 | Click on the "&" only (offbeat click) | 70 → 110 | 1/8 | | |
| 7 | Slow time: 8ths at ♩ 50 | 50 | 1/8 | SD | SD ≤ 15 ms |
| 8 | Pocket: play 10 ms behind, then on, then 10 ms ahead (existing pocket meter) | 90 | 1/8 | pocketScore share | ≥ 70 % inside ±8 ms of target |
| 9 | Click on beat 1 only, then every other bar | 80 → 120 | 1/16 | drift | |
| 10 | Quintuplets / sextuplets vs click | 60 → 80 | 1/16Q, 1/16S | | |

#### F5 — Rock & pop grooves (MIDI)

| L | Drill | Tempo | Subdiv | Measure | Pass |
|---|---|---|---|---|---|
| 1 | Hat 8ths, snare 2 & 4, kick 1 & 3 | 70 → 110 | 1/8 | per-limb timing, wrong voice | clean 8 bars |
| 2 | Kick variations on "&" of 2/3 (4 variations, one per take) | 80 → 110 | 1/8 | | |
| 3 | Hat quarters / ride 8ths / open hat on "&" of 4 | 80 → 120 | 1/8 | hat openness at the right step | |
| 4 | 16th hat one hand (hat 16ths with RH, ~90) | 70 → 100 | 1/16 | hat CV | |
| 5 | 16th hat two hands (alternating, snare on 2 & 4 by LH via hat → snare move) | 80 → 110 | 1/16 | | |
| 6 | Half-time, double-time and four-on-the-floor (disco/house with open hat on &) | 80 → 130 | 1/8–1/16 | | |
| 7 | Pop with 16th kick syncopation | 85 → 110 | 1/16 | kick timing SD | |
| 8 | Groove + 1-bar fill every 4th bar, crash on 1 | 80 → 120 | mixed | landing error (see F9) | |
| 9 | Punk / fast 8ths endurance (2 min) | 150 → 180 | 1/8 | drift, CV rise | |
| 10 | Play-along: verse/chorus groove switch with band (song form) | song tempo | | section changes on time | 0 missed section changes |

#### F6 — Funk & ghost notes (MIDI)

| L | Drill | Tempo | Subdiv | Measure | Pass |
|---|---|---|---|---|---|
| 1 | Snare ghosts alone: accents on 2 & 4, ghosts on "e/a" | 60 → 90 | 1/16 | ghost band rate, accent gap | ≥ 85 % ghosts in band |
| 2 | Add hat 8ths | 70 → 95 | 1/16 | per-limb + ghost | |
| 3 | Add syncopated kick | 70 → 95 | 1/16 | | |
| 4 | 16th-hat funk with ghosts (one-hand hat) | 70 → 100 | 1/16 | | |
| 5 | Linear funk (no two limbs together) | 70 → 100 | 1/16 | coincidence rate (should be 0) | |
| 6 | Open-hat barks on "a" | 80 → 100 | 1/16 | openness timing | |
| 7 | Half-time shuffle with ghosts (triplet grid) | 70 → 90 | 1/8T | ghost band, swing ratio | |
| 8 | Hip-hop / boom-bap with lazy snare (behind the beat by 10–20 ms) | 85–95 | 1/16 | pocket of snare only | |
| 9 | Go-go / New Orleans second-line feel | 90 → 110 | 1/16 swung | | |

#### F7 — Shuffle & triplet feels (MIDI)

| L | Drill | Tempo | Subdiv | Measure | Pass |
|---|---|---|---|---|---|
| 1 | Triplet subdivision on hat, snare 2 & 4 | 60 → 90 | 1/8T | | |
| 2 | Shuffle (skip-note) on hat | 80 → 120 | 1/8T | swing ratio ≥ 0.62 and stable (SD) | |
| 3 | 12/8 slow blues | ♪.=50 → 66 | 1/8T | | |
| 4 | Texas / double shuffle (both hands shuffle) | 100 → 140 | 1/8T | | |
| 5 | Swing ratio dial: play at 55 %, 62 %, 67 % on command | 100 | 1/8 sw | ratio error ≤ 3 % | (existing swing dial) |
| 6 | Reggae one-drop (kick + rim on 3) | 70 → 85 | 1/8T | | |
| 7 | Steppers / rockers reggae | 70 → 90 | | | |
| 8 | Half-time shuffle (Purdie/Porcaro-style idea, our own pattern) | 70 → 90 | 1/8T | ghost band + swing | |

#### F8 — Jazz: ride, feathering, comping (MIDI; brushes taps optional)

| L | Drill | Tempo | Subdiv | Measure | Pass |
|---|---|---|---|---|---|
| 1 | Ride pattern alone ("spang-spang-a-lang") | 100 → 160 | swing 8ths | swing ratio, quarter evenness | |
| 2 | + hi-hat foot on 2 & 4 | 100 → 160 | | foot timing | |
| 3 | + feathered kick quarters (pp) | 100 → 160 | | kick in ghost band | ≥ 85 % |
| 4 | Comping: snare on chosen triplet partials (generated, 1 per take) | 110 → 160 | 1/8T | per-limb timing; ride stays steady (CV) | |
| 5 | Comping snare + kick (generated two-voice lines) | 110 → 160 | | | |
| 6 | Jazz waltz | 120 → 170 | 1/8T | | |
| 7 | Up-tempo ride (broken 2-feel) | 180 → 240 | | | |
| 8 | Trading 4s: 4 bars time, 4 bars solo with band, re-enter on 1 | 140 | | form position, landing | 0 lost bars |
| 9 | Brush taps ballad (taps scored; sweep shown, not scored) | 60 → 80 | | | |

#### F9 — Fills & orchestration (MIDI)

| L | Drill | Tempo | Subdiv | Measure | Pass |
|---|---|---|---|---|---|
| 1 | 3 bars groove + 1-beat fill (snare 8ths) → crash + kick on 1 | 70 → 110 | 1/8 | **landing error** = crash/kick offset on 1; groove resumes | |landing| ≤ 20 ms |
| 2 | 2-beat 16th fill snare → toms | 70 → 110 | 1/16 | landing, fill evenness | |
| 3 | 1-bar 16th fill around kit (high → floor) | 70 → 110 | 1/16 | right voices in order | ≥ 95 % voices |
| 4 | Triplet fills | 70 → 110 | 1/8T | | |
| 5 | Fills starting off the beat ("&" of 3) | 80 → 110 | 1/16 | | |
| 6 | Hand–foot combinations (RLK, RLRLK) | 80 → 120 | 1/16, 1/8T | coincidence + timing | |
| 7 | Flam / accent fills, crash on "&" of 4 (anticipation) with choke | 80 → 110 | | choke if kit supports, else skip | |
| 8 | Random fill call: app shows fill length (1–4 beats) one bar early | 80 → 110 | | landing + groove resumption | |
| 9 | Improvised fill (any notes) — scored only on landing and time | 90 → 130 | | tempo stability through fill (no rush) | rush ≤ 2 % |
| 10 | Set-ups for band hits (kick+crash on written hits, with band) | song | | | |

#### F10 — Independence & coordination (MIDI)

| L | Drill | Tempo | Subdiv | Measure | Pass |
|---|---|---|---|---|---|
| 1 | Hat 8ths + kick on all 8ths/quarters (two limbs, unison) | 60 → 100 | 1/8 | flam between limbs (|Δ| ≤ 15 ms) | |
| 2 | Hat 8ths + kick on generated 8th rhythms (Reed-style idea) | 60 → 100 | 1/8 | | |
| 3 | Same, 16th kick rhythms | 60 → 90 | 1/16 | | |
| 4 | Hat 8ths + snare reading line (generated) | 60 → 100 | 1/8, 1/16 | | |
| 5 | Ostinato hands, kick reads line; then swap reading limb (Chester-style "system" idea) | 60 → 90 | | | |
| 6 | 3-way: ride + foot hat 2&4 + snare reads | 90 → 140 | 1/8T | | |
| 7 | 4-way: hands reading, feet ostinato (samba feet, baião feet) | 70 → 100 | 1/16 | | |
| 8 | Polyrhythm 3:2 and 4:3 between limbs | 60 → 90 | | ratio error | |
| 9 | Clave over groove (one hand clave, other groove, kick tumbao) | 80 → 110 | | | |

#### F11 — Latin & Afro-Caribbean/Brazilian (MIDI)

| L | Drill | Tempo | Subdiv | Measure | Pass |
|---|---|---|---|---|---|
| 1 | Bossa nova (cross-stick pattern, kick 1 & "&2") | 110 → 140 | 1/8 | | |
| 2 | Samba (feet pattern first, then hands) | 80 → 110 (half-note feel) | 1/16 | | |
| 3 | Son clave 3-2 and 2-3 on cross-stick/cowbell | 90 → 120 | 1/16 | | |
| 4 | Cascara on shell/ride + clave on cross-stick | 90 → 120 | 1/16 | | |
| 5 | Mambo bell / cha-cha-chá | 100 → 130 | 1/8 | | |
| 6 | Songo | 100 → 130 | 1/16 | | |
| 7 | Afro-Cuban 6/8 (bembé bell) | ♩.=80 → 110 | 1/8 in 6/8 | | |
| 8 | Baião / Brazilian northeast | 90 → 120 | 1/16 | | |
| 9 | Mozambique / Nanigo (adv.) | 100 → 120 | | | |

#### F12 — Middle-Eastern & Israeli (MIDI; dum→kick/low tom, tak→snare/rim, ka→hat or LH rim)

| L | Drill | Tempo | Subdiv | Measure | Pass |
|---|---|---|---|---|---|
| 1 | Wahda (4/4 foundation) and malfuf (2/4: dum-tak-tak feel) | 80 → 120 | 1/8 | | |
| 2 | Maqsum (4/4) skeleton, dum/tak only | 80 → 110 | 1/8 | voice correctness | |
| 3 | Maqsum with ka fills (16th ornaments) | 80 → 110 | 1/16 | ghost band of ka | |
| 4 | Baladi and saidi (dum-dum variants) | 80 → 110 | 1/16 | | |
| 5 | Ayyub (2/4 trance groove) | 100 → 140 | 1/16 | | |
| 6 | Mizrahi/Israeli pop kit groove (maqsum split: kick dums, snare taks, hat 16ths) | 90 → 115 | 1/16 | per-limb | |
| 7 | Karsilama / 9/8 (2+2+2+3) | ♪ 200 → 260 | 1/8 | bar-length stability | |
| 8 | 7/8 (laz / 2+2+3) and 10/8 (samai-type 3+2+2+3) | ♪ 180 → 240 | 1/8 | | |
| 9 | Chiftetelli (8/8 slow, 3+3+2 feel) with ornaments | 60 → 80 | 1/16 | | |
| 10 | Switch rhythms on cue with band (maqsum → saidi → ayyub) | 100 | | switch on 1 | 0 missed switches |

*(Rhythm names and patterns are traditional and public; patterns already exist in `src/engine/grooves.ts` world
style — maqsum, baladi, saidi, ayub, wahda, afro 6/8, 7/8, 9/8.)*

#### F13 — Feet: hi-hat foot & double bass (MIDI)

| L | Drill | Tempo | Subdiv | Measure | Pass |
|---|---|---|---|---|---|
| 1 | Hat foot on 2 & 4 while hands play quarters | 70 → 110 | 1/4 | chick timing (note 44 or CC4 close) | |
| 2 | Hat foot quarters + groove | 80 → 110 | 1/8 | | |
| 3 | Kick single strokes 8ths (one foot) | 60 → 110 | 1/8 | kick CV | |
| 4 | Kick doubles (16th pairs: heel-toe / slide) | 60 → 100 | 1/16 | pair spacing, 2nd-hit velocity ratio | |
| 5 | Foot splash on "&" | 80 → 110 | 1/8 | splash detection | |
| 6 | Double pedal alternating (R/L foot cannot be told apart → evenness only) | 80 → 140 | 1/16 | CV, velocity balance odd/even hits | CV ≤ 12 % |
| 7 | Double bass 16ths under rock groove, 1 min | 100 → 160 | 1/16 | drift, CV rise | |
| 8 | Double bass triplets / gallop | 100 → 150 | 1/8T | | |

*(Double pedal: both beaters hit the same pad/note, so sticking can't be read; we measure alternation by
evenness and odd/even velocity balance — a weak foot shows as alternating loud/soft.)*

#### F14 — Reading (MIDI; snare levels also mic)

| L | Drill | Tempo | Subdiv | Measure | Pass |
|---|---|---|---|---|---|
| 1 | Snare: quarters, 8ths, rests (4 bars, new each take) | 70 → 90 | 1/8 | hit rate, timing | clean first try = "sight-read" credit |
| 2 | Snare: dotted quarters, ties | 70 → 90 | 1/8 | | |
| 3 | Snare: 16th groupings | 60 → 80 | 1/16 | | |
| 4 | Snare: triplets, accents and dynamics markings | 60 → 80 | | velocity band per marking | |
| 5 | Kit notation: read a 2-bar groove (stave positions: kick, snare, hat x-noteheads) | 80 | 1/8 | per-limb | |
| 6 | Kit: 4-bar groove + fill | 80 → 100 | 1/16 | | |
| 7 | Chart road map: repeats, 1st/2nd endings, D.S./coda with band | song | | form position | |
| 8 | Lead-sheet style chart: slashes + written hits ("play time, catch the hits") | song | | hits on time + time feel | |
| 9 | Exam-style unseen (Rockschool/Trinity-like length, own material) | grade tempo | | | |

### 4.3 Version mapping

* **v1 (≈6 families):** F1 (L1–5), F2 (L1–6), F3 (L1–4), F4 (L1–6), F5 (L1–8), F9 (L1–5), F14 (L1–5).
* **v2:** F6, F7, F8, F10, F11, F12, F13, rest of levels.
* **v3:** brushes beyond taps, positional sensing, chokes everywhere, notation upload of user charts.

---

## 5. Placement probe (2–3 minutes)

Runs after the kit wizard (which itself takes ~40 s: hit each pad twice, pedal open/close, 8 soft / 8 loud snare
strokes, then 8 bars of latency calibration — can be skipped on repeat devices). Each step is adaptive: a failed
step skips the harder ones in the same family.

| # | Step (time) | What the player does | Decides |
|---|---|---|---|
| 1 | Pulse (15 s) | Quarters on snare at ♩ 80, click 2 bars on / 2 off | F4 start (L1 / L4 / L6) |
| 2 | Hands (25 s) | Singles 16ths with an auto-rising ladder from ♩ 70 (+8 every 2 bars until *not*) | F2 start; personal max nps |
| 3 | Doubles & paradiddle (15 s) | RRLL then RLRR LRLL at ♩ 80, 16ths | F2/F3 start |
| 4 | Dynamics (15 s) | Accents on 1 of every 4 16ths at ♩ 80 | F1 start; accent gap |
| 5 | Basic groove (15 s) | Rock 8ths at ♩ 95, 4 bars | F5 L1 vs L3+ |
| 6 | Groove reach (20 s) | One of: 16th-hat funk with ghosts (♩ 90) **or** swing ride + foot 2&4 (♩ 130) — player picks the style they play | F6 or F8 start |
| 7 | Fill & land (15 s) | 3 bars groove + 1-bar 16th fill around toms, crash + kick on 1 | F9 start |
| 8 | Read (20 s, optional) | 2-bar kit groove shown as notation, sight-read at ♩ 80 | F14 start |
| 9 | Feet (10 s, if hat pedal mapped) | Foot chick on 2 & 4 while hands play quarters | F13 start |

Output: a start level per family, a "drummer rank" (from the hardest item beaten, per our promotion rule — never
"full" bars below Master), and three recommended first nodes on the path. Mic-mode probe runs steps 1–4 and 8
(snare only).

---

## 6. Special features, ranked by value

| Rank | Feature | Value | Effort | Reuses |
|---|---|---|---|---|
| 1 | **Kit connect & mapping wizard** (presets + "hit each pad" learning + hi-hat CC4 range + velocity calibration + latency) | Without it nothing works | M | `midi.ts`, `latency.ts` |
| 2 | **Tempo ladder on every drill** with clean/almost/not | The core loop users return for | S | `ladder.ts`, `analyze.ts` |
| 3 | **Per-limb feedback card** (one line: "kick 14 ms late, hat even, 2 wrong-voice") with a "Why?" expander on fails | Makes measurement visible; compact-feedback rule | S | `analyze.ts` |
| 4 | **Kit view that lights hits** (top-down kit, pad flashes green/amber/red by timing, size by velocity) | Instant clarity, mapping check | M | new SVG |
| 5 | **Groove library play-along with our band** (45 grooves exist; add bass/keys from `band.ts`; 3 tempi each) | The fun part; replaces backing tracks | M | `grooves.ts`, `band.ts` |
| 6 | **"Fill then land on 1" challenges** (random fill length cue, landing meter) | Highly specific drummer skill, unique, game-like | S | new metric |
| 7 | **Dynamics meter** (live bar of last 16 hits, ghost/normal/accent bands) | Teaches ghost notes, which beginners can't hear | S | velocity calibration |
| 8 | **Metronome that drops bars** (gap click) + pocket meter for drums | Already built for taps; extend per limb | S | `GrooveTrainer`, `grooveTrainer.ts` |
| 9 | **Highway with drum lanes** (5–7 lanes: hat, snare, kick, toms, crash/ride; Clone Hero-like) | Huge appeal to younger players; reuses the game | M | `Highway.tsx`, `highway.ts` (add 'kit' mode) |
| 10 | **Drum dictation ear training** — hear a 1–2 bar groove (our kits), play it back on the kit; scored per voice | Unique: our ear-training DNA applied to drums; nobody else does it measurably | M | `drumVoice.ts`, rhythm topics, `grooves.ts` |
| 11 | **Groove fingerprint per limb** (microtiming heat map per 16th step: where you rush/drag, your natural swing %) | Pro-level insight, shareable | M | `analysis/groove.ts` |
| 12 | **Sticking checker with two pad zones** (R = head, L = rim / other pad) | Only honest way to measure sticking | S | new mapping mode |
| 13 | **Notation reading** (render generated kit notation, drum key) | Needed for F14 and exams | M–L | existing staff renderer + percussion clef |
| 14 | **Song-form play-along** (intro/verse/chorus/bridge, cues one bar ahead, fills at section ends, endings) | Bridges drills → real playing | M | `form.ts`, band |
| 15 | **Mic mode on a pad** (rudiments, time, snare reading) | Serves iPad/acoustic users | M | mic onset code, `pianoMic.ts` patterns |
| 16 | **Middle-Eastern rhythm track** with dum/tak/ka mapping, bagrut-oriented | Israel-specific moat | S (data) | `grooves.ts` world |
| 17 | **Endurance & speed records** (max clean nps, 2-min CV drift) on the Technique map | Leagues/XP fuel | S | ladder |
| 18 | **Exam prep mode** (Rockschool/Trinity-length unseen reading, own material; bagrut snare rudiment checklist) | Exam course link | M | Exam course |
| 19 | **Teacher view** (assign drills, see measured history) — via existing piece-coach teacher tools | Growth through teachers | M | SPEC-PIECE teacher tools |
| 20 | **Import MIDI drum part** (user's own MIDI file → play-along + scoring, like Score Drummer) | Practise real songs legally (user's own file) | M | parser, piece coach |

---

## 7. Competitor scan

| Product | Listens? | Platforms | Price (2026) | Strength | Weakness vs us |
|---|---|---|---|---|---|
| **Drumeo / Musora** | No (mentor video review) | iOS, Android, web | from $29.99/mo, $279/yr | Best video teaching, famous drummers | No measured practice |
| **Melodics** | MIDI e-kit + mic (acoustic, pad) | Win, macOS, iOS (no Android) | free tier; $34.99/mo, $179.88/yr | Polished, per-instrument timing, tempo ramp | No Android/web; English; no Middle-Eastern; no ear training; no band engine |
| **Mike's Lessons + Groove Scribe** | No | Web | $29.99/mo | Free notation tool used everywhere | No scoring |
| **Drumr** | MIDI + mic (pad, with Apple headphones) | iOS only | $12.99/mo | Early/late marks | Apple only |
| **Beatlii** | MIDI e-kit, taps | iOS, Android, Win, macOS | $14.99/mo, lifetime $249.99 | Timing + dynamics scoring | No acoustic/pad; weak ratings |
| **Drum Coach (Upbeat)** | MIDI (beta, exercises only) | iOS, Android | $14.99/mo | AI routines | Songs not scored |
| **Score Drummer / Beat Studio / EarDrum** | MIDI (EarDrum also pad) | Mac/iOS/Win | various, Beat Studio free | Import MIDI/Guitar Pro, ms-precise | Tools, not curricula |
| **Drum School (Ferenc Nemeth)** | No | iOS, Android, macOS | $24.99 once | Reference library | No feedback |
| **Drum Journal / Chops / rudiment apps** | Mic (Drum Journal) or none | iOS | small | Rudiment practice | Narrow |
| **Clone Hero** | MIDI e-kit (Rock Band pro-drums charts) | PC | free | Fun, huge community charts | Game, not teaching; copyrighted song charts |
| **Rock Band 4 / Fortnite Festival Pro Drums** | E-kit via adapters (RB4) or native on PC (Fortnite) | consoles/PC | game price | Mainstream fun | No pedagogy |
| **Yousician** | — | — | — | — | No drums at all (guitar, piano, bass, ukulele, voice) |

Sources: [Upbeat comparison](https://upbeat.studio/compare/drum-learning-apps/),
[Melodics vs Drumeo](https://melodics.com/info/lp-melodics-vs-drumeo),
[Clone Hero wiki](https://wiki.clonehero.net/books/guitars-drums-controllers/page/midi-drums),
[Rock Band 4 e-kits](https://www.epicgames.com/help/rock-band-c-202300000002447/setup-c-202300000002452/rock-band-4-a202300000083413),
[Fortnite Pro Drums](https://www.epicgames.com/help/fortnite-festival-c-202300000001635/technical-support-c-202300000001717/fortnite-festival-pro-drums-a202300000084490),
[Score Drummer](https://scoredrummer.com/), [Beat Studio](https://beatstudio.io/), [EarDrum](https://ear-drum.app/),
[Yousician instruments](https://yousician.com/lp/all-instruments).

**The gap we can own**

1. **Web + Android + Windows with no install** — Melodics, the only serious measured curriculum, has no Android
   and no browser version; many e-kit owners practise with an Android phone/tablet or a Windows laptop.
2. **Hebrew-first, Israel-relevant** — Middle-Eastern rhythms on kit, bagrut rudiment requirements, Mizrahi pop
   grooves. Nobody covers this.
3. **Ear → hands** — drum dictation and groove recognition already exist as topics; connecting them to played
   answers on the kit is unique.
4. **A band, not a backing track** — our band engine plays bass/keys with the groove at any tempo and in any
   form; competitors use fixed recordings that can't follow tempo ladders smoothly.
5. **Honest promotion** — rank = hardest item beaten, measured; fits drummers' culture of tempo records.
6. **Multi-instrument household** — the same subscription covers guitar, bass, keys, voice, ear and drums.

Weak points to acknowledge: no iOS Web MIDI (mitigate with mic mode and, later, a native wrapper); smaller video
content than Drumeo (we don't compete on video); kit-mapping friction (mitigate with the wizard and presets).

---

## 8. Implementation notes for the codebase (no code changed by this research)

* `src/speech/midi.ts` — add a drum profile: no octave shift; CC4 state; 0xA0 choke events; optional cross-talk
  filter; note-offs ignored. Today `message()` shifts every note by `opts.octave` and only routes 0x80/0x90/0xB0.
* `src/engine/drills/types.ts` — `Hand = 'R' | 'L'` → add `Limb` and a `voice` per expected note; `analyze.ts`
  metrics generalise from two hands to four limbs; add flam gap, landing error, coincidence rate, openness checks.
* `src/engine/grooves.ts` — lanes are k/s/h/r; add toms (t1/t2/t3), ride, crash, hat-foot, open-hat markers so
  grooves can become drills and Highway charts.
* `src/engine/highway.ts` — modes `tap | pitch`; add `kit` mode where lanes are drum voices and MIDI notes map
  through the kit map.
* `src/ui/GrooveTrainer.tsx` — already accepts any MIDI note as a tap; give it per-limb input on e-kits.
* `src/engine/courses.ts` — add `CourseId 'drums'` with `plays: ['drums']`; follow SPEC-COURSES (own path, daily,
  practice) and the "everything connects" checklist.
* Mic mode — reuse the onset path used by piano/guitar mic drills; constraints with AGC/NS/EC off.

---

## 9. Sources

**Institutions & exams**
- Berklee Private Instruction – Percussion: https://college.berklee.edu/node/2371966
- Studying Percussion at Berklee: https://college.berklee.edu/node/2206673
- Berklee Percussion Department: https://college.berklee.edu/percussion
- Berklee Drum Set Basics: https://college.berklee.edu/node/2271396
- Berklee–Rimon credit transfer: https://www.berklee.edu/academic-affairs/credit-transfer-rimon-school-music-berklee
- Musicians Institute Drum: https://www.mi.edu/drum/
- MI Catalog: https://www.mi.edu/wp-content/catalog/MI-Catalog.pdf
- RSL new Rockschool syllabuses (2024): https://www.rslawards.com/new-rockschool-guitar-bass-drums-syllabuses-out-now/
- Rockschool Drums 2012 syllabus: https://cloud.rslawards.com/file/download/RockschoolDrums2012SyllabusNEW.pdf
- AMEB spotlight on Rockschool drums: https://www.utas.edu.au/australian-music-examinations-board/ameb-news-and-events/ameb/spotlights/spotlight-on-rockschool-drums-syllabus
- Trinity Rock & Pop grades: https://trinitycollege.com/qualifications/music/rock-and-pop/grades
- Trinity Digital Rock & Pop: https://trinitycollege.com/qualifications/music/rock-and-pop/grades/digital
- Trinity Drums Grade 5: https://trinityrock.trinitycollege.co.uk/instruments/drums/grade5
- ABRSM Drum Kit syllabus review: https://www.musicteachermagazine.co.uk/content/review/review-abrsm-drum-kit-syllabus
- ABRSM Drum Kit Grade 8 pieces: https://boosey.com/shop/prod/ABRSM-Drum-Kit-Exam-Pieces-Grade-8-from-2024/2607837
- LCME drum kit syllabus 2022: https://lcme.uwl.ac.uk/media/jfbezqmi/drum-kit-syllabus-2022-final.pdf
- Israel MoE percussion recital guide: https://meyda.education.gov.il/files/Pop/0files/Music/high-school/guide-percussions.pdf
- Israel MoE Arab/Eastern drumming recital guide: https://meyda.education.gov.il/files/Pop/0files/Music/high-school/guide-arabic-music-drumming.pdf
- Israel MoE pop recital guide: https://meyda.education.gov.il/files/Pop/0files/Music/high-school/guide-playingpop.pdf
- Rimon jazz performance diploma: https://www.rimonschool.co.il/en/?p=166

**Rudiments, technique, books**
- PAS International Drum Rudiments: https://pas.org/resources/rudiments
- PAS rudiments PDF: https://pas.org/wp-content/uploads/2024/04/pas-rudiments.pdf
- NARD 26 vs PAS 40: https://bloomdrums.com/nard-26-vs-pas-40/
- Moeller method (Melodics): https://melodics.com/blog/the-moeller-method
- Moeller four strokes (Drummer Cafe): https://drummercafe.com/education/lessons/moeller-method-four-basic-strokes
- Groove Essentials (Vic Firth): https://ae.vicfirth.com/education/groove-essentials/
- Groove Essentials 1.0 (Hudson): https://hudsonmusic.com/product/groove-essentials-1-0-book
- 4-Way Coordination (Goodreads): https://www.goodreads.com/topic/list_book/163375

**Online programs & competitors**
- Melodics drums: https://melodics.com/drums
- Melodics on MIDI.org: https://midi.org/melodics-using-midi-to-learn-music
- Melodics e-drum mapping guide: https://support.melodics.com/en/articles/11692696-fixing-e-drum-mapping-issues-in-melodics-advanced
- Melodics acoustic calibration: https://support.melodics.com/en/articles/8641253-guide-to-calibrating-acoustic-drums-with-melodics
- Melodics for acoustic drums (Modern Drummer): https://www.moderndrummer.com/article/melodics-now-for-acoustic-drums/
- Melodics vs Drumeo: https://melodics.com/info/lp-melodics-vs-drumeo
- Upbeat drum app comparison: https://upbeat.studio/compare/drum-learning-apps/
- Drumeo review: https://drumspy.com/reviews/drumeo-review/
- Jared Falk / Drumeo: https://drumeo.com/jared
- 180 Drums interview: https://moderndrummer.com/?p=59435
- Groove Scribe: https://www.mikeslessons.com/groove ; source https://github.com/montulli/GrooveScribe
- Score Drummer: https://scoredrummer.com/
- Beat Studio: https://beatstudio.io/
- EarDrum: https://ear-drum.app/
- Clone Hero MIDI drums: https://wiki.clonehero.net/books/guitars-drums-controllers/page/midi-drums
- Rock Band 4 e-kits: https://www.epicgames.com/help/rock-band-c-202300000002447/setup-c-202300000002452/rock-band-4-a202300000083413
- Fortnite Festival Pro Drums: https://www.epicgames.com/help/fortnite-festival-c-202300000001635/technical-support-c-202300000001717/fortnite-festival-pro-drums-a202300000084490
- Yousician instruments: https://yousician.com/lp/all-instruments

**MIDI, kits, browser**
- Roland TD-17 default MIDI note map: https://support.roland.com/hc/en-us/articles/360005173411-TD-17-Default-MIDI-Note-Map
- Roland TD-50X MIDI implementation: https://static.roland.com/assets/media/pdf/TD-50X_MIDI_Imple_eng02_W.pdf
- CC4 scaling discussion: https://forums.steinberg.net/t/need-some-assistance-setting-cc4-scaling/660434
- Alesis hi-hat open/closed note: https://support.alesis.com/support/solutions/articles/69000851410-alesis-drums-why-does-the-hi-hat-send-the-same-midi-note-open-closed-
- Alesis Crimson II hi-hat mapping: https://support.alesis.com/support/solutions/articles/69000827353-alesis-crimson-ii-mapping-the-crimson-ii-hi-hat-in-logic-pro-x
- Yamaha DTX402 reference manual: https://es.yamaha.com/files/download/other_assets/8/1181128/dtx402k_432k_452k_en_rm_a0.pdf
- EFNOTE 3/5/7 user guide: https://fullcompass.com/common/files/86060-EFNOTE357UserGuide.pdf
- EFNOTE PRO reference guide: https://artesia-pro.com/wp-content/uploads/2023/08/EFNOTE_PRO_RG_en01.pdf
- Web MIDI support (caniuse): https://caniuse.com/midi
- WebKit Web MIDI bug: https://bugs.webkit.org/show_bug.cgi?id=107250
- Chrome high-resolution event timestamps: https://developer.chrome.com/blog/high-res-timestamps
- W3C Web MIDI timestamp discussion: https://lists.w3.org/Archives/Public/public-audio/2012AprJun/0539.html

**Timing research**
- Hi-hat timing and dynamics fluctuations: https://arxiv.org/pdf/1904.11752
- Timing and dynamics of the Rosanna shuffle: https://arxiv.org/pdf/2411.06892
- NIME 2015 (hand-drum onset capture): https://zenodo.org/records/1179112/files/nime2015_147.pdf
