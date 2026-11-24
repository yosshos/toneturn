// Text → Kokoro phonemes for the translated locales that have a voice (es, fr, it, pt-BR), offline only.
// Kokoro's own pipeline (misaki) runs espeak-ng for these languages: stress marks on, '^' ties joining affricates and
// diphthongs, which it then maps to Kokoro's single-letter symbols. We do the same with the espeak-ng npm build.
// espeak-ng is GPL-3.0: it runs here, on the machine that renders the recordings, and never ships in the app; the
// app gets only the audio (public/voice/<locale>/).
import ESpeakNg from 'espeak-ng';

// es-419: the app's Spanish is neutral Latin-American (seseo: "vez" /bes/, not Castilian /beθ/)
export const ESPEAK_LANG = { es: 'es-419', fr: 'fr-fr', it: 'it', pt: 'pt-br' };

// misaki EspeakG2P.e2m: tied pairs → Kokoro's one-letter phonemes
const E2M = [
  ['a^ɪ', 'I'], ['a^ʊ', 'W'], ['d^z', 'ʣ'], ['d^ʒ', 'ʤ'], ['e^ɪ', 'A'], ['o^ʊ', 'O'], ['ə^ʊ', 'Q'],
  ['s^s', 'S'], ['t^s', 'ʦ'], ['t^ʃ', 'ʧ'], ['ɔ^ɪ', 'Y'],
];
// punctuation Kokoro reads as pauses; espeak drops it, so text between marks is phonemized piece by piece
const PUNCT = /(\s*[;:,.!?¡¿—…"«»“”()]+\s*)+/g;

async function espeak(text, lang) {
  const e = await ESpeakNg({ arguments: ['--phonout', 'out', '-q', '--ipa', '--tie=^', '-v', lang, text] });
  return e.FS.readFile('out', { encoding: 'utf8' }).replace(/\s+/g, ' ').trim();
}

export async function phonemize(text, locale) {
  const lang = ESPEAK_LANG[locale];
  if (!lang) throw new Error(`no espeak language for ${locale}`);
  // ¿ ¡ open a Spanish question or exclamation: the model never saw them (the closing mark carries the tone)
  const t = text.replace(/[¿¡]/g, '').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
  let out = '';
  let last = 0;
  for (const m of t.matchAll(PUNCT)) {
    const seg = t.slice(last, m.index);
    if (seg.trim()) out += await espeak(seg, lang);
    // keep the marks themselves, spaced the way Kokoro saw them in training
    out += m[0].replace(/\s+/g, ' ').replace(/[()]/g, '');
    last = m.index + m[0].length;
  }
  const tail = t.slice(last);
  if (tail.trim()) out += await espeak(tail, lang);
  for (const [a, b] of E2M) out = out.split(a).join(b);
  // espeak's syllable hyphens and leftover ties mean nothing to Kokoro
  return out.replace(/\^/g, '').replace(/(?<=\S)-(?=\s|$)/g, '').replace(/\s{2,}/g, ' ').trim();
}
