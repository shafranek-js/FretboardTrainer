import { describe, expect, it } from 'vitest';
import { evaluatePerformanceTimingGrade } from './performance-timing-grade';

describe('evaluatePerformanceTimingGrade', () => {
  it('classifies perfect and a-bit windows', () => {
    expect(evaluatePerformanceTimingGrade({ signedOffsetMs: 0 }).bucket).toBe('perfect');
    expect(evaluatePerformanceTimingGrade({ signedOffsetMs: -110 }).bucket).toBe('aBitEarly');
    expect(evaluatePerformanceTimingGrade({ signedOffsetMs: 120 }).bucket).toBe('aBitLate');
  });

  it('classifies wider early/late and too-early/too-late windows', () => {
    expect(evaluatePerformanceTimingGrade({ signedOffsetMs: -200 }).bucket).toBe('early');
    expect(evaluatePerformanceTimingGrade({ signedOffsetMs: 210 }).bucket).toBe('late');
    expect(evaluatePerformanceTimingGrade({ signedOffsetMs: -330 }).bucket).toBe('tooEarly');
    expect(evaluatePerformanceTimingGrade({ signedOffsetMs: 330 }).bucket).toBe('tooLate');
  });

  it('uses stricter thresholds for strict preset and looser thresholds for forgiving preset', () => {
    expect(evaluatePerformanceTimingGrade({ signedOffsetMs: 60, preset: 'strict' }).bucket).toBe(
      'aBitLate'
    );
    expect(evaluatePerformanceTimingGrade({ signedOffsetMs: 60, preset: 'forgiving' }).bucket).toBe(
      'perfect'
    );
  });

  it('uses wider timing windows for microphone and longer melody events', () => {
    expect(
      evaluatePerformanceTimingGrade({
        signedOffsetMs: 260,
        preset: 'normal',
        inputSource: 'midi',
        eventDurationMs: 250,
      }).bucket
    ).toBe('tooLate');

    expect(
      evaluatePerformanceTimingGrade({
        signedOffsetMs: 260,
        preset: 'normal',
        inputSource: 'microphone',
        eventDurationMs: 700,
      }).bucket
    ).toBe('late');
  });
});
