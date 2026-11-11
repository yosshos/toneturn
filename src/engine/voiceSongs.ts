// Songs with the band, phrase by phrase (VOICE_CURRICULUM F13–F14): a song placed in the singer's range, its
// backing from the band engine, and a take scored per phrase (pitch 50 %, time 30 %, breath 20 %) so the weakest
// phrase can be looped slower until it passes. The songbook's 40 public-domain songs and our own songs share it.
// Pure: the UI plays the events and hands back frames on the plan's clock (seconds from the melody's first bar).

import type { NoteEvent } from './lesson';
import type { SungFrame } from './sing';
import { chartBacking, parseChart, transposeChart, type ChartStyle } from './charts';
import { SONGBOOK, songChords, chordName, songNotes, type SongDef } from '../content/songbook';
import { VOICE_SONGS, type VoiceSong } from '../content/voiceSongs';
import type { VoiceRange } from './vocal';
import { bandScore } from './vocal';
import { driftOf, noteCents, notePitchShare, timeFeel, voiceOnsets, type TimeFeel } from './voiceTime';

const BAND_STYLES: ChartStyle[] = ['pop', 'bossa', 'ballad', 'rock'];
const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

/** A songbook song as a band song: its chords spelled in C, a mature groove (Greensleeves in a bossa feels adult). */
export function fromSongbook(s: SongDef): VoiceSong {
  const chords = songChords(s);
  const bars: string[] = [];
  const nBars = s.melody.split('|').length;
  for (let b = 0; b < nBars; b++) {
    const inBar = chords.filter((c) => Math.floor(c.at / s.meter + 1e-9) === b);
    bars.push(inBar.length ? inBar.map((c) => chordName(c, 0, true)).join(' ') : '%');
  }
  const style: ChartStyle = s.meter === 3 || s.meter === 1.5 ? 'waltz' : s.style === 'spiritual' ? 'ballad' : BAND_STYLES[Math.abs(hash(s.id)) % BAND_STYLES.length];
  return {
    id: s.id,
    title: s.title,
    credit: { en: s.credit, he: s.credit },
    tier: 'pd',
    meter: s.meter === 1.5 ? 3 : s.meter,
    minor: s.minor,
    melody: s.melody,
    chart: bars.join(' | '),
    phrases: s.phrases,
    level: s.level,
    style,
    bpm: style === 'ballad' ? 76 : style === 'waltz' ? 132 : 92,
  };
}

/** Every band song by id: ours, the jazz heads, and the songbook (2/4 and 6/8 songs sung in their own meter). */
export function voiceSong(id: string): VoiceSong | undefined {
  return VOICE_SONGS.find((s) => s.id === id) ?? (() => {
    const s = SONGBOOK.find((x) => x.id === id);
    return s && s.meter !== 1.5 ? fromSongbook(s) : undefined;
  })();
}

/** Songbook songs usable with the band at a level (whole bars, 2–4 beats a bar). */
export const songbookAt = (levels: number[], minor?: boolean) => SONGBOOK.filter((s) => levels.includes(s.level) && s.meter >= 2 && (minor === undefined || !!s.minor === minor)).map((s) => s.id);

export interface PlanNote {
  midi: number;
  /** Seconds from the first sung bar. */
  start: number;
  dur: number;
  phrase: number;
  bar: number;
  /** The note follows a rest or starts the phrase (its onset is clear). */
  fresh: boolean;
}
export interface PlanPhrase {
  i: number;
  fromBar: number;
  toBar: number;
  start: number;
  end: number;
  notes: number[];
}
export interface SongPlan {
  song: VoiceSong;
  tonic: number;
  bpm: number;
  beat: number;
  meter: number;
  bars: number;
  notes: PlanNote[];
  phrases: PlanPhrase[];
  /** The chart in the sung key (one bar per "|"). */
  chartBars: string[];
}

