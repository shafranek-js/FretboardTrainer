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

    const deps = {
      dom: {
        trainingMode: { value: 'perform' },
        stringSelector: {},
      },
      state: {} as any,
      isPerformanceStyleMode: vi.fn(() => true),
      buildPerformanceTimelineFeedbackKey: vi.fn(() => 'feedback-key'),
      redrawFretboard: vi.fn(),
      scheduleMelodyTimelineRenderFromState: vi.fn(),
      refreshMicPerformanceReadinessUi: vi.fn(),
      refreshMicPolyphonicDetectorAudioInfoUi: vi.fn(),
      getEnabledStrings: vi.fn(() => new Set(['E'])),
      freqToScientificNoteName: vi.fn(() => 'A4'),
      shouldIgnorePerformanceOctaveMismatch: vi.fn(() => false),
    };

    const result = createSessionPerformanceFeedbackGraphCluster(deps as any);
    const args = createSessionPerformanceFeedbackCluster.mock.calls[0][0];

    expect(args.performanceTimelineContext.dom.trainingMode).toBe(deps.dom.trainingMode);
    expect(args.detectedNoteFeedback.dom.stringSelector).toBe(deps.dom.stringSelector);
    expect(args.performanceTimelineFeedback.scheduleTimelineRender).toBe(
      deps.scheduleMelodyTimelineRenderFromState
    );
    expect(result).toBe(clusterResult);
  });
});
