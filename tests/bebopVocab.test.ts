// Bebop vocabulary (docs/AUDIT-GAPS-2.md High #1, #2, #3, #7, #8, #10; Medium #9): the notes are exact (approach notes,
// every enclosure type, the targets on the beats, 3–♭9, "make it minor", the triplet rules, digital patterns, lines over
// forms), every new level spans the 12 keys on piano, guitar and bass, new items start in free time while the time items
// keep their click, a steady take passes and a wrong note does not, and everything is wired (path, glyphs, badges,
// lessons, ear level, coach tip, level test, tags).
import { describe, expect, it } from 'vitest';
import {
  LEAD_ITEMS, LINE_FORMS, TIME_ITEMS, VQ_DEF, cell3b9, digitalLine, formLine, heldLine, leadIn, leadItemLine, makeItMinor, mod12, scaleAbove, targetLine, tripletLine, type VN,
} from '../src/engine/bebopVocab';
import { catalog, generate, type LevelDef } from '../src/engine/drills/generate';
import { guitarCatalog, rng as grng } from '../src/engine/drills/guitar';
import { levelDrills, levelKeys, shownFamilies, targetBpmOf } from '../src/engine/drills/plan';
import { analyzeTake, expTimeMs, npsOf, tempoBand, thresholds, IOI_FLOOR_MS } from '../src/engine/drills/analyze';
import { analyzeGuitarTake } from '../src/engine/drills/guitarAnalyze';
import { hasRubato } from '../src/engine/drills/rubato';
import { drillEvents } from '../src/engine/drills/events';
import { pianoStrands, guitarStrands, bassStrands } from '../src/engine/drills/levelTest';
import { stepCatalogue } from '../src/engine/path';
import { FAMILY_GLYPH } from '../src/ui/stepGlyphs';
import { GLYPHS } from '../src/ui/Glyph';
import { BADGES, badgeInCourse } from '../src/engine/badges';
import { MINI_LESSONS, lessonForUnit } from '../src/content/minilessons';
import { TOPIC_GEN } from '../src/engine/topics';
import { revealCoach } from '../src/engine/coach';
import { humanTake, steadySd } from './pianoTake';
import type { Drill, PlayedNote } from '../src/engine/drills/types';

const C_MAJ = [0, 2, 4, 5, 7, 9, 11];
const KVOCAB = () => catalog().find((f) => f.id === 'k-vocab')!;
const GBEBOP = () => guitarCatalog().find((f) => f.id === 'g-bebop')!;
const BBEBOP = () => guitarCatalog().find((f) => f.id === 'b-bebop')!;
const at = (ns: VN[], beat: number) => ns.filter((n) => Math.abs(n.beat - beat) < 1e-6);

