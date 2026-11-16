// How Encore connects (SPEC-PHRASE-STUDIO §9, §10.5–10.7): what a measured take earns (XP with the daily cap, promotion
// bonuses, the anti-gaming factor), the rating event with tags, the spaced review, and the phrases Today and the workout
// pick. Only measured takes count; trimming, editing and listening earn nothing. Pure.

import type { ItemState, TakeMetrics } from '../drills/types';
import type { RatingEvent } from '../rating';
import { bookAfterTake, dueLicks, type Lick, type LickBook, type LickInstrument } from '../licks';
import { capXp, completionBonus, dailyCap, keyBonus, novelty, phraseDifficulty, takeXp, type Stage } from './difficulty';
import { finalHand, isPhrase, keyPassed, nextKey, passedKeys, phraseItemId, phraseRank, planOf, type Hand } from './phrase';

const mod = (n: number) => ((n % 12) + 12) % 12;
const dayOf = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** The player's phrases (v3) from the lick book, newest first. */
export const phrasesOf = (book: LickBook | undefined): Lick[] => (book?.own ?? []).filter(isPhrase).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));

/** XP earned today per phrase (a family — a phrase and its edits — shares one cap). */
export function earnedToday(book: LickBook | undefined, id: string, now: string): number {
  const x = book?.phraseXp;
  return x && x.day === dayOf(now) ? (x.by[id] ?? 0) : 0;
}
/** The cap family of a phrase: its parent's id when it was made from another phrase. */
export const capId = (l: Lick): string => l.parent ?? l.id;

export interface TakeOutcome {
  xp: number;
  /** XP before the cap. */
  raw: number;
  bonus: number;
  completion: number;
  events: RatingEvent[];
  /** The book after the take (daily XP, review, rank cache). */
  book: LickBook;
  /** The rank before / after (a promotion moment when it rose). */
  rankBefore: number;
  rankAfter: number;
  /** The key was newly passed at the target with this take. */
  newlyPassed: boolean;
  /** All 12 keys passed with this take: the "yours" moment. */
  yours: boolean;
}

/**
 * Everything one measured take of (phrase, key, hand) earns. `before` / `after` are the drill items before and after
 * the ladder applied the take (applyTake, or the stage counter for free / quarters takes).
 */
export function phraseTake(o: {
  l: Lick;
  key: number;
  hand?: Hand;
  inst?: LickInstrument;
  stage: Stage;
  m: Pick<TakeMetrics, 'verdict' | 'accuracy'>;
  bpm: number;
  before: Record<string, ItemState>;
  after: Record<string, ItemState>;
  book: LickBook | undefined;
  now: string;
  sessionId: string;
  index: number;
}): TakeOutcome {
  const inst = o.inst ?? 'piano';
  const hand = o.hand ?? finalHand(o.l);
  const fh = finalHand(o.l);
  const k = mod(o.key);
  const d = phraseDifficulty(o.l, k, o.stage === 'tempo' ? o.bpm : null, hand, inst);
  const wasPassed = keyPassed(o.l, o.before, k, inst, hand);
  const others = phrasesOf(o.book).map((x) => ({ l: x, passed: passedKeys(x, o.before, inst) }));
  const nov = novelty(o.l, k, others, d.f.trivial);
  const raw = takeXp({ d, stage: o.stage, verdict: o.m.verdict, keyPassed: wasPassed, novelty: nov });
  // promotion bonuses: a key newly passed at the target (the final hand), and all 12
  const nowPassed = keyPassed(o.l, o.after, k, inst, hand);
  const newlyPassed = !wasPassed && nowPassed && hand === fh;
  const passedAfter = passedKeys(o.l, o.after, inst, fh);
  const d0 = phraseDifficulty(o.l, o.l.homeKey ?? 0, null, fh, inst).D0;
  const bonus = newlyPassed ? keyBonus(d0, passedAfter.length) : 0;
  const yours = newlyPassed && passedAfter.length === 12;
  const completion = yours ? completionBonus(d0) : 0;
  const cid = capId(o.l);
  const earned = earnedToday(o.book, cid, o.now);
  const capped = capXp(earned, raw + bonus, dailyCap(d0));
  const xp = capped + completion;
  // the book: today's XP, the review (a phrase joins it at mp — three keys at the target), the rank cache
  const rankBefore = phraseRank(o.l, o.before, o.book, inst);
  const rankAfter = phraseRank(o.l, o.after, o.book, inst);
  const today = dayOf(o.now);
  const px = o.book?.phraseXp?.day === today ? o.book.phraseXp : { day: today, by: {} as Record<string, number> };
  let book: LickBook = { ...(o.book ?? {}), phraseXp: { day: today, by: { ...px.by, [cid]: (px.by[cid] ?? 0) + capped } }, phraseRank: { ...(o.book?.phraseRank ?? {}), [o.l.id]: rankAfter } };
  const known = rankAfter >= 3;
  const isReview = !!o.book?.review?.[o.l.id] && dueLicks(o.book.review, o.now).includes(o.l.id) && o.stage === 'tempo' && o.bpm >= planOf(o.l).goalBpm * 0.95;
  if (known || isReview) {
    const mine = book.mine;
    book = bookAfterTake(book, o.l.id, known, isReview ? { pass: o.m.verdict === 'clean' } : null, o.now);
    // a phrase is not a library lick: keep "my licks" as it was
    book = { ...book, mine };
  }
  const events = o.stage === 'tempo' ? [phraseEvent(o.l, k, d.D, o.m, o.now, o.sessionId, o.index, inst)] : [];
  return { xp, raw, bonus, completion, events, book, rankBefore, rankAfter, newlyPassed, yours };
}

