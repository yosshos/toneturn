// The upright / double-bass track (BASS_CURRICULUM §5.1, BASS_AUDIT B16): six families on the `upright` tuning
// (EADG, fretted: false — "frets" are semitone places on the fingerboard). Intonation is part of every pass
// (goal.bass.cents, measured by the analysis track); bowed drills say `bow: 'arco'`, plucked ones `bow: 'pizz'`.
// The scale / arpeggio levels follow the ABRSM model (from memory, separate bows then slurred, ♩≈40 → ♩≈76);
// positions follow Simandl (½, I, II, III, IV, thumb). All material is generated.
//
// Pure. Imports bass.ts helpers only inside functions (module load order).

import type { BassGoal, Drill, DrillSpec } from './types';
import { noteAt, type Tuning } from '../fretboard';
import { guitarItemId, mod, modeInts, rng, SIG, windowScale } from './guitar';
import { drillOf, genRead, genWalk, rootOf, spell, type BN } from './bass';
import { generateUprightNiche, UP_WALK_NICHE } from './bassNiche2';

/** EN / HE pair (local: bass.ts helpers can't run at module load). */
const tt = (en: string, he: string) => ({ en, he });

/** Simandl positions as the fret place of the index finger on the E string: ½, I, II, III, IV, thumb (12). */
const POS = [1, 2, 3, 5, 7, 12];
const POS_T = [tt('Half position', 'חצי מצב'), tt('First position', 'מצב ראשון'), tt('Second position', 'מצב שני'), tt('Third position', 'מצב שלישי'), tt('Fourth position', 'מצב רביעי'), tt('Thumb position', 'מצב אגודל')];

const withCents = (d: Drill, cents: number, extra: BassGoal = {}): Drill => ({ ...d, goal: { ...d.goal, bass: { ...(d.goal.bass ?? {}), ...extra, cents } } });

/** Grade bands of the generated studies (ABRSM-style: lists A–C are pieces; these are original études in that style). */
const ETUDE_T = [tt('Study in the Grade 1–3 style', 'אטיוד בסגנון שלבים 1–3'), tt('Study in the Grade 4–5 style', 'אטיוד בסגנון שלבים 4–5'), tt('Study in the Grade 6–8 style', 'אטיוד בסגנון שלבים 6–8')];

/**
 * An original study (étude) per ABRSM grade band, no chords: an 8-bar period (4 + 4, a half cadence on the 5th, the end
 * on the tonic) — Gr 1–3 in first position, quarters and halves; Gr 4–5 in 3/4 up to the 10th with 8ths, dotted
 * figures and slurred pairs; Gr 6–8 twelve bars up to the 12th (shifts toward thumb position) with 16th figures.
 * Bowed (arco, slurs marked) or pizz. Generated from rules, seeded by key and grade.
 */
