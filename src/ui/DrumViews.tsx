// Drums course screens (0.65, DRUMS_CURRICULUM §6): the drill on a percussion staff (standard voice positions, x note
// heads for cymbals, accents, ghost notes in brackets, open hat "o", sticking under single-surface lines) or as lanes;
// the kit connect & mapping wizard (detect the e-kit, hit each pad, the hi-hat pedal range, soft / loud strokes, the
// latency, a headphones / Bluetooth warning) and the practice-pad (microphone) mode. The kit, staff and lanes stay LTR.

import { useEffect, useRef, useState } from 'react';
import type { Drill, DrumVoice, ExpNote, TakeMetrics } from '../engine/drills/types';
import { markOf, type NoteMark } from '../engine/noteMarks';
import { beamBeats, dotted, restsOf, type RestKind } from '../engine/drumNotation';
import { calibrateVel, classOf, DEFAULT_KIT, pedalRange, PRESETS, slowOutput, voiceOf, VOICE_NAME, wizardDone, wizardHit, wizardSkip, wizardStart, WIZARD_PADS, type KitPreset, type KitProfile, type WizardState } from '../engine/drumKit';
import { midi } from '../speech/midi';
import { Glyph, type GlyphKind } from './Glyph';
import { LatencyCalibrate, type LatencyValues } from './LatencyCalibrate';
import { useLineWindow } from './DrillTake';

type Lang = 'he' | 'en';

/** Staff step of each voice (half-spaces above the bottom line; standard drum key). */
const STEP: Record<DrumVoice, number> = { hhPedal: -1, kick: 1, tom3: 3, snare: 5, rim: 5, tom2: 6, tom1: 7, ride: 8, hihat: 9, hhOpen: 9, crash: 10 };
const XHEAD = new Set<DrumVoice>(['hihat', 'hhOpen', 'ride', 'crash', 'hhPedal']);
const isFoot = (v: DrumVoice) => v === 'kick' || v === 'hhPedal';
/** The glyph of a pad (wizard, lanes). */
export const PAD_GLYPH: Record<DrumVoice, GlyphKind> = { kick: 'kick', snare: 'snare', rim: 'snare', hihat: 'hihat', hhOpen: 'hihat', hhPedal: 'hihat', ride: 'cymbal', crash: 'cymbal', tom1: 'toms', tom2: 'toms', tom3: 'toms' };

const noteKey = (n: ExpNote) => `${n.voice}:${n.beat}`;

function marksOf(result?: TakeMetrics | null): Map<string, NoteMark> {
  const out = new Map<string, NoteMark>();
  const w = result?.drum?.windowMs ?? 40;
  for (const r of result?.perNote ?? []) out.set(noteKey(r.exp), markOf(r, w));
  return out;
}

/** The drill's notes, two bars a line, in a window of two lines that follows the take (B2, one screen). */
export function DrumScore({ drill, view, result, beat = -1, lang }: { drill: Drill; view: 'staff' | 'lanes'; result?: TakeMetrics | null; beat?: number; lang: Lang }) {
  const meter = drill.meter || 4;
  const per = meter * 2;
  const lines = Math.max(1, Math.ceil(drill.beats / per - 1e-6));
  const marks = marksOf(result);
  const firstBad = result ? drill.notes.findIndex((n) => (marks.get(noteKey(n)) ?? 'ok') !== 'ok') : -1;
  const { from, pager } = useLineWindow(lines, beat, per, firstBad >= 0 ? Math.floor(drill.notes[firstBad].beat / per) : 0);
  const shown = Array.from({ length: Math.min(2, lines - from) }, (_, i) => from + i);
  return (
    <div className={`drum-score ${view}`} dir="ltr" data-drum-view={view} data-drum-lines={lines}>
      {shown.map((li) =>
        view === 'staff' ? <StaffLine key={li} drill={drill} line={li} per={per} marks={marks} beat={beat} sticking={!!drill.drum?.mic} /> : <LaneLine key={li} drill={drill} line={li} per={per} marks={marks} beat={beat} />,
      )}
      {pager}
      {view === 'lanes' && <p className="drum-key">{lang === 'he' ? 'עיגול גדול = הדגשה · עיגול חלול = רפאים · טבעת = היי־האט פתוח' : 'Big = accent · hollow = ghost · ring = open hat'}</p>}
    </div>
  );
}