describe('approach notes and enclosures: the notes', () => {
  it('a chromatic above-below enclosure of E in C is F, D♯, E — the E on the beat', () => {
    expect(leadIn('enc-ab', 64, C_MAJ)).toEqual([65, 63]);
    const line = heldLine(0, ['enc-ab'], 53, 86);
    const i = line.notes.findIndex((n, k) => k > 0 && mod12(n.p) === 4 && n.ct);
    const e = line.notes[i];
    expect(Number.isInteger(e.beat)).toBe(true);
    expect(line.notes.slice(i - 2, i).map((n) => n.p)).toEqual([e.p + 1, e.p - 1]);
    expect(line.notes.slice(i - 2, i).map((n) => n.beat)).toEqual([e.beat - 1, e.beat - 0.5]);
  });
  it('every type, by its definition', () => {
    expect(leadIn('chr-below', 64, C_MAJ)).toEqual([63]);
    expect(leadIn('chr-above', 64, C_MAJ)).toEqual([65]);
    expect(leadIn('dbl-below', 64, C_MAJ)).toEqual([62, 63]);
    expect(leadIn('dbl-above', 64, C_MAJ)).toEqual([66, 65]);
    // The dominant approach: the 5th above (B into E), or the 4th below when the 5th is out of range.
    expect(leadIn('dominant', 64, C_MAJ)).toEqual([71]);
    expect(leadIn('dominant', 64, C_MAJ, 70)).toEqual([59]);
    expect(leadIn('enc-ba', 64, C_MAJ)).toEqual([63, 65]);
    // Scale step above + half step below: into G, A then F♯; into E the step above is F (a half step).
    expect(leadIn('enc-step', 67, C_MAJ)).toEqual([69, 66]);
    expect(leadIn('enc-step', 64, C_MAJ)).toEqual([65, 63]);
    expect(scaleAbove(71, C_MAJ)).toBe(72);
    // The 4-note bebop enclosure and the delayed resolution.
    expect(leadIn('enc-bebop', 64, C_MAJ)).toEqual([66, 65, 63]);
    expect(leadIn('enc-delayed', 64, C_MAJ)).toEqual([65, 63, 62, 63]);
  });
  it('held chord: every chord tone in turn (1 3 5 7 8 7 5 3 1), each on a beat, the lead-in just before it, no rests', () => {
    for (let key = 0; key < 12; key++)
      for (const op of [0, 1, 4, 5, 6, 8, 9, 11, 16, 17]) {
        const it = LEAD_ITEMS[op];
        const line = leadItemLine(key, op, 53, 86);
        const targets = line.notes.filter((n) => n.ct);
        expect(targets.map((n) => mod12(n.p - key)), `${key} ${op}`).toEqual([0, 4, 7, 11, 0, 11, 7, 4, 0]);
        expect(targets.every((n) => Number.isInteger(n.beat)), `${key} ${op}`).toBe(true);
        expect(targets[4].p - targets[0].p).toBe(12);
        targets.slice(1).forEach((T, k) => {
          const want = leadIn(it.leads[k % it.leads.length], T.p, VQ_DEF.maj7.sc.map((x) => mod12(key + x)), 86);
          const before = line.notes.filter((n) => !n.ct && n.beat < T.beat && n.beat >= T.beat - want.length / 2 - 1e-6);
          expect(before.map((n) => n.p), `${key} ${op} target ${k + 1}`).toEqual(want);
        });
        for (let k = 1; k < line.notes.length; k++) expect(line.notes[k].beat).toBeCloseTo(line.notes[k - 1].beat + line.notes[k - 1].dur, 6);
      }
  });
  it('through ii–V–I: the named chord tone of every chord on beat 1, the lead-in at the end of the bar before', () => {
    for (let key = 0; key < 12; key++)
      LEAD_ITEMS.forEach((it, op) => {
        if (it.ctx === 'held') return;
        const line = targetLine(key, it, 53, 86);
        const prog = it.ctx === 'm251' ? [[2, 'hd7'], [7, '7b9'], [0, 'm6'], [0, 'm6'], [2, 'hd7'], [7, '7b9'], [0, 'm6']] : [[2, 'm7'], [7, '7'], [0, 'maj7'], [0, 'maj7'], [2, 'm7'], [7, '7'], [0, 'maj7']];
        prog.forEach(([d, q], bar) => {
          const ct = VQ_DEF[q as keyof typeof VQ_DEF].ct;
          const T = at(line.notes, bar * 4)[0];
          const want = it.tgt === 'guide' ? [ct[1], ct[3]] : [ct[it.tgt as number]];
          expect(want.map((x) => mod12(Number(d) + key + x)), `${key} op${op} bar${bar}`).toContain(mod12(T.p));
          if (bar > 0) {
            const lead = leadIn(it.leads[(bar - 1) % it.leads.length], T.p, VQ_DEF[q as keyof typeof VQ_DEF].sc.map((x) => mod12(Number(d) + key + x)), 86);
            const before = lead.map((_, k) => at(line.notes, bar * 4 - (lead.length - k) / 2)[0].p);
            expect(before, `${key} op${op} bar${bar}`).toEqual(lead);
          }
        });
        // Between, chord tones on the beats.
        for (const n of line.notes) if (n.ct) expect(Number.isInteger(n.beat * 2)).toBe(true);
      });
  });
});