/**
 * The rating event of a take at tempo (§10.6): difficulty = D(key, bpm); tags — the instrument's technique, the keys
 * (transposing) for a key other than home, improvisation vocabulary when the phrase has chords; voice: singing. Own
 * material counts half: the tags' weights sum to 0.5 (rating.ts scales the update by Σw).
 */
export function phraseEvent(l: Lick, key: number, difficulty: number, m: Pick<TakeMetrics, 'verdict' | 'accuracy'>, at: string, sessionId: string, index: number, inst: LickInstrument = 'piano'): RatingEvent {
  const home = mod(key) === (l.homeKey ?? 0);
  const tech: NonNullable<RatingEvent['tags']>[number] = inst === 'voice' ? { skill: 'singing', sub: 'singing/line', w: 0.25 } : { skill: 'instrument', sub: `instrument/${inst}-tech`, w: 0.25 };
  const tags: NonNullable<RatingEvent['tags']> = [tech, { skill: 'timing', sub: 'timing/speed', w: 0.1 }];
  if (!home) tags.push({ skill: 'transpose', sub: 'transpose/keys', w: 0.1 });
  else tech.w += 0.1;
  if (l.chords.length || l.source?.kind === 'take' || l.source?.kind === 'record') tags.push({ skill: 'improv', sub: 'improv/vocabulary', w: 0.05 });
  else tech.w += 0.05;
  const raw = Math.max(0, Math.min(1, m.accuracy * (m.verdict === 'clean' ? 1 : m.verdict === 'almost' ? 0.85 : 0.6)));
  return { id: `g:phrase:${sessionId}:${index}`, skill: tech.skill, difficulty: Math.round(difficulty), correct: m.verdict === 'clean', score: Math.round(raw * 1000) / 1000, tags, at };
}

// ───────────────────────────── Today, the workout (§9) ─────────────────────────────

export interface DuePhrase {
  l: Lick;
  key: number;
  bpm: number;
  /** 'review' (spaced review due) or 'progress' (a key being learned). */
  why: 'review' | 'progress';
  minutes: number;
}
/** Phrases for Today / the workout: reviews due first, then the most recent phrase with a key in progress (`inToday` / `inWorkout`). */
export function duePhrases(book: LickBook | undefined, items: Record<string, ItemState>, where: 'today' | 'workout', now: string = new Date().toISOString(), inst: LickInstrument = 'piano', n = 3): DuePhrase[] {
  const all = phrasesOf(book).filter((l) => (where === 'today' ? planOf(l).inToday !== false : planOf(l).inWorkout !== false));
  const due = new Set(dueLicks(book?.review, now));
  const out: DuePhrase[] = [];
  for (const l of all) if (due.has(l.id)) out.push({ l, key: nextKey(l, items, inst), bpm: planOf(l).goalBpm, why: 'review', minutes: 2 });
  const recent = [...all].sort((a, b) => lastPlayed(b, items).localeCompare(lastPlayed(a, items)));
  for (const l of recent) {
    if (out.some((x) => x.l.id === l.id)) continue;
    const r = phraseRank(l, items, book, inst);
    if (r >= 5) continue;
    const key = nextKey(l, items, inst);
    const st = items[phraseItemId(l, inst, key, finalHand(l))];
    out.push({ l, key, bpm: st?.goalBpm ?? planOf(l).startBpm, why: 'progress', minutes: 3 });
  }
  return out.slice(0, n);
}
const lastPlayed = (l: Lick, items: Record<string, ItemState>) => {
  let last = l.createdAt ?? '';
  for (const [id, st] of Object.entries(items)) if (id.startsWith(`lick:${l.id}:`) && st.last > last) last = st.last;
  return last;
};
/** How many phrases are due for review today (the workout's review block and the Practice card's count). */
export const phrasesDueCount = (book: LickBook | undefined, now: string = new Date().toISOString()): number => {
  const ids = new Set(phrasesOf(book).map((l) => l.id));
  return dueLicks(book?.review, now).filter((id) => ids.has(id)).length;
};
