import { describe, expect, it, vi } from 'vitest';
import type { FromWorker, ToWorker } from '../src/speech/kokoro/protocol';

// kokoro-js is mocked: unit tests never download the model.
const fromPretrained = vi.fn();
vi.mock('kokoro-js', () => ({
  env: {},
  KokoroTTS: {
    from_pretrained: (...a: unknown[]) => fromPretrained(...a),
  },
}));

describe('Kokoro worker', () => {
  it('loads with progress, calibrates, then generates lines in order (urgent first)', async () => {
    const out: FromWorker[] = [];
    const g = globalThis as unknown as { self: { postMessage: (m: FromWorker) => void; onmessage: ((e: { data: ToWorker }) => void) | null } };
    g.self = { postMessage: (m) => out.push(m), onmessage: null };
    const said: string[] = [];
    fromPretrained.mockImplementation(async (_id: string, o: { progress_callback: (p: unknown) => void }) => {
      o.progress_callback({ status: 'progress', file: 'onnx/model_quantized.onnx', loaded: 46, total: 92 });
      o.progress_callback({ status: 'progress', file: 'onnx/model_quantized.onnx', loaded: 92, total: 92 });
      return {
        generate: async (text: string) => {
          said.push(text);
          return { audio: new Float32Array(2400), sampling_rate: 24000 };
        },
      };
    });
    await import('../src/speech/kokoro/kokoroWorker');
    const send = (m: ToWorker) => g.self.onmessage!({ data: m });
    send({ type: 'load', model: 'm', dtype: 'q8', device: 'wasm', voice: 'af_heart' });
    await vi.waitFor(() => expect(out.some((m) => m.type === 'ready')).toBe(true));
    expect(fromPretrained).toHaveBeenCalledWith('m', expect.objectContaining({ dtype: 'q8', device: 'wasm' }));
    expect(out.filter((m) => m.type === 'progress').map((m) => (m as { pct: number }).pct)).toEqual([50, 100]);
    said.length = 0;
    send({ type: 'gen', id: 1, text: 'one', voice: 'af_heart', speed: 1, urgent: false });
    send({ type: 'gen', id: 2, text: 'two', voice: 'af_heart', speed: 1, urgent: false });
    send({ type: 'gen', id: 3, text: 'three', voice: 'af_heart', speed: 1, urgent: false });
    send({ type: 'cancel', id: 3 });
    send({ type: 'gen', id: 4, text: 'now', voice: 'af_heart', speed: 1, urgent: true });
    await vi.waitFor(() => expect(out.filter((m) => m.type === 'audio').length).toBe(3));
    // 'one' was already being made; 'now' jumped ahead of 'two'; 'three' was cancelled
    expect(said).toEqual(['one', 'now', 'two']);
    const a = out.find((m) => m.type === 'audio') as Extract<FromWorker, { type: 'audio' }>;
    expect(a.sr).toBe(24000);
    expect(a.pcm.length).toBe(2400);
  });
});
