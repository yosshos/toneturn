// After a chorus (0.56, owner 2026-11-09): a short debrief of an improvisation under rules — what went well, the one
// thing to work on, where in the form the rules broke (by bar and chord), and the next step: the same challenge again,
// a harder one or an easier one, and at which tempo. Pure.

import type { ParsedChart } from './charts';
import { CHALLENGES, RULE_NAME, challengeOf, type Challenge, type RuleSet, type RulesReport } from './improvRules';

type Bi = { en: string; he: string };
export interface Debrief {
  /** One-line verdict. */
  headline: Bi;
  good: Bi | null;
  work: Bi | null;
  /** Where the breaks were ("bars 5–6, G7 → Cmaj7"). */
  where: Bi | null;
  next: { kind: 'harder' | 'again' | 'easier'; challenge: Challenge | null; bpm: number; why: Bi };
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** The next challenge up or down: the same group one level harder / easier, else the nearest level anywhere. */
export function stepChallenge(cur: Challenge, dir: 1 | -1): Challenge | null {
  const want = cur.level + dir;
  const same = CHALLENGES.filter((c) => c.group === cur.group && c.level === want && c.id !== cur.id);
  if (same.length) return same[0];
  const any = CHALLENGES.filter((c) => c.level === want && c.id !== cur.id);
  return any[0] ?? null;
}

export function debrief(rep: RulesReport, chart: ParsedChart, meter: number, rules: RuleSet, bpm: number): Debrief {
  const active = rep.checks.filter((c) => c.total > 0).map((c) => ({ ...c, r: c.ok / c.total }));
  const best = [...active].sort((a, b) => b.r - a.r)[0];
  const worst = [...active].sort((a, b) => a.r - b.r)[0];
  const score = rep.score;
  const cur = challengeOf(rules);
  const headline: Bi =
    rep.notes < 4
      ? { en: 'Too few notes to judge — play a whole chorus.', he: 'מעט מדי צלילים כדי לשפוט — נגנו סבב שלם.' }
      : score >= 0.85
        ? { en: `Rules kept: ${pct(score)}. That is solid.`, he: `עמידה בכללים: ${pct(score)}. זה יציב.` }
        : score >= 0.6
          ? { en: `Rules kept: ${pct(score)}. Nearly there.`, he: `עמידה בכללים: ${pct(score)}. כמעט שם.` }
          : { en: `Rules kept: ${pct(score)}. Slow it down and keep the rule first.`, he: `עמידה בכללים: ${pct(score)}. האטו, וקודם כל שמרו על הכלל.` };
  const good = best && best.r >= 0.75 ? { en: `${RULE_NAME[best.rule].en}: ${pct(best.r)} — keep that.`, he: `${RULE_NAME[best.rule].he}: ${pct(best.r)} — לשמור על זה.` } : null;
  const work = worst && worst.r < 0.85 && worst !== best ? { en: `Work on: ${RULE_NAME[worst.rule].en} (${pct(worst.r)}). ${RULE_NAME[worst.rule].how.en}`, he: `לעבוד על: ${RULE_NAME[worst.rule].he} (${pct(worst.r)}). ${RULE_NAME[worst.rule].how.he}` } : worst && worst.r < 0.85 && active.length === 1 ? { en: `Work on: ${RULE_NAME[worst.rule].how.en}`, he: `לעבוד על: ${RULE_NAME[worst.rule].how.he}` } : null;
  // where: the two neighbouring bars (of the chart) with the most breaks
  const perBar = Array.from({ length: chart.bars }, () => 0);
  rep.bars.forEach((b, i) => (perBar[i % chart.bars] += b.breaks));
  let at = -1;
  let most = 0;
  for (let i = 0; i < chart.bars; i++) {
    const two = perBar[i] + (perBar[i + 1] ?? 0);
    if (two > most) [most, at] = [two, i];
  }
  const syms = (i: number) => chart.chords.filter((c) => c.bar === i).map((c) => c.sym).join(' ');
  const where: Bi | null =
    at >= 0 && most >= 2
      ? (() => {
          const span = perBar[at + 1] ? `${at + 1}–${at + 2}` : `${at + 1}`;
          const ch = perBar[at + 1] ? `${syms(at)} → ${syms(at + 1)}` : syms(at);
          return { en: `Most breaks in bar${perBar[at + 1] ? 's' : ''} ${span} (${ch}) — loop that spot slowly.`, he: `הכי הרבה חריגות בתיב${perBar[at + 1] ? 'ות' : 'ה'} ${span} (${ch}) — עשו לופ איטי על המקום הזה.` };
        })()
      : null;
  void meter;
  let next: Debrief['next'];
  if (rep.notes < 4) {
    next = { kind: 'again', challenge: cur, bpm, why: { en: 'Play through the whole chorus, then we can talk.', he: 'נגנו את כל הסבב, ואז נדבר.' } };
  } else if (score >= 0.85) {
    const up = cur ? stepChallenge(cur, 1) : null;
    next = up
      ? { kind: 'harder', challenge: up, bpm, why: { en: `Ready for more: ${up.title.en}.`, he: `מוכנים ליותר: ${up.title.he}.` } }
      : { kind: 'again', challenge: cur, bpm: Math.min(300, bpm + 12), why: { en: 'Same rules, faster.', he: 'אותם כללים, מהר יותר.' } };
  } else if (score >= 0.6) {
    next = { kind: 'again', challenge: cur, bpm, why: { en: 'Once more at this tempo — aim for 85%.', he: 'עוד פעם בטמפו הזה — המטרה 85%.' } };
  } else {
    const down = cur && bpm <= 70 ? stepChallenge(cur, -1) : null;
    next = down
      ? { kind: 'easier', challenge: down, bpm, why: { en: `A step back first: ${down.title.en}.`, he: `צעד אחורה קודם: ${down.title.he}.` } }
      : { kind: 'easier', challenge: cur, bpm: Math.max(50, bpm - 15), why: { en: 'The same rules, slower.', he: 'אותם כללים, לאט יותר.' } };
  }
  return { headline, good, work, where, next };
}
