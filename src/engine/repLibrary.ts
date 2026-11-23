// The merged Repertoire (docs/SPEC-PRACTICE-IA-3.md §3, BUILD-PLAN-2026-11 phase 3): one place for every piece — the
// course's repertoire road (repertoire.ts), the standards' changes (standards.ts, with the jazz pack), my charts, my
// scores (the piece coach), my recordings (My song) and the progression templates. Each piece has one key and one
// page; what the page offers depends on what the piece has (a chart, a melody, a score, a recording). Pure.

import { REP_TIERS, repertoireFor, repLessonId, REP_LEARNED, REP_TOTAL, type RepCourse, type RepItem, type RepTier, type RepWay } from './repertoire';
import { STANDARD_CHANGES, type StandardChanges } from './standards';
import { CHART_TEMPLATES, IMPROV_LEVELS, parseChart, type ChartStyle } from './charts';
import { PASS_DAYS, PASS_TAKES } from './drills/ladder';
import type { ItemStatus } from './drills/itemStatus';
import type { CourseId } from './courses';
import { ladderStyleOf, type PathView } from './path';
import type { StyleId } from './styles';

type Bi = { en: string; he: string };

/** What a piece is: a repertoire-road item, a standard's changes, my chart, a progression template, my score, my recording. */
export type PieceKind = 'rep' | 'std' | 'chart' | 'tpl' | 'score' | 'rec';
export interface PieceRef {
  kind: PieceKind;
  id: string;
  /** rep only: the collection (a course, or 'jazz' for Ear's jazz standards). */
  course?: RepCourse;
}

/** One key per piece: "rep:<course>:<item>" (the path step's id), "std:<id>", "chart:<id>", "tpl:<id>", "score:<id>", "rec:<id>". */
export const pieceKey = (r: PieceRef): string => (r.kind === 'rep' ? `rep:${r.course}:${r.id}` : `${r.kind}:${r.id}`);
export function parsePieceKey(k: string | null | undefined): PieceRef | null {
  if (!k) return null;
  const m = /^rep:(ear|jazz|voice|keys|guitar|bass|drums):(.+)$/.exec(k);
  if (m) return { kind: 'rep', course: m[1] as RepCourse, id: m[2] };
  const n = /^(std|chart|tpl|score|rec):(.+)$/.exec(k);
  return n ? { kind: n[1] as PieceKind, id: n[2] } : null;
}

/** The list's tabs: the four tiers, then Mine (everything I added). */
export type RepTab = RepTier | 'mine';
export const REP_TABS: RepTab[] = [1, 2, 3, 4, 'mine'];
export const tabName = (t: RepTab): Bi => (t === 'mine' ? { en: 'Mine', he: 'שלי' } : REP_TIERS[t - 1].name);
/** What Mine holds, as a filter (an old #/pieces link opens it on the scores, #/mysong on the recordings). */
export type MineFilter = 'all' | 'charts' | 'scores' | 'recordings';

export interface LibEntry {
  key: string;
  ref: PieceRef;
  tab: RepTab;
  title: Bi;
  /** What it teaches (the road items) or what it is. */
  teaches: Bi;
  /** The repertoire-road item, when it is one. */
  item?: RepItem;
  /** The standard (standards.ts id) whose changes it plays. */
  std?: string;
  /** Mine: what kind of thing I added. */
  mine?: 'chart' | 'score' | 'rec';
}

/** The jazz standards appear in these courses' lists with the jazz pack open (they play or sing over changes). */
const STD_COURSES: CourseId[] = ['keys', 'guitar', 'bass', 'voice', 'ear'];

/** The tier a standard's changes sit in: blues forms with the progressions, the hardest (4–5 stars) as advanced. */
export const stdTier = (s: Pick<StandardChanges, 'group' | 'level'>): RepTier => (s.group === 'blues' && s.level <= 2 ? 2 : s.level >= 4 || s.group === 'coltrane' ? 4 : 3);

const stdTitle = (s: StandardChanges): Bi => {
  const whole = s.part.en.startsWith('Whole');
  return { en: whole ? s.name : `${s.name} (${s.part.en})`, he: whole ? s.name : `${s.name} (${s.part.he})` };
};

/** The standards a course's road already covers (its items' changes). */
function coveredStandards(items: RepItem[]): Set<string> {
  const out = new Set<string>();
  for (const it of items) {
    if (it.ref?.kind === 'standard') out.add(it.ref.id);
    for (const w of it.ways) if (w.k === 'chart' || w.k === 'chartDrill' || w.k === 'bassStd' || w.k === 'guitarStd') out.add(w.std);
  }
  return out;
}

