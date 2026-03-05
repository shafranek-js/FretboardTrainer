import { describe, expect, it } from 'vitest';
import {
  DEFAULT_YIN_MAX_FREQUENCY,
  DEFAULT_YIN_MIN_FREQUENCY,
  resolvePitchYinOptions,
} from './pitch-detection-options';

describe('resolvePitchYinOptions', () => {
  it('returns default wide range when expected frequency is unavailable', () => {
    expect(resolvePitchYinOptions()).toEqual({
      minFrequency: DEFAULT_YIN_MIN_FREQUENCY,
      maxFrequency: DEFAULT_YIN_MAX_FREQUENCY,
    });
    expect(resolvePitchYinOptions({ expectedFrequency: null })).toEqual({
      minFrequency: DEFAULT_YIN_MIN_FREQUENCY,
      maxFrequency: DEFAULT_YIN_MAX_FREQUENCY,
    });
  });

  it('narrows range around expected frequency', () => {
    expect(resolvePitchYinOptions({ expectedFrequency: 440 })).toEqual({
      minFrequency: 198,
      maxFrequency: 968,
    });
  });

  it('uses tighter low-latency range for performance path', () => {
    expect(resolvePitchYinOptions({ expectedFrequency: 440, preferLowLatency: true })).toEqual({
      minFrequency: 220,
      maxFrequency: 880,
    });
  });

  it('clamps range to supported YIN bounds', () => {
    expect(resolvePitchYinOptions({ expectedFrequency: 90, preferLowLatency: true })).toEqual({
      minFrequency: 50,
      maxFrequency: 180,
    });
    expect(resolvePitchYinOptions({ expectedFrequency: 900, preferLowLatency: true })).toEqual({
      minFrequency: 450,
      maxFrequency: 1200,
    });
  });
});
