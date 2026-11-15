// STAGE C (docs/research/AUDIT-6-LEVELS-INSTRUMENTS.md §4, DA-1…DA-10): drums past 1400. Every groove family ended by
// 1400–1540 and only 16 steps sat above 1500; these eight families give the advanced band its own material, measured by
// the drum engine's existing grading (drumAnalyze: per-limb timing, the flam / drag rule, accents, ghosts, the linear
// rule, swing, landings, improvised zones):
//
//  d-pas       the PAS rudiments still missing: buzz and triple-stroke rolls, the 10/11/13/15/17-stroke rolls, the
//              triple paradiddle, the pataflafla, double and triple ratamacues, the remaining flams and drags
//  d-stick     sticking permutations at tempo (every 4-note sticking, 8-note and 6-note stickings, moving accents, around
//              the kit) — generated from the permutations themselves, not copied from a book's pages
//  d-synco     one syncopated reading line interpreted five ways (rock kick, band hits, funk, jazz comping, long/short
//              split, accents in a ghost stream) — our own lines
//  d-chapin    jazz independence ladders over the ride and the hi-hat foot (snare, kick, pairs, two lines, fill-ins,
//              four-way)
//  d-linear    linear funk (no two limbs together): groups of 3 and 4, ghost notes, open-hat barks, 32nd-note fills,
//              displaced grooves — our own patterns
//  d-brush     brushes beyond one level: the ballad in 2, medium swing, accents, up-tempo (the taps are scored; the
//              sweep is shown, as d-jazz 9)
//  d-oddtempo  odd-meter grooves at tempo: 5/4, 7/8, 7/4 and 9/8, 11/8 and 13/8, a song in changing meters
//  d-trade     soloing over a form: trading 4s and 8s, up-tempo 4s, a blues chorus and an AABA chorus solo with the band
//
// Each level has three variants (the drum stand-in for keys). The owner tests on an electronic kit over MIDI: grace
// notes, grooves and fills are MIDI-only (mic false); single-surface hand levels are also offered on a pad. Pure.
// drums.ts helpers are used only inside functions (drums.ts imports this module).

import type { Drill, DrillSpec, DrumFamilyId, DrumGoal, DrumVoice } from './types';
import type { SpecTemplate } from './generate';
import { bar, drumItemId, finish, generateDrums, hands, levelOfKind, line, rep, rnd, type DH, type DrumFamilyDef, type DrumLevelDef, type Lanes } from './drums';
import { drumBand } from './drumStyles';

const t = (en: string, he: string) => ({ en, he });
type T2 = { en: string; he: string };

export const DRUM_TOP_FAMILIES = ['d-pas', 'd-stick', 'd-synco', 'd-chapin', 'd-linear', 'd-brush', 'd-oddtempo', 'd-trade'] as const;
export type DrumTopFamily = (typeof DRUM_TOP_FAMILIES)[number];
export const isDrumTopFamily = (f: string): f is DrumTopFamily => (DRUM_TOP_FAMILIES as readonly string[]).includes(f);

/** A level row: [name, en, he, tempo, sub, mic, rating]. Three variants each. */
type Row = [string, string, string, [number, number], string, boolean, number];

const ROWS: Record<DrumTopFamily, Row[]> = {
  'd-pas': [
    ['buzz', 'Buzz roll (multiple bounce)', 'גלגול באז (ריבוי ניתורים)', [60, 100], '1/16', true, 1420],
    ['triple', 'Triple-stroke roll', 'גלגול שלוש מכות', [60, 100], '1/8T', true, 1450],
    ['triplepara', 'Triple paradiddle', 'פאראדידל משולש', [70, 120], '1/16', true, 1470],
    ['roll1011', '10- and 11-stroke rolls', 'גלגולים של 10 ו-11 מכות', [70, 110], '1/16', true, 1500],
    ['roll1315', '13- and 15-stroke rolls', 'גלגולים של 13 ו-15 מכות', [70, 110], '1/16', true, 1530],
    ['roll17', '17-stroke roll and combined rolls', 'גלגול 17 מכות וגלגולים משולבים', [70, 110], '1/16', true, 1560],
    ['pataflafla', 'Pataflafla', 'פאטאפלאפלה', [60, 100], '1/16', false, 1590],
    ['flamacue', 'Flamacue and inverted flam tap', 'פלאמקיו ופלאם טאפ הפוך', [60, 100], '1/16', false, 1620],
    ['flammill', 'Flam paradiddle-diddle, single flammed mill', 'פלאם פאראדידל-דידל, מיל עם פלאם', [60, 100], '1/16', false, 1650],
    ['dblrat', 'Double ratamacue', 'רטמקיו כפול', [60, 100], '1/16', false, 1680],
    ['trirat', 'Triple ratamacue', 'רטמקיו משולש', [60, 100], '1/16', false, 1710],
    ['drags', 'Lesson 25, single dragadiddle, double drag tap', 'שיעור 25, דראגדידל, דראג טאפ כפול', [60, 100], '1/16', false, 1740],
  ],
  'd-stick': [
    ['perm4', 'Every 4-note sticking in 8ths', 'כל אצבוע של 4 תווים בשמיניות', [100, 168], '1/8', true, 1440],
    ['perm4x16', 'Every 4-note sticking in 16ths', 'כל אצבוע של 4 תווים בשש-עשריות', [80, 132], '1/16', true, 1500],
    ['perm8', '8-note stickings in 16ths', 'אצבועים של 8 תווים בשש-עשריות', [80, 126], '1/16', true, 1560],
    ['perm6', '6-note stickings in triplets', 'אצבועים של 6 תווים בטריולות', [80, 132], '1/8T', true, 1620],
    ['permacc', 'Stickings with a moving accent', 'אצבועים עם הדגשה נודדת', [76, 120], '1/16', true, 1690],
    ['permkit', 'Stickings around the kit', 'אצבועים סביב המערכת', [80, 126], '1/16', false, 1770],
  ],
  'd-synco': [
    ['rock', 'Syncopated line on the kick, rock', 'קו מסונכפ בקיק, רוק', [80, 126], '1/8', false, 1450],
    ['hits', 'The line as band hits', 'הקו כמכות להקה', [90, 132], '1/8', false, 1500],
    ['funk', 'The line on the kick, 16th funk', 'הקו בקיק, פאנק בשש-עשריות', [76, 108], '1/16', false, 1560],
    ['jazz', 'The line as jazz comping on the snare', 'הקו כקומפינג ג׳אז בסנר', [110, 176], '1/8T', false, 1610],
    ['split', 'Jazz: long notes kick, short notes snare', 'ג׳אז: ארוכים בקיק, קצרים בסנר', [110, 176], '1/8T', false, 1670],
    ['accents', 'The line as accents in a ghost-note stream', 'הקו כהדגשות בזרם תווי רפאים', [70, 104], '1/16', true, 1730],
  ],
  'd-chapin': [
    ['snare', 'Ride and foot: the snare ladder', 'רייד ורגל: סולם הסנר', [110, 176], '1/8T', false, 1460],
    ['kick', 'Ride and foot: the kick ladder', 'רייד ורגל: סולם הקיק', [110, 176], '1/8T', false, 1520],
    ['pairs', 'Snare and kick figures together', 'דמויות סנר וקיק יחד', [110, 176], '1/8T', false, 1580],
    ['two', 'Two lines read at once', 'שני קווים בקריאה אחת', [110, 176], '1/8T', false, 1640],
    ['fillin', 'Kick line, snare fills the gaps', 'קו בקיק, הסנר ממלא את הרווחים', [110, 168], '1/8T', false, 1700],
    ['four', 'Four-way: the foot on every beat', 'ארבע גפיים: הרגל על כל פעמה', [120, 200], '1/8T', false, 1780],
  ],
  'd-linear': [
    ['groups', 'Linear groups of 3 and 4', 'קבוצות ליניאריות של 3 ו-4', [70, 110], '1/16', false, 1470],
    ['ghost', 'Linear groove with ghost notes', 'גרוב ליניארי עם תווי רפאים', [76, 108], '1/16', false, 1540],
    ['barks', 'Linear groove with open-hat barks', 'גרוב ליניארי עם פתיחות היי־האט', [80, 110], '1/16', false, 1610],
    ['fill32', 'Linear 32nd-note fills, land on 1', 'מעברים ליניאריים בשלושים-ושתיים, נחיתה על 1', [60, 90], '1/32', false, 1690],
    ['displace', 'Displaced linear grooves at tempo', 'גרובים ליניאריים מוזזים בטמפו', [84, 112], '1/16', false, 1770],
  ],
  'd-brush': [
    ['ballad', 'Brushes ballad in 2', 'בלדה במברשות בשתיים', [52, 72], '1/8T', false, 1450],
    ['medium', 'Brushes, medium swing', 'מברשות, סווינג בינוני', [100, 150], '1/8T', false, 1530],
    ['accents', 'Brushes with comping accents', 'מברשות עם הדגשות קומפינג', [100, 150], '1/8T', false, 1610],
    ['up', 'Up-tempo brushes', 'מברשות בטמפו מהיר', [180, 240], '1/8', false, 1710],
  ],
  'd-oddtempo': [
    ['54', '5/4 grooves and fills at tempo', 'גרובים ומעברים ב-5/4 בטמפו', [110, 168], '1/8', false, 1480],
    ['78', '7/8 at tempo', '7/8 בטמפו', [240, 320], '1/8', false, 1550],
    ['74', '7/4 and 9/8', '7/4 ו-9/8', [100, 160], '1/8', false, 1620],
    ['1113', '11/8 and 13/8 with fills', '11/8 ו-13/8 עם מעברים', [220, 300], '1/8', false, 1700],
    ['switch', 'A song in changing meters, at tempo', 'שיר במשקלים מתחלפים, בטמפו', [220, 280], '1/8', false, 1800],
  ],
  'd-trade': [
    ['blues4', 'Trading 4s on the blues', 'חילופי 4 על הבלוז', [120, 180], '1/8T', false, 1500],
    ['aaba8', 'Trading 8s on AABA', 'חילופי 8 על AABA', [120, 180], '1/8T', false, 1590],
    ['up4', 'Trading 4s up-tempo', 'חילופי 4 בטמפו מהיר', [200, 260], '1/8T', false, 1680],
    ['blues', 'A solo chorus over the blues, the band playing', 'סבב סולו על הבלוז, הלהקה מנגנת', [110, 170], '1/8T', false, 1780],
    ['aaba', 'A solo chorus over AABA with set-up hits', 'סבב סולו על AABA עם מכות הכנה', [120, 180], '1/8T', false, 1880],
  ],
};

