// Whole-session recording (SPEC-PHRASE-STUDIO §6.1, owner decision §20.11): an opt-in switch per practice session that
// records one continuous audio file alongside the takes — what the app plays (your MIDI playing through the app's
// instruments, the band, the click) plus your microphone whenever a capture is listening (its own stream, never a
// second getUserMedia — iOS refuses that). The file is kept on its practice session, with a mark where each take
// starts, inside the audio budget; it stops by itself after 90 minutes or 20 minutes without a take, and keeps what
// it has when the app goes to the background (never lose progress).

import { addCaptureTap } from '../speech/captureTap';
import { getTake, lastSavedTakeId, subscribeRecordings, AUDIO_BPS, SESSION_GAP_MS } from './recordings';
import { putSessionAudio, refreshReserve } from './recExtras';

// ───────────────────────────── bookkeeping (pure) ─────────────────────────────

export const SESSION_REC_MAX_MS = 90 * 60_000;
export interface SessionRecBook {
  startedAt: number;
  /** Where each take starts in the file (ms from the start), in order, no repeats. */
  marks: { takeId: string; at: number }[];
  lastActivity: number;
  /** The session the takes joined (the file is kept on it). */
  sessionId: string | null;
}
export const startBook = (now: number): SessionRecBook => ({ startedAt: now, marks: [], lastActivity: now, sessionId: null });
export function markTake(b: SessionRecBook, takeId: string, now: number, sessionId?: string | null): SessionRecBook {
  if (b.marks.some((m) => m.takeId === takeId)) return b;
  return { ...b, marks: [...b.marks, { takeId, at: Math.max(0, now - b.startedAt) }], lastActivity: now, sessionId: b.sessionId ?? sessionId ?? null };
}
/** Why it should stop now (null = keep going). */
export function shouldStop(b: SessionRecBook, now: number): 'max' | 'idle' | null {
  if (now - b.startedAt >= SESSION_REC_MAX_MS) return 'max';
  if (now - b.lastActivity >= SESSION_GAP_MS) return 'idle';
  return null;
}
/** Expected size of a recording (bytes) at the recorder's bit rate. */
export const sessionBytes = (ms: number, bps = AUDIO_BPS) => Math.round((ms / 1000) * (bps / 8));
/** The take a moment of the file belongs to (the last mark at or before it). */
export function takeAt(b: Pick<SessionRecBook, 'marks'>, ms: number): string | null {
  let out: string | null = null;
  for (const m of b.marks) if (m.at <= ms) out = m.takeId;
  return out;
}

// ───────────────────────────── the recorder ─────────────────────────────

interface Live {
  book: SessionRecBook;
  rec: MediaRecorder;
  chunks: Blob[];
  dest: MediaStreamAudioDestinationNode;
  detach: () => void;
}
let live: Live | null = null;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((f) => f());
export const sessionRecOn = () => !!live;
export const sessionRecBook = () => live?.book ?? null;
export function subscribeSessionRec(cb: () => void): () => void {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}
export const sessionRecSupported = () => typeof MediaRecorder !== 'undefined' && typeof AudioContext !== 'undefined';

/** Start (from a tap: the audio context may need unlocking). `out` = the app's audio graph (piano.voiceOut()). */
export async function startSessionRec(out: () => { ctx: AudioContext; out: AudioNode } | null): Promise<boolean> {
  if (live || !sessionRecSupported()) return !!live;
  const g = out();
  if (!g) return false;
  try {
    const dest = g.ctx.createMediaStreamDestination();
    g.out.connect(dest);
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(dest.stream, { audioBitsPerSecond: AUDIO_BPS });
    } catch {
      rec = new MediaRecorder(dest.stream);
    }
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.start(2000);
    const now = Date.now();
    // the microphone of every capture while it listens
    const untap = addCaptureTap({
      audio: false,
      onSegment: (seg) => {
        if (!seg.stream) return;
        try {
          const src = g.ctx.createMediaStreamSource(seg.stream);
          src.connect(dest);
          void seg.done.then(() => src.disconnect());
        } catch {
          /* a stream from another context: skipped */
        }
      },
    });
    // a mark for every take kept while recording
    const unsub = subscribeRecordings(() => {
      const id = lastSavedTakeId();
      if (!live || !id || live.book.marks.some((m) => m.takeId === id)) return;
      void getTake(id).then((t) => {
        if (live) live.book = markTake(live.book, id, Date.now(), t?.sessionId);
        changed();
      });
    });
    const timer = window.setInterval(() => {
      if (live && shouldStop(live.book, Date.now())) void stopSessionRec();
    }, 30_000);
    const onHide = () => {
      if (document.visibilityState === 'hidden') void checkpoint();
    };
    document.addEventListener('visibilitychange', onHide);
    live = {
      book: startBook(now),
      rec,
      chunks,
      dest,
      detach: () => {
        untap();
        unsub();
        window.clearInterval(timer);
        document.removeEventListener('visibilitychange', onHide);
        try {
          g.out.disconnect(dest);
        } catch {
          /* already */
        }
      },
    };
    void refreshReserve();
    changed();
    return true;
  } catch {
    return false;
  }
}

/** Keep what is recorded so far (backgrounded): the file is replaced by the longer one at the end. */
async function checkpoint(): Promise<void> {
  const l = live;
  if (!l || !l.chunks.length) return;
  try {
    l.rec.requestData();
  } catch {
    /* inactive */
  }
  await new Promise((r) => setTimeout(r, 300));
  const blob = new Blob(l.chunks, { type: l.chunks[0].type || l.rec.mimeType || 'audio/webm' });
  const id = await putSessionAudio(blob, { startedAt: new Date(l.book.startedAt).toISOString(), endedAt: new Date().toISOString(), marks: l.book.marks }, l.book.sessionId);
  if (id && live === l) l.book = { ...l.book, sessionId: id };
}

/** Stop and keep the file on its session. Returns the session id (null when nothing was kept). */
export async function stopSessionRec(): Promise<string | null> {
  const l = live;
  if (!l) return null;
  live = null;
  l.detach();
  const blob = await new Promise<Blob | null>((res) => {
    l.rec.onstop = () => res(l.chunks.length ? new Blob(l.chunks, { type: l.chunks[0].type || l.rec.mimeType || 'audio/webm' }) : null);
    try {
      l.rec.stop();
    } catch {
      res(null);
    }
  });
  changed();
  if (!blob || blob.size < 2000) return null;
  return putSessionAudio(blob, { startedAt: new Date(l.book.startedAt).toISOString(), endedAt: new Date().toISOString(), marks: l.book.marks }, l.book.sessionId);
}
