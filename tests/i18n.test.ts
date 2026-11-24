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

describe('patterns never tear a sentence', () => {
  afterEach(() => setCatalog(null, null));
  it('an open pattern with one word, a lone function word, a fill-in that swallowed a sentence: all left as they are', () => {
    setCatalog('es', { '{0} in {1}': '{0} en {1}', in: 'en', 'Level {0}': 'Nivel {0}', '{0} bars': '{0} compases', 'Open {0}': 'Abrir {0}' });
    expect(translate('Hear what is going on in the music: chords, keys and the moves of jazz harmony.')).toBe('Hear what is going on in the music: chords, keys and the moves of jazz harmony.');
    expect(translate('in')).toBe('in');
    expect(translate('Level 4')).toBe('Nivel 4');
    expect(translate('8 bars')).toBe('8 compases');
    expect(translate('Open the long list of every chord you have played this week')).toBe('Open the long list of every chord you have played this week');
  });
});

describe('English plural endings in fill-ins', () => {
  afterEach(() => setCatalog(null, null));
  it('"{0} hesitation{1}" reads right in the locale for one and for many', () => {
    setCatalog('it', { '{0} hesitation{1}': '{0} esitazione{1}' });
    expect(translate('1 hesitation')).toBe('1 esitazione');
    expect(translate('3 hesitations')).toBe('3 esitazione');
  });
});

describe('texts the screens put together', () => {
  afterEach(() => setCatalog(null, null));
  it('a numbered title and parts joined by a middle dot are translated part by part', () => {
    setCatalog('es', { 'Sing it by name': 'Cántalo por su nombre', Repertoire: 'Repertorio', 'Your first standard': 'Tu primer standard' });
    expect(translate('12. Sing it by name')).toBe('12. Cántalo por su nombre');
    expect(translate('Your first standard · 0/5')).toBe('Tu primer standard · 0/5');
    expect(translate('Repertoire · Your first standard')).toBe('Repertorio · Tu primer standard');
    expect(translate('3. Unknown title')).toBe('3. Unknown title');
  });
});

describe('a name with a running number', () => {
  afterEach(() => setCatalog(null, null));
  it('"High or low 2" keeps its number', () => {
    setCatalog('de', { 'High or low': 'Hoch oder tief' });
    expect(translate('High or low 2')).toBe('Hoch oder tief 2');
    expect(translate('Unknown 3')).toBe('Unknown 3');
  });
});
