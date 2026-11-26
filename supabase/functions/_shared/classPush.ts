// Class notifications (docs/SPEC-CLASS-NOTIFICATIONS.he.md v2, phase 1): what goes out and when, for one user.
// Teacher-initiated events reach the student at once (merged: a burst becomes one push); a teacher gets one daily
// digest of submissions at their hour. The push text comes ONLY from fixed strings (the kind of assignment, the key,
// the minutes, the due day) — never the teacher's own words (class name, note, comment). A user not known to be an
// adult gets no details. Pure and dependency-free: the edge function (Deno) imports it, the unit tests (vitest) too.

// (no imports: the app's typecheck reads this file too, and Deno needs ".ts" paths — the two clock helpers are
// copied from socialPush.ts)

/** The local calendar day and hour in a time zone (UTC for an unknown zone). */
function localClock(now: Date, tz: string): { day: string; hour: number } {
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
/** Inside quiet hours [from, to)? Wraps past midnight; from = to means none. */
function inQuietHours(hour: number, from: number, to: number): boolean {
  if (from === to) return false;
  return from < to ? hour >= from && hour < to : hour >= from || hour < to;
}

export type Lang = 'en' | 'he';

export interface ClassItem {
  id: number;
  role: 'student' | 'teacher';
  kind: 'assign' | 'feedback' | 'submission';
  /** Queued at / last updated at (ISO). */
  at: string;
  upd?: string | null;
  class: string;
  /** The assignment (teacher items: a student's work on one assignment counts once). */
  assignment?: string | null;
  /** The submitting student (teacher items). */
  student?: string | null;
  /** The assignment's kind and ref (drill refs carry the key and minutes: "drill:<level>@<key>/<minutes>"). */
  akind?: string | null;
  ref?: string | null;
  /** Due date (YYYY-MM-DD) and the minutes a day set with the assignment's options. */
  due?: string | null;
  minutes?: number | null;
  /** Teacher items: the submission still has no mark or comment. */
  ungraded?: boolean | null;
}

export interface ClassPlanInput {
  items: ClassItem[];
  now: Date;
  tz: string;
  lang: Lang;
  quietFrom?: number | null;
  quietTo?: number | null;
  birthYear?: number | null;
  /** privacy.notify (a switch set to false is off; absent = on). */
  notify?: Record<string, unknown> | null;
  /** The teacher's local digest hour (default 18). */
  digestHour?: number | null;
  /** Pushes already sent today, per role. */
  sent?: { student?: number; teacher?: number } | null;
}

export interface ClassPush {
  role: 'student' | 'teacher';
  ids: number[];
  title: string;
  body: string;
  /** Seconds the push service keeps it. */
  ttl: number;
  urgency: 'high' | 'normal';
  tag: string;
  url: string;
}

export interface ClassPlan {
  /** Ready to send (each claimed against its role's cap first). */
  pushes: ClassPush[];
  /** Items to mark sent without a push (their switch is off). */
  drop: { role: 'student' | 'teacher'; ids: number[] }[];
  /** The local day the counts belong to. */
  day: string;
}

/** A student gets at most this many class pushes a day (on top of the practice reminder); a teacher one digest. */
export const STUDENT_CAP = 3;
export const TEACHER_CAP = 1;
/** A burst is sent once its newest item is this old, or its oldest this old (minutes). */
export const SETTLE_MIN = 3;
export const MAX_WAIT_MIN = 10;
export const DEFAULT_DIGEST_HOUR = 18;
const H = 3600;

const on = (n: ClassPlanInput['notify'], k: string) => !n || n[k] !== false;

/** Known to be 18 or older (the youngest the year of birth allows); unknown = not an adult. */
export function knownAdult(birthYear: number | null | undefined, now: Date): boolean {
  return !!birthYear && now.getUTCFullYear() - birthYear - 1 >= 18;
}

const KEYS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const KIND: Record<string, { he: string; en: string }> = {
  drill: { he: 'תרגיל טכניקה', en: 'Technique exercise' },
  lesson: { he: 'שיעור', en: 'Lesson' },
  topic: { he: 'רמה בנושא', en: 'Topic level' },
  chart: { he: 'מהלך אקורדים', en: 'Chord chart' },
  piece: { he: 'יצירה', en: 'Piece' },
  phrase: { he: 'משפט לנגן', en: 'Phrase' },
  focus: { he: 'הצעה למיקוד סגנון', en: 'Style focus suggestion' },
};
const kindName = (k: string | null | undefined, lang: Lang) => (KIND[k ?? ''] ?? KIND.lesson)[lang];

/** The key and minutes a drill ref names ("drill:<level>@<key>/<minutes>"). */
export function refParts(ref: string | null | undefined): { key: number | null; minutes: number | null } {
  const m = /@(\d{1,2})(?:\/(\d{1,3}))?$/.exec(ref ?? '') ?? /\/(\d{1,3})$/.exec(ref ?? '');
  if (!m) return { key: null, minutes: null };
  if (m.length === 3) {
    const k = Number(m[1]);
    return { key: k >= 0 && k < 12 ? k : null, minutes: m[2] ? Number(m[2]) : null };
  }
  return { key: null, minutes: Number(m[1]) };
}

const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86400000);

