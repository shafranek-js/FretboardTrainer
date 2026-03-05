export type MicNoteHoldFilterPreset = 'off' | '40ms' | '80ms' | '120ms';
export type PerformanceMicHoldCalibrationLevel = 'off' | 'mild' | 'strong';

export function normalizeMicNoteHoldFilterPreset(value: unknown): MicNoteHoldFilterPreset {
  if (value === 'off' || value === '40ms' || value === '120ms') return value;
  return '80ms';
}

export function getMicNoteHoldDurationMs(preset: MicNoteHoldFilterPreset): number {
  if (preset === 'off') return 0;
  if (preset === '40ms') return 40;
  if (preset === '120ms') return 120;
  return 80;
}

export function resolveMicNoteHoldRequiredDurationMs(input: {
  preset: MicNoteHoldFilterPreset;
  performanceAdaptive?: boolean;
  eventDurationMs?: number | null;
  performanceCalibrationLevel?: PerformanceMicHoldCalibrationLevel;
}) {
  const baseMinHoldMs = getMicNoteHoldDurationMs(input.preset);
  if (!input.performanceAdaptive || baseMinHoldMs <= 0) {
    return baseMinHoldMs;
  }
  let adaptiveMinHoldMs = baseMinHoldMs;
  if (baseMinHoldMs >= 120) adaptiveMinHoldMs = 56;
  else if (baseMinHoldMs >= 80) adaptiveMinHoldMs = 28;
  else if (baseMinHoldMs >= 40) adaptiveMinHoldMs = 16;

  if (
    typeof input.eventDurationMs === 'number' &&
    Number.isFinite(input.eventDurationMs) &&
    input.eventDurationMs > 0
  ) {
    const durationRelativeCap =
      input.eventDurationMs <= 140
        ? Math.max(4, Math.min(8, Math.round(input.eventDurationMs * 0.12)))
        : input.eventDurationMs <= 220
          ? Math.max(5, Math.min(11, Math.round(input.eventDurationMs * 0.14)))
          : input.eventDurationMs <= 340
            ? Math.max(5, Math.min(12, Math.round(input.eventDurationMs * 0.16)))
            : Math.max(7, Math.min(22, Math.round(input.eventDurationMs * 0.24)));
    adaptiveMinHoldMs = Math.min(adaptiveMinHoldMs, durationRelativeCap);
  }
  const calibrationLevel = input.performanceCalibrationLevel ?? 'off';
  if (calibrationLevel === 'mild') {
    adaptiveMinHoldMs = Math.max(10, Math.round(adaptiveMinHoldMs * 0.82));
  } else if (calibrationLevel === 'strong') {
    adaptiveMinHoldMs = Math.max(6, Math.round(adaptiveMinHoldMs * 0.54));
    if (
      typeof input.eventDurationMs === 'number' &&
      Number.isFinite(input.eventDurationMs) &&
      input.eventDurationMs > 0 &&
      input.eventDurationMs <= 220
    ) {
      const strongEventCap = Math.max(3, Math.min(10, Math.round(input.eventDurationMs * 0.12)));
      adaptiveMinHoldMs = Math.min(adaptiveMinHoldMs, strongEventCap);
    }
  }
  return adaptiveMinHoldMs;
}

export function shouldAcceptMicNoteByHoldDuration(input: {
  preset: MicNoteHoldFilterPreset;
  noteFirstDetectedAtMs: number | null;
  nowMs: number;
  performanceAdaptive?: boolean;
  eventDurationMs?: number | null;
  performanceCalibrationLevel?: PerformanceMicHoldCalibrationLevel;
}) {
  const minHoldMs = resolveMicNoteHoldRequiredDurationMs({
    preset: input.preset,
    performanceAdaptive: input.performanceAdaptive,
    eventDurationMs: input.eventDurationMs,
    performanceCalibrationLevel: input.performanceCalibrationLevel,
  });
  if (minHoldMs <= 0) return true;
  if (input.noteFirstDetectedAtMs === null) return false;
  return input.nowMs - input.noteFirstDetectedAtMs >= minHoldMs;
}
