import type { MicSensitivityPreset } from './mic-input-sensitivity';

export interface PerformanceMicVolumeThresholdInput {
  baseThreshold: number;
  sensitivityPreset: MicSensitivityPreset;
  autoNoiseFloorRms: number | null | undefined;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeNoiseFloor(autoNoiseFloorRms: number | null | undefined) {
  return typeof autoNoiseFloorRms === 'number' && Number.isFinite(autoNoiseFloorRms) && autoNoiseFloorRms >= 0
    ? autoNoiseFloorRms
    : 0;
}

function resolveNoiseGuardThreshold(autoNoiseFloorRms: number | null | undefined) {
  const noiseFloor = normalizeNoiseFloor(autoNoiseFloorRms);
  return Math.max(noiseFloor * 2.1, noiseFloor + 0.0025, 0.006);
}

function resolveStudyNoiseGuardThreshold(autoNoiseFloorRms: number | null | undefined) {
  const noiseFloor = normalizeNoiseFloor(autoNoiseFloorRms);
  return Math.max(noiseFloor * 1.35, noiseFloor + 0.0012, 0.0042);
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

export function resolveStudyMelodyMicVolumeThreshold(
  input: PerformanceMicVolumeThresholdInput & {
    gatePercent?: number;
    noiseGuardPercent?: number;
  }
) {
  const performanceThreshold = resolvePerformanceMicVolumeThreshold(input);
  const safeBase = clamp(input.baseThreshold, 0.006, 0.2);
  const studyRelaxationMultiplier =
    input.sensitivityPreset === 'noisy_room'
      ? 0.86
      : input.sensitivityPreset === 'quiet_room'
        ? 0.72
        : input.sensitivityPreset === 'auto'
          ? 0.74
          : 0.76;
  const gateScale = clamp((input.gatePercent ?? 100) / 100, 0.6, 1.4);
  const noiseGuardScale = clamp((input.noiseGuardPercent ?? 100) / 100, 0.6, 1.4);
  const softerThreshold = performanceThreshold * studyRelaxationMultiplier * gateScale;
  const noiseGuardThreshold = resolveStudyNoiseGuardThreshold(input.autoNoiseFloorRms) * noiseGuardScale;
  return clamp(Math.max(softerThreshold, noiseGuardThreshold), 0.0036, safeBase);
}


