// Name That Groove (GAMES_TIERS_PLAN §3, drums; 0.76): two bars of a groove on the app's kit, name its style among
// four. 10 rounds, faster answers score more (10 within 2 s, down to 5 at 12 s, as Name That Standard). Each tier adds
// styles (rock / pop / half-time → funk / shuffle / disco → swing / bossa / samba → reggae / 6/8 / songo / maqsum →
// second line / Purdie / drum and bass / train beat → odd meters); the newest styles are asked more, and from f the
// decoys are look-alikes. Patterns are our own generic textbook grooves (one char per step, drills/drums.ts lanes).
// Pure: the style table, rounds, sound events, the run.

import type { NoteEvent } from './lesson';
import type { DynName } from './courseSocial';
import type { Lanes } from './drills/drums';
import { barHits, hitsToEvents, type KitBar } from './kitRead';
import { rng } from './topicKit';

export interface GrooveStyle {
  id: string;
  name: { en: string; he: string };
  /** Tier level (1 = pp … 6 = ff) at which the style joins. */
  level: number;
  /** One pattern (1 or 2 bars). */
  bar: KitBar;
  /** Bars the pattern spans. */
  bars: 1 | 2;
  bpm: [number, number];
  /** Styles it is easily mistaken for (decoys from f up). */
  like: string[];
}

const t = (en: string, he: string) => ({ en, he });
const B4 = (lanes: Lanes, sub: number, steps = sub * 4): KitBar => ({ lanes, sub, steps, num: steps / sub, den: 4, groups: Array.from({ length: steps / sub }, () => sub) });
const B8 = (lanes: Lanes, groups: number[]): KitBar => {
  const steps = groups.reduce((a, b) => a + b, 0);
  return { lanes, sub: 2, steps, num: steps, den: 8, groups };
};

