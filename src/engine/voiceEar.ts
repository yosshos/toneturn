// The ear items of the voice course (VOICE_CURRICULUM P3: F10 L1 echo, L3 intervals from a given note, L5 audiation;
// F13 L1 one phrase of a simple song): what the app plays before the take, and which notes the screen may show before
// the result. They are graded by the melody grader (each note's pitch, from the microphone), like the other melodies.

import type { NoteEvent } from './lesson';
import type { VocalItem } from './vocal';
import { SONGBOOK } from '../content/songbook';
import { EAR_INSTR } from '../content/voiceCourseText';

type Lang = 'he' | 'en';

/**
 * What the app plays before an ear item: the echo with its own rhythm, only the given note (intervals), or the two
 * bars before the bar to sing (audiation: that bar is never played). Null for any other item.
 */
export function earReference(item: VocalItem, targets: number[]): { events: NoteEvent[]; length: number } | null {
  const e = item.ear;
  if (!e || !targets.length) return null;
  if (e.mode === 'interval') return { events: [{ midi: targets[0], start: 0, duration: 1.3, velocity: 0.72 }], length: 1.6 };
  const base = targets[0] - (item.steps?.[0] ?? 0);
  const notes = e.mode === 'audiate' ? (e.lead ?? []).map((x) => base + x) : targets;
  const secs = e.mode === 'audiate' ? (e.leadSecs ?? notes.map(() => 0.6)) : (item.noteSecs ?? notes.map(() => 0.55));
  let at = 0;
  const events = notes.map((midi, i) => {
    const d = secs[i] ?? 0.55;
    const ev: NoteEvent = { midi, start: at, duration: d * 0.92, velocity: 0.7 };
    at += d;
    return ev;
  });
  return { events, length: at + 0.35 };
}

/** The notes an ear item may show before its result: the given / first note — none for audiation (the bar is the task). */
export function earShown(item: VocalItem, targets: number[]): number[] {
  if (!item.ear) return targets;
  return item.ear.mode === 'audiate' ? [] : targets.slice(0, 1);
}

/** The first note an extra listen replays (audiation: the first played note, never a note of the bar to sing). */
export function earReplayNote(item: VocalItem, targets: number[]): number {
  if (item.ear?.mode === 'audiate' && item.ear.lead?.length) return targets[0] - (item.steps?.[0] ?? 0) + item.ear.lead[0];
  return targets[0];
}

// ---------------------------------------------------------------- fresh melodies every session (no memorizable items)

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
/** Semitones of a major-scale degree index (0 = tonic, 7 = the octave, negatives below). */
export const degSemis = (i: number) => 12 * Math.floor(i / 7) + MAJOR[((i % 7) + 7) % 7];
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];

/** Motifs a sequence is built from (degree offsets inside the bar), by length; no two neighbours alike. */
const MOTIFS: Record<number, number[][]> = {
  3: [[0, 2, 1], [2, 1, 0], [0, 1, 2], [0, 2, 4], [4, 2, 0], [1, 0, 2]],
  4: [[0, 1, 2, 0], [0, 2, 4, 2], [0, 2, 1, 3], [2, 1, 0, 1], [0, -1, 0, 2], [4, 3, 2, 0], [0, 2, 1, 0]],
};

/**
 * An echo melody in the same difficulty band as its fixed template: as many notes, the same rhythm, diatonic, no
 * leap wider than the template's widest, no span wider than the template's plus a whole step, no note repeated straight after itself, ending on the tonic.
 */
export function genEcho(template: number[], r: () => number): number[] {
  const n = template.length;
  // A little room above the template's span (a whole step), so even the shortest echo has several shapes.
  const span = Math.max(...template) - Math.min(...template) + 2;
  const maxLeap = Math.max(2, ...template.slice(1).map((x, i) => Math.abs(x - template[i])));
  for (let tries = 0; tries < 200; tries++) {
    const ds = [0];
    let ok = true;
    for (let k = 1; k < n; k++) {
      const moves = [-2, -1, 1, 2, -1, 1, 1, -1, 3, -3].filter((m) => Math.abs(degSemis(ds[k - 1] + m) - degSemis(ds[k - 1])) <= maxLeap);
      const prev = ds[k - 1];
      const homes = [0, 7].filter((h) => h !== prev && Math.abs(degSemis(h) - degSemis(prev)) <= maxLeap);
      const d = k === n - 1 ? (homes.length ? homes[0] : NaN) : prev + pick(r, moves);
      if (Number.isNaN(d) || d === prev) {
        ok = false;
        break;
      }
      ds.push(d);
    }
    if (!ok) continue;
    const st = ds.map(degSemis);
    const leaps = st.slice(1).every((x, i) => Math.abs(x - st[i]) <= maxLeap);
    if (leaps && Math.max(...st) - Math.min(...st) <= span && new Set(st).size >= Math.min(3, n - 1)) return st;
  }
  return template;
}

/** An audiation sequence of the template's motif length: a motif from the pool, a start degree and a direction. */
export function genAudiation(motifLen: number, r: () => number): { lead: number[]; sung: number[] } {
  const pool = MOTIFS[motifLen] ?? MOTIFS[4];
  const motif = pick(r, pool);
  const dir = r() < 0.5 ? 1 : -1;
  const start = dir > 0 ? pick(r, [0, 1]) : pick(r, [3, 4]);
  const bar = (j: number) => motif.map((x) => degSemis(start + j * dir + x));
  return { lead: [...bar(0), ...bar(1)], sung: bar(2) };
}

/**
 * The session's copy of an ear item (owner rule: no memorizable items): echoes (F10 L1) and audiation (F10 L5) get a
 * fresh seeded melody in the same difficulty band; the id, the rhythm and the tempo stay. Other items are unchanged.
 */
export function sessionEarItem(item: VocalItem, seed: number): VocalItem {
  const e = item.ear;
  if (!e || !item.steps || e.song || e.mode === 'interval') return item;
  const r = mulberry(seed ^ [...item.id].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7));
  if (e.mode === 'echo') return { ...item, steps: genEcho(item.steps, r) };
  const g = genAudiation(item.steps.length, r);
  const sec = item.noteSecs?.[0] ?? 0.68;
  return { ...item, steps: g.sung, noteSecs: g.sung.map(() => sec), ear: { ...e, lead: g.lead, leadSecs: g.lead.map(() => sec) } };
}

/** The one-line instruction of an ear item; `ivName` names the interval's size (the app's interval names). */
export function earInstruction(item: VocalItem, lang: Lang, ivName: (semis: number) => string): string {
  const e = item.ear!;
  if (e.mode === 'interval') {
    const semis = (item.steps?.[1] ?? 0) - (item.steps?.[0] ?? 0);
    const name = ivName(Math.abs(semis));
    // "an octave", "a minor ninth"
    return EAR_INSTR[semis >= 0 ? 'intervalUp' : 'intervalDown'][lang].replace('a {iv}', /^[aeiou]/i.test(name) ? 'an {iv}' : 'a {iv}').replace('{iv}', name);
  }
  if (e.mode === 'audiate') return EAR_INSTR.audiate[lang];
  if (e.song) {
    const s = SONGBOOK.find((x) => x.id === e.song);
    return EAR_INSTR.song[lang].replace('{song}', s ? s.title[lang] : e.song);
  }
  return EAR_INSTR.echo[lang];
}
