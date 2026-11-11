// The drum kit model (DRUMS_CURRICULUM §3): which MIDI note is which drum, hi-hat openness from CC4, per-pad velocity
// bands from a calibration, and the "hit each pad" mapping wizard. Pure — midi.ts and the screens use it.
// Never hard-code a brand map (§3.2): GM is the default, presets help, the wizard's learned notes always win.

import type { DrumVoice, Limb } from './drills/types';

export type { DrumVoice } from './drills/types';

/** Every voice, in kit order (left to right as seen from the throne, roughly). */
export const DRUM_VOICES: DrumVoice[] = ['hihat', 'hhOpen', 'hhPedal', 'crash', 'snare', 'rim', 'tom1', 'tom2', 'tom3', 'ride', 'kick'];

/** The GM note each voice is written / scored as (drill notes carry these). */
export const VOICE_NOTE: Record<DrumVoice, number> = { kick: 36, rim: 37, snare: 38, hihat: 42, hhPedal: 44, hhOpen: 46, tom3: 43, tom2: 45, tom1: 48, crash: 49, ride: 51 };
export const NOTE_VOICE: Record<number, DrumVoice> = Object.fromEntries(Object.entries(VOICE_NOTE).map(([v, n]) => [n, v as DrumVoice]));

export const VOICE_NAME: Record<DrumVoice, { en: string; he: string }> = {
  kick: { en: 'Kick', he: 'בס־תוף' },
  snare: { en: 'Snare', he: 'סנר' },
  rim: { en: 'Snare rim', he: 'שפת הסנר' },
  hihat: { en: 'Hi-hat', he: 'היי־האט' },
  hhOpen: { en: 'Open hi-hat', he: 'היי־האט פתוח' },
  hhPedal: { en: 'Hi-hat pedal', he: 'פדל היי־האט' },
  ride: { en: 'Ride', he: 'רייד' },
  crash: { en: 'Crash', he: 'קראש' },
  tom1: { en: 'High tom', he: 'טום גבוה' },
  tom2: { en: 'Mid tom', he: 'טום אמצעי' },
  tom3: { en: 'Floor tom', he: 'טום רצפה' },
};

/** Matching class: open / closed hats are one pad (openness is judged apart), rim counts as the snare. */
export type VoiceClass = 'kick' | 'snare' | 'hat' | 'pedal' | 'ride' | 'crash' | 'tom';
export const classOf = (v: DrumVoice): VoiceClass =>
  v === 'hihat' || v === 'hhOpen' ? 'hat' : v === 'rim' ? 'snare' : v === 'hhPedal' ? 'pedal' : v === 'tom1' || v === 'tom2' || v === 'tom3' ? 'tom' : v;

/** The usual limb of a voice for a right-handed drummer (sticking overrides hands on the snare / toms). */
export function limbOf(v: DrumVoice, hand: 'R' | 'L' = 'R'): Limb {
  if (v === 'kick') return 'RF';
  if (v === 'hhPedal') return 'LF';
  return hand === 'L' ? 'LH' : 'RH';
}

// ---------------------------------------------------------------- note maps (§3.1, §3.2)

/** General MIDI percussion (channel 10): the notes a kit drummer uses. */
export const GM_MAP: Record<number, DrumVoice> = {
  35: 'kick', 36: 'kick', 37: 'rim', 38: 'snare', 39: 'snare', 40: 'snare', 41: 'tom3', 42: 'hihat', 43: 'tom3', 44: 'hhPedal', 45: 'tom2', 46: 'hhOpen', 47: 'tom2', 48: 'tom1', 49: 'crash', 50: 'tom1', 51: 'ride', 52: 'crash', 53: 'ride', 55: 'crash', 57: 'crash', 59: 'ride',
};
export type KitPreset = 'gm' | 'roland' | 'alesis' | 'yamaha';
/** Brand extras on top of GM (verify per model — the wizard always overrides). */
export const PRESETS: Record<KitPreset, { name: string; map: Record<number, DrumVoice>; cc4: { closed: number; open: number } }> = {
  gm: { name: 'General MIDI', map: {}, cc4: { closed: 127, open: 0 } },
  // Roland TD: hat edge closed 22 / open 26, tom rims 58 (floor), ride edge 59 (Default MIDI Note Map; verify).
  roland: { name: 'Roland TD', map: { 22: 'hihat', 26: 'hhOpen', 58: 'tom3', 59: 'ride' }, cc4: { closed: 90, open: 0 } },
  // Alesis lower models: separate notes per pedal state — half-open 23, splash 21 (community report; verify).
  alesis: { name: 'Alesis', map: { 23: 'hhOpen', 21: 'hhPedal' }, cc4: { closed: 127, open: 0 } },
  // Yamaha DTX: foot splash 83 (older 85).
  yamaha: { name: 'Yamaha DTX', map: { 83: 'hhPedal', 85: 'hhPedal' }, cc4: { closed: 127, open: 0 } },
};

