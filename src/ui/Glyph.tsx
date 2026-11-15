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
  /** Tune-up (AUDIT-GAMES §1, its path step): a tuning peg on a string, with the turn arrow. */
  tuneup: (
    <>
      <path d="M-24 14H24" stroke={I} strokeWidth={2.4} />
      <path d="M-4 14V-2" {...sw} />
      <rect x={-12} y={-18} width={16} height={16} rx={4} fill="#FFFFFF" stroke={I} strokeWidth={3} />
      <path d="M10 -16 A14 14 0 0 1 12 4" {...sw} />
      <path d="M7 1 L12 5 L16 0" {...sw} />
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
  // BASS_NICHE_PLAN (P2): the standards ladder and extended techniques.
  /** Standards ladder: a set list — a page of tune lines, the top ones ticked. */
  setlist: (
    <g {...sw} strokeWidth={2.6} strokeLinejoin="round">
      <rect x={-18} y={-24} width={36} height={48} rx={3} />
      <path d="M-11 -12 L-7 -8 L-1 -16" />
      <path d="M3 -12 H12" />
      <path d="M-11 0 L-7 4 L-1 -4" />
      <path d="M3 0 H12" />
      <path d="M-10 12 H12" />
    </g>
  ),
  /** Extended techniques: a string with a harmonic node (diamond) above it. */
  harmonics: (
    <g {...sw} strokeWidth={2.8} strokeLinejoin="round">
      <path d="M-26 10 H26" />
      <path d="M0 -20 L9 -9 L0 2 L-9 -9 Z" fill={I} />
      <path d="M-26 10 Q-13 2 0 10 T26 10" strokeWidth={2} />
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
  /** GUITAR_DEEPENING: the guitarist's ear — an ear over three strings. */
  guitarear: (
    <g {...sw}>
      <path d="M-9 -6 C-9 -20 11 -22 12 -8 C13 0 5 2 4 8" strokeWidth={2.8} />
      <path d="M-3 -7 C-3 -13 6 -13 6 -7" strokeWidth={2.4} />
      <path d="M-22 13H22M-22 18H22M-22 23H22" strokeWidth={1.8} />
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
  /** Licks: a short swung line over a chord, with the "12 keys" ring behind it. */
  lick: (
    <>
      <circle cx={0} cy={0} r={24} fill="none" stroke={I} strokeWidth={2} strokeDasharray="3 5" />
      {head(-14, 8, 4.8, 3.4)}
      {head(-3, -2, 4.8, 3.4)}
      {head(9, 4, 4.8, 3.4)}
      <path d="M-10 7V-14M1 -3V-20M13 3V-16" {...sw} strokeWidth={2.4} />
      <path d="M-10 -14L1 -20M1 -20L13 -16" stroke={I} strokeWidth={4.5} />
    </>
  ),
  /** Transcription: an ear above a note being written down. */
  transcribe: (
    <>
      <path d="M-18 -6 C-18 -22 4 -24 6 -10 C7 -2 -2 0 -2 8 C-2 14 -9 16 -12 12" {...sw} strokeWidth={2.8} />
      <path d="M-26 18H26M-26 24H26" stroke={I} strokeWidth={1.6} />
      {head(16, 14, 5, 3.6)}
      <path d="M20.5 13V-6" {...sw} strokeWidth={2.4} />
    </>
  ),
  /** Voice leading (AUDIT-CONTENT-THEORY §ה.2): three voices stepping from one chord to the next, one held. */
  voicelead: (
    <>
      {head(-16, 14, 5, 3.6)}
      {head(-16, 2, 5, 3.6)}
      {head(-16, -10, 5, 3.6)}
      {head(16, 10, 5, 3.6)}
      {head(16, 2, 5, 3.6)}
      {head(16, -14, 5, 3.6)}
      <path d="M-9 13 L9 10.5 M-9 2 H9 M-9 -11 L9 -13.5" {...sw} strokeWidth={2.2} />
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
  // VOICE_CURRICULUM: the voice course's own families.
  /** Breath & sustain: three air streams, the middle one longest (one long breath). */
  breath: (
    <g {...sw}>
      <path d="M-24 -10 Q-6 -16 10 -10" />
      <path d="M-24 0 Q2 -6 24 0" strokeWidth={3.6} />
      <path d="M-24 10 Q-6 4 10 10" />
    </g>
  ),
  /** Songs with the band: a microphone on its stand. */
  mic: (
    <g {...sw}>
      <rect x={-6} y={-22} width={12} height={20} rx={6} fill={I} />
      <path d="M-12 -8 Q-12 8 0 8 Q12 8 12 -8" />
      <path d="M0 8V20M-9 20H9" />
    </g>
  ),
};
// 0.70: the advanced games (GAMES_TIERS_PLAN §4) and the game board, one symbol each.
Object.assign(GLYPHS, {
  // a spread voicing: the second note from the top dropped an octave
  voicingspy: (
    <>
      {head(-8, 15, 6, 4.4)}
      {head(4, -1, 6, 4.4)}
      {head(4, -11, 6, 4.4)}
      {head(4, -21, 6, 4.4)}
      <path d="M-2 15 V-1" stroke={I} strokeWidth={2} strokeDasharray="3 3" />
    </>
  ),
  // one chord, an arrow, another chord
  reharm: (
    <>
      {head(-16, 8, 5.5, 4)}
      {head(-16, -2, 5.5, 4)}
      {head(16, 4, 5.5, 4)}
      {head(16, -6, 5.5, 4)}
      <path d="M-7 2 H6 M2 -3 L7 2 L2 7" {...sw} strokeWidth={2.8} strokeLinejoin="round" />
    </>
  ),
  standard: (
    <>
      <rect x={-20} y={-20} width={40} height={40} rx={3} {...sw} strokeWidth={2.6} />
      <text x={0} y={7} textAnchor="middle" fontFamily="'Secular One', Rubik, sans-serif" fontSize={19} fill={I} direction="ltr">
        Δ7
      </text>
    </>
  ),
  scalerush: (
    <>
      {head(-14, 14, 5, 3.8)}
      {head(-4, 6, 5, 3.8)}
      {head(6, -2, 5, 3.8)}
      {head(16, -10, 5, 3.8)}
      <path d="M-26 -14 H-14 M-28 -6 H-18" {...sw} strokeWidth={2.4} />
    </>
  ),
  transcribe: (
    <>
      <path d="M-26 -6H22M-26 2H22M-26 10H22" stroke={I} strokeWidth={1.6} />
      {head(-14, 6, 5, 3.8)}
      <path d="M2 18 L22 -18 L26 -14 L6 20 Z" {...sw} strokeWidth={2.6} strokeLinejoin="round" />
    </>
  ),
  bhtime: (
    <text x={0} y={9} textAnchor="middle" fontFamily="'Secular One', Rubik, sans-serif" fontSize={26} fill={I} direction="ltr">
      6°
    </text>
  ),
  riff: (
    <text x={0} y={9} textAnchor="middle" fontFamily="'Secular One', Rubik, sans-serif" fontSize={24} fill={I} direction="ltr">
      7/8
    </text>
  ),
  polylock: (
    <>
      <circle cx={-18} cy={-9} r={4} fill={I} />
      <circle cx={0} cy={-9} r={4} fill={I} />
      <circle cx={18} cy={-9} r={4} fill={I} />
      <circle cx={-18} cy={11} r={4} fill={I} />
      <circle cx={9} cy={11} r={4} fill={I} />
      <path d="M-26 1 H26" stroke={I} strokeWidth={1.6} />
    </>
  ),
  board: (
    <g {...sw} strokeWidth={2.8} strokeLinejoin="round">
      <path d="M-24 18 V2 H-8 V18 M-8 18 V-12 H8 V18 M8 18 V-2 H24 V18 Z" />
    </g>
  ),
} satisfies Record<string, ReactNode>);
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
// Drum games P1 (DRUMS_NICHE_PLAN §3): Land It (a crash over an arrow down to the 1), Groove Echo (two bars, the second
// an echo), Odd-meter Echo (its grouping as a mark).
Object.assign(GLYPHS, {
  landit: (
    <g {...sw}>
      <path d="M-20 -14 Q0 -24 20 -14 Q0 -8 -20 -14Z" strokeLinejoin="round" />
      <path d="M0 -6V14M-7 7l7 7 7-7" strokeLinejoin="round" />
      <text x={14} y={20} fontFamily="'Secular One', Rubik, sans-serif" fontSize={14} fill={I} stroke="none" direction="ltr">1</text>
    </g>
  ),
  grooveecho: (
    <g {...sw} strokeWidth={2.8}>
      <path d="M-24 4h18M2 4h18" />
      <path d="M-20 4v-12M-12 4v-12M6 4v-12M14 4v-12" strokeWidth={2.2} />
      <path d="M-8 16 Q4 24 18 14M14 10l4 4-5 3" strokeLinejoin="round" />
    </g>
  ),
  oddecho: mark('2+3'),
  // DRUMS P2 games: Time Lock (a click wave, then a gap, then the click back), Ghost Control (three heads, small to large).
  timelock: (
    <g {...sw} strokeWidth={2.6}>
      <path d="M-24 6v-12M-16 6v-12" />
      <path d="M-8 0h16" strokeDasharray="3 4" />
      <path d="M16 6v-12M24 6v-12" />
      <path d="M-24 16h48" strokeWidth={2} />
    </g>
  ),
  ghostctl: (
    <g {...sw} strokeWidth={2.4}>
      <circle cx={-16} cy={6} r={3.5} />
      <circle cx={0} cy={2} r={6} />
      <circle cx={18} cy={-4} r={9} fill={I} />
    </g>
  ),
});
// DRUMS P2: Rudiment Rush (two sticks crossed over a rising tempo line), Groove-off (two bars facing, a "vs" gap).
Object.assign(GLYPHS, {
  rudrush: (
    <g {...sw} strokeWidth={2.6}>
      <path d="M-20 -16L8 12M20 -16L-8 12" />
      <path d="M-24 20h12l8 -6h10l8 -6h10" strokeWidth={2} strokeLinejoin="round" />
    </g>
  ),
  grooveoff: (
    <g {...sw} strokeWidth={2.6}>
      <path d="M-26 -6h18M-26 6h18M-22 -6v12M-14 -6v12" />
      <path d="M8 -6h18M8 6h18M12 -6v12M20 -6v12" />
      <path d="M-2 -14v28" strokeDasharray="3 4" strokeWidth={2} />
    </g>
  ),
});
// Drums niche families (DRUMS_NICHE_PLAN P1): songs (the road map — section blocks, one lit), prog (7/8), counting
// ("1 & a"), the drum key (a staff with an x head over a round one), song form (D.S.).
Object.assign(GLYPHS, {
  roadmap: (
    <g {...sw} strokeWidth={2.6}>
      <rect x={-24} y={-8} width={13} height={16} rx={2} />
      <rect x={-7} y={-8} width={13} height={16} rx={2} fill={I} />
      <rect x={10} y={-8} width={13} height={16} rx={2} />
      <path d="M-17 16h34M11 12l6 4-6 4" strokeLinejoin="round" />
    </g>
  ),
  progmeter: mark('7/8'),
  counting: mark('1&a'),
  drumkey: (
    <g {...sw} strokeWidth={2.2}>
      <path d="M-24 -12h48M-24 -4h48M-24 4h48M-24 12h48" />
      <path d="M-14 -20l8 8M-6 -20l-8 8" strokeWidth={3} />
      <ellipse cx={8} cy={0} rx={6} ry={4.4} transform="rotate(-20 8 0)" fill={I} />
      <ellipse cx={-4} cy={16} rx={6} ry={4.4} transform="rotate(-20 -4 16)" fill={I} />
    </g>
  ),
  dsform: mark('D.S.'),
});
// AUDIT-CONTENT-THEORY R-1/R-2/R-4: rhythm & meter on the keys (5:4), meter & cross-rhythm on the guitar (3:2).
Object.assign(GLYPHS, { krhythm: mark('5:4'), gmeter: mark('3:2') });
// THEORY_PLAY: theory you play (k-theory) — two triads stacked, a whole step apart (a triad pair).
Object.assign(GLYPHS, {
  tpair: (
    <g {...sw} strokeWidth={2.6} strokeLinejoin="round">
      <path d="M-22 18 L-6 -10 L10 18 Z" />
      <path d="M-8 4 L8 -24 L24 4 Z" />
    </g>
  ),
  /** The same on the neck (g-theory): two triads over three strings. */
  gtpair: (
    <g {...sw} strokeWidth={2.4} strokeLinejoin="round">
      <path d="M-26 22 H26 M-26 10 H26 M-26 -2 H26" strokeWidth={1.4} />
      <path d="M-20 22 L-10 -2 L0 22 Z" />
      <path d="M0 10 L10 -20 L20 10 Z" />
    </g>
  ),
});
// AUDIT-GAPS-2: bebop vocabulary — a target note head enclosed by a note above and a note below (keys); the same over
// strings (guitar) and over the bass's two low strings (bass).
const encl = (
  <>
    {head(-16, -13, 4.6, 3.3)}
    {head(-16, 13, 4.6, 3.3)}
    {head(12, 0, 7, 5)}
    <path d="M-10 -10 L4 -3 M-10 10 L4 3" {...sw} strokeWidth={2.4} />
  </>
);
Object.assign(GLYPHS, {
  enclose: encl,
  genclose: (
    <>
      <path d="M-26 -16 H26 M-26 -5 H26 M-26 6 H26 M-26 17 H26" stroke={I} strokeWidth={1.3} />
      {encl}
    </>
  ),
  benclose: (
    <>
      <path d="M-26 -20 H26 M-26 20 H26" stroke={I} strokeWidth={3} />
      {encl}
    </>
  ),
});
// Phrases by ear: an ear with a rising line of note heads coming out of it (keys); the same over strings (guitar) and
// over the bass's two low strings (bass).
const phr = (
  <>
    <path d="M-24 4 C-24 -12 -16 -20 -8 -20 C0 -20 4 -13 4 -7 C4 1 -4 3 -4 11" {...sw} strokeWidth={3} />
    <path d="M-15 -6 C-15 -11 -9 -12 -8 -7" {...sw} strokeWidth={2.4} />
    {head(8, 12, 4.4, 3.2)}
    {head(15, 1, 4.4, 3.2)}
    {head(22, -10, 4.4, 3.2)}
  </>
);
Object.assign(GLYPHS, {
  phrase: phr,
  gphrase: (
    <>
      <path d="M-26 20 H26 M-26 25 H26" stroke={I} strokeWidth={1.3} />
      {phr}
    </>
  ),
  bphrase: (
    <>
      <path d="M-26 -24 H26 M-26 22 H26" stroke={I} strokeWidth={3} />
      {phr}
    </>
  ),
});
// Barry Harris lines (harrisLineDrills.ts): a falling line of note heads on beat ticks, a small chromatic head between
// (chord tones on the beats); over strings on the guitar, over the bass's two low strings on the bass.
const bhl = (
  <>
    <path d="M-24 22 V16 M-6 22 V16 M12 22 V16" stroke={I} strokeWidth={2.2} />
    {head(-20, -14, 5, 3.6)}
    {head(-2, -3, 5, 3.6)}
    {head(7, 3, 3, 2.2)}
    {head(16, 9, 5, 3.6)}
    <path d="M-15 -11 L-7 -6 M3 0 L11 6" {...sw} strokeWidth={2} />
  </>
);
Object.assign(GLYPHS, {
  bhline: bhl,
  gbhline: (
    <>
      <path d="M-26 -24 H26 M-26 -19 H26" stroke={I} strokeWidth={1.3} />
      {bhl}
    </>
  ),
  bbhline: (
    <>
      <path d="M-26 -24 H26" stroke={I} strokeWidth={3} />
      {bhl}
    </>
  ),
});
// HARMONY-REHARM (colorDrills.ts): one note, many chords — a held note on top (a tie across) over three different
// chords; chromatic mediants — two triads a 3rd apart joined at the common tone; organ comping — three drawbars over a
// walking line; the same on the neck (strings above) and the bass (its low string).
const ctg = (
  <>
    <path d="M-22 -18 H22" stroke={I} strokeWidth={2.4} />
    {head(-18, -22, 4.6, 3.3)}
    {head(0, -22, 4.6, 3.3)}
    {head(18, -22, 4.6, 3.3)}
    {head(-18, 2, 4.4, 3.1)}
    {head(-18, 12, 4.4, 3.1)}
    {head(0, -4, 4.4, 3.1)}
    {head(0, 8, 4.4, 3.1)}
    {head(18, 6, 4.4, 3.1)}
    {head(18, 18, 4.4, 3.1)}
  </>
);
Object.assign(GLYPHS, {
  ctone: ctg,
  gctone: (
    <>
      <path d="M-26 -27 H26 M-26 -23 H26" stroke={I} strokeWidth={1.2} />
      <g transform="translate(0 4)">{ctg}</g>
    </>
  ),
  mediant: (
    <>
      {head(-14, 14, 5, 3.6)}
      {head(-14, 4, 5, 3.6)}
      {head(-14, -6, 5, 3.6)}
      {head(14, 4, 5, 3.6)}
      {head(14, -6, 5, 3.6)}
      {head(14, -16, 5, 3.6)}
      <path d="M-8 -6 H8 M-8 4 H8" {...sw} strokeWidth={2} strokeDasharray="3 3" />
    </>
  ),
  gcolor: (
    <>
      <path d="M-26 -26 H26 M-26 -21 H26" stroke={I} strokeWidth={1.2} />
      {head(-14, 16, 5, 3.6)}
      {head(-14, 6, 5, 3.6)}
      {head(-14, -4, 5, 3.6)}
      {head(14, 6, 5, 3.6)}
      {head(14, -4, 5, 3.6)}
      {head(14, -14, 5, 3.6)}
      <path d="M-8 -4 H8 M-8 6 H8" {...sw} strokeWidth={2} strokeDasharray="3 3" />
    </>
  ),
  organ: (
    <>
      <path d="M-16 -24 V-2 M-4 -24 V-10 M8 -24 V-6" {...sw} strokeWidth={4} />
      <rect x="-20" y="-4" width="8" height="5" rx="1.5" fill={I} />
      <rect x="-8" y="-12" width="8" height="5" rx="1.5" fill={I} />
      <rect x="4" y="-8" width="8" height="5" rx="1.5" fill={I} />
      <path d="M-22 22 L-8 14 L6 18 L20 10" {...sw} strokeWidth={2.4} />
    </>
  ),
  bcounter: (
    <>
      <path d="M-26 -26 H26" stroke={I} strokeWidth={3} />
      {head(-18, -14, 4.6, 3.3)}
      {head(18, -14, 4.6, 3.3)}
      <path d="M-13 -14 H13" stroke={I} strokeWidth={2} />
      {head(-18, 4, 4.6, 3.3)}
      {head(-6, 8, 4.6, 3.3)}
      {head(6, 12, 4.6, 3.3)}
      {head(18, 16, 4.6, 3.3)}
    </>
  ),
});
// PIANO_JAZZ P2 path wiring: a repertoire step (a lead sheet with a bookmark), the Transcription Race as a bonus step
// (a staff with a stopwatch — the transcription coach keeps its pencil) and the Reharm Spotter as a bonus step (a chord,
// a magnifier on the changed one — the k-reharm family keeps its chord-to-chord arrow).
Object.assign(GLYPHS, {
  repstep: (
    <g {...sw} strokeWidth={2.6} strokeLinejoin="round">
      <path d="M-16 -22 H16 V22 H-16 Z" />
      <path d="M-10 -12 H10 M-10 -4 H10 M-10 4 H4" strokeWidth={2} />
      <path d="M6 22 V10 L10 14 L14 10 V22" fill={I} />
    </g>
  ),
  txrace: (
    <>
      <path d="M-26 -2H4M-26 6H4M-26 14H4" stroke={I} strokeWidth={1.6} />
      {head(-14, 10, 5, 3.8)}
      <circle cx={14} cy={-6} r={11} {...sw} strokeWidth={2.6} />
      <path d="M14 -6 V-12 M14 -6 L19 -2 M11 -21 H17" {...sw} strokeWidth={2.4} />
    </>
  ),
  reharmspot: (
    <>
      {head(-16, 10, 5.5, 4)}
      {head(-16, 0, 5.5, 4)}
      {head(4, 4, 5.5, 4)}
      {head(4, -6, 5.5, 4)}
      <circle cx={4} cy={-1} r={12} {...sw} strokeWidth={2.4} />
      <path d="M13 8 L22 17" {...sw} strokeWidth={3.4} />
    </>
  ),
});
// GUITAR_DEEPENING: the song's chords, strummed — a melody line above, a three-note chord with a down-strum arrow.
Object.assign(GLYPHS, {
  songstrum: (
    <>
      <path d="M-24 -14 L-14 -20 L-4 -12 L6 -18" {...sw} strokeWidth={2.6} strokeLinejoin="round" />
      {head(-8, 16, 5.5, 4)}
      {head(-8, 7, 5.5, 4)}
      {head(-8, -2, 5.5, 4)}
      <path d="M14 -6 V18 M8 12 L14 18 L20 12" {...sw} strokeWidth={2.8} strokeLinejoin="round" />
    </>
  ),
});
// 0.76 instrument / voice / drum games: Play It Back (three heads, an arrow down to two keys), Voicing Sprint (a
// four-note stack with speed lines), Chord Change Race (two chord boxes and an arrow on a beat tick), Walk the Changes
// (four quarter notes stepping up), Roots by Ear (a chord, its lowest head ringed), Harmony Hold (a held line over two
// different chords), Sing the Interval Sprint (two heads, an up arrow, a sound arc), Kit Read Rush (x heads on a staff
// with speed lines), Name That Groove (a hi-hat row under a big question mark).
Object.assign(GLYPHS, {
  playback: (
    <>
      {head(-18, -12, 4.6, 3.4)}
      {head(-6, -16, 4.6, 3.4)}
      {head(6, -10, 4.6, 3.4)}
      <path d="M16 -14 Q24 -4 14 4 M10 0 l4 4 4 -3" {...sw} strokeWidth={2.4} strokeLinejoin="round" />
      <g {...sw} strokeWidth={2.4} strokeLinejoin="round">
        <path d="M-24 6 H24 V22 H-24 Z M-8 6 V22 M8 6 V22" />
      </g>
      <rect x={-12} y={6} width={7} height={9} fill={I} />
      <rect x={4} y={6} width={7} height={9} fill={I} />
    </>
  ),
  vsprint: (
    <>
      {head(8, 16, 5.2, 3.8)}
      {head(8, 7, 5.2, 3.8)}
      {head(8, -2, 5.2, 3.8)}
      {head(8, -11, 5.2, 3.8)}
      <path d="M14 16 V-20" stroke={I} strokeWidth={2.4} />
      <path d="M-26 -8 H-10 M-28 2 H-12 M-26 12 H-10" {...sw} strokeWidth={2.4} />
    </>
  ),
  changerace: (
    <g {...sw} strokeWidth={2.2} strokeLinejoin="round">
      <path d="M-26 -16 H-10 V4 H-26 Z M-26 -9 H-10 M-26 -2 H-10 M-21 -16 V4 M-15 -16 V4" />
      <path d="M10 -16 H26 V4 H10 Z M10 -9 H26 M10 -2 H26 M15 -16 V4 M21 -16 V4" />
      <path d="M-6 -6 H5 M1 -10 l4 4 -4 4" strokeWidth={2.6} />
      <path d="M-26 18 H26 M-18 13 V23 M18 13 V23" strokeWidth={2.4} />
    </g>
  ),
  walkchanges: (
    <>
      {head(-20, 14, 5, 3.6)}
      {head(-7, 7, 5, 3.6)}
      {head(6, 0, 5, 3.6)}
      {head(19, -7, 5, 3.6)}
      <path d="M-15 14 V-8 M-2 7 V-15 M11 0 V-22 M24 -7 V-26" stroke={I} strokeWidth={2.2} />
      <path d="M-26 22 H26" {...sw} strokeWidth={2} />
    </>
  ),
  rootsear: (
    <>
      {head(-6, -14, 5.2, 3.8)}
      {head(-6, -4, 5.2, 3.8)}
      {head(-6, 8, 5.6, 4.2)}
      <circle cx={-6} cy={8} r={10} {...sw} strokeWidth={2.4} />
      <path d="M12 -18 Q22 -6 12 6" {...sw} strokeWidth={2.4} />
      <path d="M18 -22 Q32 -6 18 10" {...sw} strokeWidth={2} />
    </>
  ),
  harmonyhold: (
    <>
      <path d="M-26 -18 H26" {...sw} strokeWidth={3.6} />
      {head(-16, 16, 5, 3.6)}
      {head(-16, 6, 5, 3.6)}
      {head(-16, -4, 5, 3.6)}
      {head(14, 12, 5, 3.6)}
      {head(14, 2, 5, 3.6)}
      {head(14, -8, 5, 3.6)}
      <path d="M-4 4 H4" {...sw} strokeWidth={2.2} />
    </>
  ),
  singinterval: (
    <>
      {head(-16, 14, 5.6, 4.2)}
      {head(-16, -12, 5.6, 4.2)}
      <path d="M-4 12 V-10 M-9 -5 L-4 -10 L1 -5" {...sw} strokeWidth={2.6} strokeLinejoin="round" />
      <path d="M8 -10 Q16 0 8 10" {...sw} strokeWidth={2.4} />
      <path d="M15 -16 Q27 0 15 16" {...sw} strokeWidth={2} />
    </>
  ),
  kitread: (
    <g {...sw} strokeWidth={1.8}>
      <path d="M-14 -12 H26 M-14 -4 H26 M-14 4 H26 M-14 12 H26" />
      <path d="M-6 -20 l6 6 M0 -20 l-6 6 M10 -20 l6 6 M16 -20 l-6 6" strokeWidth={2.6} />
      <ellipse cx={4} cy={0} rx={5} ry={3.6} transform="rotate(-20 4 0)" fill={I} stroke="none" />
      <ellipse cx={18} cy={16} rx={5} ry={3.6} transform="rotate(-20 18 16)" fill={I} stroke="none" />
      <path d="M-28 -8 H-20 M-30 0 H-20 M-28 8 H-20" strokeWidth={2.4} />
    </g>
  ),
  namegroove: (
    <g {...sw} strokeWidth={2.6}>
      <path d="M-8 -14 Q-8 -24 2 -24 Q12 -24 12 -16 Q12 -9 2 -6 V0" strokeLinejoin="round" />
      <circle cx={2} cy={6} r={2} fill={I} stroke="none" />
      <path d="M-24 14 l5 5 M-19 14 l-5 5 M-10 14 l5 5 M-5 14 l-5 5 M4 14 l5 5 M9 14 l-5 5 M18 14 l5 5 M23 14 l-5 5" strokeWidth={2.2} />
    </g>
  ),
});
// AUDIT-GAPS-2: key changes — one note head carried to another key along an arc (piano), over strings (guitar), over
// the bass's thick strings (bass).
const keyArc = (
  <>
    {head(-15, 13, 6, 4.4)}
    {head(15, 5, 6, 4.4)}
    <path d="M-16 3 C-13 -17 11 -20 15 -5" {...sw} strokeWidth={2.6} />
    <path d="M9 -10 L15 -4 L20 -11" {...sw} strokeWidth={2.6} strokeLinejoin="round" />
  </>
);
Object.assign(GLYPHS, {
  keymove: keyArc,
  gkeymove: (
    <>
      {keyArc}
      <path d="M-26 20 H26 M-26 24 H26" stroke={I} strokeWidth={1.4} />
    </>
  ),
  bkeymove: (
    <>
      {keyArc}
      <path d="M-26 21 H26" stroke={I} strokeWidth={3.2} />
    </>
  ),
  // AUDIT-SCALES (owner 2026-11-14)
  /** Hand independence: a held whole note above, a running figure below — two hands, two rhythms. */
  indep: (
    <>
      <ellipse cx={-10} cy={-12} rx={7} ry={4.6} fill="none" stroke={I} strokeWidth={2.6} transform="rotate(-20 -10 -12)" />
      <path d="M-4 -12 H24" stroke={I} strokeWidth={2.4} strokeDasharray="4 3" />
      {head(-18, 16, 4.2, 3)}
      {head(-6, 12, 4.2, 3)}
      {head(6, 16, 4.2, 3)}
      {head(18, 12, 4.2, 3)}
      <path d="M-14.5 15V2M-2.5 11V-2M9.5 15V2M21.5 11V-2" {...sw} strokeWidth={2.2} />
      <path d="M-14.5 2L-2.5 -2M9.5 2L21.5 -2" stroke={I} strokeWidth={3.6} />
    </>
  ),
  /** The harmonization ladder: stacked 3rds climbing a step at a time, a chord on every degree. */
  harmlad: (
    <>
      {head(-16, 18, 4.4, 3.2)}
      {head(-16, 9, 4.4, 3.2)}
      {head(-16, 0, 4.4, 3.2)}
      {head(0, 13, 4.4, 3.2)}
      {head(0, 4, 4.4, 3.2)}
      {head(0, -5, 4.4, 3.2)}
      {head(16, 8, 4.4, 3.2)}
      {head(16, -1, 4.4, 3.2)}
      {head(16, -10, 4.4, 3.2)}
      <path d="M-24 -18 L24 -26" {...sw} strokeWidth={2.2} />
    </>
  ),
  /** The ladder on the neck: four strings, a voicing climbing across them. */
  gharmlad: (
    <>
      <path d="M-26 -15 H26 M-26 -5 H26 M-26 5 H26 M-26 15 H26" stroke={I} strokeWidth={1.6} />
      <circle cx={-16} cy={15} r={3.6} fill={I} />
      <circle cx={-12} cy={5} r={3.6} fill={I} />
      <circle cx={-16} cy={-5} r={3.6} fill={I} />
      <circle cx={10} cy={5} r={3.6} fill={I} />
      <circle cx={14} cy={-5} r={3.6} fill={I} />
      <circle cx={10} cy={-15} r={3.6} fill={I} />
      <path d="M-6 -20 L4 -24" {...sw} strokeWidth={2.4} />
    </>
  ),
});
// AUDIT-DEPTH-3: heads — a melody note on top of a stacked chord (harmonise; over strings: chord-melody), and a lead
// sheet's bars with comping slashes (comp a head; over strings on the guitar, a thick string on the bass).
const harmStack = (
  <>
    {head(-4, 14, 6, 4.4)}
    {head(-4, 5, 6, 4.4)}
    {head(-4, -4, 6, 4.4)}
    {head(-4, -15, 7, 5)}
    <path d="M3 -15 V-34" {...sw} strokeWidth={2.6} />
    <path d="M-26 -15 H-12 M5 -15 H26" {...sw} strokeWidth={1.8} strokeDasharray="3 3" />
  </>
);
const leadSheet = (
  <>
    <path d="M-24 -16 V10 M0 -16 V10 M24 -16 V10" {...sw} strokeWidth={2.4} />
    <path d="M-18 6 L-12 -10 M-10 6 L-4 -10 M6 6 L12 -10 M14 6 L20 -10" {...sw} strokeWidth={3} strokeLinecap="round" />
  </>
);
Object.assign(GLYPHS, {
  harmmel: harmStack,
  chordmel: (
    <>
      {harmStack}
      <path d="M-26 22 H26 M-26 26 H26" stroke={I} strokeWidth={1.4} />
    </>
  ),
  tunecomp: leadSheet,
  gtunecomp: (
    <>
      {leadSheet}
      <path d="M-26 18 H26 M-26 23 H26" stroke={I} strokeWidth={1.4} />
    </>
  ),
  btunecomp: (
    <>
      {leadSheet}
      <path d="M-26 20 H26" stroke={I} strokeWidth={3.2} />
    </>
  ),
});
// AUDIT-DEPTH-3: improvising under rule cards — a free line rising out of a rule card (piano); over strings (guitar),
// over the bass's thick strings (bass). Jazz in context — the four brothers a minor 3rd apart around the one tonic.
const soloArt = (
  <>
    <rect x={-25} y={-4} width={16} height={22} rx={2.5} {...sw} strokeWidth={2.4} />
    <path d="M-21 3 H-13 M-21 9 H-13" {...sw} strokeWidth={2} />
    <path d="M-6 12 C0 -2 4 10 10 -4 C13 -11 17 -9 20 -16" {...sw} strokeWidth={2.6} />
    {head(19, -16, 5, 3.6)}
  </>
);
const brothersArt = (
  <>
    {head(0, -17, 4.6, 3.3)}
    {head(19, 0, 4.6, 3.3)}
    {head(0, 17, 4.6, 3.3)}
    {head(-19, 0, 4.6, 3.3)}
    <circle cx={0} cy={0} r={5.5} fill={I} />
    <path d="M0 -11 V-6 M13 0 H6 M0 11 V6 M-13 0 H-6" {...sw} strokeWidth={2.2} />
  </>
);
Object.assign(GLYPHS, {
  solo: soloArt,
  gsolo: (
    <>
      {soloArt}
      <path d="M-26 22 H26 M-26 26 H26" stroke={I} strokeWidth={1.4} />
    </>
  ),
  bsolo: (
    <>
      {soloArt}
      <path d="M-26 24 H26" stroke={I} strokeWidth={3.2} />
    </>
  ),
  brothers: brothersArt,
  gbrothers: (
    <>
      {brothersArt}
      <path d="M-26 24 H26 M-26 28 H26" stroke={I} strokeWidth={1.4} />
    </>
  ),
  bbrothers: (
    <>
      {brothersArt}
      <path d="M-26 26 H26" stroke={I} strokeWidth={3.2} />
    </>
  ),
});
// Solo jazz piano after Jeremy Siskind (soloPianoDrills.ts): k-lh — a low bass note under a two-note shell; k-tex —
// three mangos (bass, chords, melody) over two hands; k-comp — a short chord on the "and" after a rest; k-impro —
// phrases with rests between them (the MTNA phrasing rubric).
Object.assign(GLYPHS, {
  lhshell: (
    <>
      {head(-14, 18, 6.5, 4.6)}
      {head(8, -2, 5.5, 4)}
      {head(8, -14, 5.5, 4)}
      <path d="M-8 16 V-20 M14 -4 V-26" {...sw} strokeWidth={2.6} />
      <path d="M-24 8 H26" stroke={I} strokeWidth={1.4} />
    </>
  ),
  mango: (
    <>
      <circle cx={-14} cy={-12} r={7} fill="none" stroke={I} strokeWidth={3} />
      <circle cx={2} cy={-18} r={7} fill="none" stroke={I} strokeWidth={3} />
      <circle cx={18} cy={-10} r={7} fill="none" stroke={I} strokeWidth={3} />
      <path d="M-22 16 Q-12 6 -2 16 M4 16 Q14 6 24 16" {...sw} strokeWidth={3} />
    </>
  ),
  compvoc: (
    <>
      <path d="M-24 4 L-18 -8 L-12 4 L-18 16 Z" fill={I} />
      {head(6, 10, 5.5, 4)}
      {head(6, 1, 5.5, 4)}
      {head(6, -8, 5.5, 4)}
      <path d="M12 8 V-24 L22 -16" {...sw} strokeWidth={2.6} />
    </>
  ),
  phrasing: (
    <>
      <path d="M-26 8 Q-18 -10 -8 6" {...sw} strokeWidth={3} />
      <path d="M-2 0 H4" stroke={I} strokeWidth={3} />
      <path d="M8 10 Q16 -14 26 2" {...sw} strokeWidth={3} />
      <path d="M-24 20 V14 M-6 20 V14 M12 20 V14" stroke={I} strokeWidth={2} />
    </>
  ),
});
// AUDIT-6 Stage B: the first steps on the guitar (a pick over one open string), the bass (a strap across four strings),
// the drums (a drum head under one stick), graded sight-reading at the piano (notes on a staff with a reading arrow)
// and riffs by grade (two power-chord dots and a riff line).
Object.assign(GLYPHS, {
  gfirst: (
    <>
      <path d="M-26 -4 H26" stroke={I} strokeWidth={1.6} />
      <path d="M0 18C-7 11-14 2-14-5c0-6 6-9 14-9s14 3 14 9C14 2 7 11 0 18z" {...sw} strokeLinejoin="round" />
    </>
  ),
  bfirst: (
    <>
      <path d="M-15 -24 V24 M-5 -24 V24 M5 -24 V24 M15 -24 V24" stroke={I} strokeWidth={1.6} />
      <path d="M-26 14 Q0 -22 26 14" {...sw} strokeWidth={4.4} />
    </>
  ),
  dfirst: (
    <>
      <ellipse cx={0} cy={10} rx={20} ry={7} fill="none" stroke={I} strokeWidth={3} />
      <path d="M-4 6 L18 -20" {...sw} />
      <circle cx={18} cy={-20} r={3} fill={I} />
    </>
  ),
  kread: (
    <>
      <path d="M-26 -10 H26 M-26 0 H26 M-26 10 H26" stroke={I} strokeWidth={1.4} />
      {head(-12, 5, 5.5, 4)}
      {head(4, -5, 5.5, 4)}
      <path d="M-24 20 H18 M12 15 L18 20 L12 25" {...sw} strokeWidth={2.6} />
    </>
  ),
  griff: (
    <>
      <path d="M-26 -12 H26 M-26 0 H26" stroke={I} strokeWidth={1.4} />
      <circle cx={-14} cy={0} r={4.4} fill={I} />
      <circle cx={-6} cy={-12} r={4.4} fill={I} />
      <path d="M2 16 Q8 4 14 16 T26 16" {...sw} strokeWidth={2.8} />
      <path d="M-24 16 H-2" stroke={I} strokeWidth={2.8} strokeLinecap="round" />
    </>
  ),
});
// STAGE C (AUDIT-6): the advanced endings — a symbol for every new family and topic.
const strings3 = <path d="M-26 22 H26 M-26 10 H26 M-26 -2 H26" stroke={I} strokeWidth={1.4} />;
const sticks = (x: number) => <path d={`M${x - 12} 22 L${x + 8} -22`} {...sw} strokeWidth={3} />;
Object.assign(GLYPHS, {
  /** Speed technique: a run of 16ths under a speed streak. */
  gspeed: (
    <>
      {strings3}
      <path d="M-24 -14 H-6 M-20 -20 H0" stroke={I} strokeWidth={2.4} strokeLinecap="round" />
      {head(2, 10, 4.6, 3.3)}
      {head(12, 4, 4.6, 3.3)}
      {head(22, -2, 4.6, 3.3)}
    </>
  ),
  /** Fusion and outside: a line that steps out a half step and comes back. */
  gfusion: (
    <>
      {strings3}
      <path d="M-24 18 L-12 6 L-4 -14 L6 -14 L14 6 L24 -6" {...sw} strokeWidth={2.8} strokeLinejoin="round" />
    </>
  ),
  /** Chord-melody arranging: a melody note on top of a stacked chord, an arrow into a second one. */
  gcmarr: (
    <>
      {head(-14, 14, 5, 3.6)}
      {head(-14, 4, 5, 3.6)}
      {head(-12, -10, 6, 4.4)}
      <path d="M-4 0 H8 M4 -4 L8 0 L4 4" {...sw} strokeWidth={2.4} />
      {head(18, 12, 5, 3.6)}
      {head(18, 2, 5, 3.6)}
      {head(20, -14, 6, 4.4)}
    </>
  ),
  /** Solo jazz guitar: walking quarters low, a shell above on the "and". */
  gsolojazz: (
    <>
      {strings3}
      {head(-18, 18, 4.4, 3.2)}
      {head(-4, 14, 4.4, 3.2)}
      {head(10, 18, 4.4, 3.2)}
      {head(4, -12, 4.4, 3.2)}
      {head(4, -20, 4.4, 3.2)}
    </>
  ),
  /** Harris lines at tempo: the falling line with a speed streak. */
  ghlfast: (
    <>
      <path d="M-22 -16 L-10 -6 L-2 -10 L8 2 L20 18" {...sw} strokeWidth={2.8} strokeLinejoin="round" />
      <path d="M-26 6 H-14 M-24 14 H-10" stroke={I} strokeWidth={2.2} strokeLinecap="round" />
    </>
  ),
  /** PAS rudiments: two crossed sticks over a roll's tremolo slashes. */
  dpas: (
    <>
      {sticks(-6)}
      {sticks(10)}
      <path d="M-20 4 L-6 -2 M-20 12 L-6 6 M-20 20 L-6 14" stroke={I} strokeWidth={2.4} />
    </>
  ),
  dstick: mark('RLRR'),
  /** Syncopation, interpreted: a syncopated rhythm with an accent over the tie. */
  dsynco: (
    <>
      {head(-16, 12, 5, 3.6)}
      {head(4, 12, 5, 3.6)}
      {head(18, 12, 5, 3.6)}
      <path d="M-11 10 V-14 M9 10 V-14 M23 10 V-14 M9 -14 H23" {...sw} strokeWidth={2.4} />
      <path d="M-12 20 Q-4 26 4 20" {...sw} strokeWidth={2} />
      <path d="M-6 -22 L2 -18 L-6 -14" {...sw} strokeWidth={2} />
    </>
  ),
  /** Jazz independence: the ride's spang-a-lang over a moving snare note. */
  dchapin: (
    <>
      <path d="M-24 -16 H24" stroke={I} strokeWidth={1.6} />
      <path d="M-18 -22 L-14 -10 M-6 -22 L-2 -10 M2 -22 L6 -10 M14 -22 L18 -10" stroke={I} strokeWidth={2.4} />
      {head(-8, 12, 5.4, 3.8)}
      {head(12, 16, 5.4, 3.8)}
      <path d="M-2 8 L8 12" stroke={I} strokeWidth={2} strokeDasharray="2 3" />
    </>
  ),
  /** Linear funk: hat, snare, kick one after the other on three lines, never together. */
  dlinear: (
    <>
      <path d="M-26 -14 H26 M-26 2 H26 M-26 18 H26" stroke={I} strokeWidth={1.2} />
      <path d="M-20 -18 L-14 -10 M-14 -18 L-20 -10" stroke={I} strokeWidth={2.4} />
      {head(-4, 2, 4.6, 3.3)}
      {head(8, 18, 4.6, 3.3)}
      <path d="M16 -18 L22 -10 M22 -18 L16 -10" stroke={I} strokeWidth={2.4} />
    </>
  ),
  /** Brushes: a fan of wires and a circular sweep. */
  dbrush: (
    <>
      <path d="M-20 22 L-4 -2 M-20 22 L0 2 M-20 22 L-8 -6" {...sw} strokeWidth={2} />
      <path d="M6 -4 A12 9 0 1 1 6 14" {...sw} strokeWidth={2.6} />
      <path d="M2 10 L6 14 L10 10" {...sw} strokeWidth={2.2} />
    </>
  ),
  doddtempo: mark('7/8♩'),
  /** Soloing over a form: four bars of time, four bars free (trading). */
  dtrade: (
    <>
      <path d="M-26 -4 H26 M-26 10 H26" stroke={I} strokeWidth={1.4} />
      <path d="M-26 -10 V16 M0 -10 V16 M26 -10 V16" stroke={I} strokeWidth={2} />
      <path d="M-22 3 L-18 -1 M-14 3 L-10 -1 M-6 3 L-2 -1" stroke={I} strokeWidth={2.2} />
      <path d="M4 6 Q10 -12 14 4 T24 0" {...sw} strokeWidth={2.4} />
    </>
  ),
  /** Altered arpeggios: a stack of minor 3rds (the diminished seventh) climbing. */
  varp2: (
    <>
      {head(-16, 16, 4.6, 3.3)}
      {head(-5, 6, 4.6, 3.3)}
      {head(6, -4, 4.6, 3.3)}
      {head(17, -14, 4.6, 3.3)}
      <text x={-20} y={-10} fontSize={14} fontFamily="'Noto Music', sans-serif" fill={I}>°</text>
    </>
  ),
  /** Wide leaps: a low note and a high one, a long arc between. */
  vleaps: (
    <>
      {head(-16, 16, 6, 4.4)}
      {head(16, -16, 6, 4.4)}
      <path d="M-10 10 Q-6 -24 10 -18" {...sw} strokeWidth={2.6} />
    </>
  ),
  /** Advanced runs: a rising run of small notes into a long one. */
  vruns: (
    <>
      {head(-20, 14, 3.6, 2.6)}
      {head(-12, 8, 3.6, 2.6)}
      {head(-4, 2, 3.6, 2.6)}
      {head(4, -4, 3.6, 2.6)}
      {head(16, -12, 6.4, 4.6)}
      <path d="M-22 22 Q-2 18 12 -4" stroke={I} strokeWidth={1.6} fill="none" />
    </>
  ),
  vquick: mark('4+4+4'),
  /** One part from the score: two staves, the lower one sung (a mouth arc). */
  vpart: (
    <>
      <path d="M-26 -16 H26 M-26 -8 H26 M-26 8 H26 M-26 16 H26" stroke={I} strokeWidth={1.2} />
      {head(-10, -12, 4.6, 3.3)}
      {head(8, -16, 4.6, 3.3)}
      {head(-4, 12, 4.6, 3.3)}
      <path d="M14 10 Q20 22 26 10" {...sw} strokeWidth={2.4} />
    </>
  ),
  vstyle: mark('R&B'),
  vscat2: mark('I6–V'),
  /** Top of the range: a note above the highest line, an arrow up to a ceiling. */
  vtop: (
    <>
      <path d="M-24 -20 H24" stroke={I} strokeWidth={3} />
      <path d="M-24 16 H24 M-24 8 H24" stroke={I} strokeWidth={1.2} />
      {head(-6, -10, 6, 4.4)}
      <path d="M14 18 V-12 M8 -6 L14 -12 L20 -6" {...sw} strokeWidth={2.6} />
    </>
  ),
  /** Three voices, the lowest: three note heads stacked, the bottom one ringed. */
  threevoice: (
    <>
      {head(-4, -14, 5, 3.6)}
      {head(-4, 0, 5, 3.6)}
      {head(-4, 14, 5, 3.6)}
      <ellipse cx={-4} cy={14} rx={11} ry={8} {...sw} strokeWidth={2.2} />
      <path d="M8 -18 V12" {...sw} strokeWidth={2.4} />
    </>
  ),
  onehear: mark('1×'),
  /** Describe the piece: a short score line with three ticked features. */
  features: (
    <>
      <path d="M-26 -14 H6 M-26 -4 H6" stroke={I} strokeWidth={1.4} />
      <text x={-24} y={16} fontSize={14} fontFamily="'Noto Music', serif" fontStyle="italic" fill={I}>p</text>
      <path d="M-12 12 H2 M-12 12 L-4 8 M-12 12 L-4 16" stroke={I} strokeWidth={1.8} fill="none" />
      <path d="M12 -12 L16 -8 L24 -18 M12 2 L16 6 L24 -4 M12 16 L16 20 L24 10" {...sw} strokeWidth={2.4} />
    </>
  ),
});
// AUDIT-GAMES §4.2 new games: one drawn symbol each.
Object.assign(GLYPHS, {
  // Guide-Tone Runner: a 7th falling to the next 3rd over a beat line with ticks.
  guidetone: (
    <>
      {head(-13, -9, 5.6, 4.2)}
      {head(9, -1, 5.6, 4.2)}
      <path d="M-6 -7 L3 -3" {...sw} strokeWidth={2.4} />
      <path d="M-26 16 H26" {...sw} strokeWidth={2.6} />
      <path d="M-20 11 V21 M-4 11 V21 M12 11 V21" {...sw} strokeWidth={2} />
    </>
  ),
  // 5-4-3-2 Call: four heads stepping down, a call mark before them.
  call5432: (
    <>
      <path d="M-28 -18 Q-22 -10 -28 -2" {...sw} strokeWidth={2.2} />
      {head(-14, -14, 4.8, 3.6)}
      {head(-3, -5, 4.8, 3.6)}
      {head(8, 4, 4.8, 3.6)}
      {head(19, 13, 4.8, 3.6)}
      <path d="M-9 -15 V-26" {...sw} strokeWidth={2} />
    </>
  ),
  // Enclosure Target: a head inside a ring, approached from above and below.
  enclosure: (
    <>
      <circle cx={8} cy={0} r={11} {...sw} strokeWidth={2.4} />
      {head(8, 0, 5.2, 3.8)}
      {head(-18, -12, 4.2, 3.2)}
      {head(-18, 12, 4.2, 3.2)}
      <path d="M-12 -9 L-4 -4 M-12 9 L-4 4" {...sw} strokeWidth={2.2} />
    </>
  ),
  // Changes Crossword: a 4 × 2 grid with two filled squares.
  crossword: (
    <g {...sw} strokeWidth={2.2}>
      <path d="M-26 -16 H26 V16 H-26 Z M-13 -16 V16 M0 -16 V16 M13 -16 V16 M-26 0 H26" />
      <rect x={-26} y={-16} width={13} height={16} fill={I} stroke="none" />
      <rect x={0} y={0} width={13} height={16} fill={I} stroke="none" />
    </g>
  ),
  // Hold the Note: one held head on a long line, three chord stacks moving under it.
  holdnote: (
    <>
      <path d="M-28 -12 H-9 M9 -12 H28" {...sw} strokeWidth={2.6} />
      {head(0, -12, 6.4, 4.6)}
      <path d="M-20 4 V18 M0 4 V18 M20 4 V18" {...sw} strokeWidth={2.2} />
      <path d="M-25 8 H-15 M-25 14 H-15 M-5 6 H5 M-5 12 H5 M-5 18 H5 M15 10 H25 M15 16 H25" {...sw} strokeWidth={2} />
    </>
  ),
});
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
  // Data that already names a glyph kind (badges, topic groups since 2026-11-12) passes straight through.
  if (GLYPHS[e]) return e;
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
