import type { MicSensitivityPreset } from './mic-input-sensitivity';

export interface PerformanceMicVolumeThresholdInput {
  baseThreshold: number;
  sensitivityPreset: MicSensitivityPreset;
  autoNoiseFloorRms: number | null | undefined;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function resolveNoiseGuardThreshold(autoNoiseFloorRms: number | null | undefined) {
  const noiseFloor =
    typeof autoNoiseFloorRms === 'number' && Number.isFinite(autoNoiseFloorRms) && autoNoiseFloorRms >= 0
      ? autoNoiseFloorRms
      : 0;
  return Math.max(noiseFloor * 2.1, noiseFloor + 0.0025, 0.006);
}

export function resolvePerformanceMicVolumeThreshold(input: PerformanceMicVolumeThresholdInput) {
  const safeBase = clamp(input.baseThreshold, 0.006, 0.2);
  const relaxationMultiplier =
    input.sensitivityPreset === 'noisy_room'
      ? 0.52
      : input.sensitivityPreset === 'quiet_room'
        ? 0.32
        : input.sensitivityPreset === 'auto'
          ? 0.34
          : 0.36;
  const relaxedThreshold = safeBase * relaxationMultiplier;
  const noiseGuardThreshold = resolveNoiseGuardThreshold(input.autoNoiseFloorRms);
  return clamp(Math.max(relaxedThreshold, noiseGuardThreshold), 0.006, safeBase);
}
