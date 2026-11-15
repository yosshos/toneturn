import { describe, expect, it } from 'vitest';
import { CARD_IDS, RULE_CARDS, VQ_IV, cardKept, checkCard, spansOfChart, spansOfVChords, type CNote, type CSpan, type CardCtx, type CardOpt } from '../src/engine/ruleCards';
import { CHALLENGES, CHALLENGE_GROUPS, EXTRA_RULES, INTERVAL_RULES, NOTE_RULES, RHYTHM_RULES, RULE_NAME, SHAPE_RULES, VOCAB_RULES, challengeOf, checkRules, ruleCheck } from '../src/engine/improvRules';
import { parseChart } from '../src/engine/charts';
import { LICKS } from '../src/engine/licks';

// AUDIT-DEPTH-3 C5: every rule card on a synthetic line it keeps and one it breaks.

const MAJ7 = [0, 4, 7, 11];
const M7 = [0, 3, 7, 10];
const DOM = [0, 4, 7, 10];
const S = (at: number, beats: number, root: number, iv: number[]): CSpan => ({ at, beats, root, iv });
const C4 = (bars = 4) => [S(0, bars * 4, 0, MAJ7)];
const IIVI = [S(0, 4, 2, M7), S(4, 4, 7, DOM), S(8, 8, 0, MAJ7)];
type N = [beat: number, midi: number, dur?: number, extra?: Partial<CNote>];
const ctx = (ns: N[], spans: CSpan[], opt?: CardOpt, bpm = 120): CardCtx => ({ notes: ns.map(([beat, midi, dur = 0.5, x]) => ({ beat, midi, dur, ...x })), spans, meter: 4, bpm, opt });
const eighths = (start: number, ps: number[], dur = 0.5): N[] => ps.map((p, i) => [start + i * 0.5, p, dur]);
const kept = (id: string, c: CardCtx) => cardKept(id, checkCard(id, c));
function both(id: string, pass: CardCtx, fail: CardCtx) {
  expect(kept(id, pass), `${id} keeps`).toBe(true);
  expect(kept(id, fail), `${id} breaks`).toBe(false);
}

