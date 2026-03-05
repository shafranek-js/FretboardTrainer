import { resolvePerformanceMicOnsetWindowMs } from './performance-mic-onset-gate';

export interface PerformanceMicUncertainInput {
  detectedNote: string;
  noteFirstDetectedAtMs: number | null;
  promptStartedAtMs: number;
  nowMs: number;
  attackAccepted: boolean;
  holdAccepted: boolean;
  confidenceAccepted?: boolean;
  voicingAccepted?: boolean;
  lastReportedOnsetNote: string | null;
  lastReportedOnsetAtMs: number | null;
  eventDurationMs?: number | null;
  leniencyPreset?: 'strict' | 'normal' | 'forgiving';
  earlyWindowMs?: number;
  maxOnsetAgeMs?: number;
}

export function shouldReportPerformanceMicUncertainFrame(input: PerformanceMicUncertainInput) {
  if (!input.detectedNote.trim()) return false;
  if (
    input.attackAccepted &&
    input.holdAccepted &&
    (input.confidenceAccepted ?? true) &&
    (input.voicingAccepted ?? true)
  ) {
    return false;
  }
  const onsetAtMs = input.noteFirstDetectedAtMs;
  if (onsetAtMs === null) return false;

  const defaultWindow = resolvePerformanceMicOnsetWindowMs({
    eventDurationMs: input.eventDurationMs,
    leniencyPreset: input.leniencyPreset,
  });
  const earlyWindowMs = Math.max(0, input.earlyWindowMs ?? defaultWindow.earlyWindowMs);
  const maxOnsetAgeMs = Math.max(1, input.maxOnsetAgeMs ?? defaultWindow.maxOnsetAgeMs);
  if (onsetAtMs < input.promptStartedAtMs - earlyWindowMs) return false;
  if (input.nowMs - onsetAtMs > maxOnsetAgeMs) return false;

  return !(
    input.lastReportedOnsetNote === input.detectedNote &&
    input.lastReportedOnsetAtMs === onsetAtMs
  );
}
