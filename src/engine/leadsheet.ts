// Lead sheets in (owner 2026-11-09): bring any tune's chords into My charts — to play along, improvise under rules,
// or hand to a teacher. Four ways in, all pure:
//   • MusicXML (.musicxml / .xml) and compressed MusicXML (.mxl — a zip) with <harmony> chord symbols: what MuseScore,
//     Sibelius, Finale, Dorico and iReal Pro export;
//   • an iReal Pro link or exported page (irealb:// / irealbook://) — the usual way jazz lead sheets are shared;
//   • plain text: "Dm7 G7 | Cmaj7 |", one bar per line, or ChordPro ("[Am]words [F]words").
// Repeats and 1st / 2nd endings are written out; chords the app does not know are simplified to their family
// (C7#9b13 → C7alt, Cmaj7(add13) → Cmaj7), never dropped.

import { parseChord } from './charts';
import { find, kid, kids, parseXml, txt, type XNode } from './piece/xml';
import { performanceOrder } from './piece/score';

export interface MelodyNote {
  beat: number;
  dur: number;
  midi: number;
}

export interface LeadSheet {
  title: string;
  composer?: string;
  /** Chart text as My charts reads it (bars split by "|"). */
  text: string;
  /** Beats per bar (3 → waltz). */
  meter: number;
  bpm?: number;
  /** A style hint from the source ("Medium Swing", "Bossa Nova" …). */
  style?: string;
  /** The tune (from MusicXML): beats from the chart's start, lengths in beats. */
  melody?: MelodyNote[];
  /** Symbols that had to be simplified (shown to the player). */
  simplified: string[];
}

// ---------------------------------------------------------------- chord symbols

/** Make a chord symbol one the app reads: iReal / MusicXML spellings, then simplification. Null for "no chord". */
export function normalizeChord(raw: string): { sym: string; simplified: boolean } | null {
  let s = raw.trim().replace(/[()]/g, '').replace(/♭/g, 'b').replace(/♯/g, '#').replace(/\s+/g, '');
  if (!s || /^(N\.?C\.?|n)$/i.test(s)) return null;
  const m = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/.exec(s);
  if (!m) return null;
  const [, root, q0, bass] = m;
  let q = q0
    .replace(/^\^9/, 'maj9')
    .replace(/^\^13/, 'maj13')
    .replace(/^\^7?/, 'maj7')
    .replace(/^-\^7?/, 'mmaj7')
    .replace(/^-/, 'm')
    .replace(/^h7?/, 'm7b5')
    .replace(/^ø7?/, 'm7b5')
    .replace(/^o7/, 'dim7')
    .replace(/^o$/, 'dim')
    .replace(/^min/, 'm')
    .replace(/^ma(j)?(?=\d|$)/i, 'maj')
    .replace(/^Δ/, 'maj')
    .replace(/add(\d+)/g, '')
    .replace(/^maj$/, '')
    .replace(/^7?\+$/, (x) => (x === '+' ? 'aug' : '7#5'));
  const sym = (qq: string) => `${root}${qq}${bass ? `/${bass}` : ''}`;
  if (parseChord(sym(q))) return { sym: sym(q), simplified: false };
  // simplify by family
  const fam = /^(mmaj7|mMaj7)/.test(q)
    ? 'mmaj7'
    : /^m7b5/.test(q)
      ? 'm7b5'
      : /^dim7/.test(q)
        ? 'dim7'
        : /^dim/.test(q)
          ? 'dim'
          : /^maj/.test(q)
            ? /#11/.test(q) ? 'maj7#11' : /9|13/.test(q) ? 'maj9' : 'maj7'
            : /^m/.test(q)
              ? /b6/.test(q) && !/7/.test(q) ? 'm' : /6/.test(q) && !/7/.test(q) ? 'm6' : /11/.test(q) ? 'm11' : /9/.test(q) ? 'm9' : /7/.test(q) ? 'm7' : 'm'
              : /sus/.test(q)
                ? /7|9|13/.test(q) ? (/b9/.test(q) ? '7b9sus4' : '7sus4') : 'sus4'
                : /alt|#9.*b13|b9.*b13|#5.*#9|b13.*#9|#9.*#5/.test(q)
                  ? '7alt'
                  : /b9/.test(q)
                    ? '7b9'
                    : /#9/.test(q)
                      ? '7#9'
                      : /#11|b5/.test(q)
                        ? '7#11'
                        : /b13|#5|\+/.test(q)
                          ? '7b13'
                          : /13/.test(q)
                            ? '13'
                            : /9/.test(q)
                              ? '9'
                              : /7/.test(q)
                                ? '7'
                                : /6/.test(q)
                                  ? '6'
                                  : '';
  if (parseChord(sym(fam))) return { sym: sym(fam), simplified: true };
  if (parseChord(`${root}${fam}`)) return { sym: `${root}${fam}`, simplified: true };
  return null;
}

