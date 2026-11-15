// Direction isolation for mixed text (0.61, SPEC-REDESIGN): note names, chord symbols and number lists are LTR
// even inside Hebrew ("1, 3, 5", "B♭maj7"), so a flat or a comma never jumps to the other side.
const HEB = /[֐-׿]/;
export const isLtrToken = (s: string) => !HEB.test(s);

export function Iso({ text }: { text: string }) {
  return isLtrToken(text) ? <bdi dir="ltr">{text}</bdi> : <>{text}</>;
}

const LATIN = /[A-Za-z0-9♭♯°ø]/;
/**
 * Mixed Hebrew text with Latin runs ("ii במקום IV", "בלוז Bird"): each run of Latin words (Roman numerals, tune
 * titles, chord symbols) goes in its own <bdi dir="ltr">, the Hebrew stays as it is (AUDIT-GAMES §6).
 */
/** The segments of mixed text: plain strings and Latin runs to isolate (pure; tested). */
export function isoSegments(text: string): (string | { ltr: string })[] {
  if (isLtrToken(text)) return [{ ltr: text }];
  const out: (string | { ltr: string })[] = [];
  let run: string[] = [];
  const close = () => {
    const tail: string[] = [];
    while (run.length && !LATIN.test(run[run.length - 1])) tail.unshift(run.pop()!);
    if (run.length) out.push({ ltr: run.join('') });
    out.push(...tail);
    run = [];
  };
  for (const w of text.split(/(\s+)/)) {
    if (!w) continue;
    // a Hebrew prefix glued to a Latin word ("ב-MIDI", "ה־MIDI"): the prefix stays Hebrew, the word is isolated
    const glued = /^([֐-׿]+[-־])([^֐-׿]*[A-Za-z][^֐-׿]*)$/.exec(w);
    if (glued) {
      close();
      out.push(glued[1]);
      run.push(glued[2]);
      continue;
    }
    if (HEB.test(w)) {
      close();
      out.push(w);
    } else if (LATIN.test(w) || run.length) run.push(w);
    else out.push(w);
  }
  close();
  // merge neighbouring plain strings
  return out.reduce<(string | { ltr: string })[]>((a, x) => {
    if (typeof x === 'string' && typeof a[a.length - 1] === 'string') a[a.length - 1] = (a[a.length - 1] as string) + x;
    else a.push(x);
    return a;
  }, []);
}
export function IsoMix({ text }: { text: string }) {
  return (
    <>
      {isoSegments(text).map((x, i) => (typeof x === 'string' ? x : <bdi key={i} dir="ltr">{x.ltr}</bdi>))}
    </>
  );
}
