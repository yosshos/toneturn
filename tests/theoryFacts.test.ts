// Truth or Bluff: every statement is checked against an independent re-computation from its own words.
import { describe, expect, it } from 'vitest';
import { factItem, factQuestion, factSeed, factSeedInfo, FACT_TOPICS, SILENT_TOPICS, type FactLevel, type FactTopic } from '../src/engine/theoryFacts';
import { mulberry32 } from '../src/engine/lesson';
import { tournamentSet } from '../src/engine/tournament';

// Independent pitch arithmetic (not the generator's).
const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const val = (n: string) => (PC[n[0]] + [...n.slice(1)].reduce((a, c) => a + (c === '♯' ? 1 : c === '♭' ? -1 : c === '𝄪' ? 2 : 0), 0) + 120) % 12;
const LETTERS = 'CDEFGAB';
const letterSteps = (a: string, b: string) => (LETTERS.indexOf(b[0]) - LETTERS.indexOf(a[0]) + 7) % 7;
const KEY_ACC: Record<string, number> = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F♯': 6, 'C♯': 7, F: -1, 'B♭': -2, 'E♭': -3, 'A♭': -4, 'D♭': -5, 'G♭': -6, 'C♭': -7 };
const MINOR_ACC: Record<string, number> = { A: 0, E: 1, B: 2, 'F♯': 3, 'C♯': 4, 'G♯': 5, 'D♯': 6, 'A♯': 7, D: -1, G: -2, C: -3, F: -4, 'B♭': -5, 'E♭': -6, 'A♭': -7 };
const IVL: Record<string, [number, number]> = {
  'minor 2nd': [1, 1], 'major 2nd': [1, 2], 'minor 3rd': [2, 3], 'major 3rd': [2, 4], 'perfect 4th': [3, 5], 'augmented 4th': [3, 6],
  'diminished 5th': [4, 6], 'perfect 5th': [4, 7], 'minor 6th': [5, 8], 'major 6th': [5, 9], 'minor 7th': [6, 10], 'major 7th': [6, 11], octave: [7, 12],
};
const TRIADS: Record<string, number[]> = { major: [4, 7], minor: [3, 7], diminished: [3, 6], augmented: [4, 8] };
const SEVENTHS: Record<string, number[]> = { 'major seventh': [4, 7, 11], 'dominant seventh': [4, 7, 10], 'minor seventh': [3, 7, 10], 'half-diminished': [3, 6, 10], 'diminished seventh': [3, 6, 9] };
const rel = (root: string, notes: string[]) => notes.slice(1).map((n) => (val(n) - val(root) + 12) % 12);
const same = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** The truth of a statement, recomputed from its English text; undefined = a curated row (checked by hand). */
function recompute(text: string): boolean | undefined {
  let m: RegExpMatchArray | null;
  if ((m = text.match(/^(\S+) (major|minor) has (no sharps or flats|(\d) (sharp|flat)s?)$/))) {
    const n = m[3].startsWith('no') ? 0 : Number(m[4]) * (m[5] === 'sharp' ? 1 : -1);
    return (m[2] === 'major' ? KEY_ACC : MINOR_ACC)[m[1]] === n;
  }
  if ((m = text.match(/^The relative minor of (\S+) major is (\S+) minor$/))) return MINOR_ACC[m[2]] === KEY_ACC[m[1]];
  if ((m = text.match(/^(\S+) minor has the same key signature as (\S+) major$/))) return MINOR_ACC[m[1]] === KEY_ACC[m[2]];
  if ((m = text.match(/^(\S+) up to (\S+) is an? (.+)$/))) {
    const [st, se] = IVL[m[3]];
    return letterSteps(m[1], m[2]) === st && (val(m[2]) - val(m[1]) + 12) % 12 === se % 12;
  }
  if ((m = text.match(/^An? (.+) spans (\d+) semitones$/))) return IVL[m[1]][1] === Number(m[2]);
  if ((m = text.match(/^Inverted, an? (.+) becomes an? (.+)$/))) {
    const a = IVL[m[1]];
    const b = IVL[m[2]];
    return a[0] + b[0] === 7 && a[1] + b[1] === 12;
  }
  if ((m = text.match(/^((?:\S+ ){2}\S+) is an? (\S+) (major|minor|diminished|augmented) triad$/))) {
    const notes = m[1].split(' ');
    return notes[0] === m[2] && same(rel(notes[0], notes), TRIADS[m[3]]);
  }
  if ((m = text.match(/^((?:\S+ ){3}\S+) is (\S+) (major seventh|dominant seventh|minor seventh|half-diminished|diminished seventh)$/))) {
    const notes = m[1].split(' ');
    return notes[0] === m[2] && same(rel(notes[0], notes), SEVENTHS[m[3]]);
  }
  if ((m = text.match(/^The tritone substitute of (\S+)7 is (\S+)7$/))) return (val(m[2]) - val(m[1]) + 12) % 12 === 6;
  if ((m = text.match(/^In (\S+) major, the (I|ii|iii|IV|V|vi) chord is (\S+) (major|minor)$/))) {
    const deg = { I: [0, 'major'], ii: [2, 'minor'], iii: [4, 'minor'], IV: [5, 'major'], V: [7, 'major'], vi: [9, 'minor'] }[m[2]] as [number, string];
    return (val(m[3]) - val(m[1]) + 12) % 12 === deg[0] && m[4] === deg[1];
  }
  if ((m = text.match(/^In (\S+) major, V\/(\S+) is (\S+)7$/))) {
    const deg = { ii: 2, iii: 4, IV: 5, V: 7, vi: 9 }[m[2]]!;
    return (val(m[3]) - val(m[1]) + 12) % 12 === (deg + 7) % 12;
  }
  if ((m = text.match(/^The ii–V–I in (\S+) major is (\S+) – (\S+) – (\S+)$/))) {
    const k = val(m[1]);
    return m[2] === `${m[2].replace(/m7$/, '')}m7` && (val(m[2]) - k + 12) % 12 === 2 && /^[^m]+7$/.test(m[3]) && (val(m[3]) - k + 12) % 12 === 7 && m[4].endsWith('maj7') && val(m[4]) === k;
  }
  if ((m = text.match(/^(\S+?)(maj7|m7♭5|m7|7) contains (\S+)$/))) {
    const st = { maj7: [0, 4, 7, 11], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], 'm7♭5': [0, 3, 6, 10] }[m[2]]!;
    return st.includes((val(m[3]) - val(m[1]) + 12) % 12);
  }
  if ((m = text.match(/^(\S) and (\S) are a (half|whole) step apart$/))) return ((val(m[2]) - val(m[1]) + 12) % 12 === 1) === (m[3] === 'half');
  if ((m = text.match(/^(\S+) sounds the same as (\S+)$/))) return val(m[1]) === val(m[2]);
  if ((m = text.match(/^A bar of (\d+)\/(\d+) holds exactly (\d+) (quarter|eighth|sixteenth) notes$/))) {
    const unit = { quarter: 4, eighth: 8, sixteenth: 16 }[m[4]]!;
    return (Number(m[1]) / Number(m[2])) * unit === Number(m[3]);
  }
  if ((m = text.match(/^A (whole|half|quarter) note lasts as long as (\d+) (half|quarter|eighth|sixteenth) notes$/))) {
    const v = { whole: 1, half: 2, quarter: 4, eighth: 8, sixteenth: 16 } as Record<string, number>;
    return v[m[3]] / v[m[1]] === Number(m[2]);
  }
  if ((m = text.match(/^Compared with major, (\S+) has a (\S+)$/))) {
    const alts: Record<string, string[]> = { Dorian: ['♭3', '♭7'], Phrygian: ['♭2', '♭3', '♭6', '♭7'], Lydian: ['♯4'], Mixolydian: ['♭7'], Aeolian: ['♭3', '♭6', '♭7'], Locrian: ['♭2', '♭3', '♭5', '♭6', '♭7'] };
    return alts[m[1]].includes(m[2]);
  }
  if ((m = text.match(/^On the circle of fifths, one step from (\S+) toward the (sharps|flats) is (\S+)$/))) return (val(m[3]) - val(m[1]) + 12) % 12 === (m[2] === 'sharps' ? 7 : 5);
  return undefined;
}

