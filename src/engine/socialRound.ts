// The social round (SPEC-SOCIAL §8, owner OK 2026-11-12): block filtering, report reasons, quick-message phrases,
// challenge-link codes, friends'-activity milestones and their one-line texts, the friend quest's progress. Pure.

import { BADGE_BY_ID, type Badge } from './badges';
import { AREA_NAME, rankLabel, type RankArea } from './ranks';
import { courseOf, type CourseId } from './courses';
import { REPERTOIRE, repResults, repStatus } from './repertoire';

type Lang = 'he' | 'en';

// ---------------------------------------------------------------- block & report

/** Rows without the players I blocked (server lists already hide them; this covers cached / realtime rows). */
export function withoutBlocked<T>(rows: T[], blocked: Iterable<string>, idOf: (r: T) => string | null | undefined): T[] {
  const b = new Set(blocked);
  if (!b.size) return rows;
  return rows.filter((r) => {
    const id = idOf(r);
    return !id || !b.has(id);
  });
}

export type ReportKind = 'nickname' | 'photo' | 'message' | 'cheating' | 'young' | 'other';
export const REPORT_REASONS: { id: ReportKind; en: string; he: string }[] = [
  { id: 'nickname', en: 'Offensive nickname', he: 'כינוי פוגעני' },
  { id: 'photo', en: 'Inappropriate picture', he: 'תמונה לא מתאימה' },
  { id: 'message', en: 'Offensive message', he: 'הודעה פוגענית' },
  { id: 'cheating', en: 'Cheating', he: 'רמאות' },
  { id: 'young', en: 'Seems younger than 13 / unsafe', he: 'נראה צעיר מ־13 / לא בטוח' },
  { id: 'other', en: 'Something else', he: 'משהו אחר' },
];

// ---------------------------------------------------------------- quick messages

export type QuickPhrase = 'gl' | 'nice' | 'gg' | 'rematch' | 'wow' | 'thanks' | 'oops' | 'close';
export const QUICK_PHRASES: { id: QuickPhrase; en: string; he: string }[] = [
  { id: 'gl', en: 'Good luck!', he: 'בהצלחה!' },
  { id: 'nice', en: 'Nice one!', he: 'יפה!' },
  { id: 'wow', en: 'Impressive', he: 'מרשים' },
  { id: 'close', en: 'Close one!', he: 'היה צמוד!' },
  { id: 'oops', en: 'Oops', he: 'אופס' },
  { id: 'gg', en: 'Good game!', he: 'משחק טוב!' },
  { id: 'rematch', en: 'Rematch?', he: 'עוד סיבוב?' },
  { id: 'thanks', en: 'Thanks!', he: 'תודה!' },
];
export const phraseText = (id: string, lang: Lang) => QUICK_PHRASES.find((p) => p.id === id)?.[lang] ?? '';
/** The phrases offered before a game starts and after it ends. */
export const phrasesFor = (stage: 'before' | 'after'): QuickPhrase[] => (stage === 'before' ? ['gl', 'nice', 'thanks'] : ['gg', 'rematch', 'wow', 'close', 'thanks']);
/** One message every 3 s (the server enforces it too). */
export const canSendQuick = (lastSentMs: number | null, nowMs: number) => lastSentMs === null || nowMs - lastSentMs >= 3000;

// ---------------------------------------------------------------- challenge links

/** 8 characters without look-alikes (no I, O, 0, 1): opaque — nothing personal in the link. */
export const CHALLENGE_CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;
export const challengeLink = (origin: string, path: string, code: string) => `${origin}${path}#/c/${code}`;
/** The code in a "#/c/CODE" hash, or null. */
export function challengeFromHash(hash: string): string | null {
  const m = /^#\/?c\/([A-Za-z0-9]{8})\/?$/.exec(hash.trim());
  const c = m?.[1].toUpperCase() ?? null;
  return c && CHALLENGE_CODE_RE.test(c) ? c : null;
}

// ---------------------------------------------------------------- friends' activity (automatic milestones)

export type ActivityKind = 'unit' | 'rank' | 'badge' | 'streak' | 'duet' | 'best' | 'level' | 'standard' | 'quest';
export interface ActivityPost {
  kind: ActivityKind;
  payload: Record<string, string | number>;
  /** Dedupe key on this device. */
  key: string;
}
export const STREAK_MILESTONES = [7, 14, 30, 50, 100, 200, 365];
const BIG_TONES = new Set(['gold', 'platinum', 'diamond', 'master']);
/** Only the big badges go to friends (479 exist — every badge would flood the feed). */
export const feedWorthyBadge = (b: Pick<Badge, 'cat' | 'tone'>) => b.cat === 'area' || b.cat === 'special' || b.cat === 'season' || (!!b.tone && BIG_TONES.has(b.tone));

export interface MilestoneSnapshot {
  /** Course → level name (pp … ff). */
  levels: Record<string, string>;
  /** "course:item" of every learned standard. */
  standards: string[];
  streak: number;
}
export interface MilestoneEvents {
  badges?: Pick<Badge, 'id' | 'cat' | 'tone'>[];
  rank?: { area: string; to: number; newTier: boolean; kind: string } | null;
}

