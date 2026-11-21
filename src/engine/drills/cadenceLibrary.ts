// The jazz cadence chart library as drills (docs/research/JAZZ-CADENCE-INVENTORY.md gap list items 1–7): every cadence
// of cadences.ts, in all 12 keys, on three instruments.
//  - piano (k-cadlib): through the "any chart" engine (chartDrills.ts, ref "cad:<id>") in shells, guide tones, rootless
//    A / B, drop 2, drop 3, four-way close, two hands (LH 3-7, RH 9-5-3), stride tenths and a walking left hand; then
//    the quartal So What ii–V–I (variations 1 and 2) and the Kenny Barron voicing (every m7, then the ii–V–I);
//  - guitar (g-cadlib): shells (root on 6 or 5), drop 2 (strings 4–1 / 5–2), drop 3 (6-4-3-2 / 5-3-2-1) and rootless
//    voicings, each chord voice-led from the one before;
//  - bass (b-cadlib): a written approach-note walk (root, 3rd, 5th, a half step into the next root), the band's free
//    walking line under the walking rules, and the pedal for the dominant-pedal chart.
// Quartal voicings only as the So What ii–V–I (the sources' stated V7 rule: the ii's shape as V9sus, or the open V9),
// on the major ii–V–I and the I–vi–ii–V turnaround only (no minor ii–V, m7♭5 or altered So What is stated).
// Imports guitar.ts / bass.ts only inside functions (they import this module).

import type { Drill, DrillSpec, FamilyId } from './types';
import type { FamilyDef, LevelDef, SpecTemplate } from './generate';
import { chartKind, fourTones, roles, type ChartVoicing, type CompRhythm } from './chartDrills';
import { finish, mod, SIG, type Ev, type GN, type GuitarFamilyDef, type GuitarLevelDef } from './guitar';
import { alt, drillOf, refWalk, rootOf, lowest, rulesFromText, type BN } from './bass';
import { ruleSafe } from './bassRuleSafe';
import { noteAt, type Tuning } from '../fretboard';
import { parseChart, type ChartChordEv } from '../charts';
import { keyLabel, moved, nameInKey, transposeTextIn, type Home } from '../stdKey';
import { CADENCES, cadenceById, cadencePlayText, cadenceTitle, type Cadence } from '../cadences';

type T2 = { en: string; he: string };
const t = (en: string, he: string): T2 => ({ en, he });
/** Every level runs through all 12 keys, up the cycle of 4ths from C (a minor chart: from C minor). */
export const CADLIB_KEYS = [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7];

/** The cadences of a group, slash-chord charts only where asked (only the bass plays the pedal). */
const of = (groups: Cadence['group'][], slash = false): Cadence[] => CADENCES.filter((c) => groups.includes(c.group) && (slash || !c.slash));
const G_NAME: Record<'core' | 'sub' | 'form', T2> = {
  core: t('the ii–V family', 'משפחת ה־ii–V'),
  sub: t('substitutes and borrowed approaches', 'תחליפים וגישות שאולות'),
  form: t('longer progressions', 'מהלכים ארוכים'),
};

/** The drill's tonic: the chart's (C or C minor) moved to the key. */
const tonicOf = (c: Cadence, key: number): Home => moved({ key: 0, ...(c.minor ? { minor: true } : {}) }, key);
/** The chart moved to the key and spelled for it, and its chords. */
function chartIn(c: Cadence, key: number): { text: string; bars: string[]; chords: ChartChordEv[]; tonic: Home } {
  const tonic = tonicOf(c, key);
  const text = transposeTextIn(cadencePlayText(c), key, tonic);
  const p = parseChart(text);
  return { text, bars: text.split('|').map((b) => b.trim()), chords: p.chords, tonic };
}
/** "cad~<id>~<voicing>" (guitar, bass) → the cadence and the voicing. */
function parseKind(kind: string): { c: Cadence; v: string } {
  const [, id, v] = kind.split('~');
  const c = cadenceById(id);
  if (!c) throw new Error(`Unknown cadence: ${kind}`);
  return { c, v };
}

// ───────────────────────────── piano ─────────────────────────────