/** The player's kit (Settings.drumKit): learned notes, the pedal's CC4 range, velocity per pad, mic (pad) mode. */
export interface KitProfile {
  preset: KitPreset;
  /** Notes learned by the wizard (they win over the preset and GM). */
  map: Record<number, DrumVoice>;
  /** CC4 values with the pedal pressed (closed) and lifted (open). */
  cc4?: { closed: number; open: number };
  /** Soft / loud stroke medians per voice (velocity 1–127, or a mic peak mapped to it). */
  vel?: Partial<Record<DrumVoice, { soft: number; loud: number }>>;
  /** Microphone mode (a practice pad, or an acoustic kit): no MIDI; only mic-OK items are offered. */
  mic?: boolean;
  /** What the player plays on (the kit card's choice). Absent = from `mic` (old profiles): MIDI or a practice pad. */
  kind?: KitKind;
  /** Acoustic kit by microphone: the per-player band templates of each drum (drumAcoustic.ts calibration). */
  acoustic?: AcousticCal;
  /** Pad controllers without a sound module: the app plays a drum sound on every hit (default off). */
  sounds?: boolean;
  /** The device the wizard ran on. */
  device?: string;
  /** Wizard finished (else the drums Technique offers it first). */
  done?: boolean;
  /**
   * The short setup at the course start (SPEC-COURSE-START): only snare, kick and hi-hat learned, the pedal and the
   * soft / loud strokes left at the preset's defaults. The kit card offers the full setup to finish it.
   */
  quick?: boolean;
  /** Rudiment Rush's two-zone sticking mode on this kit (rudimentRush.ts StickZones; absent = the setup's first). */
  zones?: import('./rudimentRush').StickZones;
}
export const DEFAULT_KIT: KitProfile = { preset: 'gm', map: {} };

/** The owner's notice (0.66): the drums course is built for an e-kit by MIDI. Shown on the course card, the kit card and the path top. */
export const KIT_NOTICE = {
  en: 'Drums works best with an electronic kit connected by MIDI. Recommended for the full course and accurate assessment.',
  he: 'קורס התופים עובד הכי טוב עם תופים אלקטרוניים המחוברים ב-MIDI. מומלץ לכל התוכן ולמדידה מדויקת.',
};

/** The kit card's three setups: an e-kit by MIDI (recommended), an acoustic kit by microphone, a practice pad by microphone. */
export type KitKind = 'midi' | 'acoustic' | 'pad';
/** The drums an acoustic kit's microphone tells apart (DRUMS_AUDIT §5): ride and crash count as the hat (a cymbal). */
export type AcousticVoice = 'kick' | 'snare' | 'tom' | 'hat';
/** Per-player calibration: each drum's band-power rise at the strength it was calibrated (4 hits each, the median). */
export interface AcousticCal {
  tpl: Partial<Record<AcousticVoice, number[]>>;
}
/** The setup in use. An acoustic kit counts only once calibrated (kick, snare and hat); until then it is a pad. */
export function kitKind(k?: KitProfile | null): KitKind {
  if (!k?.mic) return 'midi';
  return k.kind === 'acoustic' && k.acoustic?.tpl.kick && k.acoustic.tpl.snare && k.acoustic.tpl.hat ? 'acoustic' : 'pad';
}
/** For the level filters: false = MIDI (everything), 'pad' = single-surface levels, 'acoustic' = those + basic grooves. */
export const drumMicOf = (k?: KitProfile | null): false | 'pad' | 'acoustic' => {
  const x = kitKind(k);
  return x === 'midi' ? false : x;
};

