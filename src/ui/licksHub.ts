// The Licks tile (owner 2026-11-22, SPEC-DAILY-WORKOUT §6.2): Encore moved inside Licks, so everything about licks sits
// together. One route (#/licks) with three sections: the library (#/licks), my phrases — what Encore was —
// (#/licks/mine) and the challenges (#/licks/challenges). Encore's own deeper screens keep their addresses
// (#/encore/plan/…, #/challenges/p/…); only the old homes (#/encore, #/challenges) now land on their section.

export type LicksSection = 'library' | 'mine' | 'challenges';
export const LICKS_SECTIONS: LicksSection[] = ['library', 'mine', 'challenges'];

/** The address of a section (without the leading '#'). */
export const licksHash = (s: LicksSection): string => (s === 'library' ? '/licks' : `/licks/${s}`);

const pathOf = (hash: string) => hash.replace(/^#\/?/, '').split('?')[0];

/** An old Encore home address → the Licks section that replaced it (for a redirect); null when the hash is not one. */
export function legacyLicksHash(hash: string): string | null {
  const p = pathOf(hash).replace(/\/+$/, '');
  if (p === 'encore') return licksHash('mine');
  if (p === 'challenges') return licksHash('challenges');
  return null;
}

/** The section a hash opens (old Encore homes included). */
export function licksSectionOf(hash: string): LicksSection {
  const p = pathOf(hash).replace(/\/+$/, '');
  if (p === 'licks/mine' || p === 'encore') return 'mine';
  if (p === 'licks/challenges' || p === 'challenges') return 'challenges';
  return 'library';
}