/** One bar's chords at beat positions → chart tokens ("C / F /" for C on 1, F on 3; "C" when one chord). */
function barTokens(chords: { sym: string; at: number }[], beats: number): string {
  if (!chords.length) return '%';
  if (chords.length === 1 && chords[0].at < 0.01) return chords[0].sym;
  const slots = Math.max(1, Math.round(beats));
  const out: string[] = [];
  for (let b = 0; b < slots; b++) {
    const here = chords.filter((c) => Math.floor(c.at + 0.01) === b);
    out.push(here.length ? here[here.length - 1].sym : b === 0 ? '%' : '/');
  }
  // evenly split bars read cleaner: "C F" rather than "C / F /"
  const firsts = out.filter((x) => x !== '/');
  const step = slots / firsts.length;
  if (Number.isInteger(step) && out.every((x, i) => (i % step === 0 ? x !== '/' : x === '/'))) return firsts.join(' ');
  return out.join(' ');
}

/** Join bars into chart text, writing a repeated bar as "%". */
function chartText(bars: string[]): string {
  const out = bars.map((b, i) => (i > 0 && b === bars[i - 1] ? '%' : b));
  const lines: string[] = [];
  for (let i = 0; i < out.length; i += 4) lines.push(out.slice(i, i + 4).join(' | '));
  return lines.join('\n');
}

// ---------------------------------------------------------------- MusicXML

const KIND: Record<string, string> = {
  major: '', minor: 'm', augmented: 'aug', diminished: 'dim', dominant: '7', 'major-seventh': 'maj7', 'minor-seventh': 'm7',
  'diminished-seventh': 'dim7', 'augmented-seventh': '7#5', 'half-diminished': 'm7b5', 'major-minor': 'mmaj7', 'major-sixth': '6',
  'minor-sixth': 'm6', 'dominant-ninth': '9', 'major-ninth': 'maj9', 'minor-ninth': 'm9', 'dominant-11th': '11', 'major-11th': 'maj9',
  'minor-11th': 'm11', 'dominant-13th': '13', 'major-13th': 'maj13', 'minor-13th': 'm9', 'suspended-second': 'sus2',
  'suspended-fourth': 'sus4', power: '5', pedal: '', 'augmented-ninth': '9', 'french': '7', 'german': '7', 'italian': '7', 'neapolitan': '', 'tristan': '7',
};
const STEP_ALTER = (step: string | undefined, alter: string | undefined) => (step ? step + (Number(alter) === 1 ? '#' : Number(alter) === -1 ? 'b' : Number(alter) === 2 ? '##' : Number(alter) === -2 ? 'bb' : '') : '');

function harmonySym(h: XNode): string | null {
  const root = kid(h, 'root');
  if (!root) return null; // function-only harmony (Roman numerals) — skip
  const r = STEP_ALTER(txt(root, 'root-step'), txt(root, 'root-alter'));
  const kindNode = kid(h, 'kind');
  const kind = kindNode?.text.trim() ?? 'major';
  if (kind === 'none') return 'NC';
  let q = KIND[kind] ?? kindNode?.attrs.text ?? '';
  // the text the engraver showed is often the clearest ("m7b5", "7alt", "Δ7")
  const shown = kindNode?.attrs.text;
  if (shown && parseChord(`C${shown}`)) q = shown;
  for (const d of kids(h, 'degree')) {
    const v = txt(d, 'degree-value');
    const a = Number(txt(d, 'degree-alter') ?? 0);
    const ty = txt(d, 'degree-type');
    if (!v || ty === 'subtract') continue;
    q += `${a > 0 ? '#' : a < 0 ? 'b' : ''}${v}`;
  }
  const bassN = kid(h, 'bass');
  const bass = bassN ? STEP_ALTER(txt(bassN, 'bass-step'), txt(bassN, 'bass-alter')) : '';
  return `${r.replace(/##|bb/, (x) => x[0])}${q}${bass ? `/${bass}` : ''}`;
}