describe('Barry Harris lines: the notes', () => {
  it('3 to ♭9: over the V, 3–5–7–♭9, and the ♭9 falls a half step to the 5th of I on beat 1', () => {
    for (let key = 0; key < 12; key++)
      for (const op of [0, 1]) {
        const l = cell3b9(key, op, 53, 86);
        const V = mod12(key + 7);
        const cell = l.notes.filter((n) => n.beat >= 6 && n.beat < 8).map((n) => mod12(n.p - V));
        expect(cell, `${key} ${op}`).toEqual([4, 7, 10, 1]);
        const b9 = at(l.notes, 7.5)[0];
        const five = at(l.notes, 8)[0];
        expect(five.p, `${key} ${op}`).toBe(b9.p - 1);
        expect(mod12(five.p - key)).toBe(7);
        for (const n of l.notes) expect(n.p >= 53 && n.p <= 86).toBe(true);
      }
  });
  it('make it minor: over the V only the notes of the minor 6th a 5th above it (Dm6 over G7), landing on the 3rd of I', () => {
    for (let key = 0; key < 12; key++)
      for (const op of [0, 1]) {
        const l = makeItMinor(key, op, 53, 86);
        const m6 = [0, 3, 7, 9].map((x) => mod12(key + 7 + 7 + x));
        const overV = l.notes.filter((n) => n.beat >= 4 && n.beat < 8);
        expect(overV.every((n) => m6.includes(mod12(n.p))), `${key} ${op}`).toBe(true);
        expect(new Set(overV.map((n) => mod12(n.p))).size).toBe(4);
        expect(mod12(at(l.notes, 8)[0].p - key)).toBe(4);
        // Every beat over the V is a chord tone of the V7.
        for (const n of overV) if (Number.isInteger(n.beat)) expect([0, 4, 7, 10].map((x) => mod12(key + 7 + x))).toContain(mod12(n.p));
      }
  });
  it('triplet rules: a chord tone on every beat; triplets go down the scale from the root (op 1: and the 3rd)', () => {
    for (let key = 0; key < 12; key++)
      for (const op of [0, 1]) {
        const l = tripletLine(key, op, 53, 86);
        const chordAt = (b: number) => (op === 1 ? (b < 4 ? [2, 'm7'] : b < 8 ? [7, '7'] : [0, 'maj7']) : b < 8 ? [7, '7'] : [0, 'maj7']) as [number, keyof typeof VQ_DEF];
        const trips = l.notes.filter((n) => Math.abs(n.dur - 1 / 3) < 1e-6 && Number.isInteger(n.beat));
        expect(trips.length, `${key} ${op}`).toBeGreaterThan(0);
        for (const n of l.notes)
          if (Number.isInteger(n.beat)) {
            const [d, q] = chordAt(n.beat);
            expect(VQ_DEF[q].ct.map((x) => mod12(key + d + x)), `${key} ${op} beat ${n.beat}`).toContain(mod12(n.p));
          }
        // Triplets start on a chord tone (the root; on op 1 the 3rd too; into a new chord, the tone that reaches it).
        expect(trips.some((s) => mod12(s.p - key - chordAt(s.beat)[0]) === 0)).toBe(true);
        for (const s of trips) {
          const [d, q] = chordAt(s.beat);
          expect(VQ_DEF[q].ct.map((x) => mod12(key + d + x)), `${key} ${op}`).toContain(mod12(s.p));
          const [a, b, c] = l.notes.filter((n) => n.beat >= s.beat - 1e-6 && n.beat < s.beat + 1 - 1e-6).map((n) => n.p);
          expect(a > b && b > c && a - c <= 4, `${key} ${op}`).toBe(true);
        }
        if (op === 1) expect(trips.some((s) => mod12(s.p - key - chordAt(s.beat)[0]) === VQ_DEF[chordAt(s.beat)[1]].ct[1])).toBe(true);
      }
  });
});

