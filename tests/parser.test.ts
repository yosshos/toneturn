import { describe, expect, it } from 'vitest';
import { parseAlternatives, parseDegree, parseNoteName } from '../src/engine/parser';

describe('parseDegree', () => {
  const ans = (t: string) => {
    const r = parseDegree(t);
    return r.kind === 'answer' ? r.value : r.kind;
  };
  it.each([
    ['one', 1], ['One.', 1], ['1', 1], ['won', 1], ['first', 1], ['five', 5], ['5', 5], ['Fifth!', 5], ['V', 5],
    ['degree five', 5], ["it's five", 5], ['the dominant', 5], ['I', 1],
    ['אחת', 1], ['אחד', 1], ['חמש', 5], ['חמישית', 5], ['דרגה חמש', 5], ['החמישית', 5], ['זה חמש', 5], ['דרגה אחת', 1],
    ['three', 3], ['שלוש', 3],
  ])('%s → %s', (t, v) => expect(ans(t as string)).toBe(v));

  it('reports ambiguity instead of guessing', () => {
    const r = parseDegree('one or five');
    expect(r.kind).toBe('ambiguous');
    if (r.kind === 'ambiguous') expect(r.candidates).toEqual([1, 5]);
    expect(parseDegree('אחת חמש').kind).toBe('ambiguous');
  });
  it('unrecognized for noise / empty', () => {
    expect(parseDegree('').kind).toBe('unrecognized');
    expect(parseDegree('banana').kind).toBe('unrecognized');
    expect(parseDegree('I think').kind).toBe('unrecognized');
  });
  it('commands', () => {
    const cmd = (t: string) => {
      const r = parseDegree(t);
      return r.kind === 'command' ? r.command : r.kind;
    };
    expect(cmd('repeat')).toBe('repeat');
    expect(cmd('one more time')).toBe('repeat'); // not degree 1
    expect(cmd('שוב')).toBe('repeat');
    expect(cmd('עוד פעם')).toBe('repeat');
    expect(cmd('skip')).toBe('skip');
    expect(cmd('דלג')).toBe('skip');
    expect(cmd('stop')).toBe('stop');
    expect(cmd('עצור')).toBe('stop');
    expect(cmd('explain')).toBe('explain');
    expect(cmd('הסבר')).toBe('explain');
  });
  it('answer + command together is ambiguous', () => {
    expect(parseDegree('five stop').kind).toBe('ambiguous');
  });
  it('alternatives: first parseable wins, never the expected answer', () => {
    const r = parseAlternatives(['hive', 'five', 'one'], parseDegree);
    expect(r.kind === 'answer' && r.value).toBe(5);
  });
});

describe('parseNoteName', () => {
  const note = (t: string, v: 'letter' | 'solfege') => {
    const r = parseNoteName(t, v);
    return r.kind === 'answer' ? `${r.value.letter}${r.value.acc}` : r.kind;
  };
  it('letter naming EN', () => {
    expect(note('B flat', 'letter')).toBe('B-1');
    expect(note('Bb', 'letter')).toBe('B-1');
    expect(note('E♭', 'letter')).toBe('E-1');
    expect(note('F sharp', 'letter')).toBe('F1');
    expect(note('C', 'letter')).toBe('C0');
  });
  it('letter naming HE', () => {
    expect(note('בי פלאט', 'letter')).toBe('B-1');
    expect(note('אי פלאט', 'letter')).toBe('E-1');
    expect(note('סי', 'letter')).toBe('C0');
  });
  it('fixed-do', () => {
    expect(note('si flat', 'solfege')).toBe('B-1');
    expect(note('סי במול', 'solfege')).toBe('B-1');
    expect(note('מי במול', 'solfege')).toBe('E-1');
    expect(note('sol', 'solfege')).toBe('G0');
    expect(note('פה דיאז', 'solfege')).toBe('F1');
  });
  it('ambiguous when two notes', () => {
    expect(parseNoteName('B flat or F', 'letter').kind).toBe('ambiguous');
  });
});
