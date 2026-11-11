// Drum games P1 (docs/research/DRUMS_NICHE_PLAN.md §3): Land It (fills called one bar ahead, land crash + kick on 1),
// Groove Echo (hear a groove, play it back — styles rise with the tier) and Odd-meter Echo (hear one bar of 5/8 … 15/8
// with accents on its group starts, play it back on the kit). Every round is a measured drum take (a Drill run through
// DrillTake → analyzeDrumTake); the round rules below only read its TakeMetrics. Material is seeded per round, so
// nothing can be memorised. Pure.

import type { Drill, DrillSpec, DrumVoice, TakeMetrics } from './drills/types';
import { bar, finish, rep, rnd, type DH, type Lanes } from './drills/drums';
import { callOf } from './drills/drumEar';
import { DYN_NAMES, tierIndex, type DynName } from './gameTiers';

// DRUMS_NICHE_PLAN P2 (§3): Time Lock (the click drops out for longer and longer) and Ghost Control (three dynamic
// bands on one surface) — both played on a pad by microphone too.
export type DrumGameId = 'land' | 'groove-echo' | 'odd-echo' | 'time-lock' | 'ghost-control';
export const DRUM_GAMES: DrumGameId[] = ['land', 'groove-echo', 'odd-echo', 'time-lock', 'ghost-control'];
export const isDrumGame = (g: string): g is DrumGameId => (DRUM_GAMES as string[]).includes(g);
/** Rounds in one run. */
export const DRUM_GAME_ROUNDS = 5;

type Bi = { en: string; he: string };
const t = (en: string, he: string): Bi => ({ en, he });

/** One round: the drill plus what the screen needs (Land It's fill calls, Odd-meter Echo's grouping for the result). */
export interface DrumRound {
  game: DrumGameId;
  tier: DynName;
  round: number;
  drill: Drill;
  bpm: number;
  /** Land It: each fill's bar and length in beats (the cue shows one bar ahead). */
  fills?: { bar: number; beats: number; kind: '16' | '3' }[];
  /** Land It: the landing beats. */
  landings?: number[];
  /** Odd-meter Echo: the bar's meter and grouping (the answer). */
  odd?: { num: number; groups: number[] };
  /** Time Lock: the bars with the click and the silent bars that follow, and the allowed drift (ms). */
  lock?: { on: number; off: number; ms: number };
}

const spec = (game: DrumGameId, tier: DynName, round: number, seed: number): DrillSpec => ({
  family: game === 'land' ? 'd-fills' : game === 'time-lock' ? 'd-time' : game === 'ghost-control' ? 'd-strokes' : 'd-ear',
  kind: `game:${game}:${tier}:${round}:${seed >>> 0}`,
  key: 0,
  hands: 'RL',
  instrument: 'drums',
});
const drumTier = (tier: DynName): 1 | 2 | 3 => (tierIndex(tier) <= 1 ? 1 : tierIndex(tier) <= 3 ? 2 : 3);
const withTier = (d: Drill, tier: DynName, mic: boolean): Drill => ({ ...d, drum: { tier: drumTier(tier), mic } });
const shift = (hits: DH[], b0: number): DH[] => hits.map((h) => ({ ...h, b: h.b + b0 }));

// ───────────────────────────── Land It ─────────────────────────────

const ROCK8: Lanes = { h: 'xxxxxxxx', s: '..x...x.', k: 'x...x...' };
const ROCK16: Lanes = { h: 'xxxxxxxxxxxxxxxx', s: '....x.......x...', k: 'x.......x.x.....' };
const LAND_BPM = [70, 80, 90, 100, 110, 120];
const LAND_MS = [30, 27, 24, 22, 20, 18];
/** Fill lengths a tier may call. */
const LAND_LENS: Record<DynName, number[]> = { pp: [1, 2], p: [1, 2], mp: [1, 2, 4], mf: [1, 2, 4], f: [2, 4], ff: [1, 2, 4] };
const FILL_VOICES: DrumVoice[] = ['snare', 'snare', 'tom1', 'tom1', 'tom2', 'tom2', 'tom3', 'tom3'];

