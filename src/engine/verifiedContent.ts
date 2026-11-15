// Hidden until verified (owner, 2026-11-15): "If there's a Barry Harris topic you're not sure about, don't put it in…
// By default, anything not 100% certain — leave it out." The same rule covers every named-method source (Barry Harris,
// Thomas Echols, Chris Parks, Jeremy Siskind, Larry Goldings) and our own unchecked transcriptions (the Latin drum
// patterns).
//
// ONE registry. Each CLAIM is one checkable fact (docs/THEORY-QUESTIONS.md has the exact question per claim) and lists
// the content it hides. To switch content on once the owner has confirmed it: add the claim id (or a single content id)
// to SWITCHED_ON below. Nothing is deleted — the code, the ids and the player's saved progress stay; hidden content is
// left out of every list (path, map, Drills, games, workout, key mastery, badges, level test, lessons, depth counts).
//
// Content ids (the strings in `hides`):
//   item:<kind>            every drill item of that kind, in any family (keys, guitar, bass; "g-harrisline>hl-chrom" too)
//   item:<kind>:<option>   one option of a kind
//   level:<level id>       a whole technique level ("d-latin-8")
//   vocal:<ref>            a vocal level (voiceFamilies refs, "vocal:309")
//   topic:<id>             a whole ear / theory topic;  topic:<id>:<level>  one level of it
//   lesson:<id>            a whole mini-lesson;  card:<id>  one lesson card (mini/*.ts gate their cards with `gated`)
//   game:<id>              a whole game (lists, path steps, bonus steps, badges, key mastery, workout rotation)
// A level whose items are all hidden disappears; a family whose levels are all hidden disappears.
//
// Pure: no imports from the engine (every catalogue imports this module).

export interface Claim {
  /** Stable id, named in docs/THEORY-QUESTIONS.md. */
  id: string;
  /** What we have and why it is not certain (one line, for the docs and the tests). */
  why: string;
  /** The content it hides. */
  hides: string[];
}

