import { describe, expect, it } from 'vitest';
import { debrief, stepChallenge } from '../src/engine/improvCoach';
import { CHALLENGES, type RulesReport } from '../src/engine/improvRules';
import { parseChart } from '../src/engine/charts';

const chart = parseChart('Dm7 | G7 | Cmaj7 | A7');
const bebop = CHALLENGES.find((c) => c.id === 'land-3')!;
const rep = (score: number, breaks: number[], checks = [{ rule: 'target-3' as const, ok: Math.round(score * 10), total: 10 }, { rule: 'eighths' as const, ok: 9, total: 10 }]): RulesReport => ({ notes: 30, checks, bars: breaks.map((b) => ({ notes: 8, breaks: b })), score });

describe('the debrief after a chorus', () => {
  it('a strong take moves up a level in the same group', () => {
    const d = debrief(rep(0.9, [0, 0, 0, 0]), chart, 4, bebop.rules, 120);
    expect(d.next.kind).toBe('harder');
    expect(d.next.challenge!.level).toBe(bebop.level + 1);
    expect(d.where).toBeNull();
  });
  it('a middling take repeats at the same tempo and names the weakest rule and where it broke', () => {
    const d = debrief(rep(0.7, [0, 3, 2, 0], [{ rule: 'target-3', ok: 5, total: 10 }, { rule: 'eighths', ok: 9, total: 10 }]), chart, 4, bebop.rules, 120);
    expect(d.next.kind).toBe('again');
    expect(d.next.bpm).toBe(120);
    expect(d.work!.en).toMatch(/Land on the 3rd/);
    expect(d.good!.en).toMatch(/Continuous eighths/);
    expect(d.where!.en).toMatch(/bars 2–3 \(G7 → Cmaj7\)/);
  });
  it('a weak take slows down first, then steps back a level at slow tempos', () => {
    expect(debrief(rep(0.4, [1, 1, 1, 1]), chart, 4, bebop.rules, 120).next).toMatchObject({ kind: 'easier', bpm: 105 });
    const slow = debrief(rep(0.4, [1, 1, 1, 1]), chart, 4, bebop.rules, 64).next;
    expect(slow.kind).toBe('easier');
    expect(slow.challenge!.level).toBe(bebop.level - 1);
  });
  it('every challenge but the hardest has a next one', () => {
    for (const c of CHALLENGES.filter((x) => x.level < 5)) expect(stepChallenge(c, 1), c.id).not.toBeNull();
  });
});

import { framesFromNotes, improvReportBy } from '../src/engine/perform';
describe('MIDI takes get the musical report too', () => {
  it('notes become frames that the same analysis reads', () => {
    // C major arpeggio in quarters at 120 BPM over C: chord tones on the strong beats, ends on a chord tone
    const notes = [60, 64, 67, 72, 67, 64, 60, 59, 60].map((m, i) => ({ start: i * 0.5, end: i * 0.5 + 0.4, midi: m }));
    const rep = improvReportBy(framesFromNotes(notes), () => [0, 4, 7], 120);
    expect(rep.notes).toBe(9);
    expect(rep.endsOnChordTone).toBe(true);
    expect(rep.strongChordTones).toBeGreaterThan(0.8);
    expect(rep.rangeSemis).toBe(13);
  });
});