/** The app's own drum sound for a voice (the "play drum sounds" option): the recorded kit's pieces (PercKind names). */
export const VOICE_PERC: Record<DrumVoice, 'kick' | 'snare' | 'rim' | 'hat' | 'hat-open' | 'hat-foot' | 'ride' | 'crash' | 'tom-hi' | 'tom-lo'> = {
  kick: 'kick', snare: 'snare', rim: 'rim', hihat: 'hat', hhOpen: 'hat-open', hhPedal: 'hat-foot', ride: 'ride', crash: 'crash', tom1: 'tom-hi', tom2: 'tom-hi', tom3: 'tom-lo',
};

/** The voice a raw note plays on this kit (learned → preset → GM), or null for an unmapped note. */
export function voiceOf(note: number, kit: KitProfile = DEFAULT_KIT): DrumVoice | null {
  return kit.map[note] ?? PRESETS[kit.preset]?.map[note] ?? GM_MAP[note] ?? null;
}

// ---------------------------------------------------------------- hi-hat (§3.3)

/** CC4 → openness 0 (closed) … 1 (open), from the kit's learned range. */
export function openness(cc4: number, kit: KitProfile = DEFAULT_KIT): number {
  const r = kit.cc4 ?? PRESETS[kit.preset]?.cc4 ?? PRESETS.gm.cc4;
  if (r.closed === r.open) return 0;
  const x = (cc4 - r.closed) / (r.open - r.closed);
  return Math.max(0, Math.min(1, x));
}
export type HatState = 'closed' | 'half' | 'open';
/** Closed < 0.2, half 0.2–0.6, open > 0.6 (tuneable). */
export const hatState = (open: number): HatState => (open < 0.2 ? 'closed' : open > 0.6 ? 'open' : 'half');

/** A hat hit's voice: kits with CC4 send one note — openness at hit time decides (half counts as closed here). */
export function hatVoice(v: DrumVoice, open: number | null): DrumVoice {
  if ((v !== 'hihat' && v !== 'hhOpen') || open === null) return v;
  return hatState(open) === 'open' ? 'hhOpen' : 'hihat';
}

// ---------------------------------------------------------------- velocity (§3.4, §4.1)

export const DEFAULT_VEL = { soft: 40, loud: 110 };
/** The soft / loud medians of a voice (snare's when that pad has none, then defaults). */
export function velRange(kit: KitProfile | undefined, v: DrumVoice): { soft: number; loud: number } {
  const own = kit?.vel?.[v] ?? kit?.vel?.[classOf(v) === 'snare' ? 'snare' : v] ?? kit?.vel?.snare;
  return own && own.loud > own.soft ? own : DEFAULT_VEL;
}
export type VelBand = 'ghost' | 'normal' | 'accent';
/** Ghost ≤ soft × 1.1; accent ≥ loud × 0.9; else normal (relative to the pad's calibration, never absolute). */
export function velBand(vel: number, r: { soft: number; loud: number }): VelBand {
  if (vel <= r.soft * 1.1) return 'ghost';
  if (vel >= r.loud * 0.9) return 'accent';
  return 'normal';
}
/** Is the stroke in the p / mf / f band (three-level drills): p lower third, f upper third, mf the middle (lenient). */
export function inDynBand(vel: number, dyn: 'p' | 'mf' | 'f', r: { soft: number; loud: number }): boolean {
  const x = (vel - r.soft) / Math.max(1, r.loud - r.soft);
  return dyn === 'p' ? x < 0.35 : dyn === 'f' ? x > 0.65 : x >= 0.2 && x <= 0.8;
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0;
};
/** Velocity calibration (8 soft, 8 loud strokes): the medians, or null when they don't separate (≥ 12 apart). */
export function calibrateVel(soft: number[], loud: number[]): { soft: number; loud: number } | null {
  if (soft.length < 4 || loud.length < 4) return null;
  const s = median(soft);
  const l = median(loud);
  return l - s >= 12 ? { soft: Math.round(s), loud: Math.round(l) } : null;
}

// ---------------------------------------------------------------- the mapping wizard (§5, §6 rank 1)

