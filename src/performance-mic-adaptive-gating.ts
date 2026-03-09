function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeEventDurationMs(eventDurationMs: number | null | undefined) {
  if (typeof eventDurationMs !== 'number' || !Number.isFinite(eventDurationMs) || eventDurationMs <= 0) {
    return null;
  }
  return Math.round(eventDurationMs);
}

export function resolvePerformanceMicDropHoldMs(eventDurationMs: number | null | undefined) {
  const normalizedDuration = normalizeEventDurationMs(eventDurationMs);
  if (normalizedDuration === null) return 180;
  return clamp(Math.round(normalizedDuration * 0.48), 68, 180);
}

export function resolvePerformanceSilenceResetAfterFrames(eventDurationMs: number | null | undefined) {
  const normalizedDuration = normalizeEventDurationMs(eventDurationMs);
  if (normalizedDuration === null) return 6;
  if (normalizedDuration <= 180) return 3;
  if (normalizedDuration <= 320) return 4;
  if (normalizedDuration <= 560) return 5;
  return 6;
}

export function resolvePerformanceRequiredStableFrames(eventDurationMs: number | null | undefined) {
  const normalizedDuration = normalizeEventDurationMs(eventDurationMs);
  if (normalizedDuration === null) return 2;
  if (normalizedDuration <= 360) return 1;
  return 2;
}