describe('rule cards: the library', () => {
  it('every card has en + he names and how-tos, a level 1–5, a path difficulty in 700–1900', () => {
    expect(CARD_IDS.length).toBeGreaterThanOrEqual(45);
    for (const c of Object.values(RULE_CARDS)) {
      expect(c.name.en.length > 0 && /[֐-׿]/.test(c.name.he) && /[֐-׿]/.test(c.how.he), c.id).toBe(true);
      expect(c.level >= 1 && c.level <= 5, c.id).toBe(true);
      expect(c.diff >= 700 && c.diff <= 1900, c.id).toBe(true);
      expect(c.pass > 0 && c.pass <= 1, c.id).toBe(true);
      expect(/[\u{1F300}-\u{1FAFF}]/u.test(c.name.en + c.name.he + c.how.en + c.how.he), c.id).toBe(false);
    }
  });
  it('every card sits in exactly one studio slot, and every challenge rule exists', () => {
    const slots = [NOTE_RULES, INTERVAL_RULES, RHYTHM_RULES, SHAPE_RULES, VOCAB_RULES, EXTRA_RULES] as string[][];
    for (const id of CARD_IDS) expect(slots.filter((s) => s.includes(id)).length, id).toBe(1);
    for (const c of CHALLENGES) {
      if (c.rules.note) expect(NOTE_RULES).toContain(c.rules.note);
      if (c.rules.interval) expect(INTERVAL_RULES).toContain(c.rules.interval);
      if (c.rules.rhythm) expect(RHYTHM_RULES).toContain(c.rules.rhythm);
      if (c.rules.shape) expect(SHAPE_RULES).toContain(c.rules.shape);
      if (c.rules.vocab) expect(VOCAB_RULES).toContain(c.rules.vocab);
      if (c.rules.extra) expect(EXTRA_RULES).toContain(c.rules.extra);
      expect(CHALLENGE_GROUPS[c.group], c.id).toBeTruthy();
      expect(challengeOf(c.rules)?.id, c.id).toBe(c.id);
      for (const r of [c.rules.note, c.rules.interval, c.rules.rhythm, c.rules.shape, c.rules.vocab, c.rules.extra]) if (r) expect(RULE_NAME[r].how.he.length).toBeGreaterThan(5);
    }
    expect(CHALLENGES.filter((c) => c.group === 'vocab').length).toBeGreaterThanOrEqual(10);
    // challenges that combine 2–3 rules with a card
    const cardCombos = CHALLENGES.filter((c) => {
      const rs = [c.rules.note, c.rules.interval, c.rules.rhythm, c.rules.shape, c.rules.vocab, c.rules.extra].filter(Boolean) as string[];
      return rs.length >= 2 && rs.length <= 3 && rs.some((r) => r in RULE_CARDS);
    });
    expect(cardCombos.length).toBeGreaterThanOrEqual(15);
    expect(new Set(CHALLENGES.map((c) => c.id)).size).toBe(CHALLENGES.length);
  });
  it('spans from a chart (repeated) and from bebopVocab chords', () => {
    const sp = spansOfChart(parseChart('Dm7 | G7 | Cmaj7 | Cmaj7'), 4, 8);
    expect(sp.length).toBe(8);
    expect(sp[4]).toMatchObject({ at: 16, beats: 4, root: 2 });
    expect(sp[7]).toMatchObject({ at: 28, beats: 4, root: 0 });
    // a chart shorter than the take repeats; a take that stops mid-chart cuts the last chord
    expect(spansOfChart(parseChart('Dm7 G7 | Cmaj7'), 4, 3).map((x) => [x.at, x.beats])).toEqual([[0, 2], [2, 2], [4, 4], [8, 2], [10, 2]]);
    expect(spansOfVChords([{ r: 7, q: '7b9', beats: 4 }, { r: 0, q: 'm6', beats: 4 }])).toEqual([S(0, 4, 7, VQ_IV['7b9']), S(4, 4, 0, VQ_IV.m6)]);
  });
  it('ruleCheck runs the 51 library rules and the cards on one context', () => {
    const line = ctx(eighths(0, [60, 62, 64, 65, 67, 69, 71, 72]), C4(1));
    const ct = ruleCheck('chord-tones', line);
    expect(ct.total).toBe(8);
    expect(ct.ok).toBe(5);
    expect(ruleCheck('steps', line)).toEqual({ ok: 7, total: 7 });
    expect(ruleCheck('harris', line).ok).toBe(8);
  });
  it('checkRules takes a card in the vocab slot and keeps the old rules unchanged', () => {
    const chart = parseChart('Cmaj7');
    const played = eighths(0, [60, 62, 64, 65, 67, 69, 71, 72]).map(([b, m]) => ({ start: b / 2, end: b / 2 + 0.25, midi: m }));
    const r = checkRules(played, chart, 4, 120, { note: 'chord-tones', interval: null, rhythm: null, vocab: 'harris' }, {}, 1);
    expect(r.checks.map((c) => c.rule).sort()).toEqual(['chord-tones', 'harris']);
    expect(r.checks.find((c) => c.rule === 'chord-tones')).toMatchObject({ ok: 5, total: 8 });
    expect(r.checks.find((c) => c.rule === 'harris')).toMatchObject({ ok: 8, total: 8 });
  });
});