const TITLES: Record<DrumTopFamily, T2> = {
  'd-pas': t('PAS rudiments', 'רודימנטים של PAS'),
  'd-stick': t('Stickings at tempo', 'אצבועים בטמפו'),
  'd-synco': t('Syncopation, interpreted', 'סינקופות בפרשנות'),
  'd-chapin': t('Jazz independence', 'עצמאות בג׳אז'),
  'd-linear': t('Linear funk', 'פאנק ליניארי'),
  'd-brush': t('Brushes', 'מברשות'),
  'd-oddtempo': t('Odd meters at tempo', 'משקלים מוזרים בטמפו'),
  'd-trade': t('Soloing over a form', 'סולו על צורה'),
};
export const drumTopTitle = (f: DrumTopFamily): T2 => TITLES[f];

/** STAGE C path ratings: every new level at its own rating (plugged into path.ts KEYS_LEVEL_DIFF). */
export const DRUM_TOP_DIFF: Record<string, number> = Object.fromEntries(DRUM_TOP_FAMILIES.flatMap((f) => ROWS[f].map((r, i) => [`${f}-${i + 1}`, r[6]])));

/** The eight families (drumFamilies appends them). */
export function drumTopFamilies(): DrumFamilyDef[] {
  return DRUM_TOP_FAMILIES.map((id) => ({
    id,
    title: TITLES[id],
    style: 'classical' as const,
    genres: ['all' as const],
    instruments: ['drums' as const],
    levels: ROWS[id].map(([name, en, he, tempo, sub, mic], i): DrumLevelDef => ({
      id: `${id}-${i + 1}`,
      level: i + 1,
      title: t(en, he),
      specs: [0, 1, 2].map((o): SpecTemplate => ({ family: id as DrumFamilyId, kind: `${i + 1}:${name}`, option: o, hands: 'RL', instrument: 'drums', tempo: tempo[0] })),
      keys: [0],
      tempo,
      sub,
      mic,
    })),
  }));
}

// ───────────────────────────── generation ─────────────────────────────

/** Every Stage C drill is graded as advanced (verdict tier 3), whatever its level number. */
const adv = (d: Drill): Drill => ({ ...d, drum: { ...d.drum!, tier: 3 } });

/** A drill of a new family (null for every other family). */
export function generateDrumTop(s: DrillSpec): Drill | null {
  if (!isDrumTopFamily(s.family)) return null;
  const lv = levelOfKind(s.kind);
  const op = s.option ?? 0;
  switch (s.family) {
    case 'd-pas':
      return adv(genPas(s, lv, op));
    case 'd-stick':
      return adv(genStick(s, lv, op));
    case 'd-synco':
      return adv(genSynco(s, lv, op));
    case 'd-chapin':
      return adv(genChapin(s, lv, op));
    case 'd-linear':
      return adv(genLinear(s, lv, op));
    case 'd-brush':
      return adv(genBrush(s, lv, op));
    case 'd-oddtempo':
      return adv(genOdd(s, lv, op));
    default:
      return adv(genTrade(s, lv, op));
  }
}

// ───────────────────────────── d-pas: the PAS rudiments ─────────────────────────────

/**
 * A sticking with grace marks (as drums.ts graced): "fR" = flam on R (grace by L), "dR" = drag on R (two graces by L),
 * ">" accents the next stroke. `at` gives each stroke's beat.
 */
export function gracedAt(pattern: string, at: number[], dur = 0.25): DH[] {
  const toks = pattern.match(/[fd]?>?[RL]/g)!;
  return at.map((b, i) => {
    const tk = toks[i % toks.length];
    const h = tk[tk.length - 1] as 'R' | 'L';
    return { b, v: 'snare' as DrumVoice, h, d: dur, ...(tk.startsWith('f') ? { grace: 1 as const } : tk.startsWith('d') ? { grace: 2 as const } : {}), ...(tk.includes('>') ? { acc: true } : {}) };
  });
}
const steps = (n: number, step: number, from = 0): number[] => Array.from({ length: n }, (_, i) => from + i * step);
export const flipSt = (s: string): string => s.replace(/[RL]/g, (c) => (c === 'R' ? 'L' : 'R'));

/**
 * An open roll of `strokes` (PAS): doubles in 16ths, then the release — one accented single for an odd count (5, 7, 9,
 * 11, 13, 15, 17), two singles (the last accented) for the 10-stroke. The release lands on the next 8th after the last
 * double. Returns the hits from `b0` and the hand that played the release.
 */
