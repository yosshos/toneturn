// A content string whose Latin runs are wrapped in Unicode isolates (FSI … PDI, generate.ts isoLatin) rendered with
// each isolated run as a <bdi dir="ltr"> element: the same isolation, and the screens' "no Latin outside <bdi>" check
// can see it.

const RUN = /⁨([^⁩]*)⁩/g;

export function BidiText({ text }: { text: string }) {
  if (!text.includes('⁨')) return <>{text}</>;
  const out: React.ReactNode[] = [];
  let at = 0;
  for (const m of text.matchAll(RUN)) {
    if (m.index! > at) out.push(text.slice(at, m.index));
    out.push(
      <bdi key={m.index} dir="ltr">
        {m[1]}
      </bdi>,
    );
    at = m.index! + m[0].length;
  }
  if (at < text.length) out.push(text.slice(at));
  return <>{out}</>;
}

/** The text without the isolate marks (a tooltip, an aria-label). */
export const plainText = (text: string): string => text.replace(/[⁦-⁩]/g, '');