const repEntry = (course: RepCourse, it: RepItem): LibEntry => ({
  key: pieceKey({ kind: 'rep', course, id: it.id }),
  ref: { kind: 'rep', course, id: it.id },
  tab: it.tier,
  title: it.title,
  teaches: it.teaches,
  item: it,
  std: stdOfItem(it),
});

/** The standard an item plays (its reference, or the changes one of its ways uses). */
export function stdOfItem(it: RepItem): string | undefined {
  if (it.ref?.kind === 'standard') return it.ref.id;
  for (const w of it.ways) if (w.k === 'chart' || w.k === 'chartDrill' || w.k === 'bassStd' || w.k === 'guitarStd') return w.std;
  return undefined;
}

/**
 * The tier tabs' pieces for a course: its own road; in Ear with the jazz pack open, the jazz standards too (SPEC-JAZZ-FOLD,
 * their results stay "rep-jazz-…"); and with the jazz pack open, every standard's changes the road does not already
 * cover (the jazz pack changes the content, not whether the place exists).
 */
export function libraryFor(course: CourseId, jazz: 'off' | 'on' | 'focus' = 'off'): LibEntry[] {
  const own = repertoireFor(course).map((it) => repEntry(course, it));
  const jazzOn = jazz !== 'off';
  const jz = course === 'ear' && jazzOn ? repertoireFor('jazz').map((it) => repEntry('jazz', it)) : [];
  if (!jazzOn || !STD_COURSES.includes(course)) return [...own, ...jz];
  const covered = coveredStandards([...repertoireFor(course), ...(jz.length ? repertoireFor('jazz') : [])]);
  const extra: LibEntry[] = STANDARD_CHANGES.filter((s) => !covered.has(s.id)).map((s) => ({
    key: pieceKey({ kind: 'std', id: s.id }),
    ref: { kind: 'std', id: s.id },
    tab: stdTier(s),
    title: stdTitle(s),
    teaches: { en: `Changes · ${'★'.repeat(s.level)}`, he: `מהלך · ${'★'.repeat(s.level)}` },
    std: s.id,
  }));
  return [...own, ...jz, ...extra];
}

export interface MyChartLike {
  id: string;
  title: string;
  text: string;
  style: ChartStyle;
  bpm: number;
  std?: string;
  level?: string;
  melody?: { b: number; d: number; m: number }[];
}

/** Mine: my charts (lead sheets, typed chords), my scores (the piece coach), my recordings (My song). */
export function mineEntries(charts: MyChartLike[] | undefined, scores: { id: string; title: string; composer?: string }[] = [], recs: { id: string; name: string }[] = []): LibEntry[] {
  return [
    ...(charts ?? []).map((c): LibEntry => ({ key: pieceKey({ kind: 'chart', id: c.id }), ref: { kind: 'chart', id: c.id }, tab: 'mine', mine: 'chart', title: { en: c.title, he: c.title }, teaches: { en: c.melody?.length ? 'Lead sheet' : 'Chord chart', he: c.melody?.length ? 'דף אקורדים עם מנגינה' : 'מהלך אקורדים' }, ...(c.std ? { std: c.std } : {}) })),
    ...scores.map((s): LibEntry => ({ key: pieceKey({ kind: 'score', id: s.id }), ref: { kind: 'score', id: s.id }, tab: 'mine', mine: 'score', title: { en: s.title, he: s.title }, teaches: { en: s.composer ? `Score · ${s.composer}` : 'Score', he: s.composer ? `תווים · ${s.composer}` : 'תווים' } })),
    ...recs.map((r): LibEntry => ({ key: pieceKey({ kind: 'rec', id: r.id }), ref: { kind: 'rec', id: r.id }, tab: 'mine', mine: 'rec', title: { en: r.name, he: r.name }, teaches: { en: 'My recording', he: 'ההקלטה שלי' } })),
  ];
}
export const mineMatches = (e: LibEntry, f: MineFilter): boolean => f === 'all' || (f === 'charts' && e.mine === 'chart') || (f === 'scores' && e.mine === 'score') || (f === 'recordings' && e.mine === 'rec');

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[֑-ׇ⁦-⁩⁠]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
/** Search by title or what it teaches, in both languages. */
export function searchLib(entries: LibEntry[], q: string): LibEntry[] {
  const words = norm(q).split(' ').filter(Boolean);
  if (!words.length) return entries;
  return entries.filter((e) => {
    const hay = norm(`${e.title.en} ${e.title.he} ${e.teaches.en} ${e.teaches.he}`);
    return words.every((w) => hay.includes(w));
  });
}

