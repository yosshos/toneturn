// The mixer screen (owner 2026-11-08): a channel strip for each sound source — volume, mute / solo, pan, a 3-band EQ,
// compressor, chorus, reverb (room or hall) and delay — plus the delay time. Changes apply live; "Test" plays a short
// band (piano, bass, drums) so the balance can be heard while it is set.

import { useEffect, useRef, useState } from 'react';
import { CHANNELS, CHANNEL_NAME, DEFAULT_MIXER, dbOf, mixerOf, type ChannelId, type ChannelSettings, type MixerSettings } from '../audio/mixer';
import { chartBacking, parseChart } from '../engine/charts';
import type { Settings } from '../storage/progress';
import { piano } from './services';

const TX = {
  en: { title: 'Mixer', hint: 'Each sound has its own channel: level, EQ and effects. Changes are heard at once.', test: 'Test the mix', stop: 'Stop', reset: 'Reset to default', mute: 'Mute', solo: 'Solo', vol: 'Level', pan: 'Pan', low: 'Low', mid: 'Mid', high: 'High', comp: 'Compressor', chorus: 'Chorus', reverb: 'Reverb', delay: 'Delay', room: 'Room', hall: 'Hall', eq: 'EQ', fx: 'Effects', delayTime: 'Delay time', feedback: 'Repeats', back: 'Back', more: 'EQ & effects' },
  he: { title: 'מיקסר', hint: 'לכל צליל ערוץ משלו: עוצמה, אקולייזר ואפקטים. השינויים נשמעים מיד.', test: 'לשמוע את המיקס', stop: 'עצירה', reset: 'חזרה לברירת המחדל', mute: 'השתקה', solo: 'סולו', vol: 'עוצמה', pan: 'פאן', low: 'נמוכים', mid: 'אמצע', high: 'גבוהים', comp: 'קומפרסור', chorus: 'קורוס', reverb: 'ריוורב', delay: 'דיליי', room: 'חדר', hall: 'אולם', eq: 'אקולייזר', fx: 'אפקטים', delayTime: 'זמן דיליי', feedback: 'חזרות', back: 'חזרה', more: 'אקולייזר ואפקטים' },
};