describe('rule cards: vocabulary', () => {
  it('harris: chord tones on the beats, scale tones between; a missing chord tone on a beat is flagged', () => {
    both('harris', ctx(eighths(0, [60, 62, 64, 65, 67, 69, 71, 72]), C4(1)), ctx(eighths(0, [62, 64, 65, 67, 69, 71, 72, 74]), C4(1)));
    const miss = checkCard('harris', ctx(eighths(0, [62, 64, 65, 67, 69, 71, 72, 74]), C4(1)));
    expect(miss.miss).toContain(0);
  });
  it('pivot: the root on top, a 6th down, climbing — not the straight arpeggio', () => {
    both('pivot', ctx([...eighths(0, [72, 64, 67, 71]), [2, 72, 2]], C4(4)), ctx([...eighths(0, [60, 64, 67, 71]), [2, 72, 2]], C4(4)));
  });
  it('enc-ab: half step above, half step below, the chord tone on the beat', () => {
    both('enc-ab', ctx([[0, 60], [0.5, 62], [1, 65], [1.5, 63], [2, 64, 2]], C4(4)), ctx([[0, 60], [0.5, 62], [1, 62], [1.5, 63], [2, 64, 2]], C4(4)));
  });
  it('enc-ba: half step below, half step above', () => {
    both('enc-ba', ctx([[1, 63], [1.5, 65], [2, 64, 2]], C4(4)), ctx([[1, 65], [1.5, 63], [2, 64, 2]], C4(4)));
  });
  it('enc-step: the scale step above, the half step below', () => {
    both('enc-step', ctx([[1, 69], [1.5, 66], [2, 67, 2]], C4(4)), ctx([[1, 68], [1.5, 66], [2, 67, 2]], C4(4)));
  });
  it('enc-bebop: whole step above, half step above, half step below', () => {
    both('enc-bebop', ctx([[0.5, 66], [1, 65], [1.5, 63], [2, 64, 2]], C4(4)), ctx([[1, 66], [1.5, 65], [2, 64, 2]], C4(4)));
  });
  it('enc-delayed: above, below, a step lower, back, the target', () => {
    both('enc-delayed', ctx([[0, 65], [0.5, 63], [1, 62], [1.5, 63], [2, 64, 2]], C4(4)), ctx([[1, 65], [1.5, 63], [2, 64, 2]], C4(4)));
  });
  it('approach: each new chord entered from a half step', () => {
    const base: N[] = [[0, 62], [1, 65], [2, 69], [3, 65]];
    both('approach', ctx([...base, [3.5, 70], [4, 71], [5, 74], [6, 77], [7, 67], [7.5, 65], [8, 64, 2]], IIVI), ctx([...base, [3.5, 67], [4, 71], [5, 74], [6, 77], [7, 67], [7.5, 60], [8, 64, 2]], IIVI));
  });
  it('triad-pair: D + Em over Cmaj7 (lydian pair), both triads; C and F are out', () => {
    both('triad-pair', ctx(eighths(0, [62, 66, 69, 64, 67, 71]), C4(1)), ctx(eighths(0, [60, 65, 62, 66, 60, 65]), C4(1)));
  });
  it('pent-super: G major pentatonic over Cmaj7', () => {
    both('pent-super', ctx(eighths(0, [67, 69, 71, 74, 76]), C4(1)), ctx(eighths(0, [60, 65, 61, 66]), C4(1)));
  });
  it('use-lick: a library lick over its chords is found; repeated notes are not', () => {
    const lick = LICKS.find((l) => l.id === 'maj-arp')!;
    let at = 0;
    const spans = lick.chords.map(([r, q, b]) => {
      const s = S(at, b, r, VQ_IV[q] ?? MAJ7);
      at += b;
      return s;
    });
    const pass = ctx(lick.notes.map(([semi, beat, dur]) => [beat, 60 + semi, dur] as N), spans);
    const fail = ctx(Array.from({ length: 12 }, (_, i) => [i, 60, 1] as N), spans);
    both('use-lick', pass, fail);
    // only the licks the player mastered count
    expect(kept('use-lick', { ...pass, opt: { lickIds: ['min-arp'] } })).toBe(false);
  });
  it('guide-target: a 3rd or 7th on beat 1 of each chord', () => {
    both('guide-target', ctx([[0, 65, 4], [4, 65, 4], [8, 64, 4]], IIVI), ctx([[0, 62, 4], [4, 67, 4], [8, 60, 4]], IIVI));
  });
  it('quote-head: four notes of the melody in any key; no melody = not judged', () => {
    const melody = [60, 62, 64, 67, 65].map((midi, i) => ({ beat: i, midi }));
    both('quote-head', ctx(eighths(0, [65, 67, 69, 72]), C4(1), { melody }), ctx(eighths(0, [60, 61, 62, 63]), C4(1), { melody }));
    expect(checkCard('quote-head', ctx(eighths(0, [65, 67, 69, 72]), C4(1))).total).toBe(0);
  });
  it('target-ct: a chord tone where each chord begins', () => {
    both('target-ct', ctx([[0, 62, 4], [4, 67, 4], [8, 60, 4]], IIVI), ctx([[0, 64, 4], [4, 69, 4], [8, 62, 4]], IIVI));
  });
  it('inside: scale tones or a half step into the next note', () => {
    both('inside', ctx([...eighths(0, [60, 62, 63, 64, 65])], C4(1)), ctx([[0, 61, 1], [1, 66, 1], [2, 70, 1], [3, 63, 1]], C4(1)));
  });
  it('active: notes in three bars of four', () => {
    both('active', ctx([[0, 60], [4, 62], [8, 64], [12, 65]], C4(4)), ctx([[0, 60], [1, 62]], C4(4)));
  });
});