export const GROOVE_STYLES: GrooveStyle[] = [
  // pp
  { id: 'rock', name: t('Rock', 'רוק'), level: 1, bars: 1, bpm: [100, 120], like: ['pop', 'halftime'], bar: B4({ h: 'xxxxxxxx', s: '..x...x.', k: 'x...x.x.' }, 2) },
  { id: 'pop', name: t('Pop (16th hats)', 'פופ (היי־הט בשש־עשריות)'), level: 1, bars: 1, bpm: [90, 104], like: ['rock', 'funk'], bar: B4({ h: 'x'.repeat(16), s: '....x.......x...', k: 'x.....x.x.......' }, 4) },
  { id: 'halftime', name: t('Half-time', 'חצי־טמפו'), level: 1, bars: 1, bpm: [120, 140], like: ['rock', 'reggae'], bar: B4({ h: 'xxxxxxxx', s: '....x...', k: 'x......x' }, 2) },
  // p
  { id: 'funk', name: t('Funk', 'פאנק'), level: 2, bars: 1, bpm: [92, 104], like: ['pop', 'songo'], bar: B4({ h: 'x'.repeat(16), s: '....X..g.g..X..g', k: 'x.x.....x.x..x..' }, 4) },
  { id: 'shuffle', name: t('Shuffle', 'שאפל'), level: 2, bars: 1, bpm: [100, 120], like: ['purdie', 'swing'], bar: B4({ h: 'x.xx.xx.xx.x', s: '...x.....x..', k: 'x.....x.....' }, 3) },
  { id: 'disco', name: t('Disco (four on the floor)', 'דיסקו (ארבע על הרצפה)'), level: 2, bars: 1, bpm: [112, 124], like: ['rock', 'pop'], bar: B4({ h: 'x.o.x.o.x.o.x.o.', s: '....x.......x...', k: 'x...x...x...x...' }, 4) },
  // mp
  { id: 'swing', name: t('Jazz swing', 'סווינג ג׳אז'), level: 3, bars: 1, bpm: [130, 170], like: ['shuffle', 'swing54'], bar: B4({ r: 'x..x.xx..x.x', p: '...x.....x..', s: '.....x......' }, 3) },
  { id: 'bossa', name: t('Bossa nova', 'בוסה נובה'), level: 3, bars: 2, bpm: [120, 140], like: ['samba', 'songo'], bar: B4({ h: 'x'.repeat(16), rm: 'x..x..x...x..x..', k: 'x..xx..xx..xx..x' }, 2, 16) },
  { id: 'samba', name: t('Samba', 'סמבה'), level: 3, bars: 1, bpm: [96, 112], like: ['bossa', 'secondline'], bar: B4({ h: 'xxxxxxxxxxxxxxxx', rm: 'x..x..x...x.x...', k: 'x..xx..xx..xx..x' }, 4) },
  // mf
  { id: 'reggae', name: t('Reggae one-drop', 'רגאיי וואן־דרופ'), level: 4, bars: 1, bpm: [70, 84], like: ['halftime', 'shuffle'], bar: B4({ h: 'x.xx.xx.xx.x', rm: '......x.....', k: '......x.....' }, 3) },
  { id: 'afro68', name: t('Afro-Cuban 6/8', 'אפרו־קובני 6/8'), level: 4, bars: 1, bpm: [100, 120], like: ['shuffle', 'swing'], bar: { lanes: { r: 'x.x.xx.x.x.x', k: 'x.....x.....', p: '...x.....x..' }, sub: 3, steps: 12, num: 12, den: 8, groups: [3, 3, 3, 3] } },
  { id: 'songo', name: t('Songo', 'סונגו'), level: 4, bars: 1, bpm: [100, 116], like: ['funk', 'samba'], bar: B4({ h: 'x.x.x.x.x.x.x.x.', s: '..g.X..g.gX..g..', k: '...x......x..x..' }, 4) },
  { id: 'maqsum', name: t('Maqsum (Mizrahi)', 'מקסום (מזרחי)'), level: 4, bars: 1, bpm: [96, 112], like: ['halftime', 'songo'], bar: B4({ h: 'xxxxxxxxxxxxxxxx', k: 'x.......x.......', s: '..x...x.....x...' }, 4) },
  // f
  { id: 'secondline', name: t('New Orleans second line', 'סקנד ליין של ניו אורלינס'), level: 5, bars: 1, bpm: [96, 110], like: ['samba', 'train'], bar: B4({ s: 'X.ggX.g.gX.gX.g.', k: 'x.....x.x.......' }, 4) },
  { id: 'purdie', name: t('Purdie shuffle', 'שאפל פרדי'), level: 5, bars: 1, bpm: [100, 116], like: ['shuffle', 'reggae'], bar: B4({ h: 'x.xx.xx.xx.x', s: '.g.Xg..g.Xg.', k: 'x.....x....x' }, 3) },
  { id: 'dnb', name: t('Drum and bass', 'דראם אנד בייס'), level: 5, bars: 1, bpm: [166, 176], like: ['funk', 'halftime'], bar: B4({ h: 'x.x.x.x.x.x.x.x.', s: '....x.......x...', k: 'x.........x.....' }, 4) },
  { id: 'train', name: t('Train beat', 'ביט רכבת'), level: 5, bars: 1, bpm: [110, 130], like: ['secondline', 'rock'], bar: B4({ s: 'gggXgggggggXgggg', k: 'x.......x.......' }, 4) },
  // ff
  { id: 'rock78', name: t('7/8 rock (2+2+3)', 'רוק ב־7/8 (2+2+3)'), level: 6, bars: 1, bpm: [100, 120], like: ['rock58', 'rock98', 'rock'], bar: B8({ h: 'xxxxxxx', s: '..x.x..', k: 'x...x..' }, [2, 2, 3]) },
  { id: 'rock58', name: t('5/8 (3+2)', '5/8 (3+2)'), level: 6, bars: 1, bpm: [100, 120], like: ['rock78', 'rock98'], bar: B8({ h: 'xxxxx', s: '...x.', k: 'x....' }, [3, 2]) },
  { id: 'rock98', name: t('9/8 (2+2+2+3)', '9/8 (2+2+2+3)'), level: 6, bars: 1, bpm: [100, 120], like: ['rock78', 'rock58'], bar: B8({ h: 'xxxxxxxxx', s: '..x...x..', k: 'x...x....' }, [2, 2, 2, 3]) },
  { id: 'swing54', name: t('5/4 swing', 'סווינג ב־5/4'), level: 6, bars: 1, bpm: [150, 172], like: ['swing', 'afro68'], bar: B4({ r: 'x..x.xx..x.xx..', p: '...x.....x.....', s: '.....x.....x...', k: 'x.....x........' }, 3, 15) },
];

export const styleById = (id: string) => GROOVE_STYLES.find((s) => s.id === id);
/** Styles open at a level (1 = pp … 6 = ff). */
export const stylesAt = (level: number) => GROOVE_STYLES.filter((s) => s.level <= level);

export const GROOVE_ROUNDS = 10;
export const GROOVE_OPTIONS = 4;
/** Points of a right answer: 10 within 2 s, down to 5 at 12 s. */
export const groovePoints = (ms: number) => Math.round(10 * (1 - 0.5 * Math.max(0, Math.min(1, (ms - 2000) / 10000))));

