// SPEC-STYLE-FOCUS (owner 2026-11-22): one setting per course instead of six — a main style and up to two more — and
// every style open from the first day. Focus changes the WEIGHT, never the access. Pure: the model, the migration from
// the old settings (§6), the one weight function every place reads (styleWeight), the day's picks (workout style block,
// improvisation), the path's style units, and the exposure service (§9: the taster, its rotation, the quarterly
// guarantee, the 6-month look, the >20 % trigger).

import type { CourseId } from './courses';
import { GUITAR_ADDON_STYLES, MAIN_STYLES, STYLE_COURSES, isStyleId, stylesFor, type StyleId } from './styles';

export interface StyleFocus {
  main: StyleId;
  /** Up to 2 (§8.2). */
  also: StyleId[];
}
export type StyleFocusMap = Partial<Record<CourseId, StyleFocus>>;

export const MAX_ALSO = 2;
export const MAX_PICKS = 1 + MAX_ALSO;
/** The app is jazz first (§3): jazz is pre-selected as the main style. */
export const DEFAULT_FOCUS: StyleFocus = { main: 'jazz', also: [] };

/** The settings this module reads (a Settings subset, so the engine and tests need no storage import). */
export interface FocusSettings {
  styleFocus?: StyleFocusMap;
  /** Old (read-only for one version, §6). */
  jazzFocus?: CourseId[];
  drills?: { emphasis?: 'both' | 'classical' | 'jazz'; guitarAddOns?: string[]; bassTrack?: 'jazz' | 'prog' | 'both' } | null;
  styleTaste?: StyleTaste;
}

const canMain = (course: CourseId, s: StyleId) => MAIN_STYLES.includes(s) && STYLE_COURSES[s].includes(course);
const canHave = (course: CourseId, s: StyleId) => STYLE_COURSES[s].includes(course);

/** A focus made valid for a course: a main style the course offers, ≤ 2 others, no repeats. */
export function normFocus(course: CourseId, f: Partial<StyleFocus> | null | undefined): StyleFocus {
  const main = f?.main && isStyleId(f.main) && canMain(course, f.main) ? f.main : DEFAULT_FOCUS.main;
  const also = [...new Set((f?.also ?? []).filter((s) => isStyleId(s) && s !== main && canHave(course, s)))].slice(0, MAX_ALSO);
  return { main, also };
}

/** The picks in order (first = main). */
export const picksOf = (f: StyleFocus): StyleId[] => [f.main, ...f.also];

/** Chips → focus: the first pick that can be a main style is the main, the rest (≤ 2) "also". */
export function focusFromPicks(course: CourseId, picks: StyleId[]): StyleFocus {
  const ps = [...new Set(picks.filter((s) => isStyleId(s) && canHave(course, s)))];
  const main = ps.find((s) => canMain(course, s)) ?? DEFAULT_FOCUS.main;
  return normFocus(course, { main, also: ps.filter((s) => s !== main) });
}

/**
 * One tap on a chip: off → on (when fewer than 3 are picked), on → off. The first pick stays the main; removing the
 * main promotes the next. The last pick can't be removed (there is always a main style).
 */
export function togglePick(course: CourseId, f: StyleFocus, s: StyleId): StyleFocus {
  const ps = picksOf(f);
  if (ps.includes(s)) {
    if (ps.length === 1) return f;
    return focusFromPicks(course, ps.filter((x) => x !== s));
  }
  if (ps.length >= MAX_PICKS) return f;
  return focusFromPicks(course, [...ps, s]);
}
/** Make a picked style the main one (long press / "make main"). */
export const makeMain = (course: CourseId, f: StyleFocus, s: StyleId): StyleFocus => focusFromPicks(course, [s, ...picksOf(f).filter((x) => x !== s)]);

// ---------------------------------------------------------------- the migration (§6)