describe('digital patterns and lines over forms', () => {
  it('digital patterns: each cell is the pattern on its chord (1-2-3-5, 1-3-5-7, 5-3-2-1, 7-5-3-1)', () => {
    const prog: [number, keyof typeof VQ_DEF][] = [[2, 'm7'], [7, '7'], [0, 'maj7'], [9, '7']];
    const pats = (q: keyof typeof VQ_DEF) => [[0, 2, VQ_DEF[q].ct[1], 7], VQ_DEF[q].ct.slice(0, 4), [7, VQ_DEF[q].ct[1], 2, 0], VQ_DEF[q].ct.slice(0, 4).reverse()];
    for (let key = 0; key < 12; key++)
      for (const op of [0, 1, 2, 3]) {
        const l = digitalLine(key, op, 45, 79);
        for (let c = 0; c < 8; c++) {
          const [d, q] = prog[c % 4];
          const cell = l.notes.slice(c * 4, c * 4 + 4);
          const root = cell[0].p - pats(q)[op][0];
          expect(cell.map((n) => n.p - root), `${key} ${op} ${c}`).toEqual(pats(q)[op]);
          expect(mod12(root - key - d)).toBe(0);
        }
      }
  });
  it('lines over forms (minor ii–V, altered, blues, rhythm A, bridge, three turnarounds): a chord tone on every beat', () => {
    expect(LINE_FORMS).toHaveLength(8);
    for (let key = 0; key < 12; key++)
      LINE_FORMS.forEach((f, op) => {
        const l = formLine(key, op, 45, 79, `t:${key}:${op}`);
        const chords = f.bars.flatMap((bar) => bar.map(([d, q]) => ({ r: mod12(key + d), q, beats: 4 / bar.length })));
        let t0 = 0;
        const chordAt = (b: number) => {
          t0 = 0;
          for (const c of chords) {
            if (b < t0 + c.beats - 1e-9) return c;
            t0 += c.beats;
          }
          return chords[chords.length - 1];
        };
        for (const n of l.notes)
          if (Number.isInteger(n.beat) && n.ct) {
            const c = chordAt(n.beat);
            expect(VQ_DEF[c.q].ct.map((x) => mod12(c.r + x)), `${f.name.en} ${key} b${n.beat}`).toContain(mod12(n.p));
          }
        expect(l.notes.filter((n) => Number.isInteger(n.beat)).every((n) => n.ct)).toBe(true);
        expect(l.chart.length).toBe(f.bars.length);
      });
  });
});

// ---------------------------------------------------------------- the levels

const allLevels = (): [string, LevelDef[]][] => [['k-vocab', KVOCAB().levels], ['g-bebop', GBEBOP().levels], ['b-bebop', BBEBOP().levels]];

