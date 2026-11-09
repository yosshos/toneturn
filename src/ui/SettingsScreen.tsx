import { Icon } from './icons';
import { DOMAINS } from '../engine/rating';
import { defaultPacks, GOAL_NAMES, GOALS, PACKS, type Goal } from '../engine/path';
import { TOPIC_GEN } from '../engine/topicKit';
import { TUNINGS } from '../engine/fretboard';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { displayNote, pc, spokenNote } from '../engine/pitch';
import type { Strings } from '../i18n/strings';
import { catalogue, chooseVoice, type Gender } from '../speech/voices';
import { listVoices, voicesReady } from '../speech/tts';
import { DEFAULT_SOUND, namingFor, type Settings, type VoiceGender } from '../storage/progress';
import { fillText, Note } from './bits';
import { piano, store, tts } from './services';
import { listMics } from '../speech/mic';
import { APP_THEMES } from './themes';
import { COSMETICS, ownsCosmetic } from '../engine/streak';
import { midi } from '../speech/midi';
import { LatencyCalibrate } from './LatencyCalibrate';
import { AudioOutputPicker } from './AudioOutput';
import { ProfileCard } from './Profile';
import { DEFAULT_PRIVACY, effectivePrivacy, type Preset, type Privacy, type Who } from '../engine/privacy';

interface Props {
  t: Strings;
  settings: Settings;
  onChange: (p: Partial<Settings>) => void;
  onBack: () => void;
  account?: ReactNode;
  /** Take the intake questionnaire again. */
  onIntake?: () => void;
  /** Open the mixer (levels, EQ, effects per channel). */
  onMixer?: () => void;
  /** Plans and prices (0.54). */
  onPlans?: () => void;
  /** The owner's control panel (admins only). */
  onAdmin?: () => void;
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

/** Settings → My path (spec AF D4): goal, areas, packs, modes, hidden topics, rebuild; stats sharing (spec AG S9). */
function MyPath({ t, s, onChange }: { t: Strings; s: Settings; onChange: (p: Partial<Settings>) => void }) {
  const lang = s.uiLang;
  const q = t.intake;
  const plays = ((s.intake as { plays?: string[] } | null | undefined)?.plays ?? []) as string[];
  const packs = s.pathPacks ?? defaultPacks(s.track ?? 'hobby', plays, s.goal ?? 'general');
  const L = lang === 'en' ? { title: 'My path', goal: 'Goal', hidden: 'Hidden topics (tap to bring back)', rebuild: 'Rebuild my path', rebuilt: 'Your next unit will be built again.', share: 'Share my stats with friends', shareNames: { levels: 'Levels only', activity: 'Levels and activity', nothing: 'Nothing' } } : { title: 'המסלול שלי', goal: 'מטרה', hidden: 'נושאים מוסתרים (הקישו כדי להחזיר)', rebuild: 'לבנות מחדש את המסלול', rebuilt: 'היחידה הבאה תיבנה מחדש.', share: 'לשתף את הנתונים שלי עם חברים', shareNames: { levels: 'רק רמות', activity: 'רמות ופעילות', nothing: 'כלום' } };
  const [note, setNote] = useState<string | null>(null);
  return (
    <section className="set-card my-path" data-my-path="1">
      <h2>{L.title}</h2>
      <label className="field-row">
        <span>{L.goal}</span>
        <select value={s.goal ?? 'general'} onChange={(e) => onChange({ goal: e.target.value as Goal, pathPacks: undefined })}>
          {GOALS.map((g) => (
            <option key={g} value={g}>
              {GOAL_NAMES[g].icon} {GOAL_NAMES[g][lang]}
            </option>
          ))}
        </select>
      </label>
      <h3 className="intake-sub">{q.leaveAreas}</h3>
      <div className="intake-chips">
        {DOMAINS.map((d) => {
          const out = (s.pathLeaveOut ?? []).includes(d.id);
          return (
            <button key={d.id} type="button" className={`chip ${out ? '' : 'on'}`} aria-pressed={!out} onClick={() => onChange({ pathLeaveOut: out ? (s.pathLeaveOut ?? []).filter((x) => x !== d.id) : [...(s.pathLeaveOut ?? []), d.id] })}>
              {t.domainNames[d.id]}
            </button>
          );
        })}
      </div>
      <h3 className="intake-sub">{q.leavePacks}</h3>
      <div className="intake-chips">
        {PACKS.map((pk) => {
          const on = packs.includes(pk);
          return (
            <button key={pk} type="button" className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => onChange({ pathPacks: on ? packs.filter((x) => x !== pk) : [...packs, pk] })}>
              {q.packNames[pk]}
            </button>
          );
        })}
      </div>
      <h3 className="intake-sub">{q.leaveModes}</h3>
      <div className="intake-chips">
        <button type="button" className={`chip ${s.noSing ? 'on' : ''}`} aria-pressed={!!s.noSing} onClick={() => onChange({ noSing: !s.noSing })}>
          <Icon k="mute" /> {q.noSing}
        </button>
        <button type="button" className={`chip ${s.noMic ? 'on' : ''}`} aria-pressed={!!s.noMic} onClick={() => onChange({ noMic: !s.noMic })}>
          <Icon k="mic" />✕ {q.noMic}
        </button>
      </div>
      {(s.pathHidden ?? []).length > 0 && (
        <>
          <h3 className="intake-sub">{L.hidden}</h3>
          <div className="intake-chips">
            {(s.pathHidden ?? []).map((id) => (
              <button key={id} type="button" className="chip" onClick={() => onChange({ pathHidden: (s.pathHidden ?? []).filter((x) => x !== id) })}>
                ↩ {TOPIC_GEN[id]?.title[lang] ?? id}
              </button>
            ))}
          </div>
        </>
      )}
      <button
        type="button"
        className="btn small ghost"
        onClick={() => {
          const units = s.pathFacts?.units ?? [];
          onChange({ pathFacts: { ...(s.pathFacts ?? {}), units: units.slice(0, -1) }, pathKeep: [] });
          setNote(L.rebuilt);
        }}
      >
        ↻ {L.rebuild}
      </button>
      {note && <p className="field-hint">{note}</p>}
      <Seg
        label={L.share}
        value={s.shareStats ?? 'levels'}
        options={(['levels', 'activity', 'nothing'] as const).map((k) => [k, L.shareNames[k]] as [typeof k, string])}
        onChange={(shareStats) => onChange({ shareStats })}
      />
    </section>
  );
}