export function leadSheetFromMusicXml(src: string): LeadSheet {
  const doc = parseXml(src);
  const score = find(doc, 'score-partwise');
  if (!score) throw new Error('not MusicXML (score-partwise)');
  const title = (txt(find(score, 'work'), 'work-title') ?? txt(score, 'movement-title') ?? 'Untitled').trim() || 'Untitled';
  const composer = kids(find(score, 'identification'), 'creator').find((c) => c.attrs.type === 'composer')?.text.trim();
  // the first part that has chord symbols (usually the melody)
  const parts = kids(score, 'part');
  const part = parts.find((p) => !!find(p, 'harmony')) ?? parts[0];
  if (!part || !find(part, 'harmony')) throw new Error('no chord symbols in this file');
  let divisions = 1;
  let sig: [number, number] = [4, 4];
  let bpm: number | undefined;
  const simplified: string[] = [];
  const raw: { mel: { at: number; dur: number; midi: number; tieStop: boolean }[]; syms: { sym: string; at: number }[]; beats: number; repeatStart: boolean; repeatEnd: boolean; ending: number[] | null }[] = [];
  for (const m of kids(part, 'measure')) {
    const bar = { mel: [] as { at: number; dur: number; midi: number; tieStop: boolean }[], syms: [] as { sym: string; at: number }[], beats: 0, repeatStart: false, repeatEnd: false, ending: null as number[] | null };
    let pos = 0; // in divisions
    let maxPos = 0;
    let lastDur = 0;
    for (const el of m.children) {
      if (el.name === 'attributes') {
        const d = Number(txt(el, 'divisions'));
        if (d > 0) divisions = d;
        const t = kid(el, 'time');
        if (t) sig = [Number(txt(t, 'beats')) || 4, Number(txt(t, 'beat-type')) || 4];
      } else if (el.name === 'direction' || el.name === 'sound') {
        const snd = el.name === 'sound' ? el : find(el, 'sound');
        if (snd?.attrs.tempo && !bpm) bpm = Math.round(Number(snd.attrs.tempo));
      } else if (el.name === 'harmony') {
        const s = harmonySym(el);
        const off = Number(txt(el, 'offset') ?? 0);
        if (s && s !== 'NC') {
          const n = normalizeChord(s);
          if (n) {
            if (n.simplified && !simplified.includes(s)) simplified.push(s);
            bar.syms.push({ sym: n.sym, at: ((pos + off) / divisions) * (4 / sig[1]) });
          }
        }
      } else if (el.name === 'note') {
        const dur = Number(txt(el, 'duration') ?? 0);
        // the melody: voice 1 of the first staff, the top note of a chord, ties merged later
        const pitch = kid(el, 'pitch');
        if (pitch && !kid(el, 'rest') && !kid(el, 'grace') && (txt(el, 'voice') ?? '1') === '1' && (txt(el, 'staff') ?? '1') === '1') {
          const midi = 12 * (Number(txt(pitch, 'octave')) + 1) + ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as Record<string, number>)[txt(pitch, 'step') ?? 'C'] + Number(txt(pitch, 'alter') ?? 0);
          const scale = 4 / sig[1] / divisions;
          if (kid(el, 'chord')) {
            const last = bar.mel[bar.mel.length - 1];
            if (last && midi > last.midi) last.midi = midi;
          } else bar.mel.push({ at: pos * scale, dur: dur * scale, midi, tieStop: kids(el, 'tie').some((t) => t.attrs.type === 'stop') });
        }
        if (kid(el, 'chord')) continue; // same onset as the previous note
        if (kid(el, 'grace')) continue;
        lastDur = dur;
        pos += dur;
        maxPos = Math.max(maxPos, pos);
      } else if (el.name === 'backup') pos -= Number(txt(el, 'duration') ?? 0);
      else if (el.name === 'forward') {
        pos += Number(txt(el, 'duration') ?? 0);
        maxPos = Math.max(maxPos, pos);
      } else if (el.name === 'barline') {
        const rep = kid(el, 'repeat');
        if (rep?.attrs.direction === 'forward') bar.repeatStart = true;
        if (rep?.attrs.direction === 'backward') bar.repeatEnd = true;
        const end = kid(el, 'ending');
        if (end && (end.attrs.type === 'start' || !bar.ending)) bar.ending = (end.attrs.number ?? '1').split(/[,\s]+/).filter(Boolean).map(Number);
      }
    }
    void lastDur;
    const full = (sig[0] * 4) / sig[1];
    bar.beats = m.attrs.implicit === 'yes' ? Math.max(maxPos / divisions, 1) : full;
    raw.push(bar);
  }
  // a pickup bar without chords is not part of the form
  if (raw.length > 1 && !raw[0].syms.length && raw[0].beats < (sig[0] * 4) / sig[1]) raw.shift();
  const order = performanceOrder(raw);
  const bars = order.map((i) => barTokens(raw[i].syms, raw[i].beats));
  // a bar with no chord carries the previous one
  for (let i = 0; i < bars.length; i++) if (bars[i] === '%' && i === 0) bars[i] = firstChord(raw) ?? 'C';
  const meter = sig[0] === 3 || sig[0] === 6 ? 3 : 4;
  // the melody in performance order (the head), ties joined
  const melody: MelodyNote[] = [];
  let off = 0;
  for (const i of order) {
    for (const n of raw[i].mel) {
      const last = melody[melody.length - 1];
      if (n.tieStop && last && last.midi === n.midi && Math.abs(last.beat + last.dur - (off + n.at)) < 1e-3) last.dur += n.dur;
      else melody.push({ beat: off + n.at, dur: n.dur, midi: n.midi });
    }
    off += raw[i].beats;
  }
  return { title, ...(composer ? { composer } : {}), text: chartText(bars), meter, ...(bpm ? { bpm } : {}), ...(melody.length >= 4 ? { melody } : {}), simplified };
}
const firstChord = (raw: { syms: { sym: string }[] }[]) => raw.find((b) => b.syms.length)?.syms[0].sym;

