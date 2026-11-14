// Badge medals as crafted inline SVG (no emoji, no assets). One medal = frame (by category) + metal (by tier)
// + glyph (by subject). Everything is pure shapes on a 100×100 viewBox; gradients get per-instance ids (useId).
//
// Frames      area = shield crest · skill = round medal on a ribbon · sub = hexagon chip (+ pips = which sub-skill)
//             technique = plaque with a key strip (+ 7 level pips) · special = star burst · season = laurel wreath
// Metals      bronze · silver · gold · platinum · diamond · master (iridescent); skill levels map via badge.tone
//             (developing → bronze, solid → silver, advanced → gold, master → diamond). Locked = slate silhouette + lock pip.
// Glyphs      24-unit stroke icons (stroke 2, round caps) keyed in GLYPHS; glyphKeyOf(badge) picks the key:
//               area:<RankArea>            7 domains + technique (tuning fork, metronome, loop, mic, book, sparkle, guitar, keys)
//               skill:<SkillId>            27 skills (sub-skills reuse their skill's glyph + pips)
//               family:<FamilyId>          10 piano + 14 guitar drill families; an unknown 'g-…' family falls back to family:guitar
//               keys / tech:<id>           Around-the-clock, even hands, clean takes, tempo records, guitar specials (tech:g-…)
//               special:<id>, season:<id>  one glyph each
//             New drill family → registerFamilyGlyph('g-strum', glyph) or add a 'family:<id>' entry below.
//             resolveGlyph(badge).fallback is true only when nothing matched (tests forbid it for area/skill/technique/special).

import { useId, type ReactNode } from 'react';
import { familyLevelCount, type Badge, type BadgeCat } from '../engine/badges';
import type { RankArea, RankTier } from '../engine/ranks';
import { SUB_SKILLS } from '../engine/taxonomy';

type Lang = 'he' | 'en';

// ======================================================================= metals

export interface Metal {
  /** Gradient stops, light → dark (≥ 3). */
  stops: string[];
  /** Glyph / highlight colour. */
  hi: string;
  /** Particle / glow colour. */
  glow: string;
  /** Ribbon colour. */
  ribbon: string;
}
export const METALS: Record<RankTier | 'locked', Metal> = {
  bronze: { stops: ['#ffd7aa', '#d98e4b', '#9a5422', '#5e3010'], hi: '#ffd9b0', glow: '#e89a55', ribbon: '#7a2f2f' },
  silver: { stops: ['#ffffff', '#cfd5e3', '#8d96ab', '#545c70'], hi: '#f2f5ff', glow: '#d6dcf0', ribbon: '#2f4a7a' },
  gold: { stops: ['#fff6c2', '#ffd250', '#d79a1c', '#8a5a06'], hi: '#fff0b3', glow: '#ffc94d', ribbon: '#7a2f55' },
  platinum: { stops: ['#f2fff9', '#b8f2de', '#5fbfa3', '#2b6f5d'], hi: '#e3fff4', glow: '#9fe8d0', ribbon: '#25406b' },
  diamond: { stops: ['#f0fdff', '#a6ecff', '#46b8e0', '#1d5f86'], hi: '#e2f9ff', glow: '#7de3ff', ribbon: '#3a2f7a' },
  master: { stops: ['#ffe9a8', '#ff8fd8', '#a58bff', '#3f6fd8'], hi: '#fff0fb', glow: '#ff7ad9', ribbon: '#2a1f5c' },
  locked: { stops: ['#8a8ea8', '#62667f', '#45485e', '#2c2e40'], hi: '#9a9eb8', glow: '#62667f', ribbon: '#2c2e40' },
};
const FACE = ['#2b2e5c', '#15162e'];
const FACE_LOCKED = ['#2a2b3d', '#18192a'];

// ======================================================================= glyphs (24-unit grid)

export type Glyph = (c: { bg: string }) => ReactNode;
const F = 'currentColor';
const p = (d: string, fill?: boolean) => <path d={d} fill={fill ? F : undefined} />;
const head = (cx: number, cy: number, r = 2.6) => <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.74} transform={`rotate(-22 ${cx} ${cy})`} fill={F} stroke="none" />;
const dot = (cx: number, cy: number, r = 1.4) => <circle cx={cx} cy={cy} r={r} fill={F} stroke="none" />;
const star5 = (cx: number, cy: number, r: number) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    return `${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`;
  });
  return <path d={`M${pts.join(' L')} Z`} fill={F} strokeWidth={1} />;
};
const keysGlyph: Glyph = () => (
  <>
    <rect x="2.5" y="5" width="19" height="14" rx="2" />
    {p('M7.25 12.5V19 M12 12.5V19 M16.75 12.5V19')}
    <rect x="5.6" y="5" width="3.2" height="7.5" rx=".6" fill={F} strokeWidth={1} />
    <rect x="10.4" y="5" width="3.2" height="7.5" rx=".6" fill={F} strokeWidth={1} />
    <rect x="15.2" y="5" width="3.2" height="7.5" rx=".6" fill={F} strokeWidth={1} />
  </>
);
const guitarGlyph: Glyph = ({ bg }) => (
  <>
    <circle cx="8" cy="16.5" r="5.2" fill={F} stroke="none" />
    <circle cx="12" cy="12.4" r="3.8" fill={F} stroke="none" />
    <circle cx="8.6" cy="15.6" r="1.7" fill={bg} stroke="none" />
    {p('M10.3 13.9 L19.5 4.7')}
    <rect x="18" y="1.6" width="4.4" height="3.4" rx="1" transform="rotate(45 20.2 3.3)" fill={F} stroke="none" />
    {p('M5.6 18.4 L7.4 20.2', false)}
  </>
);
const flame = (big = false) =>
  p(big ? 'M12 1.5c1 4 7 6.5 7 12.5a7 7 0 0 1-14 0c0-3.5 2.2-5.6 3.4-6.8 0 2.2 1 3.6 2.3 3.6 0-3.4-1.4-6.4 1.3-9.3z' : 'M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3-1-6 1-9z');
const calendar = (inner: ReactNode) => (
  <>
    <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
    {p('M3 9.5h18 M8 2.5v4 M16 2.5v4')}
    {inner}
  </>
);

