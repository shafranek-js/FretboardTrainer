export type MicSensitivityPreset = 'quiet_room' | 'normal' | 'noisy_room' | 'auto';

export function normalizeMicSensitivityPreset(value: unknown): MicSensitivityPreset {
  if (value === 'quiet_room' || value === 'noisy_room' || value === 'auto') return value;
  return 'normal';
}

export function getPresetVolumeThreshold(preset: Exclude<MicSensitivityPreset, 'auto'>): number {
  if (preset === 'quiet_room') return 0.02;
  if (preset === 'noisy_room') return 0.055;
  return 0.03;
}

export function estimateNoiseFloorRms(samples: number[]): number | null {
  const valid = samples.filter((value) => Number.isFinite(value) && value >= 0);
  if (valid.length === 0) return null;

  const sorted = [...valid].sort((a, b) => a - b);
  const percentileIndex = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9));
  const p90 = sorted[percentileIndex] ?? sorted[sorted.length - 1];
  return p90 ?? null;
}

export function deriveAutoVolumeThreshold(noiseFloorRms: number | null | undefined): number {
  const noiseFloor = typeof noiseFloorRms === 'number' && Number.isFinite(noiseFloorRms) ? noiseFloorRms : 0;
  const derived = Math.max(noiseFloor * 3.25, noiseFloor + 0.012, 0.018);
  return Math.min(0.12, derived);
}

export function resolveMicVolumeThreshold(
  preset: MicSensitivityPreset,
  autoNoiseFloorRms: number | null | undefined
) {
  if (preset === 'auto') {
    return deriveAutoVolumeThreshold(autoNoiseFloorRms);
  }
  return getPresetVolumeThreshold(preset);
}
