// AUDIT-DEPTH-3 C2 on the voice: the head embellished as written (v-scat 1511).
import { describe, expect, it } from 'vitest';
import { embellishPlan, songPlan, voiceSong } from '../src/engine/voiceSongs';
import { VOICE_FAMILIES, NEW_LEVEL_NAMES, SCAT_P2_LEVELS, vocalLevelByRef } from '../src/engine/voiceFamilies';

const RANGE = { low: 48, high: 72 };

describe('voice: approach and enclose the head (v-scat 1511)', () => {
  it('the level sits in Scat & improvisation, named, three songs in time with the band', () => {
    const fam = VOICE_FAMILIES.find((f) => f.id === 'v-scat')!;
    expect(fam.refs).toContain(1511);
    expect(NEW_LEVEL_NAMES[1511].he).toMatch(/[֐-׿]/);
    const lv = SCAT_P2_LEVELS.find((l) => l.level === 1511)!;
    expect(vocalLevelByRef(1511)?.items).toHaveLength(3);
    expect(lv.items.map((i) => i.song?.written)).toEqual(['approach', 'approach', 'enclose']);
    for (const it of lv.items) expect(it.song?.rhythm && it.song?.band).toBe(true);
  });
  for (const [id, mode] of [['saints-jazz', 'approach'], ['blue-window', 'approach'], ['slow-harbor', 'enclose']] as const)
    it(`${id} (${mode}): the melody keeps its notes and onsets; each added note a half step under its target or a step above`, () => {
      const plan = songPlan(voiceSong(id)!, RANGE);
      const e = embellishPlan(plan, mode);
      expect(e.notes.length).toBeGreaterThan(plan.notes.length);
      for (const n of plan.notes) expect(e.notes.some((x) => x.midi === n.midi && Math.abs(x.start - n.start) < 1e-6)).toBe(true);
      const added = e.notes.filter((x) => !plan.notes.some((n) => n.midi === x.midi && Math.abs(x.start - n.start) < 1e-6));
      for (const a of added) {
        const t = plan.notes.find((n) => n.start > a.start + 1e-6 && n.start - a.start <= plan.beat + 1e-6)!;
        expect(t, `${id} ${a.start}`).toBeDefined();
        expect([-1, 1, 2]).toContain(a.midi - t.midi);
      }
      // one line: nothing overlaps
      for (let k = 1; k < e.notes.length; k++) expect(e.notes[k].start).toBeGreaterThanOrEqual(e.notes[k - 1].start + e.notes[k - 1].dur - 1e-6);
      for (const ph of e.phrases) for (const k of ph.notes) expect(e.notes[k].phrase).toBe(ph.i);
      if (mode === 'enclose') expect(added.some((a) => a.midi > plan.notes.find((n) => n.start > a.start)!.midi)).toBe(true);
    });
});
