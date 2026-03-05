export interface PerformanceMicOnsetGateInput {
  detectedNote: string;
  noteFirstDetectedAtMs: number | null;
  promptStartedAtMs: number;
  nowMs: number;
  lastJudgedOnsetNote: string | null;
  lastJudgedOnsetAtMs: number | null;
  eventDurationMs?: number | null;
  leniencyPreset?: 'strict' | 'normal' | 'forgiving';
  earlyWindowMs?: number;
  maxOnsetAgeMs?: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeEventDurationMs(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

export function resolvePerformanceMicOnsetWindowMs(input: {
  eventDurationMs?: number | null;
  leniencyPreset?: 'strict' | 'normal' | 'forgiving';
}) {
  const eventDurationMs = normalizeEventDurationMs(input.eventDurationMs);
  const preset = input.leniencyPreset ?? 'normal';

  if (eventDurationMs === null) {
    return { earlyWindowMs: 90, maxOnsetAgeMs: 450 };
  }

  const earlyRatio = preset === 'strict' ? 0.25 : preset === 'forgiving' ? 0.55 : 0.42;
  const earlyMin = preset === 'strict' ? 60 : preset === 'forgiving' ? 110 : 90;
  const earlyMax = preset === 'strict' ? 150 : preset === 'forgiving' ? 320 : 240;
  const earlyWindowMs = clamp(Math.round(eventDurationMs * earlyRatio), earlyMin, earlyMax);

  const ageRatio = preset === 'strict' ? 1.15 : preset === 'forgiving' ? 2 : 1.55;
  const ageMin = preset === 'strict' ? 260 : preset === 'forgiving' ? 420 : 340;
  const ageMax = preset === 'strict' ? 520 : preset === 'forgiving' ? 980 : 760;
  const maxOnsetAgeMs = clamp(Math.round(eventDurationMs * ageRatio), ageMin, ageMax);

  return {
    earlyWindowMs,
    maxOnsetAgeMs: Math.max(maxOnsetAgeMs, earlyWindowMs + 140),
  };
}

export function shouldJudgePerformanceMicOnset(input: PerformanceMicOnsetGateInput) {
  const onsetAtMs = input.noteFirstDetectedAtMs;
  if (!input.detectedNote.trim() || onsetAtMs === null) return false;

  const defaultWindow = resolvePerformanceMicOnsetWindowMs({
    eventDurationMs: input.eventDurationMs,
    leniencyPreset: input.leniencyPreset,
  });
  const earlyWindowMs = Math.max(0, input.earlyWindowMs ?? defaultWindow.earlyWindowMs);
  const maxOnsetAgeMs = Math.max(1, input.maxOnsetAgeMs ?? defaultWindow.maxOnsetAgeMs);
  const earliestAllowedOnsetAtMs = input.promptStartedAtMs - earlyWindowMs;
  if (onsetAtMs < earliestAllowedOnsetAtMs) return false;
  if (input.nowMs - onsetAtMs > maxOnsetAgeMs) return false;

  return !(
    input.lastJudgedOnsetNote === input.detectedNote &&
    input.lastJudgedOnsetAtMs === onsetAtMs
  );
}
