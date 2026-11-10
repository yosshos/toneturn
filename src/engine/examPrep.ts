// Exam prep (0.67, owner 2026-11-10): the old "Exams" course is now a mode of the Ear & theory course. Pure: which mock
// exam a result was, the next mock to sit and the weakest sections, for the Today card.
import { EXAMS, type ExamDef, type ExamSection } from '../content/bagrut';

/** The fields of a result this module reads (LessonResult without the storage import). */
export interface ExamResultLike {
  completedAt: string;
  items?: { id: string; correct: boolean; score?: number }[];
}

/** Mock-exam items are named "<exam>-<section>-<n>" (ui/Exams.tsx mockExamLesson). */
function parseItem(id: string): { exam: ExamDef; section: ExamSection } | null {
  // Longest exam id first, so "jamd-jazz" is never read as "jamd".
  for (const e of BY_LENGTH) {
    if (!id.startsWith(`${e.id}-`)) continue;
    const rest = id.slice(e.id.length + 1).replace(/-\d+$/, '');
    const section = e.sections.find((x) => x.id === rest);
    if (section) return { exam: e, section };
  }
  return null;
}
const BY_LENGTH = [...EXAMS].sort((a, b) => b.id.length - a.id.length);

export interface MockSitting {
  exam: ExamDef;
  at: string;
  /** First-try share right per section, in the exam's order. */
  sections: { section: ExamSection; right: number; total: number }[];
}

/** Every mock exam (or part of one) the player sat, oldest first. */
export function mockSittings(history: ExamResultLike[]): MockSitting[] {
  const out: MockSitting[] = [];
  for (const r of history) {
    const items = r.items ?? [];
    const first = items.length ? parseItem(items[0].id) : null;
    if (!first) continue;
    const by = new Map<string, { right: number; total: number }>();
    for (const it of items) {
      const p = parseItem(it.id);
      if (!p || p.exam.id !== first.exam.id) continue;
      const b = by.get(p.section.id) ?? { right: 0, total: 0 };
      b.total += 1;
      b.right += (it.score ?? (it.correct ? 1 : 0)) >= 0.5 ? 1 : 0;
      by.set(p.section.id, b);
    }
    out.push({ exam: first.exam, at: r.completedAt, sections: first.exam.sections.filter((x) => by.has(x.id)).map((x) => ({ section: x, ...by.get(x.id)! })) });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

export interface ExamCard {
  /** The mock to sit next: the exam last sat (practise it again), else the first Bagrut. */
  exam: ExamDef;
  minutes: number;
  /** When it was last sat (absent = never). */
  lastAt?: string;
  /** Up to `n` weakest sections of the last sitting (below 70% right), worst first. */
  weak: { section: ExamSection; pct: number }[];
}

export function examCard(history: ExamResultLike[], n = 2): ExamCard {
  const sits = mockSittings(history);
  const last = sits[sits.length - 1];
  const exam = last?.exam ?? EXAMS.find((e) => e.kind === 'bagrut') ?? EXAMS[0];
  const weak = (last?.sections ?? [])
    .map((x) => ({ section: x.section, pct: x.total ? x.right / x.total : 1 }))
    .filter((x) => x.pct < 0.7)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, n);
  return { exam, minutes: exam.sections.reduce((a, x) => a + x.minutes, 0), ...(last ? { lastAt: last.at } : {}), weak };
}
