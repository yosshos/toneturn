// Drum take analysis (DRUMS_CURRICULUM §3.6, §4.1): hits matched to the expected notes by voice, per-limb timing vs
// the grid, hit rate, wrong-voice rate, velocity bands from the calibration (accent gap, ghost band, three levels,
// doubles), hi-hat open / closed on the right steps, landing on 1 after fills, the offset in the silent click bars.
// Verdict: clean = every rule of the tier met; almost = one rule missed by < 25 %; not = otherwise. Pure.

import type { Drill, DrumMetrics, DrumVoice, Limb, NoteResult, PlayedNote, TakeMetrics, Verdict } from './types';
import { expTimeMs, npsOf } from './analyze';
import { classOf, inDynBand, velBand, velRange, VOICE_NAME, VOICE_NOTE, type HatState, type KitProfile } from '../drumKit';

/** One hit of a take (latency removed; ms from beat 0 of the drill). */
export interface DrumTakeHit {
  voice: DrumVoice | null;
  on: number;
  vel: number;
  open?: number | null;
  hat?: HatState | null;
}

/** The tier thresholds (§4.1 ⚙ defaults, to calibrate with drummers). */
export const DRUM_TIERS: Record<1 | 2 | 3, { window: number; hit: number; sd: number; mean: number; wrong: number }> = {
  1: { window: 60, hit: 0.9, sd: 25, mean: 25, wrong: 0.05 },
  2: { window: 45, hit: 0.95, sd: 16, mean: 15, wrong: 0.03 },
  3: { window: 35, hit: 0.97, sd: 11, mean: 10, wrong: 0.02 },
};

const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sdOf = (xs: number[]): number | null => {
  if (xs.length < 3) return null;
  const m = mean(xs)!;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};
const cvOf = (xs: number[]): number | null => {
  const m = mean(xs);
  const s = sdOf(xs);
  return m && s !== null ? s / m : null;
};
const median = (xs: number[]): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const k = s.length >> 1;
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
};

/**
 * The hit window of a take: the tier's, tightened to 22 % of the shortest written gap between onsets — but never below
 * 1.6 × the tier's SD limit (else a player inside the SD rule fails the hit rate at fast subdivisions: ±20 ms at
 * sextuplets ♩110 meant SD ≤ 10 ms in practice), and never past 35 % of the gap (a hit stays nearer its own note).
 */
export function drumWindow(drill: Drill, bpm: number): number {
  const tier = drill.drum?.tier ?? 1;
  const ts = [...new Set(drill.notes.map((n) => Math.round(expTimeMs(drill, n.beat, bpm) * 100) / 100))].sort((a, b) => a - b);
  const gaps = ts.slice(1).map((x, i) => x - ts[i]).filter((g) => g > 1);
  const minIoi = gaps.length ? Math.min(...gaps) : 1000;
  const T = DRUM_TIERS[tier];
  return Math.max(15, Math.min(T.window, Math.max(0.22 * minIoi, Math.min(1.6 * T.sd, 0.35 * minIoi))));
}

/** Silent click bars (click 'gap'): bar index → no click. */
const silentBar = (drill: Drill, beat: number): boolean => {
  if (drill.click !== 'gap' || !drill.gap) return false;
  const [on, off] = drill.gap;
  const bar = Math.floor(beat / (drill.meter || 4) + 1e-9);
  return bar % (on + off) >= on;
};

const LIMBS: Limb[] = ['RH', 'LH', 'RF', 'LF'];

