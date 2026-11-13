// Instrument pictures and answer surfaces (spec AE §3): the neck (frets / fingerboard), the chord box, keys and an
// editable staff. Physical pictures never mirror in RTL (dir="ltr"); left-handed players get a mirrored neck.

import { useEffect, useMemo, useRef, useState } from 'react';
import { midi as midiIn } from '../speech/midi';
import { BrowserPitchCapture } from '../speech/pitchCapture';
import { listenLoop } from './Flight';
import { positionsOf } from '../engine/fretboard';
import type { Diagram, PlaceMark, PlaceQuestion, PlaceSurface } from '../engine/lesson';
import { gradePlace, placeKey } from '../engine/lesson';
import { defaultTuning, INLAYS, noteAt, remapDots, tuningById, type NeckInstrument, type Tuning } from '../engine/fretboard';
import { majorScale, pcValue, type PitchClass } from '../engine/pitch';
import { spellMidi } from '../engine/aids';
import { bassTuningOf, courseInstrumentOf, neckTuningOf, type Settings } from '../storage/progress';
import { piano } from './services';
import { courseInstrument, noteViewsOf, playedShift } from './noteViewPref';
import { heardMidis, identifyChord, judgeStrum } from '../engine/chordFinder';
import { useStrums } from './strumListen';

type Lang = 'he' | 'en';
const T = {
  undo: { en: 'Undo', he: 'ביטול' },
  clear: { en: 'Clear', he: 'ניקוי' },
  play: { en: 'Play mine', he: 'נגנו את שלי' },
  playIn: { en: 'Play it on my instrument', he: 'לנגן על הכלי שלי' },
  listening: { en: 'Listening — play one note at a time', he: 'מקשיבים — נגנו צליל אחד בכל פעם' },
  stopPlay: { en: 'Stop listening', he: 'להפסיק להקשיב' },
  strumIn: { en: 'Strum it on my guitar', he: 'לפרוט על הגיטרה שלי' },
  strumListening: { en: 'Listening — strum the chord once, every string ringing', he: 'מקשיבים — פרטו את האקורד פעם אחת, כל המיתרים מצלצלים' },
  strumAgain: { en: 'Not clear — strum it again, a clean tone', he: 'לא ברור — פרטו שוב, צליל נקי' },
  strumMic: { en: 'The microphone is not available.', he: 'המיקרופון לא זמין.' },
  mute: { en: 'Mute between notes, no pedal.', he: 'השתיקו בין הצלילים, בלי פדל.' },
  done: { en: 'Done', he: 'סיימתי' },
  entered: { en: 'Your notes', he: 'התווים שלכם' },
  midiLive: { en: 'Play it on your keyboard — or tap the keys.', he: 'נגנו על המקלדת — או הקישו על הקלידים.' },
  none: { en: 'No notes yet', he: 'עדיין אין תווים' },
  string: { en: 'string', he: 'מיתר' },
  fret: { en: 'fret', he: 'סריג' },
  open: { en: 'open', he: 'פתוח' },
  sharp: { en: 'Sharp', he: 'דיאז' },
  flat: { en: 'Flat', he: 'במול' },
  natural: { en: 'Natural', he: 'בקר' },
  length: { en: 'Note length', he: 'אורך התו' },
  keysLabel: { en: 'Piano keys', he: 'קלידי פסנתר' },
  neckLabel: { en: 'Instrument neck', he: 'צוואר הכלי' },
  staffLabel: { en: 'Staff: tap a line or a space', he: 'חמשה: הקישו על קו או על רווח' },
};

const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
export const midiName = (m: number) => `${NAMES[((Math.round(m) % 12) + 12) % 12]}${Math.floor(Math.round(m) / 12) - 1}`;

function sound(midis: number[], each = 0.42, chord = false) {
  const ev = midis.map((m, i) => ({ midi: m, start: chord ? 0 : i * each, duration: chord ? 1.2 : each * 0.95, velocity: 0.7 }));
  void piano.play(ev, chord ? 1.3 : midis.length * each + 0.2, new AbortController().signal).catch(() => {});
}

// ---------------------------------------------------------------- neck

export interface NeckDot {
  str: number;
  fret: number;
  label?: string;
  tone?: 'given' | 'mine' | 'ok' | 'wrong' | 'answer' | 'root';
}