// ------------------------------------------------------------------ the chart a piece plays

/** The chart (chords, style, tempo) a piece plays with the band, when it has one. */
export function chartOfPiece(ref: PieceRef, lang: 'en' | 'he', myCharts: MyChartLike[] | undefined): MyChartLike | null {
  const fromStd = (id: string, title?: string): MyChartLike | null => {
    const s = STANDARD_CHANGES.find((x) => x.id === id);
    return s ? { id: `std-${s.id}`, title: title ?? `${s.name} — ${s.part[lang]}`, text: s.text, style: s.style, bpm: s.bpm, std: s.id } : null;
  };
  if (ref.kind === 'chart') return (myCharts ?? []).find((c) => c.id === ref.id) ?? null;
  if (ref.kind === 'std') return fromStd(ref.id);
  if (ref.kind === 'tpl') {
    const t = CHART_TEMPLATES.find((x) => x.id === ref.id);
    return t ? { id: `tpl-${t.id}`, title: t.title[lang], text: t.text, style: t.style, bpm: t.bpm } : null;
  }
  if (ref.kind === 'rep' && ref.course) {
    const it = repertoireFor(ref.course).find((x) => x.id === ref.id);
    const std = it ? stdOfItem(it) : undefined;
    // the road item's id stays the chart's (rep-<std>): Charts' best scores and the item's result follow it
    const c = std ? fromStd(std, `${it!.title[lang]}`) : null;
    return c ? { ...c, id: `rep-${std}` } : null;
  }
  return null;
}

/** An improvisation level as a chart (Improvise's levels, the same object Charts made). */
export function chartOfLevel(id: string, lang: 'en' | 'he'): MyChartLike | null {
  const l = IMPROV_LEVELS.find((x) => x.id === id);
  return l ? { id: `lvl-${l.id}`, title: l.title[lang], text: l.text, style: l.style, bpm: l.bpm, level: l.id } : null;
}

// ------------------------------------------------------------------ the piece page's actions

export type PieceAction =
  /** One of the road item's own measured ways (its label comes from wayLabel). */
  | { k: 'way'; way: RepWay }
  /** Play with the band (ChartPlayer): style, tempo, key, loop. */
  | { k: 'band' }
  /** Improvise on it: Improvise opens with this chart. */
  | { k: 'improvise' }
  /** Learn it from the score: the piece coach. */
  | { k: 'score' }
  /** Play along with my recording / transcribe a phrase (My song). */
  | { k: 'recording' }
  /** Practise it in the technique hub: one of the piece's keys on the key page (`key`; absent = pick from the piece's keys). */
  | { k: 'technique'; key?: number }
  /** Learn the melody (SPEC-PRACTICE-IA-3 §3, SPEC-EAR-AND-READING §3.3): by ear (a phrase at a time, the notation after) or from the page. */
  | { k: 'melody'; mode: 'ear' | 'page' }
  /** Comp it (piano voicings and a comping rhythm, guitar comping, bass walking): a standard's own drill (`way`), or the chart's changes on the piano. */
  | { k: 'comp'; way?: RepWay }
  /** The piece's voicings on the piano (the technique hub's other half): the chart's changes in rootless voicings. */
  | { k: 'voicings' }
  /** Transcribe a phrase (standards and songs): Licks › Transcribe; the result goes into Licks › Mine. */
  | { k: 'transcribe' };

/** The courses whose players improvise over a chart (Improvise exists for them). */
const IMPROV_COURSES: CourseId[] = ['keys', 'guitar', 'bass', 'voice', 'ear'];
const TECH_COURSES: CourseId[] = ['keys', 'guitar', 'bass'];

/**
 * What a piece's page offers, in order — only what applies to what the piece has: its own measured ways (the road
 * items), the band when it has a chart (unless a way already is the band), Improvise on a chart, the piece coach for a
 * score, My song for a recording, the technique hub for a chart on an instrument. Memorise and Listen are links on
 * every page (Listen only for standards) and are not listed here.
 */
