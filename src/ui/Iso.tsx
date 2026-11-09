// Direction isolation for mixed text (0.61, SPEC-REDESIGN): note names, chord symbols and number lists are LTR
// even inside Hebrew ("1, 3, 5", "B♭maj7"), so a flat or a comma never jumps to the other side.
const HEB = /[֐-׿]/;
export const isLtrToken = (s: string) => !HEB.test(s);

export function Iso({ text }: { text: string }) {
  return isLtrToken(text) ? <bdi dir="ltr">{text}</bdi> : <>{text}</>;
}