/** k-cadlib: the library through the piano chart engine (generate.ts genChart plays every "chart~" kind). */
export function pianoCadenceFamily(): FamilyDef {
  const fam: FamilyId = 'k-cadlib';
  const levels: LevelDef[] = [];
  const P = (c: Cadence, v: ChartVoicing, r: CompRhythm = 'whole'): SpecTemplate => ({ family: fam, kind: chartKind(`cad:${c.id}`, v, r), hands: 'L', swing: true, tempo: 60 });
  const add = (en: string, he: string, specs: SpecTemplate[], tempo: [number, number] = [60, 120]) =>
    levels.push({ id: `${fam}-${levels.length + 1}`, level: levels.length + 1, title: t(en, he), specs: specs.map((x) => ({ ...x, tempo: tempo[0] })), keys: CADLIB_KEYS, tempo });
  const V: Record<string, [ChartVoicing, CompRhythm, T2]> = {
    shell: ['shell', 'whole', t('Shells', 'שלדים')],
    guide: ['guide', 'whole', t('Guide tones', 'צלילים מנחים')],
    rootless: ['rootless', 'whole', t('Rootless A / B', 'בלי שורש A / B')],
    drop2: ['drop2', 'whole', t('Drop 2', 'דרופ 2')],
    drop3: ['drop3', 'whole', t('Drop 3', 'דרופ 3')],
    close4: ['close4', 'whole', t('Four-way close', 'ארבעה קולות צמודים')],
    two: ['two-hand', 'charleston', t('Two hands: LH 3-7, RH 9-5-3', 'שתי ידיים: שמאל 3-7, ימין 9-5-3')],
    stride: ['stride-tenth', 'whole', t('Stride with tenths', 'סטרייד בדצימות')],
    walk: ['walk-lh', 'four', t('Walking bass in the left hand', 'בס מהלך ביד שמאל')],
  };
  const lv = (vs: string[], gs: ('core' | 'sub' | 'form')[], tempo?: [number, number]) => {
    const names = vs.map((v) => V[v][2]);
    const gName = gs.length === 1 ? G_NAME[gs[0]] : t(gs.map((g) => G_NAME[g].en).join(' and '), gs.map((g) => G_NAME[g].he).join(' ו'));
    add(`${names.map((n) => n.en).join(' and ')} · ${gName.en}`, `${names.map((n) => n.he).join(' ו')} · ${gName.he}`, vs.flatMap((v) => of(gs).map((c) => P(c, V[v][0], V[v][1]))), tempo);
  };
  // In path order (cadencePlacement.ts): each voicing over the ii–V family first, then the substitutes, then the longer
  // progressions; the walking left hand and stride slot in between.
  lv(['shell'], ['core']);
  lv(['guide'], ['core']);
  lv(['shell'], ['sub']);
  lv(['guide'], ['sub']);
  lv(['shell', 'guide'], ['form']);
  lv(['rootless'], ['core']);
  lv(['walk'], ['core'], [80, 160]);
  lv(['rootless'], ['sub']);
  lv(['rootless'], ['form']);
  lv(['drop2'], ['core']);
  lv(['stride'], ['core'], [70, 140]);
  lv(['drop2'], ['sub']);
  lv(['walk'], ['sub'], [80, 160]);
  lv(['drop3'], ['core']);
  lv(['drop3'], ['sub']);
  lv(['drop2', 'drop3'], ['form']);
  lv(['close4'], ['core']);
  lv(['close4'], ['sub']);
  lv(['walk', 'stride'], ['form'], [80, 160]);
  lv(['two'], ['core']);
  lv(['two'], ['sub']);
  lv(['close4', 'two'], ['form']);
  // The So What chord (soWhatOffsets): only charts whose every chord is a m7, 7 or maj7 of a major ii–V–I.
  const SO_WHAT = ['ii-v-i', 'turnaround'].map((id) => cadenceById(id)!);
  add('Quartal (So What) ii–V–I · variation 1: V9sus, the I up a step', 'קוורטלי (So What) ii–V–I · גרסה 1: אותו מבנה על ה־V, ה־I צעד למעלה', SO_WHAT.map((c) => P(c, 'sowhat1')));
  add('Quartal (So What) ii–V–I · variation 2: open V9, the I as maj13♯11', 'קוורטלי (So What) ii–V–I · גרסה 2: V9 פתוח, ה־I כ־maj13♯11', SO_WHAT.map((c) => P(c, 'sowhat2')));
  // The Kenny Barron voicing (barronOffsets): every m7 round the circle of fifths, then on the ii (and vi) of the
  // ii–V–I and the turnaround, the V in two hands, the I as the major variant (maj7♯11).
  add('Kenny Barron voicing on every minor 7th', 'הווייסינג של קני בארון על כל אקורד m7', [{ family: fam, kind: chartKind('set:m7-cycle', 'barron', 'whole'), hands: 'L', swing: true, tempo: 60 }]);
  add('Kenny Barron voicing · ii–V–I with the Barron on the ii', 'הווייסינג של קני בארון · ii–V–I עם בארון על ה־ii', SO_WHAT.map((c) => P(c, 'barron')));
  return { id: fam, title: t('Cadence charts', 'דפי קדנצות'), style: 'jazz', levels };
}