describe('rule cards: notes', () => {
  it('tensions: 9, ♯11, 13 over Cmaj7 — not 1 3 5', () => {
    both('tensions', ctx(eighths(0, [62, 66, 69, 74]), C4(1)), ctx(eighths(0, [60, 64, 67, 72]), C4(1)));
  });
  it('three-on-one: the 3rd on beat 1 of each chord', () => {
    both('three-on-one', ctx([[0, 65, 4], [4, 71, 4], [8, 64, 4]], IIVI), ctx([[0, 62, 4], [4, 67, 4], [8, 60, 4]], IIVI));
  });
  it('flat9: the ♭9 on a beat over every dominant', () => {
    const sp = [S(0, 4, 7, DOM), S(4, 4, 0, MAJ7), S(8, 4, 7, DOM), S(12, 4, 0, MAJ7)];
    both('flat9', ctx([[0, 67], [1, 68], [2, 65], [4, 64], [8, 67], [9, 68], [12, 64]], sp), ctx([[0, 67], [1, 69], [2, 65], [4, 64], [8, 67], [9, 69], [12, 64]], sp));
  });
  it('side-slip: three notes a half step out, then a chord tone', () => {
    both('side-slip', ctx([...eighths(0, [61, 63, 66]), [1.5, 67, 2]], C4(4)), ctx([...eighths(0, [62, 64, 65]), [1.5, 67, 2]], C4(4)));
  });
  it('tritone-sub: D♭7 over G7', () => {
    both('tritone-sub', ctx(eighths(0, [61, 65, 68, 71]), [S(0, 4, 7, DOM)]), ctx(eighths(0, [67, 71, 74, 65]), [S(0, 4, 7, DOM)]));
  });
  it('bebop-scale: the dominant bebop scale with chord tones on the beats', () => {
    both('bebop-scale', ctx(eighths(0, [67, 66, 65, 64, 62, 60, 59, 57]), [S(0, 4, 7, DOM)]), ctx(eighths(0, [69, 67, 72, 71, 64, 62, 60, 59]), [S(0, 4, 7, DOM)]));
  });
  it('pent-5th-up: A minor pentatonic over Dm7', () => {
    both('pent-5th-up', ctx(eighths(0, [69, 72, 74, 76, 79]), [S(0, 4, 2, M7)]), ctx(eighths(0, [63, 66, 70, 61]), [S(0, 4, 2, M7)]));
  });
  it('mm-alt: the altered scale over G7, with an alteration', () => {
    both('mm-alt', ctx(eighths(0, [68, 70, 71, 73, 75]), [S(0, 4, 7, DOM)]), ctx(eighths(0, [67, 69, 71, 72, 74]), [S(0, 4, 7, DOM)]));
  });
});