/** "until tomorrow" / "עד מחר", relative to the student's local day; past or absent → null. */
export function dueText(due: string | null | undefined, today: string, lang: Lang): string | null {
  if (!due) return null;
  const d = dayDiff(due, today);
  if (d < 0) return null;
  if (d === 0) return lang === 'he' ? 'עד היום' : 'due today';
  if (d === 1) return lang === 'he' ? 'עד מחר' : 'due tomorrow';
  const [, mo, da] = due.split('-').map(Number);
  return lang === 'he' ? `עד ${da}.${mo}` : `due ${mo}/${da}`;
}

/** One assignment's line: "Technique exercise · in G · 10 min · due tomorrow". */
export function itemLine(it: Pick<ClassItem, 'akind' | 'ref' | 'due' | 'minutes'>, today: string, lang: Lang, withDue = true): string {
  const { key, minutes } = it.akind === 'drill' ? refParts(it.ref) : { key: null, minutes: null };
  const min = minutes ?? it.minutes ?? null;
  const parts = [kindName(it.akind, lang)];
  if (key !== null) parts.push(lang === 'he' ? `בסולם ${KEYS[key]}` : `in ${KEYS[key]}`);
  if (min) parts.push(lang === 'he' ? `${min} דק׳` : `${min} min`);
  const d = withDue ? dueText(it.due, today, lang) : null;
  if (d) parts.push(d);
  return parts.join(' · ');
}

/** Seconds until the end of the due day in the student's zone (approximate: the due date's 23:59 UTC ± zone). */
function ttlUntilDue(due: string | null | undefined, today: string, nowHour: number): number {
  if (!due) return 7 * 24 * H;
  const d = dayDiff(due, today);
  if (d < 0) return 7 * 24 * H;
  return Math.max(H, Math.min(7 * 24 * H, (d * 24 + (24 - nowHour)) * H));
}

const GENERIC = { he: { title: 'יש עדכון מהמורה', body: 'לחיצה פותחת את הכיתה' }, en: { title: 'An update from your teacher', body: 'Tap to open your class' } };

export function studentMessage(items: ClassItem[], today: string, lang: Lang, adult: boolean): { title: string; body: string } {
  const he = lang === 'he';
  if (!adult) return GENERIC[lang];
  const assigns = items.filter((i) => i.kind === 'assign');
  const fbs = items.filter((i) => i.kind === 'feedback');
  if (assigns.length && fbs.length)
    return he
      ? { title: 'עדכונים מהמורה', body: `${assigns.length === 1 ? 'משימה חדשה' : `${assigns.length} משימות חדשות`} · ${fbs.length === 1 ? 'תגובה על הגשה' : `תגובות על ${fbs.length} הגשות`}` }
      : { title: 'Updates from your teacher', body: `${assigns.length === 1 ? 'A new assignment' : `${assigns.length} new assignments`} · ${fbs.length === 1 ? 'feedback on a submission' : `feedback on ${fbs.length} submissions`}` };
  if (assigns.length === 1) return { title: he ? 'משימה חדשה מהמורה' : 'A new assignment from your teacher', body: itemLine(assigns[0], today, lang) };
  if (assigns.length > 1) {
    const soonest = assigns.map((a) => a.due).filter((d): d is string => !!d && dayDiff(d, today) >= 0).sort()[0];
    const d = dueText(soonest, today, lang);
    return he
      ? { title: `${assigns.length} משימות חדשות מהמורה`, body: d ? `הקרובה: ${d}` : 'לחיצה פותחת את הכיתה' }
      : { title: `${assigns.length} new assignments from your teacher`, body: d ? `The first is ${d}` : 'Tap to open your class' };
  }
  if (fbs.length === 1) return { title: he ? 'המורה הגיב על ההגשה שלך' : 'Your teacher replied to your submission', body: itemLine(fbs[0], today, lang, false) };
  return he ? { title: `המורה הגיב על ${fbs.length} הגשות`, body: 'לחיצה פותחת את הכיתה' } : { title: `Your teacher replied to ${fbs.length} submissions`, body: 'Tap to open your class' };
}

