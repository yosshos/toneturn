// GUITAR_DEEPENING §7: a placement probe for every guitar family (about 4 minutes for the core + 1 per add-on).
// Adaptive like the drums probe: a harder step runs only after its easier one was clean, add-on steps only for the
// chosen add-ons. Every step is a measured take. Pure data + pure functions (no runtime imports from guitar.ts:
// guitar.ts spreads these at module load).

import type { DrillSpec, FamilyId, GuitarAddOn } from './types';

const t = (en: string, he: string) => ({ en, he });

/** One probe step. A staircase climbs the tempo (best clean ♩ decides); a single take ('once') is clean or not. */
export interface GuitarProbe {
  id: string;
  family: FamilyId;
  spec: DrillSpec;
  title: { en: string; he: string };
  instruments: ('guitar' | 'bass')[];
  mode?: 'staircase' | 'once';
  /** Only after this step was clean (adaptive). */
  after?: string;
  /** Only with this add-on. */
  addOn?: GuitarAddOn;
  /**
   * Placement: staircase — best clean ♩ ≥ cut[1] → levels[2], ≥ cut[0] → levels[1], any clean → levels[0];
   * once — clean → levels[0]. Never clean → level 1.
   */
  cut?: [number, number];
  levels: number[];
}

const G = (family: FamilyId, kind: string, key: number, o: Partial<DrillSpec> = {}): DrillSpec => ({ family, kind, key, hands: 'R', instrument: 'guitar', ...o });

export const GUITAR_PROBE_STEPS: GuitarProbe[] = [
  { id: 'g-fretting', family: 'g-fretting', spec: G('g-fretting', 'spider', 9, { option: 0 }), title: t('Chromatic 1-2-3-4', 'כרומטי 1-2-3-4'), instruments: ['guitar'], cut: [80, 100], levels: [1, 3, 5] },
  { id: 'g-picking', family: 'g-picking', spec: G('g-picking', 'single-string', 9, { tempo: 60 }), title: t('Alternate picking, one string', 'פריטה מתחלפת, מיתר אחד'), instruments: ['guitar'], cut: [90, 120], levels: [1, 3, 5] },
  { id: 'g-chords', family: 'g-chords', spec: G('g-chords', 'one-minute', 0, { option: 0, perBeat: 0.5 }), title: t('A ↔ D changes', 'החלפות A ↔ D'), instruments: ['guitar'], cut: [80, 100], levels: [1, 2, 3] },
  { id: 'g-chords-barre', family: 'g-chords', spec: G('g-chords', 'barre-check', 5, { position: 6 }), title: t('F barre: every string rings', 'ברה F: כל מיתר מצלצל'), instruments: ['guitar'], mode: 'once', after: 'g-chords', levels: [5] },
  { id: 'g-rhythm', family: 'g-rhythm', spec: G('g-rhythm', 'eighths', 7), title: t('Down-up 8ths', 'שמיניות למטה-למעלה'), instruments: ['guitar'], cut: [85, 105], levels: [1, 2, 3] },
  // AUDIT-CONTENT-THEORY R-4: meter & cross-rhythm, after clean 8ths — the 3+3+2 hemiola over the drums.
  { id: 'g-meter', family: 'g-meter', spec: G('g-meter', 'gm-hemi', 4, { option: 0, tempo: 80 }), title: t('3+3+2 over 4/4', '3+3+2 מעל 4/4'), instruments: ['guitar'], mode: 'once', after: 'g-rhythm', levels: [3] },
  { id: 'g-rhythm-funk', family: 'g-rhythm', spec: G('g-rhythm', 'funk16', 4, { tempo: 85 }), title: t('16th funk with muted ghosts', 'פאנק בשש-עשריות עם פריטות מושתקות'), instruments: ['guitar'], mode: 'once', after: 'g-rhythm', levels: [5] },
  { id: 'g-scales', family: 'g-scales', spec: G('g-scales', 'penta', 9, { position: 1, minor: true }), title: t('A minor pentatonic box 1', 'פנטטוני לה מינור תיבה 1'), instruments: ['guitar'], cut: [85, 100], levels: [1, 2, 3] },
  { id: 'g-scales-major', family: 'g-scales', spec: G('g-scales', 'caged', 7, { position: 0, tempo: 90 }), title: t('Major scale, E shape', 'סולם מז׳ור, צורת E'), instruments: ['guitar'], mode: 'once', after: 'g-scales', levels: [5] },
  { id: 'g-legato', family: 'g-legato', spec: G('g-legato', 'trill', 9, { option: 0 }), title: t('Trill 1-2', 'טריל 1-2'), instruments: ['guitar'], cut: [70, 90], levels: [1, 2, 4] },
  { id: 'g-arps', family: 'g-arps', spec: G('g-arps', 'triad', 9, { position: 6, tempo: 80 }), title: t('A major triad, root on 6', 'משולש לה מז׳ור, יסוד על 6'), instruments: ['guitar'], cut: [90, 110], levels: [1, 2, 3] },
  { id: 'g-lead', family: 'g-lead', spec: G('g-lead', 'bend', 9, { option: 2 }), title: t('Whole-step bend to pitch', 'כיפוף טון שלם לגובה'), instruments: ['guitar'], mode: 'once', levels: [3] },
  { id: 'g-lead-vib', family: 'g-lead', spec: G('g-lead', 'vibrato', 9, { option: 0 }), title: t('Vibrato', 'ויברטו'), instruments: ['guitar'], mode: 'once', after: 'g-lead', levels: [5] },
  { id: 'g-reading', family: 'g-reading', spec: G('g-reading', 'position', 0, { position: 1, tempo: 70 }), title: t('Reading in position I', 'קריאה במצב I'), instruments: ['guitar'], mode: 'once', levels: [3] },
  { id: 'g-ear', family: 'g-ear', spec: G('g-ear', 'melodic2', 9, { option: 0, tempo: 85 }), title: t('Melodic recall, two bars', 'זיכרון מלודי, שתי תיבות'), instruments: ['guitar'], mode: 'once', levels: [3] },
  { id: 'g-ear-roots', family: 'g-ear', spec: G('g-ear', 'roots', 7, { option: 0 }), title: t('Root finder', 'מוצא היסודות'), instruments: ['guitar'], mode: 'once', after: 'g-ear', levels: [6] },
  { id: 'g-impro', family: 'g-impro', spec: G('g-impro', 'targets-root', 9, { tempo: 90 }), title: t('Roots on beat 1 over a 12-bar blues', 'יסודות על 1 בבלוז 12 תיבות'), instruments: ['guitar'], mode: 'once', levels: [2] },
  // Add-ons (only when chosen).
  { id: 'g-jazz', family: 'g-jazz', spec: G('g-jazz', 'shells', 0, { option: 0, tempo: 120 }), title: t('Shells ii–V–I, four to the bar', 'קונכיות ii–V–I, ארבע לתיבה'), instruments: ['guitar'], mode: 'once', addOn: 'jazz', levels: [3] },
  { id: 'g-harris', family: 'g-harris', spec: G('g-harris', 'dom-scale', 0, { option: 0, swing: true, tempo: 100 }), title: t('Dominant scale descending', 'סולם הדומיננטה בירידה'), instruments: ['guitar'], mode: 'once', addOn: 'jazz', levels: [3] },
  { id: 'g-prog', family: 'g-prog', spec: G('g-prog', 'odd-riff', 4, { option: 0, tempo: 200 }), title: t('A 7/8 riff', 'ריף ב-7/8'), instruments: ['guitar'], mode: 'once', addOn: 'prog', levels: [3] },
  { id: 'g-fingerstyle', family: 'g-fingerstyle', spec: G('g-fingerstyle', 'pima', 0, { option: 0, tempo: 70 }), title: t('p-i-m-a on C', 'p-i-m-a על C'), instruments: ['guitar'], mode: 'once', addOn: 'fingerstyle', levels: [3] },
  { id: 'g-flamenco', family: 'g-flamenco', spec: G('g-flamenco', 'rasgueado', 4, { tempo: 70 }), title: t('Four-stroke rasgueado', 'ראסגאדו בארבע מכות'), instruments: ['guitar'], mode: 'once', addOn: 'flamenco', levels: [3] },
];

