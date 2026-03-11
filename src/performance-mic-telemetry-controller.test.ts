import { describe, expect, it } from 'vitest';
import { createPerformanceMicTelemetryController } from './performance-mic-telemetry-controller';

function createState() {
  return {
    performanceOnsetRejectsByEvent: {},
    performanceCaptureTelemetryByEvent: {},
    micPerformanceOnsetGateStatus: 'idle',
    micPerformanceOnsetGateReason: null,
    micPerformanceOnsetGateAtMs: null,
    micPerformanceOnsetRejectedWeakAttackCount: 0,
    micPerformanceOnsetRejectedLowConfidenceCount: 0,
    micPerformanceOnsetRejectedLowVoicingCount: 0,
    micPerformanceOnsetRejectedShortHoldCount: 0,
    micPerformanceOnsetLastRejectedReasonKey: null,
    micPerformanceOnsetLastRejectedNote: null,
    micPerformanceOnsetLastRejectedAtMs: null,
  } as any;
}

describe('performance-mic-telemetry-controller', () => {
  it('records rejected onset gate events with dedupe and aggregate counters', () => {
    const state = createState();
    const controller = createPerformanceMicTelemetryController({
      state,
      getCurrentEventIndex: () => 2,
      now: () => 1_000,
    });

    controller.setOnsetGateStatus('rejected', 'Reason: weak attack.', {
      rejectReasonKey: 'weak_attack',
      onsetNote: 'A3',
      onsetAtMs: 900,
      eventDurationMs: 450,
      holdRequiredMs: 120,
      holdElapsedMs: 80,
      runtimeCalibrationLevel: 'mild',
    });
    controller.setOnsetGateStatus('rejected', 'Reason: weak attack.', {
      rejectReasonKey: 'weak_attack',
      onsetNote: 'A3',
      onsetAtMs: 900,
      eventDurationMs: 450,
      holdRequiredMs: 120,
      holdElapsedMs: 80,
      runtimeCalibrationLevel: 'mild',
    });

    expect(state.micPerformanceOnsetGateStatus).toBe('rejected');
    expect(state.micPerformanceOnsetRejectedWeakAttackCount).toBe(1);
    expect(state.performanceOnsetRejectsByEvent[2]).toHaveLength(1);
    expect(state.performanceOnsetRejectsByEvent[2][0]).toMatchObject({
      reasonKey: 'weak_attack',
      onsetNote: 'A3',
      onsetAtMs: 900,
      runtimeCalibrationLevel: 'mild',
    });
  });

  it('records capture telemetry, stable detections, prompt attempts and uncertain frames per event', () => {
    const state = createState();
    const controller = createPerformanceMicTelemetryController({
      state,
      getCurrentEventIndex: () => 1,
    });

    controller.recordCaptureFrame({
      rms: 0.25,
      detectedNote: 'C4',
      nextStableNoteCounter: 2,
      requiredStableFrames: 4,
      confident: true,
      voiced: false,
      attackPeak: 0.4,
    });
    controller.recordStableDetection();
    controller.recordPromptAttempt();
    controller.recordUncertainFrame('low_confidence');

    expect(state.performanceCaptureTelemetryByEvent[1]).toMatchObject({
      detectedNoteFrameCount: 1,
      confidentFrameCount: 1,
      voicedFrameCount: 0,
      preStableSeenCount: 1,
      stableDetectionCount: 1,
      promptAttemptCount: 1,
      uncertainFrameCount: 1,
      maxAttackPeak: 0.4,
    });
    expect(state.performanceCaptureTelemetryByEvent[1].uncertainReasonCounts.low_confidence).toBe(1);
  });

  it('resets onset gate and aggregate reject telemetry independently', () => {
    const state = createState();
    const controller = createPerformanceMicTelemetryController({
      state,
      getCurrentEventIndex: () => null,
      now: () => 5_000,
    });

    controller.setOnsetGateStatus('accepted', 'Ready');
    controller.resetOnsetGateStatus();
    state.micPerformanceOnsetRejectedWeakAttackCount = 2;
    state.micPerformanceOnsetRejectedLowConfidenceCount = 1;
    state.micPerformanceOnsetLastRejectedReasonKey = 'weak_attack';
    controller.resetOnsetRejectTelemetry();

    expect(state.micPerformanceOnsetGateStatus).toBe('idle');
    expect(state.micPerformanceOnsetGateReason).toBeNull();
    expect(state.micPerformanceOnsetGateAtMs).toBeNull();
    expect(state.micPerformanceOnsetRejectedWeakAttackCount).toBe(0);
    expect(state.micPerformanceOnsetRejectedLowConfidenceCount).toBe(0);
    expect(state.micPerformanceOnsetLastRejectedReasonKey).toBeNull();
  });
});
