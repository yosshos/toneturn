// SPEC-STYLE-FOCUS §1 (owner 2026-11-22): the styles of the app, in ONE place. Every other module (content tags, the
// focus model, the weights, the taster) imports StyleId from here.
//
// The tag: a technique family or level may say which style it belongs to.
//   - LevelDef.style?: StyleId        (a level of a mixed family: "b-styles-7" is bossa)
//   - FamilyDef.style: FamilyStyle    (the old field: 'classical' | 'jazz' | 'both' was the piano emphasis filter; it now
//                                      also takes any StyleId, so a new family can say `style: 'brazil'`)
// For the families that existed before the tag, STYLE_OF_FAMILY / STYLE_OF_LEVEL below say it (the old 'classical' /
// 'jazz' values on non-piano families meant nothing about style, so they are never read as one).
// Read a level's style only through styleOfLevel().

import type { CourseId } from './courses';

/** The styles (§1). The first eight can be a main style; the guitar add-ons only an "also" style on the guitar. */
export type StyleId =
  | 'jazz'
  | 'brazil'
  | 'afrocuban'
  | 'soul'
  | 'neworleans'
  | 'classical'
  | 'pop'
  | 'prog'
  // guitar add-ons ("also" only)
  | 'fingerstyle'
  | 'flamenco'
  | 'metal'
  | 'country'
  | 'reggae';

/** A family's `style` field: a style, or 'both' (the old "either emphasis" value, the pianist's ear). */
export type FamilyStyle = StyleId | 'both';

export const MAIN_STYLES: StyleId[] = ['jazz', 'brazil', 'afrocuban', 'soul', 'neworleans', 'classical', 'pop', 'prog'];
export const GUITAR_ADDON_STYLES: StyleId[] = ['fingerstyle', 'flamenco', 'metal', 'country', 'reggae'];
export const STYLE_IDS: StyleId[] = [...MAIN_STYLES, ...GUITAR_ADDON_STYLES];
export const isStyleId = (x: unknown): x is StyleId => typeof x === 'string' && (STYLE_IDS as string[]).includes(x);

const ALL: CourseId[] = ['ear', 'voice', 'keys', 'guitar', 'bass', 'drums'];
/** The courses each style is offered in (§1). Ear hears every main style (the recognition game). */
export const STYLE_COURSES: Record<StyleId, CourseId[]> = {
  jazz: ALL,
  brazil: ['ear', 'keys', 'guitar', 'bass', 'drums', 'voice'],
  afrocuban: ['ear', 'keys', 'guitar', 'bass', 'drums'],
  soul: ['ear', 'keys', 'guitar', 'bass', 'drums', 'voice'],
  neworleans: ['ear', 'keys', 'bass', 'drums'],
  classical: ['ear', 'keys', 'guitar', 'voice'],
  pop: ALL,
  prog: ['bass', 'drums', 'guitar'],
  fingerstyle: ['guitar'],
  flamenco: ['guitar'],
  metal: ['guitar'],
  country: ['guitar'],
  reggae: ['guitar'],
};

/** The styles a course offers, in display order; `main` = only those that can be a main style. */
export function stylesFor(course: CourseId, o: { main?: boolean } = {}): StyleId[] {
  return (o.main ? MAIN_STYLES : STYLE_IDS).filter((s) => STYLE_COURSES[s].includes(course));
}

