// The course opener and the unit opener (owner 2026-11-18, docs/openers-prototype.html): one continuous film of short
// scenes — each scene a static layout plus an async script that reveals it (c.on), plays the app's own piano / kit
// (c.play), narrates through the app's narrator (c.say: English by recording / Kokoro, Hebrew typed captions with a
// reading pause, talk on/off respected) and moves Toni (c.toni). Scenes advance by themselves with a short crossfade;
// pause (shows the scene's resting frame), back, skip and the story-style segments stay available. Leaving a scene
// cancels its script, its sounds and its narration. The film is laid out at a design size (phone 390 wide, wide
// 1280×720) and scaled to the screen, so a scene never scrolls. Copy and sounds: src/content/openers.ts.
import '../opener.css';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { courseOf, type CourseId } from '../engine/courses';
import { LADDER, type SelfReport } from '../engine/courseStart';
import { THEMES, type PathStep, type Section } from '../engine/path';
import { courseOpener, DAY, FILM, GO, START, UNIT_TX, UNIT_THEMES, fill, rungOfReport, sndEvents, themeGlyph, unitCopy, unitMinutes, type LanePass, type Snd, type Station, type T2 } from '../content/openers';
import { FAMILY_GLYPH, TOPIC_GLYPH } from './stepGlyphs';
import { GLYPHS, PaperGlyph, type GlyphKind } from './Glyph';
import { Toni, type ToniMood } from './Toni';
import { Logo } from './brand/Logo';
import { Icon } from './icons';
import { TypedText } from './TypedText';
import { piano, tts } from './services';
import { automated, readingMs } from '../speech/talk';
import { Cancelled } from '../game/adapters';

type Lang = 'he' | 'en';

export type OpenerSpec =
  | { kind: 'course'; course: CourseId; report: SelfReport; replay: boolean; taste: T2; /** The jazz pack is open in the course (SPEC-JAZZ-FOLD). */ jazz?: boolean }
  | {
      kind: 'unit';
      course: CourseId;
      unitId: string;
      no: number;
      theme?: string;
      section: Section;
      steps: { title: string; step: PathStep; glyph: GlyphKind | null }[];
      /** Playing courses: the technique / vocal families in the unit (the "why" cards). */
      families: { title: string; glyph: GlyphKind | null }[];
      replay: boolean;
    };

// ---------------------------------------------------------------- the scene context (the prototype's ctxFor)

interface Ctx {
  alive: () => boolean;
  q: (s: string) => HTMLElement | null;
  qa: (s: string) => HTMLElement[];
  on: (s: string | HTMLElement | null) => void;
  off: (s: string | HTMLElement | null) => void;
  add: (s: string | HTMLElement | null, k: string) => void;
  rm: (s: string | HTMLElement | null, k: string) => void;
  wait: (ms: number) => Promise<void>;
  play: (s: Snd) => void;
  say: (t: T2) => Promise<void>;
  toni: (m: ToniMood) => void;
  lang: Lang;
  wide: boolean;
}

/** Automated runs (Playwright) move fast: no narration, short waits. */
const SPEED = () => (automated() ? 0.15 : 1);

function makeCtx(root: HTMLElement, lang: Lang, wide: boolean, signal: AbortSignal, hooks: { caption: (t: string, msPerWord: number) => void; toni: (m: ToniMood) => void }): Ctx {
  const els = (s: string | HTMLElement | null) => (s == null ? [] : typeof s === 'string' ? Array.from(root.querySelectorAll<HTMLElement>(s)) : [s]);
  const never = new Promise<void>(() => {});
  return {
    lang,
    wide,
    alive: () => !signal.aborted,
    q: (s) => root.querySelector<HTMLElement>(s),
    qa: (s) => Array.from(root.querySelectorAll<HTMLElement>(s)),
    on: (s) => els(s).forEach((e) => (e.classList.remove('off'), e.classList.add('on'))),
    off: (s) => els(s).forEach((e) => (e.classList.remove('on'), e.classList.add('off'))),
    add: (s, k) => els(s).forEach((e) => e.classList.add(k)),
    rm: (s, k) => els(s).forEach((e) => e.classList.remove(k)),
    wait: (ms) =>
      signal.aborted
        ? never
        : new Promise<void>((res) => {
            const id = window.setTimeout(() => !signal.aborted && res(), ms * SPEED());
            signal.addEventListener('abort', () => clearTimeout(id), { once: true });
          }),
    play: (s) => {
      if (signal.aborted || !piano.audioRunning) return;
      const { events, length } = sndEvents(s);
      piano.play(events, length, signal).catch(() => {});
    },
    say: async (t) => {
      if (signal.aborted) return never;
      const text = t[lang];
      const words = Math.max(1, text.split(/\s+/).length);
      const spoken = tts.speaksLine(text, lang);
      // Spoken: the caption types at speech pace; read: it finishes typing within the reading pause.
      hooks.caption(text, spoken ? 300 : Math.max(60, Math.min(220, (readingMs(text) * 0.7) / words)));
      try {
        await tts.speak(text, lang, signal);
      } catch (e) {
        if (e instanceof Cancelled || signal.aborted) return never;
      }
      if (signal.aborted) return never;
    },
    toni: (m) => !signal.aborted && hooks.toni(m),
  };
}

interface BodyProps {
  spec: OpenerSpec;
  lang: Lang;
  wide: boolean;
  toni: ToniMood;
  onStart: () => void;
}
interface SceneDef {
  id: string;
  name: T2;
  /** Nominal length (s): the progress segment's fill. */
  dur: number;
  toni: ToniMood;
  Body: (p: BodyProps) => ReactNode;
  run: (c: Ctx, spec: OpenerSpec) => Promise<void>;
  /** The resting frame (paused / after the film): what the script would have drawn. */
  rest?: (c: Ctx, spec: OpenerSpec) => void;
}

