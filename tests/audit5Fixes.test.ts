// AUDIT-5 APP-WRONG fixes: W2 (minor-key Roman numerals), v-agility (real agility levels), A1 / A2 (lesson wording).
import { describe, expect, it } from 'vitest';
import '../src/engine/topics';
import { TOPIC_GEN, asChoice } from '../src/engine/topicKit';
import { RN_MINOR } from '../src/engine/topicsTheory';
import { LENIENT_BELOW, gradeTake, itemFits, itemTargets, synthMelody } from '../src/engine/vocal';
import { NEW_LEVEL_NAMES, RUN_FULL_BPM, RUN_LEVELS, VOICE_FAMILIES, voiceLevelUnlocked, voiceStartNow } from '../src/engine/voiceFamilies';
import { UNIT_LESSON, vocalUnit } from '../src/content/units';
import { MINI_LESSONS } from '../src/content/minilessons';

const pc = (m: number) => ((m % 12) + 12) % 12;

describe('W2: roman-numerals level 2 (minor keys)', () => {
  it('III, VI and VII from natural minor; V and vii° from harmonic minor; no III+', () => {
    const byRn = Object.fromEntries(RN_MINOR.map((c) => [c.rn, c.tones.map(pc)]));
    expect(Object.keys(byRn)).toEqual(['i', 'ii°', 'III', 'iv', 'V', 'VI', 'VII', 'vii°']);
    expect(byRn.III).toEqual([3, 7, 10]);
    expect(byRn.VI).toEqual([8, 0, 3]);
    expect(byRn.VII).toEqual([10, 2, 5]);
    expect(byRn.V).toEqual([7, 11, 2]);
    expect(byRn['vii°']).toEqual([11, 2, 5]);
  });

  it('every question plays i–iv–V–i first, then a chord that matches its answer', () => {
    const seen = new Set<string>();
    for (let s = 1; s <= 300; s++) {
      const q = asChoice(TOPIC_GEN['roman-numerals'].gen(s, 2, 'r'));
      seen.add(q.answer);
      expect(q.choices).toContain(q.answer);
      expect(q.choices.some((c) => c.includes('+'))).toBe(false);
      expect(new Set(q.choices).size).toBe(q.choices.length);
      if (q.answer === 'VII') expect(q.choices).toContain('vii°');
      if (q.answer === 'vii°') expect(q.choices).toContain('VII');
      const st = q.stimulus as { kind: string; midis?: number[] }[];
      const chords = st.filter((x) => x.kind === 'chord');
      expect(chords.length).toBe(5); // four cadence chords + the question chord
      const tonic = pc(Math.min(...chords[0].midis!));
      const cadence = chords.slice(0, 4).map((c) => [...new Set(c.midis!.map((m) => pc(m - tonic)))].sort((a, b) => a - b));
      expect(cadence).toEqual([[0, 3, 7], [0, 5, 8], [2, 5, 7, 11], [0, 3, 7]]);
      const asked = [...new Set(chords[4].midis!.map((m) => pc(m - tonic)))].sort((a, b) => a - b);
      expect(asked).toEqual([...RN_MINOR.find((c) => c.rn === q.answer)!.tones.map(pc)].sort((a, b) => a - b));
    }
    expect(seen.size).toBe(8);
  });
});

describe('v-agility: real agility levels before the two bebop lines', () => {
  const fam = VOICE_FAMILIES.find((f) => f.id === 'v-agility')!;
  const range = { low: 48, high: 72 };

  it('runs, turns and melisma first; the bebop-line songs stay the top levels', () => {
    expect(fam.refs.slice(-2)).toEqual([1601, 1602]);
    expect(fam.refs.slice(0, -2)).toEqual(RUN_LEVELS.map((l) => l.level));
    for (const n of fam.refs) expect(NEW_LEVEL_NAMES[n], String(n)).toBeDefined();
    const shapes = new Set(RUN_LEVELS.flatMap((l) => l.items.map((it) => it.run!.shape)));
    expect([...shapes].sort()).toEqual(['blues', 'melisma', 'penta', 'run', 'turn']);
    // 5-note runs, then 9-note runs
    expect(RUN_LEVELS[0].items.every((it) => it.steps!.length === 5)).toBe(true);
    expect(RUN_LEVELS[2].items.every((it) => it.steps!.length === 9)).toBe(true);
  });

  it('a tempo ladder 60 → 80 → 100 → 120 % (sixteenths at ♩80 = 100 %), never slower inside a level', () => {
    const pcts = new Set<number>();
    for (const l of RUN_LEVELS) {
      const ps = l.items.map((it) => it.run!.pct);
      expect([...ps].sort((a, b) => a - b)).toEqual(ps);
      for (const it of l.items) {
        pcts.add(it.run!.pct);
        expect(it.kind).toBe('melody');
        expect(it.perBeat).toBe(4);
        expect(it.bpm).toBe(Math.round((RUN_FULL_BPM * it.run!.pct) / 100));
        expect(itemFits(it, range)).toBe(true);
      }
    }
    expect([...pcts].sort((a, b) => a - b)).toEqual([60, 80, 100, 120]);
    // each 5- and 9-note run climbs the whole ladder across its two levels
    for (const [a, b] of [[0, 1], [2, 3]]) expect([...RUN_LEVELS[a].items, ...RUN_LEVELS[b].items].map((it) => it.run!.pct)).toEqual([60, 60, 80, 80, 100, 100, 120, 120]);
  });

  it('graded by the melody grader: in time and in tune passes, wrong notes fail; the first level is lenient', () => {
    expect(RUN_LEVELS[0].items.every((it) => it.difficulty < LENIENT_BELOW)).toBe(true);
    for (const l of RUN_LEVELS)
      for (const it of l.items) {
        const targets = itemTargets(it, range);
        const grid = 60 / it.bpm! / 4;
        expect(gradeTake(it, synthMelody(targets, grid), range).score, it.id).toBeGreaterThanOrEqual(l.pass);
        expect(gradeTake(it, synthMelody(targets.map((m) => m + 3), grid), range).score, it.id).toBeLessThan(l.pass);
      }
  });

  it('players who had the bebop lines open keep them; saved starts move past the new levels', () => {
    expect(voiceLevelUnlocked(fam, 1601, [])).toBe(true);
    expect(voiceLevelUnlocked(fam, 1604, [])).toBe(false);
    expect(voiceLevelUnlocked(fam, 1604, [1603])).toBe(true);
    expect(voiceStartNow('v-agility', 2)).toBe(fam.refs.indexOf(1602) + 1);
    for (const n of RUN_LEVELS.map((l) => l.level)) expect(vocalUnit(n)).toBe('vocal:agility');
    expect(UNIT_LESSON['vocal:agility']).toBe('voice-agility');
    expect(MINI_LESSONS['voice-agility']).toBeDefined();
  });
});

describe('A1 / A2: lesson wording', () => {
  const all = JSON.stringify(MINI_LESSONS);
  it('the Bird blues does not fill every bar with ii–Vs; Coltrane changes do not move every two beats throughout', () => {
    expect(all).not.toContain('fills every bar with them');
    expect(all).toContain('the Bird blues replaces most bars with ii–Vs');
    expect(all).not.toContain('where the key moves every two beats.');
    expect(all).toContain('then every two bars');
  });
});