/** A horizontal neck: string 1 (highest) on top, the nut on the left (right on a left-handed neck). */
export function Neck({ tuning, lo = 0, hi = 12, dots = [], strings, leftHanded, onTap, label }: { tuning: Tuning; lo?: number; hi?: number; dots?: NeckDot[]; strings?: number[]; leftHanded?: boolean; onTap?: (str: number, fret: number) => void; label?: string }) {
  const n = tuning.open.length;
  const frets = hi - lo + 1;
  const W = 40 + frets * 46;
  const H = 18 + n * 26;
  const x = (f: number) => (lo === 0 ? (f === 0 ? 18 : 30 + (f - 0.5) * 46) : 30 + (f - lo + 0.5) * 46);
  const y = (s: number) => 18 + (s - 1) * 26;
  const X = (v: number) => (leftHanded ? W - v : v);
  const can = (s: number) => !strings || strings.includes(s);
  return (
    <div className="neck-wrap" dir="ltr">
      <svg className={`neck ${tuning.fretted ? '' : 'fretless'}`} viewBox={`0 0 ${W} ${H + 14}`} role={onTap ? 'group' : 'img'} aria-label={label}>
        {/* fretboard */}
        <rect x={X(leftHanded ? W - 4 : 26)} y={y(1) - 8} width={W - 30} height={(n - 1) * 26 + 16} className="neck-wood" transform={leftHanded ? `translate(${-(W - 30)},0)` : undefined} />
        {INLAYS.filter((f) => f >= Math.max(1, lo) && f <= hi).map((f) =>
          f % 12 === 0 ? (
            <g key={f}>
              <circle cx={X(x(f))} cy={y(1) + ((n - 1) * 26) / 3} r={4} className="inlay" />
              <circle cx={X(x(f))} cy={y(1) + (2 * (n - 1) * 26) / 3} r={4} className="inlay" />
            </g>
          ) : (
            <circle key={f} cx={X(x(f))} cy={y(1) + ((n - 1) * 26) / 2} r={4} className="inlay" />
          ),
        )}
        {tuning.fretted &&
          Array.from({ length: frets + (lo === 0 ? 0 : 1) }, (_, i) => {
            const f = lo === 0 ? i + 1 : lo + i;
            const fx = lo === 0 ? 30 + i * 46 + 46 : 30 + i * 46;
            return <line key={f} x1={X(fx - (lo === 0 ? 0 : 0))} x2={X(fx)} y1={y(1) - 8} y2={y(n) + 8} className="fret-wire" />;
          })}
        {lo === 0 && <line x1={X(30)} x2={X(30)} y1={y(1) - 9} y2={y(n) + 9} className="nut" />}
        {Array.from({ length: n }, (_, i) => (
          <line key={i} x1={X(26)} x2={X(W - 4)} y1={y(i + 1)} y2={y(i + 1)} className={`str ${can(i + 1) ? '' : 'off'}`} strokeWidth={0.8 + i * 0.35} />
        ))}
        {/* fret numbers */}
        {Array.from({ length: frets }, (_, i) => lo + i)
          .filter((f) => f > 0 && (INLAYS.includes(f) || f === lo || f === 1))
          .map((f) => (
            <text key={f} x={X(x(f))} y={H + 10} className="fret-num">
              {f}
            </text>
          ))}
        {/* tap targets */}
        {onTap &&
          Array.from({ length: n }, (_, si) =>
            Array.from({ length: frets }, (_, fi) => {
              const s = si + 1;
              const f = lo + fi;
              if (!can(s)) return null;
              const m = noteAt(tuning, s, f);
              return (
                <rect
                  key={`${s}-${f}`}
                  x={X(x(f)) - 22}
                  y={y(s) - 13}
                  width={44}
                  height={26}
                  className="neck-hit"
                  role="button"
                  tabIndex={0}
                  aria-label={`${T.string.en} ${s}, ${f === 0 ? T.open.en : `${T.fret.en} ${f}`}: ${midiName(m)}`}
                  onClick={() => onTap(s, f)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onTap(s, f))}
                />
              );
            }),
          )}
        {dots.map((d, i) => (
          <g key={i} className={`neck-dot ${d.tone ?? 'given'}`} pointerEvents="none">
            <circle cx={X(x(d.fret))} cy={y(d.str)} r={10} />
            {d.label && (
              <text x={X(x(d.fret))} y={y(d.str) + 4}>
                {d.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

/** A chord box: strings vertical (lowest on the left for right-handed players), frets downward. */
export function ChordBox({ d, tuning, leftHanded }: { d: Diagram; tuning: Tuning; leftHanded?: boolean }) {
  const n = tuning.open.length;
  const frets = d.frets ?? 5;
  const base = d.baseFret ?? 1;
  const W = 30 + (n - 1) * 22 + 30;
  const H = 36 + frets * 24 + 10;
  const sx = (s: number) => {
    const col = n - s; // string n (lowest) → column 0
    const v = 30 + col * 22;
    return leftHanded ? W - v : v;
  };
  const fy = (f: number) => 36 + (f - base + 0.5) * 24;
  return (
    <svg className="chord-box" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="chord diagram">
      {base === 1 ? <line x1={sx(n)} x2={sx(1)} y1={36} y2={36} className="nut" /> : <text x={leftHanded ? W - 8 : 8} y={36 + 16} className="base-fret">{base}</text>}
      {Array.from({ length: frets + 1 }, (_, i) => (
        <line key={i} x1={sx(n)} x2={sx(1)} y1={36 + i * 24} y2={36 + i * 24} className="fret-wire" />
      ))}
      {Array.from({ length: n }, (_, i) => (
        <line key={i} x1={sx(i + 1)} x2={sx(i + 1)} y1={36} y2={36 + frets * 24} className="str" />
      ))}
      {(d.muted ?? []).map((s) => (
        <text key={`m${s}`} x={sx(s)} y={26} className="box-mark">
          ✕
        </text>
      ))}
      {(d.open ?? []).map((s) => (
        <circle key={`o${s}`} cx={sx(s)} cy={21} r={5} className="box-open" />
      ))}
      {(d.dots ?? [])
        .filter((p) => p.fret > 0)
        .map((p, i) => (
          <g key={i} className={`neck-dot ${p.root ? 'root' : 'given'}`}>
            <circle cx={sx(p.str)} cy={fy(p.fret)} r={8.5} />
            {p.label && (
              <text x={sx(p.str)} y={fy(p.fret) + 4}>
                {p.label}
              </text>
            )}
          </g>
        ))}
    </svg>
  );
}

/** A choice question's picture: neck, chord box or keys (spec AE). */
export function DiagramView({ d: d0, settings }: { d: Diagram; settings: Settings }) {
  // B12: bass diagrams on the player's bass tuning (5 / 6-string, drop D); the dots, written for EADG, keep their pitch.
  const bassTu = d0.instrument === 'bass' ? tuningById(bassTuningOf(settings) ?? 'bass') : null;
  const d: Diagram = bassTu && d0.dots ? { ...d0, dots: remapDots(defaultTuning('bass'), bassTu, d0.dots) } : d0;
  const tuning = bassTu ?? (d.instrument ? (d.instrument === 'guitar' ? tuningById(settings.tuning) : defaultTuning(d.instrument)) : tuningById(neckTuningOf(settings)));
  if (d.kind === 'box') return <ChordBox d={d} tuning={tuning} leftHanded={settings.leftHanded} />;
  if (d.kind === 'keys') return <KeysPad marks={(d.midis ?? []).map((m) => ({ m, tone: 'given' }))} lo={Math.min(48, ...(d.midis ?? [60]))} hi={Math.max(72, ...(d.midis ?? [60]))} />;
  const frets = (d.dots ?? []).map((p) => p.fret);
  const lo = d.baseFret ?? (frets.length && Math.max(...frets) > 12 ? Math.max(0, Math.min(...frets) - 1) : 0);
  const hi = Math.max(lo + (d.frets ?? 12), ...frets);
  return <Neck tuning={tuning} lo={lo} hi={Math.min(lo + 15, hi)} dots={(d.dots ?? []).map((p) => ({ ...p, tone: p.root ? 'root' : 'given' }))} leftHanded={settings.leftHanded} />;
}

// ---------------------------------------------------------------- keys

const isBlack = (m: number) => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);

export function KeysPad({ lo = 48, hi = 72, marks = [], onTap, label }: { lo?: number; hi?: number; marks?: { m: number; tone: string }[]; onTap?: (m: number) => void; label?: string }) {
  const whites: number[] = [];
  for (let m = lo; m <= hi; m++) if (!isBlack(m)) whites.push(m);
  const W = 100 / whites.length;
  const tone = new Map(marks.map((x) => [x.m, x.tone] as const));
  const key = (m: number, cls: string, style: React.CSSProperties) => (
    <button
      key={m}
      type="button"
      className={`${cls} ${tone.get(m) ? `mk ${tone.get(m)}` : ''} ${m === 60 ? 'middle-c' : ''}`}
      style={style}
      disabled={!onTap}
      aria-label={midiName(m)}
      onClick={() => onTap?.(m)}
    />
  );
  return (
    <div className="keys-pad" dir="ltr" role="group" aria-label={label}>
      {whites.map((m, i) => key(m, 'wk', { left: `${i * W}%`, width: `${W}%` }))}
      {whites.map((m, i) => (m + 1 <= hi && isBlack(m + 1) ? key(m + 1, 'bk', { left: `${(i + 1) * W - W * 0.32}%`, width: `${W * 0.64}%` }) : null))}
    </div>
  );
}

// ---------------------------------------------------------------- staff

type Clef = 'treble' | 'bass' | 'alto' | 'tenor';
/** Diatonic step of the bottom line: E4, G2, F3, D3 (step = octave * 7 + letter index). */
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const LETTER_SEMI = [0, 2, 4, 5, 7, 9, 11];
const BOTTOM: Record<Clef, number> = { treble: 4 * 7 + 2, bass: 2 * 7 + 4, alto: 3 * 7 + 3, tenor: 3 * 7 + 1 };
const CLEF_GLYPH: Record<Clef, string> = { treble: '𝄞', bass: '𝄢', alto: '𝄡', tenor: '𝄡' };

/** The accidental the key signature gives each letter. */
function keyAcc(key: PitchClass | null): Record<string, number> {
  const out: Record<string, number> = {};
  if (!key) return out;
  for (const p of majorScale(key)) out[p.letter] = p.acc;
  return out;
}
const stepToMidi = (step: number, acc: number) => (Math.floor(step / 7) + 1) * 12 + LETTER_SEMI[((step % 7) + 7) % 7] + acc;
function midiToStep(m: number, key: PitchClass | null): { step: number; acc: number } {
  const s = spellMidi(m, key);
  const li = LETTERS.indexOf(s.letter as (typeof LETTERS)[number]);
  return { step: s.octave * 7 + li, acc: s.acc };
}

export interface StaffNote {
  midi: number;
  dur?: number;
  tone?: 'given' | 'mine' | 'ok' | 'wrong' | 'rhythm' | 'answer';
}

const DURS: { b: number; glyph: string }[] = [
  { b: 4, glyph: '𝅝' },
  { b: 2, glyph: '𝅗𝅥' },
  { b: 1, glyph: '♩' },
  { b: 0.5, glyph: '♪' },
  { b: 1.5, glyph: '♩.' },
  { b: 3, glyph: '𝅗𝅥.' },
];

/** An editable staff: tap a line / space to place a note at the next position. */
export function StaffPad({ clef, keyPc, notes, onTap, lang }: { clef: Clef; keyPc: PitchClass | null; notes: StaffNote[]; onTap?: (step: number) => void; lang: Lang }) {
  const gap = 12;
  const top = 40;
  const bottomY = top + 4 * gap;
  const ka = keyAcc(keyPc);
  // Engraving order and places (sharps F C G D A E B, flats B E A D G C F), as diatonic steps per clef.
  const sharpKey = Object.values(ka).some((a) => a > 0);
  const order = sharpKey ? ['F', 'C', 'G', 'D', 'A', 'E', 'B'] : ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
  const sigLetters = order.filter((l) => (ka[l] ?? 0) !== 0).map((l) => [l, ka[l]] as [string, number]);
  const SIG_STEPS: Record<Clef, { sharp: number[]; flat: number[] }> = {
    // treble: F5 C5 G5 D5 A4 E5 B4 | B4 E5 A4 D5 G4 C5 F4
    treble: { sharp: [38, 35, 39, 36, 33, 37, 34], flat: [34, 37, 33, 36, 32, 35, 31] },
    bass: { sharp: [24, 21, 25, 22, 19, 23, 20], flat: [20, 23, 19, 22, 18, 21, 17] },
    alto: { sharp: [31, 28, 32, 29, 26, 30, 27], flat: [27, 30, 26, 29, 25, 28, 24] },
    tenor: { sharp: [27, 31, 28, 32, 29, 33, 30], flat: [29, 32, 28, 31, 27, 30, 26] },
  };
  const startX = 52 + sigLetters.length * 10;
  const slotW = 34;
  const W = startX + Math.max(6, notes.length + 1) * slotW + 10;
  const H = top + 4 * gap + 46;
  const bottom = BOTTOM[clef];
  const yOf = (step: number) => bottomY - (step - bottom) * (gap / 2);
  const stepAt = (yy: number) => bottom + Math.round((bottomY - yy) / (gap / 2));
  return (
    <div className="staff-pad-wrap" dir="ltr">
      <svg
        className="staff-pad"
        viewBox={`0 0 ${W} ${H}`}
        role={onTap ? 'button' : 'img'}
        aria-label={T.staffLabel[lang]}
        onPointerDown={(e) => {
          if (!onTap) return;
          const svg = e.currentTarget;
          const r = svg.getBoundingClientRect();
          const yy = ((e.clientY - r.top) / r.height) * H;
          onTap(Math.max(bottom - 6, Math.min(bottom + 14, stepAt(yy))));
        }}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <line key={i} x1={6} x2={W - 6} y1={top + i * gap} y2={top + i * gap} className="staff-line" />
        ))}
        <text x={10} y={clef === 'treble' ? bottomY + 4 : clef === 'bass' ? top + gap * 1.6 : top + gap * (clef === 'alto' ? 3.1 : 2.1)} className={`clef clef-${clef}`}>
          {CLEF_GLYPH[clef]}
        </text>
        {sigLetters.map(([l, a], i) => (
          <text key={l} x={44 + i * 10} y={yOf(SIG_STEPS[clef][a > 0 ? 'sharp' : 'flat'][i] ?? 0) + 4} className="sig">
            {a > 0 ? '♯' : '♭'}
          </text>
        ))}
        {notes.map((n, i) => {
          const { step, acc } = midiToStep(n.midi, keyPc);
          const cx = startX + i * slotW + slotW / 2;
          const cy = yOf(step);
          const ledgers: number[] = [];
          for (let s = bottom - 2; s >= step; s -= 2) ledgers.push(s);
          for (let s = bottom + 10; s <= step; s += 2) ledgers.push(s);
          const letter = LETTERS[((step % 7) + 7) % 7];
          const showAcc = acc !== (ka[letter] ?? 0);
          const filled = (n.dur ?? 1) < 2;
          const stemUp = step < bottom + 4;
          return (
            <g key={i} className={`snote ${n.tone ?? 'mine'}`}>
              {ledgers.map((s) => (
                <line key={s} x1={cx - 11} x2={cx + 11} y1={yOf(s)} y2={yOf(s)} className="staff-line" />
              ))}
              {showAcc && (
                <text x={cx - 18} y={cy + 4} className="acc">
                  {acc > 0 ? '♯' : acc < 0 ? '♭' : '♮'}
                </text>
              )}
              <ellipse cx={cx} cy={cy} rx={6.5} ry={4.8} transform={`rotate(-20 ${cx} ${cy})`} className={filled ? 'head filled' : 'head'} />
              {(n.dur ?? 1) < 4 && <line x1={stemUp ? cx + 6 : cx - 6} x2={stemUp ? cx + 6 : cx - 6} y1={cy} y2={stemUp ? cy - 30 : cy + 30} className="stem" />}
              {(n.dur === 0.5 || n.dur === 0.75) && <path d={stemUp ? `M${cx + 6} ${cy - 30} q 8 8 6 18` : `M${cx - 6} ${cy + 30} q 8 -8 6 -18`} className="flag" />}
              {(n.dur === 1.5 || n.dur === 3) && <circle cx={cx + 11} cy={cy - 2} r={1.8} className="dot" />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------- the answer surface for a place question

export function surfaceFor(q: PlaceQuestion, s: Settings): PlaceSurface {
  if (q.surface) return q.surface;
  const pref = s.answerSurface ?? 'auto';
  if (pref !== 'auto') return pref;
  const first = noteViewsOf(s)[0];
  return first === 'tab' ? 'neck' : first === 'staff' ? 'staff' : 'keys';
}

function neckTuning(q: PlaceQuestion, s: Settings): Tuning {
  const inst = (q.instrument && q.instrument !== 'keys' ? q.instrument : courseInstrumentOf(s) === 'bass' ? 'bass' : s.instrument === 'strings' ? 'violin' : 'guitar') as NeckInstrument;
  // Topic items are written for standard tuning (guitar) and EADG (bass); the player's tuning is for the views only.
  return defaultTuning(inst);
}

/**
 * Enter notes for a place question on the neck, keys or staff; ✓ submits the canonical key (placeKey).
 * After the answer (`result`), the entered notes are coloured by their marks and the right notes are shown.
 */
export function PlaceSurfaceView({ q, settings, lang, disabled, onSubmit, result }: { q: PlaceQuestion; settings: Settings; lang: Lang; disabled: boolean; onSubmit: (key: string) => void; result?: string | null }) {
  const surface = surfaceFor(q, settings);
  const givenFirst = q.surface === 'staff' || surface === 'staff' ? (q.given?.midis ?? []).filter((m) => q.target.includes(m)).slice(0, 1) : [];
  const [notes, setNotes] = useState<{ midi: number; dur?: number; at?: { str: number; fret: number } }[]>(() => givenFirst.map((m, i) => ({ midi: m, dur: q.durs?.[i] })));
  const [acc, setAcc] = useState<number | null>(null);
  const [dur, setDur] = useState<number>(1);
  const tuning = useMemo(() => neckTuning(q, settings), [q, settings]);
  const max = q.as === 'seq' ? q.target.length : Math.max(q.target.length, 12);
  const add = (n: { midi: number; dur?: number; at?: { str: number; fret: number } }, played = false) => {
    if (disabled) return;
    setNotes((xs) => {
      // On the neck a set (chord / every place) toggles a dot off when tapped again.
      if (n.at) {
        const i = xs.findIndex((x) => x.at && x.at.str === n.at!.str && x.at.fret === n.at!.fret);
        if (i >= 0) return xs.filter((_, j) => j !== i);
        if (q.as === 'set' && q.neck?.onString === undefined) {
          // one note per string in a chord
          const others = xs.filter((x) => !(x.at && x.at.str === n.at!.str && (q.target.length <= 6)));
          return [...others, n];
        }
      }
      if (q.as === 'set' && !n.at) {
        const i = xs.findIndex((x) => x.midi === n.midi);
        if (i >= 0) return xs.filter((_, j) => j !== i);
      }
      return xs.length >= max ? xs : [...xs, n];
    });
    if (!played) sound([n.midi]); // a played key already sounds on its own
  };
  // Spec AE §3.4: enter notes by playing — MIDI keys, or an acoustic instrument through the microphone.
  // In the guitar / bass course the instrument is the course's, whatever the profile says (0.66 guitar audit).
  const inst = courseInstrument(settings);
  // Owner 2026-11-13: a chord question on the keys could only be answered with the mouse. With MIDI on, the keys are
  // always live (no button) for chords and lines alike; a full answer submits itself.
  const midiLive = !disabled && !!settings.midiInput;
  const canPlay = !disabled && q.as === 'seq' && !settings.midiInput && !!inst && inst !== 'voice';
  const [playing, setPlaying] = useState(false);
  const addRef = useRef(add);
  addRef.current = add;
  // Before 0.66 a played neck answer was moved up an octave like a staff answer and marked wrong (playedShift).
  const writtenShift = playedShift(inst, surface);
  const placeFromPlayed = (m: number) => {
    const w = m + writtenShift;
    if (surface === 'neck') {
      const p = positionsOf(tuning, w, q.neck?.frets?.[0] ?? 0, q.neck?.frets?.[1] ?? 12, q.neck?.onString ? [q.neck.onString] : q.neck?.strings)[0];
      addRef.current(p ? { midi: w, at: p } : { midi: w }, true);
    } else addRef.current({ midi: w, dur: q.durs ? dur : undefined }, true);
  };
  useEffect(() => {
    if (!playing) return;
    if (settings.midiInput) return midiIn.onNote((m, on) => on && placeFromPlayed(m));
    const ac = new AbortController();
    // Onsets: a new stable pitch for ≥ 120 ms, or the same pitch again after a short silence.
    let cand: number | null = null;
    let since = 0;
    let last: number | null = null;
    let quietAt = 0;
    void listenLoop(new BrowserPitchCapture(), ac.signal, (f) => {
      const now = performance.now();
      if (!f.hz || f.confidence < 0.85) {
        if (now - quietAt > 150) last = null;
        cand = null;
        return;
      }
      quietAt = now;
      const m = Math.round(69 + 12 * Math.log2(f.hz / 440));
      if (m !== cand) {
        cand = m;
        since = now;
        return;
      }
      if (now - since >= 120 && m !== last) {
        last = m;
        placeFromPlayed(m);
      }
    }).then((e) => e && setPlaying(false));
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, settings.midiInput]);
  useEffect(() => {
    if (disabled) setPlaying(false);
  }, [disabled]);
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const submitRef = useRef<(ms: number[]) => void>(() => {});
  submitRef.current = (ms) => onSubmit(placeKey(q, ms, q.durs ? notesRef.current.map((n) => n.dur ?? 1) : undefined));
  useEffect(() => {
    if (!midiLive) return;
    const held = new Set<number>();
    let timer = 0;
    const off = midiIn.onNote((m, on) => {
      const w = m + writtenShift;
      if (on) {
        held.add(m);
        window.clearTimeout(timer);
        // A set never toggles off from the keys (a re-struck chord tone stays in); a line takes every note.
        if (q.as === 'set' && notesRef.current.some((n) => n.midi === w)) return;
        placeFromPlayed(m);
        if (q.as === 'seq' && notesRef.current.length + 1 >= q.target.length) {
          const ms = [...notesRef.current.map((n) => n.midi), w];
          timer = window.setTimeout(() => submitRef.current(ms), 350);
        }
      } else {
        held.delete(m);
        // A chord is answered when every key is let go and enough notes are in.
        if (q.as === 'set' && !held.size && notesRef.current.length >= q.target.length) {
          timer = window.setTimeout(() => submitRef.current(notesRef.current.map((n) => n.midi)), 250);
        }
      }
    });
    return () => (off(), window.clearTimeout(timer));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midiLive, q]);
  // GUITAR_DEEPENING §6: a chord on the neck (a set of 3+ notes) can be answered by strumming it — the closed-set
  // recognizer decides whether the asked chord sounded (any voicing; an inversion question checks the bass too).
  const target = useMemo(() => (q.as === 'set' && q.target.length >= 3 ? identifyChord(q.target) : null), [q]);
  const canStrum = !disabled && surface === 'neck' && !!target && inst === 'guitar' && !settings.midiInput;
  const needBass = /inversion|root position|היפוך|מצב יסודי/.test(q.ask.en + q.ask.he) && !/any inversion|כל היפוך/.test(q.ask.en + q.ask.he);
  const [strumming, setStrumming] = useState(false);
  const [strumMsg, setStrumMsg] = useState<'again' | 'mic' | null>(null);
  useEffect(() => {
    if (disabled) setStrumming(false);
  }, [disabled]);
  useStrums(
    strumming && canStrum,
    (frames) => {
      if (!target) return;
      const v = judgeStrum(frames, target, needBass);
      if (v.verdict === 'again') return setStrumMsg('again');
      setStrumMsg(null);
      setStrumming(false);
      // Right: the asked chord sounded — the canonical answer. Wrong: the chord heard, as notes (graded wrong).
      if (v.verdict === 'right') onSubmit(placeKey(q, q.target));
      else onSubmit(placeKey(q, heardMidis(v.heardChord, q.target)));
    },
    () => setStrumMsg('mic'),
  );
  const graded = result ? gradePlace(q, result) : null;
  const marks: PlaceMark[] = graded?.marks ?? [];
  const tone = (i: number): StaffNote['tone'] => (graded ? (marks[i] === 'ok' ? 'ok' : marks[i] === 'rhythm' ? 'rhythm' : 'wrong') : i < givenFirst.length ? 'given' : 'mine');
  const submit = () => onSubmit(placeKey(q, notes.map((n) => n.midi), q.durs ? notes.map((n) => n.dur ?? 1) : undefined));
  const staffClef = q.staff?.clef ?? (Math.min(...q.target) < 57 ? 'bass' : 'treble');
  const staffKey = q.staff ? q.staff.key : null;

  let body: React.ReactNode;
  if (surface === 'neck') {
    const frets = q.neck?.frets ?? [0, 12];
    const dots: NeckDot[] = [
      ...(q.neck?.dots ?? []).map((d) => ({ ...d, tone: 'given' as const })),
      ...notes.filter((n) => n.at).map((n, i) => ({ ...n.at!, tone: (graded ? (marks[i] === 'ok' ? 'ok' : 'wrong') : 'mine') as NeckDot['tone'] })),
    ];
    if (result) {
      // Show where the right notes are (on the asked string, or the nearest place).
      for (const m of q.target) {
        const already = notes.some((n) => n.midi === m || (q.match === 'pc' && n.midi % 12 === m % 12));
        if (already) continue;
        for (let s = 1; s <= tuning.open.length; s++) {
          if (q.neck?.onString && s !== q.neck.onString) continue;
          const f = m - tuning.open[s - 1];
          if (f >= frets[0] && f <= frets[1]) {
            dots.push({ str: s, fret: f, tone: 'answer' });
            if (q.as === 'seq') break;
          }
        }
      }
    }
    body = <Neck tuning={tuning} lo={frets[0]} hi={frets[1]} strings={q.neck?.onString ? [q.neck.onString] : q.neck?.strings} dots={dots} leftHanded={settings.leftHanded} label={T.neckLabel[lang]} onTap={disabled ? undefined : (s, f) => add({ midi: noteAt(tuning, s, f), at: { str: s, fret: f } })} />;
  } else if (surface === 'keys') {
    const lo = Math.min(48, ...q.target.map((m) => Math.floor(m / 12) * 12));
    const hi = Math.max(lo + 24, ...q.target.map((m) => Math.ceil((m + 1) / 12) * 12));
    const km = notes.map((n, i) => ({ m: n.midi, tone: graded ? (marks[i] === 'ok' ? 'ok' : 'wrong') : 'mine' }));
    if (result) for (const m of q.target) if (!notes.some((n) => n.midi === m)) km.push({ m, tone: 'answer' });
    body = <KeysPad lo={lo} hi={Math.min(hi, lo + 36)} marks={km} onTap={disabled ? undefined : (m) => add({ midi: m })} label={T.keysLabel[lang]} />;
  } else {
    const ka = keyAcc(staffKey);
    const shown: StaffNote[] = notes.map((n, i) => ({ midi: n.midi, dur: q.durs ? n.dur : 1, tone: tone(i) }));
    body = (
      <>
        <StaffPad
          clef={staffClef}
          keyPc={staffKey}
          notes={shown}
          lang={lang}
          onTap={
            disabled
              ? undefined
              : (step) => {
                  const letter = LETTERS[((step % 7) + 7) % 7];
                  const a = acc ?? ka[letter] ?? 0;
                  add({ midi: stepToMidi(step, a), dur: q.durs ? dur : undefined });
                  setAcc(null);
                }
          }
        />
        {result && graded && graded.score < 1 && <StaffPad clef={staffClef} keyPc={staffKey} notes={q.target.map((m, i) => ({ midi: m, dur: q.durs?.[i] ?? 1, tone: 'answer' }))} lang={lang} />}
        {!disabled && (
          <div className="staff-tools" role="group">
            {[
              [1, '♯', T.sharp],
              [-1, '♭', T.flat],
              [0, '♮', T.natural],
            ].map(([v, g, lbl]) => (
              <button key={String(v)} type="button" className={`chip ${acc === v ? 'on' : ''}`} aria-pressed={acc === v} aria-label={(lbl as { en: string; he: string })[lang]} onClick={() => setAcc(acc === v ? null : (v as number))}>
                {g as string}
              </button>
            ))}
            {q.durs && (
              <span className="dur-palette" role="radiogroup" aria-label={T.length[lang]}>
                {DURS.map((d) => (
                  <button key={d.b} type="button" role="radio" aria-checked={dur === d.b} className={`chip ${dur === d.b ? 'on' : ''}`} onClick={() => setDur(d.b)}>
                    {d.glyph}
                  </button>
                ))}
              </span>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <div className={`place-surface surface-${surface}`}>
      {body}
      <p className="place-list" aria-live="polite">
        <span>{T.entered[lang]}: </span>
        <span dir="ltr">{notes.length ? notes.map((n) => (q.match === 'pc' ? NAMES[n.midi % 12] : midiName(n.midi))).join(' · ') : T.none[lang]}</span>
      </p>
      {canStrum && (
        <div className="place-play place-strum">
          <button type="button" className={`btn small ${strumming ? 'primary' : ''}`} aria-pressed={strumming} onClick={() => (setStrumMsg(null), setStrumming((v) => !v))}>
            {strumming ? T.stopPlay[lang] : T.strumIn[lang]}
          </button>
          {strumming && (
            <small className="field-hint" role="status">
              {strumMsg === 'again' ? T.strumAgain[lang] : strumMsg === 'mic' ? T.strumMic[lang] : T.strumListening[lang]}
            </small>
          )}
        </div>
      )}
      {midiLive && (
        <small className="field-hint place-midi" role="status">
          {T.midiLive[lang]}
        </small>
      )}
      {canPlay && (
        <div className="place-play">
          <button type="button" className={`btn small ${playing ? 'primary' : ''}`} aria-pressed={playing} onClick={() => setPlaying((v) => !v)}>
            {playing ? T.stopPlay[lang] : T.playIn[lang]}
          </button>
          {playing && (
            <small className="field-hint" role="status">
              {T.listening[lang]} {!settings.midiInput && T.mute[lang]}
            </small>
          )}
        </div>
      )}
      {!disabled && (
        <div className="place-actions">
          <button type="button" className="btn small" onClick={() => setNotes((xs) => (xs.length > givenFirst.length ? xs.slice(0, -1) : xs))}>
            ↶ {T.undo[lang]}
          </button>
          <button type="button" className="btn small ghost" onClick={() => setNotes((xs) => xs.slice(0, givenFirst.length))}>
            {T.clear[lang]}
          </button>
          <button type="button" className="btn small ghost" disabled={!notes.length} onClick={() => sound(notes.map((n) => n.midi), 0.42, q.as === 'set' && surface !== 'staff')}>
            ▶ {T.play[lang]}
          </button>
          <button type="button" className="btn primary place-done" disabled={!notes.length} onClick={submit}>
            ✓ {T.done[lang]}
          </button>
        </div>
      )}
    </div>
  );
}

/** Pitch class value helper for callers that only know a PitchClass. */
export const pcOf = (p: PitchClass) => pcValue(p);
