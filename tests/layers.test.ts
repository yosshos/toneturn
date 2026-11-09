import { describe, expect, it } from 'vitest';
import { layerGain, layerOf, RoundRobin, wurliGain } from '../src/audio/layers';
import { barGain, partials, REGISTRATIONS } from '../src/audio/organ';
import { barkIndex, tineT60 } from '../src/audio/epiano';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const man = JSON.parse(readFileSync(join(__dirname, '..', 'public', 'samples', 'manifest.json'), 'utf8')).sets as Record<string, { pieces?: Record<string, { layers: string[][]; db: number[] }>; layers?: { dyn: string; notes: number[]; rr: number; db: number }[]; notes: (number | string)[] }>;

describe('multi-sampled band instruments', () => {
  it('layers by velocity and a level that rises smoothly across layers', () => {
    expect(layerOf(0, 4)).toBe(0);
    expect(layerOf(0.5, 4)).toBe(2);
    expect(layerOf(1, 4)).toBe(3);
    const dbs = [-40, -30, -22, -15];
    let prev = -Infinity;
    for (let v = 0; v <= 1.0001; v += 0.01) {
      const i = layerOf(v, 4);
      const db = dbs[i] + 20 * Math.log10(layerGain(v, dbs, i));
      expect(db).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = db;
    }
  });
  it('alternate strikes never repeat back to back', () => {
    const rr = new RoundRobin();
    let last = -1;
    for (let k = 0; k < 200; k++) {
      const i = rr.pick('snare:2', 4);
      expect(i).not.toBe(last);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(4);
      last = i;
    }
  });
  it('the jazz kit has every piece with layers that get louder; the bass has three dynamics × four strikes', () => {
    const kit = man['drums-jazz'].pieces!;
    for (const p of ['kick', 'snare', 'rim', 'hat', 'hat-foot', 'hat-open', 'ride', 'ride-bell', 'crash', 'tom-hi', 'tom-lo']) {
      expect(kit[p].layers.length, p).toBeGreaterThanOrEqual(3);
      for (let i = 1; i < kit[p].db.length; i++) expect(kit[p].db[i], p).toBeGreaterThan(kit[p].db[i - 1]);
    }
    const bass = man['bass-pizz'].layers!;
    expect(bass.map((l) => l.dyn)).toEqual(['p', 'm', 'f']);
    for (const l of bass) expect(l.rr).toBe(4);
    expect(bass[2].db).toBeGreaterThan(bass[0].db);
  });
  it('the Wurlitzer touch curve spans about 24 dB', () => {
    expect(20 * Math.log10(wurliGain(127))).toBeCloseTo(0);
    expect(20 * Math.log10(wurliGain(1))).toBeLessThan(-22);
    expect(wurliGain(90)).toBeGreaterThan(wurliGain(40));
  });
});

describe('modelled keys', () => {
  it('organ: drawbars in 3 dB steps, registrations make partials below the foldback', () => {
    expect(barGain(8)).toBe(1);
    expect(20 * Math.log10(barGain(7))).toBeCloseTo(-3);
    expect(barGain(0)).toBe(0);
    for (const r of REGISTRATIONS) for (const p of partials(1000, r.bars)) expect(p.f).toBeLessThanOrEqual(6000);
    expect(partials(220, [8, 8, 8, 0, 0, 0, 0, 0, 0]).map((p) => p.f)).toEqual([110, 330, 220]);
  });
  it('electric piano: harder = more bark, low tines ring longer', () => {
    expect(barkIndex(1)).toBeGreaterThan(barkIndex(0.3));
    expect(tineT60(36)).toBeGreaterThan(tineT60(84));
  });
});