// ---------------------------------------------------------------- .mxl (zip)

/** Read the score out of a compressed MusicXML file (a zip). Uses the browser's DecompressionStream. */
export async function unzipMxl(buf: Uint8Array): Promise<string> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const files = new Map<string, { method: number; start: number; size: number }>();
  // central directory: find the end record
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) {
    eocd = i;
    break;
  }
  if (eocd < 0) throw new Error('not a zip file');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  for (let k = 0; k < count && p + 46 <= buf.length; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true);
    const xlen = dv.getUint16(p + 30, true);
    const clen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nlen));
    const lnlen = dv.getUint16(local + 26, true);
    const lxlen = dv.getUint16(local + 28, true);
    files.set(name, { method, start: local + 30 + lnlen + lxlen, size: csize });
    p += 46 + nlen + xlen + clen;
  }
  const read = async (name: string) => {
    const f = files.get(name);
    if (!f) throw new Error(`missing ${name}`);
    const data = buf.subarray(f.start, f.start + f.size);
    if (f.method === 0) return new TextDecoder().decode(data);
    if (f.method !== 8) throw new Error('unsupported zip compression');
    const ds = new DecompressionStream('deflate-raw');
    const out = new Response(new Blob([data as BlobPart]).stream().pipeThrough(ds));
    return await out.text();
  };
  let main: string | undefined;
  if (files.has('META-INF/container.xml')) {
    const c = parseXml(await read('META-INF/container.xml'));
    main = find(c, 'rootfile')?.attrs['full-path'];
  }
  main ??= [...files.keys()].find((n) => !n.startsWith('META-INF') && /\.(xml|musicxml)$/i.test(n));
  if (!main) throw new Error('no score inside');
  return read(main);
}

// ---------------------------------------------------------------- iReal Pro

function obfusc50(s: string): string {
  const a = s.split('');
  for (let i = 0; i < 5; i++) {
    a[49 - i] = s[i];
    a[i] = s[49 - i];
  }
  for (let i = 10; i < 24; i++) {
    a[49 - i] = s[i];
    a[i] = s[49 - i];
  }
  return a.join('');
}
/** Undo iReal Pro's scrambling of the chord string (the documented, public format of irealb:// links). */
export function irealUnscramble(s: string): string {
  let r = '';
  while (s.length > 50) {
    const p = s.slice(0, 50);
    s = s.slice(50);
    r += s.length < 2 ? p : obfusc50(p);
  }
  r += s;
  return r.replace(/Kcl/g, '| x').replace(/LZ/g, ' |').replace(/XyQ/g, '   ');
}

