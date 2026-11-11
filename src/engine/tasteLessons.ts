// The runnable taste sessions of SPEC-COURSE-START (the tables live in courseStart.ts). Question tastes are a
// LessonDef built from the topic generators and the basics' built-in moments; playing tastes are the first items of
// real technique levels (so the takes count on the ladder), with the band engine under them. Pure, seeded.
import type { LessonDef, Question, SingSeqQuestion } from './lesson';
import { mulberry32, singQuestion } from './lesson';
import { pc } from './pitch';
import { genTopic } from './topicKit';
import { keepBeatQuestion } from './basics';
import './topics'; // registers every topic generator
import type { Drill, ExpNote } from './drills/types';
import { families, levelDrills } from './drills/plan';
import type { LevelDef } from './drills/generate';
import type { TasteDef, TasteDrillPick } from './courseStart';

const KEYS = ['C', 'D', 'E', 'F', 'G', 'A'];

/** A question taste as one session (the skill of its first item rates it; every item rates its own skill). */
export function tasteLesson(def: TasteDef, seed: number): LessonDef {
  if (def.run.kind !== 'lesson') throw new Error(`${def.id} is not a question taste`);
  const rnd = mulberry32(seed);
  const s = () => Math.floor(rnd() * 1e9);
  const qs: Question[] = [];
  const id = () => `${def.id}-${qs.length + 1}`;
  for (const it of def.run.items) {
    if ('topic' in it) for (let i = 0; i < it.n; i++) qs.push(genTopic(it.topic, s(), it.level, id()) as Question);
    else if ('beat' in it) qs.push(keepBeatQuestion(id(), it.beat.bpm, it.beat.bars));
    else if ('echoNote' in it) {
      const q = singQuestion(id(), pc(KEYS[Math.floor(rnd() * KEYS.length)]), it.echoNote);
      qs.push({ ...q, promptBy: 'echo', stimulus: [{ kind: 'note', midi: q.targetMidi, duration: 1.4 }], difficulty: 700 });
    } else if ('echoPhrase' in it) for (const degs of it.echoPhrase) qs.push(echoPhrase(id(), KEYS[Math.floor(rnd() * KEYS.length)], degs));
  }
  const skill = qs[0] && 'skillAs' in qs[0] && qs[0].skillAs ? qs[0].skillAs : def.course === 'voice' ? 'singing' : def.course === 'jazz' ? 'chords' : 'pitch';
  return { id: 'topic', version: 1, skill, scoring: { xpPerCorrect: 10, attemptLimit: 2 }, intro: [], questions: qs };
}

/** Hear a short phrase (Toni models it on the piano), sing it back: no names, no degrees on screen until the result. */
function echoPhrase(id: string, key: string, degrees: number[]): SingSeqQuestion {
  const tonic = 55 + ((pcIndex(key) - 55) % 12 + 12) % 12;
  const steps = [0, 2, 4, 5, 7, 9, 11];
  const midis = degrees.map((d) => tonic + steps[d - 1]);
  return {
    id,
    kind: 'sing-seq',
    key: pc(key),
    degrees,
    midis,
    choices: [],
    answer: 'accurate',
    stimulus: [{ kind: 'notes', midis, each: 0.6 }],
    prompt: { en: 'Listen, then sing it back.', he: 'הקשיבו, ואז שירו את זה בחזרה.' },
    difficulty: 820 + 30 * degrees.length,
  };
}
const pcIndex = (k: string) => ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 })[k[0] as 'C'] ?? 0;

const levelById = (id: string): LevelDef | undefined => {
  for (const inst of ['piano', 'guitar', 'bass', 'drums'] as const) for (const f of families(inst)) for (const l of f.levels) if (l.id === id) return l;
  return undefined;
};

/** The band under a drill that has none (the drill's own band and drums win). The chart repeats to cover the take. */
export function withBand(d: Drill, band: TasteDrillPick['band']): Drill {
  if (!band || d.band) return d;
  const bars = Math.ceil(d.beats / (d.meter || 4) - 1e-9);
  const chart = Array.from({ length: bars }, (_, i) => band.chart[i % band.chart.length]);
  return {
    ...d,
    chart: d.chart?.length ? d.chart : chart,
    band: { style: band.style, ...(band.bass ? { bass: true } : {}) },
    ...(band.drums && !d.drums ? { drums: { groove: band.drums } } : {}),
  };
}

/** The first win of the keys course for a newcomer: C D E G over a soft band, the keys lit (a 4-bar melody). */
export function melodyDrill(): Drill {
  const row: [number, number, number][] = [
    // pitch, beat, length
    [60, 0, 1], [62, 1, 1], [64, 2, 1], [67, 3, 1],
    [67, 4, 2], [64, 6, 2],
    [60, 8, 1], [62, 9, 1], [64, 10, 1], [67, 11, 1],
    [60, 12, 4],
  ];
  const fingers: Record<number, number> = { 60: 1, 62: 2, 64: 3, 67: 5 };
  const notes: ExpNote[] = row.map(([pitch, beat, dur]) => ({ pitch, beat, dur, hand: 'R', finger: fingers[pitch] }));
  return {
    spec: { family: 'fingers', kind: 'taste-melody', key: 0, hands: 'R', tempo: 72 },
    itemId: 'fingers:taste-melody:0:R',
    title: { en: 'Your first melody: C D E G', he: 'המנגינה הראשונה: דו רה מי סול' },
    notes,
    beats: 16,
    meter: 4,
    keySig: 'C',
    goal: { evenness: false, hands: false },
    startBpm: 72,
    chart: ['C', 'Am', 'C', 'C'],
    band: { style: 'pop' },
  };
}

/** A playing taste as a queue of drills (a practice pad by microphone gets the single-surface time drills instead). */
export function tasteDrills(def: TasteDef, o: { drumPad?: boolean } = {}): Drill[] {
  if (def.run.kind === 'melody') return [melodyDrill()];
  if (def.run.kind !== 'drills') throw new Error(`${def.id} is not a playing taste`);
  const picks: TasteDrillPick[] = def.course === 'drums' && o.drumPad ? [{ level: 'd-time-1', items: [0, 2] }] : def.run.picks;
  const out: Drill[] = [];
  for (const p of picks) {
    const l = levelById(p.level);
    if (!l) continue;
    const all = levelDrills(l, 'difficulty');
    const chosen = p.match ? all.filter((d) => d.itemId.includes(p.match!)).slice(0, 1) : (p.items ?? [0]).map((i) => all[i]).filter(Boolean);
    for (const d of chosen.length ? chosen : all.slice(0, 1)) out.push(withBand(d, p.band));
  }
  return out;
}
