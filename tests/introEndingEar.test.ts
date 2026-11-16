// Intros and endings by ear on the guitar and the bass (g-gig 9, b-gig 9): the instruments' own counterparts of the
// ear topic intro-ending — hear one, comp it back (guitar, drop 2) or play its roots (bass), graded chord by chord.
import { describe, expect, it } from 'vitest';
import { generate } from '../src/engine/drills/generate';
import { guitarCatalog } from '../src/engine/drills/guitar';
import { levelDrills } from '../src/engine/drills/plan';
import { expTimeMs } from '../src/engine/drills/analyze';
import { evidenceFromChroma, evidenceFromNotes, gradeHarmony } from '../src/engine/drills/harmonyGrade';
import { EAR_ENDINGS, EAR_INTROS } from '../src/engine/drills/progEar';
import { B6B2_DOM, B6B2_MAJ, BLUES_LAST4, DAMERON, GIG_KEYS, TAG3, TURN_INTRO, WALKDOWN } from '../src/engine/drills/gigDrills';
import { degSemis } from '../src/engine/progGrid';
import { drillEvents } from '../src/engine/drills/events';
import type { Drill } from '../src/engine/drills/types';

const VQ_TO_GQ: Record<string, string> = { maj7: 'maj7', '6': '6', m7: 'm7', m6: 'm6', '7': '7', hd7: 'm7b5', dim7: 'dim7' };
const asD = (ch: { deg: string; q: string; beats: number }[]) => ch.map((c) => `${degSemis(c.deg)}${c.q}/${c.beats}`);
const asV = (ds: [number, string, number][]) => ds.map(([d, q, b]) => `${d}${VQ_TO_GQ[q]}/${b}`);

describe('intros and endings by ear', () => {
  it('the ear progressions are the bandstand’s (gigDrills.ts) progressions', () => {
    const byId = Object.fromEntries([...EAR_INTROS, ...EAR_ENDINGS].map((x) => [x.id, asD(x.ch)]));
    expect(byId.turn).toEqual(asV(TURN_INTRO));
    expect(byId.last4).toEqual(asV(BLUES_LAST4));
    expect(byId.tag).toEqual(asV(TAG3));
    expect(byId.b6b2maj).toEqual(asV(B6B2_MAJ));
    expect(byId.b6b2).toEqual(asV(B6B2_DOM));
    expect(byId.dameron).toEqual(asV(DAMERON));
    expect(byId.walkdown).toEqual(asV(WALKDOWN));
    expect(byId.basie).toEqual(['2m7/4', '7' + '7/4', '06/8']);
  });
  const lv = (fam: string) => guitarCatalog().find((f) => f.id === fam)!.levels.find((l) => l.id === `${fam}-9`)!;
  it('guitar g-gig 9 and bass b-gig 9: all 12 keys, a call then the answer, the chart hidden until the result', () => {
    for (const fam of ['g-gig', 'b-gig']) {
      const l = lv(fam);
      expect(l, fam).toBeDefined();
      expect([...(l.keys as number[])].sort((a, b) => a - b)).toEqual([...GIG_KEYS].sort((a, b) => a - b));
      const ds = levelDrills(l, 'fifths-up');
      expect(ds.length).toBe(24);
      const seen = new Set<string>();
      for (const d of ds) {
        expect(d.listen?.notes.length).toBeGreaterThan(0);
        expect(d.show).toBe('none');
        expect(d.harmony?.chords.length).toBeGreaterThan(2);
        // the answer comes after the call
        const callEnd = Math.max(...d.listen!.windows.map((w) => w[1]));
        expect(Math.min(...d.notes.map((n) => n.beat))).toBeGreaterThan(callEnd);
        seen.add(d.chart!.join(' '));
        // the title never names the progression (that is the question)
        expect(d.title.en).not.toMatch(/Dameron|Basie|tag|walk-down|♭VI|vamp|last four/i);
        expect(drillEvents(d, { verdict: 'clean' } as never, '2026-11-16T00:00:00Z', 's', 0).flatMap((e) => (e.tags ?? []).map((x) => x.sub))).toContain('form/song');
      }
      expect(seen.size).toBeGreaterThan(6);
    }
  });
  it('bass: the roots on time pass; one wrong root counts against the roots', () => {
    const bpm = 80;
    const b = generate({ family: 'b-gig', kind: 'ie-ear', key: 3, hands: 'R', instrument: 'bass', option: 1, perBeat: 0.5, tempo: 80 } as never);
    expect(b.harmony?.mode).toBe('bass');
    const take = (d: Drill, edit = (p: number, _b: number) => p) => d.notes.map((n) => ({ pitch: edit(n.pitch, n.beat), on: expTimeMs(d, n.beat, bpm) + 5, off: null, vel: 80 }));
    expect(gradeHarmony(b.harmony!, evidenceFromNotes(b, b.harmony!, bpm, take(b))).line.en).toBe('roots ✓');
    const first = b.harmony!.chords[0];
    const bad = gradeHarmony(b.harmony!, evidenceFromNotes(b, b.harmony!, bpm, take(b, (p, beat) => (beat === first.beat ? p + 1 : p))));
    expect(bad.roots.ok).toBe(b.harmony!.chords.length - 1);
  });
  it('guitar: the right chords strummed pass (by chroma)', () => {
    const bpm = 72;
    const g = generate({ family: 'g-gig', kind: 'prog-ending', key: 10, hands: 'R', instrument: 'guitar', option: 1, position: 1, tempo: 72 } as never);
    const plan = g.harmony!;
    const frames = plan.chords.flatMap((c) => {
      const t0 = expTimeMs(g, c.beat, bpm);
      return Array.from({ length: 8 }, (_, k) => ({ t: t0 + 250 + k * 25, rms: 0.1, chroma: Array.from({ length: 12 }, (_, p) => (c.pcs.includes(p) ? 1 : 0.05)), hz: null }));
    });
    expect(gradeHarmony(plan, evidenceFromChroma(g, plan, bpm, frames)).roots.ok).toBe(plan.chords.length);
  });
});
