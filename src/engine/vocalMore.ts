// The further held and phrase items of the voice course's families (VOICE_CURRICULUM F1–F5, F12, F2 L4–L5):
// breath plans, fine tuning into a drone, the tonic after a phrase, the register break detector, terraced dynamics,
// accents, phrase arcs, jazz vibrato and inflections. Pure; every metric is a function of YIN frames.
//
// Honest limits: loudness is only RELATIVE inside one take (the phone must stay still); a "breath" is inferred from
// 250 ms or more without voice; register *mode* (chest, mix, head) is never judged — only a break in the sound.

import type { NoteEvent } from './lesson';
import type { SungFrame } from './sing';
import { hzToMidi, midiToHz } from './pitch';
import { gradeMicro, synthDetached } from './voiceP2';
import { bandScore, finish, holdMetrics, inBandScore, M, melodyMetrics, reachScore, UNCLEAR, gradeMelody, type MetricScore, type TakeGrade, type VocalItem, type VocalKind, type VoiceRange, itemTargets, synthHold, synthMelody, gradeHold } from './vocal';

export const MORE_KINDS: VocalKind[] = ['breath-hold', 'breath-phrase', 'breath-plan', 'fine-tune', 'drift-phrase', 'siren', 'terraced-scale', 'edge', 'terraced', 'accents', 'arc', 'vibrato-jazz', 'vibrato-widen', 'inflect', 'micro'];

const voiced = (f: SungFrame) => !!f.hz && f.confidence >= 0.8 && f.hz > 55 && f.hz < 1400;
const db = (r: number) => 20 * Math.log10(Math.max(1e-5, r));
const fold = (c: number) => ((((c + 600) % 1200) + 1200) % 1200) - 600;
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[s.length >> 1];
};

/** Voiceless gaps (s) of at least `min` between the first and the last voiced frame: [start, end] each. */
export function gapsOf(frames: SungFrame[], min = 0.25): [number, number][] {
  const vs = frames.filter(voiced);
  const out: [number, number][] = [];
  for (let i = 1; i < vs.length; i++) if (vs[i].t - vs[i - 1].t >= min) out.push([vs[i - 1].t, vs[i].t]);
  return out;
}

/**
 * Register breaks in a siren (F3): a pitch jump of more than 150 ¢ between frames 40 ms or less apart, a voicing
 * dropout of 40–250 ms inside the glide, or a loudness step of more than 6 dB inside 40 ms. Robust for clear breaks;
 * a subtle one can be missed (so the verdict is "smooth / bumpy / broke", never a register name).
 */
export function breakOf(frames: SungFrame[], o: { maxStep?: number; levels?: boolean } = {}): { breaks: number; at: number[]; spanSemis: number } {
  // A scale moves in steps on purpose: only a jump well beyond its largest step is a crack (and loudness steps are wanted).
  const jumpMin = (o.maxStep ?? 50) + 100;
  const vs = frames.filter(voiced);
  const at: number[] = [];
  for (let i = 1; i < vs.length; i++) {
    const dt = vs[i].t - vs[i - 1].t;
    const jump = Math.abs(1200 * Math.log2(vs[i].hz! / vs[i - 1].hz!));
    const step = Math.abs(db(vs[i].rms) - db(vs[i - 1].rms));
    if ((dt <= 0.045 && jump > jumpMin && jump < 1100) || (dt > 0.04 && dt < 0.25) || (o.levels !== false && dt <= 0.045 && step > 6)) {
      if (!at.length || vs[i].t - at[at.length - 1] > 0.15) at.push(vs[i].t);
    }
  }
  const ms = vs.map((f) => hzToMidi(f.hz!)).sort((a, b) => a - b);
  const span = ms.length > 10 ? ms[Math.floor(ms.length * 0.97)] - ms[Math.floor(ms.length * 0.03)] : 0;
  return { breaks: at.length, at, spanSemis: Math.round(span * 10) / 10 };
}