export function pieceActions(e: Pick<LibEntry, 'ref' | 'item' | 'std'>, course: CourseId, hasChart: boolean, o: { /** The piece has a melody to learn (an imported lead sheet's tune, a songbook song). */ melody?: boolean; /** The player's strong channel (the profile): its way to learn the melody comes first. */ strong?: 'ear' | 'page' } = {}): PieceAction[] {
  const out: PieceAction[] = [];
  if (e.ref.kind === 'score') return [{ k: 'score' }];
  if (e.ref.kind === 'rec') return [{ k: 'recording' }];
  for (const w of e.item?.ways ?? []) out.push({ k: 'way', way: w });
  const bandWay = out.some((a) => a.k === 'way' && a.way.k === 'chart');
  const std = e.std ?? (e.item?.ref?.kind === 'standard' ? e.item.ref.id : undefined) ?? e.item?.ways.map((w) => ('std' in w ? w.std : undefined)).find(Boolean);
  if (hasChart && !bandWay) out.push({ k: 'band' });
  // learn the melody, both ways, the strong channel first (SPEC-EAR-AND-READING §3.3)
  if (o.melody && TECH_COURSES.includes(course)) {
    const modes: ('ear' | 'page')[] = o.strong === 'page' ? ['page', 'ear'] : ['ear', 'page'];
    for (const mode of modes) out.push({ k: 'melody', mode });
  }
  // comp it, as a direct action, unless one of the piece's own ways already comps it
  const compWay = (e.item?.ways ?? []).some((w) => w.k === 'chartDrill' || w.k === 'guitarStd' || w.k === 'bassStd');
  if (hasChart && !compWay && TECH_COURSES.includes(course)) {
    const way: RepWay | undefined = std ? (course === 'keys' ? { k: 'chartDrill', std, voicing: 'rootless', rhythm: 'charleston' } : course === 'guitar' ? { k: 'guitarStd', std } : { k: 'bassStd', std }) : undefined;
    if (way || course === 'keys') out.push({ k: 'comp', ...(way ? { way } : {}) });
  }
  if (hasChart && IMPROV_COURSES.includes(course)) out.push({ k: 'improvise' });
  if (hasChart && TECH_COURSES.includes(course)) out.push({ k: 'technique' });
  // transcribe a phrase: standards and songs, in the instrument courses
  const song = (e.item?.ways ?? []).some((w) => w.k === 'song');
  if ((std || song) && TECH_COURSES.includes(course)) out.push({ k: 'transcribe' });
  return out;
}

/**
 * The keys a chart moves through (the technique hub's "that piece's keys"): every resolution of a dominant to the chord
 * a 5th below (V → I, V → i), in order of first appearance, then the last chord's key if no resolution named it; at most
 * four. A chart without one: its first chord's root.
 */
export function pieceKeys(text: string): { root: number; minor: boolean }[] {
  const p = parseChart(text, 4);
  const cs = p.chords;
  if (!cs.length) return [];
  const has = (iv: number[], x: number) => iv.some((i) => ((i % 12) + 12) % 12 === x);
  const dom = (iv: number[]) => has(iv, 4) && has(iv, 10);
  const out: { root: number; minor: boolean }[] = [];
  const add = (root: number, minor: boolean) => {
    if (!out.some((k) => k.root === root && k.minor === minor)) out.push({ root, minor });
  };
  for (let i = 0; i + 1 < cs.length; i++) {
    const a = cs[i], b = cs[i + 1];
    if (dom(a.iv) && !dom(b.iv) && (((b.root - a.root) % 12) + 12) % 12 === 5) add(b.root, has(b.iv, 3) && !has(b.iv, 4));
  }
  const last = cs[cs.length - 1];
  if (!out.length) add(dom(last.iv) ? cs[0].root : last.root, has(last.iv, 3) && !has(last.iv, 4));
  return out.slice(0, 4);
}

// ------------------------------------------------------------------ status (BUILD-PLAN D1, D4: one ladder, "closed")

interface HistLike {
  lessonId: string;
  completedAt: string;
  firstTry: number;
  total: number;
}

/**
 * A road piece's status by the one rule (D1): a clean take = a result at the piece's pass mark (80 %, the cautious ✓);
 * closed = 3 clean takes on 2 different days; one clean take = almost; any play = learning. Results older than the
 * history fall back to the best score (a pass once = almost).
 */