export function SettingsScreen({ t, settings: s, onChange, onBack, account, onIntake, onMixer, onPlans, onAdmin }: Props) {
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

  const lang = s.uiLang;
  const G = GROUPS;
  const wide = useWide();
  const hashId = typeof location !== 'undefined' ? /^#\/settings\/(\w+)/.exec(location.hash)?.[1] : undefined;
  const [active, setActive] = useState<string>(hashId ?? 'account');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const on = () => {
      const m = /^#\/settings\/(\w+)/.exec(location.hash);
      if (m) setActive(m[1]);
    };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  const NAV: { id: string; title: string; sub: string }[] = [
    { id: 'account', title: t.account, sub: G.account[lang] },
    { id: 'privacy', title: G.privacy.title[lang], sub: G.privacy.sub[lang] },
    { id: 'language', title: G.language.title[lang], sub: G.language.sub[lang] },
    { id: 'learning', title: G.learning.title[lang], sub: G.learning.sub[lang] },
    { id: 'instrument', title: t.instrumentTitle, sub: G.instrument[lang] },
    { id: 'midi', title: G.midi.title[lang], sub: (s.midiInput ? G.midi.on : G.midi.off)[lang] },
    { id: 'input', title: G.input.title[lang], sub: G.input.sub[lang] },
    { id: 'sound', title: G.sound.title[lang], sub: G.sound.sub[lang] },
    { id: 'display', title: G.display.title[lang], sub: G.display.sub[lang] },
  ];
  const q = query.trim().toLowerCase();
  const shownNav = q ? NAV.filter((x) => `${x.title} ${x.sub}`.toLowerCase().includes(q)) : NAV;

  return (
    <PaneCtx.Provider value={{ wide, active }}>
    <main className={`panel-screen settings ${wide ? 'settings-wide' : ''}`}>
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{t.settings}</h1>
      </header>

      {wide && (
        <nav className="set-nav" aria-label={t.settings} data-settings-nav="1">
          <input className="set-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={lang === 'he' ? 'חיפוש בהגדרות' : 'Search settings'} aria-label={lang === 'he' ? 'חיפוש בהגדרות' : 'Search settings'} />
          {shownNav.map((x) => (
            <button key={x.id} className={`set-nav-item ${active === x.id ? 'on' : ''}`} onClick={() => setActive(x.id)} aria-current={active === x.id ? 'page' : undefined} data-set-nav={x.id} title={x.sub}>
              <SetIcon k={x.id} />
              <span>{x.title}</span>
            </button>
          ))}
        </nav>
      )}
      <div className="set-groups">
        <Group id="account" icon={<SetIcon k="account" />} title={t.account} sub={G.account[lang]}>
          <ProfileCard lang={lang} s={s} onChange={onChange} />
          {(onPlans || onAdmin) && (
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              {onPlans && (
                <button className="btn ghost small" onClick={onPlans} data-open-plans="1">
                  {lang === 'he' ? 'מנויים ומחירים' : 'Plans & prices'}
                </button>
              )}
              {onAdmin && (
                <button className="btn ghost small" onClick={onAdmin} data-open-admin="1">
                  {lang === 'he' ? 'ניהול (מנהל)' : 'Admin'}
                </button>
              )}
            </div>
          )}
          <section className="set-card">{account}</section>
          <section className="set-card">
            <button className="btn small" onClick={() => void downloadMyData()} data-export="1">
              ⬇ {lang === 'he' ? 'להוריד את הנתונים שלי (JSON)' : 'Download my data (JSON)'}
            </button>
          </section>
        </Group>

        <Group id="privacy" icon={<SetIcon k="privacy" />} title={G.privacy.title[lang]} sub={G.privacy.sub[lang]}>
          <PrivacySettings lang={lang} s={s} onChange={onChange} />
        </Group>

        <Group id="language" icon={<SetIcon k="language" />} title={G.language.title[lang]} sub={G.language.sub[lang]}>
          <section className="set-card">
            <h2>{t.secLanguage}</h2>
            <Seg label={t.settingsUi} value={s.uiLang} options={langs} onChange={(uiLang) => onChange({ uiLang })} />
            <Seg label={t.settingsSpeakIn} hint={t.answerLangHint} value={s.inputLang} options={langs} onChange={(inputLang) => onChange({ inputLang })} />
            <Seg label={t.settingsListen} value={s.outputLang} options={langs} onChange={(outputLang) => onChange({ outputLang })} />
          </section>

          <section className="set-card">
            <h2>{t.secNotes}</h2>
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
              <Icon k="speaker" />{' '}
              <bdi lang={narr} dir={narr === 'he' ? 'rtl' : 'ltr'} className="spoken-ex">
                {spokenNote(bb, narrNaming, narr)}
              </bdi>
            </p>
          </section>

          <section className="set-card">
            <h2>{t.secVoice}</h2>
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
            <Seg
              label={lang === 'he' ? 'מהירות הקריינות' : 'Narration speed'}
              value={String(s.ttsRate ?? 1)}
              options={[
                ['0.85', lang === 'he' ? 'איטית' : 'Slow'],
                ['1', lang === 'he' ? 'רגילה' : 'Normal'],
                ['1.15', lang === 'he' ? 'מהירה' : 'Fast'],
              ]}
              onChange={(v) => onChange({ ttsRate: Number(v) })}
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
                  {t.voiceFor}
                  {narr === 'he' ? t.hebrew : t.english} · {list.length}
                </p>
                <ul className="voice-list" role="radiogroup" aria-label={t.secVoice}>
                  <li className={!s.voices[narr] ? 'on' : ''}>
                    <button role="radio" aria-checked={!s.voices[narr]} className="voice-pick" onClick={() => onChange({ voices: { ...s.voices, [narr]: null } })}>
                      <span className="g-chip g-auto" aria-hidden="true">
                        ★
                      </span>
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
                        <button role="radio" aria-checked={on} className="voice-pick" onClick={() => onChange({ voices: { ...s.voices, [narr]: voice.voiceURI } })}>
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
        </Group>

        <Group id="learning" icon={<SetIcon k="learning" />} title={G.learning.title[lang]} sub={G.learning.sub[lang]}>
          {onIntake && (
            <section className="set-card">
              <button className="btn ghost" onClick={onIntake} data-intake-retake="1">
                👋 {t.intake.retake}
              </button>
            </section>
          )}
          <MyPath t={t} s={s} onChange={onChange} />
          <section className="set-card">
            <Seg
              label={lang === 'he' ? 'יעד יומי' : 'Daily goal'}
              value={String(s.dailyGoal ?? 30)}
              options={[10, 20, 30, 50].map((n) => [String(n), `${n} XP`] as [string, string])}
              onChange={(v) => onChange({ dailyGoal: Number(v) })}
            />
            <label className="toggle-row">
              <input type="checkbox" checked={s.miniLessons ?? true} onChange={(e) => onChange({ miniLessons: e.target.checked })} data-mini-setting="1" />
              <span>
                {t.miniSetting}
                <small className="field-hint"> — {t.miniSettingHint}</small>
              </span>
            </label>
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
          </section>
        </Group>

        <Group id="instrument" icon={<SetIcon k="instrument" />} title={t.instrumentTitle} sub={G.instrument[lang]}>
          <section className="set-card">
            <p className="field-hint">{t.instrumentHint}</p>
            <Seg
              label={t.instrumentTitle}
              value={s.instrument ?? 'voice'}
              options={(['voice', 'guitar', 'bass', 'keys', 'strings', 'C', 'Bb', 'Eb', 'F'] as const).map((k) => [k, t.instrumentNames[k]] as [typeof k, string])}
              onChange={(instrument) => onChange({ instrument })}
            />
            <Seg
              label={t.answerOn}
              value={s.answerSurface ?? 'auto'}
              options={(['auto', 'keys', 'neck', 'staff'] as const).map((k) => [k, t.answerOnNames[k]] as [typeof k, string])}
              onChange={(answerSurface) => onChange({ answerSurface })}
            />
            <p className="field-hint">{t.answerOnHint}</p>
            {(s.instrument === 'guitar' || s.instrument === 'bass' || (s.noteViews ?? []).includes('tab')) && (
              <>
                <label className="toggle-row">
                  <input type="checkbox" checked={!!s.leftHanded} onChange={(e) => onChange({ leftHanded: e.target.checked })} />
                  <span>{t.leftHanded}</span>
                </label>
                {s.instrument !== 'bass' && (
                  <label className="field-row">
                    <span>{t.tuningTitle}</span>
                    <select value={s.tuning ?? 'standard'} onChange={(e) => onChange({ tuning: e.target.value })}>
                      {TUNINGS.filter((x) => x.instrument === 'guitar').map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name[s.uiLang]}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            )}
            <label className="toggle-row">
              <input type="checkbox" checked={!!s.headphones} onChange={(e) => onChange({ headphones: e.target.checked })} />
              <span>{t.headphonesSet}</span>
            </label>
            <a className="btn small ghost" href="#/tuner">
              🎚 {t.tunerOpen}
            </a>
          </section>
        </Group>

        <Group id="midi" icon={<SetIcon k="midi" />} title={G.midi.title[lang]} sub={s.midiInput ? G.midi.on[lang] : G.midi.off[lang]}>
          <MidiPanel t={t} lang={lang} on={!!s.midiInput} onChange={(midiInput) => onChange({ midiInput })} naming={uiNaming} s={s} onSettings={onChange} />
          {s.midiInput && <LatencyCalibrate lang={lang} values={s} onSave={(p) => onChange(p)} sources={['midi']} initial="midi" />}
          <details className="set-howto" data-midi-howto="1">
            <summary>{lang === 'he' ? 'איך מחברים מקלדת (כבל / בלוטות׳)' : 'How to connect a keyboard (cable / Bluetooth)'}</summary>
            <ul>
              {(lang === 'he' ? MIDI_HOWTO.he : MIDI_HOWTO.en).map((x) => (
                <li key={x[0]}>
                  <b>{x[0]}</b> {x[1]}
                </li>
              ))}
            </ul>
          </details>
        </Group>

        <Group id="input" icon={<SetIcon k="input" />} title={G.input.title[lang]} sub={G.input.sub[lang]}>
          <section className="set-card">
            <Seg
              label={t.inputMode}
              value={s.mode}
              options={[
                ['voice', t.voice],
                ['buttons', t.buttons],
              ]}
              onChange={(mode) => onChange({ mode })}
            />
            <label className="toggle-row">
              <input type="checkbox" checked={s.rhythmByVoice ?? false} onChange={(e) => onChange({ rhythmByVoice: e.target.checked })} data-rhythm-voice="1" />
              <span>
                {t.rhythmVoiceSetting}
                <small className="field-hint"> — {t.rhythmVoiceHint}</small>
              </span>
            </label>
            <Seg
              label={t.echoTolerance}
              value={String(s.echoTolerance ?? 80)}
              options={[35, 50, 80, 120].map((c) => [String(c), `±${c}¢ · ${t.toleranceNames[String(c)]}`] as [string, string])}
              onChange={(v) => onChange({ echoTolerance: Number(v) })}
            />
            <p className="field-hint">{t.echoToleranceHint}</p>
            <MicPicker lang={lang} value={s.micDeviceId ?? null} onChange={(micDeviceId) => onChange({ micDeviceId })} />
            {s.voiceConsent && (
              <button className="btn ghost" onClick={() => onChange({ voiceConsent: false })}>
                {t.revokeConsent}
              </button>
            )}
          </section>
          <LatencyCalibrate lang={lang} values={s} onSave={(p) => onChange(p)} sources={['tap', 'mic']} initial="tap" />
        </Group>

        <Group id="sound" icon={<SetIcon k="sound" />} title={G.sound.title[lang]} sub={G.sound.sub[lang]}>
          <section className="set-card">
            <label className="field-row vol-row">
              <span>{lang === 'he' ? 'עוצמה' : 'Volume'}</span>
              <input type="range" min={0} max={100} step={5} value={Math.round((s.volume ?? 0.9) * 100)} onChange={(e) => onChange({ volume: Number(e.target.value) / 100 })} aria-label={lang === 'he' ? 'עוצמה' : 'Volume'} data-volume="1" />
              <b dir="ltr">{Math.round((s.volume ?? 0.9) * 100)}%</b>
            </label>
            <label className="toggle-row">
              <input type="checkbox" checked={s.cues ?? true} onChange={(e) => onChange({ cues: e.target.checked })} data-cues="1" />
              <span>{lang === 'he' ? 'צלילי משוב (נכון / לא נכון)' : 'Feedback sounds (right / wrong)'}</span>
            </label>
          </section>
          <SoundSetting t={t} value={s.sound ?? DEFAULT_SOUND} onChange={(sound) => onChange({ sound })} drone={s.droneSound ?? 'soft'} onDrone={(droneSound) => onChange({ droneSound })} />
          {(s.sound ?? DEFAULT_SOUND) === 'grand' && <GrandDetail lang={s.uiLang} value={s.pianoDetail ?? 'auto'} onChange={(pianoDetail) => onChange({ pianoDetail })} />}
          {onMixer && (
            <button className="btn ghost mx-open" onClick={onMixer} data-open-mixer="1">
              🎚 {s.uiLang === 'he' ? 'מיקסר: עוצמות, אקולייזר ואפקטים' : 'Mixer: levels, EQ and effects'}
            </button>
          )}
        </Group>

        <Group id="display" icon={<SetIcon k="display" />} title={G.display.title[lang]} sub={G.display.sub[lang]}>
          <section className="set-card">
            <fieldset className="seg-field">
              <legend>{lang === 'he' ? 'ערכת עיצוב' : 'Theme'}</legend>
              <div className="tp-grid" role="radiogroup" aria-label={lang === 'he' ? 'ערכת עיצוב' : 'Theme'}>
                {[
                  ...APP_THEMES.map((x) => ({ id: x.id, name: x.name[lang], note: x.note[lang], sw: x.sw as readonly string[] })),
                  ...Object.keys(COSMETICS)
                    .filter((k) => ownsCosmetic(s.purchases ?? [], k))
                    .map((k) => ({ id: k.replace('theme-', ''), name: t.themeNames[k.replace('theme-', '')] ?? k, note: lang === 'he' ? 'מהחנות' : 'From the shop', sw: [] as readonly string[] })),
                ].map((x) => {
                  const on = (s.theme && (APP_THEMES.some((a) => a.id === s.theme) || ownsCosmetic(s.purchases ?? [], `theme-${s.theme}`)) ? s.theme : 'calm') === x.id;
                  return (
                    <button key={x.id} type="button" role="radio" aria-checked={on} className={`tp-opt ${on ? 'on' : ''}`} data-theme-opt={x.id} onClick={() => onChange({ theme: x.id })}>
                      <span className="tp-sw" aria-hidden="true" data-theme-preview={x.sw.length ? undefined : x.id}>
                        {x.sw.map((c, i) => (
                          <i key={i} style={{ background: c }} />
                        ))}
                      </span>
                      <span className="tp-text">
                        <b>{x.name}</b>
                        <small>{x.note}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <Seg
              label={lang === 'he' ? 'גודל טקסט' : 'Text size'}
              value={String(s.textScale ?? 1)}
              options={[
                ['0.9', 'A−'],
                ['1', 'A'],
                ['1.15', 'A+'],
                ['1.3', 'A++'],
              ]}
              onChange={(v) => onChange({ textScale: Number(v) })}
            />
            <label className="check">
              <input type="checkbox" checked={!!s.cvd} onChange={(e) => onChange({ cvd: e.target.checked })} data-cvd="1" />
              {lang === 'he' ? 'צבעים ידידותיים לעיוורון צבעים (כחול / כתום במקום ירוק / אדום)' : 'Color-blind friendly (blue / orange instead of green / red)'}
            </label>
          </section>
          <section className="set-card">
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
                      // Two at most (product owner): a third replaces the oldest; at least one stays on.
                      onClick={() => onChange({ noteViews: on ? (cur.length > 1 ? cur.filter((x) => x !== v) : cur) : [...cur, v].slice(-2) })}
                    >
                      {{ keyboard: t.viewKeyboard, staff: t.viewStaff, tab: t.viewTab }[v]}
                    </button>
                  );
                })}
              </div>
              <p className="field-hint">{t.showNotesHint}</p>
            </fieldset>
            <label className="check">
              <input type="checkbox" checked={s.reducedMotion ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches} onChange={(e) => onChange({ reducedMotion: e.target.checked })} />
              {t.reducedMotion}
            </label>
            <label className="check">
              <input type="checkbox" checked={s.haptics ?? true} onChange={(e) => onChange({ haptics: e.target.checked })} data-haptics="1" />
              {lang === 'he' ? 'רטט (בטלפון)' : 'Vibration (phones)'}
            </label>
          </section>
        </Group>
      </div>

      <div className="row">
        <a className="btn" href="#/diagnostics">
          {t.diagnostics} →
        </a>
        <button className="btn primary grow" onClick={onBack}>
          {t.done}
        </button>
      </div>
    </main>
    </PaneCtx.Provider>
  );
}

type LL = { en: string; he: string };
const GROUPS = {
  account: { en: 'Profile, sign in, sync, my data', he: 'פרופיל, כניסה, סנכרון, הנתונים שלי' },
  privacy: { title: { en: 'Privacy & friends', he: 'פרטיות וחברים' }, sub: { en: 'Who sees you, who can challenge you, age', he: 'מי רואה אתכם, מי יכול לאתגר, גיל' } },
  language: { title: { en: 'Language & voice', he: 'שפה וקול' }, sub: { en: 'Language, note names, narrator voice & speed', he: 'שפה, שמות תווים, קול ומהירות הקריין' } },
  learning: { title: { en: 'My path & learning', he: 'המסלול והלמידה שלי' }, sub: { en: 'Goals, daily goal, mini lessons, hints', he: 'מטרות, יעד יומי, שיעורונים, עזרים' } },
  instrument: { en: 'Your instrument, how to answer, tuning, headphones', he: 'הכלי שלך, איך עונים, כיוון, אוזניות' },
  midi: { title: { en: 'MIDI keyboard', he: 'מקלדת MIDI' }, on: { en: 'On · device, test, octave, pedal, timing', he: 'פועל · מכשיר, בדיקה, אוקטבה, פדל, תזמון' }, off: { en: 'Off · connect a keyboard to answer and play drills', he: 'כבוי · חברו מקלדת כדי לענות ולנגן תרגילים' } },
  input: { title: { en: 'Microphone & timing', he: 'מיקרופון ותזמון' }, sub: { en: 'Voice or buttons, which mic, tolerance, delay', he: 'קול או כפתורים, איזה מיקרופון, סבילות, השהיה' } },
  sound: { title: { en: 'Sound', he: 'סאונד' }, sub: { en: 'Volume, feedback sounds, instrument, drone', he: 'עוצמה, צלילי משוב, צליל הכלי, צליל רצוף' } },
  display: { title: { en: 'Display & accessibility', he: 'תצוגה ונגישות' }, sub: { en: 'Keyboard / staff / tab, motion, vibration', he: 'מקלדת / חמשה / טאב, תנועה, רטט' } },
} satisfies Record<string, LL | Record<string, LL>>;

const GROUP_KEY = 'tt-settings-open';
const openGroups = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(GROUP_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
};

/** One settings category: a row that opens and closes (remembered on this device). `#/settings/<id>` opens it. */
/** Monochrome line icons for the settings categories (mature, clean UI — owner 2026-11-07). */
const SET_ICON: Record<string, ReactNode> = {
  privacy: <path d="M12 3 5 6v5.5c0 4.2 3 7.8 7 9.5 4-1.7 7-5.3 7-9.5V6z" />,
  account: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c.8-3.6 3.8-5.6 7.5-5.6s6.7 2 7.5 5.6" />
    </>
  ),
  language: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.6 3.5 5.4 3.5 8.5s-1.1 5.9-3.5 8.5c-2.4-2.6-3.5-5.4-3.5-8.5s1.1-5.9 3.5-8.5z" />
    </>
  ),
  learning: (
    <>
      <circle cx="6" cy="18" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8" />
    </>
  ),
  instrument: (
    <>
      <path d="M9 18V6l10-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </>
  ),
  midi: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path d="M7 6v7M12 6v7M17 6v7M5 13h4M10 13h4M15 13h4" />
    </>
  ),
  input: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </>
  ),
  sound: (
    <>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  display: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
};
const SetIcon = ({ k }: { k: string }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {SET_ICON[k]}
  </svg>
);

