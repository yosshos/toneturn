// Reading and theory on the drums path, answered ON THE KIT (docs/research/DRUMS_NICHE_PLAN.md §4; owner: drum reading
// and theory belong to the drums course only). Every item is a measured take — a "theory" question (which line is the
// floor tom? 6/8 or 3/4?) is answered by playing it, never by tapping a button:
//
//   d-read 6–10   triplets vs swung 8ths · the 16th kick with ghost notes · tom fills with sticking · 7/8 and 9/8 with
//                 group beams · a 4-bar groove + fill at sight (20 s to study it first)
//   d-count       simple vs compound · 6/8 vs 3/4 (the accents decide) · 2+2+3 vs 3+2+2 · a time-signature change ·
//                 counting rests through bars
//   d-notation    the drum key · noteheads (x, open-hat circle) · accents, ghosts, flams, drags · tremolo slashes ·
//                 repeat bars and multi-bar rests
//   d-form        crash on each section start · section lengths 4 / 8 / 12 / 16 · the 12-bar blues · AABA · repeats and
//                 endings
//
// Material is generated per item (seeded), our own. Pure and deterministic.

import type { Drill, DrillSpec, DrumGoal, DrumVoice } from './types';
import { withBarPlan } from './timeline';
import { bar, finish, levelOfKind, rep, rnd, type DH, type Lanes } from './drums';
import { buildSong, type SongSection } from './drumSong';

const t = (en: string, he: string) => ({ en, he });
const pick = <T,>(r: () => number, xs: T[]): T => xs[Math.floor(r() * xs.length)];
const alt = (i: number): 'R' | 'L' => (i % 2 ? 'L' : 'R');

/** A seeded lane string: `bars` bars of `steps` steps, each step on with probability p (step 0 of each bar always on). */
function seededLane(r: () => number, steps: number, bars: number, p: number, keep: (i: number) => boolean = () => false): string {
  let out = '';
  for (let b = 0; b < bars; b++) for (let i = 0; i < steps; i++) out += i === 0 || keep(i) || r() < p ? 'x' : '.';
  return out;
}

// ───────────────────────────── d-read 6–10 ─────────────────────────────

