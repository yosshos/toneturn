// AUDIT-SCALES §4 (owner 2026-11-14): the gaps in the guitar's standard technique list, all in 12 keys inside the
// fretboard — Segovia-style scales (a diagonal with position shifts, rest strokes i-m), interval shapes across string
// pairs (the B-string shift), octaves Wes-style (thumb, the string between muted), hybrid picking and chicken-pickin'
// in every key, and five ORIGINAL riffs in common styles (blues shuffle, rock power chords, funk 16ths, metal gallop,
// country chicken-pickin'). Every riff is written here from scratch; none is taken from a song.
//
// Pure and deterministic. guitar.ts imports this file: its helpers are only called inside functions.

import type { Drill, DrillSpec, FamilyId } from './types';
import type { SpecTemplate } from './generate';
import { noteAt, type Tuning } from '../fretboard';
import { finish, t, mod, NAMES, SIG, MAX_FRET, lowFret, type Ev, type GN, type GuitarLevelDef, type T2 } from './guitar';

export const TECH_KINDS: Record<string, string[]> = {
  'g-scales': ['segovia', 'interval-shapes'],
  'g-lead': ['wes-octaves'],
  'g-picking': ['hybrid-riff'],
  'g-rhythm': ['style-riff'],
};
const OWN = new Set(Object.entries(TECH_KINDS).flatMap(([f, ks]) => ks.map((k) => `${f}:${k}`)));
const MAJ = [0, 2, 4, 5, 7, 9, 11];
const MEL = [0, 2, 3, 5, 7, 9, 11];
const openOf = (tu: Tuning, s: number) => noteAt(tu, s, 0);
const kn = (key: number) => NAMES[mod(key, 12)];
const T = (en: string, he: string, key: number): T2 => t(`${en} · ${kn(key)}`, `${he} · ${kn(key)}`);
const seq = (gs: GN[], unit: number, start = 0): Ev[] => gs.map((g, i) => ({ beat: start + i * unit, dur: i === gs.length - 1 ? Math.max(1, unit) : unit, notes: [g] }));

/** A scale run placed on a diagonal: up to 4 notes per string, the hand shifting up as it crosses to thinner strings. */
function diagonal(tu: Tuning, pitches: number[], f0: number, s0?: number): GN[] {
  const out: GN[] = [];
  let s = s0 ?? tu.open.length;
  let lo = Math.max(0, f0 - 1);
  for (const p of pitches) {
    let f = p - openOf(tu, s);
    let count = out.filter((g) => g.s === s).length;
    if (f > lo + 4 || count >= 4) {
      // cross to the next string and shift the hand up (a slide on the first finger)
      s = Math.max(1, s - 1);
      f = p - openOf(tu, s);
      count = 0;
      const shifted = f - 1 > lo;
      if (shifted) lo = Math.max(0, f - 1);
      out.push({ s, f, finger: Math.min(4, Math.max(1, f - lo + 1)), pos: lo, ...(shifted ? { tech: 'slide' as const } : {}) });
      continue;
    }
    out.push({ s, f, finger: Math.min(4, Math.max(1, f - lo + 1)), pos: lo });
  }
  return out;
}

