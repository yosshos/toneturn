# Round 3 independent pedagogy / content review: SPEC-HOLISTIC-2 v3 + SPEC-SPIRAL-PRACTICE v6

NOT CLEAN

None of the issues below blocks step 1 (cold measurement, staircase, areaTier, SPRT). Step 1 can start. All six issues are majors in the content/pedagogy part (steps 2, 5 and 7). Each needs a short binding amendment before its step is built.

## Substantive issues

### 1. Contour Draw: "ships in step 2" contradicts "uses heads the learner hasn't learned" (§18.10, §17.5)
- **Problem:** §18.10 says Contour Draw takes random, transposed slices of unlearned heads. It also says Contour Draw "ships early, in step 2, because it needs nothing else". But no PD head is served until step 5: owner verification, the 1A list and the region pool all come first. heads.ts serves 0 PD melodies today. That leaves the 5 app-written heads, a pool small enough to memorise, which breaks the rule §18.10 sets in the same breath.
- **Why it matters:** the one item meant to close the beginner-game gap early has no content source that obeys the spec's own rules.
- **Fix:** in step 2, Contour Draw uses generated 4–6-note contours from the existing Ear melody generator. That is random stimulus generation, which the Ear course already does, not composition. Head slices from the learner's region pool join once step 5 lands.
- **Severity:** major.

### 2. Learn-a-tune has no band variants or prerequisites (§8.2, §17.4 RP #4)
- **Problem:** "One protocol per head, in all courses" fixes these steps: roots → guide tones → melody + shells → memory → 2 keys → solo. Meanwhile §18.9 puts beginner heads first (Bill Bailey, When the Saints…) and §18.9 / §17.3 make step 7 the goal-completion criterion. A band-1 pianist or guitarist doesn't have 7th chords, guide tones or shells (SP §14 gates guide tones on "7ths known" and shells on item 6). The protocol never says which family each step's prerequisites come from, or what a beginner plays at that step.
- **Why it matters:** the flagship real-music feature, and the goal tune shown at onboarding, can't be finished by the users it now targets first. It also breaks the curriculum-flow rule (no gaps) and "Prereq acquired" (SP §14).
- **Fix:** add a per-band step table:
  - band 1: melody → roots → melody + LH roots → triads → memory;
  - band 2+: guide tones and shells, gated on the k-sharm 7ths and shell families (guitar: g-shells; bass: walking).
  - Steps whose prerequisite isn't acquired are skipped, never locked (as SP A10 does for forms).
  - Goal completion = the memory step of the learner's band variant.
- **Severity:** major.

### 3. Several features depend on human recordings that have no source for self-learners (§8.4 L4, §17.4, §18.10, §14, §17.5)
- **Problem:** after the amendments, these need human takes and allow no algorithmic substitute (no-claude-composed-music):
  - accompaniment L4 rubato (teacher, calibration account, or a voice student via §12.3);
  - comp dynamics against "the singer's phrase envelope";
  - expression model curves (§14, "human takes only");
  - English-diction and per-language diction models;
  - drum "supporting a soloist" (PD or teacher lines only).

  A self-learner has no teacher and no studio partner. The calibration accounts are one owner on piano.
- **There is also a sub-conflict:** §17.5 excludes Claude-composed soloist lines, while §18.9 keeps the app-written lick bank as region-safe filler. Under H4 (still open), the lick bank either counts as Claude-composed or it doesn't, so the drum item is either fine or has no content.
- **Why it matters:** these items are specced as levels on the path, but for most users they would be empty. That leaves dead steps and gaps in the "everything connects" checklist.
- **Fix:** add a "human model bank" production task to step 5 and step 7 as an owner task:
  - recordings of 1A heads by real singers and players (several rubato and dynamic renditions), with performer releases;
  - region rules applied to the composition.
  - Until a bank exists, each dependent level is labelled "teacher or recording needed". The level is skippable, never a gap in the bar to next, and the level test doesn't sample it.
  - State the H4 dependency explicitly for the soloist lines.
- **Severity:** major.

### 4. The region-pool guard leaves out content types, and the region signal is undefined (§18.9, §11.2, §17.5, §18.10)
- **Problem:** the guard test lists these features: learn-a-tune, capstones, tune of the week, head dictation, level-test tune section, contrafacts, goals. It does not cover:
  - §11.2 text and interpretation, which uses "US-PD lyrics (§8.1)", i.e. 1B lyrics such as Razaf's or Ira Gershwin's;
  - the First-phrase recall game;
  - the Ear "tunes you know" bank;
  - EAR v2 songs-by-ear and sight-singing "from served heads";
  - shipped ≤ 1925 recordings whose composition is 1B (King Oliver/Armstrong sides);
  - the "PD folk songs per language" for the 7 voice languages. Many songs thought to be folk have authors who died after 1955. STANDARDS_LEGAL already flags the Hava Nagila lyric credit.

  Also, nothing says how the region is determined: account country, store country or IP.
