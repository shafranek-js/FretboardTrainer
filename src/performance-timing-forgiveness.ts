import type { Prompt } from './types';

export type PerformanceTimingLeniencyPreset = 'strict' | 'normal' | 'forgiving';

const PERFORMANCE_TIMING_FORGIVENESS_BY_PRESET: Record<
  PerformanceTimingLeniencyPreset,
  { minMs: number; maxMs: number; ratio: number }
> = {
  strict: {
    minMs: 40,
    maxMs: 110,
    ratio: 0.12,
  },
  normal: {
    minMs: 60,
    maxMs: 160,
    ratio: 0.18,
  },
  forgiving: {
    minMs: 85,
    maxMs: 220,
    ratio: 0.24,
  },
};

export function normalizePerformanceTimingLeniencyPreset(
  value: unknown
): PerformanceTimingLeniencyPreset {
  return value === 'strict' || value === 'forgiving' ? value : 'normal';
}

function resolvePromptDurationMs(prompt: Prompt | null | undefined) {
  if (
    prompt &&
    typeof prompt.melodyEventDurationMs === 'number' &&
    Number.isFinite(prompt.melodyEventDurationMs)
  ) {
    return Math.max(1, Math.round(prompt.melodyEventDurationMs));
  }

  return 700;
}

export function resolvePerformanceTimingForgivenessWindowMs(
  prompt: Prompt | null | undefined,
  preset: PerformanceTimingLeniencyPreset = 'normal'
) {
  const durationMs = resolvePromptDurationMs(prompt);
  const resolvedPreset = normalizePerformanceTimingLeniencyPreset(preset);
  const config = PERFORMANCE_TIMING_FORGIVENESS_BY_PRESET[resolvedPreset];
  const unclampedWindowMs = Math.round(durationMs * config.ratio);
  const boundedWindowMs = Math.max(
    config.minMs,
    Math.min(config.maxMs, unclampedWindowMs)
  );
  return Math.max(0, Math.min(boundedWindowMs, Math.floor(durationMs / 3)));
}

export function shouldForgivePerformanceTimingBoundaryAttempt(input: {
  prompt: Prompt | null | undefined;
  promptStartedAtMs: number | null | undefined;
  nowMs: number;
  preset?: PerformanceTimingLeniencyPreset;
}) {
  const { prompt, promptStartedAtMs, nowMs, preset = 'normal' } = input;
  if (!prompt || !Number.isFinite(promptStartedAtMs) || (promptStartedAtMs ?? 0) <= 0) {
    return false;
  }

  const elapsedMs = nowMs - (promptStartedAtMs ?? 0);
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
    return false;
  }

  const durationMs = resolvePromptDurationMs(prompt);
  const forgivenessWindowMs = resolvePerformanceTimingForgivenessWindowMs(prompt, preset);
  if (forgivenessWindowMs <= 0) {
    return false;
  }

  return (
    elapsedMs <= forgivenessWindowMs ||
    Math.abs(elapsedMs - durationMs) <= forgivenessWindowMs
  );
}
