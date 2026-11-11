import { describe, expect, it } from 'vitest';
import { recognizeChord, recognizeFromChroma, type ChordCandidate, type ChordQuality } from '../src/engine/chordRecognize';
import { pluckSamples } from '../src/audio/pluck';
import { chordShape, drop2Voicings } from '../src/engine/drills/guitar';
import { noteAt, tuningById } from '../src/engine/fretboard';

const SR = 48000;
const LEN = Math.round(0.5 * SR);
const TU = tuningById('standard');

const noteCache = new Map<number, Float32Array>();
/** One plucked note at its exact pitch (pluck.ts renders on an integer period; resample by its rate). */
function note(midi: number): Float32Array {
  let x = noteCache.get(midi);
  if (x) return x;
  const { data, rate } = pluckSamples(midi, SR);
  x = new Float32Array(LEN);
  for (let i = 0; i < LEN; i++) {
    const p = i * rate;
    const k = Math.floor(p);
    if (k + 1 >= data.length) break;
    x[i] = data[k] + (data[k + 1] - data[k]) * (p - k);
  }
  noteCache.set(midi, x);
  return x;
}

/** A down-strum: low string first, 10–20 ms apart (deterministic). */
function strum(midis: number[], noiseSnrDb?: number, seed = 1): Float32Array {
  const out = new Float32Array(LEN);
  const sorted = [...midis].sort((a, b) => a - b);
  let t = 0;
  sorted.forEach((m, i) => {
    const n = note(m);
    const off = Math.round(t * SR);
    for (let j = 0; j + off < LEN; j++) out[j + off] += n[j] * 0.6;
    t += 0.01 + ((i * 7 + seed) % 5) * 0.0025;
  });
  if (noiseSnrDb !== undefined) {
    let p = 0;
    for (let i = 0; i < LEN; i++) p += out[i] * out[i];
    const sig = Math.sqrt(p / LEN);
    const amp = sig / Math.pow(10, noiseSnrDb / 20);
    let a = 2463534242 + seed;
    for (let i = 0; i < LEN; i++) {
      a ^= a << 13;
      a ^= a >>> 17;
      a ^= a << 5;
      const u = ((a >>> 0) / 4294967296) * 2 - 1;
      out[i] += u * amp * Math.sqrt(3);
    }
  }
  return out;
}

const shapeMidis = (root: number, q: string, open = true): number[] => chordShape(root, q as never, open).dots.map((d) => noteAt(TU, d.s, d.f));
const C = (root: number, quality: ChordQuality, bass?: number): ChordCandidate => ({ root, quality, ...(bass !== undefined ? { bass } : {}) });
const mod = (n: number) => ((n % 12) + 12) % 12;

/** Plausible confusers for a triad: parallel, relative, the chords a 4th / 5th away. */
function triadSet(root: number, q: 'M' | 'm'): ChordCandidate[] {
  const par = C(root, q === 'M' ? 'm' : 'M');
  const rel = q === 'M' ? C(mod(root + 9), 'm') : C(mod(root + 3), 'M');
  return [C(root, q), par, rel, C(mod(root + 5), q), C(mod(root + 7), 'M')];
}

function expectRecognized(samples: Float32Array, cands: ChordCandidate[], want: number, tag: string): void {
  const r = recognizeChord({ samples, sampleRate: SR }, cands);
  expect(r.status, `${tag}: scores ${r.scores.join(' ')} bass ${r.bass}`).toBe('ok');
  expect(r.best!.index, `${tag}: scores ${r.scores.join(' ')}`).toBe(want);
}

