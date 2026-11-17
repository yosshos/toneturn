// The studio-look challenge share card (approved element "share_card", 2026-11-17): a 4:5 dark-purple card with the
// logo and "החוש ה־7", Toni listening, who challenges you, the phrase on a light staff panel, the tempo, and a lemon
// CTA. An SVG string (an <img> / PNG source), 540×675. The classic card stays in engine/encore/community.ts.

import { renderToStaticMarkup } from 'react-dom/server';
import { Logo } from '../brand/Logo';
import { ToniPaper } from '../ToniPaper';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
/** Keeps a line inside the card (the text sits beside Toni). */
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const mod = (n: number) => ((n % 12) + 12) % 12;
/** Diatonic staff step of a MIDI pitch. */
const step = (m: number) => Math.floor(m / 12) * 7 + [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6][mod(m)];

/** A component's <svg> placed at (x, y, w, h) inside the card (drops any HTML wrapper). */
function place(markup: string, x: number, y: number, w: number, h: number): string {
  const i = markup.indexOf('<svg');
  const j = markup.lastIndexOf('</svg>');
  if (i < 0 || j < 0) return '';
  const svg = markup.slice(i, j + 6).replace(/^<svg([^>]*?)\swidth="[^"]*"/, '<svg$1').replace(/^<svg([^>]*?)\sheight="[^"]*"/, '<svg$1');
  return svg.replace(/^<svg/, `<svg x="${x}" y="${y}" width="${w}" height="${h}"`);
}

export const STUDIO_CARD = { w: 540, h: 675 } as const;

