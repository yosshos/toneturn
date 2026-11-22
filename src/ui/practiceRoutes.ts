// Addresses of the reorganised Practice (docs/SPEC-PRACTICE-IA-3.md §5, BUILD-PLAN-2026-11 phase 3). Pure.
//
// Repertoire is one place: #/repertoire[/t/<tier>|/mine[/<filter>]][/p/<piece key>][?from=path|today|teacher].
// The engines it reuses keep their screens under it: the chart player (#/repertoire/chart[/<piece key>]), the piece
// coach (#/repertoire/score[/<id>]), My song (#/repertoire/recording[/<id>]) and the songbook drills
// (#/repertoire/songbook). The transcription coach is Licks › Transcribe (#/licks/transcribe).
// The old homes land in the new places (the address is rewritten in place, so Back never lands on the old one):
//   #/charts → Repertoire › Mine (charts) · #/pieces → Mine (scores) · #/mysong → Mine (recordings)
//   #/songs → Repertoire › Foundations · #/transcribe-coach → Licks › Transcribe. The game #/transcribe stays the race.

import type { MineFilter, RepTab } from '../engine/repLibrary';

export type WayIn = 'practice' | 'path' | 'today' | 'teacher';
export interface RepView {
  tab?: RepTab;
  mine?: MineFilter;
  /** The piece page on show (a piece key, repLibrary.ts). */
  piece?: string;
  /** How the piece page was reached (its main button and Back follow it). */
  from?: WayIn;
}

/** The routes whose screens now live under Repertoire / Licks, and their new addresses. */
export const ENGINE_HASH = { charts: 'repertoire/chart', pieces: 'repertoire/score', mysong: 'repertoire/recording', songs: 'repertoire/songbook', 'transcribe-coach': 'licks/transcribe' } as const;
export type EngineRoute = keyof typeof ENGINE_HASH;
export const isEngineRoute = (r: string): r is EngineRoute => r in ENGINE_HASH;

const pathOf = (hash: string) => hash.replace(/^#\/?/, '').split('?')[0].replace(/\/+$/, '');
const queryOf = (hash: string) => new URLSearchParams(hash.split('?')[1] ?? '');

/** The address an engine screen opens at (without '#'); `arg` = the piece key / id it shows (kept for a reload). */
export const engineHash = (r: EngineRoute, arg?: string | null): string => `/${ENGINE_HASH[r]}${arg && r !== 'songs' && r !== 'transcribe-coach' ? `/${encodeURIComponent(arg)}` : ''}`;
/** The id an engine address carries (the chart's piece key, a score or recording id). */
export function engineArg(hash: string): string | null {
  const p = pathOf(hash);
  for (const base of ['repertoire/chart/', 'repertoire/score/', 'repertoire/recording/']) if (p.startsWith(base)) return decodeURIComponent(p.slice(base.length)) || null;
  return null;
}

/** An old Practice home → the address that replaced it (null when the hash is not one). */
export function legacyPracticeHash(hash: string): string | null {
  const p = pathOf(hash);
  if (p === 'charts') return repHash({ tab: 'mine', mine: 'charts' });
  if (p === 'pieces') return repHash({ tab: 'mine', mine: 'scores' });
  if (p === 'mysong') return repHash({ tab: 'mine', mine: 'recordings' });
  if (p === 'songs') return repHash({ tab: 1 });
  if (p === 'transcribe-coach') return `/${ENGINE_HASH['transcribe-coach']}`;
  return null;
}

/** The route a Practice address opens: an engine screen, the Repertoire place, or null (not one of these). */
export function practiceRouteOf(hash: string): EngineRoute | 'repertoire' | null {
  const p = pathOf(hash);
  for (const [r, base] of Object.entries(ENGINE_HASH)) if (p === base || p.startsWith(`${base}/`)) return r as EngineRoute;
  if (p === 'repertoire' || p.startsWith('repertoire/')) return 'repertoire';
  return null;
}

const MINE: MineFilter[] = ['all', 'charts', 'scores', 'recordings'];
/** The Repertoire view an address names. */
export function repViewOf(hash: string): RepView {
  const p = pathOf(hash);
  if (!p.startsWith('repertoire')) return {};
  const parts = p.split('/').slice(1);
  const v: RepView = {};
  for (let i = 0; i < parts.length; i++) {
    const x = parts[i];
    if (x === 't' && /^[1-4]$/.test(parts[i + 1] ?? '')) v.tab = Number(parts[++i]) as RepTab;
    else if (x === 'mine') {
      v.tab = 'mine';
      if (MINE.includes(parts[i + 1] as MineFilter)) v.mine = parts[++i] as MineFilter;
    } else if (x === 'p' && parts[i + 1]) v.piece = decodeURIComponent(parts.slice(i + 1).join('/'));
    if (x === 'p') break;
  }
  const from = queryOf(hash).get('from');
  if (from === 'path' || from === 'today' || from === 'teacher') v.from = from;
  return v;
}
/** The address of a Repertoire view (without '#'). */
export function repHash(v: RepView): string {
  let h = '/repertoire';
  if (v.tab === 'mine') h += `/mine${v.mine && v.mine !== 'all' ? `/${v.mine}` : ''}`;
  else if (v.tab) h += `/t/${v.tab}`;
  if (v.piece) h += `/p/${encodeURIComponent(v.piece)}`;
  if (v.from && v.from !== 'practice') h += `?from=${v.from}`;
  return h;
}
