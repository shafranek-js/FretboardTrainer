export interface MicPerformanceLatencyCalibrationState {
  micPerformanceJudgmentCount: number;
  micPerformanceJudgmentTotalLatencyMs: number;
  micPerformanceJudgmentLastLatencyMs: number | null;
  micPerformanceJudgmentMaxLatencyMs: number;
  micPerformanceSuggestedLatencyMs: number | null;
  micPerformanceLatencyCalibrationActive: boolean;
}

export function captureMicPerformanceLatencyCalibrationState(
  state: MicPerformanceLatencyCalibrationState
): MicPerformanceLatencyCalibrationState {
  return {
    micPerformanceJudgmentCount: state.micPerformanceJudgmentCount,
    micPerformanceJudgmentTotalLatencyMs: state.micPerformanceJudgmentTotalLatencyMs,
    micPerformanceJudgmentLastLatencyMs: state.micPerformanceJudgmentLastLatencyMs,
    micPerformanceJudgmentMaxLatencyMs: state.micPerformanceJudgmentMaxLatencyMs,
    micPerformanceSuggestedLatencyMs: state.micPerformanceSuggestedLatencyMs,
    micPerformanceLatencyCalibrationActive: state.micPerformanceLatencyCalibrationActive,
  };
}

export function restoreMicPerformanceLatencyCalibrationState(
  target: MicPerformanceLatencyCalibrationState,
  snapshot: MicPerformanceLatencyCalibrationState
) {
  target.micPerformanceJudgmentCount = snapshot.micPerformanceJudgmentCount;
  target.micPerformanceJudgmentTotalLatencyMs = snapshot.micPerformanceJudgmentTotalLatencyMs;
  target.micPerformanceJudgmentLastLatencyMs = snapshot.micPerformanceJudgmentLastLatencyMs;
  target.micPerformanceJudgmentMaxLatencyMs = snapshot.micPerformanceJudgmentMaxLatencyMs;
  target.micPerformanceSuggestedLatencyMs = snapshot.micPerformanceSuggestedLatencyMs;
  target.micPerformanceLatencyCalibrationActive = snapshot.micPerformanceLatencyCalibrationActive;
}
