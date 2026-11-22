# The Mediterranean touch inside jazz: odd meters and the hijaz colour (research, 2026-11-22)

*For SPEC-JAZZ-NEIGHBOURS §6 and SPEC-STYLE-FOCUS §1.*

**What the owner wants (2026-11-22):**
- The Mediterranean part is **a touch inside jazz, not a style of its own**: no StyleId and no separate unit.
- It means two things:
  1. odd meters **as jazz uses them** (Brubeck-type 9/8, 7/8, 5/4 and the Balkan groupings jazz players borrow);
  2. a **hijaz / phrygian-dominant colour** on V7 → minor.
- The existing drum levels (`d-mideast`) stay as they are.

**Tags:**
- **[V]** = checked against a source I read (named next to the claim).
- **[C]** = common practice, with a mainstream source named but not read in this session.
- **[?]** = a proposal or an unchecked detail. It stays out of the app until checked.

**Legal frame (US):**
- Meters, groupings and grooves are not protectable.
- We reproduce **no** melody, riff or vamp figure from *Take Five*, *Blue Rondo à la Turk* or any other copyrighted piece. They are named only as listening references.

---

## 0. What the app already has (grep, 2026-11-22)

| Area | Exists | Where |
|---|---|---|
| Drums, Middle-Eastern | `d-mideast` 1–9: malfuf / maqsum (1), baladi / sa'idi (2), ka (3), the Mizrahi kit groove (4), wahda / ayyub (5), chiftetelli (6), **karsilama and aqsaq 9/8 = 2+2+2+3** (7), **dawr hindi 7/8 = 3+2+2 and sama'i thaqil 10/8 = 3+2+2+3** (8), switch on cue (9). The band vamp is Am–Am–Dm–E7. | `drums.ts:736–770, 773–835, 1063–1073` |
| Drums, counting | `d-count` 3: 7/8 as 2+2+3 or 3+2+2 | `drums.ts:1152` |
| Drums, odd at tempo | `d-oddtempo` 1–5: 5/4 (3+2, 2+3, on the ride); 7/8 (2+2+3, 3+2+2, 2+3+2); 7/4 (4+3) and 9/8 (2+2+2+3, 3+3+3); 11/8 (3+3+3+2, 2+2+3+2+2) and 13/8; a song in changing meters | `drumTop.ts:93–98, 628–690` |
| Drums, prog | `d-prog` 1: odd-meter rock grooves | `drums.ts:1136` |
| Keys | `k-rhythm` 4: 5/4 (3+2) and 7/8 (rhythm, not comping over changes) | `keysRhythm.ts:199–215` |
| Guitar | `g-meter` 3: 7/8 and 5/4 riffs | `guitarMeter.ts` |
| Bass | `b-odd` 1–8: 5/4 3+2 / 2+3; 7/8 rotations; 9/8 2+2+2+3 and 3+3+3; 11/8; 13/8 and 15/8; odd over 4/4; mixed meters; displacement. `b-time` 10 (5/4, 7/4, 7/8). `b-ear` 19, plus a "hear the grouping" ear item for 7/8 and 9/8. | `bassNiche.ts:374–445, 1170–1177`; `bass.ts:764, 2637`; `bassEar.ts:459–521` |
| Band grooves | `five-4` (3+2), `seven-8` (2+2+3), `seven-8-322`, `seven-8-232`, `seven-4`, `nine-8` (2+2+2+3), `nine-8-333`, `eleven-8`. All are **rock/prog-style (hi-hat 8ths)**; there is no ride / jazz odd groove. | `grooves.ts:68–70, 135–138` |
| Modes | `phrygian-dominant` [0,1,4,5,7,8,10] (alias list includes "freygish", "spanish phrygian"); `double-harmonic` [0,1,4,5,7,8,11]; `hungarian-minor` | `modes.ts:70, 82, 155–168` |
| Improvisation | `phrygian-dominant` is in `BAR_SCALES` (`improvRules.ts:288`). It is also in the scale-ear pools at 1300 / 1400 (`lesson.ts:2083, 2153`). **I did not find a filter that offers it only when the V7 resolves to a minor chord.** CHORD-SCALE-ROTATION.md §3 recommends that filter. | — |