function fillHits(b0: number, beats: number, kind: '16' | '3', r: () => number): DH[] {
  const step = kind === '3' ? 1 / 3 : 0.25;
  const n = Math.round(beats / step);
  const from = b0 + 4 - beats;
  const rot = Math.floor(r() * 2);
  return Array.from({ length: n }, (_, i) => {
    const v = FILL_VOICES[Math.min(FILL_VOICES.length - 1, Math.floor(((i + rot * 2) / n) * FILL_VOICES.length))];
    return { b: from + i * step, v, h: (i % 2 ? 'L' : 'R') as 'R' | 'L', d: step };
  });
}

export function landRound(tier: DynName, round: number, seed: number): DrumRound {
  const ti = tierIndex(tier);
  const r = rnd(`land:${tier}:${round}:${seed}`);
  const lanes = ti >= 3 ? ROCK16 : ROCK8;
  const sub = ti >= 3 ? 4 : 2;
  const bpm = LAND_BPM[ti] + 4 * round;
  const lens = LAND_LENS[tier];
  const fills: NonNullable<DrumRound['fills']> = [];
  const hits: DH[] = [];
  for (let ph = 0; ph < 2; ph++) {
    const p0 = ph * 16;
    for (let k = 0; k < 3; k++) {
      const b = bar(lanes, sub, p0 + k * 4);
      // The beat after a landing: the crash and kick there are the landing (added below).
      hits.push(...(ph > 0 && k === 0 ? b.filter((h) => !(h.b === p0 && (h.v === 'hihat' || h.v === 'kick'))) : b));
    }
    const beats = lens[Math.floor(r() * lens.length)];
    const kind: '16' | '3' = tier === 'ff' && r() < 0.5 ? '3' : '16';
    const f0 = p0 + 12;
    if (beats < 4) hits.push(...bar(lanes, sub, f0, { to: 4 - beats }));
    hits.push(...fillHits(f0, beats, kind, r));
    fills.push({ bar: ph * 4 + 3, beats, kind });
    hits.push({ b: p0 + 16, v: 'crash', h: 'R', d: 1 }, { b: p0 + 16, v: 'kick', h: 'R', d: 1 });
  }
  const landings = [16, 32];
  const call = fills.map((f) => `${f.beats}${f.kind === '3' ? 'T' : ''}`).join(' · ');
  const d = finish(spec('land', tier, round, seed), hits, {
    title: t(`Land It · fills ${call}`, `לנחות · מעברים ${call}`),
    bpm,
    bars: 8,
    tail: 1,
    mic: false,
    goal: { landing: { beats: landings, ms: LAND_MS[ti] } },
  });
  return { game: 'land', tier, round, drill: withTier(d, tier, false), bpm, fills, landings };
}

/** The fill called for the bar after `bar` (the cue one bar ahead), or null. */
export function landCue(r: DrumRound, beat: number): Bi | null {
  if (!r.fills) return null;
  const b = Math.floor(Math.max(0, beat) / 4);
  const f = r.fills.find((x) => x.bar === b + 1 || x.bar === b);
  if (!f) return null;
  const kind = f.kind === '3' ? t(' triplets', ' בטריולות') : t('', '');
  return f.beats === 4 ? t(`Fill: a whole bar${kind.en}`, `מעבר: תיבה שלמה${kind.he}`) : t(`Fill: ${f.beats} beat${f.beats > 1 ? 's' : ''}${kind.en}`, `מעבר: ${f.beats === 1 ? 'פעמה אחת' : `${f.beats} פעמות`}${kind.he}`);
}

// ───────────────────────────── Groove Echo ─────────────────────────────

