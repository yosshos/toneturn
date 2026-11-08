// Player analysis, layers 1–3 (docs/PLAN-ANALYSIS-AND-NEXT.md §1). Pure.
//  1. features: every note of a take, in its contexts (finger, hand, key, scale, subdivision, tempo band, leap …);
//  2. the player model: a running statistic per context — error rate, timing offset (ms, signed), relative velocity —
//     weighted towards recent takes;
//  3. findings: contexts that differ clearly from the player's own baseline in the same dimension, each with a size,
//     a confidence and a prescription (the drill / topic that trains exactly that).

import type { Drill, TakeMetrics } from '../drills/types';

export interface Stat {
  /** Effective sample size (decays slowly). */
  n: number;
  err: number;
  /** Notes with a timing value / velocity value. */
  tn: number;
  tMean: number;
  tVar: number;
  vn: number;
  vMean: number;
  vVar: number;
  last: string;
}
export interface PlayerModel {
  v: 1;
  stats: Record<string, Stat>;
  takes: number;
  updated: string;
}
export const emptyModel = (): PlayerModel => ({ v: 1, stats: {}, takes: 0, updated: '' });

/** ⚙ The weight of the newest note never drops below 1/HALF — older evidence fades over a few hundred notes. */
const HALF = 400;

/** Context keys of one expected note. */
export function contextsOf(drill: Drill, i: number, bpm: number): string[] {
  const n = drill.notes[i];
  const s = drill.spec;
  const out = [`h:${n.hand}`, `fam:${s.family}`, `k:${((s.key % 12) + 12) % 12}`];
  if (n.finger) out.push(`f:${n.hand}${n.finger}`);
  if (s.scale) out.push(`s:${s.scale}`);
  const frac = n.beat - Math.floor(n.beat + 1e-6);
  out.push(`sub:${Math.abs(frac) < 0.05 ? 'beat' : Math.abs(frac - 0.5) < 0.05 ? '8' : Math.abs(frac - 1 / 3) < 0.05 || Math.abs(frac - 2 / 3) < 0.05 ? 'trip' : '16'}`);
  out.push(`bpm:${bpm < 80 ? 'slow' : bpm < 120 ? 'mid' : 'fast'}`);
  // leap from the previous note of the same hand (single notes only)
  if (n.chordId === undefined) {
    const prev = drill.notes.slice(0, i).reverse().find((x) => x.hand === n.hand && x.chordId === undefined);
    if (prev) {
      const d = Math.abs(n.pitch - prev.pitch);
      out.push(`leap:${d <= 2 ? 'step' : d <= 4 ? 'third' : d <= 7 ? 'fourth-fifth' : 'big'}`);
    }
  }
  return out;
}

const upd = (m: number, v: number, x: number, w: number) => {
  const d = x - m;
  const mean = m + w * d;
  return { mean, v: (1 - w) * (v + w * d * d) };
};