function genEtude(s: DrillSpec, tu: Tuning, bow: 'arco' | 'pizz'): Drill {
  const key = mod(s.key, 12);
  const g = Math.min(2, Math.max(0, s.option ?? 0));
  const rnd = rng(`b-up-etude:${bow}:${key}:${g}:${s.minor ? 'm' : ''}`);
  const meter = g === 1 ? 3 : 4;
  const bars = g === 2 ? 12 : 8;
  const ints = s.minor ? [0, 2, 3, 5, 7, 8, 11] : modeInts(0);
  const R = rootOf(tu, key);
  // Scale degrees as pitches from the tonic up to the grade's ceiling (octave / 10th / 12th).
  const top = [12, 16, 19][g];
  const deg: number[] = [];
  for (let o = 0; o < 3; o++) for (const x of ints) if (x + 12 * o <= top) deg.push(R + x + 12 * o);
  const CELLS: number[][][] = [
    [[1, 1, 1, 1], [2, 1, 1], [1, 1, 2], [2, 2]],
    [[1, 1, 1], [1.5, 0.5, 1], [0.5, 0.5, 1, 1], [1, 0.5, 0.5, 1], [2, 1]],
    [[1, 1, 1, 1], [0.5, 0.5, 1, 1, 1], [0.25, 0.25, 0.25, 0.25, 1, 1, 1], [1.5, 0.5, 1, 1], [0.5, 0.5, 0.5, 0.5, 2]],
  ];
  const line: BN[] = [];
  let i = 0;
  let dir = 1;
  for (let bar = 0; bar < bars; bar++) {
    const b0 = bar * meter;
    const cadence = bar === 3 || bar === bars - 1 || (g === 2 && bar === 7);
    if (cadence) {
      // the end of a phrase: the 5th (half cadence) or the tonic, held to the bar line (approached by step)
      const goal = bar === bars - 1 ? 0 : deg.findIndex((p) => mod(p - R, 12) === 7);
      const near = deg.map((_p, k) => ({ k, d: Math.abs(k - i) })).filter((x) => mod(deg[x.k] - deg[goal], 12) === 0).sort((a, b) => a.d - b.d)[0].k;
      if (Math.abs(near - i) > 1) line.push({ b: b0, d: 1, p: deg[near + (near > i ? -1 : 1)] }), line.push({ b: b0 + 1, d: meter - 1, p: deg[near] });
      else line.push({ b: b0, d: meter, p: deg[near] });
      i = near;
      continue;
    }
    const cell = CELLS[g].filter((c) => c.reduce((a, x) => a + x, 0) === meter);
    const durs = cell[Math.floor(rnd() * cell.length)];
    let b = b0;
    for (const d of durs) {
      line.push({ b, d, p: deg[i] });
      b += d;
      // mostly steps; a leap of a 3rd (Gr 4+) or an arpeggio 4th / 5th (Gr 6+); turn at the edges
      const r = rnd();
      const step = r < 0.7 ? 1 : r < 0.9 || g < 2 ? 2 : 3 + Math.floor(rnd() * 2);
      if (rnd() < 0.25) dir = -dir;
      if (i + dir * step < 0 || i + dir * step >= deg.length) dir = -dir;
      i = Math.max(0, Math.min(deg.length - 1, i + dir * step));
    }
  }
  // Bowing: one bow per note, alternating; from Gr 4 slurred pairs of short notes (the second marked as a slur).
  let down = true;
  const bowed: BN[] = line.map((x, k) => {
    const slur = bow === 'arco' && g >= 1 && k > 0 && x.d <= 0.5 && line[k - 1].d <= 0.5 && !line[k - 1].tech && Math.floor(line[k - 1].b) === Math.floor(x.b);
    if (!slur) down = !down;
    return { ...x, st: bow === 'arco' ? (down ? 'U' : 'D') : 'i', ...(slur ? { tech: 'hammer' as const } : {}) };
  });
  // Gr 1–5 stay in the low positions (Simandl ½–IV): open strings where they fit, else the place nearest the hand,
  // which moves only when it must (no place above the 7th semitone unless the note needs it).
  if (g < 2) {
    let hand = 2;
    for (const x of bowed) {
      const cands = tu.open.map((o, k) => ({ s: k + 1, f: x.p - o })).filter((c) => c.f >= 0 && c.f <= 12);
      const cost = (c: { f: number }) => (c.f === 0 ? 0 : Math.abs(c.f - hand) + (c.f > 7 ? 6 : 0));
      const best = cands.sort((a, b) => cost(a) - cost(b))[0];
      if (!best) continue;
      ((x.s = best.s), (x.f = best.f));
      if (best.f > 0) hand = best.f;
    }
  }
  const d = drillOf(s, tu, bowed, { ...ETUDE_T[g], meter, evenness: false, bow, show: 'staff', keySig: SIG[s.minor ? mod(key + 3, 12) : key], open: g > 0 ? false : undefined });
  return withCents(d, g === 0 ? 12 : 8, { shiftGap: 60 });
}

/**
 * Treble-clef reading for the upright's high register (ABRSM Gr 8: thumb position): melodies on the G and D strings
 * from the octave up (op 0: thumb position, frets 12–17), or from the fourth position up with shifts (op 1: 7–19).
 */