describe('rule cards: intervals and rhythm', () => {
  it('wide: every move a 4th or wider', () => {
    both('wide', ctx(eighths(0, [60, 65, 72, 67, 60]), C4(1)), ctx(eighths(0, [60, 62, 64, 65]), C4(1)));
  });
  it('start-two: phrases begin on beat 2', () => {
    both('start-two', ctx([...eighths(1, [60, 62, 64]), ...eighths(5, [64, 62, 60])], C4(2)), ctx([...eighths(0, [60, 62, 64]), ...eighths(4, [64, 62, 60])], C4(2)));
  });
  it('bars-2: two-bar phrases', () => {
    const two = (b: number) => eighths(b, Array.from({ length: 16 }, (_, i) => 60 + (i % 5)));
    both('bars-2', ctx([...two(0), ...two(12)], C4(5)), ctx([...eighths(0, [60, 62]), ...eighths(4, [64, 62])], C4(2)));
  });
  it('rest-bar: a whole bar of rest between phrases', () => {
    both('rest-bar', ctx([...eighths(0, [60, 62, 64, 65]), ...eighths(7, [64, 62])], C4(3)), ctx([...eighths(0, [60, 62, 64, 65]), ...eighths(3.5, [64, 62])], C4(3)));
  });
  it('double-bar: one bar of 16ths in four', () => {
    const six: N[] = Array.from({ length: 16 }, (_, i) => [4 + i * 0.25, 60 + (i % 7), 0.25]);
    both('double-bar', ctx([[0, 60, 1], ...six, [8, 64, 1], [12, 60, 1]], C4(4)), ctx([...eighths(0, Array.from({ length: 16 }, (_, i) => 60 + (i % 7)))], C4(4)));
  });
  it('displace: the motif again, a beat later', () => {
    both('displace', ctx([...eighths(0, [60, 62, 64, 62]), ...eighths(9, [65, 67, 69, 67])], C4(4)), ctx([...eighths(0, [60, 62, 64, 62]), ...eighths(8, [65, 67, 69, 67])], C4(4)));
  });
  it('behind / ahead: steady 40 ms late or early at ♩120', () => {
    const at = (d: number): N[] => [1, 2, 3, 4, 5, 6].map((b) => [b + d, 60 + b, 0.5]);
    both('behind', ctx(at(0.08), C4(2)), ctx(at(0), C4(2)));
    both('ahead', ctx(at(-0.08), C4(2)), ctx(at(0.08), C4(2)));
  });
  it('sparse: four notes a bar at most', () => {
    both('sparse', ctx([[0, 60, 1], [1, 62, 1], [2, 64, 1], [4, 65, 2]], C4(2)), ctx(eighths(0, [60, 62, 64, 65, 67, 69, 71, 72]), C4(2)));
  });
  it('call-response: the answer keeps the rhythm on new notes', () => {
    both('call-response', ctx([...eighths(0, [60, 62, 64]), ...eighths(4, [67, 65, 64])], C4(2)), ctx([[0, 60], [0.5, 62], [1, 64], [4, 67], [5, 65], [6, 64]], C4(2)));
  });
});