/** Names (Latin names go inside <bdi dir="ltr"> in Hebrew, by the caller) and the short "what is it" line (§3). */
export const STYLE_TEXT: Record<StyleId, { en: string; he: string; hint: { en: string; he: string } }> = {
  jazz: { en: 'Jazz', he: 'ג׳אז', hint: { en: 'swing, standards, bebop', he: 'סווינג, סטנדרטים, ביבופ' } },
  brazil: { en: 'Brazilian', he: 'ברזילאי', hint: { en: 'bossa nova, samba, baião', he: 'בוסה נובה, סמבה, באיון' } },
  afrocuban: { en: 'Afro-Cuban', he: 'אפרו-קובני', hint: { en: 'clave, montuno, Latin jazz', he: 'קלאבה, מונטונו, ג׳אז לטיני' } },
  soul: { en: 'Soul & funk', he: 'סול ופאנק', hint: { en: 'soul-jazz, gospel, funk', he: 'סול-ג׳אז, גוספל, פאנק' } },
  neworleans: { en: 'New Orleans', he: 'ניו אורלינס', hint: { en: 'second line, stride, boogie', he: 'סקנד ליין, סטרייד, בוגי' } },
  classical: { en: 'Classical', he: 'קלאסי', hint: { en: 'repertoire, touch, reading', he: 'רפרטואר, מגע, קריאה' } },
  pop: { en: 'Pop & rock', he: 'פופ ורוק', hint: { en: 'songs, grooves, riffs', he: 'שירים, גרובים, ריפים' } },
  prog: { en: 'Prog', he: 'פרוג', hint: { en: 'odd meters, fusion', he: 'משקלים אי-זוגיים, פיוז׳ן' } },
  fingerstyle: { en: 'Fingerstyle', he: 'פינגרסטייל', hint: { en: 'Travis, classical guitar', he: 'טראוויס, גיטרה קלאסית' } },
  flamenco: { en: 'Flamenco', he: 'פלמנקו', hint: { en: 'rasgueado, compás', he: 'ראסגאדו, קומפאס' } },
  metal: { en: 'Metal', he: 'מטאל', hint: { en: 'palm mutes, gallops', he: 'השתקה בכף היד, גאלופ' } },
  country: { en: 'Country', he: 'קאנטרי', hint: { en: 'chicken picking, boom-chick', he: 'צ׳יקן פיקינג, בום-צ׳יק' } },
  reggae: { en: 'Reggae', he: 'רגאיי', hint: { en: 'skank, one drop', he: 'סקאנק, וואן דרופ' } },
};
export const styleName = (s: StyleId, lang: 'en' | 'he'): string => STYLE_TEXT[s][lang];

// ---------------------------------------------------------------- the tag on existing content

/**
 * Families that existed before the tag, by style. Only style-specific content (§8.3): the jazz core (shells, guide
 * tones, Harris, bebop, walking…) is untagged here on purpose — it is the backbone for everyone, never weighted.
 * Jazz comping / grooves that ARE style content are tagged 'jazz' (they feed the style block H like any style).
 */
export const STYLE_OF_FAMILY: Partial<Record<string, StyleId>> = {
  // piano
  'k-classic': 'classical',
  'k-organ': 'soul',
  'k-pop': 'pop',
  'k-comp': 'jazz',
  // guitar add-on families (GUITAR_DEEPENING §5)
  'g-fingerstyle': 'fingerstyle',
  'g-flamenco': 'flamenco',
  'g-prog': 'prog',
  // bass
  'b-latin': 'afrocuban',
  'b-prog': 'prog',
  'b-odd': 'prog',
  'b-poly': 'prog',
  'b-swing': 'jazz',
  // drums
  'd-latin': 'afrocuban',
  'd-funk': 'soul',
  'd-prog': 'prog',
  'd-jazz': 'jazz',
};

/** Levels of mixed families (a level's tag wins over its family's). */
export const STYLE_OF_LEVEL: Partial<Record<string, StyleId>> = {
  // piano accompaniment: the boogie left hand, the bossa / montuno level
  'accomp-5': 'neworleans',
  'accomp-6': 'brazil',
  // the bass style vocabulary (b-styles)
  'b-styles-1': 'pop',
  'b-styles-2': 'pop',
  'b-styles-3': 'soul',
  'b-styles-5': 'pop',
  'b-styles-6': 'reggae',
  'b-styles-7': 'brazil',
  'b-styles-8': 'brazil',
  'b-styles-9': 'afrocuban',
  'b-styles-10': 'soul',
  'b-styles-11': 'soul',
  'b-styles-14': 'soul',
  'b-styles-15': 'pop',
  'b-styles-16': 'soul',
  // the bass Latin family: partido alto and baião are Brazilian
  'b-latin-8': 'brazil',
  // drums Latin & Brazilian: bossa, samba, baião
  'd-latin-1': 'brazil',
  'd-latin-2': 'brazil',
  'd-latin-7': 'brazil',
};

