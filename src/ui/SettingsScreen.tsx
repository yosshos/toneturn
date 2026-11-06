import { useEffect, useState, type ReactNode } from 'react';
import { displayNote, pc, spokenNote } from '../engine/pitch';
import type { Strings } from '../i18n/strings';
import { catalogue, chooseVoice, type Gender } from '../speech/voices';
import { listVoices, voicesReady } from '../speech/tts';
import { DEFAULT_SOUND, namingFor, type Settings, type VoiceGender } from '../storage/progress';
import { fillText, Note } from './bits';
import { piano, tts } from './services';
import { midi } from '../speech/midi';

interface Props {
  t: Strings;
  settings: Settings;
  onChange: (p: Partial<Settings>) => void;
  onBack: () => void;
  account?: ReactNode;
  /** Take the intake questionnaire again. */
  onIntake?: () => void;
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

export function SettingsScreen({ t, settings: s, onChange, onBack, account, onIntake }: Props) {
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
    tts.force = true; // a preview speaks even in reading mode
    const done = tts.speak(text, narr, new AbortController().signal);
    tts.force = false;
    void done.finally(() => {
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

      {onIntake && (
        <section className="set-card">
          <button className="btn ghost" onClick={onIntake} data-intake-retake="1">
            👋 {t.intake.retake}
          </button>
        </section>
      )}
      <section className="set-card">
        <label className="toggle-row">
          <input type="checkbox" checked={s.miniLessons ?? true} onChange={(e) => onChange({ miniLessons: e.target.checked })} data-mini-setting="1" />
          <span>
            📚 {t.miniSetting}
            <small className="field-hint"> — {t.miniSettingHint}</small>
          </span>
        </label>
      </section>
      <section className="set-card">
        <label className="toggle-row">
          <input type="checkbox" checked={s.rhythmByVoice ?? false} onChange={(e) => onChange({ rhythmByVoice: e.target.checked })} data-rhythm-voice="1" />
          <span>
            🥁 {t.rhythmVoiceSetting}
            <small className="field-hint"> — {t.rhythmVoiceHint}</small>
          </span>
        </label>
      </section>
      <SoundSetting t={t} value={s.sound ?? DEFAULT_SOUND} onChange={(sound) => onChange({ sound })} drone={s.droneSound ?? 'soft'} onDrone={(droneSound) => onChange({ droneSound })} />

      <section className="set-card">
        <h2>🔗 {t.echoChain}</h2>
        <Seg
          label={t.echoTolerance}
          value={String(s.echoTolerance ?? 80)}
          options={[35, 50, 80, 120].map((c) => [String(c), `±${c}¢ · ${t.toleranceNames[String(c)]}`] as [string, string])}
          onChange={(v) => onChange({ echoTolerance: Number(v) })}
        />
        <p className="field-hint">{t.echoToleranceHint}</p>
      </section>

      <section className="set-card">
        <h2>🎷 {t.instrumentTitle}</h2>
        <p className="field-hint">{t.instrumentHint}</p>
        <Seg
          label={t.instrumentTitle}
          value={s.instrument ?? 'voice'}
          options={(['voice', 'C', 'Bb', 'Eb', 'F'] as const).map((k) => [k, t.instrumentNames[k]] as [typeof k, string])}
          onChange={(instrument) => onChange({ instrument })}
        />
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
        <MidiSetting t={t} on={!!s.midiInput} onChange={(midiInput) => onChange({ midiInput })} />
        <fieldset className="seg-field views-field">
          <legend>{t.showNotesAs}</legend>
          <div className="seg">
            {(['keyboard', 'staff', 'tab'] as const).map((v) => {
              const cur = s.noteViews ?? ['keyboard', 'staff'];
              const on = cur.includes(v);
              return (
                <button
                  key={v}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  className={on ? 'on' : ''}
                  onClick={() => onChange({ noteViews: on ? cur.filter((x) => x !== v) : [...cur, v] })}
                >
                  {{ keyboard: t.viewKeyboard, staff: t.viewStaff, tab: t.viewTab }[v]}
                </button>
              );
            })}
          </div>
        </fieldset>
        <Seg
          label={t.aidsLabel}
          hint={t.aidsHint}
          value={s.aids ?? 'auto'}
          options={[
            ['auto', t.aidsAuto],
            ['always', t.aidsAlways],
            ['never', t.aidsNever],
          ]}
          onChange={(aids) => onChange({ aids })}
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

function MidiSetting({ t, on, onChange }: { t: Strings; on: boolean; onChange: (on: boolean) => void }) {
  const [status, setStatus] = useState<string | null>(null);
  const turnOn = async () => {
    if (!midi.supported) return setStatus(t.midiUnsupported);
    try {
      const devs = await midi.enable();
      setStatus(devs.length ? `${t.midiConnected}: ${devs.join(', ')}` : t.midiNone);
      onChange(true);
    } catch {
      setStatus(t.midiUnsupported);
    }
  };
  return (
    <div className="midi-setting">
      <Seg
        label={t.midiKeyboard}
        hint={t.midiHint}
        value={on ? 'on' : 'off'}
        options={[
          ['off', t.off],
          ['on', t.on],
        ]}
        onChange={(v) => (v === 'on' ? void turnOn() : onChange(false))}
      />
      {status && <p className="field-hint" role="status">{status}</p>}
    </div>
  );
}

/** Instrument sound (spec Q): the classic synth piano or a recorded instrument, downloaded on first use. */
export const SOUNDS = ['classic', 'grand', 'upright', 'harpsichord', 'harp', 'marimba', 'vibraphone', 'organ'] as const;

function SoundSetting({ t, value, onChange, drone, onDrone }: { t: Strings; value: string; onChange: (v: string) => void; drone: string; onDrone: (v: string) => void }) {
  const [busy, setBusy] = useState<{ id: string; done: number; total: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const choose = async (id: string) => {
    setFailed(false);
    setBusy({ id, done: 0, total: 1 });
    await piano.unlock();
    const ok = await piano.setSound(id, (done, total) => setBusy({ id, done, total }));
    setBusy(null);
    if (!ok) {
      setFailed(true);
      return;
    }
    onChange(id);
    // Preview: a short arpeggio in the new sound.
    void piano
      .play(
        [60, 64, 67, 72].map((m, i) => ({ midi: m, start: i * 0.22, duration: i === 3 ? 0.9 : 0.25, velocity: 0.75 })),
        1.6,
        new AbortController().signal,
      )
      .catch(() => {});
  };
  return (
    <section className="set-card">
      <h2>🎹 {t.soundTitle}</h2>
      <p className="field-hint">{t.soundHint}</p>
      <div className="sound-grid" role="radiogroup" aria-label={t.soundTitle}>
        {SOUNDS.map((id) => (
          <button key={id} type="button" role="radio" aria-checked={value === id} className={`sound-opt ${value === id ? 'on' : ''}`} disabled={!!busy} onClick={() => void choose(id)}>
            {t.soundNames[id]}
            {busy?.id === id && <small> {Math.round((busy.done / busy.total) * 100)}%</small>}
          </button>
        ))}
      </div>
      {failed && (
        <p className="form-error" role="alert">
          {t.soundFailed}
        </p>
      )}
      <p className="field-hint credits">{t.soundCredits}</p>
      <DroneSoundSetting t={t} value={drone} onChange={onDrone} />
    </section>
  );
}

/** The drone's sound (held notes under harmony and drone practice). */
function DroneSoundSetting({ t, value, onChange }: { t: Strings; value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  const choose = async (id: string) => {
    setBusy(true);
    await piano.unlock();
    const ok = await piano.setDroneSound(id);
    setBusy(false);
    if (!ok) return;
    onChange(id);
    piano.startDrone([48, 55]);
    setTimeout(() => piano.stopDrone(), 1800);
  };
  return (
    <fieldset className="seg-field">
      <legend>{t.droneSoundTitle}</legend>
      <div className="seg" role="radiogroup" aria-label={t.droneSoundTitle}>
        {['soft', 'organ'].map((id) => (
          <button key={id} type="button" role="radio" aria-checked={value === id} className={value === id ? 'on' : ''} disabled={busy} data-drone-sound={id} onClick={() => void choose(id)}>
            {t.droneSoundNames[id]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

