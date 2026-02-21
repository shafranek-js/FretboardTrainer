import { describe, expect, it } from 'vitest';
import { calculateTriadIntervals, freqToNoteNameFromA4 } from './music-theory';

describe('freqToNoteNameFromA4', () => {
  it('maps known concert frequencies to note names', () => {
    expect(freqToNoteNameFromA4(440, 440)).toBe('A');
    expect(freqToNoteNameFromA4(261.63, 440)).toBe('C');
    expect(freqToNoteNameFromA4(110, 440)).toBe('A');
  });

  it('supports non-440 calibration references', () => {
    expect(freqToNoteNameFromA4(442, 442)).toBe('A');
  });

  it('returns null for invalid inputs', () => {
    expect(freqToNoteNameFromA4(0, 440)).toBeNull();
    expect(freqToNoteNameFromA4(-50, 440)).toBeNull();
    expect(freqToNoteNameFromA4(440, 0)).toBeNull();
  });
});

describe('calculateTriadIntervals', () => {
  it('returns major third and perfect fifth for valid root notes', () => {
    expect(calculateTriadIntervals('C')).toEqual({ majorThird: 'E', perfectFifth: 'G' });
    expect(calculateTriadIntervals('A')).toEqual({ majorThird: 'C#', perfectFifth: 'E' });
  });

  it('returns fallback markers for unknown root notes', () => {
    expect(calculateTriadIntervals('H')).toEqual({ majorThird: '?', perfectFifth: '?' });
  });
});
