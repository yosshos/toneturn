// The bridge from My recordings to Encore (SPEC-PHRASE-STUDIO §6.4 "Practise this span", §6.6): the player hands a
// take and an A–B span (seconds on the take's timeline; beat 0 = 0 for MIDI takes) to Encore's trim screen. Encore
// part B owns the route `#/encore/new`; this only navigates there.

/** Open Encore's trim on this take with the span pre-selected (`span` in seconds; null = the whole take). */
export function openEncoreFromTake(takeId: string, span: [number, number] | null): void {
  location.hash = encoreHashFor(takeId, span);
}

/** The address Encore opens on (exported for tests and links). */
export function encoreHashFor(takeId: string, span: [number, number] | null): string {
  const q = new URLSearchParams({ take: takeId });
  if (span) {
    q.set('from', String(Math.round(Math.min(span[0], span[1]) * 1000) / 1000));
    q.set('to', String(Math.round(Math.max(span[0], span[1]) * 1000) / 1000));
  }
  return `#/encore/new?${q.toString()}`;
}
