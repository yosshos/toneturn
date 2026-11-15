// The simulator fed in real time (?sim=1&simrt=1): screenshots and e2e see the live singing view.

import type { SungFrame } from '../engine/sing';
import { SIMULATED } from './services';

export const SIM_RT = SIMULATED && typeof location !== 'undefined' && new URLSearchParams(location.search).has('simrt');

/** Push frames at their own pace from `zero` (performance.now() of t = 0); resolves early when aborted. */
export async function paceFrames(frames: SungFrame[], zero: number, signal: AbortSignal, push: (f: SungFrame) => void): Promise<void> {
  let k = 0;
  while (k < frames.length && !signal.aborted) {
    const at = (performance.now() - zero) / 1000;
    while (k < frames.length && frames[k].t <= at) push(frames[k++]);
    await new Promise((r) => setTimeout(r, 16));
  }
}
