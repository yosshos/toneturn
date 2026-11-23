import { describe, expect, it } from 'vitest';
import { assignScales, classifyNotes, colourNotes, harmonyOf, insertSubs, MENUS, pickScale, qualityOf, rotationBars, rotationMetrics, scalePcs, updateModeStats, type ChordSpan } from '../src/engine/rotation';

const C = 0;
// | Dm7 | G7 | Cmaj7 | Cmaj7 | Am7 | Dm7 | G7 | Cm7?  — a major ii–V–I then vi–ii–V back to I
const span = (bar: number, root: number, iv: number[], beats = 4): ChordSpan => ({ at: bar * 4, beats, root, iv });
const prog = [span(0, 2, [0, 3, 7, 10]), span(1, 7, [0, 4, 7, 10]), span(2, 0, [0, 4, 7, 11]), span(3, 0, [0, 4, 7, 11]), span(4, 9, [0, 3, 7, 10]), span(5, 2, [0, 3, 7, 10]), span(6, 7, [0, 4, 7, 10]), span(7, 0, [0, 4, 7, 11])];
// minor ii–V–i in C minor
const minor = [span(0, 2, [0, 3, 6, 10]), span(1, 7, [0, 4, 7, 10]), span(2, 0, [0, 3, 7, 9])];

describe('the harmony timeline', () => {
  it('qualities and functions from the neighbours', () => {
    expect(qualityOf([0, 3, 6, 9])).toBe('dim7');
    expect(qualityOf([0, 3, 7, 9])).toBe('mtonic');
    expect(qualityOf([0, 5, 7, 10])).toBe('sus');
    const h = harmonyOf(prog, C);
    expect(h.map((x) => x.fn)).toEqual(['ii', 'V-maj', 'I', 'I', 'vi', 'ii', 'V-maj', 'I']);
    expect(harmonyOf(minor, C).map((x) => x.fn)).toEqual(['iiø', 'V-min', 'i']);
  });
});

describe('menus and colour notes (owner answers 2026-11-22)', () => {
  it('altered over V→major from T2; half-whole over V→minor only from T4', () => {
    const open = (fn: keyof typeof MENUS, t: number) => MENUS[fn].filter((e) => t >= e.min).map((e) => e.mode);
    expect(open('V-maj', 1)).not.toContain('altered');
    expect(open('V-maj', 2)).toContain('altered');
    expect(open('V-min', 3)).not.toContain('diminished');
    expect(open('V-min', 4)).toContain('diminished');
  });
  it('colour notes: G altered over G Mixolydian = ♭9, ♯9, ♭5, ♭13', () => {
    expect(colourNotes('V-maj', 'altered', 7).sort((a, b) => a - b)).toEqual([1, 3, 8, 10].map((x) => x).sort((a, b) => a - b)); // A♭ B♭ D♭ E♭
    expect(colourNotes('I', 'lydian', 0)).toEqual([6]);
    expect(colourNotes('iiø', 'locrian-sharp2', 2)).toEqual([4]);
    expect(scalePcs('whole-half', 1)).toEqual([1, 3, 4, 6, 7, 9, 10, 0]);
  });
});

describe('the rotation', () => {
  it('by need: a scale never played on the function comes first; a weak one before a strong one', () => {
    const r = () => 0.99;
    expect(pickScale('V-maj', 2, {}, r)).toBe('mixolydian');
    const played = { 'V-maj|mixolydian': { n: 5, cov: 0.9, last: '2026-11-20' }, 'V-maj|bebop-dominant': { n: 3, cov: 0.4, last: '2026-11-21' } };
    expect(['altered', 'diminished']).toContain(pickScale('V-maj', 2, played, r));
  });
  it('changes once per chorus at T1–2, every 4 bars at T3; same function = same scale inside a window', () => {
    expect(rotationBars(2, 8)).toBe(8);
    expect(rotationBars(3, 8)).toBe(4);
    const h = harmonyOf(prog, C);
    const plan = assignScales(h, 3, 4, 8, 2, {}, 7);
    expect(plan).toHaveLength(16);
    const v1 = plan.filter((p) => p.span.fn === 'V-maj' && p.window === 0).map((p) => p.mode);
    expect(new Set(v1).size).toBeLessThanOrEqual(1);
  });
});

describe('logical substitutions', () => {
  it('T3: the tritone sub on the second half of a whole-bar V, leading a half step down to I', () => {
    const h = insertSubs(harmonyOf(prog, C), 3, C);
    const sub = h.find((x) => x.sub?.label.en === 'Tritone sub')!;
    expect(sub.sub!.root).toBe(1); // D♭7 → C
    expect(sub.at).toBe(6);
    expect(sub.beats).toBe(2);
  });
  it('T1: VI7 for vi going to ii; at most one sub per 4 bars below T4', () => {
    const h = insertSubs(harmonyOf(prog, C), 1, C);
    expect(h.find((x) => x.at === 16)!.sub?.label.en).toMatch(/VI7/);
    expect(h.filter((x) => x.sub).length).toBe(1);
  });
});

describe('grading', () => {
  it('classifies chord tones, colour, avoid, passing and wrong notes; colour coverage per span', () => {
    const h = harmonyOf([span(0, 7, [0, 4, 7, 10]), span(1, 0, [0, 4, 7, 11])], C);
    const plan = [{ span: h[0], mode: 'altered' as const }, { span: h[1], mode: 'ionian' as const }];
    // over G7 altered: B (3rd, ct) on 1, A♭ (♭9, colour), A (natural 9 — not in altered, not a chord tone → wrong), then over C: E (ct), F (avoid, held on 3)
    const notes = [{ beat: 0, dur: 1, midi: 71 }, { beat: 1, dur: 1, midi: 68 }, { beat: 2, dur: 1, midi: 69 }, { beat: 4, dur: 1, midi: 64 }, { beat: 6, dur: 1.5, midi: 65 }];
    expect(classifyNotes(notes, plan)).toEqual(['ct', 'colour', 'wrong', 'ct', 'avoid']);
    const m = rotationMetrics(notes, plan);
    expect(m.avoidFaults).toBe(1);
    // the C span plays the default (Ionian), which adds no colour notes: only the G7 span is judged (phase 5)
    expect(m.colour).toBe(1);
    expect(m.colourSpans).toBe(1);
    expect(m.strongCt).toBeCloseTo(2 / 4);
    const st = updateModeStats({}, plan, notes, '2026-11-22');
    expect(st['V-maj|altered']).toEqual({ n: 1, cov: 1, last: '2026-11-22' });
    // a default scale never reads as weak (else the rotation would keep picking it)
    expect(st['I|ionian'].cov).toBe(1);
  });
});
