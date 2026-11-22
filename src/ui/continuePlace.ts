// "Continue where I stopped" at the top of Practice (SPEC-PRACTICE-IA-3 §8, SPEC-PATH-TODAY-PRACTICE §3.4): the last
// place visited in any of the places — its address (a piece page, a licks section, the improv studio, technique) and
// a name for the card. On this device only (localStorage); a blocked storage just shows no card.

import { chartOfPiece, parsePieceKey, type MyChartLike } from '../engine/repLibrary';
import { repItem } from '../engine/repertoire';
import { engineArg, repViewOf } from './practiceRoutes';
import { licksSectionOf } from './licksHub';

export type PlaceId = 'technique' | 'licks' | 'repertoire' | 'improv' | 'games' | 'lessons';
export interface LastPlace {
  place: PlaceId;
  /** The address to open again (with '#'). */
  hash: string;
  /** What it was, in the player's language when it was saved. */
  title: string;
  at: string;
}

const KEY = 'toneturn.lastPlace.v1';
const MAX_AGE_MS = 14 * 86400000;

/** The place a route belongs to (null = not a place's screen). */
export function placeOfRoute(route: string): PlaceId | null {
  if (route === 'drills' || route === 'vocal') return 'technique';
  if (route === 'licks' || route === 'transcribe-coach') return 'licks';
  if (route === 'repertoire' || route === 'charts' || route === 'pieces' || route === 'mysong' || route === 'songs') return 'repertoire';
  if (route === 'improv') return 'improv';
  if (route === 'learned') return 'lessons';
  return null;
}

export function rememberPlace(p: Omit<LastPlace, 'at'>, now = new Date()): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...p, at: now.toISOString() }));
  } catch {
    /* private mode */
  }
}

const PLACE_NAME: Record<PlaceId, { en: string; he: string }> = {
  technique: { en: 'Technique', he: 'טכניקה' },
  licks: { en: 'Licks', he: 'ליקים' },
  repertoire: { en: 'Repertoire', he: 'רפרטואר' },
  improv: { en: 'Improvise', he: 'אלתור' },
  games: { en: 'Games', he: 'משחקים' },
  lessons: { en: 'Lessons', he: 'שיעורים' },
};
const LICKS_SEC = { library: { en: 'Library', he: 'הספרייה' }, mine: { en: 'Mine', he: 'שלי' }, challenges: { en: 'Challenges', he: 'אתגרים' }, transcribe: { en: 'Transcribe', he: 'תמלול' } } as const;

/** The card's name for a place's address: "Repertoire · Autumn Leaves", "Licks · Transcribe", "Improvise". */
export function placeTitle(route: string, hash: string, lang: 'en' | 'he', myCharts?: MyChartLike[]): string {
  const place = placeOfRoute(route);
  const base = place ? PLACE_NAME[place][lang] : '';
  if (place === 'repertoire') {
    const ref = parsePieceKey(repViewOf(hash).piece ?? engineArg(hash));
    let name: string | null = null;
    if (ref?.kind === 'rep' && ref.course) name = repItem(ref.course, ref.id)?.title[lang] ?? null;
    else if (ref) name = chartOfPiece(ref, lang, myCharts)?.title ?? null;
    return name ? `${base} · ${name}` : base;
  }
  if (place === 'licks') return `${base} · ${LICKS_SEC[licksSectionOf(hash)][lang]}`;
  return base;
}

export function lastPlace(now = Date.now()): LastPlace | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as LastPlace | null;
    if (!v || !v.hash || !v.place || now - new Date(v.at).getTime() > MAX_AGE_MS) return null;
    return v;
  } catch {
    return null;
  }
}
