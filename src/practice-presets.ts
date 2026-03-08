import type { MicSensitivityPreset } from './mic-input-sensitivity';
import type { MicNoteAttackFilterPreset } from './mic-note-attack-filter';
import type { MicNoteHoldFilterPreset } from './mic-note-hold-filter';
import type { PerformanceMicTolerancePreset } from './performance-mic-tolerance';
import type { PerformanceTimingLeniencyPreset } from './performance-timing-forgiveness';

export type PracticeInputPreset = 'quiet_room' | 'normal_room' | 'noisy_room' | 'headphones_direct' | 'custom';
export type PracticeTimingPreset = 'beginner' | 'balanced' | 'performance' | 'custom';

interface PracticeInputPresetConfig {
  micSensitivityPreset: MicSensitivityPreset;
  micNoteAttackFilterPreset: MicNoteAttackFilterPreset;
  micNoteHoldFilterPreset: MicNoteHoldFilterPreset;
  isDirectInputMode: boolean;
}

interface PracticeTimingPresetConfig {
  performanceMicTolerancePreset: PerformanceMicTolerancePreset;
  performanceTimingLeniencyPreset: PerformanceTimingLeniencyPreset;
}

const INPUT_PRESET_CONFIGS: Record<Exclude<PracticeInputPreset, 'custom'>, PracticeInputPresetConfig> = {
  quiet_room: {
    micSensitivityPreset: 'quiet_room',
    micNoteAttackFilterPreset: 'balanced',
    micNoteHoldFilterPreset: '40ms',
    isDirectInputMode: false,
  },
  normal_room: {
    micSensitivityPreset: 'normal',
    micNoteAttackFilterPreset: 'balanced',
    micNoteHoldFilterPreset: '80ms',
    isDirectInputMode: false,
  },
  noisy_room: {
    micSensitivityPreset: 'noisy_room',
    micNoteAttackFilterPreset: 'strong',
    micNoteHoldFilterPreset: '80ms',
    isDirectInputMode: false,
  },
  headphones_direct: {
    micSensitivityPreset: 'normal',
    micNoteAttackFilterPreset: 'balanced',
    micNoteHoldFilterPreset: '40ms',
    isDirectInputMode: true,
  },
};

const TIMING_PRESET_CONFIGS: Record<Exclude<PracticeTimingPreset, 'custom'>, PracticeTimingPresetConfig> = {
  beginner: {
    performanceMicTolerancePreset: 'forgiving',
    performanceTimingLeniencyPreset: 'forgiving',
  },
  balanced: {
    performanceMicTolerancePreset: 'normal',
    performanceTimingLeniencyPreset: 'normal',
  },
  performance: {
    performanceMicTolerancePreset: 'strict',
    performanceTimingLeniencyPreset: 'strict',
  },
};

export function normalizePracticeInputPreset(value: unknown): PracticeInputPreset {
  if (
    value === 'quiet_room' ||
    value === 'normal_room' ||
    value === 'noisy_room' ||
    value === 'headphones_direct' ||
    value === 'custom'
  ) {
    return value;
  }
  return 'normal_room';
}

export function normalizePracticeTimingPreset(value: unknown): PracticeTimingPreset {
  if (value === 'beginner' || value === 'balanced' || value === 'performance' || value === 'custom') {
    return value;
  }
  return 'balanced';
}

export function getPracticeInputPresetConfig(
  preset: Exclude<PracticeInputPreset, 'custom'>
): PracticeInputPresetConfig {
  return INPUT_PRESET_CONFIGS[preset];
}

export function getPracticeTimingPresetConfig(
  preset: Exclude<PracticeTimingPreset, 'custom'>
): PracticeTimingPresetConfig {
  return TIMING_PRESET_CONFIGS[preset];
}

export function resolvePracticeInputPresetFromSettings(input: PracticeInputPresetConfig): PracticeInputPreset {
  const matchedPreset = Object.entries(INPUT_PRESET_CONFIGS).find(([, config]) => {
    return (
      config.micSensitivityPreset === input.micSensitivityPreset &&
      config.micNoteAttackFilterPreset === input.micNoteAttackFilterPreset &&
      config.micNoteHoldFilterPreset === input.micNoteHoldFilterPreset &&
      config.isDirectInputMode === input.isDirectInputMode
    );
  });
  return (matchedPreset?.[0] as PracticeInputPreset | undefined) ?? 'custom';
}

export function resolvePracticeTimingPresetFromSettings(input: PracticeTimingPresetConfig): PracticeTimingPreset {
  const matchedPreset = Object.entries(TIMING_PRESET_CONFIGS).find(([, config]) => {
    return (
      config.performanceMicTolerancePreset === input.performanceMicTolerancePreset &&
      config.performanceTimingLeniencyPreset === input.performanceTimingLeniencyPreset
    );
  });
  return (matchedPreset?.[0] as PracticeTimingPreset | undefined) ?? 'custom';
}

export function describePracticeInputPreset(preset: PracticeInputPreset) {
  if (preset === 'quiet_room') {
    return 'Fast response for quiet rooms and clean single-note playing.';
  }
  if (preset === 'noisy_room') {
    return 'Stronger rejection for room noise, speakers, and messy input.';
  }
  if (preset === 'headphones_direct') {
    return 'Best for headphones or direct interfaces. Disables prompt-audio mute for faster detection.';
  }
  if (preset === 'custom') {
    return 'Manual mic setup. Sensitivity, attack, hold, or direct input no longer match a preset.';
  }
  return 'Balanced default for most microphones and rooms.';
}

export function describePracticeTimingPreset(preset: PracticeTimingPreset) {
  if (preset === 'beginner') {
    return 'Wider pitch and timing windows to keep early practice forgiving.';
  }
  if (preset === 'performance') {
    return 'Tighter pitch and timing windows for accurate full-run grading.';
  }
  if (preset === 'custom') {
    return 'Manual pitch/timing setup. Current values no longer match a preset.';
  }
  return 'Balanced default for regular practice sessions.';
}
