import { describe, expect, it } from 'vitest';
import { shouldResetMicAttackTracking } from './mic-attack-tracking';

describe('mic-attack-tracking', () => {
  it('never resets while a note is currently detected', () => {
    expect(
      shouldResetMicAttackTracking({
        detectedNote: 'E',
        trackedNote: 'E',
        trainingMode: 'performance',
        lastDetectedAtMs: 1000,
        nowMs: 1050,
      })
    ).toBe(false);
  });

  it('resets immediately in non-melody note-training modes when detection disappears', () => {
    expect(
      shouldResetMicAttackTracking({
        detectedNote: null,
        trackedNote: 'E',
        trainingMode: 'random',
        lastDetectedAtMs: 1000,
        nowMs: 1020,
      })
    ).toBe(true);
  });

  it('keeps tracking alive for short dropouts in study melody mode', () => {
    expect(
      shouldResetMicAttackTracking({
        detectedNote: null,
        trackedNote: 'E',
        trainingMode: 'melody',
        lastDetectedAtMs: 1000,
        nowMs: 1089,
      })
    ).toBe(false);

    expect(
      shouldResetMicAttackTracking({
        detectedNote: null,
        trackedNote: 'E',
        trainingMode: 'melody',
        lastDetectedAtMs: 1000,
        nowMs: 1091,
      })
    ).toBe(true);
  });

  it('keeps tracking alive for short dropouts in performance mode', () => {
    expect(
      shouldResetMicAttackTracking({
        detectedNote: null,
        trackedNote: 'E',
        trainingMode: 'performance',
        lastDetectedAtMs: 1000,
        nowMs: 1089,
      })
    ).toBe(false);

    expect(
      shouldResetMicAttackTracking({
        detectedNote: null,
        trackedNote: 'E',
        trainingMode: 'performance',
        lastDetectedAtMs: 1000,
        nowMs: 1091,
      })
    ).toBe(true);
  });
});
