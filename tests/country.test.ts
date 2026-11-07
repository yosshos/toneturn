import { describe, expect, it } from 'vitest';
import { COUNTRY_CODES, countryName, guessCountry } from '../src/engine/country';

describe('country guess for the flag (SPEC-SOCIAL §1.2)', () => {
  it('time zone first', () => {
    expect(guessCountry('Asia/Jerusalem', ['en-US'])).toBe('IL');
    expect(guessCountry('Europe/London', [])).toBe('GB');
    expect(guessCountry('America/Sao_Paulo', ['pt'])).toBe('BR');
  });
  it('then the language region, then a language default', () => {
    expect(guessCountry('Etc/UTC', ['en-CA', 'fr'])).toBe('CA');
    expect(guessCountry(undefined, ['he'])).toBe('IL');
    expect(guessCountry(undefined, ['xx'])).toBeNull();
  });
  it('codes are unique and named', () => {
    expect(new Set(COUNTRY_CODES).size).toBe(COUNTRY_CODES.length);
    expect(COUNTRY_CODES.length).toBeGreaterThan(240);
    expect(countryName('IL', 'en')).toBe('Israel');
  });
});
