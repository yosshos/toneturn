// One fixed hue per course area for every chart (docs/SPEC-PROGRESS-CHARTS.md §0): colour follows the area, never
// its rank, the same on the radar, the minutes chart and the trends. The hues are the validated eight-slot
// categorical palette in its validated order (dataviz validate_palette.js, 2026-11-22: light — worst adjacent CVD ΔE
// 9.1, normal 19.6, three slots under 3:1 on the light surface → every chart carries names beside the marks and a
// table view; dark — all checks pass). Areas map onto slots; a course never shows more than its own sections.

export const AREA_SLOTS = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#0ca30c', '#9085e9', '#e66767'],
} as const;

/** Section id (courseSections.ts) → palette slot. Equivalent sections across courses share a slot. */
const SLOT: Record<string, number> = {
  technique: 0,
  harmony: 1,
  lines: 1,
  improv: 2,
  time: 3,
  rhythm: 3,
  groove: 3,
  byear: 4,
  comping: 5,
  coord: 5,
  styles: 5,
  form: 6,
  tone: 6,
  reading: 7,
};
/** The lick book's area shares the improvisation hue. */
export const NEUTRAL = { light: '#8a8f98', dark: '#9aa0a8' } as const;

/** The hue of an area key ("keys:technique", "lick", or a bare section id). */
export function areaColor(area: string, mode: 'light' | 'dark' = 'light'): string {
  const id = area === 'lick' ? 'improv' : area.includes(':') ? area.split(':')[1] : area;
  const s = SLOT[id];
  return s === undefined ? NEUTRAL[mode] : AREA_SLOTS[mode][s];
}