export function openRoll(strokes: number, lead: 'R' | 'L', b0: number): { hits: DH[]; release: 'R' | 'L' } {
  const doubles = strokes % 2 ? strokes - 1 : strokes - 2;
  const st = lead === 'R' ? 'RRLL' : 'LLRR';
  const hs = hands(st);
  const hits: DH[] = Array.from({ length: doubles }, (_, i) => ({ b: b0 + i * 0.25, v: 'snare' as DrumVoice, h: hs[i % 4], d: 0.25, dbl: (i % 2 ? 2 : 1) as 1 | 2 }));
  const after: 'R' | 'L' = hs[(doubles - 1) % 4] === 'R' ? 'L' : 'R';
  let at = b0 + Math.ceil((doubles * 0.25 + 1e-9) * 2) / 2;
  if (strokes % 2 === 0) {
    hits.push({ b: at, v: 'snare', h: after, d: 0.5 });
    at += 0.5;
    const last: 'R' | 'L' = after === 'R' ? 'L' : 'R';
    hits.push({ b: at, v: 'snare', h: last, d: 0.5, acc: true });
    return { hits, release: last };
  }
  hits.push({ b: at, v: 'snare', h: after, d: 0.5, acc: true });
  return { hits, release: after };
}

/** Rolls of the given stroke counts, one per bar (two bars for 15 and more), the lead after each release. */
function rollPhrase(counts: number[], lead0: 'R' | 'L', alternate: boolean): { hits: DH[]; bars: number } {
  const hits: DH[] = [];
  let b = 0;
  let lead = lead0;
  for (const n of counts) {
    const r = openRoll(n, lead, b);
    hits.push(...r.hits);
    b += n >= 15 ? 8 : 4;
    lead = alternate ? (r.release === 'R' ? 'L' : 'R') : lead0;
  }
  return { hits, bars: b / 4 };
}

function genPas(s: DrillSpec, lv: number, op: number): Drill {
  const grace = (hits: DH[], en: string, he: string, bpm: number, bars = 4, tail = 0): Drill => finish(s, hits, { title: t(en, he), bpm, bars, tail, mic: false, goal: { flam: 0.9 } });
  switch (lv) {
    case 1: {
      // Buzz roll: the hands play the pulse (16ths, 8th triplets, or 16ths in a crescendo), each stroke pressed into a
      // buzz. The strokes are measured (timing, evenness); the bounces between them are free (never "extra").
      const step = op === 1 ? 1 / 3 : 0.25;
      const n = Math.round(16 / step);
      const hits = line('RL', n, step, 0, (i) => (op === 2 ? { dyn: (['p', 'mf', 'f', 'mf'] as const)[Math.floor((i * step) / 4)] } : {}));
      const nm = [t('16th pulse', 'פעימות שש-עשריות'), t('8th-triplet pulse', 'פעימות טריולות'), t('p → f → mf', 'p ← f ← mf')][op];
      const d = finish(s, hits, { title: t(`Buzz roll · ${nm.en}`, `גלגול באז · ${nm.he}`), bpm: 60, bars: 4, mic: true, goal: op === 2 ? { levels: 0.8 } : { velCv: 0.2 } });
      return { ...d, drum: { ...d.drum!, trem: Array.from({ length: 16 }, (_, b) => ({ beat: b, dur: 1, slashes: 3 as const })) } };
    }
    case 2: {
      // Triple-stroke roll: RRR LLL — in 8th triplets, in 16th triplets (half the tempo), or lead left.
      const step = op === 1 ? 1 / 6 : 1 / 3;
      const st = op === 2 ? 'LLLRRR' : 'RRRLLL';
      const nm = [t('8th triplets', 'טריולות שמיניות'), t('16th triplets', 'טריולות שש-עשריות'), t('lead left', 'מובילים בשמאל')][op];
      return finish(s, line(st, Math.round(16 / step), step, 0, (i) => (i % 3 === 0 ? { acc: true } : {})), { title: t(`Triple-stroke roll · ${st.slice(0, 3)} ${st.slice(3)} · ${nm.en}`, `גלגול שלוש מכות · ${st.slice(0, 3)} ${st.slice(3)} · ${nm.he}`), bpm: op === 1 ? 50 : 60, bars: 4, mic: true, goal: { velCv: 0.22 } });
    }
    case 3: {
      // Triple paradiddle: RLRLRLRR LRLRLRLL in 16ths — the first accented, lead left, or the doubles accented.
      const P = 'RLRLRLRRLRLRLRLL';
      const st = op === 1 ? flipSt(P) : P;
      const acc = (i: number) => (op === 2 ? i % 8 === 6 : i % 8 === 0);
      const nm = [t('accent on the first', 'הדגשה על הראשונה'), t('lead left', 'מובילים בשמאל'), t('accent on the double', 'הדגשה על הכפולה')][op];
      return finish(s, line(st, 64, 0.25, 0, (i) => (acc(i) ? { acc: true } : {})), { title: t(`Triple paradiddle · ${nm.en}`, `פאראדידל משולש · ${nm.he}`), bpm: 70, bars: 4, mic: true, goal: { accentPos: 0.85, accentGap: 0.3 } });
    }
    case 4:
    case 5:
    case 6: {
      const sets: number[][][] = [
        [[10, 10, 10, 10], [11, 11, 11, 11], [10, 11, 10, 11]],
        [[13, 13, 13, 13], [15, 15], [13, 15]],
        [[17, 17], [17, 17], [5, 9, 13, 17]],
      ];
      const counts = sets[lv - 4][op];
      const alternate = !(lv === 6 && op === 0);
      const r = rollPhrase(counts, 'R', alternate);
      const bars = Math.max(4, r.bars);
      const label = lv === 6 && op === 2 ? t('Combined rolls · 5, 9, 13, 17', 'גלגולים משולבים · 5, 9, 13, 17') : t(`${[...new Set(counts)].join(' and ')}-stroke roll${new Set(counts).size > 1 ? 's' : ''}${alternate ? '' : ' · lead right'}`, `גלגול ${[...new Set(counts)].join(' ו-')} מכות${alternate ? '' : ' · מובילים בימין'}`);
      return finish(s, r.hits, { title: label, bpm: 70, bars, mic: true, goal: { ratio: 0.8, accentPos: 0.8 } });
    }
    case 7: {
      // Pataflafla: lR L R rL — flams on the first and the fourth; with accents; lead left.
      const p = op === 1 ? 'f>RLRf>L' : op === 2 ? 'fLRLfR' : 'fRLRfL';
      return grace(gracedAt(p, steps(64, 0.25)), `Pataflafla · ${op === 2 ? 'rL R L lR' : 'lR L R rL'}${op === 1 ? ' · flams accented' : ''}`, `פאטאפלאפלה · ${op === 2 ? 'rL R L lR' : 'lR L R rL'}${op === 1 ? ' · פלאמים מודגשים' : ''}`, 60);
    }
    case 8: {
      if (op === 2) return grace(gracedAt('fRLfLR', steps(64, 0.25)), 'Inverted flam tap · lR L rL R', 'פלאם טאפ הפוך · lR L rL R', 60);
      // Flamacue: lR >L R L lR — four 16ths and the flam on the next beat; every two beats, alternating the lead.
      const hits = rep(8, (k) => {
        const p = (k % 2) ^ op ? 'fL>RLRfL' : 'fR>LRLfR';
        return gracedAt(p, [k * 2, k * 2 + 0.25, k * 2 + 0.5, k * 2 + 0.75, k * 2 + 1]);
      });
      return grace(hits, 'Flamacue · lR >L R L lR', 'פלאמקיו · lR >L R L lR', 60);
    }
    case 9: {
      if (op === 2) return grace(gracedAt('fRRLRfLLRL', steps(64, 0.25)), 'Single flammed mill · lR R L R rL L R L', 'מיל עם פלאם · lR R L R rL L R L', 60);
      // Flam paradiddle-diddle: lR L R R L L in 8th triplets (sextuplets of two beats).
      const p = op === 1 ? 'fLRLLRR' : 'fRLRRLL';
      return grace(gracedAt(p, steps(48, 1 / 3)), `Flam paradiddle-diddle · ${op === 1 ? 'rL R L L R R' : 'lR L R R L L'}`, `פלאם פאראדידל-דידל · ${op === 1 ? 'rL R L L R R' : 'lR L R R L L'}`, 60);
    }
    case 10:
    case 11: {
      // Double ratamacue (rrL llR L R >L) and triple (llR rrL llR L R >L): drags leading into three strokes, the last
      // accented on the beat — in 16ths, mirrored, or in 8ths (one bar each).
      const n = lv === 10 ? 5 : 6;
      const drags = n - 3;
      const unit = op === 2 ? 0.5 : 0.25;
      const span = op === 2 ? 4 : 2;
      const hits = rep(16 / span, (k) => {
        const a: 'R' | 'L' = ((k + op) % 2 === 0) === (n === 5) ? 'L' : 'R';
        const hs: ('R' | 'L')[] = [];
        let h = a;
        for (let i = 0; i < n; i++) {
          hs.push(h);
          h = h === 'R' ? 'L' : 'R';
        }
        const p = hs.map((x, i) => (i < drags ? `d${x}` : i === n - 1 ? `>${x}` : x)).join('');
        // The accent on the next beat (the next figure's first beat), the drags leading into it.
        const end = k * span + span;
        return gracedAt(p, steps(n, unit, end - unit * (n - 1)), unit);
      });
      const nm = lv === 10 ? t('Double ratamacue', 'רטמקיו כפול') : t('Triple ratamacue', 'רטמקיו משולש');
      const w = [t('16ths', 'שש-עשריות'), t('the other lead', 'ההובלה השנייה'), t('8ths', 'שמיניות')][op];
      return grace(hits, `${nm.en} · ${w.en}`, `${nm.he} · ${w.he}`, 60, 4, 1);
    }
    default: {
      if (op === 1) return grace(gracedAt('dRLRRdLRLL', steps(64, 0.25)), 'Single dragadiddle · llR L R R rrL R L L', 'דראגדידל · llR L R R rrL R L L', 60);
      if (op === 2) {
        // Double drag tap: llR llR >L — drags on the beat and the "&", the accent on the next beat (mirrored after).
        const hits = rep(8, (k) => gracedAt(k % 2 ? 'dLdL>R' : 'dRdR>L', [k * 2, k * 2 + 0.5, k * 2 + 1], 0.5));
        return grace(hits, 'Double drag tap · llR llR >L', 'דראג טאפ כפול · llR llR >L', 60);
      }
      // Lesson 25: llR L >R — a drag and two 16ths into an 8th, every beat, mirrored on the next.
      const hits = rep(16, (k) => gracedAt(k % 2 ? 'dLR>L' : 'dRL>R', [k, k + 0.25, k + 0.5]));
      return grace(hits, 'Lesson 25 · llR L >R', 'שיעור 25 · llR L >R', 60);
    }
  }
}

