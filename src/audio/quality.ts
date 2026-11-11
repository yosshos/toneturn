// Sound quality tiers (SOUND_LIVE_SESSION.md Phase 0, 0.69): how much decoded audio one session may hold.
//
// An AudioBuffer is Float32 at its sample rate: a 2.8 MB MP3 layer of the grand becomes ~80 MB in memory. iOS Safari
// kills a tab well below 1 GB and exposes neither `deviceMemory` nor `saveData`, so the old `lightDevice()` treated
// every iPhone as a computer and decoded all 16 layers (~1.28 GB). The tiers:
//
//  - Lite      ≤ 150 MB: Data Saver, a slow connection, under 4 GB of memory, an old iOS.
//  - Standard  ≤ 300 MB: phones and tablets (every iPhone and iPad by default).
//  - Studio    the full sets, exactly as before: computers.
//
// Each tier keeps fewer velocity layers of the grand, shorter tails and a 32 kHz decode; the band loads only when a
// screen needs it, and sets not used for a while are let go. Pure helpers here; the engine (piano.ts) applies them.

export type SoundTier = 'lite' | 'standard' | 'studio';
export type SoundQuality = 'auto' | SoundTier;

export interface TierSpec {
  /** Indices (of the 16 sorted by lowest velocity) of the grand layers this tier keeps; null = all of them. */
  grandLayers: number[] | null;
  /** Longest grand note kept (s); the last part fades out. Infinity = the full recording. */
  grandTail: number;
  /** Fold the grand's notes to mono. */
  monoGrand: boolean;
  /** The grand's release resonance samples (the strings ringing on after a key is let go). */
  releaseRes: boolean;
  /** Fold the grand's release noises, resonances and pedal to mono (quiet, short sounds). */
  monoRelease: boolean;
  /** Longest band sample (jazz kit, pizzicato bass) and release sample kept (s). */
  bandTail: number;
  /** Fold the band's stereo samples (the drums) to mono. */
  monoBand: boolean;
  /** Decode rate (Hz); null = the playing context's rate (48 kHz). */
  rate: number | null;
  /** Decoded memory this tier may hold (MB); past it, idle sets are let go and new ones refused. */
  budgetMB: number;
  /** Load the band (jazz kit, pizzicato bass) shortly after sound starts, as before 0.69. */
  preloadBand: boolean;
  /** A set not played for this long (ms), and not part of the chosen sound or screen, is let go. */
  idleMs: number;
}

/**
 * Sizes measured from the files (durations × rate × channels × 4 bytes; see SOUND_LIVE_SESSION.md §7):
 *  - Lite: grand 4 layers mono ≈ 57 MB + release/pedal 6 + jazz kit 33 + pizz bass 37 + small bass 3 ≈ 136 MB.
 *  - Standard: grand 5 layers stereo ≈ 188 MB + release sounds 20 + kit 37 + pizz bass 44 + small bass 4 ≈ 293 MB.
 *  - Studio: everything as before 0.69 — 16 layers 1,230 MB + release sounds 59 + kit 118 + pizz bass 67 ≈ 1.48 GB.
 */
export const TIERS: Record<SoundTier, TierSpec> = {
  // 4 layers: pp, mp, mf, f (lowest velocities 35, 57, 81, 105)
  lite: { grandLayers: [2, 7, 10, 13], grandTail: 4, monoGrand: true, releaseRes: false, monoRelease: true, bandTail: 2.5, monoBand: true, rate: 32000, budgetMB: 150, preloadBand: false, idleMs: 2 * 60_000 },
  // 5 layers (35, 51, 73, 89, 113): the everyday velocity 0.75 (= 95) gets its own layer; 6 s tails
  standard: { grandLayers: [2, 6, 9, 11, 14], grandTail: 6, monoGrand: false, releaseRes: true, monoRelease: true, bandTail: 3.5, monoBand: true, rate: 32000, budgetMB: 300, preloadBand: false, idleMs: 4 * 60_000 },
  // the full library, as before: 16 layers, full tails, 48 kHz, stereo. The 16-layer grand alone is ~1.23 GB, so the
  // cap sits above it (the report's "≤ 1 GB" needs shared tails or Int16 voices — Phase 4).
  studio: { grandLayers: null, grandTail: Infinity, monoGrand: false, releaseRes: true, monoRelease: false, bandTail: Infinity, monoBand: false, rate: null, budgetMB: 1600, preloadBand: true, idleMs: 20 * 60_000 },
};

