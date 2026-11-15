# AUDIT-DEPTH-3: how deep are the jazz, theory and technique topics? (2026-11-14)

Read-only audit of `redesign-v2` @ e3241ab3. I dumped every catalogue with a temporary vitest script and deleted it afterwards, so `git status` is unchanged. The script loaded `catalog()`, `guitarCatalog()`, `bassFamilies()`, every `TOPIC_GEN` topic, and the path difficulty of each step from `stepCatalogue()`. I then read the generators where the level titles didn't settle the question.

What is already being built is excluded: the 4 Harris diminished-scale ladders (harmonisation, borrowing, drop 2/3), the scale motion and harmonisation ladders, Philipp-style independence, guitar standard technique, progression dictation, melodic phrase-by-ear, and the path/workout role.

**Context.** Since AUDIT-GAPS-2, `keys12.ts` (lines 21-29) has widened every jazz family to 12 keys on all three instruments. Standards now move by key offset (`stdKey.ts`). Criterion (d) therefore passes almost everywhere. The few exceptions: b-chord, b-scale, b-ext, b-ear and g-ear (1–6 keys, as in GAPS-2 §2).

**Rating note.** Path difficulty goes past 1900 on the app's 700–1900 scale. These levels sit at 1890–2170: harris-14…18, k-sixdim-9…13, voicings-15…17, accomp-15…18, b-walk-16…20, b-barry-6…8, b-ear-17…21. The order is also wrong in places: harris-15 (ii–V–I by the rules, 1960) comes after the pivot levels (1440–1650), but the pivot levels use those rules. The source is `KEYS_LATER` spread × index (`path.ts:390,431`). The ratings I suggest below use 700–1900.

---

## 0. Depth scorecard (all jazz, theory and technique topics)

Key to the columns:
- **a** = performed levels, piano / guitar / bass.
- **b** = runs through a scale, progression or form, not just one chord.
- **c** = instruments covered.
- **d** = all 12 keys.
- **e** = applied in context (a ii–V–I, a standard, a melody, improv or comping).
- **f** = has an ear counterpart.
- **g** = has a basic-to-advanced ladder.

