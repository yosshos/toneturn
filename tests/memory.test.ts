import { describe, expect, it } from 'vitest';
import {
  gradeMelody,
  gradeRhythm,
  melodyGame,
  melodySequence,
  rhythmPattern,
  rhythmTimeline,
  segmentNotes,
  sungToPads,
} from '../src/engine/memory';
import { newMatch, recordTurn, turnSeed } from '../src/engine/match';
import { midiToHz } from '../src/engine/pitch';
import type { SungFrame } from '../src/engine/sing';

/** Synthetic sung capture: notes [midi, seconds], optional gap seconds between them. */
function sing(notes: [number, number][], gap = 0.12, fps = 30, cents = 0): SungFrame[] {
  const out: SungFrame[] = [];
  let t = 0;
  for (const [m, dur] of notes) {
    for (let i = 0; i < dur * fps; i++) {
      out.push({ t, hz: midiToHz(m) * Math.pow(2, cents / 1200), confidence: 0.95, rms: 0.1 });
      t += 1 / fps;
    }
    for (let i = 0; i < gap * fps; i++) {
      out.push({ t, hz: null, confidence: 0, rms: 0.001 });
      t += 1 / fps;
    }
  }
  return out;
}

describe('Echo Chain: melody material', () => {
  it('pads are degrees 1-2-3-5 of a key in a singable range', () => {
    const g = melodyGame(3);
    expect(g.pads.map((p) => p.degree)).toEqual([1, 2, 3, 5]);
    expect(g.pads[0].midi).toBeGreaterThanOrEqual(55);
    expect(g.pads[3].midi - g.pads[0].midi).toBe(7);
  });
  it('sequences: deterministic per seed, different across seeds, no triple repeats', () => {
    expect(melodySequence(9, 6, 4)).toEqual(melodySequence(9, 6, 4));
    const set = new Set(Array.from({ length: 20 }, (_, s) => melodySequence(s, 6, 4).join('')));
    expect(set.size).toBeGreaterThan(15);
    for (let s = 0; s < 200; s++) {
      const q = melodySequence(s, 12, 4);
      for (let i = 2; i < q.length; i++) expect(q[i] === q[i - 1] && q[i] === q[i - 2]).toBe(false);
    }
  });
});

describe('note segmentation', () => {
  it('splits notes separated by gaps', () => {
    const n = segmentNotes(sing([[60, 0.5], [64, 0.5], [67, 0.5]]));
    expect(n.map((x) => Math.round(x.midi))).toEqual([60, 64, 67]);
  });
  it('splits legato pitch changes without a gap', () => {
    const n = segmentNotes(sing([[60, 0.5], [62, 0.5], [64, 0.5]], 0));
    expect(n.map((x) => Math.round(x.midi))).toEqual([60, 62, 64]);
  });
  it('drops tiny fragments and ignores the attack scoop', () => {
    const fr = sing([[60, 0.06], [64, 0.6]], 0.1);
    const n = segmentNotes(fr);
    expect(n.map((x) => Math.round(x.midi))).toEqual([64]);
  });
  it('octave-insensitive mapping to pads; re-attack of the same pad merges', () => {
    const g = melodyGame(3);
    const [a, , c, d] = g.pads.map((p) => p.midi);
    expect(sungToPads(g, sing([[a - 12, 0.5], [c - 12, 0.5], [d - 12, 0.5]]))).toEqual([0, 2, 3]);
    expect(sungToPads(g, sing([[a, 0.3], [a, 0.3], [d, 0.4]], 0.05))).toEqual([0, 3]);
  });
  it('out-of-tune notes map to null (wrong)', () => {
    const g = melodyGame(3);
    expect(sungToPads(g, sing([[g.pads[0].midi, 0.5]], 0.1, 30, 80))).toEqual([null]);
  });
});

describe('gradeMelody alignment', () => {
  it('exact match passes', () => {
    expect(gradeMelody([0, 1, 2], [0, 1, 2]).pass).toBe(true);
  });
  it('one missed note does not shift the rest', () => {
    const g = gradeMelody([0, 1, 2, 3], [0, 2, 3]);
    expect(g.pass).toBe(false);
    expect(g.notes.map((n) => n.status)).toEqual(['ok', 'missed', 'ok', 'ok']);
  });
  it('extra note is reported, later notes still ok', () => {
    const g = gradeMelody([0, 1, 2], [0, 3, 1, 2]);
    expect(g.extra).toBe(1);
    expect(g.notes.map((n) => n.status)).toEqual(['ok', 'ok', 'ok']);
    expect(g.pass).toBe(false);
  });
  it('wrong pitch', () => {
    expect(gradeMelody([0, 1, 2], [0, null, 2]).notes[1].status).toBe('wrong');
  });
  it('nothing captured is unclear (no penalty)', () => {
    expect(gradeMelody([0, 1], []).unclear).toBe(true);
  });
});