/** What the browser tells us about the device (all optional: Safari exposes little). */
export interface DeviceFacts {
  ua: string;
  maxTouchPoints?: number;
  /** GB, rounded down by the browser and capped at 8 (Chromium only). */
  deviceMemory?: number;
  saveData?: boolean;
  effectiveType?: string;
  cores?: number;
}

export function deviceFacts(): DeviceFacts {
  if (typeof navigator === 'undefined') return { ua: '' };
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } };
  return { ua: n.userAgent ?? '', maxTouchPoints: n.maxTouchPoints, deviceMemory: n.deviceMemory, saveData: n.connection?.saveData, effectiveType: n.connection?.effectiveType, cores: n.hardwareConcurrency };
}

/** iPhone, iPad or iPod — including an iPad asking for the desktop site (it says "Macintosh" but has touch). */
export function isIOS(f: DeviceFacts): boolean {
  return /iPhone|iPad|iPod/.test(f.ua) || (/Macintosh/.test(f.ua) && (f.maxTouchPoints ?? 0) > 1);
}

/** The iOS major version from the user agent ("OS 17_4 like Mac OS X"); null when it doesn't say (iPad desktop mode). */
export function iosVersion(f: DeviceFacts): number | null {
  const m = /OS (\d+)[_.]\d+.* like Mac OS X/.exec(f.ua);
  return m ? Number(m[1]) : null;
}

export function isMobile(f: DeviceFacts): boolean {
  return isIOS(f) || /Android|Mobi/.test(f.ua);
}

/** The tier "Automatic" picks for this device. */
export function autoTier(f: DeviceFacts): SoundTier {
  if (f.saveData || /(^|-)2g|3g/.test(f.effectiveType ?? '')) return 'lite';
  if (f.deviceMemory !== undefined && f.deviceMemory < 4) return 'lite';
  if (f.cores !== undefined && f.cores > 0 && f.cores <= 2) return 'lite';
  if (isIOS(f)) {
    // iOS hides its memory: Standard on every iPhone/iPad, Lite on the old ones (iOS 15 and earlier ran on 2 GB phones).
    const v = iosVersion(f);
    return v !== null && v <= 15 ? 'lite' : 'standard';
  }
  if (isMobile(f)) return 'standard';
  // a computer: Studio, unless it says it has only 4 GB
  return f.deviceMemory !== undefined && f.deviceMemory < 8 ? 'standard' : 'studio';
}

export function tierOf(q: SoundQuality | undefined, f: DeviceFacts = deviceFacts()): SoundTier {
  return q && q !== 'auto' ? q : autoTier(f);
}

/** The setting from the stored choice, with the 0.54 "grand detail" as its old form (full → Studio, light → Standard). */
export function qualityOf(s: { soundQuality?: SoundQuality; pianoDetail?: 'auto' | 'full' | 'light' }): SoundQuality {
  if (s.soundQuality) return s.soundQuality;
  return s.pianoDetail === 'full' ? 'studio' : s.pianoDetail === 'light' ? 'standard' : 'auto';
}

/** The grand layers (indices into the n layers sorted by lowest velocity) a tier keeps. */
export function grandLayerSet(n: number, tier: SoundTier): number[] {
  const keep = TIERS[tier].grandLayers;
  if (!keep || n < 16) return Array.from({ length: n }, (_, i) => i);
  return keep.filter((i) => i < n);
}

/** The order the grand's layers load in: the everyday ones first, only the tier's own. */
export function grandLoadOrder(n: number, tier: SoundTier): number[] {
  const pref = [10, 7, 12, 4, 14, 8, 5, 2, 11, 9, 13, 15, 6, 3, 1, 0];
  const keep = new Set(grandLayerSet(n, tier));
  // the tier's layers in the preferred order; for a subset, the one nearest the everyday velocity (layer 11) first
  const all = pref.filter((i) => i < n && keep.has(i));
  if (TIERS[tier].grandLayers && n >= 16) all.sort((a, b) => Math.abs(a - 10.5) - Math.abs(b - 10.5));
  return all;
}

/** Decoded size (bytes) of a buffer: Float32 per sample per channel. */
export function bufferBytes(b: { length: number; numberOfChannels: number }): number {
  return b.length * b.numberOfChannels * 4;
}

