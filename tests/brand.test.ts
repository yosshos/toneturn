import { describe, expect, it } from 'vitest';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Logo } from '../src/ui/brand/Logo';
import { decideSplash, isStudioLook, localDay, splashLang, type SplashEnv } from '../src/ui/brand/splashDecision';

const env = (o: Partial<SplashEnv> = {}): SplashEnv => ({
  search: '?look=studio',
  hash: '',
  webdriver: false,
  look: null,
  reducedMotion: false,
  lastDay: null,
  today: '2026-11-17',
  ...o,
});

describe('splash decision', () => {
  it('shows on the first open of the day, home screen, studio look', () => {
    expect(decideSplash(env())).toEqual({ show: true, mode: 'full' });
    expect(decideSplash(env({ search: '', look: 'studio' }))).toEqual({ show: true, mode: 'full' });
    for (const hash of ['#', '#/', '#/home']) expect(decideSplash(env({ hash })).show, hash).toBe(true);
  });
  it('once per local day', () => {
    expect(decideSplash(env({ lastDay: '2026-11-17' }))).toEqual({ show: false, reason: 'today' });
    expect(decideSplash(env({ lastDay: '2026-11-16' })).show).toBe(true);
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
  it('only with the studio look', () => {
    expect(decideSplash(env({ search: '' }))).toEqual({ show: false, reason: 'look' });
    expect(decideSplash(env({ search: '?look=classic', look: 'classic' })).show).toBe(false);
    expect(isStudioLook('studio', '')).toBe(true);
    expect(isStudioLook(undefined, '?a=1&look=studio')).toBe(true);
  });
  it('never in automated runs, unless ?splash=force (which still keeps the once-a-day rule)', () => {
    expect(decideSplash(env({ webdriver: true }))).toEqual({ show: false, reason: 'webdriver' });
    expect(decideSplash(env({ webdriver: true, search: '?look=studio&splash=1' })).show).toBe(false);
    expect(decideSplash(env({ webdriver: true, search: '?look=studio&splash=force' })).show).toBe(true);
    expect(decideSplash(env({ webdriver: true, search: '?look=studio&splash=force', lastDay: '2026-11-17' })).show).toBe(false);
  });
  it('?nosplash wins over everything', () => {
    expect(decideSplash(env({ search: '?look=studio&nosplash' }))).toEqual({ show: false, reason: 'nosplash' });
    expect(decideSplash(env({ search: '?look=studio&splash=force&nosplash', webdriver: true })).show).toBe(false);
  });
  it('a deep link (hash route other than home) skips it', () => {
    for (const hash of ['#/path', '#/settings/sound', '#/encore?x=1', '#/digest/abc'])
      expect(decideSplash(env({ hash })), hash).toEqual({ show: false, reason: 'deeplink' });
  });
  it('reduced motion: the still final frame', () => {
    expect(decideSplash(env({ reducedMotion: true }))).toEqual({ show: true, mode: 'still' });
  });
  it('language: ?lang, then the app setting, then the device', () => {
    expect(splashLang('?lang=en', { lang: 'he' }, 'he-IL')).toBe('en');
    expect(splashLang('', { lang: 'he' }, 'en-US')).toBe('he');
    expect(splashLang('', {}, 'he-IL')).toBe('he');
    expect(splashLang('', {}, 'fr-FR')).toBe('en');
  });
});

describe('Logo', () => {
  it('renders the Paper mark on its tile, decorative by default', () => {
    const html = renderToStaticMarkup(h(Logo, { size: 40 }));
    expect(html).toContain('viewBox="0 0 120 120"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('fill="#2b0d5e"'); // tile
    expect(html).toContain('stroke="#ffd43b"'); // the 7
    expect(html).toContain('stroke="#c98a00"'); // its paper edge
    expect(html).toContain('stroke="#c4b5fd"'); // bars
    expect(html.match(/<ellipse/g)?.length).toBe(2); // head + edge copy
  });
  it('small sizes drop the edge copies; a title makes it an image', () => {
    const html = renderToStaticMarkup(h(Logo, { size: 16, title: 'The 7th Sense' }));
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="The 7th Sense"');
    expect(html).not.toContain('#c98a00');
    expect(html.match(/<ellipse/g)?.length).toBe(1);
  });
  it('light variant and no tile', () => {
    const html = renderToStaticMarkup(h(Logo, { variant: 'light', tile: false }));
    expect(html).not.toContain('<rect');
    expect(html).toContain('#6d28d9');
  });
});