export const GLYPHS: Record<string, Glyph> = {
  // ---------- areas
  'area:pitch': () => (
    <>
      {p('M8 2v8a4 4 0 0 0 8 0V2 M12 14v8')}
      {p('M4.5 6.5a2.5 2.5 0 0 1 0-3.5 M19.5 6.5a2.5 2.5 0 0 0 0-3.5')}
    </>
  ),
  'area:time': () => (
    <>
      {p('M8.6 3.5h6.8L19 21H5z')}
      {p('M6.5 16h11 M12 16 L17.5 5.5')}
      {dot(15.2, 9.8, 1.6)}
    </>
  ),
  'area:memory': () => (
    <>
      {p('M20 12a8 8 0 1 1-2.35-5.65')}
      {p('M20 3.5v4h-4')}
      {head(11, 14.2, 2.4)}
      {p('M13.2 13.5V7.5c1.5.3 2.5 1.2 2.8 2.4')}
    </>
  ),
  'area:voice': () => (
    <>
      <rect x="9" y="2" width="6" height="12" rx="3" fill={F} />
      {p('M5 11a7 7 0 0 0 14 0 M12 18v4 M8 22h8')}
    </>
  ),
  'area:reading': () => (
    <>
      {p('M2 5h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z M22 5h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z')}
      {p('M5 9.5h3 M5 12.5h3 M16 9.5h3 M16 12.5h3')}
    </>
  ),
  'area:creative': () => (
    <>
      {p('M11 3 L13.2 9.8 L20 12 L13.2 14.2 L11 21 L8.8 14.2 L2 12 L8.8 9.8 Z', true)}
      {p('M19 2.5v4 M17 4.5h4')}
    </>
  ),
  'area:instrument': guitarGlyph,
  'area:technique': keysGlyph,
  // ---------- skills: pitch & harmony
  'skill:degrees': () => (
    <>
      {p('M3 11.5 L12 3.5 L21 11.5 M5.5 9.5V21h13V9.5')}
      {head(11, 17, 2.2)}
      {p('M13.1 16.4V11.5')}
    </>
  ),
  'skill:intervals': () => (
    <>
      {head(7, 18.5)}
      {head(14, 6.5)}
      {p('M19 5h2v15h-2 M9.6 17.8V9.5 M16.6 5.8V3')}
      {p('M9.6 9.5 L14 8', false)}
    </>
  ),
  'skill:chords': () => (
    <>
      {head(10, 19)}
      {head(10, 13.5)}
      {head(10, 8)}
      {p('M12.6 18.3V2.5')}
      {p('M3 21h18', false)}
    </>
  ),
  'skill:cadences': () => (
    <>
      {p('M3 6c6 0 9 3.5 9 10.5 M9 13.8 L12 17 L15 13.8')}
      <rect x="18.6" y="3" width="3" height="18" rx=".5" fill={F} strokeWidth={1} />
      {p('M16 3v18')}
    </>
  ),
  'skill:modes': () => (
    <>
      <circle cx="12" cy="12" r="9" />
      {p('M12 3a9 9 0 0 0 0 18z', true)}
      <circle cx="16" cy="9" r="1.6" fill={F} stroke="none" />
    </>
  ),
  'skill:pitch': () => (
    <>
      {p('M3 17a9 9 0 0 1 18 0')}
      {p('M12 8v2 M5.6 10.6l1.4 1.4 M18.4 10.6 17 12 M3 17h2 M19 17h2')}
      {p('M12 17 L15.5 9.5')}
      {dot(12, 17, 2)}
    </>
  ),
  'skill:absolute': () => (
    <>
      {p('M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0')}
      {p('M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 0 4 0')}
    </>
  ),
  // ---------- rhythm & time
  'skill:rhythm-dictation': () => (
    <>
      <ellipse cx="12" cy="10" rx="8" ry="3" />
      {p('M4 10v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7 M7.5 12.6v6.6 M12 13v7 M16.5 12.6v6.6')}
      {p('M6 2.5 L11 9 M18 2.5 L13 9')}
    </>
  ),
  'skill:rhythm-reading': () => (
    <>
      {head(6, 18.5)}
      {head(17, 16.5)}
      {p('M8.4 17.6V5.5 M19.4 15.6V3.5')}
      {p('M8.4 5.5 L19.4 3.5 L19.4 6.5 L8.4 8.5 Z', true)}
    </>
  ),
  'skill:timing': () => (
    <>
      <circle cx="12" cy="13.5" r="8" />
      {p('M10 2h4 M12 2v3.5 M12 13.5V9 M12 13.5l3 2 M18.5 5.5l1.5-1.5')}
    </>
  ),
  'skill:tempo': () => p('M2 13h4l2.5-6 4 12 3-9 1.5 3H22'),
  'skill:meter': () => (
    <>
      {p('M4 4v16 M8.5 13v7 M13 13v7 M17.5 4v16 M22 13v7')}
      {dot(4, 4, 1.8)}
      {dot(17.5, 4, 1.8)}
    </>
  ),
  // ---------- memory & structure
  'skill:sequences': () => (
    <>
      {p('M3 17 L8 9.5 L13 13.5 L20 5')}
      {dot(3, 17, 2)}
      {dot(8, 9.5, 2)}
      {dot(13, 13.5, 2)}
      {dot(20, 5, 2)}
      {p('M3 21h18', false)}
    </>
  ),
  'skill:rhythm': () => (
    <>
      <rect x="3" y="3" width="3" height="18" rx=".5" fill={F} strokeWidth={1} />
      {p('M9 3v18')}
      {dot(13, 9, 1.7)}
      {dot(13, 15, 1.7)}
      {p('M17 6.5c2.5 1.5 2.5 9.5 0 11 M20 4.5c3.5 2.5 3.5 12.5 0 15')}
    </>
  ),
  'skill:form': () => (
    <>
      <rect x="2" y="9" width="6" height="11" rx="1.5" fill={F} />
      <rect x="9" y="4" width="6" height="16" rx="1.5" />
      <rect x="16" y="9" width="6" height="11" rx="1.5" fill={F} />
    </>
  ),
  // ---------- voice
  'skill:singing': () => (
    <>
      {head(7.5, 18, 2.8)}
      {p('M10.3 17.2V3.5c2.8.8 4.8 2.7 4.8 5.6')}
      {p('M16 15.5a3 3 0 0 0 0-4 M18.8 18a7 7 0 0 0 0-9')}
    </>
  ),
  'skill:technique': () => p('M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2 M9.6 4.6A2 2 0 1 1 11 8H2 M12.6 19.4A2 2 0 1 0 14 16H2'),
  'skill:agility': () => (
    <>
      {p('M2 15 l2.5-5 2.5 5 2.5-5 2.5 5 2.5-5 2.5 5 2.5-5 2.5 5')}
      {p('M3 20h7 M13 20h4', false)}
    </>
  ),
  // ---------- reading & theory
  'skill:notes': () => (
    <>
      {p('M2 6h20 M2 10h20 M2 14h20 M2 18h20')}
      {head(12, 12, 2.9)}
      {p('M14.7 11.2V2')}
    </>
  ),
  'skill:theory': () => (
    <>
      {p('M2 9 L12 4 L22 9 L12 14 Z', true)}
      {p('M6 11.2v5c0 1.8 2.7 3.3 6 3.3s6-1.5 6-3.3v-5 M21 9.5v6')}
    </>
  ),
  'skill:sight': () => (
    <>
      {p('M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z')}
      <circle cx="12" cy="12" r="3.4" fill={F} />
    </>
  ),
  'skill:dictation': () => (
    <>
      {p('M4 20 L5.2 15 L16 4.2 a2 2 0 0 1 2.8 0 l1 1 a2 2 0 0 1 0 2.8 L9 18.8 Z')}
      {p('M14 6.2 l3.8 3.8')}
      {p('M3 22h8', false)}
    </>
  ),
  // ---------- creative & applied
  'skill:improv': () => (
    <>
      {p('M3 4h18v12H10l-5 4.5V16H3z')}
      {head(10, 12.4, 1.9)}
      {p('M11.7 11.8V7c1.4.3 2.6 1.1 3 2.3')}
    </>
  ),
  'skill:transpose': () => p('M7 20V4 M3 8l4-4 4 4 M17 4v16 M13 16l4 4 4-4'),
  'skill:expression': () => p('M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z'),
  // ---------- instrument & sound
  'skill:instrument': () => (
    <>
      <rect x="6" y="2" width="12" height="20" rx="2" />
      {p('M6 8.5h12 M6 15h12')}
      <path d="M10 2v20 M14 2v20" strokeWidth={1.1} />
      {dot(12, 11.8, 1.9)}
      {dot(12, 5.3, 1.6)}
    </>
  ),
  'skill:timbre': () => (
    <>
      {p('M5 3v18 M12 3v18 M19 3v18')}
      <rect x="2.5" y="12" width="5" height="3.5" rx="1" fill={F} />
      <rect x="9.5" y="6" width="5" height="3.5" rx="1" fill={F} />
      <rect x="16.5" y="15" width="5" height="3.5" rx="1" fill={F} />
    </>
  ),
  // ---------- technique drill families
  'family:scales': () => (
    <>
      {p('M3 21h4v-4h4v-4h4V9h4V5h2')}
      {dot(5, 14.5)}
      {dot(9, 10.5)}
      {dot(13, 6.5)}
      {dot(17, 2.8)}
    </>
  ),
  'family:arpeggios': () => (
    <>
      {p('M3 19 q3.5-9 7 0 q3.5-11 7-2 q2.5-8 5-6')}
      {head(3, 19, 2)}
      {head(10, 19, 2)}
      {head(17, 17, 2)}
      {head(21.5, 11, 2)}
    </>
  ),
  'family:cadences': () => (
    <>
      {head(5, 19, 2.2)}
      {head(5, 14.5, 2.2)}
      {head(5, 10, 2.2)}
      {head(12, 17, 2.2)}
      {head(12, 12.5, 2.2)}
      {head(12, 8, 2.2)}
      {head(19, 19, 2.2)}
      {head(19, 14.5, 2.2)}
      {head(19, 5.5, 2.2)}
      {p('M2 22.5h20', false)}
    </>
  ),
  'family:fingers': () => p('M7 12V6.5a1.5 1.5 0 0 1 3 0V11 M10 11V4.5a1.5 1.5 0 0 1 3 0V11 M13 11V5.5a1.5 1.5 0 0 1 3 0V12 M16 12V8.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.7L3.6 15.6a1.6 1.6 0 0 1 2.6-1.8L7 15V12'),
  'family:control': () => (
    <>
      {p('M2 12 L21 4.5 M2 12 L21 19.5')}
      {p('M14 9.2v5.6 M17.5 7.8v8.4', false)}
    </>
  ),
  'family:advanced': () => (
    <>
      {head(6, 19, 2.8)}
      {head(18, 5, 2.8)}
      {p('M6 15.2C6 8.5 9.5 5.4 14 5.2 M11.3 2.7 L14.2 5.2 L11.6 8')}
      {p('M3 22.5h6 M15 2.2h6', false)}
    </>
  ),
  'family:harris': () => (
    <>
      {p('M5.5 15.5c0-6 2-10.5 6.5-10.5s6.5 4.5 6.5 10.5', true)}
      {p('M1.5 16.5c3 3 18 3 21 0')}
      {p('M12 5v3', false)}
    </>
  ),
  'family:jazz': () => (
    <>
      {p('M13 2.5h5 M15.5 2.5v11a5 5 0 0 1-10 0v-2.5h3.5v2.5a1.5 1.5 0 0 0 3 0V2.5')}
      {dot(15.5, 6.5, 1.3)}
      {dot(15.5, 10, 1.3)}
      {p('M4.5 11h5.5')}
    </>
  ),
  'family:voicings': () => (
    <>
      {p('M8 3c-2.2 0-2.2 2.4-2.2 4.4S5 12 3 12c2 0 2.8 2.6 2.8 4.6S5.8 21 8 21')}
      {head(12.5, 18, 2.3)}
      {head(16.5, 14, 2.3)}
      {head(12.5, 10, 2.3)}
      {head(16.5, 6, 2.3)}
      {p('M19 17.3V3', false)}
    </>
  ),
  'family:accomp': () => (
    <>
      {head(4, 19.5, 2.2)}
      {head(9.5, 9, 2)}
      {head(9.5, 5, 2)}
      {head(15, 18, 2.2)}
      {head(20.5, 9, 2)}
      {head(20.5, 5, 2)}
      {p('M4 16 L9 11.5 M15 14.5 L20 11.5', false)}
    </>
  ),
  'family:guitar': guitarGlyph,
  // Final bass check: the bass families' badges (b-…) get the bass clef instead of the generic note.
  'family:bass': () => (
    <>
      {p('M5.5 8.5c1.5-3.5 8-4.5 9 .5.8 4.4-3.6 8.6-9.5 10.5')}
      {dot(6.6, 8.6, 1.9)}
      {dot(18, 7.4)}
      {dot(18, 12)}
    </>
  ),
  // ---------- guitar drill families
  'family:g-fretting': () => (
    <>
      {/* a fingertip pressing a string just behind the fret */}
      <path d="M1.5 19h21 M6 15v8 M18 15v8" strokeWidth={1.2} />
      {p('M9.4 17.2 L14.6 3.6a2.3 2.3 0 0 1 4.3 1.6 L14 18.4a2.6 2.6 0 0 1-4.6-1.2z')}
      {p('M15.4 5.7l2.3.9', false)}
      {p('M7 13.5l-2-1.5 M8.3 11.2 6.6 9.2', false)}
    </>
  ),
  'family:g-picking': () => (
    <>
      {/* a pick between a down- and an up-stroke */}
      {p('M12 21c-2.7-3-6-7.6-6-11.4C6 6.5 8.7 4.5 12 4.5s6 2 6 5.1c0 3.8-3.3 8.4-6 11.4z', true)}
      {p('M2.5 3v9 M.8 10.3 L2.5 12 L4.2 10.3 M21.5 21v-9 M19.8 13.7 L21.5 12 L23.2 13.7')}
    </>
  ),
  'family:g-legato': () => (
    <>
      {/* hammer-on / pull-off: notes tied by a slur */}
      {head(5.5, 18.5, 2.4)}
      {head(12, 15, 2.4)}
      {head(18.5, 18.5, 2.4)}
      {p('M3.5 13c3-5.5 13-5.5 17 0')}
      <path d="M1.5 22h21" strokeWidth={1.1} />
    </>
  ),
  'family:g-scales': () => (
    <>
      {/* a pentatonic box on the neck */}
      <path d="M2 4.5h20 M2 8.5h20 M2 12.5h20 M2 16.5h20 M2 20.5h20" strokeWidth={0.9} />
      <path d="M7 3v19 M13 3v19 M19 3v19" strokeWidth={1.4} />
      {dot(4.2, 4.5, 1.7)}
      {dot(16, 4.5, 1.7)}
      {dot(4.2, 8.5, 1.7)}
      {dot(10, 8.5, 1.7)}
      {dot(4.2, 12.5, 1.7)}
      {dot(10, 12.5, 1.7)}
      {dot(4.2, 16.5, 1.7)}
      {dot(16, 16.5, 1.7)}
      {dot(4.2, 20.5, 1.7)}
      {dot(10, 20.5, 1.7)}
    </>
  ),
  'family:g-arps': () => (
    <>
      {/* an arpeggio climbing across the strings */}
      <path d="M2 5h20 M2 9.5h20 M2 14h20 M2 18.5h20" strokeWidth={0.9} />
      {p('M4 18.5 L9.5 14 L14.5 9.5 L19.5 5')}
      {dot(4, 18.5, 2)}
      {dot(9.5, 14, 2)}
      {dot(14.5, 9.5, 2)}
      {dot(19.5, 5, 2)}
    </>
  ),
  'family:g-chords': () => (
    <>
      {/* a chord box: nut, strings, frets, finger dots, open strings */}
      {p('M4 6h16')}
      <path d="M4 6v16 M7.2 6v16 M10.4 6v16 M13.6 6v16 M16.8 6v16 M20 6v16 M4 11.3h16 M4 16.6h16 M4 21.9h16" strokeWidth={0.9} />
      {dot(10.4, 8.7, 2)}
      {dot(13.6, 14, 2)}
      {dot(16.8, 8.7, 2)}
      <circle cx="4" cy="2.6" r="1.1" strokeWidth={1.1} />
      <circle cx="20" cy="2.6" r="1.1" strokeWidth={1.1} />
    </>
  ),
  'family:g-rhythm': () => (
    <>
      {/* strum arrows: down, up, down */}
      {p('M4 3v16 M1.3 16 L4 19 L6.7 16 M12 21V5 M9.3 8 L12 5 L14.7 8 M20 3v16 M17.3 16 L20 19 L22.7 16')}
      {p('M3 22h2 M19 22h2', false)}
    </>
  ),
  'family:g-lead': () => (
    <>
      {/* a bend: the note pushed up to pitch */}
      {p('M2.5 20.5h7c3.6 0 5.5-3 5.5-7.5V4')}
      {p('M11.5 7.5 L15 4 L18.5 7.5')}
      {dot(2.5, 20.5, 1.8)}
      <path d="M18 13h4.5" strokeWidth={1.2} strokeDasharray="1.2 1.6" />
    </>
  ),
  'family:g-fingerstyle': () => (
    <>
      {/* p-i-m-a: the thumb on the bass, three fingers on the trebles */}
      <path d="M2 4h20 M2 7.5h20 M2 11h20 M2 14.5h20 M2 18h20 M2 21.5h20" strokeWidth={0.8} />
      <ellipse cx="5" cy="19.6" rx="3" ry="2.2" fill={F} stroke="none" />
      {dot(11, 11, 1.8)}
      {dot(15, 7.5, 1.8)}
      {dot(19, 4, 1.8)}
      {p('M5 17 C7 13 9 12 11 11 M11 11 L15 7.5 L19 4', false)}
    </>
  ),
  'family:g-flamenco': () => (
    <>
      {/* rasgueado: the hand opening like a fan */}
      {p('M12 21 L3 10 M12 21 L6.6 5.6 M12 21 V3.5 M12 21 L17.4 5.6 M12 21 L21 10')}
      {p('M3 10c1.5-4 5-6.5 9-6.5s7.5 2.5 9 6.5')}
      {dot(12, 21, 2)}
    </>
  ),
  'family:g-jazz': ({ bg }) => (
    <>
      {/* an archtop with f-hole */}
      <circle cx="8.6" cy="15.8" r="5.8" fill={F} stroke="none" />
      <circle cx="12.6" cy="11.6" r="4.2" fill={F} stroke="none" />
      <path d="M6.8 19.2c1.6-.6 1-2.8 2.4-3.5 1.4-.7 1.3-2.9 2.6-3.6" stroke={bg} strokeWidth={1.2} fill="none" />
      {p('M14.5 9.8 L20 4.3')}
      <rect x="18.4" y="1.4" width="4.2" height="3.4" rx="1" transform="rotate(45 20.5 3.1)" fill={F} stroke="none" />
      <path d="M3.4 20.6 L5.2 18.6" stroke={bg} strokeWidth={1.4} />
    </>
  ),
  'family:g-reading': () => (
    <>
      {/* TAB: the letters beside the six lines */}
      {p('M2.5 3h4.5 M4.75 3v5.5')}
      {p('M2.5 15.5 L4.75 10 L7 15.5 M3.4 13.4h2.7')}
      {p('M3 17.5v5h2.4a1.25 1.25 0 0 0 0-2.5H3h2.1a1.25 1.25 0 0 0 0-2.5z')}
      <path d="M10 3.5h12 M10 7.2h12 M10 10.9h12 M10 14.6h12 M10 18.3h12 M10 22h12" strokeWidth={0.9} />
      {dot(13.5, 7.2, 1.7)}
      {dot(18.5, 14.6, 1.7)}
      {dot(18.5, 3.5, 1.7)}
    </>
  ),
  'family:g-impro': () => (
    <>
      {/* a target note in the cross-hairs */}
      <circle cx="12" cy="12" r="7.5" />
      {p('M12 1.5v4 M12 18.5v4 M1.5 12h4 M18.5 12h4')}
      {head(11, 14, 2.3)}
      {p('M13.1 13.4V8.5', false)}
    </>
  ),
  // GUITAR_DEEPENING: the guitarist's ear (an ear over three strings), Barry Harris on the neck (a chord and the
  // diminished circle on the strings), prog (a 7/8 bar of three groups).
  'family:g-ear': () => (
    <>
      {p('M8 10c0-4 2.5-6 5-6s5 2 5 5.5c0 3-2.5 3.6-3 6 M11 10c0-1.6 1-2.6 2.2-2.6s2.2 1 2.2 2.4')}
      <path d="M2 17.5h20 M2 20h20 M2 22.5h20" strokeWidth={0.9} />
    </>
  ),
  'family:g-harris': () => (
    <>
      <path d="M2 5h20 M2 10h20 M2 15h20 M2 20h20" strokeWidth={0.8} />
      {dot(6, 15, 1.8)}
      {dot(9, 10, 1.8)}
      {dot(6, 5, 1.8)}
      <circle cx={17} cy={12.5} r={3.6} fill="none" />
      {p('M17 8.9v-2.4', false)}
    </>
  ),
  'family:g-prog': () => (
    <>
      {p('M2 20h20 M2 4v16 M22 4v16')}
      {head(5, 15, 2)}
      {head(9, 15, 2)}
      {head(13, 13, 2)}
      {head(17, 13, 2)}
      {head(20, 11, 1.8)}
      {p('M6.8 14.4V7 M10.8 14.4V7 M6.8 7h4 M14.8 12.4V5 M18.8 12.4V5 M21.6 10.4V5 M14.8 5h6.8', false)}
    </>
  ),
  // The pianist's ear (PIANO_AUDIT §3): an ear over three keys.
  // PIANO_JAZZ: a block chord beside the diminished circle; a running line to a landing; one chord turning into another.
  'family:k-sixdim': () => (
    <>
      {head(7, 19, 2.2)}
      {head(7, 14.5, 2.2)}
      {head(7, 10, 2.2)}
      {head(7, 5.5, 2.2)}
      {p('M9.6 18.6V3', false)}
      <circle cx={17.5} cy={8} r={3.2} fill="none" />
    </>
  ),
  'family:k-bebop': () => (
    <>
      {head(4, 9, 2)}
      {head(9, 12, 2)}
      {head(14, 15, 2)}
      {p('M5.8 8.4V3 M10.8 11.4V5 M15.8 14.4V7 M5.8 3l10 4', false)}
      {dot(20, 20, 1.8)}
    </>
  ),
  'family:k-reharm': () => (
    <>
      {head(5, 18, 2.2)}
      {head(5, 13.5, 2.2)}
      {head(18, 19, 2.2)}
      {head(18, 14.5, 2.2)}
      {head(18, 10, 2.2)}
      {p('M4 8c1-5 10-6 12-1 M13.5 6.4l2.6 1 .9-2.8', false)}
    </>
  ),
  // AUDIT-CONTENT-THEORY R-1/R-2/R-4: five heads over four (the keys' rhythm & meter); three big heads over two across a
  // bar line (the guitar's meter & cross-rhythm).
  'family:k-rhythm': () => (
    <>
      {p('M2 12h20', false)}
      {head(3, 7, 1.6)}
      {head(7.5, 7, 1.6)}
      {head(12, 7, 1.6)}
      {head(16.5, 7, 1.6)}
      {head(21, 7, 1.6)}
      {head(3, 17, 1.6)}
      {head(8.6, 17, 1.6)}
      {head(14.2, 17, 1.6)}
      {head(19.8, 17, 1.6)}
    </>
  ),
  'family:g-meter': () => (
    <>
      {p('M12 2v20', false)}
      {head(4, 7, 2)}
      {head(12, 7, 2)}
      {head(20, 7, 2)}
      {head(4, 17, 2)}
      {head(16, 17, 2)}
    </>
  ),
  'family:k-ear': () => p('M8 9c0-4 2.5-6 5-6s5 2 5 5.5c0 3-2.5 3.6-3 6 M11 9c0-1.6 1-2.6 2.2-2.6s2.2 1 2.2 2.4 M3 15h18v6H3z M9 15v6 M15 15v6'),
  // Drums (DRUMS_AUDIT I2): a snare drum and two sticks.
  'family:drums': () => p('M4 11c0 1.7 3.6 3 8 3s8-1.3 8-3-3.6-3-8-3-8 1.3-8 3z M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6 M8 13.7v6 M12 14v6.2 M16 13.7v6 M5 3l6.5 6.5 M19 3l-6.5 6.5'),
  'family:g-bass': () => (
    <>
      {/* bass clef */}
      {dot(5.5, 8.2, 2.3)}
      {p('M3.6 8.6C3.4 5.3 6.3 3 10 3c4 0 6.5 2.6 6.5 6.4 0 6-5.4 10.6-12.5 12.8')}
      {dot(20.2, 6.4, 1.5)}
      {dot(20.2, 12, 1.5)}
    </>
  ),
  // ---------- guitar specials
  'tech:g-bend-tune': () => (
    <>
      {p('M2.5 21h6c3.4 0 5-2.8 5-7V10')}
      {dot(2.5, 21, 1.8)}
      <circle cx="13.5" cy="6.5" r="4.5" />
      {dot(13.5, 6.5, 1.6)}
      {p('M19.5 3.5 L21.5 1.5 M20 6.5h2.5 M19.5 9.5 L21.5 11.5', false)}
    </>
  ),
  'tech:g-vibrato': () => (
    <>
      {p('M2 12c1-1.6 2-1.6 3 0s2 1.6 3 0 2-3 3.5-3 2.5 6 4 6 2.5-9 4-9 1.5 4.5 2.5 6')}
      {head(4, 19.5, 2.2)}
      {p('M6.2 18.9V14.5', false)}
    </>
  ),
  'tech:g-five-boxes': () => (
    <>
      <rect x="1.5" y="13" width="5.4" height="7" rx="1" fill={F} />
      <rect x="5.8" y="9" width="5.4" height="7" rx="1" />
      <rect x="10.1" y="13" width="5.4" height="7" rx="1" fill={F} />
      <rect x="14.4" y="9" width="5.4" height="7" rx="1" />
      <rect x="17.1" y="3.5" width="5.4" height="7" rx="1" fill={F} />
    </>
  ),
  'tech:g-caged': () => (
    <>
      {/* an open cage door */}
      {p('M3 6h11v16H3z M6.6 6v16 M10.3 6v16')}
      {p('M14 6 L21 3.5 V19.5 L14 22')}
      {p('M3 6c0-2.5 2.5-4 5.5-4s5.5 1.5 5.5 4', false)}
      {dot(18.6, 12.6, 1.2)}
    </>
  ),
  'tech:g-changes-30': () => (
    <>
      {p('M4.5 10a8 8 0 0 1 13.8-3.6 M18.5 2.5v4h-4 M19.5 14a8 8 0 0 1-13.8 3.6 M5.5 21.5v-4h4')}
      {dot(9, 12, 1.6)}
      {dot(15, 12, 1.6)}
    </>
  ),
  'tech:g-changes-60': () => (
    <>
      <circle cx="12" cy="13.5" r="8" />
      {p('M10 2h4 M12 2v3.5 M18.5 5.5l1.5-1.5')}
      {p('M13 7.5 L9.5 14h3.2L11 19.5 L15 12.5h-3.2z', true)}
    </>
  ),
  'tech:g-barre': () => (
    <>
      <path d="M4 2v20 M7.2 2v20 M10.4 2v20 M13.6 2v20 M16.8 2v20 M20 2v20" strokeWidth={0.9} />
      <rect x="2" y="5.5" width="20" height="4" rx="2" fill={F} />
      {dot(13.6, 15, 2)}
      {dot(10.4, 19.5, 2)}
    </>
  ),
  'tech:g-jukebox': () => (
    <>
      {p('M4 22V10a8 8 0 0 1 16 0v12z M7.5 22v-9.5a4.5 4.5 0 0 1 9 0V22')}
      {p('M10 15.5h4 M10 18.5h4', false)}
      {head(11.4, 9, 1.4)}
      {p('M12.6 8.6V5.8', false)}
    </>
  ),
  'tech:g-bassist': () => (
    <>
      {/* a jeans pocket with a bass note in it */}
      {p('M3.5 3h17v10.5L12 21l-8.5-7.5z')}
      <path d="M3.5 7h17" strokeWidth={1.1} strokeDasharray="1.4 1.4" />
      {head(10.6, 14.3, 2.2)}
      {p('M12.7 13.6V9.8', false)}
    </>
  ),
  // ---------- technique specials
  keys: () => (
    <>
      <circle cx="12" cy="12" r="9.5" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        const r1 = i % 3 ? 7.6 : 6.6;
        return <path key={i} d={`M${(12 + r1 * Math.sin(a)).toFixed(2)} ${(12 - r1 * Math.cos(a)).toFixed(2)} L${(12 + 8.6 * Math.sin(a)).toFixed(2)} ${(12 - 8.6 * Math.cos(a)).toFixed(2)}`} strokeWidth={1.4} />;
      })}
      {p('M12 12V6.5 M12 12l3.5 2')}
      {dot(12, 12, 1.4)}
    </>
  ),
  'tech:even-3': () => p('M12 3v17 M6 21h12 M3.5 7h17 M12 4.5 M3.5 7 L1 14a3 2 0 0 0 5 0z M20.5 7 L18 14a3 2 0 0 0 5 0z'),
  'tech:even-2': () => (
    <>
      <circle cx="12" cy="12" r="6.5" />
      {p('M9 5.8 L9.6 2h4.8l.6 3.8 M9 18.2 L9.6 22h4.8l.6-3.8 M12 12V8.5 M12 12l2.4 1.5 M18.5 12h1.5')}
    </>
  ),
  'tech:clean-10': () => (
    <>
      {p('M10 3 L11.8 8.2 L17 10 L11.8 11.8 L10 17 L8.2 11.8 L3 10 L8.2 8.2 Z', true)}
      {p('M18.5 14 L19.4 16.6 L22 17.5 L19.4 18.4 L18.5 21 L17.6 18.4 L15 17.5 L17.6 16.6 Z', true)}
      {p('M18.5 3v3.5 M16.75 4.75h3.5')}
    </>
  ),
  'tech:clean-100': () => (
    <>
      <circle cx="12" cy="12" r="9.5" />
      {p('M7.5 12.3 L10.6 15.4 L16.8 8.8')}
    </>
  ),
  'tech:clean-1000': () => (
    <>
      {p('M12 2.5 L2.5 8h19z', true)}
      {p('M5.5 10.5v8 M9.8 10.5v8 M14.2 10.5v8 M18.5 10.5v8 M3 21.5h18')}
    </>
  ),
  // Licks & transcription (SPEC-LICKS-TRANSCRIPTION).
  'tech:lick-first': () => (
    <>
      {head(6, 16)}
      {head(12, 11)}
      {p('M8.4 15.5V6 M14.4 10.5V3 M8.4 6 L14.4 3')}
    </>
  ),
  'tech:lick-10': () => (
    <>
      {head(4.5, 17, 2.2)}
      {head(10, 13, 2.2)}
      {head(15.5, 9, 2.2)}
      {p('M6.6 16.5V8 M12.1 12.5V5 M17.6 8.5V2.5 M6.6 8 L17.6 2.5')}
      {p('M3 21h18')}
    </>
  ),
  'tech:lick-12keys': () => (
    <>
      <circle cx="12" cy="12" r="9" strokeDasharray="2.2 2.5" />
      {head(10, 14)}
      {p('M12.4 13.5V6')}
      {dot(12, 3, 1.2)}
    </>
  ),
  'tech:tx-first': () => (
    <>
      {p('M6 10a5 5 0 0 1 10 0c0 3-3 3-3 6a2 2 0 0 1-4 0')}
      {p('M3 21h18')}
      {head(18.5, 17.5, 2)}
    </>
  ),
  'tech:tx-bebop': () => (
    <>
      {p('M5 9a5 5 0 0 1 10 0c0 3-3 3-3 6a2 2 0 0 1-4 0')}
      {star5(18.5, 6, 3.6)}
      {p('M3 21h18')}
    </>
  ),
  'tech:tempo-1': () => p('M2.5 6 L11 12 L2.5 18 Z M12.5 6 L21 12 L12.5 18 Z', true),
  'tech:tempo-25': () => (
    <>
      {p('M12 2c3.8 2.8 5 7.5 4 13h-8c-1-5.5.2-10.2 4-13z')}
      <circle cx="12" cy="9" r="1.9" fill={F} stroke="none" />
      {p('M8.2 12.5 L5 16.5 L8.5 16 M15.8 12.5 L19 16.5 L15.5 16 M10 18.5l-.5 3 M14 18.5l.5 3 M12 18.5v3')}
    </>
  ),
  'tech:tempo-100': () => p('M13.5 2 L4.5 13.5h7L10.5 22l9-11.5h-7z', true),
  // ---------- specials
  'special:hat-trick': () => (
    <>
      <rect x="7" y="3" width="10" height="12.5" rx="1" fill={F} />
      {p('M2.5 16.5h19')}
      {p('M7 12.5h10', false)}
      {dot(6, 20.5, 1.2)}
      {dot(12, 20.5, 1.2)}
      {dot(18, 20.5, 1.2)}
    </>
  ),
  'special:fortnight': () => flame(),
  // Game badges (engine/gameBadges.ts): one drawn glyph per game.
  // Time Lock: a clock face with the bar lines of a silent bar.
  'special:game:time-lock': () => (
    <>
      <circle cx="12" cy="12" r="9" />
      {p('M12 6.5V12l3.5 2.5')}
      {p('M5 21.5h14', false)}
    </>
  ),
  // Ghost Control: one accent and two small ghost notes in brackets.
  'special:game:ghost-control': () => (
    <>
      {head(6, 16, 2.8)}
      {p('M8.6 15.4V5 M5.5 4 L9 6.5')}
      {p('M12.5 13.5 l-1 2 l1 2 M21.5 13.5 l1 2 l-1 2')}
      {head(15, 16, 1.6)}
      {head(19, 16, 1.6)}
    </>
  ),
  // Rudiment Rush: two crossed sticks over R L R R.
  'special:game:rudiment-rush': () => (
    <>
      {p('M4 3 L15 16 M20 3 L9 16')}
      {dot(15.6, 16.7, 1.6)}
      {dot(8.4, 16.7, 1.6)}
      {p('M3 21h3 M8 21h3 M13 21h3 M18 21h3', false)}
    </>
  ),
  // Groove-off: two hi-hat cymbals facing each other — the duel.
  'special:game:groove-off': () => (
    <>
      {p('M2.5 9 L9.5 7 L9.5 11 Z', true)}
      {p('M21.5 9 L14.5 7 L14.5 11 Z', true)}
      {p('M6 10v10 M18 10v10 M3.5 20h5 M15.5 20h5')}
      {p('M12 4v4 M12 12v2', false)}
    </>
  ),
  // Voicing Spy: a magnifier over a stacked chord.
  'special:game:rush-voicing': () => (
    <>
      <circle cx="10" cy="10" r="6.5" />
      {p('M14.8 14.8 L21 21')}
      {dot(10, 13, 1.5)}
      {dot(10, 10, 1.5)}
      {dot(10, 7, 1.5)}
    </>
  ),
  // Scale & Mode Rush: a stair of notes with a timer tick.
  'special:game:rush-scale': () => (
    <>
      {head(4.5, 19, 1.9)}
      {head(9, 15, 1.9)}
      {head(13.5, 11, 1.9)}
      {head(18, 7, 1.9)}
      {p('M16 2.5h5 M18.5 2.5v2', false)}
    </>
  ),
  // Name That Standard: a lead sheet with a question bar.
  'special:game:rush-standard': () => (
    <>
      {p('M3 8h18M3 16h18')}
      {p('M3 5v14M21 5v14M12 5v14', false)}
      {p('M6 13 L9 11 M15 10.5c0-1.6 3-1.6 3 0 0 1.2-1.5 1.3-1.5 2.6')}
      {dot(16.5, 15, 0.9)}
    </>
  ),
  // Reharm Spotter: one bar crossed to another — a substitution arrow.
  'special:game:reharm': () => (
    <>
      {p('M3 6v12 M12 6v12 M21 6v12', false)}
      {p('M5 15 Q12 4 19 15')}
      {p('M16.5 14.5 L19 15 L19.5 12.3')}
    </>
  ),
  // Transcription Race: a pencil over a stave line.
  'special:game:transcribe': () => (
    <>
      {p('M3 19h18', false)}
      {p('M6 16 L16.5 5.5 L19 8 L8.5 18.5 L5.5 19 Z')}
      {p('M14.5 7.5 L17 10')}
    </>
  ),
  // Barry Harris in Time: a diminished circle and a beat tick.
  'special:game:bhtime': () => (
    <>
      <circle cx="10" cy="11" r="6" />
      {p('M18 4v16', false)}
      {p('M16 20h4')}
      {dot(10, 11, 1.4)}
    </>
  ),
  // Odd-Meter Riff Echo: 7 marks grouped 2+2+3 with an echo arc.
  'special:game:riffecho': () => (
    <>
      {p('M3 15v4 M6 15v4 M10 15v4 M13 15v4 M17 15v4 M19.5 15v4 M22 15v4')}
      {p('M5 10 Q12 3 19 10')}
      {p('M8 11.5 Q12 7.5 16 11.5', false)}
    </>
  ),
  // Polyrhythm Lock: 3 dots over 2 dots, joined by a lock bar.
  'special:game:polylock': () => (
    <>
      {dot(4, 7, 1.6)}
      {dot(12, 7, 1.6)}
      {dot(20, 7, 1.6)}
      {dot(4, 17, 1.6)}
      {dot(16, 17, 1.6)}
      {p('M4 3v18', false)}
      {p('M2 12h20')}
    </>
  ),
  // Game tiers (GAMES_TIERS_PLAN): a crescendo hairpin over a bar line — getting louder, level by level.
  'special:tier': () => (
    <>
      {p('M3 12 L20 6 M3 12 L20 18')}
      {p('M21.5 4v16', false)}
    </>
  ),
  // First session (SPEC-COURSE-START): the downbeat — a bar line, one note on beat 1 and its tick.
  'special:first': () => (
    <>
      {p('M3 5v14')}
      {p('M3 12h18', false)}
      <ellipse cx="9.5" cy="15" rx="2.6" ry="2" fill={F} stroke="none" />
      {p('M12 15V6')}
      {p('M15 9.5l2.2 2.2L21 7')}
    </>
  ),
  // Repertoire (SPEC-REPERTOIRE): a lead sheet — two stave lines, bar lines and a chord slash.
  'special:rep': () => (
    <>
      {p('M3 9h18M3 15h18')}
      {p('M3 6v12M21 6v12', false)}
      {p('M9 17 L14 7')}
    </>
  ),
  'special:half-century': ({ bg }) => (
    <>
      {flame(true)}
      <path d="M12 21.5a3.5 3.5 0 0 1-3.5-3.5c0-2.3 2.2-3.4 2.6-5.5 1.6 1.3 4.4 3.1 4.4 5.5a3.5 3.5 0 0 1-3.5 3.5z" fill={bg} stroke="none" />
    </>
  ),
  'special:two-hundred': () => (
    <>
      {p('M7 3h10v6a5 5 0 0 1-10 0z', true)}
      {p('M7 5H3.5c0 3 1.5 4.8 3.8 5.3 M17 5h3.5c0 3-1.5 4.8-3.8 5.3 M12 14v4 M7.5 21.5h9 M9 18h6v3.5H9z')}
    </>
  ),
  'special:weekly-ritual': () => calendar(p('M8 15 L11 18 L16.5 12.5')),
  'special:iron-routine': () => (
    <>
      <rect x="3.5" y="6.5" width="3.5" height="11" rx="1" fill={F} />
      <rect x="17" y="6.5" width="3.5" height="11" rx="1" fill={F} />
      {p('M1 9.5v5 M23 9.5v5 M7 12h10')}
    </>
  ),
  'special:seven-seas': () => (
    <>
      <circle cx="12" cy="12" r="9.5" />
      {p('M15.6 8.4 L13.4 13.4 L8.4 15.6 L10.6 10.6 Z', true)}
      {p('M12 1.5v2 M12 20.5v2 M1.5 12h2 M20.5 12h2', false)}
    </>
  ),
  'special:swiss-army-ears': () => (
    <>
      <rect x="2.5" y="8" width="19" height="13" rx="2" />
      {p('M8 8V5a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 16 5v3 M2.5 13.5h19')}
      <rect x="10" y="11.5" width="4" height="4" rx="1" fill={F} />
    </>
  ),
  'special:dawn-chorus': () => (
    <>
      {p('M5.5 17a6.5 6.5 0 0 1 13 0z', true)}
      {p('M2 20.5h20 M12 3.5v3 M4.2 8.2l2 2 M19.8 8.2l-2 2 M1.5 15h2 M20.5 15h2')}
    </>
  ),
  'special:midnight-jazz': ({ bg }) => (
    <>
      {p('M4.5 3.5 L8 7h8l3.5-3.5V15a7.5 7.5 0 0 1-15 0z', true)}
      <circle cx="9" cy="11" r="2.7" fill={bg} stroke="none" />
      <circle cx="15" cy="11" r="2.7" fill={bg} stroke="none" />
      <circle cx="9" cy="11" r="1.1" fill={F} stroke="none" />
      <circle cx="15" cy="11" r="1.1" fill={F} stroke="none" />
      <path d="M11 14 L12 15.8 L13 14 Z" fill={bg} stroke="none" />
    </>
  ),
  'special:weekend-warrior': () => (
    <>
      {p('M12 2 l8.5 3v6.5c0 5-3.6 8.8-8.5 10.5-4.9-1.7-8.5-5.5-8.5-10.5V5z')}
      {star5(12, 11.5, 5)}
    </>
  ),
  'special:marathon': () => (
    <>
      {p('M5 22V3')}
      {p('M5 3.5h14l-3 4.5 3 4.5H5z', true)}
    </>
  ),
  'special:bullseye-day': () => (
    <>
      <circle cx="11" cy="13" r="9" />
      <circle cx="11" cy="13" r="5" />
      {dot(11, 13, 1.8)}
      {p('M11 13 L21 3 M17 2.5 L21 3 L21.5 7')}
    </>
  ),
  'special:grand-tour': () => (
    <>
      {p('M2.5 6 l6.5-2.5 6 2.5 6.5-2.5v14.5l-6.5 2.5-6-2.5-6.5 2.5z M9 3.5v14.5 M15 6v14.5')}
      {p('M5 11.5 l2 1.5 M17.5 9.5 l1.5 2 -1.5 1.5', false)}
    </>
  ),
  'special:renaissance': () => (
    <>
      <circle cx="12" cy="12" r="8.2" />
      {Array.from({ length: 7 }, (_, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 7;
        return <circle key={i} cx={12 + 8.2 * Math.cos(a)} cy={12 + 8.2 * Math.sin(a)} r={2} fill={F} stroke="none" />;
      })}
      {dot(12, 12, 2.4)}
    </>
  ),
  'special:hall-of-fame': () => (
    <>
      {p('M3 17.5 L2 6.5 L8 11 L12 3.5 L16 11 L22 6.5 L21 17.5 Z', true)}
      {p('M3.5 21h17')}
    </>
  ),
  // ---------- seasons
  'season:first': () => p('M12 21.5v-9 M12 12.5C12 8 9 6 4 6c0 4.5 3 6.5 8 6.5 M12 10.5c0-3.5 2.4-5.5 7-5.5 0 3.5-2.4 5.5-7 5.5'),
  'season:three': () => p('M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z M2 21c0-3 1.9-5.4 5.2-6.2'),
  'season:vivaldi': () => (
    <>
      {p('M12 8.5c-2.6 0-4.2 1.2-4.2 3 0 1 .9 1.6.9 2.5S7 15.5 7 17.5c0 2.6 2.3 4 5 4s5-1.4 5-4c0-2-1.7-2.6-1.7-3.5s.9-1.5.9-2.5c0-1.8-1.6-3-4.2-3z', true)}
      {p('M12 2v15 M10.3 17.5h3.4 M12 2a1.6 1.6 0 1 1 1.6 1.6')}
    </>
  ),
  'season:full-rotation': () => (
    <>
      <circle cx="12" cy="10" r="7.5" />
      {p('M12 2.5v15 M4.5 10h15 M6.7 4.7l10.6 10.6 M17.3 4.7 6.7 15.3 M8 22 L12 10 L16 22 M6 22h12')}
    </>
  ),
  'season:year': () =>
    calendar(
      <>
        {[7, 12, 17].flatMap((x) => [13.5, 17.5].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.2} fill={F} stroke="none" />))}
      </>,
    ),
  'season:gold-rush': () => (
    <>
      {p('M3 9.5C6.5 4.5 17.5 4.5 21 9.5 C17 7.8 7 7.8 3 9.5Z', true)}
      {p('M12 6.5 V22')}
    </>
  ),
  'season:golden-trio': () => (
    <>
      {star5(12, 7, 5.2)}
      {star5(6, 17, 4.6)}
      {star5(18, 17, 4.6)}
    </>
  ),
};
const FALLBACK: Glyph = () => (
  <>
    {head(9, 17, 3)}
    {p('M11.8 16.2V3.5c3 .8 5.2 2.8 5.2 6')}
  </>
);

