// PIANO_JAZZ (2026-11-10): two keys-path topics that introduce the jazz-piano families' shapes before the drills
// measure them in time — Barry Harris's 6th-diminished chords and the jazz pianist's chord shapes. Answered on the keys
// (tap or MIDI), graded note for note in the exact octave. Pure and seeded: every item rebuilds from (topic, level, seed).

import type { PlaceQuestion, Stimulus } from './lesson';
import { placeInRange, placeKey } from './lesson';
import { TOPIC_GEN, rng, pickR, pcName, pcNameHe } from './topicKit';
import { TOPIC_TAGS, tg } from './taxonomy';

type Bi = { en: string; he: string };
const mod12 = (x: number) => ((x % 12) + 12) % 12;
function placeQ(p: Omit<PlaceQuestion, 'kind' | 'answer' | 'choices' | 'stimulus'> & { stimulus?: Stimulus[] }): PlaceQuestion {
  const q = { kind: 'place', choices: [], ...p, stimulus: p.stimulus ?? [], answer: '' } as PlaceQuestion;
  q.answer = placeKey(q, q.target, q.durs);
  return q;
}
/** A close chord of pitch classes from `bottom` up (each next one above the last). */
const stackUp = (bottom: number, pcs: number[]): number[] => {
  const out = [bottom];
  for (const x of pcs.slice(1)) {
    let p = out[out.length - 1] + 1;
    while (mod12(p) !== mod12(x)) p++;
    out.push(p);
  }
  return out;
};
const nm = (pc: number): Bi => ({ en: pcName(pc), he: pcNameHe(pc) });
const DIFF = [1100, 1200, 1300, 1400, 1500];

