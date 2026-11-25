// Writes scripts/voice/.lines.json: every English narrator line known ahead of time, cleaned for speech and keyed
// the way the app looks it up. Usage: npm run voice:lines   (then: npm run voice:render)
// Also prints a saturation check: how many new lines the generators still produce with more seeds.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { setCatalog, translate } from '../../src/i18n/translate';
import type { LocaleCode } from '../../src/i18n/locales';
import { distinct, harvestLessons, memoryLines, miniLines, openerLines, previewLines, type VoiceLine } from '../../src/speech/voice/lines';
import { speakable } from '../../src/speech/speakable';
import { LOCALE_VOICES, voiceKey } from '../../src/speech/voice/manifest';
import type { SpeechLang } from '../../src/speech/speakable';

const SEEDS = Number(process.env.SEEDS ?? 120);
const groups: [string, VoiceLine[]][] = [
  ['mini', miniLines()],
  ['preview', previewLines()],
  ['opener', openerLines()],
  ['memory', memoryLines()],
  ['lessons', harvestLessons(SEEDS)],
];
const half = distinct(harvestLessons(Math.floor(SEEDS / 2))).length;

const all = distinct(groups.flatMap(([, l]) => l));
const rows = all
  .map((l) => ({ key: voiceKey(l.text), say: speakable(l.text, 'en'), src: l.src }))
  .filter((r) => r.say.trim());
const byKey = new Map(rows.map((r) => [r.key, r]));
// Priority: what a player hears first (mini-lessons, intros), then the rest.
const order = ['coach', 'mini', 'mini-name', 'intro', 'go', 'opener', 'preview', 'memory', 'other', 'prompt', 'feedback'];
const out = [...byKey.values()].sort((a, b) => order.indexOf(a.src) - order.indexOf(b.src));
writeFileSync(new URL('./.lines.json', import.meta.url), JSON.stringify(out));

const count = (src: string) => out.filter((r) => r.src === src);
const words = (rs: typeof out) => rs.reduce((n, r) => n + r.say.split(/\s+/).length, 0);
const mins = (rs: typeof out) => (words(rs) / 150).toFixed(1); // ~150 spoken words per minute
for (const s of order) console.log(`${s.padEnd(10)} ${String(count(s).length).padStart(6)} lines  ~${mins(count(s))} min`);
console.log(`total      ${String(out.length).padStart(6)} lines  ~${mins(out)} min`);
console.log(`lesson lines: ${distinct(harvestLessons(SEEDS)).length} with ${SEEDS} seeds, ${half} with ${Math.floor(SEEDS / 2)}`);
// saturation per family: a family whose count stops growing with more seeds is finite (and worth recording)
const fam = (seeds: number) => {
  const d = distinct(harvestLessons(seeds));
  return Object.fromEntries(['intro', 'go', 'prompt', 'feedback'].map((s) => [s, d.filter((l) => l.src === s).length]));
};
console.log('per family (½ seeds → all seeds):', JSON.stringify(fam(Math.floor(SEEDS / 2))), '→', JSON.stringify(fam(SEEDS)));

// The translated locales with a voice of their own (src/speech/voice/manifest.ts LOCALE_VOICES): the same fixed lines,
// translated exactly as the app translates them on screen, keyed the way the app looks them up in public/voice/<loc>/.
// Lines the catalog doesn't cover yet, and lines with a part shown but never spoken, are left out (the app reads them).
// → scripts/voice/.lines.<loc>.json   (then: npm run voice:render -- --lang <loc>)
const FIXED = new Set(['coach', 'mini', 'mini-name', 'intro', 'go', 'opener', 'preview', 'memory', 'other']);
for (const [loc, voice] of Object.entries(LOCALE_VOICES) as [SpeechLang, string][]) {
  const file = new URL(`../../public/i18n/${loc}.json`, import.meta.url);
  if (!existsSync(file)) continue;
  setCatalog(loc as LocaleCode, JSON.parse(readFileSync(file, 'utf8')));
  const seen = new Map<string, { key: string; say: string; src: string }>();
  let missing = 0;
  for (const l of all) {
    if (!FIXED.has(l.src)) continue;
    if (/[⟦⟧]/.test(l.text)) continue;
    const t = translate(l.text);
    if (t === l.text) {
      missing++;
      continue;
    }
    const key = voiceKey(t, voice, loc);
    const say = speakable(t, loc);
    if (say.trim() && !seen.has(key)) seen.set(key, { key, say, src: l.src });
  }
  setCatalog(null, null);
  const rows = [...seen.values()].sort((a, b) => order.indexOf(a.src) - order.indexOf(b.src));
  writeFileSync(new URL(`./.lines.${loc}.json`, import.meta.url), JSON.stringify(rows));
  console.log(`${loc} (${voice}): ${rows.length} lines to record ~${mins(rows as typeof out)} min, ${missing} not translated yet`);
}
