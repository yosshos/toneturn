// Personal voice aliases: when the recognizer misheard an answer and the player then tapped the right one,
// remember what it heard for that answer (per question kind) so the same mishearing is understood next time.
// Kept on the device only; never more than 200 entries.

import { normalize } from './parser';

const STORE_KEY = 'toneturn.voiceAliases.v1';
const MAX = 200;
type Table = Record<string, string>; // `${kind}|${heard}` → JSON answer

let mem: Table | null = null;
function load(): Table {
  if (mem) return mem;
  try {
    mem = JSON.parse(globalThis.localStorage?.getItem(STORE_KEY) ?? '{}') as Table;
  } catch {
    mem = {};
  }
  return mem;
}
function save() {
  try {
    globalThis.localStorage?.setItem(STORE_KEY, JSON.stringify(mem));
  } catch {
    /* private mode */
  }
}

const keyOf = (kind: string, heard: string) => `${kind}|${normalize(heard).join(' ')}`;

/** Remember: for this question kind, `heard` meant `answer`. Short phrases only (≤ 4 words). */
export function learnVoiceAlias(kind: string, heard: string, answer: unknown) {
  const words = normalize(heard);
  if (!words.length || words.length > 4) return;
  const t = load();
  const k = keyOf(kind, heard);
  delete t[k];
  t[k] = JSON.stringify(answer);
  const keys = Object.keys(t);
  for (const old of keys.slice(0, Math.max(0, keys.length - MAX))) delete t[old];
  save();
}

/** A learned answer for any of the recognizer's alternatives, if it is one of the choices. */
export function learnedAnswer<T>(kind: string, alternatives: string[], choices: T[]): T | null {
  const t = load();
  for (const a of alternatives) {
    const v = t[keyOf(kind, a)];
    if (v === undefined) continue;
    const ans = JSON.parse(v) as T;
    const hit = choices.find((c) => JSON.stringify(c) === JSON.stringify(ans));
    if (hit !== undefined) return hit;
  }
  return null;
}

/** Tests: start from an empty table. */
export function resetVoiceAliases() {
  mem = {};
  save();
}
