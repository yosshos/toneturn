// The groove fingerprint (0.50): how the player places notes against the beat — from every tap in the rhythm exercises
// and every timed note in the drills. Per context (subdivision, tempo band, beat in the bar, after a rest, the second
// half of a phrase) a running mean offset (ms, − = early) and spread; the drift across a phrase (do you speed up?);
// a weekly trend. Findings say *when* you rush or drag, and how steady you are. Pure.

export interface GStat {
  n: number;
  mean: number;
  varr: number;
}
export interface GrooveModel {
  v: 1;
  stats: Record<string, GStat>;
  /** Per ISO week: overall mean and spread. */
  weeks: Record<string, GStat>;
  /** Drift: ms of change per beat across a phrase (+ = getting later / slowing, − = rushing ahead). */
  drift: GStat;
  taps: number;
}
export const emptyGroove = (): GrooveModel => ({ v: 1, stats: {}, weeks: {}, drift: { n: 0, mean: 0, varr: 0 }, taps: 0 });

const HALF = 500;
function add(s: GStat | undefined, x: number): GStat {
  const cur = s ?? { n: 0, mean: 0, varr: 0 };
  const w = Math.max(1 / (cur.n + 1), 1 / HALF);
  const d = x - cur.mean;
  const mean = cur.mean + w * d;
  return { n: Math.min(HALF, cur.n + 1), mean, varr: (1 - w) * (cur.varr + w * d * d) };
}

export const subOf = (beat: number) => {
  const f = beat - Math.floor(beat + 1e-6);
  return Math.abs(f) < 0.05 ? 'beat' : Math.abs(f - 0.5) < 0.05 ? '8' : Math.abs(f - 1 / 3) < 0.06 || Math.abs(f - 2 / 3) < 0.06 ? 'trip' : '16';
};
export const bpmBand = (bpm: number) => (bpm < 80 ? 'slow' : bpm < 120 ? 'mid' : 'fast');

/** ISO week key like 2026-W45. */
export function weekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - day + 3);
  const y = t.getUTCFullYear();
  const first = new Date(Date.UTC(y, 0, 4));
  const wk = 1 + Math.round(((t.getTime() - first.getTime()) / 86400000 - 3 + ((first.getUTCDay() + 6) % 7)) / 7);
  return `${y}-W${String(wk).padStart(2, '0')}`;
}

/**
 * Fold one performance in: onsets (quarter beats from the start), the offset of each (ms, signed; null = missed),
 * the tempo and the bar length.
 */
export function addPerformance(g: GrooveModel, onsets: number[], offsets: (number | null)[], bpm: number, beatsPerBar: number, at: Date): GrooveModel {
  const stats = { ...g.stats };
  const weeks = { ...g.weeks };
  const wk = weekKey(at);
  let drift = g.drift;
  const pts: { b: number; o: number }[] = [];
  const total = onsets.length ? onsets[onsets.length - 1] : 0;
  onsets.forEach((b, i) => {
    const o = offsets[i];
    if (o === null || o === undefined || Math.abs(o) > 250) return;
    pts.push({ b, o });
    const prevGap = i > 0 ? b - onsets[i - 1] : 0;
    const keys = [`sub:${subOf(b)}`, `bpm:${bpmBand(bpm)}`, `all`, `pos:${Math.floor(b % beatsPerBar) + 1}`];
    if (prevGap >= 1.5) keys.push('after-rest');
    if (total > 0 && b > total / 2) keys.push('late-phrase');
    else keys.push('early-phrase');
    for (const k of keys) stats[k] = add(stats[k], o);
    weeks[wk] = add(weeks[wk], o);
  });
  // drift: least-squares slope of offset over beats in this performance
  if (pts.length >= 6) {
    const mb = pts.reduce((a, p) => a + p.b, 0) / pts.length;
    const mo = pts.reduce((a, p) => a + p.o, 0) / pts.length;
    const sxx = pts.reduce((a, p) => a + (p.b - mb) ** 2, 0);
    if (sxx > 0) drift = add(drift, pts.reduce((a, p) => a + (p.b - mb) * (p.o - mo), 0) / sxx);
  }
  const keep = Object.keys(weeks).sort().slice(-26);
  return { v: 1, stats, weeks: Object.fromEntries(keep.map((k) => [k, weeks[k]])), drift, taps: g.taps + pts.length };
}