/** Settings on a computer (SPEC-DESKTOP §4, owner 2026-11-08): categories in a column, the chosen one as a page. */
const PaneCtx = createContext<{ wide: boolean; active: string } | null>(null);
function useWide() {
  const q = '(min-width: 1100px)';
  const [wide, setWide] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const m = matchMedia(q);
    const on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
}

function Group({ id, icon, title, sub, children }: { id: string; icon: ReactNode; title: string; sub: string; children: ReactNode }) {
  const pane = useContext(PaneCtx);
  if (pane?.wide) {
    if (pane.active !== id) return null;
    return (
      <section className="set-page" data-group={id} aria-labelledby={`sp-${id}`}>
        <header className="sp-head">
          <span className="sg-icon" aria-hidden="true">
            {icon}
          </span>
          <span>
            <h2 id={`sp-${id}`}>{title}</h2>
            <small>{sub}</small>
          </span>
        </header>
        <div className="set-group-body">{children}</div>
      </section>
    );
  }
  return <GroupAccordion id={id} icon={icon} title={title} sub={sub}>{children}</GroupAccordion>;
}

function GroupAccordion({ id, icon, title, sub, children }: { id: string; icon: ReactNode; title: string; sub: string; children: ReactNode }) {
  const deep = typeof location !== 'undefined' && location.hash === `#/settings/${id}`;
  const [open, setOpen] = useState(() => deep || openGroups().includes(id));
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (deep) ref.current?.scrollIntoView({ block: 'start' });
  }, [deep]);
  return (
    <details
      ref={ref}
      className="set-group"
      data-group={id}
      open={open}
      onToggle={(e) => {
        const o = (e.currentTarget as HTMLDetailsElement).open;
        setOpen(o);
        try {
          const cur = openGroups().filter((x) => x !== id);
          localStorage.setItem(GROUP_KEY, JSON.stringify(o ? [...cur, id] : cur));
        } catch {
          /* private mode */
        }
      }}
    >
      <summary>
        <span className="sg-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="sg-text">
          <b>{title}</b>
          <small>{sub}</small>
        </span>
        <span className="sg-chev" aria-hidden="true">
          ›
        </span>
      </summary>
      {open && <div className="set-group-body">{children}</div>}
    </details>
  );
}

