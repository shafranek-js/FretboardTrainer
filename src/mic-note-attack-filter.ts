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

export function shouldAcceptMicNoteByAttackStrength(input: {
  preset: MicNoteAttackFilterPreset;
  peakVolume: number;
  volumeThreshold: number;
}) {
  if (input.preset === 'off') return true;
  const multiplier = getMicNoteAttackPeakMultiplier(input.preset);
  return input.peakVolume >= input.volumeThreshold * multiplier;
}
