import { describe, expect, it } from 'vitest';
import { catalogue, chooseVoice, voiceGender, voicesFor, type VoiceLike } from '../src/speech/voices';
import { DEFAULT_SETTINGS, migrateSettings, namingFor } from '../src/storage/progress';
import { narration } from '../src/game/narration';
import { pc, spokenMajorKey, spokenNote, type Naming } from '../src/engine/pitch';
import { parseNoteName } from '../src/engine/parser';

const v = (name: string, lang: string, extra: Partial<VoiceLike> = {}): VoiceLike => ({
  name,
  lang,
  voiceURI: `${name}|${lang}`,
  localService: true,
  default: false,
  ...extra,
});

const DEVICE: VoiceLike[] = [
  v('Microsoft David - English (United States)', 'en-US'),
  v('Microsoft Zira - English (United States)', 'en-US'),
  v('Microsoft Aria Online (Natural) - English (United States)', 'en-US', { localService: false }),
  v('Microsoft Guy Online (Natural) - English (United States)', 'en-US', { localService: false }),
  v('Google UK English Male', 'en-GB', { localService: false }),
  v('Google UK English Female', 'en-GB', { localService: false }),
  v('Microsoft Asaf - Hebrew (Israel)', 'he-IL'),
  v('Microsoft Hila Online (Natural) - Hebrew (Israel)', 'he-IL', { localService: false }),
  v('Carmit', 'he_IL'),
  v('Microsoft Hortense - French (France)', 'fr-FR'),
];

describe('voice gender detection', () => {
  it.each([
    ['Microsoft David - English (United States)', 'male'],
    ['Microsoft Zira - English (United States)', 'female'],
    ['Microsoft Aria Online (Natural) - English (United States)', 'female'],
    ['Microsoft Guy Online (Natural) - English (United States)', 'male'],
    ['Google UK English Male', 'male'],
    ['Google UK English Female', 'female'],
    ['Google US English', 'female'],
    ['Microsoft Asaf - Hebrew (Israel)', 'male'],
    ['Microsoft Hila Online (Natural) - Hebrew (Israel)', 'female'],
    ['Microsoft Avri Online (Natural) - Hebrew (Israel)', 'male'],
    ['Carmit', 'female'],
    ['Samantha', 'female'],
    ['Some Robot Voice', 'unknown'],
  ])('%s → %s', (name, g) => expect(voiceGender({ name })).toBe(g));
});

describe('voice selection', () => {
  it('filters by language, including iw / underscore tags', () => {
    expect(voicesFor(DEVICE, 'he').map((x) => x.name)).toHaveLength(3);
    expect(voicesFor(DEVICE, 'en')).toHaveLength(6);
  });
  it('ranks natural voices first', () => {
    expect(catalogue(DEVICE, 'en')[0].voice.name).toMatch(/Natural/);
  });
  it('exact URI wins', () => {
    const z = DEVICE[1];
    expect(chooseVoice(DEVICE, 'en', z.voiceURI, 'male')?.name).toBe(z.name);
  });
  it('gender preference picks the best voice of that gender', () => {
    expect(voiceGender(chooseVoice(DEVICE, 'en', null, 'male')!)).toBe('male');
    expect(voiceGender(chooseVoice(DEVICE, 'en', null, 'female')!)).toBe('female');
    expect(chooseVoice(DEVICE, 'he', null, 'female')?.name).toMatch(/Hila/);
    expect(chooseVoice(DEVICE, 'he', null, 'male')?.name).toMatch(/Asaf/);
  });
  it('missing chosen voice falls back to gender, then any', () => {
    expect(voiceGender(chooseVoice(DEVICE, 'en', 'gone|en-US', 'male')!)).toBe('male');
    const onlyMale = [DEVICE[0]];
    expect(chooseVoice(onlyMale, 'en', null, 'female')?.name).toMatch(/David/);
  });
  it('null when the language has no voice', () => {
    expect(chooseVoice([DEVICE[0]], 'he', null, 'any')).toBeNull();
  });
});

describe('language defaults and naming', () => {
  it('English is the default language', () => {
    expect(DEFAULT_SETTINGS.uiLang).toBe('en');
    expect(DEFAULT_SETTINGS.inputLang).toBe('en');
    expect(DEFAULT_SETTINGS.outputLang).toBe('en');
    expect(DEFAULT_SETTINGS.naming).toBe('auto');
  });
  it('auto naming: Hebrew → Do-Re-Mi, English → letters; overrides respected', () => {
    expect(namingFor('auto', 'he')).toBe('solfege');
    expect(namingFor('auto', 'en')).toBe('letter');
    expect(namingFor('letter', 'he')).toBe('letter');
    expect(namingFor('solfege', 'en')).toBe('solfege');
  });
  it('migrates v1 first-run defaults to v2', () => {
    const m = migrateSettings({ uiLang: 'he', inputLang: 'he', outputLang: 'he', naming: 'letter', mode: 'buttons', voiceConsent: true } as never);
    expect(m.version).toBe(2);
    expect(m.uiLang).toBe('en');
    expect(m.naming).toBe('auto');
    expect(m.mode).toBe('buttons');
    expect(m.voiceConsent).toBe(true);
  });
  it('keeps v2 choices and fills new fields', () => {
    const m = migrateSettings({ version: 2, uiLang: 'he', voices: { he: 'x' } } as never);
    expect(m.uiLang).toBe('he');
    expect(m.voices).toEqual({ he: 'x', en: null });
  });
});

describe('Hebrew uses דיאז / במול in every combination', () => {
  const namings: Naming[] = ['letter', 'solfege'];
  const notes = ['Bb', 'Eb', 'F#', 'C#', 'Ab'].map(pc);
  it('spoken notes and keys', () => {
    for (const nm of namings) {
      for (const n of notes) {
        const he = spokenNote(n, nm, 'he') + ' ' + spokenMajorKey(n, nm, 'he');
        expect(he).not.toMatch(/פלאט|שארפ/);
        expect(he).toMatch(/במול|דיאז/);
      }
    }
  });
  it('all narration lines, 2 output langs × 2 namings', () => {
    const bb = pc('Bb');
    const eb = pc('Eb');
    for (const l of ['he', 'en'] as const) {
      for (const nm of namings) {
        const lines = [
          narration.introBb(l, nm, bb, bb),
          narration.introEb(l, nm, eb, bb),
          narration.roundPrompt(l, nm, 1, eb),
          narration.reveal(l, nm, 5, eb, bb),
        ].join(' ');
        if (l === 'he') {
          expect(lines).not.toMatch(/פלאט|שארפ|flat|sharp/);
          expect(lines).toContain(nm === 'solfege' ? 'סי במול' : 'בי במול');
        } else {
          expect(lines).toContain(nm === 'solfege' ? 'Si flat' : 'B flat');
        }
      }
    }
  });
  it('spoken Hebrew answers with דיאז/במול parse in both vocabularies', () => {
    const p = (s: string, vocab: 'letter' | 'solfege') => {
      const r = parseNoteName(s, vocab);
      return r.kind === 'answer' ? `${r.value.letter}${r.value.acc}` : r.kind;
    };
    expect(p('סי במול', 'solfege')).toBe('B-1');
    expect(p('בי במול', 'letter')).toBe('B-1');
    expect(p('פה דיאז', 'solfege')).toBe('F1');
    expect(p('אף דיאז', 'letter')).toBe('F1');
    expect(p('בי פלאט', 'letter')).toBe('B-1'); // tolerated alias, never produced
  });
});
