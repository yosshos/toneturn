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
  /** What we have and why it is not certain — or, once switched on, what confirmed it (one line, docs and tests). */
  why: string;
  /** The content it hides. */
  hides: string[];
  /** Hidden for good: the owner does not want it pursued (or it duplicates other content). */
  notPursued?: true;
  /** Hidden for lack of verified knowledge: no consistent sources found (re-researched 2026-11-15). */
  unsourced?: true;
}

export const UNVERIFIED_CLAIMS: Claim[] = [
  // ───────────── Barry Harris lines (src/engine/harrisLines.ts, drills/harrisLineDrills.ts) ─────────────
  {
    id: 'bh-chromatic',
    why: "Barry's chromatic scale (major up and down, dominant, minor 6-dim): owner-confirmed 2026-11-15 — the scale's own notes always on the beat, chromatics between.",
    hides: ['item:hl-chrom', 'topic:bh-line-ear:1', 'topic:bh-line-ear:2', 'vocal:308', 'lesson:bh-chromatic'],
  },
  {
    id: 'bh-chromatic-two-voices',
    why: 'The chromatic scale in two voices: owner 2026-11-15 — usually 3rds, 6ths or 10ths, but any interval; rebuilt on the confirmed major / dominant chromatic scale.',
    hides: ['item:hl-chrom2', 'card:bh-chrom2'],
  },
  {
    id: 'bh-5432',
    why: 'The 5-4-3-2 phrases (dominant and major): every note comes from one workshop attendee\'s forum notes; the workbook itself was not seen. Rhythms are the app\'s.',
    hides: ['item:hl-5432:0', 'item:hl-5432:1', 'item:hl-5432:2', 'item:hl-5432:3', 'item:hl-5432:4', 'item:hl-5432:5', 'item:hl-5432:6', 'item:hl-5432:7', 'item:hl-lick-outline', 'vocal:309', 'game:call5432', 'card:bh-5432'],
    notPursued: true,
  },
  {
    id: 'bh-5432-minor',
    why: 'The 5-4-3-2 phrases in minor: derived by the app (not in any source we have), and not even consistent with the comment ("dominant shapes with ♭3").',
    hides: ['item:hl-5432:8', 'item:hl-5432:9', 'item:hl-5432:10', 'item:hl-5432:11', 'game:call5432'],
    notPursued: true,
  },
  {
    id: 'bh-5432-lick',
    why: 'The combined 5-4-3-2 lick (G B C F D E♭ E G B♭ D B♭ B C): the same attendee\'s notes, cut off where his line goes on.',
    hides: ['item:hl-lick', 'item:hl-lick-outline', 'card:bh-lick'],
    notPursued: true,
  },
  {
    id: 'bh-seven-down',
    why: 'Seven down to the 3rd: owner-confirmed 2026-11-15 (a known lick Chris Parks teaches); also Cleary and the jazzguitar.be study-group notes.',
    hides: ['item:hl-sevendown', 'topic:bh-line-ear:5', 'vocal:310', 'card:bh-sevendown'],
  },
  {
    id: 'bh-3-to-b9',
    why: '3 to ♭9 (B D F A♭ over G7) as a Harris line device like 3 to 9: one secondary source (Larsen); forums say "on the third of every dominant, the diminished" but never as a named line arpeggio.',
    // 2026-11-21: researched again, still no primary source -> out everywhere, the vocabulary cell too (owner).
    hides: ['item:hl-3b9', 'item:v-3b9', 'card:bh-3b9'],
  },
  {
    id: 'bh-b7-major-pivot',
    why: 'The ♭7-major pivot over the dominant (B♭maj7 over C7): owner-confirmed 2026-11-15 — one of the important arpeggios (with those on the root and the 5th).',
    hides: ['item:hl-imp-scale:3', 'item:hl-imp-scale:4'],
  },
  {
    id: 'parks-eight-ways',
    why: "The dominant rules from every degree (the old 'eight ways'): owner 2026-11-15 — Barry's rules for descending from each degree; per-degree rule in the eddierich handout, Bill Graham's Bebop Improv 101 and Parks's half-step handout.",
    hides: ['item:hl-eight', 'card:parks-eight'],
  },
  {
    id: 'bh-abcs-arps-down',
    why: "The ABCs: owner 2026-11-15 — Barry's order, note by note, then 3rds, then 3rds with a half step below the first note (up and down); also the jazzguitar.be study-group notes.",
    hides: ['item:hl-abc'],
  },
  {
    id: 'bh-arps-down',
    why: 'Major arpeggios chromatically down as a Harris exercise: one forum report only, not confirmed by the owner; no second source found (2026-11-15).',
    hides: ['item:hl-arps-down'],
    unsourced: true,
  },
  {
    id: 'bh-feel6',
    why: "'Feel 6 in 4': only a workshop-video chapter title; the exercise (dotted quarters, cells of three) is the app's. Owner unsure, not important.",
    hides: ['item:hl-feel6', 'card:bh-feel6'],
    notPursued: true,
  },
  {
    id: 'bh-compose',
    why: "'Write a line once, play it in every tune': owner 2026-11-15 — that is the rule-based improv the app already has (improvCoach, ruleCards); this duplicate stays out.",
    hides: ['item:hl-compose', 'card:bh-compose'],
    notPursued: true,
  },
  {
    id: 'bh-outline-blues',
    why: 'The scale outline of the blues: the bar-by-bar scales follow one forum post. Owner: does not matter.',
    hides: ['item:hl-outline:0'],
    notPursued: true,
  },
  {
    id: 'tune-charts',
    why: 'Cherokee, How High the Moon and Night in Tunisia: checked 2026-11-15 against the jazzadvice.com / iReal Pro charts and the NIU lead sheet; Cherokee now in its real bar lengths, How High the Moon with the minor ii–V into Gm7.',
    hides: ['item:hl-outline:2', 'item:hl-outline:4', 'item:hl-outline:5'],
  },
  // ───────────── Echols: the Elevator and the voicing ladder (elevator.ts, drills/harmLadder.ts) ─────────────
  // The Elevator itself is VERIFIED from the tonic (owner 2026-11-15: Echols builds the floors from the tonic; the
  // game, cm-expand and the levels now start every floor there). What still rests on inference:
  {
    id: 'echols-elevator-melody',
    why: "The elevator under a melody: the app's realisation of a forum student's Autumn Leaves remark; the floors start off the tonic. Owner does not know; no other source found — omitted for lack of verified knowledge.",
    hides: ['item:cm-elevator'],
    unsourced: true,
  },
  {
    id: 'echols-elevator-borrow',
    why: 'Borrowing through the Elevator: the mechanism is inferred (Echols E04 is paywalled). Owner does not know; no other source found — omitted for lack of verified knowledge.',
    hides: ['item:el-borrow'],
    unsourced: true,
  },
  {
    id: 'echols-voicing-ladder',
    why: 'The shells on the 6-dim scale: owner 2026-11-15 — upper shell C-G-A, lower shell C-E-A, drop 3 and drop 2 without the left hand.',
    hides: ['item:vl-ladder:2', 'item:vl-ladder:6', 'item:vl-ladder:8', 'item:vl-ladder:9'],
  },
  {
    id: 'echols-octave-chord',
    why: "Echols's 'octave chord' (vl-ladder 3 and 7): not answered; forums only (melody doubled an octave below, chord tones between).",
    hides: ['item:vl-ladder:3', 'item:vl-ladder:7'],
  },
  {
    id: 'echols-ladder-thirds-triads',
    why: "The ladder's 'thirds' and 'triads' (vl-ladder 0, 1, 4, 5): not asked or answered; two scale steps of the 6-dim scale is a 2nd at the 6th (G A).",
    hides: ['item:vl-ladder:0', 'item:vl-ladder:1', 'item:vl-ladder:4', 'item:vl-ladder:5'],
  },
  // ───────────── Comping rhythms and solo piano (soloPiano.ts, drills/soloPianoDrills.ts, compCaller.ts) ─────────────
  {
    id: 'comp-standard-rhythms',
    why: 'The Charleston on 3 (3, &4; jazzguitar.be, the Galbraith "Shiny" lesson) and call and response with it; with the Charleston and reverse Charleston (Pianowithjonny, Learn Jazz Standards), Red Garland and the anticipation — standard pedagogy.',
    hides: ['item:cp-beat3', 'item:tx-call', 'topic:comp-rhythm-ear:1', 'topic:comp-rhythm-ear:3'],
  },
  {
    id: 'shell-comp-standard',
    why: 'LH shell comping: reverse Charleston (&1, 3), Red Garland (&2 and &4, the &4 sounding the next chord; Jazz-Library, Cleary) and the lead-in (Siskind: a chord on &3 or 4 into the next bar), each under a bass on 1.',
    hides: ['item:lh-scomp:1', 'item:lh-scomp:2', 'item:lh-scomp:4'],
  },
  {
    id: 'walking-tenths',
    why: 'Walking 10ths (I → IV → I and the diminished walk-up): a standard stride device (Grove, Siskind\'s "7 Secrets of Stride").',
    hides: ['item:lh-walk10:0', 'item:lh-walk10:1'],
  },
  {
    id: 'siskind-lh-variants',
    why: "Left-hand forms inferred from names (7th-first bass-plus, the 9th on Type B, the Evans syncopation). Re-researched 2026-11-15: nothing found; and in Levine the 9th is on top (under the thumb) in Type A, not B — omitted for lack of verified knowledge.",
    hides: ['item:lh-bpalt:1', 'item:lh-shB:1', 'item:lh-strong:1'],
    unsourced: true,
  },
  {
    id: 'siskind-tenths',
    why: 'The 9th under the thumb in walking 10ths, and a whole head in 10ths on 1 and 3: Siskind names them (chapter list) but the placements are ours — omitted for lack of verified knowledge.',
    hides: ['item:lh-walk10:2', 'item:lh-head10', 'lesson:sp-stride'],
    unsourced: true,
  },
  {
    id: 'siskind-stride-variations',
    why: "The stride variations: Siskind's chapter list confirms the names (Peace Piece low-high-high-low, 3+3+2, anticipations, chord early, 3 against 4, the break) but not the placements; 'reversed stride' not found — omitted for lack of verified knowledge.",
    hides: ['item:lh-var1', 'item:lh-332', 'item:lh-var2', 'item:lh-34', 'item:lh-break', 'topic:lh-tex-ear:2', 'topic:lh-tex-ear:3', 'lesson:sp-stride'],
    unsourced: true,
  },
  {
    id: 'siskind-shell-comping',
    why: "The LH push-off (Siskind: 'repeat a chord on a downbeat and the offbeat after', placement ours) and the shuttle (name only): omitted for lack of verified knowledge.",
    hides: ['item:lh-scomp:3', 'item:lh-shuttle', 'lesson:sp-stride'],
    unsourced: true,
  },
  {
    id: 'siskind-comp-rhythms',
    why: 'The Basie rhythm (2 and 4), the push-off (2, 4, &4) and accent comping (&2 and 4): placements found in no source (re-researched 2026-11-15) — omitted for lack of verified knowledge. Comp Caller leaves them out too.',
    hides: ['item:cp-basie', 'item:cp-pushoff', 'item:cp-accent', 'topic:comp-rhythm-ear:2', 'card:sp-comp-rhythms'],
    unsourced: true,
  },
  {
    id: 'siskind-textures',
    why: "Drop-2 sidesteps (half step above, an 8th early) and 'five inner-voice movements': the Deep Dive video has a sidesteps chapter but no five movements; placements ours — omitted for lack of verified knowledge.",
    hides: ['item:tx-drop2', 'item:tx-inner'],
    unsourced: true,
  },
  // ───────────── Our own transcriptions (drums) ─────────────
  {
    id: 'latin-kit-patterns',
    why: 'Mambo, songo, Mozambique (d-latin 8–10): son clave and the tumbao kick (&2 and 4) confirmed; songo rebuilt 2026-11-22 to the verified hands (right hand on the four beats, left hand on the offbeats; STYLE-AFROCUBAN F4); the mambo / Mozambique bells, the Mozambique snare, the songo kick and accents and the hi-hat foot not (sources are notation images or books) — omitted for lack of verified knowledge.',
    hides: ['level:d-latin-8', 'level:d-latin-9', 'level:d-latin-10', 'groove:songo'],
    unsourced: true,
  },
  {
    id: 'bass-latin-cells',
    why: 'b-latin cha-cha (4), songo (5), Mozambique (6), 6/8 (7) and the partido-alto cell (8, option 0): no source gives these bass lines (STYLE-AFROCUBAN F6, §4.2 [?]; STYLE-BRAZIL B2 gives only the partido-alto timeline). Tumbao 1–3, baião (8, option 1) and Latin jazz (9) are verified and stay.',
    hides: ['level:b-latin-4', 'level:b-latin-5', 'level:b-latin-6', 'level:b-latin-7', 'item:brazil:0'],
    unsourced: true,
  },
  // 'montuno-lines' (k-montuno 3–9, 11) was closed 2026-11-23: checked against published pedagogy and the generator
  // made a looped ostinato (THEORY-QUESTIONS 13).
];

