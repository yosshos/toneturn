// Songs for the voice course's band levels (VOICE_CURRICULUM F13–F15). Melodies are only ours (Tier 3 of
// docs/research/STANDARDS_LEGAL.md: new melodies over free chord progressions) or traditional / public domain
// worldwide (Tier 1A: the spirituals of the songbook, here with our own jazz chord charts). No lyrics are stored.
//
// Melody notation is the songbook's (src/content/songbook.ts): scale degrees of the song's key, "#"/"b", octave
// marks, lengths w h q e s, "." dotted, "r" rests; every bar fills the meter. `chart` is chord symbols in the key of
// C (C minor for minor songs), one bar per "|", in the same bars as the melody; the app transposes both.
// Provenance: every own melody and chart below was written for The 7th Sense (2026-11-11) and quotes no existing head.

import type { ChartStyle } from '../engine/charts';

export interface VoiceSong {
  id: string;
  title: { en: string; he: string };
  credit: { en: string; he: string };
  /** 'own' = composed for the app; 'pd' = public domain worldwide (traditional melody, our chart). */
  tier: 'own' | 'pd';
  meter: number;
  minor?: boolean;
  melody: string;
  chart: string;
  /** Bar indices (0-based) where a new phrase starts, after bar 0. */
  phrases: number[];
  /** Bars where the chorus starts (graded louder than the verse, F13 L5). */
  chorus?: number;
  level: number;
  style: ChartStyle;
  bpm: number;
  /** The form, shown on the brief ("12-bar blues", "AABA, A section"). */
  form?: { en: string; he: string };
  /** The band's answers between the sung calls (same notation, rests where the singer sings; F14 L10). */
  answer?: string;
}

const OWN = { en: 'Written for The 7th Sense', he: 'נכתב עבור החוש השביעי' };
const SPIRITUAL = { en: 'Traditional spiritual · our jazz chords', he: 'שיר עממי מסורתי · האקורדים שלנו' };

/** Our own pop-style songs (verse + chorus over common progressions): the on-ramp. */
export const POP_SONGS: VoiceSong[] = [
  {
    id: 'morning-line',
    title: { en: 'Morning Line', he: 'קו של בוקר' },
    credit: OWN,
    tier: 'own',
    meter: 4,
    melody: '3 3 2 1 | 2h 5,h | 1 1 6, 1 | 1w | 3 3 2 1 | 2h 5h | 4 3 2 1 | 1w | 6 6 5 4 | 5h 2h | 3 3 2 1 | 1h 6,h | 6 6 5 4 | 5h 7,h | 1w | rw',
    chart: 'C | G | Am | F | C | G | Am | F | F | G | C | Am | F | G | C | C',
    phrases: [4, 8, 12],
    chorus: 8,
    level: 1,
    style: 'pop',
    bpm: 92,
    form: { en: 'Verse + chorus, I–V–vi–IV', he: 'בית + פזמון, I–V–vi–IV' },
  },
  {
    id: 'paper-boats',
    title: { en: 'Paper Boats', he: 'סירות נייר' },
    credit: OWN,
    tier: 'own',
    meter: 4,
    melody: "5 5 3 1 | 3h 1h | 4 4 6 4 | 2w | 5 5 3 1 | 3h 6h | 6 4 5 2 | 1w | 1' 1' 6 4 | 5h 3h | 6 6 1' 6 | 5w | 6 6 5 3 | 4h 6h | 5 4 3 2 | 1w",
    chart: 'C | Am | F | G | C | Am | F G | C | F | C | F | G | Am | F | G | C',
    phrases: [4, 8, 12],
    chorus: 8,
    level: 2,
    style: 'pop',
    bpm: 88,
    form: { en: "Verse + chorus, '50s changes", he: 'בית + פזמון, מהלך שנות ה־50' },
  },
  {
    id: 'city-rain',
    title: { en: 'City Rain', he: 'גשם בעיר' },
    credit: OWN,
    tier: 'own',
    meter: 4,
    melody: "3 5 7 6 | 5h. 3 | 4 6 1' 7 | 6w | 3 5 7 6 | 5h 3h | 2 4 6 5 | 1w | 6 6 5 3 | 5h. 2 | 4 4 3 2 | 2w | 6 6 1' 6 | 5h 3h | 4 3 2 5, | 1w",
    chart: 'Cmaj7 | Am7 | Dm7 | G7 | Cmaj7 | Am7 | Dm7 G7 | Cmaj7 | Fmaj7 | Em7 | Dm7 | G7 | Fmaj7 | Em7 | Dm7 G7 | C6',
    phrases: [4, 8, 12],
    chorus: 8,
    level: 3,
    style: 'bossa',
    bpm: 104,
    form: { en: 'Verse + chorus, sevenths', he: 'בית + פזמון, ספטאקורדים' },
  },
  {
    id: 'northern-lights',
    title: { en: 'Northern Lights', he: 'זוהר צפוני' },
    credit: OWN,
    tier: 'own',
    meter: 4,
    minor: true,
    melody: "1 1 3 5 | 6h 3h | 3 3 2 3 | 4w | 1 1 3 5 | 6h 1'h | 7 6 5 4 | 5w | 5 5 6 5 | 3h 1h | 4 4 5 4 | 2w | 5 5 6 5 | 3h 1'h | 7 6 5 4 | 1w",
    chart: 'Cm | Ab | Eb | Bb | Cm | Ab | Eb | G | Cm | Ab | Bb | G | Cm | Ab | Bb | Cm',
    phrases: [4, 8, 12],
    chorus: 8,
    level: 3,
    style: 'rock',
    bpm: 96,
    form: { en: 'Minor verse + chorus, i–VI–III–VII', he: 'בית ופזמון במינור, i–VI–III–VII' },
  },
];

