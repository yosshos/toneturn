// A soft "bubble" for each word as text types itself out (0.64, owner: typed text with a pop per word instead of the
// narrator's voice). Tiny, lazy, never throws; silent when audio isn't allowed yet.

let ctx: AudioContext | null = null;
let last = 0;

export function wordPop(volume = 0.05) {
  try {
    if (typeof window === 'undefined') return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    if (now - last < 0.045) return; // never a buzz on very fast words
    last = now;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    // a little rising-then-falling bubble, slightly different each time
    const f = 620 + Math.random() * 180;
    o.frequency.setValueAtTime(f, now);
    o.frequency.exponentialRampToValueAtTime(f * 1.5, now + 0.02);
    o.frequency.exponentialRampToValueAtTime(f * 0.8, now + 0.07);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    o.connect(g).connect(ctx.destination);
    o.start(now);
    o.stop(now + 0.1);
  } catch {
    /* audio not available */
  }
}
