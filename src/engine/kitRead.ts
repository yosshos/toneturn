// Kit Read Rush (GAMES_TIERS_PLAN §2.4 Note Rush, drums column; 0.76): one bar sounds on the app's drum kit, three
// written bars are shown — pick the one you heard. The decoys differ from the answer in one lane at one or two steps
// (a moved kick, a ghost note elsewhere, a flam instead of a drag), so reading the bar is the skill, not guessing a
// style. 90 s, a wrong answer costs 3 s. Levels follow the `drum-read` topic (1 rock beat … 5 open hat and ghosts) plus
// 6 = odd meters, flams / drags, the jazz ride. Pure: patterns, decoys, sound events, the run state.

import type { DrumVoice } from './drills/types';
import type { NoteEvent, PercKind } from './lesson';
import type { DynName } from './courseSocial';
import { bar, type DH, type Lanes } from './drills/drums';
import { VOICE_NOTE } from './drumKit';
import { rng } from './topicKit';

/** One written bar: lanes (one char per step: x hit, X accent, g ghost, o open hat), `sub` steps per quarter. */
export interface KitBar {
  lanes: Lanes;
  sub: number;
  steps: number;
  /** Time signature. */
  num: number;
  den: number;
  /** Beam groups in steps (one beat in x/4; 2+2+3 eighths in 7/8). */
  groups: number[];
  /** Snare grace notes by step: 1 = flam, 2 = drag. */
  grace?: Record<number, 1 | 2>;
}

export const KIT_LEVELS = 6;
const pick = <T,>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
const beatGroups = (sub: number, beats: number) => Array.from({ length: beats }, () => sub);
const four = (lanes: Lanes, sub: number, extra: Partial<KitBar> = {}): KitBar => ({ lanes, sub, steps: sub * 4, num: 4, den: 4, groups: beatGroups(sub, 4), ...extra });

const ROCK_K = ['x...x...', 'x...x.x.', 'x..xx...', 'x.x.x...'];
const KICKS8 = ['x...x...', 'x..xx...', 'x...xx..', 'xx..x...', 'x...x..x', 'x..x..x.', 'x.x.x...', 'x..x.x..'];
const KICKS16 = ['x.....x...x.....', 'x..x....x.x.....', 'x.....xx..x.....', 'x.x...x...x..x..', 'x......x.x......', 'x..x..x...x.....'];
const FILL_BEAT = ['xxxx', 'x.x.', 'xxx.', 'x.xx', 'xx.x'];
const HATS_OPEN = ['x.x.x.x.x.x.x.o.', 'x.x.x.o.x.x.x.x.', 'x.x.x.x.x.o.x.x.', 'x.o.x.x.x.x.x.o.'];
const GHOSTS = ['....X..g.g..X...', '..g.X......gX...', '....X.g...g.X..g', '.g..X..g....X.g.'];

