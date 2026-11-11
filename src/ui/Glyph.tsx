// The note-head symbol set (0.61, SPEC-REDESIGN): every exercise type and domain sits inside a tilted note head
// on its domain colour, with an ink outline. Same drawings as the design canvas ("What makes it ours").
import type { ReactNode } from 'react';
import { LESSON_MARK, TOPIC_MARK } from './stepMarks';

const I = '#1E1033';
const sw = { stroke: I, strokeWidth: 3.2, strokeLinecap: 'round' as const, fill: 'none' };
const head = (cx: number, cy: number, rx = 6.5, ry = 4.6) => <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(-20 ${cx} ${cy})`} fill={I} />;

export const DOMAIN_COLOR = { ear: '#3AB8FF', rhythm: '#FF5FA2', voice: '#12C9B4', play: '#FFD43B', harmony: '#A78BFA', theory: '#FF8A3D', purple: '#6D28D9', none: '#EDE6F7' } as const;

export const GLYPHS: Record<string, ReactNode> = {
  intervals: (
    <>
      {head(-11, 10, 7, 5.2)}
      {head(11, -9, 7, 5.2)}
    </>
  ),
  chords: (
    <>
      {head(-3, 13)}
      {head(-3, 3)}
      {head(-3, -7)}
      <path d="M4 12V-24" {...sw} />
    </>
  ),
  contour: <path d="M-24 8 L-13 -4 L-3 4 L8 -13 L22 -6" {...sw} strokeLinejoin="round" />,
  rhythm: (
    <>
      {head(-13, 13)}
      {head(9, 13)}
      <path d="M-7 11V-15M15 11V-15" {...sw} />
      <path d="M-7 -15H15" stroke={I} strokeWidth={6.5} />
    </>
  ),
  sing: <path d="M-24 0 C-19 -15 -13 -15 -8 0 S2 15 7 0 S17 -15 23 -5" {...sw} strokeWidth={3.4} />,
  tune: (
    <>
      <path d="M-20 10 A22 22 0 0 1 20 10" {...sw} />
      <path d="M0 12 L7 -12" {...sw} />
      <circle cx={0} cy={12} r={3.5} fill={I} />
    </>
  ),
  sight: (
    <>
      <path d="M-26 -8H26M-26 0H26M-26 8H26" stroke={I} strokeWidth={1.8} />
      <path d="M-19 0 Q0 -17 19 0 Q0 17 -19 0Z" fill="#FFFFFF" stroke={I} strokeWidth={3.2} />
      <circle r={5.5} fill={I} />
    </>
  ),
  scales: (
    <>
      {head(-18, 14, 5.5, 4)}
      {head(-6, 5, 5.5, 4)}
      {head(6, -4, 5.5, 4)}
      {head(18, -13, 5.5, 4)}
    </>
  ),
  prog: (
    <text x={0} y={8} textAnchor="middle" fontFamily="'Secular One', Rubik, sans-serif" fontSize={22} fill={I} direction="ltr">
      ii V I
    </text>
  ),
  improv: <path d="M-24 10 C-16 -20 -6 20 2 -2 S14 -18 18 -8 S24 4 20 8" {...sw} />,
  tempo: (
    <>
      <path d="M-13 17 L-5 -19 H5 L13 17Z" {...sw} strokeLinejoin="round" />
      <path d="M0 11 L10 -11" {...sw} />
    </>
  ),
  theory: <path d="M-6 -18V18M6 -20V16M-15 -4L15 -10M-15 10L15 4" {...sw} strokeWidth={4} />,
  keys: (
    <g {...sw} strokeWidth={3}>
      <rect x={-22} y={-12} width={44} height={26} rx={3} />
      <path d="M-11 -12v14M0 -12v14M11 -12v14" />
    </g>
  ),
  // 0.64 (tester): the ear & theory course is an ear; bass is the bass clef (no longer the guitar's symbol).
  ear: (
    <g {...sw}>
      <path d="M-12 -6 C-12 -22 14 -24 16 -6 C17 6 6 8 4 16 C2 22 -8 22 -10 14" />
      <path d="M-4 -6 C-4 -14 8 -14 8 -5 C8 1 2 1 1 6" />
    </g>
  ),
  bass: (
    <>
      <path d="M-14 -10 C-6 -22 16 -20 13 -2 C11 12 -2 19 -16 22" {...sw} strokeWidth={3.4} />
      <circle cx={-12} cy={-9} r={4.5} fill={I} />
      <circle cx={21} cy={-11} r={3} fill={I} />
      <circle cx={21} cy={1} r={3} fill={I} />
    </>
  ),
  guitar: (
    <g {...sw}>
      <path d="M6 -18l12 12M12 -12 -4 4" />
      <circle cx={-10} cy={10} r={8} />
    </g>
  ),
  echo: (
    <g {...sw}>
      <path d="M-14 -10a14 14 0 0 1 0 20" />
      <path d="M-4 -16a22 22 0 0 1 0 32" />
      <path d="M6 -22a30 30 0 0 1 0 44" />
    </g>
  ),
  book: <path d="M-20 -14h16a4 4 0 0 1 4 4v24a4 4 0 0 0-4-4h-16zM20 -14H4a4 4 0 0 0-4 4v24a4 4 0 0 1 4-4h16z" {...sw} strokeWidth={3} strokeLinejoin="round" />,
  puzzle: <path d="M-16 -14h12a5 5 0 1 1 8 0h12v12a5 5 0 1 0 0 8v12h-32z" {...sw} strokeLinejoin="round" />,
  memory: (
    <g fill={I}>
      <rect x={-20} y={-14} width={14} height={14} rx={3} />
      <rect x={6} y={-14} width={14} height={14} rx={3} fill="none" stroke={I} strokeWidth={3} />
      <rect x={-20} y={6} width={14} height={14} rx={3} fill="none" stroke={I} strokeWidth={3} />
      <rect x={6} y={6} width={14} height={14} rx={3} />
    </g>
  ),
  name: (
    <text x={0} y={9} textAnchor="middle" fontFamily="'Secular One', Rubik, sans-serif" fontSize={26} fill={I}>
      ?
    </text>
  ),
  eq: <path d="M-16 14V-2M-6 14V-14M4 14V2M14 14V-8" {...sw} strokeWidth={3.4} />,
  trophy: <path d="M-12 -16h24v8a12 12 0 0 1-24 0zM-4 8h8v8h-8zM-10 18h20" {...sw} strokeLinejoin="round" />,
  person: (
    <g {...sw}>
      <circle cx={0} cy={-8} r={7} />
      <path d="M-14 18c2-9 7-12 14-12s12 3 14 12" />
    </g>
  ),
  drone: (
    <>
      <path d="M-24 0H24" stroke={I} strokeWidth={5} strokeLinecap="round" />
      <path d="M-24 -10H24M-24 10H24" stroke={I} strokeWidth={2} opacity={0.5} />
    </>
  ),
  slow: (
    <g {...sw}>
      <circle r={16} />
      <path d="M0 -8V0L7 5" />
    </g>
  ),
  mixer: (
    <>
      <path d="M-12 -18v36M0 -18v36M12 -18v36" {...sw} strokeWidth={3} />
      <g fill="#FFFFFF" stroke={I} strokeWidth={2.5}>
        <rect x={-17} y={2} width={10} height={7} rx={2} />
        <rect x={-5} y={-10} width={10} height={7} rx={2} />
        <rect x={7} y={6} width={10} height={7} rx={2} />
      </g>
    </>
  ),
  log: (
    <g {...sw} strokeWidth={3}>
      <rect x={-15} y={-18} width={30} height={36} rx={4} />
      <path d="M-8 -8h16M-8 0h16M-8 8h10" />
    </g>
  ),
  groove: <path d="M-22 8c6-16 10-16 16 0s10 16 16 0 8-12 12-6" {...sw} />,
  live: (
    <>
      <circle r={6} fill={I} />
      <path d="M-14 -12a20 20 0 0 0 0 24M14 -12a20 20 0 0 1 0 24" {...sw} strokeWidth={3} />
    </>
  ),
  duel: <path d="M-18 -16 14 16M18 -16 -14 16" {...sw} strokeWidth={3.4} />,
  ghost: (
    <>
      <path d="M-14 16V-2a14 14 0 0 1 28 0v18l-7-5-7 5-7-5z" {...sw} strokeLinejoin="round" />
      <circle cx={-5} cy={-2} r={2.5} fill={I} />
      <circle cx={5} cy={-2} r={2.5} fill={I} />
    </>
  ),
  calendar: (
    <g {...sw} strokeWidth={3}>
      <rect x={-18} y={-14} width={36} height={32} rx={4} />
      <path d="M-18 -4h36M-8 -20v8M8 -20v8" />
    </g>
  ),
  fire: <path d="M0 -20c8 10 14 14 14 24a14 14 0 0 1-28 0c0-6 4-10 6-14 2 6 4 8 8 8-2-6-2-12 0-18z" {...sw} strokeLinejoin="round" />,
  star: <path d="M0 -20 6 -6 21 -5 9 5 13 19 0 11 -13 19 -9 5 -21 -5 -6 -6z" {...sw} strokeLinejoin="round" />,
  // Drums (0.65): the course and one symbol per drum family / pad — every step on the drums path has its own.
  drums: (
    <g {...sw}>
      <ellipse cx={0} cy={-2} rx={19} ry={6} />
      <path d="M-19 -2v11a19 6 0 0 0 38 0v-11" />
      <path d="M-15 -24 3 -8M15 -24 -3 -8" />
    </g>
  ),
  sticks: (
    <g {...sw}>
      <path d="M-22 14 12 -16M-14 19 21 -11" />
      <circle cx={13} cy={-17} r={2.6} fill={I} />
      <circle cx={22} cy={-12} r={2.6} fill={I} />
    </g>
  ),
  snare: (
    <g {...sw}>
      <ellipse cx={0} cy={-6} rx={20} ry={6.5} />
      <path d="M-20 -6v12a20 6.5 0 0 0 40 0v-12M-12 0v10M0 1v11M12 0v10" />
    </g>
  ),
  kick: (
    <g {...sw}>
      <circle cx={-2} cy={2} r={16} />
      <circle cx={-2} cy={2} r={5} fill={I} />
      <path d="M14 -10 22 -18M18 -6 24 -2" />
    </g>
  ),
  hihat: (
    <g {...sw}>
      <path d="M-22 -10 Q0 -18 22 -10Z" strokeLinejoin="round" />
      <path d="M-22 -4 Q0 4 22 -4Z" strokeLinejoin="round" />
      <path d="M0 -2V20M-9 20H9" />
    </g>
  ),
  cymbal: (
    <g {...sw}>
      <path d="M-24 -4 Q0 -16 24 -4 Q0 2 -24 -4Z" strokeLinejoin="round" />
      <path d="M0 -6V20M-8 20H8" />
      <path d="M-14 -16l-4-4M14 -16l4-4" />
    </g>
  ),
  toms: (
    <g {...sw}>
      <ellipse cx={-12} cy={-8} rx={9} ry={4} />
      <path d="M-21 -8v8a9 4 0 0 0 18 0v-8" />
      <ellipse cx={11} cy={2} rx={11} ry={4.5} />
      <path d="M0 2v10a11 4.5 0 0 0 22 0v-10" />
    </g>
  ),
  rudiment: (
    <>
      <ellipse cx={0} cy={6} rx={21} ry={7} {...sw} />
      {[-12, -4, 4, 12].map((x, i) => (
        <circle key={x} cx={x} cy={i % 2 ? -14 : -9} r={3.4} fill={I} />
      ))}
    </>
  ),
  paradiddle: (
    <text x={0} y={7} textAnchor="middle" fontFamily="'Secular One', Rubik, sans-serif" fontSize={17} fill={I} direction="ltr" letterSpacing={-0.5}>
      RLRR
    </text>
  ),
  pulse: (
    <g {...sw}>
      <path d="M-18 14V-14" strokeWidth={5} />
      <path d="M-6 14V-4M6 14V-4M18 14V-4" />
      <path d="M-24 18H24" strokeWidth={2.2} />
    </g>
  ),
  fill: (
    <g {...sw}>
      <circle cx={-16} cy={-10} r={5} />
      <circle cx={-2} cy={-4} r={6} />
      <circle cx={14} cy={4} r={7.5} />
      <path d="M-20 10 Q-4 22 18 18" />
      <path d="M13 13l5 5-6 3" strokeLinejoin="round" />
    </g>
  ),
  drumread: (
    <>
      <path d="M-26 -12H26M-26 -4H26M-26 4H26M-26 12H26" stroke={I} strokeWidth={1.8} />
      <path d="M-18 -20l8 8M-10 -20l-8 8M2 -20l8 8M10 -20l-8 8" {...sw} strokeWidth={3} />
      {head(-12, 8, 5.5, 4)}
      {head(14, 0, 5.5, 4)}
    </>
  ),
  // Drums v2 families (DRUMS_AUDIT N1): the shuffle (a long + short pair under a triplet bracket), independence (four
  // limbs), the darbuka (Middle-Eastern rhythms).
  shuffle: (
    <>
      {head(-12, 12)}
      {head(12, 12)}
      <path d="M-6 10V-12M18 10V-12" {...sw} />
      <path d="M18 -12q5 4 6 10" {...sw} />
      <path d="M-22 -16v-5H22v5" {...sw} strokeWidth={2.4} />
    </>
  ),
  limbs: (
    <g {...sw}>
      <circle cx={-13} cy={-11} r={6} />
      <circle cx={13} cy={-11} r={6} />
      <circle cx={-13} cy={13} r={6} fill={I} />
      <circle cx={13} cy={13} r={6} fill={I} />
      <path d="M-7 -11H7M-13 -5V7M13 -5V7" />
    </g>
  ),
  darbuka: (
    <g {...sw}>
      <ellipse cx={0} cy={-15} rx={15} ry={4.5} />
      <path d="M-15 -15C-15 -3 -6 0 -5 6L-10 20H10L5 6C6 0 15 -3 15 -15" strokeLinejoin="round" />
    </g>
  ),
  // Drums content (0.66): the drummer's ear (an ear and a stick), jazz (the ride with its skip-note triplet), Latin (two
  // claves crossed).
  drumear: (
    <g {...sw}>
      <path d="M-4 18C-14 18-18 10-18 2C-18-10-10-18 0-18S16-12 16-2C16 6 8 8 6 14" strokeLinejoin="round" />
      <path d="M-8 2C-8-6-4-9 1-9S8-6 8-1" />
      <path d="M10 -20 24 14" strokeWidth={4} />
      <circle cx={10} cy={-20} r={3} fill={I} />
    </g>
  ),
  ride: (
    <>
      <path d="M-24 -6 Q0 -18 24 -6 Q0 0 -24 -6Z" {...sw} strokeLinejoin="round" />
      {head(-14, 14, 4.4, 3.2)}
      {head(2, 14, 4.4, 3.2)}
      {head(16, 14, 4.4, 3.2)}
      <path d="M-12 2v10M4 2v10M18 2v10" {...sw} strokeWidth={2.4} />
    </>
  ),
  clave: (
    <g {...sw}>
      <path d="M-20 -14 18 14" strokeWidth={7} strokeLinecap="round" />
      <path d="M-18 14 20 -14" strokeWidth={7} strokeLinecap="round" />
    </g>
  ),
  // Guitar course (0.66): every technique family its own symbol, apart from the guitar topics' symbols.
  fingers1234: (
    <text x={0} y={7} textAnchor="middle" fontFamily="'Secular One', Rubik, sans-serif" fontSize={18} fill={I} direction="ltr" letterSpacing={0.5}>
      1234
    </text>
  ),
  pick: <path d="M0 20C-9 11-18 0-18-9c0-8 8-11 18-11s18 3 18 11C18 0 9 11 0 20z" {...sw} strokeLinejoin="round" />,
  slur: (
    <>
      {head(-12, 10)}
      {head(12, 2)}
      <path d="M-18 -2Q-2 -22 18 -10" {...sw} />
    </>
  ),
  box: (
    <>
      <path d="M-24 -12H24M-24 -4H24M-24 4H24M-24 12H24M-12 -16V16M4 -16V16" stroke={I} strokeWidth={1.8} />
      {[
        [-18, -12],
        [-4, -4],
        [12, -12],
        [-18, 4],
        [12, 12],
        [-4, 12],
      ].map(([x, y]) => (
        <circle key={`${x},${y}`} cx={x} cy={y} r={3.6} fill={I} />
      ))}
    </>
  ),
  chordbox: (
    <>
      <path d="M-15 -16V18M-9 -16V18M-3 -16V18M3 -16V18M9 -16V18M15 -16V18M-15 -5H15M-15 6H15" stroke={I} strokeWidth={1.8} />
      <path d="M-16 -16H16" stroke={I} strokeWidth={4.5} />
      <circle cx={-9} cy={0.5} r={3.6} fill={I} />
      <circle cx={-3} cy={11.5} r={3.6} fill={I} />
      <circle cx={9} cy={0.5} r={3.6} fill={I} />
    </>
  ),
  arp: (
    <>
      <path d="M-22 16q4-4 0-8t0-8 0-8 0-8" {...sw} strokeWidth={2.6} />
      {head(-6, 13)}
      {head(4, 2)}
      {head(14, -9)}
    </>
  ),
  strum: <path d="M-10 -18V16M-17 9l7 7 7-7M10 16V-18M3-11l7-7 7 7" {...sw} strokeLinejoin="round" />,
  bend: (
    <g {...sw}>
      <path d="M-22 16H-2Q12 16 13-12" />
      <path d="M7-6l6-8 6 8" strokeLinejoin="round" />
    </g>
  ),
  pima: (
    <text x={0} y={6} textAnchor="middle" fontFamily="Rubik, sans-serif" fontStyle="italic" fontWeight={700} fontSize={17} fill={I} direction="ltr">
      pima
    </text>
  ),
  fan: (
    <g {...sw}>
      <path d="M0 18-18-8M0 18-6-15M0 18 6-15M0 18 18-8" strokeWidth={2.8} />
      <path d="M-20-8Q0-26 20-8" />
    </g>
  ),
  // Bass (0.65, final check): one symbol per bass family, so no two steps on the bass path share one.
  /** Plucking hand: a string, two fingers, the stroke coming to rest. */
  pluck: (
    <g {...sw}>
      <path d="M-26 10H26" strokeWidth={2.4} />
      <path d="M-10 -20 C-12 -8 -10 2 -4 8M4 -22 C2 -10 4 0 10 6" />
      <path d="M14 -4l8 4M15 4l8 0" strokeWidth={2.4} />
    </g>
  ),
  /** The neck: strings, frets and a fretted dot. */
  fretboard: (
    <>
      <g {...sw} strokeWidth={2.4}>
        <path d="M-26 -12H26M-26 -4H26M-26 4H26M-26 12H26" />
        <path d="M-14 -16V16M2 -16V16M18 -16V16" strokeWidth={3.2} />
      </g>
      <circle cx={-6} cy={-4} r={5} fill={I} />
    </>
  ),
  /** Fretting hand: one finger per fret (1 2 4). */
  fingers: (
    <text x={0} y={8} textAnchor="middle" fontFamily="'Secular One', Rubik, sans-serif" fontSize={21} fill={I} direction="ltr" letterSpacing={1}>
      1 2 4
    </text>
  ),
  /** Note length: a held note and the stop that ends it. */
  mute: (
    <>
      {head(-14, 4)}
      <path d="M-6 4H14" stroke={I} strokeWidth={4} strokeLinecap="round" />
      <path d="M20 -10V18" {...sw} strokeWidth={4} />
    </>
  ),
  /** Walking: steps going somewhere — four quarter notes climbing. */
  walk: (
    <>
      {head(-18, 14, 5, 3.6)}
      {head(-6, 8, 5, 3.6)}
      {head(6, 2, 5, 3.6)}
      {head(18, -4, 5, 3.6)}
      <path d="M-13 13V-10M-1 7V-16M11 1V-22M23 -5V-24" {...sw} strokeWidth={2.4} />
    </>
  ),
  /** Slap and pop: the T and P of bass notation. */
  slap: (
    <text x={0} y={9} textAnchor="middle" fontFamily="'Secular One', Rubik, sans-serif" fontSize={26} fill={I} direction="ltr" letterSpacing={2}>
      T P
    </text>
  ),
  /** Styles: a record. */
  record: (
    <g {...sw}>
      <circle r={19} />
      <circle r={11} strokeWidth={1.8} />
      <circle r={3.5} fill={I} />
    </g>
  ),
  /** Upright positions: a string and the shift from one hand position to the next. */
  shift: (
    <g {...sw}>
      <path d="M-26 12H26" strokeWidth={2.4} />
      <circle cx={-16} cy={12} r={4.5} fill={I} />
      <circle cx={16} cy={12} r={4.5} fill={I} />
      <path d="M-12 -2 Q0 -18 12 -2" />
      <path d="M6 -6l6 4 2-7" strokeLinejoin="round" />
    </g>
  ),
  /** Arco: the bow. */
  bow: (
    <g {...sw}>
      <path d="M-24 14 22 -14" />
      <path d="M-20 18 C-6 6 8 -4 24 -10" strokeWidth={1.8} />
      <path d="M-24 14l4 4" strokeWidth={4} />
    </g>
  ),
  /** Three-octave scales: a ladder up the fingerboard. */
  ladder: <path d="M-12 20V-20M12 20V-20M-12 12H12M-12 2H12M-12 -8H12M-12 -18H12" {...sw} />,
  /** Upright pizzicato. */
  pizz: (
    <text x={0} y={8} textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontStyle="italic" fontWeight={700} fontSize={22} fill={I} direction="ltr">
      pizz.
    </text>
  ),
  /** Bass interval shapes: the octave shape — two strings up, two frets up — joined. */
  octave: (
    <>
      <g {...sw} strokeWidth={2.2}>
        <path d="M-26 -14H26M-26 -5H26M-26 4H26M-26 13H26" />
      </g>
      <path d="M-10 13 L10 -5" {...sw} strokeWidth={3.4} />
      <circle cx={-10} cy={13} r={5.2} fill={I} />
      <circle cx={10} cy={-5} r={5.2} fill={I} />
    </>
  ),
  /** Reading in positions: a position number over a bracket of four frets. */
  position: (
    <>
      <text x={0} y={2} textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontWeight={700} fontSize={20} fill={I} direction="ltr">
        V
      </text>
      <path d="M-18 8V14H18V8" {...sw} strokeWidth={2.6} strokeLinejoin="round" />
      <path d="M-6 14V9M6 14V9" {...sw} strokeWidth={2} />
    </>
  ),
  /** Target notes: a fill that lands on the target. */
  target: (
    <>
      <circle cx={10} cy={2} r={14} {...sw} strokeWidth={2.6} />
      <circle cx={10} cy={2} r={6.5} {...sw} strokeWidth={2.6} />
      <circle cx={10} cy={2} r={2.6} fill={I} />
      <path d="M-26 -16 Q-14 -18 -8 -8 T4 0" {...sw} strokeWidth={2.8} />
    </>
  ),
  // BASS_NICHE_PLAN (P1): the bass course's jazz and prog families.
  /** Swing time: a long note and a short one under a triplet bracket. */
  swingtime: (
    <>
      {head(-12, 13, 6.2, 4.4)}
      {head(12, 13, 4.6, 3.3)}
      <path d="M-6 11V-12M16 11V-12" {...sw} strokeWidth={2.6} />
      <path d="M16 -12 L24 -4" {...sw} strokeWidth={2.6} />
      <path d="M-14 -16 Q2 -26 18 -16" {...sw} strokeWidth={2.4} />
      <circle cx={2} cy={-22} r={2.4} fill={I} />
    </>
  ),
  /** Barry Harris on the bass: the 6th chord and its diminished partner. */
  barrybass: (
    <text x={0} y={10} textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontWeight={700} fontSize={30} fill={I} direction="ltr">
      6°
    </text>
  ),
  /** Form and arrangement: the road map A A B A, the bridge a different block. */
  roadmap: (
    <g {...sw} strokeWidth={2.6} strokeLinejoin="round">
      <rect x={-26} y={-6} width={11} height={16} rx={2} />
      <rect x={-12} y={-6} width={11} height={16} rx={2} />
      <rect x={2} y={-14} width={11} height={24} rx={2} fill={I} />
      <rect x={16} y={-6} width={11} height={16} rx={2} />
    </g>
  ),
  /** Afro-Cuban bass: a conga drum. */
  tumbao: (
    <g {...sw} strokeWidth={2.8} strokeLinejoin="round">
      <ellipse cx={0} cy={-14} rx={12} ry={4.5} />
      <path d="M-12 -14 Q-17 2 -9 20 H9 Q17 2 12 -14" />
      <path d="M-14 -2 H14" strokeWidth={2} />
    </g>
  ),
  /** Odd meters: a 7 over an 8. */
  oddmeter: (
    <>
      <text x={0} y={-2} textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontWeight={700} fontSize={22} fill={I} direction="ltr">
        7
      </text>
      <text x={0} y={20} textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontWeight={700} fontSize={22} fill={I} direction="ltr">
        8
      </text>
    </>
  ),
  /** Polymeter: two cycles of different lengths turning together. */
  polymeter: (
    <>
      <circle cx={-9} cy={2} r={13} {...sw} strokeWidth={2.6} />
      <circle cx={12} cy={2} r={10} {...sw} strokeWidth={2.6} />
      <circle cx={-9} cy={-11} r={3} fill={I} />
      <circle cx={12} cy={-8} r={3} fill={I} />
    </>
  ),
  /** Riffs and unisons: one riff line doubled. */
  unison: (
    <g {...sw} strokeWidth={3} strokeLinejoin="round">
      <path d="M-24 -4 L-14 -14 L-4 -4 L6 -14 L16 -4 L24 -10" />
      <path d="M-24 12 L-14 2 L-4 12 L6 2 L16 12 L24 6" />
    </g>
  ),
  // PIANO_AUDIT: the keys path's own symbols.
  /** Touch and control: a crescendo hairpin. */
  hairpin: <path d="M22 -13 L-22 0 L22 13" {...sw} strokeWidth={3.2} strokeLinejoin="round" />,
  /** Left-hand voicings: a stacked chord held by a bracket (the hand's span). */
  voicing: (
    <>
      {head(4, 14)}
      {head(4, 3)}
      {head(4, -8)}
      <path d="M-14 -16H-20V20H-14" {...sw} strokeWidth={3} strokeLinejoin="round" />
    </>
  ),
  /** The pianist's ear: an ear over three keys. */
  keysear: (
    <g {...sw}>
      <path d="M-9 -2 C-9 -16 11 -18 12 -4 C13 4 5 6 4 12" strokeWidth={2.8} />
      <path d="M-3 -3 C-3 -9 6 -9 6 -3" strokeWidth={2.4} />
      <rect x={-22} y={14} width={44} height={9} rx={2} strokeWidth={2.4} />
      <path d="M-7 14v9M7 14v9" strokeWidth={2} />
    </g>
  ),
  /** Reading both clefs: two staves joined by a brace line. */
  clefs: (
    <>
      <path d="M-18 -18H22M-18 -12H22M-18 -6H22M-18 6H22M-18 12H22M-18 18H22" stroke={I} strokeWidth={1.8} />
      <path d="M-22 -19V19" stroke={I} strokeWidth={3.4} strokeLinecap="round" />
      {head(2, -12, 5, 3.6)}
      {head(10, 12, 5, 3.6)}
    </>
  ),
  /** Chords as shapes on the keys: three dots on a keyboard. */
  keychord: (
    <>
      <g {...sw} strokeWidth={2.8}>
        <rect x={-22} y={-14} width={44} height={28} rx={3} />
        <path d="M-11 -14v28M0 -14v28M11 -14v28" strokeWidth={1.8} />
      </g>
      <circle cx={-16.5} cy={7} r={3.6} fill={I} />
      <circle cx={-5.5} cy={7} r={3.6} fill={I} />
      <circle cx={16.5} cy={7} r={3.6} fill={I} />
    </>
  ),
  /** Scales as shapes on the keys: a rising run of dots over a keyboard. */
  keyscale: (
    <>
      <g {...sw} strokeWidth={2.6}>
        <rect x={-22} y={2} width={44} height={16} rx={2.5} />
        <path d="M-11 2v16M0 2v16M11 2v16" strokeWidth={1.8} />
      </g>
      <circle cx={-16} cy={-4} r={3.2} fill={I} />
      <circle cx={-5.5} cy={-9} r={3.2} fill={I} />
      <circle cx={5.5} cy={-14} r={3.2} fill={I} />
      <circle cx={16} cy={-19} r={3.2} fill={I} />
    </>
  ),
  // PIANO_JAZZ: the jazz-piano families and topics.
  /** Barry Harris harmony: a four-note block chord beside the diminished circle. */
  sixdim: (
    <>
      {head(-6, 15, 5.4, 3.8)}
      {head(-6, 6, 5.4, 3.8)}
      {head(-6, -3, 5.4, 3.8)}
      {head(-6, -12, 5.4, 3.8)}
      <path d="M0 13V-24" {...sw} strokeWidth={2.8} />
      <circle cx={15} cy={-8} r={6} {...sw} strokeWidth={2.8} />
    </>
  ),
  /** Bebop lines: four beamed 8ths running down to a landing note. */
  bebop: (
    <>
      {head(-20, -4, 4.6, 3.3)}
      {head(-10, 1, 4.6, 3.3)}
      {head(0, 6, 4.6, 3.3)}
      {head(10, 11, 4.6, 3.3)}
      <path d="M-16 -5V-22M-6 0V-18M4 5V-14M14 10V-10" {...sw} strokeWidth={2.4} />
      <path d="M-16 -22L14 -10" stroke={I} strokeWidth={5} />
      <circle cx={22} cy={17} r={3.4} fill={I} />
    </>
  ),
  /** Jazz-piano harmony: one chord turning into another (a substitution). */
  reharm: (
    <>
      {head(-14, 12, 5, 3.6)}
      {head(-14, 2, 5, 3.6)}
      {head(14, 15, 5, 3.6)}
      {head(14, 5, 5, 3.6)}
      {head(14, -5, 5, 3.6)}
      <path d="M-16 -8 C-12 -24 8 -24 12 -14" {...sw} strokeWidth={2.6} />
      <path d="M6 -16 L12 -13 L14 -20" {...sw} strokeWidth={2.6} strokeLinejoin="round" />
    </>
  ),
  /** Barry Harris shapes on the keys: a keyboard with a small diminished circle above. */
  keydim: (
    <>
      <g {...sw} strokeWidth={2.6}>
        <rect x={-22} y={0} width={44} height={18} rx={2.5} />
        <path d="M-11 0v18M0 0v18M11 0v18" strokeWidth={1.8} />
      </g>
      <circle cx={-16.5} cy={11} r={3} fill={I} />
      <circle cx={5.5} cy={11} r={3} fill={I} />
      <circle cx={0} cy={-12} r={7} {...sw} strokeWidth={2.8} />
    </>
  ),
  /** Jazz chords as shapes: dots spread over two hands' keys, a gap between them. */
  keyjazz: (
    <>
      <g {...sw} strokeWidth={2.6}>
        <rect x={-24} y={-6} width={20} height={22} rx={2.5} />
        <rect x={4} y={-6} width={20} height={22} rx={2.5} />
      </g>
      <circle cx={-18} cy={8} r={3} fill={I} />
      <circle cx={-10} cy={8} r={3} fill={I} />
      <circle cx={10} cy={8} r={3} fill={I} />
      <circle cx={18} cy={8} r={3} fill={I} />
      <circle cx={14} cy={-16} r={3} fill={I} />
    </>
  ),
};
/** A short music mark in the note head (EAR_THEORY_AUDIT: one per ear / jazz path step, src/ui/stepMarks.ts). */
const mark = (s: string) => {
  const n = Array.from(s).length;
  // 0.69 (owner): readable on a phone — the old 13–16 drew 4–5 letter marks about 5 px tall in the node.
  const size = n <= 2 ? 40 : n === 3 ? 34 : n === 4 ? 28 : 24;
  return (
    <text x={0} y={size * 0.36} textAnchor="middle" fontFamily="'Secular One', Rubik, 'Noto Music', sans-serif" fontSize={size} fill={I} direction="ltr" letterSpacing={n >= 4 ? -0.4 : 0}>
      {s}
    </text>
  );
};
for (const [k, s] of Object.entries(TOPIC_MARK)) GLYPHS[`m:${k}`] = mark(s);
for (const [k, s] of Object.entries(LESSON_MARK)) GLYPHS[`m:lesson:${k}`] = mark(s);
export type GlyphKind = keyof typeof GLYPHS;

/** Emoji left in content data → the closest symbol of our set (0.61: no emoji in the interface). */
const EMOJI: Record<string, GlyphKind> = {
  '🎸': 'guitar', '🪕': 'guitar', '🎻': 'guitar', '🎹': 'keys', '🎤': 'sing', '🗣': 'sing', '🥁': 'drums', '👂': 'intervals', '🎵': 'contour', '🎶': 'contour', '♪': 'contour', '♫': 'contour', '♩': 'rhythm',
  '🎼': 'sight', '📖': 'book', '📚': 'book', '🎓': 'book', '🧠': 'memory', '🧩': 'puzzle', '🎯': 'tune', '🎷': 'prog', '🎺': 'prog', '🔥': 'fire', '📅': 'calendar', '🗓': 'calendar', '⚔': 'duel', '👻': 'ghost',
  '🎛': 'eq', '🎚': 'mixer', '🛣': 'rhythm', '🕊': 'sing', '🕵': 'prog', '🏆': 'trophy', '🥇': 'trophy', '🏅': 'trophy', '🎖': 'trophy', '👑': 'trophy', '⭐': 'star', '🌟': 'star', '✨': 'star', '★': 'star',
  '🔑': 'theory', '♯': 'theory', '♭': 'theory', '📏': 'scales', '🪜': 'scales', '📈': 'scales', '🧭': 'tune', '🗺': 'contour', '⚡': 'tempo', '🏁': 'trophy', '🤝': 'person', '👥': 'person', '🧘': 'drone', '⏱': 'slow',
};
export function glyphForEmoji(e: string | null | undefined): GlyphKind {
  if (!e) return 'contour';
  for (const ch of Array.from(e)) if (EMOJI[ch]) return EMOJI[ch];
  return EMOJI[e] ?? 'contour';
}


/** A symbol inside a tilted note head. `shadow` adds the hard offset shadow used for big, tappable ones. */
export function Glyph({ kind, color = DOMAIN_COLOR.ear, size = 46, shadow = false, label }: { kind: GlyphKind; color?: string; size?: number; shadow?: boolean; label?: string }) {
  const h = Math.round(size * 0.78);
  return (
    <span className="glyph" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <svg width={size} height={h} viewBox="0 0 120 94">
        {shadow && <ellipse cx={55} cy={51} rx={50} ry={36} transform="rotate(-14 55 51)" fill={I} />}
        <ellipse cx={60} cy={46} rx={50} ry={36} transform="rotate(-14 60 46)" fill={color} stroke={I} strokeWidth={size < 70 ? 6 : 3.5} />
        <g transform="translate(60 46)">{GLYPHS[kind]}</g>
      </svg>
    </span>
  );
}
