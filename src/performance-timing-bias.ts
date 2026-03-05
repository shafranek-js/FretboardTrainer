interface UpdatePerformanceTimingBiasInput {
  currentBiasMs: number;
  sampleCount: number;
  signedOffsetMs: number;
  inputSource?: 'microphone' | 'midi';
}

interface UpdatePerformanceTimingBiasResult {
  nextBiasMs: number;
  nextSampleCount: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function resolveSmoothingAlpha(sampleCount: number) {
  if (sampleCount < 8) return 0.5;
  if (sampleCount < 24) return 0.3;
  return 0.18;
}

export function clampPerformanceTimingBiasMs(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(clamp(value, -420, 420));
}

export function updatePerformanceTimingBias(
  input: UpdatePerformanceTimingBiasInput
): UpdatePerformanceTimingBiasResult {
  const currentBiasMs = clampPerformanceTimingBiasMs(input.currentBiasMs);
  const sampleCount = Math.max(0, Math.round(input.sampleCount));
  if (input.inputSource !== 'microphone') {
    return {
      nextBiasMs: currentBiasMs,
      nextSampleCount: sampleCount,
    };
  }

  if (!Number.isFinite(input.signedOffsetMs)) {
    return {
      nextBiasMs: currentBiasMs,
      nextSampleCount: sampleCount,
    };
  }

  const boundedOffsetMs = clamp(input.signedOffsetMs, -500, 500);
  const alpha = resolveSmoothingAlpha(sampleCount);
  const nextBiasMs = clampPerformanceTimingBiasMs(currentBiasMs + boundedOffsetMs * alpha);

  return {
    nextBiasMs,
    nextSampleCount: sampleCount + 1,
  };
}