/** Per matched note of a phrase: its loudness (median dB of its frames), or null. */
function noteDbs(frames: SungFrame[], targets: number[]): (number | null)[] {
  const m = melodyMetrics(frames, targets);
  return m.notes.map((n, i) => {
    if (n.start === null) return null;
    const next = m.notes.slice(i + 1).find((x) => x.start !== null)?.start ?? Infinity;
    const xs = frames.filter((f) => f.t >= n.start! + 0.05 && f.t < next - 0.03 && voiced(f)).map((f) => db(f.rms));
    return xs.length >= 3 ? median(xs) : null;
  });
}

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  if (n < 3) return 0;
  const ma = a.reduce((s, x) => s + x, 0) / n;
  const mb = b.reduce((s, x) => s + x, 0) / n;
  let num = 0;
  let da = 0;
  let dbb = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    dbb += (b[i] - mb) ** 2;
  }
  return da && dbb ? num / Math.sqrt(da * dbb) : 0;
}

/** Grade a further kind (the caller sends the others to gradeTake). */
export function gradeMore(item: VocalItem, frames: SungFrame[], range: VoiceRange): TakeGrade {
  const tg = itemTargets(item, range);
  switch (item.kind) {
    case 'breath-hold': {
      const h = holdMetrics(frames, tg[0]);
      if (h.unclear) return { ...UNCLEAR, hold: h };
      const vs = frames.filter(voiced);
      const tEnd = vs[vs.length - 1].t;
      const end = holdMetrics(frames.filter((f) => f.t >= tEnd - h.voicedSec * (item.more?.finalShare ?? 0.25)), tg[0]);
      return finish(
        [
          M('duration', h.bestStretchSec, 's', reachScore(h.bestStretchSec, item.seconds * 0.9), 2),
          M('intonation', h.intonation, '¢', bandScore(h.intonation, [10, 20, 35]), 1.5),
          M('stability', end.unclear ? 99 : end.stability, '¢', end.unclear ? 0 : bandScore(end.stability, [6, 12, 20]), 2),
          M('drift', end.unclear ? 99 : end.drift, '¢/s', end.unclear ? 0 : bandScore(end.drift, [3, 6, 10]), 2),
        ],
        { hold: h },
      );
    }
    case 'breath-phrase':
    case 'breath-plan': {
      const g = gradeMelody({ ...item, kind: 'melody' }, frames, tg);
      if (g.unclear || !g.melody) return g;
      const m = g.melody;
      const first = m.notes.find((n) => n.start !== null)?.start ?? 0;
      const lastN = [...m.notes].reverse().find((n) => n.start !== null);
      const gaps = gapsOf(frames.filter((f) => f.t >= first && f.t <= (lastN?.start ?? 0) + 0.2));
      const out: MetricScore[] = g.metrics.filter((x) => x.key === 'hit' || x.key === 'intonation');
      if (item.kind === 'breath-plan') {
        const marks = item.more?.breathAfter ?? [];
        const starts = m.notes.map((n) => n.start);
        const after = (t: number) => {
          let k = -1;
          starts.forEach((s, i) => s !== null && s < t && (k = i));
          return k;
        };
        const gapAt = gaps.map(([a]) => after(a + 0.01));
        const right = marks.filter((k) => gapAt.includes(k)).length;
        const extra = gapAt.filter((k) => !marks.includes(k)).length;
        const s = marks.length ? right / (marks.length + extra) : 1;
        out.push(M('breath', s * 100, '%', s, 3));
      } else {
        out.push(M('breath', gaps.length, '%', gaps.length === 0 ? 1 : gaps.length === 1 ? 0.4 : 0, 3));
        if (lastN && lastN.cents !== null) out.push(M('landing', lastN.cents, '¢', bandScore(lastN.cents, [10, 20, 35]), 1.5));
        if (item.curve === 'decresc') {
          const ds = frames.filter(voiced);
          const n = ds.length;
          const a = median(ds.slice(0, Math.floor(n / 5)).map((f) => db(f.rms)));
          const b = median(ds.slice(Math.floor((n * 4) / 5)).map((f) => db(f.rms)));
          out.push(M('curve', a - b, 'dB', reachScore(a - b, 6), 2));
        }
      }
      const r = finish(out, { melody: m });
      return { ...r, score: Math.round(r.score * (0.4 + 0.6 * m.hit) * 1000) / 1000 };
    }
    case 'fine-tune': {
      const h = holdMetrics(frames, tg[0]);
      if (h.unclear) return { ...UNCLEAR, hold: h };
      // Time until the pitch stays within ±10 ¢ for 300 ms (a beat-free unison with the drone).
      const tr = frames.filter(voiced).map((f) => ({ t: f.t, c: fold((hzToMidi(f.hz!) - tg[0]) * 100) }));
      let settle = 9;
      for (let i = 0; i < tr.length; i++) {
        let j = i;
        while (j < tr.length && Math.abs(tr[j].c) <= 12) j++;
        if (j > i && tr[j - 1].t - tr[i].t >= 0.3) {
          settle = tr[i].t - tr[0].t;
          break;
        }
        i = j;
      }
      return finish(
        [
          M('settle', settle * 1000, 'ms', bandScore(settle * 1000, [400, 1000, 1600]), 2),
          M('intonation', h.intonation, '¢', bandScore(h.intonation, [5, 10, 20]), 3),
          M('stability', h.stability, '¢', bandScore(h.stability, [6, 12, 20]), 1),
        ],
        { hold: h },
      );
    }
    case 'drift-phrase': {
      const g = gradeMelody({ ...item, kind: 'melody' }, frames, tg);
      if (g.unclear || !g.melody) return g;
      const ns = g.melody.notes;
      const a = ns[0].cents;
      const b = ns[ns.length - 1].cents;
      const d = a !== null && b !== null ? b - a : 99;
      const r = finish([...g.metrics.filter((x) => x.key === 'hit' || x.key === 'intonation'), M('tuneDrift', d, '¢', bandScore(d, [10, 20, 35]), 3)], { melody: g.melody });
      return { ...r, score: Math.round(r.score * (0.4 + 0.6 * g.melody.hit) * 1000) / 1000 };
    }
    case 'siren': {
      const b = breakOf(frames);
      if (frames.filter(voiced).length < 30) return UNCLEAR;
      const want = Math.abs(tg[1] - tg[0]);
      return finish(
        [
          M('break', b.breaks, '%', b.breaks === 0 ? 1 : b.breaks === 1 ? 0.4 : 0, 3),
          M('coverage', (b.spanSemis / Math.max(1, want)) * 100, '%', reachScore(b.spanSemis, want * 0.8), 2),
        ],
        {},
      );
    }
    case 'terraced-scale': {
      const g = gradeMelody({ ...item, kind: 'melody' }, frames, tg);
      if (g.unclear || !g.melody) return g;
      const dbs = noteDbs(frames, tg);
      const per = Math.round(tg.length / (item.more?.reps ?? 3));
      const avg = (xs: (number | null)[]) => {
        const ys = xs.filter((x): x is number => x !== null);
        return ys.length ? ys.reduce((s, x) => s + x, 0) / ys.length : null;
      };
      const soft = avg(dbs.slice(0, per));
      const loud = avg(dbs.slice(-per));
      const diff = soft !== null && loud !== null ? loud - soft : 0;
      const br = breakOf(frames, { maxStep: 200, levels: false });
      const r = finish([...g.metrics.filter((x) => x.key === 'hit'), M('curve', diff, 'dB', reachScore(diff, 6), 2.5), M('break', br.breaks, '%', br.breaks === 0 ? 1 : br.breaks === 1 ? 0.5 : 0.1, 1.5)], { melody: g.melody });
      return { ...r, score: Math.round(r.score * (0.4 + 0.6 * g.melody.hit) * 1000) / 1000 };
    }
    case 'edge': {
      const h = holdMetrics(frames, tg[0]);
      if (h.unclear) return { ...UNCLEAR, hold: h };
      return finish([M('duration', h.bestStretchSec, 's', reachScore(h.bestStretchSec, item.seconds * 0.9), 3), M('intonation', h.intonation, '¢', bandScore(h.intonation, [10, 25, 40]), 2)], { hold: h });
    }
    case 'terraced': {
      const g = gradeMelody({ ...item, kind: 'melody' }, frames, tg);
      if (g.unclear || !g.melody) return g;
      const d = noteDbs(frames, tg);
      const steps = d.slice(1).map((x, i) => (x !== null && d[i] !== null ? x - d[i]! : 0));
      const least = steps.length ? Math.min(...steps) : 0;
      const r = finish([...g.metrics.filter((x) => x.key === 'hit'), M('intonation', g.melody.intonation, '¢', bandScore(g.melody.intonation, [10, 20, 30]), 1.5), M('curve', least, 'dB', reachScore(least, 4), 3)], { melody: g.melody });
      return { ...r, score: Math.round(r.score * (0.4 + 0.6 * g.melody.hit) * 1000) / 1000 };
    }
    case 'accents':
    case 'arc': {
      const g = gradeMelody({ ...item, kind: 'melody' }, frames, tg);
      if (g.unclear || !g.melody) return g;
      const d = noteDbs(frames, tg);
      const out: MetricScore[] = g.metrics.filter((x) => x.key === 'hit');
      if (item.kind === 'accents') {
        const acc = item.more?.accents ?? [];
        let ok = 0;
        let n = 0;
        d.forEach((x, i) => {
          if (x === null) return;
          const nb = [d[i - 1], d[i + 1]].filter((y): y is number => y !== null && y !== undefined);
          if (!nb.length) return;
          const lift = x - nb.reduce((s, y) => s + y, 0) / nb.length;
          n++;
          if (acc[i] ? lift >= 4 : lift < 4) ok++;
        });
        const s = n ? ok / n : 0;
        out.push(M('accent', s * 100, '%', reachScore(s, 0.8), 3));
      } else {
        const lv = item.more?.levels ?? [];
        const pairs = d.map((x, i) => [x, lv[i]] as const).filter((p): p is readonly [number, number] => p[0] !== null && p[1] !== undefined);
        const r = pearson(pairs.map((p) => p[0]), pairs.map((p) => p[1]));
        out.push(M('arc', Math.round(r * 100), '%', reachScore(r, 0.6), 3));
      }
      const r = finish(out, { melody: g.melody });
      return { ...r, score: Math.round(r.score * (0.4 + 0.6 * g.melody.hit) * 1000) / 1000 };
    }
    case 'vibrato-jazz': {
      // Straight for two thirds of the note, then a narrow vibrato (15–40 ¢): the jazz singer's late vibrato.
      const cue = item.cueOn ?? item.seconds * 0.66;
      const h = holdMetrics(frames, tg[0]);
      if (h.unclear) return { ...UNCLEAR, hold: h };
      const vs = frames.filter(voiced);
      const t0 = vs[0].t;
      const late = holdMetrics(frames.filter((f) => f.t >= t0 + cue), tg[0]);
      const early = holdMetrics(frames.filter((f) => f.t < t0 + cue - 0.2), tg[0]);
      const onErr = h.vibratoOnSec === null ? 9 : Math.abs(h.vibratoOnSec - cue);
      return finish(
        [
          M('vibratoCue', onErr * 1000, 'ms', bandScore(onErr, [0.3, 0.6, 1.0]), 2),
          M('vibratoExtent', late.vibrato.extent, '¢', !late.unclear && late.vibrato.present ? inBandScore(late.vibrato.extent, [15, 40], 15) : 0, 2.5),
          M('straight', early.unclear ? 99 : early.stability, '¢', !early.unclear && !early.vibrato.present ? bandScore(early.stability, [6, 12, 20]) : 0, 2),
          M('intonation', h.intonation, '¢', bandScore(h.intonation, [10, 20, 35]), 1),
        ],
        { hold: h },
      );
    }
    case 'vibrato-widen': {
      const h = holdMetrics(frames, tg[0]);
      if (h.unclear || !h.halves) return { ...UNCLEAR, hold: h };
      const [a, b] = h.halves;
      const grow = a.present && b.present ? (b.extent - a.extent) / Math.max(1, a.extent) : 0;
      return finish(
        [
          M('shape', grow * 100, '%', reachScore(grow, 0.25), 3),
          M('vibratoRegularity', h.vibrato.regularity * 100, '%', h.vibrato.present ? bandScore(h.vibrato.regularity, [0.1, 0.2, 0.35]) : 0, 1.5),
          M('intonation', h.intonation, '¢', bandScore(h.intonation, [10, 20, 35]), 1),
        ],
        { hold: h },
      );
    }
    case 'micro':
      return gradeMicro(frames, tg);
    case 'inflect': {
      const shape = item.more?.shape ?? 'scoop';
      if (shape === 'ghost') {
        const g = gradeMelody({ ...item, kind: 'melody' }, frames, tg);
        if (g.unclear || !g.melody) return g;
        const d = noteDbs(frames, tg);
        const mid = Math.floor(tg.length / 2);
        const dip = d[mid] !== null && d[mid - 1] !== null && d[mid + 1] !== null ? (d[mid - 1]! + d[mid + 1]!) / 2 - d[mid]! : 0;
        const r = finish([...g.metrics.filter((x) => x.key === 'hit'), M('shape', dip, 'dB', reachScore(dip, 8), 3)], { melody: g.melody });
        return { ...r, score: Math.round(r.score * (0.4 + 0.6 * g.melody.hit) * 1000) / 1000 };
      }
      const vs = frames.filter(voiced).map((f) => ({ t: f.t, c: (hzToMidi(f.hz!) - tg[0]) * 100 }));
      if (vs.length < 20) return UNCLEAR;
      // Fold the octave on the steady middle of the note.
      const k = Math.round(median(vs.slice(Math.floor(vs.length / 3), Math.floor((2 * vs.length) / 3)).map((p) => p.c)) / 1200) * 1200;
      const cs = vs.map((p) => ({ t: p.t, c: p.c - k }));
      const body = median(cs.slice(Math.floor(cs.length / 3), Math.floor((2 * cs.length) / 3)).map((p) => p.c));
      let ok = 0;
      if (shape === 'scoop') {
        const start = median(cs.slice(0, 3).map((p) => p.c));
        const reach = cs.find((p) => Math.abs(p.c) <= 30);
        ok = (start <= -80 && start >= -260 ? 0.5 : 0) + (reach && reach.t - cs[0].t <= 0.2 ? 0.5 : 0);
      } else if (shape === 'fall') {
        const tEnd = cs[cs.length - 1].t;
        const end = Math.min(...cs.filter((p) => p.t >= tEnd - 0.3).map((p) => p.c));
        ok = end <= -300 ? 1 : end <= -150 ? 0.5 : 0;
      } else {
        // bend: from the minor third up to the major third — a glide, not a jump
        const start = median(cs.slice(0, 4).map((p) => p.c));
        const tEnd = cs[cs.length - 1].t;
        const end = median(cs.filter((p) => p.t >= tEnd - 0.3).map((p) => p.c));
        const jumps = cs.slice(1).filter((p, i) => Math.abs(p.c - cs[i].c) > 60).length;
        ok = (start <= -60 && start >= -150 ? 0.4 : 0) + (Math.abs(end) <= 30 ? 0.4 : 0) + (jumps === 0 ? 0.2 : 0);
      }
      return finish([M('shape', ok * 100, '%', ok, 3), M('intonation', body, '¢', bandScore(body, [15, 30, 50]), 1)], {});
    }
    default:
      return gradeHold(item, frames, tg[0]);
  }
}

