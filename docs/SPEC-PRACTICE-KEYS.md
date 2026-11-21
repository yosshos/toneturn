# Practice by topic and by key: one taxonomy, two views (draft, 2026-11-21)

Owner, 2026-11-21:
- The split we agreed must work both ways.
  - **By topic:** each exercise is split, where it can be, into major, minor and modes.
  - **By key:** the options are major, minor and modes.
  - Key-neutral technique stays apart.
- Should C come with C dorian, C lydian and the rest, each mode on the same root?
- Should harmonic and melodic minor be separate, with the major modes included under major?
- Do the research, then recommend.

This spec builds on SPEC-COACH-2 (tiers, coach, Practice screen) and on docs/research/TECHNIQUE-COVERAGE-AUDIT.md.

## 1. Research: how scales are grouped

**[E] Exam syllabi.**
- ABRSM and RCM classical technique is set per key: major; the minor forms (natural, harmonic, melodic); chromatic;
  contrary motion.
- Whole-tone and diminished appear only at the top grades or in jazz.
- Modes are not part of classical piano technique.
- Sources: the ABRSM Piano syllabus 2025–26; the RCM 2022 chart.

**[E] Jazz piano syllabi.**
- ABRSM Jazz Piano adds pentatonic, modal and blues scales.
- At Grade 5, modes are given on a named root ("Dorian on B", "Mixolydian on E"), hands together, straight or swung.
- Sources: ABRSM Jazz Piano Scales 1–5; ABRSM jazz exam listings.

**[E] Jazz theory.** Chord-scale pedagogy (Levine, *The Jazz Theory Book*; Aebersold; Berklee) groups scales by parent
family:
- the major modes;
- the melodic-minor modes (lydian dominant, altered, locrian ♮2 …);
- the diminished and whole-tone scales;
- the harmonic-minor modes (phrygian dominant …);
- bebop scales, pentatonics and blues.

Each scale is practised on a root, matched to the chord it plays over: C altered over C7alt, C dorian over Cm7. A 2000
review of Levine (*Music Theory Online*, Rawlins) criticises the "a mode per chord" framing, but the root-based practice
habit itself is standard.

**[P] Two ways to practise modes, and both are common.**
- **Parallel:** every mode on the same root (C ionian, C dorian, C phrygian …). This trains colour and the chord-scale
  match.
- **Derived:** the modes through one parent (C, D dorian, E phrygian …). This trains the key's geography.

The owner prefers parallel on the key page. **I agree.** On a page that is a root, "the colours of C" is the natural
content. Derived practice is kept as one exercise inside the family, and it costs nothing extra.

## 2. Recommendation: scale families as tabs, every mode on the page's root

A key page is a root. Its tabs are scale families, the grouping jazz theory uses, which also keeps the classical core
clean.

| Tab | What is in it (on root C) | Shown from |
|---|---|---|
| **Major** | C major: scales in every form, arpeggios, broken chords, cadences (I–IV–V–I, ii–V–I, backdoor, tritone sub, all resolving to C), Hanon, control, the V7 (G7) and its Harris material, the C 6th-diminished, major pentatonic, bebop major. **Plus the major modes on C:** C dorian, C phrygian, C lydian, C mixolydian (and bebop dominant), C aeolian, C locrian, each in every scale form. **Plus two whole-family exercises:** "all seven on C" (parallel) and "through C major" (derived). | T0, with the modes from T3 |
| **Minor** | C natural, harmonic and melodic minor in every form; minor arpeggios, broken chords, cadences (i–iv–V–i, the minor ii–V–i); B°7 (vii°7); the Cm6-diminished (Harris); minor pentatonic and blues. | T0 (harmonic from T1, melodic from T2) |
| **Melodic and harmonic minor modes** | **On C:** the melodic-minor modes (C dorian ♭2, C lydian augmented, C lydian dominant, C mixolydian ♭6, C locrian ♮2, C altered) and the harmonic-minor modes (C locrian ♮6, C ionian ♯5, C dorian ♯4, C phrygian dominant, C lydian ♯2, C altered ♭♭7), in every scale form. **Plus** "all modes on C" and "through C melodic / harmonic minor". | T4, or the jazz focus from T3 |
| **Symmetric** | Chromatic from C; whole-tone on C; diminished half-whole and whole-half on C, in every scale form. The page notes which keys share these notes: whole-tone repeats every 2 keys, diminished every 3. Progress is still per starting note, because the fingering changes. | Chromatic T1; the others T3 |

