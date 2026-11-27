# ToneTurn / The 7th Sense: holistic content and pedagogy audit (2026-11-27)

Scope: content and pedagogy across all courses. Measurement, adaptivity and learning organisation are covered by the second auditor. I note them only where they are glaring.

**Method.** All reading was read-only. I dumped the live catalogues by running the repo's own modules from the scratchpad:
- `catalog()` + `guitarCatalog()`: 174 technique families;
- `stepCatalogue()`: 3,050 path steps (1,786 tech, 840 topic, 205 game, 180 vocal, 39 lesson);
- `TOPIC_GEN`: 204 topics;
- `VOICE_FAMILIES`: 28 families.

I also read `standards.ts`, `heads.ts`, `songbook.ts`, `classicalPD.ts`, `courseSections.ts`, and the specs: REPERTOIRE, SPIRAL-PRACTICE v6, EAR-INTELLIGENCE v2, LICKS-TRANSCRIPTION, TEACHER-CLASS, MUSIC_AREAS_MAP, CURRICULUM_GAPS, BARRY-HARRIS-THEORY.

**Source tags:**
- [V] = verified in the repo this session.
- [B] = established literature or law I am confident of but did not re-check this session.
- [U] = my judgment or unverified.

Impact / effort are H/M/L.

---

## 1. Executive summary

**Strengths**

1. **The technique and harmony catalogue is world-class for jazz piano** [V]. There are 59 piano families with a few hundred levels. They cover:
   - classical technique: ABRSM-style scales and arpeggios, Hanon, Czerny-style work, double 3rds, polyrhythm;
   - jazz vocabulary: verified Harris 6th-diminished, the brothers, half-step rules, lines and dim colours; triad pairs, mediants, cadence library, reharm;
   - textures and styles: Siskind-style solo piano, stride, organ, Brazilian, montuno, gospel, soul-jazz, NOLA.

   No consumer app I know covers this range. [B]
2. **Guitar, bass and drums are serious, not afterthoughts** [V]:
   - Bass has 46 families, including upright arco, thumb position, tenor and treble clef, Nashville numbers, odd meter and the pocket.
   - Drums cover Chapin-style independence, all 40 PAS rudiments, Middle-Eastern rhythms, brushes and trading.
   - Guitar covers CAGED, drop-2/3, chord-melody arranging, guajeo, flamenco and fusion.
3. **Ear and theory breadth exceeds conservatory requirements** [V]. The 204 topics run from basics through:
   - harmonic, two-part and three-voice dictation;
   - figured bass, counterpoint, chorale Roman numerals;
   - neo-Riemannian theory, interval vectors, Messiaen modes, twelve-tone, Euclid rhythms;
   - production ear (EQ, space, pan, dynamics);
   - maqam, plus jazz-in-context ear (where-home, reharm-spot, grid dictation).
4. **The pedagogy is principled.** The app uses:
   - rubato-then-tempo;
   - all 12 keys;
   - a brief before each task;
   - timing cues;
   - a spiral key session built on four review rounds;
   - "only verified Harris theory".

   This is rarer in the market than any feature. [U]
5. **Theory sits close to the instrument.** By-ear families exist on every instrument (k-ear, g-ear, b-ear, d-ear). Repertoire items say "where it leads" (for example "this is the start of Autumn Leaves"). [V]

**Biggest gaps**

6. **No real jazz melody is served anywhere** [V].
   - `heads.ts` holds 5 app-written heads. The 5 public-domain heads (Indiana, Mean to Me, My Blue Heaven…) are marked `verify` and never served.
   - Standards exist only as chord charts (about 45 in `standards.ts`).
   - A jazz education that never makes the student learn a real melody, by ear and by memory, misses the core of the tradition (Berliner, *Thinking in Jazz*) [B].
   - There is also a policy conflict. `heads.ts` enforces "PD worldwide" (owner rule of 2026-11-14), but memory records "judge rights by US law" (2026-11-22). Under US law, compositions published in 1930 or earlier are PD as of 2026-01-01 [B]. That includes I Got Rhythm, Body and Soul, Embraceable You, What Is This Thing Called Love, Honeysuckle Rose, Ain't Misbehavin', Star Dust, Sweet Georgia Brown, Softly as in a Morning Sunrise and Lover Come Back to Me. **Owner decision needed.**
7. **The masters' recorded language is absent.**
   - All licks are app-written. Transcription phrases are generated from rules [V].
   - There is no listening curriculum and no guided transcription from records. This is the single most-cited learning mechanism in jazz [B: Berliner 1994; Green 2008].
8. **The real-music ensemble skill is missing** [V]. There is no content for:
   - accompanying a singer or soloist (`grep singer` in drills finds one file);
   - following someone else's rubato;
   - playing in the singer's key or transposing a lead sheet for them.
9. **The voice course measures only what is measurable** (pitch, time, agility, range) [V]. It has no families for:
   - registration (chest / mix / head, belt);
   - resonance and vowels;
   - diction;
   - lyric interpretation;
   - mic technique;
   - vocal-health guidance.

   It has no real lyrics either. The repertoire is the app's own songs.
