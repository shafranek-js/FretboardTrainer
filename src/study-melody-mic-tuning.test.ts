import { describe, expect, it } from 'vitest';
import {
  formatStudyMelodyMicAutoFrameValue,
  normalizeStudyMelodyMicGatePercent,
  normalizeStudyMelodyMicNoiseGuardPercent,
  normalizeStudyMelodyMicSilenceResetFrames,
  normalizeStudyMelodyMicStableFrames,
  resolveEffectiveStudyMelodySilenceResetFrames,
  resolveEffectiveStudyMelodyStableFrames,
} from './study-melody-mic-tuning';

describe('study melody mic tuning helpers', () => {
  it('normalizes manual percentages into safe ranges', () => {
    expect(normalizeStudyMelodyMicGatePercent(20)).toBe(60);
    expect(normalizeStudyMelodyMicGatePercent(105)).toBe(105);
    expect(normalizeStudyMelodyMicNoiseGuardPercent(999)).toBe(140);
  });

  it('normalizes manual frame overrides into safe ranges', () => {
    expect(normalizeStudyMelodyMicSilenceResetFrames(-1)).toBe(0);
    expect(normalizeStudyMelodyMicSilenceResetFrames(5)).toBe(5);
    expect(normalizeStudyMelodyMicStableFrames(9)).toBe(3);
  });

  it('uses auto values when overrides are disabled', () => {
    expect(resolveEffectiveStudyMelodySilenceResetFrames(4, 0)).toBe(4);
    expect(resolveEffectiveStudyMelodyStableFrames(2, 0)).toBe(2);
  });

  it('uses manual values when overrides are enabled', () => {
    expect(resolveEffectiveStudyMelodySilenceResetFrames(4, 6)).toBe(6);
    expect(resolveEffectiveStudyMelodyStableFrames(2, 1)).toBe(1);
  });

  it('formats auto frame labels', () => {
    expect(formatStudyMelodyMicAutoFrameValue(0)).toBe('Auto');
    expect(formatStudyMelodyMicAutoFrameValue(3)).toBe('3f');
  });
});
