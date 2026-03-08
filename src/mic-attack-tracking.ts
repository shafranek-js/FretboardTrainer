import { isPerformanceStyleMode } from './training-mode-groups';

export interface MicAttackTrackingResetInput {
  detectedNote: string | null;
  trackedNote: string | null;
  trainingMode: string;
  lastDetectedAtMs: number | null;
  nowMs: number;
  performanceDropHoldMs?: number;
}

const DEFAULT_PERFORMANCE_DROP_HOLD_MS = 90;

// Keep attack tracking alive for a short gap in performance mode so weak mics
// do not lose an onset on a single-frame dropout.
export function shouldResetMicAttackTracking(input: MicAttackTrackingResetInput) {
  if (input.detectedNote) return false;
  if (!input.trackedNote) return true;
  if (!isPerformanceStyleMode(input.trainingMode)) return true;
  if (input.lastDetectedAtMs === null) return true;

  const holdMs =
    typeof input.performanceDropHoldMs === 'number' && Number.isFinite(input.performanceDropHoldMs)
      ? Math.max(0, Math.round(input.performanceDropHoldMs))
      : DEFAULT_PERFORMANCE_DROP_HOLD_MS;
  return input.nowMs - input.lastDetectedAtMs > holdMs;
}