const KICKS = ['x...x...', 'x..xx...', 'x...xx..', 'xx..x...', 'x...x..x', 'x..x..x.', 'x.x.x...', 'x..x.x..'];
const FUNK_S = ['....X..g.g..X...', '...gX......gX.g.', '..g.X..g..g.X...'];
const FUNK_K = ['x.....x...x.....', 'x..x..x...x.....', 'x.....xx..x.....'];
const SHUF_K = ['x.....x.....', 'x....xx.....', 'x.x...x.x...'];
const BOSSA: Lanes = { h: 'x'.repeat(16), rm: 'x..x..x...x..x..', k: 'x..xx..xx..xx..x' };
const MAQSUM: Lanes = { h: 'xxxxxxxxxxxxxxxx', k: 'x.......x.......', s: '..x...x.....x...' };
const ECHO_BPM = [70, 80, 85, 90, 95, 100];
const STYLE_NAME: Record<DynName, Bi> = {
  pp: t('rock', 'רוק'),
  p: t('rock, kick variations', 'רוק, וריאציות קיק'),
  mp: t('16ths and ghosts', 'שש-עשריות ורפאים'),
  mf: t('shuffle', 'שאפל'),
  f: t('bossa · maqsum', 'בוסה · מקסום'),
  ff: t('two bars with a fill', 'שתי תיבות עם מעבר'),
};

export function grooveEchoRound(tier: DynName, round: number, seed: number): DrumRound {
  const ti = tierIndex(tier);
  const r = rnd(`echo:${tier}:${round}:${seed}`);
  const pick = <T,>(xs: T[]): T => xs[Math.floor(r() * xs.length)];
  // The phrase to echo (1 or 2 bars) and its grid.
  let phrase: DH[];
  let bars: 1 | 2 = 1;
  let ghost = false;
  const sHand = (_i: number, c: string): 'R' | 'L' => (c === 'g' ? 'L' : 'L');
  if (tier === 'pp') phrase = bar({ ...ROCK8, k: pick(KICKS.slice(0, 3)) }, 2, 0);
  else if (tier === 'p') phrase = bar({ h: 'xxxxxxxx', s: r() < 0.3 ? '..x..xx.' : '..x...x.', k: pick(KICKS) }, 2, 0);
  else if (tier === 'mp') {
    phrase = bar({ h: 'x'.repeat(16), s: pick(FUNK_S), k: pick(FUNK_K) }, 4, 0, { sHand });
    ghost = true;
  } else if (tier === 'mf') phrase = bar({ h: 'x.xx.xx.xx.x', s: '...x.....x..', k: pick(SHUF_K) }, 3, 0);
  else if (tier === 'f') {
    if (r() < 0.5) {
      phrase = [...bar(BOSSA, 2, 0)];
      bars = 2;
    } else phrase = bar(MAQSUM, 4, 0);
  } else {
    const l: Lanes = { h: 'xxxxxxxx', s: r() < 0.4 ? '..x..xx.' : '..x...x.', k: pick(KICKS) };
    const from = r() < 0.5 ? 2 : 3;
    const vs: DrumVoice[] = from === 3 ? ['snare', 'snare', 'tom1', 'tom3'] : ['snare', 'snare', 'snare', 'snare', 'tom1', 'tom1', 'tom3', 'tom3'];
    phrase = [...bar(l, 2, 0), ...bar(l, 2, 4, { to: from }), ...vs.map((v, i) => ({ b: 4 + from + i * 0.25, v, h: (i % 2 ? 'L' : 'R') as 'R' | 'L', d: 0.25 }))];
    bars = 2;
  }
  // One bar: heard twice, played twice. Two bars: heard once, played once.
  const span = bars * 4;
  const times = bars === 1 ? 2 : 1;
  const calls = rep(times, (k) => shift(phrase, k * span));
  const ans = rep(times, (k) => shift(phrase, times * span + k * span));
  const bpm = ECHO_BPM[ti] + 2 * round;
  const d = finish(spec('groove-echo', tier, round, seed), ans, {
    title: t(`Groove Echo · ${STYLE_NAME[tier].en}`, `הד לגרוב · ${STYLE_NAME[tier].he}`),
    bpm,
    bars: (2 * times * span) / 4,
    mic: false,
    show: 'none',
    listen: { notes: callOf(calls), windows: [[0, times * span]], ask: t('Listen, then play it back', 'הקשיבו, ואז נגנו בחזרה') },
    ...(ghost ? { goal: { ghost: 0.75 } } : {}),
  });
  return { game: 'groove-echo', tier, round, drill: withTier(d, tier, false), bpm };
}