/** The guitar add-ons that are styles (the jazz add-on is the jazz core: unstyled). */
const ADDON_STYLE: Partial<Record<string, StyleId>> = { prog: 'prog', flamenco: 'flamenco', fingerstyle: 'fingerstyle' };

/** The legacy values of FamilyDef.style that are not a style tag (the piano emphasis filter of old). */
const LEGACY_FAMILY_STYLE = new Set<string>(['both', 'classical', 'jazz']);

/**
 * The style of a technique level, or null for core content. Order: the level's own tag, the table of levels, the
 * family table, then a new family's own `style` (anything but the legacy emphasis values).
 */
export function styleOfLevel(level: { id: string; style?: StyleId }, family: { id: string; style?: FamilyStyle | string }): StyleId | null {
  if (level.style && isStyleId(level.style)) return level.style;
  const byLevel = STYLE_OF_LEVEL[level.id];
  if (byLevel) return byLevel;
  // guitar (GUITAR_DEEPENING §5): an add-on level inside a core family (prog picking, …) and the country levels
  const addOn = (level as { addOn?: string }).addOn;
  if (addOn && ADDON_STYLE[addOn]) return ADDON_STYLE[addOn]!;
  if ((level as { country?: boolean }).country) return 'country';
  const byFam = STYLE_OF_FAMILY[family.id];
  if (byFam) return byFam;
  if (family.style && !LEGACY_FAMILY_STYLE.has(family.style) && isStyleId(family.style)) return family.style;
  return null;
}

/** The style of a whole family (null = core or mixed). */
export function styleOfFamily(family: { id: string; style?: FamilyStyle | string }): StyleId | null {
  const byFam = STYLE_OF_FAMILY[family.id];
  if (byFam) return byFam;
  if (family.style && !LEGACY_FAMILY_STYLE.has(family.style) && isStyleId(family.style)) return family.style;
  return null;
}

/**
 * The chart band (charts.ts ChartStyle: swing / pop / rock / bossa / ballad / waltz) that plays a style today, for
 * Improvise's default band, the workout's improvisation share and the taster's 8 bars. Afro-Cuban, soul and New Orleans
 * borrow the closest band until their own band styles land (SPEC-JAZZ-NEIGHBOURS §2–5); null = the level's own band.
 */
export const STYLE_CHART: Partial<Record<StyleId, 'swing' | 'pop' | 'rock' | 'bossa' | 'ballad' | 'waltz'>> = {
  brazil: 'bossa',
  afrocuban: 'bossa',
  soul: 'rock',
  neworleans: 'swing',
  pop: 'pop',
  prog: 'rock',
  classical: 'ballad',
  metal: 'rock',
  country: 'pop',
  reggae: 'pop',
  fingerstyle: 'ballad',
  flamenco: 'waltz',
};

/** The band styles (band.ts BandStyle ids) of each style, for Improvise's default band and the taster's 8 bars. */
export const STYLE_BANDS: Partial<Record<StyleId, string[]>> = {
  jazz: ['swing', 'ballad', 'waltz'],
  brazil: ['bossa', 'samba'],
  afrocuban: ['latin', 'chacha', 'mambo', 'songo', 'afro68', 'bolero'],
  soul: ['funk', 'shuffle', 'soul', 'boogaloo'],
  neworleans: ['shuffle', 'secondline'],
  pop: ['pop', 'rock'],
  reggae: ['reggae'],
  metal: ['rock'],
  country: ['pop'],
};
