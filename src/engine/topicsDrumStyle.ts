// `drum-style` (DRUMS_NICHE_PLAN "Not built", optional): name the style of a band by ear — swing, shuffle, funk, bossa,
// samba, songo, reggae, 7/8 prog… The drums play the groove bank's pattern (grooves.ts) and the band engine (band.ts)
// plays with it: the comping in the style the groove calls for, a walking bass in swing and the waltz, else the root on
// every kick. Two bars, a choice of four. Drums course only (forPlays 'drums'); a new, additive topic id.
//
// Levels   1  rock · swing · bossa · reggae
//          2  + shuffle · funk · samba · jazz waltz
//          3  + songo · half-time shuffle · Afro 6/8 · 7/8 prog · maqsum
//          4  look-alikes: swing / shuffle / half-time shuffle, bossa / samba / songo, 7/8 / 5/4 / 9/8 …

import type { NoteEvent, PercKind, Stimulus } from './lesson';
import { TOPIC_GEN, choiceQ, rng, shuffleR, pickR } from './topicKit';
import { GROOVES, grooveHits, grooveSteps, stepSeconds, type Groove, type HitKind } from './grooves';
import { bandComping, walkingBass, type BandStyle } from './band';
import { chordAtBeat, parseChart } from './charts';

type Bi = { en: string; he: string };

export interface DrumStyle {
  id: string;
  name: Bi;
  /** Groove bank id (grooves.ts). */
  groove: string;
  band: BandStyle;
  /** Two bars of chart text (charts.ts). */
  chart: string;
}

export const DRUM_STYLES: DrumStyle[] = [
  { id: 'rock', name: { en: 'Rock', he: 'רוק' }, groove: 'rock-8', band: 'rock', chart: 'A | D' },
  { id: 'swing', name: { en: 'Swing', he: 'סווינג' }, groove: 'swing', band: 'swing', chart: 'Dm7 G7 | Cmaj7' },
  { id: 'bossa', name: { en: 'Bossa nova', he: 'בוסה נובה' }, groove: 'bossa', band: 'bossa', chart: 'Dm7 | G7' },
  { id: 'reggae', name: { en: 'Reggae', he: 'רגאיי' }, groove: 'reggae', band: 'reggae', chart: 'C | G' },
  { id: 'shuffle', name: { en: 'Shuffle', he: 'שאפל' }, groove: 'shuffle', band: 'shuffle', chart: 'A7 | D7' },
  { id: 'funk', name: { en: 'Funk', he: 'פאנק' }, groove: 'funk-1', band: 'funk', chart: 'E7 | E7' },
  { id: 'samba', name: { en: 'Samba', he: 'סמבה' }, groove: 'samba', band: 'latin', chart: 'Dm7 | A7' },
  { id: 'waltz', name: { en: 'Jazz waltz', he: 'ואלס ג׳אזי' }, groove: 'jazz-waltz', band: 'waltz', chart: 'Fmaj7 | Gm7 C7' },
  { id: 'songo', name: { en: 'Songo', he: 'סונגו' }, groove: 'songo', band: 'latin', chart: 'Cm7 | F7' },
  { id: 'halftime', name: { en: 'Half-time shuffle', he: 'שאפל חצי זמן' }, groove: 'purdie', band: 'pop', chart: 'G7 | C7' },
  { id: 'afro68', name: { en: 'Afro 6/8', he: 'אפרו 6/8' }, groove: '6-8-afro', band: 'hold', chart: 'Am | G' },
  { id: 'seven8', name: { en: '7/8 prog', he: 'פרוג ב־7/8' }, groove: 'seven-8', band: 'hold', chart: 'Em | C' },
  { id: 'maqsum', name: { en: 'Maqsum', he: 'מקסום' }, groove: 'maqsum', band: 'hold', chart: 'D | Eb' },
  // Look-alikes only (level 4).
  { id: 'five4', name: { en: '5/4', he: '5/4' }, groove: 'five-4', band: 'hold', chart: 'Dm | Am' },
  { id: 'nine8', name: { en: '9/8', he: '9/8' }, groove: 'nine-8', band: 'hold', chart: 'Em | D' },
  { id: 'cha', name: { en: 'Cha-cha', he: 'צ׳ה־צ׳ה' }, groove: 'cha-cha', band: 'latin', chart: 'C | G7' },
];
const BY_ID: Record<string, DrumStyle> = Object.fromEntries(DRUM_STYLES.map((s) => [s.id, s]));

/** The styles of each level (choices come from these). */
export const STYLE_POOL: string[][] = [
  ['rock', 'swing', 'bossa', 'reggae'],
  ['rock', 'swing', 'bossa', 'reggae', 'shuffle', 'funk', 'samba', 'waltz'],
  ['swing', 'bossa', 'reggae', 'shuffle', 'funk', 'samba', 'waltz', 'songo', 'halftime', 'afro68', 'seven8', 'maqsum'],
];
/** Level 4: groups that sound alike. */
export const LOOK_ALIKES: string[][] = [
  ['swing', 'shuffle', 'halftime'],
  ['bossa', 'samba', 'songo'],
  ['seven8', 'five4', 'nine8'],
  ['waltz', 'afro68', 'shuffle'],
  ['songo', 'cha', 'funk'],
  ['rock', 'funk', 'halftime'],
];

