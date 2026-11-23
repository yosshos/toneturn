// BUILD-PLAN-2026-11 phase 7, matrix breadth: the Aeolian inside every major key (from its 6th degree), the guitar and
// bass ladders, then melodic minor and the modes from the root behind the tier. Guard tests: ids kept, the Aeolian's
// spelling in all 12 keys, the new ladders in all 12 keys, beginners never see the later rungs, everything connects.

import { describe, expect, it } from 'vitest';
import '../src/engine/topics';
import { families, levelDrills, specDrills } from '../src/engine/drills/plan';
import { itemIdOf } from '../src/engine/drills/generate';
import { cellItemIds, cellKey, keyMatrix, type MatrixCell } from '../src/engine/drills/keyMatrix';
import { AEOLIAN_FROM_TIER, keyLadder, ladderRungs, laterRungs, MELODIC_FROM_TIER, MODES_FROM_TIER, openKeyRungs, rungIdOf, type LadderInst } from '../src/engine/drills/keyIndex';
import { H_SCALES, hSig, hTonic, spellH } from '../src/engine/drills/harmLadder';
import { lickRun } from '../src/engine/drills/keyLicks';
import { todayTechPlan } from '../src/engine/drills/todayPlan';
import { todayTech, matrixInst } from '../src/ui/todayTech';
import { analyzeTake, expTimeMs } from '../src/engine/drills/analyze';
import { drillEvents, drillXp } from '../src/engine/drills/events';
import { stepCatalogue } from '../src/engine/path';
import { bassStrands, guitarStrands, pianoStrands } from '../src/engine/drills/levelTest';
import type { Drill, DrillSettings, PlayedNote } from '../src/engine/drills/types';

const INSTS: LadderInst[] = ['piano', 'guitar', 'bass'];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
/** The major key's name as its signature spells it (C, D♭, D, E♭, E, F, G♭, G, A♭, A, B♭, B). */
const MAJ_NAME = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const SIG_NAME: Record<string, string> = { C: 'C', G: 'G', D: 'D', A: 'A', E: 'E', B: 'B', 'F#': 'F♯', 'C#': 'C♯', F: 'F', Bb: 'B♭', Eb: 'E♭', Ab: 'A♭', Db: 'D♭', Gb: 'G♭', Cb: 'C♭' };
const firstDrill = (c: MatrixCell): Drill => specDrills(c.level, 0, 'fifths-up')[0];
const allDrills = (c: MatrixCell): Drill[] => c.level.specs.flatMap((_, k) => specDrills(c.level, k, 'fifths-up'));
const later = (c: MatrixCell) => c.mode === 'melodic' || ['dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian'].includes(c.mode ?? '');

describe('ids kept', () => {
  it('the rows and their own rungs are unchanged: same cell keys, same item ids; the later rungs only add', () => {
    const fams = families('piano');
    const cells = keyMatrix(fams, 3, {});
    const own = cells.filter((c) => !c.mode);
    // the cell keys of phase 2 (group:root:rung) are all there, untagged
    for (const k of ['major:0:scales-3', 'major:0:k-sharm-3', 'major:7:k-keylick-1', 'minor:9:k-sharm-4', 'minor:9:scales-5', 'major:2:cadences-2']) expect(own.map(cellKey)).toContain(k);
    // the own rows' rung ids are exactly the ladder's (tagless) — the later ones carry a tag
    // (block R's hear-and-continue rung is tagged too: the same level heard first, its own items — SPEC-EAR-AND-READING §3.1)
    for (const c of cells) expect(!!c.mode || c.rung.startsWith('hc:')).toBe(c.rung.includes(':'));
    // still 24 rows at T3 (the Aeolian lives inside the major rows, not as a new key family)
    expect(new Set(cells.map((c) => `${c.group}-${c.root}`)).size).toBe(24);
    // an own cell's items are the catalogue level's items in that key (k-sharm-3: the major option only)
    const k3 = own.find((c) => c.root === 0 && c.rung === 'k-sharm-3')!;
    expect(cellItemIds(k3)).toEqual(['k-sharm:hl-3b:0:R:op0']);
    // the approach-lick levels 1–15 kept their ids and their items; 16–20 are appended
    const kl = fams.find((f) => f.id === 'k-keylick')!;
    expect(kl.levels.map((l) => l.id).slice(0, 15)).toEqual(Array.from({ length: 15 }, (_, i) => `k-keylick-${i + 1}`));
    expect(kl.levels).toHaveLength(20);
    expect(levelDrills(kl.levels[0], 'fifths-up').filter((d) => d.spec.key === 0).map((d) => d.itemId).sort()).toEqual(['k-keylick:kl-1-1-down:0:L:m:op7', 'k-keylick:kl-1-1-down:0:L:op0', 'k-keylick:kl-1-1-down:0:R:m:op7', 'k-keylick:kl-1-1-down:0:R:op0', 'k-keylick:kl-1-1-up:0:L:m:op7', 'k-keylick:kl-1-1-up:0:L:op0', 'k-keylick:kl-1-1-up:0:R:m:op7', 'k-keylick:kl-1-1-up:0:R:op0']);
  }, 180000);
  it('a later cell is a stable identity: tag:level in its row, its level id tagged, the same across builds', () => {
    const a = keyMatrix(families('piano'), 4, {}).filter((c) => c.mode);
    const b = keyMatrix(families('piano'), 4, {}, { day: '2026-12-01' }).filter((c) => c.mode);
    expect(a.map(cellKey)).toEqual(b.map(cellKey));
    const ae = a.find((c) => c.root === 0 && c.rung === 'aeolian:k-sharm-3')!;
    expect(ae.level.id).toBe('key-0-aeolian-k-sharm-3');
    expect(new Set(a.map(cellKey)).size).toBe(a.length);
  }, 180000);
});

