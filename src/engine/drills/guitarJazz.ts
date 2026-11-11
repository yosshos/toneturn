// Jazz guitar for the niche (GUITAR_DEEPENING §4.2): g-jazz levels 8–12 (comping on standards, voice leading by ear
// and by hand, chord melody, rhythm changes and tritone substitutions, solo-guitar texture) and the new g-harris family
// (Barry Harris on the neck, built on src/engine/barry.ts). Chord charts are chords only (STANDARD_CHANGES, legal);
// melodies are our own, generated over the changes. Pure and deterministic.
//
// Imports guitar.ts helpers only inside functions (guitar.ts ↔ guitarJazz.ts load order).

import type { Drill, DrillSpec } from './types';
import { noteAt, type Tuning } from '../fretboard';
import { bassWalk, drop2Voicings, finish, mod, nearestVoicing, place, rng, t, upDown, NAMES, type Ev, type GN, type T2 } from './guitar';
import { STANDARD_CHANGES } from '../standards';
import { parseChart, type ChartChordEv } from '../charts';
import { barryLine, DIM7, moveDim, pivot, ruleFor } from '../barry';

type P = { s: number; f: number };
const strum = (ps: P[]): GN[] => ps.map((x) => ({ ...x, tech: 'strum-down' as const, stroke: 'D' as const }));
const pcOf = (tu: Tuning, p: P): number => mod(noteAt(tu, p.s, p.f), 12);
const topOf = (tu: Tuning, v: P[]): number => Math.max(...v.map((p) => noteAt(tu, p.s, p.f)));
const lowFretOf = (v: P[]): number => Math.min(...v.filter((p) => p.f > 0).map((p) => p.f).concat([99]));

/** The 3rd and 7th (or 6th for a diminished 7th) of a chart chord, as intervals; its four chord tones. */
function guideOf(c: Pick<ChartChordEv, 'iv'>): { third: number; seventh: number; four: number[] } {
  const has = (x: number) => c.iv.some((i) => mod(i, 12) === x);
  const third = has(3) && !has(4) ? 3 : 4;
  const seventh = has(10) ? 10 : has(11) ? 11 : has(9) ? 9 : third === 3 ? 10 : 11;
  const fifth = has(6) && !has(7) ? 6 : has(8) && !has(7) ? 8 : 7;
  return { third, seventh, four: [0, third, fifth, seventh] };
}

/** A shell (root + 3rd + 7th) on strings 6-4-3 or 5-4-3, the root fret nearest `near` (frets 1–12). */
function shellAt(tu: Tuning, root: number, third: number, seventh: number, near: number): P[] {
  const opts: P[][] = [];
  for (const rs of [6, 5]) {
    for (let f = 1; f <= 12; f++) {
      if (mod(noteAt(tu, rs, f) - root, 12) !== 0) continue;
      const R = noteAt(tu, rs, f);
      const hi = rs === 6 ? [R + seventh, R + 12 + third] : [R + third, R + seventh];
      const strs = rs === 6 ? [4, 3] : [4, 3];
      const ns = hi.map((m, k) => ({ s: strs[k], f: m - tu.open[strs[k] - 1] }));
      if (ns.some((x) => x.f < 0 || x.f > 15)) continue;
      const all = [{ s: rs, f }, ...ns];
      const fr = all.map((x) => x.f).filter((x) => x > 0);
      if (Math.max(...fr) - Math.min(...fr) > 4) continue;
      opts.push(all);
    }
  }
  return opts.reduce((a, b) => (Math.abs(b[0].f - near) < Math.abs(a[0].f - near) ? b : a));
}

/** A standard's first `bars` bars, moved by `key` semitones (chords only). */
function chartOf(id: string, key: number, bars = 8): { chords: ChartChordEv[]; name: string; syms: string[] } {
  const std = STANDARD_CHANGES.find((x) => x.id === id) ?? STANDARD_CHANGES[0];
  const p = parseChart(std.text);
  const chords = p.chords.filter((c) => c.bar < bars).map((c) => ({ ...c, root: mod(c.root + key, 12), bass: mod(c.bass + key, 12) }));
  const syms: string[] = [];
  for (let b = 0; b < bars; b++) {
    const inBar = chords.filter((c) => c.bar === b);
    syms.push(inBar.map((c) => NAMES[c.root] + symOf(c)).join(' ') || '%');
  }
  return { chords, name: std.name, syms };
}
function symOf(c: Pick<ChartChordEv, 'iv'>): string {
  const g = guideOf(c);
  const has = (x: number) => c.iv.some((i) => mod(i, 12) === x);
  if (g.third === 3 && has(6) && g.seventh === 9) return 'dim7';
  if (g.third === 3 && has(6)) return 'm7♭5';
  if (g.third === 3) return g.seventh === 11 ? 'm(maj7)' : 'm7';
  return g.seventh === 11 ? 'maj7' : g.seventh === 9 ? '6' : '7';
}

// ───────────────────────────── comp a whole standard (repertoire, P2) ─────────────────────────────

