// Appearance (0.61, SPEC-REDESIGN, owner 2026-11-09): one design language in light and dark, plus high contrast.
// The colour themes of 0.41 (Calm night, Studio, Paper, OLED, Classic arcade) and the gem-shop themes are retired;
// a stored old choice maps to the closest mode. Colours live in src/v2.css.

type L = { en: string; he: string };
export type Appearance = 'auto' | 'light' | 'dark' | 'contrast';
export interface AppTheme {
  id: Appearance;
  name: L;
  note: L;
  /** Swatches for the picker: background, surface, text, accent. */
  sw: [string, string, string, string];
}

export const APP_THEMES: AppTheme[] = [
  { id: 'auto', name: { en: 'Automatic', he: 'אוטומטי' }, note: { en: 'Follows the device', he: 'לפי המכשיר' }, sw: ['#FBF7FF', '#FFFFFF', '#1E1033', '#6D28D9'] },
  { id: 'light', name: { en: 'Light', he: 'בהיר' }, note: { en: 'Paper and ink', he: 'נייר ודיו' }, sw: ['#FBF7FF', '#FFFFFF', '#1E1033', '#6D28D9'] },
  { id: 'dark', name: { en: 'Dark', he: 'כהה' }, note: { en: 'For the evening', he: 'לערב' }, sw: ['#140A24', '#241540', '#FFFFFF', '#FFD43B'] },
  { id: 'contrast', name: { en: 'High contrast', he: 'ניגודיות גבוהה' }, note: { en: 'Maximum legibility', he: 'קריאות מרבית' }, sw: ['#000000', '#000000', '#FFFFFF', '#FFE600'] },
];

/** A stored setting → the appearance it means now (old themes map to the closest mode). */
export function appearanceOf(theme: string | undefined): Appearance {
  if (!theme) return 'auto';
  if (theme === 'auto' || theme === 'light' || theme === 'dark' || theme === 'contrast') return theme;
  if (theme === 'paper') return 'light';
  return 'dark'; // calm, studio, oled, violet and the retired shop themes were all dark
}

/** The mode actually painted (auto resolves against the device). */
export function resolvedTheme(a: Appearance, prefersDark: boolean): 'light' | 'dark' | 'contrast' {
  return a === 'auto' ? (prefersDark ? 'dark' : 'light') : a;
}