describe('the Aeolian inside the major key (from its 6th degree)', () => {
  it('in all 12 keys: the tonic is the major key’s 6th degree, the signature is the major key’s, the items are the catalogue’s', () => {
    for (const inst of ['piano', 'guitar'] as const) {
      const cells = keyMatrix(families(inst), 3, {}, { instrument: inst });
      for (let r = 0; r < 12; r++) {
        const row = cells.filter((c) => c.group === 'major' && c.root === r);
        const warm = row.find((c) => c.block === 'W')!;
        const ae = row.filter((c) => c.mode === 'aeolian');
        expect(ae.length, `${inst} ${r}`).toBeGreaterThan(2);
        const rel = (r + 9) % 12;
        const sixth = spellH(MAJ_NAME[r], MAJOR)[5];
        for (const c of ae) {
          expect(c.level.keys).toEqual([rel]);
          expect(c.rung.startsWith('aeolian:')).toBe(true);
          for (const d of allDrills(c)) {
            // the staff's signature = the relative major's (A Aeolian in C: no sharps or flats)
            expect(d.keySig, `${inst} ${r} ${d.itemId}`).toBe(firstDrill(warm).keySig);
            if (/aeolian/.test(d.title.en)) expect(d.title.en.startsWith(`${sixth} `), `${d.title.en} / ${sixth}`).toBe(true);
          }
        }
        // the spelled Aeolian has exactly the major key's notes (E♭ minor in G♭ major, G♯ minor in B major …)
        const aeol = spellH(hTonic(rel, H_SCALES[5]), H_SCALES[5].ints);
        expect(new Set(aeol)).toEqual(new Set(spellH(MAJ_NAME[r], MAJOR)));
        expect(SIG_NAME[hSig(rel, H_SCALES[5])]).toBe(MAJ_NAME[r]);
      }
    }
  }, 180000);
  it('the approach licks in the Aeolian: every shape note is a note of the relative major, spelled as it spells it', () => {
    for (let r = 0; r < 12; r++) {
      const rel = (r + 9) % 12;
      const maj = new Set(spellH(MAJ_NAME[r], MAJOR));
      for (const shape of ['3', 't', '7'] as const)
        for (const dir of ['up', 'down'] as const) for (const seg of lickRun(rel, H_SCALES[5], '1', shape, dir, 57 + rel)) for (const n of seg.shape) expect(maj.has(n.name), `${r} ${n.name}`).toBe(true);
    }
  }, 180000);
  it("the Aeolian's cells use the catalogue's own items (k-sharm option 5, natural minor scales, k-keylick 16–18)", () => {
    const c = keyMatrix(families('piano'), 3, {}).find((x) => x.root === 3 && x.rung === 'aeolian:k-sharm-3')!;
    expect(cellItemIds(c)).toEqual([itemIdOf({ family: 'k-sharm', kind: 'hl-3b', key: 0, hands: 'R', option: 5 })]);
  }, 180000);
});

