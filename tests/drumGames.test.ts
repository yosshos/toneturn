import { describe, expect, it } from 'vitest';
import { DRUM_GAMES, drumRound, landCue, runSummary, scoreRound, type DrumRound } from '../src/engine/drumGames';
import { analyzeDrumTake, type DrumTakeHit } from '../src/engine/drills/drumAnalyze';
import { expTimeMs } from '../src/engine/drills/analyze';
import { clearsRun, gameXp, GAME_TIERS, TIERS } from '../src/engine/gameTiers';
import { COURSE_GAMES } from '../src/ui/courseRows';
import { GAME_STEPS, gameForArea } from '../src/engine/path';

const take = (r: DrumRound, tweak: (n: DrumRound['drill']['notes'][number], on: number) => number = (_n, on) => on) => {
  const hits: DrumTakeHit[] = r.drill.notes.map((n) => ({ voice: n.voice!, on: tweak(n, expTimeMs(r.drill, n.beat, r.bpm)), vel: n.accent ? 115 : n.ghost ? 25 : 80 }));
  return analyzeDrumTake(r.drill, r.bpm, hits);
};

describe('drum games P1', () => {
  it('every game × tier builds a playable round that a clean take passes', () => {
    for (const g of DRUM_GAMES)
      for (const t of TIERS)
        for (const round of [0, 3]) {
          const r = drumRound(g, t, round, 1234);
          expect(r.drill.notes.length).toBeGreaterThan(4);
          expect(r.drill.spec.instrument).toBe('drums');
          const m = take(r);
          const s = scoreRound(r, m);
          expect(s.ok, `${g} ${t} ${round}: ${m.why.en} ${s.line.en}`).toBe(true);
        }
  });
  it('rounds are seeded: same seed same round, another seed differs somewhere', () => {
    expect(drumRound('groove-echo', 'p', 1, 7).drill.notes).toEqual(drumRound('groove-echo', 'p', 1, 7).drill.notes);
    const a = [1, 2, 3, 4, 5].map((s) => JSON.stringify(drumRound('land', 'mf', 0, s).fills));
    expect(new Set(a).size).toBeGreaterThan(1);
  });
  it('Land It: a late landing fails; the cue names the fill one bar ahead', () => {
    const r = drumRound('land', 'mp', 0, 99);
    const late = take(r, (n, on) => (r.landings!.includes(n.beat) ? on + 60 : on));
    expect(scoreRound(r, late).ok).toBe(false);
    const f = r.fills![0];
    expect(landCue(r, (f.bar - 1) * 4 + 1)?.en).toMatch(/Fill/);
  });
  it('Land It: a rushed fill fails', () => {
    const r = drumRound('land', 'f', 0, 5);
    const f = r.fills![0];
    const z0 = f.bar * 4 + 4 - f.beats;
    const beatMs = 60000 / r.bpm;
    // The fill played 6 % fast (starting on time, compressing toward the landing).
    const rushed = take(r, (n, on) => (n.beat >= z0 - 1e-6 && n.beat < f.bar * 4 + 4 - 1e-6 ? on - (n.beat - z0) * beatMs * 0.06 : on));
    expect(scoreRound(r, rushed).ok).toBe(false);
  });
  it('Odd-meter Echo: accents on the wrong grouping fail', () => {
    const r = drumRound('odd-echo', 'p', 0, 3);
    const starts = new Set(r.odd!.groups.map((_, k) => r.odd!.groups.slice(0, k).reduce((a, b) => a + b, 0)));
    const wrong = new Set([...Array(r.odd!.num).keys()].filter((i) => !starts.has(i)).slice(0, starts.size));
    const hits: DrumTakeHit[] = r.drill.notes.map((n) => ({ voice: n.voice!, on: expTimeMs(r.drill, n.beat, r.bpm), vel: wrong.has(Math.round(n.beat) % r.odd!.num) ? 115 : 70 }));
    expect(scoreRound(r, analyzeDrumTake(r.drill, r.bpm, hits)).ok).toBe(false);
    // The click must not give the grouping away.
    expect(r.drill.groups).toBeUndefined();
  });
  it('run summary clears the tier rule and gives XP', () => {
    const ok = { ok: true, points: 90, line: { en: '', he: '' } };
    const bad = { ok: false, points: 0, line: { en: '', he: '' } };
    for (const g of DRUM_GAMES) {
      const good = runSummary('mf', [ok, ok, ok, ok, bad]);
      expect(clearsRun(g, 'mf', good.score, good.detail)).toBe(true);
      const poor = runSummary('mf', [ok, bad, bad, ok, bad]);
      expect(clearsRun(g, 'mf', poor.score, poor.detail)).toBe(false);
      expect(gameXp(g, 'mf', good.score, good.detail)).toBeGreaterThan(0);
    }
  });
  it('wired: tiers, the drums games list, path game steps for drums only', () => {
    for (const g of DRUM_GAMES) {
      expect(Object.keys(GAME_TIERS[g].tiers)).toEqual(TIERS);
      expect(COURSE_GAMES.drums).toContain(g);
      expect(GAME_STEPS[g].forPlays).toEqual(['drums']);
      for (const c of ['keys', 'guitar', 'bass', 'ear'] as const) expect(COURSE_GAMES[c]).not.toContain(g);
    }
    const base = { noMic: false, noSing: false, packs: [] as never[] };
    expect(['land', 'groove-echo', 'odd-echo']).toContain(gameForArea('instrument', 0, { ...base, plays: ['drums'], course: 'drums' }));
    expect(gameForArea('instrument', 0, { ...base, plays: ['keys'], course: 'keys' })).toBe('drills');
  });
});
