import { isMelodyWorkflowMode, isPerformanceStyleMode } from './training-mode-groups';

export interface MicAttackTrackingResetInput {
  detectedNote: string | null;
  trackedNote: string | null;
  trainingMode: string;
  lastDetectedAtMs: number | null;
  nowMs: number;
  performanceDropHoldMs?: number;
}

const DEFAULT_PERFORMANCE_DROP_HOLD_MS = 90;

// Keep attack tracking alive for a short gap in melody/performance workflows so
// weak mics do not convert a sustained note into a fake new onset on the next frame.
export function shouldResetMicAttackTracking(input: MicAttackTrackingResetInput) {
  if (input.detectedNote) return false;
  if (!input.trackedNote) return true;
  if (!isPerformanceStyleMode(input.trainingMode) && !isMelodyWorkflowMode(input.trainingMode)) {
    return true;
  }
  if (input.lastDetectedAtMs === null) return true;

  const holdMs =
    typeof input.performanceDropHoldMs === 'number' && Number.isFinite(input.performanceDropHoldMs)
      ? Math.max(0, Math.round(input.performanceDropHoldMs))
      : DEFAULT_PERFORMANCE_DROP_HOLD_MS;
  return input.nowMs - input.lastDetectedAtMs > holdMs;
}
