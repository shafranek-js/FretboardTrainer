import { describe, expect, it, vi } from 'vitest';
import { createSessionLifecycleRuntimeCluster } from './session-lifecycle-runtime-cluster';

function createDeps() {
  return {
    stop: {
      stopMetronome: vi.fn(),
      cancelAnimationFrame: vi.fn(),
      stopPerformanceTransportLoop: vi.fn(),
      clearTrackedTimeouts: vi.fn(),
      invalidatePendingAdvance: vi.fn(),
      clearInterval: vi.fn(),
      resetAttackTracking: vi.fn(),
      resetMicPolyphonicDetectorTelemetry: vi.fn(),
      stopMidiInput: vi.fn(),
      teardownAudioRuntime: vi.fn(),
      setStatusText: vi.fn(),
      setTunerVisible: vi.fn(),
      updateTuner: vi.fn(),
      setVolumeLevel: vi.fn(),
      resetSessionButtonsState: vi.fn(),
      setPromptText: vi.fn(),
      clearResultMessage: vi.fn(),
      clearSessionGoalProgress: vi.fn(),
      setInfoSlots: vi.fn(),
      setTimedInfoVisible: vi.fn(),
      captureMicPerformanceLatencyCalibrationState: vi.fn(() => null),
      restoreMicPerformanceLatencyCalibrationState: vi.fn(),
      flushPendingStatsSave: vi.fn(),
      saveLastSessionStats: vi.fn(),
      saveLastSessionAnalysisBundle: vi.fn(),
      savePerformanceStarResults: vi.fn(),
      displayStats: vi.fn(),
      displaySessionSummary: vi.fn(),
      createSessionStopResetState: vi.fn(() => ({})),
      refreshMicPolyphonicDetectorAudioInfoUi: vi.fn(),
      refreshMicPerformanceReadinessUi: vi.fn(),
      redrawFretboard: vi.fn(),
      scheduleMelodyTimelineRenderFromState: vi.fn(),
      dom: {
        melodySelector: { value: '', selectedOptions: [] },
        melodyDemoBpm: { value: '' },
        melodyStudyStart: { value: '1' },
        melodyStudyEnd: { value: '1' },
        audioInputDevice: { selectedOptions: [] },
        midiInputDevice: { selectedOptions: [] },
        melodyTabTimelineGrid: { scrollLeft: 0 },
      },
      state: {
        activeSessionStats: null,
        animationId: 0,
        cooldown: false,
        ignorePromptAudioUntilMs: 0,
        inputSource: 'microphone',
        isCalibrating: false,
        isDirectInputMode: false,
        isListening: false,
        isLoadingSamples: false,
        lastMicPolyphonicDetectorFallbackFrom: null,
        lastMicPolyphonicDetectorProviderUsed: null,
        lastMicPolyphonicDetectorWarning: null,
        lastSessionAnalysisAutoDownloadKey: null,
        lastSessionAnalysisBundle: null,
        lastSessionPerformanceNoteLog: null,
        lastSessionStats: null,
        micLastInputRms: 0,
        micLastMonophonicConfidence: null,
        micLastMonophonicDetectedAtMs: null,
        micLastMonophonicPitchSpreadCents: null,
        micNoteAttackFilterPreset: 'off',
        micNoteHoldFilterPreset: 'off',
        micPerformanceJudgmentCount: 0,
        micPerformanceJudgmentLastLatencyMs: null,
        micPerformanceJudgmentTotalLatencyMs: 0,
        micPerformanceOnsetGateAtMs: null,
        micPerformanceOnsetGateReason: null,
        micPerformanceOnsetGateStatus: 'idle',
        micPerformanceOnsetRejectedLowConfidenceCount: 0,
        micPerformanceOnsetRejectedLowVoicingCount: 0,
        micPerformanceOnsetRejectedShortHoldCount: 0,
        micPerformanceOnsetRejectedWeakAttackCount: 0,
        micPerformanceReadinessLastUiRefreshAtMs: 0,
        micPerformanceSuggestedLatencyMs: null,
        micPolyphonicDetectorProvider: 'auto',
        micPolyphonicDetectorTelemetryFallbackFrames: 0,
        micPolyphonicDetectorTelemetryFrames: 0,
        micPolyphonicDetectorTelemetryLastLatencyMs: null,
        micPolyphonicDetectorTelemetryMaxLatencyMs: 0,
        micPolyphonicDetectorTelemetryTotalLatencyMs: 0,
        micPolyphonicDetectorTelemetryWarningFrames: 0,
        micPolyphonicDetectorTelemetryWindowStartedAtMs: 0,
        pendingTimeoutIds: new Set(),
        performanceCaptureTelemetryByEvent: {},
        performanceMicLatencyCompensationMs: 0,
        performanceOnsetRejectsByEvent: {},
        performanceRunCompleted: false,
        performanceStarsByRunKey: {},
        performanceTimelineFeedbackByEvent: {},
        performanceTimelineFeedbackKey: null,
        performanceTimingBiasMs: 0,
        performanceTimingByEvent: {},
        performanceTimingLeniencyPreset: 'normal',
        performanceTransportAnimationId: null,
        performanceMicTolerancePreset: 'normal',
        requestedAudioInputContentHint: null,
        activeAudioInputTrackContentHint: null,
        activeAudioInputTrackSettings: null,
        showSessionSummaryOnStop: false,
        timerId: null,
        micSensitivityPreset: 'normal',
      },
    },
    input: {} as never,
    start: {} as never,
    activation: {} as never,
    startError: {
      state: { inputSource: 'microphone' },
      setAudioInputGuidanceError: vi.fn(),
      refreshMicPolyphonicDetectorAudioInfoUi: vi.fn(),
      showNonBlockingError: vi.fn(),
      formatUserFacingError: vi.fn(() => 'error'),
    },
    nextPrompt: {} as never,
    displayResult: {} as never,
    timeUp: {
      state: { currentScore: 0, stats: { highScore: 0 }, timerId: null, showSessionSummaryOnStop: false },
      clearInterval: vi.fn(),
      saveStats: vi.fn(),
      setResultMessage: vi.fn(),
    },
    seek: {} as never,
  };
}

describe('session-lifecycle-runtime-cluster', () => {
  it('creates lifecycle controllers and public entry points', () => {
    const cluster = createSessionLifecycleRuntimeCluster(createDeps() as never);

    expect(cluster.sessionStopRuntimeController).toBeTruthy();
    expect(cluster.sessionInputRuntimeController).toBeTruthy();
    expect(cluster.sessionStartRuntimeController).toBeTruthy();
    expect(cluster.sessionActivationRuntimeController).toBeTruthy();
    expect(cluster.sessionStartErrorRuntimeController).toBeTruthy();
    expect(cluster.sessionNextPromptRuntimeController).toBeTruthy();
    expect(cluster.sessionDisplayResultRuntimeController).toBeTruthy();
    expect(cluster.sessionTimeUpRuntimeController).toBeTruthy();
    expect(cluster.sessionSeekRuntimeController).toBeTruthy();
    expect(typeof cluster.stopListening).toBe('function');
    expect(typeof cluster.nextPrompt).toBe('function');
    expect(typeof cluster.displayResult).toBe('function');
    expect(typeof cluster.handleTimeUp).toBe('function');
    expect(typeof cluster.seekActiveMelodySessionToEvent).toBe('function');
  });
});