/** Register a glyph for a (new) drill family, e.g. registerFamilyGlyph('g-strum', myGlyph). */
export function registerFamilyGlyph(family: string, glyph: Glyph) {
  GLYPHS[`family:${family}`] = glyph;
}

/** The registry key a badge's glyph is looked up by. */
export function glyphKeyOf(b: Pick<Badge, 'id' | 'cat' | 'group'>): string {
  const [pre, a, b2] = b.id.split(':');
  switch (pre) {
    case 'area':
      return `area:${a}`;
    case 'skill':
      return `skill:${a}`;
    case 'sub':
      return `skill:${b.group ?? a.split('/')[0]}`;
    case 'tech-keys':
      return 'keys';
    case 'tech':
      return b2 !== undefined ? `family:${a}` : `tech:${a}`;
    case 'special':
      // Game badges: one glyph per game, whatever the tier (special:game:<game>:<tier>).
      return a === 'game' && b2 ? `special:game:${b2}` : b.id;
    default:
      return b.id;
  }
}
export function resolveGlyph(b: Pick<Badge, 'id' | 'cat' | 'group'>): { key: string; glyph: Glyph; fallback: boolean } {
  const key = glyphKeyOf(b);
  const hit = GLYPHS[key];
  if (hit) return { key, glyph: hit, fallback: false };
  // Guitar drill families ('g-…') and any other unknown family: the generic guitar / note glyph.
  if (key.startsWith('family:g-')) return { key, glyph: GLYPHS['family:guitar'], fallback: false };
  if (key.startsWith('family:b-')) return { key, glyph: GLYPHS['family:bass'], fallback: false };
  if (key.startsWith('special:tier')) return { key, glyph: GLYPHS['special:tier'], fallback: false };
  if (key.startsWith('special:rep:')) return { key, glyph: GLYPHS['special:rep'], fallback: false };
  if (key.startsWith('special:first:')) return { key, glyph: GLYPHS['special:first'], fallback: false };
  return { key, glyph: FALLBACK, fallback: true };
}

