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
// SPEC-JAZZ-FOLD: the old Jazz course's steps keep their ids ("bonus:jazz:…", "rep:jazz:…"); 'jazz' is now a content
// group carried by the jazz pack, so they are Ear steps shown while the jazz pack is open.

import { gameVerified } from './verifiedContent';
import { JAZZ_FAMILIES, JAZZ_FREE_LEVELS, type CourseId } from './courses';
import type { DomainId } from './rating';
import type { SkillId } from './lesson';
import type { PathFacts, PathStep } from './path';
import { REPERTOIRE, REP_LEARNED, REP_TOTAL, repLessonId, repRefs, type RepCourse, type RepItem, type RepTier } from './repertoire';

/** The eight advanced games and where each sits: course, area, skill / sub-skill, the depth it fits. */
export const BONUS_GAMES: { game: string; course: RepCourse; domain: DomainId; skill: SkillId; sub: string; difficulty: number; title: { en: string; he: string } }[] = [
  { game: 'rush-scale', course: 'ear', domain: 'pitch', skill: 'modes', sub: 'modes/scales', difficulty: 1000, title: { en: 'Scale & Mode Rush', he: 'מרוץ סולמות ומודוסים' } },
  { game: 'transcribe', course: 'ear', domain: 'memory', skill: 'dictation', sub: 'dictation/melodic', difficulty: 1050, title: { en: 'Transcription Race', he: 'מרוץ התמלול' } },
  { game: 'rush-voicing', course: 'jazz', domain: 'pitch', skill: 'chords', sub: 'chords/voicing', difficulty: 1000, title: { en: 'Voicing Spy', he: 'מרגל הוויסינגים' } },
  { game: 'rush-standard', course: 'jazz', domain: 'pitch', skill: 'cadences', sub: 'cadences/standards', difficulty: 1050, title: { en: 'Name That Standard', he: 'זהו את הסטנדרט' } },
  { game: 'reharm', course: 'jazz', domain: 'pitch', skill: 'cadences', sub: 'cadences/reharm', difficulty: 1100, title: { en: 'Reharm Spotter', he: 'גלאי ההרמוניה' } },
  { game: 'bhtime', course: 'keys', domain: 'instrument', skill: 'instrument', sub: 'instrument/piano-tech', difficulty: 1050, title: { en: 'Barry Harris in Time', he: 'בארי האריס בזמן' } },
  { game: 'polylock', course: 'keys', domain: 'instrument', skill: 'instrument', sub: 'instrument/piano-tech', difficulty: 1000, title: { en: 'Polyrhythm Lock', he: 'נעילת פולי־ריתם' } },
  { game: 'polylock', course: 'drums', domain: 'instrument', skill: 'instrument', sub: 'instrument/drum-tech', difficulty: 1000, title: { en: 'Polyrhythm Lock', he: 'נעילת פולי־ריתם' } },
  { game: 'riffecho', course: 'guitar', domain: 'instrument', skill: 'instrument', sub: 'instrument/guitar-tech', difficulty: 1050, title: { en: 'Odd-Meter Riff Echo', he: 'הד ריפים במשקל אי־זוגי' } },
  { game: 'riffecho', course: 'bass', domain: 'instrument', skill: 'instrument', sub: 'instrument/bass-tech', difficulty: 1050, title: { en: 'Odd-Meter Riff Echo', he: 'הד ריפים במשקל אי־זוגי' } },
  // AUDIT-GAMES §4.2 new games (2026-11-15): the jazz course's steps (the other courses get them as unit games).
  { game: 'bordercontrol', course: 'jazz', domain: 'pitch', skill: 'cadences', sub: 'cadences/modulation', difficulty: 1100, title: { en: 'Border Control', he: 'ביקורת גבולות' } },
  { game: 'whichbrother', course: 'jazz', domain: 'pitch', skill: 'chords', sub: 'chords/barry', difficulty: 1050, title: { en: 'Which Brother?', he: 'איזה אח?' } },
  { game: 'compcaller', course: 'jazz', domain: 'creative', skill: 'improv', sub: 'improv/play', difficulty: 1100, title: { en: 'Comp Caller', he: 'קורא הליווי' } },
  // AUDIT-GAMES §4.2 new games in the Jazz course (the instrument and ear courses have them in their units, path.ts).
  { game: 'guidetone', course: 'jazz', domain: 'creative', skill: 'improv', sub: 'improv/vocab', difficulty: 1050, title: { en: 'Guide-Tone Runner', he: 'רץ הצלילים המנחים' } },
  { game: 'crossword', course: 'jazz', domain: 'pitch', skill: 'cadences', sub: 'cadences/dictation', difficulty: 1100, title: { en: 'Changes Crossword', he: 'תשבץ המהלכים' } },
  { game: 'holdnote', course: 'jazz', domain: 'pitch', skill: 'cadences', sub: 'cadences/reharm', difficulty: 1150, title: { en: 'Hold the Note', he: 'להחזיק את הצליל' } },
  // HARMONY-REHARM still-open games (the Ear course has them in its pitch units, path.ts).
  { game: 'darkside', course: 'jazz', domain: 'pitch', skill: 'cadences', sub: 'cadences/chromatic', difficulty: 1200, title: { en: 'Dark Side', he: 'הצד האפל' } },
  { game: 'thirdjump', course: 'jazz', domain: 'pitch', skill: 'cadences', sub: 'cadences/chromatic', difficulty: 1300, title: { en: 'Third Jump', he: 'קפיצת טרצה' } },
  // Triad pairs, deep: Which Pair? after the first triad-pair ear levels (the Ear course has it in its pitch units).
  { game: 'whichpair', course: 'jazz', domain: 'pitch', skill: 'modes', sub: 'modes/scales', difficulty: 1520, title: { en: 'Which Pair?', he: 'איזה זוג?' } },
  // Owner 2026-11-19: Euclid as an optional step next to the Euclidean-rhythm topic (the Ear course's time units have it too).
  { game: 'euclid', course: 'ear', domain: 'time', skill: 'rhythm-dictation', sub: 'rhythm-dictation/euclid', difficulty: 1500, title: { en: 'Euclid', he: 'אוקלידס' } },
  { game: 'enclosure', course: 'jazz', domain: 'creative', skill: 'improv', sub: 'improv/vocab', difficulty: 1150, title: { en: 'Enclosure Target', he: 'מטרת הכיתור' } },
  { game: 'call5432', course: 'jazz', domain: 'creative', skill: 'improv', sub: 'improv/answer', difficulty: 1250, title: { en: '5-4-3-2 Call', he: 'קריאת 5-4-3-2' } },
  // Negative harmony: Mirror, in the Jazz course next to the topic (negative-harmony 1–5, 1500–1660).
  { game: 'mirror', course: 'jazz', domain: 'pitch', skill: 'theory', sub: 'theory/harmony', difficulty: 1560, title: { en: 'Mirror', he: 'מראה' } },
];