const L = (lang: Lang, t: T2) => t[lang];
/** Latin runs inside Hebrew (chord symbols, ii–V–I, MIDI) are isolated left-to-right, so they never scramble. */
const LATIN = /[A-Za-z][A-Za-z0-9♭♯–\-/ ]*[A-Za-z0-9♭♯]|[A-Za-z]|\d+(?:[,.–\-/] ?\d+)+/g;
function bidi(text: string, lang: Lang): ReactNode {
  if (lang !== 'he' || !/[A-Za-z]|\d[,.–\-/] ?\d/.test(text)) return text;
  const out: ReactNode[] = [];
  let at = 0;
  for (const m of text.matchAll(LATIN)) {
    if (m.index! > at) out.push(text.slice(at, m.index));
    out.push(
      <bdi key={m.index} dir="ltr">
        {m[0]}
      </bdi>,
    );
    at = m.index! + m[0].length;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}
const LT = (lang: Lang, t: T2) => bidi(t[lang], lang);
const G = ({ k, w }: { k: GlyphKind | null | undefined; w: number }) => (k && GLYPHS[k] ? <PaperGlyph kind={k} width={w} height={w} /> : <PaperGlyph kind="ear" width={w} height={w} />);
const ToniSlot = ({ mood, size, className = '', style }: { mood: ToniMood; size: number; className?: string; style?: CSSProperties }) => (
  <div className={`o-toni ${className}`} style={style} aria-hidden="true">
    <Toni state={mood} size={size} />
  </div>
);
const stationGlyph = (s: Station): GlyphKind | null => s.glyph ?? (s.ref.family ? FAMILY_GLYPH[s.ref.family] : s.ref.topic ? TOPIC_GLYPH[s.ref.topic] : s.ref.theme ? themeGlyph(s.ref.theme) : null) ?? null;
// SPEC-JAZZ-FOLD: with the jazz pack open, the road ends at the course's jazz station.
const courseDef = (spec: OpenerSpec) => courseOpener(spec.course, spec.kind === 'course' && !!spec.jazz);

// ---------------------------------------------------------------- course scenes

const HOOK: SceneDef = {
  id: 'hook',
  name: FILM.courseScenes[0],
  dur: 13,
  toni: 'listen',
  Body: ({ spec, lang, wide, toni }) => {
    const h = courseDef(spec).hook;
    return (
      <>
        <div className="o-txt">
          <p className="o-eyebrow a">{LT(lang, h.eyebrow)}</p>
          <div className="o-swap">
            <h2 className="o-hl a h1 off-at-rest">{LT(lang, h.ask)}</h2>
            <h2 className="o-hl a h2b">{LT(lang, h.promise)}</h2>
          </div>
          <p className="o-lead a">{LT(lang, h.lead)}</p>
        </div>
        <div className="o-vis o-hook">
          <ToniSlot mood={toni} size={wide ? 170 : 104} />
          <div className="o-cards" dir="ltr">
            {h.cards.map((cd, i) => (
              <div key={i} className="o-card a" data-i={i}>
                {cd.badge && <span className="o-deg">{cd.badge}</span>}
                <div className="o-eq" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <b>{LT(lang, cd.label)}</b>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  },
  run: async (c, spec) => {
    const h = courseDef(spec).hook;
    c.on('.o-eyebrow');
    c.on('.h1');
    c.toni('listen');
    await c.wait(450);
    for (let i = 0; i < h.cards.length; i++) {
      const el = c.q(`.o-card[data-i="${i}"]`);
      c.on(el);
      c.add(el, 'play');
      c.play(h.cards[i].snd);
      await c.wait(820);
      c.rm(el, 'play');
    }
    await c.wait(150);
    await c.say(h.say1);
    c.toni('curious');
    for (let i = 0; i < h.cards.length; i++) {
      const el = c.q(`.o-card[data-i="${i}"]`);
      c.add(el, 'deg-on');
      c.add(el, 'play');
      c.play(h.cards[i].snd);
      await c.wait(620);
      c.rm(el, 'play');
    }
    c.off('.h1');
    c.on('.h2b');
    c.on('.o-lead');
    c.toni('proud');
    await c.say(h.say2);
  },
};

/** Station positions in "reading order from the left" (mirrored in Hebrew so the road starts on the reading side). */
const GEO = {
  phone: { w: 342, h: 470, pts: [[70, 46], [262, 132], [78, 222], [262, 312], [92, 404]] },
  wide: { w: 700, h: 470, pts: [[84, 340], [224, 150], [356, 330], [490, 140], [620, 320]] },
};

const MAP: SceneDef = {
  id: 'map',
  name: FILM.courseScenes[1],
  dur: 17,
  toni: 'curious',
  Body: ({ spec, lang, wide }) => {
    const r = courseDef(spec).road;
    const g = wide ? GEO.wide : GEO.phone;
    const mir = lang === 'he';
    const pts = g.pts.slice(0, r.stations.length).map(([x, y]) => [mir ? g.w - x : x, y]);
    const node = wide ? 84 : 54;
    return (
      <>
        <div className="o-txt">
          <p className="o-eyebrow a">{lang === 'he' ? 'הדרך שלכם' : 'Your road'}</p>
          <h2 className="o-hl a">{LT(lang, r.title)}</h2>
          {wide && <p className="o-lead a">{LT(lang, r.lead)}</p>}
          <div className="o-then a" data-then>
            <span>
              <G k="roadmap" w={wide ? 34 : 26} />
            </span>
            <span>{LT(lang, r.then)}</span>
          </div>
        </div>
        <div className="o-vis fill">
          <div className="o-map">
            <svg className="o-route" viewBox={`0 0 ${g.w} ${g.h}`} preserveAspectRatio="none" aria-hidden="true">
              {pts.slice(1).map((p, i) => {
                const a = pts[i];
                const mx = (a[0] + p[0]) / 2;
                return <path key={i} className="o-seg draw" data-s={i} d={`M${a[0]} ${a[1]} C${mx} ${a[1]} ${mx} ${p[1]} ${p[0]} ${p[1]}`} />;
              })}
            </svg>
            {r.stations.map((s, i) => {
              const [x, y] = pts[i];
              const left = x < g.w / 2;
              const style: CSSProperties = wide
                ? { left: `${(x / g.w) * 100}%`, top: `${(y / g.h) * 100}%`, transform: `translate(-50%,-${node / 2}px)` }
                : left
                  ? { top: `${(y / g.h) * 100}%`, marginTop: -node / 2, left: `${((x - node / 2) / g.w) * 100}%`, flexDirection: 'row' }
                  : { top: `${(y / g.h) * 100}%`, marginTop: -node / 2, right: `${((g.w - x - node / 2) / g.w) * 100}%`, flexDirection: 'row-reverse' };
              return (
                <div key={i} className="o-stn a" data-i={i} style={style} dir="ltr">
                  <div className="o-node">
                    <G k={stationGlyph(s)} w={wide ? 52 : 34} />
                  </div>
                  <div className="o-lab" dir={lang === 'he' ? 'rtl' : 'ltr'}>
                    <b>{LT(lang, s.name)}</b>
                    <span>{LT(lang, s.desc)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  },
  run: async (c, spec) => {
    const r = courseDef(spec).road;
    c.on('.o-eyebrow');
    c.on('.o-hl');
    c.on('.o-lead');
    c.toni('curious');
    c.qa('.o-seg').forEach((p) => p.style.setProperty('--len', String((p as unknown as SVGPathElement).getTotalLength?.() ?? 400)));
    await c.say(r.say);
    for (let i = 0; i < r.stations.length; i++) {
      if (i > 0) {
        c.on(`.o-seg[data-s="${i - 1}"]`);
        await c.wait(450);
      }
      const el = c.q(`.o-stn[data-i="${i}"]`);
      c.on(el);
      c.add(el, 'ping');
      c.play(r.stations[i].snd);
      await c.wait(900);
      c.rm(el, 'ping');
      await c.say(r.stations[i].say);
    }
    c.on('[data-then]');
    await c.say(r.thenSay);
  },
};

const HOW: SceneDef = {
  id: 'how',
  name: FILM.courseScenes[2],
  dur: 11,
  toni: 'focused',
  Body: ({ spec, lang, wide, toni }) => {
    const h = courseDef(spec).how;
    return (
      <>
        <div className="o-txt">
          <p className="o-eyebrow a">{lang === 'he' ? 'כל יום' : 'Every day'}</p>
          <h2 className="o-hl a">{LT(lang, h.title)}</h2>
          {wide && <p className="o-lead a">{LT(lang, h.lead)}</p>}
        </div>
        <div className="o-vis o-qscene">
          <div className="o-qcard a">
            <div className="o-qtop">
              <span>{lang === 'he' ? 'שאלה 3 מתוך 8' : 'Question 3 of 8'}</span>
              <span className="o-pbar">
                <i />
              </span>
            </div>
            <h3>{LT(lang, h.prompt)}</h3>
            <div className="o-orb" data-orb>
              <Icon k={h.kind === 'play' ? 'mic' : 'speaker'} size={wide ? 50 : 38} />
            </div>
            <div className="o-wave" data-wave aria-hidden="true">
              {Array.from({ length: 9 }, (_, i) => (
                <i key={i} />
              ))}
            </div>
            {h.kind === 'choice' && h.opts ? (
              <div className="o-opts">
                {h.opts.map((o, i) => (
                  <div key={i} className="o-opt" data-o={i}>
                    {LT(lang, o)}
                    {h.sayOpt && <small>{LT(lang, h.sayOpt[i])}</small>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="o-chips" dir={spec.course === 'drums' ? undefined : 'ltr'}>
                {(h.chips ?? []).map((t, i) => (
                  <span key={i} className="o-chip" data-o={i}>
                    {LT(lang, t)}
                  </span>
                ))}
              </div>
            )}
            {h.said && <span className="o-said a">{LT(lang, h.said)}</span>}
            <div className="o-qfb a">
              <Icon k="check" size={wide ? 24 : 20} />
              {LT(lang, h.fb)}
            </div>
          </div>
          <ToniSlot mood={toni} size={wide ? 150 : 88} className="o-qtoni" />
        </div>
      </>
    );
  },
  run: async (c, spec) => {
    const h = courseDef(spec).how;
    c.on('.o-eyebrow');
    c.on('.o-hl');
    c.on('.o-lead');
    c.on('.o-qcard');
    c.toni('focused');
    await c.wait(400);
    const s1 = c.say(h.says[0]);
    await c.wait(250);
    if (h.kind === 'choice') {
      c.add('[data-orb]', 'hearing');
      for (const st of h.steps) {
        if (st.light !== null) c.add(`[data-o="${st.light}"]`, 'lit');
        c.play(st.snd);
        await c.wait(st.ms);
        if (st.light !== null) c.rm(`[data-o="${st.light}"]`, 'lit');
      }
      c.rm('[data-orb]', 'hearing');
      await s1;
      const s2 = c.say(h.says[1]);
      c.add('[data-wave]', 'live');
      await c.wait(1300);
      c.rm('[data-wave]', 'live');
      c.on('.o-said');
      await s2;
      c.add(`[data-o="${h.answer ?? 0}"]`, 'good');
    } else {
      // The model first (if any), then the player's notes light up one by one as they are heard.
      const model = h.steps.filter((s) => s.light === null);
      if (model.length) c.add('[data-orb]', 'hearing');
      for (const st of model) {
        c.play(st.snd);
        await c.wait(st.ms);
      }
      c.rm('[data-orb]', 'hearing');
      await s1;
      const s2 = c.say(h.says[1]);
      c.add('[data-wave]', 'live');
      for (const st of h.steps.filter((s) => s.light !== null)) {
        c.add(`[data-o="${st.light}"]`, 'lit');
        c.play(st.snd);
        await c.wait(st.ms);
        c.rm(`[data-o="${st.light}"]`, 'lit');
        c.add(`[data-o="${st.light}"]`, 'good');
      }
      c.rm('[data-wave]', 'live');
      await s2;
    }
    c.on('.o-qfb');
    c.toni('correct');
    c.play({ n: [[72, 0, 0.18, 0.5], [79, 0.13, 0.5, 0.55]] });
    await c.wait(300);
    await c.say(h.says[2]);
  },
  rest: (c, spec) => {
    const h = courseDef(spec).how;
    if (h.kind === 'choice') c.add(`[data-o="${h.answer ?? 0}"]`, 'good');
    else c.add('[data-o]', 'good');
  },
};

const DAYS_HE = 'אבגדהוש';
const DAYS_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAYSC: SceneDef = {
  id: 'day',
  name: FILM.courseScenes[3],
  dur: 11,
  toni: 'proud',
  Body: ({ lang, wide }) => {
    const xp = [412, 390, 340, 301];
    const rh = wide ? 37 : 32;
    return (
      <>
        <div className="o-txt">
          <p className="o-eyebrow a">{LT(lang, DAY.eyebrow)}</p>
          <h2 className="o-hl a">{LT(lang, DAY.title)}</h2>
          {wide && <p className="o-lead a">{LT(lang, DAY.lead)}</p>}
        </div>
        <div className="o-vis o-day">
          <div className="o-tile a" data-t="0">
            <svg className="o-ring" viewBox="0 0 64 64" aria-hidden="true">
              <circle className="bgc" cx="32" cy="32" r="28" fill="none" strokeWidth="7" />
              <circle className="fg" cx="32" cy="32" r="28" fill="none" strokeWidth="7" strokeLinecap="round" transform="rotate(-90 32 32)" />
              <text x="32" y="38" textAnchor="middle">
                5′
              </text>
            </svg>
            <div>
              <h4>{LT(lang, DAY.goal)}</h4>
              <p>{LT(lang, DAY.goalSub)}</p>
            </div>
          </div>
          <div className="o-tile a" data-t="1">
            <div className="o-dots" aria-hidden="true">
              {DAYS_EN.map((d, i) => (
                <i key={i} data-d={i}>
                  {lang === 'he' ? DAYS_HE[i] : d}
                </i>
              ))}
            </div>
            <div>
              <h4>{LT(lang, DAY.streak)}</h4>
              <p>{LT(lang, DAY.streakSub)}</p>
            </div>
          </div>
          <div className="o-tile league a" data-t="2">
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4>{LT(lang, DAY.league)}</h4>
              <div className="o-lrows" data-rows>
                {DAY.names.map((n, i) => (
                  <div key={i} className={`o-lrow ${i === 2 ? 'me' : ''}`} data-r={i} style={{ transform: `translateY(${i * rh}px)` }}>
                    <span className="r">{i + 1}</span>
                    <span className="nm">{LT(lang, n)}</span>
                    <span className="xp">{xp[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  },
  run: async (c) => {
    c.on('.o-eyebrow');
    c.on('.o-hl');
    c.on('.o-lead');
    c.on('[data-t="0"]');
    c.toni('proud');
    await c.wait(300);
    c.on('.o-ring');
    await c.say(DAY.says[0]);
    c.on('[data-t="1"]');
    const s2 = c.say(DAY.says[1]);
    for (let i = 0; i < 7; i++) {
      await c.wait(230);
      c.on(`[data-d="${i}"]`);
      c.play({ n: [[76 + [0, 2, 4, 5, 7, 9, 11][i], 0, 0.12, 0.3]] });
    }
    await s2;
    c.on('[data-t="2"]');
    await c.wait(500);
    const rh = c.wide ? 37 : 32;
    [0, 2, 1, 3].forEach((r, pos) => {
      const el = c.q(`[data-r="${r}"]`);
      if (!el) return;
      el.style.transform = `translateY(${pos * rh}px)`;
      const rk = el.querySelector('.r');
      if (rk) rk.textContent = String(pos + 1);
    });
    const me = c.q('[data-r="2"] .xp');
    for (let x = 340; x <= 455 && me; x += 15) {
      me.textContent = String(Math.min(455, x));
      await c.wait(40);
    }
    if (me) me.textContent = '455';
    c.play({ n: [[72, 0, 0.15, 0.4], [76, 0.1, 0.15, 0.4], [79, 0.2, 0.4, 0.45]] });
    await c.say(DAY.says[2]);
  },
};

const STARTSC: SceneDef = {
  id: 'start',
  name: FILM.courseScenes[4],
  dur: 10,
  toni: 'encouraging',
  Body: ({ spec, lang }) => {
    if (spec.kind !== 'course') return null;
    const rungs = courseDef(spec).rungs;
    const at = rungOfReport(spec.report);
    return (
      <>
        <div className="o-txt">
          <p className="o-eyebrow a">{LT(lang, START.eyebrow(spec.course, spec.report))}</p>
          <h2 className="o-hl a">{LT(lang, START.title[spec.report])}</h2>
          <div className="o-skipnote a" data-skip>
            <Icon k="check" size={22} />
            <span>{LT(lang, START.skip)}</span>
          </div>
        </div>
        <div className="o-vis o-ladder">
          {LADDER[spec.course].map((r, i) => (
            <div key={i} className="o-rung a" data-g={i}>
              <b>{LT(lang, r)}</b>
              <span>{LT(lang, rungs[i])}</span>
              {i === at && (
                <em className="o-pin a" data-pin>
                  {LT(lang, START.pin[spec.report])}
                </em>
              )}
            </div>
          ))}
        </div>
      </>
    );
  },
  run: async (c, spec) => {
    if (spec.kind !== 'course') return;
    const at = rungOfReport(spec.report);
    c.on('.o-eyebrow');
    c.on('.o-hl');
    c.toni('encouraging');
    for (let i = 0; i < 4; i++) {
      c.on(`[data-g="${i}"]`);
      await c.wait(160);
    }
    const s1 = c.say(START.say[spec.report]);
    await c.wait(900);
    c.add(`[data-g="${at}"]`, 'here');
    c.on('[data-pin]');
    c.play({ n: [[67, 0, 0.2, 0.5], [72, 0.12, 0.5, 0.5]] });
    await s1;
    c.on('[data-skip]');
    await c.say(START.skipSay);
  },
  rest: (c, spec) => spec.kind === 'course' && c.add(`[data-g="${rungOfReport(spec.report)}"]`, 'here'),
};

const GOSC: SceneDef = {
  id: 'go',
  name: FILM.courseScenes[5],
  dur: 6,
  toni: 'celebrating',
  Body: ({ spec, lang, wide, toni, onStart }) => {
    if (spec.kind !== 'course') return null;
    const def = courseOf(spec.course);
    return (
      <>
        {wide && (
          <div className="o-txt">
            <p className="o-eyebrow a">{LT(lang, GO.eyebrow)}</p>
            <h2 className="o-hl a">{LT(lang, spec.taste)}</h2>
          </div>
        )}
        <div className="o-vis o-cta" style={wide ? undefined : { gridRow: '1 / -1' }}>
          <ToniSlot mood={toni} size={wide ? 200 : 150} className="a" />
          <div className="o-brand a">
            <Logo size={wide ? 104 : 72} />
            <span>
              <b>{lang === 'he' ? 'החוש ה־7' : 'The 7th Sense'}</b>
              <span className="o-small">{def.name[lang]}</span>
            </span>
          </div>
          {!wide && !spec.replay && <p className="o-small o-first a">{`${L(lang, GO.eyebrow)}: ${L(lang, spec.taste)}`}</p>}
          <button className="o-go a" type="button" onClick={onStart} data-opener-start>
            {spec.replay ? L(lang, GO.close) : L(lang, GO.start)}
          </button>
          {!spec.replay && <span className="o-small a">{LT(lang, GO.again)}</span>}
        </div>
      </>
    );
  },
  run: async (c, spec) => {
    if (spec.kind !== 'course') return;
    c.on('.a');
    c.toni('celebrating');
    c.play({ n: [[60, 0, 0.5, 0.55], [64, 0.09, 0.5, 0.55], [67, 0.18, 0.5, 0.55], [72, 0.27, 0.5, 0.55], [76, 0.36, 0.5, 0.55], [48, 0.45, 1.2, 0.3], [55, 0.46, 1.2, 0.3], [64, 0.47, 1.2, 0.3]] });
    await c.wait(500);
    c.add('.o-go', 'pulse');
    await c.say(spec.replay ? GO.sayReplay : GO.say(spec.taste));
    await c.wait(600);
  },
  rest: (c) => c.add('.o-go', 'pulse'),
};

const COURSE_SCENES = [HOOK, MAP, HOW, DAYSC, STARTSC, GOSC];

// ---------------------------------------------------------------- unit scenes

const LANE = { phone: { w: 342, h: 400, x0: 40, y0: 350, dy: 40 }, wide: { w: 720, h: 460, x0: 70, y0: 410, dy: 46 } };
const PERC_LANE: Partial<Record<string, number>> = { kick: 0, 'tom-lo': 1, snare: 3, 'snare-soft': 3, rim: 3, 'tom-hi': 4, hat: 6, 'hat-open': 6, ride: 7, 'ride-bell': 7, crash: 7, click: 5 };
function laneGeo(passes: [LanePass, LanePass], base: number, wide: boolean) {
  const g = wide ? LANE.wide : LANE.phone;
  const ms = passes.flatMap((p) => p.ev.flatMap((e) => e.m ?? []));
  const lo = Math.min(base, ...ms);
  const hi = Math.max(lo + 12, ...ms);
  const k = Math.min((g.dy * 7) / 12, (g.y0 - 30) / (hi - lo));
  const n = Math.max(6, ...passes.map((p) => p.ev.length));
  const dx = (g.w - g.x0 - 30) / n;
  return { ...g, lo, k, dx, yOfM: (m: number) => g.y0 - (m - lo) * k, yOfP: (p: string) => g.y0 - (PERC_LANE[p] ?? 3) * g.dy };
}
const passSnd = (p: LanePass): Snd => ({
  n: [...p.ev.flatMap((e) => (e.m ?? []).map((m, j) => [m, e.t + j * 0.01, e.d ?? 0.3, 0.62] as [number, number, number, number])), ...(p.under ? p.under.map((m, j) => [m, (p.ev[p.ev.length - 1]?.t ?? 0) + j * 0.01, 1.2, 0.3] as [number, number, number, number]) : [])],
  p: p.ev.filter((e) => e.p).map((e) => [e.p!, e.t, 0.8]),
});
const SVGNS = 'http://www.w3.org/2000/svg';
function drawDot(c: Ctx, x: number, y: number, cls: string) {
  const holder = c.q('[data-dots]');
  if (!holder) return;
  const el = document.createElementNS(SVGNS, 'circle');
  el.setAttribute('cx', String(x));
  el.setAttribute('cy', String(y));
  el.setAttribute('r', c.wide ? '14' : '10');
  el.setAttribute('class', `o-dot ${cls}`);
  holder.appendChild(el);
}
function drawPass(c: Ctx, p: LanePass, geo: ReturnType<typeof laneGeo>, upTo = Infinity) {
  p.ev.forEach((e, i) => {
    if (i > upTo) return;
    const x = geo.x0 + i * geo.dx;
    const last = i === p.ev.length - 1;
    const cls = last && p.end === 'home' ? 'home' : last && p.end === 'hang' ? 'hang' : e.p ? 'perc' : '';
    if (e.p) drawDot(c, x, geo.yOfP(e.p), cls);
    for (const m of e.m ?? []) drawDot(c, x, geo.yOfM(m), cls);
  });
}
const unitSpec = (s: OpenerSpec) => s as Extract<OpenerSpec, { kind: 'unit' }>;
const themeName = (spec: OpenerSpec, lang: Lang) => {
  const u = unitSpec(spec);
  return UNIT_THEMES[u.theme ?? '']?.name?.[lang] ?? THEMES.find((t) => t.id === u.theme)?.name[lang] ?? (lang === 'he' ? `יחידה ${u.no}` : `Unit ${u.no}`);
};

const U_WHAT: SceneDef = {
  id: 'what',
  name: FILM.unitScenes[0],
  dur: 15,
  toni: 'listen',
  Body: ({ spec, lang, wide, toni }) => {
    const u = unitSpec(spec);
    const cp = unitCopy(u.course, u.theme, u.section);
    const geo = laneGeo(cp.theme.demo, cp.theme.base, wide);
    return (
      <>
        <div className="o-txt">
          <p className="o-eyebrow a">{fill(L(lang, UNIT_TX.unit), { n: u.no })}</p>
          <h2 className="o-hl a">{themeName(spec, lang)}</h2>
          <p className="o-lead a">{LT(lang, cp.what)}</p>
        </div>
        <div className="o-vis fill">
          <div className="o-lanes" dir="ltr">
            <svg viewBox={`0 0 ${geo.w} ${geo.h}`} aria-hidden="true">
              {cp.theme.home !== undefined && <rect className="o-homeband" x={0} y={geo.yOfM(cp.theme.home) - geo.dy / 2} width={geo.w} height={geo.dy} rx={geo.dy / 2} />}
              {Array.from({ length: 8 }, (_, d) => (
                <line key={d} className="o-ln" x1={0} x2={geo.w} y1={geo.y0 - d * geo.dy} y2={geo.y0 - d * geo.dy} />
              ))}
              <g data-dots />
            </svg>
          </div>
          <span className="o-cap2 a" data-cap>
            {LT(lang, cp.theme.demo[0].cap)}
          </span>
          <ToniSlot mood={toni} size={wide ? 130 : 78} className="o-utoni" />
        </div>
      </>
    );
  },
  run: async (c, spec) => {
    const u = unitSpec(spec);
    const cp = unitCopy(u.course, u.theme, u.section);
    const geo = laneGeo(cp.theme.demo, cp.theme.base, c.wide);
    c.on('.o-eyebrow');
    c.on('.o-hl');
    c.toni('listen');
    await c.say(cp.whatSay);
    c.on('.o-lead');
    for (let k = 0; k < 2; k++) {
      const p = cp.theme.demo[k];
      const cap = c.q('[data-cap]');
      if (cap) {
        cap.textContent = p.cap[c.lang];
        cap.classList.toggle('home', k === 1);
      }
      c.on(cap);
      const holder = c.q('[data-dots]');
      if (holder) holder.innerHTML = '';
      c.play(passSnd(p));
      let t = 0;
      for (let i = 0; i < p.ev.length; i++) {
        await c.wait((p.ev[i].t - t) * 1000);
        t = p.ev[i].t;
        drawPass(c, { ...p, ev: p.ev.slice(i, i + 1).map((e) => e), end: i === p.ev.length - 1 ? p.end : undefined }, { ...geo, x0: geo.x0 + i * geo.dx });
      }
      if (p.end === 'hang') c.toni('think');
      await c.wait(1300);
    }
    if (cp.theme.home !== undefined) c.on('.o-homeband');
    c.toni('wow');
    await c.wait(900);
  },
  rest: (c, spec) => {
    const u = unitSpec(spec);
    const cp = unitCopy(u.course, u.theme, u.section);
    const geo = laneGeo(cp.theme.demo, cp.theme.base, c.wide);
    drawPass(c, cp.theme.demo[1], geo);
    const cap = c.q('[data-cap]');
    if (cap) {
      cap.textContent = cp.theme.demo[1].cap[c.lang];
      cap.classList.add('home');
    }
  },
};

const U_WHY: SceneDef = {
  id: 'why',
  name: FILM.unitScenes[1],
  dur: 9,
  toni: 'hint',
  Body: ({ spec, lang, wide, toni }) => {
    const u = unitSpec(spec);
    const cp = unitCopy(u.course, u.theme, u.section);
    const feeds: { g: GlyphKind | null; t: string }[] = u.families.length >= 2 ? u.families.slice(0, 3).map((f) => ({ g: f.glyph, t: f.title })) : cp.theme.feeds.map((f) => ({ g: f.g, t: f.t[lang] }));
    const hub = u.families.length >= 2 ? courseOf(u.course).glyph : themeGlyph(u.theme);
    return (
      <>
        <div className="o-txt">
          <p className="o-eyebrow a">{LT(lang, UNIT_TX.why)}</p>
          <h2 className="o-hl a">{LT(lang, cp.why)}</h2>
        </div>
        <div className="o-vis o-why">
          <div className="o-hub a">
            <G k={hub as GlyphKind} w={wide ? 80 : 58} />
          </div>
          <svg className="o-spokes a" viewBox="0 0 300 26" preserveAspectRatio="none" aria-hidden="true">
            <path d={feeds.length === 3 ? 'M150 0 V26 M150 4 Q60 4 50 26 M150 4 Q240 4 250 26' : 'M150 4 Q90 4 80 26 M150 4 Q210 4 220 26'} />
          </svg>
          <div className="o-row" style={{ gridTemplateColumns: `repeat(${feeds.length}, 1fr)` }}>
            {feeds.map((f, i) => (
              <div key={i} className="o-wc a" data-w={i}>
                <G k={f.g} w={wide ? 44 : 30} />
                <span>{bidi(f.t, lang)}</span>
              </div>
            ))}
          </div>
          <ToniSlot mood={toni} size={wide ? 120 : 80} className="a" />
        </div>
      </>
    );
  },
  run: async (c, spec) => {
    const u = unitSpec(spec);
    const cp = unitCopy(u.course, u.theme, u.section);
    c.on('.o-eyebrow');
    c.on('.o-hl');
    c.on('.o-hub');
    c.on('.o-toni');
    c.toni('hint');
    const s = c.say(cp.whySay);
    await c.wait(500);
    c.on('.o-spokes');
    const n = c.qa('.o-wc').length;
    for (let i = 0; i < n; i++) {
      await c.wait(900);
      c.on(`[data-w="${i}"]`);
      c.play({ n: [[60, 67], [60, 64, 67], [55, 59, 62, 65]][i % 3].map((m, j) => [m, j * 0.012, 0.5, 0.4] as [number, number, number, number]) });
    }
    await s;
    c.play({ n: [[48, 0, 1.1, 0.4], [60, 0.01, 1.1, 0.35], [64, 0.02, 1.1, 0.35], [67, 0.03, 1.1, 0.35]] });
    await c.wait(900);
  },
};

const U_STEPS: SceneDef = {
  id: 'steps',
  name: FILM.unitScenes[2],
  dur: 9,
  toni: 'encouraging',
  Body: ({ spec, lang, wide, onStart }) => {
    const u = unitSpec(spec);
    const cp = unitCopy(u.course, u.theme, u.section);
    const n = u.steps.length;
    const many = n > 6;
    const btn = (
      <button className="o-go a" type="button" onClick={onStart} data-opener-start>
        {u.replay ? L(lang, UNIT_TX.close) : L(lang, UNIT_TX.start)}
      </button>
    );
    return (
      <>
        <div className="o-txt">
          <p className="o-eyebrow a">{LT(lang, UNIT_TX.inUnit)}</p>
          <h2 className="o-hl a">{LT(lang, cp.theme.goal)}</h2>
          <div className="o-meta a">
            <span>{fill(L(lang, UNIT_TX.steps), { n })}</span>
            <span>{fill(L(lang, UNIT_TX.minutes), { m: unitMinutes(n) })}</span>
          </div>
          {wide && btn}
        </div>
        <div className={`o-vis o-steps ${many ? 'many' : ''}`}>
          {u.steps.map((s, i) => (
            <div key={s.step.id} className="o-stp a" data-p={i}>
              <span className="gl">
                <G k={s.glyph} w={wide ? 38 : many ? 22 : 26} />
              </span>
              <b>{bidi(s.title, lang)}</b>
              <span className="n">{i + 1}</span>
            </div>
          ))}
          {!wide && btn}
        </div>
      </>
    );
  },
  run: async (c, spec) => {
    const u = unitSpec(spec);
    const cp = unitCopy(u.course, u.theme, u.section);
    const n = u.steps.length;
    c.on('.o-eyebrow');
    c.on('.o-hl');
    c.toni('encouraging');
    const s = c.say({ he: fill(UNIT_TX.stepsSay.he, { n, m: unitMinutes(n) }), en: fill(UNIT_TX.stepsSay.en, { n, m: unitMinutes(n) }) });
    const deg = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19];
    for (let i = 0; i < n; i++) {
      await c.wait(220);
      c.on(`[data-p="${i}"]`);
      c.play({ n: [[72 + deg[i % deg.length], 0, 0.15, 0.3]] });
    }
    c.on('.o-meta');
    await s;
    c.on('.o-go');
    c.add('.o-go', 'pulse');
    await c.say(cp.theme.goalSay);
    await c.wait(600);
  },
  rest: (c) => c.add('.o-go', 'pulse'),
};

const UNIT_SCENES = [U_WHAT, U_WHY, U_STEPS];

// ---------------------------------------------------------------- the film

const reducedMotion = () => typeof document !== 'undefined' && (document.documentElement.dataset.motion === 'reduced' || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches));

function useViewport() {
  const read = () => ({ w: typeof window === 'undefined' ? 390 : window.innerWidth, h: typeof window === 'undefined' ? 844 : window.innerHeight });
  const [v, setV] = useState(read);
  useEffect(() => {
    const on = () => setV(read());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return v;
}

/** The design frame: phone 390 wide (at least 740 tall), wide 1280×720, scaled to fill the screen. */
export function filmFrame(w: number, h: number): { wide: boolean; scale: number; fw: number; fh: number } {
  const wide = w >= 760 && w > h * 1.1;
  const scale = wide ? Math.min(w / 1280, h / 720) : Math.min(w / 390, h / 740);
  return { wide, scale, fw: w / scale, fh: h / scale };
}

type Mode = 'gate' | 'playing' | 'paused' | 'ended';

export function Opener({ spec, lang, onDone }: { spec: OpenerSpec; lang: Lang; onDone: (how: 'start' | 'skip') => void }) {
  const scenes = spec.kind === 'course' ? COURSE_SCENES : UNIT_SCENES;
  const vp = useViewport();
  const { wide, scale, fw, fh } = filmFrame(vp.w, vp.h);
  const [i, setI] = useState(0);
  const [mode, setMode] = useState<Mode>(() => (automated() ? 'playing' : 'gate'));
  const [run, setRun] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [cap, setCap] = useState<{ text: string; ms: number; id: number } | null>(null);
  const [toni, setToni] = useState<ToniMood>(scenes[0].toni);
  const [ready, setReady] = useState(automated());
  const sceneRef = useRef<HTMLDivElement>(null);
  const capId = useRef(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  // Audio: the tap that opened the film is the gesture; if audio is still blocked, one "Watch with sound" button.
  useEffect(() => {
    if (automated()) return;
    let off = false;
    tts.unlock();
    void tts.prepare(lang);
    void piano
      .unlock()
      .catch(() => {})
      .then(() => {
        if (off) return;
        setReady(true);
        setMode(piano.audioRunning ? 'playing' : 'gate');
      });
    return () => {
      off = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = useCallback(
    (k: number, m: Mode = 'playing') => {
      const n = Math.max(0, Math.min(scenes.length - 1, k));
      setPrev((p) => (n !== i ? i : p));
      setI(n);
      setToni(scenes[n].toni);
      setCap(null);
      setMode(m);
      setRun((r) => r + 1);
    },
    [i, scenes],
  );

  // The leaving scene fades out while the next fades in.
  useEffect(() => {
    if (prev === null) return;
    const id = window.setTimeout(() => setPrev(null), reducedMotion() ? 0 : 340);
    return () => clearTimeout(id);
  }, [prev, run]);

  // Run the current scene's script; at its end, the next scene (or the resting end frame).
  useLayoutEffect(() => {
    const root = sceneRef.current;
    if (!root) return;
    const ctl = new AbortController();
    const c = makeCtx(root, lang, wide, ctl.signal, {
      caption: (text, ms) => setCap({ text, ms, id: ++capId.current }),
      toni: setToni,
    });
    const sc = scenes[i];
    if (mode !== 'playing') {
      sc.rest?.(c, spec);
      return () => ctl.abort();
    }
    void (async () => {
      await sc.run(c, spec);
      if (ctl.signal.aborted) return;
      await c.wait(450);
      if (ctl.signal.aborted) return;
      if (i < scenes.length - 1) goTo(i + 1);
      else {
        setMode('ended');
        setRun((r) => r + 1);
      }
    })();
    return () => {
      ctl.abort();
      tts.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, run, mode === 'playing', wide, lang]);

  // The screen behind the film never scrolls while it plays.
  useEffect(() => {
    const el = document.documentElement;
    const was = el.style.overflow;
    el.style.overflow = 'hidden';
    return () => {
      el.style.overflow = was;
      tts.cancel();
    };
  }, []);

  const finish = (how: 'start' | 'skip') => {
    tts.cancel();
    doneRef.current(how);
  };
  const togglePause = () => {
    if (mode === 'playing') {
      setMode('paused');
      setCap(null);
      setRun((r) => r + 1);
    } else goTo(mode === 'ended' ? 0 : i);
  };
  const startWithSound = () => {
    void piano.unlock().finally(() => goTo(i));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish('skip');
      else if (e.key === ' ' && !(e.target as HTMLElement)?.closest?.('button')) {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const rest = mode !== 'playing';
  const course = courseOf(spec.course);
  const chip = spec.kind === 'course' ? course.name[lang] : `${fill(L(lang, UNIT_TX.unit), { n: spec.no })} · ${themeName(spec, lang)}`;
  const chipGlyph = spec.kind === 'course' ? course.glyph : themeGlyph(spec.theme);
  const body = (k: number) => {
    const Sc = scenes[k];
    return <Sc.Body spec={spec} lang={lang} wide={wide} toni={k === i ? toni : Sc.toni} onStart={() => finish('start')} />;
  };
  const name = spec.kind === 'course' ? (lang === 'he' ? `פתיחת הקורס: ${course.name.he}` : `Course intro: ${course.name.en}`) : lang === 'he' ? 'פתיחת היחידה' : 'Unit intro';

  return (
    <div className="opener" role="dialog" aria-modal="true" aria-label={name} data-opener={spec.kind} data-opener-scene={scenes[i].id} data-opener-mode={mode} data-opener-wide={wide ? '1' : '0'}>
      <div className={`o-film ${wide ? 'wide' : 'phone'}`} dir={lang === 'he' ? 'rtl' : 'ltr'} lang={lang} style={{ width: fw, height: fh, transform: `scale(${scale})` }}>
        <div className="o-staffbg" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="o-prog" role="group" aria-label={lang === 'he' ? 'סצנות' : 'Scenes'}>
          {scenes.map((s, k) => (
            <button
              key={k}
              type="button"
              className={k < i || (k === i && mode === 'ended') ? 'done' : k === i ? `cur${rest ? ' rest' : ''}` : ''}
              style={{ ['--d' as string]: `${s.dur * SPEED()}s` }}
              aria-label={`${L(lang, FILM.scene)} ${k + 1}: ${L(lang, s.name)}`}
              aria-current={k === i ? 'step' : undefined}
              onClick={() => goTo(k, mode === 'paused' || mode === 'ended' ? 'paused' : 'playing')}
              data-opener-seg={k}
            >
              <i key={`${i}-${run}`}>
                <b />
              </i>
            </button>
          ))}
        </div>
        <div className="o-bar">
          <span className="o-cchip">
            <PaperGlyph kind={chipGlyph as GlyphKind} width={wide ? 28 : 22} height={wide ? 28 : 22} />
            {chip}
          </span>
          <span className="o-ctl">
            <button type="button" className="o-ib" onClick={() => goTo(i - 1)} disabled={i === 0} aria-label={L(lang, FILM.back)} data-opener-back>
              <Icon k="back" size={wide ? 22 : 18} />
            </button>
            <button type="button" className="o-ib" onClick={togglePause} disabled={mode === 'gate'} aria-label={mode === 'playing' ? L(lang, FILM.pause) : L(lang, FILM.resume)} data-opener-pause>
              <Icon k={mode === 'playing' ? 'pause' : 'play'} size={wide ? 22 : 18} />
            </button>
            <button type="button" className="o-skip" onClick={() => finish('skip')} data-opener-skip>
              {LT(lang, FILM.skip)}
            </button>
          </span>
        </div>
        {prev !== null && prev !== i && (
          <div className="o-scene rest o-leave" key={`prev-${prev}`} aria-hidden="true">
            {body(prev)}
          </div>
        )}
        <div className={`o-scene ${rest ? 'rest' : ''} ${prev !== null ? 'o-enter' : ''}`} key={`${i}-${run}-${mode}`} ref={sceneRef} data-scene={scenes[i].id}>
          {body(i)}
        </div>
        <div className="o-sub" aria-live="polite">
          {cap && mode === 'playing' && <TypedText key={cap.id} text={cap.text} msPerWord={cap.ms} sound={false} />}
        </div>
        {(mode === 'gate' || mode === 'paused') && ready && (
          <div className="o-endcard">
            <button type="button" className="o-bigplay" onClick={mode === 'gate' ? startWithSound : togglePause} data-opener-play>
              <span className="c">
                <Icon k="play" size={wide ? 48 : 38} />
              </span>
              <em>{mode === 'gate' ? L(lang, FILM.watch) : L(lang, FILM.resume)}</em>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

