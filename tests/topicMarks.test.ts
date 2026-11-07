import { describe, expect, it } from 'vitest';
import { topicMarks, type PathStep, type PathView, type UnitStep } from '../src/engine/path';

const step = (topic: string, level: number): PathStep => ({ id: `${topic}-${level}`, kind: 'topic', topic, level, skill: 'intervals', sub: 'x', domain: 'pitch', difficulty: 1000, choices: 4, title: { en: '', he: '' } });
const us = (topic: string, level: number, state: UnitStep['state']): UnitStep => ({ step: step(topic, level), state });

describe('All topics marks (SPEC-TODAY §4)', () => {
  it('✓ for levels the path counts (done, mastered, tested out), ▶ for the current step, nothing for open ones', () => {
    const view = {
      units: [{ id: 'u1', n: 1, steps: [us('triads', 1, 'done'), us('triads', 2, 'tested'), us('triads', 3, 'mastered'), us('triads', 4, 'open'), us('form', 1, 'current')], difficulty: 1000, section: 'developing', areas: ['pitch'], status: 'current' }],
      current: us('form', 1, 'current'),
    } as unknown as PathView;
    const m = topicMarks(view);
    expect(m.get('triads:1')).toBe('done');
    expect(m.get('triads:2')).toBe('done');
    expect(m.get('triads:3')).toBe('done');
    expect(m.get('triads:4')).toBeUndefined();
    expect(m.get('form:1')).toBe('current');
  });
});
