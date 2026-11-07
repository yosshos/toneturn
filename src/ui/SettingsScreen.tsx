import { DOMAINS } from '../engine/rating';
import { defaultPacks, GOAL_NAMES, GOALS, PACKS, type Goal } from '../engine/path';
import { TOPIC_GEN } from '../engine/topicKit';
import { TUNINGS } from '../engine/fretboard';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { displayNote, pc, spokenNote } from '../engine/pitch';
import type { Strings } from '../i18n/strings';
import { catalogue, chooseVoice, type Gender } from '../speech/voices';
import { listVoices, voicesReady } from '../speech/tts';
import { DEFAULT_SOUND, namingFor, type Settings, type VoiceGender } from '../storage/progress';
import { fillText, Note } from './bits';
import { piano, tts } from './services';
import { midi } from '../speech/midi';
import { LatencyCalibrate } from './LatencyCalibrate';

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
      <h2>🧭 {L.title}</h2>
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
          🔇 {q.noSing}
        </button>
        <button type="button" className={`chip ${s.noMic ? 'on' : ''}`} aria-pressed={!!s.noMic} onClick={() => onChange({ noMic: !s.noMic })}>
          🎙️✕ {q.noMic}
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

  const lang = s.uiLang;
  const G = GROUPS;

  return (
    <main className="panel-screen settings">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{t.settings}</h1>
      </header>

      <div className="set-groups">
        <Group id="account" icon="☁" title={t.account} sub={G.account[lang]}>
          <section className="set-card">{account}</section>
        </Group>

        <Group id="language" icon="🌐" title={G.language.title[lang]} sub={G.language.sub[lang]}>
          <section className="set-card">
            <h2>🌐 {t.secLanguage}</h2>
            <Seg label={t.settingsUi} value={s.uiLang} options={langs} onChange={(uiLang) => onChange({ uiLang })} />
            <Seg label={t.settingsSpeakIn} hint={t.answerLangHint} value={s.inputLang} options={langs} onChange={(inputLang) => onChange({ inputLang })} />
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

        <Group id="learning" icon="🧭" title={G.learning.title[lang]} sub={G.learning.sub[lang]}>
          {onIntake && (
            <section className="set-card">
              <button className="btn ghost" onClick={onIntake} data-intake-retake="1">
                👋 {t.intake.retake}
              </button>
            </section>
          )}
          <MyPath t={t} s={s} onChange={onChange} />
          <section className="set-card">
            <label className="toggle-row">
              <input type="checkbox" checked={s.miniLessons ?? true} onChange={(e) => onChange({ miniLessons: e.target.checked })} data-mini-setting="1" />
              <span>
                📚 {t.miniSetting}
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

        <Group id="instrument" icon="🎷" title={t.instrumentTitle} sub={G.instrument[lang]}>
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

        <Group id="midi" icon="🎹" title={G.midi.title[lang]} sub={s.midiInput ? G.midi.on[lang] : G.midi.off[lang]}>
          <MidiPanel t={t} lang={lang} on={!!s.midiInput} onChange={(midiInput) => onChange({ midiInput })} naming={uiNaming} />
          {s.midiInput && <LatencyCalibrate lang={lang} values={s} onSave={(p) => onChange(p)} sources={['midi']} initial="midi" />}
        </Group>

        <Group id="input" icon="🎤" title={G.input.title[lang]} sub={G.input.sub[lang]}>
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
                🥁 {t.rhythmVoiceSetting}
                <small className="field-hint"> — {t.rhythmVoiceHint}</small>
              </span>
            </label>
            <Seg
              label={`🔗 ${t.echoTolerance}`}
              value={String(s.echoTolerance ?? 80)}
              options={[35, 50, 80, 120].map((c) => [String(c), `±${c}¢ · ${t.toleranceNames[String(c)]}`] as [string, string])}
              onChange={(v) => onChange({ echoTolerance: Number(v) })}
            />
            <p className="field-hint">{t.echoToleranceHint}</p>
            {s.voiceConsent && (
              <button className="btn ghost" onClick={() => onChange({ voiceConsent: false })}>
                {t.revokeConsent}
              </button>
            )}
          </section>
          <LatencyCalibrate lang={lang} values={s} onSave={(p) => onChange(p)} sources={['tap', 'mic']} initial="tap" />
        </Group>

        <Group id="sound" icon="🔊" title={G.sound.title[lang]} sub={G.sound.sub[lang]}>
          <SoundSetting t={t} value={s.sound ?? DEFAULT_SOUND} onChange={(sound) => onChange({ sound })} drone={s.droneSound ?? 'soft'} onDrone={(droneSound) => onChange({ droneSound })} />
        </Group>

        <Group id="display" icon="👁" title={G.display.title[lang]} sub={G.display.sub[lang]}>
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
  );
}

type LL = { en: string; he: string };
const GROUPS = {
  account: { en: 'Sign in, sync between devices', he: 'כניסה וסנכרון בין מכשירים' },
  language: { title: { en: 'Language & voice', he: 'שפה וקול' }, sub: { en: 'App language, note names, narrator voice', he: 'שפת האפליקציה, שמות תווים, קול הקריין' } },
  learning: { title: { en: 'My path & learning', he: 'המסלול והלמידה שלי' }, sub: { en: 'Goals, mini lessons, hints, speed scoring', he: 'מטרות, שיעורונים, עזרים, ניקוד מהירות' } },
  instrument: { en: 'Your instrument, how to answer, tuning, headphones', he: 'הכלי שלך, איך עונים, כיוון, אוזניות' },
  midi: { title: { en: 'MIDI keyboard', he: 'מקלדת MIDI' }, on: { en: 'On · devices, key test, timing', he: 'פועל · מכשירים, בדיקת קלידים, תזמון' }, off: { en: 'Off · connect a keyboard to answer and play drills', he: 'כבוי · חברו מקלדת כדי לענות ולנגן תרגילים' } },
  input: { title: { en: 'Microphone & timing', he: 'מיקרופון ותזמון' }, sub: { en: 'Voice or buttons, singing tolerance, tap & mic delay', he: 'קול או כפתורים, סבילות שירה, השהיית הקשה ומיקרופון' } },
  sound: { title: { en: 'Sound', he: 'סאונד' }, sub: { en: 'Instrument sound, drone', he: 'צליל הכלי, צליל רצוף' } },
  display: { title: { en: 'Display & accessibility', he: 'תצוגה ונגישות' }, sub: { en: 'Keyboard / staff / tab, motion', he: 'מקלדת / חמשה / טאב, תנועה' } },
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
function Group({ id, icon, title, sub, children }: { id: string; icon: string; title: string; sub: string; children: ReactNode }) {
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
function MidiPanel({ t, lang, on, onChange, naming }: { t: Strings; lang: 'en' | 'he'; on: boolean; onChange: (on: boolean) => void; naming: ReturnType<typeof namingFor> }) {
  const he = lang === 'he';
  const [status, setStatus] = useState<string | null>(null);
  const [devices, setDevices] = useState<string[]>(midi.devices);
  const [last, setLast] = useState<{ note: number; vel: number } | null>(null);
  const [pedal, setPedal] = useState(false);
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
          <p className="field-hint">{he ? 'עוצמת הנגינה (מבוקר–פורטה) מכיילים במסך התרגילים הטכניים ← הגדרות.' : 'Your soft-to-loud range is calibrated in Technique drills → settings.'}</p>
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

