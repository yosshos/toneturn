import { beforeEach, describe, expect, it } from 'vitest';
import { parseAlternatives, parseDegree } from '../src/engine/parser';
import { learnedAnswer, learnVoiceAlias, resetVoiceAliases } from '../src/engine/learnedVoice';

const val = (s: string) => {
  const r = parseDegree(s);
  return r.kind === 'answer' ? r.value : r.kind;
};

describe('degree numbers by voice: mishearings', () => {
  it('lone sound-alikes and digit ordinals', () => {
    expect(val('to')).toBe(2);
    expect(val('Too')).toBe(2);
    expect(val('for')).toBe(4);
    expect(val('tree')).toBe(3);
    expect(val('fine')).toBe(5);
    expect(val('sex')).toBe(6);
    expect(val('3rd')).toBe(3);
    expect(val('the 5th')).toBe(5);
  });
  it('Hebrew spelling variants and one-letter misses', () => {
    expect(val('שלש')).toBe(3);
    expect(val('שתי')).toBe(2);
    expect(val('חמשה')).toBe(5);
    expect(val('ארבה')).toBe(4);
    expect(val('שביעת')).toBe(7); // one letter off שביעית
  });
  it('sound-alikes do not fire inside longer sentences', () => {
    expect(val('I want to go for a walk now')).toBe('unrecognized');
  });
  it('alternatives: an answer among the choices wins over the top guess', () => {
    const r = parseAlternatives(['one two', 'two', 'to'], parseDegree, (v) => [2, 5].includes(v));
    expect(r.kind === 'answer' && r.value).toBe(2);
    const r2 = parseAlternatives(['hello', 'five'], parseDegree);
    expect(r2.kind === 'answer' && r2.value).toBe(5);
  });
});

describe('learned voice aliases', () => {
  beforeEach(() => resetVoiceAliases());
  it('a tapped correction teaches the mishearing', () => {
    expect(learnedAnswer('degree', ['Shalom'], [1, 3, 5])).toBe(null);
    learnVoiceAlias('degree', 'Shalom', 3);
    expect(learnedAnswer('degree', ['shalom!'], [1, 3, 5])).toBe(3);
    expect(learnedAnswer('degree', ['shalom'], [1, 5])).toBe(null); // not among the choices
    expect(learnedAnswer('quality', ['shalom'], [3])).toBe(null); // per question kind
  });
});
