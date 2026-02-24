import { describe, expect, it } from 'vitest';
import {
  evaluateRhythmTiming,
  formatRhythmFeedback,
  getRhythmTimingThresholds,
} from './rhythm-timing';

describe('getRhythmTimingThresholds', () => {
  it('returns mode-specific thresholds', () => {
    expect(getRhythmTimingThresholds('strict')).toEqual({ onBeatMs: 55, feedbackMs: 120 });
    expect(getRhythmTimingThresholds('loose')).toEqual({ onBeatMs: 130, feedbackMs: 240 });
    expect(getRhythmTimingThresholds('normal')).toEqual({ onBeatMs: 90, feedbackMs: 180 });
  });
});

describe('evaluateRhythmTiming', () => {
  const timing = {
    isRunning: true,
    lastBeatAtMs: 1_000,
    intervalMs: 500,
  };

  it('returns null when metronome timing is unavailable', () => {
    expect(
      evaluateRhythmTiming(1_000, { isRunning: false, lastBeatAtMs: 1_000, intervalMs: 500 }, 'normal')
    ).toBeNull();
    expect(
      evaluateRhythmTiming(1_000, { isRunning: true, lastBeatAtMs: null, intervalMs: 500 }, 'normal')
    ).toBeNull();
    expect(
      evaluateRhythmTiming(1_000, { isRunning: true, lastBeatAtMs: 1_000, intervalMs: 0 }, 'normal')
    ).toBeNull();
  });

  it('returns on-beat success within threshold', () => {
    const result = evaluateRhythmTiming(1_020, timing, 'normal');
    expect(result).not.toBeNull();
    expect(result!.tone).toBe('success');
    expect(result!.label).toBe('On beat');
    expect(result!.signedOffsetMs).toBe(20);
  });

  it('labels early/late relative to nearest beat', () => {
    const early = evaluateRhythmTiming(1_360, timing, 'normal');
    expect(early).not.toBeNull();
    expect(early!.label).toBe('Early');
    expect(early!.signedOffsetMs).toBe(-140);

    const late = evaluateRhythmTiming(1_610, timing, 'normal');
    expect(late).not.toBeNull();
    expect(late!.label).toBe('Late');
    expect(late!.signedOffsetMs).toBe(110);
  });

  it('labels too early/too late outside feedback threshold', () => {
    const tooEarly = evaluateRhythmTiming(1_300, timing, 'strict');
    expect(tooEarly).not.toBeNull();
    expect(tooEarly!.label).toBe('Too early');

    const tooLate = evaluateRhythmTiming(1_200, timing, 'strict');
    expect(tooLate).not.toBeNull();
    expect(tooLate!.label).toBe('Too late');
  });
});

describe('formatRhythmFeedback', () => {
  it('formats result text with signed offset', () => {
    expect(
      formatRhythmFeedback(
        {
          beatAtMs: 1000,
          signedOffsetMs: -12,
          absOffsetMs: 12,
          tone: 'error',
          label: 'Early',
        },
        'A'
      )
    ).toBe('Early: A (-12ms)');
    expect(
      formatRhythmFeedback(
        {
          beatAtMs: 1000,
          signedOffsetMs: 14,
          absOffsetMs: 14,
          tone: 'success',
          label: 'On beat',
        },
        'C#'
      )
    ).toBe('On beat: C# (+14ms)');
  });
});
