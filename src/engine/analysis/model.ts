// Player analysis, layers 1–3 (docs/PLAN-ANALYSIS-AND-NEXT.md §1). Pure.
//  1. features: every note of a take, in its contexts (finger, hand, key, scale, subdivision, tempo band, leap …);
//  2. the player model: a running statistic per context — error rate, timing offset (ms, signed), relative velocity —
//     weighted towards recent takes;
//  3. findings: contexts that differ clearly from the player's own baseline in the same dimension, each with a size,
//     a confidence and a prescription (the drill / topic that trains exactly that).

import type { Drill, TakeMetrics } from '../drills/types';
import { pianoTouch, soloInHand } from '../drills/touch';
import { CTL_TEXT, ctlKindOf } from '../../i18n/measureText';

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
  /** Siskind / MTNA rubric (phraseOrg.ts): the phrasing band of the last improvised takes, oldest first (≤ PHRASING_KEEP). */
  phrasing?: import('../phraseOrg').PhraseBand[];
  /**
   * MEASUREMENT-AUDIT G8: control as a tracked skill — per touch measure (`line:<id>`) the share of takes it was missed,
   * per miss tag (`tag:<tag>`, e.g. tag:dim-early) how often that was the reason; recent takes weigh more.
   */
  control?: Record<string, { n: number; miss: number; last: string }>;
  /** The player said they use their own fingering: no finger is ever named as a likely cause. */
  ownFingering?: boolean;
}
/** Improvised takes whose phrasing band the model keeps. */
export const PHRASING_KEEP = 20;
export const emptyModel = (): PlayerModel => ({ v: 1, stats: {}, takes: 0, updated: '' });

/** ⚙ The weight of the newest note never drops below 1/HALF — older evidence fades over a few hundred notes. */
const HALF = 400;