10. **The pop on-ramp is thin** [V]:
    - pop keys has 6 levels (`k-pop`);
    - there is no chord-only pop / rock / Israeli song library, although chord charts are legal and the app already uses this pattern for jazz;
    - the songbook's beginner melodies are children's, folk and holiday tunes.
11. **Classical repertoire is token**: 9 piano pieces, no PD studies for guitar (Sor, Carcassi, Giuliani), bass (Simandl, Bach) or voice (Vaccai, Concone) [V]. The pre-1931 PD canon is large. It also contains the best bridges to jazz: Joplin rags lead to stride, and Debussy and Satie lead to Bill Evans-style harmony [B].
12. **Expression is taught as isolated mechanics** (one dynamic level, voicing the top note). There is no layer on style-appropriate phrasing and interpretation:
    - Baroque articulation, Classical phrasing, Romantic rubato;
    - jazz articulation such as ghosted notes and accented upbeats in lines;
    - shaping a solo's arc.
13. **The app does not teach how to practise.** It automates practice decisions very well but never teaches self-regulation: diagnosing an error, choosing a strategy, self-recording and evaluating. Expert-practice research shows this is what separates progress from mileage [B: Duke, Simmons & Cash 2009; McPherson & Zimmerman 2011].
14. **Composition, arranging and contrafacts are nearly absent.**
    - "Write and play your own solo chorus" and `g-cmarr` are the only creative-writing steps [V].
    - Writing a bebop line over a tune's changes (the contrafact tradition) and arranging for a trio are natural, Harris-compatible capstones [B].
15. **Breadth versus depth (glaring, for the other auditor).** 3,050 path steps and 827 ear-course steps risk breadth without consolidation. Many jazz families repeat the same ladder per instrument (k/g/b-phrase are identical 8-level lists). Real-tune transfer is weaker than vocabulary drilling.

---

## 2. Per area

### 2.1 Ear / theory

**What exists [V]**
- 204 topics, including the basics group, jazz ear (where-home, jazz-changes, reharm-spot, grid-dictation, bh-line-ear), production ear, maqam and post-tonal.
- Exam-prep mode and a Bagrut set.
- SPEC-EAR-INTELLIGENCE v2 (owner-approved today) already plans:
  - ear inside a band texture;
  - outer voices and then Roman numerals;
  - hear → sing → find → play;
  - songs by ear;
  - generated sight-singing;
  - per-instrument ear;
  - phrase and form;
  - timbre.

| Missing / thin | Proposal | Impact | Effort |
|---|---|---|---|
| Ear on **real recorded music**: all stimuli are synthesised [V] | A "listening lab". The player supplies their own audio (the My-song infra exists) or uses PD recordings (US: sound recordings published in 1925 or earlier are PD since 2026-01-01 under the MMA 100-year rule [B], so the earliest Armstrong Hot Five sides qualify). Tasks: form tracking, chorus counting, identifying the soloist's instrument, tapping changes | H | M |
| **Hearing a solo's harmony implications** (does the line outline ii–V or play over the I?) | Extend bh-line-ear and jazz-phrase so the player names the implied chord under a line | M | M |
| **Long-term pitch and tune memory** (melodies known by name) | A "tunes you know" bank of PD heads plus the app's own heads. Recall the first phrase and its starting degree from the title | M | L |
| **Melodic dictation of real jazz heads** (staff-dictation is generated) | Once real heads exist (§2.9), dictate 2-bar slices of them | H | L |
| **Harmonic rhythm in ballads and rubato** | Covered by the planned in-band "follow the progression" task; add rubato and ballad material | L | L |

Note: I fully endorse the ear spec's order. Item 1 (ear inside a band) is also the strongest transfer lever for every instrument course.

### 2.2 Piano / keys (incl. key practice and exercise practice)

**What exists [V]**
- 59 families: technique, harmony, comping, improv, by ear, reading, plus 7 styles.
- The key session with the 37-item spiral list.
- `k-classic`: 9 PD pieces.
- `k-gig`: intros, endings, ballad, two original tunes.

