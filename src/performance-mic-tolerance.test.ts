import { describe, expect, it } from 'vitest';
import {
  normalizePerformanceMicTolerancePreset,
  PERFORMANCE_MIC_TOLERANCE_CENTS_BY_PRESET,
  resolvePerformanceMicToleranceCents,
} from './performance-mic-tolerance';

describe('performance-mic-tolerance', () => {
  it('normalizes unknown presets back to normal', () => {
    expect(normalizePerformanceMicTolerancePreset('strict')).toBe('strict');
    expect(normalizePerformanceMicTolerancePreset('forgiving')).toBe('forgiving');
    expect(normalizePerformanceMicTolerancePreset('normal')).toBe('normal');
    expect(normalizePerformanceMicTolerancePreset('')).toBe('normal');
    expect(normalizePerformanceMicTolerancePreset('loose')).toBe('normal');
    expect(normalizePerformanceMicTolerancePreset(null)).toBe('normal');
  });

  it('resolves cents by preset consistently', () => {
    expect(resolvePerformanceMicToleranceCents('strict')).toBe(25);
    expect(resolvePerformanceMicToleranceCents('normal')).toBe(40);
    expect(resolvePerformanceMicToleranceCents('forgiving')).toBe(60);
    expect(PERFORMANCE_MIC_TOLERANCE_CENTS_BY_PRESET).toEqual({
      strict: 25,
      normal: 40,
      forgiving: 60,
    });
  });
});