const LEVEL_ORDER = ['pp', 'p', 'mp', 'mf', 'f', 'ff'];

/**
 * The posts for what changed since the last snapshot (null = first run: remember quietly, post nothing).
 * At most 3 posts at once; keys already posted are skipped.
 */
export function milestonePosts(prev: MilestoneSnapshot | null, next: MilestoneSnapshot, ev: MilestoneEvents, posted: Iterable<string>): ActivityPost[] {
  const done = new Set(posted);
  const out: ActivityPost[] = [];
  const add = (p: ActivityPost) => {
    if (!done.has(p.key) && !out.some((x) => x.key === p.key)) out.push(p);
  };
  if (ev.rank?.newTier) add({ kind: 'rank', payload: { area: ev.rank.area, div: ev.rank.to }, key: `rank:${ev.rank.area}:${ev.rank.to}` });
  for (const b of ev.badges ?? []) if (feedWorthyBadge(b)) add({ kind: 'badge', payload: { id: b.id }, key: `badge:${b.id}` });
  if (prev) {
    for (const [c, lv] of Object.entries(next.levels)) {
      const was = prev.levels[c];
      if (was && LEVEL_ORDER.indexOf(lv) > LEVEL_ORDER.indexOf(was)) add({ kind: 'level', payload: { course: c, level: lv }, key: `level:${c}:${lv}` });
    }
    for (const s of next.standards) if (!prev.standards.includes(s)) {
      const [course, id] = s.split(':');
      add({ kind: 'standard', payload: { course, id, first: prev.standards.length === 0 ? 1 : 0 }, key: `standard:${s}` });
    }
    const m = STREAK_MILESTONES.filter((n) => prev.streak < n && next.streak >= n).pop();
    if (m) add({ kind: 'streak', payload: { n: m }, key: `streak:${m}:${new Date().getFullYear()}` });
  }
  return out.slice(0, 3);
}

/** Learned standards ("course:item") from progress.lessons. */
export function learnedStandards(lessons: Record<string, { best: number; completions: number }> | undefined): string[] {
  const out: string[] = [];
  for (const course of Object.keys(REPERTOIRE) as CourseId[]) {
    const res = repResults(lessons, course);
    for (const it of REPERTOIRE[course]) if (it.standard && repStatus(res[it.id]) === 'learned') out.push(`${course}:${it.id}`);
  }
  return out;
}

/** One line for a feed row, in the reader's language. */
export function activityText(kind: string, payload: Record<string, unknown>, lang: Lang): string {
  const he = lang === 'he';
  const str = (k: string) => String(payload[k] ?? '');
  const num = (k: string) => Number(payload[k] ?? 0);
  switch (kind) {
    case 'badge': {
      const b = BADGE_BY_ID[str('id')];
      return b ? (he ? `קיבל תג: ${b.name.he}` : `earned a badge: ${b.name.en}`) : he ? 'קיבל תג חדש' : 'earned a new badge';
    }
    case 'rank': {
      const area = AREA_NAME[str('area') as RankArea]?.[lang] ?? str('area');
      return he ? `עלה ל־${rankLabel(num('div'), lang)} ב${area}` : `reached ${rankLabel(num('div'), lang)} in ${area}`;
    }
    case 'level': {
      const c = courseOf(str('course'));
      return he ? `עלה לרמה ${str('level')} ב${c.short.he}` : `moved up to ${str('level')} in ${c.short.en}`;
    }
    case 'standard': {
      const it = REPERTOIRE[str('course') as CourseId]?.find((x) => x.id === str('id'));
      const t = it ? it.title[lang] : '';
      return num('first') ? (he ? `למד סטנדרט ראשון${t ? `: ${t}` : ''}` : `learned a first standard${t ? `: ${t}` : ''}`) : he ? `למד סטנדרט${t ? `: ${t}` : ''}` : `learned a standard${t ? `: ${t}` : ''}`;
    }
    case 'streak':
      return he ? `${num('n')} ימים ברצף` : `${num('n')} days in a row`;
    case 'duet':
      return he ? `${num('n')} ימים ברצף זוגי` : `${num('n')}-day duet streak`;
    case 'quest':
      return he ? 'השלים משימה משותפת' : 'completed a friend quest';
    case 'unit':
      return he ? 'סיים יחידה' : 'finished a unit';
    case 'best':
      return he ? 'שבר שיא אישי' : 'set a personal best';
    default:
      return '';
  }
}

// ---------------------------------------------------------------- weekly friend quest

export type QuestMetric = 'minutes' | 'clean';
export const QUEST_TARGET: Record<QuestMetric, number> = { minutes: 60, clean: 150 };
/** Together toward the goal: 0..1, done when the two contributions reach the target. */
export function questProgress(mine: number, theirs: number, target: number): { total: number; ratio: number; done: boolean; mineShare: number } {
  const total = Math.max(0, mine) + Math.max(0, theirs);
  const t = Math.max(1, target);
  return { total, ratio: Math.min(1, total / t), done: total >= t, mineShare: Math.min(1, Math.max(0, mine) / t) };
}
