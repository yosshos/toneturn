import { expect, it } from 'vitest';
import { parseRunShape } from '../src/engine/parser';

const v = (t: string) => {
  const r = parseRunShape(t);
  return r.kind === 'answer' ? r.value : r.kind;
};

it('run shapes by voice: the button labels and natural phrasings', () => {
  expect(v('up')).toBe('up');
  expect(v('going down')).toBe('down');
  expect(v('up and back')).toBe('turn');
  expect(v('Up & back')).toBe('turn');
  expect(v('up and down')).toBe('turn');
  expect(v('down and around')).toBe('turn');
  expect(v('turn')).toBe('turn');
  expect(v('עולה וחוזר')).toBe('turn');
  expect(v('עולה ויורד')).toBe('turn');
  expect(v('יורד')).toBe('down');
});
