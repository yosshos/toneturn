// Dev-only (#/dev/elements?part=…&lang=he|en&theme=light|dark): the studio design elements in the real components,
// for screenshots. Parts: badges (leagues, ranks, badges), rankup, tempo, instruments, share.

import { useEffect } from 'react';
import { BADGES } from '../../engine/badges';
import { TUNINGS } from '../../engine/fretboard';
import { BadgeArt } from '../BadgeArt';
import { RankCrest } from '../Badges';
import { RankUpUnlock } from '../BadgeUnlock';
import { Keyboard } from '../bits';
import { KeysPad, Neck } from '../Instrument';
import { LeagueBadge, LeagueLadder } from '../LeagueBadge';
import { NoteStaff } from '../NoteViews';
import { Toni } from '../Toni';
import { el } from '../../i18n/elementsText';
import { studioShareCardSvg } from './shareCard';
import { TempoBest } from './StudioArt';

const q = new URLSearchParams(location.hash.split('?')[1] ?? '');
const lang = (q.get('lang') === 'en' ? 'en' : 'he') as 'he' | 'en';
const theme = q.get('theme') === 'dark' ? 'dark' : 'light';
const part = q.get('part') ?? 'badges';
const LEAGUES = { he: ['שורש', 'טרצה', 'קווינטה', 'ספטימה', 'נונה', '♯11', '13'], en: ['Root', 'Third', 'Fifth', 'Seventh', 'Ninth', '♯11', '13'] };

export function ElementsGallery() {
  useEffect(() => {
    const r = document.documentElement;
    r.dataset.look = 'studio';
    r.dataset.theme = theme;
    r.lang = lang;
    r.dir = lang === 'he' ? 'rtl' : 'ltr';
  }, []);
  const he = lang === 'he';
  const badges = BADGES.filter((b) => b.cat === 'skill').slice(0, 4);
  const notes = [60, 64, 67, 65, 69, 67, 64, 62];
  return (
    <main className="panel-screen el-gallery" dir={he ? 'rtl' : 'ltr'} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 18, background: 'var(--bg)', color: 'var(--ink)', minHeight: '100vh' }}>
      {part === 'badges' && (
        <>
          <section>
            <h2>{he ? 'ליגות' : 'Leagues'}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {[1, 2, 3, 4, 5, 6, 7].map((t) => (
                <LeagueBadge key={t} tier={t} size={64} ghostNext={t === 3} title={LEAGUES[lang][t - 1]} />
              ))}
            </div>
            <LeagueLadder tier={3} names={LEAGUES[lang]} />
          </section>
          <section>
            <h2>{he ? 'דרגות' : 'Ranks'}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {[0, 4, 8, 9, 13, 15, null].map((d, i) => (
                <RankCrest key={i} div={d} size={52} lang={lang} />
              ))}
            </div>
          </section>
          <section>
            <h2>{he ? 'תגים' : 'Badges'}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {badges.map((b, i) => (
                <BadgeArt key={b.id} badge={b} earned={i < 3} size={72} lang={lang} />
              ))}
            </div>
          </section>
        </>
      )}
      {part === 'rankup' && <RankUpUnlock change={{ area: 'technique', to: 8 }} lang={lang} onDone={() => {}} />}
      {part === 'tempo' && (
        <section className="rp-cele" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <Toni state="celebrating" size={120} />
          <TempoBest bpm={132} prev={120} prevLabel={el('prevBest', lang)} />
          <h1>{el('newBest', lang)}</h1>
          <button className="btn mega">{el('share', lang)}</button>
        </section>
      )}
      {part === 'instruments' && (
        <>
          <Keyboard low={60} high={76} mark={64} live={false} />
          <KeysPad lo={60} hi={76} marks={[{ m: 64, tone: 'ok' }, { m: 67, tone: 'wrong' }, { m: 70, tone: 'given' }]} label="keys" />
          <Neck tuning={TUNINGS[0]} lo={0} hi={6} dots={[{ str: 5, fret: 3, label: 'R', tone: 'root' }, { str: 4, fret: 2, label: '3', tone: 'given' }, { str: 3, fret: 0, label: '5', tone: 'ok' }, { str: 2, fret: 1, label: '1', tone: 'wrong' }]} label="neck" />
          <div className="svg-wrap">
            <NoteStaff notes={notes} chord={false} keyPc={null} durs={notes.map(() => 1)} meter={4} marks={['ok', 'ok', 'early', 'ok', 'late', 'ok', 'wrong', undefined]} devs={[0, 0, -60, 0, 70, 0, 0, null]} now={7} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {['#ffd27a', '#c9b8f5', '#9fd8f7'].map((c) => (
              <button key={c} className="tap-pad big" style={{ ['--pc' as string]: c, maxWidth: 110, minHeight: 90, color: '#1e1033' }}>
                {c === '#ffd27a' ? 'Crash' : c === '#c9b8f5' ? 'Hi-hat' : 'Tom'}
              </button>
            ))}
          </div>
        </>
      )}
      {part === 'share' && (
        <img
          className="chl-card-img"
          alt="share"
          src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(studioShareCardSvg({ title: he ? 'נועה 3' : 'Noa 3', by: he ? 'נועה' : 'Noa', bpm: 120, keys: 12, level: 4, notes: [60, 64, 67, 65, 69, 72, 71, 67].map((p, i) => ({ pitch: p, beat: i / 2 })), beats: 4, meter: 4, lang }))}`}
        />
      )}
    </main>
  );
}
