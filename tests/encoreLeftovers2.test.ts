// Encore leftovers, second round (SPEC-PHRASE-STUDIO): suggested fingering (§5.6), meter chips with 5/4 and 6/8
// (§5.3), LH shells (§7.5), the opt-in sync of take notes (§6.2), the calibration target on observed data (§10.8.3,
// §10.8.8), the sharer's +5 bonus (§11.5) and the phrase on Today (§12, §17).
import { describe, expect, it } from 'vitest';
import { stepCost, suggestFingers } from '../src/engine/encore/fingering';
import { canShell, shellLh, shellsFor, withShells } from '../src/engine/encore/shells';
import { finalHand, handsOf, phraseDrill, phraseFingers, phraseItemId, setOwnFinger, tonic4 } from '../src/engine/encore/phrase';
import { METERS, meterLabel, withMeter, type TrimState } from '../src/engine/encore/library';
import { phraseMusicXml } from '../src/engine/encore/musicxml';
import { phraseDifficulty } from '../src/engine/encore/difficulty';
import { b64, fromNotesRow, localSig, planSync, rowSig, setTakeNotesBackend, syncTakeNotes, toNotesRow, unb64, TAKE_NOTES_SYNC_ON, type TakeNotesRow } from '../src/cloud/takeNotes';
import { packNotes, type RecTake } from '../src/storage/recordings';
import { calibrationReport, empiricalDifficulty, spearman, TARGET, type Obs } from '../src/engine/encore/calibration';
import { expected } from '../src/engine/rating';
import { paidSoFar, sharerBonuses, sharerSessionId, SHARER_BONUS_WEEK_CAP, SHARER_RESULT_ID } from '../src/engine/encore/sharerBonus';
import { addSessionStats, practiceDays, type Progress } from '../src/storage/progress';
import { pickTodayPhrase } from '../src/ui/encore/FeaturedToday';
import type { SharedPhrase } from '../src/cloud/challenges';
import type { BoardRow } from '../src/engine/encore/community';
import { phrase } from './encoreFixtures';

// a tiny localStorage (node has none)
const mem = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: (i: number) => [...mem.keys()][i] ?? null,
  get length() {
    return mem.size;
  },
} as Storage;

const II_V_I = [[2, 'm7', 4], [7, '7', 4], [0, 'maj7', 8]] as [number, string, number][];
const BLACK = new Set([1, 3, 6, 8, 10]);
const line = (ps: number[]) => ps.map((pitch, i) => ({ pitch, beat: i * 0.5 }));