/** The focus the six old settings imply for a course, or null when they say nothing. */
export function legacyFocus(s: FocusSettings, course: CourseId): StyleFocus | null {
  const d = s.drills ?? {};
  if (course === 'keys' && d.emphasis === 'classical') return normFocus(course, { main: 'classical', also: ['jazz'] });
  if (course === 'keys' && d.emphasis === 'both') return normFocus(course, { main: 'jazz', also: ['classical'] });
  if (course === 'bass' && d.bassTrack === 'prog') return normFocus(course, { main: 'prog', also: ['jazz'] });
  if (course === 'guitar' && d.guitarAddOns?.length) {
    const map: Record<string, StyleId> = { flamenco: 'flamenco', fingerstyle: 'fingerstyle', prog: 'prog' };
    const also = d.guitarAddOns.map((a) => map[a]).filter((x): x is StyleId => !!x);
    return normFocus(course, { main: 'jazz', also });
  }
  if (s.jazzFocus?.includes(course)) return { main: 'jazz', also: [] };
  if (course === 'keys' && d.emphasis === 'jazz') return { main: 'jazz', also: [] };
  return null;
}

/** The focus of a course: the stored one, else what the old settings imply, else jazz. */
export function focusOf(s: FocusSettings, course: CourseId): StyleFocus {
  const f = s.styleFocus?.[course];
  if (f) return normFocus(course, f);
  return legacyFocus(s, course) ?? DEFAULT_FOCUS;
}
/** Did the player (or the migration) choose a focus for the course? */
export const focusChosen = (s: FocusSettings, course: CourseId): boolean => !!s.styleFocus?.[course] || !!legacyFocus(s, course);

/** The courses whose focus the old settings imply but which have no stored focus yet: the map to persist once. */
export function migrateStyleFocus(s: FocusSettings, courses: CourseId[]): StyleFocusMap | null {
  const add: StyleFocusMap = {};
  for (const c of courses) if (!s.styleFocus?.[c]) {
    const f = legacyFocus(s, c);
    if (f) add[c] = f;
  }
  return Object.keys(add).length ? { ...(s.styleFocus ?? {}), ...add } : null;
}

/** Set one course's focus. */
export const withFocus = (s: FocusSettings, course: CourseId, f: StyleFocus): StyleFocusMap => ({ ...(s.styleFocus ?? {}), [course]: normFocus(course, f) });

// ---------------------------------------------------------------- the weights (§4)

export type StyleTier = 'main' | 'also' | 'rest';
/** §4: about 60 % from the main style, 30 % from the "also" styles, 10 % from the rest (exposure, never zero). */
export const STYLE_SHARES: Record<StyleTier, number> = { main: 0.6, also: 0.3, rest: 0.1 };

export const styleTier = (f: StyleFocus, s: StyleId): StyleTier => (s === f.main ? 'main' : f.also.includes(s) ? 'also' : 'rest');

/**
 * The shares of the three tiers for the styles present (e.g. only those with content): an empty tier's share goes to
 * the main style; the rest keeps its 10 % whenever any rest style is present (§9: never zero).
 */
export function tierShares(f: StyleFocus, present: StyleId[]): Record<StyleTier, number> {
  const has = { main: present.includes(f.main), also: f.also.some((s) => present.includes(s)), rest: present.some((s) => styleTier(f, s) === 'rest') };
  const out = { main: has.main ? STYLE_SHARES.main : 0, also: has.also ? STYLE_SHARES.also : 0, rest: has.rest ? STYLE_SHARES.rest : 0 };
  const sum = out.main + out.also + out.rest;
  if (!sum) return { main: 0, also: 0, rest: 0 };
  // whatever an empty tier leaves goes to main (or to also when main is empty), never taking the rest's 10 % away
  const spare = 1 - sum;
  if (has.main) out.main += spare;
  else if (has.also) out.also += spare;
  else out.rest = 1;
  return out;
}

/** §9.2: a style tasted and liked (not turned down) carries more of the exposure; a turned-down one less (never zero). */
const restFactor = (taste: StyleTaste | undefined, s: StyleId, today?: string): number => {
  const e = taste?.by?.[s];
  if (!e) return 1;
  if (e.answer === 'never' && (!today || !e.declinedUntil || e.declinedUntil > today)) return 0.4;
  if (e.tasted && e.answer !== 'never') return 2;
  return 1;
};

/**
 * THE weight of a style in a course (every place reads this): the share of style-specific content it gets — main ~0.6,
 * the "also" styles share ~0.3, the rest share ~0.1 (never zero). Core content (style null: the jazz core, scales …) is
 * not weighted: 1 (§8.3).
 */