const PLAYS: Partial<Record<CourseId, string[]>> = { keys: ['keys', 'piano'], guitar: ['guitar'], bass: ['bass'], drums: ['drums'] };

/** How a step of a course is placed in it (inCourse): the instrument, the jazz pack, singing. */
function courseShape(course: RepCourse): Pick<PathStep, 'forPlays' | 'pack' | 'sung' | 'mic'> {
  if (course !== 'jazz' && PLAYS[course]) return { forPlays: PLAYS[course] };
  if (course === 'jazz') return { pack: 'jazz' };
  if (course === 'voice') return { sung: true, mic: true };
  return {};
}

export function bonusSteps(): PathStep[] {
  return BONUS_GAMES.filter((g) => gameVerified(g.game)).map((g) => ({
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
export const REP_TIER_DIFF: Record<RepTier, number> = { 1: 760, 2: 900, 3: 1160, 4: 1420 };
/**
 * AUDIT-6 §5: each tier's band on the path (its items spread evenly through it, in catalogue order) — the steps sat in
 * four clumps (820 / 980 / 1180 / 1380 + 6 an item) and stopped at 1410. Advanced now reaches 1880.
 */
export const REP_TIER_BAND: Record<RepTier, [number, number]> = { 1: [760, 880], 2: [900, 1140], 3: [1160, 1400], 4: [1420, 1880] };
/**
 * Items placed by what they ask rather than by their catalogue order (inside their tier's band, so a tier stays below
 * the next): ii–V–I through all twelve keys, the minor ii–V–i cycle and the jazz blues in F are intermediate jazz
 * tasks — out of the beginner band (they sat at 986–998).
 */
export const REP_ITEM_AT: Record<string, number> = { 'blues-f': 1060, 'two-five-keys': 1110, 'minor-two-five-keys': 1140 };
const REP_AREA: Record<RepCourse, Pick<PathStep, 'domain' | 'skill' | 'sub'>> = {
  ear: { domain: 'memory', skill: 'sequences', sub: 'sequences/melody' },
  jazz: { domain: 'creative', skill: 'improv', sub: 'improv/repertoire' },
  voice: { domain: 'voice', skill: 'singing', sub: 'singing/repertoire' },
  keys: { domain: 'instrument', skill: 'instrument', sub: 'instrument/piano-tech' },
  guitar: { domain: 'instrument', skill: 'instrument', sub: 'instrument/guitar-tech' },
  bass: { domain: 'instrument', skill: 'instrument', sub: 'instrument/bass-tech' },
  drums: { domain: 'instrument', skill: 'instrument', sub: 'instrument/drum-tech' },
};

/**
 * SPEC-JAZZ-FOLD §2: a repertoire item that is jazz content (on the path only with the jazz pack): the jazz standards
 * collection; a course's standards played over a standard's changes (and the singer's standards); an item practiced on a
 * jazz technique family's level (walking a ii–V, the swing ride, comping a ii–V on the neck).
 */
export function isJazzRep(course: RepCourse, it: RepItem): boolean {
  if (course === 'jazz') return true;
  const r = repRefs(it);
  if (it.standard && (course === 'voice' || r.standards.length > 0)) return true;
  return r.levels.some((ref) => {
    const fam = ref.replace(/-\d+$/, '');
    return JAZZ_FAMILIES.includes(fam) && !JAZZ_FREE_LEVELS.includes(ref);
  });
}

export function repSteps(): PathStep[] {
  const out: PathStep[] = [];
  for (const [course, items] of Object.entries(REPERTOIRE) as [RepCourse, (typeof REPERTOIRE)[RepCourse]][]) {
    const seen: Partial<Record<RepTier, number>> = {};
    const count = (t: RepTier) => items.filter((x) => x.tier === t).length;
    for (const it of items) {
      const k = (seen[it.tier] = (seen[it.tier] ?? 0) + 1);
      const [lo, hi] = REP_TIER_BAND[it.tier];
      const n = count(it.tier);
      const at = REP_ITEM_AT[it.id] ?? Math.round(n > 1 ? lo + ((hi - lo) * (k - 1)) / (n - 1) : lo);
      out.push({
        id: `rep:${course}:${it.id}`,
        kind: 'game',
        game: 'repertoire',
        rep: { course, id: it.id },
        ...REP_AREA[course],
        difficulty: Math.min(hi, Math.max(lo, at)),
        choices: 0,
        ...courseShape(course),
        ...(isJazzRep(course, it) ? { pack: 'jazz' as const } : {}),
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
  for (const [course, items] of Object.entries(REPERTOIRE) as [RepCourse, (typeof REPERTOIRE)[RepCourse]][])
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

// ---------------------------------------------------------------- the core's neighbour-style moment (SPEC-STYLE-FOCUS §9)

/**
 * §9 (owner 2026-11-22): "the core units of the path include a moment from a neighbour style — for example, the ii–V–I
 * unit has a version over bossa and a version over a montuno, so the jazz core itself shows the styles." A unit that
 * holds a core ii–V–I level gets its neighbour-style versions as optional steps (never blocking the unit): the same
 * ii–V–I comped in bossa and in montuno ponchando (block chords only — the montuno line levels stay hidden until their
 * notes are verified). Each moment is the styled technique level itself, under its own id, so it counts for that level.
 */
export const NEIGHBOUR_MOMENTS: { core: string; moments: { id: string; level: string; title: { en: string; he: string } }[] }[] = [
  {
    core: 'tech:voicings-3',
    moments: [
      { id: 'moment:keys:iivi-bossa', level: 'tech:k-brazil-2', title: { en: 'The ii–V–I over bossa', he: 'ה־⁦ii–V–I⁩ בבוסה' } },
      { id: 'moment:keys:iivi-ponchando', level: 'tech:k-montuno-12', title: { en: 'The ii–V–I in montuno ponchando', he: 'ה־⁦ii–V–I⁩ בפונצ׳נדו של מונטונו' } },
    ],
  },
  // guitar: the batida over the ii–V–I (no guitar ponchando level exists yet; the guajeo is a line, not ponchando)
  { core: 'tech:g-jazz-1', moments: [{ id: 'moment:guitar:iivi-bossa', level: 'tech:g-brazil-4', title: { en: 'The ii–V–I over bossa', he: 'ה־⁦ii–V–I⁩ בבוסה' } }] },
];

/** The neighbour-style moments of a unit's steps: optional copies of the styled levels (ids "moment:…"), once each. */
export function neighbourMoments(unitStepIds: string[], byId: Map<string, PathStep>, taken: Set<string> = new Set()): PathStep[] {
  const out: PathStep[] = [];
  for (const m of NEIGHBOUR_MOMENTS) {
    if (!unitStepIds.includes(m.core)) continue;
    for (const x of m.moments) {
      const base = byId.get(x.level);
      if (!base || taken.has(x.id)) continue;
      out.push({ ...base, id: x.id, bonus: true, title: x.title });
    }
  }
  return out;
}
