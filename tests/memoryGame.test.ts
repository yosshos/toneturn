import { describe, expect, it } from 'vitest';
import { MemoryGameController, type GameConfig, type GameInput, type GameKind } from '../src/game/memoryGame';
import { FakeAudio, FakeKnock, FakeTTS, ScriptedPitch, type SingStep } from '../src/game/fakes';
import { Cancelled, type Clock } from '../src/game/adapters';
import { beatSec, melodyGame, melodySequence } from '../src/engine/memory';
import { newMatch, turnSeed } from '../src/engine/match';
import type { AccessError } from '../src/game/adapters';

// Yields a macrotask per sleep so a game loop can never starve the test's polling.
const macroClock: Clock = {
  sleep: (_ms, signal) =>
    new Promise((res, rej) => {
      if (signal.aborted) return rej(new Cancelled());
      setTimeout(() => (signal.aborted ? rej(new Cancelled()) : res()), 0);
    }),
};

const tick = () => new Promise((r) => setTimeout(r, 0));
async function until(pred: () => boolean, max = 1500) {
  for (let i = 0; i < max; i++) {
    if (pred()) return;
    await tick();
  }
  throw new Error('condition not reached');
}

function setup(kind: GameKind, input: GameInput, players: string[], opts: { sing?: SingStep[]; knockError?: AccessError } = {}) {
  const audio = new FakeAudio();
  const tts = new FakeTTS();
  const pitch = new ScriptedPitch(opts.sing ?? []);
  const knock = new FakeKnock(opts.knockError ?? null);
  const cfg: GameConfig = { kind, input, players, seed: 7, lang: 'en', naming: 'letter', bpm: 90 };
  const overs: number[] = [];
  const c = new MemoryGameController(cfg, { audio, tts, pitch, knock, clock: macroClock, simulated: true }, { onOver: (m) => overs.push(m.players[0].best) });
  return { c, audio, tts, pitch, knock, overs };
}

/** Plays `rounds` correct turns by tapping pads, then one wrong tap. */
async function playPads(c: MemoryGameController, correctTurns: number) {
  let played = 0;
  while (!c.getView().match.over) {
    await until(() => c.getView().stage === 'respond' || c.getView().stage === 'over');
    if (c.getView().stage === 'over') break;
    const v = c.getView();
    if (played < correctTurns) v.seq.forEach((p) => c.tapPad(p));
    else c.tapPad((v.seq[0] + 1) % 4);
    played++;
    await until(() => c.getView().stage !== 'respond');
  }
}

describe('Echo Chain controller (pads)', () => {
  it('solo: chain grows until the first mistake; best is recorded', async () => {
    const { c, overs, tts } = setup('melody', 'pads', ['Me']);
    await c.start();
    await playPads(c, 3);
    await until(() => c.getView().stage === 'over');
    expect(c.getView().match.players[0].best).toBe(4); // 2,3,4 done; failed at 5
    expect(overs).toEqual([4]);
    expect(tts.spoken.some((s) => /Longest chain: 4 notes/.test(s))).toBe(true);
  });

  it('a wrong pad ends the turn immediately', async () => {
    const { c } = setup('melody', 'pads', ['Me']);
    await c.start();
    await until(() => c.getView().stage === 'respond');
    const v = c.getView();
    c.tapPad((v.seq[0] + 1) % 4);
    await until(() => c.getView().stage !== 'respond');
    expect(c.getView().result?.pass).toBe(false);
    expect(c.getView().entered).toHaveLength(1);
  });

  it('two players: announced by name, different sequences of equal length, winner declared', async () => {
    const { c, tts } = setup('melody', 'pads', ['Dana', 'Omer']);
    await c.start();
    const seqs: number[][] = [];
    // Round 1: both pass. Round 2: Dana passes, Omer fails → Dana wins.
    for (const pass of [true, true, true, false]) {
      await until(() => c.getView().stage === 'respond');
      const v = c.getView();
      seqs.push(v.seq);
      if (pass) v.seq.forEach((p) => c.tapPad(p));
      else c.tapPad((v.seq[0] + 1) % 4);
      await until(() => c.getView().stage !== 'respond');
    }
    await until(() => c.getView().stage === 'over');
    expect(tts.spoken).toContain('Dana, your turn. 2 notes.');
    expect(tts.spoken).toContain('Omer, your turn. 2 notes.');
    expect(seqs[0]).toHaveLength(2);
    expect(seqs[1]).toHaveLength(2);
    expect(seqs[2]).toHaveLength(3);
    expect(c.getView().match.winners).toEqual([0]);
    expect(tts.spoken.at(-1)).toBe('Dana wins!');
  });

  it('rematch resets the match', async () => {
    const { c } = setup('melody', 'pads', ['Me']);
    await c.start();
    await playPads(c, 0);
    await until(() => c.getView().stage === 'over');
    c.rematch();
    await until(() => c.getView().stage === 'respond');
    expect(c.getView().match.over).toBe(false);
    expect(c.getView().seq).toHaveLength(2);
  });
});

