import { describe, expect, it } from 'vitest';
import {
  captureMicPerformanceLatencyCalibrationState,
  restoreMicPerformanceLatencyCalibrationState,
} from './mic-performance-latency-calibration-state';

describe('mic-performance-latency-calibration-state', () => {
  it('captures and restores calibration telemetry and active state', () => {
    const source = {
      micPerformanceJudgmentCount: 6,
      micPerformanceJudgmentTotalLatencyMs: 880,
      micPerformanceJudgmentLastLatencyMs: 150,
      micPerformanceJudgmentMaxLatencyMs: 210,
      micPerformanceSuggestedLatencyMs: 147,
      micPerformanceLatencyCalibrationActive: true,
    };

    const snapshot = captureMicPerformanceLatencyCalibrationState(source);
    const target = {
      micPerformanceJudgmentCount: 0,
      micPerformanceJudgmentTotalLatencyMs: 0,
      micPerformanceJudgmentLastLatencyMs: null,
      micPerformanceJudgmentMaxLatencyMs: 0,
      micPerformanceSuggestedLatencyMs: null,
      micPerformanceLatencyCalibrationActive: false,
    };

    restoreMicPerformanceLatencyCalibrationState(target, snapshot);

    expect(target).toEqual(source);
  });
});