const PERC: Record<HitKind, PercKind> = { kick: 'kick', snare: 'snare', 'snare-soft': 'snare-soft', hat: 'hat', 'hat-open': 'hat-open', ride: 'ride', rim: 'rim', clap: 'snare', cowbell: 'ride-bell', shaker: 'hat' };
const grooveOf = (id: string): Groove => GROOVES.find((g) => g.id === id)!;

/** Two bars of the style: drums, the band's comping and its bass, as one events stimulus. */
export function styleSound(st: DrumStyle, seed: number, bars = 2): Stimulus {
  const g = grooveOf(st.groove);
  const n = grooveSteps(g);
  const step = stepSeconds(g, g.bpm);
  // The band counts the groove's beat: an eighth in x/8 grooves of one step per eighth, else `sub` steps.
  const perBeat = g.den === 8 && g.sub === 2 ? 1 : g.sub;
  const meter = n / perBeat;
  const beatS = step * perBeat;
  const ev: NoteEvent[] = [];
  const hits = grooveHits(g);
  for (let b = 0; b < bars; b++)
    for (const h of hits) ev.push({ midi: 60, start: (b * n + h.step) * step, duration: 0.12, velocity: h.kind === 'shaker' ? h.vel * 0.6 : h.vel, perc: PERC[h.kind] });
  const p = parseChart(st.chart, meter);
  const total = Math.min(p.bars, bars) * meter;
  if (p.chords.length) {
    for (const c of bandComping(p, meter, total, st.band, seed)) for (const m of c.notes) ev.push({ midi: m, start: c.beat * beatS, duration: Math.max(0.1, c.len * beatS * 0.9), velocity: c.vel * 0.55, inst: 'piano' });
    if (st.band === 'swing' || st.band === 'waltz') {
      for (const x of walkingBass(p, meter, total, seed)) ev.push({ midi: x.midi, start: x.beat * beatS, duration: beatS * (x.ghost ? 0.3 : 0.9), velocity: x.ghost ? 0.45 : 0.8, inst: 'bass' });
    } else {
      // The bass locks with the kick: the chord's root on every kick, held to the next one.
      const kicks = [...new Set(Array.from({ length: bars }, (_, b) => hits.filter((h) => h.kind === 'kick').map((h) => b * n + h.step)).flat())].sort((a, z) => a - z);
      kicks.forEach((k, i) => {
        const c = chordAtBeat(p, meter, k / perBeat);
        const pc = c ? c.bass : 9;
        let midi = 36 + (((pc - 36) % 12) + 12) % 12;
        if (midi > 45) midi -= 12;
        const next = kicks[i + 1] ?? bars * n;
        ev.push({ midi, start: k * step, duration: Math.max(0.12, (next - k) * step * 0.9), velocity: 0.8, inst: 'bass' });
      });
    }
  }
  return { kind: 'events', events: ev.sort((a, z) => a.start - z.start), length: bars * n * step + 0.3 };
}

TOPIC_GEN['drum-style'] = {
  title: { en: 'Name the style', he: 'זהו את הסגנון' },
  skill: 'rhythm-dictation',
  forPlays: ['drums'],
  levels: [
    { en: 'Rock, swing, bossa, reggae', he: 'רוק, סווינג, בוסה, רגאיי' },
    { en: '+ shuffle, funk, samba, jazz waltz', he: '+ שאפל, פאנק, סמבה, ואלס ג׳אזי' },
    { en: '+ songo, half-time shuffle, Afro 6/8, 7/8 prog, maqsum', he: '+ סונגו, שאפל חצי זמן, אפרו 6/8, פרוג ב־7/8, מקסום' },
    { en: 'Look-alikes: shuffle or swing, bossa or samba, 7/8 or 5/4', he: 'דומים: שאפל או סווינג, בוסה או סמבה, 7/8 או 5/4' },
  ],
  gen: (seed, level, id) => {
    const rnd = rng(seed);
    let pick: string[];
    if (level >= 4) {
      const group = pickR(rnd, LOOK_ALIKES);
      const extra = pickR(rnd, STYLE_POOL[2].filter((x) => !group.includes(x)));
      pick = [...group, extra];
    } else {
      pick = shuffleR(rnd, STYLE_POOL[Math.max(0, Math.min(2, level - 1))]).slice(0, 4);
    }
    const answer = level >= 4 ? pick[Math.floor(rnd() * 3)] : pick[0];
    const choices = shuffleR(rnd, pick);
    const names = Object.fromEntries(choices.map((c) => [c, BY_ID[c].name]));
    // One sound per choice (the asked one reused as the stimulus).
    const sounds: Record<string, Stimulus[]> = Object.fromEntries(choices.map((c) => [c, [styleSound(BY_ID[c], seed)]]));
    return choiceQ({
      id,
      topic: 'drum-style',
      level,
      seed,
      skill: 'rhythm-dictation',
      difficulty: 900 + 150 * level,
      ask: { en: 'Which style is the band playing?', he: 'באיזה סגנון הלהקה מנגנת?' },
      names,
      answer,
      choices,
      stimulus: sounds[answer],
      choiceStim: sounds,
    });
  },
};
