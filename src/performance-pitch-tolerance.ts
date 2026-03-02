import {
  PerformanceMicTolerancePreset,
  resolvePerformanceMicToleranceCents,
} from './performance-mic-tolerance';

export function getCentsDifference(fromFrequency: number, toFrequency: number) {
  if (
    !Number.isFinite(fromFrequency) ||
    fromFrequency <= 0 ||
    !Number.isFinite(toFrequency) ||
    toFrequency <= 0
  ) {
    return Infinity;
  }

  return Math.abs(1200 * Math.log2(toFrequency / fromFrequency));
}

export function isPerformancePitchWithinTolerance(
  detectedFrequency: number | null | undefined,
  targetFrequency: number | null | undefined,
  tolerancePreset: PerformanceMicTolerancePreset = 'normal'
) {
  const centsTolerance = resolvePerformanceMicToleranceCents(tolerancePreset);
  return getCentsDifference(targetFrequency ?? 0, detectedFrequency ?? 0) <= centsTolerance;
}