describe('the levels', () => {
  it('keys 10, guitar 12, bass 7 levels; every one in all 12 keys, every item generates in every key', () => {
    expect(KVOCAB().levels).toHaveLength(10);
    expect(GBEBOP().levels).toHaveLength(12);
    expect(BBEBOP().levels).toHaveLength(7);
    for (const [fam, levels] of allLevels())
      for (const lv of levels) {
        expect(new Set(levelKeys(lv, 'fifths-up')).size, lv.id).toBe(12);
        for (const sp of lv.specs)
          for (let key = 0; key < 12; key++) {
            const d = generate({ ...sp, key });
            expect(d.notes.length, d.itemId).toBeGreaterThan(0);
            expect(d.chart?.length, d.itemId).toBeGreaterThan(0);
            expect(d.notes.every((n) => n.dur > 0), d.itemId).toBe(true);
            if (fam === 'k-vocab') expect(d.notes.every((n) => n.pitch >= 36 && n.pitch <= 90), d.itemId).toBe(true);
            else expect(d.notes.every((n) => n.fret! >= 0 && n.fret! <= (fam === 'b-bebop' ? 19 : 17) && n.string! >= 1), d.itemId).toBe(true);
          }
      }
  });
  it('approach notes and enclosures on piano and guitar, enclosures on bass; lines over forms on guitar and bass', () => {
    const kinds = (levels: LevelDef[]) => levels.flatMap((l) => l.specs.map((s) => `${s.kind}:${s.option}`));
    for (const ls of [KVOCAB().levels, GBEBOP().levels]) for (const op of [0, 1, 4, 5, 6]) expect(kinds(ls)).toContain(`v-lead:${op}`);
    for (const [, ls] of allLevels()) for (const op of [8, 9, 11, 14, 15, 16, 17, 19, 20, 21, 22]) expect(kinds(ls)).toContain(`v-lead:${op}`);
    // Bass: every form but the tritone turnaround (its ♭III / ♭VI / ♭II roots would be flats in a sharp key's chart).
    for (const [ls, n] of [[GBEBOP().levels, LINE_FORMS.length], [BBEBOP().levels, LINE_FORMS.length - 1]] as const) {
      for (let op = 0; op < n; op++) expect(kinds(ls)).toContain(`v-line:${op}`);
      for (const op of [0, 1]) expect(kinds(ls)).toContain(`v-digit:${op}`);
    }
    for (const [, ls] of allLevels()) for (const k of ['v-3b9:0', 'v-trip:0', 'v-trip:1', 'v-minor:0']) expect(kinds(ls)).toContain(k);
    // The click moves on piano and guitar lines and comping: 2 & 4, the gap, the "and".
    for (const ls of [KVOCAB().levels, GBEBOP().levels]) for (let op = 0; op < TIME_ITEMS.length; op++) expect(kinds(ls)).toContain(`v-time:${op}`);
  });
  it('new items start in free time; the time items keep their click (2 & 4, a gap bar, the "and"), the count-in and the now-cue', () => {
    for (const [, levels] of allLevels())
      for (const lv of levels)
        for (const sp of lv.specs) {
          const d = generate({ ...sp, key: 3 });
          if (sp.kind === 'v-time') {
            const it = TIME_ITEMS[sp.option ?? 0];
            expect(d.click, d.itemId).toBe(it.click);
            if (it.click === 'gap') expect(d.gap).toEqual([3, 1]);
            expect(hasRubato(d), d.itemId).toBe(false);
          } else expect(hasRubato(d), d.itemId).toBe(true);
        }
    // The swing on-ramp opens the keys family (~980) and the guitar family (grade 3).
    expect(KVOCAB().levels[0].specs.every((s) => s.kind === 'v-time' && s.swing)).toBe(true);
    expect((GBEBOP().levels[0] as { grade?: number }).grade).toBe(3);
  });
  it('piano: a steady take is clean at the target tempo; a wrong note never passes', () => {
    const bad: string[] = [];
    for (const lv of KVOCAB().levels)
      for (const d0 of levelDrills(lv, 'fifths-up').slice(0, 4))
        for (const key of [0, 7]) {
          const d = generate({ ...d0.spec, key });
          const bpm = targetBpmOf(lv, d);
          const take = humanTake(d, bpm, steadySd(d, bpm), 2);
          const m = analyzeTake(d, bpm, take);
          if (m.verdict !== 'clean') bad.push(`steady ${lv.id} ${d.itemId}@${bpm}: ${m.why.en}`);
          const i = Math.floor(take.length / 2);
          const wrong = take.map((p, k) => (k === i ? { ...p, pitch: p.pitch + 1 } : p));
          if (analyzeTake(d, bpm, wrong).verdict === 'clean') bad.push(`wrong ${lv.id} ${d.itemId}`);
        }
    expect(bad).toEqual([]);
  }, 120_000);
  it('guitar: a steady take is clean at the target tempo; a wrong note is not', () => {
    const take = (d: Drill, bpm: number, sd: number, seed: string): PlayedNote[] => {
      const r = grng(`${d.itemId}:${seed}`);
      const gauss = () => Math.max(-2.5, Math.min(2.5, Math.sqrt(-2 * Math.log(Math.max(1e-9, r()))) * Math.cos(2 * Math.PI * r())));
      const seen = new Set<string>();
      const out: PlayedNote[] = [];
      for (const n of d.notes) {
        const k = `${n.pitch}@${n.beat}`;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push({ pitch: n.pitch, on: expTimeMs(d, n.beat, bpm) + gauss() * sd, off: null, vel: 64 });
      }
      return out.sort((a, b) => a.on - b.on);
    };
    const fails: string[] = [];
    for (const lv of GBEBOP().levels)
      for (const sp of lv.specs.slice(0, 3)) {
        const d = generate({ ...sp, key: 5 });
        const bpm = targetBpmOf(lv, d);
        const nps = npsOf(d, bpm);
        const ioi = 1000 / nps;
        const cv = Math.max(thresholds(tempoBand(nps)).cv, IOI_FLOOR_MS.midi / ioi);
        const jit = Math.min(8, (0.45 * cv * ioi) / Math.SQRT2);
        const good = analyzeGuitarTake(d, bpm, take(d, bpm, jit, 'good'));
        if (good.verdict !== 'clean') fails.push(`${lv.id} ${d.itemId} @${bpm}: ${good.why.en}`);
        const g = take(d, bpm, jit, 'good');
        const mid = g[Math.floor(g.length / 2)].on;
        const wrong = g.map((p) => (Math.abs(p.on - mid) < 30 ? { ...p, pitch: p.pitch + 1 } : p));
        if (analyzeGuitarTake(d, bpm, wrong).verdict === 'clean') fails.push(`${lv.id} ${d.itemId} wrong note clean`);
      }
    expect(fails).toEqual([]);
  }, 120_000);
});

