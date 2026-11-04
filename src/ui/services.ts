// Composition root: real browser adapters, or the labelled simulator (?sim=1).

import { PianoEngine } from '../audio/piano';
import { realClock, type Adapters } from '../game/adapters';
import { FakeMic, ScriptedTranscriber, type ScriptStep } from '../game/fakes';
import { BrowserMicAccess } from '../speech/mic';
import { BrowserPromptPlayer } from '../speech/tts';
import { WebSpeechTranscriber } from '../speech/webspeech';
import { ProgressStore } from '../storage/progress';
import { defaultKV, memoryKV } from '../storage/kv';

export const params = new URLSearchParams(location.search);
export const SIMULATED = params.has('sim');

export const piano = new PianoEngine();
/** One narration player for the whole app so voice settings apply everywhere. */
export const tts = new BrowserPromptPlayer();
// Simulated runs never touch real progress.
export const store = new ProgressStore(SIMULATED ? memoryKV() : defaultKV());

let sim: ScriptedTranscriber | null = null;

/** Simulator script: correct, wrong-then-correct, correct. Deterministic. */
const SIM_SCRIPT = (): ScriptStep[] => {
  const right: ScriptStep = (e) => (e === 1 ? 'one' : 'five');
  const wrong: ScriptStep = (e) => (e === 1 ? 'five' : 'one');
  return [right, wrong, right, right, right, right];
};

export function makeAdapters(expected: () => number): Adapters {
  if (SIMULATED) {
    sim = new ScriptedTranscriber(SIM_SCRIPT(), 1200);
    sim.expected = expected;
    return { audio: piano, tts, stt: sim, mic: new FakeMic(), clock: realClock, simulated: true };
  }
  return {
    audio: piano,
    tts,
    stt: new WebSpeechTranscriber(),
    mic: new BrowserMicAccess(),
    clock: realClock,
    simulated: false,
  };
}