/** Jazz heads: our contrafacts over free forms, and spirituals with our jazz charts (F14, F15). */
export const JAZZ_HEADS: VoiceSong[] = [
  {
    id: 'blue-window',
    title: { en: 'Blue Window', he: 'חלון כחול' },
    credit: OWN,
    tier: 'own',
    meter: 4,
    melody: "r 5 7b 5 | 4 3b 1h | rh 3b 3 | 1w | r 4 6 1' | 3b 1 4h | rh 3b 3 | 1h 1#h | 2 4 6 1' | 7 6 5 4 | 3 1h 1# | 2h 7,h",
    chart: 'C7 | F7 | C7 | C7 | F7 | F7 | C7 | A7 | Dm7 | G7 | C7 A7 | Dm7 G7',
    phrases: [4, 8],
    level: 3,
    style: 'swing',
    bpm: 100,
    form: { en: '12-bar blues', he: 'בלוז של 12 תיבות' },
  },
  {
    id: 'saints-jazz',
    title: { en: 'When the Saints (swing head)', he: 'כשהקדושים (ראש בסווינג)' },
    credit: SPIRITUAL,
    tier: 'pd',
    meter: 4,
    melody: 'r 1 3 4 | 5w | r 1 3 4 | 5w | r 1 3 4 | 5h 3h | 1h 3h | 2w | r 3 3 2 | 1w | 3h 5h | 5 4h. | rh 3 4 | 5h 3h | 1h 2h | 1w',
    chart: 'C6 | C6 | C6 | C6 | C6 | C6 | C6 Am7 | Dm7 G7 | C6 | C7 | F6 | Fm6 | C6 | Em7 A7 | Dm7 G7 | C6',
    phrases: [4, 8, 12],
    level: 2,
    style: 'swing',
    bpm: 112,
    form: { en: '16 bars, a New Orleans head', he: '16 תיבות, ראש בסגנון ניו אורלינס' },
  },
  {
    id: 'swing-low-jazz',
    title: { en: 'Swing Low (ballad head)', he: 'סווינג לואו (ראש בלדה)' },
    credit: SPIRITUAL,
    tier: 'pd',
    meter: 4,
    melody: '3 1h 3 | 1q. 1e 6,e 5,q. | 1e 1e 1e 1e 3e 3e 5 | 5w | 6e 5e 3h 5 | 1q. 1e 6,e 5,q. | 1e 1e 1e 1e 3e 3e 2 | 1h. 3 | 5 1e 5,e 1 1e 1e | 1e 1e 1 6,e 5,q. | 1e 1e 1e 1e 3e 3e 5 | 5h. 5 | 6e 5e 3 3 1 | 1e 1e 1e 1e 6,e 5,q. | 1e 1e 1e 1e 3e 3e 2 | 1w',
    chart: 'Cmaj7 | F6 C6 | C6 A7 | Dm7 G7 | Cmaj7 | F6 C6 | Am7 D7 | Dm7 G7 | Cmaj7 | F6 G7 | C6 A7 | Dm7 G7 | Cmaj7 | F6 C6 | Dm7 G7 | C6',
    phrases: [4, 8, 12],
    level: 3,
    style: 'swing',
    bpm: 84,
    form: { en: '16 bars, a spiritual in swing', he: '16 תיבות, שיר רוחני בסווינג' },
  },
  {
    id: 'corner-light',
    title: { en: 'Corner Light', he: 'אור בפינה' },
    credit: OWN,
    tier: 'own',
    meter: 4,
    melody: "1 2 4 6 | 7h. 5 | 3 5 7 2' | 1'h 6h | 2 4 6 4 | 5#h. 4 | 3 1 6, 1 | 6,w",
    chart: 'Dm7 | G7 | Cmaj7 | Fmaj7 | Bm7b5 | E7 | Am6 | Am6',
    phrases: [4],
    level: 3,
    style: 'swing',
    bpm: 120,
    form: { en: 'A section on a minor ii–V cycle', he: 'חלק A על מעגל ii–V מינורי' },
  },
  {
    id: 'slow-harbor',
    title: { en: 'Slow Harbor', he: 'נמל איטי' },
    credit: OWN,
    tier: 'own',
    meter: 4,
    melody: '3w | 3h 1#h | 4h. 6 | 5w | 7h 5h | 1#h. 3 | 2h 4h | 3w',
    chart: 'Cmaj7 | A7 | Dm7 | G7 | Em7 | A7 | Dm7 G7 | Cmaj7',
    phrases: [4],
    level: 3,
    style: 'ballad',
    bpm: 60,
    form: { en: 'Ballad, 8 bars', he: 'בלדה, 8 תיבות' },
  },
  {
    id: 'rio-gray',
    title: { en: 'Rio Gray', he: 'ריו אפור' },
    credit: OWN,
    tier: 'own',
    meter: 4,
    melody: '5q. 3e 3h | re 1e 3 5h | 6q. 4e 4h | re 2e 4 5h | 5q. 7e 7h | re 1#e 3 5h | 4q. 2e 2h | 7,w',
    chart: 'Cmaj7 | Am7 | Dm7 | G7 | Em7 | A7b9 | Dm7 | G7',
    phrases: [4],
    level: 3,
    style: 'bossa',
    bpm: 120,
    form: { en: 'Bossa nova, 8 bars', he: 'בוסה נובה, 8 תיבות' },
  },
  {
    id: 'fast-tracks',
    title: { en: 'Fast Tracks', he: 'מסילות מהירות' },
    credit: OWN,
    tier: 'own',
    meter: 4,
    melody: "5 3 5 1# | 2 4 7, 2 | 3 5 1# 3 | 4 2 5h | 7b 5 3 7b | 6 4 6 1' | 7 5 1#h | 2h 5,h",
    chart: 'C A7 | Dm7 G7 | Em7 A7 | Dm7 G7 | Gm7 C7 | F F#dim7 | Em7 A7 | Dm7 G7',
    phrases: [4],
    level: 4,
    style: 'swing',
    bpm: 160,
    form: { en: 'Rhythm changes, A section', he: 'ריתם צ׳יינג׳ס, חלק A' },
  },
  {
    id: 'minor-street',
    title: { en: 'Minor Street', he: 'רחוב מינורי' },
    credit: OWN,
    tier: 'own',
    meter: 4,
    minor: true,
    melody: "1 3 5 7 | 1'h 6h | r 5 3 1 | 5w | 4 6 1' 6 | 3h 4h | r 5 3 1 | 1w | 6 1' 3 6 | 5 7# 2 4 | 3h 1h | 7#,w",
    chart: 'Cm7 | Fm7 | Cm7 | Cm7 | Fm7 | Fm7 | Cm7 | Cm7 | Ab7 | G7 | Cm7 | G7',
    phrases: [4, 8],
    level: 4,
    style: 'swing',
    bpm: 112,
    form: { en: 'Minor blues', he: 'בלוז מינורי' },
  },
  {
    id: 'bop-line',
    title: { en: 'Bebop line on ii–V–I', he: 'קו ביבופ על ii–V–I' },
    credit: OWN,
    tier: 'own',
    meter: 4,
    melody: "2e 1#e 2e 4e 6e 5#e 6e 1'e | 7e 7be 6e 5#e 5e 4e 2e 7,e | 1h 3h | 3w",
    chart: 'Dm7 | G7 | Cmaj7 | Cmaj7',
    phrases: [],
    level: 4,
    style: 'swing',
    bpm: 120,
    form: { en: 'Swung eighths, chromatic passing notes', he: 'שמיניות בסווינג, צלילי מעבר כרומטיים' },
  },
  {
    id: 'bop-line-2',
    title: { en: 'Bebop line on iii–VI–ii–V', he: 'קו ביבופ על iii–VI–ii–V' },
    credit: OWN,
    tier: 'own',
    meter: 4,
    melody: '3e 2#e 3e 5e 1#e 3e 5e 7e | 6e 5#e 6e 4e 7,e 2e 4e 5be | 5h 3h | 1w',
    chart: 'Em7 A7 | Dm7 G7 | Cmaj7 | Cmaj7',
    phrases: [],
    level: 4,
    style: 'swing',
    bpm: 120,
    form: { en: 'Swung eighths, ending on a chord tone', he: 'שמיניות בסווינג, סיום על צליל אקורד' },
  },
];