// ───────────────────────────── Odd-meter Echo ─────────────────────────────

const ODD: Record<DynName, [number, number[]][]> = {
  pp: [[5, [3, 2]], [5, [2, 3]]],
  p: [[7, [2, 2, 3]], [7, [3, 2, 2]]],
  mp: [[7, [2, 2, 3]], [7, [3, 2, 2]], [7, [2, 3, 2]]],
  mf: [[9, [2, 2, 2, 3]], [9, [3, 3, 3]]],
  f: [[11, [3, 3, 3, 2]], [11, [2, 2, 3, 2, 2]], [9, [2, 2, 2, 3]], [9, [3, 3, 3]]],
  ff: [[13, [3, 3, 3, 2, 2]], [13, [2, 2, 3, 3, 3]], [15, [2, 2, 3, 2, 2, 2, 2]], [15, [3, 3, 3, 3, 3]]],
};
const ODD_BPM = [180, 190, 200, 210, 220, 240];
const groupStarts = (g: number[]) => g.map((_, k) => g.slice(0, k).reduce((a, b) => a + b, 0));

export function oddEchoRound(tier: DynName, round: number, seed: number): DrumRound {
  const ti = tierIndex(tier);
  const r = rnd(`odd:${tier}:${round}:${seed}`);
  const opts = ODD[tier];
  const [num, groups] = opts[Math.floor(r() * opts.length)];
  const starts = new Set(groupStarts(groups));
  // One bar of eighths on the snare (one surface: a pad can play it), accented on the group starts.
  const one: DH[] = Array.from({ length: num }, (_, i) => ({ b: i, v: 'snare' as DrumVoice, h: (i % 2 ? 'L' : 'R') as 'R' | 'L', d: 1, ...(starts.has(i) ? { acc: true } : {}) }));
  const calls = [...one, ...shift(one, num)];
  const ans = [...shift(one, 2 * num), ...shift(one, 3 * num)];
  const bpm = ODD_BPM[ti] + 4 * round;
  // No `groups` on the drill: the click would sound on the group starts and give the answer away. Every eighth clicks.
  const d = finish(spec('odd-echo', tier, round, seed), ans, {
    title: t(`Odd-meter Echo · ${num}/8`, `הד במשקל מוזר · ${num}/8`),
    bpm,
    bars: 4,
    meter: num,
    pulse: 8,
    mic: true,
    show: 'none',
    listen: { notes: callOf(calls), windows: [[0, 2 * num]], ask: t(`One bar of ${num}/8, twice. Play it back with its accents`, `תיבה של ${num}/8, פעמיים. נגנו אותה בחזרה עם ההדגשות`) },
    goal: { accentPos: 0.85 },
  });
  return { game: 'odd-echo', tier, round, drill: withTier(d, tier, true), bpm, odd: { num, groups } };
}

// ───────────────────────────── Time Lock (P2) ─────────────────────────────

/** Silent bars per round, by tier (the click is back for one bar at the end). */
const LOCK_OFF: Record<DynName, number[]> = { pp: [1, 1, 2, 2, 2], p: [2, 2, 2, 4, 4], mp: [2, 4, 4, 4, 4], mf: [4, 4, 4, 8, 8], f: [4, 8, 8, 8, 8], ff: [8, 8, 8, 8, 8] };
const LOCK_BPM = [70, 80, 90, 95, 100, 110];
const LOCK_MS = [30, 26, 22, 20, 18, 15];

