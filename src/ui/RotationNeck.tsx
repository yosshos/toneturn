// The scale rotation on a guitar or bass neck (SPEC-RBI-ROTATION §4): the chord's scale in the current position
// (src/engine/rotationNeck.ts), the chord root and chord tones filled and named by degree, the colour notes in the
// scale family's colour, the rest of the scale small, avoid notes dashed. When a new scale is announced (nextChange:
// 2 bars ahead at T1–2, 1 bar at T3) its new notes show as hollow rings and the notes it drops fade. The neck is
// always left to right (mirrored for a left-handed player), inside an LTR box on a Hebrew screen.
import { useMemo } from 'react';
import { maxFretOf, neckView, type NeckBox } from '../engine/rotationNeck';
import { noteAt, type Tuning } from '../engine/fretboard';
import { Neck, type NeckDot } from './Instrument';

type Lang = 'en' | 'he';
const TX = {
  en: { label: 'The scale on the neck', frets: 'Frets', chord: 'chord tone', colour: 'colour', next: 'next scale', open: 'Open position' },
  he: { label: 'הסולם על הצוואר', frets: 'סריגים', chord: 'צליל אקורד', colour: 'צבע', next: 'הסולם הבא', open: 'פוזיציה פתוחה' },
};

export function RotationNeck({ tuning, leftHanded, cur, next, fam, nextFam, lang, onTap }: { tuning: Tuning; leftHanded?: boolean; cur: NeckBox; /** The announced next scale's box (only while the "new scale" warning is up). */ next?: NeckBox | null; fam: string; nextFam?: string; lang: Lang; onTap?: (midi: number) => void }) {
  const tx = TX[lang];
  const [lo, hi] = neckView(tuning, cur, next);
  const dots = useMemo(() => {
    const nextPcs = next ? new Set(next.notes.map((n) => n.pc)) : null;
    const here = new Set(cur.notes.map((n) => `${n.str}:${n.fret}`));
    const out: NeckDot[] = cur.notes.map((n) => ({
      str: n.str,
      fret: n.fret,
      label: n.deg,
      tone: n.role === 'root' ? 'root' : 'given',
      cls: `rn-${n.role}${n.avoid ? ' rn-avoid' : ''}${nextPcs && !nextPcs.has(n.pc) ? ' rn-leaving' : ''}`,
    }));
    if (next) for (const n of next.notes) if (!here.has(`${n.str}:${n.fret}`)) out.push({ str: n.str, fret: n.fret, tone: 'given', cls: `rn-next fam-${nextFam ?? fam}` });
    return out;
  }, [cur, next, fam, nextFam]);
  return (
    <div className={`rs-neck fam-${fam}${tuning.open.length <= 4 ? ' rn-4' : ''}`} data-rs-neck={tuning.instrument} data-rs-neck-lo={cur.lo} data-rs-neck-next={next ? next.lo : undefined}>
      <div className="rn-head">
        <span className="rn-pos" data-rs-neck-pos="1">
          {cur.lo === 0 ? (
            tx.open
          ) : (
            <>
              {tx.frets} <bdi dir="ltr">{`${cur.lo}–${Math.min(cur.hi, maxFretOf(tuning))}`}</bdi>
            </>
          )}
        </span>
        <span className="rn-legend" aria-hidden="true">
          <i className="rn-key rn-chord" /> {tx.chord}
          <i className="rn-key rn-colour" /> {tx.colour}
          {next && (
            <>
              <i className={`rn-key rn-next fam-${nextFam ?? fam}`} /> {tx.next}
            </>
          )}
        </span>
      </div>
      <Neck tuning={tuning} lo={lo} hi={hi} dots={dots} leftHanded={leftHanded} label={tx.label} onTap={onTap ? (s, f) => onTap(noteAt(tuning, s, f)) : undefined} />
    </div>
  );
}