export const UNVERIFIED_CLAIMS: Claim[] = [
  // ───────────── Barry Harris lines (src/engine/harrisLines.ts, drills/harrisLineDrills.ts) ─────────────
  {
    id: 'bh-chromatic',
    why: "Barry's chromatic scale: the ascending notes are derived from the rule in secondary sources (Otto, Larsen); the descending form is the app's mirror (no source prints it).",
    hides: ['item:hl-chrom', 'topic:bh-line-ear:1', 'topic:bh-line-ear:2', 'vocal:308', 'lesson:bh-chromatic'],
  },
  {
    id: 'bh-chromatic-two-voices',
    why: "The chromatic scale in two voices (3rds / 6ths 'along one floor'): only the title of Echols's Labyrinth lesson 8 is known.",
    hides: ['item:hl-chrom2', 'card:bh-chrom2'],
  },
  {
    id: 'bh-5432',
    why: 'The 5-4-3-2 phrases (dominant and major): every note comes from one workshop attendee\'s forum notes; the workbook itself was not seen. Rhythms are the app\'s.',
    hides: ['item:hl-5432:0', 'item:hl-5432:1', 'item:hl-5432:2', 'item:hl-5432:3', 'item:hl-5432:4', 'item:hl-5432:5', 'item:hl-5432:6', 'item:hl-5432:7', 'item:hl-lick-outline', 'vocal:309', 'game:call5432', 'card:bh-5432'],
  },
  {
    id: 'bh-5432-minor',
    why: 'The 5-4-3-2 phrases in minor: derived by the app (not in any source we have), and not even consistent with the comment ("dominant shapes with ♭3").',
    hides: ['item:hl-5432:8', 'item:hl-5432:9', 'item:hl-5432:10', 'item:hl-5432:11', 'game:call5432'],
  },
  {
    id: 'bh-5432-lick',
    why: 'The combined 5-4-3-2 lick (G B C F D E♭ E G B♭ D B♭ B C): the same attendee\'s notes, cut off where his line goes on.',
    hides: ['item:hl-lick', 'item:hl-lick-outline', 'card:bh-lick'],
  },
  {
    id: 'bh-seven-down',
    why: 'Seven down to the 3rd: from blogs and forums (Cleary, a forum thread), no Harris video or workbook page.',
    hides: ['item:hl-sevendown', 'topic:bh-line-ear:5', 'vocal:310', 'card:bh-sevendown'],
  },
  {
    id: 'bh-3-to-b9',
    why: '3 to ♭9 over the family as a Harris line device: one secondary source (Larsen).',
    hides: ['item:hl-3b9', 'card:bh-3b9'],
  },
  {
    id: 'bh-b7-major-pivot',
    why: 'The ♭7-major pivot over the dominant (B♭maj7 over C7): one secondary source (Larsen).',
    hides: ['item:hl-imp-scale:3', 'item:hl-imp-scale:4'],
  },
  {
    id: 'parks-eight-ways',
    why: "Parks's warm-up 'the dominant eight ways': the episode title is known, the eight ways are the app's reading.",
    hides: ['item:hl-eight', 'card:parks-eight'],
  },
  {
    id: 'bh-abcs-arps-down',
    why: 'The ABCs (3rds a half step below) and major arpeggios chromatically down as Harris exercises: one forum report.',
    hides: ['item:hl-abc', 'item:hl-arps-down'],
  },
  {
    id: 'bh-feel6',
    why: "'Feel 6 in 4': only a workshop-video chapter title; the exercise (dotted quarters, cells of three) is the app's.",
    hides: ['item:hl-feel6', 'card:bh-feel6'],
  },
  {
    id: 'bh-compose',
    why: "'Write a line once, play it in every tune with the same move' as Harris/Rees practice: one forum report.",
    hides: ['item:hl-compose', 'card:bh-compose'],
  },
  {
    id: 'bh-outline-blues',
    why: 'The scale outline of the blues: the bar-by-bar scales follow one forum post.',
    hides: ['item:hl-outline:0'],
  },
  {
    id: 'tune-charts',
    why: 'Cherokee, How High the Moon and Night in Tunisia chord charts were typed from memory, not checked against a fake book.',
    hides: ['item:hl-outline:2', 'item:hl-outline:4', 'item:hl-outline:5'],
  },
  // ───────────── Echols: the Elevator and the voicing ladder (elevator.ts, drills/harmLadder.ts) ─────────────
  // The Elevator itself is VERIFIED from the tonic (owner 2026-11-15: Echols builds the floors from the tonic; the
  // game, cm-expand and the levels now start every floor there). What still rests on inference:
  {
    id: 'echols-elevator-melody',
    why: "The elevator under a melody (a melody up the scale, a floor higher each note, then along the drop 2 floor): the app's realisation of a forum student's Autumn Leaves remark; the floors start off the tonic.",
    hides: ['item:cm-elevator'],
  },
  {
    id: 'echols-elevator-borrow',
    why: 'Borrowing through the Elevator: the mechanism is inferred (Echols E04 is paywalled).',
    hides: ['item:el-borrow'],
  },
  {
    id: 'echols-voicing-ladder',
    why: "Echols's voicing ladder (thirds, triads, shells, octave chords): only short-video titles; the 'shell' and 'octave chord' shapes are behind a paywall.",
    hides: ['item:vl-ladder'],
  },
  // ───────────── Siskind: solo piano (soloPiano.ts, drills/soloPianoDrills.ts) ─────────────
  {
    id: 'siskind-lh-variants',
    why: "Left-hand forms the doc inferred from names (7th-first bass-plus, the 9th on Type B, the Evans syncopation): 'the doc's reading — verify'.",
    hides: ['item:lh-bpalt:1', 'item:lh-shB:1', 'item:lh-strong:1'],
  },
  {
    id: 'siskind-tenths',
    why: 'Walking 10ths and a whole head in 10ths: named in his video chapter lists only; the procedure is inferred.',
    hides: ['item:lh-walk10', 'item:lh-head10', 'lesson:sp-stride'],
  },
  {
    id: 'siskind-stride-variations',
    why: 'The stride variations (Peace Piece, reversed, skip a beat, 3+3+2, anticipations, chord early, 3 against 4, the break): named only; every placement is the app\'s.',
    hides: ['item:lh-var1', 'item:lh-332', 'item:lh-var2', 'item:lh-34', 'item:lh-break', 'topic:lh-tex-ear:2', 'topic:lh-tex-ear:3', 'lesson:sp-stride'],
  },
  {
    id: 'siskind-shell-comping',
    why: 'Shell comping rhythms (reverse, Red Garland, push-off, lead-in) and the shuttle: the doc\'s reading of names.',
    hides: ['item:lh-scomp:1', 'item:lh-scomp:2', 'item:lh-scomp:3', 'item:lh-scomp:4', 'item:lh-shuttle', 'lesson:sp-stride'],
  },
  {
    id: 'siskind-comp-rhythms',
    why: 'Comping vocabulary: the Beat-3 Charleston, the Basie rhythm, the push-off and the accent placement are named only; the figures are ours.',
    hides: ['item:cp-beat3', 'item:cp-basie', 'item:cp-pushoff', 'item:cp-accent', 'item:tx-call', 'topic:comp-rhythm-ear', 'card:sp-comp-rhythms'],
  },
  {
    id: 'siskind-textures',
    why: 'Drop-2 sidesteps and the inner-voice movement (one of his five, our choice): marked verify in soloPiano.ts.',
    hides: ['item:tx-drop2', 'item:tx-inner'],
  },
  // ───────────── Our own transcriptions (drums) ─────────────
  {
    id: 'latin-kit-patterns',
    why: 'Mambo bell over the clave, songo and Mozambique (d-latin 8–10): our own transcriptions, not yet checked by a Latin percussion teacher.',
    hides: ['level:d-latin-8', 'level:d-latin-9', 'level:d-latin-10'],
  },
];

