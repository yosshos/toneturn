import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { clipKey, cyrb53, normText } from '../src/speech/kokoro/hash';
import { ClipCache, fromPcm16, memoryClipStore, toPcm16, type Clip } from '../src/speech/kokoro/cache';
import { paceFor, pickBackend, SLOW_FACTOR, tooSlow, wantsKokoro, KOKORO_VOICE } from '../src/speech/kokoro/decide';
import { KokoroNarrator, type KokoroDeps, type PlayOut, type WorkerLike } from '../src/speech/kokoro/engine';
import type { FromWorker, ToWorker } from '../src/speech/kokoro/protocol';
import { BrowserPromptPlayer } from '../src/speech/tts';
import { setTalk } from '../src/speech/talk';
import { Cancelled } from '../src/game/adapters';

const clip = (n: number, sr = 24000): Clip => ({ pcm: new Int16Array(n), sr });
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('text hash', () => {
  it('is stable and depends on voice, speed and text', () => {
    expect(cyrb53('hello')).toBe(cyrb53('hello'));
    expect(cyrb53('hello')).not.toBe(cyrb53('hellp'));
    const k = clipKey('af_heart', 1, 'B flat is degree five.');
    expect(clipKey('af_heart', 1, 'B flat is degree five.')).toBe(k);
    expect(clipKey('af_bella', 1, 'B flat is degree five.')).not.toBe(k);
    expect(clipKey('af_heart', 1.15, 'B flat is degree five.')).not.toBe(k);
    expect(clipKey('af_heart', 1, 'B flat is degree four.')).not.toBe(k);
  });
  it('ignores whitespace differences', () => {
    expect(normText('  Listen.\n  In  C major ')).toBe('Listen. In C major');
    expect(clipKey('af_heart', 1, 'Listen.  Now')).toBe(clipKey('af_heart', 1, ' Listen. Now\n'));
  });
});

describe('clip cache (LRU, size cap)', () => {
  it('keeps 16-bit audio and survives a round trip', () => {
    const f = new Float32Array([0, 0.5, -0.5, 1, -1, 2]);
    const back = fromPcm16(toPcm16(f));
    expect(back[1]).toBeCloseTo(0.5, 3);
    expect(back[2]).toBeCloseTo(-0.5, 3);
    expect(back[5]).toBe(1); // clipped
  });

  it('evicts the least recently used lines past the cap', async () => {
    let now = 0;
    const store = memoryClipStore();
    const c = new ClipCache(store, 3000, () => ++now); // 1000 bytes per 500-sample clip
    await c.put('a', clip(500));
    await c.put('b', clip(500));
    await c.put('c', clip(500));
    expect(await c.bytes()).toBe(3000);
    await c.get('a'); // a is fresh again → b is the oldest
    await c.put('d', clip(500));
    expect(await c.get('b')).toBeNull();
    expect(await c.get('a')).not.toBeNull();
    expect(await c.get('c')).not.toBeNull();
    expect(await c.get('d')).not.toBeNull();
    expect(store.clips.has('b')).toBe(false);
    expect(await c.bytes()).toBeLessThanOrEqual(3000);
  });

  it('reads its index back from the store (a new session)', async () => {
    const store = memoryClipStore();
    await new ClipCache(store).put('x', clip(10));
    const again = new ClipCache(store);
    expect((await again.get('x'))?.pcm.length).toBe(10);
    expect(await again.get('y')).toBeNull();
  });

  it('never stores a clip larger than the cap', async () => {
    const c = new ClipCache(memoryClipStore(), 100);
    await c.put('big', clip(1000));
    expect(await c.get('big')).toBeNull();
  });
});

describe('decisions', () => {
  it('falls back when generation is slower than 1.5× real time', () => {
    expect(SLOW_FACTOR).toBe(1.5);
    expect(tooSlow(1000, 3000)).toBe(false);
    expect(tooSlow(4400, 3000)).toBe(false);
    expect(tooSlow(4600, 3000)).toBe(true);
    expect(tooSlow(100, 0)).toBe(true);
  });
  it('loads the model only for English narration, never for Hebrew or automated runs', () => {
    expect(wantsKokoro('en', true, false)).toBe(true);
    expect(wantsKokoro('he', true, false)).toBe(false);
    expect(wantsKokoro('en', false, false)).toBe(false);
    expect(wantsKokoro('en', true, true)).toBe(false);
  });
  it('runs fp32 on WebGPU, else q8 on WASM (also when the player saves data)', () => {
    expect(pickBackend(true)).toEqual({ device: 'webgpu', dtype: 'fp32' });
    expect(pickBackend(false)).toEqual({ device: 'wasm', dtype: 'q8' });
    expect(pickBackend(true, true)).toEqual({ device: 'wasm', dtype: 'q8' });
  });
  it('types at the voice’s pace', () => {
    // 5 words, one full stop (380 ms breath): (2380 − 380) / 5 = 400
    expect(paceFor('one two three four five.', 2380)).toBe(400);
    expect(paceFor('fast', 10)).toBe(60);
  });
});