describe('Beat Echo: rhythm', () => {
  it('patterns start on the downbeat, grow by beats, stay on an eighth grid', () => {
    for (let s = 0; s < 100; s++) {
      for (const beats of [2, 3, 5, 8]) {
        const p = rhythmPattern(s, beats);
        expect(p.onsets[0]).toBe(0);
        expect(Math.max(...p.onsets)).toBeLessThan(beats);
        for (const o of p.onsets) expect((o * 2) % 1).toBe(0);
      }
    }
  });
  it('timeline: count-in, demo, count-in, response', () => {
    const p = rhythmPattern(1, 3, 120);
    const tl = rhythmTimeline(p);
    // Count-in, second count-in, and the soft pulse under the response (0.37: the beat never vanishes).
    expect(tl.clicks.filter((c) => c.accent)).toHaveLength(3);
    const under = tl.clicks.filter((c) => c.soft);
    expect(under.map((c) => c.t)).toEqual([0, 1, 2].map((i) => tl.responseAt + i * 0.5));
    expect(tl.responseAt).toBeCloseTo((4 + 3 + 4) * 0.5);
    expect(tl.wood[0]).toBeCloseTo(4 * 0.5);
  });
  const p = { bpm: 90, beats: 3, onsets: [0, 1, 1.5, 2] };
  const ms = (b: number) => (b * 60000) / 90;
  it('exact taps pass, mean offset reported', () => {
    const g = gradeRhythm(p, p.onsets.map((o) => ms(o) + 20));
    expect(g.pass).toBe(true);
    expect(g.meanOffsetMs).toBe(20);
  });
  it('within tolerance passes, beyond fails as missed', () => {
    expect(gradeRhythm(p, p.onsets.map((o) => ms(o) - 90)).pass).toBe(true);
    const g = gradeRhythm(p, [ms(0), ms(1), ms(1.5) + 160, ms(2)]);
    expect(g.pass).toBe(false);
    expect(g.hits[2].offsetMs).toBeNull();
    expect(g.extra).toBe(1);
  });
  it('extra tap fails; missing tap fails; silence flagged', () => {
    expect(gradeRhythm(p, [...p.onsets.map(ms), ms(2.5)]).pass).toBe(false);
    expect(gradeRhythm(p, [ms(0), ms(1), ms(2)]).pass).toBe(false);
    expect(gradeRhythm(p, []).silent).toBe(true);
  });
});

describe('local challenge rules', () => {
  it('solo continues until the first miss; best = longest completed', () => {
    let m = newMatch(['Solo'], 2);
    m = recordTurn(m, true);
    m = recordTurn(m, true);
    expect(m.length).toBe(4);
    m = recordTurn(m, false);
    expect(m.over).toBe(true);
    expect(m.players[0].best).toBe(3);
    expect(m.players[0].points).toBe(2);
  });
  it('everyone plays the round before eliminations; last standing wins', () => {
    let m = newMatch(['A', 'B', 'C'], 2);
    m = recordTurn(m, true); // A
    m = recordTurn(m, false); // B fails
    expect(m.over).toBe(false);
    expect(m.turn).toBe(2);
    m = recordTurn(m, true); // C → round ends, B out
    expect(m.players[1].alive).toBe(false);
    expect(m.length).toBe(3);
    expect(m.turn).toBe(0);
    m = recordTurn(m, true); // A
    m = recordTurn(m, false); // C fails → A wins
    expect(m.over).toBe(true);
    expect(m.winners).toEqual([0]);
    expect(m.players[0].best).toBe(3);
  });
  it('all fail in the same round → tie', () => {
    let m = newMatch(['A', 'B'], 3);
    m = recordTurn(m, false);
    m = recordTurn(m, false);
    expect(m.over).toBe(true);
    expect(m.winners).toEqual([0, 1]);
  });
  it('each turn gets a different seed, same length', () => {
    let m = newMatch(['A', 'B'], 2);
    const s1 = turnSeed(42, m);
    m = recordTurn(m, true);
    const s2 = turnSeed(42, m);
    expect(s1).not.toBe(s2);
    expect(m.length).toBe(2);
  });
  it('no turns after the match is over', () => {
    let m = newMatch(['A'], 2);
    m = recordTurn(m, false);
    expect(recordTurn(m, true)).toBe(m);
  });
});

describe('memory game options (C.4)', () => {
  it('tempo ladder speeds up every 3 rounds, capped', async () => {
    const { ladderFactor } = await import('../src/engine/memory');
    expect(ladderFactor(2, 2)).toBe(1);
    expect(ladderFactor(5, 2)).toBeCloseTo(1.08);
    expect(ladderFactor(40, 2)).toBe(1.6);
  });
  it('swing moves off-beat eighths to the triplet position', async () => {
    const { swingPattern } = await import('../src/engine/memory');
    expect(swingPattern({ bpm: 90, beats: 2, onsets: [0, 0.5, 1] }).onsets).toEqual([0, 2 / 3, 1]);
  });
  it('pad sets and swung melody playback', async () => {
    const { melodyGame, melodyEvents, PAD_SETS } = await import('../src/engine/memory');
    const g = melodyGame(3, [...PAD_SETS.full]);
    expect(g.pads).toHaveLength(7);
    const straight = melodyEvents(g, [0, 1, 2, 3]).events.map((e) => e.start);
    const swung = melodyEvents(g, [0, 1, 2, 3], true).events.map((e) => e.start);
    expect(swung[1] - swung[0]).toBeGreaterThan(straight[1] - straight[0]);
    expect(swung[2]).toBeCloseTo(straight[2]);
  });
});

describe('Echo Chain pitch tolerance (playtest)', () => {
  it('a pitchy but right melody counts with the relaxed tolerance, not with the strict one', async () => {
    const { melodyGame, sungToPads } = await import('../src/engine/memory');
    const g = melodyGame(1);
    const seq = [0, 2, 1, 3];
    const frames = seq.flatMap((p, i) => Array.from({ length: 25 }, (_, k) => ({ t: i * 0.6 + k * 0.02, hz: 440 * 2 ** ((g.pads[p].midi - 0.7 - 69) / 12), confidence: 0.95, rms: 0.1 })));
    expect(sungToPads(g, frames, 50)).toContain(null);
    expect(sungToPads(g, frames, 80)).toEqual(seq);
  });
});