export function pieceStatus(history: HistLike[] | undefined, lessons: Record<string, { best: number; completions: number }> | undefined, course: RepCourse, id: string): ItemStatus {
  const lid = repLessonId(course, id);
  const runs = (history ?? []).filter((h) => h.lessonId === lid && h.total > 0);
  const clean = runs.filter((h) => h.firstTry / h.total >= REP_LEARNED - 1e-9);
  const days = new Set(clean.map((h) => h.completedAt.slice(0, 10)));
  if (clean.length >= PASS_TAKES && days.size >= PASS_DAYS) return 'closed';
  const l = lessons?.[lid];
  if (clean.length || (l && l.best / REP_TOTAL >= REP_LEARNED - 1e-9)) return 'almost';
  return runs.length || l?.completions ? 'learning' : 'new';
}

/** A score in the piece coach: learned (two clean runs at tempo on two days) = closed; started = learning. */
export const scoreStatus = (progress: number, done: boolean): ItemStatus => (done ? 'closed' : progress > 0 ? 'learning' : 'new');
/** A recording in My song: its best session score. */
export const recStatus = (best: number | undefined): ItemStatus => (best === undefined ? 'new' : best >= REP_LEARNED ? 'almost' : 'learning');

// ------------------------------------------------------------------ path ↔ practice (SPEC-PATH-TODAY-PRACTICE §3.1–3.2)

export interface WhereInPath {
  /** The unit's number as the path shows it. */
  unit: number;
  /** The step's place in the unit (1-based). */
  step: number;
  /** done = passed or opened; current = the step to play now; ahead = later in the path. */
  state: 'done' | 'current' | 'ahead';
}
/** Where a step sits in the player's path (the "where it sits" chip), or null when it is not on the path. */
export function whereInPath(view: Pick<PathView, 'units' | 'history'> | null | undefined, stepId: string): WhereInPath | null {
  if (!view) return null;
  for (const u of [...view.history, ...view.units]) {
    const i = u.steps.findIndex((x) => x.step.id === stepId);
    if (i < 0) continue;
    const st = u.steps[i].state;
    const state: WhereInPath['state'] = st === 'current' ? 'current' : st === 'done' || st === 'mastered' || st === 'tested' || st === 'refresh' ? 'done' : u.status === 'projected' || st === 'locked' ? 'ahead' : 'current';
    return { unit: u.no ?? u.n, step: i + 1, state };
  }
  return null;
}

/**
 * SPEC-STYLE-FOCUS §4: a library entry's style — a styled technique level among its ways (a bossa groove), else a
 * standard's (a bossa standard is Brazilian, the rest jazz); null when it has none (songs, my pieces): "All styles" only.
 */
export function entryStyle(e: Pick<LibEntry, 'item' | 'std'>): StyleId | null {
  for (const w of e.item?.ways ?? []) if (w.k === 'level') {
    const st = ladderStyleOf(w.ref);
    if (st) return st;
  }
  const stdId = e.std ?? (e.item?.ref?.kind === 'standard' ? e.item.ref.id : undefined) ?? e.item?.ways.map((w) => ('std' in w ? w.std : undefined)).find(Boolean);
  if (stdId) return STANDARD_CHANGES.find((x) => x.id === stdId)?.style === 'bossa' ? 'brazil' : 'jazz';
  return null;
}

/** A closed road piece comes back for a review run this many days after its last result (SPEC-PRACTICE-IA-3 §5). */
export const REP_REVIEW_DAYS = 7;
/**
 * The road piece due for review (SPEC-PRACTICE-IA-3 §5, the workout's Repertoire block — not only the score coach):
 * of the course's closed pieces, the one whose last result is oldest and at least REP_REVIEW_DAYS old. Its piece key, or
 * null when none is due.
 */
export function repDueKey(history: HistLike[] | undefined, course: RepCourse, today: string): string | null {
  const t = Date.parse(`${today}T12:00:00Z`);
  let best: { key: string; last: number } | null = null;
  for (const it of repertoireFor(course)) {
    if (pieceStatus(history, undefined, course, it.id) !== 'closed') continue;
    const lid = repLessonId(course, it.id);
    const last = Math.max(...(history ?? []).filter((h) => h.lessonId === lid).map((h) => Date.parse(h.completedAt)));
    if (!Number.isFinite(last) || t - last < REP_REVIEW_DAYS * 86_400_000) continue;
    if (!best || last < best.last) best = { key: pieceKey({ kind: 'rep', course, id: it.id }), last };
  }
  return best?.key ?? null;
}
