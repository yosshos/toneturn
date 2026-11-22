# New Orleans style: research for the style package (2026-11-22)

*For SPEC-JAZZ-NEIGHBOURS §5 and SPEC-STYLE-FOCUS (style id `neworleans`: keys, bass, drums). Research only, no code.*

**Tags (the "only verified theory" rule):**
- **[V]** = checked against a cited source that I read (the source is named next to the claim).
- **[C]** = common teaching practice. A mainstream source is named, but I did **not** read it in this session.
- **[?]** = a proposal or an unchecked detail. It stays out of the app until someone checks it.

**Legal frame (US):**
- Rhythms, grooves and comping patterns are not protectable. We write every grid ourselves.
- We use no copyrighted transcriptions.
- A melody may be used only if its **sheet music was published in 1930 or earlier** (US public domain since 1 Jan 2026). Otherwise the tune ships as chords only.
- Rules and tiers as in `STANDARDS_LEGAL.md` and `PD-JAZZ-SOURCES.md`.

---

## 0. What the app already has (grep of `src/engine/drills`, 2026-11-22)

| Area | Exists | Where |
|---|---|---|
| Stride, keys | `accomp` 3 (single bass and octaves), `accomp` 4 (10ths with walking), `accomp` 9 (more keys). `genStride` plays I–IV–V7–I, with bass on 1 and 3 and a close chord (G3–E4 band) on 2 and 4. Options: single / octave / 10th. The bass alternates root → 5th, except in option 2. | `generate.ts:2549`, levels at `generate.ts:6348–6361` |
| Stride over any chart | Five chart voicings: `stride-single`, `stride-octave`, `stride-tenth`, `stride-broken`, `stride-walk` (walking bass on 3). There is also a stride + measured RH guide-tone melody (`accomp` 18). | `chartDrills.ts:26, 425–460`; `generate.ts:5032` |
| Stride in the cadence library | `stride-tenth` voicing on core cadences and forms | `cadenceLibrary.ts:72, 92, 100` |
| Solo-piano LH | Shell-stride, stride / Peace-Piece / reversed patterns, 3+3+2, 3-against-4 | `soloPianoDrills.ts` (`lh-sstride`, `lh-var1`…) |
| Waltz leaps | `advanced` / `leaps`, used by `keyLicks` for kx-waltz | `keyLicks.ts:199` |
| Boogie-woogie, keys | `accomp` 5: LH over a 12-bar blues, swung. Three figures: 5-6 shuffle, walking 1-3-5-6-♭7-6-5-3, broken octaves. | `generate.ts:3288`, level `generate.ts:6357` |
| Two-feel, bass | `b-walk` 1, `b-up-walk` 1, `b-jform` 1 (skips and pushes), `b-feel` 1 (two-feel, with approach on 4, stop-time) | `bass.ts`, `bassNiche.ts`, `bassRiffFeel.ts` |
| Boogie on bass | "Blues shuffle: boogie shapes" | `bass.ts:1933` |
| Second line, drums | `d-funk` 8, option 1: a swung-16th "second line" (a funk-era street-beat reading, not a brass-band parade beat) | `drumMore.ts:231–239` |
| 2-feel, drums | `d-jazz` 7 (up-tempo 2-feel); `drumJazz` 12 (2 → 4 switch) | `drums.ts:1103`, `drumJazz.ts:97` |
| Swing-ratio dial | `d-shuffle` 5: skip note at 55 / 62 / 67 % | `drumMore.ts` (shuffle lv 5) |
| Band styles | swing, shuffle… **no trad / second-line band style** | `band.ts` (per SPEC-JAZZ-NEIGHBOURS §0) |

**The gaps:**
- No ragtime LH (march bass with a real multi-strain form).
- No stride progressions beyond I–IV–V–I and charts.
- No RH boogie figures.
- No brass-band second-line beat on the kit.
- No tuba-style bass.
- No trad band style.
- No New Orleans tunes tagged as such.

---

## 1. Piano: ragtime → stride → boogie-woogie

