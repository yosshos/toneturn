// Path steps for content that had none (PIANO_JAZZ P2 wiring, 2026-11-11). Pure.
//
// - Repertoire steps ("rep:<course>:<item>"): a repertoire item at the end of a unit where its tier fits the unit. The
//   step opens the item's page; it is passed only by a measured result of the item (the "rep-<course>-<item>" lesson
//   result: ≥ 80 % = 3 stars, ≥ 60 % = 2, ≥ 30 % = 1) — never by rating evidence.
// - Bonus game steps ("bonus:<course>:<game>"): the eight advanced games as optional steps in the course they train,
//   once the unit is deep enough. They open at tier mp (the advanced games' first tier); 3 stars = the tier's rule met.
//   A bonus step never blocks a unit and never becomes the current step.
//
// Each step belongs to one course only (inCourse by domain / pack / instrument), so courses don't duplicate them.

import type { CourseId } from './courses';
import type { DomainId } from './rating';
import type { SkillId } from './lesson';
import type { PathFacts, PathStep } from './path';
import { REPERTOIRE, REP_LEARNED, REP_TOTAL, repLessonId, type RepTier } from './repertoire';

/** The eight advanced games and where each sits: course, area, skill / sub-skill, the depth it fits. */
export const BONUS_GAMES: { game: string; course: CourseId; domain: DomainId; skill: SkillId; sub: string; difficulty: number; title: { en: string; he: string } }[] = [
  { game: 'rush-scale', course: 'ear', domain: 'pitch', skill: 'modes', sub: 'modes/scales', difficulty: 1000, title: { en: 'Scale & Mode Rush', he: 'מרוץ סולמות ומודוסים' } },
  { game: 'transcribe', course: 'ear', domain: 'memory', skill: 'dictation', sub: 'dictation/melodic', difficulty: 1050, title: { en: 'Transcription Race', he: 'מרוץ התמלול' } },
  { game: 'rush-voicing', course: 'jazz', domain: 'pitch', skill: 'chords', sub: 'chords/voicing', difficulty: 1000, title: { en: 'Voicing Spy', he: 'מרגל הוויסינגים' } },
  { game: 'rush-standard', course: 'jazz', domain: 'pitch', skill: 'cadences', sub: 'cadences/standards', difficulty: 1050, title: { en: 'Name That Standard', he: 'זהו את הסטנדרט' } },
  { game: 'reharm', course: 'jazz', domain: 'pitch', skill: 'cadences', sub: 'cadences/reharm', difficulty: 1100, title: { en: 'Reharm Spotter', he: 'גלאי הרה־הרמוניזציה' } },
  { game: 'bhtime', course: 'keys', domain: 'instrument', skill: 'instrument', sub: 'instrument/piano-tech', difficulty: 1050, title: { en: 'Barry Harris in Time', he: 'בארי האריס בזמן' } },
  { game: 'polylock', course: 'keys', domain: 'instrument', skill: 'instrument', sub: 'instrument/piano-tech', difficulty: 1000, title: { en: 'Polyrhythm Lock', he: 'נעילת פולי־ריתם' } },
  { game: 'polylock', course: 'drums', domain: 'instrument', skill: 'instrument', sub: 'instrument/drum-tech', difficulty: 1000, title: { en: 'Polyrhythm Lock', he: 'נעילת פולי־ריתם' } },
  { game: 'riffecho', course: 'guitar', domain: 'instrument', skill: 'instrument', sub: 'instrument/guitar-tech', difficulty: 1050, title: { en: 'Odd-Meter Riff Echo', he: 'הד ריפים במשקל אי־זוגי' } },
  { game: 'riffecho', course: 'bass', domain: 'instrument', skill: 'instrument', sub: 'instrument/bass-tech', difficulty: 1050, title: { en: 'Odd-Meter Riff Echo', he: 'הד ריפים במשקל אי־זוגי' } },
];

const PLAYS: Partial<Record<CourseId, string[]>> = { keys: ['keys', 'piano'], guitar: ['guitar'], bass: ['bass'], drums: ['drums'] };

/** How a step of a course is placed in it (inCourse): the instrument, the jazz pack, singing. */
function courseShape(course: CourseId): Pick<PathStep, 'forPlays' | 'pack' | 'sung' | 'mic'> {
  if (PLAYS[course]) return { forPlays: PLAYS[course] };
  if (course === 'jazz') return { pack: 'jazz' };
  if (course === 'voice') return { sung: true, mic: true };
  return {};
}

