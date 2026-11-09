// B12: the bass tuning is its own setting; an old bass value in the shared `tuning` key moves over.
import { describe, expect, it } from 'vitest';
import { bassTuningOf, migrateSettings, SETTINGS_VERSION } from '../src/storage/progress';

describe('bassTuning setting + migration', () => {
  it('moves a bass tuning out of `tuning`; the guitar tuning stays', () => {
    const s = migrateSettings({ version: SETTINGS_VERSION, tuning: 'bass5' });
    expect(s.bassTuning).toBe('bass5');
    expect(s.tuning).toBeUndefined();
    const g = migrateSettings({ version: SETTINGS_VERSION, tuning: 'drop-d' });
    expect(g.tuning).toBe('drop-d');
    expect(g.bassTuning).toBeUndefined();
    const both = migrateSettings({ version: SETTINGS_VERSION, tuning: 'bass-dropd', bassTuning: 'bass6' });
    expect(both.bassTuning).toBe('bass6');
    expect(both.tuning).toBeUndefined();
    expect(migrateSettings({ version: SETTINGS_VERSION, tuning: 'upright' }).bassTuning).toBe('upright');
  });
  it('bassTuningOf reads the new key, else an old bass value', () => {
    expect(bassTuningOf({ bassTuning: 'bass5', tuning: 'standard' })).toBe('bass5');
    expect(bassTuningOf({ tuning: 'bass-dropd' })).toBe('bass-dropd');
    expect(bassTuningOf({ tuning: 'standard' })).toBeUndefined();
  });
});