describe('Echo Chain controller (singing)', () => {
  it('sung melody is segmented and graded; silence replays the turn without penalty', async () => {
    // The first turn's sequence is deterministic: same seed, same turn number.
    const g = melodyGame(7);
    const seq = melodySequence(turnSeed(7, newMatch(['Me'], 2)), 2, g.pads.length);
    const { c } = setup('melody', 'sing', ['Me'], {
      sing: [{ silence: true }, { midis: seq.map((p) => g.pads[p].midi - 12) }, { midis: [g.pads[0].midi + 1.5] }],
    });
    await c.start();
    await until(() => c.getView().stage === 'over');
    const log = c.getView().match.log;
    expect(log.map((x) => x.pass)).toEqual([true, false]); // silence did not count
    expect(c.getView().match.players[0].best).toBe(2);
  });
});

describe('Beat Echo controller', () => {
  const ms = (beats: number) => beats * beatSec(90) * 1000;

  it('tap: accurate taps pass, the chain grows by a beat, a missing tap ends it', async () => {
    const { c, audio } = setup('rhythm', 'tap', ['Me']);
    let turn = 0;
    audio.respond = (start) => {
      const p = c.getView().pattern!;
      const onsets = turn++ < 2 ? p.onsets : p.onsets.slice(1); // 3rd turn: miss the first onset
      onsets.forEach((o) => c.tapBeat(start + ms(o) + 25));
    };
    await c.start();
    await until(() => c.getView().stage === 'over');
    const m = c.getView().match;
    expect(m.log.map((x) => [x.length, x.pass])).toEqual([
      [2, true],
      [3, true],
      [4, false],
    ]);
    expect(m.players[0].best).toBe(3);
  });

  it('taps during the count-in are ignored; latency correction applies', async () => {
    const { c, audio } = setup('rhythm', 'tap', ['Me']);
    (c as unknown as { cfg: { latencyMs: number } }).cfg.latencyMs = 60;
    audio.respond = (start) => {
      c.tapBeat(start - 1500); // count-in
      c.getView().pattern!.onsets.forEach((o) => c.tapBeat(start + ms(o) + 60));
    };
    await c.start();
    await until(() => c.getView().stage === 'result');
    expect(c.getView().result?.pass).toBe(true);
    expect(c.getView().result?.rhythm?.meanOffsetMs).toBe(0);
    c.dispose();
  });

  it('knock: microphone onsets are used; the app ignores knocks before the response', async () => {
    const { c, audio, knock } = setup('rhythm', 'knock', ['Me']);
    let turns = 0;
    audio.respond = (start) => {
      if (turns++ > 0) return; // second turn: silence → fail
      knock.onKnock?.(start - 2000);
      c.getView().pattern!.onsets.forEach((o) => knock.onKnock?.(start + ms(o) - 30));
    };
    await c.start();
    await until(() => c.getView().stage === 'over');
    expect(c.getView().match.log.map((x) => x.pass)).toEqual([true, false]);
  });

  it('knock with denied mic shows the access error instead of failing the player', async () => {
    const err: AccessError = { stage: 'capture', code: 'permission-denied', raw: 'NotAllowedError' };
    const { c } = setup('rhythm', 'knock', ['Me'], { knockError: err });
    await c.start();
    await until(() => c.getView().error !== null);
    expect(c.getView().match.log).toHaveLength(0);
    c.setInput('tap');
    await until(() => c.getView().stage === 'respond' || c.getView().match.log.length > 0);
    expect(c.getView().error).toBeNull();
  });

  it('pause and resume replay the same turn', async () => {
    const { c, audio } = setup('rhythm', 'tap', ['A', 'B']);
    let first = true;
    audio.respond = () => {
      if (first) {
        first = false;
        c.pause();
      }
    };
    await c.start();
    await until(() => c.getView().stage === 'paused');
    expect(c.getView().match.log).toHaveLength(0);
    let n = 0;
    audio.respond = (start) => {
      if (n++ < 2) c.getView().pattern!.onsets.forEach((o) => c.tapBeat(start + ms(o)));
    };
    c.resume();
    await until(() => c.getView().match.log.length >= 2);
    expect(c.getView().match.log.every((x) => x.pass)).toBe(true);
    c.dispose();
  });
});