export function styleWeight(s: FocusSettings, course: CourseId, style: StyleId | null, today?: string): number {
  if (!style) return 1;
  const f = focusOf(s, course);
  const all = stylesFor(course);
  const sh = tierShares(f, all);
  const tier = styleTier(f, style);
  if (tier === 'main') return sh.main;
  if (tier === 'also') return sh.also / Math.max(1, f.also.length);
  const rest = all.filter((x) => styleTier(f, x) === 'rest');
  const tot = rest.reduce((n, x) => n + restFactor(s.styleTaste, x, today), 0) || 1;
  return (sh.rest * restFactor(s.styleTaste, style, today)) / tot;
}

/** A stable number in [0, 1) from a string (the day plus a salt): the day's picks are deterministic. */
export function seedOf(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** Draw a style from weighted candidates with a seed in [0, 1). */
export function drawStyle(cands: StyleId[], weight: (s: StyleId) => number, seed: number): StyleId | null {
  const ws = cands.map((s) => Math.max(0, weight(s)));
  const tot = ws.reduce((a, b) => a + b, 0);
  if (!tot) return cands[0] ?? null;
  let x = seed * tot;
  for (let i = 0; i < cands.length; i++) {
    x -= ws[i];
    if (x < 0) return cands[i];
  }
  return cands[cands.length - 1] ?? null;
}

/**
 * How many of `n` style-block slots go to each tier today: the expected counts are n × the shares; the fractions are
 * rounded by the day's seed, so over the weeks every tier gets its share — the rest's 10 % included (never zero).
 */
export function allocateSlots(n: number, shares: Record<StyleTier, number>, seed: number): Record<StyleTier, number> {
  // systematic sampling: the cumulative expected counts, shifted by the seed — each tier gets n × share on average
  // (unbiased, so the rest's 10 % is never starved) and the counts always add up to n.
  const tiers: StyleTier[] = ['main', 'also', 'rest'];
  const sum = tiers.reduce((a, t) => a + Math.max(0, shares[t]), 0) || 1;
  const out = { main: 0, also: 0, rest: 0 };
  const u = Math.min(0.999999, Math.max(0, seed));
  let cum = 0;
  let prev = 0;
  for (const t of tiers) {
    cum += (n * Math.max(0, shares[t])) / sum;
    const c = Math.floor(cum + u + 1e-9);
    out[t] = c - prev;
    prev = c;
  }
  if (prev < n) out[tiers.filter((k) => shares[k] > 0).sort((a, b) => shares[b] - shares[a])[0] ?? 'main'] += n - prev;
  return out;
}

/**
 * The day's style for the improvisation share (§4): the band and the tune in the main style in about 60 % of sessions,
 * an "also" style in about 30 %, another style in about 10 % (the ones tasted and liked first).
 */
export function improvStyleFor(s: FocusSettings, course: CourseId, day: string, offered: StyleId[] = stylesFor(course, { main: true })): StyleId {
  const f = focusOf(s, course);
  const x = seedOf(`${day}|improv|${course}`);
  const sh = tierShares(f, offered);
  if (x < sh.main) return f.main;
  if (x < sh.main + sh.also) return drawStyle(f.also.filter((a) => offered.includes(a)), () => 1, seedOf(`${day}|also`)) ?? f.main;
  const rest = offered.filter((a) => styleTier(f, a) === 'rest');
  return drawStyle(rest, (a) => restFactor(s.styleTaste, a, day), seedOf(`${day}|rest`)) ?? f.main;
}

/** The order a place opens on: the main style first, then the "also" styles (Repertoire tab, Improvise band, Licks filter). */
export const defaultStyleOf = (s: FocusSettings, course: CourseId, available: StyleId[]): StyleId | null => {
  const f = focusOf(s, course);
  return picksOf(f).find((x) => available.includes(x)) ?? null;
};

// ---------------------------------------------------------------- the path (§4: style units)

/** The main style's units come every 3rd unit: two core units, then a style unit (§4 "every 2–3 core units"). */
export const STYLE_UNIT_EVERY = 3;
export const isStyleUnit = (n: number, every = STYLE_UNIT_EVERY): boolean => n > 0 && n % every === 0;

/**
 * Which styled ladder levels the path may push (§4): the main style's (in style units), then the "also" styles' (later,
 * once the main style has none ready); the rest stay open in Practice and are not pushed. The jazz core is never styled.
 */
export const pathStyleRank = (f: StyleFocus, s: StyleId | null): number => (s === null || s === 'jazz' ? 0 : s === f.main ? 1 : f.also.includes(s) ? 2 : -1);

// ---------------------------------------------------------------- exposure (§9)

export interface StyleTasteEntry {
  /** Last taste (YYYY-MM-DD). */
  tasted?: string;
  /** The answer to "add it?" last time. */
  answer?: 'add' | 'later' | 'never';
  /** "Don't offer this style": until this day. */
  declinedUntil?: string;
}
export interface StyleTaste {
  /** The first day the service ran (the quarter is counted from it for styles never tasted). */
  since?: string;
  /** Last taster card shown (YYYY-MM-DD). */
  lastOffer?: string;
  /** Last time the add question was asked (≤ 1 every two weeks). */
  lastAsk?: string;
  by?: Partial<Record<StyleId, StyleTasteEntry>>;
  /** The 6-month look at the preferences: last shown. */
  prefsSeen?: string;
  /** The >20 % trigger: last asked per style (once a month at most). */
  heavyAsked?: Partial<Record<StyleId, string>>;
  /** The taste in progress (its parts done), so leaving for a part and coming back resumes it (never-lose-progress). */
  cur?: { style: StyleId; course: CourseId; started: string; done: string[] };
}

export const TASTER_EVERY_DAYS = 14;
export const QUARTER_DAYS = 91;
export const DECLINE_DAYS = 182;
export const PREFS_EVERY_DAYS = 182;
export const HEAVY_SHARE = 0.2;
export const HEAVY_WINDOW_DAYS = 30;

const dayNum = (d: string) => Math.floor(Date.parse(`${d}T12:00:00Z`) / 86400000);
export const daysBetween = (a: string, b: string) => dayNum(b) - dayNum(a);
export const addDays = (d: string, n: number) => new Date((dayNum(d) + n) * 86400000 + 43200000).toISOString().slice(0, 10);

/** §9.3: the recommended neighbours of each main style, most relevant first. */
export const RELEVANCE: Record<StyleId, StyleId[]> = {
  jazz: ['soul', 'afrocuban', 'brazil', 'neworleans', 'classical', 'pop'],
  brazil: ['jazz', 'afrocuban', 'soul', 'classical', 'neworleans', 'pop'],
  afrocuban: ['jazz', 'brazil', 'soul', 'neworleans', 'classical', 'pop'],
  soul: ['jazz', 'afrocuban', 'neworleans', 'brazil', 'pop', 'classical'],
  neworleans: ['jazz', 'soul', 'afrocuban', 'brazil', 'classical', 'pop'],
  classical: ['jazz', 'brazil', 'soul', 'afrocuban', 'neworleans', 'pop'],
  pop: ['soul', 'jazz', 'brazil', 'afrocuban', 'neworleans', 'classical'],
  prog: ['jazz', 'afrocuban', 'soul', 'brazil', 'pop', 'neworleans'],
  fingerstyle: ['jazz', 'brazil', 'classical'],
  flamenco: ['afrocuban', 'brazil', 'jazz'],
  metal: ['prog', 'soul', 'jazz'],
  country: ['soul', 'jazz', 'pop'],
  reggae: ['soul', 'afrocuban', 'jazz'],
};

/** §9.2: the player's weak area, from the ratings (null when nothing stands out). */
export type WeakArea = 'timing' | 'voicings' | 'melody' | null;
export const WEAK_STYLES: Record<Exclude<WeakArea, null>, StyleId[]> = { timing: ['afrocuban', 'soul'], voicings: ['soul'], melody: ['brazil'] };
export function weakAreaOf(r: Partial<Record<string, { r: number; n?: number } | undefined>>): WeakArea {
  const avg = (ks: string[]) => {
    const xs = ks.map((k) => r[k]).filter((x): x is { r: number; n?: number } => !!x && (x.n ?? 1) > 0).map((x) => x.r);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  };
  const areas: [Exclude<WeakArea, null>, number | null][] = [['timing', avg(['rhythm', 'timing'])], ['voicings', avg(['chords'])], ['melody', avg(['degrees', 'dictation', 'sequences'])]];
  const known = areas.filter((a): a is [Exclude<WeakArea, null>, number] => a[1] !== null);
  if (known.length < 2) return null;
  known.sort((a, b) => a[1] - b[1]);
  return known[1][1] - known[0][1] >= 50 ? known[0][0] : null;
}

/** §9.3: the one sentence over a taste — what this player gains from the style, relative to their main style. */
const GAIN: Partial<Record<StyleId, Partial<Record<StyleId, { en: string; he: string }>>>> = {
  jazz: {
    soul: { en: 'From gospel and soul: the IV–I motion, moving inner voices and the blues feel — straight into your ballads.', he: 'מגוספל וסול: המעבר מ־IV ל־I, קולות פנימיים שזזים ותחושת הבלוז — ישר לבלדות שלכם.' },
    afrocuban: { en: 'From Afro-Cuban: the clave and syncopation, and the montuno as rhythmic comping.', he: 'מהאפרו-קובני: הקלאבה והסינקופה, והמונטונו כליווי ריתמי.' },
    brazil: { en: 'From Brazil: bossa harmony and comping, and long lines over moving harmony.', he: 'מברזיל: ההרמוניה והליווי של הבוסה, וקווים ארוכים מעל הרמוניה שזזה.' },
    neworleans: { en: 'From New Orleans: stride and the roots of jazz piano, the 2-feel and the second line.', he: 'מניו אורלינס: סטרייד ושורשי פסנתר הג׳אז, התחושה בשתיים והסקנד ליין.' },
    classical: { en: 'From classical: voice leading, touch and dynamics, and reading.', he: 'מהקלאסי: הובלת קולות, מגע ודינמיקה, וקריאה.' },
  },
  brazil: { jazz: { en: 'From jazz: the ii–V–I, guide tones and improvising over changes.', he: 'מהג׳אז: ii–V–I, צלילים מנחים ואלתור על מהלכים.' } },
  afrocuban: { jazz: { en: 'From jazz: the ii–V–I, guide tones and improvising over changes.', he: 'מהג׳אז: ii–V–I, צלילים מנחים ואלתור על מהלכים.' } },
  soul: {
    jazz: { en: 'From jazz: richer harmony for your grooves.', he: 'מהג׳אז: הרמוניה עשירה יותר לגרובים שלכם.' },
    afrocuban: { en: 'From Afro-Cuban: syncopation and groove.', he: 'מהאפרו-קובני: סינקופה וגרוב.' },
  },
  classical: {
    jazz: { en: 'From jazz: improvising, and comping from chord symbols.', he: 'מהג׳אז: אלתור, וליווי מסימני אקורדים.' },
    brazil: { en: 'From Brazil: rhythmic freedom and comping from chord symbols.', he: 'מברזיל: חופש ריתמי וליווי מסימני אקורדים.' },
  },
  pop: {
    soul: { en: 'From soul: a richer groove.', he: 'מהסול: גרוב עשיר יותר.' },
    jazz: { en: 'From jazz: 7th chords and voicings, and a first step into improvising.', he: 'מהג׳אז: ספטאקורדים וקולות, וצעד ראשון לאלתור.' },
    brazil: { en: 'From Brazil: a richer groove and new chord colours.', he: 'מברזיל: גרוב עשיר יותר וצבעי אקורדים חדשים.' },
  },
};
export function tasterSentence(main: StyleId, style: StyleId): { en: string; he: string } {
  return GAIN[main]?.[style] ?? GAIN.jazz?.[style] ?? { en: 'A new groove and new language, close to what you already play.', he: 'גרוב חדש ושפה חדשה, קרובים למה שאתם כבר מנגנים.' };
}

/** Styles a player didn't choose in a course (main styles the course offers; the guitar add-ons too on the guitar). */
export function unchosen(s: FocusSettings, course: CourseId): StyleId[] {
  const f = focusOf(s, course);
  const pool = course === 'guitar' ? [...stylesFor(course, { main: true }), ...GUITAR_ADDON_STYLES] : stylesFor(course, { main: true });
  return pool.filter((x) => !picksOf(f).includes(x));
}

/** Days since a style was last tasted (never: since the service started). */
const sinceTaste = (t: StyleTaste | undefined, s: StyleId, today: string): number => {
  const d = t?.by?.[s]?.tasted ?? t?.since;
  return d ? daysBetween(d, today) : QUARTER_DAYS;
};

/** A style the add question may not be asked about now ("don't offer" for 6 months). */
export const declined = (t: StyleTaste | undefined, s: StyleId, today: string): boolean => {
  const u = t?.by?.[s]?.declinedUntil;
  return !!u && u > today;
};

/**
 * §9.2: the rotation's order over the unchosen styles — overdue for the quarter first (the guarantee), then relevance
 * to the main style, the player's weak area, and the longest since a taste.
 */
export function tasterRotation(s: FocusSettings, course: CourseId, today: string, weak: WeakArea = null): StyleId[] {
  const f = focusOf(s, course);
  const t = s.styleTaste;
  const rel = RELEVANCE[f.main] ?? RELEVANCE.jazz;
  const weakFor = weak ? WEAK_STYLES[weak] : [];
  const cands = unchosen(s, course);
  // a rotation: a style tasted within the current round waits for the others (a round = one taste per style)
  const round = Math.max(TASTER_EVERY_DAYS, (cands.length - 1) * TASTER_EVERY_DAYS);
  const score = (x: StyleId) => {
    const since = sinceTaste(t, x, today);
    const overdue = since >= QUARTER_DAYS ? 1 : 0;
    const recent = t?.by?.[x]?.tasted && since < round ? 1 : 0;
    const r = rel.indexOf(x);
    return overdue * 1000 - recent * 500 + (r < 0 ? 0 : (rel.length - r) * 10) + (weakFor.includes(x) ? 25 : 0) + Math.min(since, 365) / 40;
  };
  return cands.sort((a, b) => score(b) - score(a));
}

export interface TasterOffer {
  style: StyleId;
  /** The one sentence (§9.3). */
  gain: { en: string; he: string };
  /** The add question may be asked (not turned down, ≤ 1 every two weeks). */
  ask: boolean;
}

/**
 * §9.1: the taster card for today, or null. About once every two weeks (sooner when a style is overdue for its quarter);
 * a style turned down is not offered as a card for 6 months (its taste in the workout's 10 % goes on).
 */
export function tasterFor(s: FocusSettings, course: CourseId, today: string, weak: WeakArea = null): TasterOffer | null {
  const t = s.styleTaste;
  const last = t?.lastOffer;
  const order = tasterRotation(s, course, today, weak).filter((x) => !declined(t, x, today));
  if (!order.length) return null;
  const since = last ? daysBetween(last, today) : TASTER_EVERY_DAYS;
  const overdue = sinceTaste(t, order[0], today) >= QUARTER_DAYS;
  if (since < TASTER_EVERY_DAYS && !(overdue && since >= 7)) return null;
  const style = order[0];
  const ask = !t?.lastAsk || daysBetween(t.lastAsk, today) >= TASTER_EVERY_DAYS;
  return { style, gain: tasterSentence(focusOf(s, course).main, style), ask };
}

/** The card was shown (counts for the two-week rhythm even when not played). */
export const offerShown = (t: StyleTaste | undefined, today: string): StyleTaste => ({ since: t?.since ?? today, ...t, lastOffer: today });

/** The taste was played (the quarter's clock for that style restarts). */
export function tasted(t: StyleTaste | undefined, style: StyleId, today: string): StyleTaste {
  const by = { ...(t?.by ?? {}) };
  by[style] = { ...(by[style] ?? {}), tasted: today };
  return { since: t?.since ?? today, ...t, lastOffer: today, by };
}

/** The answer to "add it to your styles?": add / not now / don't offer for 6 months. */
export function answerTaste(t: StyleTaste | undefined, style: StyleId, answer: 'add' | 'later' | 'never', today: string): StyleTaste {
  const by = { ...(t?.by ?? {}) };
  by[style] = { ...(by[style] ?? {}), answer, ...(answer === 'never' ? { declinedUntil: addDays(today, DECLINE_DAYS) } : { declinedUntil: undefined }) };
  return { since: t?.since ?? today, ...t, lastAsk: today, by };
}

/** "Add" with 3 picks already: the player chooses one to swap out (null = no swap needed). */
export function addStyle(course: CourseId, f: StyleFocus, style: StyleId, swapOut?: StyleId): StyleFocus | null {
  const ps = picksOf(f);
  if (ps.includes(style)) return f;
  if (ps.length < MAX_PICKS) return focusFromPicks(course, [...ps, style]);
  if (!swapOut || !ps.includes(swapOut)) return null;
  return focusFromPicks(course, ps.map((x) => (x === swapOut ? style : x)));
}

// ---- time per style (§9.4)

/** A day's minutes in a style (improvisation and repertoire time, and the tastes). */
export interface StyleMinutes {
  d: string;
  c: CourseId;
  s: StyleId;
  m: number;
  /** Where the time went. */
  w?: 'improv' | 'rep' | 'taste';
}
/** Add minutes to the log (kept for 200 days). */
export function logStyleMinutes(log: StyleMinutes[] | undefined, e: StyleMinutes): StyleMinutes[] {
  const keepFrom = addDays(e.d, -200);
  const out = (log ?? []).filter((x) => x.d >= keepFrom);
  const hit = out.find((x) => x.d === e.d && x.c === e.c && x.s === e.s && (x.w ?? '') === (e.w ?? ''));
  if (hit) hit.m = Math.round((hit.m + e.m) * 10) / 10;
  else out.push({ ...e, m: Math.round(e.m * 10) / 10 });
  return out;
}
/** Minutes per style in a course since a day. */
export function minutesByStyle(log: StyleMinutes[] | undefined, course: CourseId, from: string, where?: ('improv' | 'rep' | 'taste')[]): Partial<Record<StyleId, number>> {
  const out: Partial<Record<StyleId, number>> = {};
  for (const x of log ?? []) if (x.c === course && x.d >= from && (!where || where.includes(x.w ?? 'improv'))) out[x.s] = (out[x.s] ?? 0) + x.m;
  return out;
}

/** §9.4: the 6-month look — due when 6 months passed since it was last shown (or since the service started). */
export function prefsDue(t: StyleTaste | undefined, today: string): boolean {
  const ref = t?.prefsSeen ?? t?.since;
  return !!ref && daysBetween(ref, today) >= PREFS_EVERY_DAYS;
}

/**
 * §9.4: a style outside the focus with more than 20 % of the improvisation or repertoire time over the last month gets
 * "add it to your styles?" right away (once a month at most per style; never one turned down).
 */
export function heavyStyle(s: FocusSettings & { styleMinutes?: StyleMinutes[] }, course: CourseId, today: string): StyleId | null {
  const by = minutesByStyle(s.styleMinutes, course, addDays(today, -HEAVY_WINDOW_DAYS), ['improv', 'rep']);
  const tot = Object.values(by).reduce((a, b) => a + (b ?? 0), 0);
  if (tot < 30) return null;
  const f = focusOf(s, course);
  const t = s.styleTaste;
  const cands = (Object.entries(by) as [StyleId, number][])
    .filter(([x, m]) => !picksOf(f).includes(x) && canHave(course, x) && m / tot > HEAVY_SHARE && !declined(t, x, today))
    .filter(([x]) => !t?.heavyAsked?.[x] || daysBetween(t.heavyAsked[x]!, today) >= HEAVY_WINDOW_DAYS)
    .sort((a, b) => b[1] - a[1]);
  return cands[0]?.[0] ?? null;
}
export const heavyAsked = (t: StyleTaste | undefined, style: StyleId, today: string): StyleTaste => ({ since: t?.since ?? today, ...t, heavyAsked: { ...(t?.heavyAsked ?? {}), [style]: today } });

/** Teacher's suggestion (§3): "focus: Latin jazz" travels as an assignment ref; the student approves. */
export const FOCUS_REF_PREFIX = 'focus:';
export const focusRef = (course: CourseId, f: StyleFocus): string => `${FOCUS_REF_PREFIX}${course}:${picksOf(f).join('+')}`;
export function parseFocusRef(ref: string | null | undefined): { course: CourseId; focus: StyleFocus } | null {
  const m = /^focus:(ear|voice|keys|guitar|bass|drums):([a-z+]+)$/.exec(ref ?? '');
  if (!m) return null;
  const course = m[1] as CourseId;
  const picks = m[2].split('+').filter(isStyleId);
  if (!picks.length) return null;
  return { course, focus: focusFromPicks(course, picks) };
}