/**
 * VOICE_CURRICULUM P2. Reading melodies (F9 L8: read over the band, never heard first) and lead sheets (F9 L9: swung
 * eighths, syncopation, ties written "~"), an AABA chorus (F14 L9) and a 12-bar blues call and response with the
 * band's answers (F14 L10). All written for The 7th Sense (2026-11-11); none quotes an existing melody.
 */
export const P2_SONGS: VoiceSong[] = [
  {
    id: 'read-first-light',
    title: { en: 'First Light', he: 'אור ראשון' },
    credit: OWN,
    tier: 'own',
    meter: 4,
    melody: '1 2 3h | 5h 3h | 4 3 2 1 | 2w | 3 4 5h | 6h 5h | 4 2 7, 2 | 1w',
    chart: 'C | C | F | G | C | F | Dm G | C',
    phrases: [4],
    level: 2,
    style: 'ballad',
    bpm: 80,
    form: { en: 'Reading, 8 bars', he: 'קריאה, 8 תיבות' },
  },
  {
    id: 'read-quiet-road',
    title: { en: 'Quiet Road', he: 'דרך שקטה' },
    credit: OWN,
    tier: 'own',
    meter: 4,
    melody: "5 3 1 3 | 4h 2h | 3 1 6, 1 | 7,w | 1 3 5 1' | 7h 5h | 6 4 2 7, | 1w",
    chart: 'C | Dm | Am | G | C | Em | F G | C',
    phrases: [4],
    level: 2,
    style: 'pop',
    bpm: 84,
    form: { en: 'Reading, 8 bars', he: 'קריאה, 8 תיבות' },
  },
  {
    id: 'read-grey-morning',
    title: { en: 'Grey Morning', he: 'בוקר אפור' },
    credit: OWN,
    tier: 'own',
    meter: 4,
    minor: true,
    melody: '1 3 5h | 4 3 2h | 3 4 5 6 | 5w | 6 5 4 3 | 2 3 4h | 3 2 7#, 2 | 1w',
    chart: 'Cm | Fm G | Cm | Cm | Fm | Bb | Cm G | Cm',
    phrases: [4],
    level: 3,
    style: 'ballad',
    bpm: 76,
    form: { en: 'Reading in minor, 8 bars', he: 'קריאה במינור, 8 תיבות' },
  },
  {
    id: 'read-three-steps',
    title: { en: 'Three Steps', he: 'שלושה צעדים' },
    credit: OWN,
    tier: 'own',
    meter: 4,
    melody: '1q. 2e 3h | 5q. 4e 3h | 2 3 4 2 | 5,w | 1q. 2e 3 5 | 6h 5h | 4 2 3 2 | 1w',
    chart: 'C | C | Dm | G | C | F | G7 | C',
    phrases: [4],
    level: 3,
    style: 'pop',
    bpm: 84,
    form: { en: 'Reading dotted rhythms, 8 bars', he: 'קריאת מקצבים מנוקדים, 8 תיבות' },
  },
  {
    id: 'lead-night-walk',
    title: { en: 'Night Walk', he: 'הליכת לילה' },
    credit: OWN,
    tier: 'own',
    meter: 4,
    melody: "r 3 5 6~ | 6h r 5 | 3e 5e 6e 1'e~ 1'h | rw | r 3 5 6~ | 6h r 1' | 7e 6e 5e 3e~ 3h | rw",
    chart: 'C6 | A7 | Dm7 | G7 | C6 | A7 | Dm7 G7 | C6',
    phrases: [4],
    level: 4,
    style: 'swing',
    bpm: 104,
    form: { en: 'Lead sheet: ties and swung eighths', he: 'דף אקורדים: קשתות ושמיניות בסווינג' },
  },
  {
    id: 'lead-corner-swing',
    title: { en: 'Corner Swing', he: 'סווינג בפינה' },
    credit: OWN,
    tier: 'own',
    meter: 4,
    melody: "1 3 5 6e 1'e~ | 1'h. r | 7 6 5 3e 2e~ | 2w | 3 5 6 1'e 2'e~ | 2'h 1' 6 | 5e 3e 5e 6e~ 6 5 | 1w",
    chart: 'Cmaj7 | Am7 | Dm7 | G7 | Cmaj7 | Dm7 | G7 | C6',
    phrases: [4],
    level: 4,
    style: 'swing',
    bpm: 112,
    form: { en: 'Lead sheet: anticipations over the bar', he: 'דף אקורדים: הקדמות מעבר לתיבה' },
  },
  {
    id: 'lead-late-train',
    title: { en: 'Late Train', he: 'רכבת מאוחרת' },
    credit: OWN,
    tier: 'own',
    meter: 4,
    melody: "5 3b 1 r | 3b 1 7b,h | r 5 7b 5 | 3b 1h. | 4 6 1' r | 7b 6 4h | 3e 1e 3be 1e~ 1h | rw",
    chart: 'C7 | C7 | F7 | C7 | F7 | F7 | C7 G7 | C7',
    phrases: [4],
    level: 4,
    style: 'swing',
    bpm: 100,
    form: { en: 'Lead sheet: blue notes', he: 'דף אקורדים: צלילי בלוז' },
  },
  {
    id: 'lantern-street',
    title: { en: 'Lantern Street', he: 'רחוב הפנסים' },
    credit: OWN,
    tier: 'own',
    meter: 4,
    melody:
      "1 2 3 5 | 6h 5h | 4 3 2 4 | 7,w | 3 5 7 2' | 6h 1#h | 2 4 6 5 | 3w | " +
      "1 2 3 5 | 6h 5h | 4 3 2 4 | 7,w | 3 5 7 2' | 6h 1#h | 2 4 6 5 | 1w | " +
      "4 5 6 7b | 1'h 6h | 5 4 3 4 | 6w | 1' 6 5 3 | 2h 4#h | 2 4 6 1' | 7w | " +
      "1 2 3 5 | 6h 5h | 4 3 2 4 | 7,w | 3 5 7 2' | 6h 1#h | 2 4 6 5 | 1w",
    chart:
      'Cmaj7 | Am7 | Dm7 | G7 | Em7 | A7 | Dm7 G7 | Cmaj7 | ' +
      'Cmaj7 | Am7 | Dm7 | G7 | Em7 | A7 | Dm7 G7 | Cmaj7 | ' +
      'Gm7 | C7 | Fmaj7 | Fmaj7 | Am7 | D7 | Dm7 | G7 | ' +
      'Cmaj7 | Am7 | Dm7 | G7 | Em7 | A7 | Dm7 G7 | C6',
    phrases: [8, 16, 24],
    level: 4,
    style: 'swing',
    bpm: 132,
    form: { en: 'AABA, 32 bars', he: 'AABA, 32 תיבות' },
  },
  {
    id: 'call-and-answer',
    title: { en: 'Call and Answer', he: 'קריאה ותשובה' },
    credit: OWN,
    tier: 'own',
    meter: 4,
    melody: "5 3b 3 5 | 7b 5h. | rw | rw | 1' 7b 6 4 | 3b 1h. | rw | rw | 2 4 6 1' | 7b 5h. | rw | rw",
    answer: "rw | rw | r 1' 7b 5 | 3b 1h. | rw | rw | r 6 5 3b | 1w | rw | rw | r 5 3b 1 | 1w",
    chart: 'C7 | F7 | C7 | C7 | F7 | F7 | C7 | A7 | Dm7 | G7 | C7 A7 | Dm7 G7',
    phrases: [4, 8],
    level: 4,
    style: 'swing',
    bpm: 108,
    form: { en: '12-bar blues, call and response', he: 'בלוז של 12 תיבות, קריאה ותשובה' },
  },
];

export const VOICE_SONGS: VoiceSong[] = [...POP_SONGS, ...JAZZ_HEADS, ...P2_SONGS];