/** The answer bar of a level (seeded). */
export function kitBar(seed: number, level: number): KitBar {
  const r = rng(seed ^ 0x2545f491);
  const L = Math.max(1, Math.min(KIT_LEVELS, Math.round(level) || 1));
  if (L === 1) return four({ h: 'xxxxxxxx', s: '..x...x.', k: pick(r, ROCK_K) }, 2);
  if (L === 2) return four({ h: 'xxxxxxxx', s: '..x...x.', k: pick(r, KICKS8) }, 2);
  if (L === 3) {
    // groove to beat 3, then a fill on snare and toms (16ths)
    let s = '....x...';
    let t1 = '........';
    let t3 = '........';
    for (let b = 0; b < 2; b++) {
      const cell = pick(r, FILL_BEAT);
      const drum = b === 0 ? pick(r, ['s', 's', 't1']) : pick(r, ['s', 't1', 't3']);
      for (const c of cell) {
        s += drum === 's' ? c : '.';
        t1 += drum === 't1' ? c : '.';
        t3 += drum === 't3' ? c : '.';
      }
    }
    return four({ h: 'x.x.x.x.' + '........', s, t1, t3, k: 'x.......' + '........' }, 4);
  }
  if (L === 4) return four({ h: 'x'.repeat(16), s: '....x.......x...', k: pick(r, KICKS16) }, 4);
  if (L === 5) return four({ h: pick(r, HATS_OPEN), s: pick(r, GHOSTS), k: 'x.....x...x.....' }, 4);
  // L6: odd meter, flams / drags, or the jazz ride
  const kind = pick(r, ['odd', 'odd', 'grace', 'ride'] as const);
  if (kind === 'odd') {
    const seven = r() < 0.6;
    const groups = seven ? pick(r, [[2, 2, 3], [3, 2, 2], [2, 3, 2]]) : pick(r, [[3, 2], [2, 3]]);
    const steps = groups.reduce((a, b) => a + b, 0);
    const starts: number[] = [];
    groups.reduce((at, g) => (starts.push(at), at + g), 0);
    let s = '';
    let k = '';
    for (let i = 0; i < steps; i++) {
      const gi = starts.indexOf(i);
      s += gi > 0 && gi % 2 === 1 ? 'x' : gi > 0 && r() < 0.5 ? 'x' : '.';
      k += gi === 0 || (gi < 0 && r() < 0.25) ? 'x' : '.';
    }
    if (!s.includes('x')) s = s.slice(0, starts[1]) + 'x' + s.slice(starts[1] + 1);
    return { lanes: { h: 'x'.repeat(steps), s, k }, sub: 2, steps, num: steps, den: 8, groups };
  }
  if (kind === 'grace') {
    let s = '';
    for (let b = 0; b < 4; b++) s += pick(r, ['x.', 'xx', '.x', 'x.']);
    const grace: Record<number, 1 | 2> = {};
    const hits = [...s].map((c, i) => (c === 'x' ? i : -1)).filter((i) => i >= 0);
    const n = 2 + Math.floor(r() * 2);
    for (let j = 0; j < n && hits.length; j++) grace[hits.splice(Math.floor(r() * hits.length), 1)[0]] = r() < 0.5 ? 1 : 2;
    return four({ s, k: 'x...x...' }, 2, { grace });
  }
  // jazz ride: spang-a-lang, hat foot on 2 and 4, snare comping on a triplet partial
  let s = '';
  for (let b = 0; b < 4; b++) s += r() < 0.4 ? pick(r, ['..x', '.x.', 'x..']) : '...';
  if (!s.includes('x')) s = '.....x' + s.slice(6);
  return four({ r: 'x..x.xx..x.x', p: '...x.....x..', s, k: r() < 0.5 ? 'x.....x.....' : '' }, 3);
}

/** Serialised bar (to compare candidates). */
export const barKey = (b: KitBar): string =>
  JSON.stringify([Object.entries(b.lanes).filter(([, v]) => v && /[^.]/.test(v)).sort(([a], [c]) => (a < c ? -1 : 1)), b.groups, b.grace ? Object.entries(b.grace).sort() : null]);

/** The lanes a decoy may change at a level (the hat stays put below level 5: kick and snare reading). */
const MUTABLE: Record<number, (keyof Lanes)[]> = { 1: ['k', 's'], 2: ['k'], 3: ['s', 't1', 't3'], 4: ['k'], 5: ['h', 's'], 6: ['s', 'k'] };

