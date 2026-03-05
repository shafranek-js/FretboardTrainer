import type { YinOptions } from './dsp/pitch';

export interface PitchDetectionOptions {
  expectedFrequency?: number | null;
  preferLowLatency?: boolean;
}

export const DEFAULT_YIN_MIN_FREQUENCY = 50;
export const DEFAULT_YIN_MAX_FREQUENCY = 1200;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function resolvePitchYinOptions(options: PitchDetectionOptions = {}): YinOptions {
  const expectedFrequency = options.expectedFrequency;
  if (
    typeof expectedFrequency !== 'number' ||
    !Number.isFinite(expectedFrequency) ||
    expectedFrequency <= 0
  ) {
    return {
      minFrequency: DEFAULT_YIN_MIN_FREQUENCY,
      maxFrequency: DEFAULT_YIN_MAX_FREQUENCY,
    };
  }

  const minRatio = options.preferLowLatency ? 0.5 : 0.45;
  const maxRatio = options.preferLowLatency ? 2 : 2.2;
  const minFrequency = clamp(
    Math.round(expectedFrequency * minRatio),
    DEFAULT_YIN_MIN_FREQUENCY,
    DEFAULT_YIN_MAX_FREQUENCY - 1
  );
  const maxFrequency = clamp(
    Math.round(expectedFrequency * maxRatio),
    minFrequency + 1,
    DEFAULT_YIN_MAX_FREQUENCY
  );

  return {
    minFrequency,
    maxFrequency,
  };
}
