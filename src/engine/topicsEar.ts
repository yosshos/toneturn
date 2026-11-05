// Ear topics (spec U.5–U.10): fine pitch, in tune, two voices, post-tonal sets, maqamat, Middle-Eastern
// rhythms, polyrhythm, odd meters, swing ratio. Pure, seeded. Quarter tones use fractional MIDI.

import type { ChoiceQuestion, NoteEvent, Stimulus } from './lesson';
import { TOPIC_GEN, rng, pickR, shuffleR, choiceQ, chordStim, notesStim, eventsStim, nm } from './topicKit';

const note = (midi: number, duration = 0.9): Stimulus => ({ kind: 'note', midi, duration });
const rest = (duration: number): Stimulus => ({ kind: 'rest', duration });

// ---------------------------------------------------------------- U.5 fine pitch & in tune

TOPIC_GEN['fine-pitch'] = {
  title: { en: 'Fine pitch: higher or lower?', he: 'גובה עדין: גבוה או נמוך?' },
  skill: 'notes',
  levels: [
    { en: 'Half a semitone (50¢)', he: 'רבע טון (50¢)' },
    { en: 'A quarter (25¢)', he: '25¢' },
    { en: 'Ten cents', he: 'עשרה סנט' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const cents = [50, 25, 10][Math.min(3, level) - 1];
    const m = 57 + Math.floor(rnd() * 12);
    const answer = rnd() < 0.5 ? 'higher' : 'lower';
    const play = (dir: string): Stimulus[] => [note(m), rest(0.25), note(m + ((dir === 'higher' ? 1 : -1) * cents) / 100)];
    return choiceQ({
      id, topic: 'fine-pitch', level, seed, skill: 'notes', difficulty: 1150 + 200 * level,
      ask: { en: 'Is the second note higher or lower?', he: 'הצליל השני גבוה או נמוך יותר?' },
      names: { higher: nm('Higher', 'גבוה יותר', 'up', 'sharp', 'גבוה'), lower: nm('Lower', 'נמוך יותר', 'down', 'flat', 'נמוך') },
      answer, choices: ['higher', 'lower'], stimulus: play(answer), choiceStim: { higher: play('higher'), lower: play('lower') },
    });
  },
};

TOPIC_GEN['in-tune'] = {
  title: { en: 'In tune or out of tune?', he: 'מכוון או לא מכוון?' },
  skill: 'notes',
  levels: [
    { en: 'An interval, clearly out', he: 'מרווח, סטייה ברורה' },
    { en: 'An interval, slightly out', he: 'מרווח, סטייה קלה' },
    { en: 'Which note of the melody?', he: 'איזה צליל במנגינה?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const m = 55 + Math.floor(rnd() * 10);
    if (level <= 2) {
      const iv = pickR(rnd, [4, 7, 12, 3]);
      const off = (level === 1 ? 35 : 15) * (rnd() < 0.5 ? 1 : -1);
      const answer = rnd() < 0.5 ? 'in' : 'out';
      const play = (k: string): Stimulus[] => [chordStim([m, m + iv + (k === 'out' ? off / 100 : 0)], 2.2)];
      return choiceQ({
        id, topic: 'in-tune', level, seed, skill: 'notes', difficulty: 1250 + 200 * level,
        ask: { en: 'Two notes together — in tune?', he: 'שני צלילים יחד — מכוונים?' },
        names: { in: nm('In tune', 'מכוון', 'tuned', 'yes', 'כן'), out: nm('Out of tune', 'לא מכוון', 'out', 'no', 'beating', 'לא') },
        answer, choices: ['in', 'out'], stimulus: play(answer), choiceStim: { in: play('in'), out: play('out') },
      });
    }
    const steps = [0, 2, 4, 5, 7];
    const bad = Math.floor(rnd() * 4) + 1;
    const off = 30 * (rnd() < 0.5 ? 1 : -1);
    const play = (k: number): Stimulus[] => [notesStim(steps.map((s, i) => m + s + (i === k ? off / 100 : 0)), 0.5)];
    const keys = ['n2', 'n3', 'n4', 'n5'];
    const ord = ['2nd', '3rd', '4th', '5th'];
    const ordHe = ['שני', 'שלישי', 'רביעי', 'חמישי'];
    const names: ChoiceQuestion['names'] = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    keys.forEach((k, i) => {
      names[k] = nm(`The ${ord[i]} note`, `הצליל ה${ordHe[i]}`, ord[i], ['second', 'third', 'fourth', 'fifth'][i], ordHe[i]);
      choiceStim[k] = play(i + 1);
    });
    return choiceQ({ id, topic: 'in-tune', level, seed, skill: 'notes', difficulty: 1600, ask: { en: 'One note is out of tune (30¢) — which?', he: 'צליל אחד לא מכוון (30¢) — איזה?' }, names, answer: keys[bad - 1], choices: keys, stimulus: play(bad), choiceStim });
  },
};

// ---------------------------------------------------------------- U.6 two voices

const MAJ = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];

TOPIC_GEN['two-voice'] = {
  title: { en: 'Two voices', he: 'שני קולות' },
  skill: 'sequences',
  levels: [
    { en: 'How do the voices move?', he: 'איך הקולות נעים?' },
    { en: 'The lower voice', he: 'הקול התחתון' },
    { en: 'The upper voice', he: 'הקול העליון' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const key = 53 + Math.floor(rnd() * 6);
    if (level === 1) {
      // Two dyads; degrees in the major scale (lower, upper).
      const motions: Record<string, [[number, number], [number, number]]> = {
        parallel: [[0, 2], [1, 3]],
        similar: [[0, 4], [1, 3 + 4]],
        contrary: [[2, 4], [1, 5]],
        oblique: [[0, 4], [0, 5]],
      };
      const shift = Math.floor(rnd() * 3);
      const dy = (d: [number, number]) => [key + MAJ[d[0] + shift], key + 12 + MAJ[d[1] + shift - (d[1] + shift > 9 ? 7 : 0)]];
      const play = (k: string): Stimulus[] => [chordStim(dy(motions[k][0]), 0.9), chordStim(dy(motions[k][1]), 1.3)];
      const keys = Object.keys(motions);
      const answer = pickR(rnd, keys);
      const choiceStim: Record<string, Stimulus[]> = {};
      for (const k of keys) choiceStim[k] = play(k);
      return choiceQ({
        id, topic: 'two-voice', level, seed, skill: 'sequences', difficulty: 1300,
        ask: { en: 'Two voices move — how?', he: 'שני קולות זזים — איך?' },
        names: {
          parallel: nm('Parallel', 'מקבילה', 'parallel motion', 'מקביל'),
          similar: nm('Similar', 'דומה', 'similar motion', 'same direction', 'אותו כיוון'),
          contrary: nm('Contrary', 'נגדית', 'contrary motion', 'opposite', 'הפוך'),
          oblique: nm('Oblique', 'אלכסונית', 'oblique motion', 'one stays', 'אחד נשאר'),
        },
        answer, choices: keys, stimulus: play(answer), choiceStim,
      });
    }
    // Levels 2–3: four two-voice notes; which line did the lower (or upper) voice sing?
    const n = 4;
    const line = (lo: number, hi: number): number[] => {
      const out = [lo + Math.floor(rnd() * (hi - lo + 1))];
      for (let i = 1; i < n; i++) out.push(Math.max(lo, Math.min(hi, out[i - 1] + pickR(rnd, [-2, -1, 1, 2]))));
      return out;
    };
    const target = level === 2 ? line(0, 4) : line(4, 9);
    const other = level === 2 ? line(5, 9) : line(0, 3);
    const lower = level === 2 ? target : other;
    const upper = level === 2 ? other : target;
    const decoys: number[][] = [];
    while (decoys.length < 3) {
      const d = target.slice();
      const k = 1 + Math.floor(rnd() * (n - 1));
      d[k] = Math.max(0, Math.min(9, d[k] + pickR(rnd, [-2, -1, 1, 2])));
      if (d.join() !== target.join() && !decoys.some((x) => x.join() === d.join())) decoys.push(d);
    }
    const label = (ds: number[]) => ds.map((x) => String(((x % 7) + 7) % 7 + 1)).join(' ');
    const all = [target, ...decoys];
    const keys = all.map((_, i) => `l${i}`);
    const names: ChoiceQuestion['names'] = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    all.forEach((ds, i) => {
      names[keys[i]] = nm(label(ds), label(ds));
      choiceStim[keys[i]] = [notesStim(ds.map((x) => key + (level === 2 ? 0 : 12) + MAJ[x]), 0.55)];
    });
    if (new Set(all.map(label)).size < all.length) return TOPIC_GEN['two-voice'].gen(seed + 1, level, id);
    const stimulus: Stimulus[] = lower.map((x, i) => chordStim([key + MAJ[x], key + 12 + MAJ[upper[i]]], 0.6));
    return choiceQ({
      id, topic: 'two-voice', level, seed, skill: 'sequences', difficulty: 1450 + 100 * level,
      ask: level === 2 ? { en: 'Which line did the lower voice sing? (scale degrees)', he: 'איזה קו שר הקול התחתון? (דרגות)' } : { en: 'Which line did the upper voice sing? (scale degrees)', he: 'איזה קו שר הקול העליון? (דרגות)' },
      names, answer: 'l0', choices: shuffleR(rnd, keys), stimulus, choiceStim,
    });
  },
};

// ---------------------------------------------------------------- U.7 post-tonal sets

const SETS: Record<string, { pcs: number[]; name: ReturnType<typeof nm> }> = {
  '012': { pcs: [0, 1, 2], name: nm('[0,1,2] cluster', '[0,1,2] קלאסטר', 'zero one two', 'chromatic cluster', 'cluster', 'קלאסטר') },
  '013': { pcs: [0, 1, 3], name: nm('[0,1,3]', '[0,1,3]', 'zero one three') },
  '014': { pcs: [0, 1, 4], name: nm('[0,1,4]', '[0,1,4]', 'zero one four') },
  '015': { pcs: [0, 1, 5], name: nm('[0,1,5]', '[0,1,5]', 'zero one five') },
  '016': { pcs: [0, 1, 6], name: nm('[0,1,6] Viennese', '[0,1,6] וינאי', 'zero one six', 'viennese', 'וינאי') },
  '024': { pcs: [0, 2, 4], name: nm('[0,2,4] whole-tone', '[0,2,4] טון שלם', 'zero two four', 'whole tone') },
  '025': { pcs: [0, 2, 5], name: nm('[0,2,5]', '[0,2,5]', 'zero two five') },
  '026': { pcs: [0, 2, 6], name: nm('[0,2,6]', '[0,2,6]', 'zero two six', 'italian sixth') },
  '027': { pcs: [0, 2, 7], name: nm('[0,2,7] quartal', '[0,2,7] קוורטלי', 'zero two seven', 'quartal', 'fourths') },
  '036': { pcs: [0, 3, 6], name: nm('[0,3,6] diminished', '[0,3,6] מוקטן', 'zero three six', 'diminished triad', 'diminished', 'מוקטן') },
  '037': { pcs: [0, 3, 7], name: nm('[0,3,7] triad', '[0,3,7] משולש', 'zero three seven', 'major or minor triad', 'triad', 'משולש') },
  '048': { pcs: [0, 4, 8], name: nm('[0,4,8] augmented', '[0,4,8] מוגדל', 'zero four eight', 'augmented triad', 'augmented', 'מוגדל') },
};
const SET_LEVELS = [['012', '027', '036', '048'], ['014', '015', '016', '026'], ['013', '014', '024', '025', '026', '037']];

/** A set class heard in a random transposition, sometimes inverted, in a random spacing. */
function setVoicing(rnd: () => number, pcs: number[]): number[] {
  const inv = rnd() < 0.5;
  const t = Math.floor(rnd() * 12);
  return pcs.map((p) => 55 + ((((inv ? -p : p) + t) % 12) + 12) % 12 + (rnd() < 0.3 ? 12 : 0)).sort((a, b) => a - b);
}

TOPIC_GEN['set-classes'] = {
  title: { en: 'Post-tonal: trichords', he: 'פוסט־טונלי: טריכורדים' },
  skill: 'chords',
  levels: [
    { en: 'Four distinct colours', he: 'ארבעה צבעים שונים' },
    { en: 'Semitone sets', he: 'סטים עם חצי טון' },
    { en: 'Six close sets', he: 'שישה סטים קרובים' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const pool = SET_LEVELS[Math.min(3, level) - 1];
    const answer = pickR(rnd, pool);
    const names: ChoiceQuestion['names'] = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const k of pool) {
      names[k] = SETS[k].name;
      const v = setVoicing(rng(seed ^ k.charCodeAt(2)), SETS[k].pcs);
      choiceStim[k] = [chordStim(v, 1.3), { kind: 'chord', midis: v, duration: 1.4, arpeggio: true }];
    }
    const v = setVoicing(rnd, SETS[answer].pcs);
    return choiceQ({
      id, topic: 'set-classes', level, seed, skill: 'chords', difficulty: 1400 + 150 * level,
      ask: { en: 'Which set class (prime form)?', he: 'איזה סט (צורה ראשונית)?' },
      names, answer, choices: pool, stimulus: [chordStim(v, 1.3), { kind: 'chord', midis: v, duration: 1.4, arpeggio: true }], choiceStim,
    });
  },
};

// ---------------------------------------------------------------- U.8 maqamat (quarter tones)

const MAQAM: Record<string, { tonic: number; steps: number[]; name: ReturnType<typeof nm> }> = {
  rast: { tonic: 60, steps: [0, 2, 3.5, 5, 7, 9, 10.5, 12], name: nm('Rast', 'ראסט', 'rast', 'ראסט') },
  bayati: { tonic: 62, steps: [0, 1.5, 3, 5, 7, 8, 10, 12], name: nm('Bayati', 'ביאתי', 'bayati', 'bayat', 'ביאת') },
  saba: { tonic: 62, steps: [0, 1.5, 3, 4, 7, 8, 10, 12], name: nm('Saba', 'סבא', 'saba', 'סאבא') },
  sikah: { tonic: 63.5, steps: [0, 1.5, 3.5, 5.5, 7, 8.5, 10.5, 12], name: nm('Sikah', 'סיקה', 'sikah', 'segah', 'סיגה') },
  hijaz: { tonic: 62, steps: [0, 1, 4, 5, 7, 8, 10, 12], name: nm('Hijaz', 'חיג׳אז', 'hijaz', 'hejaz', 'חג׳אז') },
  nahawand: { tonic: 60, steps: [0, 2, 3, 5, 7, 8, 11, 12], name: nm('Nahawand', 'נהוונד', 'nahawand', 'nahawand minor', 'נאהוונד') },
  kurd: { tonic: 62, steps: [0, 1, 3, 5, 7, 8, 10, 12], name: nm('Kurd', 'כורד', 'kurd', 'kurdi', 'כורדי') },
  ajam: { tonic: 58, steps: [0, 2, 4, 5, 7, 9, 11, 12], name: nm('Ajam', 'עג׳ם', 'ajam', 'אג׳ם') },
};
const MAQAM_LEVELS = [['hijaz', 'nahawand', 'kurd', 'ajam'], ['rast', 'bayati', 'saba', 'sikah', 'hijaz']];
const JINS: Record<string, number[]> = { rast: [0, 2, 3.5, 5], bayati: [0, 1.5, 3, 5], hijaz: [0, 1, 4, 5], saba: [0, 1.5, 3, 4], nahawand: [0, 2, 3, 5], kurd: [0, 1, 3, 5], ajam: [0, 2, 4, 5] };

TOPIC_GEN['maqam'] = {
  title: { en: 'Maqamat', he: 'מקאמים' },
  skill: 'modes',
  levels: [
    { en: 'Hijaz, Nahawand, Kurd, Ajam', he: 'חיג׳אז, נהוונד, כורד, עג׳ם' },
    { en: 'With quarter tones: Rast, Bayati, Saba, Sikah', he: 'עם רבעי טונים: ראסט, ביאתי, סבא, סיקה' },
    { en: 'Which jins (first four notes)?', he: 'איזה ג׳ינס (ארבעת הצלילים הראשונים)?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    if (level <= 2) {
      const pool = MAQAM_LEVELS[level - 1];
      const answer = pickR(rnd, pool);
      const play = (k: string): Stimulus[] => {
        const m = MAQAM[k].steps.map((s) => MAQAM[k].tonic + s);
        return [notesStim(m, 0.34), notesStim(m.slice().reverse().slice(1), 0.34)];
      };
      const names: ChoiceQuestion['names'] = {};
      const choiceStim: Record<string, Stimulus[]> = {};
      for (const k of pool) {
        names[k] = MAQAM[k].name;
        choiceStim[k] = play(k);
      }
      return choiceQ({ id, topic: 'maqam', level, seed, skill: 'modes', difficulty: 1350 + 200 * level, ask: { en: 'Which maqam?', he: 'איזה מקאם?' }, names, answer, choices: shuffleR(rnd, pool), stimulus: play(answer), choiceStim });
    }
    const all = Object.keys(JINS);
    const answer = pickR(rnd, all);
    const pool = shuffleR(rnd, [answer, ...shuffleR(rnd, all.filter((k) => k !== answer)).slice(0, 3)]);
    const t = 60 + Math.floor(rnd() * 4);
    const play = (k: string): Stimulus[] => [notesStim([...JINS[k], ...JINS[k].slice(0, 3).reverse()].map((s) => t + s), 0.38)];
    const names: ChoiceQuestion['names'] = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const k of pool) {
      names[k] = MAQAM[k].name;
      choiceStim[k] = play(k);
    }
    return choiceQ({ id, topic: 'maqam', level, seed, skill: 'modes', difficulty: 1800, ask: { en: 'Which jins?', he: 'איזה ג׳ינס?' }, names, answer, choices: pool, stimulus: play(answer), choiceStim });
  },
};

// ---------------------------------------------------------------- rhythm helpers

const DUM = 43;
const TEK = 79;
/** A drum pattern: D dum, T tek, - rest, on a grid of `step` seconds, repeated. */
function drum(pattern: string, step: number, times: number): Stimulus {
  const ev: NoteEvent[] = [];
  const p = pattern.replace(/\s/g, '');
  for (let r = 0; r < times; r++)
    p.split('').forEach((ch, i) => {
      const t = (r * p.length + i) * step;
      if (ch === 'D') ev.push({ midi: DUM, start: t, duration: 0.18, velocity: 0.85 });
      if (ch === 'T') ev.push({ midi: TEK, start: t, duration: 0.06, velocity: 0.55 });
      if (ch === 'A') ev.push({ midi: TEK, start: t, duration: 0.06, velocity: 0.9 });
      if (ch === 't') ev.push({ midi: TEK, start: t, duration: 0.05, velocity: 0.3 });
    });
  return eventsStim(ev, p.length * times * step + 0.2);
}

// ---------------------------------------------------------------- U.9 Middle-Eastern rhythms

const IQA: Record<string, { p: string; name: ReturnType<typeof nm> }> = {
  maqsum: { p: 'DT-TD-T-', name: nm('Maqsum', 'מקסום', 'maqsum', 'maksum', 'מקסום') },
  baladi: { p: 'DD-TD-T-', name: nm('Baladi', 'בלדי', 'baladi', 'masmoudi saghir', 'בלאדי') },
  saidi: { p: 'DT-DD-T-', name: nm('Saidi', 'סעידי', 'saidi', 'צעידי') },
  malfuf: { p: 'D--T--T-', name: nm('Malfuf', 'מלפוף', 'malfuf', 'מלפוף') },
  samai: { p: 'D--T-DDT--', name: nm('Samai (10/8)', 'סמאעי (10/8)', 'samai', 'samai thaqil', 'ten eight', 'סמאעי') },
  karsilama: { p: 'D-T-D-TTT', name: nm('Karsilama (9/8)', 'קרשילמה (9/8)', 'karsilama', 'nine eight', 'קרסילמה') },
};

TOPIC_GEN['eastern-rhythm'] = {
  title: { en: 'Middle-Eastern rhythms (iqa‘at)', he: 'מקצבים מזרחיים (איקאעאת)' },
  skill: 'rhythm',
  levels: [
    { en: 'Maqsum, Baladi, Saidi, Malfuf', he: 'מקסום, בלדי, סעידי, מלפוף' },
    { en: 'With 10/8 and 9/8', he: 'עם 10/8 ו־9/8' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const pool = level === 1 ? ['maqsum', 'baladi', 'saidi', 'malfuf'] : ['maqsum', 'saidi', 'samai', 'karsilama'];
    const answer = pickR(rnd, pool);
    const step = level === 1 ? 0.2 : 0.17;
    const names: ChoiceQuestion['names'] = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const k of pool) {
      names[k] = IQA[k].name;
      choiceStim[k] = [drum(IQA[k].p, step, 2)];
    }
    return choiceQ({ id, topic: 'eastern-rhythm', level, seed, skill: 'rhythm', difficulty: 1250 + 200 * level, ask: { en: 'Which rhythm? (low = dum, high = tek)', he: 'איזה מקצב? (נמוך = דום, גבוה = תק)' }, names, answer, choices: shuffleR(rnd, pool), stimulus: [drum(IQA[answer].p, step, 3)], choiceStim });
  },
};

// ---------------------------------------------------------------- U.10 advanced rhythm

function poly(a: number, b: number, cycle: number, times: number): Stimulus {
  const ev: NoteEvent[] = [];
  for (let r = 0; r < times; r++) {
    for (let i = 0; i < a; i++) ev.push({ midi: 84, start: r * cycle + (i * cycle) / a, duration: 0.05, velocity: i ? 0.5 : 0.7 });
    for (let i = 0; i < b; i++) ev.push({ midi: 45, start: r * cycle + (i * cycle) / b, duration: 0.12, velocity: i ? 0.6 : 0.8 });
  }
  return eventsStim(ev, cycle * times + 0.2);
}
const POLY: Record<string, [number, number, ReturnType<typeof nm>]> = {
  '2:1': [2, 1, nm('2 against 1', '2 נגד 1', 'two against one', 'two one')],
  '3:2': [3, 2, nm('3 against 2', '3 נגד 2', 'three against two', 'hemiola', 'three two')],
  '4:3': [4, 3, nm('4 against 3', '4 נגד 3', 'four against three', 'four three')],
  '5:4': [5, 4, nm('5 against 4', '5 נגד 4', 'five against four', 'five four')],
  '5:3': [5, 3, nm('5 against 3', '5 נגד 3', 'five against three', 'five three')],
};

TOPIC_GEN['polyrhythm'] = {
  title: { en: 'Polyrhythms', he: 'פולי־ריתמים' },
  skill: 'rhythm',
  levels: [
    { en: '2:1, 3:2, 4:3', he: '2:1, 3:2, 4:3' },
    { en: '3:2, 4:3, 5:4, 5:3', he: '3:2, 4:3, 5:4, 5:3' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const pool = level === 1 ? ['2:1', '3:2', '4:3'] : ['3:2', '4:3', '5:4', '5:3'];
    const answer = pickR(rnd, pool);
    const names: ChoiceQuestion['names'] = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const k of pool) {
      names[k] = POLY[k][2];
      choiceStim[k] = [poly(POLY[k][0], POLY[k][1], 1.5, 2)];
    }
    return choiceQ({ id, topic: 'polyrhythm', level, seed, skill: 'rhythm', difficulty: 1300 + 200 * level, ask: { en: 'High against low — which polyrhythm?', he: 'גבוה נגד נמוך — איזה פולי־ריתם?' }, names, answer, choices: pool, stimulus: [poly(POLY[answer][0], POLY[answer][1], 1.5, 3)], choiceStim });
  },
};

/** Odd meters: an accent at each group start (stronger on the downbeat). */
function meter(groups: number[], step: number, bars: number): Stimulus {
  const ev: NoteEvent[] = [];
  const len = groups.reduce((a, b) => a + b, 0);
  for (let b = 0; b < bars; b++) {
    let i = 0;
    groups.forEach((g, gi) => {
      for (let k = 0; k < g; k++, i++) {
        const t = (b * len + i) * step;
        if (k === 0) ev.push({ midi: gi === 0 ? 45 : 50, start: t, duration: 0.12, velocity: gi === 0 ? 0.85 : 0.65 });
        ev.push({ midi: 84, start: t, duration: 0.04, velocity: k === 0 ? 0.6 : 0.3 });
      }
    });
  }
  return eventsStim(ev, bars * len * step + 0.2);
}
const METERS: Record<string, [number[], ReturnType<typeof nm>]> = {
  '5/8': [[3, 2], nm('5/8', '5/8', 'five eight', 'five')],
  '6/8': [[3, 3], nm('6/8', '6/8', 'six eight', 'six')],
  '7/8': [[2, 2, 3], nm('7/8', '7/8', 'seven eight', 'seven')],
  '9/8': [[2, 2, 2, 3], nm('9/8 (2+2+2+3)', '9/8 (2+2+2+3)', 'nine eight', 'aksak', 'nine')],
  '11/8': [[2, 2, 3, 2, 2], nm('11/8', '11/8', 'eleven eight', 'eleven')],
  g223: [[2, 2, 3], nm('2+2+3', '2+2+3', 'two two three')],
  g322: [[3, 2, 2], nm('3+2+2', '3+2+2', 'three two two')],
  g232: [[2, 3, 2], nm('2+3+2', '2+3+2', 'two three two')],
};

TOPIC_GEN['odd-meter'] = {
  title: { en: 'Odd meters', he: 'משקלים אי־זוגיים' },
  skill: 'rhythm',
  levels: [
    { en: '5/8, 6/8 or 7/8?', he: '5/8, 6/8 או 7/8?' },
    { en: 'How is the 7/8 grouped?', he: 'איך מחולק ה־7/8?' },
    { en: '5, 7, 9 or 11?', he: '5, 7, 9 או 11?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const pool = level === 1 ? ['5/8', '6/8', '7/8'] : level === 2 ? ['g223', 'g322', 'g232'] : ['5/8', '7/8', '9/8', '11/8'];
    const answer = pickR(rnd, pool);
    const step = 0.17;
    const names: ChoiceQuestion['names'] = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const k of pool) {
      names[k] = METERS[k][1];
      choiceStim[k] = [meter(METERS[k][0], step, 2)];
    }
    return choiceQ({ id, topic: 'odd-meter', level, seed, skill: 'rhythm', difficulty: 1250 + 150 * level, ask: { en: 'Which meter?', he: 'איזה משקל?' }, names, answer, choices: pool, stimulus: [meter(METERS[answer][0], step, 4)], choiceStim });
  },
};

/** Eighth-note pairs at a swing ratio (long:short), a bass note on each beat. */
function swing(ratio: number, beat: number, beats: number): Stimulus {
  const ev: NoteEvent[] = [];
  const long = (beat * ratio) / (ratio + 1);
  for (let b = 0; b < beats; b++) {
    const t = b * beat;
    ev.push({ midi: 41 + (b % 4 === 0 ? 0 : 5), start: t, duration: beat * 0.8, velocity: 0.6 });
    ev.push({ midi: 82, start: t, duration: 0.05, velocity: 0.55 });
    ev.push({ midi: 82, start: t + long, duration: 0.05, velocity: 0.4 });
  }
  return eventsStim(ev, beats * beat + 0.2);
}
const SWING: Record<string, [number, ReturnType<typeof nm>]> = {
  straight: [1, nm('Straight', 'ישר', 'straight eighths', 'even', 'ישר')],
  swing: [2, nm('Swing', 'סווינג', 'swung', 'swing eighths', 'סווינג')],
  light: [1.5, nm('Light swing (3:2)', 'סווינג קל (3:2)', 'light swing', 'light', 'קל')],
  triplet: [2, nm('Triplet swing (2:1)', 'סווינג טריולי (2:1)', 'triplet swing', 'triplet', 'טריולה')],
  hard: [3, nm('Hard swing (3:1)', 'סווינג חזק (3:1)', 'hard swing', 'dotted', 'shuffle', 'חזק')],
};

TOPIC_GEN['swing-ratio'] = {
  title: { en: 'Swing feel', he: 'תחושת סווינג' },
  skill: 'rhythm',
  levels: [
    { en: 'Straight or swing?', he: 'ישר או סווינג?' },
    { en: 'How much swing?', he: 'כמה סווינג?' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const pool = level === 1 ? ['straight', 'swing'] : ['straight', 'light', 'triplet', 'hard'];
    const answer = pickR(rnd, pool);
    const beat = 60 / (level === 1 ? 120 : 132);
    const names: ChoiceQuestion['names'] = {};
    const choiceStim: Record<string, Stimulus[]> = {};
    for (const k of pool) {
      names[k] = SWING[k][1];
      choiceStim[k] = [swing(SWING[k][0], beat, 4)];
    }
    return choiceQ({ id, topic: 'swing-ratio', level, seed, skill: 'rhythm', difficulty: 1150 + 250 * level, ask: { en: 'How are the eighth notes played?', he: 'איך מנוגנות השמיניות?' }, names, answer, choices: pool, stimulus: [swing(SWING[answer][0], beat, 8)], choiceStim });
  },
};