**So most of the odd-meter content exists on drums and bass.** What is missing is the **jazz side**:
- comping over changes in odd meters (keys, guitar);
- walking or 2-feel bass in odd meters;
- ride-based (jazz) odd grooves in the band;
- the Brubeck-type mixed 9/8 cycle;
- a minor-target-only HM5 option.

---

## 1. Odd meters as jazz uses them

### 1.1 The listening references (named, never reproduced)

| Reference | What is verifiable | Tag |
|---|---|---|
| *Take Five* (Paul Desmond; Dave Brubeck Quartet, *Time Out*, 1959) | 5/4, split **3+2** quarter notes. The main accents and chord changes fall on beats 1 and 4. Written so that Joe Morello could play in 5/4. | **[V]** Wikipedia "Take Five" |
| *Blue Rondo à la Turk* (Brubeck, *Time Out*, 1959) | 9/8 in a **four-bar cycle: three bars of 2+2+2+3, then one bar of 3+3+3**. The second section is in swung 4/4. Brubeck heard the rhythm from street musicians in Turkey. | **[V]** Wikipedia "Blue Rondo à la Turk" (the anecdote is cited there to Fred Kaplan, *1959*, pp. 130–131, and a PBS piece). Wikipedia gives no source for the grouping itself, so check it against the published score before using it as a fact in copy. That the 4/4 section is a 12-bar blues is **[C]**, not checked |
| The Turkish dance behind it | Sources conflict: karşılama vs zeybek | **[?]** Stays out of copy. Just say "a Turkish 9/8 (aksak) rhythm" |
| *Unsquare Dance* (Brubeck, 1961), 7/4 | — | **[C]** standard reference, not read |
| Don Ellis's big band (Balkan/Indian-derived meters), later Dave Holland, Tigran Hamasyan, Avishai Cohen | — | **[C]** known of. Fine as "listen to" names, not as theory claims |

**What jazz does with them** (all **[C]**: common practice in jazz pedagogy, e.g. Bob Moses / Gary Chaffee odd-meter methods, known of, not read):
- **5/4 is usually swung**, as a 3+2 or 2+3 bar.
- **7/8, 9/8 and 11/8 are usually felt in straight 8ths**, with the long group "limping" (aksak = "limping" in Turkish).
- **Comping marks the group starts.**
- **The harmonic rhythm follows the groups.** One chord a bar, or a chord change on a group boundary (e.g. 7/4 as 4+3 with ii on the 4 and V on the 3).

### 1.2 The groupings (8th = the counting unit unless marked)