// ───────────────────────────── guitar ─────────────────────────────

type P = { s: number; f: number };
const G_VOICING: Record<string, T2> = {
  shell: t('shells, root on 6 or 5', 'שלדים, שורש על מיתר 6 או 5'),
  drop2: t('drop 2 on strings 4–1 / 5–2', 'דרופ 2 על מיתרים 4–1 / 5–2'),
  drop3: t('drop 3 on strings 6-4-3-2 / 5-3-2-1', 'דרופ 3 על מיתרים 6-4-3-2 / 5-3-2-1'),
  rootless: t('rootless: 3rd, 7th and the colour tones', 'בלי שורש: טרצה, ספטימה וצלילי הצבע'),
};
/** Every placement of the pitch classes on the string sets (low → high, rising, each class once, a span of 4 frets). */
function placements(tu: Tuning, pcs: number[], sets: number[][], shape: (ms: number[]) => boolean): P[][] {
  const want = new Set(pcs.map((p) => mod(p, 12)));
  const out: P[][] = [];
  for (const strings of sets) {
    const per = strings.map((s) => {
      const fs: number[] = [];
      for (let f = 1; f <= 14; f++) if (want.has(mod(noteAt(tu, s, f), 12))) fs.push(f);
      return fs;
    });
    const rec = (i: number, acc: P[]) => {
      if (i === strings.length) {
        const ms = acc.map((p) => noteAt(tu, p.s, p.f));
        if (!ms.every((m, k) => k === 0 || m > ms[k - 1])) return;
        if (new Set(ms.map((m) => mod(m, 12))).size !== want.size) return;
        const fr = acc.map((p) => p.f);
        if (Math.max(...fr) - Math.min(...fr) > 4 || !shape(ms)) return;
        out.push(acc.slice());
        return;
      }
      for (const f of per[i]) rec(i + 1, [...acc, { s: strings[i], f }]);
    };
    rec(0, []);
  }
  return out;
}
/** The candidate voicings of one chord in a guitar voicing type. */
function guitarCands(tu: Tuning, c: ChartChordEv, v: string): P[][] {
  const R = roles(c);
  // A 9sus4 is voiced R-4-♭7-9 (the 9th in place of the 5th), so it differs from the plain 7sus4; every other chord
  // takes the piano's 4-note form (fourTones: a 7♭9 is 3-5-♭7-♭9, never without its ♭9).
  const four = (R.third === 5 && c.iv.includes(14) ? [0, 5, R.seventh, 14] : fourTones(c)).map((x) => c.root + x);
  switch (v) {
    case 'shell':
      return placements(tu, [c.root, c.root + R.third, c.root + R.seventh], [[6, 4, 3], [5, 4, 3]], (ms) => mod(ms[0] - c.root, 12) === 0);
    case 'drop2':
      // Raising the lowest note an octave gives close position with it second from the top.
      return placements(tu, four, [[4, 3, 2, 1], [5, 4, 3, 2]], (ms) => ms[0] + 12 > ms[2] && ms[0] + 12 < ms[3] && ms[3] - ms[1] < 12);
    case 'drop3':
      // Raising the lowest note an octave gives close position with it third from the top.
      return placements(tu, four, [[6, 4, 3, 2], [5, 3, 2, 1]], (ms) => ms[0] + 12 > ms[1] && ms[0] + 12 < ms[2] && ms[3] - ms[1] < 12);
    default:
      // Rootless: 3rd, 5th (13th on a dominant, ♭13 on an altered one), 7th and 9th, close or drop-2 spread (a 10th
      // and a half at most, as a diminished 7th's drop-2 grip needs).
      return placements(tu, [R.third, R.color, R.seventh, R.ninth].map((x) => c.root + x), [[5, 4, 3, 2], [4, 3, 2, 1]], (ms) => ms[3] - ms[0] <= 17);
  }
}
/** Voice-led: the first chord near fret 5, each next one with the least movement (and near the last position). */
function lead(tu: Tuning, cands: P[][], prev: P[] | null): P[] | null {
  if (!cands.length) return null;
  const low = (v: P[]) => Math.min(...v.map((p) => p.f));
  if (!prev) return cands.reduce((a, b) => (Math.abs(low(b) - 5) < Math.abs(low(a) - 5) ? b : a));
  const pm = prev.map((p) => noteAt(tu, p.s, p.f));
  const cost = (v: P[]) => v.reduce((a, p) => a + Math.min(...pm.map((m) => Math.abs(noteAt(tu, p.s, p.f) - m))), 0) + 0.5 * Math.abs(low(v) - low(prev));
  return cands.reduce((a, b) => (cost(b) < cost(a) ? b : a));
}

