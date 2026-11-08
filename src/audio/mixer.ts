// The mixer (owner 2026-11-08): a channel strip per sound source, the way a studio desk works.
// Channel: input → 3-band EQ (low shelf 120 Hz, mid peak 1 kHz, high shelf 6 kHz) → compressor → chorus → fader → pan
// → the master limiter; plus post-fader sends to a shared reverb (a small room or a hall) and a shared delay.
// The defaults reproduce the app's sound before the mixer existed. Processed ear-training sounds never pass through it.

export type ChannelId = 'piano' | 'bass' | 'drums' | 'cues';
export const CHANNELS: ChannelId[] = ['piano', 'bass', 'drums', 'cues'];
export const CHANNEL_NAME: Record<ChannelId, { en: string; he: string }> = {
  piano: { en: 'Piano & instruments', he: 'פסנתר וכלים' },
  bass: { en: 'Bass', he: 'בס' },
  drums: { en: 'Drums & metronome', he: 'תופים ומטרונום' },
  cues: { en: 'Cues & bells', he: 'רמזים ופעמונים' },
};

export interface ChannelSettings {
  /** Fader 0..1.5 (1 = unity). */
  vol: number;
  mute: boolean;
  solo: boolean;
  /** −1 left … 1 right. */
  pan: number;
  /** EQ gains in dB (−12 … 12). */
  low: number;
  mid: number;
  high: number;
  /** 0..1 each. */
  comp: number;
  chorus: number;
  reverb: number;
  delay: number;
  reverbType: 'room' | 'hall';
}
export interface MixerSettings {
  channels: Record<ChannelId, ChannelSettings>;
  /** Delay time (ms) and feedback (0..0.8). */
  delayMs: number;
  feedback: number;
}

const ch = (o: Partial<ChannelSettings>): ChannelSettings => ({ vol: 1, mute: false, solo: false, pan: 0, low: 0, mid: 0, high: 0, comp: 0, chorus: 0, reverb: 0, delay: 0, reverbType: 'room', ...o });
/** Today's sound: piano and bass in a light room, drums and cues with a touch of hall. */
export const DEFAULT_MIXER: MixerSettings = {
  channels: {
    piano: ch({ reverb: 0.5 }),
    bass: ch({ reverb: 0.5 }),
    drums: ch({ reverb: 0.3, reverbType: 'hall' }),
    cues: ch({ reverb: 1, reverbType: 'hall' }),
  },
  delayMs: 375,
  feedback: 0.3,
};
/** Merge stored settings over the defaults (new fields / channels get their default). */
export function mixerOf(m: Partial<MixerSettings> | null | undefined): MixerSettings {
  const base = DEFAULT_MIXER;
  const channels = {} as Record<ChannelId, ChannelSettings>;
  for (const id of CHANNELS) channels[id] = { ...base.channels[id], ...(m?.channels?.[id] ?? {}) };
  return { channels, delayMs: m?.delayMs ?? base.delayMs, feedback: m?.feedback ?? base.feedback };
}

/** Send levels: a channel's reverb knob (0..1) → the send gain into the shared reverb (0.3 = today's room wet). */
export const REVERB_SEND = 0.3;
/** Effective gain of a channel's fader (mute / solo applied). */
export function effectiveVol(m: MixerSettings, id: ChannelId): number {
  const c = m.channels[id];
  const anySolo = CHANNELS.some((x) => m.channels[x].solo);
  if (c.mute || (anySolo && !c.solo)) return 0;
  return Math.max(0, Math.min(1.5, c.vol));
}
export const dbOf = (vol: number) => (vol <= 0.0001 ? -Infinity : 20 * Math.log10(vol));

/** One channel strip in a Web Audio graph. */
export class ChannelStrip {
  readonly input: GainNode;
  private low: BiquadFilterNode;
  private mid: BiquadFilterNode;
  private high: BiquadFilterNode;
  private comp: DynamicsCompressorNode;
  private makeup: GainNode;
  private chorusWet: GainNode;
  private fader: GainNode;
  private pan: StereoPannerNode;
  private roomSend: GainNode;
  private hallSend: GainNode;
  private delaySend: GainNode;

  constructor(
    private ctx: BaseAudioContext,
    out: AudioNode,
    buses: { room: AudioNode; hall: AudioNode; delay: AudioNode },
  ) {
    const c = ctx;
    this.input = c.createGain();
    this.low = c.createBiquadFilter();
    this.low.type = 'lowshelf';
    this.low.frequency.value = 120;
    this.mid = c.createBiquadFilter();
    this.mid.type = 'peaking';
    this.mid.frequency.value = 1000;
    this.mid.Q.value = 0.9;
    this.high = c.createBiquadFilter();
    this.high.type = 'highshelf';
    this.high.frequency.value = 6000;
    this.comp = c.createDynamicsCompressor();
    this.comp.knee.value = 6;
    this.comp.attack.value = 0.006;
    this.comp.release.value = 0.18;
    this.makeup = c.createGain();
    // chorus: a short delay swept by a slow LFO, mixed back in
    const sum = c.createGain();
    const cd = c.createDelay(0.05);
    cd.delayTime.value = 0.018;
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.7;
    const depth = c.createGain();
    depth.gain.value = 0.0035;
    lfo.connect(depth).connect(cd.delayTime);
    lfo.start();
    this.chorusWet = c.createGain();
    this.fader = c.createGain();
    this.pan = c.createStereoPanner();
    this.input.connect(this.low).connect(this.mid).connect(this.high).connect(this.comp).connect(this.makeup);
    this.makeup.connect(sum);
    this.makeup.connect(cd).connect(this.chorusWet).connect(sum);
    sum.connect(this.fader).connect(this.pan).connect(out);
    this.roomSend = c.createGain();
    this.hallSend = c.createGain();
    this.delaySend = c.createGain();
    this.pan.connect(this.roomSend).connect(buses.room);
    this.pan.connect(this.hallSend).connect(buses.hall);
    this.pan.connect(this.delaySend).connect(buses.delay);
  }

  apply(s: ChannelSettings, vol: number) {
    const t = this.ctx.currentTime;
    const set = (p: AudioParam, v: number) => p.setTargetAtTime(v, t, 0.03);
    set(this.low.gain, s.low);
    set(this.mid.gain, s.mid);
    set(this.high.gain, s.high);
    // compressor amount: 0 = off (ratio 1), 1 = a firm squeeze; make-up gain keeps the level about the same
    set(this.comp.threshold, -6 - 24 * s.comp);
    set(this.comp.ratio, 1 + 7 * s.comp);
    set(this.makeup.gain, Math.pow(10, (5 * s.comp) / 20));
    set(this.chorusWet.gain, 0.6 * s.chorus);
    set(this.fader.gain, vol);
    set(this.pan.pan, Math.max(-1, Math.min(1, s.pan)));
    set(this.roomSend.gain, s.reverbType === 'room' ? REVERB_SEND * s.reverb : 0);
    set(this.hallSend.gain, s.reverbType === 'hall' ? REVERB_SEND * s.reverb * 0.73 : 0);
    set(this.delaySend.gain, 0.35 * s.delay);
  }
}