describe('suggested piano fingering (§5.6)', () => {
  it('five notes up from C in the right hand: 1 2 3 4 5; in the left hand from C3: 5 4 3 2 1', () => {
    expect(suggestFingers(line([60, 62, 64, 65, 67]), 'R')).toEqual([1, 2, 3, 4, 5]);
    expect(suggestFingers(line([48, 50, 52, 53, 55]), 'L')).toEqual([5, 4, 3, 2, 1]);
  });
  it('a C-major octave: the thumb passes under (never the same finger on two different neighbours)', () => {
    const f = suggestFingers(line([60, 62, 64, 65, 67, 69, 71, 72]), 'R');
    for (let i = 1; i < f.length; i++) expect(f[i]).not.toBe(f[i - 1]);
    // a crossing: the thumb right after a higher finger, going up
    expect(f.some((x, i) => i > 0 && x === 1 && f[i - 1] >= 3)).toBe(true);
    expect(f[0]).toBe(1);
  });
  it('the thumb stays off black keys where the line allows it', () => {
    const ps = [63, 65, 67, 68, 70, 72, 70, 68, 67, 65, 63]; // E♭ major up and down
    const f = suggestFingers(line(ps), 'R');
    const blackThumbs = ps.filter((p, i) => f[i] === 1 && BLACK.has(p % 12)).length;
    expect(blackThumbs).toBe(0);
  });
  it("a fixed finger (the player's own) is kept and the path runs around it", () => {
    const f = suggestFingers(line([60, 62, 64, 65, 67]), 'R', [undefined, undefined, 2]);
    expect(f[2]).toBe(2);
    expect(f[1]).not.toBe(2);
  });
  it('a triad under the fifth finger: 1 3 5', () => {
    const f = suggestFingers([{ pitch: 60, beat: 0 }, { pitch: 64, beat: 0 }, { pitch: 67, beat: 0 }], 'R');
    expect(f).toEqual([1, 3, 5]);
  });
  it('a crossing that is not with the thumb is the most expensive move', () => {
    expect(stepCost(3, 64, 4, 62, false, false)).toBeGreaterThanOrEqual(30);
    expect(stepCost(3, 64, 1, 65, false, false)).toBeLessThan(10);
  });
  it('the phrase drill carries the fingers only when the plan asks; own numbers win in the home key only', () => {
    const l = phrase('enc-f', '0 2 4 5 7q');
    expect(phraseDrill(l, 0).notes.some((n) => n.finger)).toBe(false);
    const on = { ...l, plan: { ...l.plan!, fingering: true } };
    expect(phraseDrill(on, 0).notes.map((n) => n.finger)).toEqual([1, 2, 3, 4, 5]);
    const mine = setOwnFinger(on, 'R', 0, 2);
    expect(mine.marks?.[0]?.finger).toBe(2);
    expect(phraseDrill(mine, 0).notes[0].finger).toBe(2);
    // another key: its own suggestion (the home key's numbers do not travel)
    expect(phraseFingers(mine, 7).rh[0]).not.toBeUndefined();
    expect(setOwnFinger(mine, 'R', 0, null).marks).toBeUndefined();
    // guitar keeps its position fingering (not the piano suggestion)
    expect(phraseDrill(on, 0, 'R', { inst: 'guitar' }).notes.every((n) => !n.finger || n.finger <= 4)).toBe(true);
  });
});

describe('LH shells (§7.5): 1-3-7 / 1-7-3 only, by voice leading', () => {
  it('ii–V–I in C: D–F–C, G–F–B, C–E–B (the classic alternation)', () => {
    const s = shellsFor(II_V_I, 0);
    expect(s.map((x) => x.pitches)).toEqual([
      [50, 53, 60],
      [43, 53, 59],
      [48, 52, 59],
    ]);
    expect(s.map((x) => x.voicing)).toEqual(['1-3-7', '1-7-3', '1-3-7']);
    expect(s.map((x) => [x.beat, x.dur])).toEqual([
      [0, 4],
      [4, 4],
      [8, 8],
    ]);
  });
  it('every shell is root + the chord’s 3rd + its 7th (6 and m6 chords: root and 3rd only)', () => {
    const q: Record<string, [number, number | null]> = { maj7: [4, 11], m7: [3, 10], '7': [4, 10], hd7: [3, 10], dim7: [3, 9], alt: [4, 10], '6': [4, null], m6: [3, null] };
    for (const [quality, [third, seventh]] of Object.entries(q))
      for (let root = 0; root < 12; root++) {
        const [sh] = shellsFor([[root, quality, 4]], 0);
        const pcs = sh.pitches.map((p) => (((p - sh.pitches[0]) % 12) + 12) % 12).sort((a, b) => a - b);
        expect(sh.pitches[0] % 12, `${quality} root`).toBe(root);
        expect(pcs, quality).toEqual(seventh === null ? [0, third] : [0, third, seventh].sort((a, b) => a - b));
        expect(sh.pitches[0]).toBeGreaterThanOrEqual(40);
        expect(sh.pitches[0]).toBeLessThanOrEqual(51);
      }
  });
  it('turning shells on makes a two-hand phrase; the right hand keeps its item id; off restores it', () => {
    const l = phrase('enc-sh', '7 4 5 2 0 -1 0 2 | 5 4 3 2 1 2 5 9 | 7 3 4q 11 9 7 4 | 2 6 7q 11h', { chords: II_V_I, ctx: 'major-251' });
    expect(canShell(l)).toBe(true);
    const on = withShells(l, true);
    expect(on.lhShells).toBe(true);
    expect(on.lh).toEqual(shellLh(l));
    expect(handsOf(on)).toEqual(['R', 'L', 'RL']);
    expect(finalHand(on)).toBe('RL');
    expect(phraseItemId(on, 'piano', 0, 'R')).toBe(phraseItemId(l, 'piano', 0));
    expect(phraseItemId(on, 'piano', 0, 'RL')).toBe(`${phraseItemId(l, 'piano', 0)}:RL`);
    // the left hand of the drill: the shells, in the LH, sounding together
    const d = phraseDrill(on, 0, 'L');
    expect(d.notes.filter((n) => n.hand === 'L').map((n) => n.pitch).slice(0, 3)).toEqual([50, 53, 60]);
    // the reference of the LH semitones (tonic4 − 12)
    expect(shellLh(l)[0][0]).toBe(50 - (tonic4(0) - 12));
    // harder with the shells than without (two hands ≥ one hand)
    expect(phraseDifficulty(on, 0, 160, 'RL').D).toBeGreaterThanOrEqual(phraseDifficulty(l, 0, 160, 'R').D);
    const off = withShells(on, false);
    expect(off.lh).toBeUndefined();
    expect(off.lhShells).toBeUndefined();
    expect(handsOf(off)).toEqual(['R']);
    // not offered without chords or on a played two-hand phrase
    expect(canShell(phrase('enc-n', '0 2 4q'))).toBe(false);
    expect(canShell({ ...l, lh: [[0, 0, 4]] })).toBe(false);
  });
});

