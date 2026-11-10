// Writes scripts/voice/.lines.json: every English narrator line known ahead of time, cleaned for speech and keyed
// the way the app looks it up. Usage: npm run voice:lines   (then: npm run voice:render)
// Also prints a saturation check: how many new lines the generators still produce with more seeds.

import { writeFileSync } from 'node:fs';
import { distinct, harvestLessons, memoryLines, miniLines, previewLines, type VoiceLine } from '../../src/speech/voice/lines';
import { speakable } from '../../src/speech/speakable';
import { voiceKey } from '../../src/speech/voice/manifest';

const SEEDS = Number(process.env.SEEDS ?? 120);
const groups: [string, VoiceLine[]][] = [
  ['mini', miniLines()],
  ['preview', previewLines()],
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
const order = ['mini', 'mini-name', 'intro', 'go', 'preview', 'memory', 'other', 'prompt', 'feedback'];
const out = [...byKey.values()].sort((a, b) => order.indexOf(a.src) - order.indexOf(b.src));
writeFileSync(new URL('./.lines.json', import.meta.url), JSON.stringify(out));

const count = (src: string) => out.filter((r) => r.src === src);
const words = (rs: typeof out) => rs.reduce((n, r) => n + r.say.split(/\s+/).length, 0);
const mins = (rs: typeof out) => (words(rs) / 150).toFixed(1); // ~150 spoken words per minute
for (const s of order) console.log(`${s.padEnd(10)} ${String(count(s).length).padStart(6)} lines  ~${mins(count(s))} min`);
console.log(`total      ${String(out.length).padStart(6)} lines  ~${mins(out)} min`);
console.log(`lesson lines: ${distinct(harvestLessons(SEEDS)).length} with ${SEEDS} seeds, ${half} with ${Math.floor(SEEDS / 2)}`);
