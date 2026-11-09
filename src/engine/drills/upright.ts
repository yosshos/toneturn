// The upright / double-bass track (BASS_CURRICULUM §5.1, BASS_AUDIT B16): six families on the `upright` tuning
// (EADG, fretted: false — "frets" are semitone places on the fingerboard). Intonation is part of every pass
// (goal.bass.cents, measured by the analysis track); bowed drills say `bow: 'arco'`, plucked ones `bow: 'pizz'`.
// The scale / arpeggio levels follow the ABRSM model (from memory, separate bows then slurred, ♩≈40 → ♩≈76);
// positions follow Simandl (½, I, II, III, IV, thumb). All material is generated.
//
// Pure. Imports bass.ts helpers only inside functions (module load order).

import type { BassGoal, Drill, DrillSpec } from './types';
import { noteAt, type Tuning } from '../fretboard';
import { guitarItemId, mod, modeInts, NAMES } from './guitar';
import { drillOf, genRead, genWalk, rootOf, type BN } from './bass';

/** EN / HE pair (local: bass.ts helpers can't run at module load). */
const tt = (en: string, he: string) => ({ en, he });

/** Simandl positions as the fret place of the index finger on the E string: ½, I, II, III, IV, thumb (12). */
const POS = [1, 2, 3, 5, 7, 12];
const POS_T = [tt('Half position', 'חצי מצב'), tt('First position', 'מצב ראשון'), tt('Second position', 'מצב שני'), tt('Third position', 'מצב שלישי'), tt('Fourth position', 'מצב רביעי'), tt('Thumb position', 'מצב אגודל')];

const withCents = (d: Drill, cents: number, extra: BassGoal = {}): Drill => ({ ...d, goal: { ...d.goal, bass: { ...(d.goal.bass ?? {}), ...extra, cents } } });

export function generateUpright(s: DrillSpec, tu: Tuning): Drill {
  const key = mod(s.key, 12);
  const op = s.option ?? 0;
  const n = tu.open.length;
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
      const d = drillOf(s, tu, line, { ...NAMES_T[op % 6], evenness: op % 6 !== 3, bow: 'arco', open: op % 6 === 0 || op % 6 === 4 });
      return withCents(d, 12, op % 6 === 0 ? { loudSd: 3 } : {});
    }
    case 'b-up-scales': {
      // ABRSM model: 1 → 2 → 3 octaves, arpeggios, dominant 7ths, diminished 7ths, broken and running 3rds.
      const kinds = ['scale1', 'arp1', 'scale2', 'arp2', 'dom7', 'dim7', 'thirds-broken', 'thirds-run', 'scale3'];
      const k = kinds[op % kinds.length];
      const R = rootOf(tu, key);
      let ps: number[] = [];
      const maj = modeInts(0);
      const oct = (ints: number[], o: number) => [...Array.from({ length: o }, (_, i) => ints.map((x) => x + 12 * i)).flat(), 12 * o];
      if (k === 'scale1' || k === 'scale2' || k === 'scale3') ps = oct(maj, k === 'scale1' ? 1 : k === 'scale2' ? 2 : 3);
      else if (k === 'arp1' || k === 'arp2') ps = oct([0, 4, 7], k === 'arp1' ? 1 : 2);
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
      };
      const d = drillOf(s, tu, line, { ...T[k], bow: 'arco', open: false, evenness: true });
      return withCents(d, k === 'scale1' || k === 'arp1' ? 12 : 8, { shiftGap: 60 });
    }
    case 'b-up-pizz': {
      // Jazz pizzicato sound: long, even quarters that sustain to the next note, with the ride.
      const prog: [number, number][] = op === 1 ? [[2, 0], [7, 0], [0, 0], [0, 0]] : [[0, 0], [5, 0], [7, 0], [0, 0]];
      const line: BN[] = [];
      prog.forEach(([d], bar) => {
        const R = rootOf(tu, key + d);
        [R, R + 7, R + 12, R + 7].forEach((p, k) => line.push({ b: bar * 4 + k, d: 1, p, ct: true }));
      });
      line.push({ b: 16, d: 2, p: rootOf(tu, key), ct: true });
      const chart = prog.map(([d]) => `${NAMES[mod(key + d, 12)]}${op === 1 && d === 2 ? 'm7' : op === 1 && d === 7 ? '7' : ''}`);
      const d = drillOf(s, tu, line, { en: op === 1 ? 'Pizz quarters over ii–V–I, full length' : 'Pizz quarters, full length', he: op === 1 ? 'רבעים בפיציקטו על ii–V–I, באורך מלא' : 'רבעים בפיציקטו, באורך מלא', chart, bow: 'pizz', drums: { groove: 'swing' } });
      return withCents(d, 15, { lengths: true, loudSd: 3 });
    }
    case 'b-up-walk': {
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