const W = 340;
const X0 = 30;
const BAR_W = (W - X0 - 8) / 2;
const yOf = (step: number) => 60 - step * 4;

function StaffLine({ drill, line, per, marks, beat, sticking }: { drill: Drill; line: number; per: number; marks: Map<string, NoteMark>; beat: number; sticking: boolean }) {
  const b0 = line * per;
  const ns = drill.notes.filter((n) => n.beat >= b0 - 1e-6 && n.beat < b0 + per - 1e-6 && n.voice);
  const xOf = (b: number) => X0 + 10 +((b - b0) / per) * (2 * BAR_W - 14);
  // Onsets → stems: hands up, feet down.
  const groups = new Map<string, ExpNote[]>();
  for (const n of ns) {
    const k = `${isFoot(n.voice!) ? 'd' : 'u'}:${n.beat}`;
    groups.set(k, [...(groups.get(k) ?? []), n]);
  }
  const stems: { x: number; y1: number; y2: number; up: boolean; beat: number; dur: number }[] = [];
  for (const [k, g] of groups) {
    const up = k.startsWith('u');
    const ys = g.map((n) => yOf(STEP[n.voice!]));
    const x = xOf(g[0].beat) + (up ? 4.5 : -4.5);
    stems.push(up ? { x, y1: Math.max(...ys), y2: Math.min(10, Math.min(...ys) - 20), up, beat: g[0].beat, dur: Math.min(...g.map((n) => n.dur)) } : { x, y1: Math.min(...ys), y2: Math.max(...ys) + 20, up, beat: g[0].beat, dur: Math.min(...g.map((n) => n.dur)) });
  }
  // Beams per beat (drumNotation): a primary beam over the 8ths and shorter, a second beam only between 16ths (a stub for
  // a lone one), a flag for a lone short note, 3 / 6 over tuplets; quarters and longer stand alone.
  const beams: React.ReactNode[] = [];
  for (const up of [true, false]) {
    const ss = stems.filter((x) => x.up === up);
    for (const g of beamBeats(ss)) {
      const m = g.idx.map((i) => ss[i]);
      const y = up ? Math.min(...m.map((s) => s.y2)) : Math.max(...m.map((s) => s.y2));
      for (const s of m) s.y2 = y;
      const key = `${up}${m[0].beat}`;
      const dy = up ? 4 : -4;
      if (g.flag) {
        const s = m[0];
        for (let k = 0; k < g.flag; k++) beams.push(<path key={`f${key}${k}`} d={up ? `M${s.x} ${y + k * dy} q 6 6 7 14` : `M${s.x} ${y + k * dy} q 6 -6 7 -14`} className="dn-flag" />);
      } else {
        beams.push(<line key={`b${key}`} x1={m[0].x} x2={m[m.length - 1].x} y1={y} y2={y} className="dn-beam" />);
        for (const [a, b] of g.second) beams.push(<line key={`b2${key}${a}`} x1={m[a].x} x2={m[b].x} y1={y + dy} y2={y + dy} className="dn-beam" />);
        for (const st of g.stubs) beams.push(<line key={`bs${key}${st.at}`} x1={m[st.at].x} x2={m[st.at].x + st.dir * 6} y1={y + dy} y2={y + dy} className="dn-beam" />);
      }
      if (g.tuplet) beams.push(<text key={`t${key}`} x={(m[g.tuplet.from].x + m[g.tuplet.to].x) / 2} y={up ? y - 3 : y + 10} className="dn-tup" textAnchor="middle">{g.tuplet.n}</text>);
    }
  }
  // Rests for a one-voice line (reading, rudiments): whatever no note covers, on the 16th grid.
  const REST: Record<RestKind, string> = { q: '\u{1D13D}', '8': '\u{1D13E}', '16': '\u{1D13F}' };
  const rests: React.ReactNode[] = ns.every((n) => n.voice === 'snare')
    ? restsOf(drill.notes.filter((n) => n.voice === 'snare'), b0, b0 + per).map((r) => (
        <text key={`r${r.beat}`} x={xOf(r.beat)} y={r.kind === 'q' ? 47 : 44} className="dn-rest" textAnchor="middle" data-rest={r.kind}>
          {REST[r.kind]}
        </text>
      ))
    : [];
  let lastDyn: string | undefined;
  const cursor = beat >= b0 && beat < b0 + per ? xOf(beat) : null;
  return (
    <svg className="drum-staff" viewBox={`0 0 ${W} 92`} role="img" aria-label="drum notation">
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={X0 - 4} x2={W - 4} y1={28 + i * 8} y2={28 + i * 8} className="dn-line" />
      ))}
      {line === 0 && (
        <g className="dn-clef">
          <rect x={6} y={36} width={3.5} height={16} />
          <rect x={13} y={36} width={3.5} height={16} />
        </g>
      )}
      {[1, 2].map((k) => (
        <line key={`bar${k}`} x1={X0 - 4 + k * BAR_W} x2={X0 - 4 + k * BAR_W} y1={28} y2={60} className="dn-bar" />
      ))}
      {stems.map((s, i) => (
        <line key={`s${i}`} x1={s.x} x2={s.x} y1={s.y1} y2={s.y2} className="dn-stem" />
      ))}
      {beams}
      {rests}
      {ns.map((n, i) => {
        const x = xOf(n.beat);
        const y = yOf(STEP[n.voice!]);
        const m = marks.get(noteKey(n));
        const dyn = n.dyn && n.dyn !== lastDyn ? n.dyn : undefined;
        if (n.dyn) lastDyn = n.dyn;
        return (
          <g key={i} className={`dn ${m ?? ''}`} data-voice={n.voice}>
            {STEP[n.voice!] >= 10 && <line x1={x - 7} x2={x + 7} y1={20} y2={20} className="dn-line" />}
            {XHEAD.has(n.voice!) ? <path d={`M${x - 4} ${y - 4}l8 8M${x + 4} ${y - 4}l-8 8`} className="dn-x" /> : <ellipse cx={x} cy={y} rx={4.6} ry={3.4} transform={`rotate(-20 ${x} ${y})`} className="dn-head" />}
            {dotted(n.dur) && <circle cx={x + 8} cy={y - 1} r={1.6} className="dn-dot" />}
            {n.ghost && <text x={x} y={y + 3.5} className="dn-ghost" textAnchor="middle">(  )</text>}
            {n.accent && <path d={`M${x - 4} ${isFoot(n.voice!) ? 82 : 6}l8 3-8 3`} className="dn-acc" />}
            {n.voice === 'hhOpen' && <circle cx={x} cy={7} r={2.6} className="dn-open" />}
            {dyn && <text x={x} y={90} className="dn-dyn">{dyn}</text>}
            {sticking && !dyn && <text x={x} y={86} className="dn-stick" textAnchor="middle">{n.hand}</text>}
          </g>
        );
      })}
      {cursor !== null && <line x1={cursor} x2={cursor} y1={14} y2={74} className="dn-cursor" />}
    </svg>
  );
}

