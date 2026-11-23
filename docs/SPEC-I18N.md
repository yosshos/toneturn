# SPEC-I18N: ten screen languages

**Owner decision (2026-11-22):** English, Hebrew, Spanish, Portuguese (Brazil), French, German, Italian, Japanese,
Korean and Chinese (Simplified). On-device voice for en, es, pt, fr, it, ja and zh. Each new language is beta until a
native speaker reviews it, and that review happens before paid launch. Polish is optional; ask the owner.

## 1. Architecture: translate at the screen

The code already holds every text twice, Hebrew and English, in about 1,800 language choices and 16,000 paired
values across roughly 300k lines. Rewriting all of that per language would touch nearly every file and would have to
be redone for each new text. Instead:

- **Hebrew and English** stay as they are: authored in the code, with no translation step.
- **The other eight** run the app in English underneath (`settings.uiLang = 'en'`, `settings.locale = 'es'`…). Text is
  translated only on its way to the screen:
  - **`src/i18n/jsx/jsx-runtime.ts`** is the app's JSX runtime (`jsxImportSource: '@tt/jsx'`, wired in
    `vite.config.ts` and `tsconfig.json`). On a DOM element it passes each text child, and the readable attributes
    (aria-label, title, placeholder, alt, label…), through `translate()`. Components receive their props unchanged,
    so data and ids are never translated.
  - **`translate()`** in `src/i18n/translate.ts`:
    1. exact match first;
    2. then patterns: a key such as `Level {0}` or `Hi {name}!` matches the built text and keeps the fill-in;
    3. music stays as written: chords, note names, Roman numerals and numbers;
    4. a miss stays English and is listed by `window.__i18nMisses()` for QA.
  - **`translate="no"`** on an element (the HTML attribute) keeps its text as written: a language's own name, a song
    title.
  - **Other exits** call `translate()` themselves: speech, document title, canvas text and notifications. See §5.
- **Locales** are listed in `src/i18n/locales.ts`: name, tag, direction, default note naming, voice and beta flag.
- **Boot:** `src/i18n/boot.tsx` keeps the last locale in `localStorage` (`tt-locale`). `?lang=xx` forces one for a
  visit. The catalog loads before the first frame, so a Spanish player never sees English flash by. Changing the
  locale re-mounts the app tree.
- **Catalogs** are `public/i18n/<code>.json` (`{ English: translation }`). They are fetched, not bundled, so only the
  chosen language downloads and the app's own files stay the same size. The service worker keeps the last copy for
  offline use (network-first).

## 2. Where the source texts come from

`node scripts/i18n-extract.mjs` writes `i18n/source.json` from every text the code pairs with Hebrew:

- an `en` property, and all the text under it;
- a table named `en`, `E` or `EN`;
- the non-Hebrew side of a Hebrew/English choice.

A template literal becomes a pattern. At 0.127 this gives 18,941 texts and about 227k words. Re-run the script after
adding texts. The status line shows what each locale still lacks.

## 3. Note names and formats

- **Note names on "auto"** follow the locale (`LocaleInfo.naming`):
  - solfège: es, pt, fr, it;
  - German letters with H: de;
  - letters: ja, ko, zh.
- **Notes written into prose** follow `i18n/GLOSSARY.md`. Chord symbols and Roman numerals are never changed.
- **Dates and numbers** use `Intl` with the locale's tag.

## 4. Translation pipeline

1. Run `node scripts/i18n-batch.mjs <code>`. It writes `i18n/work/<code>/in-NNN.json` with about 350 texts each.
2. A translator (Claude, then a native reviewer) writes `out-NNN.json`, following `i18n/GLOSSARY.md`.
3. Run `node scripts/i18n-merge.mjs <code>`. It checks each entry and refuses it if:
   - the English is not a known source text;
   - the translation is empty;
   - a fill-in was lost or changed;
   - it contains Hebrew.

   It then writes the sorted catalog.
4. QA:
   - open `?lang=<code>`, walk the main screens and read `__i18nMisses()`;
   - check the overflow e2e at phone width, since translations run longer.

## 5. Still to do, in order

1. Prove the core on screen: a Spanish catalog, then e2e at phone width (`?lang=es`) for overflow and misses.
2. Translate es, then pt, fr, it, de, ja, ko and zh.
3. Make note naming on "auto" follow the locale (`namingFor`).
4. Update the speech exits:
   - the narrator speaks the translated line when the locale has a voice (Kokoro packs per language, hosted outside
     the site);
   - without a voice, spoken-only lines show as text.
5. Give answer-by-voice (speech recognition) the locale's language tag, and the locale's words for note names.
6. Make `Intl` dates and numbers use the locale tag (45 places).
7. Fix the texts built by concatenating fragments, which miss as patterns. The misses list shows them; convert each to
   a single template.
8. Native review per language, then remove the beta flag.