### 1.1 Ragtime, the root

- **Form.** Classic rags are multi-strain marches, usually 16-bar strains. The typical plan is AA BB A CC DD, with the trio (C) in the subdominant key. **[C]** Mainstream source: Edward A. Berlin, *Ragtime: A Musical and Cultural History* (1980), known of, not read. Check *Maple Leaf Rag*'s form against the 1899 print before shipping.
- **Left hand.** Ragtime has an "oom-pah" left hand: a low bass note, then a mid-register chord. Stride took this rhythm and swung it. **[V]** NPR, "Stride Piano: Bottom-End Jazz" (2010), read via search summary.
- **Swing.** Ragtime is played with straight 8ths; stride and boogie are swung. **[C]** (Berlin, as above.)
- **The grid, one 2/4 bar in 8ths (as printed in rags):**

| 8th | 1 | & | 2 | & |
|---|---|---|---|---|
| LH | bass (1, often as an octave) | chord | bass (5, or 1) | chord |

  Here 1/5 are scale degrees of the current chord's root, and the chord is a close triad between about G3 and E4. **[C]** Berlin.

- **RH.** The right hand is syncopated against the even left hand: the tied 16th-8th-16th figure, and three-note groups across the beat ("secondary rag"). **[C]** Berlin. The exact taxonomy is **[?]**.

### 1.2 Stride

**The definition.** The left hand keeps a continuous four-beat pulse: a bass note on beats 1 and 3, a chord on beats 2 and 4. **[V]** AllMusic style entry "Stride", via search summary. The name refers to the LH "striding" across the keyboard. **[V]** Wikipedia "Stride (music)". The stride LH travels further than the ragtime LH. **[V]** Wikipedia.

**LH patterns as degrees, one 4/4 bar, swung 8ths underneath.** R = root of the current chord; "ch" = the chord in mid register (3-5-7 or 3-5-R, from G3 to E4). The app already uses this band.