const LANE_ORDER: DrumVoice[] = ['crash', 'ride', 'hihat', 'tom1', 'snare', 'tom2', 'tom3', 'kick', 'hhPedal'];
const LANE_SHORT: Record<DrumVoice, string> = { crash: 'CR', ride: 'RD', hihat: 'HH', hhOpen: 'HH', tom1: 'T1', snare: 'SN', rim: 'SN', tom2: 'T2', tom3: 'FT', kick: 'BD', hhPedal: 'HF' };
const laneOf = (v: DrumVoice): DrumVoice => (v === 'hhOpen' ? 'hihat' : v === 'rim' ? 'snare' : v);

function LaneLine({ drill, line, per, marks, beat }: { drill: Drill; line: number; per: number; marks: Map<string, NoteMark>; beat: number }) {
  const lanes = LANE_ORDER.filter((v) => drill.notes.some((n) => n.voice && laneOf(n.voice) === v));
  const b0 = line * per;
  const ns = drill.notes.filter((n) => n.beat >= b0 - 1e-6 && n.beat < b0 + per - 1e-6 && n.voice);
  const H = 14;
  const h = lanes.length * H + 6;
  const xOf = (b: number) => X0 + 6 + ((b - b0) / per) * (W - X0 - 16);
  const cursor = beat >= b0 && beat < b0 + per ? xOf(beat) : null;
  return (
    <svg className="drum-lanes" viewBox={`0 0 ${W} ${h}`} role="img" aria-label="drum lanes">
      {lanes.map((v, i) => (
        <g key={v}>
          <rect x={X0} y={3 + i * H} width={W - X0 - 4} height={H - 2} rx={4} className={`dl-lane l-${classOf(v)}`} />
          <text x={4} y={3 + i * H + 10} className="dl-name">
            {LANE_SHORT[v]}
          </text>
        </g>
      ))}
      {Array.from({ length: per + 1 }, (_, k) => (
        <line key={k} x1={xOf(b0 + k)} x2={xOf(b0 + k)} y1={2} y2={h - 2} className={k % (drill.meter || 4) === 0 ? 'dl-bar' : 'dl-beat'} />
      ))}
      {ns.map((n, i) => {
        const li = lanes.indexOf(laneOf(n.voice!));
        const y = 3 + li * H + (H - 2) / 2;
        const m = marks.get(noteKey(n));
        const r = n.accent ? 5 : n.ghost ? 3 : 4;
        return <circle key={i} cx={xOf(n.beat)} cy={y} r={r} className={`dl-hit ${m ?? ''} ${n.ghost ? 'ghost' : ''} ${n.voice === 'hhOpen' ? 'open' : ''}`} data-voice={n.voice} />;
      })}
      {cursor !== null && <line x1={cursor} x2={cursor} y1={0} y2={h} className="dn-cursor" />}
    </svg>
  );
}