/** One decoy: a hit in one lane moved by a step, or added / removed; graces swap kind or move. */
export function mutate(b: KitBar, seed: number, level: number): KitBar {
  const r = rng(seed ^ 0x68e31da4);
  if (b.grace && r() < 0.6) {
    const g = { ...b.grace };
    const keys = Object.keys(g).map(Number);
    const k = pick(r, keys);
    if (r() < 0.5) g[k] = g[k] === 1 ? 2 : 1;
    else {
      const free = [...(b.lanes.s ?? '')].map((c, i) => (c !== '.' && !(i in g) ? i : -1)).filter((i) => i >= 0);
      if (free.length) {
        delete g[k];
        g[pick(r, free)] = r() < 0.5 ? 1 : 2;
      } else g[k] = g[k] === 1 ? 2 : 1;
    }
    return { ...b, grace: g };
  }
  const lanes = (MUTABLE[Math.min(6, level)] ?? ['k']).filter((l) => b.lanes[l] !== undefined || l === 'k');
  const lane = pick(r, lanes.length ? lanes : (['k'] as (keyof Lanes)[]));
  const pat = [...(b.lanes[lane] || '.'.repeat(b.steps))];
  const on = pat.map((c, i) => (c !== '.' ? i : -1)).filter((i) => i >= 0);
  const off = pat.map((c, i) => (c === '.' ? i : -1)).filter((i) => i >= 0);
  const fill3 = level === 3 ? (i: number) => i >= 8 : () => true;
  const mode = r();
  if (lane === 'h' && level === 5) {
    // move the open hat to another off-beat 8th
    const o = pat.indexOf('o');
    const spots = pat.map((c, i) => (c === 'x' && i % 2 === 0 && i !== 0 ? i : -1)).filter((i) => i >= 0);
    if (o >= 0 && spots.length) {
      pat[o] = 'x';
      pat[pick(r, spots)] = 'o';
      return { ...b, lanes: { ...b.lanes, h: pat.join('') } };
    }
  }
  const ghostLane = level === 5 && lane === 's';
  const movable = on.filter((i) => fill3(i) && i !== 0 && !(ghostLane && pat[i] === 'X'));
  if (mode < 0.55 && movable.length) {
    const i = pick(r, movable);
    const dirs = [-1, 1].filter((d) => i + d > 0 && i + d < b.steps && pat[i + d] === '.' && fill3(i + d));
    if (dirs.length) {
      const j = i + pick(r, dirs);
      pat[j] = pat[i];
      pat[i] = '.';
      return { ...b, lanes: { ...b.lanes, [lane]: pat.join('') } };
    }
  }
  const adds = off.filter((i) => fill3(i) && i !== 0);
  if (mode < 0.8 && adds.length) {
    pat[pick(r, adds)] = ghostLane ? 'g' : 'x';
    return { ...b, lanes: { ...b.lanes, [lane]: pat.join('') } };
  }
  if (movable.length > 1) {
    pat[pick(r, movable)] = '.';
    return { ...b, lanes: { ...b.lanes, [lane]: pat.join('') } };
  }
  pat[pick(r, adds.length ? adds : [Math.max(1, b.steps - 1)])] = 'x';
  return { ...b, lanes: { ...b.lanes, [lane]: pat.join('') } };
}

export interface KitItem {
  options: KitBar[];
  answer: number;
  bpm: number;
}

/** Item i of a run: the heard bar among three, decoys distinct from it and from each other. */
export function kitItem(seed: number, i: number, level: number): KitItem {
  const s = (seed + Math.imul(i + 1, 0x9e3779b1)) >>> 0;
  const r = rng(s ^ 0x1b873593);
  const ans = kitBar(s, level);
  const keys = new Set([barKey(ans)]);
  const opts: KitBar[] = [ans];
  for (let a = 0; opts.length < 3 && a < 40; a++) {
    // the second decoy is sometimes a mutation of the first (two changes away from the answer)
    const base = opts.length === 2 && r() < 0.3 ? opts[1] : ans;
    const d = mutate(base, (s ^ Math.imul(a + 7, 0x85ebca6b)) >>> 0, level);
    const k = barKey(d);
    if (!keys.has(k)) {
      keys.add(k);
      opts.push(d);
    }
  }
  while (opts.length < 3) opts.push({ ...ans, lanes: { ...ans.lanes, k: '.'.repeat(ans.steps - 1) + 'x' } });
  // shuffle
  const order = [0, 1, 2].sort(() => r() - 0.5);
  const bpm = [90, 90, 84, 72, 72, 96][Math.max(1, Math.min(KIT_LEVELS, level)) - 1];
  return { options: order.map((k) => opts[k]), answer: order.indexOf(0), bpm };
}

// ---------------------------------------------------------------- sound

const PERC: Record<DrumVoice, PercKind> = { kick: 'kick', snare: 'snare', rim: 'rim', hihat: 'hat', hhOpen: 'hat-open', hhPedal: 'hat-foot', ride: 'ride', crash: 'crash', tom1: 'tom-hi', tom2: 'tom-hi', tom3: 'tom-lo' };

/** A bar's hits (beats = quarters from 0), graces included. */
export function barHits(b: KitBar, b0 = 0): DH[] {
  const hits = bar(b.lanes, b.sub, b0);
  for (const [k, g] of Object.entries(b.grace ?? {})) {
    const at = b0 + Number(k) / b.sub;
    for (let j = 1; j <= g; j++) hits.push({ b: at - j * 0.06, v: 'snare', ghost: true, d: 0.06 });
  }
  return hits.sort((x, y) => x.b - y.b);
}