export function studioShareCardSvg(o: { title: string; by: string; bpm: number; keys: number; level: number; notes: { pitch: number; beat: number }[]; beats: number; meter: number; lang: 'en' | 'he' }): string {
  const { w: W, h: H } = STUDIO_CARD;
  const he = o.lang === 'he';
  const dir = he ? 'rtl' : 'ltr';
  // text-anchor follows the text direction: 'start' is the right edge of RTL text.
  const anchor = 'start';
  const edgeX = he ? W - 36 : 36;
  const font = 'font-family="Rubik, Arial, sans-serif"';
  // the staff panel
  const px = 28;
  const py = 330;
  const pw = W - 56;
  const ph = 190;
  const top = py + 52;
  const gap = 14;
  const e4 = step(64);
  const total = Math.max(1, o.beats);
  const x = (b: number) => px + 74 + (b / total) * (pw - 104);
  const y = (m: number) => Math.max(py + 14, Math.min(py + ph - 14, top + 4 * gap - ((step(m) - e4) * gap) / 2));
  const lines = [0, 1, 2, 3, 4].map((i) => `<line x1="${px + 18}" x2="${px + pw - 18}" y1="${top + i * gap}" y2="${top + i * gap}" stroke="#c9bfd8" stroke-width="1.4"/>`).join('');
  const bars: string[] = [];
  for (let b = o.meter; b < total - 1e-6; b += o.meter) bars.push(`<line x1="${(x(b) - 8).toFixed(1)}" x2="${(x(b) - 8).toFixed(1)}" y1="${top}" y2="${top + 4 * gap}" stroke="#c9bfd8" stroke-width="1.4"/>`);
  const heads = o.notes
    .slice(0, 48)
    .map((n) => {
      const cx = x(n.beat);
      const cy = y(n.pitch);
      const s = step(n.pitch);
      const led: string[] = [];
      const ly = (k: number) => top + 4 * gap - ((k - e4) * gap) / 2;
      for (let k = e4 - 2; k >= s; k -= 2) led.push(`<line x1="${(cx - 11).toFixed(1)}" x2="${(cx + 11).toFixed(1)}" y1="${ly(k)}" y2="${ly(k)}" stroke="#c9bfd8" stroke-width="1.4"/>`);
      for (let k = e4 + 10; k <= s; k += 2) led.push(`<line x1="${(cx - 11).toFixed(1)}" x2="${(cx + 11).toFixed(1)}" y1="${ly(k)}" y2="${ly(k)}" stroke="#c9bfd8" stroke-width="1.4"/>`);
      const up = cy > top + 2 * gap;
      const stem = up ? `<line x1="${(cx + 7).toFixed(1)}" x2="${(cx + 7).toFixed(1)}" y1="${cy.toFixed(1)}" y2="${(cy - 36).toFixed(1)}" stroke="#1e1033" stroke-width="2"/>` : `<line x1="${(cx - 7).toFixed(1)}" x2="${(cx - 7).toFixed(1)}" y1="${cy.toFixed(1)}" y2="${(cy + 36).toFixed(1)}" stroke="#1e1033" stroke-width="2"/>`;
      return `${led.join('')}<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="8" ry="5.8" transform="rotate(-20 ${cx.toFixed(1)} ${cy.toFixed(1)})" fill="#1e1033"/>${stem}`;
    })
    .join('');
  const toni = place(renderToStaticMarkup(<ToniPaper state="listen" size={150} />), he ? W - 190 : 28, 128, 160, 160);
  const logo = place(renderToStaticMarkup(<Logo size={64} variant="paper" />), he ? W - 92 : 28, 30, 64, 64);
  const bx = he ? W - 106 : 106;
  const tx = he ? W - 200 : 200;
  const brand = he ? 'החוש ה־7' : 'The 7th Sense';
  const kind = he ? 'אתגר הדרן' : 'Encore challenge';
  const who = he ? `${o.by} מאתגר/ת אותך` : `${o.by} challenges you`;
  const tempo = he ? `♩${o.bpm} · ${o.keys} סולמות` : `♩${o.bpm} · ${o.keys} keys`;
  const foot = he ? `רמה ${o.level}` : `Level ${o.level}`;
  const cta = he ? 'לנסות את המשפט' : 'Try the phrase';
  const ctaW = 190;
  const ctaX = he ? 28 : W - 28 - ctaW;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`,
    `<defs><linearGradient id="sc-bg" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#2b0d5e"/><stop offset="1" stop-color="#4a1d96"/></linearGradient></defs>`,
    `<rect width="${W}" height="${H}" rx="36" fill="url(#sc-bg)"/>`,
    logo,
    `<text x="${bx}" y="58" text-anchor="${anchor}" ${font} font-size="26" font-weight="700" fill="#ffffff" direction="${dir}">${esc(brand)}</text>`,
    `<text x="${bx}" y="86" text-anchor="${anchor}" ${font} font-size="18" fill="#cbbcf2" direction="${dir}">${esc(kind)}</text>`,
    toni,
    `<text x="${tx}" y="186" text-anchor="${anchor}" ${font} font-size="19" fill="#cbbcf2" direction="${dir}">${esc(clip(who, 26))}</text>`,
    `<text x="${tx}" y="226" text-anchor="${anchor}" ${font} font-size="30" font-weight="700" fill="#ffffff" direction="${dir}">${esc(clip(o.title, 18))}</text>`,
    `<text x="${tx}" y="262" text-anchor="${anchor}" ${font} font-size="21" font-weight="600" fill="#ffd43b" direction="${dir}">${esc(tempo)}</text>`,
    `<rect x="${px}" y="${py + 4}" width="${pw}" height="${ph}" rx="22" fill="#12052e" opacity="0.5"/>`,
    `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="22" fill="#fbf8ff"/>`,
    lines,
    `<text x="${px + 20}" y="${top + 4 * gap + 12}" font-family="'Noto Music', serif" font-size="66" fill="#1e1033">&#x1D11E;</text>`,
    bars.join(''),
    `<rect x="${px + pw - 26}" y="${top}" width="2" height="${4 * gap}" fill="#1e1033"/><rect x="${px + pw - 21}" y="${top}" width="5" height="${4 * gap}" fill="#1e1033"/>`,
    heads,
    `<text x="${edgeX}" y="${H - 52}" text-anchor="${anchor}" ${font} font-size="18" fill="#cbbcf2" direction="${dir}">${esc(foot)}</text>`,
    `<rect x="${ctaX}" y="${H - 86}" width="${ctaW}" height="52" rx="16" fill="#c98a00"/>`,
    `<rect x="${ctaX}" y="${H - 90}" width="${ctaW}" height="52" rx="16" fill="#ffd43b"/>`,
    `<text x="${ctaX + ctaW / 2}" y="${H - 57}" text-anchor="middle" ${font} font-size="19" font-weight="700" fill="#1e1033" direction="${dir}">${esc(cta)}</text>`,
    `</svg>`,
  ].join('');
}
