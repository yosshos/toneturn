import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { damperTau, layerFor, loadOrder, nearestLoaded, releaseNoiseGain, releaseResGain, targetDb, type GrandLayer } from '../src/audio/grand';
import { chartBacking, parseChart } from '../src/engine/charts';
import { backingTrack } from '../src/engine/perform';

const dir = join(__dirname, '..', 'public', 'samples');
const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as {
  credits: Record<string, string>;
  sets: Record<string, { ext: string; notes: number[]; lovel?: number; db?: number }>;
};

describe('instrument samples', () => {
  it('every file the manifest lists exists and is not empty', () => {
    for (const [id, set] of Object.entries(manifest.sets))
      for (const m of set.notes) {
        const f = join(dir, id, `${m}.${set.ext}`);
        expect(existsSync(f), f).toBe(true);
        expect(statSync(f).size, f).toBeGreaterThan(1000);
      }
  });
  it('has the 16 grand velocity layers, its release sounds and the bass, with credits', () => {
    const layers = Object.keys(manifest.sets).filter((k) => /^grand-v\d\d$/.test(k)).sort();
    expect(layers.length).toBe(16);
    const lovel = layers.map((k) => manifest.sets[k].lovel!);
    expect(lovel[0]).toBe(1);
    for (let i = 1; i < 16; i++) expect(lovel[i]).toBeGreaterThan(lovel[i - 1]);
    for (let i = 1; i < 16; i++) expect(manifest.sets[layers[i]].db!).toBeGreaterThan(manifest.sets[layers[i - 1]].db!);
    for (const k of layers) expect(manifest.sets[k].notes.length).toBe(30);
    expect(manifest.sets['grand-rel'].notes.length).toBe(88);
    expect(manifest.sets['grand-resL'].notes.length).toBe(23);
    expect(manifest.sets['grand-pedal'].notes).toEqual([1, 2, 3, 4]);
    for (const old of ['grand-pp', 'grand-mp', 'grand-mf', 'grand-f']) expect(manifest.sets[old]).toBeUndefined();
    const bass = manifest.sets.bass.notes;
    expect(Math.min(...bass)).toBeLessThanOrEqual(28);
    expect(Math.max(...bass)).toBeGreaterThanOrEqual(55);
    expect(manifest.credits.grand).toMatch(/CC BY 3.0/);
    expect(manifest.credits.bass).toMatch(/CC0/);
  });
  it('a layer stays a sensible download (under 4 MB), the whole grand under 70 MB', () => {
    let all = 0;
    for (const id of Object.keys(manifest.sets).filter((k) => k.startsWith('grand'))) {
      let bytes = 0;
      for (const m of manifest.sets[id].notes) bytes += statSync(join(dir, id, `${m}.mp3`)).size;
      expect(bytes, id).toBeLessThan(4e6);
      all += bytes;
    }
    expect(all).toBeLessThan(70e6);
  });
  it('loudness rises with velocity, smoothly, and a missing layer is stood in for by its neighbour', () => {
    const L: GrandLayer[] = Object.keys(manifest.sets).filter((k) => /^grand-v\d\d$/.test(k)).sort().map((id) => ({ id, lovel: manifest.sets[id].lovel!, db: manifest.sets[id].db! }));
    let prev = -Infinity;
    for (let v = 1; v <= 127; v++) {
      const db = targetDb(L, v);
      expect(db).toBeGreaterThanOrEqual(prev);
      if (prev > -Infinity) expect(db - prev).toBeLessThan(1.2);
      prev = db;
    }
    expect(layerFor(L, 1)).toBe(0);
    expect(layerFor(L, 64)).toBe(7);
    expect(layerFor(L, 127)).toBe(15);
    expect(nearestLoaded(16, 7, (i) => i === 9 || i === 4)).toBe(9);
    expect(nearestLoaded(16, 7, () => false)).toBe(-1);
    expect(loadOrder(16, true).length).toBe(8);
    expect(new Set(loadOrder(16, false)).size).toBe(16);
  });
  it('dampers by register; release sounds fade with how long the key was held', () => {
    expect(damperTau(30)).toBeGreaterThan(damperTau(80));
    expect(damperTau(95)).toBe(Infinity);
    expect(releaseResGain(-4, 7, 3, 100)).toBeLessThan(releaseResGain(-4, 7, 0.2, 100));
    expect(releaseNoiseGain(127)).toBeGreaterThan(releaseNoiseGain(20));
  });
});

describe('backing tracks play their bass lines on the bass', () => {
  it('perform.backingTrack: one bass note per beat, all low', () => {
    const t = backingTrack('blues', 0, 120, 1, { countIn: false });
    const bass = t.events.filter((e) => e.inst === 'bass');
    expect(bass.length).toBe(48);
    expect(bass.every((e) => e.midi < 56 && !e.perc)).toBe(true);
  });
  it('charts.chartBacking: every style marks its bass, never chords or drums', () => {
    const p = parseChart('C | Am | Dm7 | G7');
    for (const style of ['swing', 'pop', 'rock', 'bossa', 'ballad', 'waltz'] as const) {
      const ev = chartBacking(p, style, 120, 1).events;
      const bass = ev.filter((e) => e.inst === 'bass');
      expect(bass.length, style).toBeGreaterThan(0);
      expect(bass.every((e) => e.midi < 56 && !e.perc), style).toBe(true);
    }
  });
});

describe('instruments with recorded dynamics (0.58)', () => {
  it('vibraphone, marimba and upright: each layer louder than the one below, notes across the range', () => {
    for (const sets of [['vibes-1', 'vibes-2', 'vibes-4'], ['marimba-1', 'marimba-2', 'marimba-3'], ['upright-1', 'upright-2', 'upright-3']]) {
      for (let i = 1; i < sets.length; i++) expect(manifest.sets[sets[i]].db!, sets[i]).toBeGreaterThan(manifest.sets[sets[i - 1]].db!);
      for (const s of sets) expect(manifest.sets[s].notes.length, s).toBeGreaterThanOrEqual(9);
    }
  });
});