describe('chord recognizer: closed set', () => {
  it('every open chord among its parallel / relative / neighbour chords', () => {
    const open: [number, 'M' | 'm', string][] = [[0, 'M', 'C'], [9, 'M', 'A'], [7, 'M', 'G'], [4, 'M', 'E'], [2, 'M', 'D'], [9, 'm', 'Am'], [4, 'm', 'Em'], [2, 'm', 'Dm']];
    for (const [r, q, name] of open) expectRecognized(strum(shapeMidis(r, q)), triadSet(r, q), 0, name);
  });

  it('E- and A-shape barre chords, major and minor, across roots', () => {
    for (const r of [5, 7, 10, 0, 3]) for (const q of ['M', 'm'] as const) expectRecognized(strum(shapeMidis(r, q, false)), triadSet(r, q), 0, `barre ${r}${q}`);
  });

  it('drop-2 7th chords against their neighbour qualities', () => {
    const quals: ChordQuality[] = ['maj7', '7', 'm7', 'm7b5'];
    const ints: Record<string, number[]> = { maj7: [0, 4, 7, 11], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], m7b5: [0, 3, 6, 10] };
    for (const root of [0, 7, 2, 5])
      for (const q of quals)
        for (const strs of [[4, 3, 2, 1], [5, 4, 3, 2]]) {
          const vs = drop2Voicings(TU, ints[q].map((i) => root + i), strs);
          const v = vs[0];
          const cands = quals.map((x) => C(root, x));
          expectRecognized(strum(v.map((d) => noteAt(TU, d.s, d.f))), cands, quals.indexOf(q), `drop2 ${root}${q} ${strs.join('')}`);
        }
  });

  it('inversions are told apart by the bass note', () => {
    const cands = [C(0, 'M'), C(0, 'M', 4), C(0, 'M', 7)];
    // C (x32010), C/E (032010), C/G (332010).
    expectRecognized(strum([48, 52, 55, 60, 64]), cands, 0, 'C');
    expectRecognized(strum([40, 48, 52, 55, 60, 64]), cands, 1, 'C/E');
    expectRecognized(strum([43, 48, 52, 55, 60, 64]), cands, 2, 'C/G');
    // Without a bass reading the three tie: unsure, never a guess.
    expect(recognizeFromChroma([1, 0, 0, 0, 0.8, 0, 0, 0.9, 0, 0, 0, 0], null, cands).status).toBe('unsure');
  });

  it('with white noise (SNR 20 dB) it is right or unsure, never wrong', () => {
    let ok = 0;
    let total = 0;
    const cases: [number, 'M' | 'm', boolean][] = [[0, 'M', true], [9, 'm', true], [7, 'M', true], [4, 'm', true], [5, 'M', false], [10, 'm', false]];
    for (const [r, q, open] of cases)
      for (const seed of [1, 2, 3]) {
        const res = recognizeChord({ samples: strum(shapeMidis(r, q, open), 20, seed), sampleRate: SR }, triadSet(r, q));
        total++;
        if (res.status === 'ok') {
          expect(res.best!.index, `${r}${q} seed ${seed}`).toBe(0);
          ok++;
        }
      }
    expect(ok / total).toBeGreaterThanOrEqual(0.8);
  });

  it('a muted chuck / noise burst is unsure', () => {
    const out = new Float32Array(LEN);
    let a = 99;
    for (let i = 0; i < LEN; i++) {
      a ^= a << 13;
      a ^= a >>> 17;
      a ^= a << 5;
      out[i] = (((a >>> 0) / 4294967296) * 2 - 1) * Math.exp(-i / (0.03 * SR)) * 0.5;
    }
    expect(recognizeChord({ samples: out, sampleRate: SR }, triadSet(0, 'M')).status).toBe('unsure');
    expect(recognizeChord({ samples: new Float32Array(LEN), sampleRate: SR }, triadSet(0, 'M')).status).toBe('unsure');
  });

  it('reports the chord tones that did not ring (missing pitch classes)', () => {
    // Chroma with C and G but no E: the C major candidate wins on bass and shape, its 3rd is reported missing.
    const r = recognizeFromChroma([1, 0, 0, 0, 0.02, 0, 0, 0.8, 0, 0.05, 0, 0], 0, [C(0, 'M'), C(9, 'm'), C(5, 'M')]);
    expect(r.missing).toContain(4);
    // A full C chord strum misses nothing.
    const full = recognizeChord({ samples: strum(shapeMidis(0, 'M')), sampleRate: SR }, [C(0, 'M'), C(9, 'm'), C(5, 'M')]);
    expect(full.status).toBe('ok');
    expect(full.missing).toEqual([]);
  });
});