/** The song in a key that fits the range (whole melody inside when it can), at `bpm` (default the song's). */
export function songPlan(song: VoiceSong, range: VoiceRange, bpm = song.bpm): SongPlan {
  // A token ending in "~" is tied to the next note (lead sheets, F9 L9): one sung note across both.
  const ties = tieFlags(song.melody);
  const ns = songNotes({ id: song.id, melody: song.melody.replace(/~/g, ''), meter: song.meter, minor: song.minor });
  const semis = ns.map((n) => n.semi).filter((x): x is number => x !== null);
  const lo = Math.min(...semis);
  const hi = Math.max(...semis);
  const minT = range.low - lo;
  const maxT = range.high - hi;
  const tonic = minT <= maxT ? Math.round((minT + maxT) / 2) : Math.round((range.low + range.high) / 2 - (lo + hi) / 2);
  const beat = 60 / bpm;
  const starts = [0, ...song.phrases];
  const phraseOfBar = (b: number) => starts.filter((s) => s <= b).length - 1;
  const notes: PlanNote[] = [];
  let prevRest = true;
  let prevPhrase = -1;
  // Swing songs are sung swung: an eighth on the "and" sits two thirds into the beat (the band swings the same way).
  const sw = song.style === 'swing';
  const at = (b: number) => {
    if (!sw) return b;
    const f = b - Math.floor(b);
    return Math.abs(f - 0.5) < 1e-6 ? Math.floor(b) + 2 / 3 : b;
  };
  for (const [ti, n] of ns.entries()) {
    if (n.semi === null) {
      prevRest = true;
      continue;
    }
    const tied = ti > 0 && ties[ti - 1] && notes.length && ns[ti - 1].semi === n.semi;
    if (tied) {
      const last = notes[notes.length - 1];
      last.dur = at(n.at + n.beats) * beat - last.start;
      continue;
    }
    const phrase = phraseOfBar(n.bar);
    notes.push({ midi: tonic + n.semi, start: at(n.at) * beat, dur: (at(n.at + n.beats) - at(n.at)) * beat, phrase, bar: n.bar, fresh: prevRest || phrase !== prevPhrase });
    prevRest = false;
    prevPhrase = phrase;
  }
  const bars = song.melody.split('|').length;
  const phrases: PlanPhrase[] = starts.map((fromBar, i) => {
    const toBar = (starts[i + 1] ?? bars) - 1;
    const idx = notes.map((n, k) => (n.phrase === i ? k : -1)).filter((k) => k >= 0);
    return { i, fromBar, toBar, start: fromBar * song.meter * beat, end: (toBar + 1) * song.meter * beat, notes: idx };
  });
  const tpc = ((tonic % 12) + 12) % 12;
  const chartBars = transposeChart(song.chart, tpc).split('|').map((b) => b.trim());
  return { song, tonic, bpm, beat, meter: song.meter, bars, notes, phrases, chartBars };
}

/** Per melody token: is it tied to the next one ("~")? */
export function tieFlags(melody: string): boolean[] {
  return melody
    .split('|')
    .flatMap((b) => b.trim().split(/\s+/).filter(Boolean))
    .map((t) => t.endsWith('~'));
}

/** A song as written, for the staff (F9 L8–L9): every token in order with its pitch in the sung key, length, rest and tie. */
export function sheetNotes(song: VoiceSong, tonic: number): { midi: number; beats: number; rest: boolean; tie: boolean; bar: number }[] {
  const ties = tieFlags(song.melody);
  return songNotes({ id: song.id, melody: song.melody.replace(/~/g, ''), meter: song.meter, minor: song.minor }).map((n, i) => ({
    midi: n.semi === null ? tonic : tonic + n.semi,
    beats: n.beats,
    rest: n.semi === null,
    tie: !!ties[i],
    bar: n.bar,
  }));
}

export interface Backing {
  events: NoteEvent[];
  /** Seconds from the events' start to the first sung bar. */
  lead: number;
  length: number;
}

/**
 * The band (or, unaccompanied, only the key: a count-in and the tonic chord for one bar) for bars [from, to]:
 * a count-in, one intro bar (the first chord, so the singer hears the key — and the bleed gate learns the band's
 * level), then the bars. A melody guide can be added (only with headphones: it is the very line being sung).
 */