// ───────────────────────────── kit connect & mapping wizard ─────────────────────────────

type Step = 'connect' | 'map' | 'pedal' | 'vel' | 'latency' | 'done';
const TX = {
  en: {
    title: 'Set up your kit', connect: 'Connect my e-kit (USB-MIDI)', pad: 'Practice pad (microphone)', padHint: 'One surface by microphone: strokes, rudiments, time and snare reading. Grooves and fills need an e-kit.',
    noMidi: 'This browser has no MIDI (Safari, iPhone, iPad). Use Chrome or Edge with an e-kit, or a practice pad by microphone.', none: 'No MIDI device found. Plug the kit in by USB (not through a hub) and try again.', retry: 'Try again',
    phones: 'Listen through the kit’s headphone jack or wired headphones. Bluetooth adds 150–250 ms, so every hit would look late.',
    map: 'Hit each pad', preset: 'Kit brand', skip: 'I don’t have this pad', again: 'Two different notes — hit the same pad twice.', taken: 'That pad is already learned — hit the one asked for.',
    pedal: 'Hi-hat pedal', pedalDown: 'Press the pedal fully down, then tap Measure', pedalUp: 'Lift the pedal fully, then tap Measure', measure: 'Measure', noCc: 'Your kit sends the hat state as notes — nothing to set here.', next: 'Next',
    vel: 'Soft and loud', soft: 'Play 8 soft strokes on the snare', loud: 'Now 8 loud strokes on the snare', velBad: 'Soft and loud came out too close — once more, softer and louder.',
    latency: 'Latency', slow: 'That is a lot of delay — Bluetooth? Use wired headphones or the kit’s jack, then measure again.',
    done: 'Your kit is ready', test: 'Find my level (2–3 min)', start: 'To the drills', pads: 'pads learned',
  },
  he: {
    title: 'הגדרת המערכת', connect: 'לחבר תופים אלקטרוניים (USB-MIDI)', pad: 'פד אימון (מיקרופון)', padHint: 'משטח אחד דרך המיקרופון: מכות, רודימנטים, זמן וקריאה לסנר. גרובים ומעברים דורשים תופים אלקטרוניים.',
    noMidi: 'בדפדפן הזה אין MIDI (ספארי, אייפון, אייפד). השתמשו בכרום או באדג׳ עם תופים אלקטרוניים, או בפד אימון עם מיקרופון.', none: 'לא נמצא התקן MIDI. חברו את המודול ב-USB (לא דרך מפצל) ונסו שוב.', retry: 'לנסות שוב',
    phones: 'הקשיבו דרך שקע האוזניות של המודול או באוזניות חוטיות. בלוטות׳ מוסיף 150–250 מ״ש, וכל מכה תיראה מאחרת.',
    map: 'מכה על כל פד', preset: 'יצרן', skip: 'אין לי את הפד הזה', again: 'שני תווים שונים — הכו באותו פד פעמיים.', taken: 'הפד הזה כבר נלמד — הכו בזה שמבוקש.',
    pedal: 'פדל ההיי־האט', pedalDown: 'לחצו את הפדל עד הסוף, ואז הקישו על מדידה', pedalUp: 'הרימו את הפדל עד הסוף, ואז הקישו על מדידה', measure: 'מדידה', noCc: 'המערכת שלכם שולחת את מצב ההיי־האט כתווים — אין מה לכוון כאן.', next: 'הבא',
    vel: 'חלש וחזק', soft: 'נגנו 8 מכות חלשות על הסנר', loud: 'עכשיו 8 מכות חזקות על הסנר', velBad: 'החלש והחזק יצאו קרובים מדי — עוד פעם, חלש יותר וחזק יותר.',
    latency: 'השהיה', slow: 'זו השהיה גדולה — בלוטות׳? עברו לאוזניות חוטיות או לשקע של המודול ומדדו שוב.',
    done: 'המערכת מוכנה', test: 'למצוא את הרמה שלי (2–3 דק׳)', start: 'לתרגילים', pads: 'פדים נלמדו',
  },
};

