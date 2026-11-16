// The teacher loop (0.52, migration 20261125): assignments of any kind with strictness / target tempo / a note,
// submissions from students, the teacher's comments (grading inbox), and the parent digest link.
import { supabase } from './cloud';
import { isPhraseRef, LEGACY_REF_MAX, PHRASE_REF_MAX, refBytes } from '../engine/encore/assign';

export type AssignKind = 'lesson' | 'topic' | 'drill' | 'chart' | 'piece' | 'phrase';

/**
 * Encore v2 (SPEC-PHRASE-STUDIO §11): phrase assignments get their own kind, a 6000-char ref and the teacher's audio in
 * a private bucket once migration 20261203000000_toneturn_phrase_assign is applied (the owner dry-runs it first).
 * Until then a phrase travels as a 'piece' assignment whose ref is the phrase code (≤ 2000 chars, no audio), and the
 * client reads it back as kind 'phrase' — so the feature works on today's server.
 */
export const PHRASE_ASSIGN_SYNCED = true; // migration 20261203000000 applied by the owner 2026-11-16
/** The longest phrase code the server takes now. */
export const phraseRefLimit = () => (PHRASE_ASSIGN_SYNCED ? PHRASE_REF_MAX : LEGACY_REF_MAX);
/** The teacher's attached audio lives here (private; class members read it through signed URLs). */
export const ASSIGN_AUDIO_BUCKET = 'toneturn-assign-audio';
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
  // a phrase sent as a 'piece' (before the phrase migration) reads back as a phrase
  kind: a.kind === 'piece' && isPhraseRef(a.ref) ? 'phrase' : (a.kind ?? 'lesson'),
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

/** Tests and the dev mock (?mockteach / localStorage tt.mockTeacher = 1, dev builds only) answer the RPCs instead. */
type Backend = (fn: string, args: Record<string, unknown>) => Promise<unknown>;
let backend: Backend | null = null;
export function setTeacherBackend(b: Backend | null) {
  backend = b;
}
export const teacherMockOn = (): boolean => {
  if (!import.meta.env.DEV) return false;
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('tt.mockTeacher') === '1';
  } catch {
    return false;
  }
};
async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!backend && teacherMockOn()) backend = (await import('./teacherMock')).mockTeacherRpc;
  if (backend) return (await backend(fn, args)) as T;
  const sb = supabase();
  if (!sb) throw new Error('Cloud is not configured');
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export const assignItem = (p: { classId: string; kind: AssignKind; lessonId?: string | null; ref?: string | null; dueOn: string | null; strictness: Strictness; targetBpm?: number | null; note?: string | null }) => {
  if (p.kind === 'phrase' && (!p.ref || refBytes(p.ref) > phraseRefLimit())) return Promise.reject(new Error('phrase too long'));
  return rpc<string>('toneturn_class_assign_item', {
    p_class: p.classId,
    p_kind: p.kind === 'phrase' && !PHRASE_ASSIGN_SYNCED ? 'piece' : p.kind,
    p_lesson: p.lessonId ?? null,
    p_ref: p.ref ?? null,
    p_due: p.dueOn,
    p_strict: p.strictness,
    p_bpm: p.targetBpm ?? null,
    p_note: p.note ?? null,
  });
};
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

/** Upload the teacher's recording of a phrase (only once the phrase migration's bucket exists). Returns its path. */
export async function uploadAssignAudio(classId: string, blob: Blob): Promise<string | null> {
  if (!PHRASE_ASSIGN_SYNCED || blob.size > 300_000) return null;
  const sb = supabase();
  if (!sb) return null;
  const ext = /mp4|aac|m4a/.test(blob.type) ? 'm4a' : /ogg/.test(blob.type) ? 'ogg' : 'webm';
  const path = `${classId}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await sb.storage.from(ASSIGN_AUDIO_BUCKET).upload(path, blob, { contentType: blob.type || 'audio/webm', upsert: false });
  return error ? null : path;
}
/** A short-lived link to the teacher's recording (null without the bucket or access). */
export async function assignAudioUrl(path: string): Promise<string | null> {
  if (!PHRASE_ASSIGN_SYNCED) return null;
  const sb = supabase();
  if (!sb) return null;
  const { data } = await sb.storage.from(ASSIGN_AUDIO_BUCKET).createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}
