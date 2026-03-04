export interface PerformanceMicOnsetGateInput {
  detectedNote: string;
  noteFirstDetectedAtMs: number | null;
  promptStartedAtMs: number;
  nowMs: number;
  lastJudgedOnsetNote: string | null;
  lastJudgedOnsetAtMs: number | null;
  earlyWindowMs?: number;
  maxOnsetAgeMs?: number;
}

export function shouldJudgePerformanceMicOnset(input: PerformanceMicOnsetGateInput) {
  const onsetAtMs = input.noteFirstDetectedAtMs;
  if (!input.detectedNote.trim() || onsetAtMs === null) return false;

  const earlyWindowMs = Math.max(0, input.earlyWindowMs ?? 90);
  const maxOnsetAgeMs = Math.max(1, input.maxOnsetAgeMs ?? 450);
  const earliestAllowedOnsetAtMs = input.promptStartedAtMs - earlyWindowMs;
  if (onsetAtMs < earliestAllowedOnsetAtMs) return false;
  if (input.nowMs - onsetAtMs > maxOnsetAgeMs) return false;

  return !(
    input.lastJudgedOnsetNote === input.detectedNote &&
    input.lastJudgedOnsetAtMs === onsetAtMs
  );
}