function genTreble(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const rnd = rng(`b-up-treble:${key}:${op}`);
  const [lo, hi] = op === 1 ? [7, 19] : [12, 17];
  const set = windowScale(tu, key, s.minor ? modeInts(5) : modeInts(0), lo, hi, [1, 2]);
  let i = Math.max(0, set.findIndex((x) => mod(noteAt(tu, x.s, x.f) - key, 12) === 0));
  const line: BN[] = [];
  const bars = 8;
  let b = 0;
  while (b < bars * 4 - 1e-9) {
    const d = Number.isInteger(b) ? [2, 1, 1, 0.5][Math.floor(rnd() * 4)] : 0.5;
    const dd = Math.min(d, (Math.floor(b / 4 + 1e-9) + 1) * 4 - b);
    const x = set[i];
    line.push({ b, d: dd, p: noteAt(tu, x.s, x.f), s: x.s, f: x.f });
    b += dd;
    i = Math.max(0, Math.min(set.length - 1, i + [-2, -1, -1, 1, 1, 2][Math.floor(rnd() * 6)]));
  }
  // End on the tonic nearest the last note (no leap at the end).
  const tonics = set.map((x, k) => (mod(noteAt(tu, x.s, x.f) - key, 12) === 0 ? k : -1)).filter((k) => k >= 0);
  const last = set.findIndex((x) => x.s === line[line.length - 1].s && x.f === line[line.length - 1].f);
  const end = set[tonics.length ? tonics.sort((a, b) => Math.abs(a - last) - Math.abs(b - last))[0] : 0];
  line.push({ b: bars * 4, d: 2, p: noteAt(tu, end.s, end.f), s: end.s, f: end.f });
  const nm = op === 1 ? tt('Treble clef with shifts, up to thumb position', 'מפתח סול עם מעברים, עד מצב אגודל') : tt('Treble clef: thumb position', 'מפתח סול: מצב אגודל');
  const d = drillOf(s, tu, line.map((x, k) => ({ ...x, st: k % 2 ? 'U' : 'D' })), { ...nm, evenness: false, bow: 'arco', show: 'staff', keySig: SIG[s.minor ? mod(key + 3, 12) : key], pos: lo });
  return withCents(d, 10, { shiftGap: 60 });
}