// ======================================================================= pips (sub-skill index, technique level)

let subIndex: Map<string, { i: number; n: number }> | null = null;
function subPip(id: string): { i: number; n: number } | null {
  if (!subIndex) {
    subIndex = new Map();
    const per = new Map<string, number>();
    for (const s of SUB_SKILLS) per.set(s.skill, (per.get(s.skill) ?? 0) + 1);
    const seen = new Map<string, number>();
    for (const s of SUB_SKILLS) {
      const i = seen.get(s.skill) ?? 0;
      seen.set(s.skill, i + 1);
      subIndex.set(`sub:${s.id}`, { i, n: per.get(s.skill)! });
    }
  }
  return subIndex.get(id) ?? null;
}
const techLevel = (id: string): number | null => {
  const m = /^tech:[^:]+:(\d+)$/.exec(id);
  return m ? Number(m[1]) : null;
};

// ======================================================================= frames

const C = 50;
const scaleAt = (s: number, cx = C, cy = C) => `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`;
const polar = (n: number, r1: number, r2: number, cx = C, cy = C, rot = -Math.PI / 2) =>
  'M' +
  Array.from({ length: n * 2 }, (_, i) => {
    const a = rot + (i * Math.PI) / n;
    const r = i % 2 ? r2 : r1;
    return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' L') +
  ' Z';

interface FrameSpec {
  /** Outer metal shape. */
  outer: string;
  /** Face shape (enamel), already in place. */
  face: string;
  /** Glyph centre and scale (24-unit glyph → 24·s). */
  g: [number, number, number];
}
const SHIELD = 'M50 5 L87 15 L87 47 C87 71 71 87 50 96 C29 87 13 71 13 47 L13 15 Z';
const HEX = 'M50 5 L89 27.5 L89 72.5 L50 95 L11 72.5 L11 27.5 Z';
const PLAQUE = 'M22 10 H78 A14 14 0 0 1 92 24 V76 A14 14 0 0 1 78 90 H22 A14 14 0 0 1 8 76 V24 A14 14 0 0 1 22 10 Z';
const circ = (cx: number, cy: number, r: number) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
const STAR = polar(16, 47, 39);
const FRAMES: Record<BadgeCat, FrameSpec> = {
  area: { outer: SHIELD, face: SHIELD, g: [50, 47, 1.55] },
  skill: { outer: circ(50, 40, 34), face: circ(50, 40, 26.5), g: [50, 40, 1.5] },
  sub: { outer: HEX, face: HEX, g: [50, 45, 1.55] },
  technique: { outer: PLAQUE, face: PLAQUE, g: [50, 39, 1.45] },
  special: { outer: STAR, face: circ(50, 50, 31), g: [50, 50, 1.5] },
  season: { outer: circ(50, 47, 31), face: circ(50, 47, 25), g: [50, 47, 1.45] },
};
const FACE_SCALE: Partial<Record<BadgeCat, number>> = { area: 0.8, sub: 0.8, technique: 0.84 };

function Laurel({ fill }: { fill: string }) {
  const side: ReactNode[] = [];
  for (let i = 0; i < 7; i++) {
    const th = ((24 + i * 21) * Math.PI) / 180; // from the bottom, up the left side
    const x = 50 - 40 * Math.sin(th);
    const y = 47 + 40 * Math.cos(th);
    const phi = (Math.atan2(-Math.sin(th), -Math.cos(th)) * 180) / Math.PI - 28;
    side.push(<ellipse key={i} cx={x.toFixed(2)} cy={y.toFixed(2)} rx="6.4" ry="2.7" transform={`rotate(${phi.toFixed(1)} ${x.toFixed(2)} ${y.toFixed(2)})`} />);
  }
  return (
    <g fill={fill}>
      <g>{side}</g>
      <g transform="translate(100 0) scale(-1 1)">{side}</g>
      <path d="M43 88 Q50 83 57 88" fill="none" stroke={fill} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

function KeyStrip({ fill, dark }: { fill: string; dark: string }) {
  const x0 = 23;
  const w = 54 / 7;
  return (
    <g>
      <rect x={x0} y="63" width="54" height="15" rx="2.5" fill={fill} />
      {Array.from({ length: 6 }, (_, i) => (
        <path key={i} d={`M${(x0 + w * (i + 1)).toFixed(2)} 63.5 V77.5`} stroke={dark} strokeWidth="0.9" />
      ))}
      {[0, 1, 3, 4, 5].map((i) => (
        <rect key={i} x={(x0 + w * (i + 1) - 2.2).toFixed(2)} y="63" width="4.4" height="8.5" rx="0.8" fill={dark} />
      ))}
    </g>
  );
}

// ======================================================================= BadgeArt

export interface BadgeArtProps {
  badge: Pick<Badge, 'id' | 'cat' | 'group' | 'tone' | 'name'>;
  earned: boolean;
  size?: number;
  lang?: Lang;
  /** Hide from assistive tech when the name is already printed next to it. */
  decorative?: boolean;
  className?: string;
}
const LOCKED_TXT = { en: 'locked', he: 'נעול' };

export function BadgeArt({ badge, earned, size = 64, lang = 'en', decorative = false, className }: BadgeArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const id = (k: string) => `ba${uid}-${k}`;
  const tier: RankTier = badge.tone ?? 'gold';
  const m = METALS[earned ? tier : 'locked'];
  const face = earned ? FACE : FACE_LOCKED;
  const spec = FRAMES[badge.cat];
  const fs = FACE_SCALE[badge.cat];
  const { glyph } = resolveGlyph(badge);
  const [gx, gy, gs] = spec.g;
  const label = `${badge.name[lang]}${earned ? '' : ` (${LOCKED_TXT[lang]})`}`;
  const pip = badge.cat === 'sub' ? subPip(badge.id) : null;
  const lv = badge.cat === 'technique' ? techLevel(badge.id) : null;
  const pipCount = lv === null ? 0 : Math.max(lv, familyLevelCount(badge.id.split(':')[1]));
  const url = (k: string) => `url(#${id(k)})`;
  const faceShape = <path d={spec.face} transform={fs ? scaleAt(fs) : undefined} />;

  return (
    <svg
      className={`badge-art ba-${badge.cat} ${earned ? 'ba-earned' : 'ba-locked'} ba-tier-${tier}${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      {...(decorative ? { 'aria-hidden': true, focusable: 'false' } : { role: 'img', 'aria-label': label })}
    >
      {!decorative && <title>{label}</title>}
      <defs>
        <linearGradient id={id('m')} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor={m.stops[0]} />
          <stop offset="0.38" stopColor={m.stops[1]} />
          <stop offset="0.72" stopColor={m.stops[2]} />
          <stop offset="1" stopColor={m.stops[3]} />
        </linearGradient>
        <linearGradient id={id('r')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={m.stops[3]} />
          <stop offset="0.5" stopColor={m.stops[1]} />
          <stop offset="1" stopColor={m.stops[0]} />
        </linearGradient>
        <radialGradient id={id('f')} cx="0.4" cy="0.3" r="0.85">
          <stop offset="0" stopColor={face[0]} />
          <stop offset="1" stopColor={face[1]} />
        </radialGradient>
        <linearGradient id={id('s')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={id('c')}>
          <path d={spec.outer} />
        </clipPath>
      </defs>

      {/* ribbon tails behind the round medal */}
      {badge.cat === 'skill' && (
        <g>
          <path d="M34 58 L24 95 L33 89.5 L39.5 97 L48 68 Z" fill={earned ? m.ribbon : '#2c2e40'} />
          <path d="M66 58 L76 95 L67 89.5 L60.5 97 L52 68 Z" fill={earned ? m.ribbon : '#2c2e40'} />
          <path d="M37.5 62 L29.5 91 M62.5 62 L70.5 91" stroke={m.stops[1]} strokeWidth="2.4" opacity={earned ? 0.85 : 0.4} />
        </g>
      )}
      {badge.cat === 'season' && <Laurel fill={url('m')} />}

      {/* metal body + a soft drop line */}
      <path d={spec.outer} fill={url('m')} />
      <path d={spec.outer} fill="none" stroke={m.stops[3]} strokeWidth="1.5" opacity="0.7" />
      {badge.cat === 'skill' && <circle cx="50" cy="40" r="30.3" fill="none" stroke={m.stops[0]} strokeWidth="1.6" strokeDasharray="0.1 3.6" strokeLinecap="round" opacity="0.9" />}
      {badge.cat === 'special' && <circle cx="50" cy="50" r="35" fill="none" stroke={m.stops[3]} strokeWidth="1" opacity="0.6" />}

      {/* enamel face with a bevel ring */}
      <g fill={url('f')} stroke={url('r')} strokeWidth="2.2">
        {faceShape}
      </g>

      {badge.cat === 'technique' && <KeyStrip fill={m.stops[0]} dark={face[1]} />}

      {/* glyph */}
      <g
        transform={`translate(${gx - 12 * gs} ${gy - 12 * gs}) scale(${gs})`}
        color={m.hi}
        stroke="currentColor"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={earned ? 1 : 0.55}
      >
        {glyph({ bg: face[1] })}
      </g>

      {/* sub-skill pips: which sub-skill of its skill (n dots, the own one filled) */}
      {pip && (
        <g>
          {Array.from({ length: pip.n }, (_, i) => {
            const x = 50 + (i - (pip.n - 1) / 2) * 6;
            return <circle key={i} cx={x} cy={74.5} r={i === pip.i ? 2.3 : 1.4} fill={i === pip.i ? m.hi : m.stops[2]} />;
          })}
        </g>
      )}
      {/* technique level pips on the top rim: one per level of the family (piano 7, guitar 4–7) */}
      {lv !== null && (
        <g>
          {Array.from({ length: pipCount }, (_, i) => (
            <circle key={i} cx={50 + (i - (pipCount - 1) / 2) * 7} cy={13.2} r={2.1} fill={i < lv ? face[1] : 'none'} stroke={face[1]} strokeWidth="0.8" opacity={i < lv ? 0.9 : 0.5} />
          ))}
        </g>
      )}

      {/* sheen: a static soft highlight + a band the unlock overlay sweeps across */}
      <g clipPath={url('c')}>
        <ellipse cx="34" cy="22" rx="30" ry="14" fill="#fff" opacity={earned ? 0.13 : 0.05} transform="rotate(-28 34 22)" />
        {earned && (
          <g transform="rotate(24 50 50)">
            <rect className="ba-sweep" x="-30" y="-20" width="22" height="140" fill={url('s')} />
          </g>
        )}
      </g>

      {/* locked: lock pip (shape, not only colour) */}
      {!earned && (
        <g transform="translate(74 74)">
          <circle r="12" fill="#1b1c2e" stroke="#8a8ea8" strokeWidth="2" />
          <path d="M-4 -1.5 V-4.5 A4 4 0 0 1 4 -4.5 V-1.5" fill="none" stroke="#c9cce0" strokeWidth="2.2" strokeLinecap="round" />
          <rect x="-6" y="-2" width="12" height="9" rx="2" fill="#c9cce0" />
        </g>
      )}
    </svg>
  );
}

// ======================================================================= small helpers for other screens

/** The area glyph alone, in currentColor (for rank strips / challenge headers instead of emoji). */
export function AreaGlyph({ area, size = 18 }: { area: RankArea; size?: number }) {
  const g = GLYPHS[`area:${area}`] ?? FALLBACK;
  return (
    <svg className="area-glyph" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {g({ bg: 'var(--bg, #0f1020)' })}
    </svg>
  );
}

/** Tier colour for particles and glows. */
export const tierGlow = (t: RankTier | undefined) => METALS[t ?? 'gold'].glow;

// VOICE_CURRICULUM: the voice course's family and milestone badges (tech:voice:…) share the singing glyph.
registerFamilyGlyph('voice', GLYPHS['skill:singing']);
