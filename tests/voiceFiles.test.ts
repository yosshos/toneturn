import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { lookup, voiceKey, voiceUrl, VOICE_MODEL, type VoiceManifest } from '../src/speech/voice/manifest';
import { VoiceFiles, type FilesDeps } from '../src/speech/voice/files';
import { distinct, memoryLines, miniLines, previewLines } from '../src/speech/voice/lines';
import { BrowserPromptPlayer, type Narrator } from '../src/speech/tts';
import { setTalk } from '../src/speech/talk';
import { personal } from '../src/content/personal';
import { MINI_LESSONS } from '../src/content/minilessons';

const manifestOf = (lines: string[]): VoiceManifest => ({ v: 1, voice: 'af_heart', model: VOICE_MODEL, files: Object.fromEntries(lines.map((l) => [voiceKey(l), 2000])) });

describe('recording ids and the manifest', () => {
  it('ids follow the cleaned spoken text (symbols spelled out, spaces ignored)', () => {
    expect(voiceKey('In E♭ major.')).toBe(voiceKey('In  E♭ major. '));
    expect(voiceKey('In E♭ major.')).not.toBe(voiceKey('In E major.'));
    expect(voiceKey('Hi.', 'af_bella')).not.toBe(voiceKey('Hi.'));
    expect(voiceUrl('/toneturn/', 'abc')).toBe('/toneturn/voice/en/abc.mp3');
  });
  it('finds a line only in a manifest of the same voice and model', () => {
    const m = manifestOf(['Listen.']);
    expect(lookup(m, 'Listen.')).toEqual({ id: voiceKey('Listen.'), ms: 2000 });
    expect(lookup(m, 'Something else.')).toBeNull();
    expect(lookup({ ...m, model: 'older' }, 'Listen.')).toBeNull();
    expect(lookup(null, 'Listen.')).toBeNull();
  });
});

function files(lines: string[], playOk = true) {
  const played: { url: string; rate: number }[] = [];
  const deps: FilesDeps = {
    base: '/',
    loadManifest: async () => manifestOf(lines),
    play: async (url, rate) => {
      played.push({ url, rate });
      if (!playOk) throw new Error('decode failed');
    },
    warm: vi.fn(),
    stop: vi.fn(),
  };
  return { f: new VoiceFiles(deps), played, deps };
}

function fakeNarrator(ready: boolean, fast: boolean) {
  return {
    isReady: ready,
    state: { state: ready ? ('ready' as const) : ('off' as const) },
    speed: 1,
    ensure: vi.fn(async () => true),
    speak: vi.fn(async () => {}),
    prefetch: vi.fn(),
    stop: vi.fn(),
    worthLoading: vi.fn(async () => fast),
  } satisfies Narrator;
}