// ───────────────────────────── d-stick: permutations at tempo ─────────────────────────────

/** Every sticking of length n (R / L), without the one-hand ones, ordered by how often the hands switch. */
export function stickings(n: number, leadR = true): string[] {
  const out: string[] = [];
  for (let m = 0; m < 2 ** n; m++) out.push(Array.from({ length: n }, (_, i) => ((m >> (n - 1 - i)) & 1 ? 'L' : 'R')).join(''));
  const sw = (x: string) => [...x].filter((c, i) => i > 0 && c !== x[i - 1]).length;
  return out.filter((x) => x.includes('R') && x.includes('L') && (!leadR || x[0] === 'R')).sort((a, b) => sw(b) - sw(a) || (a < b ? -1 : 1));
}
const P4 = stickings(4, false);
const P6 = stickings(6).filter((x) => [...x].filter((c) => c === 'R').length === 3);
const P8 = stickings(8).filter((x) => [...x].filter((c) => c === 'R').length === 4);
/** Four stickings for a variant: a seeded draw from the pool, the same for every take of the item. */
const pick4 = (pool: string[], seed: string): string[] => {
  const r = rnd(seed);
  const a = pool.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, 4);
};

function genStick(s: DrillSpec, lv: number, op: number): Drill {
  // One sticking a bar (four bars), each repeated across the bar.
  const perBar = (sts: string[], step: number, extra: (i: number, b: number) => Partial<DH> = () => ({})): DH[] =>
    rep(4, (b) => line(sts[b], Math.round(4 / step), step, b * 4, (i) => extra(i, b)));
  const name = (sts: string[]) => sts.join(' · ');
  switch (lv) {
    case 1: {
      const sts = P4.slice(op * 4, op * 4 + 4);
      return finish(s, perBar(sts, 0.5), { title: t(`4-note stickings in 8ths · ${name(sts)}`, `אצבועים של 4 תווים בשמיניות · ${name(sts)}`), bpm: 100, bars: 4, mic: true, goal: { velCv: 0.2 } });
    }
    case 2: {
      const sts = P4.slice(op * 4 + 2, op * 4 + 6).concat(P4).slice(0, 4);
      return finish(s, perBar(sts, 0.25), { title: t(`4-note stickings in 16ths · ${name(sts)}`, `אצבועים של 4 תווים בשש-עשריות · ${name(sts)}`), bpm: 80, bars: 4, mic: true, goal: { velCv: 0.2 } });
    }
    case 3: {
      const sts = pick4(P8, `stick8:${op}`);
      return finish(s, perBar(sts, 0.25), { title: t(`8-note stickings · ${name(sts)}`, `אצבועים של 8 תווים · ${name(sts)}`), bpm: 80, bars: 4, mic: true, goal: { velCv: 0.2 } });
    }
    case 4: {
      const sts = pick4(P6, `stick6:${op}`);
      return finish(s, perBar(sts, 1 / 3), { title: t(`6-note stickings in triplets · ${name(sts)}`, `אצבועים של 6 תווים בטריולות · ${name(sts)}`), bpm: 80, bars: 4, mic: true, goal: { velCv: 0.2 } });
    }
    case 5: {
      // The accent moves one note later every bar through a 4-note sticking (bar k: note k accented).
      const st = P4[[0, 3, 6][op]];
      const hits = rep(4, (b) => line(st, 16, 0.25, b * 4, (i) => (i % 4 === b ? { acc: true } : {})));
      return finish(s, hits, { title: t(`Moving accent through ${st}`, `הדגשה נודדת לאורך ${st}`), bpm: 76, bars: 4, mic: true, goal: { accentPos: 0.85, accentGap: 0.3 } });
    }
    default: {
      // Around the kit: the right hand on the floor tom (or the ride, or the high tom), the left on the snare.
      const rv: DrumVoice = (['tom3', 'ride', 'tom1'] as DrumVoice[])[op];
      const sts = pick4(P8, `stickkit:${op}`);
      const hits = perBar(sts, 0.25).map((h) => (h.h === 'R' ? { ...h, v: rv } : h));
      const where = [t('right hand on the floor tom', 'יד ימין על הטום הנמוך'), t('right hand on the ride', 'יד ימין על הרייד'), t('right hand on the high tom', 'יד ימין על הטום הגבוה')][op];
      return finish(s, hits, { title: t(`Stickings around the kit · ${where.en}`, `אצבועים סביב המערכת · ${where.he}`), bpm: 80, bars: 4, mic: false });
    }
  }
}