describe('the modes from the root and melodic minor: spelled properly in every key', () => {
  it('each of the seven modes in all 12 keys: one letter per degree, no double accidentals, the signature its parent major’s', () => {
    for (let m = 0; m < 7; m++)
      for (let k = 0; k < 12; k++) {
        const sc = H_SCALES[m];
        const ns = spellH(hTonic(k, sc), sc.ints);
        expect(ns.join(''), `${sc.id} ${k}`).not.toMatch(/[𝄫𝄪?]/u);
        expect(new Set(ns.map((n) => n[0])).size).toBe(7);
        expect(ns.filter((n) => n.length > 1).length).toBeLessThanOrEqual(6);
        const parent = SIG_NAME[hSig(k, sc)];
        expect(new Set(spellH(parent, MAJOR)), `${sc.id} ${k} ${parent}`).toEqual(new Set(ns));
      }
  }, 180000);
  it('a mode cell’s drills carry the mode’s signature (G♯ dorian in F♯, F♯ mixolydian in B)', () => {
    const cells = keyMatrix(families('piano'), 5, {});
    const dor = cells.find((c) => c.root === 8 && c.rung === 'dorian:k-sharm-11')!;
    expect(firstDrill(dor).keySig).toBe('F#');
    expect(firstDrill(dor).title.en.startsWith('G♯ dorian')).toBe(true);
    const mix = cells.find((c) => c.root === 6 && c.rung === 'mixolydian:k-keylick-19')!;
    expect(firstDrill(mix).keySig).toBe('B');
    expect(firstDrill(mix).title.en.startsWith('F♯ mixolydian')).toBe(true);
  }, 180000);
});

describe('the guitar and bass ladders', () => {
  it('every rung resolves to a catalogue level with items (no silent gaps), on every instrument and row', () => {
    for (const inst of INSTS) {
      const fams = families(inst);
      for (const g of ['major', 'minor'] as const)
        for (const r of [...ladderRungs(g, inst), ...laterRungs(g, inst)]) {
          const l = fams.find((f) => f.id === r.fam)?.levels.find((x) => x.id === r.id);
          expect(l, `${inst} ${g} ${rungIdOf(r)}`).toBeTruthy();
          expect((r.pick ? l!.specs.filter(r.pick) : l!.specs).length, `${inst} ${g} ${rungIdOf(r)}`).toBeGreaterThan(0);
        }
      // the warm-up scale resolves at every tier
      for (let t = 0; t <= 7; t++) for (const g of ['major', 'minor'] as const) expect(openKeyRungs(fams, 4, g, t, { instrument: inst }).warm, `${inst} ${g} T${t} warm-up`).toBeTruthy();
    }
  }, 180000);
  it('cells in all 12 keys at every tier (minor rows from T2), every cell one key, the same rungs in every key', () => {
    for (const inst of ['guitar', 'bass'] as const)
      for (const t of [0, 2, 6]) {
        const cells = keyMatrix(families(inst), t, {}, { instrument: inst });
        expect(new Set(cells.filter((c) => c.group === 'major').map((c) => c.root)).size, `${inst} T${t}`).toBe(12);
        expect(cells.some((c) => c.group === 'minor')).toBe(t >= 2);
        if (t >= 2) expect(new Set(cells.filter((c) => c.group === 'minor').map((c) => c.root)).size).toBe(12);
        for (const c of cells) expect(c.level.keys).toHaveLength(1);
        const per = (r: number) => cells.filter((c) => c.group === 'major' && c.root === r).map((c) => c.rung).join(',');
        for (let r = 1; r < 12; r++) expect(per(r)).toBe(per(0));
        // every rung's drills are the instrument's own (no piano item on the guitar)
        for (const c of cells.filter((x) => x.root === 5)) for (const d of allDrills(c)) expect(d.spec.family.startsWith(inst === 'guitar' ? 'g-' : 'b-'), d.itemId).toBe(true);
      }
  }, 180000);
  it('the rung structure mirrors the keys ladder: a warm-up, the spine (S) and the other blocks', () => {
    for (const inst of ['guitar', 'bass'] as const) {
      const cells = keyMatrix(families(inst), 6, {}, { instrument: inst, jazz: true }).filter((c) => c.group === 'major' && c.root === 0 && !c.mode);
      const blocks = new Set(cells.map((c) => c.block));
      for (const b of ['W', 'A', 'S', 'B', 'D', 'E', 'F']) expect(blocks.has(b as MatrixCell['block']), `${inst} ${b}`).toBe(true);
      // the continuous session in a key on this instrument: the warm-up, the spine, a closing visit
      const lad = keyLadder(families(inst), 0, 'major', 3, {}, { instrument: inst })!;
      expect(lad.levels.length).toBeGreaterThan(4);
      expect(lad.levels.at(-1)!.id.endsWith('-again')).toBe(true);
    }
  }, 180000);
  it('drums have no key ladder (their 70/30 is technique / grooves, fills, trading)', () => {
    expect(matrixInst('drums')).toBeNull();
    expect(matrixInst('voice')).toBeNull();
    expect(matrixInst('guitar')).toBe('guitar');
    expect(matrixInst(undefined)).toBe('piano');
  }, 180000);
});

