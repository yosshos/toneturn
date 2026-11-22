// A stand-in for the progress-snapshot RPCs (dev builds only, localStorage tt.mockSnapshots = 1): the demo class of
// teacherMock.ts ("demo-class", students s1–s4) with four weeks of made-up daily summaries, the teacher's median
// switch, and the anonymous class median. The e2e suite uses it for the class page; production never loads it.

import type { Snapshot } from '../engine/snapshot';

const MEDIAN_KEY = 'tt.mockSnapshots.median';
export const MOCK_STUDENTS = [
  { id: 's1', name: 'Noa', mins: 28, closeEvery: 2, skip: 6 },
  { id: 's2', name: 'Ari', mins: 12, closeEvery: 5, skip: 3 },
  { id: 's3', name: 'Maya', mins: 40, closeEvery: 1, skip: 7 },
  { id: 's4', name: 'Tom', mins: 6, closeEvery: 9, skip: 2 },
];

const dayOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Four weeks of one mock student's snapshots, ending today. */
export function mockStudentSnaps(st: (typeof MOCK_STUDENTS)[number], today = new Date()): Record<string, Snapshot> {
  const out: Record<string, Snapshot> = {};
  for (let i = 27; i >= 0; i--) {
    const k = 27 - i;
    const day = dayOf(new Date(today.getTime() - i * 86400000));
    const practised = k % st.skip !== st.skip - 1;
    out[day] = {
      day,
      status: { 'keys:technique': { closed: Math.floor(k / st.closeEvery), learning: 5, almost: 2 }, 'keys:harmony': { closed: Math.floor(k / (st.closeEvery * 2)), learning: 3 } },
      tempo: { 'keys:technique': Math.min(1, 0.45 + k * 0.01 * (10 / (st.closeEvery + 9))), 'keys:harmony': 0.5 },
      minutes: practised ? { technique: Math.round(st.mins * 0.7), improv: Math.round(st.mins * 0.3) } : {},
      channels: { ear: 0.6, reading: 0.4 },
      keys: { 0: Math.min(1, k / 30) },
      vocab: { played: 2, closed: 1 },
      practised,
    };
  }
  return out;
}

export async function mockSnapshotRpc(fn: string, a: Record<string, unknown>): Promise<unknown> {
  switch (fn) {
    case 'toneturn_snapshot_put':
      return null;
    case 'toneturn_class_snapshots':
      return MOCK_STUDENTS.flatMap((st) => Object.values(mockStudentSnaps(st)).filter((s) => s.day >= String(a.p_from)).map((s) => ({ user_id: st.id, day: s.day, data: s })));
    case 'toneturn_class_set_median':
      localStorage.setItem(MEDIAN_KEY, a.p_on ? '1' : '0');
      return null;
    case 'toneturn_class_median_on':
      return localStorage.getItem(MEDIAN_KEY) === '1';
    case 'toneturn_class_median': {
      if (localStorage.getItem(MEDIAN_KEY) !== '1') throw new Error('not available');
      const per = MOCK_STUDENTS.map((st) => mockStudentSnaps(st));
      const days = Object.keys(per[0]).filter((d) => d >= String(a.p_from)).sort();
      const med = (xs: number[]) => {
        const s = [...xs].sort((x, y) => x - y);
        return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
      };
      return days.map((day) => ({
        day,
        tempo: med(per.map((p) => Object.values(p[day].tempo).reduce((x, y) => x + y, 0) / Math.max(1, Object.values(p[day].tempo).length))),
        minutes: med(per.map((p) => Object.values(p[day].minutes).reduce((x, y) => x + y, 0))),
        n: per.length,
      }));
    }
    default:
      throw new Error(`mock: ${fn} not offered`);
  }
}
