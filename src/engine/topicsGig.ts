// Intros and endings by ear (docs/AUDIT-DEPTH-3.md #12; the played side is drills/gigDrills.ts and ctxDrills.ts):
//   1 Which intro? — the I–vi–ii–V vamp, the iii–VI7–ii–V7 vamp, the tune's last four bars (iv7–♭VII7–I–VI7–ii–V7).
//   2 Which ending? — the Basie ending (ii–V–I, the 5–♯5–6 tag, the last hit), the iii–VI–ii–V tag ×3, ♭VI7–♭II7–I,
//     the Dameron turnaround.
//   3 All endings, close relatives side by side: ♭VImaj7–♭IImaj7–I vs ♭VI7–♭II7–I, the diminished walk-down, the tag.
// Standard jazz practice; every question in a random key, each choice playable.

import type { NoteEvent, Stimulus } from './lesson';
import { TOPIC_GEN, rng, pickR, choiceQ, eventsStim, nm } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';

type C = [number, number[], number];
const MAJ7 = [0, 4, 7, 11];
const M7 = [0, 3, 7, 10];
const D7 = [0, 4, 7, 10];
const SIX = [0, 4, 7, 9];
const DIM = [0, 3, 6, 9];
const mod = (n: number) => ((n % 12) + 12) % 12;

const twice = (xs: C[]): C[] => [...xs, ...xs];
const PROGS: Record<string, { chords: C[]; tag?: boolean; en: string; he: string; say: string[] }> = {
  vamp: { chords: [...twice([[0, MAJ7, 2], [9, M7, 2], [2, M7, 2], [7, D7, 2]]), [0, MAJ7, 4]], en: 'Intro: the I–vi–ii–V vamp', he: 'פתיחה: ואמפ I–vi–ii–V', say: ['one six two five', 'vamp'] },
  turn: { chords: [...twice([[4, M7, 2], [9, D7, 2], [2, M7, 2], [7, D7, 2]]), [0, MAJ7, 4]], en: 'Intro: the iii–VI7–ii–V7 vamp', he: 'פתיחה: ואמפ iii–VI7–ii–V7', say: ['three six two five'] },
  last4: { chords: [[5, M7, 4], [10, D7, 4], [0, MAJ7, 2], [9, D7, 2], [2, M7, 2], [7, D7, 2], [0, MAJ7, 4]], en: 'Intro: the last four bars', he: 'פתיחה: ארבע התיבות האחרונות', say: ['last four bars', 'last four'] },
  basie: { chords: [[2, M7, 4], [7, D7, 4], [0, SIX, 1]], tag: true, en: 'The Basie ending', he: 'סיום בייסי', say: ['basie', 'count basie'] },
  tag: { chords: [...twice([[4, M7, 2], [9, D7, 2], [2, M7, 2], [7, D7, 2]]), [4, M7, 2], [9, D7, 2], [2, M7, 2], [7, D7, 2], [0, MAJ7, 4]], en: 'The tag ×3', he: 'התג ×3', say: ['tag', 'three times'] },
  b6b2: { chords: [[2, M7, 4], [7, D7, 4], [8, D7, 2], [1, D7, 2], [0, MAJ7, 4]], en: '♭VI7–♭II7–I', he: '♭VI7–♭II7–I', say: ['flat six seven', 'flat six flat two'] },
  b6b2maj: { chords: [[2, M7, 4], [7, D7, 4], [8, MAJ7, 2], [1, MAJ7, 2], [0, MAJ7, 4]], en: '♭VImaj7–♭IImaj7–I', he: '♭VImaj7–♭IImaj7–I', say: ['flat six major', 'major sevenths'] },
  dameron: { chords: [...twice([[0, MAJ7, 2], [3, MAJ7, 2], [8, MAJ7, 2], [1, MAJ7, 2]]), [0, MAJ7, 4]], en: 'The Dameron turnaround', he: 'הטרנאראונד של דיימרון', say: ['dameron', 'lady bird'] },
  walkdown: { chords: [[4, M7, 4], [3, DIM, 4], [2, M7, 4], [7, D7, 4], [0, MAJ7, 4]], en: 'The diminished walk-down', he: 'הירידה הדימינישית', say: ['walk down', 'diminished'] },
};

/** The progression as events: the root low, the 3rd, 7th (6th) and 5th / 9th close around middle C; the Basie tag in the RH. */
export function progEvents(key: number, id: string, beat = 0.34): { ev: NoteEvent[]; len: number } {
  const p = PROGS[id];
  const ev: NoteEvent[] = [];
  let t = 0;
  for (const [d, iv, beats] of p.chords) {
    const root = mod(key + d);
    const bass = 36 + mod(root - 36);
    const up = [iv[1], iv[3], iv === D7 ? 14 : iv[2]].map((x) => 55 + mod(root + x - 55));
    for (const m of [bass, ...up]) ev.push({ midi: m, start: t, duration: beats * beat * 0.95, velocity: m === bass ? 0.5 : 0.36 });
    t += beats * beat;
  }
  if (p.tag) {
    const five = 64 + mod(key + 7 - 64);
    t += beat;
    [five, five + 1, five + 2].forEach((m, i) => ev.push({ midi: m, start: t + i * beat, duration: beat * 0.9, velocity: 0.6 }));
    t += 3 * beat + beat;
    const root = mod(key);
    for (const m of [36 + mod(root - 36), 55 + mod(root + 4 - 55), 55 + mod(root + 9 - 55), five + 5]) ev.push({ midi: m, start: t, duration: 4 * beat, velocity: 0.55 });
    t += 4 * beat;
  }
  return { ev, len: t + 0.3 };
}
const stim = (key: number, id: string, beat?: number): Stimulus => {
  const { ev, len } = progEvents(key, id, beat);
  return eventsStim(ev, len);
};

TOPIC_GEN['intro-ending'] = {
  title: { en: 'Intros and endings', he: 'פתיחות וסיומים' },
  skill: 'form',
  levels: [
    { en: 'Which intro?', he: 'איזו פתיחה?' },
    { en: 'Which ending?', he: 'איזה סיום?' },
    { en: 'Endings side by side', he: 'סיומים זה לצד זה' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = Math.floor(rnd() * 12);
    const pool = level === 1 ? ['vamp', 'turn', 'last4'] : level === 2 ? ['basie', 'tag', 'b6b2', 'dameron'] : ['b6b2', 'b6b2maj', 'walkdown', 'tag', 'dameron'];
    const answer = pickR(rnd, pool);
    const names: Record<string, ReturnType<typeof nm>> = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const p of pool) {
      names[p] = nm(PROGS[p].en, PROGS[p].he, ...PROGS[p].say);
      choiceStim[p] = [stim(key, p)];
    }
    return choiceQ({
      id,
      topic: 'intro-ending',
      level,
      seed,
      skill: 'form',
      difficulty: level === 1 ? 1330 : level === 2 ? 1420 : 1520,
      ask: level === 1 ? { en: 'The band starts — which intro?', he: 'הלהקה מתחילה — איזו פתיחה?' } : { en: 'The tune ends — which ending?', he: 'השיר נגמר — איזה סיום?' },
      names,
      answer,
      choices: pool,
      stimulus: [stim(key, answer, level === 3 ? 0.3 : 0.34)],
      choiceStim,
    });
  },
};
TOPIC_TAGS['intro-ending'] = tg(['form', 'song', 0.6], ['cadences', 'progression', 0.4]);