export function teacherMessage(items: ClassItem[], lang: Lang): { title: string; body: string } {
  // a student's repeated takes of one assignment count once (the newest decides "to review")
  const work = new Map<string, ClassItem>();
  for (const i of items) work.set(`${i.student ?? `#${i.id}`}|${i.assignment ?? `#${i.id}`}`, i);
  const n = work.size;
  const students = new Set(items.map((i) => i.student ?? `#${i.id}`)).size;
  const open = [...work.values()].filter((i) => i.ungraded).length;
  if (lang === 'he') {
    const subs = n === 1 ? 'הגשה אחת' : `${n} הגשות`;
    const from = students === 1 ? 'מתלמיד אחד' : `מ־${students} תלמידים`;
    const wait = open === 0 ? 'כולן נבדקו' : open === 1 ? 'אחת מחכה לבדיקה' : `${open} מחכות לבדיקה`;
    return { title: 'הגשות חדשות בכיתה', body: `${subs} ${from} · ${wait}` };
  }
  const subs = n === 1 ? '1 submission' : `${n} submissions`;
  const from = students === 1 ? 'from 1 student' : `from ${students} students`;
  const wait = open === 0 ? 'all reviewed' : `${open} to review`;
  return { title: 'New submissions in your class', body: `${subs} ${from} · ${wait}` };
}

export function planClassPush(inp: ClassPlanInput): ClassPlan {
  const { day, hour } = localClock(inp.now, inp.tz);
  const out: ClassPlan = { pushes: [], drop: [], day };
  const quiet = inQuietHours(hour, inp.quietFrom ?? 22, inp.quietTo ?? 8);
  const age = (iso: string | null | undefined) => (inp.now.getTime() - Date.parse(iso ?? '')) / 60000;

  // the student's side: new assignments and the teacher's replies, one merged push once the burst settles
  const stu = inp.items.filter((i) => i.role === 'student');
  const off = stu.filter((i) => (i.kind === 'assign' && !on(inp.notify, 'classNew')) || (i.kind === 'feedback' && !on(inp.notify, 'classFeedback')));
  if (off.length) out.drop.push({ role: 'student', ids: off.map((i) => i.id) });
  const live = stu.filter((i) => !off.includes(i));
  if (live.length && !quiet && (inp.sent?.student ?? 0) < STUDENT_CAP) {
    const newest = Math.min(...live.map((i) => age(i.upd ?? i.at)));
    const oldest = Math.max(...live.map((i) => age(i.at)));
    if (newest >= SETTLE_MIN || oldest >= MAX_WAIT_MIN) {
      const m = studentMessage(live, day, inp.lang, knownAdult(inp.birthYear, inp.now));
      const assigns = live.filter((i) => i.kind === 'assign');
      const ttl = assigns.length ? Math.min(...assigns.map((a) => ttlUntilDue(a.due, day, hour))) : 3 * 24 * H;
      out.pushes.push({ role: 'student', ids: live.map((i) => i.id), ...m, ttl, urgency: 'high', tag: 'class', url: '/#/classes' });
    }
  }

  // the teacher's side: one digest a day at their hour (their own choice of hour: sent even inside quiet hours)
  const tea = inp.items.filter((i) => i.role === 'teacher');
  if (tea.length && !on(inp.notify, 'classDigest')) out.drop.push({ role: 'teacher', ids: tea.map((i) => i.id) });
  else if (tea.length && hour === (inp.digestHour ?? DEFAULT_DIGEST_HOUR) && (inp.sent?.teacher ?? 0) < TEACHER_CAP) {
    out.pushes.push({ role: 'teacher', ids: tea.map((i) => i.id), ...teacherMessage(tea, inp.lang), ttl: 24 * H, urgency: 'normal', tag: 'class-digest', url: '/#/classes' });
  }
  return out;
}

export interface DueItem {
  assignment: string;
  akind?: string | null;
  ref?: string | null;
  due?: string | null;
  minutes?: number | null;
}

/** A2: tomorrow's assignments without a submission, at the student's reminder hour (merged with the practice
 *  reminder when that one goes out in the same run: `streak` = its streak count). Null = nothing to send. */
export function planDueReminder(inp: { items: DueItem[]; now: Date; lang: Lang; birthYear?: number | null; notify?: Record<string, unknown> | null; sent?: { student?: number } | null; today: string; streak?: number | null }): { title: string; body: string; assignments: string[] } | null {
  if (!inp.items.length || !on(inp.notify, 'classDue') || (inp.sent?.student ?? 0) >= STUDENT_CAP) return null;
  const he = inp.lang === 'he';
  const n = inp.items.length;
  const adult = knownAdult(inp.birthYear, inp.now);
  const title = he ? (n === 1 ? 'משימה מהמורה עד מחר' : `${n} משימות מהמורה עד מחר`) : n === 1 ? 'An assignment from your teacher is due tomorrow' : `${n} assignments from your teacher are due tomorrow`;
  let body = adult && n === 1 ? itemLine(inp.items[0], inp.today, inp.lang, false) : he ? 'לחיצה פותחת את הכיתה' : 'Tap to open your class';
  if (typeof inp.streak === 'number' && inp.streak > 0) body = he ? `${body}. גם התוכנית של היום מחכה (${inp.streak} ימי אימון ברצף).` : `${body}. Today's plan is waiting too (${inp.streak} practice days in a row).`;
  return { title, body, assignments: inp.items.map((i) => i.assignment) };
}