/** Context keys of one expected note. */
export function contextsOf(drill: Drill, i: number, bpm: number): string[] {
  const n = drill.notes[i];
  const s = drill.spec;
  const out = [`h:${n.hand}`, `fam:${s.family}`, `k:${((s.key % 12) + 12) % 12}`];
  // B1: the piano's fingers only — a guitar / bass fretting finger is another hand (its own contexts, never in the piano's HandMap)
  const piano = pianoTouch(drill);
  if (n.finger) out.push(piano ? `f:${n.hand}${n.finger}` : `gf:${n.hand}${n.finger}`);
  // G3 (owner 2026-11-17): the written fingering is a suggestion — so the note itself, and the suggested finger by note
  // and by key, are kept apart; a finger is named only when the weakness follows it (fingerHypotheses).
  if (piano && soloInHand(drill.notes, n)) {
    const pc = ((n.pitch % 12) + 12) % 12;
    out.push(`p:${n.hand}${pc}`);
    if (n.finger) out.push(`fp:${n.hand}${n.finger}:${pc}`, `fk:${n.hand}${n.finger}:${((s.key % 12) + 12) % 12}`);
  }
  // G3: a thumb right after a crossing (thumb under after 3 or 4, in the run's direction)
  if (piano && n.finger === 1 && soloInHand(drill.notes, n)) {
    const prev = drill.notes.slice(0, i).reverse().find((x) => x.hand === n.hand && soloInHand(drill.notes, x));
    if (prev && (prev.finger === 3 || prev.finger === 4) && (n.hand === 'R' ? n.pitch > prev.pitch : n.pitch < prev.pitch)) out.push(`ta:${n.hand}`);
  }
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
  // relative velocity: each played note against the mean of its hand in this take. B1: only plain notes of a piano take
  // with no shaped dynamics — an accent, a voicing top note, a written level or a crescendo peak is not a finger's habit.
  const SHAPED = ['cresc', 'dim-cresc', 'terraced', 'voicing', 'accent3', 'accent4'];
  const velTake = pianoTouch(drill) && !SHAPED.includes(drill.goal.dynamics ?? '') && !drill.notes.some((n) => n.dynMark || n.hair);
  const plainNote = (r: TakeMetrics['perNote'][number]) => !r.exp.accent && !r.exp.ghost && !r.exp.dyn && !r.exp.dynMark && !r.exp.hair && soloInHand(drill.notes, r.exp);
  const velByHand: Record<string, number[]> = {};
  if (velTake) m.perNote.forEach((r) => r.played && plainNote(r) && (velByHand[r.exp.hand] ??= []).push(r.played.vel));
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
      if (hasVel && r.played && plainNote(r) && meanVel[r.exp.hand]) {
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
  const phrasing = m.phraseOrg ? [...(model.phrasing ?? []), m.phraseOrg.band].slice(-PHRASING_KEEP) : model.phrasing;
  const control = addControl(model.control, m, at);
  return { v: 1, stats, takes: model.takes + 1, updated: at, ...(phrasing ? { phrasing } : {}), ...(control ? { control } : {}) };
}

/** ⚙ Control stats fade over about this many takes. */
const CTL_HALF = 30;
/** G8: fold a take's touch lines and miss tags into the control stats. */
export function addControl(prev: PlayerModel['control'], m: TakeMetrics, at: string): PlayerModel['control'] {
  const t = m.touch;
  if (!t?.lines.length) return prev;
  const out = { ...(prev ?? {}) };
  const bump = (key: string, miss: boolean) => {
    const s = out[key] ?? { n: 0, miss: 0, last: at };
    const w = Math.max(1 / (s.n + 1), 1 / CTL_HALF);
    out[key] = { n: Math.min(CTL_HALF, s.n + 1), miss: s.miss + w * ((miss ? 1 : 0) - s.miss), last: at };
  };
  const ids = new Set(t.lines.map((l) => l.id));
  for (const id of ids) bump(`line:${id}`, t.lines.some((l) => l.id === id && !l.ok));
  // each tag is counted against the takes of its own measure (a tag seen in 6 of 10 crescendo takes = 0.6)
  for (const id of ids)
    for (const tag of Object.keys(CTL_TEXT)) {
      if (ctlKindOf(tag) !== id) continue;
      bump(`tag:${tag}`, (t.tags ?? []).some((x) => x === tag || x.startsWith(`${tag}:`)));
    }
  return out;
}

// ---------------------------------------------------------------- findings

export type FindingKind = 'soft-note' | 'loud-note' | 'finger-hypothesis' | 'soft-finger' | 'loud-finger' | 'hand-balance' | 'rush' | 'drag' | 'uneven' | 'weak-key' | 'weak-scale' | 'leaps' | 'fast-tempo' | 'late-finger' | 'thumb-accent' | 'control';
export interface Finding {
  kind: FindingKind;
  /** The context it is about (e.g. "f:R4", "sub:16", "k:6"). */
  ctx: string;
  /** Size in the finding's unit: velocity % (signed), ms (signed), error-rate ratio. */
  size: number;
  /** How sure (0..1) — from the sample size and the spread. */
  confidence: number;
  text: { en: string; he: string };
  /** A likely cause, not a fact (a finger behind a recurring weakness): the coach words it as "probably". */
  hypothesis?: boolean;
  /** What to practise. */
  prescribe: { family?: string; kind?: string; key?: number; scale?: string; topic?: string; note: { en: string; he: string } };
}

const KEY_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const KEY_HE = ['דו', 'רה♭', 'רה', 'מי♭', 'מי', 'פה', 'פה♯', 'סול', 'לה♭', 'לה', 'סי♭', 'סי'];
const SUB = { beat: { en: 'notes on the beat', he: 'צלילים על הפעמה' }, '8': { en: 'off-beat eighths', he: 'שמיניות בין הפעמות' }, '16': { en: 'sixteenths', he: 'שש־עשריות' }, trip: { en: 'triplets', he: 'טריולות' } } as const;
const z = (diff: number, varr: number, n: number) => (n > 1 && varr > 0 ? Math.abs(diff) / Math.sqrt(varr / n) : 0);
const conf = (zz: number) => Math.max(0, Math.min(1, (zz - 1.5) / 2.5));

/** ⚙ A suggested finger is named only with this much evidence: notes, distinct notes and keys where it is weak. */
export const FINGER_HYP = { minN: 30, perCtx: 6, distinct: 3, effect: 0.1, ctxEffect: 0.06 } as const;

/**
 * G3 (owner 2026-11-17): which explanation fits a recurring weakness — the NOTE (the same pitch weak under different
 * suggested fingers) or the SUGGESTED FINGER (the same finger weak on different notes and in different keys)? A finger
 * is named, as a likely cause only, when its weakness holds on ≥ 3 different notes and in ≥ 3 keys, those notes are
 * NOT weak under the other fingers, and the player has not said they use their own fingering.
 */
export function fingerHypotheses(model: PlayerModel, minN: number = FINGER_HYP.minN): Finding[] {
  if (model.ownFingering) return [];
  const S = model.stats;
  const out: Finding[] = [];
  const H = FINGER_HYP;
  for (const [k, s] of Object.entries(S)) {
    if (!/^f:[RL]\d$/.test(k) || s.vn < minN) continue;
    const diff = s.vMean - 1;
    const zz = z(diff, s.vVar, s.vn);
    if (Math.abs(diff) < H.effect || zz <= 2) continue;
    const sign = Math.sign(diff);
    const hand = k[2];
    const f = k[3];
    const same = (x: Stat | undefined) => !!x && x.vn >= H.perCtx && sign * (x.vMean - 1) >= H.ctxEffect;
    const pcs = Object.entries(S).filter(([c, x]) => c.startsWith(`fp:${hand}${f}:`) && same(x)).map(([c]) => c.split(':')[2]);
    const keys = Object.entries(S).filter(([c, x]) => c.startsWith(`fk:${hand}${f}:`) && same(x)).length;
    if (pcs.length < H.distinct || keys < H.distinct) continue;
    // the note explanation: those notes are weak under other suggested fingers too
    const noteToo = pcs.filter((pc) => Object.entries(S).some(([c, x]) => c.startsWith(`fp:${hand}`) && c.endsWith(`:${pc}`) && c[4] !== f && same(x))).length;
    if (noteToo * 2 >= pcs.length) continue;
    const hn = hand === 'R' ? { en: 'right', he: 'ימין' } : { en: 'left', he: 'שמאל' };
    const soft = sign < 0;
    out.push({
      kind: 'finger-hypothesis', ctx: k, size: Math.round(diff * 100), hypothesis: true,
      confidence: Math.min(conf(zz), Math.min(1, (pcs.length + keys) / 10)),
      text: { en: `Possibly finger ${f} (${hn.en} hand): the ${soft ? 'weakness' : 'bump'} returns wherever finger ${f} is suggested`, he: `ייתכן שזו אצבע ${f} (יד ${hn.he}): ה${soft ? 'חולשה' : 'בליטה'} חוזרת בכל מקום שבו ההמלצה היא אצבע ${f}` },
      prescribe: { family: 'fingers', kind: 'five', note: { en: 'If you use another fingering, say so in the profile', he: 'אם אתם משתמשים באצבוע אחר, אפשר לסמן זאת בפרופיל' } },
    });
  }
  return out;
}

/** Findings, strongest first. `minN` = notes needed in a context before it can be reported. */
export function findings(model: PlayerModel, minN = 30): Finding[] {
  const S = model.stats;
  const out: Finding[] = [];
  const of = (prefix: string) => Object.entries(S).filter(([k]) => k.startsWith(prefix));
  // G3: a note that keeps coming out soft / loud (the note, not the finger: the fingering is only a suggestion)
  const NOTE = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  for (const [k, s] of of('p:')) {
    if (s.vn < minN) continue;
    const diff = s.vMean - 1;
    const zz = z(diff, s.vVar, s.vn);
    if (Math.abs(diff) < 0.1 || zz <= 2) continue;
    const pct = Math.round(diff * 100);
    const hand = k[2] === 'R' ? { en: 'right', he: 'ימין' } : { en: 'left', he: 'שמאל' };
    const nm = NOTE[Number(k.slice(3))];
    out.push({
      kind: diff < 0 ? 'soft-note' : 'loud-note', ctx: k, size: pct, confidence: conf(zz),
      text: diff < 0 ? { en: `${nm} in your ${hand.en} hand tends to come out ${-pct}% soft`, he: `ה־${nm} ביד ${hand.he} נוטה לצאת חלש ב־${-pct}%` } : { en: `${nm} in your ${hand.en} hand tends to bump ${pct}%`, he: `ה־${nm} ביד ${hand.he} נוטה לבלוט ב־${pct}%` },
      prescribe: { family: 'fingers', kind: 'five', note: { en: 'Slowly, with even tone; then an accent on that note', he: 'לאט ובצליל אחיד; אחר כך מבטא על הצליל הזה' } },
    });
  }
  out.push(...fingerHypotheses(model, minN));
  // G3 / B12: fingers that come late — a finger's mean offset against its hand's (the tMean the model always kept)
  for (const [k, s] of of('f:')) {
    const hand = S[`h:${k[2]}`];
    if (!hand || s.tn < minN) continue;
    const diff = s.tMean - hand.tMean;
    const zz = z(diff, s.tVar, s.tn);
    if (diff >= 12 && zz > 2) {
      const fg = k.slice(3);
      const hn = k[2] === 'R' ? { en: 'right', he: 'ימין' } : { en: 'left', he: 'שמאל' };
      out.push({
        kind: 'late-finger', ctx: k, size: Math.round(diff), confidence: conf(zz),
        text: { en: `Finger ${fg} of the ${hn.en} hand comes ${Math.round(diff)} ms late`, he: `אצבע ${fg} ביד ${hn.he} מאחרת ב־${Math.round(diff)} מילישניות` },
        prescribe: { family: 'fingers', kind: 'five', note: { en: 'Five-finger patterns slowly, that finger prepared over its key', he: 'תבניות חמש אצבעות לאט, האצבע הזו מוכנה מעל הקליד' } },
      });
    }
  }
  // G3: the thumb accented right after a crossing
  for (const [k, s] of of('ta:')) {
    if (s.vn < minN) continue;
    const diff = s.vMean - 1;
    const zz = z(diff, s.vVar, s.vn);
    if (diff >= 0.1 && zz > 2) {
      const hn = k[3] === 'R' ? { en: 'right', he: 'ימין' } : { en: 'left', he: 'שמאל' };
      out.push({
        kind: 'thumb-accent', ctx: k, size: Math.round(diff * 100), confidence: conf(zz),
        text: { en: `Your ${hn.en} thumb bumps ${Math.round(diff * 100)}% after a crossing`, he: `האגודל ביד ${hn.he} בולט ב־${Math.round(diff * 100)}% אחרי מעבר` },
        prescribe: { family: 'fingers', kind: 'thumb-under', note: { en: 'Thumb under, slowly: pass early, land softly', he: 'העברת אגודל לאט: להעביר מוקדם, לנחות בעדינות' } },
      });
    }
  }
  // G8: control patterns — a touch measure missed in most recent takes, named by its most frequent reason
  const C = model.control ?? {};
  for (const [key, st] of Object.entries(C)) {
    if (!key.startsWith('line:') || st.n < 5 || st.miss < 0.5) continue;
    const id = key.slice(5);
    const tags = Object.entries(C).filter(([k2, t2]) => k2.startsWith('tag:') && ctlKindOf(k2.slice(4)) === id && t2.n >= 3 && t2.miss >= 0.3).sort((a, b) => b[1].miss - a[1].miss);
    const tag = tags[0]?.[0].slice(4);
    const txt = tag ? CTL_TEXT[tag] : undefined;
    if (!txt) continue;
    out.push({ kind: 'control', ctx: `ctl:${tag}`, size: Math.round(st.miss * 100), confidence: Math.min(1, st.n / 10) * Math.min(1, st.miss + 0.3), text: txt.text, prescribe: { family: 'control', note: txt.note } });
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
  // MEASUREMENT-AUDIT B6: the habit the latency calibration no longer removes — a steady lead / lag on every subdivision.
  const allN = all.reduce((a, [, s]) => a + s.tn, 0);
  const allVar = all.reduce((a, [, s]) => a + s.tVar * s.tn, 0) / Math.max(1, allN);
  if (allN >= 2 * minN && Math.abs(base) >= 12 && z(base, allVar, allN) > 2)
    out.push({
      kind: base < 0 ? 'rush' : 'drag', ctx: 'sub:all', size: Math.round(base), confidence: Math.min(1, allN / (minN * 4)),
      text: base < 0 ? { en: `You play ${Math.round(-base)} ms ahead of the beat`, he: `אתם מנגנים ${Math.round(-base)} מילישניות לפני הפעמה` } : { en: `You play ${Math.round(base)} ms behind the beat`, he: `אתם מנגנים ${Math.round(base)} מילישניות אחרי הפעמה` },
      prescribe: { topic: 'click-subdivide', note: { en: 'Let the click sound first, then play into it', he: 'לתת לקליק להישמע קודם, ואז לנגן לתוכו' } },
    });
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
