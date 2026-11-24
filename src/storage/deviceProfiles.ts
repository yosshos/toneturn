// Preferences per CONNECTED device (owner 2026-11-24): plugging keyboard A brings back A's sound choice, latency and
// touch, keyboard B brings back B's; each microphone keeps its own latency, each audio output its tap latency and
// latency mode. The flat settings (midiSound, midiLatencyMs, …) stay the values in use — every screen reads those — and
// this module keeps a copy per device id, swaps it in when the device changes and seeds a new device from the values
// in use. It all stays on this device (DEVICE_SETTINGS in progress.ts).
import type { Settings } from './progress';

export type DeviceKind = 'midi' | 'mic' | 'out';

/** What each kind of device remembers. */
export const PROFILE_KEYS: Record<DeviceKind, readonly (keyof Settings)[]> = {
  midi: ['midiSound', 'midiSoundAsked', 'midiLatencyMs', 'midiBiasMs', 'midiCurve', 'midiVolume', 'midiOctave', 'midiPedalInvert', 'midiGuitarChannels', 'midiBendRange'],
  mic: ['micLatencyMs'],
  out: ['tapLatencyMs', 'audioLatency'],
};

export type DeviceProfile = Partial<Settings>;

export interface PerDevice {
  midi?: Record<string, DeviceProfile>;
  mic?: Record<string, DeviceProfile>;
  out?: Record<string, DeviceProfile>;
  /** The device each kind's flat values belong to right now. */
  cur?: Partial<Record<DeviceKind, string>>;
}

/** The system default microphone / output when none is chosen. */
export const DEFAULT_DEVICE = 'default';

/** The device the flat values should follow: the MIDI input in use (null = none connected), the chosen mic / output. */
export function deviceIds(s: Settings, midi: string | null): Record<DeviceKind, string | null> {
  return { midi, mic: s.micDeviceId || DEFAULT_DEVICE, out: s.audioOutput || DEFAULT_DEVICE };
}

/** The MIDI input in use: the chosen one when it is connected, else the first connected one. */
export function activeMidiDevice(chosen: string | null | undefined, connected: readonly string[]): string | null {
  if (chosen && connected.includes(chosen)) return chosen;
  return connected[0] ?? null;
}

const pick = (s: Settings, keys: readonly (keyof Settings)[]): DeviceProfile => {
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = s[k];
  return out as DeviceProfile;
};

const same = (a: DeviceProfile | undefined, b: DeviceProfile, keys: readonly (keyof Settings)[]) => !!a && keys.every((k) => a[k] === b[k]);

/**
 * The settings after a change, with the device copies kept in step (pure; the same object back when nothing moved):
 * - the device of a kind changed (another keyboard, mic or output) → its stored values come back, or, for a device
 *   seen for the first time, it starts from the values in use (a new keyboard is asked about its own sound again);
 * - same device → the values in use are stored for it (so a later switch back finds them).
 */
export function reconcileDevices(next: Settings, midi: string | null): Settings {
  const ids = deviceIds(next, midi);
  let s = next;
  let pd: PerDevice = next.perDevice ?? {};
  let moved = false;
  for (const kind of ['midi', 'mic', 'out'] as DeviceKind[]) {
    const id = ids[kind];
    if (!id) continue;
    const keys = PROFILE_KEYS[kind];
    const book = pd[kind] ?? {};
    const cur = pd.cur?.[kind];
    if (cur !== id && book[id]) {
      // back to a device seen before: its values replace the ones in use
      const prof = book[id];
      const flat: Record<string, unknown> = { ...s };
      for (const k of keys) flat[k] = prof[k];
      s = flat as unknown as Settings;
      pd = { ...pd, cur: { ...pd.cur, [kind]: id } };
      moved = true;
      continue;
    }
    let prof = pick(s, keys);
    // a second keyboard is asked "does it make its own sound?" for itself (its answer starts as the values in use)
    if (kind === 'midi' && cur && cur !== id && !book[id]) prof = { ...prof, midiSoundAsked: undefined };
    if (cur === id && same(book[id], prof, keys)) continue;
    if (kind === 'midi' && prof.midiSoundAsked !== s.midiSoundAsked) s = { ...s, midiSoundAsked: prof.midiSoundAsked };
    pd = { ...pd, [kind]: { ...book, [id]: prof }, cur: { ...pd.cur, [kind]: id } };
    moved = true;
  }
  return moved ? { ...s, perDevice: pd } : next;
}

/** The keys whose values differ between two settings (shallow): what a save has to write. */
export function settingsDiff(prev: Settings | null | undefined, next: Settings): Partial<Settings> {
  if (!prev) return next;
  const out: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]) as Set<keyof Settings>;
  for (const k of keys) if (prev[k] !== next[k]) out[k] = next[k];
  return out as Partial<Settings>;
}
