// Composition root: real browser adapters, or the labelled simulator (?sim=1).

import { MidiPitchCapture } from '../speech/midi';
import type { PitchCapture } from '../game/adapters';
import { PianoEngine } from '../audio/piano';
import { realClock, type Adapters } from '../game/adapters';
import { FakeMic, ScriptedPitch, ScriptedTranscriber, type ScriptStep } from '../game/fakes';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import { BrowserKnockInput } from '../speech/knock';
import type { GameAdapters } from '../game/memoryGame';
import type { Answer } from '../engine/lesson';
import { BrowserMicAccess } from '../speech/mic';
import { BrowserPromptPlayer } from '../speech/tts';
import { browserKokoroDeps, KokoroNarrator } from '../speech/kokoro/engine';
import { browserFilesDeps, VoiceFiles } from '../speech/voice/files';
import { WebSpeechTranscriber } from '../speech/webspeech';
import { ProgressStore } from '../storage/progress';
import { defaultKV, memoryKV } from '../storage/kv';

export const params = new URLSearchParams(location.search);
export const SIMULATED = params.has('sim');
/** Dev/test convenience: ?unlock=all opens every lesson on the path. */
export const UNLOCK_ALL = params.get('unlock') === 'all';

export const piano = new PianoEngine();
// Dev builds only: the engine on `window.__sound` for measuring decoded memory per tier (SOUND_LIVE_SESSION.md §7).
if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __sound?: PianoEngine }).__sound = piano;
/** One narration player for the whole app so voice settings apply everywhere. */
export const tts = new BrowserPromptPlayer();
/** The English voice (Kokoro, on the device). Nothing loads until an English line is wanted; the simulator never speaks. */
export const narrator = new KokoroNarrator(browserKokoroDeps(() => piano.voiceOut()));
/** The same voice, pre-recorded for every line known ahead of time (public/voice/en, 0.66). */
export const recordings = new VoiceFiles(browserFilesDeps(import.meta.env.BASE_URL ?? '/', () => piano.voiceOut(), () => piano.volume));
if (!SIMULATED) {
  tts.narrator = narrator;
  tts.recordings = recordings;
}
// Simulated runs never touch real progress.
export const store = new ProgressStore(SIMULATED ? memoryKV() : defaultKV());


/** Simulator script: correct, wrong-then-correct, then correct. Deterministic. */
const SIM_SCRIPT = (say: (() => string | null) | null): ScriptStep[] => {
  const names = (e: unknown) =>
    typeof e === 'string' && /^[A-G]-?\d(\.[A-G]-?\d)*$/.test(e)
      ? e.split('.').map((k) => `${k[0]}${k.endsWith('-1') ? ' flat' : k.endsWith('1') ? ' sharp' : ''}`).join(' ')
      : null;
  const right: ScriptStep = (e) => say?.() || names(e) || (e === 1 ? 'one' : e === 3 ? 'three' : e === 5 ? 'five' : String(e === 'maj' ? 'major' : e === 'min' ? 'minor' : e));
  const wrong: ScriptStep = (e) => (e === 1 ? 'five' : e === 5 ? 'one' : e === 3 ? 'one' : e === 'maj' ? 'minor' : e === 'min' ? 'major' : e === 'open' ? 'resolved' : 'open');
  return [right, wrong, ...Array.from({ length: 40 }, () => right)];
};

/** Set from Settings: singing tasks capture from a MIDI keyboard instead of the microphone. */
let midiEnabled = false;
export const setMidiEnabled = (on: boolean) => {
  midiEnabled = on;
};
export const isMidiEnabled = () => midiEnabled;

/** MIDI for played answers; the microphone whenever the task is to sing (a MIDI keyboard can't sing — owner 2026-11-13). */
class RoutedPitch implements PitchCapture {
  constructor(private sung: () => boolean) {}
  private mic = new BrowserPitchCapture();
  private midi = new MidiPitchCapture();
  sing(opts: Parameters<PitchCapture['sing']>[0]) {
    return (midiEnabled && !this.sung() ? this.midi : this.mic).sing(opts);
  }
}

export function makeAdapters(expected: () => Answer, targetMidi: () => number, targetSeq: () => number[] | null = () => null, say: (() => string | null) | null = null, sungNow: () => boolean = () => false): Adapters {
  if (SIMULATED) {
    const sim = new ScriptedTranscriber(SIM_SCRIPT(say), 1200);
    sim.expected = expected;
    // Sung: in tune, then 60 cents flat → retry, then in tune.
    const pitch = new ScriptedPitch([8, -80, -12, 5, 5, 5], 1500);
    pitch.target = targetMidi;
    pitch.targets = targetSeq;
    return { audio: piano, tts, stt: sim, mic: new FakeMic(), pitch, clock: realClock, simulated: true };
  }
  return {
    audio: piano,
    tts,
    stt: new WebSpeechTranscriber(),
    mic: new BrowserMicAccess(),
    pitch: new RoutedPitch(sungNow),
    knock: new BrowserKnockInput(),
    clock: realClock,
    simulated: false,
  };
}

export function makeGameAdapters(): GameAdapters {
  return { audio: piano, tts, pitch: midiEnabled ? new MidiPitchCapture() : new BrowserPitchCapture(), knock: new BrowserKnockInput(), clock: realClock, simulated: SIMULATED };
}
