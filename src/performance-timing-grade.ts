export type PerformanceTimingGradeBucket =
  | 'tooEarly'
  | 'early'
  | 'aBitEarly'
  | 'perfect'
  | 'aBitLate'
  | 'late'
  | 'tooLate';

export interface PerformanceTimingGrade {
  bucket: PerformanceTimingGradeBucket;
  label: string;
  weight: number;
  signedOffsetMs: number;
}

interface Thresholds {
  perfectMs: number;
  aBitMs: number;
  earlyLateMs: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function resolveThresholds(input: {
  preset: 'strict' | 'normal' | 'forgiving';
  eventDurationMs?: number;
  inputSource?: 'microphone' | 'midi';
}): Thresholds {
  const { preset, eventDurationMs, inputSource } = input;
  const durationScale =
    Number.isFinite(eventDurationMs) && (eventDurationMs ?? 0) > 0
      ? clamp((eventDurationMs ?? 0) / 450, 0.9, 1.4)
      : 1;
  const micBonus =
    inputSource === 'microphone'
      ? {
          perfectMs: 20,
          aBitMs: 40,
          earlyLateMs: 65,
        }
      : {
          perfectMs: 0,
          aBitMs: 0,
          earlyLateMs: 0,
        };

  const scale = (value: number) => Math.round(value * durationScale);

  switch (preset) {
    case 'strict':
      return {
        perfectMs: scale(45) + micBonus.perfectMs,
        aBitMs: scale(90) + micBonus.aBitMs,
        earlyLateMs: scale(160) + micBonus.earlyLateMs,
      };
    case 'forgiving':
      return {
        perfectMs: scale(95) + micBonus.perfectMs,
        aBitMs: scale(190) + micBonus.aBitMs,
        earlyLateMs: scale(320) + micBonus.earlyLateMs,
      };
    case 'normal':
    default:
      return {
        perfectMs: scale(70) + micBonus.perfectMs,
        aBitMs: scale(140) + micBonus.aBitMs,
        earlyLateMs: scale(240) + micBonus.earlyLateMs,
      };
  }
}

function buildGrade(
  bucket: PerformanceTimingGradeBucket,
  label: string,
  weight: number,
  signedOffsetMs: number
): PerformanceTimingGrade {
  return { bucket, label, weight, signedOffsetMs };
}

export function evaluatePerformanceTimingGrade(input: {
  signedOffsetMs: number;
  preset?: 'strict' | 'normal' | 'forgiving';
  eventDurationMs?: number;
  inputSource?: 'microphone' | 'midi';
}): PerformanceTimingGrade {
  const signedOffsetMs = Number.isFinite(input.signedOffsetMs)
    ? Math.round(input.signedOffsetMs)
    : 0;
  const absOffsetMs = Math.abs(signedOffsetMs);
  const thresholds = resolveThresholds({
    preset: input.preset ?? 'normal',
    eventDurationMs: input.eventDurationMs,
    inputSource: input.inputSource,
  });

  if (absOffsetMs <= thresholds.perfectMs) {
    return buildGrade('perfect', 'Perfect', 1, signedOffsetMs);
  }
  if (absOffsetMs <= thresholds.aBitMs) {
    if (signedOffsetMs < 0) {
      return buildGrade('aBitEarly', 'A bit early', 0.9, signedOffsetMs);
    }
    return buildGrade('aBitLate', 'A bit late', 0.9, signedOffsetMs);
  }
  if (absOffsetMs <= thresholds.earlyLateMs) {
    if (signedOffsetMs < 0) {
      return buildGrade('early', 'Early', 0.75, signedOffsetMs);
    }
    return buildGrade('late', 'Late', 0.75, signedOffsetMs);
  }
  if (signedOffsetMs < 0) {
    return buildGrade('tooEarly', 'Too early', 0.55, signedOffsetMs);
  }
  return buildGrade('tooLate', 'Too late', 0.55, signedOffsetMs);
}