- **Why it matters:** a features list invites leaks as features are added. Serving 1B lyrics or melodies in the EU or Israel is the main legal exposure the tiering exists to prevent.
- **Fix:**
  - Make the gate a property of the content, not of a feature: every served melody, lyric and recording carries a tier, and a single `servable(content, region)` call is the only path to playback or display. The guard test walks every content consumer.
  - "Folk/trad" entries need the same print-year and author check as heads.
  - Define the region signal: the stricter of account country and store/IP country; unknown → 1A only.
- **Severity:** major (legal).

### 5. Memorisable items in Ear evidence (§17.5 Ear, §18.10)
- **Problem:** the 1A pool is about 20 tunes, and it shrinks as learners learn them under "heads the learner hasn't learned". Transposition does not stop memorisation for a trained ear: relative-pitch recognition is exactly what lets a learner recognise the tune. "Tunes you know" (recall the starting degree from the title) is pure recall, answerable without hearing anything. If either feeds the Ear course skills, the Ear level rises on memory, not on ear.
- **Why it matters:** it breaks the owner's "no memorizable items" rule and the validity of the Ear level (SPEC-EAR-INTELLIGENCE governs).
- **Fix:**
  - Head-slice dictation and "tunes you know" write to a `repertoire-memory` skill. That skill feeds the repertoire spiral, not the Ear course skills.
  - Head dictation is capped as a share of dictation trials, with generated items as the measured core.
  - When a learner's unlearned-head pool is below N, the head-slice items step aside.
  - "Tunes you know" becomes audiation: sing or play the first phrase, graded by pitch, rather than naming a degree.
- **Severity:** major.

### 6. Physical approach, tension and injury prevention for instrumentalists is absent (§11.2, §18.8, SP §15.4, §15.7)
- **Problem:** voice gets a mandatory health card and a 20-minute guard. Instruments get nothing, while the system pushes speed:
  - bursts up to 1.25 × tempo;
  - "never the same take twice at one tempo, rise every clean take";
  - register jumps, octaves, trills and double 3rds;
  - session lengths set by time-first planning.

  §18.8 says posture and tension are only rated by teachers, so self-learners get no guidance at all. Drums on acoustic kits also lack a hearing-protection note.
- **Why it matters:** for a #1-pedagogy app this is a responsible-teaching gap. Tension-driven speed work is the classic cause of overuse injury in pianists and guitarists.
- **Fix:**
  - A short physical-approach brief per instrument (posture, relaxed release, a stop-on-pain rule), shown once, plus a refresher on the first burst and leap visits.
  - The time-first session inserts a 1-minute release break after about 25 minutes of continuous technique.
  - A drums hearing card.
  - "Not measured" stays honest. These are briefs, not grading.
- **Severity:** major.

## Minor notes
- **YouTube embeds** (§10.1, §17.4):
  - The YouTube API policy requires a visible player of at least 200×200 px (no hidden audio-only playback), and the lab layout must fit that on one phone screen.
  - Use youtube-nocookie with click-to-load for EU/ePrivacy consent.
  - A pre-1925 recording should come from a 78-rpm transfer, not a modern remaster.
- **1A "serves everywhere":** STANDARDS_LEGAL notes Mexico (life+100) and other long-term countries as residual risk. Add this to the pre-charging lawyer question.
- **Post-bop and Shorter chord charts** (§17.5) deserve the same "harmony is the work" care as Collier and Steely Dan (§18.10).
- **The SP §17.3 "cold-check tempo / 0.9 × best" row is orphaned,** because §18.1 replaces the key-session cold check with the staircase. Delete or remap the row.
- **Learn-a-tune has no by-ear route** where the score stays hidden (embed → sing → find, a Berliner-style aural learning path). It exists only as the denied-region fallback; offer it as a mode everywhere.
- **§8.3 capstones** need a mapping per unit and theme (what the capstone is for units like Euclid or twelve-tone). It is unstated, though §13's "use it" tags partly cover it.
- **Level-based voice proxies** (vowel level tolerance, register-break level dip, mic proximity) need capture with AGC off (mic.ts defaults to AGC on), and must use relative, per-device-calibrated levels.
- **Comp dynamics** (MIDI velocity against a sung audio envelope) need a defined mapping through the rendered loudness of the synth.
- **The §17.4 beginner-heads list is still mostly 1B.** §18.9 supersedes it; strike it to avoid confusion.
- **Checked and found sound:**
  - the §18.9 1A list against STANDARDS_LEGAL §2.1;
  - H2's 1930 / 1925 cut-offs and the Hot Five 1926-release correction;
  - chords-only for post-1930 contrafacts;
  - SP swing bands (D9, §16.9) against Friberg & Sundström;
  - degree numbers / letters, no movable do (§18.10 → §15);
  - no reliance on unverified Harris material;
  - PD classical sources (Debussy, Satie, Burgmüller, Sor, Carcassi, Giuliani, Vaccai, Concone, Simandl from period editions only);
  - learn-a-tune memory cold at ≥ 8 h;
  - capstones and tune suggestions skippable (no locks).