/** The steps for a player: the core, the chosen add-ons' steps; adaptive steps stay in (the screen skips them). */
export const guitarProbesFor = (addOns: GuitarAddOn[]): GuitarProbe[] => GUITAR_PROBE_STEPS.filter((p) => !p.addOn || addOns.includes(p.addOn));

/** Should an adaptive step run, given the best clean tempo per step so far (0 / absent = never clean)? */
export const probeRuns = (p: GuitarProbe, best: Record<string, number>): boolean => !p.after || (best[p.after] ?? 0) > 0;

/** The level a step places its family at (§7: L1 / L3 / L5 …), from its best clean tempo (once: any clean). */
export function probeLevel(p: GuitarProbe, bestBpm: number | undefined): number {
  if (!bestBpm) return 1;
  if (p.mode === 'once' || !p.cut) return p.levels[0];
  return bestBpm >= p.cut[1] ? p.levels[2] : bestBpm >= p.cut[0] ? p.levels[1] : p.levels[0];
}

/**
 * Start levels per guitar family from a probe (§7). Each probed family takes its best step; core families without a
 * step start one below the mean of the probed core families; add-on families without a clean step start at 1.
 * Capped by each family's length.
 */
export function placeGuitar(best: Record<string, number>, families: { id: FamilyId; levels: number; addOn?: GuitarAddOn }[], addOns: GuitarAddOn[] = []): Partial<Record<FamilyId, number>> {
  const steps = guitarProbesFor(addOns);
  const lv: Partial<Record<FamilyId, number>> = {};
  for (const p of steps) {
    if (!probeRuns(p, best)) continue;
    const l = probeLevel(p, best[p.id]);
    // A harder step only raises the family (its easier step already placed it).
    lv[p.family] = Math.max(lv[p.family] ?? 1, l);
  }
  const core = steps.filter((p) => !p.addOn && !p.after).map((p) => lv[p.family] ?? 1);
  const mean = core.length ? core.reduce((a, b) => a + b, 0) / core.length : 1;
  const out: Partial<Record<FamilyId, number>> = {};
  for (const f of families) {
    const v = lv[f.id] ?? (f.addOn ? 1 : Math.round(mean - 1));
    out[f.id] = Math.max(1, Math.min(f.levels, v));
  }
  return out;
}
