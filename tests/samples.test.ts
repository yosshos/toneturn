import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { grandTargetDb } from '../src/audio/piano';
import { chartBacking, parseChart } from '../src/engine/charts';
import { backingTrack } from '../src/engine/perform';

const dir = join(__dirname, '..', 'public', 'samples');
const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as {
  credits: Record<string, string>;
  sets: Record<string, { ext: string; notes: number[] }>;
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
  it('has the grand velocity layers and the bass, with credits', () => {
    for (const l of ['pp', 'mp', 'mf', 'f']) expect(manifest.sets[`grand-${l}`].notes).toEqual(manifest.sets.grand.notes);
    const bass = manifest.sets.bass.notes;
    expect(Math.min(...bass)).toBeLessThanOrEqual(28);
    expect(Math.max(...bass)).toBeGreaterThanOrEqual(55);
    expect(manifest.credits.grand).toMatch(/CC BY 3\.0/);
    expect(manifest.credits.bass).toMatch(/CC0/);
  });
  it('the whole grand (all layers) stays under 10 MB', () => {
    let bytes = 0;
    for (const id of ['grand', 'grand-pp', 'grand-mp', 'grand-mf', 'grand-f'])
      for (const m of manifest.sets[id].notes) bytes += statSync(join(dir, id, `${m}.mp3`)).size;
    expect(bytes).toBeLessThan(10e6);
  });
  it('loudness rises with velocity, smoothly', () => {
    let prev = -Infinity;
    for (let v = 0; v <= 1.0001; v += 0.01) {
      const db = grandTargetDb(v);
      expect(db).toBeGreaterThan(prev);
      if (prev > -Infinity) expect(db - prev).toBeLessThan(0.5);
      prev = db;
    }
    expect(grandTargetDb(0.675)).toBeCloseTo(0);
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
