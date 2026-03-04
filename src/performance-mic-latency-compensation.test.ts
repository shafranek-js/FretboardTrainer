import { describe, expect, it } from 'vitest';
import { normalizePerformanceMicLatencyCompensationMs } from './performance-mic-latency-compensation';

describe('performance-mic-latency-compensation', () => {
  it('normalizes invalid values to 0', () => {
    expect(normalizePerformanceMicLatencyCompensationMs(undefined)).toBe(0);
    expect(normalizePerformanceMicLatencyCompensationMs('abc')).toBe(0);
  });

  it('clamps values into the supported range', () => {
    expect(normalizePerformanceMicLatencyCompensationMs(-30)).toBe(0);
    expect(normalizePerformanceMicLatencyCompensationMs(83.7)).toBe(84);
    expect(normalizePerformanceMicLatencyCompensationMs(999)).toBe(250);
  });
});