**Why this and not just Major | Minor | Modes:**
1. **It is the owner's second idea.** The major modes sit with major, and harmonic and melodic minor are their own world.
2. **It follows the jazz-theory family grouping** [E], so Harris and chord-scale material each have a clear home.
3. **A classical player sees only Major and Minor.** The other two tabs open by tier or focus, so beginners are not
   overloaded and advanced players get depth.
4. **The minor scales stay in Minor.** Their modes, which are jazz colours, get their own tab, so Minor stays the
   classical core.

**Chord-colour items** (chord scales, triad pairs over a chord, a chord's brothers) sit in the tab of the scale they
come from, on their root. For example, C altered is in the melodic-minor tab, and triad pairs over Cm7 are in Major
under C dorian. The functional exception from SPEC-COACH-2 §10 stays: the key's own V7 material belongs to the key.

## 3. The same split in the topic view

Every family is filtered by the same groups, and only groups that have items show a tab.

| Family | Groups shown |
|---|---|
| Scales | Major · Minor · Melodic/harmonic modes · Symmetric |
| Arpeggios | Major · Minor (7th-chord arpeggios go with their key: V7 in Major, vii°7 in Minor) |
| Cadences / ii–V–I / Harris / voicings / lines | Major · Minor |
| Hanon and other patterns, control | Major · Minor (where the item has a minor form) |
| Key-neutral (rhythm, polyrhythm, independence, leaps; guitar and bass mechanics) | no tabs |

In the topic view, the coach takes the chosen group: say Scales → Minor, keys in the chosen order (SPEC-COACH-2 §10).

## 4. Key-neutral technique

- In the topic view, key-neutral families appear as they do today.
- In the key view, they get their own block under the key cards, "General technique" (rhythm, polyrhythm,
  independence, leaps, trills in C; guitar and bass picking and fretting mechanics). There is no key card there.
- The audit lists them (§1.3, §2.2, §3.2).
- Where a neutral item is commonly done in all keys (Hanon), it moves to keyed (audit §4.6 #2).

## 5. Data: one facet per item, read by both views

`keyFacet(drill)` is pure and computed from kind and option. Item ids do not change.
- `scope`: `'keyed' | 'neutral' | 'not-technique'`
- `root`: the page it files under (0–11)
- `group`: `'major' | 'minor' | 'mm-hm-modes' | 'symmetric'`
- `role`: `'scale' | 'arpeggio' | 'cadence' | 'pattern' | 'control' | 'harris' | 'voicing' | 'line' | 'colour'`, the row
  on the page
- `tier`: SPEC-COACH-2 §1

Guard tests:
- No drill whose title or label says minor is in `group: 'major'` (this fixes the 178 levels from the audit).
- Every family and level has a facet: the manifest coverage test.
- Root and tonic are consistent across instruments. Example: piano `harris-2` and guitar `g-harris-3` file the same
  idea under the same page.

## 6. Content to add for these tabs

All of it is standard theory.
- **The major modes** as full scale items on a root: each hand, hands together, contrary, 3rds/6ths/10ths apart, 1–4
  octaves. Today they exist in scales-19…27 and scales-32.
- **The melodic- and harmonic-minor modes** as full scale items. Today only dorian, lydian dominant and altered exist,
  right hand, in scales-12.
- **Whole-tone, half-whole and whole-half** hands together and contrary. Today they are right hand only.
- **The two whole-family exercises** (parallel and derived) per family.
- **Guitar and bass:** the same groups. Guitar already has its 0–12 mode options; bass has its scale list.

## 7. Build order

1. `keyFacet` with the mode fix and the guard tests. This is engine work, nothing visible.
2. The manifest and coverage test.
3. The Practice screen's two views on top of it (SPEC-COACH-2 §6).
4. The content in §6, then the coach by key (SPEC-COACH-2 §4).
