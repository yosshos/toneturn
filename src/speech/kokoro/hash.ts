// The key a generated line is cached under: the voice, the speed and the exact text it was spoken from.
// cyrb53 (a fast 53-bit string hash, public domain) — sync, no crypto.subtle needed, collisions negligible at our scale.

export function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Whitespace differences don't make a new recording. */
export function normText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Cache key for one generated line, e.g. "af_heart@1:3f9a…". The model version is part of it so a new model re-generates. */
export function clipKey(voice: string, speed: number, text: string, model = 'k82m-v1'): string {
  return `${voice}@${speed}:${model}:${cyrb53(normText(text)).toString(36)}`;
}