/**
 * The owner's switch: claim ids (or single content ids) confirmed since. Put an id here once it is verified, e.g.
 * 'bh-5432' after checking Workbook 1. The content comes back everywhere at once.
 */
export const SWITCHED_ON: ReadonlySet<string> = new Set<string>([]);

let HIDDEN: Map<string, string[]> | null = null;
/** content id → the claims (not yet switched on) that hide it. */
function hiddenMap(): Map<string, string[]> {
  if (HIDDEN) return HIDDEN;
  const m = new Map<string, string[]>();
  for (const c of UNVERIFIED_CLAIMS) {
    if (SWITCHED_ON.has(c.id)) continue;
    for (const h of c.hides) if (!SWITCHED_ON.has(h)) m.set(h, [...(m.get(h) ?? []), c.id]);
  }
  return (HIDDEN = m);
}

/** Is this content id shown? (false while any unconfirmed claim hides it). */
export const isVerified = (id: string): boolean => !hiddenMap().has(id);
/** Every hidden content id (tests, docs). */
export const hiddenContentIds = (): string[] => [...hiddenMap().keys()];

/** The plain kind of a spec kind ("g-harrisline>hl-chrom" → "hl-chrom"). */
const baseKind = (kind: string): string => kind.slice(kind.lastIndexOf('>') + 1);

/** A drill item (kind + option) is shown. */
export function itemVerified(kind: string, option?: number): boolean {
  const k = baseKind(kind);
  return isVerified(`item:${k}`) && (option === undefined || isVerified(`item:${k}:${option}`));
}

/** A saved item id ("family:kind:key:hands…:op3") is shown (key mastery, profiles). */
export function itemIdVerified(itemId: string): boolean {
  const p = itemId.split(':');
  const fam = p[0] ?? '';
  // a game's key takes ("k-game-call5432:game:…")
  const g = /^[kgb]-game-(.+)$/.exec(fam);
  if (g) return isVerified(`game:${g[1]}`);
  // drum kinds are "<level>:<name>": the level decides
  if (fam.startsWith('d-') && /^\d+$/.test(p[1] ?? '')) return isVerified(`level:${fam}-${p[1]}`);
  const op = itemId.match(/:op(\d+)(?::|$)/);
  return itemVerified(p[1] ?? '', op ? Number(op[1]) : undefined);
}

interface GLevel {
  id: string;
  specs: { kind: string; option?: number }[];
}
/** A level with only its shown items, or null when the level (or every item of it) is hidden. */
export function gateLevel<L extends GLevel>(lv: L): L | null {
  if (!isVerified(`level:${lv.id}`)) return null;
  const specs = lv.specs.filter((s) => itemVerified(s.kind, s.option));
  if (!specs.length) return null;
  return specs.length === lv.specs.length ? lv : ({ ...lv, specs } as L);
}

/** Families with only their shown levels; empty families left out. Applied once at the end of every catalogue. */
export function gateFamilies<F extends { levels: GLevel[] }>(fams: F[]): F[] {
  const out: F[] = [];
  for (const f of fams) {
    const levels = f.levels.map((l) => gateLevel(l)).filter((l): l is GLevel => l !== null);
    if (!levels.length) continue;
    out.push(levels.length === f.levels.length && levels.every((l, i) => l === f.levels[i]) ? f : ({ ...f, levels } as F));
  }
  return out;
}

/** A topic (or one level of it) is shown. */
export const topicVerified = (topic: string, level?: number): boolean => isVerified(`topic:${topic}`) && (level === undefined || isVerified(`topic:${topic}:${level}`));
/** The shown levels of a topic (1-based), out of `count`. */
export const topicLevelsShown = (topic: string, count: number): number[] => (topicVerified(topic) ? Array.from({ length: count }, (_, i) => i + 1).filter((l) => isVerified(`topic:${topic}:${l}`)) : []);

/** A game is shown. */
export const gameVerified = (game: string): boolean => isVerified(`game:${game}`);
/** A vocal level (by ref) is shown. */
export const vocalVerified = (ref: number): boolean => isVerified(`vocal:${ref}`);
/** A mini-lesson is shown. */
export const lessonVerified = (id: string): boolean => isVerified(`lesson:${id}`);
/** Lesson cards: the card when its id is shown, else nothing (spread into steps / more). */
export const gated = <C>(id: string, card: C): C[] => (isVerified(`card:${id}`) ? [card] : []);
/** A card when its id is shown, else the sourced cards that take its place (a lesson keeps its length). */
export const gatedOr = <C>(id: string, card: C, instead: C[]): C[] => (isVerified(`card:${id}`) ? [card] : instead);
