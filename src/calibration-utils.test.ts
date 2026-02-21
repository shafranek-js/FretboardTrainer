import { describe, expect, it } from 'vitest';
import { computeCalibratedA4FromSamples, getOpenATuningInfoFromTuning } from './calibration-utils';

describe('getOpenATuningInfoFromTuning', () => {
  it('returns expected open A frequency for valid tuning', () => {
    expect(getOpenATuningInfoFromTuning({ A: 'A4' })).toEqual({
      expectedFrequency: 440,
      octave: 4,
    });
    expect(getOpenATuningInfoFromTuning({ A: 'A2' })).toEqual({
      expectedFrequency: 110,
      octave: 2,
    });
  });

  it('falls back to default when tuning is missing or invalid', () => {
    expect(getOpenATuningInfoFromTuning({})).toEqual({
      expectedFrequency: 440,
      octave: 4,
    });
    expect(getOpenATuningInfoFromTuning({ A: 'B2' })).toEqual({
      expectedFrequency: 440,
      octave: 4,
    });
  });
});

describe('computeCalibratedA4FromSamples', () => {
  it('returns null for empty or invalid samples', () => {
    expect(computeCalibratedA4FromSamples([], 4)).toBeNull();
    expect(computeCalibratedA4FromSamples([NaN, -1, 0], 4)).toBeNull();
  });

  it('computes calibrated A4 from open A samples', () => {
    expect(computeCalibratedA4FromSamples([440, 442], 4)).toBeCloseTo(441, 6);
    expect(computeCalibratedA4FromSamples([110, 111], 2)).toBeCloseTo(442, 6);
  });
});
