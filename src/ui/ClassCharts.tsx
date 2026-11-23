// The teacher's progress charts on the class page (docs/SPEC-PROGRESS-CHARTS.md §4; owner 2026-11-22): the class
// settings' median switch (show students the anonymous class median, default off), the small cards per student and the
// students × weeks heat map (TeacherProgress.tsx), and — a student's card opened — "since the last lesson" for that
// student. Shown only when the summaries sync (cloud/snapshots.ts snapshotsOn): until the owner applies the migration
// the class page looks as before.

import { useEffect, useState } from 'react';
import { classMedianOn, classSnapshots, setClassMedian, snapshotsOn } from '../cloud/snapshots';
import { ClassProgress, MedianSwitch, type StudentSnaps } from './TeacherProgress';
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
    </div>
  );
}
