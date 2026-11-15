// The partner registry and its small hooks into the app (docs/SPEC-PARTNER-PITCH.md §3.2). The build picks a partner
// with VITE_PARTNER (npm run build:openstudio); without one ACTIVE_PARTNER is null and every helper here returns what
// the normal app already does, so the normal build is unchanged.
import { COURSES, type CourseDef, type CourseId } from '../engine/courses';
import { OPENSTUDIO } from './openstudio';
import type { Bi, PartnerConfig, TokenMap } from './types';

export type { PartnerConfig, DepthLink, CourseMapRow, Bi } from './types';

export const PARTNERS: Record<string, PartnerConfig> = { [OPENSTUDIO.id]: OPENSTUDIO };

/** The partner for an id (unknown or empty = none). */
export const partnerById = (id: string | null | undefined): PartnerConfig | null => (id ? PARTNERS[id.trim().toLowerCase()] ?? null : null);

const envPartner = (): string | undefined => {
  // Written out literally so Vite replaces it at build time.
  const v: unknown = import.meta.env?.VITE_PARTNER;
  return typeof v === 'string' ? v : undefined;
};
/** The partner this build was made for (null in the normal app). */
export const ACTIVE_PARTNER: PartnerConfig | null = partnerById(envPartner());

/** The courses offered: the partner's subset, in the app's own order; the normal app offers all of them. */
export function visibleCourses(p: PartnerConfig | null = ACTIVE_PARTNER): CourseDef[] {
  return p ? COURSES.filter((c) => p.courses.includes(c.id)) : COURSES;
}
export const courseAllowed = (id: CourseId, p: PartnerConfig | null = ACTIVE_PARTNER): boolean => !p || p.courses.includes(id);
/** The course a player falls back to (the normal app: Ear). */
export const defaultCourse = (p: PartnerConfig | null = ACTIVE_PARTNER): CourseId => (p ? p.courses[0] : 'ear');
/** A player's courses as this build offers them (never empty). */
export function allowedCourses(mine: CourseId[], p: PartnerConfig | null = ACTIVE_PARTNER): CourseId[] {
  if (!p) return mine;
  const kept = mine.filter((c) => p.courses.includes(c));
  return kept.length ? kept : [defaultCourse(p)];
}

/** Copy keys a partner may override. */
export const COPY_KEYS = ['ob.slogan', 'ob.sub', 'depth.title', 'depth.card'] as const;
export type CopyKey = (typeof COPY_KEYS)[number];
/** A string with the partner's override, else the app's own. */
export function copy(key: CopyKey, lang: 'en' | 'he', fallback: Bi, p: PartnerConfig | null = ACTIVE_PARTNER): string {
  return (p?.copy[key] ?? fallback)[lang];
}

const APP_WORDMARK: Bi = { en: 'The 7th Sense', he: 'החוש השביעי' };
export const wordmark = (lang: 'en' | 'he', p: PartnerConfig | null = ACTIVE_PARTNER): string => (p?.wordmark ?? APP_WORDMARK)[lang];

const block = (sel: string, t: TokenMap & Record<string, string>): string =>
  `${sel} {\n${Object.entries(t)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n')}\n}`;

/** The partner's tokens as CSS over the v2 tokens (higher specificity than `:root[data-theme]`). '' = no partner. */
export function themeCss(p: PartnerConfig | null = ACTIVE_PARTNER): string {
  if (!p) return '';
  const th = p.theme;
  const r = `:root[data-partner='${p.id}']`;
  return [
    block(`${r}, ${r}[data-theme='light']`, { ...th.light, '--shadow': th.shadow.light, '--shadow-s': th.shadow.lightS }),
    block(`${r}[data-theme='dark']`, { ...th.dark, '--shadow': th.shadow.dark, '--shadow-s': th.shadow.darkS }),
    block(r, { '--font': th.font, '--display': th.display, '--radius': th.radius, '--stroke': th.stroke }),
    `${r}[data-theme] h1, ${r}[data-theme] h2 { font-weight: ${th.headingWeight}; letter-spacing: -0.01em; }`,
    `${r} body { font-family: var(--font); }`,
  ].join('\n');
}

/** Paint the partner build: data-partner on <html>, the token sheet, the tab title. No-op in the normal app. */
export function installPartner(doc: Document = document, p: PartnerConfig | null = ACTIVE_PARTNER): void {
  if (!p) return;
  doc.documentElement.dataset.partner = p.id;
  let el = doc.getElementById('partner-theme');
  if (!el) {
    el = doc.createElement('style');
    el.id = 'partner-theme';
    doc.head.appendChild(el);
  }
  el.textContent = themeCss(p);
  doc.title = p.wordmark.en;
  // A private demo: ask search engines not to index it.
  if (!doc.querySelector('meta[name="robots"]')) {
    const m = doc.createElement('meta');
    m.name = 'robots';
    m.content = 'noindex, nofollow';
    doc.head.appendChild(m);
  }
}