const IREAL_STYLE = (s: string) => (/bossa|samba|latin/i.test(s) ? 'bossa' : /ballad/i.test(s) ? 'ballad' : /waltz/i.test(s) ? 'waltz' : /rock|funk/i.test(s) ? 'rock' : /pop|even 8|r&b|soul/i.test(s) ? 'pop' : 'swing');
export const irealStyle = IREAL_STYLE;

/** Parse an iReal chord string (after unscrambling) into bars. */
export function irealBars(music: string, simplified: string[]): { bars: string[]; meter: number } {
  type Bar = { toks: string[]; repeatStart: boolean; repeatEnd: boolean; ending: number[] | null };
  const bars: Bar[] = [];
  let cur: Bar = { toks: [], repeatStart: false, repeatEnd: false, ending: null };
  let meter = 4;
  let i = 0;
  const s = music.replace(/<[^>]*>/g, ' '); // comments
  const close = (force = false) => {
    if (cur.toks.length || force || cur.repeatEnd) bars.push(cur);
    cur = { toks: [], repeatStart: false, repeatEnd: false, ending: null };
  };
  let lastChord = '';
  while (i < s.length) {
    const c = s[i];
    if (c === 'T' && /^T\d\d/.test(s.slice(i))) {
      const n = Number(s[i + 1]);
      meter = n === 3 || n === 6 ? 3 : 4;
      i += 3;
      continue;
    }
    if (c === '*') {
      i += 2; // section mark
      continue;
    }
    if (c === 'N' && /^N\d/.test(s.slice(i))) {
      cur.ending = [Number(s[i + 1])];
      i += 2;
      continue;
    }
    if (c === '{') {
      if (cur.toks.length) close();
      cur.repeatStart = true;
      i++;
      continue;
    }
    if (c === '}') {
      cur.repeatEnd = true;
      close(true);
      i++;
      continue;
    }
    if (c === '|' || c === '[' || c === ']' || c === 'Z') {
      if (cur.toks.length) close();
      i++;
      continue;
    }
    if (c === 'x') {
      // repeat the previous bar
      const prev = bars[bars.length - 1];
      if (prev) cur.toks.push(...prev.toks);
      i++;
      continue;
    }
    if (c === 'r') {
      // repeat the previous two bars
      const a = bars[bars.length - 2];
      const b = bars[bars.length - 1];
      if (a && b) {
        bars.push({ toks: [...a.toks], repeatStart: false, repeatEnd: false, ending: null });
        cur.toks.push(...b.toks);
      }
      i++;
      continue;
    }
    if (c === 'W' || c === 'p') {
      // invisible slot / slash: the previous chord continues
      if (lastChord) cur.toks.push('/');
      i++;
      continue;
    }
    if (c === 'n') {
      i++;
      continue;
    }
    const m = /^[A-G][b#]?(?:\*[^*]*\*|[^\s,|[\]{}()Z*<])*(?:\/[A-G][b#]?)?/.exec(s.slice(i));
    if (m) {
      // a trailing s / l is iReal's small / large chord size (the s of "sus" stays); *…* is a custom quality
      const tok = m[0].replace(/\*/g, '').replace(/[UQSfY]+$/, '').replace(/(?<!su)[sl]$/, '');
      const n = normalizeChord(tok);
      if (n) {
        if (n.simplified && !simplified.includes(tok)) simplified.push(tok);
        cur.toks.push(n.sym);
        lastChord = n.sym;
      }
      i += m[0].length;
      // an alternate chord in parentheses above is not played
      if (s[i] === '(') i = Math.max(i + 1, s.indexOf(')', i) + 1);
      continue;
    }
    i++;
  }
  close();
  const order = performanceOrder(bars);
  return {
    bars: order.map((k) => {
      const t = bars[k].toks.filter((x, j) => !(x === '/' && j === 0));
      return t.length ? t.join(' ') : '%';
    }),
    meter,
  };
}

/** Every song in an iReal Pro link / exported HTML page. */
export function leadSheetsFromIReal(src: string): LeadSheet[] {
  const m = /irealb(?:ook)?:\/\/[^"'\s<>]+/.exec(src);
  if (!m) throw new Error('no iReal Pro link');
  let body = m[0].replace(/^irealb(?:ook)?:\/\//, '');
  try {
    body = decodeURIComponent(body);
  } catch {
    /* already decoded */
  }
  const songs = body.split('===');
  if (songs.length > 1 && !songs[songs.length - 1].includes('1r34LbKcu7')) songs.pop(); // the playlist name
  const out: LeadSheet[] = [];
  for (const song of songs) {
    // title=composer=style=key=[transpose=]music=[comp style=]bpm=repeats (blank fields dropped, as iReal writes them)
    const p = song.split(/=+/).filter((x) => x !== '');
    const mi = p.findIndex((x) => x.startsWith('1r34LbKcu7'));
    if (mi < 0 || p.length < 4) continue;
    const [title, composer, style] = p;
    const music = irealUnscramble(p[mi].slice('1r34LbKcu7'.length));
    const tail = p.slice(mi + 1).map(Number).filter((x) => Number.isFinite(x));
    const simplified: string[] = [];
    const { bars, meter } = irealBars(music, simplified);
    if (!bars.length) continue;
    const bpm = tail.length >= 2 ? tail[tail.length - 2] : undefined;
    out.push({ title, composer: composer && !/unknown/i.test(composer) ? composer.split(' ').reverse().join(' ').trim() : undefined, text: chartText(bars), meter, ...(bpm && bpm > 30 ? { bpm } : {}), style, simplified });
  }
  if (!out.length) throw new Error('no songs in the link');
  return out;
}

// ---------------------------------------------------------------- text

/** Plain text or ChordPro: keeps the chord symbols, drops the words. */
export function leadSheetFromText(src: string, title = 'Untitled'): LeadSheet {
  const simplified: string[] = [];
  const lines = src.replace(/\r/g, '').split('\n');
  let t = title;
  const bars: string[] = [];
  for (const line of lines) {
    const dir = /^\{(title|t):\s*(.+)\}$/i.exec(line.trim());
    if (dir) {
      t = dir[2].trim();
      continue;
    }
    if (/^\{.*\}$/.test(line.trim())) continue;
    const bracketed = [...line.matchAll(/\[([^\]]+)\]/g)].map((x) => x[1]);
    const cells = bracketed.length ? bracketed.map((x) => [x]) : line.includes('|') ? line.split('|').map((b) => b.trim().split(/\s+/).filter(Boolean)) : line.trim().split(/\s+/).filter(Boolean).map((x) => [x]);
    // a text line (lyrics) has words that are not chords: skip it unless most tokens are chords
    const flat = cells.flat().filter((x) => x !== '%' && x !== '/');
    if (!flat.length) continue;
    const ok = flat.filter((x) => normalizeChord(x));
    if (!bracketed.length && ok.length < flat.length * 0.6) continue;
    for (const cell of cells) {
      const toks = cell
        .map((x) => {
          if (x === '%' || x === '/') return x;
          const n = normalizeChord(x);
          if (n?.simplified && !simplified.includes(x)) simplified.push(x);
          return n?.sym ?? null;
        })
        .filter((x): x is string => !!x);
      if (toks.length) bars.push(toks.join(' '));
    }
  }
  if (!bars.length) throw new Error('no chords found');
  return { title: t, text: chartText(bars), meter: 4, simplified };
}

/** Any lead sheet file or pasted text → one or more lead sheets. */
export async function readLeadSheet(file: { name: string; bytes: Uint8Array } | { text: string }): Promise<LeadSheet[]> {
  if ('text' in file) {
    if (/irealb(ook)?:\/\//.test(file.text)) return leadSheetsFromIReal(file.text);
    if (/<score-partwise/.test(file.text)) return [leadSheetFromMusicXml(file.text)];
    return [leadSheetFromText(file.text)];
  }
  const name = file.name.replace(/\.[^.]+$/, '');
  const isZip = file.bytes[0] === 0x50 && file.bytes[1] === 0x4b;
  const text = isZip ? await unzipMxl(file.bytes) : new TextDecoder().decode(file.bytes);
  const out = await readLeadSheet({ text });
  for (const l of out) if (l.title === 'Untitled') l.title = name;
  return out;
}