describe('fallback order: recording → on-device voice → reading', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setTalk(true);
  });
  afterEach(() => vi.useRealTimers());

  it('plays the recording when there is one, at the chosen speed, and the narrator stays idle', async () => {
    const { f, played } = files(['Listen to the chord.']);
    const n = fakeNarrator(true, true);
    const p = new BrowserPromptPlayer();
    p.recordings = f;
    p.narrator = n;
    p.rate = 0.85;
    await p.speak('Listen to the chord.', 'en', new AbortController().signal);
    expect(played).toEqual([{ url: `/voice/en/${voiceKey('Listen to the chord.')}.mp3`, rate: 0.85 }]);
    expect(n.speak).not.toHaveBeenCalled();
  });

  it('a line without a recording goes to the on-device voice where it is ready', async () => {
    const { f, played } = files([]);
    const n = fakeNarrator(true, true);
    const p = new BrowserPromptPlayer();
    p.recordings = f;
    p.narrator = n;
    await p.speak('B is degree seven in C major.', 'en', new AbortController().signal);
    expect(played).toEqual([]);
    expect(n.speak).toHaveBeenCalledTimes(1);
  });

  it('a phone without WebGPU: recorded lines play, others are read, the model is never downloaded', async () => {
    const { f, played } = files(['Listen.']);
    const n = fakeNarrator(false, false);
    const p = new BrowserPromptPlayer();
    p.recordings = f;
    p.narrator = n;
    await p.speak('Listen.', 'en', new AbortController().signal);
    const other = p.speak('B is degree seven in C major.', 'en', new AbortController().signal);
    await vi.runAllTimersAsync();
    await other;
    expect(played.length).toBe(1);
    expect(n.ensure).not.toHaveBeenCalled();
    expect(p.speaksLine('Listen.', 'en')).toBe(true);
    expect(p.speaksLine('B is degree seven in C major.', 'en')).toBe(false);
  });

  it('a recording that fails to play falls through to the next voice', async () => {
    const { f, played } = files(['Listen.'], false);
    const n = fakeNarrator(true, true);
    const p = new BrowserPromptPlayer();
    p.recordings = f;
    p.narrator = n;
    await p.speak('Listen.', 'en', new AbortController().signal);
    expect(played.length).toBe(1);
    expect(n.speak).toHaveBeenCalledTimes(1);
  });

  it('lines with the player’s name play the name-less recording (the screen keeps the name)', async () => {
    const say = 'Great work {name}! That was a fifth.';
    const { f, played } = files([personal(say, null)]);
    const p = new BrowserPromptPlayer();
    p.recordings = f;
    const lines: { text: string; ms: number }[] = [];
    f.onLine((l) => lines.push(l));
    await p.speak(personal(say, 'Dana'), 'en', new AbortController().signal, personal(say, null));
    expect(played).toEqual([{ url: `/voice/en/${voiceKey('Great work! That was a fifth.')}.mp3`, rate: 1 }]);
    expect(lines[0].text).toBe('Great work Dana! That was a fifth.');
    expect(p.speaksLine(personal(say, 'Dana'), 'en', personal(say, null))).toBe(true);
  });

  it('Hebrew never plays a recording', async () => {
    const { f, played } = files(['שלום.']);
    const p = new BrowserPromptPlayer();
    p.recordings = f;
    const done = p.speak('שלום.', 'he', new AbortController().signal);
    await vi.runAllTimersAsync();
    await done;
    expect(played).toEqual([]);
  });
});

describe('the line inventory', () => {
  it('covers every mini-lesson step, name-less', () => {
    const lines = miniLines();
    const steps = Object.values(MINI_LESSONS).reduce((n, l) => n + l.steps.length + (l.more?.length ?? 0), 0);
    expect(lines.length).toBe(steps);
    expect(lines.some((l) => /\{name\}/.test(l.text))).toBe(false);
    expect(distinct([...previewLines(), ...memoryLines()]).length).toBeGreaterThan(50);
  });

  // When the recordings are committed, every static line must have one (render with npm run voice:render).
  const MANIFEST = 'public/voice/en/manifest.json';
  it.skipIf(!existsSync(MANIFEST))('every static line is recorded', () => {
    const m = JSON.parse(readFileSync(MANIFEST, 'utf8')) as VoiceManifest;
    const missing = distinct([...miniLines(), ...previewLines(), ...memoryLines()]).filter((l) => !lookup(m, l.text));
    expect(missing.map((l) => l.text)).toEqual([]);
  });
});

describe('shipped recordings are real speech (2026-11-11: 32 kbps files were silent)', () => {
  // lamejs at 32 kbps resampled 24 kHz to 22.05 kHz and wrote silence; every shipped file must be a 24 kHz MPEG-2 frame.
  it('every listed file starts with a 24 kHz MPEG frame of at least 40 kbps', () => {
    const path = 'public/voice/en/manifest.json';
    if (!existsSync(path)) return;
    const m = JSON.parse(readFileSync(path, 'utf8')) as VoiceManifest;
    const bad: string[] = [];
    for (const id of Object.keys(m.files)) {
      const f = `public/voice/en/${id}.mp3`;
      if (!existsSync(f)) continue;
      const b = readFileSync(f);
      let i = 0;
      if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) i = 10 + ((b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9]); // ID3
      const mpeg2 = (b[i + 1] & 0x08) === 0;
      const srIdx = (b[i + 2] >> 2) & 3;
      const brIdx = b[i + 2] >> 4;
      const sr = mpeg2 ? [22050, 24000, 16000][srIdx] : [44100, 48000, 32000][srIdx];
      const kbps = (mpeg2 ? [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160] : [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320])[brIdx];
      if (b[i] !== 0xff || sr !== 24000 || kbps < 40) bad.push(`${id} ${sr} Hz ${kbps} kbps`);
    }
    expect(bad.slice(0, 5), `${bad.length} bad files`).toEqual([]);
  });
});
