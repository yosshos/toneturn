import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { browserFilesDeps, ELEMENT_START_MS, playOrder, VoiceFiles } from '../src/speech/voice/files';
import { voiceKey, VOICE_MODEL } from '../src/speech/voice/manifest';

// Playtest 0.68 (owner): no narration at all on an Android phone while the piano sounds. 0.66–0.68 played each
// recording through an <audio> element only; now a Normal-speed line plays through the app's Web Audio context (the
// piano's path) first, and every output that fails or never starts hands over to the next, then to reading.

describe('which output plays a recording', () => {
  it('Normal speed on a running context → Web Audio first; Slow / Fast keep the pitch on <audio> first', () => {
    expect(playOrder(1, true)).toEqual(['webaudio', 'element']);
    expect(playOrder(0.85, true)).toEqual(['element', 'webaudio']);
    expect(playOrder(1.15, true)).toEqual(['element', 'webaudio']);
    expect(playOrder(1, false)).toEqual(['element', 'webaudio']);
  });
});

/** A fake AudioContext: records started buffers; `ends` resolves each source right away. */
function fakeCtx(state: AudioContextState = 'running') {
  const started: number[] = [];
  const ctx = {
    state,
    resume: vi.fn(async () => {
      ctx.state = 'running';
    }),
    decodeAudioData: vi.fn(async (b: ArrayBuffer) => ({ length: b.byteLength }) as unknown as AudioBuffer),
    createBufferSource: () => {
      const node = {
        buffer: null as unknown,
        playbackRate: { value: 1 },
        onended: null as null | (() => void),
        connect: () => node,
        start: () => {
          started.push(1);
          setTimeout(() => node.onended?.(), 0);
        },
        stop: () => {},
      };
      return node;
    },
  };
  return { ctx: ctx as unknown as AudioContext & { state: AudioContextState }, started, out: {} as AudioNode };
}

class FakeAudio {
  static made = 0;
  static behaviour: 'ok' | 'reject' | 'hang' = 'ok';
  src = '';
  preload = '';
  playbackRate = 1;
  volume = 1;
  private ls: Record<string, (() => void)[]> = {};
  constructor() {
    FakeAudio.made++;
  }
  play() {
    if (FakeAudio.behaviour === 'reject') return Promise.reject(Object.assign(new Error('no source'), { name: 'NotSupportedError' }));
    if (FakeAudio.behaviour === 'hang') return new Promise<void>(() => {});
    setTimeout(() => this.ls.ended?.forEach((f) => f()), 0);
    return Promise.resolve();
  }
  pause() {}
  addEventListener(t: string, f: () => void) {
    (this.ls[t] ??= []).push(f);
  }
  removeEventListener(t: string, f: () => void) {
    this.ls[t] = (this.ls[t] ?? []).filter((g) => g !== f);
  }
}

describe('browser playback of a recording', () => {
  const g = globalThis as unknown as Record<string, unknown>;
  beforeEach(() => {
    g.window = globalThis;
    g.Audio = FakeAudio;
    FakeAudio.made = 0;
    FakeAudio.behaviour = 'ok';
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    delete g.Audio;
  });

  it('plays through the running Web Audio context (the piano path) without touching <audio>', async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array(100), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const a = fakeCtx();
    const d = browserFilesDeps('/', () => ({ ctx: a.ctx, out: a.out }), () => 0.9);
    await d.play('/voice/en/x.mp3', 1, new AbortController().signal);
    expect(a.started).toHaveLength(1);
    expect(FakeAudio.made).toBe(0);
  });

  it('a manifest entry without a file (404) fails cleanly: the line is reported unplayed (the caller reads it)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>', { status: 404 })));
    FakeAudio.behaviour = 'reject';
    const a = fakeCtx();
    const deps = browserFilesDeps('/', () => ({ ctx: a.ctx, out: a.out }), () => 0.9);
    const f = new VoiceFiles({ ...deps, loadManifest: async () => ({ v: 1, voice: 'af_heart', model: VOICE_MODEL, files: { [voiceKey('Listen.')]: 900 } }) });
    await f.load();
    expect(await f.speak('Listen.', 1, new AbortController().signal)).toBe(false);
    expect(a.started).toHaveLength(0);
  });

  it('an <audio> element that never starts gives way to Web Audio after a few seconds', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array(10), { status: 200 })));
    FakeAudio.behaviour = 'hang';
    const a = fakeCtx('suspended'); // not running yet → <audio> is tried first
    const d = browserFilesDeps('/', () => ({ ctx: a.ctx, out: a.out }), () => 0.9);
    let done = false;
    const p = d.play('/voice/en/x.mp3', 1, new AbortController().signal).then(() => (done = true));
    await vi.advanceTimersByTimeAsync(ELEMENT_START_MS - 100);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(500);
    await p;
    expect(FakeAudio.made).toBe(1);
    expect(a.started).toHaveLength(1);
  });
});
