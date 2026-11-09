// Voice check: probes microphone capture and speech recognition independently,
// records the actual error code + stage, and produces a copyable report for the QA matrix.

import { useEffect, useRef, useState } from 'react';
import { hzToMidi } from '../engine/pitch';
import type { AccessError } from '../game/adapters';
import { ERROR_TITLES, recoverySteps, type Strings } from '../i18n/strings';
import { detectBrowser, gatherEnv, type EnvFacts } from '../speech/errors';
import { MicProbe, type ProbeReading } from '../speech/mic';
import { listVoices, pickVoice, voicesReady } from '../speech/tts';
import { getRecognitionCtor, WebSpeechTranscriber } from '../speech/webspeech';
import type { Settings } from '../storage/progress';
import { piano, tts } from './services';

type Status = 'idle' | 'running' | 'ok' | 'fail';
interface LogLine {
  t: number;
  msg: string;
}

const NOTE = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

export function Diagnostics({ t, settings, onBack }: { t: Strings; settings: Settings; onBack: () => void }) {
  const lang = settings.uiLang;
  const [env, setEnv] = useState<EnvFacts | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [local, setLocal] = useState<Record<string, string>>({});
  const [micStatus, setMicStatus] = useState<Status>('idle');
  const [micErr, setMicErr] = useState<AccessError | null>(null);
  const [reading, setReading] = useState<ProbeReading | null>(null);
  const [maxPeak, setMaxPeak] = useState(0);
  const [lastHz, setLastHz] = useState<number | null>(null);
  const [recStatus, setRecStatus] = useState<Status>('idle');
  const [recErr, setRecErr] = useState<AccessError | null>(null);
  const [recLang, setRecLang] = useState(settings.inputLang === 'he' ? 'he-IL' : 'en-US');
  const [heard, setHeard] = useState<string[]>([]);
  const [log, setLog] = useState<LogLine[]>([]);
  const [audioOk, setAudioOk] = useState<Status>('idle');
  const probe = useRef<MicProbe | null>(null);
  const t0 = useRef(performance.now());
  const b = detectBrowser();

  const add = (msg: string) => setLog((l) => [...l, { t: Math.round(performance.now() - t0.current), msg }]);

  useEffect(() => {
    void gatherEnv().then(setEnv);
    void voicesReady().then(setVoices);
    return () => probe.current?.stop();
  }, []);

  // Manual only: SpeechRecognition.available() crashed the renderer in headless Chromium (2026-11-04).
  const probeLocal = () => {
    const Ctor = getRecognitionCtor();
    if (!Ctor?.available) return setLocal({ all: 'API not exposed' });
    add('SpeechRecognition.available({processLocally:true}) …');
    for (const l of ['he-IL', 'en-US']) {
      Ctor.available({ langs: [l], processLocally: true })
        .then((r) => {
          setLocal((m) => ({ ...m, [l]: r }));
          add(`on-device ${l}: ${r}`);
        })
        .catch((e) => setLocal((m) => ({ ...m, [l]: `error: ${e}` })));
    }
  };

  const testMic = async () => {
    probe.current?.stop();
    setMicStatus('running');
    setMicErr(null);
    setMaxPeak(0);
    add('getUserMedia({audio}) …');
    const p = new MicProbe();
    probe.current = p;
    const r = await p.start((rd) => {
      setReading(rd);
      setMaxPeak((m) => Math.max(m, rd.peak));
      if (rd.hz && rd.confidence > 0.85) setLastHz(rd.hz); // hold the last confident pitch
    });
    if (!r.ok) {
      setMicStatus('fail');
      setMicErr(r.error);
      add(`capture FAILED: ${r.error.code} (${r.error.raw})`);
    } else {
      add(`capture opened: "${p.trackLabel}" @ ${p.sampleRate} Hz`);
      setMicStatus('ok');
      setTimeout(() => {
        p.stop();
        add('capture released');
      }, 8000);
    }
    setEnv(await gatherEnv());
  };

  const testRec = async () => {
    probe.current?.stop();
    setRecStatus('running');
    setRecErr(null);
    setHeard([]);
    const stt = new WebSpeechTranscriber();
    if (!stt.isSupported()) {
      const e: AccessError = { stage: 'recognition', code: 'unsupported', raw: 'No SpeechRecognition constructor' };
      setRecErr(e);
      setRecStatus('fail');
      add('recognizer: unsupported');
      return;
    }
    add(`recognizer.start() lang=${recLang}`);
    const ac = new AbortController();
    const res = await stt.listen({
      lang: recLang,
      signal: ac.signal,
      onCapturing: () => add('recognizer: audiostart (capturing)'),
      onSpeech: () => add('recognizer: speechstart'),
      onInterim: (s) => setHeard([`… ${s}`]),
    });
    if (res.kind === 'result') {
      setHeard(res.alternatives);
      setRecStatus('ok');
      add(`recognizer: result ${JSON.stringify(res.alternatives)}`);
    } else if (res.kind === 'silence') {
      setRecStatus('fail');
      add('recognizer: no speech (silence) — started OK, nothing heard');
      setRecErr({ stage: 'recognition', code: 'unknown', raw: 'no-speech (silence) — the recognizer started fine' });
    } else if (res.kind === 'error') {
      setRecStatus('fail');
      setRecErr(res.error);
      add(`recognizer FAILED: ${res.error.code} (${res.error.raw})`);
    } else add('recognizer: aborted');
    setEnv(await gatherEnv());
  };

  const testAudio = async () => {
    try {
      await piano.unlock();
      const ac = new AbortController();
      setAudioOk('running');
      await piano.play(
        [60, 64, 67, 70].map((m, i) => ({ midi: m, start: i * 0.25, duration: 1.2, velocity: 0.6 })),
        2,
        ac.signal,
      );
      setAudioOk('ok');
      add(`audio: played (context ${piano.context?.sampleRate} Hz, ${piano.context?.state})`);
    } catch (e) {
      setAudioOk('fail');
      add(`audio FAILED: ${e}`);
    }
  };

  const testVoice = (l: 'he' | 'en') => {
    tts.unlock();
    const v = pickVoice(l, tts.prefs);
    add(`tts ${l}: ${v ? `${v.name} (${v.lang})` : 'no voice — text only'}`);
    tts.force = true;
    void tts.speak(l === 'he' ? 'סי במול הוא דרגה חמש במי במול מז׳ור' : 'B flat is degree five in E flat major', l, new AbortController().signal);
    tts.force = false;
  };

  const report = () =>
    JSON.stringify(
      {
        when: new Date().toISOString(),
        origin: location.origin,
        browser: b,
        userAgent: navigator.userAgent,
        env,
        audio: audioOk,
        capture: { status: micStatus, error: micErr, maxPeak: Number(maxPeak.toFixed(3)) },
        recognition: { status: recStatus, lang: recLang, error: recErr, heard, localProcessing: local },
        voices: {
          he: listVoices().filter((v) => /^(he|iw)/i.test(v.lang)).map((v) => `${v.name} (${v.lang}${v.localService ? ', local' : ''})`),
          en: listVoices().filter((v) => /^en/i.test(v.lang)).length,
        },
        log,
      },
      null,
      2,
    );

  const heVoices = voices.filter((v) => /^(he|iw)/i.test(v.lang));
  const enVoices = voices.filter((v) => /^en/i.test(v.lang));
  const pitch = lastHz ? `${NOTE[Math.round(hzToMidi(lastHz)) % 12]} · ${lastHz.toFixed(1)} Hz` : '—';

  return (
    <main className="panel-screen diag" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={t.back}>
          ←
        </button>
        <h1>{t.diagnostics}</h1>
      </header>

      <section className="diag-card">
        <h2>1 · {lang === 'he' ? 'סביבה' : 'Environment'}</h2>
        <dl className="facts" dir="ltr">
          <dt>origin</dt>
          <dd>{location.origin}</dd>
          <dt>browser</dt>
          <dd>
            {b.browser} {b.version} · {b.os}
          </dd>
          <dt>secure context</dt>
          <dd className={env?.secure ? 'good' : 'bad'}>{String(env?.secure)}</dd>
          <dt>embedded (iframe)</dt>
          <dd className={env?.embedded ? 'warn' : 'good'}>{String(env?.embedded)}</dd>
          <dt>policy allows mic</dt>
          <dd className={env?.policyAllowsMic === false ? 'bad' : ''}>{String(env?.policyAllowsMic ?? 'unknown')}</dd>
          <dt>mic permission</dt>
          <dd className={env?.micPermission === 'denied' ? 'bad' : env?.micPermission === 'granted' ? 'good' : ''}>{env?.micPermission ?? 'unknown'}</dd>
          <dt>SpeechRecognition</dt>
          <dd className={getRecognitionCtor() ? 'good' : 'bad'}>{getRecognitionCtor() ? 'available' : 'missing'}</dd>
          <dt>on-device recognition</dt>
          <dd>
            {Object.keys(local).length ? (
              Object.entries(local).map(([k, v]) => `${k}: ${v}`).join(' · ')
            ) : getRecognitionCtor()?.available ? (
              <button className="btn small" onClick={probeLocal}>
                {lang === 'he' ? 'בדיקה' : 'Check'}
              </button>
            ) : (
              'API not exposed'
            )}
          </dd>
          <dt>TTS voices</dt>
          <dd>
            he: {heVoices.length ? heVoices.map((v) => v.name).join(', ') : <span className="bad">none</span>} · en: {enVoices.length}
          </dd>
        </dl>
      </section>

      <section className="diag-card">
        <h2>2 · {lang === 'he' ? 'צליל' : 'Sound'}</h2>
        <div className="row">
          <button className="btn" onClick={testAudio}>
            ▶ {lang === 'he' ? 'נגן אקורד' : 'Play chord'}
          </button>
          <button className="btn" onClick={() => testVoice('he')}>
            עברית
          </button>
          <button className="btn" onClick={() => testVoice('en')}>
            English
          </button>
          <Badge s={audioOk} />
        </div>
      </section>

      <section className="diag-card">
        <h2>3 · {t.stageCapture}</h2>
        <div className="row">
          <button className="btn primary" onClick={testMic}>
            {lang === 'he' ? 'בדקו מיקרופון (8 שניות)' : 'Test microphone (8 s)'}
          </button>
          <Badge s={micStatus} />
        </div>
        {micStatus === 'ok' && (
          <div className="meter-wrap">
            <div className="meter" aria-label="input level">
              <span style={{ width: `${Math.min(100, (reading?.rms ?? 0) * 400)}%` }} />
            </div>
            <p dir="ltr">
              peak {maxPeak.toFixed(3)} {maxPeak < 0.02 ? 'no signal yet — speak or sing' : '✓ signal'} · pitch {pitch}
            </p>
          </div>
        )}
        {micErr && <ErrorBox e={micErr} lang={lang} browser={b.browser} />}
      </section>

      <section className="diag-card">
        <h2>4 · {t.stageRecognition}</h2>
        <div className="row">
          <select value={recLang} onChange={(e) => setRecLang(e.target.value)} aria-label="language">
            <option value="he-IL">he-IL</option>
            <option value="en-US">en-US</option>
          </select>
          <button className="btn primary" onClick={testRec}>
            {lang === 'he' ? 'בדקו זיהוי — אמרו "חמש"' : 'Test recognition — say “five”'}
          </button>
          <Badge s={recStatus} />
        </div>
        {heard.length > 0 && (
          <ol className="alts" dir="auto">
            {heard.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ol>
        )}
        {recErr && <ErrorBox e={recErr} lang={lang} browser={b.browser} />}
      </section>

      <section className="diag-card">
        <h2>5 · {lang === 'he' ? 'יומן ודוח' : 'Log & report'}</h2>
        <pre className="log" dir="ltr">
          {log.map((l) => `${String(l.t).padStart(6)} ms  ${l.msg}`).join('\n') || '—'}
        </pre>
        <button className="btn" onClick={() => void navigator.clipboard?.writeText(report())}>
          {lang === 'he' ? 'העתק דוח JSON' : 'Copy JSON report'}
        </button>
      </section>
    </main>
  );
}

function Badge({ s }: { s: Status }) {
  const map: Record<Status, string> = { idle: '', running: '…', ok: '✓', fail: '✗' };
  return <span className={`badge ${s}`}>{map[s]}</span>;
}

function ErrorBox({ e, lang, browser }: { e: AccessError; lang: 'he' | 'en'; browser: string }) {
  return (
    <div className="err-box" role="alert">
      <b>{ERROR_TITLES[lang][e.code]}</b> <code dir="ltr">
        {e.stage}/{e.code}
      </code>
      <p dir="ltr">
        <code>{e.raw}</code>
      </p>
      <ul>
        {recoverySteps(e.code, lang, browser).map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </div>
  );
}