export interface GrooveFinding {
  kind: 'rush' | 'drag' | 'unsteady' | 'speeds-up' | 'slows-down' | 'steady';
  ctx: string;
  ms: number;
  text: { en: string; he: string };
  practice: { en: string; he: string };
}
const CTX: Record<string, { en: string; he: string }> = {
  'sub:beat': { en: 'on the beat', he: 'על הפעמה' },
  'sub:8': { en: 'on off-beat eighths', he: 'בשמיניות שבין הפעמות' },
  'sub:16': { en: 'on sixteenths', he: 'בשש־עשריות' },
  'sub:trip': { en: 'on triplets', he: 'בטריולות' },
  'bpm:slow': { en: 'at slow tempi', he: 'בטמפו איטי' },
  'bpm:mid': { en: 'at medium tempi', he: 'בטמפו בינוני' },
  'bpm:fast': { en: 'above ♩=120', he: 'מעל ♩=120' },
  'after-rest': { en: 'right after a rest', he: 'מיד אחרי הפסקה' },
  'late-phrase': { en: 'in the second half of a phrase', he: 'בחצי השני של משפט' },
  'pos:1': { en: 'on beat 1', he: 'בפעמה 1' },
};
const tz = (s: GStat) => (s.n > 1 && s.varr > 0 ? Math.abs(s.mean) / Math.sqrt(s.varr / s.n) : 0);

export function grooveFindings(g: GrooveModel, minN = 25): GrooveFinding[] {
  const out: GrooveFinding[] = [];
  const all = g.stats.all;
  if (!all || all.n < minN) return out;
  const base = all.mean;
  for (const [k, s] of Object.entries(g.stats)) {
    if (k === 'all' || !CTX[k] || s.n < minN) continue;
    const rel = s.mean - base;
    if (Math.abs(s.mean) >= 12 && Math.abs(rel) >= 6 && tz(s) > 2)
      out.push({
        kind: s.mean < 0 ? 'rush' : 'drag', ctx: k, ms: Math.round(s.mean),
        text: s.mean < 0 ? { en: `You rush ${CTX[k].en} (${Math.round(-s.mean)} ms early)`, he: `אתם ממהרים ${CTX[k].he} (${Math.round(-s.mean)} מילישניות מוקדם)` } : { en: `You drag ${CTX[k].en} (${Math.round(s.mean)} ms late)`, he: `אתם מאחרים ${CTX[k].he} (${Math.round(s.mean)} מילישניות מאוחר)` },
        practice: { en: 'Pocket target: hold the click exactly in the middle of your tap', he: 'מטרת כיס: להחזיק את הקליק בדיוק באמצע ההקשה' },
      });
  }
  const sd = Math.sqrt(all.varr);
  if (sd >= 30) out.push({ kind: 'unsteady', ctx: 'all', ms: Math.round(sd), text: { en: `Your taps spread ±${Math.round(sd)} ms around the beat`, he: `ההקשות שלכם מתפזרות ±${Math.round(sd)} מילישניות סביב הפעמה` }, practice: { en: 'The fading click: keep the time when the click drops out', he: 'הקליק הנעלם: לשמור על הזמן כשהקליק נעלם' } });
  if (g.drift.n >= 8 && Math.abs(g.drift.mean) >= 2.5)
    out.push(
      g.drift.mean < 0
        ? { kind: 'speeds-up', ctx: 'drift', ms: Math.round(g.drift.mean * 10) / 10, text: { en: `You speed up across a phrase (${Math.round(-g.drift.mean * 10) / 10} ms earlier every beat)`, he: `אתם מאיצים לאורך משפט (${Math.round(-g.drift.mean * 10) / 10} מילישניות מוקדם יותר בכל פעמה)` }, practice: { en: 'Longer phrases with the click only on beat 1', he: 'משפטים ארוכים עם קליק רק על פעמה 1' } }
        : { kind: 'slows-down', ctx: 'drift', ms: Math.round(g.drift.mean * 10) / 10, text: { en: `You slow down across a phrase (${Math.round(g.drift.mean * 10) / 10} ms later every beat)`, he: `אתם מאטים לאורך משפט (${Math.round(g.drift.mean * 10) / 10} מילישניות מאוחר יותר בכל פעמה)` }, practice: { en: 'Longer phrases with the click only on beat 1', he: 'משפטים ארוכים עם קליק רק על פעמה 1' } },
    );
  if (!out.length && sd < 22) out.push({ kind: 'steady', ctx: 'all', ms: Math.round(sd), text: { en: `Steady time: ±${Math.round(sd)} ms`, he: `זמן יציב: ±${Math.round(sd)} מילישניות` }, practice: { en: 'Try pocket targets: lay back or push on purpose', he: 'נסו מטרות כיס: להישען אחורה או לדחוף בכוונה' } });
  return out.sort((a, b) => Math.abs(b.ms) - Math.abs(a.ms));
}