export function generateTech(s: DrillSpec, tu: Tuning): Drill | null {
  if (!OWN.has(`${s.family}:${s.kind}`)) return null;
  const key = mod(s.key, 12);
  const o = s.option ?? 0;
  const r6 = lowFret(tu, key, 6);
  const r5 = lowFret(tu, key, 5);
  switch (s.kind) {
    case 'segovia': {
      // 0 = major, 1 = melodic minor (natural coming down), 2 = major over 3 octaves where the neck allows (else 2).
      const minor = o === 1;
      let octs = o === 2 ? 3 : 2;
      let rootStr = 6;
      let root = openOf(tu, 6) + r6;
      // 3 octaves where the neck allows; else (option 2) two octaves from the root on string 5, a different fingering.
      if (root + 12 * octs - openOf(tu, 1) > MAX_FRET) {
        octs = 2;
        if (o === 2) {
          rootStr = 5;
          root = openOf(tu, 5) + (r5 < 1 ? 12 : r5);
        }
      }
      const up = Array.from({ length: 7 * octs + 1 }, (_, k) => root + 12 * Math.floor(k / 7) + (minor ? MEL : MAJ)[k % 7]);
      const downInts = minor ? [0, 2, 3, 5, 7, 8, 10] : MAJ;
      const down = Array.from({ length: 7 * octs }, (_, i) => {
        const k = 7 * octs - 1 - i;
        return root + 12 * Math.floor(k / 7) + downInts[k % 7];
      });
      const gUp = diagonal(tu, up, root - openOf(tu, rootStr), rootStr);
      const placeOf = new Map(gUp.map((g) => [noteAt(tu, g.s, g.f), g]));
      const gDown = down.map((p): GN => {
        const g = placeOf.get(p);
        if (g) return { ...g, tech: undefined };
        // melodic minor coming down: the lowered 6th / 7th a fret under the raised one
        const hi = placeOf.get(p + 1)!;
        if (hi.f >= 1) return { s: hi.s, f: hi.f - 1, pos: hi.pos };
        const s2 = Math.min(tu.open.length, hi.s + 1);
        return { s: s2, f: p - openOf(tu, s2) };
      });
      const all = [...gUp, ...gDown].map((g, i) => ({ ...g, stroke: (i % 2 === 0 ? 'i' : 'm') as 'i' | 'm', tech: g.tech === 'slide' ? ('slide' as const) : ('rest-stroke' as const) }));
      const nm = minor ? t('melodic minor', 'מינור מלודי') : t('major', 'מז׳ור');
      return finish(s, tu, seq(all, 0.5), { title: T(`Segovia-style scale: ${nm.en}, ${octs} octaves on a diagonal, rest strokes i-m`, `סולם בסגנון סגוביה: ${nm.he}, ${octs} אוקטבות באלכסון, מכה נשענת i-m`, key), bpm: 60, keySig: SIG[mod(key + (minor ? 3 : 0), 12)] });
    }
    case 'interval-shapes': {
      // One interval on every adjacent string pair (octaves: skip a string), low to high and back: broken, then together.
      // The shape moves a fret up where the pair crosses the G–B major 3rd.
      const IV = [
        { semi: 4, en: 'major 3rds', he: 'טרצות גדולות', skip: 1 },
        { semi: 5, en: 'perfect 4ths', he: 'קוורטות זכות', skip: 1 },
        { semi: 7, en: 'perfect 5ths', he: 'קווינטות זכות', skip: 1 },
        { semi: 9, en: 'major 6ths', he: 'סקסטות גדולות', skip: 2 },
        { semi: 12, en: 'octaves', he: 'אוקטבות', skip: 2 },
      ][Math.min(4, o)];
      const evs: Ev[] = [];
      let b = 0;
      const pairs: [number, number][] = [];
      for (let lowS = 6; lowS - IV.skip >= 1; lowS--) pairs.push([lowS, lowS - IV.skip]);
      const order = [...pairs, ...pairs.slice(0, -1).reverse()];
      for (const [a, c] of order) {
        const fa = lowFret(tu, key, a) || 12;
        const fc = noteAt(tu, a, fa) + IV.semi - openOf(tu, c);
        if (fc < 0 || fc > MAX_FRET) continue;
        evs.push({ beat: b, dur: 0.5, notes: [{ s: a, f: fa }] }, { beat: b + 0.5, dur: 0.5, notes: [{ s: c, f: fc }] }, { beat: b + 1, dur: 1, notes: [{ s: a, f: fa }, { s: c, f: fc }] });
        b += 2;
      }
      return finish(s, tu, evs, { title: T(`Interval shapes across the strings: ${IV.en}, broken then together`, `צורות מרווחים לרוחב המיתרים: ${IV.he}, שבור ואז יחד`, key), bpm: 70 });
    }
    case 'wes-octaves': {
      // Our melody in octaves, thumb downstrokes, the string between muted: 0 = strings 5 and 3, 1 = strings 4 and 2.
      const [lowS, hiS] = o === 1 ? [4, 2] : [5, 3];
      const fr = lowFret(tu, key, lowS) || 12;
      const rootP = noteAt(tu, lowS, fr);
      const mel: [number, number][] = [[0, 1], [2, 0.5], [4, 0.5], [5, 1], [4, 1], [7, 1.5], [5, 0.5], [4, 1], [2, 1], [1, 0.5], [2, 0.5], [4, 1], [0, 2]];
      const evs: Ev[] = [];
      let b = 0;
      for (const [d, len] of mel) {
        const p = rootP + 12 * Math.floor(d / 7) + MAJ[d % 7];
        const fL = p - openOf(tu, lowS);
        const fH = p + 12 - openOf(tu, hiS);
        if (fL >= 0 && fH >= 0 && fL <= MAX_FRET && fH <= MAX_FRET) evs.push({ beat: b, dur: len, notes: [{ s: lowS, f: fL, stroke: 'p' }, { s: hiS, f: fH, stroke: 'p' }] });
        b += len;
      }
      return finish(s, tu, evs, { title: T(`Octaves, Wes style: thumb downstrokes, strings ${lowS} and ${hiS}, the string between muted`, `אוקטבות בסגנון ווס: אגודל למטה, מיתרים ${lowS} ו־${hiS}, המיתר שביניהם מושתק`, key), bpm: 70, evenness: false });
    }
    case 'hybrid-riff': {
      // 0 = hybrid picking: the bass note with the pick, two upper strings with m and a; 1 = an original
      // chicken-pickin' phrase — muted pick notes, snapped double stops in 6ths, a pull-off to the root.
      const evs: Ev[] = [];
      const R = r6;
      if (o === 0) {
        const shapes = [0, 5, 7, 0];
        shapes.forEach((sh, bar) => {
          const fr = mod(R + sh, 12) || 12;
          for (let i = 0; i < 4; i++) {
            const b = bar * 4 + i;
            evs.push({ beat: b, dur: 0.5, notes: [{ s: i % 2 === 0 ? 6 : 4, f: i % 2 === 0 ? fr : fr + 2, stroke: 'D' }] });
            evs.push({ beat: b + 0.5, dur: 0.5, notes: [{ s: 3, f: fr + 1, stroke: 'm' }, { s: 2, f: fr + 2, stroke: 'a' }] });
          }
        });
        evs.push({ beat: 16, dur: 1, notes: [{ s: 6, f: R, stroke: 'D' }] });
        return finish(s, tu, evs, { title: T('Hybrid picking: the bass with the pick, the chord with m and a', 'פריטה היברידית: הבס במפרט, האקורד ב־m ו־a', key), bpm: 70, evenness: false });
      }
      const f = r5 < 2 ? r5 + 12 : r5;
      const phrase: Ev[] = [
        { beat: 0, dur: 0.25, notes: [{ s: 3, f: f - 1, tech: 'mute', stroke: 'D' }] },
        { beat: 0.25, dur: 0.25, notes: [{ s: 3, f: f - 1, stroke: 'm' }] },
        { beat: 0.5, dur: 0.5, notes: [{ s: 4, f: f, stroke: 'D' }, { s: 2, f: f - 2, stroke: 'm' }] },
        { beat: 1, dur: 0.5, notes: [{ s: 4, f: f + 2, stroke: 'D' }, { s: 2, f: f, stroke: 'm' }] },
        { beat: 1.5, dur: 0.25, notes: [{ s: 3, f: f + 2, stroke: 'm' }] },
        { beat: 1.75, dur: 0.25, notes: [{ s: 3, f: f, tech: 'pull' }] },
        { beat: 2, dur: 0.5, notes: [{ s: 4, f: f + 2, stroke: 'D' }] },
        { beat: 2.5, dur: 0.5, notes: [{ s: 5, f: f, stroke: 'D' }] },
        { beat: 3, dur: 1, notes: [{ s: 5, f: f, stroke: 'D' }] },
      ];
      for (const bar of [0, 4]) for (const e of phrase) evs.push({ ...e, beat: e.beat + bar, notes: e.notes.map((g) => ({ ...g })) });
      return finish(s, tu, evs, { title: T("Chicken-pickin': muted pick notes, snapped 6ths, a pull-off home (our riff)", "צ׳יקן פיקינג: צלילים מושתקים, סקסטות נקושות, פול־אוף הביתה (ריף שלנו)", key), bpm: 72, evenness: false });
    }
    case 'style-riff': {
      // Our riffs (option): 0 blues shuffle, 1 rock power chords, 2 funk 16ths, 3 metal gallop, 4 country chicken-pickin'.
      const R = r6 === 0 ? 0 : r6 <= 9 ? r6 : r6 - 12 >= 0 ? r6 - 12 : r6;
      const evs: Ev[] = [];
      const pc = (s0: number, f: number, extra: Partial<GN> = {}): GN => ({ s: s0, f, ...extra });
      const power = (f: number, extra: Partial<GN> = {}): GN[] => [pc(6, f, extra), pc(5, f + 2, extra)];
      let title: T2;
      let bpm = 90;
      switch (Math.min(4, o)) {
        case 0: {
          // shuffle boogie, swung 8ths written as the triplet's 1 and 3: R–5 / R–6 / R–♭7 / R–6 on strings 6 and 5
          const tops = [2, 2, 4, 4, 2, 2, 4, 4];
          const swung = (i: number) => Math.floor(i / 2) + (i % 2 ? 2 / 3 : 0);
          // bar 1 on the I (strings 6 and 5), bar 2 on the IV (the same shape on strings 5 and 4)
          tops.forEach((x, i) => evs.push({ beat: swung(i), dur: i % 2 ? 1 / 3 : 2 / 3, notes: [pc(6, R, { tech: 'mute' }), pc(5, R + x)] }));
          tops.forEach((x, i) => evs.push({ beat: 4 + swung(i), dur: i % 2 ? 1 / 3 : 2 / 3, notes: [pc(5, R, { tech: 'mute' }), pc(4, R + x)] }));
          evs.push({ beat: 8, dur: 1, notes: power(R) });
          title = T('Blues shuffle riff: root under a moving 5th and 6th, swung (our riff)', 'ריף שאפל בלוז: יסוד מתחת לקווינטה וסקסטה נעות, בסווינג (ריף שלנו)', key);
          bpm = 90;
          break;
        }
        case 1: {
          // I – ♭VII – IV power chords, palm-muted 8ths on the root, a 16th push into each change
          const bars = [0, -2, 5, 0];
          bars.forEach((d, bar) => {
            const f = Math.max(0, R + d < 0 ? R + d + 12 : R + d);
            for (let i = 0; i < 6; i++) evs.push({ beat: bar * 4 + i * 0.5, dur: 0.5, notes: [pc(6, f, { tech: 'mute', stroke: 'D' })] });
            evs.push({ beat: bar * 4 + 3, dur: 0.75, notes: power(f, { stroke: 'D' }) });
            evs.push({ beat: bar * 4 + 3.75, dur: 0.25, notes: power(f, { stroke: 'U' }) });
          });
          evs.push({ beat: 16, dur: 1, notes: power(R) });
          title = T('Rock riff: palm-muted 8ths and power chords I–♭VII–IV (our riff)', 'ריף רוק: שמיניות מושתקות ואקורדי פאוור I–♭VII–IV (ריף שלנו)', key);
          bpm = 100;
          break;
        }
        case 2: {
          // funk 16ths: root, dead notes, the ♭7 and the octave on strings 5 and 4
          const f = r5 < 2 ? r5 + 12 : r5;
          const pat = 'R.xOx.7xR.x7O.x.';
          for (let bar = 0; bar < 2; bar++)
            [...pat].forEach((c, i) => {
              const b = bar * 4 + i / 4;
              if (c === '.') return;
              const g = c === 'R' ? pc(5, f) : c === 'x' ? pc(5, f, { tech: 'dead' }) : c === '7' ? pc(4, f, {}) : pc(4, f + 2);
              evs.push({ beat: b, dur: 0.25, notes: [{ ...g, stroke: i % 2 === 0 ? 'D' : 'U' }] });
            });
          evs.push({ beat: 8, dur: 1, notes: [pc(5, f)] });
          title = T('Funk 16ths: root, ♭7, octave and dead notes (our riff)', 'פאנק בשש־עשריות: יסוד, ♭7, אוקטבה וצלילים מתים (ריף שלנו)', key);
          bpm = 88;
          break;
        }
        case 3: {
          // gallop: palm-muted 8th + two 16ths on the root, power-chord hits on ♭2 and ♭5 at the end of each bar
          for (let bar = 0; bar < 4; bar++) {
            for (let g = 0; g < 3; g++) {
              const b = bar * 4 + g;
              evs.push({ beat: b, dur: 0.5, notes: [pc(6, R, { tech: 'mute', stroke: 'D' })] }, { beat: b + 0.5, dur: 0.25, notes: [pc(6, R, { tech: 'mute', stroke: 'D' })] }, { beat: b + 0.75, dur: 0.25, notes: [pc(6, R, { tech: 'mute', stroke: 'U' })] });
            }
            const hit = bar % 2 === 0 ? 1 : 6;
            evs.push({ beat: bar * 4 + 3, dur: 1, notes: power(R + hit <= MAX_FRET - 2 ? R + hit : R + hit - 12, { stroke: 'D' }) });
          }
          evs.push({ beat: 16, dur: 1, notes: power(R) });
          title = T('Metal gallop: palm-muted 8th-16th-16th, hits on ♭2 and ♭5 (our riff)', 'גאלופ מטאל: שמינית ושתי שש־עשריות מושתקות, מכות על ♭2 ו־♭5 (ריף שלנו)', key);
          bpm = 100;
          break;
        }
        default: {
          // country: a bass walk with the pick, snapped double stops (hybrid), a bend into the 3rd on string 3
          const f = r6;
          const ev2: Ev[] = [
            { beat: 0, dur: 0.5, notes: [pc(6, f, { stroke: 'D' })] },
            { beat: 0.5, dur: 0.5, notes: [pc(3, f + 2, { stroke: 'm' }), pc(2, f + 3, { stroke: 'a' })] },
            { beat: 1, dur: 0.5, notes: [pc(5, f + 2, { stroke: 'D' })] },
            { beat: 1.5, dur: 0.5, notes: [pc(3, f + 2, { stroke: 'm' }), pc(2, f + 3, { stroke: 'a' })] },
            { beat: 2, dur: 0.25, notes: [pc(3, f + 1, { tech: 'mute', stroke: 'D' })] },
            { beat: 2.25, dur: 0.25, notes: [pc(3, f + 1, { stroke: 'm' })] },
            { beat: 2.5, dur: 0.5, notes: [pc(3, f + 2, { tech: 'bend', bend: 100, stroke: 'm' })] },
            { beat: 3, dur: 1, notes: [pc(5, f + 2, { stroke: 'D' }), pc(4, f + 2, { stroke: 'm' })] },
          ];
          for (const bar of [0, 4]) for (const e of ev2) evs.push({ ...e, beat: e.beat + bar, notes: e.notes.map((g) => ({ ...g })) });
          title = T("Country chicken-pickin': bass with the pick, snapped double stops, a half-step bend (our riff)", "צ׳יקן פיקינג קאנטרי: בס במפרט, צלילים כפולים נקושים, כיפוף חצי טון (ריף שלנו)", key);
          bpm = 84;
        }
      }
      return finish(s, tu, evs, { title, bpm, evenness: false });
    }
  }
  return null;
}