/** The kit card on the drums Technique page: what is connected, and set up / change. */
export function KitCard({ kit, lang, onSetup }: { kit?: KitProfile; lang: Lang; onSetup: () => void }) {
  const tx = TX[lang];
  const ready = !!kit?.done;
  const learned = Object.keys(kit?.map ?? {}).length;
  const status = !ready ? (lang === 'he' ? 'עוד לא הוגדרה מערכת' : 'No kit set up yet') : kit!.mic ? tx.pad : `${kit!.device ?? PRESETS[kit!.preset].name} · ${learned} ${tx.pads}`;
  return (
    <section className={`kit-card ${ready ? 'ready' : ''}`} data-kit-card={ready ? 'ready' : 'none'}>
      <Glyph kind="drums" color="#4CD07D" size={44} />
      <span className="kc-text">
        <b>{ready ? (kit!.mic ? tx.pad : lang === 'he' ? 'המערכת שלי' : 'My kit') : tx.title}</b>
        <small>{status}</small>
      </span>
      <button className={`btn small ${ready ? 'ghost' : 'primary'}`} onClick={onSetup} data-kit-setup="1">
        {ready ? (lang === 'he' ? 'שינוי' : 'Change') : lang === 'he' ? 'להתחיל' : 'Start'}
      </button>
    </section>
  );
}