// ───────────────────────────── d-synco: one line, interpreted ─────────────────────────────

/** Our own syncopated one-bar cells in 8ths (x = a note). */
const SYN_CELLS = ['x..x..x.', 'x.x..x..', '..x..x.x', 'x...x.x.', '.x..x..x', 'x..x.x..', 'x.x.x..x', '...x..x.', 'x..x...x', '.x.x..x.', 'x....xx.', '..xx..x.'];
/** A 4-bar (or 8-bar) reading line, seeded per item: a different cell every bar. */
export function syncoLine(seed: string, bars = 4): string[] {
  const r = rnd(seed);
  const out: string[] = [];
  while (out.length < bars) {
    const c = SYN_CELLS[Math.floor(r() * SYN_CELLS.length)];
    if (out[out.length - 1] !== c) out.push(c);
  }
  return out;
}
/** An 8th-note cell on a 16th grid (each 8th → the first of two 16ths). */
const to16 = (c: string): string => [...c].map((x) => x + '.').join('');
/** An 8th-note cell on the triplet grid: the downbeat 8th → the beat, the upbeat 8th → the skip note (swing). */
const toTrip = (c: string): string => Array.from({ length: 4 }, (_, b) => `${c[2 * b]}.${c[2 * b + 1]}`).join('');
/** Long notes (the next 8th empty) and short ones. */
const longShort = (c: string): { long: string; short: string } => ({
  long: [...c].map((x, i) => (x === 'x' && (c[i + 1] ?? '.') === '.' ? 'x' : '.')).join(''),
  short: [...c].map((x, i) => (x === 'x' && (c[i + 1] ?? '.') !== '.' ? 'x' : '.')).join(''),
});
const RIDE = 'x..x.xx..x.x';
const FOOT24 = '...x.....x..';
const SWING = { lo: 0.58, hi: 0.72 };
const SWING_FAST = { lo: 0.52, hi: 0.7 };
const swungRide = (hits: DH[]): DH[] => hits.map((h) => ((h.v === 'ride' || (h.v === 'snare' && h.h === 'R')) && Math.abs((h.b % 1) - 2 / 3) < 1e-6 ? { ...h, swing: true } : h));
/** Remove a hit where another voice of the same limb already plays (the line over the backbeat). */
const without = (lane: string, other: string): string => [...lane].map((c, i) => (c !== '.' && other[i] && other[i] !== '.' ? '.' : c)).join('');

function genSynco(s: DrillSpec, lv: number, op: number): Drill {
  const ln = syncoLine(`synco:${lv}:${op}`, 4);
  const rock = (bars: Lanes[]) => rep(4, (b) => bar(bars[b], 2, b * 4));
  const nm = t(`line ${op + 1}`, `קו ${op + 1}`);
  switch (lv) {
    case 1: {
      const hits = rock(ln.map((c) => ({ h: 'xxxxxxxx', s: '..x...x.', k: without(c, '..x...x.') })));
      return finish(s, hits, { title: t(`Syncopation on the kick, rock · ${nm.en}`, `סינקופה בקיק, רוק · ${nm.he}`), bpm: 80, bars: 4, mic: false, ...drumBand('rock', 4) });
    }
    case 2: {
      const hits = rock(ln.map((c) => ({ h: [...'xxxxxxxx'].map((x, i) => (c[i] === 'x' ? '.' : x)).join(''), c, k: c, s: without('..x...x.', c) })));
      return finish(s, hits, { title: t(`The line as band hits: crash and kick · ${nm.en}`, `הקו כמכות להקה: קראש וקיק · ${nm.he}`), bpm: 90, bars: 4, mic: false, ...drumBand('rock', 4) });
    }
    case 3: {
      const back = '....X.......X...';
      const hits = rep(4, (b) => bar({ h: 'xxxxxxxxxxxxxxxx', s: without('....X..g...gX..g', to16(ln[b])), k: without(to16(ln[b]), back) }, 4, b * 4));
      return finish(s, hits, { title: t(`The line on the kick, 16th funk · ${nm.en}`, `הקו בקיק, פאנק בשש-עשריות · ${nm.he}`), bpm: 76, bars: 4, mic: false, goal: { ghost: 0.75 }, ...drumBand('funk', 4) });
    }
    case 4:
    case 5: {
      const lanes = (c: string): Lanes => {
        const trip = toTrip(c);
        if (lv === 4) return { r: RIDE, p: FOOT24, s: trip };
        const ls = longShort(c);
        return { r: RIDE, p: FOOT24, s: toTrip(ls.short), k: toTrip(ls.long) };
      };
      const hits = swungRide(rep(4, (b) => bar(lanes(ln[b]), 3, b * 4)));
      const what = lv === 4 ? t('The line as comping on the snare', 'הקו כקומפינג בסנר') : t('Long notes kick, short notes snare', 'ארוכים בקיק, קצרים בסנר');
      return finish(s, hits, { title: t(`${what.en} · ${nm.en}`, `${what.he} · ${nm.he}`), bpm: 110, bars: 4, mic: false, goal: { swing: SWING }, ...drumBand('swing', 4) });
    }
    default: {
      // A 16th ghost stream on the snare (alternating), the line's notes accented — hands only, a pad works too.
      const hits = rep(4, (b) => {
        const c = to16(ln[b]);
        return line('RL', 16, 0.25, b * 4, (i) => (c[i] === 'x' ? { acc: true } : { ghost: true }));
      });
      return finish(s, hits, { title: t(`The line as accents in a ghost stream · ${nm.en}`, `הקו כהדגשות בזרם רפאים · ${nm.he}`), bpm: 70, bars: 4, mic: true, goal: { accentPos: 0.85, accentGap: 0.3 } });
    }
  }
}

// ───────────────────────────── d-chapin: jazz independence ladders ─────────────────────────────

/** Triplet cells (3 steps a beat) for the ladders: the beat, the skip, the middle, two and three of them. */
const TCELLS = ['x..', '..x', '.x.', 'x.x', 'xx.', '.xx', 'xxx'];
const four = (c: string): string => c.repeat(4);

