import { describe, expect, it } from 'vitest';

import { shouldIgnorePerformanceOctaveMismatch } from './performance-octave-policy';

describe('performance-octave-policy', () => {
  it('ignores octave mismatch only for microphone performance when enabled', () => {
    expect(
      shouldIgnorePerformanceOctaveMismatch({
        trainingMode: 'performance',
        inputSource: 'microphone',
        relaxOctaveCheckEnabled: true,
        promptTargetNote: 'E',
        detectedNote: 'E',
      })
    ).toBe(true);
  });

  it('does not ignore mismatch for midi input', () => {
    expect(
      shouldIgnorePerformanceOctaveMismatch({
        trainingMode: 'performance',
        inputSource: 'midi',
        relaxOctaveCheckEnabled: true,
        promptTargetNote: 'E',
        detectedNote: 'E',
      })
    ).toBe(false);
  });

  it('does not ignore mismatch when the detected pitch class differs', () => {
    expect(
      shouldIgnorePerformanceOctaveMismatch({
        trainingMode: 'performance',
        inputSource: 'microphone',
        relaxOctaveCheckEnabled: true,
        promptTargetNote: 'E',
        detectedNote: 'F',
      })
    ).toBe(false);
  });
});
