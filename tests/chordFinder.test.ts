import { describe, expect, it } from 'vitest';
import { bassFromMagnitude, chromaFromMagnitude, meanSpectrum, QUALITY_INTS, type ChordQuality } from '../src/engine/chordRecognize';
import { chordSymbol, chordWords, findChord, identifyChord, judgeStrum, OPEN_QUALITIES, recognizeOpen, shapesFor, smoothNames, strumCandidates, strumOnset, strumWindow, type StrumFrame } from '../src/engine/chordFinder';
import { pluckSamples } from '../src/audio/pluck';
import { noteAt, TUNINGS } from '../src/engine/fretboard';

const SR = 48000;
const LEN = Math.round(0.5 * SR);
const TU = TUNINGS[0];
const pc = (n: number) => ((n % 12) + 12) % 12;

const cache = new Map<number, Float32Array>();
function note(midi: number): Float32Array {
  let x = cache.get(midi);
  if (x) return x;
  const { data, rate } = pluckSamples(midi, SR);
  x = new Float32Array(LEN);
  for (let i = 0; i < LEN; i++) {
    const p = i * rate;
    const k = Math.floor(p);
    if (k + 1 >= data.length) break;
    x[i] = data[k] + (data[k + 1] - data[k]) * (p - k);
  }
  cache.set(midi, x);
  return x;
}
function strum(midis: number[]): Float32Array {
  const out = new Float32Array(LEN);
  [...midis].sort((a, b) => a - b).forEach((m, i) => {
    const n = note(m);
    const off = Math.round(i * 0.012 * SR);
    for (let j = 0; j + off < LEN; j++) out[j + off] += n[j] * 0.6;
  });
  return out;
}
/** The open-set result of a rendered strum (the recognizer's HPCP chroma and spectral bass). */
function openOf(midis: number[]) {
  const mag = meanSpectrum(strum(midis), SR, 0);
  return recognizeOpen(chromaFromMagnitude(mag, SR, 8192), bassFromMagnitude(mag, SR, 8192));
}
/** Live-style frames: quiet, then a strum of `pcs` (flat chroma when null) with a low pitch for the bass. */
function frames(pcs: number[] | null, bassMidi?: number): StrumFrame[] {
  const out: StrumFrame[] = [];
  for (let t = 0; t < 900; t += 25) {
    const on = t >= 200;
    const chroma = on ? Array.from({ length: 12 }, (_, i) => (pcs ? (pcs.includes(i) ? 1 : 0.05) : 0.3)) : Array(12).fill(0.02);
    out.push({ t, hz: on && bassMidi ? 440 * 2 ** ((bassMidi - 69) / 12) : null, conf: 0.9, rms: on ? 0.2 : 0.004, chroma });
  }
  return out;
}

describe('chord finder: names and spelling', () => {
  it('writes lead-sheet symbols and words, he + en', () => {
    expect(chordSymbol({ root: 9, quality: 'm7' })).toBe('Am7');
    expect(chordSymbol({ root: 0, quality: 'M', bass: 4 })).toBe('C/E');
    expect(chordSymbol({ root: 10, quality: 'dim7' })).toBe('B♭°7');
    expect(chordWords({ root: 9, quality: 'm7' }).he).toContain('לה');
    expect(chordWords({ root: 0, quality: 'M', bass: 4 }).en).toMatch(/over E/);
  });
  it('identifies the chord a set of notes spells, the lowest note as bass', () => {
    expect(identifyChord([48, 52, 55])).toEqual({ root: 0, quality: 'M' });
    expect(identifyChord([52, 55, 60])).toEqual({ root: 0, quality: 'M', bass: 4 });
    expect(identifyChord([57, 64, 67, 72])).toEqual({ root: 9, quality: 'm7' });
    expect(identifyChord([60, 61, 62])).toBeNull();
  });
});

describe('chord finder: open set on rendered strums', () => {
  it('names open and barre chords right, or says unsure — never a wrong name for most shapes', () => {
    let ok = 0;
    let exact = 0;
    let wrong = 0;
    let total = 0;
    for (const q of ['M', 'm', '7', 'maj7', 'm7'] as ChordQuality[])
      for (const r of [0, 2, 4, 5, 7, 9]) {
        const shape = shapesFor(r, q)[0];
        if (!shape) continue;
        total++;
        const res = openOf(shape.midis);
        if (res.status !== 'ok') continue;
        // Right root, and the name is the played chord or a part of it (a soft 7th read as the triad, never an
        // invented note: a false 7th from partials is worse than a missed one).
        const named = new Set(QUALITY_INTS[res.best!.quality].map((i) => pc(res.best!.root + i)));
        const played = new Set(shape.midis.map(pc));
        const fits = [...played].every((p) => named.has(p));
        if (res.best!.root === r && (fits || [...named].every((p) => played.has(p)))) ok++;
        else wrong++;
        if (res.best!.root === r && res.best!.quality === q) exact++;
      }
    expect(total).toBeGreaterThan(25);
    expect(ok / total).toBeGreaterThan(0.85);
    expect(exact / total).toBeGreaterThan(0.75);
    expect(wrong / total).toBeLessThan(0.05);
  });
  it('a slash chord reads its bass', () => {
    // C/E: E on the low string under a C triad.
    const res = openOf([40, 48, 52, 55, 60]);
    expect(res.status).toBe('ok');
    expect(res.best!.root).toBe(0);
    expect(res.best!.symbol).toBe('C/E');
  });
  it('silence or noise is never named', () => {
    expect(recognizeOpen(Array(12).fill(0), null).status).toBe('silent');
    expect(recognizeOpen(Array(12).fill(0.5), null).status).not.toBe('ok');
  });
  it('a diminished 7th is one name; the bass picks the root', () => {
    const chroma = Array.from({ length: 12 }, (_, i) => ([2, 5, 8, 11].includes(i) ? 1 : 0.02));
    const res = recognizeOpen(chroma, 11);
    expect(res.status).toBe('ok');
    expect(res.best).toMatchObject({ root: 11, quality: 'dim7' });
  });
});