export function generateUpright(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const n = tu.open.length;
  if (s.kind === 'etude') return genEtude(s, tu, s.family === 'b-up-pizz' ? 'pizz' : 'arco');
  if (s.kind === 'treble') return genTreble(s, tu);
  switch (s.family) {
    case 'b-up-pos': {
      // Simandl 1-2-4 in one position on every string (up and back), long notes; thumb position on the two top strings.
      const P = POS[op % POS.length];
      const thumb = P >= 12;
      const strs = thumb ? [2, 1] : Array.from({ length: n }, (_, i) => n - i);
      const up: BN[] = [];
      for (const str of strs) for (const df of thumb ? [0, 2, 4, 5] : [0, 1, 3]) up.push({ b: 0, d: 1, p: noteAt(tu, str, P + df), s: str, f: P + df });
      const seq = [...up, ...up.slice(0, -1).reverse()].map((x, i) => ({ ...x, b: i }));
      seq[seq.length - 1].d = 2;
      const d = drillOf(s, tu, seq, { ...POS_T[op % POS_T.length], evenness: false, bow: 'pizz', pos: P });
      return withCents(d, op < 3 ? 12 : 8, { shiftGap: 60 });
    }
    case 'b-up-arco': {
      // Bowing: open-string long tones, separate bows, slurs, hooked bowing, string-crossing slurs, scales in rhythms.
      const strs = Array.from({ length: n }, (_, i) => n - i);
      const line: BN[] = [];
      const R = rootOf(tu, key);
      const sc = [...modeInts(0), 12].map((x) => R + x);
      switch (op % 6) {
        case 0:
          strs.forEach((str, i) => line.push({ b: i * 4, d: 4, p: tu.open[str - 1], s: str, f: 0, st: i % 2 ? 'U' : 'D' }));
          break;
        case 1:
          sc.forEach((p, i) => line.push({ b: i, d: 1, p, st: i % 2 ? 'U' : 'D' }));
          break;
        case 2:
          sc.forEach((p, i) => line.push({ b: i, d: 1, p, st: Math.floor(i / 2) % 2 ? 'U' : 'D', tech: i % 2 ? 'hammer' : undefined }));
          break;
        case 3:
          sc.forEach((p, i) => line.push({ b: i, d: i % 2 ? 0.25 : 0.75, p, st: Math.floor(i / 2) % 2 ? 'U' : 'D' }));
          line.forEach((x, i) => (x.b = Math.floor(i / 2) * 1 + (i % 2 ? 0.75 : 0)));
          break;
        case 4:
          for (let k = 0; k < 8; k++) {
            const a = strs[k % (n - 1)];
            line.push({ b: k, d: 0.5, p: tu.open[a - 1], s: a, f: 0, st: k % 2 ? 'U' : 'D' }, { b: k + 0.5, d: 0.5, p: tu.open[a - 2], s: a - 1, f: 0, st: k % 2 ? 'U' : 'D' });
          }
          break;
        default:
          [...sc, ...sc.slice(0, -1).reverse()].forEach((p, i) => line.push({ b: i / 2, d: 0.5, p, st: i % 2 ? 'U' : 'D' }));
      }
      const NAMES_T = [tt('Long tones on open strings', 'צלילים ארוכים על מיתרים פתוחים'), tt('Separate bows', 'קשתות נפרדות'), tt('Slurs: two notes a bow', 'לגאטו: שני צלילים בקשת'), tt('Hooked bowing (dotted rhythm)', 'קשת מחוברת (מקצב מנוקד)'), tt('String crossing under one bow', 'מעבר מיתרים בקשת אחת'), tt('Scales in rhythm (8ths)', 'סולמות במקצב (שמיניות)')];
      // Final bass check: the bowed scales (1, 2, 3, 5) stay in one position from the root, open strings allowed, as
      // ABRSM's early grades finger them — they used to creep up the E string to fret 15.
      const scale = [1, 2, 3, 5].includes(op % 6);
      const rootFret = R - tu.open[n - 1];
      const d = drillOf(s, tu, line, { ...NAMES_T[op % 6], evenness: op % 6 !== 3, bow: 'arco', ...(scale ? { pos: Math.max(1, rootFret - 1), stay: true } : { open: op % 6 === 0 || op % 6 === 4 }) });
      return withCents(d, 12, op % 6 === 0 ? { loudSd: 3 } : {});
    }
    case 'b-up-scales': {
      // ABRSM model: 1 → 2 → 3 octaves, arpeggios, dominant 7ths, diminished 7ths, broken and running 3rds.
      const kinds = ['scale1', 'arp1', 'scale2', 'arp2', 'dom7', 'dim7', 'thirds-broken', 'thirds-run', 'scale3', 'arp3'];
      const k = kinds[op % kinds.length];
      const R = rootOf(tu, key);
      let ps: number[] = [];
      const maj = modeInts(0);
      const oct = (ints: number[], o: number) => [...Array.from({ length: o }, (_, i) => ints.map((x) => x + 12 * i)).flat(), 12 * o];
      if (k === 'scale1' || k === 'scale2' || k === 'scale3') ps = oct(maj, k === 'scale1' ? 1 : k === 'scale2' ? 2 : 3);
      else if (k === 'arp1' || k === 'arp2' || k === 'arp3') ps = oct([0, 4, 7], k === 'arp1' ? 1 : k === 'arp2' ? 2 : 3);
      else if (k === 'dom7') ps = oct([0, 4, 7, 10], 1).map((x) => x + 7);
      else if (k === 'dim7') ps = oct([0, 3, 6, 9], 1);
      else {
        const deg = (i: number) => maj[i % 7] + 12 * Math.floor(i / 7);
        for (let i = 0; i < 8; i++) ps.push(deg(i), deg(i + 2));
        if (k === 'thirds-run') ps = Array.from({ length: 10 }, (_, i) => deg(i));
      }
      const up = ps.map((x) => R + x);
      const all = [...up, ...up.slice(0, -1).reverse()];
      const line: BN[] = all.map((p, i) => ({ b: i, d: i === all.length - 1 ? 2 : 1, p, st: i % 2 ? 'U' : 'D' }));
      const T: Record<string, { en: string; he: string }> = {
        scale1: tt('One-octave scale, separate bows', 'סולם באוקטבה אחת, קשתות נפרדות'),
        arp1: tt('One-octave arpeggio', 'ארפג׳יו באוקטבה אחת'),
        scale2: tt('Two-octave scale', 'סולם בשתי אוקטבות'),
        arp2: tt('Two-octave arpeggio', 'ארפג׳יו בשתי אוקטבות'),
        dom7: tt('Dominant 7th arpeggio', 'ארפג׳יו ספטאקורד דומיננטי'),
        dim7: tt('Diminished 7th arpeggio', 'ארפג׳יו ספטאקורד מוקטן'),
        'thirds-broken': tt('Scale in broken 3rds', 'סולם בטרצות שבורות'),
        'thirds-run': tt('Running 3rds', 'טרצות רצות'),
        scale3: tt('Three-octave scale', 'סולם בשלוש אוקטבות'),
        arp3: tt('Three-octave arpeggio', 'ארפג׳יו בשלוש אוקטבות'),
      };
      const d = drillOf(s, tu, line, { ...T[k], bow: 'arco', open: false, evenness: true });
      return withCents(d, k === 'scale1' || k === 'arp1' ? 12 : 8, { shiftGap: 60 });
    }
    case 'b-up-pizz': {
      // Jazz pizzicato sound: long, even quarters that sustain to the next note, with the ride.
      const prog: [number, number][] = op === 1 ? [[2, 0], [7, 0], [0, 0], [0, 0]] : op === 2 ? [[0, 0], [5, 0], [0, 0], [0, 0], [5, 0], [5, 0], [0, 0], [0, 0], [7, 0], [5, 0], [0, 0], [7, 0]] : [[0, 0], [5, 0], [7, 0], [0, 0]];
      const line: BN[] = [];
      prog.forEach(([d], bar) => {
        const R = rootOf(tu, key + d);
        [R, R + 7, R + 12, R + 7].forEach((p, k) => line.push({ b: bar * 4 + k, d: 1, p, ct: true }));
      });
      line.push({ b: prog.length * 4, d: 2, p: rootOf(tu, key), ct: true });
      const chart = prog.map(([d]) => `${spell(key + d, key)}${op === 1 && d === 2 ? 'm7' : op === 1 && d === 7 ? '7' : ''}`);
      const d = drillOf(s, tu, line, { en: op === 1 ? 'Pizz quarters over ii–V–I, full length' : op === 2 ? 'Pizz quarters through a blues, full length' : 'Pizz quarters, full length', he: op === 1 ? 'רבעים בפיציקטו על ii–V–I, באורך מלא' : op === 2 ? 'רבעים בפיציקטו לאורך בלוז, באורך מלא' : 'רבעים בפיציקטו, באורך מלא', chart, bow: 'pizz', drums: { groove: 'swing' } });
      return withCents(d, 15, { lengths: true, loudSd: 3 });
    }
    case 'b-up-walk': {
      // BASS_NICHE_PLAN J7: levels 6–9 (standards, up-tempo, thumb-position solo, arco head) are built in bassNiche2.ts.
      if (UP_WALK_NICHE.includes(s.kind)) return generateUprightNiche(s, tu);
      // F9 on the upright: the same walking levels, with intonation and pizz.
      const d = genWalk({ ...s, family: 'b-walk' }, tu);
      return withCents({ ...d, spec: { ...d.spec, family: s.family }, itemId: guitarItemId(s), bow: 'pizz' }, 15);
    }
    case 'b-up-read': {
      // Reading by position (ABRSM sight-reading model), and the tenor clef for the upper register.
      const tenor = s.kind === 'tenor';
      const d = genRead({ ...s, family: 'b-read', kind: tenor ? 'pos' : s.kind, option: tenor ? 2 : s.option }, tu);
      const title = tenor ? { en: d.title.en.replace(/^[^·]+/, 'Tenor clef, upper register '), he: d.title.he.replace(/^[^·]+/, 'מפתח טנור, אזור גבוה ') } : d.title;
      return withCents({ ...d, title, spec: { ...d.spec, family: s.family, kind: s.kind, option: s.option }, itemId: guitarItemId(s), bow: 'arco', show: 'staff' }, 15);
    }
  }
  throw new Error(`Not an upright family: ${s.family}`);
}
