// Voice catalogue helpers: language filtering, gender labelling, and selection with fallbacks.
// Pure over a minimal voice shape so it can be unit-tested without a browser.

export interface VoiceLike {
  name: string;
  lang: string;
  voiceURI: string;
  localService: boolean;
  default: boolean;
}

export type Gender = 'female' | 'male' | 'unknown';
export type GenderPref = 'any' | 'female' | 'male';

const LANG_PREFIX = { he: ['he', 'iw'], en: ['en'] } as const;

// Known voice first names across Windows (SAPI/OneCore/Edge neural), macOS/iOS, Android/Chrome.
const FEMALE = [
  'female', 'woman', 'zira', 'aria', 'jenny', 'hila', 'hazel', 'susan', 'samantha', 'karen', 'moira', 'tessa',
  'victoria', 'fiona', 'serena', 'allison', 'ava', 'emma', 'libby', 'sonia', 'michelle', 'natasha', 'clara',
  'carmit', 'linda', 'heera', 'catherine', 'ana', 'aria', 'sara', 'eva', 'jane', 'nancy', 'amber', 'ashley',
  'cora', 'elizabeth', 'monica', 'emily', 'joanna', 'kendra', 'kimberly', 'salli', 'ivy', 'zoe', 'nicky',
  'google us english', 'google uk english female',
];
const MALE = [
  'male', 'man', 'david', 'mark', 'guy', 'asaf', 'avri', 'george', 'ryan', 'daniel', 'alex', 'fred', 'tom',
  'arthur', 'oliver', 'thomas', 'aaron', 'rishi', 'christopher', 'eric', 'roger', 'steffan', 'brian', 'andrew',
  'james', 'richard', 'sean', 'william', 'liam', 'connor', 'matthew', 'justin', 'joey', 'davis', 'tony', 'jason',
  'google uk english male',
];

const words = (s: string) => s.toLowerCase().replace(/[^a-zא-ת ]+/g, ' ');

export function voiceGender(v: Pick<VoiceLike, 'name'>): Gender {
  const n = ` ${words(v.name)} `;
  // Check explicit "male"/"female" first ("female" contains "male").
  if (/\bfemale\b/.test(n)) return 'female';
  if (/\bmale\b/.test(n)) return 'male';
  const hit = (list: string[]) => list.some((w) => n.includes(` ${w} `) || (w.includes(' ') && n.includes(w)));
  const f = hit(FEMALE.filter((w) => w !== 'male' && w !== 'female'));
  const m = hit(MALE.filter((w) => w !== 'male' && w !== 'female'));
  if (f && !m) return 'female';
  if (m && !f) return 'male';
  return 'unknown';
}

export function voicesFor<T extends VoiceLike>(all: T[], lang: 'he' | 'en'): T[] {
  return all.filter((v) => LANG_PREFIX[lang].some((p) => v.lang.toLowerCase().replace('_', '-').startsWith(p)));
}

/** Quality score: natural/neural/online voices sound better; local ones work offline. */
function quality(v: VoiceLike, lang: 'he' | 'en'): number {
  return (
    (/natural|neural|online|premium|enhanced/i.test(v.name) ? 4 : 0) +
    (v.localService ? 1.5 : 0) +
    (/google/i.test(v.name) ? 1 : 0) +
    (lang === 'en' && /en[-_]us/i.test(v.lang) ? 0.5 : 0) +
    (v.default ? 0.25 : 0)
  );
}

/** Voices of a language sorted best-first, each with its detected gender. */
export function catalogue<T extends VoiceLike>(all: T[], lang: 'he' | 'en'): { voice: T; gender: Gender }[] {
  return voicesFor(all, lang)
    .map((voice) => ({ voice, gender: voiceGender(voice) }))
    .sort((a, b) => quality(b.voice, lang) - quality(a.voice, lang) || a.voice.name.localeCompare(b.voice.name));
}

/**
 * Pick a voice: exact chosen URI → best voice of the preferred gender → best voice of the language.
 * Returns null when the language has no voice at all.
 */
export function chooseVoice<T extends VoiceLike>(all: T[], lang: 'he' | 'en', uri: string | null, gender: GenderPref): T | null {
  const list = catalogue(all, lang);
  if (!list.length) return null;
  if (uri) {
    const exact = list.find((x) => x.voice.voiceURI === uri);
    if (exact) return exact.voice;
  }
  if (gender !== 'any') {
    const g = list.find((x) => x.gender === gender);
    if (g) return g.voice;
  }
  return list[0].voice;
}