/** d-read levels 6–10 (drums.ts dispatches L6+ here). */
export function generateReadMore(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  const lv = levelOfKind(s.kind);
  const r = rnd(`d-read:${s.kind}:${op}`);
  switch (lv) {
    case 6: {
      if (op === 1) {
        // "Swing": written straight 8ths, played long–short (the skip note late in the beat).
        const hits: DH[] = [];
        for (let b = 0; b < 16; b++) {
          const two = r() < 0.7 || b % 4 === 0;
          hits.push({ b, v: 'snare', h: 'R', d: two ? 0.5 : 1 });
          if (two) hits.push({ b: b + 2 / 3, v: 'snare', h: 'L', d: 0.5, swing: true });
        }
        // The skip note sits on the triplet (as in the jazz family) and is timed swung; the staff writes it as a straight
        // 8th under a "Swing" marking (drum.swing8) — the way charts write swing.
        const d = finish(s, hits, { title: t('Read "swing": straight 8ths played long–short', 'לקרוא "סווינג": שמיניות ישרות שמנוגנות ארוך–קצר'), bpm: 90, bars: 4, mic: true, show: 'staff', goal: { swing: { lo: 0.58, hi: 0.72 } } });
        return { ...d, drum: { ...d.drum!, swing8: true } };
      }
      // Written triplets (op 0) or the shuffle written out — triplets with the middle one resting (op 2).
      const cells = op === 2 ? [[0, 2 / 3], [0, 2 / 3], [0], [0, 1 / 3, 2 / 3]] : [[0, 1 / 3, 2 / 3], [0, 0.5], [0], [0, 1 / 3, 2 / 3], [0, 2 / 3]];
      const hits: DH[] = [];
      for (let b = 0; b < 16; b++) {
        const c = b % 4 === 0 && !pick(r, cells).includes(0) ? [0] : pick(r, cells);
        c.forEach((x, j) => hits.push({ b: b + x, v: 'snare', h: alt(j), d: (c[j + 1] ?? 1) - x }));
      }
      return finish(s, hits, { title: t(op === 2 ? 'Read the shuffle written out (triplets, the middle one rests)' : 'Read triplets and 8ths', op === 2 ? 'לקרוא שאפל כתוב (טריולות, האמצעית בהפסקה)' : 'לקרוא טריולות ושמיניות'), bpm: 70, bars: 4, mic: true, show: 'staff' });
    }
    case 7: {
      // The 16th kick and ghost notes: hat 8ths, the backbeat with ghosts around it, a seeded 16th kick line.
      const kick = seededLane(r, 16, 2, 0.22, (i) => i === 8 && r() < 0.5);
      const ghosts = (k: number) => [...'....X.......X...'].map((c, i) => (c === 'X' ? 'X' : (i === 3 || i === 7 || i === 10 || i === 15) && rnd(`${k}:${op}:${i}`)() < 0.5 ? 'g' : '.')).join('');
      const hits = rep(4, (k) => bar({ h: 'x.x.x.x.x.x.x.x.', s: ghosts(k), k: kick.slice((k % 2) * 16, (k % 2) * 16 + 16).replace(/^(.{4})x/, '$1.').replace(/^(.{12})x/, '$1.') }, 4, k * 4, { sHand: (_i, c) => (c === 'g' ? 'L' : 'L') }));
      return finish(s, hits, { title: t(`Read: 16th kick and ghost notes · ${op + 1}`, `קריאה: קיק בשש-עשריות ותווי רפאים · ${op + 1}`), bpm: 70, bars: 4, mic: false, show: 'staff', goal: { ghost: 0.75 } });
    }
    case 8: {
      // Tom fills with sticking marks (shown under the staff; one pad can't tell R from L, so it is not graded).
      const STICK = ['RLRLRLRLRLRLRLRL', 'RRLLRRLLRRLLRRLL', 'RLRRLRLLRLRRLRLL'][op % 3];
      const vs: DrumVoice[][] = [
        ['tom1', 'tom1', 'tom1', 'tom1', 'tom2', 'tom2', 'tom2', 'tom2', 'tom3', 'tom3', 'tom3', 'tom3', 'snare', 'snare', 'tom3', 'tom3'],
        ['snare', 'snare', 'tom1', 'tom1', 'snare', 'snare', 'tom2', 'tom2', 'snare', 'snare', 'tom3', 'tom3', 'tom3', 'tom3', 'tom3', 'tom3'],
        ['tom1', 'snare', 'tom1', 'tom1', 'snare', 'tom2', 'snare', 'snare', 'tom2', 'tom3', 'tom2', 'tom2', 'tom3', 'snare', 'tom3', 'tom3'],
      ];
      const fill = (b0: number): DH[] => [...STICK].map((h, i) => ({ b: b0 + i / 4, v: vs[(op + Math.floor(b0 / 8)) % 3][i], h: h as 'R' | 'L', d: 0.25 }));
      const G: Lanes = { h: 'xxxxxxxx', s: '..x...x.', k: 'x...x...' };
      const hits = [...bar(G, 2, 0), ...fill(4), { b: 8, v: 'crash' as DrumVoice, h: 'R' as const, d: 1 }, { b: 8, v: 'kick' as DrumVoice, h: 'R' as const, d: 1 }, ...bar(G, 2, 8, { from: 0.5 }), ...fill(12), { b: 16, v: 'crash' as DrumVoice, h: 'R' as const, d: 1 }, { b: 16, v: 'kick' as DrumVoice, h: 'R' as const, d: 1 }];
      const nm = [t('singles', 'בודדות'), t('doubles', 'כפולות'), t('paradiddles', 'פאראדידלים')][op % 3];
      const d = finish(s, hits, { title: t(`Read tom fills with sticking · ${nm.en}`, `לקרוא מעברים בטומים עם אצבוע · ${nm.he}`), bpm: 70, bars: 4, tail: 1, mic: false, show: 'staff', goal: { landing: { beats: [8, 16], ms: 25 } } });
      return { ...d, drum: { ...d.drum!, sticking: true } };
    }
    case 9: {
      // Odd meters at sight: 7/8 and 9/8 grooves beamed by their groups (one drill beat = an eighth).
      const M = [
        { groups: [2, 2, 3], name: '7/8 (2+2+3)' },
        { groups: [3, 2, 2], name: '7/8 (3+2+2)' },
        { groups: [2, 2, 2, 3], name: '9/8 (2+2+2+3)' },
        { groups: [3, 3, 3], name: '9/8 (3+3+3)' },
      ][op % 4];
      const m = M.groups.reduce((a, b) => a + b, 0);
      const starts = M.groups.map((_, k) => M.groups.slice(0, k).reduce((a, b) => a + b, 0));
      const hits: DH[] = [];
      for (let b = 0; b < 4; b++) {
        const b0 = b * m;
        for (let i = 0; i < m; i++) hits.push({ b: b0 + i, v: 'hihat', h: 'R', d: 1 });
        starts.forEach((st, k) => {
          if (k % 2 === 0) hits.push({ b: b0 + st, v: 'kick', h: 'R', d: 1 });
          else hits.push({ b: b0 + st, v: 'snare', h: 'L', d: 1 });
        });
        // A seeded extra kick or snare inside a long group.
        const longG = M.groups.findIndex((g) => g === 3);
        if (longG >= 0 && r() < 0.6) hits.push({ b: b0 + starts[longG] + 2, v: r() < 0.5 ? 'kick' : 'snare', h: 'L', d: 1 });
      }
      return finish(s, hits, { title: t(`Read an odd-meter groove · ${M.name}`, `לקרוא גרוב במשקל מוזר · ${M.name}`), bpm: 180, bars: 4, meter: m, pulse: 8, groups: M.groups, mic: false, show: 'staff' });
    }
    default: {
      // At sight: a 4-bar groove + fill, 20 seconds to study it (RSL quick study), landing on the next 1.
      const K = ['x...x...', 'x..xx...', 'x...xx..', 'xx..x..x', 'x..x.x..'];
      const hits: DH[] = [];
      for (let b = 0; b < 3; b++) hits.push(...bar({ h: 'xxxxxxxx', s: r() < 0.3 ? '..x..xx.' : '..x...x.', k: pick(r, K) }, 2, b * 4));
      const F = pick(r, [
        { from: 2, vs: ['snare', 'snare', 'snare', 'snare', 'tom1', 'tom1', 'tom3', 'tom3'] as DrumVoice[] },
        { from: 0, vs: ['snare', 'snare', 'snare', 'snare', 'tom1', 'tom1', 'tom1', 'tom1', 'tom2', 'tom2', 'tom2', 'tom2', 'tom3', 'tom3', 'tom3', 'tom3'] as DrumVoice[] },
        { from: 3, vs: ['snare', 'tom1', 'tom2', 'tom3'] as DrumVoice[] },
      ]);
      hits.push(...bar({ h: 'xxxxxxxx', s: '..x...x.', k: 'x...x...' }, 2, 12, { to: F.from }), ...F.vs.map((v, i) => ({ b: 12 + F.from + i * 0.25, v, h: alt(i), d: 0.25 })));
      hits.push({ b: 16, v: 'crash', h: 'R', d: 1 }, { b: 16, v: 'kick', h: 'R', d: 1 });
      const d = finish(s, hits, { title: t(`At sight: a 4-bar groove and fill · ${op + 1}`, `קריאה מהדף: גרוב של 4 תיבות ומעבר · ${op + 1}`), bpm: 80, bars: 4, tail: 1, mic: false, show: 'staff', goal: { landing: { beats: [16], ms: 25 } } });
      return { ...d, prep: 20 };
    }
  }
}

