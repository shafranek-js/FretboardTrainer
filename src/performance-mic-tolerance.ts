export type PerformanceMicTolerancePreset = 'strict' | 'normal' | 'forgiving';

export const PERFORMANCE_MIC_TOLERANCE_CENTS_BY_PRESET: Record<PerformanceMicTolerancePreset, number> = {
  strict: 25,
  normal: 40,
  forgiving: 60,
};

export function normalizePerformanceMicTolerancePreset(
  value: unknown
): PerformanceMicTolerancePreset {
  return value === 'strict' || value === 'forgiving' ? value : 'normal';
}

export function resolvePerformanceMicToleranceCents(
  preset: PerformanceMicTolerancePreset
) {
  return PERFORMANCE_MIC_TOLERANCE_CENTS_BY_PRESET[preset];
}