describe('meter chips (§5.3): 4/4 · 3/4 · 5/4 · 6/8', () => {
  const s: TrimState = { takeId: 't', from: 4, to: 12, view: 'roll', key: 0, minor: false, chordsOn: true, quant: 'grid', split: null, name: '', bpm: 120, meter: 4, swing: 0.5, edits: {}, t0: 0 };
  it('the chips and their labels', () => {
    expect(METERS.map(meterLabel)).toEqual(['4/4', '3/4', '5/4', '6/8']);
  });
  it('6/8 counts eighths: the tempo and the selection double; back to 4/4 halves them', () => {
    const x = withMeter(s, 6);
    expect(x.bpm).toBe(240);
    expect(x.from).toBe(6);
    expect(x.to).toBe(24);
    expect(x.from % 6).toBe(0);
    const y = withMeter(x, 4);
    expect(y.bpm).toBe(120);
    expect(y.from % 4).toBe(0);
    expect(withMeter(s, 5)).toMatchObject({ meter: 5, bpm: 120, from: 0, to: 15 });
    expect(withMeter(s, 4)).toBe(s);
  });
  it('a 6/8 phrase is an eighth-pulse drill in two groups of three; a 5/4 phrase has five beats a bar', () => {
    const six = phrase('enc-68', '0 2 4 5 7 9 | 11 12 11 9 7 5', { meter: 6 });
    const d = phraseDrill(six, 0);
    expect(d.pulse).toBe(8);
    expect(d.groups).toEqual([3, 3]);
    expect(d.meter).toBe(6);
    const five = phrase('enc-54', '0q 2q 4q 5q 7q', { meter: 5 });
    expect(phraseDrill(five, 0).meter).toBe(5);
    expect(phraseDrill(five, 0).pulse).toBeUndefined();
  });
  it('MusicXML writes 6/8 with eighth notes (one beat = ♪)', () => {
    const six = phrase('enc-68x', '0 2 4 5 7 9', { meter: 6 });
    const x = phraseMusicXml(six);
    expect(x).toContain('<beats>6</beats><beat-type>8</beat-type>');
    expect(x).toContain('<beat-unit>eighth</beat-unit>');
    // parseLine's default length is an eighth of a quarter-beat phrase (0.5 beat) → a 16th in 6/8 eighth beats
    expect(x).toContain('<type>16th</type>');
    expect(phraseMusicXml(phrase('enc-44x', '0q 2q 4q 5q'))).toContain('<beat-type>4</beat-type>');
  });
});