export function timeLockRound(tier: DynName, round: number, seed: number): DrumRound {
  const ti = tierIndex(tier);
  const r = rnd(`lock:${tier}:${round}:${seed}`);
  const off = LOCK_OFF[tier][Math.min(round, 4)];
  const on = 2;
  const bars = on + off + 1;
  // 8ths on one surface (a pad by microphone works), the beat accented on half the rounds; 16ths from mf.
  const step = ti >= 3 && r() < 0.5 ? 0.25 : 0.5;
  const acc = r() < 0.5;
  const hits: DH[] = Array.from({ length: Math.round((bars * 4) / step) }, (_, i) => ({ b: i * step, v: 'snare' as DrumVoice, h: (i % 2 ? 'L' : 'R') as 'R' | 'L', d: step, ...(acc && Math.abs((i * step) % 1) < 1e-9 ? { acc: true } : {}) }));
  const bpm = LOCK_BPM[ti] + 2 * round;
  const d = finish(spec('time-lock', tier, round, seed), hits, {
    title: t(`Time Lock · ${off} silent bar${off > 1 ? 's' : ''}`, `נעילת זמן · ${off === 1 ? 'תיבה שקטה אחת' : `${off} תיבות שקטות`}`),
    bpm,
    bars,
    mic: true,
    click: 'gap',
    gap: [on, off],
    goal: { gapMs: LOCK_MS[ti] },
  });
  return { game: 'time-lock', tier, round, drill: withTier(d, tier, true), bpm, lock: { on, off, ms: LOCK_MS[ti] } };
}

// ───────────────────────────── Ghost Control (P2) ─────────────────────────────

const GHOST_BPM = [70, 75, 80, 85, 90, 100];
/** Ghost Control: a snare line with three dynamic bands — accents, normal strokes, ghosts (pp / p: accents and taps). */
export function ghostControlRound(tier: DynName, round: number, seed: number): DrumRound {
  const ti = tierIndex(tier);
  const r = rnd(`ghost:${tier}:${round}:${seed}`);
  const step = ti >= 2 ? 0.25 : 0.5;
  const n = Math.round(16 / step);
  const perBeat = Math.round(1 / step);
  const hits: DH[] = Array.from({ length: n }, (_, i) => {
    const onBeat = i % perBeat === 0;
    // pp / p: an accent or a tap; from mp: ghosts too, more of them and off the beat at the top tiers.
    const x = r();
    const mark = ti <= 1 ? (onBeat && x < 0.6 ? 'acc' : 'tap') : onBeat ? (x < 0.55 ? 'acc' : x < 0.8 ? 'tap' : 'ghost') : x < (ti >= 4 ? 0.2 : 0.1) ? 'acc' : x < 0.6 ? 'ghost' : 'tap';
    return { b: i * step, v: 'snare' as DrumVoice, h: (i % 2 ? 'L' : 'R') as 'R' | 'L', d: step, ...(mark === 'acc' ? { acc: true } : mark === 'ghost' ? { ghost: true } : {}) };
  });
  // Every bar starts with an accent, and the line has at least one of each band it asks for.
  for (let b = 0; b < 4; b++) Object.assign(hits[b * 4 * perBeat], { acc: true, ghost: undefined });
  const bpm = GHOST_BPM[ti] + 2 * round;
  const hasGhost = hits.some((h) => h.ghost);
  const d = finish(spec('ghost-control', tier, round, seed), hits, {
    title: t(`Ghost Control · ${ti <= 1 ? 'accents and taps' : 'accents, taps, ghosts'}`, `שליטה ברפאים · ${ti <= 1 ? 'הדגשות ונקישות' : 'הדגשות, נקישות, רפאים'}`),
    bpm,
    bars: 4,
    mic: true,
    show: 'staff',
    goal: { accentPos: 0.85, ...(hasGhost ? { ghost: 0.8 } : {}) },
  });
  return { game: 'ghost-control', tier, round, drill: withTier(d, tier, true), bpm };
}

export function drumRound(game: DrumGameId, tier: DynName, round: number, seed: number): DrumRound {
  return game === 'land' ? landRound(tier, round, seed) : game === 'groove-echo' ? grooveEchoRound(tier, round, seed) : game === 'time-lock' ? timeLockRound(tier, round, seed) : game === 'ghost-control' ? ghostControlRound(tier, round, seed) : oddEchoRound(tier, round, seed);
}