| Meter | Grouping(s) | Folk name / origin | Jazz use | Tag |
|---|---|---|---|---|
| 5/4 | 3+2, 2+3 | — | *Take Five* (3+2) | **[V]** for *Take Five* |
| 5/8 | 2+3 or 3+2 | Bulgarian paidushko | rare in jazz | **[?]** Sources disagree on paidushko's grouping (Wikipedia: 3+2 in /16; others: 2+3). Teach both, name neither |
| 7/8 | **2+2+3** | Bulgarian rachenitsa | very common | **[V]** most sources agree (Wikipedia "Bulgarian folk dance" via search; one paper notes a 3+2+2 instrumental variant). Notation in /16 vs /8 is a convention only |
| 7/8 | **3+2+2** | Greek kalamatianos; Turkish/Arabic dawr hindi (in the app) | common | kalamatianos **[C]** (Wikipedia, not read); dawr hindi as coded in `d-mideast` 8 **[?]** (not checked by me) |
| 7/8 | 2+3+2 | — | jazz/prog rotation | **[C]** (exists in `d-oddtempo`) |
| 9/8 | **2+2+2+3** | Turkish aksak / karşılama; Bulgarian daychovo (disputed) | Brubeck | **[V]** Brubeck (above). Daychovo **[?]**: Wikipedia gives 2+3+2+2, other sources 2+2+2+3 |
| 9/8 | 3+3+3 | compound triple | the 4th bar of the Brubeck cycle | **[V]** (above) |
| 10/8 | 3+2+2+3 | Arabic sama'i thaqil (in the app) | rare | **[?]** for the sama'i stroke pattern as coded. The grouping itself is fine as a jazz exercise |
| 11/8 | **2+2+3+2+2** | Bulgarian kopanitsa / gankino | Balkan-jazz | **[C]** many sources agree via search (Wikipedia's entry carries a citation-needed tag). A Berklee article by Vessela Stoyanova has a meter table that I could not read |
| 11/8 | 3+3+3+2 | — | prog / jazz | **[C]** (exists in the app) |

### 1.3 How to count and practise them

All **[C]**: standard pedagogy, e.g. the Konnakol-style syllables taught by many jazz educators; mainstream source known of: Gary Chaffee, *Time Functioning Patterns*. The app's grading details are **[?]**.

1. **Speak the groups:**
   - "1-2 1-2 1-2-3" (numbers restart on every group), or syllables "ta-ka ta-ka ta-ki-ta".
   - The Balkan short / long = "quick quick slow".
   - The app's count-in already supports grouped counting (`groups` on drills). Keep the count-in grouped at first, then ungrouped. `bassEar`'s grouping item already turns the grouping off.
2. **Clap the group starts** (accents only) over an 8th click. Then the reverse: clap only the long group.
3. **Feet / LH on the group starts, RH on all 8ths.** On keys and guitar, this is the bridge to comping.
4. **Rotate the grouping** with the same 7 eighths: 2+2+3 → 3+2+2 → 2+3+2. `b-odd` 2 does this on bass.
5. **Comping in the meter.** Shell voicings (3-7) hit on every group start, then only on the first and last group, then anticipate the next bar's 1 by an 8th.
6. **Change chords on group boundaries.** In 7/4 = 4+3, ii on the 4 and V on the 3. In 5/4 = 3+2, i on the 3 and iv (or ♭VII) on the 2.
7. **Switch meters.** Three bars 2+2+2+3, then one bar 3+3+3 (the Brubeck cycle). Then 8 bars of odd → 8 bars of swung 4/4 at the same 8th, the `b-odd` 7 / `d-oddtempo` 5 type.

### 1.4 Grids for each meter (drums and bass): proposals **[?]**, written by us

Drums: one step = one 8th. X = accented cymbal note on a group start; k = kick; s = snare (or cross-stick); p = hi-hat foot. Bass: degrees of the bar's chord on group starts.

| Meter | Jazz drum grid (ride) | Bass (degrees on group starts) | Notes |
|---|---|---|---|
| 5/4 swung (3+2, in quarters) | ride: swing pattern over 5 quarters, accent on 1 and 4; p on 2 and 5 (or 4); light k on 1 | 1 (beat 1) – 5 (beat 4); walking: 1-2-3 \| 5-approach | the existing `five-4` is rock-style; this is the jazz version |
| 7/8 2+2+3 | ride `X.X.X..` (X on 1, 3, 5); cross-stick on step 5; k on 1; p on 3 and 5 | 1 – 5 – (♭7 or approach) on steps 1, 3, 5 | straight 8ths |
| 7/8 3+2+2 | ride `X..X.X.`; cross-stick on 6; k on 1 | 1 – 5 – approach | straight 8ths |
| 9/8 Brubeck cycle (bars 1–3: 2+2+2+3; bar 4: 3+3+3) | bars 1–3 ride `X.X.X.X..`; bar 4 `X..X..X..`; k on 1 | bars 1–3: 1-1-5-5 on group starts; bar 4: 1-3-5 | the rhythm only; harmony ours (e.g. i–iv–V7–i in a minor key) |
| 10/8 3+2+2+3 | ride `X..X.X.X..` | 1 – 5 – ♭7 – 5 | |
| 11/8 2+2+3+2+2 | ride `X.X.X..X.X.` | 1 – 1 – 5 – ♭7 – 5 | |

---

## 2. The hijaz / phrygian-dominant colour

### 2.1 The theory that is verifiable

| Claim | Tag |
|---|---|
| **Phrygian dominant = the 5th mode of harmonic minor** = 1 ♭2 3 4 5 ♭6 ♭7. Example: E F G♯ A B C D comes from A harmonic minor. Also called "Spanish phrygian" and "freygish", and in jazz "HM5" or "Mixolydian ♭9 ♭13". The app's `modes.ts` has exactly [0,1,4,5,7,8,10]. | **[V]** Wikipedia "Phrygian dominant scale" (via search); jazz-handout summaries (BYU-I theory handout via search) |
| **Jazz use: over V7(♭9) resolving to a minor chord** (V7 → i), and over secondary dominants to minor chords (V/ii, V/iii, V/vi). The default for a dominant depends on whether its target is minor. | **[V]** as recorded in CHORD-SCALE-ROTATION.md §3 (Aebersold "Spanish or Jewish scale" on C7♭9, read there). **[C]** for the rest |
| **Jins Hijaz** is a 4-note jins with its tonic on D and its ghammaz (pivot) on G. Its 2nd and 3rd degrees are tuned slightly off the notation (the 2nd a little higher, the 3rd a little lower), so the step between them is "usually played smaller than notated". | **[V]** maqamworld.com, "Jins Hijaz" (read) |
| **Maqam Hijaz** = jins Hijaz on the tonic + **jins Nahawand or jins Rast** on the 4th degree. | **[V]** maqamworld.com, "Maqam Hijaz" (read) |
| In 12-TET, jins Hijaz on D ≈ D E♭ F♯ G. With an upper **Nahawand** (G A B♭ C), the whole maqam ≈ **D phrygian dominant** (D E♭ F♯ G A B♭ C), the 5th mode of G harmonic minor. | **[C]** by arithmetic from the two [V] rows above (Nahawand = a minor-type jins 1 2 ♭3 4) |
| With an upper **Rast**, the scale needs a neutral (quarter-tone) third and **cannot be played in 12-TET**. | **[C]** jins Rast's neutral third, per maqamworld's Rast page (known of, not read in this session) |

**What this means for the app (honest copy):**
- The app is 12-TET. So it teaches a **"hijaz colour"**: the 12-TET phrygian-dominant approximation, with its augmented second ♭2–3.
- It does **not** teach maqam Hijaz:
  - no microtonal tuning;
  - no upper-Rast form;
  - no claim about sayr (melodic path) or ornamentation, all **[?]**.
- One sentence of copy can say this: "Real maqam Hijaz is tuned a little differently and moves by its own rules; here we borrow its colour inside jazz."

### 2.2 How to use it over V7 → i (rules the app can grade)

All **[C]**: they follow from the spelling. They are checked by arithmetic, not by a method book. Example in C minor: G7 → Cm, G HM5 = G A♭ B C D E♭ F.

1. **Only when the V7 resolves to a minor chord** (i, or ii / iii / vi as targets of secondary dominants). Over V7 → major, HM5 clashes with the target's major 3rd: on G7 → C, A♭ / E♭ against C-E-G. **[C]** CHORD-SCALE-ROTATION.md §3 design rule.
2. **The colour notes are ♭9 and 3,** a step and a half apart (A♭–B in G7). The augmented second is the "hijaz" sound. **♭13** (E♭) is the second colour note.
3. **Resolutions:**
   - ♭9 → down a semitone to the 5th of i (A♭ → G);
   - 3 (the leading tone) → up to the root of i (B → C);
   - ♭13 → held as the ♭3 of i (E♭ is common to G7♭13 and Cm). Grade "♭13 held into i's ♭3" as the target. Moving E♭ → D lands on the 9th of Cm, a tension, so it is not the graded target.
4. **The hijaz gesture:** the lower tetrachord of the V, 1–♭2–3–4 (G A♭ B C), descending 4–3–♭2–1, then into i. **[C]** In a characteristic-note rule (CHORD-SCALE-ROTATION §5.4 proposal), "♭9 or the augmented second in every V7 bar" makes the option gradable. **[?]** until tested.
5. **12 keys:** pure degree arithmetic. The spelling must use ♭2 (not ♯1) and 3, so the augmented second is spelled correctly (A♭–B, not G♯–B). This matches the app's enharmonic rule only for *accepting* answers. For *display*, keep the ♭9 spelling.

**Beyond V7 → i:** a modal "hijaz vamp" with phrygian dominant as the *tonic* (as in klezmer freygish or flamenco). Example: X7(♭9) – ♭II – X7 over a pedal.
- **[C]** that freygish functions as a tonic mode (Wikipedia "Freygish", known of).
- **[?]** for any specific vamp.
- Owner rule: this is only a touch. So at most **one** improvisation level, over the vamp `d-mideast` already uses (Am–Am–Dm–E7, where the E7 bar takes E HM5 = A harmonic minor), in all 12 keys.

---

## 3. How it connects without a separate unit: proposed small additions (all **[?]**)

| # | Place | Addition | Reuses |
|---|---|---|---|
| M1 | Drums | One level in `d-oddtempo` (or `d-jazz`): **jazz odd meters on the ride**. 5/4 swung (3+2); 7/8 2+2+3 with cross-stick; the 9/8 four-bar cycle (2+2+2+3 ×3 + 3+3+3); 9/8 → swung 4/4 switch at the same 8th. | `d-oddtempo` generator, grids §1.4 |
| M2 | Band | Jazz variants of the odd grooves: `five-4-swing`, `seven-8-jazz`, `nine-8-cycle` (ride, cross-stick, light kick). The existing rock/prog ones stay. | `grooves.ts` |
| M3 | Keys | `k-rhythm` (or a new style-block rung in the jazz style): **comping over ii–V–I in 5/4 (3+2) and 7/8 (2+2+3)**. Shells on group starts → first and last group only → anticipations. 12 keys. | `k-rhythm` 4, shell voicings |
| M4 | Guitar | The same as M3 on guitar, in `g-meter` (shells / drop-2 on group starts) | `g-meter` 3 |
| M5 | Bass | `b-odd`: **walking and 2-feel in 5/4 and 7/4** (quarter-note odd meters, jazz feel), plus the 9/8 cycle. Today `b-odd` is riff-based. | `b-odd` planDrill |
| M6 | Improvise | The **HM5 / hijaz colour** rotation option, offered **only on V7 with a minor target**. Characteristic-note rule (♭9 or the augmented second in the bar). One improvisation level over the Am–Dm–E7 vamp in 12 keys. | `BAR_SCALES`, CHORD-SCALE-ROTATION §3 |
| M7 | Ear | Expose the existing "hear the grouping" item (7/8, 9/8; bassEar) to all courses' ear areas. Add "which V7 colour: mixolydian / altered / HM5" on V7 → i. The scale pools at 1300 / 1400 already include phrygian-dominant. | `bassEar.ts:496–521`, `lesson.ts` pools |
| M8 | Copy | The style-taster / openers mention "odd meters and a hijaz colour" **inside jazz**. No StyleId and no unit. `d-mideast` unchanged. | SPEC-STYLE-FOCUS §1 |

**Course change checklist** (memory rule) for M1–M7:
- the course and unit openers mention the new rungs;
- the skill map (meter / odd already exists as a sub-skill in `events.ts:70–77`);
- level-test steps only if a rung becomes a placement step;
- guard tests.

---

## 4. Sources

**Read in this session (via the fetch / search tools):**
- Wikipedia, "Blue Rondo à la Turk" (fetched): the four-bar 9/8 cycle, the Turkey anecdote and its citations.
- Wikipedia, "Take Five" (fetched): 5/4, 3+2, accents on 1 and 4.
- maqamworld.com, "Jins Hijaz" and "Maqam Hijaz" (fetched).
- Search-result summaries only, weaker:
  - Wikipedia "Phrygian dominant scale";
  - the BYU-Idaho jazz theory handout;
  - Wikipedia "Bulgarian folk dance" and "Kopanitsa";
  - eliznik.org.uk "Bulgarian dance rhythms";
  - Nathan Bernacki / UBC "Bulgarian Meter" pages;
  - Scientific American and davebrubeck.com on *Blue Rondo*.
- In-repo: `docs/research/CHORD-SCALE-ROTATION.md` (its Aebersold reference), `src/engine/modes.ts`, `drums.ts`, `drumTop.ts`, `bassNiche.ts`, `bassEar.ts`, `keysRhythm.ts`, `guitarMeter.ts`, `grooves.ts`, `improvRules.ts`, `lesson.ts`.

**Known of, not read (behind every [C] that names them):**
- Mark Levine, *The Jazz Theory Book* (1995)
- Gary Chaffee, *Time Functioning Patterns*
- Fred Kaplan, *1959: The Year Everything Changed* (the Brubeck anecdote's source)
- Vessela Stoyanova (Berklee), "Against the Odds: an Exploration of Bulgarian Rhythms" (has a meter table)
- maqamworld.com "Jins Rast"
- Wikipedia "Freygish", "Kalamatianos", "Sama'i"
- The published *Time Out* scores (needed to confirm the *Blue Rondo* grouping from a primary source)
