// Which Insights cards belong to which course (GUITAR_AUDIT P2: the Ear index and the Confusion map are ear-and-theory
// cards and used to show in the guitar course too). Each card shows only in the courses whose domains it measures.
import type { CourseId } from '../courses';

export type InsightCard = 'ear-index' | 'technique' | 'hand-map' | 'key-map' | 'groove' | 'confusions' | 'trouble-bars';

const CARDS: Record<InsightCard, readonly CourseId[]> = {
  // Built from the ear ratings (intervals, chords, progressions …).
  'ear-index': ['ear', 'jazz'],
  // Technique findings and the key map come from measured drills on an instrument.
  technique: ['keys', 'guitar', 'bass', 'drums'],
  // Per-finger loudness of both hands: a keyboard measure.
  'hand-map': ['keys'],
  'key-map': ['keys', 'guitar', 'bass'],
  // Timing against the beat: every course that plays or taps in time.
  groove: ['ear', 'jazz', 'keys', 'guitar', 'bass', 'drums'],
  // Which answers get mixed up: the ear questions (the voice course asks them too).
  confusions: ['ear', 'jazz', 'voice'],
  // Pieces in the piece coach.
  'trouble-bars': ['keys', 'guitar', 'bass', 'voice', 'drums'],
};

/** Whether an Insights card shows in a course. */
export const showsInsight = (card: InsightCard, course: CourseId): boolean => CARDS[card].includes(course);

/** The cards of a course, in screen order. */
export const insightCardsFor = (course: CourseId): InsightCard[] => (Object.keys(CARDS) as InsightCard[]).filter((c) => showsInsight(c, course));