// ───────────────────────────── d-count ─────────────────────────────

export function generateCount(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  const lv = levelOfKind(s.kind);
  const r = rnd(`d-count:${s.kind}:${op}`);
  const accent: DrumGoal = { accentPos: 0.85 };
  switch (lv) {
    case 1: {
      // Simple vs compound: the same 8ths, accented by the beat — 3/4 (beats of two 8ths), 6/8 and 12/8 (beats of three).
      if (op === 0) {
        // One drill beat = an eighth here too (the tempo counts eighths in all three).
        const hits = rep(48, (i) => [{ b: i, v: 'snare' as DrumVoice, h: alt(i), d: 1, ...(i % 2 === 0 ? { acc: true } : {}) }]);
        const d = finish(s, hits, { title: t('Count in 3/4: three beats, two 8ths each', 'לספור ב-3/4: שלוש פעמות, שתי שמיניות בכל אחת'), bpm: 180, bars: 8, meter: 6, pulse: 8, mic: true, goal: accent });
        return withBarPlan(d, [['3/4', 8]]);
      }
      const m = op === 1 ? 6 : 12;
      const hits = rep(m * (op === 1 ? 8 : 4), (i) => [{ b: i, v: 'snare' as DrumVoice, h: alt(i), d: 1, ...(i % 3 === 0 ? { acc: true } : {}) }]);
      return finish(s, hits, { title: t(`Count in ${m}/8: beats of three 8ths`, `לספור ב-${m}/8: פעמות של שלוש שמיניות`), bpm: 180, bars: op === 1 ? 8 : 4, meter: m, pulse: 8, groups: Array(m / 3).fill(3), mic: true, goal: accent });
    }
    case 2: {
      // 6/8 vs 3/4: six 8ths either way; the signature (and the accents) decide — 1 and 4, or 1, 3 and 5.
      const plan: string[] = [];
      const kinds: ('68' | '34')[] = [];
      for (let k = 0; k < 8; k++) {
        const two = Math.floor(k / 2) % 2 === (op % 2) ? '68' : '34';
        kinds.push(two);
        plan.push(two === '68' ? '6/8 3+3' : '3/4');
      }
      const hits = kinds.flatMap((kd, k) => Array.from({ length: 6 }, (_, i) => ({ b: k * 6 + i, v: 'snare' as DrumVoice, h: alt(i), d: 1, ...((kd === '68' ? i % 3 === 0 : i % 2 === 0) ? { acc: true } : {}) })));
      const d = finish(s, hits, { title: t(`6/8 or 3/4? The accents decide · ${op + 1}`, `6/8 או 3/4? ההדגשות מכריעות · ${op + 1}`), bpm: 180, bars: 8, meter: 6, pulse: 8, groups: [3, 3], mic: true, show: 'staff', goal: accent });
      return withBarPlan(d, plan);
    }
    case 3: {
      // 7/8: 2+2+3 or 3+2+2 — the signature over each bar says which; accent the group starts.
      const plan: string[] = [];
      const gs: number[][] = [];
      for (let k = 0; k < 8; k++) {
        const a = op === 2 ? r() < 0.5 : (Math.floor(k / (op + 1)) % 2 === 0);
        gs.push(a ? [2, 2, 3] : [3, 2, 2]);
        plan.push(a ? '7/8 2+2+3' : '7/8 3+2+2');
      }
      const hits = gs.flatMap((g, k) => {
        const st = new Set(g.map((_, j) => g.slice(0, j).reduce((x, y) => x + y, 0)));
        return Array.from({ length: 7 }, (_, i) => ({ b: k * 7 + i, v: 'snare' as DrumVoice, h: alt(i), d: 1, ...(st.has(i) ? { acc: true } : {}) }));
      });
      const d = finish(s, hits, { title: t(`7/8: 2+2+3 or 3+2+2? · ${op + 1}`, `7/8: 2+2+3 או 3+2+2? · ${op + 1}`), bpm: 180, bars: 8, meter: 7, pulse: 8, groups: gs[0], mic: true, show: 'staff', goal: accent });
      return withBarPlan(d, plan);
    }
    case 4: {
      // A time-signature change in a groove: 4/4, 3/4, 5/4 bars as written (the kick on each 1).
      const orders = [
        [4, 4, 3, 4, 4, 3, 4, 4],
        [4, 3, 3, 4, 5, 4, 4, 4],
        [4, 4, 5, 4, 3, 4, 5, 4],
        [3, 3, 4, 4, 5, 5, 4, 4],
      ];
      const ms = orders[op % orders.length];
      const hits: DH[] = [];
      let b0 = 0;
      for (const n of ms) {
        for (let i = 0; i < n * 2; i++) hits.push({ b: b0 + i / 2, v: 'hihat', h: 'R', d: 0.5 });
        hits.push({ b: b0, v: 'kick', h: 'R', d: 1 });
        if (n >= 4) hits.push({ b: b0 + 2, v: 'kick', h: 'R', d: 1 });
        hits.push({ b: b0 + 1, v: 'snare', h: 'L', d: 1 }, { b: b0 + (n === 3 ? 2 : 3), v: 'snare', h: 'L', d: 1 });
        b0 += n;
      }
      const d = finish(s, hits, { title: t(`Read the time signatures · ${ms.join(' ')}`, `לקרוא את המשקלים · ${ms.join(' ')}`), bpm: 80, bars: ms.length, meter: ms[0], mic: false, show: 'staff' });
      const out = withBarPlan({ ...d, beats: b0 }, ms.map((n) => `${n}/4`));
      return out;
    }
    default: {
      // Count rests through the bars: a figure, three (then two) bars of rest, back in exactly on 1. The click thins out.
      const fig = (b0: number): DH[] => {
        const c = pick(r, [[0, 0.5, 1, 2, 3], [0, 1, 1.5, 2, 2.5, 3], [0, 0.5, 1.5, 2, 3]]);
        return c.map((x, i) => ({ b: b0 + x, v: 'snare' as DrumVoice, h: alt(i), d: (c[i + 1] ?? 4) - x > 1 ? 1 : (c[i + 1] ?? 4) - x }));
      };
      const hits = [...fig(0), ...fig(16), ...fig(28)];
      const click: Drill['click'] = op === 0 ? 'all' : op === 1 ? 'one' : '24';
      const d = finish(s, hits, { title: t(`Count the rests · ${['click on every beat', 'click on 1 only', 'click on 2 and 4'][op % 3]}`, `לספור את ההפסקות · ${['קליק בכל פעמה', 'קליק רק על 1', 'קליק על 2 ו-4'][op % 3]}`), bpm: 80, bars: 8, mic: true, show: 'staff', click });
      return { ...d, drum: { ...d.drum!, mbRests: [{ bar: 1, n: 3 }, { bar: 5, n: 2 }] } };
    }
  }
}