/** A fake Kokoro worker: answers 'load' with ready (at a chosen speed) and 'gen' with a second of audio per 10 chars. */
class FakeWorker implements WorkerLike {
  onmessage: ((e: MessageEvent<FromWorker>) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  sent: ToWorker[] = [];
  gens: string[] = [];
  terminated = false;
  constructor(
    public rtf = 0.3,
    public fail = false,
    public genRtf = rtf,
  ) {}
  private emit(m: FromWorker) {
    setTimeout(() => this.onmessage?.({ data: m } as MessageEvent<FromWorker>), 0);
  }
  postMessage(m: ToWorker) {
    this.sent.push(m);
    if (m.type === 'load') {
      if (this.fail) return this.emit({ type: 'error', message: 'fetch failed' });
      this.emit({ type: 'progress', pct: 40 });
      this.emit({ type: 'ready', genMs: 3000 * this.rtf, audioMs: 3000 });
    } else if (m.type === 'gen') {
      this.gens.push(m.text);
      const sr = 24000;
      const secs = Math.max(0.1, m.text.length / 10);
      this.emit({ type: 'audio', id: m.id, pcm: new Float32Array(Math.round(secs * sr)), sr, genMs: secs * 1000 * this.genRtf });
    }
  }
  terminate() {
    this.terminated = true;
  }
}

function fakeOut() {
  const played: number[] = [];
  let stops = 0;
  const out: PlayOut = {
    play(pcm) {
      played.push(pcm.length);
      let end!: () => void;
      const done = new Promise<void>((r) => (end = r));
      setTimeout(() => end(), 5);
      return { done, stop: () => (stops++, end()) };
    },
  };
  return { out, played, stops: () => stops };
}

function narrator(w: FakeWorker | (() => FakeWorker), store = memoryClipStore(), gpu = false) {
  const o = fakeOut();
  let made = 0;
  const deps: KokoroDeps = {
    makeWorker: () => (made++, typeof w === 'function' ? w() : w),
    cache: new ClipCache(store),
    out: () => o.out,
    hasWebGpu: async () => gpu,
    saveData: () => false,
    online: () => true,
  };
  return { n: new KokoroNarrator(deps), o, made: () => made, store };
}

describe('Kokoro narrator', () => {
  it('loads once, speaks, and caches each line', async () => {
    const w = new FakeWorker();
    const { n, o, made, store } = narrator(w);
    expect(n.state.state).toBe('off');
    expect(await n.ensure()).toBe(true);
    expect(n.state).toMatchObject({ state: 'ready', device: 'wasm' });
    expect(w.sent[0]).toMatchObject({ type: 'load', dtype: 'q8', device: 'wasm', voice: KOKORO_VOICE });
    await n.speak('Listen to this.', new AbortController().signal);
    await n.speak('Listen to this.', new AbortController().signal);
    expect(w.gens).toEqual(['Listen to this.']);
    expect(o.played.length).toBe(2);
    expect(made()).toBe(1);
    expect(store.clips.size).toBe(1);
  });

  it('a line cached on the device plays without generating', async () => {
    const store = memoryClipStore();
    const first = narrator(new FakeWorker(), store);
    await first.n.ensure();
    await first.n.speak('Hello again.', new AbortController().signal);
    await tick();
    const w2 = new FakeWorker();
    const second = narrator(w2, store);
    await second.n.ensure();
    await second.n.speak('Hello again.', new AbortController().signal);
    expect(w2.gens).toEqual([]);
  });

  it('prefetches the next lines; speaking one then needs no new generation', async () => {
    const w = new FakeWorker();
    const { n } = narrator(w);
    await n.ensure();
    n.prefetch(['Step two.', 'Step three.']);
    await new Promise((r) => setTimeout(r, 20));
    expect(w.gens).toEqual(['Step two.', 'Step three.']);
    await n.speak('Step two.', new AbortController().signal);
    expect(w.gens.length).toBe(2);
  });

  it('reports the line length for TypedText pacing', async () => {
    const { n } = narrator(new FakeWorker());
    await n.ensure();
    const lines: { text: string; ms: number }[] = [];
    n.onLine((l) => lines.push(l));
    await n.speak('ten chars!', new AbortController().signal, 'Ten chars!');
    expect(lines).toEqual([{ text: 'Ten chars!', ms: 1000 }]);
  });

  it('stops audio and rejects with Cancelled on abort', async () => {
    const { n, o } = narrator(new FakeWorker());
    await n.ensure();
    const c = new AbortController();
    const p = n.speak('A long sentence that plays for a while.', c.signal);
    await new Promise((r) => setTimeout(r, 2));
    c.abort();
    await expect(p).rejects.toBeInstanceOf(Cancelled);
    // aborted before or during playback: either nothing played or it was stopped
    expect(o.played.length === 0 || o.stops() === 1).toBe(true);
  });

  it('falls back (unavailable, slow) when the calibration sentence is slower than 1.5× real time', async () => {
    const w = new FakeWorker(1.8);
    const { n } = narrator(w);
    expect(await n.ensure()).toBe(false);
    expect(n.state).toMatchObject({ state: 'unavailable', why: 'slow' });
    expect(n.state.rtf).toBeCloseTo(1.8);
    expect(w.terminated).toBe(true);
    await expect(n.speak('Hi.', new AbortController().signal)).rejects.toThrow('unavailable');
  });

  it('falls back when the first real line is too slow, after playing it', async () => {
    const w = new FakeWorker(0.5, false, 2);
    const { n, o } = narrator(w);
    await n.ensure();
    await n.speak('First line.', new AbortController().signal);
    expect(o.played.length).toBe(1);
    expect(n.state).toMatchObject({ state: 'unavailable', why: 'slow' });
  });

  it('takes fp32 on WebGPU, and retries once on WASM q8 when WebGPU fails to start', async () => {
    const workers = [new FakeWorker(0.3, true), new FakeWorker()];
    let k = 0;
    const { n, made } = narrator(() => workers[k++], memoryClipStore(), true);
    expect(await n.ensure()).toBe(true);
    expect(workers[0].sent[0]).toMatchObject({ type: 'load', device: 'webgpu', dtype: 'fp32' });
    expect(workers[0].terminated).toBe(true);
    expect(workers[1].sent[0]).toMatchObject({ type: 'load', device: 'wasm', dtype: 'q8' });
    expect(n.state).toMatchObject({ state: 'ready', device: 'wasm', mb: 88 });
    expect(made()).toBe(2);
  });

  it('is unavailable when the model can’t load', async () => {
    const { n } = narrator(new FakeWorker(0.3, true));
    expect(await n.ensure()).toBe(false);
    expect(n.state).toMatchObject({ state: 'unavailable', why: 'error' });
  });
});

describe('the prompt player', () => {
  let n: {
    ensure: Mock<() => Promise<boolean>>;
    speak: Mock<(text: string, signal: AbortSignal, shownText?: string) => Promise<void>>;
    prefetch: Mock<(texts: string[]) => void>;
    stop: Mock<() => void>;
    worthLoading: Mock<() => Promise<boolean>>;
    isReady: boolean;
    state: { state: 'off' | 'ready' };
    speed: number;
  };
  let p: BrowserPromptPlayer;
  beforeEach(() => {
    vi.useFakeTimers();
    setTalk(true);
    n = { ensure: vi.fn(async () => true), speak: vi.fn(async () => {}), prefetch: vi.fn(), stop: vi.fn(), worthLoading: vi.fn(async () => true), isReady: true, state: { state: 'ready' }, speed: 1 };
    p = new BrowserPromptPlayer();
    p.narrator = n;
  });
  afterEach(() => vi.useRealTimers());

  it('never loads or speaks Hebrew', async () => {
    n.isReady = false;
    n.state = { state: 'off' };
    const done = p.speak('סי במול הוא דרגה חמש', 'he', new AbortController().signal);
    await vi.runAllTimersAsync();
    await done;
    p.prefetch(['שלום'], 'he');
    expect(p.speaking('he')).toBe(false);
    expect(n.ensure).not.toHaveBeenCalled();
    expect(n.speak).not.toHaveBeenCalled();
    expect(n.prefetch).not.toHaveBeenCalled();
  });

  it('speaks English through the narrator with the cleaned-up text', async () => {
    p.rate = 1.15;
    await p.speak('In E♭ major, B♭ is degree five.', 'en', new AbortController().signal);
    expect(n.speak).toHaveBeenCalledTimes(1);
    const [spoken, , shownText] = n.speak.mock.calls[0];
    expect(spoken).toMatch(/E flat/);
    expect(spoken).not.toMatch(/♭/);
    expect(shownText).toMatch(/♭/);
    expect(n.speed).toBe(1.15);
  });

  it('reads the line while the voice is still downloading, and starts the download', async () => {
    n.isReady = false;
    n.state = { state: 'off' };
    n.ensure = vi.fn(() => new Promise<boolean>(() => {}));
    const done = p.speak('Listen.', 'en', new AbortController().signal);
    await vi.runAllTimersAsync();
    await done;
    expect(n.ensure).toHaveBeenCalledTimes(1);
    expect(n.speak).not.toHaveBeenCalled();
  });

  it('never downloads the on-device model where it would be slow (no WebGPU): the line is read', async () => {
    n.isReady = false;
    n.state = { state: 'off' };
    n.worthLoading = vi.fn(async () => false);
    const done = p.speak('Listen.', 'en', new AbortController().signal);
    await vi.runAllTimersAsync();
    await done;
    expect(n.ensure).not.toHaveBeenCalled();
    expect(n.speak).not.toHaveBeenCalled();
  });

  it('reads instead when the voice gives up mid-session', async () => {
    n.speak = vi.fn(async () => {
      throw new Error('unavailable');
    });
    const done = p.speak('Listen.', 'en', new AbortController().signal);
    await vi.runAllTimersAsync();
    await expect(done).resolves.toBeUndefined();
  });

  it('reading mode (narrator off) never touches the voice', async () => {
    setTalk(false);
    const done = p.speak('Listen.', 'en', new AbortController().signal);
    await vi.runAllTimersAsync();
    await done;
    p.unlock();
    expect(n.ensure).not.toHaveBeenCalled();
    expect(n.speak).not.toHaveBeenCalled();
  });
});