export function songBacking(plan: SongPlan, o: { fromBar?: number; toBar?: number; band?: boolean; guide?: boolean } = {}): Backing {
  const from = o.fromBar ?? 0;
  const to = o.toBar ?? plan.bars - 1;
  const m = plan.meter;
  const bars = plan.chartBars.slice(from, to + 1);
  // A bar that only repeats ("%") at the start needs its real chord.
  const first = plan.chartBars.slice(0, from + 1).reverse().find((b) => b && b !== '%') ?? 'C';
  if (bars[0] === '%' || !bars[0]) bars[0] = first;
  const text = [first.split(/\s+/)[0], ...bars].join(' | ');
  const p = parseChart(text, m);
  const style = plan.song.style;
  let events: NoteEvent[];
  const lead = 2 * m * plan.beat;
  if (o.band === false) {
    const beat = plan.beat;
    const clicks: NoteEvent[] = Array.from({ length: m }, (_, k) => ({ midi: k === 0 ? 96 : 91, start: k * beat, duration: 0.05, velocity: 0.5, perc: (k === 0 ? 'accent' : 'click') as NoteEvent['perc'] }));
    const c0 = p.chords[0];
    const chord: NoteEvent[] = c0 ? [0, ...c0.iv.slice(1, 3)].map((x) => ({ midi: 55 + ((c0.root + x - 55 + 120) % 12), start: m * beat, duration: m * beat * 0.95, velocity: 0.45 })) : [];
    events = [...clicks, ...chord];
  } else {
    events = chartBacking(p, style, plan.bpm, 1, m, { countIn: true }).events;
  }
  // F14 L10: the band's answers between the singer's calls (an own line in the song's notation, in the gaps).
  if (plan.song.answer && o.band !== false) {
    const sw = style === 'swing';
    const at = (b: number) => (sw && Math.abs(b - Math.floor(b) - 0.5) < 1e-6 ? Math.floor(b) + 2 / 3 : b);
    const base = from * m;
    for (const n of songNotes({ id: `${plan.song.id}-answer`, melody: plan.song.answer, meter: m, minor: plan.song.minor })) {
      if (n.semi === null || n.bar < from || n.bar > to) continue;
      events.push({ midi: plan.tonic + n.semi, start: lead + (at(n.at) - base) * plan.beat, duration: Math.max(0.08, (at(n.at + n.beats) - at(n.at)) * plan.beat * 0.9), velocity: 0.62 });
    }
  }
  if (o.guide) {
    const t0 = plan.notes.find((n) => n.bar >= from)?.start ?? 0;
    const base = from * m * plan.beat;
    for (const n of plan.notes.filter((x) => x.bar >= from && x.bar <= to)) events.push({ midi: n.midi, start: lead + n.start - base, duration: n.dur * 0.92, velocity: 0.3 });
    void t0;
  }
  events.sort((a, b) => a.start - b.start);
  return { events, lead, length: lead + bars.length * m * plan.beat + 0.4 };
}

export interface PhraseScore {
  i: number;
  pitch: number;
  time: number | null;
  breath: number;
  score: number;
  /** Notes sung (not null). */
  sung: number;
  notes: number;
}
export interface SongGrade {
  phrases: PhraseScore[];
  /** Mean phrase score; capped below the pass when a phrase is under `need` (every phrase must pass). */
  score: number;
  mean: number;
  weakest: number;
  feel: TimeFeel | null;
  drift: ReturnType<typeof driftOf>;
  /** Chorus louder than the verse (dB), when the song has a chorus. */
  chorusDb: number | null;
  notePitch: (number | null)[];
}

const voiced = (f: SungFrame) => !!f.hz && f.confidence >= 0.75;

/**
 * Score a take of bars [from, to] (frames on the plan's clock: 0 = the start of bar `from`, the delay already
 * removed). Pitch: share of each note's frames within ±tol cents. Time: the onsets of clear notes (after a rest,
 * or a new pitch) against the written ones. Breath: no gap of 250 ms or more inside a phrase where the music has
 * no rest. A phrase = 0.5 pitch + 0.3 time + 0.2 breath (without time: 0.75 pitch + 0.25 breath).
 */
