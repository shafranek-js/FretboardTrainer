export type MicNoteHoldFilterPreset = 'off' | '40ms' | '80ms' | '120ms';

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

export function shouldAcceptMicNoteByHoldDuration(input: {
  preset: MicNoteHoldFilterPreset;
  noteFirstDetectedAtMs: number | null;
  nowMs: number;
}) {
  const minHoldMs = getMicNoteHoldDurationMs(input.preset);
  if (minHoldMs <= 0) return true;
  if (input.noteFirstDetectedAtMs === null) return false;
  return input.nowMs - input.noteFirstDetectedAtMs >= minHoldMs;
}