/** What the app plays before a further kind (a phrase with its note lengths; a single note otherwise). */
export function moreReference(item: VocalItem, targets: number[]): { events: NoteEvent[]; length: number } | null {
  if (!MORE_KINDS.includes(item.kind)) return null;
  if (item.kind === 'siren') return { events: targets.map((m, i) => ({ midi: m, start: i * 0.9, duration: 0.85, velocity: 0.7 })), length: targets.length * 0.9 + 0.3 };
  if (targets.length > 1) {
    const secs = item.noteSecs ?? targets.map(() => 0.6);
    let at = 0;
    const events = targets.map((m, i) => {
      const d = Math.min(0.9, secs[i] ?? 0.6);
      const e = { midi: m, start: at, duration: d * 0.95, velocity: item.kind === 'terraced' || item.kind === 'arc' ? 0.45 + 0.2 * (item.more?.levels?.[i] ?? 1) : item.more?.accents?.[i] ? 0.9 : 0.6 };
      at += d;
      return e;
    });
    return { events, length: at + 0.4 };
  }
  return { events: [{ midi: targets[0], start: 0, duration: 1.4, velocity: 0.7 }], length: 1.6 };
}

/** A synthetic take for the simulator (screenshots, e2e): clean and in tune. */
export function simulateMore(item: VocalItem, targets: number[]): SungFrame[] | null {
  if (!MORE_KINDS.includes(item.kind)) return null;
  if (item.kind === 'siren') {
    const out: SungFrame[] = [];
    const [a, b] = targets;
    for (let i = 0; i <= 200; i++) {
      const p = i / 200;
      const m = p < 0.5 ? a + (b - a) * (p * 2) : b - (b - a) * ((p - 0.5) * 2);
      out.push({ t: 0.3 + i * 0.02, hz: midiToHz(m), confidence: 0.95, rms: 0.08 });
    }
    return out;
  }
  if (item.kind === 'micro') return synthDetached(targets, { noteSec: Math.max(0.45, (item.noteSecs?.[0] ?? 0.7) - 0.12) });
  if (item.kind === 'vibrato-jazz') return synthHold(targets[0], { seconds: item.seconds + 0.3, vibRate: 5.4, vibExtent: 24, vibFrom: (item.cueOn ?? item.seconds * 0.66) + 0.05 });
  if (item.kind === 'vibrato-widen') {
    const n = Math.round((item.seconds + 0.3) * 50);
    return Array.from({ length: n }, (_, i) => {
      const t = i / 50;
      const ext = 20 + (22 * i) / n;
      return { t: t + 0.3, hz: midiToHz(targets[0] + (ext * Math.sin(2 * Math.PI * 5.6 * t)) / 100), confidence: 0.95, rms: 0.08 };
    });
  }
  if (item.kind === 'inflect' && item.more?.shape !== 'ghost') {
    const shape = item.more?.shape;
    const n = Math.round(item.seconds * 50);
    return Array.from({ length: n }, (_, i) => {
      const t = i / 50;
      let c = 0;
      if (shape === 'scoop') c = t < 0.1 ? -150 + 1500 * t : 0;
      else if (shape === 'bend') c = t < 0.4 ? -100 + 250 * t : 0;
      else if (shape === 'fall') c = t > item.seconds - 0.35 ? -1400 * (t - (item.seconds - 0.35)) : 0;
      return { t: t + 0.3, hz: midiToHz(targets[0] + c / 100), confidence: 0.95, rms: 0.08 };
    });
  }
  if (targets.length === 1) return synthHold(targets[0], { seconds: item.seconds + 0.3, jitter: 2 });
  const secs = item.noteSecs ?? targets.map(() => 0.6);
  const levels = item.more?.levels;
  const accents = item.more?.accents;
  let t = 0.3;
  const out: SungFrame[] = [];
  targets.forEach((m, i) => {
    const n = Math.round((secs[i] ?? 0.6) * 50);
    const reps = item.more?.reps;
    const rms = reps ? 0.03 * 2 ** Math.floor((i * reps) / targets.length) : levels ? 0.02 * 10 ** ((levels[i] ?? 1) * 0.3) : accents?.[i] ? 0.2 : item.more?.shape === 'ghost' && i === Math.floor(targets.length / 2) ? 0.02 : 0.08;
    for (let k = 0; k < n; k++) {
      out.push({ t, hz: midiToHz(m), confidence: 0.95, rms });
      t += 0.02;
    }
    if (item.more?.breathAfter?.includes(i)) for (let k = 0; k < 15; k++) (out.push({ t, hz: null, confidence: 0, rms: 0.001 }), (t += 0.02));
  });
  return out.length ? out : synthMelody(targets);
}
