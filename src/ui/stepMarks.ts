// EAR_THEORY_AUDIT (owner: "every step in every course gets its own symbol"): the Ear & theory and the Jazz & improv
// paths drew most steps with five domain icons. Each of their topics and lessons now has its own mark — a short music
// symbol in the note head (the way "ii V I" marks progressions) — or one of the drawn symbols where one fits.
// Pure data; Glyph.tsx draws a mark as GLYPHS[`m:<id>`]. Unique within a course path (tests/earTheoryAudit.test.ts).

/** Topic → the text in its note head (≤ 5 characters, read left to right). */
export const TOPIC_MARK: Record<string, string> = {
  // Drums (DRUMS_NICHE_PLAN): name the band's style by ear.
  'drum-style': 'style',
  // Ear & theory: pitch, intervals, chords
  'basics-highlow': 'Hi·Lo',
  'basics-samediff': '=?',
  'intervals-all': 'P5',
  'compound-intervals': '10th',
  'fine-pitch': '¢',
  'chord-read': 'C/E',
  triads: 'dim',
  'seventh-chords': 'maj7',
  extensions: '13',
  'set-classes': '[016]',
  'scale-types': 'pent',
  'modes-ear': 'dor',
  // EAR_THEORY_AUDIT §6: upper structures and rootless voicings
  'upper-rootless': 'UST',
  'degrees-ext': '♭3',
  maqam: 'maq',
  // harmony and progressions
  'where-home': 'I?',
  'cadence-types': 'V–I',
  'next-chord': 'V→?',
  'reharm-swap': 'sub',
  'figure-out': '?',
  progressions: 'I–vi',
  'chart-analysis': 'ii–V',
  harmonize: 'I·IV',
  modulation: '→V',
  'chromatic-harmony': 'N6',
  'nct-ear': 'nct',
  'harmonic-dictation': 'RN',
  // Progressions on the grid (progGrid.ts): a bar of chords.
  'grid-dictation': '|ii|',
  'chorale-rn': 'SATB',
  'chord-memory': 'IV?',
  // time
  'meter-feel': '3/4',
  'odd-meter': '7/8',
  'prog-meter': '11/8',
  downbeat: '>1',
  'click-subdivide': '♪♪♪',
  'click-backbeat': '2·4',
  'gap-click': 'gap',
  'tempo-react': 'acc.',
  'poly-tap': '2:1',
  polyrhythm: '3:2',
  // AUDIT-CONTENT-THEORY R-1, R-5: metric modulation and the hemiola, tapped.
  'metric-tap': '♩→♩.',
  'hemiola-tap': '3×2',
  syncopation: '&',
  'rhythm-errors': '♩?',
  'rhythm-build': '♩♫',
  // memory, form, reading, theory
  'voice-count': '×3',
  'song-form': 'ABA',
  form: 'AABA',
  style: 'era',
  'theory-facts': 'T/F',
  'musical-terms': 'rit.',
  'time-signatures': '4/4',
  'key-signatures': '♯♯',
  'circle-fifths': '5ths',
  'scale-spelling': 'scl',
  'interval-spelling': 'M6',
  'chord-spelling': 'CEG',
  'roman-numerals': 'IV',
  'figured-bass': '6/4',
  'chromatic-theory': 'Ger6',
  'voice-leading': 'VL',
  counterpoint: '1:1',
  ornaments: 'tr',
  'note-reading': 'A4',
  'sight-read': '♪→',
  'two-part': '2v',
  // sound
  'pan-ear': 'L·R',
  'eq-ear': 'EQ',
  'filter-ear': 'HPF',
  'dyn-ear': 'dB',
  'tone-hz': 'kHz',
  'width-ear': '<>',
  // Jazz & improv
  mood: 'mood',
  dynamics: 'pp',
  articulation: 'stac',
  'call-response': 'Q&A',
  nashville: '1·4·5',
  transpose: 'key',
  'transpose-adv': 'alto',
  // AUDIT-6: in Ear now, next to the B♭ lesson — concert to written.
  transposition: 'C→B♭',
  'melodic-transform': 'inv',
  displacement: '→♩',
  'displacement-3': '6/8',
  'rhythm-transform': '×2',
  'bh-convert': 'dim',
  'bh-convert-2': 'dim2',
  'bh-tone': 'C6',
  'bh-block': 'blk',
  'bh-scale': '6dim',
  'bh-family': '6=m7',
  'bh-pivot': '8va',
  'bh-keys': '4key',
  'bh-lines': '½',
  'bh-six-over': '6/7',
  'bh-brothers': 'bro',
  'chromatic-added': '+½',
  'chord-scale': 'ch–s',
  comping: 'comp',
  'swing-ratio': 'swg',
  turnarounds: 'turn',
  'guide-tones': '3–7',
  'jazz-changes': 'iiV',
  'reharm-spot': '♭II7',
  'guide-line': '7–3',
  'jazz-phrase': 'lick',
  'jazz-form': '12',
  'blues-ear': 'I–IV',
  // AUDIT-6 X1: the advanced games' jazz-ear topics, now Jazz path steps.
  'voicing-type': 'drop 2',
  'jazz-chains': 'ii–V…',
  // THEORY_PLAY (TP-1…TP-4)
  'triad-pairs': '△△',
  'pent-super': '5/7',
  polychords: 'D/C',
  'reharm-own': 'sub',
  // HARRIS_2 + HARMONY_3 (AUDIT-CONTENT-THEORY §ז.2): Barry Harris unit 2, functional harmony, the advanced areas.
  'bh-three-dim': '3°7',
  'bh-dim-roles': '♯I°',
  'bh-m6-bass': 'm6=9',
  // BH-G: the pivot (the root on top, a drop, the climb)
  'bh-pivot-arp': '1↓357',
  // AUDIT-SCALES: borrowing (one voice steps away and back over held voices)
  'bh-borrow': '6↘°↗6',
  // AUDIT-SCALES: eight expressions of one dominant (4 brothers + 4 minor 6ths)
  'bh-sixfive': 'V×8',
  // Harris's moves (first movement, next move, major–minor–minor/6)
  'bh-moves': '°→7→6',
  // the 16 chords around one diminished (Echols's tesseract)
  'bh-tesseract': '°×16',
  // Barry Harris lines by ear: the chromatic scale's skip back (E G F)
  'bh-line-ear': 'EGF',
  // HARMONY-REHARM: one note many chords (F as the 3rd), a mediant jump, a pedal under a slash chord, the half-step
  // approach, the counter-line's first slash, a sus as IV over V, pull vs paint
  'ct-degree': 'F=3',
  mediants: 'C→A♭',
  'pedal-ear': 'X/G',
  'approach-chord': '½↓',
  'counter-line': 'C/B',
  'modern-color': 'F/G',
  'func-color': 'F|C',
  'modal-mix': 'IV→iv',
  'function-ear': 'T·D',
  'modal-cadence': '♭VII',
  'borrowed-ext': '♭VI',
  'jazz-dictation': 'G13',
  planing: 'par.',
  'form-ear': '16',
  'negative-harmony': 'neg',
  // AUDIT-CONTENT-THEORY §ה.2: voice leading by ear.
  'vl-ear': 'VL♪',
  // AUDIT-GAPS-2 #5/#19: how the key changed (the diminished door), and a tune's key centres.
  'modulation-means': '°7→',
  // AUDIT-DEPTH-3 C1/C3: the melody note against the (new) chord.
  'melody-fit': '♪/7',
  // Solo jazz piano by ear (Siskind): the 10th, the three mangos, the Charleston's "1 2+".
  'lh-tex-ear': '1+10',
  'solo-tex-ear': '3/2',
  'comp-rhythm-ear': '1·2+',
  'key-centres': 'I→I→I',
  // VOICE_CURRICULUM: the voice path's topics (each its own mark next to the 16 vocal families).
  'sing-intervals': 'P5↑',
  'song-sing': 'tune',
  'sight-tap': '♪+♩',
  'sight-modulate': 'mod.',
};