export function KitSetup({ lang, kit: kit0, latency, onSave, onLatency, onDone, onTest }: { lang: Lang; kit?: KitProfile; latency: LatencyValues; onSave: (k: KitProfile) => void; onLatency: (p: LatencyValues) => void; onDone: () => void; onTest?: () => void }) {
  const tx = TX[lang];
  const [step, setStep] = useState<Step>('connect');
  const [kit, setKit] = useState<KitProfile>(() => ({ ...DEFAULT_KIT, ...(kit0 ?? {}), done: false }));
  const [devices, setDevices] = useState<string[] | null>(null);
  const save = (p: Partial<KitProfile>) =>
    setKit((k) => {
      const n = { ...k, ...p };
      onSave(n);
      return n;
    });
  const connect = async () => {
    try {
      const ds = await midi.enable();
      setDevices(ds);
      if (ds.length) {
        save({ mic: false, device: ds[0] });
        setStep('map');
      }
    } catch {
      setDevices([]);
    }
  };
  const usePad = () => {
    save({ mic: true });
    setStep('latency');
  };
  const order: Step[] = kit.mic ? ['connect', 'latency', 'done'] : ['connect', 'map', 'pedal', 'vel', 'latency', 'done'];
  const next = () => setStep(order[Math.min(order.length - 1, order.indexOf(step) + 1)]);
  const bt = slowOutput(kit.mic ? (latency.micLatencyMs ?? 0) : (latency.midiLatencyMs ?? 0));
  return (
    <div className="kit-setup" data-kit-step={step}>
      <ol className="kit-steps" aria-hidden="true">
        {order.slice(0, -1).map((s) => (
          <li key={s} className={s === step ? 'now' : order.indexOf(s) < order.indexOf(step) ? 'past' : ''} />
        ))}
      </ol>
      {step === 'connect' && (
        <section className="kit-step">
          <Glyph kind="drums" color="#4CD07D" size={72} shadow />
          {!midi.supported ? <p className="field-hint">{tx.noMidi}</p> : devices && !devices.length ? <p className="field-hint warn">{tx.none}</p> : null}
          {midi.supported && (
            <button className="btn primary" onClick={() => void connect()} data-kit-connect="1">
              {devices && !devices.length ? tx.retry : tx.connect}
            </button>
          )}
          <button className="btn ghost" onClick={usePad} data-kit-pad="1">
            {tx.pad}
          </button>
          <p className="field-hint small">{tx.padHint}</p>
          <p className="kit-warn" data-kit-phones="1">
            {tx.phones}
          </p>
        </section>
      )}
      {step === 'map' && <MapStep lang={lang} kit={kit} onPreset={(p) => save({ preset: p })} onDone={(map) => (save({ map }), next())} />}
      {step === 'pedal' && <PedalStep lang={lang} onDone={(cc4) => (cc4 && save({ cc4 }), next())} />}
      {step === 'vel' && <VelStep lang={lang} kit={kit} onDone={(r) => (r && save({ vel: { ...(kit.vel ?? {}), snare: r } }), next())} />}
      {step === 'latency' && (
        <section className="kit-step">
          <h2>{tx.latency}</h2>
          <LatencyCalibrate lang={lang} values={latency} onSave={onLatency} sources={kit.mic ? ['mic'] : ['midi']} />
          {bt && <p className="kit-warn">{tx.slow}</p>}
          <button className="btn primary" onClick={() => (save({ done: true }), next())} data-kit-next="latency">
            {tx.next}
          </button>
        </section>
      )}
      {step === 'done' && (
        <section className="kit-step">
          <Glyph kind="drums" color="#4CD07D" size={72} shadow />
          <h2>{tx.done}</h2>
          {onTest && (
            <button className="btn primary" onClick={onTest} data-kit-test="1">
              {tx.test}
            </button>
          )}
          <button className={`btn ${onTest ? 'ghost' : 'primary'}`} onClick={onDone} data-kit-done="1">
            {tx.start}
          </button>
        </section>
      )}
    </div>
  );
}

function MapStep({ lang, kit, onPreset, onDone }: { lang: Lang; kit: KitProfile; onPreset: (p: KitPreset) => void; onDone: (map: KitProfile['map']) => void }) {
  const tx = TX[lang];
  const [w, setW] = useState<WizardState>(wizardStart);
  const ref = useRef(w);
  ref.current = w;
  const [flash, setFlash] = useState<DrumVoice | null>(null);
  useEffect(() => {
    // Raw notes while learning (drum mode: no octave shift), whatever course the wizard was opened from.
    const prev = midi.opts.drums;
    midi.setOptions({ drums: true });
    const off = midi.onNote((note, on, _at, vel) => {
      if (!on) return;
      const n = wizardHit(ref.current, note, vel);
      setW(n);
      if (n.note === 'learned') setFlash(WIZARD_PADS[ref.current.step].voice);
    });
    return () => {
      off();
      midi.setOptions({ drums: prev });
    };
  }, []);
  useEffect(() => {
    if (wizardDone(w)) onDone(w.map);
  }, [w]); // eslint-disable-line react-hooks/exhaustive-deps
  if (wizardDone(w)) return null;
  const pad = WIZARD_PADS[w.step];
  return (
    <section className="kit-step">
      <h2>{tx.map}</h2>
      <div className="chips kit-presets" role="radiogroup" aria-label={tx.preset}>
        {(Object.keys(PRESETS) as KitPreset[]).map((p) => (
          <button key={p} role="radio" aria-checked={kit.preset === p} className={`chip ${kit.preset === p ? 'on' : ''}`} onClick={() => onPreset(p)}>
            {PRESETS[p].name}
          </button>
        ))}
      </div>
      <div className="kit-pad" data-kit-pad-now={pad.voice}>
        <Glyph kind={PAD_GLYPH[pad.voice]} color="#FFD43B" size={84} shadow />
        <b>{pad.prompt[lang]}</b>
        <span className="kit-dots" aria-hidden="true">
          {[0, 1].map((k) => (
            <i key={k} className={k < w.heard.length ? 'on' : ''} />
          ))}
        </span>
      </div>
      {w.note === 'again' && <p className="field-hint warn">{tx.again}</p>}
      {w.note === 'taken' && <p className="field-hint warn">{tx.taken}</p>}
      <ul className="kit-learned" dir="ltr">
        {WIZARD_PADS.slice(0, w.step).map((p) => {
          const note = Object.entries(w.map).find(([, v]) => v === p.voice)?.[0];
          return (
            <li key={p.voice} className={flash === p.voice ? 'flash' : ''}>
              {VOICE_NAME[p.voice][lang]} <small>{note ? `#${note}` : p.voice === 'hhOpen' && w.hatByCc ? 'CC4' : '—'}</small>
            </li>
          );
        })}
      </ul>
      {pad.optional && (
        <button className="btn ghost" onClick={() => setW(wizardSkip(w))} data-kit-skip="1">
          {tx.skip}
        </button>
      )}
    </section>
  );
}