describe('opt-in sync of take notes (§6.2)', () => {
  const take = (id: string, o: Partial<RecTake> = {}): RecTake => ({
    id,
    sessionId: 's1',
    at: '2026-11-16T10:00:00.000Z',
    durationMs: 4000,
    course: 'keys',
    instrument: 'piano',
    kind: 'improv',
    title: { en: 'Improv', he: 'אלתור' },
    sung: false,
    source: 'midi',
    notes: packNotes([
      { pitch: 60, on: 0, off: 200, vel: 80 },
      { pitch: 62, on: 250, off: 450, vel: 80 },
      { pitch: 64, on: 500, off: 700, vel: 80 },
    ]),
    audioId: 'a-x',
    ...o,
  });
  it('rows carry notes and metadata, never audio; a round trip keeps the notes', () => {
    const t = take('t1', { star: true, bpm: 100 });
    const r = toNotesRow(t)!;
    expect(JSON.stringify(r)).not.toContain('a-x');
    expect(Object.keys(r)).not.toContain('audioId');
    const back = fromNotesRow(r);
    expect([...back.notes!]).toEqual([...t.notes!]);
    expect(back.title).toEqual(t.title);
    expect(back.fromCloud).toBe(true);
    expect(back.audioId).toBeUndefined();
    expect([...unb64(b64(new Uint8Array([0, 255, 7])))]).toEqual([0, 255, 7]);
    expect(toNotesRow(take('t2', { notes: undefined }))).toBeNull();
  });
  it('first sync: only protected takes go up; a row this device lacks comes down', () => {
    const remote = { ...toNotesRow(take('far', { star: true }))!, updated_at: 'x' };
    const p = planSync([take('a', { star: true }), take('b'), take('c', { folder: 'Gig' }), take('d', { star: true, deletedAt: 'x' })], [remote], {});
    expect(p.up.map((r) => r.take_id).sort()).toEqual(['a', 'c']);
    expect(p.add.map((t) => t.id)).toEqual(['far']);
    expect(Object.keys(p.synced).sort()).toEqual(['a', 'c', 'far']);
  });
  it('three-way: a change here goes up, a change there comes down, unstarring never deletes elsewhere', () => {
    const t = take('a', { star: true });
    const base = { a: localSig(t) };
    const row = toNotesRow(t)!;
    // changed here: unstarred → goes up as star false (not as a deletion)
    const here = planSync([{ ...t, star: undefined }], [row], base);
    expect(here.up).toHaveLength(1);
    expect(here.up[0]).toMatchObject({ star: false, deleted_at: null });
    // changed there: a folder → comes down
    const there = planSync([t], [{ ...row, folder: 'Gig' }], base);
    expect(there.up).toHaveLength(0);
    expect(there.meta).toEqual([{ id: 'a', m: expect.objectContaining({ folder: 'Gig' }) }]);
    // deleted there → into the bin here
    const del = planSync([t], [{ ...row, deleted_at: '2026-11-17T00:00:00.000Z' }], base);
    expect(del.meta[0].m.deletedAt).toBe('2026-11-17T00:00:00.000Z');
    // the bin emptied here after a sync → a deletion goes up
    const gone = planSync([], [row], base, 300, '2026-11-18T00:00:00.000Z');
    expect(gone.up[0]).toMatchObject({ take_id: 'a', deleted_at: '2026-11-18T00:00:00.000Z' });
    expect(gone.add).toHaveLength(0);
    // nothing changed: nothing moves
    const same = planSync([t], [row], base);
    expect(same.up.length + same.add.length + same.meta.length).toBe(0);
    expect(rowSig(row)).toBe(localSig(t));
  });
  it('the server cap leaves new takes waiting', () => {
    expect(planSync([take('a', { star: true }), take('b', { star: true })], [], {}, 1).up).toHaveLength(1);
  });
  it('off by default: no flag, or the switch off, means no call at all', async () => {
    let calls = 0;
    const rows: TakeNotesRow[] = [];
    setTakeNotesBackend({ list: async () => (calls++, rows), upsert: async (r) => void (calls++, rows.push(...r)) });
    const io = { local: async () => [take('a', { star: true })], put: async () => true, meta: async () => null };
    expect(TAKE_NOTES_SYNC_ON()).toBe(false);
    expect(await syncTakeNotes(true, io)).toBeNull();
    localStorage.setItem('tt.flag.takeNotes', '1');
    expect(await syncTakeNotes(false, io)).toBeNull();
    expect(calls).toBe(0);
    expect(await syncTakeNotes(true, io)).toEqual({ up: 1, added: 0, changed: 0 });
    expect(rows.map((r) => r.take_id)).toEqual(['a']);
    // the second round has nothing to send
    expect(await syncTakeNotes(true, io)).toEqual({ up: 0, added: 0, changed: 0 });
    localStorage.removeItem('tt.flag.takeNotes');
    setTakeNotesBackend(null);
  });
});