describe('behind the tier', () => {
  it('a beginner never gets melodic minor or the modes; the Aeolian from T1; a jazz focus never opens them earlier', () => {
    for (const inst of INSTS)
      for (const jazz of [false, true]) {
        // the rows are built the same in every key: two keys of each group stand for the matrix
        const rows = (t: number) => [0, 7].flatMap((r) => (['major', 'minor'] as const).flatMap((g) => openKeyRungs(families(inst), r, g, t, { instrument: inst, jazz }).built.map((b) => ({ g, mode: b.rung.mode }))));
        for (const t of [0, 1, 2, 3]) {
          const rs = rows(t);
          expect(rs.filter((x) => x.mode && x.mode !== 'aeolian'), `${inst} T${t} jazz ${jazz}`).toHaveLength(0);
          expect(rs.some((x) => x.mode === 'aeolian')).toBe(t >= AEOLIAN_FROM_TIER);
        }
        const t4 = rows(Math.max(MELODIC_FROM_TIER, MODES_FROM_TIER));
        expect(t4.some((x) => x.mode === 'melodic' && x.g === 'minor'), inst).toBe(true);
        expect(t4.some((x) => x.mode === 'dorian' && x.g === 'major'), inst).toBe(true);
        expect(t4.filter((x) => x.mode === 'melodic').every((x) => x.g === 'minor')).toBe(true);
        expect(t4.filter((x) => x.mode && x.mode !== 'melodic').every((x) => x.g === 'major')).toBe(true);
      }
    // and in the built matrix (T3: nothing later than the Aeolian)
    expect(keyMatrix(families('piano'), 3, {}, { jazz: true }).filter(later)).toHaveLength(0);
  }, 180000);
  it('the continuous key session takes at most one later rung a session', () => {
    const lad = keyLadder(families('piano'), 2, 'major', 5, {})!;
    expect(lad.levels.filter((l) => /^key-2-(aeolian|dorian|phrygian|lydian|mixolydian|locrian)-/.test(l.id)).length).toBeLessThanOrEqual(1);
  }, 180000);
});