/**
 * How many frames to keep of a sample `frames` long at `rate`, capped at `maxSec`; and the fade length (frames) at the
 * end of the kept part. No cap (or a short sample): everything, no fade.
 */
export function tailCut(frames: number, rate: number, maxSec: number, fadeSec = 0.6): { keep: number; fade: number } {
  if (!Number.isFinite(maxSec) || frames <= maxSec * rate) return { keep: frames, fade: 0 };
  const keep = Math.max(1, Math.floor(maxSec * rate));
  return { keep, fade: Math.min(keep, Math.floor(fadeSec * rate)) };
}

/** The gain at frame `i` of a fade of `n` frames (an equal-power cosine, 1 → 0). */
export function fadeGain(i: number, n: number): number {
  if (n <= 0) return 1;
  return Math.cos((Math.min(n, Math.max(0, i)) / n) * (Math.PI / 2));
}

/**
 * What the engine holds, set by set: decoded bytes and when each was last played. The engine adds a set when it has
 * decoded it, touches it on every note, and asks which sets have gone idle or which to let go to fit a budget.
 */
export class MemoryLedger {
  private sets = new Map<string, { bytes: number; used: number }>();
  /** The largest total held at any time this session (bytes). */
  peak = 0;
  add(id: string, bytes: number, now: number) {
    this.sets.set(id, { bytes, used: now });
    this.peak = Math.max(this.peak, this.total);
  }
  remove(id: string) {
    this.sets.delete(id);
  }
  has(id: string) {
    return this.sets.has(id);
  }
  touch(id: string, now: number) {
    const s = this.sets.get(id);
    if (s) s.used = now;
  }
  get total(): number {
    let t = 0;
    for (const s of this.sets.values()) t += s.bytes;
    return t;
  }
  /** Sets not played for `idleMs`, except the pinned ones, oldest first. */
  idle(now: number, idleMs: number, pinned: (id: string) => boolean): string[] {
    return [...this.sets.entries()]
      .filter(([id, s]) => now - s.used >= idleMs && !pinned(id))
      .sort((a, b) => a[1].used - b[1].used)
      .map(([id]) => id);
  }
  /** Sets to let go (least recently played first, never pinned ones) so `extra` more bytes fit under `budget`. */
  toFit(extra: number, budget: number, pinned: (id: string) => boolean): string[] {
    let total = this.total + extra;
    const out: string[] = [];
    if (total <= budget) return out;
    for (const [id, s] of [...this.sets.entries()].sort((a, b) => a[1].used - b[1].used)) {
      if (total <= budget) break;
      if (pinned(id)) continue;
      out.push(id);
      total -= s.bytes;
    }
    return out;
  }
  /** Per set, largest first (for Diagnostics). */
  list(): { id: string; bytes: number; used: number }[] {
    return [...this.sets.entries()].map(([id, s]) => ({ id, ...s })).sort((a, b) => b.bytes - a.bytes);
  }
}

/** Bluetooth headphones and speakers add 150–300 ms that the system under-reports; at or past this, warn. */
export const BLUETOOTH_MS = 150;

/** An output device whose name says it is wireless. */
export function wirelessName(label: string): boolean {
  return /bluetooth|airpods|buds|beats|hands-?free|headset \(|\bbt\b|wh-1000|wf-1000|jbl|bose|sony wh/i.test(label);
}

/**
 * When a live note should start (context time): the MIDI event's own time plus a small constant lead, so a busy main
 * thread changes nothing but the (constant) delay. `ageSec` is how long ago the event happened (now − its timestamp);
 * an unknown, negative or stale age (> 40 ms, e.g. a different clock) plays at once with the lead.
 */
export function liveStart(now: number, ageSec: number | null, lead: number): number {
  if (ageSec === null || !Number.isFinite(ageSec) || ageSec < 0 || ageSec > 0.04) return now + Math.min(lead, 0.003);
  return now + Math.max(0, lead - ageSec);
}

/** The AudioContext latency hint for the "Live play latency" setting. Safari ignores it. */
export type LatencyMode = 'auto' | 'low';
export function latencyHintOf(m: LatencyMode | undefined): AudioContextLatencyCategory | number {
  return m === 'low' ? 0 : 'interactive';
}