/** MIDI keyboard: on/off, connected devices (live), a key test (note, velocity, sustain pedal). */
/** How to connect a MIDI keyboard, per platform (Web MIDI: Chrome / Edge / Opera; not Safari). */
const MIDI_HOWTO = {
  en: [
    ['Cable (USB):', 'plug the keyboard in, then turn MIDI on here. Phones need a USB-C / OTG adapter. Works in Chrome, Edge and Opera on computers and Android.'],
    ['Bluetooth on Android:', 'pair the keyboard in a Bluetooth MIDI app (e.g. "MIDI BLE Connect"), then come back and turn MIDI on.'],
    ['Bluetooth on Mac:', 'Audio MIDI Setup → Window → Show MIDI Studio → the Bluetooth icon → Connect.'],
    ['Bluetooth on Windows:', 'Chrome does not see Bluetooth MIDI directly yet — use a cable, or a bridge app (e.g. MIDIberry + loopMIDI).'],
    ['iPhone / iPad:', 'Safari has no MIDI support. Use the microphone instead, or a computer / Android device for MIDI.'],
  ],
  he: [
    ['כבל (USB):', 'מחברים את המקלדת ואז מפעילים כאן MIDI. בטלפון צריך מתאם USB-C / OTG. עובד ב-Chrome, Edge ו-Opera במחשב ובאנדרואיד.'],
    ['בלוטות׳ באנדרואיד:', 'מצמידים את המקלדת באפליקציית Bluetooth MIDI (למשל "MIDI BLE Connect"), חוזרים לכאן ומפעילים MIDI.'],
    ['בלוטות׳ במק:', 'Audio MIDI Setup ← Window ← Show MIDI Studio ← סמל הבלוטות׳ ← Connect.'],
    ['בלוטות׳ בווינדוס:', 'Chrome עוד לא רואה MIDI בבלוטות׳ ישירות — משתמשים בכבל, או באפליקציית גישור (למשל MIDIberry + loopMIDI).'],
    ['אייפון / אייפד:', 'ל-Safari אין תמיכה ב-MIDI. אפשר להשתמש במיקרופון, או במחשב / אנדרואיד בשביל MIDI.'],
  ],
} as const;