export function analyzeDrumTake(drill: Drill, bpm: number, hits0: DrumTakeHit[], opts: { kit?: KitProfile; mic?: boolean } = {}): TakeMetrics {
  const mic = !!opts.mic;
  const tier = drill.drum?.tier ?? 1;
  const T = DRUM_TIERS[tier];
  const W = drumWindow(drill, bpm);
  const goal = drill.goal.drum ?? {};
  // Swing (jazz ride): a skip note is matched at the middle of the allowed swing range, not on the written triplet.
  const swMid = goal.swing ? (goal.swing.lo + goal.swing.hi) / 2 : 2 / 3;
  const beatMsAt = (b: number) => expTimeMs(drill, Math.floor(b + 1e-6) + 1, bpm) - expTimeMs(drill, Math.floor(b + 1e-6), bpm);
  const exp = drill.notes.map((n) => ({ n, t: n.swing && goal.swing ? expTimeMs(drill, Math.floor(n.beat + 1e-6), bpm) + swMid * beatMsAt(n.beat) : expTimeMs(drill, n.beat, bpm) }));
  const hits = [...hits0].filter((h) => Number.isFinite(h.on)).sort((a, b) => a.on - b.on);
  // In mic mode every hit is the one surface: match by time only.
  const cls = (v: DrumVoice | null | undefined) => (mic ? 'snare' : v ? classOf(v) : null);
  // Flams and drags (MIDI): a hit followed within 50 ms by another of the same drum is a grace note of that stroke -
  // when an expected grace-note stroke is due there. Grace hits stay out of the matching (and are not "extra").
  const graceOf = new Map<number, number[]>();
  const graceHit = new Set<number>();
  if (goal.flam !== undefined && !mic) {
    const graceTimes = exp.filter((e) => e.n.grace).map((e) => e.t);
    for (let j = 0; j < hits.length; j++) {
      if (graceHit.has(j)) continue;
      const chain = [j];
      for (let k = j + 1; k < hits.length && hits[k].on - hits[chain[chain.length - 1]].on <= 50; k++) if (cls(hits[k].voice) === cls(hits[j].voice)) chain.push(k);
      if (chain.length < 2) continue;
      const main = chain[chain.length - 1];
      if (!graceTimes.some((t) => Math.abs(hits[main].on - t) <= 60)) continue;
      graceOf.set(main, chain.slice(0, -1));
      for (const g of chain.slice(0, -1)) graceHit.add(g);
    }
  }
  const ts = [...new Set(exp.map((e) => Math.round(e.t)))].sort((a, b) => a - b);
  const gaps = ts.slice(1).map((x, i) => x - ts[i]).filter((g) => g > 1);
  const minIoi = gaps.length ? Math.min(...gaps) : 1000;
  const S = Math.max(W * 1.6, Math.min(0.48 * minIoi, 120));

  // Greedy nearest matching, by voice class.
  const pairs: { i: number; j: number; d: number }[] = [];
  exp.forEach((e, i) =>
    hits.forEach((h, j) => {
      if (graceHit.has(j)) return;
      const d = Math.abs(h.on - e.t);
      if (d <= S && cls(h.voice) === cls(e.n.voice)) pairs.push({ i, j, d });
    }),
  );
  pairs.sort((a, b) => a.d - b.d);
  const mExp = new Map<number, number>();
  const usedHit = new Set<number>(graceHit);
  for (const p of pairs) {
    if (mExp.has(p.i) || usedHit.has(p.j)) continue;
    mExp.set(p.i, p.j);
    usedHit.add(p.j);
  }
  // Wrong voice: an unplayed note with an unmatched hit of another voice at its time.
  let wrong = 0;
  const wrongAt = new Map<number, number>();
  exp.forEach((e, i) => {
    if (mExp.has(i)) return;
    let best = -1;
    let bd = Infinity;
    hits.forEach((h, j) => {
      if (usedHit.has(j)) return;
      const d = Math.abs(h.on - e.t);
      if (d <= W && d < bd) {
        best = j;
        bd = d;
      }
    });
    if (best >= 0) {
      wrong++;
      usedHit.add(best);
      wrongAt.set(i, best);
    }
  });
  // A tom for another tom (same class) is also the wrong voice.
  for (const [i, j] of mExp) if (!mic && exp[i].n.voice && hits[j].voice && classOf(exp[i].n.voice!) === 'tom' && hits[j].voice !== exp[i].n.voice) wrong++;
  const extra = hits.length - usedHit.size;

  const perNote: NoteResult[] = exp.map((e, i) => {
    const j = mExp.get(i) ?? wrongAt.get(i);
    const h = j === undefined ? null : hits[j];
    const played: PlayedNote | null = h ? { pitch: h.voice ? VOICE_NOTE[h.voice] : e.n.pitch, on: h.on, off: null, vel: h.vel } : null;
    const dev = h ? h.on - e.t : null;
    const sameVoice = mExp.has(i) && (mic || !h?.voice || classOf(h.voice) !== 'tom' || h.voice === e.n.voice);
    const w = e.n.swing && goal.swing ? Math.max(W, 0.09 * beatMsAt(e.n.beat)) : W;
    return { exp: e.n, played, dev, ok: !!h && mExp.has(i) && sameVoice && Math.abs(dev!) <= w };
  });
  const matched = perNote.map((r, i) => ({ r, i })).filter(({ i }) => mExp.has(i));
  const onTime = perNote.filter((r) => r.ok).length;
  const nExp = Math.max(1, exp.length);
  const hitRate = onTime / nExp;

  // Per limb and per voice.
  const limbOfN = (i: number): Limb => exp[i].n.limb ?? (exp[i].n.hand === 'L' ? 'LH' : 'RH');
  const limbs = LIMBS.map((limb) => {
    const of = exp.filter((_, i) => limbOfN(i) === limb).length;
    // Swung skip notes are judged by the swing ratio, not by their place on the grid.
    const ds = matched.filter(({ i }) => limbOfN(i) === limb && !(exp[i].n.swing && goal.swing)).map(({ r }) => r.dev!);
    return { limb, mean: mean(ds), sd: sdOf(ds), n: ds.length, of };
  }).filter((l) => l.of > 0);
  const voicesIn = [...new Set(exp.map((e) => e.n.voice).filter((v): v is DrumVoice => !!v))];
  const voices = voicesIn.map((voice) => {
    const of = exp.filter((e) => e.n.voice === voice).length;
    const ds = matched.filter(({ i }) => exp[i].n.voice === voice).map(({ r }) => r.dev!);
    return { voice, mean: mean(ds), n: ds.length, of };
  });
  const devs = matched.map(({ r }) => r.dev!);
  // IOI evenness per hand: actual / written gap between consecutive matched notes of that hand.
  const cvHand = (hand: 'R' | 'L'): number | null => {
    const xs = matched.filter(({ i }) => exp[i].n.hand === hand && (exp[i].n.limb ?? 'RH').endsWith('H')).map(({ r, i }) => ({ on: r.played!.on, t: exp[i].t }));
    const ratios: number[] = [];
    for (let k = 1; k < xs.length; k++) {
      const w = xs[k].t - xs[k - 1].t;
      if (w > 1) ratios.push((xs[k].on - xs[k - 1].on) / w);
    }
    return ratios.length >= 3 ? cvOf(ratios) : null;
  };

  // Velocity (MIDI, or mic peaks mapped to 1–127). A mic take without a level spread has no velocity data.
  const vels = matched.map(({ r }) => r.played!.vel);
  const velData = vels.length >= 3 && (!mic || vels.some((v) => v !== vels[0]));
  const rng = (i: number) => velRange(opts.kit, exp[i].n.voice ?? 'snare');
  const accV = matched.filter(({ i }) => exp[i].n.accent).map(({ r }) => r.played!.vel);
  const tapV = matched.filter(({ i }) => !exp[i].n.accent && !exp[i].n.ghost).map(({ r }) => r.played!.vel);
  const range0 = velRange(opts.kit, drill.notes[0]?.voice ?? 'snare');
  const span = Math.max(1, range0.loud - range0.soft);
  const velCv = velData ? cvOf(vels) : null;
  const rV = matched.filter(({ i }) => exp[i].n.hand === 'R' && (exp[i].n.limb ?? 'RH').endsWith('H')).map(({ r }) => r.played!.vel);
  const lV = matched.filter(({ i }) => exp[i].n.hand === 'L').map(({ r }) => r.played!.vel);
  const balance = velData && rV.length >= 3 && lV.length >= 3 ? Math.abs(mean(rV)! - mean(lV)!) / ((mean(rV)! + mean(lV)!) / 2) : null;
  const dynN = matched.filter(({ i }) => exp[i].n.dyn);
  const levels = velData && dynN.length ? dynN.filter(({ r, i }) => inDynBand(r.played!.vel, exp[i].n.dyn!, rng(i))).length / dynN.length : null;
  const mA = median(accV);
  const mT = median(tapV);
  const accentGap = velData && mA !== null && mT !== null ? (mA - mT) / span : null;
  const tapCv = velData && tapV.length >= 3 ? cvOf(tapV) : null;
  // Accent positions: a stroke counts as accented above the take's own midpoint (or the calibration's, without a gap).
  const thr = mA !== null && mT !== null && mA - mT >= 8 ? (mA + mT) / 2 : range0.soft + 0.55 * span;
  const accN = matched.filter(({ i }) => !exp[i].n.ghost);
  const accentPos = velData && accV.length ? accN.filter(({ r, i }) => r.played!.vel >= thr === !!exp[i].n.accent).length / Math.max(1, accN.length) : null;
  const ghN = matched.filter(({ i }) => exp[i].n.ghost);
  const ghostMissing = exp.filter((e, i) => e.n.ghost && !mExp.has(i)).length;
  const ghost = velData && ghN.length ? ghN.filter(({ r, i }) => velBand(r.played!.vel, rng(i)) === 'ghost').length / (ghN.length + ghostMissing) : null;
  // Doubles: second stroke ≥ ratio × the first.
  let dblOk = 0;
  let dblN = 0;
  exp.forEach((e, i) => {
    if (e.n.dbl !== 1) return;
    const k = exp.findIndex((x, j) => j > i && x.n.dbl === 2 && x.n.hand === e.n.hand);
    if (k < 0 || !mExp.has(i) || !mExp.has(k)) return;
    dblN++;
    if (perNote[k].played!.vel >= (goal.ratio ?? 0.8) * perNote[i].played!.vel) dblOk++;
  });
  const ratio = velData && dblN ? dblOk / dblN : null;
  // Hi-hat articulation (MIDI only).
  const hatIdx = exp.map((_, i) => i).filter((i) => exp[i].n.voice === 'hihat' || exp[i].n.voice === 'hhOpen');
  const isOpen = (j: number) => hits[j].voice === 'hhOpen' || hits[j].hat === 'open' || hits[j].hat === 'half';
  const openSteps = hatIdx.filter((i) => exp[i].n.voice === 'hhOpen');
  const closedSteps = hatIdx.filter((i) => exp[i].n.voice === 'hihat');
  const hatOpen = !mic && openSteps.length ? openSteps.filter((i) => mExp.has(i) && isOpen(mExp.get(i)!)).length / openSteps.length : null;
  const hatClosed = !mic && openSteps.length && closedSteps.length ? closedSteps.filter((i) => mExp.has(i) && !(hits[mExp.get(i)!].voice === 'hhOpen' || hits[mExp.get(i)!].hat === 'open')).length / Math.max(1, closedSteps.filter((i) => mExp.has(i)).length) : null;
  // Landing on 1 after fills: the crash and the kick on that beat (mean offset), null when either is missing.
  const landing = (goal.landing?.beats ?? []).map((b) => {
    const at = exp.map((_, i) => i).filter((i) => Math.abs(exp[i].n.beat - b) < 1e-6 && (exp[i].n.voice === 'crash' || exp[i].n.voice === 'kick'));
    if (!at.length || at.some((i) => !mExp.has(i))) return null;
    return mean(at.map((i) => perNote[i].dev!));
  });
  // The silent click bars.
  const gapDevs = matched.filter(({ i }) => silentBar(drill, exp[i].n.beat)).map(({ r }) => r.dev!);
  const gapMean = drill.click === 'gap' ? mean(gapDevs) : null;

  // Flams / drags: the grace hit(s) before each grace-note stroke - 15-40 ms before the main stroke (a drag's first
  // grace within 80 ms), softer than it; the flam gaps even (SD).
  let flam: number | null = null;
  let flamGap: number | null = null;
  let flamSd: number | null = null;
  if (goal.flam !== undefined && !mic) {
    const due = exp.map((e, i) => ({ e, i })).filter(({ e }) => e.n.grace);
    const gaps: number[] = [];
    let ok = 0;
    for (const { e, i } of due) {
      const j = mExp.get(i);
      if (j === undefined) continue;
      const gs = graceOf.get(j) ?? [];
      if (gs.length !== e.n.grace) continue;
      const main = hits[j];
      const gap = main.on - hits[gs[gs.length - 1]].on;
      if (e.n.grace === 1) gaps.push(gap);
      const span = main.on - hits[gs[0]].on;
      if (gap >= 15 && gap <= 40 && span <= (e.n.grace === 2 ? 80 : 40) && gs.every((g) => hits[g].vel < main.vel)) ok++;
    }
    flam = due.length ? ok / due.length : null;
    flamGap = mean(gaps);
    flamSd = sdOf(gaps);
  }
  // Swing: where the skip note falls inside its beat (played downbeat -> next played downbeat of the same voice).
  let swing: number | null = null;
  let swingSd: number | null = null;
  if (goal.swing) {
    const at = new Map<string, number>();
    for (const { r, i } of matched) at.set(`${exp[i].n.voice}:${Math.round(exp[i].n.beat * 1000)}`, r.played!.on);
    const rs: number[] = [];
    for (const { r, i } of matched) {
      if (!exp[i].n.swing) continue;
      const b = Math.floor(exp[i].n.beat + 1e-6);
      const a = at.get(`${exp[i].n.voice}:${b * 1000}`);
      if (a === undefined) continue;
      const c = at.get(`${exp[i].n.voice}:${(b + 1) * 1000}`);
      const len = c !== undefined ? c - a : beatMsAt(b);
      if (len > 1) rs.push((r.played!.on - a) / len);
    }
    swing = median(rs);
    swingSd = sdOf(rs);
  }

  // Rules → verdict.
  type Rule = { id: string; amt: number };
  const rules: Rule[] = [];
  const max = (id: string, v: number | null, t: number) => v !== null && rules.push({ id, amt: v > t ? (v - t) / t : 0 });
  const min = (id: string, v: number | null, t: number) => v !== null && rules.push({ id, amt: v < t ? (t - v) / t : 0 });
  min('hit', hitRate, T.hit);
  max('wrong', wrong / nExp, T.wrong);
  for (const l of limbs) {
    if (l.n < 4) continue;
    max(`sd:${l.limb}`, l.sd, T.sd);
    max(`mean:${l.limb}`, l.mean === null ? null : Math.abs(l.mean), T.mean);
  }
  // Only measured practice counts: a level about loudness never passes on a take without loudness data (a mic with
  // every peak the same) — it used to skip those rules and pass on timing alone.
  const velGoal = [goal.velCv, goal.balance, goal.levels, goal.accentGap, goal.tapCv, goal.accentPos, goal.ghost, goal.ratio].some((x) => x !== undefined);
  if (velGoal && !velData && hits.length) rules.push({ id: 'noVel', amt: 9 });
  if (goal.velCv !== undefined) max('velCv', velCv, goal.velCv);
  if (goal.balance !== undefined) max('balance', balance, goal.balance);
  if (goal.levels !== undefined) min('levels', levels, goal.levels);
  if (goal.accentGap !== undefined) min('accentGap', accentGap, goal.accentGap);
  if (goal.tapCv !== undefined) max('tapCv', tapCv, goal.tapCv);
  if (goal.accentPos !== undefined) min('accentPos', accentPos, goal.accentPos);
  if (goal.ghost !== undefined) min('ghost', ghost, goal.ghost);
  if (goal.ratio !== undefined) min('ratio', ratio, 0.85);
  if (goal.hat) {
    min('hatOpen', hatOpen, 0.9);
    min('hatClosed', hatClosed, 0.9);
  }
  if (goal.landing) for (const [k, x] of landing.entries()) rules.push({ id: `landing:${k}`, amt: x === null ? 9 : Math.abs(x) > goal.landing.ms ? (Math.abs(x) - goal.landing.ms) / goal.landing.ms : 0 });
  if (goal.gapMs !== undefined) max('gap', gapMean === null ? null : Math.abs(gapMean), goal.gapMs);
  if (goal.flam !== undefined && !mic) {
    // Only measured practice counts: no grace-note stroke found at all is a miss, not a skipped rule.
    rules.push({ id: 'flam', amt: flam === null ? 9 : flam < goal.flam ? (goal.flam - flam) / goal.flam : 0 });
    max('flamSd', flamSd, 8);
  }
  if (goal.swing) {
    const sw = goal.swing;
    rules.push({ id: 'swing', amt: swing === null ? 9 : swing < sw.lo ? (sw.lo - swing) / 0.1 : swing > sw.hi ? (swing - sw.hi) / 0.1 : 0 });
    max('swingSd', swingSd, 0.07);
  }
  const missed = rules.filter((r) => r.amt > 0);
  const verdict: Verdict = !hits.length ? 'not' : !missed.length ? 'clean' : missed.length === 1 && missed[0].amt < 0.25 ? 'almost' : 'not';

  const dm: DrumMetrics = { limbs, voices, hitRate, wrongVoice: wrong / nExp, extra, windowMs: Math.round(W), velCv, balance, levels, accentGap, tapCv, accentPos, ghost, ratio, hatOpen, hatClosed, landing, gapMean, flam, flamGap, flamSd, swing, swingSd, missed: missed.sort((a, b) => b.amt - a.amt).map((r) => r.id) };
  return {
    bpm,
    nps: npsOf(drill, bpm),
    accuracy: hitRate,
    wrong,
    missing: exp.length - mExp.size - wrongAt.size,
    timingMean: mean(devs),
    timingSD: sdOf(devs),
    cvR: cvHand('R'),
    cvL: cvHand('L'),
    handsMean: null,
    handsAbs: null,
    chordSpread: null,
    velSD: velData ? sdOf(vels) : null,
    velMean: velData ? mean(vels) : null,
    bandHit: levels ?? ghost,
    slope: null,
    r2: null,
    accentGap: accentGap === null ? null : accentGap * span,
    kot: null,
    kdr: null,
    hesitations: 0,
    glitches: [],
    chordToneOnBeats: null,
    voiceLeading: null,
    perNote,
    verdict,
    why: drumWhy(dm, verdict),
    drum: dm,
  };
}

