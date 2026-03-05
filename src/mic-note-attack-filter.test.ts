import { describe, expect, it } from 'vitest';
import {
  getMicNoteAttackPeakMultiplier,
  normalizeMicNoteAttackFilterPreset,
  resolveMicNoteAttackRequiredPeak,
  shouldAcceptMicNoteByAttackStrength,
} from './mic-note-attack-filter';

describe('mic-note-attack-filter', () => {
  it('normalizes presets with balanced default', () => {
    expect(normalizeMicNoteAttackFilterPreset('off')).toBe('off');
    expect(normalizeMicNoteAttackFilterPreset('balanced')).toBe('balanced');
    expect(normalizeMicNoteAttackFilterPreset('strong')).toBe('strong');
    expect(normalizeMicNoteAttackFilterPreset('x')).toBe('balanced');
  });

  it('uses stronger multipliers for stronger filtering', () => {
    expect(getMicNoteAttackPeakMultiplier('off')).toBe(0);
    expect(getMicNoteAttackPeakMultiplier('balanced')).toBeGreaterThan(1);
    expect(getMicNoteAttackPeakMultiplier('strong')).toBeGreaterThan(
      getMicNoteAttackPeakMultiplier('balanced')
    );
  });

  it('accepts or rejects note by peak strength over threshold', () => {
    expect(
      shouldAcceptMicNoteByAttackStrength({ preset: 'off', peakVolume: 0.02, volumeThreshold: 0.03 })
    ).toBe(true);
    expect(
      shouldAcceptMicNoteByAttackStrength({
        preset: 'balanced',
        peakVolume: 0.06,
        volumeThreshold: 0.03,
      })
    ).toBe(true);
    expect(
      shouldAcceptMicNoteByAttackStrength({
        preset: 'balanced',
        peakVolume: 0.04,
        volumeThreshold: 0.03,
      })
    ).toBe(false);
  });

  it('softens required peak in performance adaptive mode', () => {
    const baseRequiredPeak = resolveMicNoteAttackRequiredPeak({
      preset: 'balanced',
      volumeThreshold: 0.03,
    });
    const adaptiveRequiredPeak = resolveMicNoteAttackRequiredPeak({
      preset: 'balanced',
      volumeThreshold: 0.03,
      performanceAdaptive: true,
    });
    const adaptiveWithHighConfidenceRequiredPeak = resolveMicNoteAttackRequiredPeak({
      preset: 'balanced',
      volumeThreshold: 0.03,
      performanceAdaptive: true,
      smoothedConfidence: 0.6,
      smoothedVoicing: 0.56,
    });

    expect(adaptiveRequiredPeak).toBeLessThan(baseRequiredPeak);
    expect(adaptiveWithHighConfidenceRequiredPeak).toBeLessThan(adaptiveRequiredPeak);
    expect(
      shouldAcceptMicNoteByAttackStrength({
        preset: 'balanced',
        peakVolume: 0.038,
        volumeThreshold: 0.03,
      })
    ).toBe(false);
    expect(
      shouldAcceptMicNoteByAttackStrength({
        preset: 'balanced',
        peakVolume: 0.038,
        volumeThreshold: 0.03,
        performanceAdaptive: true,
      })
    ).toBe(true);
  });
});
