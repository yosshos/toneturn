import { describe, expect, it } from 'vitest';
import { irealUnscramble, leadSheetFromMusicXml, leadSheetFromText, leadSheetsFromIReal, normalizeChord, readLeadSheet } from '../src/engine/leadsheet';
import { parseChart } from '../src/engine/charts';

const harmony = (step: string, kind: string, alter = 0, extra = '') => `<harmony><root><root-step>${step}</root-step>${alter ? `<root-alter>${alter}</root-alter>` : ''}</root><kind>${kind}</kind>${extra}</harmony>`;
const note = (dur: number) => `<note><pitch><step>C</step><octave>5</octave></pitch><duration>${dur}</duration></note>`;
const measure = (n: number, body: string, bar = '') => `<measure number="${n}">${bar}${body}</measure>`;
const xml = (measures: string) => `<?xml version="1.0"?><score-partwise><work><work-title>Test Tune</work-title></work><part-list><score-part id="P1"/></part-list><part id="P1">${measures}</part></score-partwise>`;
const attrs = '<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>';

describe('lead sheets in', () => {
  it('normalizes iReal and MusicXML spellings, and simplifies what the app does not know', () => {
    expect(normalizeChord('C^7')).toEqual({ sym: 'Cmaj7', simplified: false });
    expect(normalizeChord('D-7')).toEqual({ sym: 'Dm7', simplified: false });
    expect(normalizeChord('Bh7')).toEqual({ sym: 'Bm7b5', simplified: false });
    expect(normalizeChord('Eb^9')).toEqual({ sym: 'Ebmaj9', simplified: false });
    expect(normalizeChord('Co7')).toEqual({ sym: 'Cdim7', simplified: false });
    expect(normalizeChord('G7#9b13')?.sym).toBe('G7alt');
    expect(normalizeChord('F7sus')?.sym).toBe('F7sus');
    expect(normalizeChord('N.C.')).toBeNull();
    expect(normalizeChord('C-7/Bb')?.sym).toBe('Cm7/Bb');
  });

  it('MusicXML: chord symbols per bar, two in a bar on 1 and 3, repeats written out', () => {
    const src = xml(
      measure(1, attrs + harmony('D', 'minor-seventh') + note(4), '<barline location="left"><repeat direction="forward"/></barline>') +
        measure(2, harmony('G', 'dominant') + note(2) + harmony('C', 'major-seventh') + note(2), '<barline location="right"><repeat direction="backward"/></barline>') +
        measure(3, harmony('B', 'dominant', -1, '<degree><degree-value>9</degree-value><degree-alter>-1</degree-alter><degree-type>add</degree-type></degree>') + note(4)),
    );
    const l = leadSheetFromMusicXml(src);
    expect(l.title).toBe('Test Tune');
    expect(l.text.replace(/\n/g, ' | ')).toBe('Dm7 | G7 Cmaj7 | Dm7 | G7 Cmaj7 | Bb7b9');
    expect(parseChart(l.text).errors).toEqual([]);
  });

  it('MusicXML: the melody comes along — top note of a chord, ties joined, repeats written out', () => {
    const n = (step: string, oct: number, dur: number, extra = '') => `<note>${extra.includes('<chord/>') ? '<chord/>' : ''}<pitch><step>${step}</step><octave>${oct}</octave></pitch><duration>${dur}</duration>${extra.replace('<chord/>', '')}</note>`;
    const src = xml(
      measure(1, attrs + harmony('C', 'major') + n('C', 5, 2) + n('E', 4, 2, '<chord/>') + n('D', 5, 2, '<tie type="start"/>'), '<barline location="left"><repeat direction="forward"/></barline>') +
        measure(2, harmony('G', 'dominant') + n('D', 5, 1, '<tie type="stop"/>') + n('B', 4, 3), '<barline location="right"><repeat direction="backward"/></barline>'),
    );
    const l = leadSheetFromMusicXml(src);
    expect(l.melody?.map((x) => [x.beat, x.dur, x.midi])).toEqual([
      [0, 2, 72], [2, 3, 74], [5, 3, 71],
      [8, 2, 72], [10, 3, 74], [13, 3, 71],
    ]);
  });

  it('MusicXML without chord symbols is refused with a reason', () => {
    expect(() => leadSheetFromMusicXml(xml(measure(1, attrs + note(4))))).toThrow(/no chord symbols/);
  });

  it('text: bars by "|", one chord a line, and ChordPro brackets; lyrics lines are skipped', () => {
    expect(leadSheetFromText('Dm7 G7 | Cmaj7 | %').text).toBe('Dm7 G7 | Cmaj7 | %');
    const cp = leadSheetFromText('{title: My Song}\n[Am]Words go [F]here\n[C]more [G]words');
    expect(cp.title).toBe('My Song');
    expect(cp.text.replace(/\n/g, ' | ')).toBe('Am | F | C | G');
    expect(leadSheetFromText('Some lyrics that are not chords\nC | F').text).toBe('C | F');
  });

  it('iReal Pro: the scrambling is undone; songs, style, tempo, meter and repeats come through', () => {
    const scramble = (s: string) => {
      // the 50-character swap is its own inverse
      let r = '';
      let x = s;
      while (x.length > 50) {
        const p = x.slice(0, 50);
        x = x.slice(50);
        r += x.length < 2 ? p : irealUnscramble(p + 'XX').slice(0, 50);
      }
      return r + x;
    };
    const music = '{*AT44C^7XyQ|A-7XyQ|D-7 G7 }[*BF^7XyQ|Bb7XyQ|C^7XyQ|D-7 G7 Z ';
    expect(irealUnscramble(scramble(music))).toBe(music.replace(/XyQ/g, '   '));
    const song = ['Test Song', 'Writer Some', 'Bossa Nova', 'C', 'n', `1r34LbKcu7${scramble(music)}`, '140', '0'].join('=');
    const link = `irealb://${encodeURIComponent(`${song}===Another=Me==Waltz=F==1r34LbKcu7[T34F^7XyQ|C7XyQ Z===My list`)}`;
    const out = leadSheetsFromIReal(`<a href="${link}">list</a>`);
    expect(out.map((s) => s.title)).toEqual(['Test Song', 'Another']);
    expect(out[0].style).toBe('Bossa Nova');
    expect(out[0].text.replace(/\n/g, ' | ')).toBe('Cmaj7 | Am7 | Dm7 G7 | Cmaj7 | Am7 | Dm7 G7 | Fmaj7 | Bb7 | Cmaj7 | Dm7 G7');
    expect(out[1].meter).toBe(3);
    for (const s of out) expect(parseChart(s.text, s.meter).errors).toEqual([]);
  });

  it('reads files by content (an uncompressed MusicXML file)', async () => {
    const src = xml(measure(1, attrs + harmony('F', 'major') + note(4)));
    const [l] = await readLeadSheet({ name: 'tune.musicxml', bytes: new TextEncoder().encode(src) });
    expect(l.text).toBe('F');
  });

  it('reads compressed MusicXML (.mxl, a zip with a container)', async () => {
    const { deflateRawSync } = await import('zlib');
    const files: [string, string][] = [
      ['META-INF/container.xml', '<container><rootfiles><rootfile full-path="score.xml"/></rootfiles></container>'],
      ['score.xml', xml(measure(1, attrs + harmony('G', 'minor-seventh') + note(2) + harmony('C', 'dominant') + note(2)))],
    ];
    const parts: Uint8Array[] = [];
    const central: Uint8Array[] = [];
    let off = 0;
    for (const [name, text] of files) {
      const nm = new TextEncoder().encode(name);
      const data = new Uint8Array(deflateRawSync(Buffer.from(text)));
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true);
      h.setUint16(8, 8, true);
      h.setUint32(18, data.length, true);
      h.setUint16(26, nm.length, true);
      parts.push(new Uint8Array(h.buffer), nm, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true);
      c.setUint16(10, 8, true);
      c.setUint32(20, data.length, true);
      c.setUint16(28, nm.length, true);
      c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), nm);
      off += 30 + nm.length + data.length;
    }
    const cdSize = central.reduce((a, b) => a + b.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true);
    end.setUint32(16, off, true);
    const all = [...parts, ...central, new Uint8Array(end.buffer)];
    const bytes = new Uint8Array(all.reduce((a, b) => a + b.length, 0));
    let p = 0;
    for (const a of all) (bytes.set(a, p), (p += a.length));
    const [l] = await readLeadSheet({ name: 'tune.mxl', bytes });
    expect(l.text).toBe('Gm7 C7');
  });
});