function PedalStep({ lang, onDone }: { lang: Lang; onDone: (cc4: KitProfile['cc4'] | null) => void }) {
  const tx = TX[lang];
  const [phase, setPhase] = useState<'down' | 'up'>('down');
  const [seen, setSeen] = useState(midi.cc4 !== null);
  const vals = useRef<{ down: number[]; up: number[] }>({ down: [], up: [] });
  const cur = useRef<number | null>(midi.cc4);
  useEffect(
    () =>
      midi.onCC((cc, v) => {
        if (cc !== 4) return;
        cur.current = v;
        setSeen(true);
      }),
    [],
  );
  const measure = () => {
    if (cur.current !== null) vals.current[phase].push(cur.current);
    if (phase === 'down') setPhase('up');
    else onDone(pedalRange(vals.current.down, vals.current.up));
  };
  return (
    <section className="kit-step">
      <h2>{tx.pedal}</h2>
      <Glyph kind="hihat" color="#FFD43B" size={72} shadow />
      {seen ? <p>{phase === 'down' ? tx.pedalDown : tx.pedalUp}</p> : <p className="field-hint">{tx.noCc}</p>}
      {seen ? (
        <button className="btn primary" onClick={measure} data-kit-measure={phase}>
          {tx.measure}
        </button>
      ) : (
        <button className="btn primary" onClick={() => onDone(null)} data-kit-next="pedal">
          {tx.next}
        </button>
      )}
    </section>
  );
}

function VelStep({ lang, kit, onDone }: { lang: Lang; kit: KitProfile; onDone: (r: { soft: number; loud: number } | null) => void }) {
  const tx = TX[lang];
  const [phase, setPhase] = useState<'soft' | 'loud'>('soft');
  const [n, setN] = useState(0);
  const [bad, setBad] = useState(false);
  const v = useRef<{ soft: number[]; loud: number[] }>({ soft: [], loud: [] });
  const ph = useRef(phase);
  ph.current = phase;
  useEffect(
    () =>
      midi.onNote((note, on, _at, vel) => {
        if (!on || voiceOf(note, kit) !== 'snare') return;
        const arr = v.current[ph.current];
        arr.push(vel);
        setN(arr.length);
        if (arr.length < 8) return;
        if (ph.current === 'soft') {
          setPhase('loud');
          setN(0);
          return;
        }
        const r = calibrateVel(v.current.soft, v.current.loud);
        if (r) onDone(r);
        else {
          v.current = { soft: [], loud: [] };
          setBad(true);
          setPhase('soft');
          setN(0);
        }
      }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  return (
    <section className="kit-step">
      <h2>{tx.vel}</h2>
      <Glyph kind="snare" color={phase === 'soft' ? '#A78BFA' : '#FF8A3D'} size={72} shadow />
      <p>{phase === 'soft' ? tx.soft : tx.loud}</p>
      <span className="kit-dots eight" aria-label={`${n} / 8`}>
        {Array.from({ length: 8 }, (_, k) => (
          <i key={k} className={k < n ? 'on' : ''} />
        ))}
      </span>
      {bad && <p className="field-hint warn">{tx.velBad}</p>}
      <button className="btn ghost" onClick={() => onDone(null)} data-kit-next="vel">
        {lang === 'he' ? 'דילוג' : 'Skip'}
      </button>
    </section>
  );
}