describe('everything connects (XP, league, path, level test, workout) for the new cells', () => {
  it('path and level test: every new cell’s items are catalogue items (their levels are path steps; the families are placed by the level test)', () => {
    const steps = new Set(stepCatalogue().map((s) => s.id));
    for (let n = 16; n <= 20; n++) expect(steps.has(`tech:k-keylick-${n}`), `k-keylick-${n}`).toBe(true);
    const diff = stepCatalogue().filter((s) => /^tech:k-keylick-\d+$/.test(s.id)).sort((a, b) => Number(a.id.split('-').pop()) - Number(b.id.split('-').pop())).map((s) => s.difficulty);
    for (let i = 1; i < diff.length; i++) expect(diff[i]).toBeGreaterThanOrEqual(diff[i - 1]);
    const strands: Record<LadderInst, ReturnType<typeof guitarStrands>> = { piano: pianoStrands('jazz'), guitar: guitarStrands(), bass: bassStrands() };
    for (const inst of INSTS) {
      const fams = families(inst);
      for (const r of [0, 6])
        for (const g of ['major', 'minor'] as const)
          for (const b of openKeyRungs(fams, r, g, 6, { instrument: inst, jazz: true }).built.filter((x) => x.rung.mode || inst !== 'piano')) {
            const src = fams.find((f) => f.id === b.rung.fam)!.levels.find((l) => l.id === b.rung.id)!;
            const cat = new Set(levelDrills(src, 'fifths-up').map((d) => d.itemId));
            for (const id of cellItemIds({ level: b.lvl })) expect(cat.has(id), `${inst} ${g} ${r} ${rungIdOf(b.rung)} ${id}`).toBe(true);
          }
      const placed = new Set(strands[inst].flatMap((s) => s.rungs.flatMap((r) => Object.keys(r.places))));
      // the spine's families are placed by the level test on every instrument
      for (const f of inst === 'piano' ? ['k-sharm', 'scales', 'k-keylick'] : inst === 'guitar' ? ['g-harm', 'g-scales'] : ['b-chord', 'b-scale']) expect(placed.has(f), `${inst} ${f}`).toBe(true);
    }
  }, 180000);
  it('XP and the league: a take on a new cell earns XP and tags a skill (the league counts XP)', () => {
    const play = (d: Drill): PlayedNote[] => d.notes.map((n) => ({ pitch: n.pitch, on: expTimeMs(d, n.beat, 70), off: expTimeMs(d, n.beat + n.dur * 0.9, 70), vel: 80 }));
    const picks: [LadderInst, string, number][] = [['piano', 'aeolian:k-keylick-16', 4], ['piano', 'dorian:k-keylick-19', 4], ['piano', 'aeolian:k-sharm-7', 4], ['guitar', 'aeolian:g-harm-4', 4], ['bass', 'aeolian:b-chord-16', 4]];
    for (const [inst, rung, t] of picks) {
      const c = keyMatrix(families(inst), t, {}, { instrument: inst }).find((x) => x.root === 2 && x.rung === rung)!;
      expect(c, `${inst} ${rung}`).toBeTruthy();
      const d = firstDrill(c);
      const m = analyzeTake(d, 70, play(d));
      expect(drillXp(m)).toBeGreaterThan(0);
      const tags = drillEvents(d, m, '2026-11-22T10:00:00.000Z', 's', 0).flatMap((e) => (e.tags ?? []).map((x) => x.skill));
      expect(tags.length, `${inst} ${rung}`).toBeGreaterThan(0);
    }
    const mel = keyMatrix(families('piano'), 4, {}).find((x) => x.group === 'minor' && x.rung === 'melodic:k-keylick-20')!;
    const md = firstDrill(mel);
    expect(drillEvents(md, analyzeTake(md, 70, play(md)), '2026-11-22T10:00:00.000Z', 's', 0).length).toBeGreaterThan(0);
  }, 180000);
  it('the workout: the guitar and the bass get today’s technique cells from their matrix (piano unchanged)', () => {
    for (const inst of ['guitar', 'bass'] as const) {
      const ds = { instrument: inst, keyOrder: 'fifths-up', emphasis: 'pop' } as unknown as DrillSettings;
      const tt = todayTech({ settings: { courseStart: { [inst]: { report: 'well' } } } as never, ds, items: {}, minutes: 20, day: '2026-11-22' });
      expect(tt, inst).toBeTruthy();
      expect(tt!.plan.length).toBeGreaterThan(0);
      for (const p of tt!.plan) expect(p.cell.level.specs.every((s) => (s.family as string).startsWith(inst === 'guitar' ? 'g-' : 'b-'))).toBe(true);
    }
    expect(todayTech({ settings: {} as never, ds: { instrument: 'drums', keyOrder: 'fifths-up' } as unknown as DrillSettings, items: {}, minutes: 20, day: '2026-11-22' })).toBeNull();
    // the key of the week's cells include the Aeolian in teaching order after the key's own
    const cells = keyMatrix(families('piano'), 3, {});
    const plan = todayTechPlan(cells, { minutes: 600, weekRoot: 5, view: 'key' });
    const wk = plan.filter((p) => p.why === 'week').map((p) => p.cell);
    expect(wk.some((c) => c.mode === 'aeolian')).toBe(true);
    const firstAe = wk.findIndex((c) => c.mode === 'aeolian');
    expect(wk.slice(0, firstAe).every((c) => !c.mode)).toBe(true);
  }, 180000);
});
