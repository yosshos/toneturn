// AUDIT-CONTENT-THEORY §ב.5 (voice): octave-aware sung grading — the whole item may sit in another octave (a low
// voice singing a treble line), but a single note an octave away from the rest is wrong ("octave off") — and the sung
// intervals beyond the sixth (sevenths, the octave, ninths) as v-ear levels.
import { describe, expect, it } from 'vitest';
import { gradeTake, itemFits, itemTargets, melodyMetrics, synthMelody, type VocalItem } from '../src/engine/vocal';
import { gradeSungSequence } from '../src/engine/memory';
import { sungMelodyRemarks } from '../src/engine/feedbackMelody';
import { itemOctave } from '../src/engine/feedback';
import { intervalOctaveOk } from '../src/engine/sing';
import { melodyRemarkText } from '../src/game/content';
import { sungSequence } from '../src/game/fakes';
import { NEW_LEVEL_NAMES, VOICE_FAMILIES, vocalLevelByRef, voiceItemTags } from '../src/engine/voiceFamilies';
import { earInstruction } from '../src/engine/voiceEar';
import { voiceStrands } from '../src/engine/voiceLevelTest';
import { stepCatalogue } from '../src/engine/path';
import { synthLine } from '../src/engine/voiceTime';

const WIDE = { low: 45, high: 76 };

describe('octave-aware melody grading', () => {
  const tg = [60, 64, 67, 72];
  it('the whole line an octave down (a low voice) is all hits', () => {
    const m = melodyMetrics(synthMelody(tg.map((x) => x - 12)), tg);
    expect(m.hit).toBe(1);
    expect(m.octaveOff).toBe(0);
  });
  it('one note an octave away from the rest is not a hit, and is flagged', () => {
    const m = melodyMetrics(synthMelody([60, 64, 67, 60]), tg);
    expect(m.notes[3].octave).toBe(true);
    expect(m.octaveOff).toBe(1);
    expect(m.hit).toBe(0.75);
  });
  it('the item octave: the most common offset, a tie goes to the first note', () => {
    expect(itemOctave([0, 0, -1])).toBe(0);
    expect(itemOctave([-1, 0, -1])).toBe(-1);
    expect(itemOctave([0, -1])).toBe(0);
    expect(itemOctave([])).toBe(0);
  });
  it('per-note feedback says "octave off" first, en + he', () => {
    const items = sungMelodyRemarks(synthMelody([60, 64, 67, 60]), tg);
    expect(items[0]).toEqual({ index: 3, remarks: ['octave-off'] });
    expect(melodyRemarkText(items.slice(0, 1), 'en')).toBe('Note 4: octave off');
    expect(melodyRemarkText(items.slice(0, 1), 'he')).toBe('צליל 4: אוקטבה לא נכונה');
    expect(sungMelodyRemarks(synthMelody(tg.map((x) => x - 12)), tg).some((x) => x.remarks[0] === 'octave-off')).toBe(false);
  });
});

describe('octave-aware sung sequences (lesson sing-seq)', () => {
  const arp = [60, 64, 67, 72];
  it('the whole arpeggio an octave down passes', () => {
    const g = gradeSungSequence(sungSequence(arp.map((m) => m - 12)), arp);
    expect(g.pass).toBe(true);
    expect(g.accuracy).toBe(1);
  });
  it('the top root sung back on the bottom root is wrong (octave off)', () => {
    const g = gradeSungSequence(sungSequence([60, 64, 67, 60]), arp);
    expect(g.pass).toBe(false);
    expect(g.notes.map((n) => n.status)).toEqual(['ok', 'ok', 'ok', 'wrong']);
    expect(g.octaveOff).toBe(1);
  });
});

describe('a sung interval from a played note (lesson sing-intervals)', () => {
  it('the asked side of the played note; one extra octave above for a high voice', () => {
    expect(intervalOctaveOk(67, 60, 7)).toBe(true);
    expect(intervalOctaveOk(79, 60, 7)).toBe(true);
    expect(intervalOctaveOk(55, 60, 7)).toBe(false); // a fourth down
    expect(intervalOctaveOk(60, 60, 12)).toBe(false); // the played note again
    expect(intervalOctaveOk(72, 60, 12)).toBe(true);
    expect(intervalOctaveOk(53, 60, -7)).toBe(true);
    expect(intervalOctaveOk(65, 60, -7)).toBe(false);
    expect(intervalOctaveOk(72, 60, 0)).toBe(false);
  });
});

