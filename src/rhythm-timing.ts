export interface RhythmTimingEvaluation {
  beatAtMs: number;
  signedOffsetMs: number;
  absOffsetMs: number;
  tone: 'success' | 'error';
  label: string;
}

export interface RhythmTimingSnapshotInput {
  isRunning: boolean;
  intervalMs: number;
  lastBeatAtMs: number | null;
}

export function getRhythmTimingThresholds(windowKey: string) {
  if (windowKey === 'strict') return { onBeatMs: 55, feedbackMs: 120 };
  if (windowKey === 'loose') return { onBeatMs: 130, feedbackMs: 240 };
  return { onBeatMs: 90, feedbackMs: 180 };
}

export function evaluateRhythmTiming(
  nowMs: number,
  timing: RhythmTimingSnapshotInput,
  windowKey: string
): RhythmTimingEvaluation | null {
  if (!timing.isRunning || timing.lastBeatAtMs === null || timing.intervalMs <= 0) return null;

  const previousBeatAtMs = timing.lastBeatAtMs;
  const nextBeatAtMs = previousBeatAtMs + timing.intervalMs;
  const previousOffset = nowMs - previousBeatAtMs;
  const nextOffset = nowMs - nextBeatAtMs;

  const useNextBeat = Math.abs(nextOffset) < Math.abs(previousOffset);
  const beatAtMs = useNextBeat ? nextBeatAtMs : previousBeatAtMs;
  const signedOffsetMs = Math.round(useNextBeat ? nextOffset : previousOffset);
  const absOffsetMs = Math.abs(signedOffsetMs);
  const thresholds = getRhythmTimingThresholds(windowKey);

  if (absOffsetMs <= thresholds.onBeatMs) {
    return {
      beatAtMs,
      signedOffsetMs,
      absOffsetMs,
      tone: 'success',
      label: 'On beat',
    };
  }

  if (absOffsetMs <= thresholds.feedbackMs) {
    return {
      beatAtMs,
      signedOffsetMs,
      absOffsetMs,
      tone: 'error',
      label: signedOffsetMs < 0 ? 'Early' : 'Late',
    };
  }

  return {
    beatAtMs,
    signedOffsetMs,
    absOffsetMs,
    tone: 'error',
    label: signedOffsetMs < 0 ? 'Too early' : 'Too late',
  };
}

export function formatRhythmFeedback(result: RhythmTimingEvaluation, detectedNote: string) {
  const sign = result.signedOffsetMs > 0 ? '+' : '';
  return `${result.label}: ${detectedNote} (${sign}${result.signedOffsetMs}ms)`;
}