export function generateGuitarCadence(s: DrillSpec, tu: Tuning): Drill {
  const { c, v } = parseKind(s.kind);
  const key = mod(s.key, 12);
  const ch = chartIn(c, key);
  const evs: Ev[] = [];
  let prev: P[] | null = null;
  for (const x of ch.chords) {
    const voiced: P[] | null = lead(tu, guitarCands(tu, x, v), prev) ?? lead(tu, guitarCands(tu, x, 'shell'), prev);
    if (!voiced) throw new Error(`No ${v} voicing for ${x.sym}`);
    prev = voiced;
    evs.push({ beat: x.bar * 4 + x.at, dur: x.beats, notes: voiced.map((p): GN => ({ ...p, tech: 'strum-down', stroke: 'D' })) });
  }
  const nm = nameInKey(cadenceTitle(c), ch.tonic);
  const vn = G_VOICING[v] ?? G_VOICING.shell;
  const d = finish(s, tu, evs, { title: t(`${nm.en} · ${vn.en}`, `${nm.he} · ${vn.he}`), bpm: Math.max(50, Math.round(c.bpm * 0.45)), evenness: false, keySig: SIG[ch.tonic.minor ? mod(ch.tonic.key + 3, 12) : ch.tonic.key] });
  return { ...d, tonic: ch.tonic, chart: ch.bars, drums: { groove: 'swing' }, band: { style: 'swing', bass: true } };
}

/** g-cadlib: the library comped on the neck (the jazz add-on). */
export function guitarCadenceFamily(): GuitarFamilyDef {
  const fam: FamilyId = 'g-cadlib';
  const levels: GuitarLevelDef[] = [];
  const tempo: [number, number] = [60, 120];
  const add = (v: string, gs: ('core' | 'sub' | 'form')[], grade: number) => {
    const gName = gs.length === 1 ? G_NAME[gs[0]] : t(gs.map((g) => G_NAME[g].en).join(' and '), gs.map((g) => G_NAME[g].he).join(' ו'));
    const vn = G_VOICING[v];
    const n = levels.length + 1;
    levels.push({
      id: `${fam}-${n}`,
      level: n,
      title: t(`${vn.en[0].toUpperCase()}${vn.en.slice(1)} · ${gName.en}`, `${vn.he} · ${gName.he}`),
      // Every chart, in shells too (owner 2026-11-21: a shell that can't tell a m7♭5 from a m7, or a 9sus4 from a
      // 7sus4, is fine).
      specs: of(gs).map((c): SpecTemplate => ({ family: fam, kind: `cad~${c.id}~${v}`, hands: 'R', instrument: 'guitar', swing: true, tempo: tempo[0] })),
      keys: CADLIB_KEYS,
      tempo,
      sub: 'one voicing a chord',
      grade,
    });
  };
  add('shell', ['core'], 6);
  add('shell', ['sub'], 7);
  add('shell', ['form'], 7);
  add('drop2', ['core'], 7);
  add('drop2', ['sub'], 7);
  add('drop2', ['form'], 8);
  add('drop3', ['core'], 8);
  add('drop3', ['sub', 'form'], 8);
  add('rootless', ['core'], 8);
  add('rootless', ['sub', 'form'], 9);
  return { id: fam, title: t('Cadence charts on the neck', 'דפי קדנצות על הצוואר'), style: 'jazz', genres: ['jazz'], instruments: ['guitar'], levels };
}

