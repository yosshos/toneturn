// The teacher's progress charts on the class page (docs/SPEC-PROGRESS-CHARTS.md §4; owner 2026-11-22): the class
// settings' median switch (show students the anonymous class median, default off), the small cards per student and the
// students × weeks heat map (TeacherProgress.tsx), and — a student's card opened — "since the last lesson" for that
// student. Shown only when the summaries sync (cloud/snapshots.ts snapshotsOn): until the owner applies the migration
// the class page looks as before.

import { useEffect, useMemo, useState } from 'react';
import { classMedianOn, classSnapshots, digestSnapshots, setClassMedian, snapshotsOn } from '../cloud/snapshots';
import type { Snapshot } from '../engine/snapshot';
import { AssignmentAcrossClass, ClassAreasCard, ClassProgress, DigestCharts, MedianSwitch, MinutesVsAsked, type StudentSnaps } from './TeacherProgress';
import { ProgressOverTime } from './ProgressOverTime';
import { askedMinutes, classMedianOf } from '../engine/classCharts';
import { assignOptsFor, type AssignOpts } from '../cloud/teacher';
import { SinceLesson } from './SinceLesson';
import { areaLabel } from './Stats';
import { localDay } from '../storage/progress';
import type { AssignItem } from '../cloud/teacher';
import { alertsOf, burnup } from '../engine/burnup';
import { AlertCards, BurnUpRow } from './ExtraCharts';
import { catalog } from '../engine/drills/generate';

/** An item id's readable name for the alerts (a technique level's title in its key), else the id. */
function itemName(id: string, lang: Lang): string {
  const [fam, , key] = id.split(':');
  for (const f of catalog()) {
    if (f.id !== fam) continue;
    const k = Number(key);
    return `${f.title[lang]}${Number.isFinite(k) ? ` · ${['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'][((k % 12) + 12) % 12]}` : ''}`;
  }
  return id;
}

type Lang = 'he' | 'en';
const addDays = (day: string, n: number) => new Date(new Date(day + 'T00:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);

export function ClassMedianSetting({ classId, lang }: { classId: string; lang: Lang }) {
  const on = snapshotsOn();
  const [median, setMedian] = useState(false);
  useEffect(() => {
    if (on) void classMedianOn(classId).then(setMedian);
  }, [classId, on]);
  if (!on) return null;
  return (
    <div className="class-settings" data-class-settings={classId}>
      <MedianSwitch on={median} lang={lang} onChange={(v) => (setMedian(v), void setClassMedian(classId, v).catch(() => setMedian(!v)))} />
    </div>
  );
}

export function ClassCharts({ classId, students, lang, assignments, titleOf }: { classId: string; students: { id: string; name: string }[]; lang: Lang; /** Phase 8 (§4.1): the class's assignments — a burn-up per assignment for the opened student. */ assignments?: AssignItem[]; titleOf?: (a: AssignItem) => string }) {
  const on = snapshotsOn();
  const today = localDay(new Date());
  const [data, setData] = useState<StudentSnaps[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const ids = students.map((s) => s.id).join(',');
  // §4.1: what the teacher asked per day (the assignments' minutes a day; empty until their options sync)
  const [opts, setOpts] = useState<Record<string, AssignOpts>>({});
  const aids = (assignments ?? []).map((a) => a.id).join(',');
  useEffect(() => {
    if (!on || !aids) return;
    void assignOptsFor(aids.split(',')).then(setOpts).catch(() => setOpts({}));
  }, [aids, on]);
  // the class median (the teacher sees it always: a grey reference on the student's tempo and minutes charts)
  const classMed = useMemo(() => (data ? classMedianOf(data, addDays(today, -60), today) : []), [data, today]);
  useEffect(() => {
    if (!on) return;
    void classSnapshots(classId, addDays(today, -60))
      .then((by) => setData(students.map((s) => ({ id: s.id, name: s.name, snaps: by[s.id] ?? {} }))))
      .catch(() => setData([]));
  }, [classId, ids, on]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!on || !data) return null;
  const st = open ? data.find((s) => s.id === open) : null;
  return (
    <div className="class-charts" data-class-charts={classId}>
      <ClassProgress students={data.filter((s) => Object.keys(s.snaps).length)} lang={lang} today={today} onOpenStudent={(id) => setOpen((o) => (o === id ? null : id))} />
      {st && <AlertCards alerts={alertsOf(st.snaps, today)} lang={lang} who={st.name} itemName={(id) => itemName(id, lang)} />}
      {st && <MinutesVsAsked snaps={st.snaps} asked={askedMinutes(opts, assignments ?? [], today)} lang={lang} today={today} who={st.name} />}
      {st && <SinceLesson key={st.id} snaps={st.snaps} lang={lang} today={today} areaName={(a) => areaLabel(a, lang)} who={st.name} />}
      {st && assignments && assignments.length > 0 && (
        <section className="pt-card" aria-label={lang === 'he' ? 'המשימות' : 'Assignments'} data-burnups={st.id}>
          <div className="pt-card-head">
            <h3>
              {st.name} · {lang === 'he' ? 'התקדמות במשימות' : 'Assignment progress'}
            </h3>
          </div>
          {assignments
            .filter((a) => a.kind !== 'focus')
            .slice(0, 6)
            .map((a) => (
              <BurnUpRow key={a.id} b={burnup(a, today, st.id)} kind={a.kind} title={titleOf?.(a) ?? a.ref ?? a.kind} lang={lang} />
            ))}
        </section>
      )}
      {st && (
        <section className="pt-card" aria-label={lang === 'he' ? `${st.name} · לאורך זמן` : `${st.name} · Over time`} data-student-over-time={st.id}>
          <div className="pt-card-head">
            <h3>{lang === 'he' ? `${st.name} · לאורך זמן` : `${st.name} · Over time`}</h3>
          </div>
          <ProgressOverTime key={st.id} lang={lang} snapshots={st.snaps} today={today} median={classMed} areaName={(a) => areaLabel(a, lang)} readOnly />
        </section>
      )}
      {assignments && assignments.length > 0 && <AssignmentAcrossClass assignments={assignments} students={data.map((s) => ({ id: s.id, name: s.name }))} lang={lang} today={today} titleOf={(a) => titleOf?.(a as AssignItem) ?? a.ref ?? a.kind} />}
      <ClassAreasCard students={data.filter((s) => Object.keys(s.snaps).length)} lang={lang} today={today} areaName={(a) => areaLabel(a, lang)} />
    </div>
  );
}

/** §4.2: the parent digest's simple version (tiles, the calendar, the week's minutes), when the summaries sync. */
export function DigestOverTime({ token, lang }: { token: string; lang: Lang }) {
  const on = snapshotsOn();
  const today = localDay(new Date());
  const [snaps, setSnaps] = useState<Record<string, Snapshot> | null>(null);
  useEffect(() => {
    if (on) void digestSnapshots(token, addDays(today, -90)).then(setSnaps);
  }, [token, on]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!on || !snaps) return null;
  return <DigestCharts snaps={snaps} lang={lang} today={today} kindName={(k) => areaLabel(k, lang)} />;
}