export function bonusSteps(): PathStep[] {
  return BONUS_GAMES.map((g) => ({
    id: `bonus:${g.course}:${g.game}`,
    kind: 'game' as const,
    game: g.game,
    tier: 'mp' as const,
    bonus: true,
    skill: g.skill,
    sub: g.sub,
    domain: g.domain,
    difficulty: g.difficulty,
    choices: 0,
    ...courseShape(g.course),
    title: g.title,
  }));
}

/** A repertoire tier's place on the path: Foundations with the beginner units … Advanced with the advanced ones. */
export const REP_TIER_DIFF: Record<RepTier, number> = { 1: 820, 2: 980, 3: 1180, 4: 1380 };
const REP_AREA: Record<CourseId, Pick<PathStep, 'domain' | 'skill' | 'sub'>> = {
  ear: { domain: 'memory', skill: 'sequences', sub: 'sequences/melody' },
  jazz: { domain: 'creative', skill: 'improv', sub: 'improv/repertoire' },
  voice: { domain: 'voice', skill: 'singing', sub: 'singing/repertoire' },
  keys: { domain: 'instrument', skill: 'instrument', sub: 'instrument/piano-tech' },
  guitar: { domain: 'instrument', skill: 'instrument', sub: 'instrument/guitar-tech' },
  bass: { domain: 'instrument', skill: 'instrument', sub: 'instrument/bass-tech' },
  drums: { domain: 'instrument', skill: 'instrument', sub: 'instrument/drum-tech' },
};

export function repSteps(): PathStep[] {
  const out: PathStep[] = [];
  for (const [course, items] of Object.entries(REPERTOIRE) as [CourseId, (typeof REPERTOIRE)[CourseId]][]) {
    const seen: Partial<Record<RepTier, number>> = {};
    for (const it of items) {
      const k = (seen[it.tier] = (seen[it.tier] ?? 0) + 1);
      out.push({
        id: `rep:${course}:${it.id}`,
        kind: 'game',
        game: 'repertoire',
        rep: { course, id: it.id },
        ...REP_AREA[course],
        difficulty: REP_TIER_DIFF[it.tier] + 6 * (k - 1),
        choices: 0,
        ...courseShape(course),
        title: { en: `Repertoire · ${it.title.en}`, he: `רפרטואר · ${it.title.he}` },
      });
    }
  }
  return out;
}

/** Stars of a repertoire step from the item's best score (measured: the item's own practice). */
export const repStepStars = (best: number): number => (best >= REP_LEARNED ? 3 : best >= 0.6 ? 2 : best >= 0.3 ? 1 : 0);

/** Repertoire results (progress.lessons "rep-<course>-<item>") as done repertoire steps — played from the path or the repertoire page. */
export function withRepFacts(f: PathFacts, lessons: Record<string, { best: number; completions: number; lastAt?: string }> | undefined): PathFacts {
  if (!lessons) return f;
  const steps = { ...(f.steps ?? {}) };
  for (const [course, items] of Object.entries(REPERTOIRE) as [CourseId, (typeof REPERTOIRE)[CourseId]][])
    for (const it of items) {
      const l = lessons[repLessonId(course, it.id)];
      if (!l?.completions) continue;
      const stars = repStepStars(Math.min(1, l.best / REP_TOTAL));
      const key = `rep:${course}:${it.id}`;
      const at = l.lastAt ?? new Date(0).toISOString();
      if (stars > 0 && (steps[key]?.stars ?? 0) < stars) steps[key] = { stars, at, times: Math.max(steps[key]?.times ?? 0, l.completions), firstAt: steps[key]?.firstAt ?? at };
    }
  return { ...f, steps };
}

/** A step placed only at a unit's end (not picked with the unit's own steps). */
export const isUnitEndStep = (s: PathStep): boolean => !!s.bonus || !!s.rep;

/**
 * The steps that close a unit (after its game, before its checkpoint): a repertoire item every third unit whose tier
 * fits the unit (its difficulty ≤ the unit's + 100), and a bonus game every other unit once the unit is as deep as the
 * game. `open` = eligible steps not yet taken (in the catalogue's difficulty order).
 */
export function unitEndSteps(n: number, unitDifficulty: number, open: PathStep[]): PathStep[] {
  const out: PathStep[] = [];
  if (n % 3 === 0) {
    const rep = open.find((s) => s.rep && s.difficulty <= unitDifficulty + 100);
    if (rep) out.push(rep);
  }
  if (n % 2 === 0) {
    const fits = open.filter((s) => s.bonus && s.difficulty <= unitDifficulty + 50);
    if (fits.length) out.push(fits[Math.floor(n / 2) % fits.length]);
  }
  return out;
}