// ───────────────────────────── bass ─────────────────────────────

const B_MODE: Record<string, T2> = {
  approach: t('walking with approach notes', 'בס מהלך עם צלילי גישה'),
  walk: t('free walking', 'בס מהלך חופשי'),
  pedal: t('the pedal in half notes', 'הפדל בחצאים'),
};

/** Root, 3rd, 5th on the beats of a chord; on the beat before the next chord a half step into its root. */
function approachLine(tu: Tuning, chords: ChartChordEv[]): BN[] {
  const out: BN[] = [];
  let last = 0;
  chords.forEach((c, i) => {
    const R = roles(c);
    const root = rootOf(tu, c.bass);
    const nx = chords[i + 1];
    const b0 = c.bar * 4 + c.at;
    for (let k = 0; k < c.beats; k++) {
      let p: number;
      if (k === 0) p = root;
      else if (nx && k === c.beats - 1) {
        const tgt = rootOf(tu, nx.bass);
        const mv = mod(nx.bass - c.bass, 12);
        const up = mv === 5 || mv === 1 || mv === 11;
        // A two-beat chord moving up a 4th (ii → V, V → I) or by a half step (tritone subs, chromatic dominants) walks
        // through its own 3rd (3 → 7 of a ii–V, the leading tone of a V; on a m7♭5 its ♭5, the half step into the next
        // root; a chromatic approach there would only repeat the roots); otherwise a half step into the next root — from below, unless the line is above it, the
        // half step below is off the neck, or it would repeat the note before.
        if (c.beats === 2 && up) p = root + ((R.third === 3 && R.fifth === 6) || R.seventh === 11 ? R.fifth : R.third); // maj7: its 5th, a step above the next root
        else {
          p = last > tgt || tgt - 1 < lowest(tu) ? tgt + 1 : tgt - 1;
          if (p === last) p = p === tgt + 1 ? (tgt - 1 < lowest(tu) ? tgt + 1 : tgt - 1) : tgt + 1;
        }
      } else p = root + [R.third === 5 && c.iv.includes(14) ? 14 : R.third, R.fifth, R.seventh][Math.min(2, k - 1)]; // a 9sus4 walks through its 9th
      last = p;
      out.push({ b: b0 + k, d: 1, p, ct: k === 0 });
    }
  });
  return out;
}

/** The note that names a chord's quality: a minor chord's 3rd (its ♭5 when half-diminished or diminished), a major or sus chord's 7th. */
const tagOf = (c: ChartChordEv): number => {
  const R = roles(c);
  return mod(c.root + (R.third === 3 ? (R.fifth === 6 ? R.fifth : R.third) : R.seventh), 12);
};
/**
 * Every chord of a free walking line sounds its quality note at least once (else a m7 and a maj7 chart can walk the same
 * line): when it doesn't, the chord's second beat takes it, in the octave nearest the note before — unless that would
 * repeat a neighbour.
 */
function withTags(tu: Tuning, line: BN[], chords: ChartChordEv[]): BN[] {
  const out = line.map((n) => ({ ...n }));
  for (const c of chords) {
    const b0 = c.bar * 4 + c.at;
    const tag = tagOf(c);
    const inside = out.filter((n) => n.b >= b0 - 1e-6 && n.b < b0 + c.beats - 1e-6);
    if (c.beats < 2 || inside.some((n) => mod(n.p, 12) === tag)) continue;
    const i = out.findIndex((n) => Math.abs(n.b - (b0 + 1)) < 1e-6);
    if (i <= 0) continue;
    const prev = out[i - 1].p;
    const next = out[i + 1]?.p;
    const base = rootOf(tu, tag);
    const p = [base, base + 12, base + 24].filter((x) => x <= 55).reduce((a, x) => (Math.abs(x - prev) < Math.abs(a - prev) ? x : a), base);
    if (mod(p, 12) === mod(prev, 12) || (next !== undefined && mod(p, 12) === mod(next, 12))) continue;
    out[i] = { ...out[i], p };
  }
  return out;
}

