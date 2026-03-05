export type MicNoteAttackFilterPreset = 'off' | 'balanced' | 'strong';

export function normalizeMicNoteAttackFilterPreset(value: unknown): MicNoteAttackFilterPreset {
  if (value === 'off' || value === 'strong') return value;
  return 'balanced';
}

export function getMicNoteAttackPeakMultiplier(preset: MicNoteAttackFilterPreset): number {
  if (preset === 'off') return 0;
  if (preset === 'strong') return 2.4;
  return 1.5;
}

export function resolveMicNoteAttackRequiredPeak(input: {
  preset: MicNoteAttackFilterPreset;
  volumeThreshold: number;
  performanceAdaptive?: boolean;
  smoothedConfidence?: number;
  smoothedVoicing?: number;
}) {
  if (input.preset === 'off') return 0;

  let multiplier = getMicNoteAttackPeakMultiplier(input.preset);
  if (input.performanceAdaptive) {
    multiplier = input.preset === 'strong' ? 1.25 : 0.78;
    if (
      typeof input.smoothedConfidence === 'number' &&
      typeof input.smoothedVoicing === 'number' &&
      input.smoothedConfidence >= 0.42 &&
      input.smoothedVoicing >= 0.4
    ) {
      multiplier *= 0.8;
    }
    if (input.volumeThreshold >= 0.05) {
      multiplier *= 1.1;
    }
  }

  return Math.max(0, input.volumeThreshold) * multiplier;
}

export function shouldAcceptMicNoteByAttackStrength(input: {
  preset: MicNoteAttackFilterPreset;
  peakVolume: number;
  volumeThreshold: number;
  performanceAdaptive?: boolean;
  smoothedConfidence?: number;
  smoothedVoicing?: number;
}) {
  return (
    input.peakVolume >=
    resolveMicNoteAttackRequiredPeak({
      preset: input.preset,
      volumeThreshold: input.volumeThreshold,
      performanceAdaptive: input.performanceAdaptive,
      smoothedConfidence: input.smoothedConfidence,
      smoothedVoicing: input.smoothedVoicing,
    })
  );
}
