import { describe, expect, it, vi } from 'vitest';
import { createMicPerformanceRuntimeStatusController } from './mic-performance-runtime-status-controller';

type MicPerformanceRuntimeStatusState = Parameters<
  typeof createMicPerformanceRuntimeStatusController
>[0]['state'];

function createState(): MicPerformanceRuntimeStatusState {
  return {
    inputSource: 'microphone',
    micPerformanceReadinessLastUiRefreshAtMs: 0,
    micPerformanceJudgmentCount: 0,
    micPerformanceJudgmentTotalLatencyMs: 0,
    micPerformanceJudgmentLastLatencyMs: null,
    micPerformanceJudgmentMaxLatencyMs: 0,
    micPerformanceLatencyCalibrationActive: false,
    micPolyphonicDetectorTelemetryFrames: 0,
    micPolyphonicDetectorTelemetryTotalLatencyMs: 0,
    micPolyphonicDetectorTelemetryMaxLatencyMs: 0,
    micPolyphonicDetectorTelemetryLastLatencyMs: null,
    micPolyphonicDetectorTelemetryFallbackFrames: 0,
    micPolyphonicDetectorTelemetryWarningFrames: 0,
    micPolyphonicDetectorTelemetryWindowStartedAtMs: 0,
    micPolyphonicDetectorTelemetryLastUiRefreshAtMs: 0,
    lastMicPolyphonicDetectorProviderUsed: null,
    lastMicPolyphonicDetectorFallbackFrom: null,
    lastMicPolyphonicDetectorWarning: null,
  };
}

describe('mic-performance-runtime-status-controller', () => {
  it('throttles readiness UI refreshes', () => {
    const state = createState();
    const refreshMicPerformanceReadinessUi = vi.fn();
    const controller = createMicPerformanceRuntimeStatusController({
      state,
      refreshMicPerformanceReadinessUi,
      refreshMicPolyphonicDetectorAudioInfoUi: vi.fn(),
      now: () => 1_000,
    });

    controller.refreshReadinessUiThrottled(1_000);
    controller.refreshReadinessUiThrottled(1_100);
    controller.refreshReadinessUiThrottled(1_300);

    expect(refreshMicPerformanceReadinessUi).toHaveBeenCalledTimes(2);
    expect(refreshMicPerformanceReadinessUi).toHaveBeenNthCalledWith(1, 1_000);
    expect(refreshMicPerformanceReadinessUi).toHaveBeenNthCalledWith(2, 1_300);
  });

  it('updates polyphonic detector telemetry and refreshes detector UI when status changes', () => {
    const state = createState();
    const refreshMicPerformanceReadinessUi = vi.fn();
    const refreshMicPolyphonicDetectorAudioInfoUi = vi.fn();
    const controller = createMicPerformanceRuntimeStatusController({
      state,
      refreshMicPerformanceReadinessUi,
      refreshMicPolyphonicDetectorAudioInfoUi,
      now: () => 2_000,
    });

    controller.updatePolyphonicDetectorRuntimeStatus(
      {
        provider: 'essentia_experimental',
        fallbackFrom: 'spectrum',
        warnings: ['Fallback active'],
      },
      18
    );

    expect(state.micPolyphonicDetectorTelemetryFrames).toBe(1);
    expect(state.micPolyphonicDetectorTelemetryTotalLatencyMs).toBe(18);
    expect(state.micPolyphonicDetectorTelemetryMaxLatencyMs).toBe(18);
    expect(state.micPolyphonicDetectorTelemetryFallbackFrames).toBe(1);
    expect(state.micPolyphonicDetectorTelemetryWarningFrames).toBe(1);
    expect(state.lastMicPolyphonicDetectorProviderUsed).toBe('essentia_experimental');
    expect(state.lastMicPolyphonicDetectorFallbackFrom).toBe('spectrum');
    expect(state.lastMicPolyphonicDetectorWarning).toBe('Fallback active');
    expect(refreshMicPolyphonicDetectorAudioInfoUi).toHaveBeenCalledTimes(1);
    expect(refreshMicPerformanceReadinessUi).toHaveBeenCalledWith(2_000);
  });

  it('records judgment latency and resets judgment telemetry', () => {
    const state = createState();
    state.micPerformanceLatencyCalibrationActive = true;
    const refreshMicPerformanceReadinessUi = vi.fn();
    const controller = createMicPerformanceRuntimeStatusController({
      state,
      refreshMicPerformanceReadinessUi,
      refreshMicPolyphonicDetectorAudioInfoUi: vi.fn(),
    });

    controller.recordJudgmentLatency(100, 145);
    controller.recordJudgmentLatency(200, 255);
    controller.recordJudgmentLatency(300, 360);
    controller.recordJudgmentLatency(400, 470);
    controller.recordJudgmentLatency(500, 590);

    expect(state.micPerformanceJudgmentCount).toBe(5);
    expect(state.micPerformanceJudgmentTotalLatencyMs).toBe(320);
    expect(state.micPerformanceJudgmentLastLatencyMs).toBe(90);
    expect(state.micPerformanceJudgmentMaxLatencyMs).toBe(90);
    expect(state.micPerformanceLatencyCalibrationActive).toBe(false);

    controller.resetReadinessAndJudgmentTelemetry();

    expect(state.micPerformanceReadinessLastUiRefreshAtMs).toBe(0);
    expect(state.micPerformanceJudgmentCount).toBe(0);
    expect(state.micPerformanceJudgmentTotalLatencyMs).toBe(0);
    expect(state.micPerformanceJudgmentLastLatencyMs).toBeNull();
    expect(state.micPerformanceJudgmentMaxLatencyMs).toBe(0);
  });
});