// ───────────────────────────── d-notation ─────────────────────────────

const KEY_VOICES: DrumVoice[] = ['kick', 'snare', 'tom1', 'tom2', 'tom3', 'hihat', 'ride', 'crash'];

export function generateNotation(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  const lv = levelOfKind(s.kind);
  const r = rnd(`d-notation:${s.kind}:${op}`);
  switch (lv) {
    case 1: {
      // The drum key: one drum a beat, any drum — its line or space on the staff tells which. Play what is written.
      const hits: DH[] = [];
      let prev: DrumVoice | null = null;
      for (let b = 0; b < 16; b++) {
        let v = pick(r, KEY_VOICES);
        if (v === prev) v = KEY_VOICES[(KEY_VOICES.indexOf(v) + 3) % KEY_VOICES.length];
        prev = v;
        hits.push({ b, v, h: 'R', d: 1 });
      }
      return finish(s, hits, { title: t(`The drum key: play each written drum · ${op + 1}`, `מפתח התופים: לנגן כל תוף כתוב · ${op + 1}`), bpm: 60, bars: 4, mic: false, show: 'staff' });
    }
    case 2: {
      // Noteheads: x = cymbals (hat, ride, crash), round = drums; a circle over the hat = open.
      const hits: DH[] = [];
      for (let k = 0; k < 4; k++) {
        const top: DrumVoice = k % 2 ? 'ride' : 'hihat';
        for (let i = 0; i < 8; i++) {
          const open = top === 'hihat' && i % 2 === 1 && r() < 0.3;
          hits.push({ b: k * 4 + i / 2, v: i === 0 && k === 2 ? 'crash' : open ? 'hhOpen' : top, h: 'R', d: 0.5 });
        }
        hits.push({ b: k * 4, v: 'kick', h: 'R', d: 1 }, { b: k * 4 + 1, v: pick(r, ['snare', 'tom1'] as DrumVoice[]), h: 'L', d: 1 }, { b: k * 4 + 3, v: pick(r, ['snare', 'tom2', 'tom3'] as DrumVoice[]), h: 'L', d: 1 });
      }
      if (!hits.some((h) => h.v === 'hhOpen')) hits[3] = { ...hits[3], v: 'hhOpen' };
      return finish(s, hits, { title: t(`Noteheads: x, round, open hat · ${op + 1}`, `ראשי תווים: x, עגול, היי־האט פתוח · ${op + 1}`), bpm: 70, bars: 4, mic: false, show: 'staff', goal: { hat: true } });
    }
    case 3: {
      // Marks on the snare: accents and ghost notes · flams · drags.
      if (op === 0) {
        const hits = rep(64, (i) => [{ b: i / 4, v: 'snare' as DrumVoice, h: alt(i), d: 0.25, ...(i % 4 === 0 && r() < 0.6 ? { acc: true } : i % 2 === 1 && r() < 0.5 ? { ghost: true } : {}) }]);
        return finish(s, hits, { title: t('Marks: accents and ghost notes', 'סימנים: הדגשות ותווי רפאים'), bpm: 60, bars: 4, mic: false, show: 'staff', goal: { accentPos: 0.8, ghost: 0.75 } });
      }
      const grace = op === 1 ? 1 : 2;
      const hits = rep(32, (i) => [{ b: i / 2, v: 'snare' as DrumVoice, h: alt(i), d: 0.5, ...(i % 4 === 0 || (i % 4 === 3 && r() < 0.4) ? { grace: grace as 1 | 2, acc: true } : {}) }]);
      return finish(s, hits, { title: t(op === 1 ? 'Marks: flams' : 'Marks: drags', op === 1 ? 'סימנים: פלאמים' : 'סימנים: דראגים'), bpm: 60, bars: 4, mic: false, show: 'staff', goal: { flam: 0.85 } });
    }
    case 4: {
      // Tremolo slashes: one written note, its strokes by the slashes (1 = 8ths, 2 = 16ths, 3 = 32nds).
      const trem: { beat: number; dur: number; slashes: 1 | 2 | 3 }[] = [];
      const hits: DH[] = [];
      for (let b = 0; b < 16; ) {
        const sl: 1 | 2 | 3 = op === 0 ? 1 : op === 1 ? 2 : pick(r, [2, 3, 2] as (1 | 2 | 3)[]);
        const dur = op === 2 && sl === 3 && b % 2 === 0 ? 2 : 1;
        const step = sl === 1 ? 0.5 : sl === 2 ? 0.25 : 0.125;
        trem.push({ beat: b, dur, slashes: sl });
        for (let k = 0; k < dur / step; k++) hits.push({ b: b + k * step, v: 'snare', h: alt(k), d: step });
        b += dur;
        // A plain quarter now and then (no slash).
        if (op === 2 && b < 16 && b % 4 === 3) {
          hits.push({ b, v: 'snare', h: 'R', d: 1, acc: true });
          b += 1;
        }
      }
      const nm = [t('one slash = 8ths', 'קו אחד = שמיניות'), t('two slashes = 16ths', 'שני קווים = שש-עשריות'), t('two and three slashes', 'שניים ושלושה קווים')][op % 3];
      const d = finish(s, hits, { title: t(`Tremolo slashes · ${nm.en}`, `קווי טרמולו · ${nm.he}`), bpm: 60, bars: 4, mic: true, show: 'staff' });
      return { ...d, drum: { ...d.drum!, trem } };
    }
    default: {
      // Repeat bars (%) and a multi-bar rest: a written bar, "%" for the next ones, rest bars counted, a new bar.
      const K = ['x...x...', 'x..xx...', 'x...xx..'];
      const A: Lanes = { h: 'xxxxxxxx', s: '..x...x.', k: pick(r, K) };
      const B: Lanes = { h: 'xxxxxxxx', s: '..x..xx.', k: pick(r, K) };
      const rest = op % 2 ? 2 : 1;
      const hits: DH[] = [...rep(4, (k) => bar(A, 2, k * 4)), ...rep(2, (k) => bar(B, 2, (4 + rest + k) * 4))];
      const bars = 6 + rest;
      const d = finish(s, hits, { title: t(`Repeat signs and rests · ${op + 1}`, `סימני חזרה והפסקות · ${op + 1}`), bpm: 80, bars, mic: false, show: 'staff' });
      return { ...d, drum: { ...d.drum!, repeatBars: [1, 2, 3, 5 + rest], mbRests: [{ bar: 4, n: rest }] } };
    }
  }
}