describe('the calibration target on observed data (§10.8.3, §10.8.8)', () => {
  // deterministic observations of an item of difficulty D by players spread around it
  const observe = (D: number, n = 200): Obs[] => {
    const out: Obs[] = [];
    for (let i = 0; i < n; i++) {
      const r = D - 400 + (800 * i) / (n - 1);
      const p = expected(r, D);
      // two players at each rating, passing in proportion to the curve (round half each way)
      out.push({ rating: r, passed: (i * 7919) % 100 < p * 100 });
    }
    return out;
  };
  it('the empirical difficulty is the rating that passes half the time', () => {
    for (const D of [800, 1150, 1500]) expect(Math.abs(empiricalDifficulty(observe(D))! - D)).toBeLessThan(60);
    expect(empiricalDifficulty(observe(1000).slice(0, 5))).toBeNull();
    expect(empiricalDifficulty(Array.from({ length: 20 }, () => ({ rating: 1000, passed: true })))).toBeNull();
  });
  it('the report: ρ, mean error, the families in order, and the items drifting > 150 points', () => {
    const items = [700, 820, 940, 1060, 1180, 1300].map((D, i) => ({ id: `k-${i}`, family: 'k', order: i, model: D + (i === 3 ? 260 : 20), obs: observe(D) }));
    const r = calibrationReport(items);
    expect(r.n).toBe(6);
    expect(r.rho).toBeGreaterThanOrEqual(0.8);
    expect(r.review.map((x) => x.id)).toEqual(['k-3']);
    expect(r.met).toBe(r.mae! <= TARGET.mae);
    const good = calibrationReport(items.map((x) => ({ ...x, model: x.model - (x.id === 'k-3' ? 240 : 0) })));
    expect(good.met).toBe(true);
    expect(good.outOfOrder).toEqual([]);
    // a family whose observed difficulty runs against its order is flagged, and the target is not met
    const swapped = calibrationReport(items.map((x, i) => ({ ...x, obs: observe(i === 1 ? 1300 : [700, 820, 940, 1060, 1180, 1300][i]) })));
    expect(swapped.outOfOrder).toEqual(['k']);
    expect(swapped.met).toBe(false);
  });
  it("Spearman's ρ", () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1);
    expect(spearman([1, 2, 3, 4], [40, 30, 20, 10])).toBeCloseTo(-1);
    expect(spearman([1, 2], [1, 2])).toBeNull();
  });
});