const LIMB_NAME: Record<Limb, { en: string; he: string }> = { RH: { en: 'right hand', he: 'יד ימין' }, LH: { en: 'left hand', he: 'יד שמאל' }, RF: { en: 'kick foot', he: 'רגל הקיק' }, LF: { en: 'hi-hat foot', he: 'רגל ההיי־האט' } };
const ms = (x: number) => `${Math.round(Math.abs(x))}`;

/** The one-line reason (compact feedback rule): the worst rule missed, or what was good. */
export function drumWhy(d: DrumMetrics, v: Verdict): { en: string; he: string } {
  const top = d.missed[0];
  if (v === 'clean' || !top) {
    const sds = d.limbs.map((l) => l.sd).filter((x): x is number => x !== null);
    const w = sds.length ? Math.round(Math.max(...sds)) : null;
    return w !== null ? { en: `Clean — every limb within ±${w} ms.`, he: `נקי — כל איבר בתוך ±${w} מ״ש.` } : { en: 'Clean.', he: 'נקי.' };
  }
  const [id, arg] = top.split(':');
  const limb = d.limbs.find((l) => l.limb === arg);
  // The voice whose mean is furthest off, for "kick 14 ms late".
  const ofLimb = (v: DrumVoice) => (arg === 'RF' ? v === 'kick' : arg === 'LF' ? v === 'hhPedal' : v !== 'kick' && v !== 'hhPedal');
  const worstVoice = [...d.voices].filter((x) => x.mean !== null && x.n >= 2 && (!arg || ofLimb(x.voice))).sort((a, b) => Math.abs(b.mean!) - Math.abs(a.mean!))[0];
  switch (id) {
    case 'hit':
      return { en: `${Math.round(d.hitRate * 100)} % of the hits in time (±${d.windowMs} ms).`, he: `${Math.round(d.hitRate * 100)}% מהמכות בזמן (±${d.windowMs} מ״ש).` };
    case 'wrong':
      return { en: `${Math.round(d.wrongVoice * 100)} % on the wrong drum.`, he: `${Math.round(d.wrongVoice * 100)}% על התוף הלא נכון.` };
    case 'mean': {
      const vName = worstVoice ? VOICE_NAME[worstVoice.voice] : null;
      const m = worstVoice?.mean ?? limb?.mean ?? 0;
      const who = vName ?? (limb ? LIMB_NAME[limb.limb] : { en: 'You', he: 'אתם' });
      return m > 0 ? { en: `${who.en} ${ms(m)} ms late.`, he: `${who.he} מאחר ב-${ms(m)} מ״ש.` } : { en: `${who.en} ${ms(m)} ms early.`, he: `${who.he} ממהר ב-${ms(m)} מ״ש.` };
    }
    case 'sd':
      return limb ? { en: `${LIMB_NAME[limb.limb].en} uneven (±${Math.round(limb.sd ?? 0)} ms).`, he: `${LIMB_NAME[limb.limb].he} לא אחידה (±${Math.round(limb.sd ?? 0)} מ״ש).` } : { en: 'Uneven timing.', he: 'תזמון לא אחיד.' };
    case 'noVel':
      return { en: 'No loudness measured — raise the mic level.', he: 'לא נמדדה עוצמה — הגבירו את המיקרופון.' };
    case 'velCv':
      return { en: 'Strokes not even in loudness.', he: 'המכות לא שוות בעוצמה.' };
    case 'balance':
      return { en: 'One hand louder than the other.', he: 'יד אחת חזקה מהשנייה.' };
    case 'levels':
      return { en: 'p, mf and f not apart enough.', he: 'p, mf ו-f לא מספיק שונים.' };
    case 'accentGap':
      return { en: 'Accents too close to the taps.', he: 'ההדגשות קרובות מדי לנקישות.' };
    case 'tapCv':
      return { en: 'Taps not even.', he: 'הנקישות לא אחידות.' };
    case 'accentPos':
      return { en: 'Accents on the wrong notes.', he: 'הדגשות על התווים הלא נכונים.' };
    case 'ghost':
      return { en: 'Ghost notes too loud.', he: 'תווי הרפאים חזקים מדי.' };
    case 'ratio':
      return { en: 'Second stroke of the doubles too weak.', he: 'המכה השנייה בכפולות חלשה מדי.' };
    case 'hatOpen':
      return { en: 'Open the hi-hat on the marked notes.', he: 'לפתוח את ההיי־האט בתווים המסומנים.' };
    case 'hatClosed':
      return { en: 'Hi-hat open where it should be closed.', he: 'ההיי־האט פתוח איפה שהוא צריך להיות סגור.' };
    case 'landing': {
      const x = d.landing[Number(arg)];
      return x === null ? { en: 'No crash + kick on the 1 after the fill.', he: 'אין קראש + קיק על ה-1 אחרי המעבר.' } : { en: `Landing on 1: ${ms(x)} ms ${x > 0 ? 'late' : 'early'}.`, he: `הנחיתה על 1: ${x > 0 ? 'מאחרת' : 'ממהרת'} ב-${ms(x)} מ״ש.` };
    }
    case 'flam': {
      const g = d.flamGap;
      if (g === null || g === undefined) return { en: 'Grace note missing or flat — play it just before the main stroke.', he: 'תו החן חסר או שטוח — נגנו אותו רגע לפני המכה.' };
      return g > 40 ? { en: `Grace note too early (${ms(g)} ms) — closer, 15–40 ms.`, he: `תו החן מוקדם מדי (${ms(g)} מ״ש) — קרוב יותר, 15–40 מ״ש.` } : g < 15 ? { en: `Flams too flat (${ms(g)} ms) — 15–40 ms apart.`, he: `הפלאמים שטוחים מדי (${ms(g)} מ״ש) — 15–40 מ״ש ביניהם.` } : { en: 'Grace note as loud as the main stroke — softer, lower.', he: 'תו החן חזק כמו המכה — רך ונמוך יותר.' };
    }
    case 'flamSd':
      return { en: `Flam spacing uneven (±${ms(d.flamSd ?? 0)} ms).`, he: `מרווח הפלאמים לא אחיד (±${ms(d.flamSd ?? 0)} מ״ש).` };
    case 'swing': {
      const x = d.swing;
      if (x === null || x === undefined) return { en: 'No swung skip notes measured.', he: 'לא נמדדו תווי דילוג בסווינג.' };
      return x < 0.6 ? { en: `Swing too straight (${Math.round(x * 100)} %) — lean the skip note later.`, he: `הסווינג ישר מדי (${Math.round(x * 100)}%) — אחרו את תו הדילוג.` } : { en: `Swing too dotted (${Math.round(x * 100)} %) — skip note earlier.`, he: `הסווינג מנוקד מדי (${Math.round(x * 100)}%) — הקדימו את תו הדילוג.` };
    }
    case 'swingSd':
      return { en: 'Swing feel not steady from beat to beat.', he: 'תחושת הסווינג לא יציבה בין הפעמות.' };
    case 'gap':
      return { en: `Without the click you drift ${ms(d.gapMean ?? 0)} ms ${(d.gapMean ?? 0) > 0 ? 'late' : 'early'}.`, he: `בלי הקליק אתם ${(d.gapMean ?? 0) > 0 ? 'נגררים' : 'ממהרים'} ב-${ms(d.gapMean ?? 0)} מ״ש.` };
    default:
      return { en: 'Not yet.', he: 'עוד לא.' };
  }
}

/** The per-limb feedback line (§6 rank 3): "Kick 14 ms late · hi-hat even · 2 wrong drum". */
export function drumLimbLine(d: DrumMetrics, nWrong: number, lang: 'en' | 'he'): string {
  const parts = d.voices
    .filter((v) => v.mean !== null && v.n >= 3)
    .map((v) => {
      const name = VOICE_NAME[v.voice][lang];
      const m = v.mean!;
      if (Math.abs(m) < 8) return lang === 'he' ? `${name} בזמן` : `${name} on time`;
      return lang === 'he' ? `${name} ${m > 0 ? 'מאחר' : 'ממהר'} ${ms(m)}` : `${name} ${ms(m)} ms ${m > 0 ? 'late' : 'early'}`;
    });
  if (nWrong) parts.push(lang === 'he' ? `${nWrong} על תוף אחר` : `${nWrong} wrong drum`);
  return parts.join(' · ');
}