export function MixerScreen({ settings, onChange, onBack }: { settings: Settings; onChange: (p: Partial<Settings>) => void; onBack: () => void }) {
  const lang = settings.uiLang;
  const tx = TX[lang];
  const [m, setM] = useState<MixerSettings>(() => mixerOf(settings.mixer));
  const [open, setOpen] = useState<ChannelId | null>(null);
  const [playing, setPlaying] = useState(false);
  const ctl = useRef<AbortController | null>(null);
  const save = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => ctl.current?.abort(), []);
  const update = (next: MixerSettings) => {
    setM(next);
    piano.setMixer(next);
    // store after the slider settles
    if (save.current) clearTimeout(save.current);
    save.current = setTimeout(() => onChange({ mixer: next }), 300);
  };
  const setCh = (id: ChannelId, p: Partial<ChannelSettings>) => update({ ...m, channels: { ...m.channels, [id]: { ...m.channels[id], ...p } } });
  const test = async () => {
    if (playing) {
      ctl.current?.abort();
      setPlaying(false);
      return;
    }
    const c = new AbortController();
    ctl.current = c;
    await piano.unlock();
    piano.setMixer(m);
    setPlaying(true);
    const tr = chartBacking(parseChart('Dm7 | G7 | Cmaj7 | A7', 4), 'swing', 116, 2, 4, { countIn: false });
    await piano.play(tr.events, tr.length, c.signal).catch(() => {});
    if (ctl.current === c) setPlaying(false);
  };
  const slider = (label: string, value: number, min: number, max: number, step: number, on: (v: number) => void, fmt: (v: number) => string, data: string) => (
    <label className="mx-knob">
      <span>{label}</span>
      <input type="range" dir="ltr" min={min} max={max} step={step} value={value} onChange={(e) => on(Number(e.target.value))} data-mx={data} />
      <b dir="ltr">{fmt(value)}</b>
    </label>
  );
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const db = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v)} dB`;
  return (
    <main className="panel-screen mixer" data-mixer="1">
      <header className="screen-head">
        <button className="icon-btn" onClick={onBack} aria-label={tx.back}>
          <span className="flip-rtl">←</span>
        </button>
        <h1>{tx.title}</h1>
      </header>
      <p className="field-hint">{tx.hint}</p>
      <div className="mx-top">
        <button className="btn" onClick={() => void test()} data-mx-test="1">
          {playing ? `■ ${tx.stop}` : `▶ ${tx.test}`}
        </button>
        <button className="btn ghost small" onClick={() => update(mixerOf(DEFAULT_MIXER))} data-mx-reset="1">
          {tx.reset}
        </button>
      </div>
      {CHANNELS.map((id) => {
        const c = m.channels[id];
        const dB = dbOf(c.vol);
        return (
          <section key={id} className={`set-card mx-ch ${c.mute ? 'muted' : ''}`} data-mx-ch={id}>
            <div className="mx-head">
              <h2>{CHANNEL_NAME[id][lang]}</h2>
              <button className={`chip ${c.mute ? 'on' : ''}`} aria-pressed={c.mute} onClick={() => setCh(id, { mute: !c.mute })} data-mx-mute={id}>
                M
              </button>
              <button className={`chip ${c.solo ? 'on' : ''}`} aria-pressed={c.solo} onClick={() => setCh(id, { solo: !c.solo })} data-mx-solo={id} title={tx.solo}>
                S
              </button>
            </div>
            {slider(tx.vol, c.vol, 0, 1.5, 0.01, (v) => setCh(id, { vol: v }), () => (Number.isFinite(dB) ? db(dB) : '−∞'), `${id}-vol`)}
            {slider(tx.pan, c.pan, -1, 1, 0.05, (v) => setCh(id, { pan: v }), (v) => (Math.abs(v) < 0.03 ? 'C' : v < 0 ? `L${Math.round(-v * 100)}` : `R${Math.round(v * 100)}`), `${id}-pan`)}
            <details open={open === id} onToggle={(e) => (e.currentTarget.open ? setOpen(id) : open === id && setOpen(null))}>
              <summary>{tx.more}</summary>
              <div className="mx-grid">
                <small className="mx-sub">{tx.eq}</small>
                {slider(tx.high, c.high, -12, 12, 0.5, (v) => setCh(id, { high: v }), db, `${id}-high`)}
                {slider(tx.mid, c.mid, -12, 12, 0.5, (v) => setCh(id, { mid: v }), db, `${id}-mid`)}
                {slider(tx.low, c.low, -12, 12, 0.5, (v) => setCh(id, { low: v }), db, `${id}-low`)}
                <small className="mx-sub">{tx.fx}</small>
                {slider(tx.comp, c.comp, 0, 1, 0.05, (v) => setCh(id, { comp: v }), pct, `${id}-comp`)}
                {slider(tx.chorus, c.chorus, 0, 1, 0.05, (v) => setCh(id, { chorus: v }), pct, `${id}-chorus`)}
                {slider(tx.reverb, c.reverb, 0, 1, 0.05, (v) => setCh(id, { reverb: v }), pct, `${id}-reverb`)}
                <div className="chips mx-rt" role="radiogroup" aria-label={tx.reverb}>
                  {(['room', 'hall'] as const).map((k) => (
                    <button key={k} role="radio" aria-checked={c.reverbType === k} className={`chip ${c.reverbType === k ? 'on' : ''}`} onClick={() => setCh(id, { reverbType: k })}>
                      {tx[k]}
                    </button>
                  ))}
                </div>
                {slider(tx.delay, c.delay, 0, 1, 0.05, (v) => setCh(id, { delay: v }), pct, `${id}-delay`)}
              </div>
            </details>
          </section>
        );
      })}
      <section className="set-card mx-ch">
        <h2>{tx.delay}</h2>
        {slider(tx.delayTime, m.delayMs, 80, 1000, 5, (v) => update({ ...m, delayMs: v }), (v) => `${Math.round(v)} ms`, 'delay-ms')}
        {slider(tx.feedback, m.feedback, 0, 0.8, 0.05, (v) => update({ ...m, feedback: v }), pct, 'delay-fb')}
      </section>
    </main>
  );
}
