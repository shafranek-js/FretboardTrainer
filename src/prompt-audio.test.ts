import { describe, expect, it } from 'vitest';
import {
  calculateFrettedFrequencyFromTuning,
  resolvePromptTargetPosition,
} from './prompt-audio';

describe('resolvePromptTargetPosition', () => {
  const instrument = {
    STRING_ORDER: ['A', 'D', 'G'],
    FRETBOARD: {
      A: { C: 3, D: 5 },
      D: { C: 10, E: 2 },
      G: { A: 2 },
    },
  };

  it('uses preferred string when it has the target note', () => {
    const resolved = resolvePromptTargetPosition({
      targetNote: 'C',
      preferredString: 'D',
      enabledStrings: new Set(['A', 'D', 'G']),
      instrument,
    });

    expect(resolved).toEqual({ stringName: 'D', fret: 10 });
  });

  it('falls back to first enabled string in order', () => {
    const resolved = resolvePromptTargetPosition({
      targetNote: 'C',
      preferredString: null,
      enabledStrings: new Set(['A', 'D']),
      instrument,
    });

    expect(resolved).toEqual({ stringName: 'A', fret: 3 });
  });

  it('returns null when note is not available on enabled strings', () => {
    const resolved = resolvePromptTargetPosition({
      targetNote: 'A',
      preferredString: null,
      enabledStrings: new Set(['A', 'D']),
      instrument,
    });

    expect(resolved).toBeNull();
  });
});

describe('calculateFrettedFrequencyFromTuning', () => {
  it('returns open string A4 at calibration frequency', () => {
    expect(calculateFrettedFrequencyFromTuning('A4', 0, 440)).toBeCloseTo(440, 5);
    expect(calculateFrettedFrequencyFromTuning('A4', 0, 442)).toBeCloseTo(442, 5);
  });

  it('calculates fretted pitch correctly', () => {
    expect(calculateFrettedFrequencyFromTuning('A4', 12, 440)).toBeCloseTo(880, 5);
    expect(calculateFrettedFrequencyFromTuning('E2', 12, 440)).toBeCloseTo(164.81, 2);
  });

  it('returns null for invalid input', () => {
    expect(calculateFrettedFrequencyFromTuning('H2', 0, 440)).toBeNull();
    expect(calculateFrettedFrequencyFromTuning('A', 0, 440)).toBeNull();
    expect(calculateFrettedFrequencyFromTuning('A4', 0, 0)).toBeNull();
  });
});