// ───────────────────────────── scoring ─────────────────────────────

export interface RoundScore {
  ok: boolean;
  /** 0–100. */
  points: number;
  line: Bi;
}

const median = (xs: number[]): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const k = s.length >> 1;
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
};

/** Land It: played ÷ written IOI inside each fill (median); < 0.98 = rushed. */
export function fillTempo(r: DrumRound, m: TakeMetrics): number[] {
  const out: number[] = [];
  const beatMs = 60000 / m.bpm;
  for (const f of r.fills ?? []) {
    const z0 = f.bar * 4 + 4 - f.beats;
    const z1 = f.bar * 4 + 4;
    const pts = m.perNote.filter((p) => p.played && p.exp.beat >= z0 - 1e-6 && p.exp.beat < z1 - 1e-6).sort((a, b) => a.exp.beat - b.exp.beat);
    const rs: number[] = [];
    for (let i = 1; i < pts.length; i++) {
      const w = (pts[i].exp.beat - pts[i - 1].exp.beat) * beatMs;
      if (w > 1) rs.push((pts[i].played!.on - pts[i - 1].played!.on) / w);
    }
    const md = median(rs);
    if (md !== null) out.push(md);
  }
  return out;
}

export function scoreRound(r: DrumRound, m: TakeMetrics): RoundScore {
  if (r.game === 'land') {
    const ms = r.drill.goal.drum?.landing?.ms ?? 25;
    const lands = m.drum?.landing ?? [];
    const missing = lands.some((x) => x === null) || !lands.length;
    const errs = lands.filter((x): x is number => x !== null).map((x) => Math.abs(x));
    const mean = errs.length ? errs.reduce((a, b) => a + b, 0) / errs.length : null;
    // The groove resumes: the bar after the first landing mostly on time.
    const after = m.perNote.filter((p) => p.exp.beat > 16 + 1e-6 && p.exp.beat < 20 - 1e-6);
    const resumed = after.length ? after.filter((p) => p.ok).length / after.length : 1;
    const ft = fillTempo(r, m);
    const rushed = ft.some((x) => x < 0.98);
    const late = mean !== null && errs.some((x) => x > ms);
    const ok = !missing && !late && resumed >= 0.8 && !rushed && m.verdict !== 'not';
    const points = ok ? Math.max(10, Math.round(100 - (mean ?? 0) * 2)) : 0;
    const line = missing
      ? t('No crash + kick on the 1 after a fill.', 'אין קראש + קיק על ה-1 אחרי המעבר.')
      : late
        ? t(`Landing off by ${Math.round(Math.max(...errs))} ms (±${ms}).`, `הנחיתה זזה ב-${Math.round(Math.max(...errs))} מ״ש (±${ms}).`)
        : rushed
          ? t('The fill rushed — keep its 16ths at the groove’s tempo.', 'המעבר מיהר — השאירו אותו בטמפו של הגרוב.')
          : resumed < 0.8
            ? t('The groove did not come back after the landing.', 'הגרוב לא חזר אחרי הנחיתה.')
            : !ok
              ? m.why
              : t(`Landed · ±${Math.round(mean ?? 0)} ms.`, `נחיתה · ±${Math.round(mean ?? 0)} מ״ש.`);
    return { ok, points, line };
  }
  if (r.game === 'time-lock' && r.lock) {
    // Score = how close the silent bars stayed to the click (the mean offset there), the take itself not "not".
    const g = m.drum?.gapMean ?? null;
    const ok = g !== null && Math.abs(g) <= r.lock.ms && m.verdict !== 'not';
    const points = ok ? Math.max(10, Math.round(100 - Math.abs(g!) * 2)) : 0;
    const line = g === null ? t('Nothing measured in the silent bars — keep playing through them.', 'לא נמדד דבר בתיבות השקטות — המשיכו לנגן דרכן.') : ok ? t(`Locked · ${Math.round(Math.abs(g))} ms ${g > 0 ? 'late' : 'early'} over ${r.lock.off} silent bar${r.lock.off > 1 ? 's' : ''}.`, `נעול · ${Math.round(Math.abs(g))} מ״ש ${g > 0 ? 'איחור' : 'הקדמה'} לאורך ${r.lock.off} תיבות שקטות.`) : Math.abs(g) > r.lock.ms ? t(`Drifted ${Math.round(Math.abs(g))} ms ${g > 0 ? 'late' : 'early'} without the click (±${r.lock.ms}).`, `נדדתם ${Math.round(Math.abs(g))} מ״ש ${g > 0 ? 'אחורה' : 'קדימה'} בלי הקליק (±${r.lock.ms}).`) : m.why;
    return { ok, points, line };
  }
  const ok = m.verdict !== 'not';
  const points = m.verdict === 'clean' ? 100 : m.verdict === 'almost' ? 70 : 0;
  if (r.game === 'odd-echo' && r.odd) {
    const g = r.odd.groups.join('+');
    return { ok, points, line: ok ? t(`${r.odd.num}/8 · ${g}.`, `${r.odd.num}/8 · ${g}.`) : t(`It was ${r.odd.num}/8 as ${g}. ${m.why.en}`, `זה היה ${r.odd.num}/8 בחלוקה ${g}. ${m.why.he}`) };
  }
  return { ok, points, line: m.why };
}