export function gradeSongTake(frames: SungFrame[], plan: SongPlan, o: { fromBar?: number; toBar?: number; tol?: number; rhythm?: boolean; need?: number } = {}): SongGrade {
  const from = o.fromBar ?? 0;
  const to = o.toBar ?? plan.bars - 1;
  const base = from * plan.meter * plan.beat;
  const tol = o.tol ?? 50;
  const sel = plan.notes.map((n, k) => ({ n: { ...n, start: n.start - base }, k })).filter(({ n }) => n.bar >= from && n.bar <= to);
  const share = sel.map(({ n }) => notePitchShare(frames, n, tol));
  const cents = sel.map(({ n }) => noteCents(frames, n));
  // Onsets of the clear notes: after a rest, or a pitch change of a semitone or more.
  const clear = sel.filter(({ n }, j) => n.fresh || (j > 0 && Math.abs(n.midi - sel[j - 1].n.midi) >= 1));
  const onsets = voiceOnsets(frames);
  // Legato pitch changes are onsets too (a new note on the same breath).
  const changes = pitchChanges(frames);
  const allOn = [...onsets, ...changes].sort((a, b) => a - b).filter((t, i, a) => i === 0 || t - a[i - 1] > 0.08);
  const feel = clear.length >= 2 ? timeFeel(allOn, clear.map(({ n }) => n.start), { window: Math.min(0.3, plan.beat * 0.45) }) : null;
  const offAt = new Map<number, number | null>();
  if (feel) clear.forEach(({ k }, j) => offAt.set(k, feel.offsets[j]));
  const phrases: PhraseScore[] = [];
  for (const ph of plan.phrases) {
    if (ph.toBar < from || ph.fromBar > to) continue;
    const js = sel.map((x, j) => (x.n.phrase === ph.i ? j : -1)).filter((j) => j >= 0);
    if (!js.length) continue;
    const pitch = js.reduce((a, j) => a + (share[j] ?? 0), 0) / js.length;
    const offs = js.map((j) => offAt.get(sel[j].k)).filter((x): x is number | null => x !== undefined);
    const hit = offs.filter((x): x is number => x !== null);
    const time = !o.rhythm || offs.length < 1 ? null : (hit.length / offs.length) * bandScore(hit.length ? hit.reduce((a, x) => a + Math.abs(x), 0) / hit.length : 999, [60, 110, 200]);
    // Breath: voiceless gaps (≥ 250 ms) between the phrase's first note and its last, outside written rests.
    const nts = js.map((j) => sel[j].n);
    const a = nts[0].start;
    const b = nts[nts.length - 1].start + nts[nts.length - 1].dur - 0.15;
    const inRest = (t: number) => !nts.some((n) => t >= n.start - 0.05 && t <= n.start + n.dur + 0.05);
    let gaps = 0;
    let run = 0;
    let runStart = 0;
    const sung = js.filter((j) => share[j] !== null).length;
    for (const f of frames) {
      if (f.t < a + 0.1 || f.t > b) continue;
      if (voiced(f) || inRest(f.t)) {
        if (run >= 0.25) gaps++;
        run = 0;
        continue;
      }
      if (run === 0) runStart = f.t;
      run = f.t - runStart + 0.02;
    }
    if (run >= 0.25) gaps++;
    const breath = sung < js.length / 2 ? 0 : gaps === 0 ? 1 : gaps === 1 ? 0.5 : 0;
    const score = time === null ? 0.75 * pitch + 0.25 * breath : 0.5 * pitch + 0.3 * time + 0.2 * breath;
    phrases.push({ i: ph.i, pitch: r3(pitch), time: time === null ? null : r3(time), breath, score: r3(score), sung, notes: js.length });
  }
  const mean = phrases.length ? phrases.reduce((s, p) => s + p.score, 0) / phrases.length : 0;
  const need = o.need ?? 0.75;
  const weakest = phrases.length ? phrases.reduce((w, p) => (p.score < w.score ? p : w)).i : 0;
  const capped = phrases.some((p) => p.score < need) ? Math.min(mean, need - 0.01) : mean;
  // Chorus vs verse loudness (relative, one take).
  let chorusDb: number | null = null;
  if (plan.song.chorus !== undefined && from < plan.song.chorus && to >= plan.song.chorus) {
    const cAt = plan.song.chorus * plan.meter * plan.beat - base;
    const db = (fs: SungFrame[]) => {
      const xs = fs.filter(voiced).map((f) => 20 * Math.log10(Math.max(1e-5, f.rms))).sort((x, y) => x - y);
      return xs.length > 10 ? xs[Math.floor(xs.length * 0.6)] : null;
    };
    const v = db(frames.filter((f) => f.t < cAt));
    const c = db(frames.filter((f) => f.t >= cAt));
    chorusDb = v !== null && c !== null ? Math.round((c - v) * 10) / 10 : null;
  }
  return { phrases, score: r3(capped), mean: r3(mean), weakest, feel, drift: driftOf(cents, sel.map(({ n }) => n.phrase)), chorusDb, notePitch: share };
}
const r3 = (x: number) => Math.round(x * 1000) / 1000;

/** Times where a sung line moves to a new pitch (a semitone or more, held ≥ 60 ms) — legato onsets. */
export function pitchChanges(frames: SungFrame[]): number[] {
  const out: number[] = [];
  let cur: number | null = null;
  let cand: { t: number; m: number; n: number } | null = null;
  for (const f of frames) {
    if (!voiced(f)) {
      cur = null;
      cand = null;
      continue;
    }
    const m = 12 * Math.log2(f.hz! / 440) + 69;
    if (cur === null) {
      cur = m;
      continue;
    }
    if (Math.abs(m - cur) >= 0.7) {
      if (cand && Math.abs(m - cand.m) < 0.5) {
        cand.n++;
        if (cand.n >= 3) {
          out.push(cand.t);
          cur = cand.m;
          cand = null;
        }
      } else cand = { t: f.t, m, n: 1 };
    } else {
      cand = null;
      cur = cur * 0.8 + m * 0.2;
    }
  }
  return out;
}
