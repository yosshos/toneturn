// Partner theme layer (docs/SPEC-PARTNER-PITCH.md §3.2). A partner build is the same app, built with
// VITE_PARTNER=<id>: its own colours and type mapped onto the v2 tokens, a wordmark, a course subset, a few copy
// overrides, a mascot set and a course mapping. No partner set = the normal app, unchanged.
import type { CourseId } from '../engine/courses';

export type Bi = { en: string; he: string };

/** The v2 custom properties a partner may set (src/v2.css). Anything else stays as v2 draws it. */
export type TokenName =
  | '--paper'
  | '--ink-c'
  | '--purple'
  | '--lilac'
  | '--lemon'
  | '--sky'
  | '--pink'
  | '--teal'
  | '--tangerine'
  | '--bg'
  | '--bg-2'
  | '--card'
  | '--card-2'
  | '--ink'
  | '--ink-soft'
  | '--ink-dim'
  | '--outline'
  | '--line'
  | '--line-strong'
  | '--accent'
  | '--accent-ink'
  | '--now'
  | '--ok'
  | '--ok-soft'
  | '--bad'
  | '--bad-soft'
  | '--near';
export type TokenMap = Partial<Record<TokenName, string>>;

export interface PartnerTheme {
  /** Light mode (the default look) and dark mode; high contrast is never re-coloured. */
  light: TokenMap;
  dark: TokenMap;
  /** Body and display font stacks (system / bundled fonts only: nothing is fetched from the partner). */
  font: string;
  display: string;
  /** Corner radius and outline width. */
  radius: string;
  stroke: string;
  /** Card / button shadow in light and dark (v2 draws a hard offset shadow). */
  shadow: { light: string; lightS: string; dark: string; darkS: string };
  /** Headings weight (v2's Secular One is drawn at 400). */
  headingWeight: number;
}

/** A link from the depth page / course map into the app. */
export type DepthLink = { kind: 'family'; id: string; level?: number } | { kind: 'topic'; id: string; level?: number };

/** One row of "Fits your courses": a public course or topic title → our drill families. */
export interface CourseMapRow {
  /** The partner's public course or topic title (as published; not translated). */
  course: string;
  /** Which of our courses it lands in. */
  area: 'keys' | 'guitar' | 'ear' | 'jazz';
  /** What it practises, in a few words. */
  what: Bi;
  /** Our families and topics that drill it. */
  links: DepthLink[];
}

export type MascotSet = 'toni' | 'teacher-frame';

export interface PartnerConfig {
  id: string;
  /** Used descriptively only ("built for … members"). Never a logo. */
  partnerName: string;
  wordmark: Bi;
  tagline: Bi;
  theme: PartnerTheme;
  /** The courses this build offers (others are hidden from onboarding, menus and the course switcher). */
  courses: CourseId[];
  /** Small copy overrides, by key (see COPY_KEYS in ./index). */
  copy: Partial<Record<string, Bi>>;
  mascot: MascotSet;
  /** "Fits your courses" (illustrative; public titles only). */
  courseMap: CourseMapRow[];
  /** Where the course map's titles come from, shown under the table. */
  courseMapNote: Bi;
}
