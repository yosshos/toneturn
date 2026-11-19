// One Hebrew term per concept (curriculum audit 2026-11-19: INSTRUMENTS §2.5, VOICE-DRUMS D13/V22, EAR-JAZZ F36–F40).
// The glossary (src/content/glossary.ts) is the authority; where it had no entry, the most-used form won. This test keeps
// the banned variants out of every Hebrew string in the app.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GLOSSARY } from '../src/content/glossary';

const ROOT = join(__dirname, '..');
/**
 * Not scanned: the changelog (history, as shipped), the speech tables that map what a player SAYS (they must accept
 * every variant).
 */
const SKIP = new Set(['src/version.ts', 'src/engine/musicSpeech.ts', 'src/engine/parser.ts']);

const NH = '(?<![א-ת])';
const NA = '(?![א-ת])';
/** concept → the chosen term, and the variants that must not appear. */
const BANNED: { concept: string; chosen: string; bad: RegExp }[] = [
  { concept: 'chord root', chosen: 'שורש', bad: new RegExp(`${NH}[ושמלבכה]{0,3}יסוד(ות)?${NA}`) },
  { concept: 'guide tones', chosen: 'צלילים מנחים', bad: /צלילים (ה)?מובילים/ },
  { concept: 'major (geresh)', chosen: 'מז׳ור', bad: /מז\\?'ור/ },
  { concept: 'lead sheet', chosen: 'דף אקורדים', bad: /לידשיט|דפי תווים|דף תווים/ },
  { concept: 'walking bass', chosen: 'ווקינג', bad: /בס מהלך/ },
  { concept: 'kick', chosen: 'קיק', bad: /בס[־-]דראם/ },
  { concept: 'hi-hat', chosen: 'היי־האט', bad: new RegExp(`היי[־-]הט${NA}`) },
  { concept: 'fill', chosen: 'מעבר', bad: new RegExp(`${NH}[ובלהמ]{0,2}מילוי(ים|י)?${NA}|${NH}[בוה]?פילים${NA}`) },
  { concept: 'enclosure', chosen: 'כיתור', bad: new RegExp(`אנקלוז|${NH}[וה]?הקפ(ה|ות)${NA}`) },
  { concept: 'close position', chosen: 'צפוף', bad: /מצב קרוב/ },
  { concept: 'shell', chosen: 'שלד', bad: /קונכי|שֶׁל/ },
  { concept: 'seventh chord', chosen: 'ספטאקורד', bad: /אקורד(י)? ספט/ },
  { concept: 'diminished', chosen: 'מוקטן', bad: /דימיניש/ },
  { concept: 'sight-reading', chosen: 'קריאה מהדף', bad: /קריאה ממבט ראשון/ },
  { concept: 'call and response', chosen: 'שאלה ותשובה', bad: /קריאה ותשובה/ },
];
/** Legitimate uses: another meaning, or a spoken alias the player may say. */
const ALLOWED: RegExp[] = [
  /יסודות השמיעה/, // the fundamentals of hearing
  /מיסודות ועד/, // from the basics up
  /בסיס יסודות התחלה/, // words that open the basics (speech)
  /'(שש |מינור שש )?דימיניש'/, // spoken aliases of the diminished
  /קוראים לו גם "דימיניש"/, // the glossary names the jazz word once
];

function files(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.tsx?$/.test(n)) out.push(p);
  }
  return out;
}

describe('Hebrew terminology: one term per concept', () => {
  const src = files(join(ROOT, 'src')).filter((f) => !SKIP.has(relative(ROOT, f).replace(/\\/g, '/')));
  it('no banned variant in any Hebrew string', () => {
    const hits: string[] = [];
    for (const f of src) {
      const lines = readFileSync(f, 'utf-8').split(/\r?\n/);
      lines.forEach((line, i) => {
        let l = line;
        for (const a of ALLOWED) l = l.replace(new RegExp(a.source, 'g'), '');
        for (const b of BANNED) if (b.bad.test(l)) hits.push(`${relative(ROOT, f)}:${i + 1} ${b.concept} → ${b.chosen}`);
        // Counting in Hebrew: 1 אִי וְ אָה (the Latin "1 e & a" stays in English text only).
        if (/(he: |[א-ת][^'`\n]*)['`]?[^'`\n]*\be & a\b/.test(l) && /he: ['`][^'`]*e & a|['`][^'`\n]*[א-ת][^'`\n]*e & a/.test(l)) hits.push(`${relative(ROOT, f)}:${i + 1} counting → 1 אִי וְ אָה`);
      });
    }
    expect(hits).toEqual([]);
  });
  it('the glossary names each chosen term', () => {
    const he = new Set(GLOSSARY.map((t) => t.label.he));
    for (const w of ['שורש', 'צלילים מנחים', 'שלד', 'ספטאקורד', 'מוקטן', 'דף אקורדים', 'כיתור', 'קיק', 'היי־האט', 'מעבר', 'ii–V–I']) expect(he.has(w), w).toBe(true);
    expect(GLOSSARY.find((t) => t.id === 'leading-tone')!.match.he.test('הצלילים המנחים'), 'guide tones are not the leading tone').toBe(false);
  });
});