| Topic | a (P/G/B) | b | c | d | e | f | g | Verdict | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| Harris dominant scale + half-step rules | 8 / 1 / 3 | scale → ii–V → chains → chromatic | 3 | ✓ | ii–V–I (h15), chains (h16) | bh-lines, chromatic-added | ✓ | **DEEP** | harris 1,2,11,14–17; g-harris-3; b-barry 3,4,6 |
| Harris pivot | 7 / 3 / 3 | chord → ii–V–I → scale | 3 | ✓ | ii–V–I | bh-pivot-arp (5), bh-pivot (4) | ✓ | **DEEP** | harris 5,19–24; g-harris 8–10; b-barry 5,7,8 |
| Harris conversions / dim moves / one dim, four keys | 2 + 12 (k-keys) / 12 / 12 | ✓ | 3 | ✓ | key moves, lines | bh-convert(-2), bh-keys, bh-family | ✓ | **DEEP** | h13, sd-dom, k/g/b-keys 7–12 |
| Harris 6-dim harmony in progressions (sd-iivi, sd-form(s), sd-passing, sd-aux, sd-move, sd-m6keys) | 8 / **0** / 1 | forms ✓ | piano only | ✓ | forms; **no melody** | bh-dim-roles, bh-six-over, bh-m6-bass | ✓ | **OK piano / SHALLOW guitar** | generate.ts:3764-3990; g-harris has no passing, aux, ii–V–I or form levels |
| Harris **brothers** | 1 / 1 / 0 | one 4-chord cell | P, G | ✓ | **none** | bh-brothers (3) | ✗ | **SHALLOW** | generate.ts:1524-1545 (h8 = one 3-to-9 pattern); guitar.ts:2589 |
| Make it minor / 3-to-♭9 / triplet rules | 2 / 2 / 1 | ii–V | 3 | ✓ | ii–V only, not in a tune | partial (jazz-phrase) | 1–2 levels | **OK** | k-vocab 8–9, g-bebop 10–11, b-bebop 7 |
| Chromatic approach + enclosures | 6+2 / 4+1 / 2+1 | through ii–V–I, every chord tone | 3 | ✓ | ii–V–I; rule card `enclose` | jazz-phrase 3, 5 | ✓ | **DEEP** | k-vocab 2–7, g-bebop 2–5, b-bebop 1–2, harris 6/24, b-impro-7 |
| Digital patterns | 2 / 1 / 1 | changes, Coltrane | 3 | ✓ | changes | — | thin | **OK** | jazz-2/9, g-bebop-6, b-bebop-3 |
| Bebop lines over forms | 10 / 3 / 3 + b-impro | ii–V → blues → rhythm → standards → matrix | 3 | ✓ | standards on piano only | jazz-phrase | ✓ | **DEEP P / OK G,B** | k-bebop 1–10; g-bebop 7–9 (LINE_FORMS, no standards: bebopVocab.ts:460-476) |
| Guide tones / target notes | 3 / 6 / 3 | forms | 3 | ✓ | forms, standards | guide-tones, guide-line | ✓ | **DEEP** | jazz 1,6,7; g-impro 1–4, g-jazz-5; b-impro 5–6 |
| Shells / rootless | 7 / 2 / 1 | progressions → standards | 3 | ✓ | standards, LH comp + RH improv | voicings 3–4, upper-rootless | ✓ | **DEEP** | voicings 3–6, 13–17; g-jazz-1, g-theory-1; b-ext-9 |
| Drop 2 / drop 3 (non-Harris) | 4 / 5 / — | ii–V–I → standards | P, G | ✓ | standards | voicing-type, vl-ear 4 | ✓ | **DEEP** | voicings 9/15, k-vl-6; g-jazz 2–4, g-vl 2–3 |
| **Locked hands / block chords** | 1 (+1 chart item) / 0 / — | scale only | piano | ✓ | **no melody** | **none** | ✗ | **SHALLOW** | generate.ts:2861-2876 (6-dim scale up/down), :5766; chartDrills.ts:223-229 (one block chord per change) |
| Spreads | 3 / — / — | scale, ii–V–I, standards | piano | ✓ | standards | voicings 1 | ✓ | **OK** | k-sixdim-4, k-vl-7, voicings-16 |
| Quartal / So What / planing | 4 / 1 / — | dorian scale, So What | P, G | ✓ | So What only | voicing-type 4, planing, chord-read-alt | ✓ | **OK** | voicings 7–8, rh-planing, voicings-16; g-theory-2 |
| Upper structures | 3 / 2 / 1 | ii–V–I, altered chain | 3 | ✓ | altered chain, not a standard | voicings 5, upper-rootless, polychords | ✓ | **OK** | jazz-4, k-theory-2, rh-pedal; g-arps-7, g-theory-4; b-impro-18 |
| Altered dominant | 4 / 3 / 4 | ii–V–I, lines | 3 | ✓ | ✓ | extensions 2/6/8, chord-read-alt | ✓ | **DEEP** | rh-altered, bb-alt, tp-domcol; g-arps-5, g-bebop-7; b-chord-13, b-impro-10/17 |
| Tritone sub | 4 / 2 / 1 | ii–V, rhythm changes, key moves | 3 | ✓ | rhythm changes (G) | many ear topics | ✓ | **OK** | voicings-10, rh-reharm:0, k-keys-11 ×3; g-jazz-11 |
| **Backdoor / borrowed colours** | 2 / 0 / 0 | 4-chord loops | piano | ✓ | **never in a tune or a line** | jazz-changes 2, borrowed-ext | ✗ | **SHALLOW** | generate.ts:4422-4438 (op 1), 4605 (rh-borrowed), tp-cliche:3 |
| Passing / auxiliary dim | 3 / 1 / 1 | ✓ | 3 | ✓ | turnarounds, walking | bh-dim-roles, reharm-spot 3 | ✓ | **OK** | sd-passing, sd-aux, rh-reharm:2, km-turn; b-barry-2 |
| **Reharmonisation (performed)** | 1–2 / 0 / 0 | fixed loops | piano | ✓ | **never a standard; no melody kept** | reharm-spot, reharm-swap, reharm-own (deep) | ✗ | **SHALLOW** | k-reharm-4 = 4 fixed progressions (generate.ts:4422-4438) |
| Turnarounds | 2 / 2+1 / 2+1 | ✓ | 3 | ✓ | lines + comp | turnarounds (3) | ✓ | **DEEP** | k/g/b-keys 1–2; LINE_FORMS turnarounds (g/b-bebop 8/5) |
| Modulation / key moves | 12 / 12 / 12 | ✓ | 3 | ✓ | ✓ | modulation, modulation-means, key-centres | ✓ | **DEEP** | keyMoveDrills.ts |
| **Coltrane changes** | 3 / **1** / 2 | cycle, matrix | 3 | ✓ | Giant Steps only; Coltrane sub over a ii–V never performed | jazz-chains 3, reharm-spot 4 | P ✓ | **OK P,B / SHALLOW G** | voicings-12, jazz-9, k-bebop-10; g-theory-3 = 2 comping items, bars 1–8 (guitar.ts:2576); b-walk-18 |
| **Triad pairs** | 2 / 2 / 0 | vamp; one ii–V–I item | P, G | ✓ | **vamp only** | triad-pairs (5) | ✓ | **SHALLOW (application)** | k-theory 4/6, tp-iivi; g-theory 5/6 |
| **Pentatonic superimposition** | 1+1 / 1 / 1 | vamp | 3 | ✓ | **vamp only** | pent-super (4) | thin | **SHALLOW (application)** | k-theory-1, tp-iivi; g-theory-6; b-impro-4 |
| Chord-scales / modes / melodic minor | 1 / 1+1 / 4 | scales straight; g-impro-5 through a standard | 3 | ✓ | g-impro-5 | chord-scale, modes-ear, mm-modes | ✓ | **OK** | jazz-5 (jscale ×10), g-scales-7, g-impro-5, b-scale 4/7/8/9 |
| Modal comping / vamps | 2+2 / 1 / 1 | ✓ | 3 | ✓ | So What | modal-cadence | ✓ | **OK** | rh-modal, voicings 7–8; g-theory-2; b-impro-11 |
| Line clichés | 1 / 1 / 0 | one progression | P, G | ✓ | one melody | none | ✗ | **OK−** | tp-cliche 0–1; g-theory-7 |
| Comping rhythms | 2 / 2 / — | standards | P, G | ✓ | ✓ | comping (3) | ✓ | **OK** | voicings 11/14; g-jazz 1/8 |
| Walking bass | 4 / **1** / 20+ | ✓ | 3 | ✓ | standards | jazz-dictation 5, b-ear | ✓ | **DEEP B / OK P / SHALLOW G** | accomp 2/4/8, rh-solo; g-jazz-6 = 1 item (guitar.ts:2557); b-walk 1–20 |
| Stride | 11 / — / — | ✓ | piano | ✓ | standards, melody (guide tones only) | — | ✓ | **DEEP** | accomp 3,4,9,11–18 |
| Ballad / solo piano | 2+1 / 1 / — | one progression | P, G | ✓ | — | — | thin | **OK−** | rh-ballad (one I–vi–ii–V–iii–VI chain), rh-solo; g-jazz-12 |
| Voice leading | 8 / 3 / 1 | ✓ | 3 | ✓ | melody on top (4 motifs) | vl-ear (4) | ✓ | **OK** | k-vl 1–8, g-vl 1–3, b-chord-9 |
| **Harmonise a melody** | 1+1 / 0 / — | 3–5-note motifs | piano | ✓ | **no real phrase; no 6-dim, drop 2 or borrowing** | harmonize (3, choice) | ✗ | **SHALLOW** | voiceLeadDrills.ts:97-102, 284; k-ear-7 (I/IV/V) |
| **Chord-melody (guitar)** | — / 2 / — | generated top voice over ii–V–I–vi | G | ✓ | **no melody** | none | ✗ | **SHALLOW** | guitar.ts:2558, 2562; guitarJazz.ts:256-281 |
| Classical harmony performed (cadences, N6, aug6) | 7 / 0 / 0 | progressions | piano | mostly ✓ | — | cadence-types, chromatic-harmony | ✓ | **OK piano** (low priority elsewhere) | cadences 1–7 |
| Trading / soloing over a form | 1 / 1 / 4 | ✓ | 3 | ✓ | standards (bass) | — | ✓ | **OK** | bb-trade; g-impro-7; b-impro 12–14, b-walk-15 |
| Improv under rules | studio, not a path step | forms | 3 | ✓ | any chart | — | levels 1–5 | **OK, but rules lack the drilled vocabulary** | improvRules.ts:30-33 (no Harris, pivot, triad-pair or enclosure-type rules); not in path.ts:1037 GAME_STEPS |
| Intros / endings | 1 / 0 / 1 | — | P, B | ✓ | — | form-ear 3 | ✗ | **SHALLOW** (still open from GAPS-2 #13) | rh-borrowed (Dameron only); b-jform-5 |

---

## 1. SHALLOW topics: what to add

| # | Topic | What exists | What depth is missing | Suggested ladder (~rating) | Prio |
|---|---|---|---|---|---|
| 1 | **Locked hands / block chords** (piano) | jazz-8 (1470): Shearing over the 6-dim scale, up and down, major and minor (generate.ts:2861). The chart voicing `block` = one block chord per change, no melody (chartDrills.ts:223; voicings-15 Satin Doll) | Never harmonises a *melody*. That means: chord tones → the 6th chord, passing tones → the scale's dim; over ii–V–I (each chord as its 6th chord); Garland drop-2 blocks; a tune. No guitar counterpart (drop-2 soli). No ear. | L1 1300 scale in blocks (exists) → L2 1380 a 4-bar melody over I: chord tones on I6, passing on dim → L3 1450 the melody over ii–V–I (Dm7=F6 / E°, G7=Dm6 / C♯°…) → L4 1520 drop-2 locked hands (melody doubled, 2nd voice down) → L5 1600 8–16 bars of a PD tune (see §3) → L6 1680 at tempo, single-note line breaking into blocks at the phrase peaks. Ear: "single line, locked hands or drop-2 blocks?" | **High** |
| 2 | **Reharmonisation, performed** | k-reharm-4 (1330): 4 fixed 6–9-chord progressions, one device each (generate.ts:4422). rh-borrowed, tp-cliche:2/3 (one 5-note melody). Guitar: tritone subs on rhythm changes only. Bass: none. Ear is deep (reharm-spot 4, reharm-swap 3, reharm-own 5) | Never: reharmonise a standard, keep a melody on top, pick devices yourself, then comp, walk or solo over the result. No guitar or bass work. | L1 1350 each device under one held melody note (extend reharm-own 3–5 into performed) → L2 1420 each device inside a ii–V–I in 12 keys, melody on top → L3 1500 8 bars of a standard: choose a device per bar from a palette; the app checks the melody note against the new chord → L4 1580 comp your reharm (rootless / drop-2) with the band → L5 1650 guitar comps it (drop-2), bass walks it → L6 1720 the whole form, then solo over your reharm. See C3. | **High** |
| 3 | **Harmonise a melody** (piano, guitar) | k-vl-8 (1400): 4 fixed 3–5-note motifs over ii–V–I or I–vi–ii–V (voiceLeadDrills.ts:97). k-ear-7 (I/IV/V). key-sixdim 3 (one note, place). Ear harmonize 1–3 (choice) | No real phrase, no form, no 6-dim, drop-2 or borrowing harmonisation, no guitar, no performed ear task (hear a melody, then harmonise it) | See C1. Ladder 1250 triads under a folk tune → 1350 7ths/shells under the melody (LH) → 1450 6-dim blocks → 1520 drop 2 → 1600 with borrowing / passing dims → 1700 a whole PD standard | **High** |
| 4 | **Chord-melody (guitar)** | g-jazz-7 (1452): harmonised scale, 1 item. g-jazz-10 (1452): the "melody" is whatever top voice the drop-2 voicings land on over ii–V–I–vi (guitarJazz.ts:256-281) | No real melody (songbook / PD tune / own); no bass + melody two-voice stage; no "chord on the strong beats, single notes between"; no passing-dim reharm; no solo arrangement; no ear | 1250 two voices: bass root + melody (songbook tune) → 1330 guide tone + melody (3 voices) → 1420 drop-2 under the melody on each chord change, single notes between → 1500 drop-2 / drop-3 under every melody note (8 bars) → 1600 a PD standard with passing dims → 1700 solo-guitar chorus: chord-melody head + walking-bass fills | **High** |
| 5 | **Harris brothers** | harris-8 (1470): one 3-to-9 pattern over the 4 brothers (generate.ts:1524). g-harris-6 (guitar.ts:2589). Ear bh-brothers 1–3. h16 is the chromatic chain, not the brothers (generate.ts:3433) | Brothers never substitute for the V in a cadence, never appear in a line or comp, never in a tune; no bass | 1450 3-to-9 on the 4 brothers (exists) → 1500 each brother arpeggio + half-step rule resolving to I → 1550 ii–V–I with the V replaced by a chosen brother (line, then comp rootless) → 1600 brothers on a dominant chain (rhythm-changes bridge: each V7 → any brother) → 1650 inside a standard (bars marked V7) → bass: brother roots / arpeggios in a walk. Ear: "which brother replaced the V?" (bh-brothers 4) | **Med-High** |
| 6 | **Backdoor / borrowed colours** | piano rh-reharm:1, rh-borrowed (two loops), tp-cliche:3. Guitar and bass: none performed | No line over ♭VII7 (lydian dominant) resolving; never inside a tune (charts `backdoor-g`, `never-another` exist in standards.ts); no guitar or bass | 1350 comp iv7–♭VII7–I, 12 keys → 1420 guide-tone line through the backdoor → 1480 bebop line over ♭VII7 → I → 1550 in a tune's form (Never Another bars 13–14, Ladybird turnaround): comp + line → guitar drop-2 / bass walk versions | Med |
| 7 | **Triad pairs / pentatonic superimposition (application)** | k-theory 1/4/6, g-theory 5/6 over a one-chord vamp; tp-iivi = one ii–V–I item | Never through a form or a tune, never under an improv rule; bass none | 1500 pair / pentatonic over a vamp (exists) → 1560 one pair per chord through ii–V–I (major) → 1620 minor ii–V–i + altered V → 1680 through a modal tune (So What, Maiden Voyage, Impressions-type charts) → 1750 improv rule cards "triad pairs only" / "pentatonic per chord" graded over a form. Bass: pair arpeggios (b-impro) | Med |
| 8 | **Coltrane on guitar; Coltrane sub over a ii–V** | g-theory-3 (1558): Giant Steps bars 1–8 in shells / drop-2, 2 items. Piano: lines + comp (jazz-9, k-bebop-10). Coltrane sub over a plain ii–V (Tune Up → Countdown) is ear-only (reharm-spot 4, jazz-chains 3) | Guitar: no arpeggios, digital patterns or lines through the cycle. All instruments: no performed Coltrane substitution | Guitar 1500 1-3-5-7 through the cycle in one position → 1550 1-2-3-5 → 1620 lines over GS bars 1–8 → 1700 whole GS chart. All: 1650 "Coltrane sub over a ii–V–I" (comp + line) | Med |
| 9 | **Guitar Harris harmony** | g-harris 1–10 has scales, scale of chords on string sets, lines and pivots | No passing dims, aux dim, 6-dim ii–V–I or 6-dim form (piano has k-sixdim 5, 8–12). Skip any part the current Harris build already covers on guitar | Mirror k-sixdim 5, 8, 9, 11 on drop-2 string sets, 1400–1600 | Med |
| 10 | **Guitar walking bass** | g-jazz-6 (1362), 1 item; g-jazz-12 (solo texture) | No approach types, blues, standards | 1250 roots + approach on ii–V–I → 1350 blues → 1450 walk + guide-tone stabs on a standard | Low |
| 11 | **Ballad voicings / solo-ballad** | rh-ballad: one progression, 2 items | No ballad standard, no rubato ballad intro | 1350 → 1500: ballad chart (Misty, Valentine changes) with 10ths + RH 4-note, rubato first | Low |
| 12 | **Intros / endings** | Dameron ending (rh-borrowed) | GAPS-2 #13, still open: last-4-bars intro, I–vi–ii–V vamp, III–VI–II–V tag ×3, Basie ending, ♭VI–♭II–I | as GAPS-2 | Med |
| 13 | **Line clichés** | tp-cliche 0–1, g-theory-7 | No ear item; never in a tune (My Funny Valentine-type minor A, Stella-like) | ear item "line cliché: where does the line move?" 1300; tune application 1450 | Low |

---

## 2. COMBINATION exercises

### 2.1 What exists, and how deep

| Combination | Where | Depth |
|---|---|---|
| A form comped the 6-dim way (each chord as its 6th + dim) | k-sixdim 9–10 (sd-form/sd-forms, generate.ts:3876-3895) | OK. The top voice just steps through the scale; no melody |
| A standard comped in shells / rootless / drop 2 / drop 3 / block / quartal / upper | voicings 14–16, accomp 15; g-jazz 8/13; repertoire ways | OK. Per-tune order is partial: Autumn = shell → rootless only (repertoire.ts:152) |
| LH comps, RH improvises | voicings-17, accomp-16 | **RH not graded** (chartDrills.ts:5, 249, 375 `freeAbove`) |
| Shells + a written line, two hands | k-bebop-7 (bb-hands) | OK. The line is read, not improvised |
| Melody reharmonised | tp-cliche:2/3 (one 4–5-chord melody) | SHALLOW |
| Harmonise a given motif | k-vl-8 (4 motifs) | SHALLOW |
| Chord-melody | g-jazz-10 (generated top voice) | SHALLOW |
| Stride + RH "melody" | accomp-18: the RH plays guide tones on 1 and 3 (generate.ts:4644-4660) | SHALLOW as melody work, OK as voice leading |
| Improvise over a form under rules + debrief | improvRules.ts (~55 challenge cards), improvCoach.ts | OK, but no Harris / pivot / enclosure-type / triad-pair / "use a lick" rules, and not a path step |
| Use a learned lick while improvising | lickDetect.ts | OK (detection exists). No exercise asks for it under a rule |
| Bass: head-chorus-out walk; solo on a standard | b-jform-7, b-impro-13, b-walk-15 | OK |
| Guitar: lines through a standard | g-impro-5/6 | OK (chord-scale, motif) |

### 2.2 Missing combinations: designs

**C1. Harmonise a melody in 6-dim blocks, drop 2 and borrowing** (piano; guitar drop-2 version). Rating 1450–1750.
- Material: an 8-bar phrase of a PD tune (§3) or an own melody (voiceSongs.ts), with its chords.
- Steps:
  1. Play the melody alone.
  2. Block it: under each melody note, a chord tone of the bar's chord takes the 6th chord Barry converts it to (Dm7 → F6, G7 → Dm6, Cmaj7 → C6, Dø → Fm6). A passing tone takes the scale's dim.
  3. Same in drop 2, then drop 3.
  4. Borrowing on long melody notes: the melody holds while one inner voice moves to the dim and back (oblique motion, like sd-borrow).
  5. With a bass (LH root) at a tempo ladder, then rubato → tempo.
- Grading: per event, the top voice must be the melody pitch exactly. Lower voices are graded on `required`/`allowed` pitch-class sets (the chordDrill model). Drop placement is checked by register, and for borrowing the held voices must be tied (holdNotes, as in sd-aux). Partial credit per event.
- Ear: "6th chord or dim under this note?"
- Guitar: melody on the top string set, drop-2 on 4-3-2-1 / 5-4-3-2.

**C2. Embellish a melody: enclosures, approaches, pivots** (piano, guitar, bass, voice). Rating 1350–1650.
- Steps:
  1. Play the PD or own melody straight.
  2. Approach every downbeat melody note chromatically from below.
  3. Enclose it, with the enclosure type chosen per level (reuse the v-lead types).
  4. On long notes (half / whole), fill with a pivot arpeggio of the bar's chord (h19 checker).
  5. Free: any mix, with the melody notes still landing on their beats.
- Grading: the target melody notes must land on the written beat and pitch. The 1–2 beats before a target are classified by type (v-lead logic). Long-note fills must outline the chord with a pivot.

**C3. Reharmonise a standard, then comp, walk and solo over it** (piano, guitar, bass). Rating 1550–1800.
- Material: 8 bars of a standards.ts chart. The melody is a PD or own melody, or the guide-tone line as a stand-in.
- Steps:
  1. Pick a device per bar from a palette: tritone sub, backdoor, passing dim, added ii, brother, Coltrane sub.
  2. The app checks each new chord against the melody note (reharm-own logic) and writes an own chart (chartDrills accepts `txt:` charts, chartDrills.ts:9).
  3. Comp it (rootless → drop 2) with the band.
  4. Guitar comps it; bass walks it (the b-walk generator on the txt chart).
  5. Improvise over it under `guide-beats` / `chord-tones` rules.
- Grading: chord choices are auto-checked. Comping uses chartDrill grading, walking uses the bass walking rules, and the solo uses improvRules.

**C4. Comp a standard: one gated per-tune ladder** (piano, guitar, bass). Rating 1250–1700.
- Ladder: roots + guide tones → shells → rootless A/B → drop 2 → block / 6-dim (sd-form on the tune's chart) → the same with a comping rhythm and the band → 12 keys.
- Guitar: shells → drop 2 → drop 3 → chord-melody.
- Bass: roots → two-feel → walk → walk + 2-to-4 on the bridge.
- Grading: existing chartDrill and bass grading. New: gating plus one progress view per tune. Overlaps GAPS-2 #14.

**C5. Improvise over a form with the drilled vocabulary as rules** (piano, guitar, bass, voice). Rating 1400–1800.
- New rule cards:
  - `harris`: chord tones on the beat, half steps only per h14;
  - `pivot`: at least one pivot every 4 bars;
  - `enclose:<type>`;
  - `triad-pair`;
  - `use-lick`: a mastered lick appears over its chord (lickDetect);
  - `quote-head`: a melody fragment of the tune (PD/own).
- Piano: grade the LH comp (chart voicing) and the RH improv (rules) together, which closes the `freeAbove` gap.
- Make "Improvise under rules" a path step (it is missing from path.ts:1037-1061) so it feeds the path, XP and leagues (Everything connects).

**C6. Write and play a solo chorus with learned vocabulary** (piano, guitar, bass, voice). Rating 1500–1750.
- Steps:
  1. Pick a form (blues, ii–V tune, rhythm changes).
  2. The bar grid shows the chords. Place mastered licks (licks.ts, transposed to each bar's chord) and connect them with rule-checked scale or arpeggio links (bebopLine rules: chord tone on the beat, approach into each change), or record improvised phrases and keep the best as "my chorus".
  3. Play the written chorus with the band up a tempo ladder, then in 12 keys.
  4. Play your chorus, then improvise the next one. lickDetect counts the vocabulary reused.
- Grading: the editor checks the rules. The performance is graded note for note (lineDrill), and the improvised chorus by rules.

**C7. Comp-and-solo duo on one instrument** (piano both hands; guitar chord-solo). Rating 1550–1750.
- Blues, then rhythm changes, then a standard.
- The LH comps shells/rootless on a Charleston (graded); the RH plays guide tones on 1 and 3 (graded), then free lines under rules.
- Guitar: alternate 2 bars of chords with 2 bars of line (graded per section).

**C8. Capstone arrangement** (piano, guitar). Rating 1700–1900.
- Intro (last 4 bars or a vamp) → head harmonised (C1 / chord-melody) → one solo chorus (C5) → head out → ending (Basie, tag, ♭VI–♭II–I).
- Each section is graded by its existing checker. This needs #12 (intros / endings) first.

---

## 3. Melodies for standards: what the app contains

**No copyrighted standard melody was found.** Each melody source in the app:
- **Standards** (`src/engine/standards.ts:1-3`) are changes only. The header says "never the melodies or lyrics". The bass ladder walks generated lines on these charts (bass.ts:1225-1260, bassNiche2.ts).
- **Songbook** (`src/content/songbook.ts`, 41 tunes): all traditional or composers long dead. Every credit (lines 144-629) is 1930 or earlier and PD worldwide. Happy Birthday is credited to the 1893 Hill melody (PD; US court 2016). The only jazz-adjacent tunes are the spirituals Saints and Swing Low.
- **Voice songs** (`src/content/voiceSongs.ts`): 21 own melodies plus 2 PD spirituals with own jazz charts. The provenance note (lines 1-8) says no existing head is quoted.
  - `corner-light` (lines 148-158) puts an own melody over the Autumn Leaves changes in A minor.
  - `fast-tracks` (lines 190-200) uses rhythm-changes-like changes.
  - I compared both with the real heads. Corner Light arpeggiates up to a long 3rd on the V and does not follow the Autumn Leaves stepwise pickup-plus-long-note sequence. Fast Tracks is not *I Got Rhythm*. **Low risk;** the owner may want a glance at Corner Light because its changes are so recognisable.
- **Licks** (`licks.ts:5-7`): own material. **Transcription** (`transcribe.ts:5-6`): uses the songbook, own licks and generated phrases.
- **Name That Tune** (`pdTunes.ts`): PD openings only, worldwide tier (Joplin's *The Entertainer* is the only ragtime/jazz item).
- **User-supplied material** (`leadsheet.ts` imports of MusicXML/iReal, My song): the user's own responsibility. No bundled examples were found.
- `references.ts`: recording metadata only.

**The real gap: there is no standard melody at all.** Every application exercise above (block chords, chord-melody, embellishment, reharm with the melody kept) therefore lacks a real head. `docs/research/STANDARDS_LEGAL.md` §2.1 already lists safe candidates:
- **PD worldwide (Tier 1A)**, the best first picks because they are real jazz vehicles: *Back Home Again in Indiana* (1917, the Donna Lee changes), *Love Me or Leave Me* (1928), *Mean to Me* (1929), *I'll Get By* (1928), *My Blue Heaven* (1927), *Avalon* (1920), *Rose Room* (1917), *Yes Sir, That's My Baby* (1925), *If I Could Be with You* (1926), *Old Fashioned Love* / *Charleston* (1923). For stride: *Maple Leaf Rag* and *King Porter Stomp*.
- **Under the owner's US rule** (published 1930 or earlier), Tier 1B is also usable: *I Got Rhythm*, *Body and Soul*, *Honeysuckle Rose*, *Ain't Misbehavin'*, *St. Louis Blues*, *Georgia on My Mind*, *What Is This Thing Called Love?*. But STANDARDS_LEGAL marks these US-only: they are protected in the EU and Israel (life + 70, and the song rule for Ira Gershwin until 2053). For a Hebrew-first app with Israeli users, either gate them by region or wait for the lawyer's [lawyer] item.
- Transcribe from period sheet music (LoC, Levy, IMSLP), never from a modern fake book. Add a written own contrafact for post-1930 changes (ATTYA, Autumn, Solar, Blue Bossa) in the voiceSongs style.
- *It Had to Be You* and *I'll See You in My Dreams* become PD worldwide on 1 Jan 2027 (Isham Jones died in 1956).

---

## 4. Priorities in one line

High:
- C1 (harmonise a melody in blocks / drop 2 / borrowing) together with #1 (locked hands);
- #4 (chord-melody on guitar);
- C3 (reharm → comp → walk → solo) together with #2;
- the first 6–8 Tier-1A PD melodies, which these exercises need.

Then:
- C5 (vocabulary rule cards + improv as a path step, piano RH graded);
- #5 (brothers in context);
- C2 (embellish a melody);
- #6, #7, #8.

Low: guitar walking, ballads, line-cliché ear.

---

## 5. Built (2026-11-14)

- §0 path order: Harris placed by an explicit map (the rules h14/h15 before the pivots h19–24); every other piano and bass family squeezed under 1880 (`path.ts` `spreadOf`, `PATH_CAP`). Test: `tests/depth3.test.ts`.
- C5: 48 rule cards (`ruleCards.ts`) in the improv studio and as graded path steps: `k-solo` / `g-solo` / `b-solo` (`soloDrills.ts`), cards checked in `analyze.ts` (`goal.improv`). voicings-17 and accomp-16 grade the right hand by cards.
- C6: the solo-chorus builder (`soloChorus.ts`, `SoloChorus.tsx`) and the chorus levels.
- C7: the comp-and-solo duo on piano, guitar and bass.
- #5, #6: `k-ctx` / `g-ctx` / `b-ctx` (`ctxDrills.ts`): the brothers (BARRY-HARRIS-THEORY §2) as lines, comping, all four, in a turnaround and a blues, on the bass; backdoor; triad pairs and pentatonics over forms; the Coltrane sub; intros, endings, ballad comping; ear bh-brothers 4.
- Open: C1–C4, C8, #1–#4, the PD melodies (§3); `quote-head` waits for a melody source.
