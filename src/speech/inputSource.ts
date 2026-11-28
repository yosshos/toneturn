// Which input a take listens to (docs/SPEC-INPUT-SOURCE.md, owner 2026-11-28): the ONE place that decides it. Every
// "is a MIDI keyboard there?" question of a take (DrillTake, RubatoTake, Drills, Charts, Encore, Lesson, the take trace)
// goes through `inputSource()`, so the take, its label and its record never disagree.
// R1: MIDI first, automatically: a connected keyboard is used for keys items unless the player chose "mic only".
// R3: a device that has had a keyboard on it expects one: a keys take with no keyboard stops and says so, until the
//     player reconnects or chooses the microphone for this session.
// R5: a microphone take on a keys item that expects MIDI is "not comparable" (never a counting check, never calibration).

import type { Drill } from '../engine/drills/types';
import { isDrumDrill, isGuitarDrill } from '../engine/drills/events';
import { COMPUTER_KEYS_NAME } from './computerKeys';
import { midi } from './midi';
import { guitarInputPref } from './guitarInput';

/** The player's input preference on this device (Settings → MIDI): auto = MIDI when connected, otherwise the mic. */
export type MidiPref = 'auto' | 'midi' | 'mic';
/** What an item is played on, for the input decision (drums and voice keep their own rules). */
export type ItemInput = 'keys' | 'guitar' | 'sung' | 'drums';
export type InputReason = 'connected' | 'no-keyboard' | 'unsupported' | 'pref-mic' | 'guitar-mic' | 'sung' | 'kit-mic';

export interface InputState {
  /** Web MIDI exists in this browser. */
  supported: boolean;
  /** The connected MIDI inputs (the computer keyboard counts while musical typing is on). */
  devices: readonly string[];
  pref: MidiPref;
  /** The MIDI inputs this device has had (device profile, keyed per input name). */
  expected: readonly string[];
  /** The player chose the microphone after the R3 line: until the page reloads. */
  sessionMic: boolean;
  /** Guitar / bass: the player's own MIDI-or-mic choice (guitarInput.ts). */
  guitarPref: 'midi' | 'mic';
  /** The chosen MIDI input (Settings → MIDI; null = any). */
  chosen?: string | null;
}

export interface InputDecision {
  src: 'midi' | 'mic';
  /** The MIDI input in use (src midi), else null. */
  device: string | null;
  reason: InputReason;
  /** A keys item on a device that expects a keyboard (R3). */
  expectMidi: boolean;
  /** R3: the take must not start (no keyboard where one is expected, and the mic was not chosen this session). */
  blocked: boolean;
  /** R5: a microphone take where MIDI is expected — never a counting check, never calibration. */
  notComparable: boolean;
}

/** The kind of input an item takes. */
export function itemInputOf(drill: Pick<Drill, 'sung' | 'spec'>): ItemInput {
  if (isDrumDrill(drill as Drill)) return 'drums';
  if (drill.sung) return 'sung';
  if (isGuitarDrill(drill as Drill)) return 'guitar';
  return 'keys';
}

/** The decision for an item, from a state (pure: the truth table of SPEC-INPUT-SOURCE §3.7). */
export function decideInput(st: InputState, kind: ItemInput = 'keys', o: { kitMic?: boolean } = {}): InputDecision {
  const devices = st.devices;
  const device = devices.length ? (st.chosen && devices.includes(st.chosen) ? st.chosen : devices[0]) : null;
  const out = (src: 'midi' | 'mic', reason: InputReason, expectMidi = false): InputDecision => {
    const blocked = expectMidi && src === 'mic' && !st.sessionMic;
    return { src, device: src === 'midi' ? device : null, reason, expectMidi, blocked, notComparable: expectMidi && src === 'mic' };
  };
  if (kind === 'sung') return out('mic', 'sung');
  if (kind === 'drums') return o.kitMic ? out('mic', 'kit-mic') : device ? out('midi', 'connected') : out('mic', st.supported ? 'no-keyboard' : 'unsupported');
  if (kind === 'guitar') {
    if (!device) return out('mic', st.supported ? 'no-keyboard' : 'unsupported');
    return st.guitarPref === 'mic' ? out('mic', 'guitar-mic') : out('midi', 'connected');
  }
  // keys
  if (st.pref === 'mic') return out('mic', 'pref-mic');
  const expectMidi = st.pref === 'midi' || st.expected.some((n) => n !== COMPUTER_KEYS_NAME);
  if (device) return out('midi', 'connected', expectMidi);
  return out('mic', st.supported ? 'no-keyboard' : 'unsupported', expectMidi);
}