/** Topics that keep a drawn symbol (GLYPHS) instead of a mark. */
export const TOPIC_DRAWN: Record<string, string> = {
  'basics-contour': 'contour',
  'basics-beat': 'pulse',
  octave: 'octave',
  'space-ear': 'echo',
  'find-tonic': 'drone',
  'rhythm-memory': 'memory',
  'staff-dictation': 'clefs',
  tempo: 'tempo',
  'tempo-memory': 'slow',
  audiation: 'ear',
  'bass-dictation': 'bass',
  'two-voice': 'log',
  voicings: 'voicing',
  'in-tune': 'tune',
  'eastern-rhythm': 'darbuka',
};

/** Hand-made lessons on the ear and jazz paths. */
export const LESSON_MARK: Record<string, string> = {
  'basics-pitch': 'Hi',
  'basics-shape': 'Up',
  'bflat-two-homes': 'B♭',
  'degrees-135': '1·3·5',
  'major-minor': 'M/m',
  'notes-degrees': 'do',
  cadences: 'V7',
  intervals: 'M3',
  inversions: 'C/G',
  'rhythm-r1': 'R1',
  'rhythm-r2': 'R2',
  'rhythm-r3': 'R3',
  'rhythm-r4': 'R4',
  'rhythm-r5': 'R5',
  'rhythm-r6': 'R6',
  'rhythm-r7': 'R7',
  'rhythm-r8': 'R8',
  dictation: 'dict',
  'note-sequences': 'ABC',
  songs: 'song',
  'slash-chords': 'C/D',
  'jazz-1': 'm7',
  'jazz-2': 'mode',
  'rhythm-shift': 'shift',
  transpose: 'trp',
  'basics-beat': '♩♩',
  // VOICE_CURRICULUM: the voice path's lessons.
  'basics-voice': 'la',
  runs: 'run',
  'sing-names': 'C4?',
  'sing-home-five': '1·5',
  'chord-tones': 'ch.t',
  'sing-degrees': 'deg',
};
/** Lessons that keep a drawn symbol. */
export const LESSON_DRAWN: Record<string, string> = {

};