/**
 * The guitar repertoire's charts (GUITAR_DEEPENING P2): a drill that comps one standard's whole chart (chords only,
 * standards.ts) — the repertoire item opens it instead of a generic jazz level. Default feel per tune; the voicing and
 * rhythm are the option: option = index · 10 + voicing · 5 + rhythm.
 */
export const GUITAR_STD: { id: string; rhythm: GuitarStdRhythm; voicing: GuitarStdVoicing }[] = [
  { id: 'blues-basic', rhythm: 'shuffle', voicing: 'shell' },
  { id: 'minor-blues', rhythm: 'charleston', voicing: 'shell' },
  { id: 'two-five-keys', rhythm: 'four', voicing: 'shell' },
  { id: 'blues-f', rhythm: 'charleston', voicing: 'shell' },
  { id: 'autumn', rhythm: 'charleston', voicing: 'drop2' },
  { id: 'blue-bossa', rhythm: 'bossa', voicing: 'drop2' },
  { id: 'fly', rhythm: 'four', voicing: 'drop2' },
  { id: 'so-what', rhythm: 'charleston', voicing: 'drop2' },
  { id: 'a-train', rhythm: 'charleston', voicing: 'shell' },
  { id: 'rhythm-full', rhythm: 'four', voicing: 'shell' },
  { id: 'bird-blues', rhythm: 'charleston', voicing: 'drop2' },
  { id: 'giant-slow', rhythm: 'four', voicing: 'shell' },
];
/** Hebrew names of the charts (tune titles stay in Latin letters, as players say them). */
const STD_NAME_HE: Record<string, string> = {
  'blues-basic': 'בלוז 12 תיבות',
  'minor-blues': 'בלוז מינורי',
  'two-five-keys': 'ii–V–I בכל הסולמות',
  'blues-f': 'בלוז ג׳אז ב־F',
  'rhythm-full': 'ריתם צ׳יינג׳ס',
  'bird-blues': 'בלוז בירד',
  'giant-slow': 'Giant Steps (לאט)',
};
export type GuitarStdVoicing = 'shell' | 'drop2';
export type GuitarStdRhythm = 'charleston' | 'four' | 'anticip' | 'bossa' | 'shuffle';
const STD_VOICINGS: GuitarStdVoicing[] = ['shell', 'drop2'];
const STD_RHYTHMS: GuitarStdRhythm[] = ['charleston', 'four', 'anticip', 'bossa', 'shuffle'];
/** Comping hits per bar (beat, length). */
const STD_HITS: Record<GuitarStdRhythm, { en: string; he: string; hits: [number, number][] }> = {
  charleston: { en: 'Charleston', he: 'צ׳רלסטון', hits: [[0, 1.5], [1.5, 2.5]] },
  four: { en: 'four to the bar', he: 'ארבע לתיבה', hits: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  anticip: { en: 'anticipations', he: 'הקדמות', hits: [[0, 2], [3.5, 0.5]] },
  bossa: { en: 'bossa', he: 'בוסה', hits: [[0, 1.5], [1.5, 1], [3, 1]] },
  shuffle: { en: 'shuffle on 2 and 4', he: 'שאפל על 2 ו-4', hits: [[1, 1], [3, 1]] },
};
/** The option of a standard in a voicing and rhythm (null when the standard has no guitar chart). */
export function guitarStdOption(id: string, voicing?: GuitarStdVoicing, rhythm?: GuitarStdRhythm): number | null {
  const i = GUITAR_STD.findIndex((x) => x.id === id);
  if (i < 0) return null;
  return i * 10 + STD_VOICINGS.indexOf(voicing ?? GUITAR_STD[i].voicing) * 5 + STD_RHYTHMS.indexOf(rhythm ?? GUITAR_STD[i].rhythm);
}
export function decodeGuitarStd(op: number): { id: string; voicing: GuitarStdVoicing; rhythm: GuitarStdRhythm } {
  const i = Math.max(0, Math.floor(op / 10)) % GUITAR_STD.length;
  return { id: GUITAR_STD[i].id, voicing: STD_VOICINGS[Math.floor((op % 10) / 5)] ?? 'shell', rhythm: STD_RHYTHMS[op % 5] ?? 'charleston' };
}
/** Practice tempo (start, target) of a standard's chart: about 60 % of its chart tempo up to the tempo (cap 180). */
export function guitarStdTempo(id: string): [number, number] {
  const bpm = STANDARD_CHANGES.find((x) => x.id === id)?.bpm ?? 120;
  const target = Math.min(180, bpm);
  return [Math.max(60, Math.round((target * 0.6) / 5) * 5), target];
}

function compChart(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const { id, voicing, rhythm } = decodeGuitarStd(s.option ?? 0);
  const std = STANDARD_CHANGES.find((x) => x.id === id) ?? STANDARD_CHANGES[0];
  const p = parseChart(std.text);
  const bars = Math.max(1, ...p.chords.map((c) => c.bar + 1));
  const ch = chartOf(id, key, bars);
  const rh = STD_HITS[rhythm];
  const evs: Ev[] = [];
  let near = 5;
  let top = -1;
  for (const c of ch.chords) {
    // A plain triad in the chart (Bb, Eb) is comped as a 6th chord, as jazz guitarists do — never an added maj7.
    const g0 = guideOf(c);
    const plain = !c.iv.some((i) => [9, 10, 11].includes(mod(i, 12)));
    const g = plain ? { ...g0, seventh: 9, four: [0, g0.third, g0.four[2], 9] } : g0;
    let v: P[];
    if (voicing === 'drop2') {
      const cands = drop2Voicings(tu, g.four.map((x) => c.root + x), [4, 3, 2, 1], 13);
      // Voice-led: the top voice moves as little as it can from chord to chord.
      v = top < 0 || !cands.length ? nearestVoicing(cands, near) : cands.reduce((a, b) => (Math.abs(topOf(tu, b) - top) + 0.3 * Math.abs(lowFretOf(b) - near) < Math.abs(topOf(tu, a) - top) + 0.3 * Math.abs(lowFretOf(a) - near) ? b : a));
      top = topOf(tu, v);
    } else v = shellAt(tu, c.root, g.third, g.seventh, near);
    near = lowFretOf(v);
    const start = c.bar * 4 + c.at;
    for (const [b, len] of rh.hits) {
      if (b >= c.at + c.beats - 1e-6 || b < c.at - 1e-6) continue;
      const bt = c.bar * 4 + b;
      evs.push({ beat: bt, dur: Math.min(len, start + c.beats - bt), notes: strum(v) });
    }
    if (!evs.some((e) => e.beat >= start - 1e-6 && e.beat < start + c.beats - 1e-6)) evs.push({ beat: start, dur: Math.min(c.beats, 1.5), notes: strum(v) });
  }
  const vEn = voicing === 'drop2' ? 'drop-2, voice-led' : 'shells';
  const vHe = voicing === 'drop2' ? 'דרופ 2, הובלת קולות' : 'קונכיות';
  const d = finish(s, tu, evs, { title: t(`${std.name}: the whole chart (${bars} bars), ${vEn}, ${rh.en} · ${NAMES[mod(key, 12)]}`, `${STD_NAME_HE[id] ?? std.name}: כל דף האקורדים (${bars} תיבות), ${vHe}, ${rh.he} · ${NAMES[mod(key, 12)]}`), bpm: guitarStdTempo(id)[0], evenness: false, keySig: 'C' });
  const band = rhythm === 'bossa' || std.style === 'bossa' ? 'bossa' : rhythm === 'shuffle' ? 'shuffle' : 'swing';
  return { ...d, chart: ch.syms, drums: { groove: band }, band: { style: band, bass: true } };
}

/** Standards for the comping levels (ids in standards.ts; chords only). */
export const JAZZ_STANDARDS = ['autumn', 'blue-bossa', 'tune-up', 'satin', 'fly', 'stella'];
const exists = (id: string) => STANDARD_CHANGES.some((x) => x.id === id);

/** Comping rhythms per bar (beat, length): Charleston, Freddie Green four, anticipations. */
const COMP_RHYTHMS: { en: string; he: string; hits: [number, number][] }[] = [
  { en: 'Charleston', he: 'צ׳רלסטון', hits: [[0, 1.5], [1.5, 2.5]] },
  { en: 'four to the bar', he: 'ארבע לתיבה', hits: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  { en: 'anticipations', he: 'הקדמות', hits: [[0, 2], [3.5, 0.5]] },
];

export function generateJazz2(s: DrillSpec, tu: Tuning): Drill | null {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const evs: Ev[] = [];
  switch (s.kind) {
    case 'comp-chart':
      return compChart(s, tu);
    case 'comp-std': {
      // L8: shells (even options) or drop-2 (odd) through a standard's first 8 bars, in one comping rhythm, with the band.
      const ids = JAZZ_STANDARDS.filter(exists);
      const ch = chartOf(ids[Math.floor(op / 2) % ids.length], key);
      const rh = COMP_RHYTHMS[(Math.floor(op / 2) + op) % COMP_RHYTHMS.length];
      const drop = op % 2 === 1;
      let near = 5;
      for (const c of ch.chords) {
        const g = guideOf(c);
        const v = drop ? nearestVoicing(drop2Voicings(tu, g.four.map((x) => c.root + x), [4, 3, 2, 1], 13), near) : shellAt(tu, c.root, g.third, g.seventh, near);
        near = lowFretOf(v);
        const start = c.bar * 4 + c.at;
        for (const [b, len] of rh.hits) {
          if (b >= c.at + c.beats - 1e-6 || b < c.at - 1e-6) continue;
          const bt = c.bar * 4 + b;
          evs.push({ beat: bt, dur: Math.min(len, start + c.beats - bt), notes: strum(v) });
        }
        if (!evs.some((e) => e.beat >= start - 1e-6 && e.beat < start + c.beats - 1e-6)) evs.push({ beat: start, dur: c.beats, notes: strum(v) });
      }
      const d = finish(s, tu, evs, { title: t(`Comping ${ch.name} (8 bars): ${drop ? 'drop-2' : 'shells'}, ${rh.en} · ${NAMES[key]}`, `ליווי ${ch.name} (8 תיבות): ${drop ? 'דרופ 2' : 'קונכיות'}, ${rh.he} · ${NAMES[key]}`), bpm: 100, evenness: false, keySig: 'C' });
      return { ...d, chart: ch.syms, drums: { groove: 'swing' }, band: { style: 'swing', bass: true } };
    }
    case 'vl-ear': {
      // L9: hear a ii–V–I (in a key the title doesn't name), then play its guide tones (3–7–3, half notes) and comp it
      // in drop-2 with the top voice moving by step.
      const rnd = rng(`g-jazz:vl:${key}:${op}`);
      const minor = op === 1;
      const prog: [number, number[]][] = minor ? [[2, [0, 3, 6, 10]], [7, [0, 4, 7, 10]], [0, [0, 3, 7, 10]]] : [[2, [0, 3, 7, 10]], [7, [0, 4, 7, 10]], [0, [0, 4, 7, 11]]];
      const call: NonNullable<Drill['listen']>['notes'] = [];
      prog.forEach(([d, iv], i) => {
        const R = 48 + mod(key + d, 12);
        call.push({ beat: i * 4, dur: i === 2 ? 2.8 : 3.8, midi: [R - 12, ...iv.slice(1).map((x) => R + x + (rnd() < 0.3 ? 12 : 0))], inst: 'piano' });
      });
      // Guide tones: the 3rd of ii → the 7th of V → the 3rd of I (and back by the nearest notes), in G3 … G4.
      let prev = 60;
      const guide: number[] = [];
      prog.forEach(([d, iv], i) => {
        const cands = (i === 1 ? [iv[3], iv[1]] : [iv[1], iv[3]]).map((x) => mod(key + d + x, 12));
        for (const pc of cands) {
          const m = [0, 1].map((k) => 55 + mod(pc - 55, 12) + 12 * k).reduce((a, b) => (Math.abs(b - prev) < Math.abs(a - prev) ? b : a));
          guide.push(m);
          prev = m;
        }
      });
      guide.forEach((m, i) => {
        const pl = place(tu, m, [3, 2, 4, 1], 1, 12) ?? place(tu, m, [5, 4, 3, 2, 1], 0, 15)!;
        evs.push({ beat: 12 + i * 2, dur: 2, notes: [{ ...pl, ct: true, stroke: 'D' }] });
      });
      // Drop-2 with the top voice by step: choose, chord by chord, the voicing whose top note is nearest the last.
      let top = -1;
      let near = 5;
      prog.forEach(([d, iv], i) => {
        const cands = drop2Voicings(tu, iv.map((x) => key + d + x), [4, 3, 2, 1], 13);
        const v = top < 0 ? nearestVoicing(cands, near) : cands.reduce((a, b) => (Math.abs(topOf(tu, b) - top) < Math.abs(topOf(tu, a) - top) ? b : a));
        top = topOf(tu, v);
        near = lowFretOf(v);
        evs.push({ beat: 24 + i * 4, dur: i === 2 ? 8 : 4, notes: strum(v) });
      });
      const d = finish(s, tu, evs, { title: t(`Voice leading by ear: guide tones, then drop-2 by step (${minor ? 'minor' : 'major'} ii–V–I)`, `הובלת קולות בשמיעה: צלילים מנחים, ואז דרופ 2 בצעדים (ii–V–I ${minor ? 'מינורי' : 'מז׳ורי'})`), bpm: 70, evenness: false, goal: { chordTonesOnBeats: true } });
      return { ...d, show: 'none', listen: { notes: call, windows: [[0, 11]], ask: t('Hear a ii–V–I — then play its guide tones (3–7–3), then comp it in drop-2, the top voice moving by step', 'שמעו ii–V–I — ואז נגנו את הצלילים המנחים (3–7–3), ואז לוו אותו בדרופ 2, הקול העליון בצעדים') } };
    }
    case 'chord-melody': {
      // L10: our own melody over ii–V–I–vi (two chords a bar), harmonised in drop-2 with the melody note on top.
      const rnd = rng(`g-jazz:cm:${key}:${op}`);
      const prog: [number, number[]][] = op % 2 === 0 ? [[2, [0, 3, 7, 10]], [7, [0, 4, 7, 10]], [0, [0, 4, 7, 11]], [9, [0, 3, 7, 10]]] : [[0, [0, 4, 7, 11]], [9, [0, 3, 7, 10]], [2, [0, 3, 7, 10]], [7, [0, 4, 7, 10]]];
      const strs = op >= 2 ? [5, 4, 3, 2] : [4, 3, 2, 1];
      let near = 6;
      let top = -1;
      const syms: string[] = [];
      for (let half = 0; half < 8; half++) {
        const [d, iv] = prog[half % 4];
        const pcs = iv.map((x) => key + d + x);
        const cands = drop2Voicings(tu, pcs, strs, 14);
        // The melody moves by step among chord tones: prefer a top note within 3 semitones of the last, never the same twice in a row.
        const pool = top < 0 ? [nearestVoicing(cands, near)] : cands.filter((v) => Math.abs(topOf(tu, v) - top) <= 4 && topOf(tu, v) !== top);
        const choice = (pool.length ? pool : cands).slice().sort((a, b) => Math.abs(topOf(tu, a) - top) - Math.abs(topOf(tu, b) - top) || lowFretOf(a) - lowFretOf(b));
        const v = choice[Math.min(choice.length - 1, Math.floor(rnd() * Math.min(2, choice.length)))];
        top = topOf(tu, v);
        near = lowFretOf(v);
        // The melody note first (the top voice, picked), the chord under it on the same beat.
        evs.push({ beat: half * 2, dur: 2, notes: v.map((x) => ({ ...x, stroke: 'D' as const, tech: 'strum-down' as const, ...(noteAt(tu, x.s, x.f) === top ? { acc: true } : {}) })) });
        if (half < 4) syms.push(NAMES[mod(key + d, 12)] + symOf({ iv }));
      }
      const d = finish(s, tu, evs, { title: t(`Chord melody: our melody on top, drop-2 on strings ${Math.min(...strs)}–${Math.max(...strs)} · ${NAMES[key]}`, `אקורד-מלודיה: המנגינה שלנו למעלה, דרופ 2 על מיתרים ${Math.min(...strs)}–${Math.max(...strs)} · ${NAMES[key]}`), bpm: 60, evenness: false });
      return { ...d, chart: [...syms, ...syms].reduce<string[]>((acc, x, i) => (i % 2 === 0 ? [...acc, x] : [...acc.slice(0, -1), `${acc[acc.length - 1]} ${x}`]), []) };
    }
    case 'rhythm-changes': {
      // L11: the A section of rhythm changes (I vi ii V ×2, then I I7 IV iv, iii VI ii V), two chords a bar, in shells
      // (op 0) or drop-3 (op 1); op 2–3: with tritone substitutions on every V (♭II7).
      const sub = op >= 2;
      const A: [number, number[]][] = [
        [0, [0, 4, 7, 11]], [9, [0, 3, 7, 10]], [2, [0, 3, 7, 10]], [7, [0, 4, 7, 10]],
        [4, [0, 3, 7, 10]], [9, [0, 4, 7, 10]], [2, [0, 3, 7, 10]], [7, [0, 4, 7, 10]],
        [0, [0, 4, 7, 11]], [0, [0, 4, 7, 10]], [5, [0, 4, 7, 11]], [5, [0, 3, 7, 10]],
        [4, [0, 3, 7, 10]], [9, [0, 4, 7, 10]], [2, [0, 3, 7, 10]], [7, [0, 4, 7, 10]],
      ];
      const chords = A.map(([d, iv]): [number, number[]] => (sub && iv[1] === 4 && iv[3] === 10 && d !== 0 ? [mod(d + 6, 12), iv] : [d, iv]));
      let near = 5;
      const syms: string[] = [];
      chords.forEach(([d, iv], i) => {
        const root = mod(key + d, 12);
        let v: P[];
        if (op % 2 === 1) {
          // Drop-3: root on 6 (R-7-3-5 on 6-4-3-2) or root on 5 (R-7-3-5 on 5-3-2-1), the nearest.
          const opts: P[][] = [];
          for (const rs of [6, 5]) for (let f = 1; f <= 12; f++) {
            if (mod(noteAt(tu, rs, f) - root, 12) !== 0) continue;
            const R = noteAt(tu, rs, f);
            const ms = [R, R + iv[3], R + 12 + iv[1], R + 12 + iv[2]];
            const ss = rs === 6 ? [6, 4, 3, 2] : [5, 3, 2, 1];
            const ps = ms.map((m, k) => ({ s: ss[k], f: m - tu.open[ss[k] - 1] }));
            const fr = ps.map((x) => x.f);
            if (Math.min(...fr) < 1 || Math.max(...fr) - Math.min(...fr) > 4) continue;
            opts.push(ps);
          }
          v = opts.reduce((a, b) => (Math.abs(b[0].f - near) < Math.abs(a[0].f - near) ? b : a));
        } else v = shellAt(tu, root, iv[1], iv[3], near);
        near = v[0].f;
        evs.push({ beat: i * 2, dur: 1, notes: strum(v) }, { beat: i * 2 + 1, dur: 1, notes: strum(v) });
        if (i % 2 === 1) syms.push(`${NAMES[mod(key + chords[i - 1][0], 12)]}${symOf({ iv: chords[i - 1][1] })} ${NAMES[root]}${symOf({ iv })}`);
      });
      const d = finish(s, tu, evs, { title: t(`Rhythm changes (A section)${sub ? ' with tritone substitutions' : ''}: ${op % 2 ? 'drop-3' : 'shells'} · ${NAMES[key]}`, `ריתם צ׳יינג׳ס (חלק A)${sub ? ' עם תחליפי טריטון' : ''}: ${op % 2 ? 'דרופ 3' : 'קונכיות'} · ${NAMES[key]}`), bpm: 140, evenness: true });
      return { ...d, chart: syms, drums: { groove: 'swing' }, band: { style: 'swing', bass: true } };
    }
    case 'solo-texture': {
      // L12: solo guitar — a walking line on strings 6–5 on the beats, the 3rd and 7th on the "and" of 2 and 4 above it.
      bassWalk(tu, key, evs, [6, 5, 4], 40);
      const bars: [number, number, number][] = [
        [2, 3, 10],
        [7, 4, 10],
        [0, 4, 11],
        [0, 4, 11],
      ];
      bars.forEach(([d, third, seventh], bar) => {
        const root = mod(key + d, 12);
        for (const off of op === 1 ? [0.5, 2.5] : [1.5, 3.5]) {
          const ms = [third, seventh].map((x) => 55 + mod(root + x - 55, 12));
          const ps: P[] = [];
          for (const m of ms.sort((a, b) => a - b)) {
            const p = place(tu, m, [3, 2], 0, 12) ?? place(tu, m, [2, 1], 0, 12);
            if (p && !ps.some((x) => x.s === p.s)) ps.push(p);
          }
          evs.push({ beat: bar * 4 + off, dur: 0.5, notes: ps.map((x) => ({ ...x, stroke: 'i' as const, ct: true })) });
        }
      });
      evs.sort((a, b) => a.beat - b.beat);
      return finish(s, tu, evs, { title: t(`Solo guitar: walking bass with guide tones on the ${op === 1 ? '"and" of 1 and 3' : '"and" of 2 and 4'} · ${NAMES[key]}`, `גיטרת סולו: בס מהלך עם צלילים מנחים על ${op === 1 ? 'ה"וְ" של 1 ו-3' : 'ה"וְ" של 2 ו-4'} · ${NAMES[key]}`), bpm: 80, evenness: false, goal: { chordTonesOnBeats: true } });
    }
  }
  return null;
}

// ───────────────────────────── g-harris: Barry Harris on the neck ─────────────────────────────

/** Place a line of MIDI pitches inside one hand position around `center` (strings 6 → 1). */
function inPosition(tu: Tuning, ms: number[], center: number): P[] {
  return ms.map((m) => place(tu, m, [6, 5, 4, 3, 2, 1], Math.max(0, center - 1), center + 4) ?? place(tu, m, [6, 5, 4, 3, 2, 1], Math.max(0, center - 3), center + 6) ?? place(tu, m, [6, 5, 4, 3, 2, 1], 0, 17)!);
}
const swing8 = (ps: P[], start = 0, ct?: boolean[]): Ev[] => ps.map((p, i) => ({ beat: start + i * 0.5, dur: i === ps.length - 1 ? 1 : 0.5, notes: [{ ...p, stroke: i % 2 === 0 ? ('D' as const) : ('U' as const), ...(ct ? { ct: ct[i] } : {}) }] }));

const SIX_DIM = [0, 2, 4, 5, 7, 8, 9, 11]; // major 6th-diminished (C D E F G G♯ A B)
const MIN_SIX_DIM = [0, 2, 3, 5, 7, 8, 9, 11]; // minor 6th-diminished (C D E♭ F G A♭ A B)

export function generateHarris(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  let title: T2;
  let evs: Ev[] = [];
  let goal: Partial<Drill['goal']> | undefined;
  let bpm = 80;
  // The tonic on string 6 (op even) or 5 (op odd), frets 2–13.
  const rootFret = (str: 6 | 5) => {
    const f = mod(key - tu.open[str - 1], 12);
    return f < 2 ? f + 12 : f;
  };
  switch (s.kind) {
    case 'sixdim-scale': {
      // L1: the major (op 0–1) / minor (op 2–3) 6th-diminished scale, two octaves in position, up and down, swing 8ths.
      const str: 6 | 5 = op % 2 === 0 ? 6 : 5;
      const rf = rootFret(str);
      const R = noteAt(tu, str, rf);
      const sc = op >= 2 ? MIN_SIX_DIM : SIX_DIM;
      const octs = str === 6 ? 2 : 1;
      const ms = Array.from({ length: sc.length * octs + 1 }, (_, i) => R + 12 * Math.floor(i / sc.length) + sc[i % sc.length]);
      evs = swing8(inPosition(tu, upDown(ms), rf));
      title = t(`${op >= 2 ? 'Minor' : 'Major'} 6th-diminished scale, root on string ${str} · ${NAMES[key]}`, `סולם ${op >= 2 ? 'מינור' : 'מז׳ור'} שש-מוקטן, יסוד על מיתר ${str} · ${NAMES[key]}`);
      bpm = 80;
      break;
    }
    case 'sixdim-chords': {
      // L2: the scale of chords — every scale note on top, voiced as the 6 chord (chord tones) or the diminished 7th
      // (the notes between) in drop-2, on strings 4-3-2-1 (op 0) or 5-4-3-2 (op 1). Op 2: the minor 6th-diminished.
      const strs = op === 1 ? [5, 4, 3, 2] : [4, 3, 2, 1];
      const minor = op === 2;
      const six = (minor ? [0, 3, 7, 9] : [0, 4, 7, 9]).map((x) => key + x);
      const dim = DIM7(key + 11);
      const sc = minor ? MIN_SIX_DIM : SIX_DIM;
      let near = Math.max(1, mod(key - tu.open[strs[strs.length - 1] - 1], 12) - 3);
      const tops: P[][] = [];
      for (let i = 0; i <= sc.length; i++) {
        const pc = mod(key + sc[i % sc.length], 12);
        const isSix = six.some((x) => mod(x, 12) === pc);
        const cands = drop2Voicings(tu, isSix ? six : dim, strs, 15).filter((v) => {
          const top = v.reduce((a, b) => (noteAt(tu, b.s, b.f) > noteAt(tu, a.s, a.f) ? b : a));
          return pcOf(tu, top) === pc;
        });
        const climbing = tops.length ? cands.filter((v) => topOf(tu, v) > topOf(tu, tops[tops.length - 1])) : cands;
        const pool = climbing.length ? climbing : cands;
        if (!pool.length) continue;
        const v = nearestVoicing(pool, near);
        near = lowFretOf(v);
        tops.push(v);
      }
      upDown(tops).forEach((v, i) => evs.push({ beat: i, dur: 1, notes: strum(v) }));
      title = t(`Scale of chords: ${NAMES[key]}${minor ? 'm6' : '6'} and the diminished between, drop-2 on strings ${Math.min(...strs)}–${Math.max(...strs)}`, `סולם האקורדים: ${NAMES[key]}${minor ? 'm6' : '6'} והמוקטן שביניהם, דרופ 2 על מיתרים ${Math.min(...strs)}–${Math.max(...strs)}`);
      bpm = 80;
      break;
    }
    case 'dom-scale': {
      // L3: the dominant scale descending from degree 1, 3, 5 or 7 with Barry's half-step rules, chord tones on the downbeats (over V7 of the key).
      // Options 0–3: from 1, 3, 5, 7 with the basic rules; 4–6: from 3, 5, 7 with the extended rules.
      const deg = [1, 3, 5, 7, 3, 5, 7][op % 7];
      const ext = op % 7 >= 4;
      const line = barryLine(deg, ruleFor(deg, ext));
      const V = mod(key + 7, 12);
      const base = 43 + mod(V - 43, 12); // the V root in G2 … F♯3
      const ms = line.map((x) => base + x);
      const rf = Math.max(1, mod(base - 40, 12) + (base - 40 >= 12 ? 12 : 0));
      evs = swing8(inPosition(tu, ms, Math.max(1, Math.min(10, rf + 2))), 0, ms.map((m) => [0, 4, 7, 10].includes(mod(m - V, 12))));
      goal = { chordTonesOnBeats: true };
      title = t(`Dominant scale down from the ${['', 'root', '', '3rd', '', '5th', '', '7th'][deg]}${ext ? ' (extended rules)' : ''}, chord tones on the beats · ${NAMES[V]}7`, `סולם הדומיננטה יורד מה${['', 'יסוד', '', 'טרצה', '', 'קווינטה', '', 'ספטימה'][deg]}${ext ? ' (חוקים מורחבים)' : ''}, צלילי אקורד על הפעמות · ${NAMES[V]}7`);
      bpm = 80;
      break;
    }
    case 'triads-3to9': {
      // L4: op 0 — triads up from every degree of the dominant scale; op 1 — "3 to 9" (3-5-7-9) over ii–V–I;
      // op 2 — the dominant line with a pivot (the line breaks an octave up halfway).
      const V = mod(key + 7, 12);
      const base = 45 + mod(V - 45, 12);
      let ms: number[] = [];
      if (op === 0) {
        const dom = [0, 2, 4, 5, 7, 9, 10];
        for (let d = 0; d < 7; d++) ms.push(...[0, 2, 4].map((k) => base + dom[(d + k) % 7] + (d + k >= 7 ? 12 : 0)));
        ms.push(base + 12);
      } else if (op === 1) {
        const ii = mod(key + 2, 12);
        const chords: [number, number[]][] = [[ii, [3, 7, 10, 14]], [V, [4, 7, 10, 14]], [mod(key, 12), [4, 7, 11, 14]]];
        let prev = base + 4;
        for (const [r, iv] of chords) {
          const r0 = 40 + mod(r - 40, 12);
          const start = [r0, r0 + 12].reduce((a, b) => (Math.abs(b + iv[0] - prev) < Math.abs(a + iv[0] - prev) ? b : a));
          const four = iv.map((x) => start + x);
          ms.push(...four, ...four.slice(0, -1).reverse().slice(0, 0));
          prev = four[3];
        }
        ms = ms.slice(0, 12);
        ms.push(ms[ms.length - 1] - 1);
      } else {
        const line = pivot(barryLine(5, 'one'), 4, 1);
        ms = line.map((x) => base - 12 + x);
      }
      const lo = Math.min(...ms);
      const center = Math.max(1, Math.min(11, mod(lo - 40, 12) + (lo - 40 >= 12 ? 12 : 0)));
      evs = swing8(inPosition(tu, ms, center));
      title = op === 0 ? t(`Triads off the degrees of the dominant scale · ${NAMES[V]}7`, `משולשים מכל דרגה של סולם הדומיננטה · ${NAMES[V]}7`) : op === 1 ? t(`"3 to 9" over ii–V–I · ${NAMES[key]}`, `"3 עד 9" על ii–V–I · ${NAMES[key]}`) : t(`The dominant line with a pivot · ${NAMES[V]}7`, `קו הדומיננטה עם פיבוט · ${NAMES[V]}7`);
      bpm = 100;
      break;
    }
    case 'enclosure': {
      // L5: ii–V–I lines landing on the 3rd of each chord on beat 1 — op 0 a half step below, op 1 an enclosure
      // (the scale step above, the half step below, the target).
      const chords: [number, number, number[]][] = [
        [2, 3, [0, 3, 7, 10]],
        [7, 4, [0, 4, 7, 10]],
        [0, 4, [0, 4, 7, 11]],
      ];
      let prev = 60;
      const ms: number[] = [];
      const cts: boolean[] = [];
      chords.forEach(([d, third, iv], i) => {
        const root = mod(key + d, 12);
        const target = [0, 1].map((k) => 55 + mod(root + third - 55, 12) + 12 * k).reduce((a, b) => (Math.abs(b - prev) < Math.abs(a - prev) ? b : a));
        const lead = op === 1 ? [target + 2, target - 1] : [target - 1];
        if (i > 0) {
          // Replace the end of the previous bar with the approach so the target lands on beat 1.
          ms.splice(ms.length - lead.length, lead.length, ...lead);
          cts.splice(cts.length - lead.length, lead.length, ...lead.map(() => false));
        }
        // The bar: target, then chord tones up and down (8 eighths).
        const tones = iv.map((x) => root + x);
        const arp = [target, ...[1, 2, 3, 2, 1, 0, 1].map((k) => {
          const pc = mod(tones[(iv.indexOf(third) + k) % 4], 12);
          return [0, 1, -1].map((o) => target + o * 12 + mod(pc - target, 12)).reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
        })];
        ms.push(...arp);
        cts.push(...arp.map(() => true));
        prev = target;
      });
      const center = Math.max(1, Math.min(10, mod(Math.min(...ms) - 40, 12) + (Math.min(...ms) - 40 >= 12 ? 12 : 0)));
      evs = swing8(inPosition(tu, ms, center), 0, cts);
      goal = { chordTonesOnBeats: true };
      title = t(`ii–V–I lines: ${op === 1 ? 'enclosures' : 'a half step below'} into the 3rd on beat 1 · ${NAMES[key]}`, `קווי ii–V–I: ${op === 1 ? 'כיתורים' : 'חצי טון מתחת'} אל הטרצה על פעמה 1 · ${NAMES[key]}`);
      bpm = 100;
      break;
    }
    case 'brothers': {
      // L6: one diminished chord, four dominants a minor 3rd apart (lower one note each: the "brothers"), each
      // arpeggiated R-3-5-♭7 up and down; op 1: from the dim the minor 6ths (raise one note).
      const dimRoot = 40 + mod(key + 11 - 40, 12);
      const ms: number[] = [];
      for (let i = 0; i < 4; i++) {
        const r = moveDim(dimRoot, { notes: [i], dir: op === 1 ? 'up' : 'down' });
        const root = 40 + mod(r.root - 40, 12);
        const iv = op === 1 ? [0, 3, 7, 9] : [0, 4, 7, 10];
        const four = iv.map((x) => root + x).map((m) => (m < 45 ? m + 12 : m));
        four.sort((a, b) => a - b);
        ms.push(...four, ...four.slice(1, 3).reverse(), four[0]);
      }
      evs = ms.map((m, i) => ({ beat: i * 0.5, dur: i === ms.length - 1 ? 1 : 0.5, notes: [{ ...(place(tu, m, [6, 5, 4, 3, 2], 0, 12) ?? place(tu, m, [6, 5, 4, 3, 2, 1], 0, 15)!), stroke: i % 2 === 0 ? ('D' as const) : ('U' as const) }] }));
      title = op === 1 ? t(`From one diminished chord: four minor 6ths · ${NAMES[mod(key + 11, 12)]}°7`, `מאקורד מוקטן אחד: ארבעה מינור 6 · ${NAMES[mod(key + 11, 12)]}°7`) : t(`The brothers: four dominants a minor 3rd apart, from one diminished chord · ${NAMES[mod(key + 11, 12)]}°7`, `האחים: ארבע דומיננטות בהפרש טרצה קטנה, מאקורד מוקטן אחד · ${NAMES[mod(key + 11, 12)]}°7`);
      bpm = 100;
      break;
    }
    default:
      throw new Error(`Unknown g-harris kind ${s.kind}`);
  }
  return finish(s, tu, evs, { title, bpm, evenness: true, ...(goal ? { goal } : {}) });
}
