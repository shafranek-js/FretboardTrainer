import { describe, expect, it } from 'vitest';
import {
  calculateTriadIntervals,
  freqToNoteNameFromA4,
  nearestChromaticTargetFrequencyFromA4,
} from './music-theory';

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

describe('nearestChromaticTargetFrequencyFromA4', () => {
  it('snaps to the nearest equal-tempered note frequency', () => {
    expect(nearestChromaticTargetFrequencyFromA4(440, 440)).toBeCloseTo(440, 6);
    expect(nearestChromaticTargetFrequencyFromA4(261.63, 440)).toBeCloseTo(261.625565, 3); // C4
    expect(nearestChromaticTargetFrequencyFromA4(445, 440)).toBeCloseTo(440, 6); // still nearest A4
  });

  it('supports calibrated A4 references', () => {
    expect(nearestChromaticTargetFrequencyFromA4(442.2, 442)).toBeCloseTo(442, 6);
  });

  it('returns null for invalid inputs', () => {
    expect(nearestChromaticTargetFrequencyFromA4(0, 440)).toBeNull();
    expect(nearestChromaticTargetFrequencyFromA4(-10, 440)).toBeNull();
    expect(nearestChromaticTargetFrequencyFromA4(440, 0)).toBeNull();
  });
});