export type WizardPad = { voice: DrumVoice; optional?: boolean; prompt: { en: string; he: string } };
/** The pads the wizard asks for, in order (each: hit it twice). Optional ones can be skipped. */
export const WIZARD_PADS: WizardPad[] = [
  { voice: 'snare', prompt: { en: 'Hit the snare (twice)', he: 'הכו בסנר (פעמיים)' } },
  { voice: 'kick', prompt: { en: 'Kick (twice)', he: 'בעטו בבס־תוף (פעמיים)' } },
  { voice: 'hihat', prompt: { en: 'Hi-hat, pedal closed (twice)', he: 'היי־האט סגור, הפדל לחוץ (פעמיים)' } },
  { voice: 'hhOpen', optional: true, prompt: { en: 'Hi-hat, pedal up — open (twice)', he: 'היי־האט פתוח, הפדל למעלה (פעמיים)' } },
  { voice: 'hhPedal', optional: true, prompt: { en: 'Hi-hat pedal alone — the foot "chick" (twice)', he: 'פדל ההיי־האט לבד — ה"צ׳יק" ברגל (פעמיים)' } },
  { voice: 'ride', optional: true, prompt: { en: 'Ride (twice)', he: 'רייד (פעמיים)' } },
  { voice: 'crash', prompt: { en: 'Crash (twice)', he: 'קראש (פעמיים)' } },
  { voice: 'tom1', prompt: { en: 'High tom (twice)', he: 'טום גבוה (פעמיים)' } },
  { voice: 'tom2', optional: true, prompt: { en: 'Mid tom (twice)', he: 'טום אמצעי (פעמיים)' } },
  { voice: 'tom3', prompt: { en: 'Floor tom (twice)', he: 'טום רצפה (פעמיים)' } },
];

export interface WizardState {
  step: number;
  /** Notes heard on the current pad. */
  heard: number[];
  map: Record<number, DrumVoice>;
  /** The hat sends one note: openness comes from CC4 (learned in the pedal step). */
  hatByCc: boolean;
  /** Something to tell the player about the last hit. */
  note?: 'again' | 'taken' | 'learned';
}
/** The short course-start setup learns only these (the rest of the kit comes from the preset / GM map). */
export const QUICK_PADS: WizardPad[] = WIZARD_PADS.filter((p) => p.voice === 'snare' || p.voice === 'kick' || p.voice === 'hihat');
export const wizardStart = (): WizardState => ({ step: 0, heard: [], map: {}, hatByCc: false });
export const wizardDone = (s: WizardState, pads: WizardPad[] = WIZARD_PADS): boolean => s.step >= pads.length;

/**
 * One hit during the wizard. Two hits on the same note learn the current pad and move on. A note already learned for
 * another pad: the open hat on the closed hat's note means "one hat note + CC4" (learned, flagged); anything else is
 * refused ("taken") so a stray kick can't become the crash.
 */
export function wizardHit(s: WizardState, note: number, vel: number, pads: WizardPad[] = WIZARD_PADS): WizardState {
  if (wizardDone(s, pads) || vel <= 0) return s;
  const pad = pads[s.step];
  const owner = s.map[note];
  if (owner && owner !== pad.voice) {
    if (pad.voice === 'hhOpen' && owner === 'hihat') return { ...s, step: s.step + 1, heard: [], hatByCc: true, note: 'learned' };
    return { ...s, heard: [], note: 'taken' };
  }
  const heard = [...s.heard, note];
  if (heard.length < 2) return { ...s, heard, note: undefined };
  if (heard[heard.length - 1] !== heard[heard.length - 2]) return { ...s, heard: [note], note: 'again' };
  return { ...s, step: s.step + 1, heard: [], map: { ...s.map, [note]: pad.voice }, note: 'learned' };
}
/** Skip an optional pad. */
export function wizardSkip(s: WizardState, pads: WizardPad[] = WIZARD_PADS): WizardState {
  if (wizardDone(s, pads) || !pads[s.step].optional) return s;
  return { ...s, step: s.step + 1, heard: [], note: undefined };
}

/** The pedal range from what the pedal step saw: pressed (closed) and lifted (open) CC4 values. */
export function pedalRange(pressed: number[], lifted: number[]): { closed: number; open: number } | null {
  if (!pressed.length || !lifted.length) return null;
  const c = median(pressed);
  const o = median(lifted);
  return Math.abs(c - o) >= 20 ? { closed: Math.round(c), open: Math.round(o) } : null;
}

/**
 * Bluetooth / slow output (§3.5): a calibrated offset or an output latency this large means the click is heard late —
 * ask for the kit's headphone jack or wired headphones.
 */
export const slowOutput = (latencyMs: number, outputLatencyS?: number): boolean => latencyMs > 120 || (outputLatencyS ?? 0) > 0.1;
