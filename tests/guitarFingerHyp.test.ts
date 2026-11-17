// GUITAR-AUDIT §1 (2026-11-17): string / fret vs fretting finger. Per take only places are facts; over time a finger is
// named — as "possibly" — only when the misses follow it across strings, frets and contexts, not one place.
import { describe, expect, it } from 'vitest';
import { addTake, emptyModel, findings, guitarFingerHypotheses, weakPlaces, type PlayerModel } from '../src/engine/analysis/model';
import type { Drill, ExpNote, TakeMetrics } from '../src/engine/drills/types';

const OPEN = [64, 59, 55, 50, 45, 40];
const FAMS = ['g-fretting', 'g-scales', 'g-arps', 'g-picking'];
const KEYS = [0, 5, 7];
/** Hand positions over the takes (index-finger fret): mostly 5th position, sometimes 4th / 6th. */
const POS = [5, 5, 6, 5, 4, 5];

/** One position drill: every string, frets p … p+3, one finger per fret. */
function drillAt(t: number): Drill {
  const p = POS[t % POS.length];
  const notes: ExpNote[] = [];
  let beat = 0;
  for (let str = 6; str >= 1; str--)
    for (let f = p; f <= p + 3; f++) notes.push({ pitch: OPEN[str - 1] + f, beat: (beat++) * 0.5, dur: 0.5, hand: 'R', string: str, fret: f, finger: f - p + 1 });
  return { spec: { family: FAMS[t % FAMS.length], kind: 'pos', key: KEYS[Math.floor(t / FAMS.length) % KEYS.length], hands: 'R', instrument: 'guitar' }, notes, beats: beat * 0.5, meter: 4 } as unknown as Drill;
}
/** Deterministic "random" in 0 … 99. */
const rnd = (t: number, i: number) => (t * 31 + i * 17 + ((t * i) % 7) * 13) % 100;

/** A model fed with takes where a miss follows the fretting finger 3, or the places (frets 7 on strings 1–4, 8 on 5–6). */
function feed(rule: 'finger' | 'place', takes = 48): PlayerModel {
  let model = emptyModel();
  const badPlace = (n: ExpNote) => (n.fret === 7 && n.string! <= 4) || (n.fret === 8 && n.string! >= 5);
  for (let t = 0; t < takes; t++) {
    const d = drillAt(t);
    const perNote = d.notes.map((n, i) => {
      const bad = rule === 'finger' ? n.finger === 3 : badPlace(n);
      return { exp: n, played: { pitch: n.pitch, on: i * 250, off: null, vel: 64 }, dev: 0, ok: rnd(t, i) >= (bad ? 50 : 4) };
    });
    model = addTake(model, d, { perNote } as unknown as TakeMetrics, 80, `2026-11-${10 + (t % 7)}T10:00:00Z`);
  }
  return model;
}

describe('guitar: string / fret vs finger (long-term only)', () => {
  it('notes keep their place and suggested finger in their own contexts (never the piano f:)', () => {
    const m = feed('finger', 2);
    expect(Object.keys(m.stats).some((k) => k.startsWith('f:'))).toBe(false);
    expect(m.stats['gp:3:6']).toBeDefined();
    expect(m.stats['gpf:2:3:6']).toBeDefined();
    expect(Object.keys(m.stats).some((k) => k.startsWith('gfx:3:g-fretting:'))).toBe(true);
  });

  it('misses that follow the finger across strings and frets → "possibly finger 3"', () => {
    const hs = guitarFingerHypotheses(feed('finger'));
    expect(hs.map((h) => h.ctx)).toEqual(['gf:R3']);
    expect(hs[0].hypothesis).toBe(true);
    expect(hs[0].text.he).toMatch(/^ייתכן שזו אצבע 3: /);
    expect(hs[0].text.en).toMatch(/^Possibly finger 3: /);
    // the strings range is isolated left-to-right inside the Hebrew line
    expect(hs[0].text.he).toContain('⁦1–6⁩');
    expect(findings(feed('finger')).some((f) => f.kind === 'finger-hypothesis' && f.ctx === 'gf:R3')).toBe(true);
  });

  it('misses that follow the place (other fingers miss there too) → the places as facts, no finger', () => {
    const m = feed('place');
    expect(guitarFingerHypotheses(m)).toEqual([]);
    const ps = weakPlaces(m).map((f) => f.ctx);
    expect(ps).toEqual(expect.arrayContaining(['gp:1:7', 'gp:4:7', 'gp:5:8']));
    expect(weakPlaces(m).find((f) => f.ctx === 'gp:1:7')!.text.he).toMatch(/^מיתר 1, סריג 7 מחטיא/);
    expect(findings(m).some((f) => f.kind === 'finger-hypothesis')).toBe(false);
  });

  it('too few samples → no claim', () => {
    expect(guitarFingerHypotheses(feed('finger', 4))).toEqual([]);
  });

  it('one place only (or one string and fret) is never enough for a finger', () => {
    // finger 3 misses only on string 2, fret 7
    let model = emptyModel();
    for (let t = 0; t < 48; t++) {
      const d = drillAt(t);
      const perNote = d.notes.map((n, i) => ({ exp: n, played: { pitch: n.pitch, on: i * 250, off: null, vel: 64 }, dev: 0, ok: rnd(t, i) >= (n.finger === 3 && n.string === 2 && n.fret === 7 ? 90 : 4) }));
      model = addTake(model, d, { perNote } as unknown as TakeMetrics, 80, '2026-11-12T10:00:00Z');
    }
    expect(guitarFingerHypotheses(model)).toEqual([]);
  });

  it('own fingering: no finger is named', () => {
    expect(guitarFingerHypotheses({ ...feed('finger'), ownFingering: true })).toEqual([]);
  });
});
