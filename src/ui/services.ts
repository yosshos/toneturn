// Composition root: real browser adapters, or the labelled simulator (?sim=1).

import { PianoEngine } from '../audio/piano';
import { realClock, type Adapters } from '../game/adapters';
import { FakeMic, ScriptedPitch, ScriptedTranscriber, type ScriptStep } from '../game/fakes';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import { BrowserKnockInput } from '../speech/knock';
import type { GameAdapters } from '../game/memoryGame';
import type { Answer } from '../engine/lesson';
import { BrowserMicAccess } from '../speech/mic';
import { BrowserPromptPlayer } from '../speech/tts';
import { WebSpeechTranscriber } from '../speech/webspeech';
import { ProgressStore } from '../storage/progress';
import { defaultKV, memoryKV } from '../storage/kv';

export const params = new URLSearchParams(location.search);
export const SIMULATED = params.has('sim');
/** Dev/test convenience: ?unlock=all opens every lesson on the path. */
export const UNLOCK_ALL = params.get('unlock') === 'all';

export const piano = new PianoEngine();
/** One narration player for the whole app so voice settings apply everywhere. */
export const tts = new BrowserPromptPlayer();
// Simulated runs never touch real progress.
export const store = new ProgressStore(SIMULATED ? memoryKV() : defaultKV());


/** Simulator script: correct, wrong-then-correct, then correct. Deterministic. */
const SIM_SCRIPT = (): ScriptStep[] => {
  const names = (e: unknown) =>
    typeof e === 'string' && /^[A-G]-?\d(\.[A-G]-?\d)*$/.test(e)
      ? e.split('.').map((k) => `${k[0]}${k.endsWith('-1') ? ' flat' : k.endsWith('1') ? ' sharp' : ''}`).join(' ')
      : null;
  const right: ScriptStep = (e) => names(e) ?? (e === 1 ? 'one' : e === 3 ? 'three' : e === 5 ? 'five' : String(e === 'maj' ? 'major' : e === 'min' ? 'minor' : e));
  const wrong: ScriptStep = (e) => (e === 1 ? 'five' : e === 5 ? 'one' : e === 3 ? 'one' : e === 'maj' ? 'minor' : e === 'min' ? 'major' : e === 'open' ? 'resolved' : 'open');
  return [right, wrong, ...Array.from({ length: 12 }, () => right)];
};

export function makeAdapters(expected: () => Answer, targetMidi: () => number, targetSeq: () => number[] | null = () => null): Adapters {
  if (SIMULATED) {
    const sim = new ScriptedTranscriber(SIM_SCRIPT(), 1200);
    sim.expected = expected;
    // Sung: in tune, then 60 cents flat → retry, then in tune.
    const pitch = new ScriptedPitch([8, -60, -12, 5, 5, 5], 1500);
    pitch.target = targetMidi;
    pitch.targets = targetSeq;
    return { audio: piano, tts, stt: sim, mic: new FakeMic(), pitch, clock: realClock, simulated: true };
  }
  return {
    audio: piano,
    tts,
    stt: new WebSpeechTranscriber(),
    mic: new BrowserMicAccess(),
    pitch: new BrowserPitchCapture(),
    knock: new BrowserKnockInput(),
    clock: realClock,
    simulated: false,
  };
}

export function makeGameAdapters(): GameAdapters {
  return { audio: piano, tts, pitch: new BrowserPitchCapture(), knock: new BrowserKnockInput(), clock: realClock, simulated: SIMULATED };
}