export interface DrumRunDetail {
  right: number;
  wrong: number;
  /** 0–100. */
  accuracy: number;
  tier: DynName;
  rounds: number;
  /** Best round points. */
  best: number;
  [k: string]: unknown;
}

/** The run's detail for gameTiers (clear 'accuracy', XP per right round) and the score (sum of round points). */
export function runSummary(tier: DynName, scores: RoundScore[]): { score: number; detail: DrumRunDetail } {
  const right = scores.filter((s) => s.ok).length;
  const wrong = scores.length - right;
  return {
    score: scores.reduce((a, s) => a + s.points, 0),
    detail: { right, wrong, accuracy: scores.length ? Math.round((right / scores.length) * 100) : 0, tier, rounds: scores.length, best: Math.max(0, ...scores.map((s) => s.points)) },
  };
}

export const DRUM_GAME_NAME: Record<DrumGameId, Bi> = {
  land: t('Land It', 'לנחות על 1'),
  'groove-echo': t('Groove Echo', 'הד לגרוב'),
  'odd-echo': t('Odd-meter Echo', 'הד במשקל מוזר'),
  'time-lock': t('Time Lock', 'נעילת זמן'),
  'ghost-control': t('Ghost Control', 'שליטה ברפאים'),
};
export const DRUM_GAME_BLURB: Record<DrumGameId, Bi> = {
  land: t('A fill is called one bar ahead. Play it, land crash + kick on 1.', 'מעבר נקרא תיבה מראש. נגנו אותו, ונחתו בקראש + קיק על 1.'),
  'groove-echo': t('Hear a groove, play it back on the kit. The styles rise with your level.', 'שומעים גרוב ומנגנים אותו בחזרה על המערכת. הסגנונות עולים עם הרמה.'),
  'odd-echo': t('One bar of 5/8, 7/8, 9/8 … — 2+2+3 or 3+2+2? Play it back with its accents.', 'תיבה של 5/8, 7/8, 9/8 … — 2+2+3 או 3+2+2? נגנו אותה בחזרה עם ההדגשות.'),
  'time-lock': t('The click drops out for 1, 2, 4, then 8 bars. Keep the time until it comes back.', 'הקליק נעלם ל-1, 2, 4 ואז 8 תיבות. שמרו על הזמן עד שהוא חוזר.'),
  'ghost-control': t('Accents, normal strokes and ghost notes on one drum: hit each in its band.', 'הדגשות, מכות רגילות ותווי רפאים על תוף אחד: כל מכה בעוצמה שלה.'),
};
export { DYN_NAMES };
