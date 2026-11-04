import { describe, expect, it } from 'vitest';
import { FakeRoomServer } from '../src/game/roomFake';
import { createRoom, RoomController, roomStandings } from '../src/game/roomController';
import { FakeAudio, FakeTTS } from '../src/game/fakes';
import { Cancelled, type Clock } from '../src/game/adapters';
import { normaliseCode, ROOM_CODE_RE, RoomError } from '../src/cloud/rooms';
import { tournamentSet } from '../src/engine/tournament';

let t = 0;
/** Short waits pass immediately; long ones (the answer window, fallbacks) wait until cancelled. */
const clock: Clock = {
  now: () => t,
  sleep: (ms, signal) =>
    new Promise((res, rej) => {
      if (signal.aborted) return rej(new Cancelled());
      signal.addEventListener('abort', () => rej(new Cancelled()), { once: true });
      if (ms < 3000) setTimeout(res, 0);
    }),
};
const tick = () => new Promise((r) => setTimeout(r, 0));
async function until(pred: () => boolean, max = 4000) {
  for (let i = 0; i < max; i++) {
    if (pred()) return;
    await tick();
  }
  throw new Error('condition not reached');
}
const ad = () => ({ audio: new FakeAudio(), tts: new FakeTTS(), clock });
const opts = { pollMs: 60_000, revealMs: 10, hostGraceMs: 5000 };

describe('room codes', () => {
  it('normalises typed codes', () => {
    expect(normaliseCode(' ab-c 2d9x ')).toBe('ABC2D9');
    expect(ROOM_CODE_RE.test('ABC2D9')).toBe(true);
    expect(ROOM_CODE_RE.test('ABCOD9')).toBe(false); // no O / 0 / I / 1
  });
});

describe('room server rules (fake, mirrors SQL)', () => {
  it('only the host starts; results stay hidden until the round closes; late joins refused', async () => {
    const srv = new FakeRoomServer(() => t);
    const a = srv.client('a');
    const b = srv.client('b');
    const { id, code } = await createRoom(a, 'degrees', 3, 'Ann', 42);
    await b.join(code.toLowerCase(), 'Bob');
    await expect(b.startRound(id, 0)).rejects.toBeInstanceOf(RoomError);
    await a.startRound(id, 0);
    const key = tournamentSet('degrees', 3, 42).map((q) => String(q.answer));
    await a.answer(id, 0, key[0], 800);
    expect((await b.state(id)).results).toHaveLength(0);
    await b.answer(id, 0, 'nope', 500);
    const s = await b.state(id);
    expect(s.roundOpen).toBe(false);
    expect(s.results[0].key).toBe(key[0]);
    expect(s.results[0].answers.find((x) => x.userId === 'a')!.points).toBe(960);
    await expect(srv.client('c').join(code, 'Late')).rejects.toMatchObject({ code: 'started' });
    await expect(srv.client('c').join('ZZZZZZ', 'X')).rejects.toMatchObject({ code: 'not-found' });
  });
});

describe('room controller', () => {
  it('host and guest play a full game in sync; standings and movement arrows', async () => {
    const srv = new FakeRoomServer(() => t);
    const { id, code } = await createRoom(srv.client('host'), 'mixed', 3, 'Dana', 7);
    const guestId = await srv.client('guest').join(code, 'Omer');
    expect(guestId).toBe(id);
    const H = new RoomController(srv.client('host'), id, ad(), opts);
    const G = new RoomController(srv.client('guest'), id, ad(), opts);
    H.start();
    G.start();
    await until(() => H.getView().phase === 'lobby' && G.getView().phase === 'lobby');
    expect(H.getView().isHost).toBe(true);
    expect(G.getView().isHost).toBe(false);
    expect(H.getView().snap!.players.map((p) => p.nickname)).toEqual(['Dana', 'Omer']);

    await H.startGame();
    for (let r = 0; r < 3; r++) {
      await until(() => H.getView().phase === 'answering' && G.getView().phase === 'answering' && G.getView().round === r);
      const q = H.getView().item!;
      expect(G.getView().item!.stimulus).toEqual(q.stimulus); // same item on both devices
      const wrong = q.choices.find((c) => c !== q.answer)!;
      t += 1000;
      H.answer(r === 0 ? wrong : q.answer);
      G.answer(r === 0 ? q.answer : wrong);
      await until(() => H.getView().round === r && H.getView().phase !== 'answering' && G.getView().last?.round === r);
    }
    await until(() => H.getView().phase === 'over' && G.getView().phase === 'over');
    const st = G.getView().standings;
    expect(st.map((s) => s.nickname)).toEqual(['Dana', 'Omer']);
    expect(st[0].correct).toBe(2);
    expect(st[0].prevRank).toBe(1);
    H.dispose();
    G.dispose();
  });

  it('a player who never answers does not block the round: the host closes it after its window', async () => {
    const srv = new FakeRoomServer(() => t);
    const { id, code } = await createRoom(srv.client('host'), 'degrees', 3, 'Dana', 3);
    await srv.client('guest').join(code, 'Sleepy');
    const fast = { ...opts, hostGraceMs: 10 };
    const H = new RoomController(srv.client('host'), id, ad(), fast);
    H.start();
    await until(() => H.getView().phase === 'lobby');
    await H.startGame();
    await until(() => H.getView().phase === 'answering');
    t += 11_000; // past the window on the server clock
    H.answer(H.getView().item!.answer);
    await until(() => H.getView().last?.round === 0);
    const r0 = H.getView().last!;
    expect(r0.answers).toHaveLength(1);
    expect(r0.answers[0].correct).toBe(false); // answered after the window: no points
    H.dispose();
  });

  it('standings break ties by total time', () => {
    const players = [
      { userId: 'a', nickname: 'A', answered: false },
      { userId: 'b', nickname: 'B', answered: false },
    ];
    const st = roomStandings(players, [
      { round: 0, key: '1', answers: [{ userId: 'a', answer: '1', timeMs: 900, correct: true, points: 500 }, { userId: 'b', answer: '1', timeMs: 400, correct: true, points: 500 }] },
    ]);
    expect(st.map((s) => s.userId)).toEqual(['b', 'a']);
    expect(st[0].prevRank).toBeNull(); // no earlier round to move from
  });
});
