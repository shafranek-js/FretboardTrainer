import { describe, expect, it } from 'vitest';
import {
  getMicNoteAttackPeakMultiplier,
  normalizeMicNoteAttackFilterPreset,
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
});