/** Fold one judged take into the model. */
export function addTake(model: PlayerModel, drill: Drill, m: TakeMetrics, bpm: number, at: string): PlayerModel {
  const stats = { ...model.stats };
  // relative velocity: each played note against the mean of its hand in this take
  const velByHand: Record<string, number[]> = {};
  m.perNote.forEach((r) => r.played && (velByHand[r.exp.hand] ??= []).push(r.played.vel));
  const meanVel = Object.fromEntries(Object.entries(velByHand).map(([h, vs]) => [h, vs.reduce((a, b) => a + b, 0) / vs.length]));
  const velSpread = Object.values(velByHand).flat();
  const hasVel = velSpread.length > 2 && new Set(velSpread).size > 1;
  m.perNote.forEach((r, i) => {
    const idx = drill.notes.indexOf(r.exp);
    for (const key of contextsOf(drill, idx >= 0 ? idx : i, bpm)) {
      const s: Stat = { ...(stats[key] ?? { n: 0, err: 0, tn: 0, tMean: 0, tVar: 0, vn: 0, vMean: 1, vVar: 0, last: at }) };
      const w = Math.max(1 / (s.n + 1), 1 / HALF);
      s.n = Math.min(HALF, s.n + 1);
      s.err = s.err + w * ((r.ok ? 0 : 1) - s.err);
      if (r.played && r.dev !== null && Math.abs(r.dev) < 400) {
        const wt = Math.max(1 / (s.tn + 1), 1 / HALF);
        const u = upd(s.tMean, s.tVar, r.dev, wt);
        s.tMean = u.mean;
        s.tVar = u.v;
        s.tn = Math.min(HALF, s.tn + 1);
      }
      if (hasVel && r.played && meanVel[r.exp.hand]) {
        const wv = Math.max(1 / (s.vn + 1), 1 / HALF);
        const u = upd(s.vMean, s.vVar, r.played.vel / meanVel[r.exp.hand], wv);
        s.vMean = u.mean;
        s.vVar = u.v;
        s.vn = Math.min(HALF, s.vn + 1);
      }
      s.last = at;
      stats[key] = s;
    }
  });
  return { v: 1, stats, takes: model.takes + 1, updated: at };
}

// ---------------------------------------------------------------- findings

export type FindingKind = 'soft-finger' | 'loud-finger' | 'hand-balance' | 'rush' | 'drag' | 'uneven' | 'weak-key' | 'weak-scale' | 'leaps' | 'fast-tempo';
export interface Finding {
  kind: FindingKind;
  /** The context it is about (e.g. "f:R4", "sub:16", "k:6"). */
  ctx: string;
  /** Size in the finding's unit: velocity % (signed), ms (signed), error-rate ratio. */
  size: number;
  /** How sure (0..1) — from the sample size and the spread. */
  confidence: number;
  text: { en: string; he: string };
  /** What to practise. */
  prescribe: { family?: string; kind?: string; key?: number; scale?: string; topic?: string; note: { en: string; he: string } };
}

const KEY_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const KEY_HE = ['דו', 'רה♭', 'רה', 'מי♭', 'מי', 'פה', 'פה♯', 'סול', 'לה♭', 'לה', 'סי♭', 'סי'];
const SUB = { beat: { en: 'notes on the beat', he: 'צלילים על הפעמה' }, '8': { en: 'off-beat eighths', he: 'שמיניות בין הפעמות' }, '16': { en: 'sixteenths', he: 'שש־עשריות' }, trip: { en: 'triplets', he: 'טריולות' } } as const;
const z = (diff: number, varr: number, n: number) => (n > 1 && varr > 0 ? Math.abs(diff) / Math.sqrt(varr / n) : 0);
const conf = (zz: number) => Math.max(0, Math.min(1, (zz - 1.5) / 2.5));