| # | Pattern | Beat 1 | Beat 2 | Beat 3 | Beat 4 | Tag |
|---|---|---|---|---|---|---|
| S1 | Single bass, root–5th | R | ch | 5 | ch | [V] 1/3–2/4 rule (AllMusic); the 5th on 3 is [C] |
| S2 | Octave bass | R+R' | ch | 5+5' (or R+R') | ch | [C] Riccardo Scivales, *Harlem Stride Piano Solos* (1990), known of |
| S3 | Tenth | R+10th (R + 3rd an octave up) | ch (without the 3rd) | 5+10th of 5, or R+10th | ch | [C] tenths: MusicRadar "Master the old style of stride piano", via search summary |
| S4 | Rolled (broken) tenth for small hands | R then 10th as a grace before beat | ch | as S3 | ch | [C] same |
| S5 | Walking tenths (bass moves on 3) | R+10 | ch | chromatic or diatonic step toward the next root, + its 10th | ch | [C] Scivales; the app has `stride-walk` |
| S6 | "Back-beat" displacement: bass on 1, chord on 2, the bass on 3 moved to the "&" of 2 | — | — | — | — | **[?]** Several teaching variants exist; pick one only after checking a source |

**Typical stride / ragtime progressions** (degrees; each needs a source check before it becomes a named rung):

| # | Progression | Where it comes from | Tag |
|---|---|---|---|
| P1 | I – VI7 – II7 – V7 – I (the chain of secondary dominants) | Ragtime and stride, *Charleston*-type tunes, "Sweet Georgia Brown" type | [C] Mark Levine, *The Jazz Piano Book* (1989), known of |
| P2 | I – I7 – IV – ♯iv°7 – I/5 – V7 – I | The blues and gospel cadence used in stride endings | [C] Levine |
| P3 | I – ♯i°7 – ii – V7 (the rising diminished passing chord) | Stride turnarounds | [C] Levine |
| P4 | Rhythm changes, A section: I–vi–ii–V ×2, I–I7–IV–iv, I–V–I | Gershwin's *I Got Rhythm* (1930, US PD) | [V] PD year (Duke 2026 via PD-JAZZ-SOURCES.md); progression [C] |
| P5 | 12-bar blues in stride | Everywhere | [C] |

**12 keys.**
- Every pattern is written in degrees, so transposition is mechanical.
- The real problem is the **tenth**. On many hands, a tenth with a white root and a black 10th, or with both black, is still a stretch. So S3/S4 should allow the rolled form in every key, and the grading should accept "rolled within ~80 ms" as a tenth. **[?]** The tolerance needs a test.

### 1.3 Boogie-woogie

**The core facts:**
- Boogie-woogie has a regular, repeating LH bass figure, transposed to follow the chords. **[V]** Wikipedia "Boogie-woogie", which I read.
- It is called "eight to the bar". **[V]** Wikipedia.
- Most boogie tunes are 12-bar blues on I–IV–V. **[V as Wikipedia states it; that section has no inline citations, so treat it as [C]]**
- Named early bass figures exist from Texas oral history:
  - "The Marshall": four to the bar.
  - "The Jefferson": four to the bar, dropping on the last note of each four-note cycle.
  - **[V]** Wikipedia, citing the 1986 interview of Lee Ree Sullivan by John Tennison.

**LH figures, one bar = 8 swung 8ths (degrees of the current chord root R):**

| # | Figure | 8ths 1–8 | In app? | Tag |
|---|---|---|---|---|
| B1 | 5-6 shuffle (two-note) | R+5, R+5, R+6, R+6, R+5, R+5, R+6, R+6 | yes (`boogie` op 0) | [C] Pianist magazine "How to play boogie woogie piano", via search summary |
| B2 | Walking line | R, 3, 5, 6, ♭7, 6, 5, 3 | yes (op 1) | [C] same |
| B3 | Broken (walking) octaves | R, R', 3, 3', 5, 5', 6, 6' | yes (op 2) | [C] same; "octave bass line as walking bass on three chord tones": Pianist magazine |
| B4 | Rocking octaves | R, R' alternating on every 8th; the chord changes every bar | no | [C] Wikipedia "regular left-hand figure"; this exact figure is **[?]** |
| B5 | Four-to-the-bar "Marshall" | R on 1-2-3-4 (quarter notes), or R-3-5-6 in quarters | no | [V] Wikipedia (Sullivan/Tennison); the exact notes are [?] |
| B6 | Tenths-based LH ("Suitcase Blues") | — | no | **[?]** One lesson attributes it to Albert Ammons; unchecked; out |

**RH figures** (over B1–B3). All are **[C]**: Pianist magazine and MusicRadar boogie lessons, via search summaries. The exact named examples stay **[?]**.
- Tremolo on 3+5 or 5+♭7 of the I chord, held over the bar.
- The ♭3 → 3 crush (a grace note): the app has it in the blues drills, `genBluesLick` op 2.
- Repeated chord riffs on the dotted quarter (3 against the 8th pulse), crossing the bar line.
- The 6th-chord stab on the "&" of 4, anticipating the next bar.
- Triplet turns on the 5th.

**12 keys.**
- B1–B3 are degree-based and fine in all 12 keys.
- In keys with a black-key root, B3 needs a different fingering. `ownFingering.ts` already lets the player keep their own.
- Tradition favours C, F, G, B♭ and E♭ **[C]**. The app's matrix wants all 12 anyway, per the all-12-keys rule.

---

## 2. Drums, bass and band: second line, 2-feel, tuba, trad comping

### 2.1 Second line on drums

**What I verified.** Benjamin Doleac, "Strictly Second Line: Funk, Jazz, and the New Orleans Beat", *Ethnomusicology Review* 18 (2013), read:
- In a parade, **the bass drum holds the march pulse on 1 and 3.** **[V]**
- **The snare improvises march-style figures** that often leave the standard 2 and 4 accents. **[V]**
- The **tresillo (3+3+2)**, the first half of the clave, is a core building block. **[V]** In one analysed track the snare plays a **displaced clave**. **[V]**
- The feel sits **"between the cracks"**, between a triplet shuffle and straight 8ths. The measured long:short ratios were **about 4:3** (≈57 %) and 4:2.75 (≈59 %). **[V]**
- Wikipedia "Second line (parades)": the snare plays "off the marching beat" with improvised polyrhythmic figures. That section is uncited, so it adds nothing beyond Doleac.
- There is no single official second-line pattern. **[V]** soundbrenner.com summary. That is consistent with Doleac.

**Proposed kit grids.** One 4/4 bar, 16 steps (16ths, played swung at about 57–60 %, which the existing swing dial can set). x = hit, X = accent, g = ghost, . = rest.

| # | Name | Bass drum | Snare | Hi-hat foot / cymbal | Tag |
|---|---|---|---|---|---|
| SL1 | Parade pulse | `x.......x.......` (1 and 3) | free ghosts, accent on the "&" of 2 and the "a" of 3: `g.gXg.g.g.gXg.g.` | foot on 2 and 4 | 1/3 bass drum [V] Doleac; the snare line is ours **[?]** |
| SL2 | Tresillo bass drum | `x.....x.....x...` (3+3+2 in 8ths across the bar: beats 1, "&" of 2, 4) | as SL1 | — | tresillo as a building block [V] Doleac; this placement is [C] (tresillo = 3+3+2) |
| SL3 | Clave snare | `x.......x.......` | son clave 3-2, compressed into one bar of 16ths: `X..X..X...X.X...` with ghosts between | — | the displaced clave idea [V] Doleac; this exact grid **[?]** |
| SL4 | Funk second line | as `d-funk` 8 op 1 today | — | — | exists; keep it labelled "funk second line" |

- **Next research step before shipping SL1–SL3:** check them against a published method. Herlin Riley and Johnny Vidacovich, *New Orleans Jazz and Second Line Drumming* (Manhattan Music, 1995), and Antoon Aukes, *Second Line: 100 Years of New Orleans Drumming*. I know of both and have read neither.
- **"Mardi Gras" feel:**
  - The common teaching idea is that the bass drum carries habanera / tresillo figures (Professor Longhair, "Big Chief") **[C]**. Berklee PULSE has a Professor Longhair lesson on habanera and bamboula bass-drum patterns; I tried to read it but the PDF did not extract.
  - The Longhair LH and bass-drum figures stay **[?]**.

### 2.2 Bass: the 2-feel and tuba-style

- **2-feel.** Roots (and 5ths) in half notes on 1 and 3. The app has it on bass (four places) and on drums. **[C]** Schuller, *Early Jazz* (1968), known of.
- **Tuba / sousaphone style, as proposed rungs.** All **[C]** (Schuller) for the role; each rung's details are **[?]**.
  - **T1.** Root on 1 and 5th on 3 in the low register (E1–C3), notes short (about a dotted-quarter at most), with a breath gap.
  - **T2.** As T1, plus a chromatic or diatonic approach on beat 4 into the next chord.
  - **T3.** "Walking up" in 4 at the end of a strain, back to 2 at the next strain.
  - **T4.** Over P1 (I–VI7–II7–V7) in all 12 keys.
- **Grading.** Same as the existing two-feel (`perBeat: 0.5`) plus a note-length cap. The cap value is **[?]**.
- **Sound.** The band's bass patch would need a tuba / sousaphone sample. That is a sound-upgrade item, not research.

### 2.3 Trad (Dixieland) comping

- **Front line roles.** The trumpet or cornet carries the lead, the clarinet plays obbligato above, and the trombone plays counter-lines and tailgate slides below. **[C]** Schuller.
- **Rhythm section.** Banjo or piano plays on all four beats or on 2 and 4 ("chunk"). Tuba or string bass plays in 2. **[C]** Schuller.
- **Piano in a trad band.** The ragtime / stride LH thinned out (S1 at mid tempo), with RH chords on 2 and 4 or four to the bar. **[C]**
- **For the app's band:**
  - A "trad" style: piano S1 + 2-feel tuba + parade or swing drums.
  - A "second line" style: SL1/SL2 + tuba T1–T2.
  - Both are **[?]** as specs.
- **Guitar.** SPEC-STYLE-FOCUS lists `neworleans` for keys, bass and drums only. A banjo-style four-to-the-bar on guitar could be a later "also" option **[?]**.

---

## 3. Repertoire: public domain in the US (sheet music published in 1930 or earlier)

**Rule.**
- The date that counts is the **publication of the sheet music** (with notice), not the recording.
- Transcribe from the **original print** (LoC, IMSLP scans, Levy collection), never from a modern edition. **[V]** rule, `PD-JAZZ-SOURCES.md` §1.1, §1.3 (Duke CSPD sources there).
- Later lyrics or arrangements have their own copyright.

| Tune | Composer | Published (sheet music) | US melody status | Check level |
|---|---|---|---|---|
| *Maple Leaf Rag* | Scott Joplin | 1899 (John Stark) | PD | **[C]** standard reference; also in STANDARDS_LEGAL §2.1. Any reading is ≤1930 |
| *The Entertainer*; other Joplin rags | Joplin (d. 1917) | 1902; all to 1917 | PD | **[C]** (every Joplin publication is before 1917) |
| *Jelly Roll Blues* | Jelly Roll Morton | 1915 | PD | **[V]** Wikipedia "Jelly Roll Blues" (published 1915; "an early jazz fox-trot") |
| *King Porter Stomp* | Morton | copyright filed 1924 (composed c. 1906 per Morton) | PD (if the 1924 print is used) | **[V]** Wikipedia "King Porter Stomp" (copyright 1924). Publisher (Melrose) **[?]** |
| *Wolverine Blues* (1923); Morton's 1927 Melrose stomps (*Billy Goat Stomp*, *Hyena Stomp*, *Jungle Blues*) | Morton | 1923 / 1927 | PD | 1927 titles **[V]** Duke 2023 per PD-JAZZ-SOURCES.md (not re-read by me); 1923 **[?]** |
| *Memphis Blues* (1912); ***St. Louis Blues*** (1914) | W. C. Handy | Sept. 1914 for *St. Louis Blues* | PD in the US (worldwide only from 2029) | **[V]** 1914: Wikipedia, IMSLP, UW Popular Music catalog (via search). The imprint name differs across catalogs (Pace & Handy vs Handy Bros.) **[?]**. Its bridge uses a habanera/tango rhythm **[V]** (Wikipedia, American Songwriter, via search) |
| ***Tiger Rag*** | credited to D. J. "Nick" LaRocca / the ODJB | **1917, Leo Feist** ("one step", piano) | PD **in the US** (the 1917 piano edition) | **[V]** Morgan Library record "Tiger rag: one step … Leo Feist, c1917"; Wikipedia; LoC blog (authorship disputed). **Avoid the 1932 lyric/arrangement version** (Harry DeCosta), which has its own copyright **[V]** (Santa Cruz PL catalog: arrangement © 1932, renewed 1945). The earlier "skip" in STANDARDS_LEGAL was about worldwide status; in the US the 1917 edition is PD |
| ***Muskrat Ramble*** | Kid Ory | Written and recorded 1926 (Hot Five, 26 Feb 1926). **Sheet-music publication year not found** | **Chords only for now** | **[?]** Wikipedia gives "written 1926" and says Melrose was the publisher, but no print date. **Ray Gilbert's lyrics (1950) are NOT PD** **[V]** Wikipedia. Next step: the *Catalog of Copyright Entries* 1926 (archive.org) for a published-music entry |
| *When the Saints Go Marching In* | traditional | Origin unclear. It evolved from similar gospel songs, e.g. *When the Saints Are Marching In* (1896, Purvis/Black, a **different** song). Earliest recording 1923 | PD as a traditional melody (the app already uses it) | **[V]** Wikipedia "When the Saints Go Marching In"; hymnary.org. Use the bare melody, no modern arrangement |
| ***Carolina Shout*** | James P. Johnson | **1926, Clarence Williams** (first print; rolls 1918/1921, OKeh record Oct 1921) | PD in the US (and worldwide from 2026; Johnson d. 1955) | **[V]** IMSLP entry (via search: first published 1926, Clarence Williams); Ethan Iverson, "In Search of James P. Johnson" |
| *Charleston*; *Old Fashioned Love* | J. P. Johnson | 1923 | PD | **[C]** STANDARDS_LEGAL §2.1 |
| Fats Waller piano pieces: *Rusty Pail Blues*, *Sloppy Water Blues*, *Soothin' Syrup Stomp* | Waller | 1927 | PD | **[V]** Duke 2023 per PD-JAZZ-SOURCES.md (not re-read by me) |
| *Ain't Misbehavin'*; *Honeysuckle Rose* | Waller / Razaf | 1929 | PD in the US (Razaf d. 1973, so not worldwide) | *Ain't Misbehavin'* **[V]** Duke 2025 per PD-JAZZ-SOURCES.md; *Honeysuckle Rose* **[?]** |
| *Panama* (1911), *Clarinet Marmalade* (1918), *Royal Garden Blues* (1919), *Basin Street Blues* (1928–29), *Bill Bailey* (1902), *Indiana* (1917) | various | as listed | PD in the US | **[C]** STANDARDS_LEGAL §2.1–2.2; each year needs a check on the print |
| *Didn't He Ramble*, *Li'l Liza Jane*, *High Society*, *Down by the Riverside*, *Just a Closer Walk with Thee* | various / trad | **unchecked** | — | **[?]** *Just a Closer Walk* in particular: STANDARDS_LEGAL calls it 19th-century, but I believe its earliest prints are around 1940. **Check before use** |

**Not PD in the US, chords only:** *Bourbon Street Parade* (1949) and *Joe Avery's Blues* (later copyrights). Both are **[?]** on exact dates, but well after 1930 in any case.

---

## 4. What a modern jazz player gains, recognition cues, the ladder

### 4.1 What it gives (one sentence each; for the style-taster card, SPEC-STYLE-FOCUS §9.3)

- **Stride:** the left hand that carries a whole band alone. It is the root of solo jazz piano: Waller, Tatum, Monk and Jaki Byard all build on it **[C]** (Levine, *Jazz Piano Book*).
- **Boogie-woogie:** hand independence over an unbroken 8th-note engine, plus the blues vocabulary at its most physical **[C]**.
- **Ragtime:** reading, form (strains and a trio key) and an even LH under syncopation, the grammar that stride swings **[V]** NPR on the oom-pah lineage.
- **Second line:** a feel between straight and swung (about 4:3), and the tresillo/clave link between New Orleans and Afro-Cuban music **[V]** Doleac.
- **2-feel / tuba:** knowing when *not* to walk. The 2 → 4 switch is a standard arranging device in straight-ahead jazz **[C]**; the app already teaches it on drums.
- **Trad comping and collective improvisation:** playing a role inside polyphony (lead / obbligato / counter-line) instead of soloing over a backdrop **[C]** (Schuller).

### 4.2 Recognition cues (for the style-recognition game)

All **[C]**, from the sources above:
- **Stride:** a low bass on 1 and 3, a mid chord on 2 and 4, solo piano, swung.
- **Ragtime:** the same LH but straight 8ths, march form, written-out RH syncopation.
- **Boogie:** a continuous 8th-note LH ostinato, 12-bar blues, RH riffs and tremolos.
- **Second line:** a marching bass drum on 1 and 3, a busy syncopated snare, brass band with tuba, the "in-between" swing.
- **Trad:** three horns at once (trumpet lead, clarinet above, trombone below), banjo chunk, tuba in 2.

### 4.3 Exercise ladder T0–T6 (all **[?]**: a proposal mapped to existing ids where possible)

| Tier | Keys | Bass | Drums |
|---|---|---|---|
| T0 | Oom-pah LH (S1) on I–V7 in C, F, G, straight 8ths, no RH | Roots on 1 and 3 on I–V7 (`b-feel` 1 start) | Parade pulse: bass drum 1 and 3, snare on 2 and 4 |
| T1 | S1 on I–IV–V7–I (`accomp` 3); ragtime 2/4 grid; boogie B1 (5-6 shuffle) | Two-feel root–5th (exists) | SL1 with simple ghosts; swing dial at 57 % |
| T2 | S2 octaves; boogie B2/B3 (exist, `accomp` 5); RH tremolo over B1 | T1 tuba (short notes, low register) | SL2 tresillo bass drum |
| T3 | S3/S4 tenths, rolled allowed; P1 (I–VI7–II7–V7) in 6 keys; boogie RH riffs | T2 (approach on 4) over P1 | SL3 clave snare; second-line ⇄ swing switch every 8 bars |
| T4 | S5 walking tenths; P2/P3 endings; stride + RH melody (`accomp` 18); a PD rag A strain (*Maple Leaf Rag*, from the 1899 print) | T3 (walk up at strain ends) | Trad band: 2-feel drums, 4 at the out-chorus (`drumJazz` 12 adapted) |
| T5 | All 12 keys for S1–S5 and B1–B3 in the per-key matrix (style block H); *Carolina Shout* A strain from the 1926 print | T4 over P1 in 12 keys; tuba with the trad band | Mardi Gras habanera bass drum (after source check) |
| T6 | Full PD piece (a rag or Morton stomp) with the tempo ladder; improvise a stride chorus on rhythm changes | Tuba line over a full PD tune form (*Tiger Rag* 1917 strains) | Lead a second-line chart with fills at strain changes |

**The six-point "everything connects" check, per rung (proposal):**
- the per-key matrix (block H);
- licks: boogie RH riffs, stride breaks;
- repertoire tab "New Orleans";
- improvise: the trad and second-line band styles;
- ear: the recognition cues above;
- path: interleaved style units.

---

## 5. Sources

**Read in this session (summaries via the fetch/search tools):**
- Benjamin Doleac, "Strictly Second Line: Funk, Jazz, and the New Orleans Beat", *Ethnomusicology Review* 18 (2013). https://www.ethnomusicologyreview.ucla.edu/journal/volume/18/piece/699
- Wikipedia: "Boogie-woogie"; "Jelly Roll Blues"; "King Porter Stomp"; "Muskrat Ramble"; "Second line (parades)". The last has an uncited drum section, so nothing was used from it.
- Search-result summaries only, weaker:
  - Wikipedia "Stride (music)", AllMusic "Stride", NPR "Stride Piano: Bottom-End Jazz" (2010), MusicRadar stride lesson.
  - Morgan Library *Tiger Rag* records (themorgan.org/node/1282426), LoC "Now See Hear" blog on *Tiger Rag*, Santa Cruz PL sheet-music catalog, IMSLP *Tiger Rag*.
  - IMSLP *The Carolina Shout*, Ethan Iverson "James P. Johnson" (iverson.substack.com).
  - Wikipedia / IMSLP / UW Popular Music catalog on *St. Louis Blues*.
  - Wikipedia "When the Saints Go Marching In", hymnary.org.
  - Pianist magazine and MusicRadar boogie lessons.
- In-repo: `docs/research/PD-JAZZ-SOURCES.md`, `docs/research/STANDARDS_LEGAL.md`, the drill code cited in §0.

**Known of, not read (behind every [C] that names them):**
- Edward A. Berlin, *Ragtime* (1980)
- Gunther Schuller, *Early Jazz* (1968)
- Mark Levine, *The Jazz Piano Book* (1989)
- Riccardo Scivales, *Harlem Stride Piano Solos* (1990)
- Herlin Riley and Johnny Vidacovich, *New Orleans Jazz and Second Line Drumming* (1995)
- Antoon Aukes, *Second Line: 100 Years of New Orleans Drumming*
- Berklee PULSE "Professor Longhair" lesson (the PDF did not extract)
- *Catalog of Copyright Entries* 1923–1930 (archive.org): needed for *Muskrat Ramble* and the unchecked titles
