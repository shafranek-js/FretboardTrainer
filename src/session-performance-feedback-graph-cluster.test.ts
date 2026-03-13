import { describe, expect, it, vi } from 'vitest';

const { createSessionPerformanceFeedbackCluster } = vi.hoisted(() => ({
  createSessionPerformanceFeedbackCluster: vi.fn(),
}));

vi.mock('./session-performance-feedback-cluster', () => ({
  createSessionPerformanceFeedbackCluster,
}));

describe('session-performance-feedback-graph-cluster', () => {
  it('maps compact graph deps into performance feedback cluster deps', async () => {
    const clusterResult = { performanceTimelineFeedbackController: {}, performanceAdaptiveRuntimeController: {} };
    createSessionPerformanceFeedbackCluster.mockReturnValue(clusterResult);

    const { createSessionPerformanceFeedbackGraphCluster } = await import('./session-performance-feedback-graph-cluster');

    type GraphDeps = Parameters<typeof createSessionPerformanceFeedbackGraphCluster>[0];

    const deps = {
      dom: {
        trainingMode: { value: 'perform' },
        stringSelector: {},
      },
      state: {},
      isPerformanceStyleMode: vi.fn(() => true),
      buildPerformanceTimelineFeedbackKey: vi.fn(() => 'feedback-key'),
      redrawFretboard: vi.fn(),
      scheduleMelodyTimelineRenderFromState: vi.fn(),
      refreshMicPerformanceReadinessUi: vi.fn(),
      refreshMicPolyphonicDetectorAudioInfoUi: vi.fn(),
      getEnabledStrings: vi.fn(() => new Set(['E'])),
      freqToScientificNoteName: vi.fn(() => 'A4'),
      shouldIgnorePerformanceOctaveMismatch: vi.fn(() => false),
    } as unknown as GraphDeps;

    const result = createSessionPerformanceFeedbackGraphCluster(deps);
    const args = createSessionPerformanceFeedbackCluster.mock.calls[0][0];

    expect(args.performanceTimelineContext.dom.trainingMode).toBe(deps.dom.trainingMode);
    expect(args.detectedNoteFeedback.dom.stringSelector).toBe(deps.dom.stringSelector);
    expect(args.performanceTimelineContext.state).toBe(deps.state);
    expect(args.performanceTimelineFeedback.state).toBe(deps.state);
    expect(args.performanceMicTelemetry.state).toBe(deps.state);
    expect(args.micPerformanceRuntimeStatus.state).toBe(deps.state);
    expect(args.detectedNoteFeedback.state).toBe(deps.state);
    expect(args.performanceAdaptive.state).toBe(deps.state);
    expect(args.performanceTimelineFeedback.scheduleTimelineRender).toBe(
      deps.scheduleMelodyTimelineRenderFromState
    );
    expect(result).toBe(clusterResult);
  });
});