export interface GrooveRound {
  answer: string;
  options: string[];
  bpm: number;
}

/** Round i: the answer (half the time from the newest tier's styles), three decoys (look-alikes from level 5). */
export function grooveRound(seed: number, i: number, level: number, prev?: string): GrooveRound {
  const lv = Math.max(1, Math.min(6, Math.round(level) || 1));
  const r = rng((seed + Math.imul(i + 1, 0x9e3779b1)) ^ 0x7f4a7c15);
  const open = stylesAt(lv);
  const newest = open.filter((s) => s.level === lv);
  const pool = r() < 0.55 && newest.length ? newest : open;
  let ans = pool[Math.floor(r() * pool.length)];
  if (prev && ans.id === prev && pool.length > 1) ans = pool[(pool.indexOf(ans) + 1) % pool.length];
  const decoys: string[] = [];
  if (lv >= 5) for (const id of ans.like) if (open.some((s) => s.id === id) && decoys.length < GROOVE_OPTIONS - 1) decoys.push(id);
  const rest = open.filter((s) => s.id !== ans.id && !decoys.includes(s.id)).map((s) => s.id);
  while (decoys.length < GROOVE_OPTIONS - 1 && rest.length) decoys.push(rest.splice(Math.floor(r() * rest.length), 1)[0]);
  const options = [ans.id, ...decoys].map((id) => ({ id, k: r() })).sort((a, b) => a.k - b.k).map((x) => x.id);
  const bpm = Math.round(ans.bpm[0] + r() * (ans.bpm[1] - ans.bpm[0]));
  return { answer: ans.id, options, bpm };
}

/** Two bars of the style (a two-bar pattern once, a one-bar pattern twice) as kit sound events. */
export function grooveSound(round: GrooveRound): { events: NoteEvent[]; length: number } {
  const st = styleById(round.answer)!;
  const beats = st.bar.steps / st.bar.sub;
  const hits = st.bars === 2 ? barHits(st.bar, 0) : [...barHits(st.bar, 0), ...barHits(st.bar, beats)];
  const total = st.bars === 2 ? beats : beats * 2;
  // a crash on the first 1 marks the start
  const ev = hitsToEvents([{ b: 0, v: 'crash', d: 1 }, ...hits], round.bpm);
  return { events: ev, length: (total * 60) / round.bpm + 0.5 };
}

// ---------------------------------------------------------------- the run

export interface GrooveSave {
  v: 1;
  game: 'namegroove';
  seed: number;
  level: number;
  tier?: DynName;
  /** Points per answered round (0 = wrong). */
  answers: number[];
  right: number;
  wrong: number;
}
export const newGrooveSave = (seed: number, level: number, tier?: DynName): GrooveSave => ({ v: 1, game: 'namegroove', seed: seed >>> 0, level: Math.max(1, Math.min(6, level)), ...(tier ? { tier } : {}), answers: [], right: 0, wrong: 0 });
export function isGrooveSave(x: unknown): x is GrooveSave {
  const s = x as GrooveSave | null;
  return !!s && s.v === 1 && s.game === 'namegroove' && typeof s.seed === 'number' && Array.isArray(s.answers) && s.answers.length < GROOVE_ROUNDS;
}
/** The current round (no immediate repeat of the last answer). */
export function roundOf(s: GrooveSave, i = s.answers.length): GrooveRound {
  let prev: string | undefined;
  for (let k = 0; k <= i; k++) {
    const r = grooveRound(s.seed, k, s.level, prev);
    if (k === i) return r;
    prev = r.answer;
  }
  return grooveRound(s.seed, i, s.level);
}
export function grooveAnswer(s: GrooveSave, choice: string, ms: number): { state: GrooveSave; correct: boolean; gained: number } {
  const correct = choice === roundOf(s).answer;
  const gained = correct ? groovePoints(ms) : 0;
  return { state: { ...s, answers: [...s.answers, gained], right: s.right + (correct ? 1 : 0), wrong: s.wrong + (correct ? 0 : 1) }, correct, gained };
}
export const grooveOver = (s: GrooveSave) => s.answers.length >= GROOVE_ROUNDS;
export function grooveResult(s: GrooveSave) {
  const n = s.right + s.wrong;
  return { game: 'namegroove' as const, score: s.answers.reduce((a, b) => a + b, 0), detail: { right: s.right, wrong: s.wrong, level: s.level, rounds: n, accuracy: n ? Math.round((100 * s.right) / n) : 0, ...(s.tier ? { tier: s.tier } : {}) } };
}