describe('Truth or Bluff statements', () => {
  const topics = FACT_TOPICS.map((x) => x.id);
  it('every topic has three stages, both languages, a reason, and both truths', () => {
    for (const t of topics)
      for (const lv of [1, 2, 3] as FactLevel[]) {
        const r = mulberry32(t.length * 31 + lv);
        const truths = new Set<boolean>();
        for (let i = 0; i < 120; i++) {
          const f = factItem([t], lv, r);
          truths.add(f.truth);
          expect(f.why.en && f.why.he, `${t} ${lv}`).toBeTruthy();
          if (!f.trio) {
            expect(f.text.en.length, `${t} ${lv}`).toBeGreaterThan(8);
            expect(/[א-ת]/.test(f.text.he), `${t} ${lv}: ${f.text.he}`).toBe(true);
            expect(f.text.en).not.toMatch(/\ba [aeiou]|undefined|NaN/);
          }
        }
        expect(truths.size, `${t} ${lv}`).toBe(2);
      }
  });
  it('the truth of every generated statement is right (independent re-computation, 6,000 statements)', () => {
    let checked = 0;
    for (const t of topics)
      for (const lv of [1, 2, 3] as FactLevel[]) {
        const r = mulberry32(977 * lv + t.length);
        for (let i = 0; i < 200; i++) {
          const f = factItem([t as FactTopic], lv, r);
          if (f.trio) continue;
          const truth = recompute(f.text.en.replace(/^Listen: this interval is an? .*/, ''));
          if (truth === undefined) continue;
          checked++;
          expect(truth, `${t} L${lv}: "${f.text.en}" marked ${f.truth}`).toBe(f.truth);
        }
      }
    expect(checked).toBeGreaterThan(3000);
  });
  it('stage 1 of the interval trios is a single interval; by ear it plays two notes', () => {
    const r = mulberry32(5);
    const f = factItem(['trio'], 1, r);
    expect(f.trio).toBeUndefined();
    expect(f.text.en).toMatch(/ up to /);
    const e = factItem(['trio-ear'], 1, r);
    expect(e.midis).toHaveLength(2);
    expect(factItem(['trio'], 2, r).trio).toBeDefined();
  });
  it('as a question: silent, two choices, the right answer', () => {
    const r = mulberry32(8);
    for (let i = 0; i < 50; i++) {
      const f = factItem(SILENT_TOPICS.filter((x) => x !== 'trio'), 2, r);
      const q = factQuestion(`q${i}`, f);
      expect(q.kind).toBe('choice');
      expect(q.stimulus).toEqual([]);
      expect(q.answer).toBe(f.truth ? 'true' : 'false');
      expect(q.choices).toEqual(['true', 'false']);
    }
  });
  it('rooms and duels carry the topics and stage in the seed; old seeds stay the trio game', () => {
    const seed = factSeed(123456, ['keys', 'jazz'], 3);
    expect(factSeedInfo(seed)).toEqual({ base: 123456, topics: ['keys', 'jazz'], level: 3 });
    expect(factSeedInfo(99)).toBeNull();
    const a = tournamentSet('truefalse', 8, seed);
    expect(a).toEqual(tournamentSet('truefalse', 8, seed)); // same items for every player
    for (const q of a) expect(q.kind).toBe('choice');
    expect(tournamentSet('truefalse', 3, 99).every((q) => q.kind === 'tf')).toBe(true);
    expect(Number.isSafeInteger(factSeed(2 ** 32 - 1, FACT_TOPICS.map((x) => x.id), 3))).toBe(true);
  });
});
