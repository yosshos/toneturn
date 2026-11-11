import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NO_REFERENCE, REFERENCES, keyLabel, referenceOf } from '../src/content/references';
import { STANDARD_CHANGES } from '../src/engine/standards';
import { BASS_STD } from '../src/engine/drills/bass';
import { standardIdOfSpec, standardOfSpec } from '../src/engine/drills/standardRef';
import { ListenIcons, ListenOriginal } from '../src/ui/ListenOriginal';

describe('reference recordings data', () => {
  it('every standard in standards.ts has a reference or is listed as a practice form (never both)', () => {
    for (const s of STANDARD_CHANGES) {
      const has = !!REFERENCES[s.id];
      const none = s.id in NO_REFERENCE;
      expect(has !== none, s.id).toBe(true);
    }
    for (const id of [...Object.keys(REFERENCES), ...Object.keys(NO_REFERENCE)]) expect(STANDARD_CHANGES.some((s) => s.id === id), id).toBe(true);
  });

  it('every standard used by a level (bass walking, piano chart drills) is in standards.ts, and the named tunes all have references', () => {
    for (const b of BASS_STD) expect(STANDARD_CHANGES.some((s) => s.id === b.id), b.id).toBe(true);
    const src = readFileSync('src/engine/drills/generate.ts', 'utf8');
    const used = [...src.matchAll(/'std:([\w-]+)'/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(5);
    for (const id of used) expect(referenceOf(id), id).not.toBeNull();
  });

  it('each reference has ≥1 recording with a key, a year and well-formed Spotify / YouTube links', () => {
    for (const r of Object.values(REFERENCES)) {
      expect(r.recordings.length, r.id).toBeGreaterThanOrEqual(1);
      expect(r.recordings.length, r.id).toBeLessThanOrEqual(2);
      for (const x of r.recordings) {
        expect(x.key.pc, r.id).toBeGreaterThanOrEqual(0);
        expect(x.key.pc, r.id).toBeLessThan(12);
        expect(x.year, r.id).toBeGreaterThan(1900);
        expect(x.artist.length, r.id).toBeGreaterThan(2);
        const sp = new URL(x.spotify);
        expect(sp.protocol + sp.host, r.id).toBe('https:open.spotify.com');
        expect(sp.pathname.startsWith('/search/') || /^\/(track|album)\//.test(sp.pathname), r.id).toBe(true);
        const yt = new URL(x.youtube);
        expect(yt.protocol, r.id).toBe('https:');
        expect(['www.youtube.com', 'youtu.be'], r.id).toContain(yt.host);
        if (yt.pathname === '/results') expect(yt.searchParams.get('search_query'), r.id).toBeTruthy();
        expect(x.spotify + x.youtube, r.id).not.toMatch(/\s/);
      }
    }
  });

  it('the app key of each reference matches the key the bass levels measure in', () => {
    for (const b of BASS_STD) {
      const r = REFERENCES[b.id];
      if (!r) continue;
      expect(r.appKey.pc, b.id).toBe(b.key);
      expect(!!r.appKey.minor, b.id).toBe(!!b.minor);
    }
  });

  it('key labels read well in both languages', () => {
    expect(keyLabel({ pc: 7, minor: true }, 'en')).toBe('G minor');
    expect(keyLabel({ pc: 3 }, 'he')).toBe('E♭ מז׳ור');
    expect(keyLabel(REFERENCES['so-what'].appKey, 'en')).toBe('D dorian');
  });
});

describe('which standard a drill practises', () => {
  it('piano chart drills and bass walking levels resolve to their standard', () => {
    expect(standardIdOfSpec({ family: 'voicings', kind: 'chart~std:autumn~rootless~charleston~comp' })).toBe('autumn');
    expect(standardIdOfSpec({ family: 'b-walk', kind: 'standard', option: 3 })).toBe(BASS_STD[3].id);
    expect(standardIdOfSpec({ family: 'scales', kind: 'scale' })).toBeNull();
    const p = standardOfSpec({ family: 'voicings', kind: 'chart~std:fly~drop3~whole~comp', key: 2 });
    expect(p?.key.pc).toBe(2);
    const b = standardOfSpec({ family: 'b-walk', kind: 'standard', option: BASS_STD.findIndex((x) => x.id === 'ipanema'), key: 0 });
    expect(b?.key.pc).toBe(5);
  });
});

describe('Listen to the original row', () => {
  it('renders two outbound links per recording, opened in a new tab, with artist · year · key', () => {
    const html = renderToStaticMarkup(h(ListenOriginal, { id: 'autumn', lang: 'en' }));
    expect(html).toContain('data-listen="autumn"');
    expect(html).toContain('Listen to the original');
    expect(html).toContain('Cannonball Adderley · 1958 · G minor');
    expect((html.match(/target="_blank"/g) ?? []).length).toBe(2 * REFERENCES.autumn.recordings.length);
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('https://open.spotify.com/search/');
    expect(html).toContain('https://www.youtube.com/results?search_query=');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('<audio');
  });
  it('a key that differs from the practice key gets a note and a practise-in button (Hebrew too)', () => {
    const html = renderToStaticMarkup(h(ListenOriginal, { id: 'ipanema', lang: 'he', onPractiseIn: () => undefined }));
    expect(html).toContain('data-listen-key-differs="1"');
    expect(html).toContain('להאזנה למקור');
    expect(html).toContain('data-listen-practise="1"');
    const same = renderToStaticMarkup(h(ListenOriginal, { id: 'misty', lang: 'en', onPractiseIn: () => undefined }));
    expect(same).not.toContain('data-listen-key-differs');
  });
  it('forms say so; unknown ids and practice forms render nothing; list icons render', () => {
    expect(renderToStaticMarkup(h(ListenOriginal, { id: 'blues-f', lang: 'en' }))).toContain('A famous tune on this form');
    expect(renderToStaticMarkup(h(ListenOriginal, { id: 'two-five-keys', lang: 'en' }))).toBe('');
    expect(renderToStaticMarkup(h(ListenOriginal, { id: 'nope', lang: 'en' }))).toBe('');
    expect(renderToStaticMarkup(h(ListenIcons, { id: 'giant', lang: 'en' }))).toContain('data-listen-youtube="1"');
  });
});