| Missing / thin | Proposal | Impact | Effort |
|---|---|---|---|
| **Accompanying a singer / soloist**: none | A `k-accomp-voice` family: <br>• intro in the singer's key (last 4 bars, I–vi–ii–V vamp); <br>• comp under a sung melody, leaving the melody's register free; <br>• fills only at phrase ends; <br>• follow rubato (the app's sung melody slows and speeds); <br>• transpose the chart on the spot (±2 semitones); <br>• endings with the singer's fermata. <br>Pairs naturally with the voice course (duet assignments). | H | M |
| **Tune learning by memory**: k-tune climbs roots → guide tones → shells → reharm, but the chart is always visible; "memory take" is item #30 at priority L in SPIRAL v6 [V] | A "Learn a tune" protocol per standard. Step 1: sing the melody, then play it. Step 2: roots. Step 3: guide tones. Step 4: melody plus shells. Step 5: **from memory**. Step 6: in 2 more keys. Step 7: solo on it. Raise the memory modifier from L to H for tunes. Memory work is a core jazz expectation, and retrieval practice strengthens retention [B: Roediger & Karpicke 2006]. | H | M |
| **Pop / singer-songwriter keys**: 6 levels | Expand `k-pop` to about 15 levels: <br>• inversions for smooth pop changes; <br>• slash chords and pedal bass; <br>• add9 / sus colours; <br>• piano-ballad arpeggiation; <br>• "4 chords in every key"; <br>• Nashville numbers on keys; <br>• playing from a chord chart against "Listen to the original". | H | M |
| **Style-period interpretation**: k-classic is 9 pieces with no interpretation layer | Add 20–30 pre-1931 PD pieces (see §2.9), each with a one-screen style brief (Baroque: detached 8ths, terraced dynamics; Classical: slurred pairs, Alberti balance; Romantic: rubato, pedal). Grade the measurable proxies: articulation length, dynamics contour. | M | M |
| **Ragtime → stride bridge** | 3–4 Joplin rags (PD) as the historical door into `accomp` and `k-nola`. Joplin is already in `pdTunes.ts` as a melody only [V]. | M | M |
| **Impressionism → modern jazz harmony** | Satie Gymnopédie 1 and Debussy (Rêverie, *The Girl with the Flaxen Hair*, published 1910) as entries to planing, quartal and constant structure (`k-reharm` and the `planing` topic) | M | M |
| **Solo-piano ballad interpretation** (rubato, voicing the melody inside chords) | Covered in parts (k-tex, k-gig). Add a "ballad performance" capstone: one chorus rubato, one in tempo, with melody-voice velocity as the measurable proxy. | M | L |
| **Left-hand independence in jazz lines** | Strong already (k-lh, k-indep) | — | — |

### 2.3 Guitar

**What exists [V]**
- 48 families: technique, CAGED, drop-2/3, Harris, chord-melody plus arranging, Brazil, guajeo, soul, flamenco, fusion, reading.

| Missing / thin | Proposal | Impact | Effort |
|---|---|---|---|
| **Classical / fingerstyle repertoire**: only patterns ("Giuliani-style"); Carcassi 0 hits | A PD study ladder: Sor Op. 60 and Op. 31 selections, Carcassi Op. 60, Giuliani Op. 50 and Op. 1 arpeggios, Tárrega preludes. Each with chunks plus a tempo ladder (reuse the piece coach). | M | M |
| **Freddie Green four-to-the-bar / big-band rhythm guitar** as its own family (it appears inside g-jazz only) | 4 levels: 3-note shells on strings 6-4-3, the "lift" on 2 and 4, chord-a-beat through the changes, with a walking bass | M | L |
| **Accompanying a singer** (bossa voice and guitar is the archetype) | A g-version of the k-accomp-voice family, built on the existing batida | H | M |
| **Pop / acoustic songwriter guitar**: capo, open-string colours, partial capo, alternate tunings (DADGAD) | 5 levels plus a chord-only pop chart library (§2.9) | M | M |
| **Chord / cadence builder, chord recogniser** | Already on the guitar roadmap (memory) | M | M |

### 2.4 Bass

**What exists [V]**
- 46 families. Electric and upright (arco, pizz, thumb position, three clefs), walking (21 levels), styles (17), Harris, slap, odd meter, Nashville.

| Missing / thin | Proposal | Impact | Effort |
|---|---|---|---|
| **Learning real bass lines by ear** (Motown, funk, walking from records); b-ear is generated | Listening-lab tasks on the player's own audio: loop, slow down, transcribe the bass, play along | H | M |
| **PD upright repertoire**: Simandl is mentioned, but no Bach cello-suite movements (PD) | 4–6 arco pieces (Bach Suite 1 Prelude, Minuet; Simandl etudes) | L | M |
| **Bass in a duo** (bass plus singer, bass plus horn: the line must carry the harmony alone) | 3 levels in b-jform: "no comping instrument", with chord-tone-density feedback | M | L |

Bass is the most complete course relative to its market. [U]

### 2.5 Voice

**What exists [V]**
- 28 families: breath, pitch, range, time (14 levels), ear, dynamics, scales, sight-singing, vibrato, agility, harmony, inflections, standards, scat (two families), Barry Harris lines, pop / theatre.
- All repertoire is the app's own songs ("Morning Line", "Blue Window"…).

| Missing / thin | Proposal | Impact | Effort |
|---|---|---|---|
| **Registration**: chest / mix / head, belt; passaggio (2 hits in code, no family) | A guided family with SOVT warm-ups (straw, lip trill). Use measurable proxies: pitch steadiness across the passaggio, register-break detection via spectral slope or level jump. Name-only coaching where it cannot be measured. Ground it in a recognised framework (Estill / CVT / SLS-style; check terminology with a voice teacher). [B] | H | M |
| **Vowels, resonance, diction** | A vowel-match family: hold a pitch while changing the vowel without pitch or level change, which is measurable. Add consonant timing on the beat for jazz phrasing. | M | M |
| **Lyrics and interpretation** (text stress, phrase breath placement, storytelling): absent | Use PD lyrics (pre-1931 songs, under the owner's legal choice; see §2.9). <br>• Mark breaths, then sing with the planned breath. <br>• Phrase-end release timing. <br>• "Back-phrasing": deliver the line late against the beat, measured by onset offset (v-time already measures loose timing). | H | M |
| **Mic technique and amplified singing** | One brief lesson plus a proximity / dynamics exercise using level variance | L | L |
| **Vocal health** (warm-up and cool-down, fatigue, hydration, when to stop) | A short mandatory card plus a session-length guard for long sung sessions. Responsible pedagogy for adult learners. [B] | M | L |
| **Real standards with lyrics** | Depends on the legal decision; see §2.9 | H | M |
| **Singer leading a band** (count-off, tempo, key, cueing the ending) | 3 levels: count-off accuracy vs the requested tempo, calling the key, cueing the tag | M | L |

### 2.6 Drums

**What exists [V]**
- 30 families: rudiments (all PAS, Wilcoxon-style "Lesson 25"), Chapin-style coordination, styles (rock, funk, shuffle, jazz, Latin, Middle-Eastern, prog), reading, form, trading, brushes.

| Missing / thin | Proposal | Impact | Effort |
|---|---|---|---|
| **Kit sound and balance** (cymbal vs snare balance, feathered kick level, ghost-to-accent ratio across the kit) | The e-kit gives velocity per pad [memory: owner tests on an e-kit]. A "balance" family: ride above snare comping, kick under the bass, measured by per-pad velocity ratios | M | L |
| **Supporting a soloist**: comping that answers phrases, building intensity per chorus | 3 levels with the app soloing (app-generated lines from the lick bank). Score density following: sparser under sparse phrases. | M | M |
| **Melodic drum soloing** (Max Roach-style motif on the toms) | Reuse the improvPhrasing motif analysis on drum voices: state a motif, develop it, return | M | L |
| **Drum tuning / sound** | Brief only (not measurable on an e-kit) | L | L |

### 2.7 Games

**What exists [V]**
- About 20 bonus games: jazz-heavy (Border Control, Comp Caller, Changes Crossword, Which Brother, Voicing Spy, Name That Standard), plus Euclid, Transcription Race, Polyrhythm Lock and Riff Echo.
- Lick games per course, Truth or Bluff, duels, rooms, tournaments.

| Missing / thin | Proposal | Impact | Effort |
|---|---|---|---|
| **Beginner Ear units 1–2 have no fitting game** (memory) | "Contour Draw": hear a 4–6 note tune and trace its shape on a pitch-time strip. It trains contour, the first melodic skill in Kodály / Gordon sequencing [B], and keeps a mature look. | M | L |
| **Few games for voice and drums** | A pitch-steered "line" game (the CURRICULUM_GAPS "voice flight" idea, done in a serious visual style). For drums: a "Groove Match" (copy a 2-bar groove; scored by limb). | M | M |
| **No game uses real tunes** (Name That Standard uses charts) | After real heads exist: "First-phrase recall" (title → play the first 4 bars) | M | L |

### 2.8 Learning path and unit design

**What exists [V]**
- 10 themes (home, steps, colour, pulse, chords, memory, harmony, groove, read, sound) in a spiral.
- Sections beginner → advanced, course and unit openers, `MAX_NEW_CONCEPTS = 1`, prereq maps, style-focus ordering.

| Issue | Proposal | Impact | Effort |
|---|---|---|---|
| **Unit endings are drills, not music.** Repertoire is reachable but not built into the path (SPEC-REPERTOIRE "not built: path steps → repertoire") [V] | End every unit with a **musical capstone**: a tune slice, a duet or a performance take that uses the unit's skills. The hooks (`repItem`, `openRepWay`) exist. | H | L |
| **The same jazz ladder is cloned per instrument** (k/g/b-phrase identical; bebop, ctx, solo near-identical) | Keep the shared spine, but give each instrument its idiomatic angle: <br>• bass: lines that imply harmony with no chords above; <br>• guitar: phrasing with slides and articulation; <br>• piano: two-hand lines and comping while soloing (partly there). | M | M |
| **Theory → application gaps in the ear course** (e.g. negative harmony, twelve-tone with no playing outlet) | For every theory topic, tag at least one "use it" step on the instrument or in composition (§2.10). Advanced topics without an outlet become trivia. [U] | M | L |

### 2.9 Repertoire / real music and songs

**What exists [V]**
- About 45 chord-only standards in tiers; 5 original heads plus 5 PD heads that are never served; 49 songbook tunes (mostly children's, folk and holiday, plus 7 originals).
- 9 PD piano pieces, about 34 own voice songs, the My-song upload, "Listen to the original" links.

This is the area with the largest gap between ambition ("jazz-first, #1 pedagogy") and content.

| Missing / thin | Proposal | Impact | Effort |
|---|---|---|---|
| **No real standard melodies** | **Owner decision first:** align `heads.ts` (PD worldwide) with the later US-law rule. <br>If US law: transcribe from period sheet music (LoC, IMSLP; the `verify` workflow already exists) about 20 heads published in 1930 or earlier. Examples, all to be checked [B]: Indiana, Sweet Georgia Brown, Tea for Two, Honeysuckle Rose, Ain't Misbehavin', What Is This Thing Called Love, Softly as in a Morning Sunrise, Lover Come Back to Me, Star Dust, Body and Soul, I Got Rhythm, Embraceable You, But Not for Me, Georgia on My Mind, St. Louis Blues, Basin Street Blues, Bye Bye Blackbird, Blue Skies, Someone to Watch Over Me, 'S Wonderful. <br>Owner decision 2026-11-15 applies: verify each note against period sheets, never a modern fake book. | **H** | M |
| **Too few chord charts for a working jazz musician** (about 45, including exercises) | Grow to about 120 charts (chords are not protected [B]). Add Monk, Parker blues and rhythm tunes, Shorter, ballads, and bossa beyond Ipanema, tiered by harmonic concept. Pair the contrafact tunes (Hot House → What Is This Thing; Donna Lee → Indiana; Anthropology → Rhythm) so the PD head and the bebop changes teach each other. | H | M |
| **No pop / rock / Israeli chord-chart on-ramp** | A chord-only library: title, key, changes, form, "listen to the original" link, no lyrics or melody. This is the legal pattern already used for standards [memory: my-songs-legal]. Bridge each to a jazz concept ("this I–vi–IV–V is the doo-wop turnaround → the jazz I–vi–ii–V"). | H | M |
| **PD classical, folk and method repertoire per instrument** | Piano: Burgmüller Op. 100, Czerny Op. 599 / 849 selections, the Anna Magdalena notebook, Schumann Op. 68, Joplin, Satie, early Debussy. Guitar: Sor / Carcassi / Giuliani. Voice: Vaccai, Concone, Italian arias (1894 Schirmer anthology). Bass: Simandl, Bach. All published before 1931. | M | M |
| **Questions for the owner** | (a) Do the "The 7th Sense" original melodies (5 heads, 7 songbook tunes, about 34 voice songs) fall under the 2026-11-21 "no Claude-composed music" rule? It was recorded for demos and an AI band, but the scope is unclear. (b) Which legal frame applies to melodies: worldwide or US? | — | — |

### 2.10 Improvisation and creativity

**What exists [V]**
- Rule-card soloing with debriefs (`improvRules`, `improvCoach`).
- Phrasing and motif analysis (`improvPhrasing`: phrase arcs, motif returns, vary, trade).
- k-impro drone and space drills, call and response, licks, the phrase studio (Encore).

| Missing / thin | Proposal | Impact | Effort |
|---|---|---|---|
| **Motivic development is in the engine but low in the path** (SPIRAL #31, priority L) | Promote it: a "story" ladder. <br>1. One motif per chorus. <br>2. Sequence it. <br>3. Displace it. <br>4. Answer it. <br>5. Build an arc (density and register rise to bar 25 of 32). <br>The analysis already exists. | H | L |
| **Paraphrasing the melody** as the first improvisation (k-tune "embellish" exists for piano only) | The ladder for all instruments: embellish the head, then depart and return. This is a standard jazz-pedagogy entry point [B: Coker; Berliner]. Needs real heads (§2.9). | H | L |
| **Sing what you play** | Instrument-course step: sing a 2-bar phrase, then play it (the planned hear → sing → play protocol, applied to the player's own ideas) | M | L |
| **Contrafact writing / composition** | Capstone: write a head over a chart's changes (a PD tune's changes or the blues), then play it. Grade it with the existing lick checker (chord tones on beats, rule compliance) and record it into "My recordings". Also write a 12-bar blues head and set a 4-bar phrase to words (voice). | H | M |
| **Free / non-idiomatic improvisation** (texture, register, dynamics games; useful for the prog positioning) | 3 levels: improvise only with dynamics and register, a call-and-response of textures, a rhythm-only solo. Graded by variety metrics. | L | L |
| **Arranging** (trio arrangement: intro, head, solos, out-head, ending; 4-way for horns) | Guitar has `g-cmarr` [V]. Add `k-arrange` and a "chart road map" builder used by keys, bass and drums together. | M | M |

### 2.11 Reading / notation

**What exists [V]**
- k-read (15 levels), g-reading (8), b-read / posread / up-read (25), d-read / notation (16), v-sight (9), sight-read and sight-tap topics, staff dictation, chord-read (7), Nashville.

| Missing / thin | Proposal | Impact | Effort |
|---|---|---|---|
| **Jazz-specific reading**: interpreting written 8ths as swing, jazz articulation marks (^, -, ghosted notes), kicks and set-ups in big-band parts | 4 levels across instruments: the same written line played straight vs swung, with articulation graded by length and velocity proxies | M | M |
| **Lead-sheet fluency at sight** (melody and changes, first read, with a road map: D.S., coda, 1st and 2nd endings) | Partly in k-read 14 and d-song "road map". Make it a shared "gig sight-read" capstone. | M | L |
| **Transposing instruments** (reading a B♭ or E♭ horn part to play it in concert pitch) | One theory plus playing ladder (transposition topics exist on paper only) | L | L |

### 2.12 Rhythm / time

**Strength** [V]:
- click on 2 and 4, gap click, the "and" click;
- metric modulation, hemiola, polyrhythm on all instruments;
- the pocket (behind / on / ahead) on bass and drums;
- swing-ratio dial, Euclid rhythms, clave and Middle-Eastern cycles.

| Missing / thin | Proposal | Impact | Effort |
|---|---|---|---|
| **Swing ratio by tempo** (straighter at fast tempos, wider at medium; measured studies show the ratio changes with tempo [B: Friberg & Sundström 2002]) | Feedback that judges swing ratio against a tempo-dependent target band, not a fixed 2:1 | M | L |
| **Time-feel placement for pianists and guitarists** (behind or ahead of the beat on purpose); bass has it (b-swing) | Copy b-swing levels 2–3 to keys and guitar comping | M | L |
| **Konnakol / spoken rhythm for prog** | Optional; the voice "ta" exists. Low priority. | L | L |

### 2.13 Harmony

**Strength** [V]:
- functional, modal, chromatic and post-tonal harmony;
- verified Harris material;
- reharm (tritone, backdoor, Coltrane), mediants, negative harmony, polychords, planing, a cadence library in shells / rootless / drop-2 / walking.

| Missing / thin | Proposal | Impact | Effort |
|---|---|---|---|
| **Harmony in tunes as a whole**: key centres per tune, analysing a standard's form and "where the ii–Vs go" (chart-analysis has 3 levels) | Per-standard "harmonic map" pages: key areas, ii–V brackets, the turnaround. Needed to memorise tunes (§2.2). | H | L |
| **Post-bop / Shorter / modal-composition harmony** (non-functional slash chords, pedal-based forms); modern-color has 3 levels | Extend with 3 tune-based levels once charts exist (chords are legal) | L | L |

### 2.14 Style coverage

**What exists [V]:** jazz (deep), Brazilian, Afro-Cuban, soul-jazz / gospel / funk, NOLA, rock / pop basics, reggae, metal, flamenco, Middle-Eastern / Mizrahi, maqam, prog / fusion, classical technique.

| Missing / thin | Proposal | Impact | Effort |
|---|---|---|---|
| Pop / singer-songwriter / R&B (as the on-ramp) | §2.2, §2.3, §2.9 | H | M |
| Jewish / Israeli idioms for a Hebrew-first market (Freygish / Ahava Rabbah appears in `g-prog` modes; klezmer ornaments, the doina, Israeli folk harmony) | A small "Mediterranean touch" extension is already planned last (SPEC-JAZZ-NEIGHBOURS §6). Use PD klezmer tunes. | M | M |
| Jazz sub-eras: swing-era piano and guitar exist; **ECM / modern-modal ballads, free jazz** missing | Low; §2.10 free-improv levels cover the entry | L | L |
| Country / Americana, film / ambient | Out of positioning. Skip. | L | — |

### 2.15 Teacher / class pedagogy

**What exists [V]:** SPEC-TEACHER-CLASS v2, studio-first, a lesson object. Its own spec names the biggest gap: no sound is kept from submissions. 1a shipped in 0.145.0.

| Missing / thin | Proposal | Impact | Effort |
|---|---|---|---|
| **Assessing what the app cannot measure** (tone, phrasing, interpretation, registration) | Teacher rubrics: 4-point scales per quality, tied to the saved take; the student self-rates first, then sees the teacher's rating. Calibrating self-assessment against an expert is a strong self-regulation lever [B: McPherson & Zimmerman]. | H | M |
| **Teacher as the model** (the teacher records the phrase, the student copies; Encore supports teacher capture [V]) | Make "teacher model → student imitation → compare" a first-class assignment type on every instrument | H | L |
| **Ensemble assignments** (a duo or trio inside a studio: one student records the bass, another plays over it) | Asynchronous layering. The latency-safe way to "play with others". | M | M |
| **Lesson-plan templates for jazz teaching** (learn-a-tune week, transcription week) | Templates built from §2.2 and §3 protocols | M | L |

---

## 3. Cross-cutting musical aspects

| Aspect | Covered? | Evidence [V] / gap | Proposal (impact/effort) |
|---|---|---|---|
| Sound / tone production, touch | **Partly** | Piano control, velocity calibration, voicing, touch angle in the spiral; bass plucking zones; drums dynamics. No voice resonance work; no guitar tone (pick attack, vibrato quality beyond pitch). | Voice registration family (H/M); per-pad balance on drums (M/L) |
| Dynamics and phrasing | **Mechanics only** | Dynamic levels, crescendo, voicing the top note, d-song dynamics arc | Style-period interpretation layer; solo-arc ladder (H/M) |
| Listening to recordings, transcription | **Weak** | "Listen to the original" links; generated transcription; the My-song analysis | Listening lab plus guided transcription from own audio and PD recordings, with "listen for" prompts per unit (H/M) |
| Playing with others / band feel | **Partly** | Backing band, trading 4s, pocket, "with the band" levels | Accompanying a singer; async duo / trio layering; drums supporting a soloist (H/M) |
| Memorisation | **Weak** | The memory-take modifier is priority L; audiation topics in ear | Learn-a-tune protocol with memory steps (H/M) |
| Performance / recording yourself | **Partly** | Then-and-now takes; My recordings (Encore); whole-tune one-take levels (k-gig) | A "performance take" ritual: announce, one take, no restarts, listen back, self-rate, compare with the teacher. Performance simulation reduces anxiety and builds the skill [B: Williamon et al. 2014] (M/L) |
| Teaching how to practise | **Missing** | The app decides everything; family briefs mention practice tips only | A 6-card "How to practise" micro-course: <br>• find the exact error spot; <br>• slow and correct; <br>• vary the tempo; <br>• chunk; <br>• interleave; <br>• record and evaluate. <br>Then make the coach occasionally ask the player to choose the strategy [B: Duke et al. 2009; Carter & Grahn 2016] (H/L) |
| Motivation through real music | **Weak** | Repertoire tiers exist, but the melodies are the app's own or children's tunes | Real PD heads, pop chord charts, unit capstones (H/M) |
| Theory → application links | **Good** | Repertoire "where it leads"; by-ear families on every instrument | A "use it" tag on every advanced theory topic (M/L) |
| Aural skills tied to the instrument | **Good / planned** | k/g/b/d-ear, play-back topics; the ear spec's hear → sing → find → play | Build as specced |
| Composition / arranging | **Missing** | Own solo chorus, g-cmarr | Contrafact and blues-head writing; trio arranging (H/M) |
| Lead-sheet skills | **Good** | k-tune, g-tune, b-tune, chord-read, Nashville | Harmonic map pages; memory (H/L) |
| Comping | **Strong** | Voicings, k-comp, cadence library, Brazil, montuno, gospel | Comping behind a soloist that *responds* (M/M) |
| Accompanying singers | **Missing** | 0 content | New family on keys and guitar (H/M) |
| Ensemble roles (bass = harmony and time, drums = form, comping = space) | **Partly** | Bass pocket, drum form, k-tex "thin and full under a soloist" | A short cross-course "roles" unit with role-swap listening (M/L) |

---

## 4. Pedagogical structure

**Sequencing and prerequisites**
- This is a strength. There are explicit prereq maps (`STEP_PREREQ`, `FLOW_PREREQ`, `LADDER_WAITS`), one new concept per step, rubato-then-tempo, and per-item prereqs in SPIRAL v6 [V].
- Risk: the prereq graph is technical (skill → skill) and rarely musical (skill → tune). Students can climb deep vocabulary (for example `k-ctx` brothers, `k-mediant`) without ever having learned one real tune by memory [U].
- Proposal (H/L): a **"tune gate"** at each section boundary. Advancing past "developing" on any instrument course suggests that one real tune be learned to the memory step. It is a suggestion, not a lock: the owner's "no locks" rule applies.

**Spiral and review**
- The themed spiral units and the key-session rotation are well designed [V].
- The missing spiral is the repertoire spiral: returning to the *same tune* with new skills (head → guide tones → reharm → solo → arrangement). k-tune does this inside one family. Make it the organising spine of the jazz top of every course [B: Bruner's spiral; the standard jazz practice of "living with a tune"].

**Transfer to real music**
- This is the weakest link. Transfer research consistently favours practising in the target context [B: Lehmann, Sloboda & Woody 2007].
- The ear spec's in-band item, real heads, pop charts and unit capstones together close most of the gap.

**Beginner on-ramp**
- The ear basics, k-first, g-first, b-first and d-first steps are solid [V].
- Adult beginners are offered children's songs (correctly capped at 2 steps [V]) and app-written tunes. Pop chord charts with original-recording links are the motivating on-ramp the positioning calls for ("pop as on-ramp").

**Adult learners**
- Adults need four things [B: Roulston et al. on adult music learning; Lehmann et al.]:
  1. relevance: real songs;
  2. a sense of autonomy: the app's no-locks style-focus is good;
  3. respect for limited time: time-first sessions exist [memory];
  4. explanations of *why*: the quick lessons exist.
- Missing: an explicit "your goal tune" anchor at onboarding. Example: "I want to play Autumn Leaves with a singer by summer" back-plans the path.

**Plateaus**
- Content-side remedies for plateaus:
  - change the angle (spiral v6 does this);
  - change the musical context (play the stuck item in a tune);
  - feel variation (planned);
  - listening to a model.
- The last two are content gaps (models and recordings).

**Feedback quality**
- Measured feedback is precise for pitch, time and rules [V].
- Feedback on expressive quality is absent beyond velocity proxies. Studies show expressive skill improves most with model listening plus specific verbal or visual feedback on expressive deviation [B: Juslin et al., "cognitive feedback"; Woody 2000].
- Propose (M/M): visual expressive-contour feedback (the player's velocity and timing curve over the model's curve) for ballads, classical pieces and voice phrases.

**Gaps and topic hopping**
- The curriculum-flow audit is done for Ear beginners only [memory].
- From the dumped catalogue [V]:
  - piano `voicings` jumps from blues shells (6) to quartal (7) to two-hand / drop-2 (9) to Coltrane (12) within one family;
  - `k-reharm` mixes ballad voicings, modal comping, solo-piano walking bass and planing in consecutive levels.
- These families read as **topic bins**, not ladders. Recommend that the flow audit (curriculum-flow rule) cover `voicings`, `k-reharm`, `jazz`, `accomp` and `g-scales` next. Each should be split into 2–3 coherent ladders, or explicit cross-family prereqs should replace in-family order (M/M).

---

## 5. Prioritised top-15 improvements

| # | Improvement | Why | Impact | Effort |
|---|---|---|---|---|
| 1 | **Decide the melody legal frame (worldwide vs US), then serve about 20 verified real PD jazz heads** | No real melody is served today. This is the core of jazz learning, and it unlocks #2, #5, #8 and #11. | H | M |
| 2 | **"Learn a tune" protocol with memory steps** (sing → play → roots → guide tones → melody plus shells → from memory → 2 more keys → solo), plus per-tune harmonic map pages | The repertoire spiral and the memorisation gap | H | M |
| 3 | **Unit capstones in the path**: every unit ends with music (a tune slice, duet or performance take), using the existing `repItem` hooks | Transfer; motivation | H | L |
| 4 | **Accompanying a singer / soloist** family on keys and guitar, paired with voice-course duet assignments | A core professional skill, 0 content today | H | M |
| 5 | **Listening lab and guided transcription** (own audio and PD recordings: loop, slow, "listen for" prompts, compare) | The masters' language; aural tradition | H | M |
| 6 | **Pop / rock / Israeli chord-chart on-ramp** (chords only plus original-recording link), bridged to jazz concepts; expand `k-pop` to about 15 levels | The positioning's on-ramp is thin | H | M |
| 7 | **Voice: registration / resonance / vowels plus lyrics and interpretation**, with PD lyrics and a vocal-health card | Voice pedagogy beyond pitch and time | H | M |
| 8 | **Improvisation story ladder**: melody paraphrase → motif → sequence → displacement → arc (the engine exists; promote it) | Musical solos, not rule compliance | H | L |
| 9 | **"How to practise" micro-course** plus occasional strategy choice by the player; a self-rating step before feedback | Self-regulation; long-term independence | H | L |
| 10 | **Grow the chord charts to about 120 standards**, with contrafact pairs (PD head ↔ bebop changes) | A working repertoire | H | M |
| 11 | **Contrafact and blues-head writing capstone** (graded by the lick checker), plus trio arranging | Composition is missing; fits Harris and bebop practice | H | M |
| 12 | **Teacher rubrics and teacher-model assignments** for unmeasurable qualities (tone, phrasing, interpretation) | Closes the measurement blind spot pedagogically | H | M |
| 13 | **PD repertoire per instrument**: Joplin, Satie and early Debussy as jazz bridges; Burgmüller and Czerny; Sor and Carcassi; Vaccai and Concone; Simandl and Bach | Classical common ground; historical bridges | M | M |
| 14 | **Expressive-contour feedback and a style-interpretation layer** (Baroque / Classical / Romantic / jazz articulation; swing ratio by tempo) | Expression is taught only as isolated mechanics | M | M |
| 15 | **Flow audit of the "bin" families** (`voicings`, `k-reharm`, `jazz`, `accomp`, `g-scales`) and idiomatic de-cloning of the k/g/b jazz ladders | Topic hopping; instrument idiom | M | M |

**Owner questions raised by this audit (product / legal only):**
1. Legal frame for melodies and lyrics: worldwide PD (heads.ts, 2026-11-14) or US law (2026-11-22)?
2. Do app-written melodies ("The 7th Sense" heads, songbook originals, voice songs) fall under the "no Claude-composed music" rule?
3. May the listening lab link or embed commercial recordings (YouTube embed is noted as legal in memory) as listening assignments, with the transcription done on the player's own copy?

Respected throughout: only verified Harris material (nothing new proposed beyond docs/BARRY-HARRIS-THEORY.md); degree numbers or letters, no movable do; no Claude-composed backing or AI band (proposals use PD sources, chord-only charts, teacher or player recordings); US-law caution on recordings; mature, serious UI tone.
