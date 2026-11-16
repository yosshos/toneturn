// Staff Runner (keys): read the note at the now-cue on the staff and play it on its beat. Engine:
// src/engine/staffRunner.ts; the screen is the beginner shell (BeginnerShell.tsx) with a VexFlow staff.

import { spellMidi } from '../engine/aids';
import { KEY_NAME, KEY_SHOW, type BLap } from '../engine/beginnerRun';
import { pc as pcOf } from '../engine/pitch';
import { staffDurs, staffJudge, staffLap } from '../engine/staffRunner';
import type { NoteMark } from '../engine/noteMarks';
import type { GameScreenProps } from './gameProps';
import { BeginnerShell, noteNameIn, type BeginnerCfg } from './BeginnerShell';
import { NoteStaff } from './NoteViews';
import { Sym } from './NewGameBits';

const LETTERS = 'CDEFGAB';
/** Where a note sits on the staff: line n, space n, or below / above it (ledger lines). */
export function staffPlace(midi: number, key: number | null, clef: 'treble' | 'bass'): { kind: 'line' | 'space' | 'below' | 'above'; n: number } {
  const s = spellMidi(midi, key === null ? null : pcOf(KEY_NAME[key]));
  const step = s.octave * 7 + LETTERS.indexOf(s.letter);
  const rel = step - (clef === 'treble' ? 30 : 18);
  if (rel < 0) return { kind: 'below', n: -rel };
  if (rel > 8) return { kind: 'above', n: rel - 8 };
  return rel % 2 === 0 ? { kind: 'line', n: rel / 2 + 1 } : { kind: 'space', n: (rel - 1) / 2 + 1 };
}
const ORD_EN = ['first', 'second', 'third', 'fourth'];
const ORD_HE = ['הראשון', 'השני', 'השלישי', 'הרביעי'];
/** Line n, space n, a ledger line below / above (counted from the staff), or just outside it. */
export function placeText(p: ReturnType<typeof staffPlace>, clef: 'treble' | 'bass', lang: 'he' | 'en'): string {
  const he = lang === 'he';
  const c = he ? (clef === 'treble' ? 'במפתח סול' : 'במפתח פה') : clef === 'treble' ? 'of the treble staff' : 'of the bass staff';
  if (p.kind === 'line') return he ? `על קו ${p.n} ${c}` : `on line ${p.n} ${c}`;
  if (p.kind === 'space') return he ? `ברווח ${p.n} ${c}` : `in space ${p.n} ${c}`;
  const below = p.kind === 'below';
  if (p.n === 1) return he ? `${below ? 'מתחת לקו 1' : 'מעל לקו 5'} ${c}` : `just ${below ? 'below' : 'above'} the staff (${clef})`;
  const k = Math.floor(p.n / 2) - 1;
  if (p.n % 2 === 0) return he ? `על קו העזר ${ORD_HE[k] ?? p.n / 2} ${below ? 'מתחת' : 'מעל'} ${c}` : `on the ${ORD_EN[k] ?? `${p.n / 2}th`} ledger line ${below ? 'below' : 'above'} the staff (${clef})`;
  return he ? `${below ? 'מתחת' : 'מעל'} לקו העזר ${ORD_HE[k] ?? ''} ${c}` : `${below ? 'below' : 'above'} the ${ORD_EN[k] ?? ''} ledger line (${clef})`;
}

const MARK: Record<string, NoteMark> = { hit: 'ok', wrong: 'wrong', miss: 'missed' };

const CFG: BeginnerCfg = {
  game: 'staffrunner',
  title: { en: 'Staff Runner', he: 'רץ החמשה' },
  blurb: {
    en: 'Read the note at the marker and play it on its beat. Two bars a lap, a little faster after every clean lap.',
    he: 'קוראים את התו שבסמן ומנגנים אותו על הפעמה שלו. שתי תיבות בסיבוב, קצת יותר מהר אחרי כל סיבוב נקי.',
  },
  inputs: ['midi', 'mic'],
  capture: 'notes',
  keyInst: 'piano',
  lapOf: (seed, level, lap, run) => staffLap(seed, level, lap, run),
  judge: staffJudge,
  board: ({ lap, match, now, lang }) => <StaffBoard lap={lap} marks={match?.marks} got={match?.got.map((e) => e?.midi ?? null)} now={now} lang={lang} />,
  why: ({ lap, m, o, lang, settings }) => {
    const i = o.firstMiss;
    if (i < 0) return null;
    const tg = lap.targets[i];
    const want = noteNameIn(tg.midi!, lap.key, settings, lang);
    const place = placeText(staffPlace(tg.midi!, lap.key, lap.clef ?? 'treble'), lap.clef ?? 'treble', lang);
    const why = lang === 'he' ? `${want} ${place}.` : `${want} sits ${place}.`;
    const g = m.got[i]?.midi;
    if (m.marks[i] === 'wrong' && g !== undefined) {
      const got = noteNameIn(g, lap.key, settings, lang);
      return { line: lang === 'he' ? `${got} במקום ${want}` : `${got} instead of ${want}`, why };
    }
    return { line: lang === 'he' ? `${want} לא נוגן בזמן` : `${want} was not played on time`, why };
  },
};

function StaffBoard({ lap, marks, got, now, lang }: { lap: BLap; marks?: (string | undefined)[]; got?: (number | null)[]; now: number; lang: 'he' | 'en' }) {
  const key = lap.key ?? 0;
  const clef = lap.clef ?? 'treble';
  return (
    <div className="bg-staff">
      <p className="bg-chips">
        <span className="ng-chip">
          {lang === 'he' ? 'פוזיציית ' : ''}
          <Sym text={KEY_SHOW[key]} />
          {lang === 'he' ? '' : ' position'}
        </span>
        <span className="ng-chip">{lang === 'he' ? (clef === 'treble' ? 'מפתח סול' : 'מפתח פה') : clef === 'treble' ? 'Treble clef' : 'Bass clef'}</span>
      </p>
      <div dir="ltr">
        <NoteStaff
          notes={lap.targets.map((t) => t.midi!)}
          chord={false}
          keyPc={pcOf(KEY_NAME[key])}
          clef={clef}
          durs={staffDurs(lap)}
          meter={lap.meter}
          timeSig
          spacing={lap.targets.length <= 4 ? 34 : lap.targets.length <= 8 ? 26 : 20}
          now={now}
          marks={marks?.map((x) => (x ? MARK[x] : undefined))}
          ghosts={marks?.map((x, i) => (x === 'wrong' ? (got?.[i] ?? null) : null))}
        />
      </div>
    </div>
  );
}

export const StaffRunner = (p: GameScreenProps) => <BeginnerShell cfg={CFG} {...p} />;
