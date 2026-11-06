// Narration on or off ("talk" vs "read"), one switch for the whole app: the intake, lessons, games.
// Off: nothing is spoken; the text stays on screen and the flow pauses long enough to read it.

const KEY = 'toneturn.talk';
const OLD_KEY = 'toneturn.intake.talk';

const listeners = new Set<(on: boolean) => void>();

function automated(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.webdriver;
}

let cached: boolean | null = null;

/** Is the narrator speaking? Talking is the default; automated runs read unless they chose otherwise. */
export function talkOn(): boolean {
  if (cached !== null) return cached;
  let v: string | null = null;
  try {
    v = localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY);
  } catch {
    /* private mode */
  }
  cached = v === '1' || v === '0' ? v === '1' : !automated() && !new URLSearchParams(location.search).has('sim');
  return cached;
}

export function setTalk(on: boolean) {
  cached = on;
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
    localStorage.setItem(OLD_KEY, on ? '1' : '0');
  } catch {
    /* private mode */
  }
  listeners.forEach((l) => l(on));
}

export function onTalk(cb: (on: boolean) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** How long to leave a line on screen when it isn't spoken (automated runs don't wait). */
export function readingMs(text: string): number {
  if (automated()) return 0;
  return Math.min(3200, 500 + text.length * 32);
}
