// The social push budget (SPEC-SOCIAL §8, SOCIAL_REVIEW B): at most ONE social push a day per player, merged
// ("CodaFox42 and 2 friends nudged you · 3 friends cheered you"), never in quiet hours (default 22:00–08:00 local),
// never for cheers alone. Pure and dependency-free: the edge function (Deno) imports it, the unit tests (vitest) too.

export interface SocialItem {
  id: number;
  kind: 'nudge' | 'cheer' | 'friend_req' | 'duel_new' | 'duel_done' | 'quest' | string;
  data?: { from?: string; mine?: number; theirs?: number } | null;
  /** ISO time it was queued. */
  at: string;
}

export interface PlanInput {
  items: SocialItem[];
  now: Date;
  tz: string;
  lang: 'en' | 'he';
  quietFrom?: number | null;
  quietTo?: number | null;
  /** The player's local day (YYYY-MM-DD) of the last social push, if any. */
  lastDay?: string | null;
  /** Items gather this long before the push goes out, so a burst becomes one message (minutes). */
  collectMinutes?: number;
}

export type Plan =
  | { send: false; reason: 'empty' | 'budget' | 'quiet' | 'cheers-only' | 'collecting' }
  | { send: true; day: string; ids: number[]; title: string; body: string };

export const DEFAULT_QUIET = { from: 22, to: 8 };

/** The local calendar day and hour in a time zone (falls back to UTC for an unknown zone). */
export function localClock(now: Date, tz: string): { day: string; hour: number } {
  const fmt = (zone: string) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = fmt(tz || 'UTC');
  } catch {
    parts = fmt('UTC');
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return { day: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) % 24 };
}

/** Is this hour inside quiet hours [from, to)? Wraps past midnight (22 → 8); from = to means no quiet hours. */
export function inQuietHours(hour: number, from: number = DEFAULT_QUIET.from, to: number = DEFAULT_QUIET.to): boolean {
  if (from === to) return false;
  return from < to ? hour >= from && hour < to : hour >= from || hour < to;
}

const distinct = (xs: string[]) => [...new Set(xs.filter(Boolean))];

/** "A", "A and B", "A and 2 friends" (he: "A", "A ו־B", "A ועוד 2 חברים"). */
export function whoText(names: string[], lang: 'en' | 'he', count?: number): string {
  const ns = distinct(names);
  const n = Math.max(count ?? 0, ns.length);
  const first = ns[0] ?? (lang === 'he' ? 'חבר' : 'A friend');
  if (n <= 1) return first;
  if (n === 2 && ns.length >= 2) return lang === 'he' ? `${ns[0]} ו־${ns[1]}` : `${ns[0]} and ${ns[1]}`;
  return lang === 'he' ? `${first} ועוד ${n - 1} חברים` : `${first} and ${n - 1} friends`;
}

/** One merged message for the items (most actionable first: duels, nudges, requests, quests, then cheers). */
export function socialMessage(items: SocialItem[], lang: 'en' | 'he'): { title: string; body: string } {
  const he = lang === 'he';
  const from = (k: string) => items.filter((i) => i.kind === k).map((i) => i.data?.from ?? '');
  const count = (k: string) => items.filter((i) => i.kind === k).length;
  const parts: string[] = [];
  const duelNew = from('duel_new');
  if (duelNew.length) parts.push(he ? `הזמנה לדו־קרב מ־${whoText(duelNew, lang)}` : `${whoText(duelNew, lang)} challenged you to a duel`);
  const done = count('duel_done');
  if (done) parts.push(he ? (done === 1 ? 'תוצאת דו־קרב מחכה לכם' : `${done} תוצאות דו־קרב מחכות לכם`) : done === 1 ? 'A duel result is in' : `${done} duel results are in`);
  const nudges = from('nudge');
  if (nudges.length) parts.push(he ? `תזכורת להתאמן מ־${whoText(nudges, lang)}` : `${whoText(nudges, lang)} nudged you`);
  const reqs = from('friend_req');
  if (reqs.length) parts.push(he ? `בקשת חברות מ־${whoText(reqs, lang)}` : `Friend request from ${whoText(reqs, lang)}`);
  const quests = from('quest');
  if (quests.length) parts.push(he ? `הזמנה למשימה משותפת מ־${whoText(quests, lang)}` : `${whoText(quests, lang)} invited you to a friend quest`);
  const cheers = distinct(from('cheer'));
  if (cheers.length)
    parts.push(cheers.length === 1 ? (he ? `מחיאות כפיים מ־${cheers[0]}` : `${cheers[0]} cheered you`) : he ? `${cheers.length} חברים מחאו לכם כפיים` : `${cheers.length} friends cheered you`);
  if (!parts.length) return { title: he ? 'החוש השביעי' : 'The 7th Sense', body: he ? 'יש חדש אצל החברים' : 'News from your friends' };
  return { title: parts[0], body: parts.slice(1).join(' · ') || (he ? 'פתחו את האפליקציה כדי לראות' : 'Open the app to see') };
}

/** Decide whether a player's pending social items go out now as one push. */
export function planSocialPush(o: PlanInput): Plan {
  if (!o.items.length) return { send: false, reason: 'empty' };
  const { day, hour } = localClock(o.now, o.tz);
  if (o.lastDay && o.lastDay >= day) return { send: false, reason: 'budget' };
  if (inQuietHours(hour, o.quietFrom ?? DEFAULT_QUIET.from, o.quietTo ?? DEFAULT_QUIET.to)) return { send: false, reason: 'quiet' };
  const actionable = o.items.filter((i) => i.kind !== 'cheer');
  if (!actionable.length) return { send: false, reason: 'cheers-only' };
  const oldest = Math.min(...actionable.map((i) => Date.parse(i.at)).filter((t) => Number.isFinite(t)));
  const wait = (o.collectMinutes ?? 30) * 60_000;
  if (Number.isFinite(oldest) && o.now.getTime() - oldest < wait) return { send: false, reason: 'collecting' };
  const m = socialMessage(o.items, o.lang);
  return { send: true, day, ids: o.items.map((i) => i.id), title: m.title, body: m.body };
}
