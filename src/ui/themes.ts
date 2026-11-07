// App themes (0.41, SPEC-TODAY / owner 2026-11-07). Colours live in src/themes.css; this is the list for Settings.

type L = { en: string; he: string };
export interface AppTheme {
  id: string;
  name: L;
  /** One line under the name. */
  note: L;
  /** Swatches for the picker: background, surface, text, accent. */
  sw: [string, string, string, string];
}

export const APP_THEMES: AppTheme[] = [
  { id: 'calm', name: { en: 'Calm night', he: 'לילה רגוע' }, note: { en: 'Default · navy, soft mint', he: 'ברירת מחדל · כחול לילה, מנטה רכה' }, sw: ['#0e1322', '#151b2c', '#e9edf5', '#86dcbd'] },
  { id: 'studio', name: { en: 'Studio', he: 'סטודיו' }, note: { en: 'Graphite & brass, serif titles', he: 'גרפיט ופליז, כותרות סריף' }, sw: ['#181614', '#211e1b', '#f3ede4', '#e0aa52'] },
  { id: 'paper', name: { en: 'Paper', he: 'נייר' }, note: { en: 'Light, for daytime study', he: 'בהיר, ללימוד ביום' }, sw: ['#f7f5f0', '#ffffff', '#16181d', '#3a43c4'] },
  { id: 'oled', name: { en: 'OLED black', he: 'שחור OLED' }, note: { en: 'True black, saves battery', he: 'שחור מלא, חוסך סוללה' }, sw: ['#000000', '#111214', '#ededf0', '#86dcbd'] },
  { id: 'contrast', name: { en: 'High contrast', he: 'ניגודיות גבוהה' }, note: { en: 'Maximum legibility', he: 'קריאות מרבית' }, sw: ['#000000', '#0a0a0a', '#ffffff', '#ffd400'] },
  { id: 'violet', name: { en: 'Classic arcade', he: 'ארקייד קלאסי' }, note: { en: 'The original neon look', he: 'המראה הניאון המקורי' }, sw: ['#0f1020', '#1b1d36', '#f4f1ff', '#5cf2b5'] },
];
