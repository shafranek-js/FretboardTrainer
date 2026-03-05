import { describe, expect, it } from 'vitest';
import { clampPerformanceTimingBiasMs, updatePerformanceTimingBias } from './performance-timing-bias';

describe('performance-timing-bias', () => {
  it('clamps bias to supported range', () => {
    expect(clampPerformanceTimingBiasMs(999)).toBe(420);
    expect(clampPerformanceTimingBiasMs(-999)).toBe(-420);
    expect(clampPerformanceTimingBiasMs(83.6)).toBe(84);
  });

  it('does not adapt for MIDI input', () => {
    const result = updatePerformanceTimingBias({
      currentBiasMs: 60,
      sampleCount: 4,
      signedOffsetMs: 180,
      inputSource: 'midi',
    });
    expect(result).toEqual({
      nextBiasMs: 60,
      nextSampleCount: 4,
    });
  });

  it('adapts microphone bias toward repeated late offsets', () => {
    let bias = 0;
    let sampleCount = 0;
    for (let index = 0; index < 8; index += 1) {
      const next = updatePerformanceTimingBias({
        currentBiasMs: bias,
        sampleCount,
        signedOffsetMs: 200 - bias,
        inputSource: 'microphone',
      });
      bias = next.nextBiasMs;
      sampleCount = next.nextSampleCount;
    }

    expect(sampleCount).toBe(8);
    expect(bias).toBeGreaterThanOrEqual(190);
    expect(bias).toBeLessThanOrEqual(300);
  });
});