function genChapin(s: DrillSpec, lv: number, op: number): Drill {
  const base: Lanes = { r: RIDE, p: lv === 6 ? 'x..x..x..x..' : FOOT24 };
  // Eight bars: one cell a bar, each variant its own order.
  const order = (k: number) => TCELLS[(k * (op + 2) + op) % TCELLS.length];
  let fig: (b: number) => Lanes;
  let what: T2;
  switch (lv) {
    case 1:
      fig = (b) => ({ s: four(order(b)) });
      what = t('the snare ladder', 'סולם הסנר');
      break;
    case 2:
      fig = (b) => ({ k: four(order(b)) });
      what = t('the kick ladder', 'סולם הקיק');
      break;
    case 3:
      fig = (b) => {
        const c = order(b);
        const comp = [...c].map((x) => (x === 'x' ? '.' : 'x')).join('');
        return { s: four(c), k: four(comp === 'xxx' ? '..x' : comp) };
      };
      what = t('snare and kick figures', 'דמויות סנר וקיק');
      break;
    case 4: {
      const sn = syncoLine(`chapin4s:${op}`, 8);
      const kk = syncoLine(`chapin4k:${op}`, 8);
      fig = (b) => ({ s: toTrip(sn[b]), k: without(toTrip(kk[b]), toTrip(sn[b])) });
      what = t('two lines at once', 'שני קווים יחד');
      break;
    }
    case 5: {
      const kk = syncoLine(`chapin5:${op}`, 8);
      fig = (b) => {
        const k = toTrip(kk[b]);
        // The snare fills every skip note the kick leaves.
        const sn = [...k].map((x, i) => (i % 3 === 2 && x === '.' ? 'x' : '.')).join('');
        return { k, s: sn };
      };
      what = t('kick line, snare in the gaps', 'קו בקיק, הסנר ברווחים');
      break;
    }
    default: {
      const sn = syncoLine(`chapin6s:${op}`, 8);
      const kk = syncoLine(`chapin6k:${op}`, 8);
      fig = (b) => ({ s: toTrip(sn[b]), k: without(toTrip(kk[b]), toTrip(sn[b])) });
      what = t('four-way, the foot on every beat', 'ארבע גפיים, הרגל על כל פעמה');
    }
  }
  const hits = swungRide(rep(8, (b) => bar({ ...base, ...fig(b) }, 3, b * 4)));
  return finish(s, hits, { title: t(`Jazz independence · ${what.en} · ${op + 1}`, `עצמאות בג׳אז · ${what.he} · ${op + 1}`), bpm: lv === 6 ? 120 : 110, bars: 8, mic: false, goal: { swing: lv === 6 ? SWING_FAST : SWING }, ...drumBand('swing', 8) });
}

// ───────────────────────────── d-linear: linear funk ─────────────────────────────

/**
 * Our own linear bars, one voice a 16th step: k kick, h hat, o open hat, S accented snare, g ghost snare, . rest. No two
 * limbs ever play together, by construction.
 */
const LINEAR: Record<'ghost' | 'barks', string[]> = {
  ghost: ['khghShkghkghShgh', 'khkgShghkhgkShgh', 'kghkShgkhgkhSghk'],
  barks: ['khghShkgokghShgo', 'khkoShghkhgkShog', 'kghkSokhhgkhSghk'],
};
/** A voice string → lanes (hat, snare, kick). */
export function linearLanes(p: string): Lanes {
  const lane = (f: (c: string) => string) => [...p].map(f).join('');
  return {
    h: lane((c) => (c === 'h' ? 'x' : c === 'o' ? 'o' : '.')),
    s: lane((c) => (c === 'S' ? 'X' : c === 'g' ? 'g' : '.')),
    k: lane((c) => (c === 'k' ? 'x' : '.')),
  };
}
/** A group (e.g. "hsk") repeated across a bar of 16 steps — the group of 3 shifts against the beat. */
const grouped = (g: string, b: number): string => Array.from({ length: 16 }, (_, i) => g[(b * 16 + i) % g.length]).join('').replace(/s/g, 'S');
const rot = (p: string, n: number): string => p.slice(-n) + p.slice(0, -n);
const LINEAR_GOAL: DrumGoal = { linear: { ms: 15, max: 0.05 } };

function genLinear(s: DrillSpec, lv: number, op: number): Drill {
  const fin = (hits: DH[], en: string, he: string, bpm: number, o: { goal?: DrumGoal; bars?: number; tail?: number } = {}) =>
    finish(s, hits, { title: t(en, he), bpm, bars: o.bars ?? 4, tail: o.tail, mic: false, goal: { ...LINEAR_GOAL, ...(o.goal ?? {}) }, ...drumBand('funk', o.bars ?? 4) });
  switch (lv) {
    case 1: {
      const g = ['hsk', 'hskk', 'hhsk'][op];
      return fin(rep(4, (b) => bar(linearLanes(grouped(g, b)), 4, b * 4)), `Linear groups · ${g.toUpperCase()} across the bar`, `קבוצות ליניאריות · ${g.toUpperCase()} לאורך התיבה`, 70);
    }
    case 2:
    case 3: {
      const p = LINEAR[lv === 2 ? 'ghost' : 'barks'][op];
      return fin(rep(4, (b) => bar(linearLanes(p), 4, b * 4)), lv === 2 ? `Linear groove with ghosts · ${op + 1}` : `Linear groove with open-hat barks · ${op + 1}`, lv === 2 ? `גרוב ליניארי עם רפאים · ${op + 1}` : `גרוב ליניארי עם פתיחות היי־האט · ${op + 1}`, lv === 2 ? 76 : 80, { goal: { ghost: 0.75, ...(lv === 3 ? { hat: true } : {}) } });
    }
    case 4: {
      // A bar of groove, a bar of linear 32nds (hands on the toms and snare, the kick in the group), x2; land on 1.
      const g = ['RLK', 'RLKK', 'RRLK'][op];
      const V: Record<string, DrumVoice> = { R: 'tom1', L: 'snare', K: 'kick' };
      const fillBar = (b0: number): DH[] => Array.from({ length: 32 }, (_, i) => {
        const c = g[i % g.length];
        return { b: b0 + i / 8, v: V[c], h: c === 'L' ? ('L' as const) : ('R' as const), d: 1 / 8, ...(i % g.length === 0 ? { acc: true } : {}) };
      });
      const groove = LINEAR.ghost[op];
      const hits = [...bar(linearLanes(groove), 4, 0), ...fillBar(4), ...bar(linearLanes(groove), 4, 8), ...fillBar(12), { b: 16, v: 'crash' as DrumVoice, h: 'R' as const, d: 1 }, { b: 16, v: 'kick' as DrumVoice, h: 'R' as const, d: 1 }];
      return fin(hits, `Linear 32nd-note fill · ${g} · land on 1`, `מעבר ליניארי בשלושים-ושתיים · ${g} · נחיתה על 1`, 60, { tail: 1, goal: { landing: { beats: [16], ms: 25 } } });
    }
    default: {
      // The groove displaced by a 16th every bar (the backbeat lands on the "e", the "&", the "a" of 2 and 4).
      const p = LINEAR.ghost[op];
      return fin(rep(4, (b) => bar(linearLanes(rot(p, b)), 4, b * 4)), `Displaced linear groove · a 16th each bar · ${op + 1}`, `גרוב ליניארי מוזז · שש-עשרית בכל תיבה · ${op + 1}`, 84, { goal: { ghost: 0.7 } });
    }
  }
}

// ───────────────────────────── d-brush: brushes ─────────────────────────────

