// Lead-sheet analysis (0.57, exam gap 4: Bagrut jazz, Jerusalem Academy jazz): a standard's chords on the page —
//   L1 the key of the tune · L2 where the ii–Vs are · L3 what a chord does (dominant, secondary, tritone sub, ii).
// Chord progressions only (no melodies), the same changes as the Charts screen.
import { parseChart, type ChartChordEv, type ParsedChart } from './charts';
import { STANDARD_CHANGES } from './standards';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, nm } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';

const KEY_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const KEY_HE = ['דו', 'רה במול', 'רה', 'מי במול', 'מי', 'פה', 'פה דיאז', 'סול', 'לה במול', 'לה', 'סי במול', 'סי'];
/** The tunes and their home keys (as written in standards.ts). */
const TUNES: { id: string; key: number; minor?: boolean }[] = [
  { id: 'blues-f', key: 5 }, { id: 'blues-bb', key: 10 }, { id: 'minor-blues', key: 0, minor: true }, { id: 'bird-blues', key: 5 },
  { id: 'rhythm-full', key: 10 }, { id: 'autumn', key: 7, minor: true }, { id: 'a-train', key: 0 }, { id: 'satin', key: 0 },
  { id: 'attya', key: 8 }, { id: 'tune-up', key: 2 }, { id: 'never-another', key: 3 }, { id: 'misty', key: 3 },
  { id: 'blue-bossa', key: 0, minor: true }, { id: 'ipanema', key: 5 }, { id: 'song-father', key: 5, minor: true },
  { id: 'minor-bossa', key: 9, minor: true }, { id: 'solar', key: 0, minor: true }, { id: 'ladybird', key: 0 }, { id: 'stella', key: 10 },
];
const keyLabel = (k: number, minor?: boolean) => nm(`${KEY_NAMES[k]} ${minor ? 'minor' : 'major'}`, `${KEY_HE[k]} ${minor ? 'מינור' : 'מז׳ור'}`, `${KEY_NAMES[k]} ${minor ? 'minor' : 'major'}`);

const pcOf = (n: number) => ((n % 12) + 12) % 12;
const isMinor7 = (c: ChartChordEv) => c.iv.includes(3) && (c.iv.includes(10) || c.iv.includes(6));
const isDom = (c: ChartChordEv) => c.iv.includes(4) && c.iv.includes(10);

/** The chart as text on the page: "| Dm7 G7 | Cmaj7 |" in rows of four bars, bar numbers on each row. */
function pageOf(text: string, maxBars: number): string {
  const bars = text.replace(/\n/g, '|').split('|').map((b) => b.trim()).filter(Boolean).slice(0, maxBars);
  const rows: string[] = [];
  for (let i = 0; i < bars.length; i += 4) rows.push(`${i + 1}: | ${bars.slice(i, i + 4).join(' | ')} |`);
  return rows.join('\n');
}

/** ii–V pairs: a minor 7th (or half-diminished) followed by a dominant a fourth up. Bars are 1-based. */
export function twoFives(p: ParsedChart): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  for (let i = 0; i + 1 < p.chords.length; i++) {
    const a = p.chords[i];
    const b = p.chords[i + 1];
    if (isMinor7(a) && isDom(b) && pcOf(b.root - a.root) === 5) out.push({ from: a.bar + 1, to: b.bar + 1 });
  }
  return out;
}
const span = (x: { from: number; to: number }) => (x.from === x.to ? `${x.from}` : `${x.from}–${x.to}`);

type Fn = 'dominant' | 'secondary' | 'tritone' | 'two';
const FN_NAMES: Record<Fn, ReturnType<typeof nm>> = {
  dominant: nm('V of the key — it leads home', 'V של הסולם — מוביל הביתה', 'dominant'),
  secondary: nm('A secondary dominant — V of another chord', 'דומיננטה משנית — V של אקורד אחר', 'secondary dominant'),
  tritone: nm('A tritone substitute — it slides down a half step', 'תחליף טריטון — מחליק חצי טון למטה', 'tritone substitute'),
  two: nm('The ii of a ii–V', 'ה־ii של ii–V', 'two'),
};
/** What a chord does in its key, judged by where it goes. */
export function functionOf(c: ChartChordEv, next: ChartChordEv, key: number): Fn | null {
  if (isDom(c)) {
    if (pcOf(c.root - key) === 7 && pcOf(next.root - key) === 0) return 'dominant';
    if (pcOf(next.root - c.root) === 11) return 'tritone';
    if (pcOf(c.root - next.root) === 7 && pcOf(next.root - key) !== 0) return 'secondary';
    return null;
  }
  if (isMinor7(c) && isDom(next) && pcOf(next.root - c.root) === 5) return 'two';
  return null;
}