/**
 * The owner's switch: claim ids (or single content ids) confirmed since. Put an id here once it is verified, e.g.
 * 'bh-5432' after checking Workbook 1. The content comes back everywhere at once.
 * 2026-11-15: the owner's answers to docs/THEORY-QUESTIONS.md and the re-research (see the doc).
 */
export const SWITCHED_ON: ReadonlySet<string> = new Set<string>([
  'bh-chromatic',
  'bh-chromatic-two-voices',
  'bh-seven-down',
  'bh-b7-major-pivot',
  'parks-eight-ways',
  'bh-abcs-arps-down',
  'tune-charts',
  'echols-voicing-ladder',
  'comp-standard-rhythms',
  'shell-comp-standard',
  'walking-tenths',
]);

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

/**
 * Bass kinds that live in one level only, where the level is what a claim hides (the b-latin cells, 'bass-latin-cells'):
 * a saved item of such a kind is hidden with its level. "family:kind" → level id.
 */
export const BASS_KIND_LEVEL: Readonly<Record<string, string>> = {
  'b-latin:chacha': 'b-latin-4',
  'b-latin:songo': 'b-latin-5',
  'b-latin:mozambique': 'b-latin-6',
  'b-latin:afro68': 'b-latin-7',
};

/** A saved item id ("family:kind:key:hands…:op3") is shown (key mastery, profiles). */
export function itemIdVerified(itemId: string): boolean {
  const p = itemId.split(':');
  const fam = p[0] ?? '';
  // bass kinds whose level is hidden (saved b-latin 4–7 items don't count in key mastery)
  const bl = BASS_KIND_LEVEL[`${fam}:${p[1] ?? ''}`];
  if (bl && !isVerified(`level:${bl}`)) return false;
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