const BRUSH_CHART = ['Fmaj7', 'Dm7', 'Gm7', 'C7', 'Am7', 'D7', 'Gm7', 'C7'];
function genBrush(s: DrillSpec, lv: number, op: number): Drill {
  // The right-hand taps are scored (timing, swing, accents); the left hand's sweep is shown, never scored (d-jazz 9).
  const feather = op === 2 ? { k: 'g..g..g..g..' } : {};
  let l: Lanes;
  let what: T2;
  let bpm = 100;
  let goal: DrumGoal = {};
  let sub = 3;
  switch (lv) {
    case 1:
      l = { s: op === 1 ? 'x.....x.....' : '...x.....x..', p: FOOT24, ...feather };
      what = op === 1 ? t('taps on 1 and 3', 'נקישות על 1 ו-3') : t('taps on 2 and 4', 'נקישות על 2 ו-4');
      bpm = 52;
      break;
    case 2:
      l = { s: RIDE, p: FOOT24, ...feather };
      what = t('the ride pattern in taps', 'תבנית הרייד בנקישות');
      goal = { swing: SWING };
      break;
    case 3: {
      const acc = ['.....X.....X', '..X.....X...', '.....X..X...'][op];
      l = { s: [...RIDE].map((c, i) => (acc[i] === 'X' ? 'X' : c)).join(''), p: FOOT24 };
      what = t('comping accents in the taps', 'הדגשות קומפינג בנקישות');
      goal = { swing: SWING, accentPos: 0.8 };
      break;
    }
    default:
      l = { s: 'xxxxxxxx', p: '..x...x.', ...(op === 2 ? { k: 'g...g...' } : {}) };
      what = op === 1 ? t('flat 8ths, accents on 2 and 4', 'שמיניות שטוחות, הדגשות על 2 ו-4') : t('flat 8ths', 'שמיניות שטוחות');
      if (op === 1) l = { ...l, s: 'xxXxxxXx' };
      sub = 2;
      bpm = 180;
      goal = op === 1 ? { accentPos: 0.8 } : {};
  }
  const hits = rep(8, (k) => bar(l, sub, k * 4, { sHand: () => 'R' }));
  const out = finish(s, sub === 3 && lv >= 2 ? swungRide(hits) : hits, { title: t(`Brushes · ${what.en} (the sweep is yours, not scored)`, `מברשות · ${what.he} (הסוויפ שלכם, לא נמדד)`), bpm, bars: 8, mic: false, goal: { ...goal, ...(op === 2 && lv !== 4 ? { ghost: 0.8 } : {}) }, band: { style: lv === 1 ? 'ballad' : 'swing', bass: true }, chart: Array.from({ length: 8 }, (_, i) => BRUSH_CHART[i % 8]) });
  return out;
}

// ───────────────────────────── d-oddtempo: odd meters at tempo ─────────────────────────────

/** An accented hat line: the first eighth of each group accented. */
const accHat = (groups: number[]): string => groups.map((g) => 'X' + 'x'.repeat(g - 1)).join('');
interface Odd {
  meter: number;
  groups: number[];
  l: Lanes;
  name: T2;
  pulse8: boolean;
}
function genOdd(s: DrillSpec, lv: number, op: number): Drill {
  if (lv === 5) {
    // A prog song in changing meters (the d-prog song engine) at concert tempo.
    const d = generateDrums({ ...s, family: 'd-prog', kind: '10:song' });
    return { ...d, spec: { ...d.spec, family: s.family, kind: s.kind }, itemId: drumItemId(s), title: t(`${d.title.en} · at tempo`, `${d.title.he} · בטמפו`) };
  }
  const G: Odd[][] = [
    [
      { meter: 10, groups: [2, 2, 2, 2, 2], l: { h: 'xxxxxxxxxx', k: 'x...x.x...', s: '..x.....x.' }, name: t('5/4 as 3+2', '5/4 כ-3+2'), pulse8: false },
      { meter: 10, groups: [2, 2, 2, 2, 2], l: { h: 'xxxxxxxxxx', k: 'x...x.....', s: '..x.....x.' }, name: t('5/4 as 2+3', '5/4 כ-2+3'), pulse8: false },
      { meter: 10, groups: [2, 2, 2, 2, 2], l: { r: 'x.x.x.x.x.', k: 'x..x..x...', s: '....x....x' }, name: t('5/4 on the ride', '5/4 על הרייד'), pulse8: false },
    ],
    [
      { meter: 7, groups: [2, 2, 3], l: { h: accHat([2, 2, 3]), k: 'x...x..', s: '..x..x.' }, name: t('7/8 as 2+2+3', '7/8 כ-2+2+3'), pulse8: true },
      { meter: 7, groups: [3, 2, 2], l: { h: accHat([3, 2, 2]), k: 'x....x.', s: '...x..x' }, name: t('7/8 as 3+2+2', '7/8 כ-3+2+2'), pulse8: true },
      { meter: 7, groups: [2, 3, 2], l: { h: accHat([2, 3, 2]), k: 'x....x.', s: '..x....' }, name: t('7/8 as 2+3+2', '7/8 כ-2+3+2'), pulse8: true },
    ],
    [
      { meter: 14, groups: [2, 2, 2, 2, 2, 2, 2], l: { h: 'xxxxxxxxxxxxxx', k: 'x...x...x...x.', s: '..x...x...x...' }, name: t('7/4 as 4+3', '7/4 כ-4+3'), pulse8: false },
      { meter: 9, groups: [2, 2, 2, 3], l: { h: accHat([2, 2, 2, 3]), k: 'x...x....', s: '..x...x..' }, name: t('9/8 as 2+2+2+3', '9/8 כ-2+2+2+3'), pulse8: true },
      { meter: 9, groups: [3, 3, 3], l: { h: accHat([3, 3, 3]), k: 'x.....x..', s: '...x.....' }, name: t('9/8 as 3+3+3', '9/8 כ-3+3+3'), pulse8: true },
    ],
    [
      { meter: 11, groups: [3, 3, 3, 2], l: { h: accHat([3, 3, 3, 2]), k: 'x.....x....', s: '...x.....x.' }, name: t('11/8 as 3+3+3+2', '11/8 כ-3+3+3+2'), pulse8: true },
      { meter: 11, groups: [2, 2, 3, 2, 2], l: { h: accHat([2, 2, 3, 2, 2]), k: 'x...x....x.', s: '..x...x....' }, name: t('11/8 as 2+2+3+2+2', '11/8 כ-2+2+3+2+2'), pulse8: true },
      { meter: 13, groups: [3, 3, 3, 2, 2], l: { h: accHat([3, 3, 3, 2, 2]), k: 'x.....x....x.', s: '...x.....x...' }, name: t('13/8 as 3+3+3+2+2', '13/8 כ-3+3+3+2+2'), pulse8: true },
    ],
  ];
  const g = G[lv - 1][op];
  // Quarter-note meters (5/4, 7/4) are written in 8ths: 2 steps a beat over meter/2 beats; eighth meters 1 step a beat.
  const beatsPerBar = g.pulse8 ? g.meter : g.meter / 2;
  const sub = g.pulse8 ? 1 : 2;
  // Every fourth bar ends with a fill: the snare on every step of the last group, into a crash and kick on the next 1.
  const lastGroup = g.groups[g.groups.length - 1];
  const fill = (b0: number): DH[] => {
    const from = g.pulse8 ? g.meter - lastGroup : (g.meter - lastGroup) / 2;
    const step = g.pulse8 ? 0.5 : 0.25;
    const n = Math.round((beatsPerBar - from) / step);
    return line('RL', n, step, b0 + from, (i) => ({ v: (['snare', 'tom1', 'tom2', 'tom3'] as DrumVoice[])[Math.floor((i / n) * 4)] }));
  };
  const hits: DH[] = [];
  for (let b = 0; b < 8; b++) {
    const b0 = b * beatsPerBar;
    const fillBar = lv === 1 ? b === 3 || b === 7 : lv === 4 && (b === 3 || b === 7);
    const groove = bar(g.l, sub, b0, fillBar ? { to: g.pulse8 ? g.meter - lastGroup : (g.meter - lastGroup) / 2 } : {});
    hits.push(...groove, ...(fillBar ? fill(b0) : []));
    if (fillBar && b > 0) hits.push({ b: b0 + beatsPerBar, v: 'crash', h: 'R', d: 1 });
  }
  const crashes = hits.filter((h) => h.v === 'crash').map((h) => h.b);
  const clean = hits.filter((h) => !(h.v === 'crash' && h.b >= 8 * beatsPerBar - 1e-9));
  const landing = crashes.filter((b) => b < 8 * beatsPerBar - 1e-9);
  return finish(s, clean, { title: t(`${g.name.en} at tempo`, `${g.name.he} בטמפו`), bpm: g.pulse8 ? 240 : 110, bars: 8, meter: beatsPerBar, ...(g.pulse8 ? { pulse: 8 as const, groups: g.groups } : {}), mic: false, goal: { ...(landing.length ? { landing: { beats: landing, ms: 30 } } : {}), ...(g.pulse8 ? { accentPos: 0.8, accentVoices: ['hihat' as DrumVoice] } : {}) } });
}

