// docs/SPEC-I18N.md: the translated locales translate at the screen from a catalog keyed by the English text.
import { afterEach, describe, expect, it } from 'vitest';
import { setCatalog, translate, active, missing } from '../src/i18n/translate';
import { tr } from '../src/i18n/jsx/jsx-runtime';
import { baseOf, isTranslated, localeFromBrowser, LOCALES } from '../src/i18n/locales';

afterEach(() => setCatalog(null, null));

describe('the translator', () => {
  it('is off for Hebrew and English: texts pass through untouched', () => {
    setCatalog('en', { Practice: 'X' });
    expect(active()).toBe(false);
    expect(translate('Practice')).toBe('Practice');
  });
  it('exact texts, kept spaces, patterns with numbered and named fill-ins (moved by the translation)', () => {
    setCatalog('es', { Practice: 'Práctica', 'Level {0}': 'Nivel {0}', 'Hi {name}!': '¡Hola, {name}!', '{0} of {1} bars': '{1} compases, van {0}', Settings: 'Ajustes', 'Open {0}': 'Abrir {0}' });
    expect(active()).toBe(true);
    expect(translate('Practice')).toBe('Práctica');
    expect(translate(' Practice ')).toBe(' Práctica ');
    expect(translate('Level 12')).toBe('Nivel 12');
    expect(translate('Hi Dana!')).toBe('¡Hola, Dana!');
    expect(translate('3 of 8 bars')).toBe('8 compases, van 3');
    // a fill-in that is itself a known text is translated too
    expect(translate('Open Settings')).toBe('Abrir Ajustes');
  });
  it('music stays as written: chords, notes, numerals, numbers; a miss is English and logged', () => {
    setCatalog('fr', { Cmaj7: 'NO', 'ii–V–I': 'NO' });
    for (const s of ['Cmaj7', 'G7', 'Dm7', 'Bb', 'C#m7b5', 'IV', 'vi', '120', '0.127.1']) expect(translate(s)).toBe(s);
    expect(translate('Some new text')).toBe('Some new text');
    expect(missing()).toContain('Some new text');
  });
  it('the JSX step: DOM elements only, children and readable attributes, translate="no" respected', () => {
    setCatalog('de', { Close: 'Schließen', Play: 'Spielen', English: 'Englisch' });
    expect(tr('button', { children: 'Play', 'aria-label': 'Close', className: 'Play' })).toEqual({ children: 'Spielen', 'aria-label': 'Schließen', className: 'Play' });
    expect(tr('p', { children: ['Play', 3, ' Close'] })).toEqual({ children: ['Spielen', 3, ' Schließen'] });
    const comp = () => null;
    const props = { children: 'Play' };
    expect(tr(comp, props)).toBe(props);
    expect(tr('option', { children: 'English', translate: 'no' }).children).toBe('English');
  });
});

describe('locales', () => {
  it('ten languages, Hebrew right to left, the translated ones run on English', () => {
    expect(LOCALES.map((l) => l.code)).toEqual(['he', 'en', 'es', 'pt', 'fr', 'de', 'it', 'ja', 'ko', 'zh']);
    expect(LOCALES.filter((l) => l.dir === 'rtl').map((l) => l.code)).toEqual(['he']);
    expect(baseOf('es')).toBe('en');
    expect(baseOf('he')).toBe('he');
    expect(isTranslated('en')).toBe(false);
    expect(isTranslated('ja')).toBe(true);
  });
  it('the browser picks the first language the app has', () => {
    expect(localeFromBrowser(['pt-BR', 'en'])).toBe('pt');
    expect(localeFromBrowser(['iw'])).toBe('he');
    expect(localeFromBrowser(['ru', 'de-AT'])).toBe('de');
    expect(localeFromBrowser(['ru'])).toBe('en');
  });
});