TOPIC_GEN['chart-analysis'] = {
  title: { en: 'Read a lead sheet', he: 'לקרוא ליד־שיט' },
  skill: 'cadences',
  levels: [
    { en: 'What key is the tune in?', he: 'באיזה סולם השיר?' },
    { en: 'Where are the ii–Vs?', he: 'איפה ה־ii–V?' },
    { en: 'What does this chord do?', he: 'מה האקורד הזה עושה?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const L = Math.min(3, Math.max(1, level));
    for (let attempt = 0; attempt < 40; attempt++) {
      const tune = pickR(rnd, TUNES);
      const s = STANDARD_CHANGES.find((x) => x.id === tune.id);
      if (!s) continue;
      const p = parseChart(s.text);
      const page = pageOf(s.text, 16);
      const shown = parseChart(s.text.replace(/\n/g, '|').split('|').slice(0, 16).join('|'));
      const text = { en: `${s.name}\n${page}`, he: `${s.name}\n${page}` };
      if (L === 1) {
        const answer = `${tune.key}${tune.minor ? 'm' : ''}`;
        const others = shuffleR(rnd, [pcOf(tune.key + 7), pcOf(tune.key + 5), pcOf(tune.key + (tune.minor ? 3 : 9)), pcOf(tune.key + 2)]).slice(0, 3).map((k, i) => `${k}${(i === 2) !== !!tune.minor ? 'm' : ''}`);
        const choices = shuffleR(rnd, [...new Set([answer, ...others])]);
        const names = Object.fromEntries(choices.map((c) => [c, keyLabel(Number(c.replace('m', '')), c.endsWith('m'))]));
        return choiceQ({
          id, topic: 'chart-analysis', level, seed, skill: 'cadences', difficulty: 1300,
          ask: { en: 'What key is this tune in? Look where it comes to rest — and at its V.', he: 'באיזה סולם השיר? חפשו איפה הוא נח — ואת ה־V שלו.' },
          text, names, answer, choices,
        });
      }
      if (L === 2) {
        const tf = twoFives(shown);
        if (!tf.length) continue;
        const right = pickR(rnd, tf);
        const pool: { from: number; to: number }[] = [];
        for (let b = 1; b < shown.bars; b++) {
          const x = { from: b, to: b + 1 };
          if (!tf.some((t) => span(t) === span(x)) && !tf.some((t) => t.from === b || t.to === b + 1)) pool.push(x);
        }
        if (pool.length < 3) continue;
        const answer = span(right);
        const choices = shuffleR(rnd, [answer, ...shuffleR(rnd, pool).slice(0, 3).map(span)]);
        const names = Object.fromEntries(choices.map((c) => [c, nm(`Bars ${c}`, `תיבות ${c}`, c)]));
        return choiceQ({
          id, topic: 'chart-analysis', level, seed, skill: 'cadences', difficulty: 1420,
          ask: { en: 'Which bars hold a ii–V (a minor 7th, then a dominant a fourth up)?', he: 'באילו תיבות יש ii–V (מינור 7, ואחריו דומיננטה קוורטה מעליו)?' },
          text, names, answer, choices,
        });
      }
      const cands = shown.chords.map((c, i) => ({ c, next: shown.chords[i + 1], i })).filter((x) => x.next && functionOf(x.c, x.next, tune.key) !== null);
      if (!cands.length) continue;
      const pick = pickR(rnd, cands);
      const answer = functionOf(pick.c, pick.next, tune.key)!;
      const choices = shuffleR(rnd, ['dominant', 'secondary', 'tritone', 'two'] as Fn[]);
      const names = Object.fromEntries(choices.map((c) => [c, FN_NAMES[c]]));
      return choiceQ({
        id, topic: 'chart-analysis', level, seed, skill: 'cadences', difficulty: 1540,
        ask: { en: `Bar ${pick.c.bar + 1}: ${pick.c.sym} (then ${pick.next.sym}). What does it do in ${KEY_NAMES[tune.key]}${tune.minor ? ' minor' : ''}?`, he: `תיבה ${pick.c.bar + 1}: ${pick.c.sym} (ואחריו ${pick.next.sym}). מה הוא עושה ב־${KEY_HE[tune.key]}${tune.minor ? ' מינור' : ''}?` },
        text, names, answer, choices,
      });
    }
    // never reached with the tunes above; a safe item
    return choiceQ({ id, topic: 'chart-analysis', level, seed, skill: 'cadences', difficulty: 1300, ask: { en: 'What key?', he: 'איזה סולם?' }, text: { en: 'Dm7 | G7 | Cmaj7', he: 'Dm7 | G7 | Cmaj7' }, names: { '0': keyLabel(0), '7': keyLabel(7) }, answer: '0', choices: ['0', '7'] });
  },
};
TOPIC_TAGS['chart-analysis'] = tg(['cadences', 'progression', 1]);
