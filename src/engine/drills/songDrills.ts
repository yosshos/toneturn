// Song drills (owner 2026-11-07): practise real (public-domain) songs on the instrument, not only exercises —
// the melody (right hand / on the neck), the chords (left hand / strummed shapes) or both hands. Built on the drill
// creator's format, so the tempo ladder, the ✓/✗ marks, MIDI / microphone and the tab view all work unchanged.

import type { CustomDrill, Drill } from './types';
import { customToDrill, guitarTonic, tuningOfCustom } from './custom';
import { generateGuitar } from './guitar';
import { chordName, SONGBOOK, songChords, songNotes, songRange, type SongChord, type SongDef } from '../../content/songbook';

export type SongPart = 'melody' | 'chords' | 'both';

const MAJ = [0, 2, 4, 5, 7, 9, 11];
const MIN = [0, 2, 3, 5, 7, 8, 10];

/** Semitones from the tonic → a creator degree (1 = tonic, 8 = an octave up, ≤ 0 below) + a ♯/♭ when off the scale. */
export function semiToDeg(semi: number, minor = false): { deg: number; alt?: -1 | 1 } {
  const scale = minor ? MIN : MAJ;
  const oct = Math.floor(semi / 12);
  const pc = semi - oct * 12;
  const i = scale.indexOf(pc);
  if (i >= 0) return { deg: i + 1 + 7 * oct };
  // Off the scale: a raised degree below it (♯4, ♯7 in minor …).
  const below = scale.filter((x) => x < pc).length - 1;
  return { deg: below + 1 + 7 * oct, alt: 1 };
}

type Row = CustomDrill['pattern'];
type Marks = NonNullable<CustomDrill['marks']>;

function melodyRow(s: SongDef): { row: Row; marks: Marks } {
  const row: Row = [];
  const marks: Marks = [];
  for (const n of songNotes(s)) {
    if (n.semi === null) {
      // A rest needs a note to hang on: the tonic, marked as a rest.
      row.push({ deg: 1, dur: n.beats, hand: 'R' });
      marks.push({ rest: true });
      continue;
    }
    const d = semiToDeg(n.semi, s.minor);
    row.push({ deg: d.deg, ...(d.alt ? { alt: d.alt } : {}), dur: n.beats, hand: 'R' });
    marks.push(null);
  }
  // Leading rests (pickups) are dropped: the take starts on the first sung note.
  while (marks.length && marks[0]?.rest) {
    row.shift();
    marks.shift();
  }
  return { row, marks };
}

/** Left-hand chords: root–3rd–5th (–7th) as a block per chord, an octave below the tonic. */
function chordRow(s: SongDef, hand: 'L' | 'R'): Row {
  const row: Row = [];
  const pickup = (() => {
    const first = songNotes(s).find((n) => n.semi !== null);
    return first ? first.at : 0;
  })();
  for (const c of songChords(s)) {
    if (c.at + c.beats <= pickup) continue; // the pickup bar's chord is not played
    const tones = chordTonesClose(c);
    const beats = c.at < pickup ? c.at + c.beats - pickup : c.beats;
    tones.forEach((semi, i) => {
      const d = semiToDeg(semi, s.minor);
      row.push({ deg: d.deg, ...(d.alt ? { alt: d.alt } : {}), dur: i === tones.length - 1 ? beats : 0, hand });
    });
  }
  return row;
}

/** Chord tones in close position from the root (root 0–11 above the tonic), max 4 notes. */
function chordTonesClose(c: SongChord): number[] {
  const iv = { maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], dom7: [0, 4, 7, 10], min7: [0, 3, 7, 10], maj7: [0, 4, 7, 11] }[c.quality];
  // Keep the root in the lower half so the block sits around the LH tonic.
  const root = c.root > 7 ? c.root - 12 : c.root;
  return iv.map((x) => root + x);
}

const bpmFor = (s: SongDef) => (s.level <= 2 ? 72 : s.level === 3 ? 80 : 88);

/** The song as a creator drill for the piano (or the melody on a guitar / bass neck). */
export function songCustom(s: SongDef, part: SongPart, instrument: 'piano' | 'guitar' | 'bass' = 'piano'): CustomDrill {
  const mel = melodyRow(s);
  const base: CustomDrill = {
    id: `song-${s.id}-${part}-${instrument}`.slice(0, 40),
    name: s.title.en,
    scale: s.minor ? 'natural' : 'major',
    pattern: mel.row,
    marks: mel.marks,
    sequenceSteps: 0,
    hands: 'R',
    createdAt: '2026-11-07T00:00:00.000Z',
    v: 2,
    keys: [s.key],
    minor: !!s.minor,
    startBpm: Math.round(bpmFor(s) * 0.75),
    goalBpm: bpmFor(s) + 20,
    instrument,
    inToday: false,
    inWorkout: false,
    inPath: false,
  };
  if (instrument !== 'piano') {
    // The tonic sits on the lowest string by default; a song that dips well below its tonic (Für Elise, a G-major
    // tune going down to D) would fall off the neck — move the tonic to the next string up until it fits.
    const tu = tuningOfCustom(base);
    const n = tu.open.length;
    const [lo] = songRange(s);
    for (let rs = n; rs >= 1; rs--) {
      if (guitarTonic({ ...base, rootString: rs }, s.key) + lo >= tu.open[n - 1]) return rs === n ? base : { ...base, rootString: rs };
    }
    return base;
  }
  if (part === 'melody') return base;
  if (part === 'chords') return { ...base, pattern: chordRow(s, 'L'), marks: undefined, hands: 'L', handsMode: 'L' };
  return { ...base, hands: 'RL', handsMode: 'independent', lh: chordRow(s, 'L') };
}

/** A runnable drill: piano parts and guitar melody through the creator; guitar chords as real strummed shapes. */
export function songDrill(s: SongDef, part: SongPart, instrument: 'piano' | 'guitar' | 'bass' = 'piano'): Drill {
  return { ...songDrillRaw(s, part, instrument), chart: songChart(s) };
}

/** Chord names per bar ("C | F C | G7 C"), in the song's key. */
export function songChart(s: SongDef): string[] {
  const flats = [5, 10, 3, 8, 1].includes(s.key);
  const bars = s.chords.split('|').length;
  const cs = songChords(s);
  return Array.from({ length: bars }, (_, b) => cs.filter((c) => Math.floor(c.at / s.meter + 1e-9) === b).map((c) => chordName(c, s.key, flats)).join(' '));
}

function songDrillRaw(s: SongDef, part: SongPart, instrument: 'piano' | 'guitar' | 'bass'): Drill {
  if (instrument !== 'piano' && part === 'chords') {
    const i = SONGBOOK.indexOf(s);
    return generateGuitar({ family: 'g-chords', kind: 'song', key: s.key, hands: 'R', instrument: 'guitar', option: i });
  }
  const d = customToDrill(songCustom(s, part, instrument), s.key);
  return { ...d, title: { en: `${s.title.en} · ${PART_NAME[part].en}`, he: `${s.title.he} · ${PART_NAME[part].he}` } };
}

export const PART_NAME: Record<SongPart, { en: string; he: string }> = {
  melody: { en: 'melody', he: 'מנגינה' },
  chords: { en: 'chords', he: 'אקורדים' },
  both: { en: 'both hands', he: 'שתי ידיים' },
};