// ---------------------------------------------------------------- wiring

describe('wiring', () => {
  it('jazz emphasis / the jazz add-on / the jazz track show the families; each has its own path symbol', () => {
    expect(shownFamilies({ emphasis: 'jazz' }).map((x) => x.id)).toContain('k-vocab');
    expect(shownFamilies({ emphasis: 'classical' }).map((x) => x.id)).not.toContain('k-vocab');
    expect(shownFamilies({ emphasis: 'jazz', instrument: 'guitar', guitarAddOns: ['jazz'] }).map((x) => x.id)).toContain('g-bebop');
    expect(shownFamilies({ emphasis: 'jazz', instrument: 'guitar', guitarAddOns: [] }).map((x) => x.id)).not.toContain('g-bebop');
    expect(shownFamilies({ emphasis: 'jazz', instrument: 'bass', bassTrack: 'jazz' }).map((x) => x.id)).toContain('b-bebop');
    expect(shownFamilies({ emphasis: 'jazz', instrument: 'bass', bassTrack: 'prog' }).map((x) => x.id)).not.toContain('b-bebop');
    for (const f of ['k-vocab', 'g-bebop', 'b-bebop']) {
      expect(GLYPHS[FAMILY_GLYPH[f]], f).toBeDefined();
      expect(Object.entries(FAMILY_GLYPH).filter(([k, g]) => k !== f && g === FAMILY_GLYPH[f]), f).toEqual([]);
    }
  });
  it('on the paths by difficulty, roughly 1000–1650', () => {
    const diff = (id: string) => stepCatalogue().find((s) => s.id === id)!.difficulty;
    for (const [fam, levels] of allLevels())
      for (const lv of levels) {
        const d = diff(`tech:${lv.id}`);
        expect(d, lv.id).toBeGreaterThanOrEqual(fam === 'k-vocab' && lv.level === 1 ? 950 : 1000);
        expect(d, lv.id).toBeLessThanOrEqual(1650);
      }
    expect(diff('tech:k-vocab-1')).toBeLessThan(diff('tech:k-vocab-2'));
    expect(diff('tech:g-bebop-1')).toBeLessThan(diff('tech:g-bebop-2'));
  });
  it('badges: 7 for the keys family, one per guitar level, the bass milestones', () => {
    const k = BADGES.filter((b) => b.id.startsWith('tech:k-vocab:'));
    expect(k).toHaveLength(7);
    for (const b of k) expect(badgeInCourse(b, 'keys'), b.id).toBe(true);
    expect(BADGES.filter((b) => b.id.startsWith('tech:g-bebop:'))).toHaveLength(12);
    expect(BADGES.filter((b) => b.id.startsWith('tech:g-bass:b-bebop:')).length).toBeGreaterThanOrEqual(2);
  });
  it('a lesson opens every level (family or level lesson), en + he, with note demos and no emoji', () => {
    for (const [fam, levels] of allLevels())
      for (const lv of levels) {
        const l = lessonForUnit(`tech:${lv.id}`) ?? lessonForUnit(`tech:${fam}`);
        expect(l, lv.id).toBeTruthy();
      }
    for (const id of ['vocab-approach', 'vocab-enclose', 'vocab-time', 'vocab-harris', 'vocab-lines']) {
      const l = MINI_LESSONS[id];
      expect(l, id).toBeDefined();
      expect(/\p{Extended_Pictographic}/u.test(JSON.stringify(l).replace(/𝄞/g, ''))).toBe(false);
      for (const s of [...l.steps, ...(l.more ?? [])]) {
        expect(s.say.en.length).toBeGreaterThan(0);
        expect(s.say.he.length).toBeGreaterThan(0);
      }
      expect(l.steps.some((s) => s.play?.length)).toBe(true);
    }
  });
  it('the ear: jazz-phrase 5 asks which enclosure, four distinct options, the coach names what to listen for', () => {
    const T = TOPIC_GEN['jazz-phrase'];
    expect(T.levels).toHaveLength(7); // + levels 6–7, the transcriptions (phrases by ear)
    for (let seed = 1; seed <= 40; seed++) {
      const q = T.gen(seed, 5, `x${seed}`) as Extract<ReturnType<typeof T.gen>, { kind: 'choice' }>;
      expect(q.kind).toBe('choice');
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices.map((c) => q.names[c].en)).size).toBe(4);
      expect(q.choices).toContain(q.answer);
      expect(q.ask.en.length).toBeLessThanOrEqual(40);
      const wrong = q.choices.find((c) => c !== q.answer)!;
      expect(revealCoach(q, wrong, 'en')).toContain('target');
    }
  });
  it('level test: the lines, jazz and walking sections place the new families', () => {
    const places = (ss: ReturnType<typeof pianoStrands>) => ss.flatMap((s) => s.rungs.flatMap((r) => Object.keys(r.places)));
    expect(places(pianoStrands('jazz'))).toContain('k-vocab');
    expect(places(guitarStrands())).toContain('g-bebop');
    expect(places(bassStrands())).toContain('b-bebop');
    expect(pianoStrands('jazz').flatMap((s) => s.rungs.map((r) => r.level))).toContain('k-vocab-5');
  });
  it('takes rate improvising vocabulary, Barry Harris lines, and time by the click', () => {
    const tags = (spec: Parameters<typeof generate>[0]) => {
      const d = generate(spec);
      return drillEvents(d, analyzeTake(d, 80, humanTake(d, 80, 6, 1)), '2026-11-14T00:00:00Z', 's', 0).flatMap((e) => e.tags ?? []).map((t) => t.sub);
    };
    expect(tags({ family: 'k-vocab', kind: 'v-lead', key: 0, hands: 'R', swing: true, option: 8 })).toContain('improv/vocab');
    expect(tags({ family: 'k-vocab', kind: 'v-minor', key: 0, hands: 'R', swing: true, option: 0 })).toContain('chords/barry');
    expect(tags({ family: 'k-vocab', kind: 'v-time', key: 0, hands: 'R', swing: true, option: 0 })).toContain('timing/backbeat');
    expect(tags({ family: 'k-vocab', kind: 'v-time', key: 0, hands: 'R', swing: true, option: 3 })).toContain('timing/gap');
  });
});