/** Barry Harris's 6th-diminished shapes: the 6th chord, its diminished, a block chord under a melody, borrowing, the dominant ♭9. */
TOPIC_GEN['key-sixdim'] = {
  title: { en: 'Barry Harris chords on the keys', he: 'האקורדים של בארי האריס על הקלידים' },
  skill: 'instrument',
  forPlays: ['keys'],
  levels: [
    { en: 'The 6th chord', he: 'אקורד השישית' },
    { en: 'The diminished on the 7th', he: 'המוקטן על הדרגה השביעית' },
    { en: 'A block chord under a melody note', he: 'אקורד בלוק מתחת לצליל מנגינה' },
    { en: 'Borrowing from the diminished', he: 'השאלה מהמוקטן' },
    { en: 'The dominant ♭9 from the diminished', he: 'הדומיננט ♭9 מתוך המוקטן' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const base = { id, topic: 'key-sixdim', level, seed, skill: 'instrument' as const, surface: 'keys' as const, instrument: 'keys' as const, match: 'exact' as const, as: 'set' as const, difficulty: DIFF[level - 1] };
    const key = level === 1 ? pickR(rnd, [0, 5, 7, 2, 10]) : Math.floor(rnd() * 12);
    const k = nm(key);
    const six = [key, key + 4, key + 7, key + 9];
    const dim = [key + 11, key + 2, key + 5, key + 8];
    if (level === 1) {
      const r = placeInRange(key, 55, 66);
      return placeQ({ ...base, ask: { en: `Build ${k.en}6 from its root: root, 3rd, 5th, 6th.`, he: `בנו ${k.en}6 מהיסוד: יסוד, טרצה, קווינטה, סקסטה.` }, target: stackUp(r, six), given: { midis: [r], key: null } });
    }
    if (level === 2) {
      const b = placeInRange(key + 11, 55, 66);
      return placeQ({ ...base, ask: { en: `The diminished of ${k.en}6: build ${pcName(key + 11)}°7 from the note given (minor 3rds).`, he: `המוקטן של ${k.en}6: בנו ${pcName(key + 11)}°7 מהצליל הנתון (טרצות קטנות).` }, target: stackUp(b, dim), given: { midis: [b], key: null } });
    }
    if (level === 3) {
      // A melody note of the 6th-diminished scale: the 6th chord's tones take the 6th chord, the others the diminished.
      const deg = Math.floor(rnd() * 8);
      const scale = [0, 2, 4, 5, 7, 8, 9, 11];
      const top = placeInRange(key + scale[deg], 67, 78);
      const pcs = (deg % 2 === 0 ? six : dim).map(mod12);
      const v = [top];
      for (let p = top - 1; v.length < 4; p--) if (pcs.includes(mod12(p))) v.push(p);
      const which = deg % 2 === 0 ? `${k.en}6` : `${pcName(key + 11)}°7`;
      return placeQ({ ...base, ask: { en: `In ${k.en}6 / ${pcName(key + 11)}°7: put ${which} under the melody note given, close.`, he: `ב-${k.en}6 / ${pcName(key + 11)}°7: שימו ${which} מתחת לצליל המנגינה הנתון, צמוד.` }, target: v.sort((a, b) => a - b), given: { midis: [top], key: null } });
    }
    if (level === 4) {
      // One voice of the 6th chord (root position) moves a half step to the diminished: root → 7, 3rd → 4th, 5th → ♭6, 6th → ♭6.
      const r = placeInRange(key, 55, 64);
      const v = stackUp(r, six);
      const j = Math.floor(rnd() * 4);
      const moves = [-1, 1, 1, -1];
      const names: Bi[] = [
        { en: 'root', he: 'היסוד' },
        { en: '3rd', he: 'הטרצה' },
        { en: '5th', he: 'הקווינטה' },
        { en: '6th', he: 'הסקסטה' },
      ];
      const moved = v.map((p, i) => (i === j ? p + moves[j] : p)).sort((a, b) => a - b);
      const to = nm(v[j] + moves[j]);
      return placeQ({ ...base, ask: { en: `${k.en}6 from its root, the ${names[j].en} borrowed from the diminished (${pcName(v[j])} → ${to.en}).`, he: `${k.en}6 מהיסוד, ${names[j].he} מושאלת מהמוקטן (${pcName(v[j])} → ${to.en}).` }, target: moved, given: { midis: [r], key: null } });
    }
    // 5: raise one note of the diminished a whole step — a 7♭9 rooted on it.
    const b = placeInRange(key + 11, 55, 64);
    const v = stackUp(b, dim);
    const j = Math.floor(rnd() * 4);
    const moved = v.map((p, i) => (i === j ? p + 2 : p)).sort((a, b2) => a - b2);
    const root = mod12(v[j] + 2);
    return placeQ({ ...base, ask: { en: `${pcName(key + 11)}°7 from the note given, then raise ${pcName(v[j])} a whole step: ${pcName(root)}7♭9.`, he: `${pcName(key + 11)}°7 מהצליל הנתון, ואז הרימו את ${pcName(v[j])} בטון: ${pcName(root)}7♭9.` }, target: moved, given: { midis: [b], key: null } });
  },
};
TOPIC_TAGS['key-sixdim'] = () => tg(['instrument', 'keyboard', 0.5], ['chords', 'barry', 0.5]);

const II_V_I: { iv: number[]; sym: string; b: number[] }[] = [
  // Rootless A (3 5 7 9 / 7 9 3 13 / 3 5 7 9) and B (7 9 3 5 / 3 13 7 9 / 7 9 3 5), as intervals above the chord root.
  { iv: [3, 7, 10, 14], sym: 'm9', b: [10, 14, 15, 19] },
  { iv: [10, 14, 16, 21], sym: '13', b: [4, 9, 10, 14] },
  { iv: [4, 7, 11, 14], sym: 'maj9', b: [11, 14, 16, 19] },
];
/** Jazz chords as shapes: rootless A / B, an upper-structure triad over a shell, So What, the altered rootless. */
TOPIC_GEN['key-jazz'] = {
  title: { en: 'Jazz chords on the keys', he: 'אקורדי ג׳אז על הקלידים' },
  skill: 'instrument',
  forPlays: ['keys'],
  levels: [
    { en: 'Rootless voicings, A form', he: 'קולות בלי יסוד, צורה A' },
    { en: 'Rootless voicings, B form', he: 'קולות בלי יסוד, צורה B' },
    { en: 'An upper-structure triad over a shell', he: 'משולש מבנה עליון מעל קונכייה' },
    { en: 'The So What chord', he: 'אקורד So What' },
    { en: 'The altered dominant, rootless', he: 'הדומיננט האלטרד, בלי יסוד' },
  ],
  gen(seed, level, id) {
    const rnd = rng(seed);
    const base = { id, topic: 'key-jazz', level, seed, skill: 'instrument' as const, surface: 'keys' as const, instrument: 'keys' as const, match: 'exact' as const, as: 'set' as const, difficulty: DIFF[level - 1] };
    const key = Math.floor(rnd() * 12);
    if (level <= 2) {
      const which = Math.floor(rnd() * 3);
      const c = II_V_I[which];
      const root = mod12(key + [2, 7, 0][which]);
      const iv = level === 1 ? c.iv : c.b;
      const bottom = placeInRange(root + iv[0], 48, 59);
      const tgt = iv.map((x) => bottom + x - iv[0]);
      const form = level === 1 ? 'A' : 'B';
      return placeQ({ ...base, ask: { en: `${pcName(root)}${c.sym}, rootless ${form} (ii–V–I in ${pcName(key)}), up from the note given.`, he: `${pcName(root)}${c.sym}, בלי יסוד ${form} (ii–V–I ב-${pcName(key)}), למעלה מהצליל הנתון.` }, target: tgt, given: { midis: [bottom], key: null, clef: 'bass' } });
    }
    if (level === 3) {
      // LH 3 and 7 of a dominant, RH a major triad: II (9 ♯11 13), ♭VI (♭13 R ♯9) or ♭V (♯11 7 ♭9).
      const t = pickR(rnd, [
        { d: 2, en: 'II', tens: '9 ♯11 13' },
        { d: 8, en: '♭VI', tens: '♭13 1 ♯9' },
        { d: 6, en: '♭V', tens: '♯11 7 ♭9' },
      ]);
      const r = key;
      const third = placeInRange(r + 4, 47, 58);
      const lh = [third, third + 6];
      const tri = [0, 4, 7].map((x) => r + t.d + x);
      const rh = stackUp(placeInRange(tri[0], lh[1] + 1, lh[1] + 12), tri);
      return placeQ({ ...base, ask: { en: `${pcName(r)}7: LH 3rd and 7th from the note given, RH the ${t.en} triad (${t.tens}).`, he: `${pcName(r)}7: ביד שמאל טרצה וספטימה מהצליל הנתון, בימין משולש ${t.en} (${t.tens}).` }, target: [...lh, ...rh], given: { midis: [third], key: null, clef: 'bass' } });
    }
    if (level === 4) {
      const b = placeInRange(key, 48, 57);
      return placeQ({ ...base, ask: { en: `So What on ${pcName(key)}: three perfect 4ths up from the note given, then a major 3rd.`, he: `So What על ${pcName(key)}: שלוש קוורטות זכות מהצליל הנתון, ואז טרצה גדולה.` }, target: [b, b + 5, b + 10, b + 15, b + 19], given: { midis: [b], key: null } });
    }
    // 5: X7alt rootless — 3, ♭7, ♯9, ♭13 from the 3rd.
    const third = placeInRange(key + 4, 50, 61);
    return placeQ({ ...base, ask: { en: `${pcName(key)}7alt without the root: 3rd, ♭7, ♯9, ♭13 up from the note given.`, he: `${pcName(key)}7alt בלי יסוד: טרצה, ♭7, ♯9, ♭13 למעלה מהצליל הנתון.` }, target: [third, third + 6, third + 11, third + 16], given: { midis: [third], key: null } });
  },
};
TOPIC_TAGS['key-jazz'] = (l) => tg(['instrument', 'keyboard', 0.5], ['chords', l === 5 || l === 3 ? 'extension' : 'voicing', 0.5]);
