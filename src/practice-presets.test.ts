import { describe, expect, it } from 'vitest';
import {
  describePracticeInputPreset,
  describePracticeTimingPreset,
  getPracticeInputPresetConfig,
  getPracticeTimingPresetConfig,
  resolvePracticeInputPresetFromSettings,
  resolvePracticeTimingPresetFromSettings,
} from './practice-presets';

describe('practice-presets', () => {
  it('resolves built-in input presets from matching low-level settings', () => {
    expect(
      resolvePracticeInputPresetFromSettings({
        micSensitivityPreset: 'normal',
        micNoteAttackFilterPreset: 'balanced',
        micNoteHoldFilterPreset: '80ms',
        isDirectInputMode: false,
      })
    ).toBe('normal_room');

    expect(
      resolvePracticeInputPresetFromSettings({
        micSensitivityPreset: 'normal',
        micNoteAttackFilterPreset: 'balanced',
        micNoteHoldFilterPreset: '40ms',
        isDirectInputMode: true,
      })
    ).toBe('headphones_direct');
  });

  it('returns custom when low-level input settings diverge from presets', () => {
    expect(
      resolvePracticeInputPresetFromSettings({
        micSensitivityPreset: 'auto',
        micNoteAttackFilterPreset: 'balanced',
        micNoteHoldFilterPreset: '80ms',
        isDirectInputMode: false,
      })
    ).toBe('custom');
  });

  it('resolves timing presets from current grading windows', () => {
    expect(
      resolvePracticeTimingPresetFromSettings({
        performanceMicTolerancePreset: 'forgiving',
        performanceTimingLeniencyPreset: 'forgiving',
      })
    ).toBe('beginner');

    expect(
      resolvePracticeTimingPresetFromSettings({
        performanceMicTolerancePreset: 'strict',
        performanceTimingLeniencyPreset: 'strict',
      })
    ).toBe('performance');
  });

  it('exposes descriptive copy for the preset summaries', () => {
    expect(describePracticeInputPreset('headphones_direct')).toContain('Disables prompt-audio mute');
    expect(describePracticeTimingPreset('balanced')).toContain('Balanced');
    expect(getPracticeInputPresetConfig('noisy_room').micNoteAttackFilterPreset).toBe('strong');
    expect(getPracticeTimingPresetConfig('beginner').performanceMicTolerancePreset).toBe('forgiving');
  });
});