describe('chord finder: live frames', () => {
  it('finds the strum onset and reads the window and the bass', () => {
    const f = frames([9, 0, 4], 45);
    expect(strumOnset(f)).toBe(200);
    const w = strumWindow(f)!;
    expect(w.bass).toBe(9);
    expect(w.chroma[9]).toBeGreaterThan(0.9);
    expect(findChord(f).best).toMatchObject({ root: 9, quality: 'm' });
    expect(strumOnset(frames(null).map((x) => ({ ...x, rms: 0.004 })))).toBeNull();
  });
  it('judges a strum against a target: right, wrong (named), or play it again', () => {
    expect(judgeStrum(frames([9, 0, 4, 7], 45), { root: 9, quality: 'm7' }).verdict).toBe('right');
    const w = judgeStrum(frames([9, 0, 4], 45), { root: 9, quality: 'M' });
    expect(w.verdict).toBe('wrong');
    expect(w.heard).toBe('Am');
    expect(judgeStrum(frames(null), { root: 9, quality: 'm' }).verdict).toBe('again');
    // An inversion question: the bass must agree.
    expect(judgeStrum(frames([0, 4, 7], 52), { root: 0, quality: 'M', bass: 4 }, true).verdict).toBe('right');
    expect(judgeStrum(frames([0, 4, 7], 48), { root: 0, quality: 'M', bass: 4 }, true).verdict).toBe('wrong');
    // Root position asked, an inversion strummed: wrong, and the heard name says so.
    const inv = judgeStrum(frames([0, 4, 7], 52), { root: 0, quality: 'M' }, true);
    expect(inv.verdict).toBe('wrong');
    expect(inv.heard).toBe('C/E');
    expect(judgeStrum(frames([0, 4, 7], 48), { root: 0, quality: 'M' }, true).verdict).toBe('right');
  });
  it('the closed set puts the target first among same-root confusers', () => {
    const { candidates, answer } = strumCandidates({ root: 2, quality: 'm7' });
    expect(answer).toBe(0);
    expect(candidates[0]).toEqual({ root: 2, quality: 'm7' });
    expect(candidates.length).toBeGreaterThanOrEqual(4);
    expect(new Set(candidates.map((c) => c.quality)).size).toBe(candidates.length);
  });
  it('progression smoothing removes a single blip', () => {
    expect(smoothNames(['C', 'Am', 'C', 'G', null, 'G'])).toEqual(['C', 'C', 'C', 'G', 'G', 'G']);
  });
});

describe('chord finder: name → shapes', () => {
  it('every quality has shapes in every key, each spelling only chord tones, frets ≤ 15', () => {
    for (const q of OPEN_QUALITIES)
      for (let r = 0; r < 12; r++) {
        const ss = shapesFor(r, q);
        expect(ss.length, `${r} ${q}`).toBeGreaterThanOrEqual(q === '5' ? 1 : 2);
        for (const s of ss) {
          const want = new Set(QUALITY_INTS[q].map((i) => pc(r + i)));
          for (const m of s.midis) expect(want.has(pc(m)), `${chordSymbol({ root: r, quality: q })} ${s.name.en}`).toBe(true);
          expect(s.midis.map(pc)).toContain(pc(r));
          for (const d of s.box.dots) expect(d.fret).toBeLessThanOrEqual(15);
          // The picture's notes are the shape's notes.
          const pic = [...s.box.dots, ...s.box.open.map((o) => ({ str: o, fret: 0 }))].map((d) => noteAt(TU, d.str, d.fret)).sort((a, b) => a - b);
          expect(pic).toEqual(s.midis);
        }
      }
  });
  it('the open chord comes first where there is one', () => {
    expect(shapesFor(0, 'M')[0].name.en).toBe('Open chord');
    expect(shapesFor(9, 'm7')[0].name.en).toBe('Open chord');
  });
});