describe('sung intervals beyond the sixth (v-ear 1206, 1207)', () => {
  const fam = VOICE_FAMILIES.find((f) => f.id === 'v-ear')!;
  const take = (it: VocalItem, o: { shift?: number; last?: number; whole?: number } = {}) => {
    const tg = itemTargets(it, WIDE);
    let at = 0.3;
    const notes = tg.map((m, i) => {
      const n = { midi: m + (o.whole ?? 0) + (i === tg.length - 1 ? (o.shift ?? 0) + (o.last ?? 0) : 0), start: at, dur: 0.57 };
      at += 0.6;
      return n;
    });
    return gradeTake(it, synthLine(notes), WIDE);
  };
  it('appended to the family, named, path steps, rated as sung intervals', () => {
    expect(fam.refs.slice(-2)).toEqual([1206, 1207]);
    const steps = new Set(stepCatalogue().filter((s) => s.kind === 'vocal').map((s) => s.ladder!.ref));
    for (const n of [1206, 1207]) {
      expect(steps.has(String(n))).toBe(true);
      expect(NEW_LEVEL_NAMES[n].en.length).toBeGreaterThan(2);
      expect(NEW_LEVEL_NAMES[n].he.length).toBeGreaterThan(2);
      const lv = vocalLevelByRef(n)!;
      for (const it of lv.items) {
        expect(it.ear?.mode).toBe('interval');
        expect(it.difficulty).toBeGreaterThanOrEqual(1300);
        expect(it.difficulty).toBeLessThanOrEqual(1500);
        expect(voiceItemTags(n, it).tags.some((t) => t.sub === 'singing/intervals')).toBe(true);
      }
    }
    const sizes = (n: number) => vocalLevelByRef(n)!.items.map((it) => Math.abs(it.steps![1]));
    expect(new Set(sizes(1206))).toEqual(new Set([10, 11, 12]));
    expect(sizes(1207)).toEqual(expect.arrayContaining([13, 14]));
  });
  it('a clean take passes, a semitone off fails, the second note an octave off fails, the whole item an octave down passes', () => {
    for (const n of [1206, 1207]) {
      const lv = vocalLevelByRef(n)!;
      for (const it of lv.items) {
        expect(take(it).score, it.id).toBeGreaterThanOrEqual(lv.pass);
        expect(take(it, { shift: 1 }).score, `${it.id} +1`).toBeLessThan(lv.pass);
        const dir = Math.sign(it.steps![1]);
        expect(take(it, { last: -12 * dir }).score, `${it.id} octave`).toBeLessThan(lv.pass);
      }
    }
    const oct = vocalLevelByRef(1206)!.items.find((it) => it.steps![1] === 12)!;
    expect(take(oct, { whole: -12 }).score).toBeGreaterThanOrEqual(vocalLevelByRef(1206)!.pass);
  });
  it('a one-octave range still gets an item of each level; the instruction reads well', () => {
    const narrow = { low: 55, high: 67 };
    for (const n of [1206, 1207]) expect(vocalLevelByRef(n)!.items.some((it) => itemFits(it, narrow)), String(n)).toBe(true);
    const names: Record<number, string> = { 12: 'octave', 14: 'major ninth', 10: 'minor seventh' };
    const oct = vocalLevelByRef(1206)!.items.find((it) => it.steps![1] === 12)!;
    expect(earInstruction(oct, 'en', (s) => names[s])).toBe('Sing the note you hear, then an octave above it.');
    const ninth = vocalLevelByRef(1207)!.items.find((it) => it.steps![1] === 14)!;
    expect(earInstruction(ninth, 'en', (s) => names[s])).toBe('Sing the note you hear, then a major ninth above it.');
  });
  it('the level test reaches the new top of the family', () => {
    const s = voiceStrands(WIDE).find((x) => x.family === 'v-ear')!;
    expect(s.size).toBe(fam.refs.length);
    expect(s.rungs[s.rungs.length - 1].level).toBe(1207);
  });
});