describe("the sharer's bonus (§11.5): +5 per friend who learns my phrase, once, ≤ 50 a week", () => {
  const row = (userId: string, keys: number, o: Partial<BoardRow> = {}): BoardRow => ({ userId, name: userId, keys, bestBpm: 160, acc: 0.95, source: 'midi', at: '2026-11-16', ...o });
  const shares = [{ id: 'p1', needed: 12, mine: true, status: 'live' }];
  it('friends at the target earn it; me, the creator row, flagged rows and partial keys do not', () => {
    const due = sharerBonuses(shares, { p1: [row('a', 12), row('b', 11), row('me', 12, { me: true }), row('c', 12, { creator: true }), row('d', 12, { flagged: true })] }, new Set(), 0);
    expect(due.map((x) => x.userId)).toEqual(['a']);
    expect(due[0].xp).toBe(5);
  });
  it('once per friend per phrase (the session id is stable and short), and the weekly cap', () => {
    const sid = sharerSessionId('p1', 'a');
    expect(sid).toBe(sharerSessionId('p1', 'a'));
    expect(sid).not.toBe(sharerSessionId('p2', 'a'));
    expect(sid.length).toBeLessThanOrEqual(64);
    expect(sharerBonuses(shares, { p1: [row('a', 12)] }, new Set([sid]), 0)).toEqual([]);
    const many = Array.from({ length: 15 }, (_, i) => row(`u${i}`, 12));
    expect(sharerBonuses(shares, { p1: many }, new Set(), 0)).toHaveLength(SHARER_BONUS_WEEK_CAP / 5);
    expect(sharerBonuses(shares, { p1: many }, new Set(), 40)).toHaveLength(2);
    expect(sharerBonuses(shares, { p1: many }, new Set(), 50)).toHaveLength(0);
    // a held phrase pays nothing
    expect(sharerBonuses([{ ...shares[0], status: 'held' }], { p1: many }, new Set(), 0)).toHaveLength(0);
  });
  it('paid so far: from my history, this week only', () => {
    const now = new Date('2026-11-18T12:00:00');
    const h = [
      { lessonId: SHARER_RESULT_ID, sessionId: 's1', xp: 5, completedAt: '2026-11-17T10:00:00' },
      { lessonId: SHARER_RESULT_ID, sessionId: 's0', xp: 5, completedAt: '2026-11-10T10:00:00' },
      { lessonId: 'other', sessionId: 's2', xp: 30, completedAt: '2026-11-17T10:00:00' },
    ];
    const p = paidSoFar(h, now);
    expect([...p.paid].sort()).toEqual(['s0', 's1']);
    expect(p.weekPaid).toBe(5);
  });
  it('the bonus result is XP of the day, never a practice day or a good session', () => {
    const r = { lessonId: SHARER_RESULT_ID, lessonVersion: 1, sessionId: 'lrn-x', completedAt: '2026-11-17T10:00:00.000Z', firstTry: 1, total: 1, xp: 5, missed: [], items: [] };
    const st = addSessionStats(undefined, r);
    expect(st.days).toEqual([]);
    expect(st.goodSessions).toBe(0);
    expect(Object.values(st.xpByDay)).toEqual([5]);
    const p = { history: [r], stats: { days: [], goodSessions: 0, xpByDay: {} } } as unknown as Progress;
    expect(practiceDays(p).size).toBe(0);
  });
});

describe('the phrase on Today (§12, §17)', () => {
  const sp = (id: string, o: Partial<SharedPhrase> = {}): SharedPhrase => ({ id, code: `c-${id}`, ownerId: 'o', ownerName: 'Dana', mine: false, friend: true, title: id, instrument: 'piano', level: 3, style: null, context: '', homeKey: 0, ref: '', opb: 2, needed: 12, goalBpm: 160, grade: null, hasAudio: false, visibility: 'friends', status: 'live', createdAt: '', reached: 0, learnedWeek: 0, featured: false, myReactions: [], ...o });
  it("a friend's first, else the week's; never mine, taken or hidden", () => {
    const g = { featured: sp('w', { visibility: 'public' }), friends: [sp('f1'), sp('f2')] };
    expect(pickTodayPhrase(g, new Set(), new Set())).toMatchObject({ p: { id: 'f1' }, why: 'friend' });
    expect(pickTodayPhrase(g, new Set(['c-f1']), new Set())?.p.id).toBe('f2');
    expect(pickTodayPhrase(g, new Set(['c-f1']), new Set(['f2']))).toMatchObject({ p: { id: 'w' }, why: 'week' });
    expect(pickTodayPhrase({ featured: sp('w', { mine: true }), friends: [] }, new Set(), new Set())).toBeNull();
    expect(pickTodayPhrase({ featured: null, friends: [sp('h', { status: 'held' })] }, new Set(), new Set())).toBeNull();
  });
});
