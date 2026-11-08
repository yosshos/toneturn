// The teacher loop (0.52, migration 20261125): assignments of any kind with strictness / target tempo / a note,
// submissions from students, the teacher's comments (grading inbox), and the parent digest link.
import { supabase } from './cloud';

export type AssignKind = 'lesson' | 'topic' | 'drill' | 'chart' | 'piece';
export type Strictness = 'lenient' | 'moderate' | 'strict';
export type Mark = 'great' | 'good' | 'again';

export interface Submission {
  id: string;
  userId?: string;
  name?: string;
  createdAt: string;
  score: number | null;
  minutes?: number;
  metrics?: Record<string, unknown>;
  comment: string | null;
  mark: Mark | null;
}
export interface AssignItem {
  id: string;
  kind: AssignKind;
  lessonId: string;
  ref: string | null;
  dueOn: string | null;
  strictness: Strictness;
  targetBpm: number | null;
  note: string | null;
  createdAt: string;
  className?: string;
  submissions: Submission[];
}
export interface ClassDetail {
  assignments: AssignItem[];
  /** Minutes sent with submissions in the last 7 days, per student id. */
  minutes: Record<string, number>;
}
export interface Digest {
  name: string;
  streak: number;
  sessions: number;
  xp: number;
  days: number;
  minutes: number;
  mastered: string[];
  comments: { at: string; comment: string; mark: Mark | null }[];
}

type RawSub = { id: string; user_id?: string; name?: string; created_at: string; score: number | null; minutes?: number; metrics?: Record<string, unknown>; comment: string | null; mark: Mark | null };
type RawItem = { id: string; kind: AssignKind; lesson_id: string; ref: string | null; due_on: string | null; strictness: Strictness; target_bpm: number | null; note: string | null; created_at: string; class?: string; submissions: RawSub[] };

const sub = (s: RawSub): Submission => ({ id: s.id, userId: s.user_id, name: s.name, createdAt: s.created_at, score: s.score, minutes: s.minutes, metrics: s.metrics, comment: s.comment, mark: s.mark });
export const itemFromRaw = (a: RawItem): AssignItem => ({
  id: a.id,
  kind: a.kind ?? 'lesson',
  lessonId: a.lesson_id,
  ref: a.ref ?? null,
  dueOn: a.due_on,
  strictness: a.strictness ?? 'moderate',
  targetBpm: a.target_bpm ?? null,
  note: a.note ?? null,
  createdAt: a.created_at,
  ...(a.class ? { className: a.class } : {}),
  submissions: (a.submissions ?? []).map(sub),
});

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const sb = supabase();
  if (!sb) throw new Error('Cloud is not configured');
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export const assignItem = (p: { classId: string; kind: AssignKind; lessonId?: string | null; ref?: string | null; dueOn: string | null; strictness: Strictness; targetBpm?: number | null; note?: string | null }) =>
  rpc<string>('toneturn_class_assign_item', {
    p_class: p.classId,
    p_kind: p.kind,
    p_lesson: p.lessonId ?? null,
    p_ref: p.ref ?? null,
    p_due: p.dueOn,
    p_strict: p.strictness,
    p_bpm: p.targetBpm ?? null,
    p_note: p.note ?? null,
  });
export const submitResult = (assignmentId: string, score: number, minutes: number, metrics: Record<string, unknown> = {}) =>
  rpc<string>('toneturn_class_submit', { p_assignment: assignmentId, p_score: Math.max(0, Math.min(1, score)), p_minutes: Math.max(0, Math.min(600, Math.round(minutes))), p_metrics: metrics });
export const commentOn = (submissionId: string, comment: string, mark: Mark | null) => rpc<void>('toneturn_class_comment', { p_submission: submissionId, p_comment: comment, p_mark: mark });
export async function classDetail(classId: string): Promise<ClassDetail> {
  const r = await rpc<{ assignments: RawItem[]; minutes: Record<string, number> }>('toneturn_class_detail', { p_class: classId });
  return { assignments: (r.assignments ?? []).map(itemFromRaw), minutes: r.minutes ?? {} };
}
export async function myAssignments(): Promise<AssignItem[]> {
  return ((await rpc<RawItem[]>('toneturn_my_assignments')) ?? []).map(itemFromRaw);
}
export const createDigestLink = () => rpc<string>('toneturn_digest_link_create');
export const revokeDigestLink = () => rpc<void>('toneturn_digest_link_revoke');
export async function readDigest(token: string): Promise<Digest | null> {
  return (await rpc<Digest | null>('toneturn_digest', { p_token: token })) ?? null;
}

/** The grading inbox: every submission still without a comment, newest first, with its assignment. */
export function inboxOf(d: ClassDetail): { a: AssignItem; s: Submission }[] {
  return d.assignments
    .flatMap((a) => a.submissions.filter((s) => !s.comment && !s.mark).map((s) => ({ a, s })))
    .sort((x, y) => y.s.createdAt.localeCompare(x.s.createdAt));
}

/** Pass mark for a submission by the assignment's strictness. */
export const PASS: Record<Strictness, number> = { lenient: 0.6, moderate: 0.75, strict: 0.9 };
export const passed = (a: AssignItem, s: Submission) => s.score !== null && s.score >= PASS[a.strictness];

/** Refs: a topic level is "topic:<id>:<level>"; a chart drill is its drill kind ("chart~…"); a drill its spec key. */
export function parseTopicRef(ref: string | null): { id: string; level: number } | null {
  const m = /^topic:([a-z0-9-]+):(\d+)$/.exec(ref ?? '');
  return m ? { id: m[1], level: Number(m[2]) } : null;
}