// ───────────────────────────── d-form ─────────────────────────────

const RIDE: Lanes = { r: 'x..x.xx..x.x', p: '...x.....x..' };
const AABA = { A: ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Em7', 'A7', 'Dm7', 'G7'], B: ['Fmaj7', 'Fm7', 'Em7', 'A7', 'Dm7', 'G7', 'Dm7', 'G7'] };
const BLUES = ['A7', 'A7', 'A7', 'A7', 'D7', 'D7', 'A7', 'A7', 'E7', 'D7', 'A7', 'E7'];

export function generateForm(s: DrillSpec): Drill {
  const op = s.option ?? 0;
  const lv = levelOfKind(s.kind);
  const seed = `${s.kind}:${op}`;
  const r = rnd(`d-form:${seed}`);
  const TIME: Lanes = { h: 'x.x.x.x.', s: '..x...x.', k: 'x...x...' };
  const CH: Lanes = { r: 'xxxxxxxx', s: '..x...x.', k: 'x...x...' };
  const sign = (xs: SongSection[]) => xs.filter((x) => !x.end).map((x) => `${x.name} ${x.bars}`);
  switch (lv) {
    case 1:
    case 2: {
      // Crash on each section start; the chart gives the lengths (L1 4 / 8, L2 4 / 8 / 12 / 16), the player counts.
      const L = lv === 1 ? [4, 8] : [4, 8, 12, 16];
      const n = lv === 1 ? 4 : 3;
      const secs: SongSection[] = Array.from({ length: n }, (_, k) => ({ name: k % 2 ? 'B' : 'A', kind: (k % 2 ? 'chorus' : 'verse') as SongSection['kind'], bars: lv === 2 && k === 0 ? 16 - 4 * Math.floor(r() * 2) : pick(r, L), lanes: k % 2 ? CH : TIME, chart: k % 2 ? ['F', 'G', 'C', 'C'] : ['C', 'Am', 'F', 'G'] }));
      secs.push({ name: 'Ending', kind: 'outro', bars: 1, chart: ['C'], end: true });
      const lens = secs.filter((x) => !x.end).map((x) => x.bars).join(' + ');
      return buildSong(s, secs, { title: t(`Crash on each section start · ${lens}`, `קראש בכל פתיחת קטע · ${lens}`), bpm: 90, style: 'pop', seed, roadmap: 'written', signs: sign(secs) });
    }
    case 3: {
      // The 12-bar blues: two choruses on the shuffle, a turnaround fill into the second, the ending.
      const SH: Lanes = op === 1 ? { r: 'x.xx.xx.xx.x', s: '...x.....x..', k: 'x.....x.....' } : op === 2 ? { h: 'x.xx.xx.xx.x', s: '...x.....x..', k: 'x..x..x..x..' } : { h: 'x.xx.xx.xx.x', s: '...x.....x..', k: 'x.....x.....' };
      const secs: SongSection[] = [
        { name: 'Blues', kind: 'head', bars: 12, lanes: SH, sub: 3, chart: BLUES },
        { name: 'Blues', kind: 'head', bars: 12, lanes: SH, sub: 3, chart: BLUES, fillBefore: 'trip' },
        { name: 'Ending', kind: 'outro', bars: 1, chart: ['A7'], end: true, fillBefore: 'trip' },
      ];
      return buildSong(s, secs, { title: t('The 12-bar blues · two choruses', 'בלוז של 12 תיבות · שני כורוסים'), bpm: 90, style: 'shuffle', seed, roadmap: 'written', signs: ['‖: Blues 12 :‖ ×2', 'Ending'] });
    }
    case 4: {
      // AABA: 8-bar sections on the swing ride with the foot on 2 and 4, a set-up fill into the bridge, crash on each A.
      // Variants: the set-up into the bridge (a triplet beat, 16ths), and a busier ride with the snare on 4's skip note.
      const ride: Lanes = op === 2 ? { ...RIDE, s: '...........x' } : RIDE;
      const setUp = op === 1 ? 'beat' : 'trip';
      const secs: SongSection[] = [
        { name: 'A', kind: 'head', bars: 8, lanes: ride, sub: 3, chart: AABA.A, band: 'swing' },
        { name: 'B', kind: 'bridge', bars: 8, lanes: ride, sub: 3, chart: AABA.B, band: 'swing', fillBefore: setUp },
        { name: 'Ending', kind: 'outro', bars: 1, chart: ['Cmaj7'], end: true, fillBefore: 'trip' },
      ];
      const d = buildSong(s, secs, { title: t('AABA: 32 bars on the ride', 'AABA: 32 תיבות על הרייד'), bpm: 140, style: 'swing', seed, order: [0, 0, 1, 0, 2], roadmap: 'written', signs: ['A 8', 'A 8', 'B 8', 'A 8'] });
      // The ride's skip notes are swung (measured like the jazz family).
      const notes = d.notes.map((n) => (n.voice === 'ride' && Math.abs((n.beat % 1) - 2 / 3) < 1e-6 ? { ...n, swing: true } : n));
      return { ...d, notes, goal: { ...d.goal, drum: { ...d.goal.drum!, swing: { lo: 0.58, hi: 0.72 } } } };
    }
    default: {
      // Repeats and endings: ‖: A (4) [1. 2 bars] :‖ [2. 2 bars] B (4) — follow the signs.
      const secs: SongSection[] = [
        { name: 'A', kind: 'verse', bars: 4, lanes: TIME, chart: ['C', 'Am', 'F', 'G'] },
        { name: '1st ending', kind: 'verse', bars: 2, lanes: TIME, chart: ['Dm', 'G'] },
        { name: '2nd ending', kind: 'verse', bars: 2, lanes: CH, chart: ['F', 'G'], fillBefore: 'beat' },
        { name: 'B', kind: 'chorus', bars: 4, lanes: CH, chart: ['F', 'G', 'C', 'C'], fillBefore: 'two' },
        { name: 'Ending', kind: 'outro', bars: 1, chart: ['C'], end: true, fillBefore: 'beat' },
      ];
      return buildSong(s, secs, { title: t(`Repeats and 1st / 2nd endings · ${op + 1}`, `חזרות וסיומות ראשונה / שנייה · ${op + 1}`), bpm: 90, style: 'pop', seed, order: [0, 1, 0, 2, 3, 4], roadmap: 'written', signs: ['‖: A 4', '1. 2', ':‖ 2. 2', 'B 4'] });
    }
  }
}