/** The microphone to use (Settings → Microphone & timing); names appear after the microphone permission. */
function MicPicker({ lang, value, onChange }: { lang: 'en' | 'he'; value: string | null; onChange: (id: string | null) => void }) {
  const [mics, setMics] = useState<{ id: string; label: string }[]>([]);
  useEffect(() => {
    void listMics().then(setMics);
    const on = () => void listMics().then(setMics);
    navigator.mediaDevices?.addEventListener?.('devicechange', on);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', on);
  }, []);
  if (mics.length < 2) return null;
  return (
    <label className="field-row">
      <span>{lang === 'he' ? 'מיקרופון' : 'Microphone'}</span>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} data-mic-device="1">
        <option value="">{lang === 'he' ? 'ברירת המחדל של המכשיר' : 'Device default'}</option>
        {mics.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Settings → Account: everything this device keeps about you, as one JSON file. */
async function downloadMyData() {
  const [progress, settings] = await Promise.all([store.loadProgress(), store.loadSettings()]);
  const blob = new Blob([JSON.stringify({ app: 'The 7th Sense', exportedAt: new Date().toISOString(), settings, progress }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `the-7th-sense-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function MidiPanel({ t, lang, on, onChange, naming, s, onSettings }: { t: Strings; lang: 'en' | 'he'; on: boolean; onChange: (on: boolean) => void; naming: ReturnType<typeof namingFor>; s: Settings; onSettings: (p: Partial<Settings>) => void }) {
  const he = lang === 'he';
  const [status, setStatus] = useState<string | null>(null);
  const [devices, setDevices] = useState<string[]>(midi.devices);
  const [last, setLast] = useState<{ note: number; vel: number } | null>(null);
  const [pedal, setPedal] = useState(false);
  const [audioOn, setAudioOn] = useState(piano.audioRunning);
  useEffect(() => {
    const id = setInterval(() => setAudioOn(piano.audioRunning), 600);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!on) return;
    if (midi.supported) void midi.enable().then(setDevices, () => setStatus(t.midiUnsupported));
    const offS = midi.onState(() => setDevices([...midi.devices]));
    const offN = midi.onNote((note, down, _at, vel) => {
      if (down) setLast({ note, vel });
    });
    const offC = midi.onCC((cc, v) => {
      if (cc === 64) setPedal(v >= 64);
    });
    return () => {
      offS();
      offN();
      offC();
    };
  }, [on, t.midiUnsupported]);
  const turnOn = async () => {
    void piano.unlock().catch(() => {}); // inside the tap: the keys can sound at once
    if (!midi.supported) return setStatus(t.midiUnsupported);
    try {
      setDevices(await midi.enable());
      setStatus(null);
      onChange(true);
    } catch {
      setStatus(t.midiUnsupported);
    }
  };
  return (
    <section className="set-card midi-setting" data-midi-panel="1">
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
      <label className="toggle-row">
        <input type="checkbox" checked={!!s.computerKeys} onChange={(e) => onSettings({ computerKeys: e.target.checked })} data-computer-keys="1" />
        <span>
          {he ? 'לנגן במקלדת המחשב' : 'Play with the computer keyboard'}
          <small className="field-hint" style={{ display: 'block' }}>
            {he ? 'A W S E D F T G Y H U J K הם דו עד דו; Z / X מזיזים אוקטבה. בזמן שזה פועל, האותיות מנגנות ולא משמשות כקיצורים.' : 'A W S E D F T G Y H U J K play C to C; Z / X move the octave. While on, letters play notes instead of shortcuts.'}
          </small>
        </span>
      </label>
      {status && (
        <p className="field-hint warn" role="status">
          {status}
        </p>
      )}
      {on && (
        <>
          <p className="field-hint" role="status">
            {devices.length ? `${t.midiConnected}: ${devices.join(', ')}` : t.midiNone}
          </p>
          <div className="midi-test" aria-live="polite">
            <span className="mt-label">{he ? 'בדיקה: נגנו קליד' : 'Test: play a key'}</span>
            <span className="mt-note">{last ? <Note>{displayNote(pc(['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][last.note % 12]), naming, lang)}</Note> : '—'}</span>
            {last && (
              <span className="mt-vel" dir="ltr">
                {he ? 'עוצמה' : 'velocity'} {last.vel}
              </span>
            )}
            <span className={`mt-pedal ${pedal ? 'on' : ''}`}>{he ? 'פדל' : 'Pedal'} {pedal ? '⬇' : '—'}</span>
          </div>
          <div className="midi-sound" data-midi-sound-panel="1">
            <label className="toggle-row">
              <input type="checkbox" checked={s.midiSound !== false} onChange={(e) => (void piano.unlock(), onSettings({ midiSound: e.target.checked }))} data-midi-sound="1" />
              <span>{he ? 'להשמיע את הקלידים דרך האפליקציה' : 'Play my keys through the app'}</span>
            </label>
            <p className="field-hint">{he ? 'רוב מקלדות המידי בלי רמקולים — האפליקציה מנגנת בצליל שבחרתם (הגדרות ← צליל). אם לפסנתר שלכם יש רמקולים משלו, כבו כדי לא לשמוע כפול.' : 'Most MIDI keyboards have no speakers, so the app plays your keys in the sound you chose (Settings → Sound). If your piano has its own speakers, turn this off to avoid hearing everything twice.'}</p>
            <AudioOutputPicker lang={he ? 'he' : 'en'} value={s.audioOutput ?? null} onChange={(id) => onSettings({ audioOutput: id })} />
            {s.midiSound !== false && (
              <>
                {!audioOn && (
                  <button className="btn primary small" onClick={() => void piano.unlock().then(() => setAudioOn(piano.audioRunning))} data-midi-audio-on="1">
                    {he ? '🔈 הפעלת צליל (הדפדפן דורש נגיעה אחת)' : '🔈 Turn sound on (the browser needs one tap)'}
                  </button>
                )}
                <label className="mx-knob">
                  <span>{he ? 'עוצמת הקלידים' : 'Keys volume'}</span>
                  <input type="range" dir="ltr" min={0} max={1.5} step={0.05} value={s.midiVolume ?? 1} onChange={(e) => onSettings({ midiVolume: Number(e.target.value) })} data-midi-volume="1" />
                  <b dir="ltr">{Math.round((s.midiVolume ?? 1) * 100)}%</b>
                </label>
                <Seg
                  label={he ? 'תגובת מגע' : 'Touch response'}
                  hint={he ? 'קלה: גם נגיעה עדינה נשמעת מלאה. כבדה: צריך ללחוץ חזק כדי לנגן חזק. קבועה: כל צליל באותה עוצמה.' : 'Light: a gentle touch already sounds full. Heavy: you must press hard to play loud. Fixed: every note at the same level.'}
                  value={s.midiCurve ?? 'normal'}
                  options={[
                    ['light', he ? 'קלה' : 'Light'],
                    ['normal', he ? 'רגילה' : 'Normal'],
                    ['heavy', he ? 'כבדה' : 'Heavy'],
                    ['fixed', he ? 'קבועה' : 'Fixed'],
                  ]}
                  onChange={(v) => onSettings({ midiCurve: v as 'light' | 'normal' | 'heavy' | 'fixed' })}
                />
                <button className="btn ghost small" onClick={() => piano.liveAllOff()} data-midi-panic="1">
                  {he ? 'השתקת צלילים תקועים' : 'Stop stuck notes'}
                </button>
              </>
            )}
          </div>
          {devices.length > 1 && (
            <label className="field-row">
              <span>{he ? 'מכשיר' : 'Device'}</span>
              <select value={s.midiDevice ?? ''} onChange={(e) => onSettings({ midiDevice: e.target.value || null })} data-midi-device="1">
                <option value="">{he ? 'כל המכשירים' : 'All devices'}</option>
                {devices.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          )}
          <Seg
            label={he ? 'הזזת אוקטבה (למקלדות קטנות)' : 'Octave shift (small keyboards)'}
            value={String(s.midiOctave ?? 0)}
            options={[-2, -1, 0, 1, 2].map((n) => [String(n), n > 0 ? `+${n}` : String(n)] as [string, string])}
            onChange={(v) => onSettings({ midiOctave: Number(v) })}
          />
          <label className="toggle-row">
            <input type="checkbox" checked={!!s.midiPedalInvert} onChange={(e) => onSettings({ midiPedalInvert: e.target.checked })} data-pedal-invert="1" />
            <span>{he ? 'הפדל הפוך (לוחץ כשהוא למעלה)' : 'Pedal works backwards (reverse it)'}</span>
          </label>
          <p className="field-hint">{he ? 'עוצמת הנגינה (פיאנו–פורטה) מכיילים במסך התרגילים הטכניים ← הגדרות.' : 'Your soft-to-loud range is calibrated in Technique drills → settings.'}</p>
        </>
      )}
    </section>
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
      <h2>{t.soundTitle}</h2>
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

/** The concert grand's detail: how many velocity layers this device keeps (each layer ≈ 2–3 MB, loaded once). */
function GrandDetail({ lang, value, onChange }: { lang: 'en' | 'he'; value: 'auto' | 'full' | 'light'; onChange: (v: 'auto' | 'full' | 'light') => void }) {
  const he = lang === 'he';
  const [ready, setReady] = useState(piano.grandReady);
  useEffect(() => {
    const id = setInterval(() => setReady(piano.grandReady), 1000);
    return () => clearInterval(id);
  }, []);
  const opts = [
    ['auto', he ? 'אוטומטי' : 'Automatic'],
    ['full', he ? 'מלא — 16 שכבות' : 'Full — 16 layers'],
    ['light', he ? 'חסכוני — 8 שכבות' : 'Light — 8 layers'],
  ] as const;
  return (
    <section className="set-card" data-grand-detail="1">
      <h2>{he ? 'הפסנתר: רמת פירוט' : 'Grand piano detail'}</h2>
      <p className="field-hint">
        {he
          ? 'פסנתר כנף מוקלט ב־16 עוצמות נגינה, עם צליל השחרור של כל קליד, תהודת המיתרים והפדל. השכבות נטענות ברקע פעם אחת ונשמרות במכשיר. "אוטומטי" טוען את כולן במחשב ושמונה בטלפון חסכוני.'
          : 'A concert grand recorded at 16 dynamics, with each key’s release, string resonance and the pedal. Layers load once in the background and stay on the device. Automatic loads all of them on a computer and eight on a light phone.'}
      </p>
      <div className="chips" role="radiogroup" aria-label={he ? 'רמת פירוט' : 'Detail'}>
        {opts.map(([id, label]) => (
          <button key={id} role="radio" aria-checked={value === id} className={`chip ${value === id ? 'on' : ''}`} onClick={() => onChange(id)} data-grand-detail-opt={id}>
            {label}
          </button>
        ))}
      </div>
      {ready.total > 0 && (
        <small className="field-hint" dir="auto" data-grand-ready={ready.loaded}>
          {he ? `שכבות מוכנות: ${ready.loaded} מתוך ${ready.total}` : `Layers ready: ${ready.loaded} of ${ready.total}`}
        </small>
      )}
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


/** Privacy & friends (SPEC-SOCIAL §2, §8): one preset, advanced overrides, year of birth (young-player mode). */
function PrivacySettings({ lang, s, onChange }: { lang: 'en' | 'he'; s: Settings; onChange: (p: Partial<Settings>) => void }) {
  const he = lang === 'he';
  const p: Privacy = s.privacy ?? DEFAULT_PRIVACY;
  const eff = effectivePrivacy(p, s.birthYear);
  const set = (q: Partial<Privacy>) => onChange({ privacy: { ...p, ...q } });
  const who = (v: Who) => (v === 'everyone' ? (he ? 'כולם' : 'Everyone') : v === 'friends' ? (he ? 'חברים' : 'Friends') : he ? 'אף אחד' : 'No one');
  const whoOpts: [Who, ReactNode][] = (['everyone', 'friends', 'none'] as Who[]).map((v) => [v, who(v)]);
  const year = new Date().getFullYear();
  const lock = eff.young ? <small className="field-hint">{he ? 'מוגבל במצב צעירים' : 'Limited in young-player mode'}</small> : null;
  return (
    <>
      <section className="set-card">
        <Seg<Preset>
          label={he ? 'רמת פרטיות' : 'Privacy level'}
          value={p.preset}
          options={[
            ['open', he ? 'פתוח' : 'Open'],
            ['friends', he ? 'חברים בלבד' : 'Friends only'],
            ['private', he ? 'פרטי' : 'Private'],
          ]}
          hint={p.preset === 'open' ? (he ? 'כל אחד יכול לראות את התמונה ולהזמין אתכם לאתגר.' : 'Anyone can see your picture and challenge you.') : p.preset === 'friends' ? (he ? 'מומלץ: רק חברים רואים את התמונה ומאתגרים.' : 'Recommended: only friends see your picture and challenge you.') : he ? 'אנונימי בטבלאות, חברים רק עם קוד.' : 'Anonymous on boards, friends by code only.'}
          onChange={(preset) => onChange({ privacy: { preset } })}
        />
        <label className="field-row">
          <span>{he ? 'שנת לידה' : 'Year of birth'}</span>
          <select value={s.birthYear ?? ''} onChange={(e) => onChange({ birthYear: e.target.value ? Number(e.target.value) : null })} data-birth-year="1">
            <option value="">{he ? 'לא צוין' : 'Not set'}</option>
            {Array.from({ length: 90 }, (_, i) => year - 4 - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        {eff.young && <p className="field-hint" data-young="1">{he ? 'מצב צעירים: בלי תמונה אישית, חברים רק עם קוד, ושיתוף רק בתוך האפליקציה.' : 'Young-player mode: no personal photo, friends by code only, sharing inside the app only.'}</p>}
      </section>
      <details className="set-card privacy-adv">
        <summary>{he ? 'מתקדם' : 'Advanced'}</summary>
        <Seg<Who> label={he ? 'מי רואה את התמונה' : 'Who sees my picture'} value={eff.photo} options={whoOpts} onChange={(photo) => set({ photo })} hint={lock} />
        <Seg<'nickname' | 'anonymous'> label={he ? 'בטבלאות' : 'On leaderboards'} value={eff.onBoards} options={[['nickname', he ? 'הכינוי שלי' : 'My nickname'], ['anonymous', he ? 'אנונימי' : 'Anonymous']]} onChange={(onBoards) => set({ onBoards })} />
        <Seg<'everyone' | 'code' | 'none'> label={he ? 'בקשות חברות' : 'Friend requests'} value={eff.friendRequests} options={[['everyone', he ? 'כולם' : 'Everyone'], ['code', he ? 'רק עם קוד' : 'By code'], ['none', he ? 'אף אחד' : 'No one']]} onChange={(friendRequests) => set({ friendRequests })} hint={lock} />
        <Seg<Who> label={he ? 'מי יכול לאתגר אותי' : 'Who can challenge me'} value={eff.challenges} options={whoOpts} onChange={(challenges) => set({ challenges })} />
        <Seg<Who> label={he ? 'הודעות מהירות' : 'Quick messages'} value={eff.quickMessages} options={whoOpts} onChange={(quickMessages) => set({ quickMessages })} />
        <Seg<'friends' | 'none'> label={he ? 'תזכורות מחברים' : 'Nudges from friends'} value={eff.nudges} options={[['friends', he ? 'חברים' : 'Friends'], ['none', he ? 'כבוי' : 'Off']]} onChange={(nudges) => set({ nudges })} />
        <label className="toggle-row">
          <input type="checkbox" checked={eff.dontDisturb} onChange={(e) => set({ dontDisturb: e.target.checked })} />
          <span>{he ? 'לא להפריע בזמן תרגול' : "Don't disturb while I practice"}</span>
        </label>
      </details>
      <section className="set-card">
        <b className="set-sub">{he ? 'חסומים' : 'Blocked'}</b>
        <p className="field-hint">{he ? 'אין חסומים. אפשר לחסום מכל פרופיל, וזה מסתיר אתכם זה מזה לגמרי.' : 'No one is blocked. You can block from any profile — it hides you from each other completely.'}</p>
      </section>
    </>
  );
}
