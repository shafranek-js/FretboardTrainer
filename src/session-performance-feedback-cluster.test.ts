import { describe, expect, it, vi } from 'vitest';
import { createSessionPerformanceFeedbackCluster } from './session-performance-feedback-cluster';

function createDeps() {
  return {
    performanceTimelineContext: {
      dom: { trainingMode: {} as never },
      state: {} as never,
      isPerformanceStyleMode: vi.fn(() => false),
      buildPerformanceTimelineFeedbackKey: vi.fn(() => 'key'),
    },
    performanceTimelineFeedback: {
      state: {} as never,
      redrawFretboard: vi.fn(),
      scheduleTimelineRender: vi.fn(),
    },
    performanceMicTelemetry: {
      state: {} as never,
    },
    micPerformanceRuntimeStatus: {
      state: {} as never,
      refreshMicPerformanceReadinessUi: vi.fn(),
      refreshMicPolyphonicDetectorAudioInfoUi: vi.fn(),
    },
    detectedNoteFeedback: {
      dom: { trainingMode: {} as never, stringSelector: {} as never },
      state: {} as never,
      getEnabledStrings: vi.fn(() => new Set()),
      redrawFretboard: vi.fn(),
      freqToScientificNoteName: vi.fn(() => 'A4'),
      shouldIgnorePerformanceOctaveMismatch: vi.fn(() => false),
    },
    performanceAdaptive: {
      state: {} as never,
      isPerformanceStyleMode: vi.fn(() => false),
    },
  };
}

describe('session-performance-feedback-cluster', () => {
  it('creates the performance feedback and telemetry controllers as one cluster', () => {
    const cluster = createSessionPerformanceFeedbackCluster(createDeps() as never);

    expect(cluster.performanceTimelineContextRuntimeController).toBeTruthy();
    expect(cluster.performanceTimelineFeedbackController).toBeTruthy();
    expect(cluster.performanceMicTelemetryController).toBeTruthy();
    expect(cluster.micPerformanceRuntimeStatusController).toBeTruthy();
    expect(cluster.detectedNoteFeedbackRuntimeController).toBeTruthy();
    expect(cluster.performanceAdaptiveRuntimeController).toBeTruthy();
  });
});