describe('rule cards: shape', () => {
  it('motif-dev: transposed, then inverted', () => {
    both('motif-dev', ctx([...eighths(0, [60, 62, 64]), ...eighths(4, [65, 67, 69]), ...eighths(8, [72, 70, 68])], C4(3)), ctx([...eighths(0, [60, 62, 64]), ...eighths(4, [60, 65, 58]), ...eighths(8, [72, 60, 71])], C4(3)));
  });
  it('repeat-vary: the same head, a new ending', () => {
    both('repeat-vary', ctx([...eighths(0, [60, 62, 64, 65, 67]), ...eighths(4, [60, 62, 64, 65, 60])], C4(2)), ctx([...eighths(0, [60, 62, 64, 65, 67]), ...eighths(4, [60, 64, 67, 72, 71])], C4(2)));
  });
  it('end-guide: every phrase ends on a 3rd or 7th', () => {
    both('end-guide', ctx([...eighths(0, [60, 62, 64]), ...eighths(4, [67, 69, 71])], C4(2)), ctx([...eighths(0, [62, 64, 60]), ...eighths(4, [69, 71, 72])], C4(2)));
  });
  it('chrom-up: three half steps up into a chord tone on the beat', () => {
    both('chrom-up', ctx([[0.5, 64], [1, 65], [1.5, 66], [2, 67, 2]], C4(1)), ctx(eighths(0, [60, 62, 64, 65]), C4(1)));
  });
  it('full-range: two octaves', () => {
    both('full-range', ctx([[0, 48], [1, 60], [2, 74]], C4(1)), ctx([[0, 60], [1, 65], [2, 70]], C4(1)));
  });
  it('fall-chord: down over every chord', () => {
    const sp = [S(0, 4, 2, M7), S(4, 4, 7, DOM)];
    both('fall-chord', ctx([...eighths(0, [74, 72, 69, 65]), ...eighths(4, [71, 67, 65, 62])], sp), ctx([...eighths(0, [62, 65, 69, 72]), ...eighths(4, [62, 65, 67, 71])], sp));
  });
});

describe('rule cards: touch and instrument', () => {
  const vel = (ps: [number, number][]): N[] => ps.map(([b, v], i) => [b, 60 + i, 0.5, { vel: v }]);
  it('ghost: a much softer note in every bar (needs velocity)', () => {
    both('ghost', ctx(vel([[0, 100], [1, 30], [2, 100], [4, 95], [5, 25], [6, 100]]), C4(2)), ctx(vel([[0, 90], [1, 92], [2, 88], [4, 90], [5, 91], [6, 90]]), C4(2)));
    expect(checkCard('ghost', ctx(eighths(0, [60, 62, 64]), C4(1))).total).toBe(0);
  });
  it('accent-off: the "ands" louder', () => {
    both('accent-off', ctx(vel([[0, 60], [0.5, 100], [1, 60], [1.5, 100]]), C4(1)), ctx(vel([[0, 100], [0.5, 60], [1, 100], [1.5, 60]]), C4(1)));
  });
  it('one-string: every note on one string (needs the string)', () => {
    const on = (ss: number[]): N[] => ss.map((s, i) => [i, 60 + i, 1, { string: s }]);
    both('one-string', ctx(on([2, 2, 2, 2]), C4(1)), ctx(on([2, 3, 1, 2]), C4(1)));
    expect(checkCard('one-string', ctx(eighths(0, [60, 62]), C4(1))).total).toBe(0);
  });
  it('double-stops and octaves', () => {
    const pairs = (iv: number): N[] => [0, 1, 2, 3].flatMap((b) => [[b, 60, 1], [b, 60 + iv, 1]] as N[]);
    both('double-stops', ctx(pairs(4), C4(1)), ctx(eighths(0, [60, 62, 64, 65]), C4(1)));
    both('octaves', ctx(pairs(12), C4(1)), ctx(pairs(4), C4(1)));
  });
  it('imply-roots: the root on each chord’s first beat', () => {
    both('imply-roots', ctx([[0, 38, 1], [1, 41], [4, 43, 1], [5, 47], [8, 36, 1]], IIVI), ctx([[0, 41, 1], [4, 47, 1], [8, 40, 1]], IIVI));
  });
  it('lh-shells: root + 3rd or 7th under the split (needs the split)', () => {
    const sp = [S(0, 4, 2, M7), S(4, 4, 7, DOM)];
    const rh = eighths(0, [72, 74, 76, 77, 79, 77, 76, 74]);
    both('lh-shells', ctx([[0, 50, 4], [0, 53, 4], [4, 43, 4], [4, 53, 4], ...rh], sp, { split: 60 }), ctx([[0, 53, 4], [0, 57, 4], [4, 47, 4], [4, 50, 4], ...rh], sp, { split: 60 }));
    expect(checkCard('lh-shells', ctx(rh, sp)).total).toBe(0);
  });
});