// ───────────────────────────── d-trade: soloing over a form ─────────────────────────────

const BLUES = ['F7', 'Bb7', 'F7', 'F7', 'Bb7', 'Bb7', 'F7', 'D7', 'Gm7', 'C7', 'F7', 'C7'];
const AABA_A = ['Bbmaj7', 'Gm7', 'Cm7', 'F7', 'Dm7', 'G7', 'Cm7', 'F7'];
const AABA_B = ['D7', 'D7', 'G7', 'G7', 'C7', 'C7', 'F7', 'F7'];
const AABA = [...AABA_A, ...AABA_A, ...AABA_B, ...AABA_A];

/**
 * Time and solo bars over a form. `plan` lists [bars, 'time' | 'solo'] blocks; time bars are the ride, the foot on 2 and 4
 * (and the variant's comping), measured note for note; solo bars are free — at least `perBar` hits a bar, nothing
 * written — and every block after a solo starts with a crash + kick on its 1 (the landing, ±25 ms). The band lays out in
 * the solo bars when trading; with `bandPlays` it keeps comping (a chorus solo over the form).
 */
function formTake(s: DrillSpec, plan: [number, 'time' | 'solo'][], chart: string[], o: { bpm: number; fast?: boolean; bandPlays?: boolean; hitsAt?: number[]; title: T2; perBar?: number }): Drill {
  const op = s.option ?? 0;
  const time: Lanes = op === 1 ? { r: RIDE, p: FOOT24, k: 'g..g..g..g..' } : op === 2 ? { r: RIDE, p: FOOT24, s: '.....x.....x' } : { r: RIDE, p: FOOT24 };
  const hits: DH[] = [];
  const zones: [number, number][] = [];
  const rests: [number, number][] = [];
  const land: number[] = [];
  let bar0 = 0;
  let prevSolo = false;
  for (const [n, kind] of plan) {
    const b0 = bar0 * 4;
    if (kind === 'time') {
      for (let k = 0; k < n; k++) hits.push(...bar(time, 3, (bar0 + k) * 4).filter((h) => !(prevSolo && k === 0 && Math.abs(h.b - b0) < 1e-6)));
      if (prevSolo) {
        hits.push({ b: b0, v: 'crash', h: 'R', d: 1 }, { b: b0, v: 'kick', h: 'R', d: 1 });
        land.push(b0);
      }
    } else {
      // A chorus solo lands each phrase too (crash + kick on its 1).
      if (prevSolo) {
        hits.push({ b: b0, v: 'crash', h: 'R', d: 1 }, { b: b0, v: 'kick', h: 'R', d: 1 });
        land.push(b0);
      }
      zones.push([b0, b0 + n * 4]);
      if (!o.bandPlays) rests.push([b0, b0 + n * 4]);
    }
    prevSolo = kind === 'solo';
    bar0 += n;
  }
  const total = bar0;
  // A last landing on the bar after the form (crash + kick), when the form ends on a solo.
  if (prevSolo) {
    hits.push({ b: total * 4, v: 'crash', h: 'R', d: 1 }, { b: total * 4, v: 'kick', h: 'R', d: 1 });
    land.push(total * 4);
  }
  // Ensemble set-up hits inside the last solo (a written figure the drummer catches: crash + kick).
  for (const b of o.hitsAt ?? []) {
    hits.push({ b, v: 'crash', h: 'R', d: 0.5, acc: true }, { b, v: 'kick', h: 'R', d: 0.5 });
    land.push(b);
  }
  const zonesOut = zones.map(([a, b]): [number, number] => [a, b]).map(([a, b]) => {
    const cut = (o.hitsAt ?? []).filter((x) => x >= a && x < b);
    return cut.length ? ([a, Math.min(...cut) - 0.5] as [number, number]) : ([a, b] as [number, number]);
  });
  const perBar = o.perBar ?? 3;
  const minHits = Math.round(perBar * Math.min(...zonesOut.map(([a, b]) => (b - a) / 4)));
  const swung = swungRide(hits);
  const band = drumBand('swing', total, chart, o.bandPlays ? undefined : rests);
  return finish(s, swung, { title: o.title, bpm: o.bpm, bars: total, tail: prevSolo ? 1 : 0, mic: false, goal: { swing: o.fast ? SWING_FAST : SWING, landing: { beats: land, ms: 25 }, impro: { zones: zonesOut, min: minHits }, ...(op === 1 ? { ghost: 0.8 } : {}) }, ...band });
}

function genTrade(s: DrillSpec, lv: number, op: number): Drill {
  const nm = [t('ride and foot', 'רייד ורגל'), t('with a feathered kick', 'עם קיק מרוכך'), t('with comping', 'עם קומפינג')][op];
  const ttl = (en: string, he: string) => t(`${en} · ${nm.en}`, `${he} · ${nm.he}`);
  switch (lv) {
    case 1:
      return formTake(s, [[4, 'time'], [4, 'solo'], [4, 'time'], [4, 'solo'], [4, 'time'], [4, 'solo']], [...BLUES, ...BLUES], { bpm: 120, title: ttl('Trading 4s on the blues, two choruses', 'חילופי 4 על הבלוז, שני סבבים') });
    case 2:
      return formTake(s, [[8, 'time'], [8, 'solo'], [8, 'time'], [8, 'solo']], AABA, { bpm: 120, title: ttl('Trading 8s on AABA', 'חילופי 8 על AABA') });
    case 3:
      return formTake(s, [[4, 'time'], [4, 'solo'], [4, 'time'], [4, 'solo'], [4, 'time'], [4, 'solo'], [4, 'time'], [4, 'solo']], AABA, { bpm: 200, fast: true, title: ttl('Trading 4s up-tempo on AABA', 'חילופי 4 בטמפו מהיר על AABA'), perBar: 4 });
    case 4:
      // A chorus of time, then a chorus of solo over the blues with the band comping: land each 4-bar phrase.
      return formTake(s, [[12, 'time'], [4, 'solo'], [4, 'solo'], [4, 'solo'], [12, 'time']], [...BLUES, ...BLUES, ...BLUES], { bpm: 110, bandPlays: true, title: ttl('A solo chorus over the blues, the band playing', 'סבב סולו על הבלוז, הלהקה מנגנת') });
    default:
      // A whole AABA chorus solo with the band, landing every section; set-up hits in the last A (bar 31: 1 and the "&" of 2).
      return formTake(s, [[8, 'time'], [8, 'solo'], [8, 'solo'], [8, 'solo'], [8, 'solo']], [...AABA_A, ...AABA], { bpm: 120, bandPlays: true, hitsAt: [38 * 4 + 1.5, 39 * 4], title: ttl('A solo chorus over AABA with set-up hits', 'סבב סולו על AABA עם מכות הכנה') });
  }
}