// ── the live state (set by App from the device settings; the devices come from the MIDI module) ──
let prefs: { pref: MidiPref; expected: readonly string[]; chosen: string | null } = { pref: 'auto', expected: [], chosen: null };
let sessionMic = false;

/** App: the device settings the decision reads (called on every settings change). */
export function setInputPrefs(p: { pref: MidiPref; expected: readonly string[]; chosen?: string | null }): void {
  prefs = { pref: p.pref, expected: p.expected, chosen: p.chosen ?? null };
}
/** R3: "use the microphone this session". A keyboard that comes back still takes over at once (R1). */
export function chooseMicThisSession(): void {
  sessionMic = true;
}
/** Tests only. */
export function resetInputSession(): void {
  sessionMic = false;
}

/** The state now. */
export function inputState(): InputState {
  return { supported: midi.supported, devices: [...midi.devices], pref: prefs.pref, expected: prefs.expected, sessionMic, guitarPref: guitarInputPref(), chosen: prefs.chosen };
}

/** THE decision for a take now: an item (a drill), or an input kind (keys by default). */
export function inputSource(item?: ItemInput | Pick<Drill, 'sung' | 'spec'>, o: { kitMic?: boolean } = {}): InputDecision {
  const kind = typeof item === 'string' ? item : item ? itemInputOf(item) : 'keys';
  return decideInput(inputState(), kind, o);
}

/** Does a keys take listen to MIDI now? (The common question: `inputSource('keys').src === 'midi'`.) */
export const keysByMidi = (): boolean => inputSource('keys').src === 'midi';

/** The settings' preference (the old boolean migrated: true → auto, false → mic only, never set → auto). */
export function midiPrefOf(s: { midiPref?: MidiPref; midiInput?: boolean }): MidiPref {
  return s.midiPref ?? (s.midiInput === false ? 'mic' : 'auto');
}

/** "Turn MIDI on" from a screen (a kit chosen, a key heard in setup): mic only becomes auto; MIDI only stays. */
export function midiOnPatch(): { midiPref?: MidiPref } {
  return prefs.pref === 'mic' ? { midiPref: 'auto' } : {};
}

/** R2: the live status line ("MIDI: <device>", "Microphone (no keyboard connected)", …). */
export function inputStatusText(d: Pick<InputDecision, 'src' | 'device' | 'reason'>, lang: 'he' | 'en'): string {
  const he = lang === 'he';
  if (d.src === 'midi') return `MIDI: ${d.device === COMPUTER_KEYS_NAME ? (he ? 'מקלדת המחשב' : 'computer keyboard') : (d.device ?? 'MIDI')}`;
  switch (d.reason) {
    case 'unsupported':
      return he ? 'מיקרופון (בדפדפן הזה אין MIDI)' : 'Microphone (this browser has no MIDI)';
    case 'pref-mic':
    case 'guitar-mic':
    case 'kit-mic':
      return he ? 'מיקרופון (נבחר בהגדרות)' : 'Microphone (chosen in Settings)';
    case 'sung':
      return he ? 'מיקרופון' : 'Microphone';
    default:
      return he ? 'מיקרופון (אין מקלדת מחוברת)' : 'Microphone (no keyboard connected)';
  }
}

/**
 * R4: watch the MIDI input a take listens to; `onLost` runs once when it disconnects (the take then ends as a technical
 * failure: not graded, stored, counted or uploaded). Returns the stop function.
 */
export function watchMidiLoss(m: { devices: readonly string[]; onState: (cb: () => void) => () => void }, device: string, onLost: () => void): () => void {
  let lost = false;
  return m.onState(() => {
    if (lost || m.devices.includes(device)) return;
    lost = true;
    onLost();
  });
}

// ── R1: MIDI on by itself when the browser already granted it; the prompt only from a tap ──
type PermStatus = { state: string; onchange: (() => void) | null };
type PermsLike = { query: (d: { name: string }) => Promise<PermStatus> };
type Enabler = { supported: boolean; enable: () => Promise<unknown> };

/**
 * Enable MIDI now if the browser has already granted it, and again whenever the grant appears (never a prompt: the
 * permission query only reads). Resolves to a stop function. `perms` / `m` are injectable for tests.
 */
export async function enableMidiIfGranted(m: Enabler = midi, perms: PermsLike | undefined = typeof navigator !== 'undefined' ? (navigator as unknown as { permissions?: PermsLike }).permissions : undefined): Promise<() => void> {
  if (!m.supported || !perms?.query) return () => {};
  let st: PermStatus;
  try {
    st = await perms.query({ name: 'midi' });
  } catch {
    return () => {};
  }
  const go = () => {
    if (st.state === 'granted') void m.enable().catch(() => {});
  };
  go();
  st.onchange = go;
  return () => {
    st.onchange = null;
  };
}