/** Findings, strongest first. `minN` = notes needed in a context before it can be reported. */
export function findings(model: PlayerModel, minN = 30): Finding[] {
  const S = model.stats;
  const out: Finding[] = [];
  const of = (prefix: string) => Object.entries(S).filter(([k]) => k.startsWith(prefix));
  // fingers: relative velocity per finger (piano), against 1.0 (= the hand's average)
  for (const [k, s] of of('f:')) {
    if (s.vn < minN) continue;
    const diff = s.vMean - 1;
    const zz = z(diff, s.vVar, s.vn);
    if (Math.abs(diff) >= 0.1 && zz > 2) {
      const pct = Math.round(diff * 100);
      const hand = k[2] === 'R' ? { en: 'right', he: 'ימין' } : { en: 'left', he: 'שמאל' };
      const fg = k.slice(3);
      out.push({
        kind: diff < 0 ? 'soft-finger' : 'loud-finger', ctx: k, size: pct, confidence: conf(zz),
        text: diff < 0 ? { en: `Finger ${fg} of the ${hand.en} hand plays ${-pct}% softer than the others`, he: `אצבע ${fg} ביד ${hand.he} מנגנת חלש ב־${-pct}% מהאחרות` } : { en: `Finger ${fg} of the ${hand.en} hand plays ${pct}% louder than the others`, he: `אצבע ${fg} ביד ${hand.he} מנגנת חזק ב־${pct}% מהאחרות` },
        prescribe: { family: 'fingers', kind: 'five', note: { en: 'Five-finger and Hanon patterns, slowly, with even tone; then accents moved to that finger', he: 'תבניות חמש אצבעות והאנון, לאט ובצליל אחיד; אחר כך מבטאים על האצבע הזו' } },
      });
    }
  }
  // hands: timing offset left vs right
  const R = S['h:R'];
  const L = S['h:L'];
  if (R && L && R.tn >= minN && L.tn >= minN) {
    const diff = L.tMean - R.tMean;
    const zz = z(diff, (L.tVar + R.tVar) / 2, Math.min(L.tn, R.tn));
    if (Math.abs(diff) >= 12 && zz > 2)
      out.push({
        kind: 'hand-balance', ctx: 'h:L', size: Math.round(diff), confidence: conf(zz),
        text: diff > 0 ? { en: `Your left hand comes ${Math.round(diff)} ms after the right`, he: `יד שמאל מגיעה ${Math.round(diff)} מילישניות אחרי יד ימין` } : { en: `Your left hand comes ${Math.round(-diff)} ms before the right`, he: `יד שמאל מגיעה ${Math.round(-diff)} מילישניות לפני יד ימין` },
        prescribe: { family: 'scales', kind: 'scale', note: { en: 'Hands-together scales at a slow tempo, listening for one sound', he: 'סולמות בשתי ידיים בטמפו איטי, מקשיבים לצליל אחד' } },
      });
  }
  // subdivisions: rushing / dragging, and unevenness
  const all = of('sub:');
  const base = all.reduce((a, [, s]) => a + s.tMean * s.tn, 0) / Math.max(1, all.reduce((a, [, s]) => a + s.tn, 0));
  for (const [k, s] of all) {
    if (s.tn < minN) continue;
    const zz = z(s.tMean, s.tVar, s.tn);
    const sub = SUB[k.slice(4) as keyof typeof SUB];
    if (Math.abs(s.tMean) >= 12 && zz > 2 && Math.abs(s.tMean - base) >= 6)
      out.push({
        kind: s.tMean < 0 ? 'rush' : 'drag', ctx: k, size: Math.round(s.tMean), confidence: conf(zz),
        text: s.tMean < 0 ? { en: `You rush ${sub.en} by ${Math.round(-s.tMean)} ms`, he: `אתם ממהרים ב${sub.he} ב־${Math.round(-s.tMean)} מילישניות` } : { en: `You drag ${sub.en} by ${Math.round(s.tMean)} ms`, he: `אתם מאחרים ב${sub.he} ב־${Math.round(s.tMean)} מילישניות` },
        prescribe: { topic: 'click-subdivide', note: { en: 'Subdivide the click and place each note in the middle of the sound', he: 'לחלק את הקליק ולשים כל צליל באמצע הצליל של הקליק' } },
      });
    const sd = Math.sqrt(s.tVar);
    if (sd >= 35 && s.tn >= minN)
      out.push({
        kind: 'uneven', ctx: k, size: Math.round(sd), confidence: Math.min(1, s.tn / (minN * 3)),
        text: { en: `Your ${sub.en} spread ±${Math.round(sd)} ms — uneven`, he: `ה${sub.he} שלכם מפוזרות ±${Math.round(sd)} מילישניות — לא אחיד` },
        prescribe: { topic: 'gap-click', note: { en: 'Slower, with the click, until the spread is under 25 ms', he: 'לאט יותר, עם קליק, עד שהפיזור יורד מתחת ל־25 מילישניות' } },
      });
  }
  // keys and scales: error rate against the player's average over keys
  const errBase = (prefix: string) => {
    const xs = of(prefix).filter(([, s]) => s.n >= minN);
    return xs.length ? xs.reduce((a, [, s]) => a + s.err, 0) / xs.length : 0;
  };
  const kb = errBase('k:');
  for (const [k, s] of of('k:'))
    if (s.n >= minN && s.err >= Math.max(0.08, kb * 1.6)) {
      const pc = Number(k.slice(2));
      out.push({
        kind: 'weak-key', ctx: k, size: Math.round((s.err / Math.max(0.01, kb)) * 10) / 10, confidence: Math.min(1, s.n / (minN * 3)),
        text: { en: `${KEY_NAMES[pc]} is one of your weakest keys (${Math.round(s.err * 100)}% misses)`, he: `${KEY_HE[pc]} הוא אחד הסולמות החלשים שלכם (${Math.round(s.err * 100)}% החטאות)` },
        prescribe: { family: 'scales', kind: 'scale', key: pc, note: { en: `Scales and arpeggios in ${KEY_NAMES[pc]}, slowly`, he: `סולמות וארפג׳יו ב${KEY_HE[pc]}, לאט` } },
      });
    }
  const sb = errBase('s:');
  for (const [k, s] of of('s:'))
    if (s.n >= minN && s.err >= Math.max(0.08, sb * 1.6))
      out.push({
        kind: 'weak-scale', ctx: k, size: Math.round((s.err / Math.max(0.01, sb)) * 10) / 10, confidence: Math.min(1, s.n / (minN * 3)),
        text: { en: `${k.slice(2)} scales cause the most misses (${Math.round(s.err * 100)}%)`, he: `סולמות ${k.slice(2)} גורמים להכי הרבה החטאות (${Math.round(s.err * 100)}%)` },
        prescribe: { family: 'scales', kind: 'scale', scale: k.slice(2), note: { en: 'That scale type in three keys, hands separately first', he: 'סוג הסולם הזה בשלושה סולמות, קודם כל יד לבד' } },
      });
  // leaps and fast tempi
  const step = S['leap:step'];
  const big = S['leap:big'];
  if (step && big && big.n >= minN && big.err >= Math.max(0.1, step.err * 2))
    out.push({
      kind: 'leaps', ctx: 'leap:big', size: Math.round((big.err / Math.max(0.01, step.err)) * 10) / 10, confidence: Math.min(1, big.n / (minN * 3)),
      text: { en: `Leaps of a 6th or more fail ${Math.round(big.err * 100)}% of the time (steps: ${Math.round(step.err * 100)}%)`, he: `קפיצות של סקסטה ומעלה נכשלות ב־${Math.round(big.err * 100)}% (צעדים: ${Math.round(step.err * 100)}%)` },
      prescribe: { family: 'advanced', kind: 'leaps', note: { en: 'Leap drills: look ahead, move early, land softly', he: 'תרגילי קפיצות: להסתכל קדימה, לזוז מוקדם, לנחות בעדינות' } },
    });
  const fast = S['bpm:fast'];
  const mid = S['bpm:mid'];
  if (fast && mid && fast.n >= minN && fast.err >= Math.max(0.1, mid.err * 2))
    out.push({
      kind: 'fast-tempo', ctx: 'bpm:fast', size: Math.round((fast.err / Math.max(0.01, mid.err)) * 10) / 10, confidence: Math.min(1, fast.n / (minN * 3)),
      text: { en: `Above ♩=120 your misses jump to ${Math.round(fast.err * 100)}% (from ${Math.round(mid.err * 100)}%)`, he: `מעל ♩=120 ההחטאות קופצות ל־${Math.round(fast.err * 100)}% (מ־${Math.round(mid.err * 100)}%)` },
      prescribe: { note: { en: 'Short bursts at tempo, then back to a clean tempo (the tempo ladder)', he: 'פרצים קצרים בטמפו, ואז חזרה לטמפו נקי (סולם הטמפו)' } },
    });
  return out.sort((a, b) => b.confidence - a.confidence || Math.abs(b.size) - Math.abs(a.size));
}
