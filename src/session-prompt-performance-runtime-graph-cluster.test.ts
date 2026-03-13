import { describe, expect, it, vi } from 'vitest';

const { createSessionPromptPerformanceRuntimeCluster } = vi.hoisted(() => ({
  createSessionPromptPerformanceRuntimeCluster: vi.fn(),
}));

vi.mock('./dom', () => ({ dom: {} }));
vi.mock('./state', () => ({ state: {} }));
vi.mock('./session-prompt-performance-runtime-cluster', () => ({
  createSessionPromptPerformanceRuntimeCluster,
}));

describe('session-prompt-performance-runtime-graph-cluster', () => {
  it('wires cyclic prompt and transport callbacks through the graph layer', async () => {
    const updateSessionGoalProgress = vi.fn();
    const resolveMissed = vi.fn();
    const clusterResult = {
      sessionPromptRuntimeController: { updateSessionGoalProgress },
      performancePromptController: { resolveMissed },
    };
    createSessionPromptPerformanceRuntimeCluster.mockReturnValue(clusterResult);

    const { createSessionPromptPerformanceRuntimeGraphCluster } = await import(
      './session-prompt-performance-runtime-graph-cluster'
    );

    const deps = {
      dom: {
        rhythmTimingWindow: { value: 'tight' },
        trainingMode: { value: 'perform' },
        melodySelector: { value: 'm1' },
        sessionGoal: { value: '10' },
        stringSelector: {},
        melodyDemoBpm: { value: '120' },
      },
      state: {
        rhythmLastJudgedBeatAtMs: null,
        activeSessionStats: null,
        micMonophonicAttackTrackedNote: null,
        micMonophonicAttackPeakVolume: 0,
        micMonophonicAttackLastVolume: 0,
        micMonophonicFirstDetectedAtMs: null,
        micLastMonophonicDetectedAtMs: null,
        studyMelodyRepeatPromptRequiresFreshAttack: false,
        studyMelodyRepeatPromptSawSilence: false,
        startTime: 0,
        currentPrompt: null,
        melodyTimelinePreviewIndex: null,
        melodyTimelinePreviewLabel: null,
        autoPlayPromptSound: false,
        currentInstrument: { name: 'guitar' },
        calibratedA4: 440,
        melodyTransposeSemitones: 0,
        melodyStringShift: 0,
        melodyStudyRangeStartIndex: 0,
        melodyStudyRangeEndIndex: 1,
        targetFrequency: null,
        performancePromptResolved: false,
        performancePromptMatched: false,
        performancePromptHadAttempt: false,
        performancePromptHadWrongAttempt: false,
        pendingTimeoutIds: new Set(),
        isListening: false,
        showingAllNotes: false,
        currentMelodyEventFoundNotes: new Set(),
        currentMelodyEventIndex: 0,
        currentMelodyId: null,
        melodyStudyRangeById: {},
        pendingSessionStopResultMessage: null,
        performanceActiveEventIndex: null,
        performancePrerollDurationMs: 0,
        performancePrerollLeadInVisible: false,
        performancePrerollStartedAtMs: null,
        performancePrerollStepIndex: null,
        performanceRunCompleted: false,
        performanceRuntimeStartedAtMs: null,
        performanceTransportAnimationId: 0,
      },
      nextPrompt: vi.fn(),
      getMetronomeTimingSnapshot: vi.fn(),
      evaluateRhythmTiming: vi.fn(),
      recordRhythmTimingAttempt: vi.fn(),
      formatRhythmFeedback: vi.fn(),
      setResultMessage: vi.fn(),
      isMelodyWorkflowMode: vi.fn(() => true),
      resolvePerformanceMicDropHoldMs: vi.fn(() => 0),
      shouldResetMicAttackTracking: vi.fn(() => false),
      shouldRearmMicOnsetForSameNote: vi.fn(() => false),
      shouldResetStudyMelodyOnsetTrackingOnPromptChange: vi.fn(() => false),
      getEnabledStrings: vi.fn(() => new Set(['E'])),
      redrawFretboard: vi.fn(),
      scheduleMelodyTimelineRenderFromState: vi.fn(),
      setSessionGoalProgress: vi.fn(),
      setSessionButtonsState: vi.fn(),
      playSound: vi.fn(),
      clearWrongDetectedHighlight: vi.fn(),
      recordPerformanceTimelineSuccess: vi.fn(),
      recordPerformanceTimelineMissed: vi.fn(),
      recordSessionAttempt: vi.fn(),
      recordPerformancePromptResolution: vi.fn(),
      updateStats: vi.fn(),
      recordPerformanceTimingAttempt: vi.fn(),
      recordPerformanceTimingByEvent: vi.fn(),
      setInfoSlots: vi.fn(),
      drawFretboard: vi.fn(),
      scheduleSessionTimeout: vi.fn(() => 1),
      isPerformanceStyleMode: vi.fn(() => true),
      getMelodyById: vi.fn(),
      getPracticeAdjustedMelody: vi.fn((melody) => melody),
      clearPerformanceTimelineFeedback: vi.fn(),
      requestAnimationFrame: vi.fn(() => 1),
      cancelAnimationFrame: vi.fn(),
    };

    const result = createSessionPromptPerformanceRuntimeGraphCluster(deps as any);
    const args = createSessionPromptPerformanceRuntimeCluster.mock.calls[0][0];

    args.performancePrompt.updateSessionGoalProgress();
    args.performanceTransport.onResolveMissedPrompt();

    expect(args.rhythmMode.state).not.toBe(deps.state);
    expect(args.micMonophonicAttackTracking.state).not.toBe(deps.state);
    expect(args.sessionPrompt.state).not.toBe(deps.state);
    expect(args.performancePrompt.state).not.toBe(deps.state);
    expect(args.performanceTransport.state).not.toBe(deps.state);
    expect(args.rhythmMode.state).toHaveProperty('rhythmLastJudgedBeatAtMs');
    expect(args.performanceTransport.state).toHaveProperty('performanceTransportAnimationId');
    expect(updateSessionGoalProgress).toHaveBeenCalledTimes(1);
    expect(resolveMissed).toHaveBeenCalledTimes(1);
    expect(result).toBe(clusterResult);
  });
});