export function generateBassCadence(s: DrillSpec, tu: Tuning): Drill {
  const { c, v } = parseKind(s.kind);
  const key = mod(s.key, 12);
  const ch = chartIn(c, key);
  const pedal = v === 'pedal';
  const rules = rulesFromText(ch.text, pedal ? 'chordTones' : 'walk');
  let line: BN[];
  if (pedal) line = ch.chords.flatMap((x) => Array.from({ length: Math.max(1, Math.round(x.beats / 2)) }, (_, k): BN => ({ b: x.bar * 4 + x.at + k * 2, d: Math.min(2, x.beats), p: rootOf(tu, x.bass), ct: true })));
  else if (v === 'walk') {
    // The band's walker, kept to the walking rules; of a few seeds the one with the fewest repeated notes and the most
    // 3rds (the note that tells a m7 from a maj7 or a 7).
    const chordAt = (beat: number) => ch.chords.reduce((cur, x) => (x.bar * 4 + x.at <= beat + 1e-6 ? x : cur), ch.chords[0]);
    const score = (l: BN[]) =>
      2 * l.filter((n, i) => i > 0 && mod(n.p, 12) === mod(l[i - 1].p, 12)).length -
      l.filter((n) => { const x = chordAt(n.b); return mod(n.p - x.root, 12) === roles(x).third; }).length;
    const lines = [0, 10, 20, 30].map((o) => ruleSafe((k) => refWalk(tu, ch.text, `b-cadlib:${c.id}:${key}:${o + k}`, false), rules, 4));
    line = withTags(tu, lines.reduce((a, b) => (score(b) < score(a) ? b : a)), ch.chords);
  }
  else line = approachLine(tu, ch.chords);
  const nm = cadenceTitle(c);
  const mode = B_MODE[v] ?? B_MODE.approach;
  const d = drillOf({ ...s, tempo: s.tempo ?? 80 }, tu, alt(line), {
    en: `${nm.en} · ${mode.en}`,
    he: `${nm.he} · ${mode.he}`,
    keyName: keyLabel(ch.tonic),
    keySig: SIG[ch.tonic.minor ? mod(ch.tonic.key + 3, 12) : ch.tonic.key],
    chart: ch.bars,
    show: 'chart',
    evenness: !pedal,
    bass: { rules },
    drums: { groove: 'swing' },
  });
  return { ...d, tonic: ch.tonic };
}

/** b-cadlib: walking lines over the library (the jazz track). */
export function bassCadenceFamily(): GuitarFamilyDef {
  const fam: FamilyId = 'b-cadlib';
  const levels: GuitarLevelDef[] = [];
  const tempo: [number, number] = [80, 160];
  const add = (v: string, gs: ('core' | 'sub' | 'form')[], extra: SpecTemplate[] = []) => {
    const gName = G_NAME[gs[0]];
    const mode = B_MODE[v];
    const n = levels.length + 1;
    levels.push({
      id: `${fam}-${n}`,
      level: n,
      title: t(`${mode.en[0].toUpperCase()}${mode.en.slice(1)} · ${gName.en}`, `${mode.he} · ${gName.he}`),
      specs: [...of(gs).map((c): SpecTemplate => ({ family: fam, kind: `cad~${c.id}~${v}`, hands: 'R', instrument: 'bass', perBeat: 1, swing: true, tempo: tempo[0] })), ...extra],
      keys: CADLIB_KEYS,
      tempo,
      sub: 'quarters',
    });
  };
  add('approach', ['core']);
  add('approach', ['sub']);
  add('walk', ['core']);
  add('approach', ['form']);
  add('walk', ['sub']);
  add('walk', ['form'], [{ family: fam, kind: 'cad~dom-pedal~pedal', hands: 'R', instrument: 'bass', perBeat: 0.5, swing: true, tempo: tempo[0] }]);
  return { id: fam, title: t('Cadence charts on the bass', 'דפי קדנצות בבס'), style: 'jazz', genres: ['all'], instruments: ['bass'], levels };
}