export function techLevels(): Partial<Record<FamilyId, GuitarLevelDef[]>> {
  const L = (fam: FamilyId, level: number, en: string, he: string, specs: SpecTemplate[], tempo: [number, number], sub: string, grade: number, extra: Partial<GuitarLevelDef> = {}): GuitarLevelDef => ({
    id: `${fam}-${level}`,
    level,
    title: t(en, he),
    specs: specs.map((x) => ({ ...x, tempo: x.tempo ?? tempo[0] })),
    keys: 'major',
    tempo,
    sub,
    grade,
    ...extra,
  });
  const sp =
    (family: FamilyId) =>
    (kind: string, option: number): SpecTemplate => ({ family, kind, hands: 'R', instrument: 'guitar', option });
  const S = sp('g-scales');
  return {
    'g-scales': [
      L('g-scales', 11, 'Segovia-style scales: major and melodic minor on a diagonal, then 3 octaves', 'סולמות בסגנון סגוביה: מז׳ור ומינור מלודי באלכסון, ואז 3 אוקטבות', [S('segovia', 0), S('segovia', 1), S('segovia', 2)], [50, 100], '8ths', 6),
      L('g-scales', 12, 'Interval shapes across the strings: 3rds, 4ths, 5ths, 6ths, octaves', 'צורות מרווחים לרוחב המיתרים: טרצות, קוורטות, קווינטות, סקסטות, אוקטבות', [0, 1, 2, 3, 4].map((o) => S('interval-shapes', o)), [60, 100], '8ths', 3),
    ],
    'g-lead': [L('g-lead', 11, 'Octaves, Wes style: thumb, the string between muted', 'אוקטבות בסגנון ווס: אגודל, המיתר שביניהם מושתק', [sp('g-lead')('wes-octaves', 0), sp('g-lead')('wes-octaves', 1)], [60, 110], 'quarters / 8ths', 6)],
    'g-picking': [L('g-picking', 10, "Hybrid picking and chicken-pickin' in every key", 'פריטה היברידית וצ׳יקן פיקינג בכל הסולמות', [sp('g-picking')('hybrid-riff', 0), sp('g-picking')('hybrid-riff', 1)], [60, 100], '8ths / 16ths', 6)],
    'g-rhythm': [L('g-rhythm', 11, "Our riffs in five styles: blues shuffle, rock, funk 16ths, metal gallop, chicken-pickin'", "ריפים שלנו בחמישה סגנונות: שאפל בלוז, רוק, פאנק בשש־עשריות, גאלופ מטאל, צ׳יקן פיקינג", [0, 1, 2, 3, 4].map((o) => sp('g-rhythm')('style-riff', o)), [70, 110], '8ths / 16ths', 5)],
  };
}