/** Hits as drum-kit sound events, seconds from `t0` (accents louder, ghosts soft, cymbals lighter). */
export function hitsToEvents(hits: DH[], bpm: number, t0 = 0): NoteEvent[] {
  const q = 60 / bpm;
  return hits.map((h) => ({
    midi: VOICE_NOTE[h.v],
    start: t0 + h.b * q,
    duration: Math.min(h.d ?? 0.5, 0.5) * q,
    velocity: h.acc ? 0.85 : h.ghost ? 0.25 : h.v === 'hihat' || h.v === 'ride' || h.v === 'hhPedal' ? 0.42 : 0.62,
    perc: h.ghost && h.v === 'snare' ? 'snare-soft' : PERC[h.v],
  }));
}

/** Quarter beats in a bar. */
export const barBeats = (b: KitBar) => b.steps / b.sub;

/** The heard bar after a count-in (clicks on the beats, or on the group starts in x/8). Returns events and length (s). */
export function itemSound(it: KitItem): { events: NoteEvent[]; length: number; startAt: number } {
  const b = it.options[it.answer];
  const q = 60 / it.bpm;
  const clicks: NoteEvent[] = [];
  if (b.den === 8) {
    let k = 0;
    b.groups.forEach((g, i) => {
      clicks.push({ midi: 0, start: (k / b.sub) * q, duration: 0.05, velocity: i === 0 ? 0.8 : 0.5, perc: i === 0 ? 'accent' : 'click' });
      k += g;
    });
  } else for (let i = 0; i < 4; i++) clicks.push({ midi: 0, start: i * q, duration: 0.05, velocity: i === 0 ? 0.8 : 0.5, perc: i === 0 ? 'accent' : 'click' });
  const startAt = barBeats(b) * q;
  return { events: [...clicks, ...hitsToEvents(barHits(b), it.bpm, startAt)], length: startAt + barBeats(b) * q + 0.4, startAt };
}

// ---------------------------------------------------------------- the run

export const KIT_RUN_MS = 90_000;
export const KIT_WRONG_MS = 3_000;
export const KIT_POINTS = 10;

export interface KitSave {
  v: 1;
  game: 'kitread';
  seed: number;
  level: number;
  tier?: DynName;
  i: number;
  right: number;
  wrong: number;
  combo: number;
  score: number;
  timeLeftMs: number;
}
export const newKitSave = (seed: number, level: number, tier?: DynName): KitSave => ({ v: 1, game: 'kitread', seed: seed >>> 0, level: Math.max(1, Math.min(KIT_LEVELS, level)), ...(tier ? { tier } : {}), i: 0, right: 0, wrong: 0, combo: 0, score: 0, timeLeftMs: KIT_RUN_MS });
export function isKitSave(x: unknown): x is KitSave {
  const s = x as KitSave | null;
  return !!s && s.v === 1 && s.game === 'kitread' && typeof s.seed === 'number' && typeof s.i === 'number' && s.timeLeftMs > 0;
}
export const kitItemOf = (s: KitSave) => kitItem(s.seed, s.i, s.level);
/** Answer the current item (combo ×1.5 from 5 in a row, ×2 from 10, as in the Rush games). */
export function kitAnswer(s: KitSave, choice: number): { state: KitSave; correct: boolean; gained: number } {
  const correct = choice === kitItemOf(s).answer;
  if (!correct) return { state: { ...s, i: s.i + 1, wrong: s.wrong + 1, combo: 0, timeLeftMs: Math.max(0, s.timeLeftMs - KIT_WRONG_MS) }, correct, gained: 0 };
  const combo = s.combo + 1;
  const gained = Math.round(KIT_POINTS * (combo >= 10 ? 2 : combo >= 5 ? 1.5 : 1));
  return { state: { ...s, i: s.i + 1, right: s.right + 1, combo, score: s.score + gained }, correct, gained };
}
export const kitTick = (s: KitSave, ms: number): KitSave => ({ ...s, timeLeftMs: Math.max(0, s.timeLeftMs - Math.max(0, ms)) });
export const kitOver = (s: KitSave) => s.timeLeftMs <= 0;
export function kitResult(s: KitSave) {
  const n = s.right + s.wrong;
  return { game: 'kitread' as const, score: s.score, detail: { right: s.right, wrong: s.wrong, level: s.level, rounds: n, accuracy: n ? Math.round((100 * s.right) / n) : 0, ...(s.tier ? { tier: s.tier } : {}) } };
}
