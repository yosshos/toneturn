import { useEffect, useState, type ReactNode } from 'react';
import { displayNote, pc, spokenNote } from '../engine/pitch';
import type { Strings } from '../i18n/strings';
import { catalogue, chooseVoice, type Gender } from '../speech/voices';
import { listVoices, voicesReady } from '../speech/tts';
import { namingFor, type Settings, type VoiceGender } from '../storage/progress';
import { fillText, Note } from './bits';
import { tts } from './services';

interface Props {
  t: Strings;
  settings: Settings;
  onChange: (p: Partial<Settings>) => void;
  onBack: () => void;
  account?: ReactNode;
}

function Seg<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: ReactNode;
  value: T;
  options: [T, ReactNode][];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="seg-field">
      <legend>{label}</legend>
      <div className="seg" role="radiogroup" aria-label={label}>
        {options.map(([v, l]) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
            {l}
          </button>
        ))}
      </div>
      {hint && <p className="field-hint">{hint}</p>}
    </fieldset>
  );
}

const GenderGlyph = ({ g }: { g: Gender }) => (
  <span className={`g-chip g-${g}`} aria-hidden="true">
    {g === 'female' ? '♀' : g === 'male' ? '♂' : '◦'}
  </span>
);

export function SettingsScreen({ t, settings: s, onChange, onBack, account }: Props) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(listVoices());
  useEffect(() => {
    void voicesReady().then(setVoices);
    if (typeof speechSynthesis === 'undefined') return;
    const on = () => setVoices(listVoices());
    speechSynthesis.addEventListener('voiceschanged', on);
    return () => speechSynthesis.removeEventListener('voiceschanged', on);
  }, []);

  const langs: ['he' | 'en', string][] = [
    ['en', t.english],
    ['he', t.hebrew],
  ];
  const narr = s.outputLang;
  const list = catalogue(voices, narr);
  const chosen = chooseVoice(voices, narr, s.voices[narr], s.voiceGender);
  const genderMissing = s.voiceGender !== 'any' && !s.voices[narr] && !list.some((x) => x.gender === s.voiceGender);

  const bb = pc('Bb');
  const eb = pc('Eb');
  const uiNaming = namingFor(s.naming, s.uiLang);
  const narrNaming = namingFor(s.naming, narr);

  const preview = (uri: string | null) => {
    const prev = tts.prefs;
    tts.prefs = { gender: s.voiceGender, voices: { ...s.voices, [narr]: uri } };
    tts.unlock();
    const text = fillText(
      narr === 'he'
        ? 'הקשיבו. בסולם {k} מז׳ור, {n} הוא דרגה חמש.'
        : 'Listen. In {k} major, {n} is degree five.',
      spokenNote(bb, narrNaming, narr),
      spokenNote(eb, narrNaming, narr),
    );
    void tts.speak(text, narr, new AbortController().signal).finally(() => {
      tts.prefs = prev;
    });
  };

  const genderLabel = (g: Gender) => (g === 'female' ? t.voiceFemale : g === 'male' ? t.voiceMale : t.voiceUnknown);

  return (
    <main className="panel-screen settings">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{t.settings}</h1>
      </header>

      <section className="set-card">
        <h2>☁ {t.account}</h2>
        {account}
      </section>

      <section className="set-card">
        <h2>🌐 {t.secLanguage}</h2>
        <Seg label={t.settingsUi} value={s.uiLang} options={langs} onChange={(uiLang) => onChange({ uiLang })} />
        <Seg
          label={t.settingsSpeakIn}
          hint={t.answerLangHint}
          value={s.inputLang}
          options={langs}
          onChange={(inputLang) => onChange({ inputLang })}
        />
        <Seg label={t.settingsListen} value={s.outputLang} options={langs} onChange={(outputLang) => onChange({ outputLang })} />
      </section>

      <section className="set-card">
        <h2>🎼 {t.secNotes}</h2>
        <Seg
          label={t.settingsNaming}
          hint={s.naming === 'auto' ? t.namingAutoHint : undefined}
          value={s.naming}
          options={[
            ['auto', t.namingAuto],
            ['letter', t.namingLetter],
            ['solfege', t.namingSolfege],
          ]}
          onChange={(naming) => onChange({ naming })}
        />
        <p className="example" aria-live="polite">
          <span className="ex-label">{t.example}:</span> <Note>{displayNote(bb, uiNaming, s.uiLang)}</Note> ·{' '}
          <span aria-hidden="true">🔊</span>{' '}
          <bdi lang={narr} dir={narr === 'he' ? 'rtl' : 'ltr'} className="spoken-ex">
            {spokenNote(bb, narrNaming, narr)}
          </bdi>
        </p>
      </section>

      <section className="set-card">
        <h2>🗣 {t.secVoice}</h2>
        <Seg<VoiceGender>
          label={t.voiceType}
          value={s.voiceGender}
          options={[
            ['any', t.voiceAny],
            ['female', <>♀ {t.voiceFemale}</>],
            ['male', <>♂ {t.voiceMale}</>],
          ]}
          onChange={(voiceGender) => onChange({ voiceGender, voices: { ...s.voices, [narr]: null } })}
        />
        {list.length === 0 ? (
          <p className="field-hint warn">{t.noVoices}</p>
        ) : (
          <>
            {genderMissing && (
              <p className="field-hint warn">
                {t.noGenderVoice} {chosen?.name}
              </p>
            )}
            <p className="field-hint">
              {t.voiceFor}{narr === 'he' ? t.hebrew : t.english} · {list.length}
            </p>
            <ul className="voice-list" role="radiogroup" aria-label={t.secVoice}>
              <li className={!s.voices[narr] ? 'on' : ''}>
                <button
                  role="radio"
                  aria-checked={!s.voices[narr]}
                  className="voice-pick"
                  onClick={() => onChange({ voices: { ...s.voices, [narr]: null } })}
                >
                  <span className="g-chip g-auto" aria-hidden="true">★</span>
                  <span className="v-text">
                    <b>{t.voiceAuto}</b>
                    <small>
                      {t.voiceAutoHint}
                      {chosen && !s.voices[narr] ? ` · ${chosen.name}` : ''}
                    </small>
                  </span>
                </button>
                <button className="btn small" onClick={() => preview(null)} aria-label={`${t.preview} ${t.voiceAuto}`}>
                  ▶
                </button>
              </li>
              {list.map(({ voice, gender }) => {
                const on = s.voices[narr] === voice.voiceURI;
                return (
                  <li key={voice.voiceURI} className={on ? 'on' : ''}>
                    <button
                      role="radio"
                      aria-checked={on}
                      className="voice-pick"
                      onClick={() => onChange({ voices: { ...s.voices, [narr]: voice.voiceURI } })}
                    >
                      <GenderGlyph g={gender} />
                      <span className="v-text">
                        <b dir="ltr">{voice.name.replace(/^(Microsoft|Google)\s+/, '')}</b>
                        <small>
                          {genderLabel(gender)} · <span dir="ltr">{voice.lang}</span>
                          {voice.localService ? '' : ' · online'}
                        </small>
                      </span>
                    </button>
                    <button className="btn small" onClick={() => preview(voice.voiceURI)} aria-label={`${t.preview} ${voice.name}`}>
                      ▶
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <section className="set-card">
        <h2>♿ {t.secAccess}</h2>
        <Seg
          label={t.inputMode}
          value={s.mode}
          options={[
            ['voice', t.voice],
            ['buttons', t.buttons],
          ]}
          onChange={(mode) => onChange({ mode })}
        />
        <Seg
          label={t.timedScoring}
          hint={t.timedHint}
          value={s.timedScoring === null ? 'auto' : s.timedScoring ? 'on' : 'off'}
          options={[
            ['auto', t.timedAuto],
            ['on', t.timedOn],
            ['off', t.timedOff],
          ]}
          onChange={(v) => onChange({ timedScoring: v === 'auto' ? null : v === 'on' })}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={s.reducedMotion ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches}
            onChange={(e) => onChange({ reducedMotion: e.target.checked })}
          />
          {t.reducedMotion}
        </label>
        {s.voiceConsent && (
          <button className="btn ghost" onClick={() => onChange({ voiceConsent: false })}>
            {t.revokeConsent}
          </button>
        )}
      </section>

      <div className="row">
        <a className="btn" href="#/diagnostics">
          {t.diagnostics} →
        </a>
        <button className="btn primary grow" onClick={onBack}>
          {t.done}
        </button>
      </div>
    </main>
  );
}
