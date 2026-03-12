import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createSessionStopResetState } from './session-reset-state';
import { createSessionStopRuntimeController } from './session-stop-runtime-controller';

const sessionStatsMocks = vi.hoisted(() => ({
  finalizeSessionStats: vi.fn(),
}));

const performanceNoteLogMocks = vi.hoisted(() => ({
  buildPerformanceSessionNoteLogSnapshot: vi.fn(),
}));

const performanceStarsMocks = vi.hoisted(() => ({
  buildPerformanceStarsRunKey: vi.fn(),
  resolvePerformanceStarView: vi.fn(),
}));

const sessionAnalysisBundleMocks = vi.hoisted(() => ({
  buildSessionAnalysisBundle: vi.fn(),
}));

vi.mock('./session-stats', () => ({
  finalizeSessionStats: sessionStatsMocks.finalizeSessionStats,
}));

vi.mock('./performance-session-note-log', () => ({
  buildPerformanceSessionNoteLogSnapshot: performanceNoteLogMocks.buildPerformanceSessionNoteLogSnapshot,
}));

vi.mock('./performance-stars', () => ({
  buildPerformanceStarsRunKey: performanceStarsMocks.buildPerformanceStarsRunKey,
  resolvePerformanceStarView: performanceStarsMocks.resolvePerformanceStarView,
}));

vi.mock('./session-analysis-bundle', () => ({
  buildSessionAnalysisBundle: sessionAnalysisBundleMocks.buildSessionAnalysisBundle,
}));

function createState(overrides = {}) {
  return {
    activeSessionStats: { modeKey: 'performance', correctAttempts: 4 },
    animationId: 9,
    cooldown: true,
    ignorePromptAudioUntilMs: 1200,
    inputSource: 'microphone',
    isCalibrating: false,
    isDirectInputMode: false,
    isListening: true,
    isLoadingSamples: false,
    lastMicPolyphonicDetectorFallbackFrom: null,
    lastMicPolyphonicDetectorProviderUsed: 'basic-pitch',
    lastMicPolyphonicDetectorWarning: null,
    lastSessionAnalysisAutoDownloadKey: 'stale-key',
    lastSessionAnalysisBundle: null,
    lastSessionPerformanceNoteLog: null,
    lastSessionStats: null,
    micLastInputRms: 0.15,
    micLastMonophonicConfidence: 0.92,
    micLastMonophonicDetectedAtMs: 1234,
    micLastMonophonicPitchSpreadCents: 7,
    micNoteAttackFilterPreset: 'balanced',
    micNoteHoldFilterPreset: 'balanced',
    micPerformanceJudgmentCount: 5,
    micPerformanceJudgmentLastLatencyMs: 22,
    micPerformanceJudgmentTotalLatencyMs: 100,
    micPerformanceOnsetGateAtMs: 4000,
    micPerformanceOnsetGateReason: 'accepted',
    micPerformanceOnsetGateStatus: 'accepted',
    micPerformanceOnsetRejectedLowConfidenceCount: 1,
    micPerformanceOnsetRejectedLowVoicingCount: 2,
    micPerformanceOnsetRejectedShortHoldCount: 3,
    micPerformanceOnsetRejectedWeakAttackCount: 4,
    micPerformanceReadinessLastUiRefreshAtMs: 99,
    micPerformanceSuggestedLatencyMs: 14,
    micPolyphonicDetectorProvider: 'aubio',
    micPolyphonicDetectorTelemetryFallbackFrames: 2,
    micPolyphonicDetectorTelemetryFrames: 11,
    micPolyphonicDetectorTelemetryLastLatencyMs: 17,
    micPolyphonicDetectorTelemetryMaxLatencyMs: 30,
    micPolyphonicDetectorTelemetryTotalLatencyMs: 210,
    micPolyphonicDetectorTelemetryWarningFrames: 1,
    micPolyphonicDetectorTelemetryWindowStartedAtMs: 111,
    pendingTimeoutIds: new Set([1, 2]),
    performanceCaptureTelemetryByEvent: { 1: { attempts: 2 } },
    performanceMicLatencyCompensationMs: 35,
    performanceOnsetRejectsByEvent: { 1: [{ reasonKey: 'weak_attack' }] },
    performanceRunCompleted: true,
    performanceStarsByRunKey: {},
    performanceTimelineFeedbackByEvent: { 1: [{ kind: 'success' }] },
    performanceTimelineFeedbackKey: 'feedback:key',
    performanceTimingBiasMs: 12,
    performanceTimingByEvent: { 1: [{ grade: 'great' }] },
    performanceTimingLeniencyPreset: 'normal',
    performanceTransportAnimationId: 15,
    performanceMicTolerancePreset: 'balanced',
    requestedAudioInputContentHint: 'music',
    activeAudioInputTrackContentHint: 'music',
    activeAudioInputTrackSettings: {
      sampleRate: 48000,
      channelCount: 1,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
    showSessionSummaryOnStop: true,
    timerId: 44,
    micSensitivityPreset: 'balanced',
    ...overrides,
  };
}

function createDom(overrides = {}) {
  return {
    melodySelector: { value: 'builtin:guitar:ode_to_joy_intro' },
    melodyDemoBpm: { value: '92' },
    melodyStudyStart: { value: '2' },
    melodyStudyEnd: { value: '5' },
    audioInputDevice: { selectedOptions: [{ textContent: 'Scarlett Mic' }] },
    midiInputDevice: { selectedOptions: [{ textContent: 'MIDI Keys' }] },
    melodyTabTimelineGrid: { scrollLeft: 123 },
    ...overrides,
  };
}

function createDeps(stateOverrides = {}, domOverrides = {}) {
  const state = createState(stateOverrides);
  const dom = createDom(domOverrides);
  const deps = {
    dom,
    state,
    captureMicPerformanceLatencyCalibrationState: vi.fn(() => ({ restored: true })),
    restoreMicPerformanceLatencyCalibrationState: vi.fn(),
    flushPendingStatsSave: vi.fn(),
    saveLastSessionStats: vi.fn(),
    saveLastSessionAnalysisBundle: vi.fn(),
    savePerformanceStarResults: vi.fn(),
    displayStats: vi.fn(),
    displaySessionSummary: vi.fn(),
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
    createSessionStopResetState,
    refreshMicPolyphonicDetectorAudioInfoUi: vi.fn(),
    refreshMicPerformanceReadinessUi: vi.fn(),
    redrawFretboard: vi.fn(),
    scheduleMelodyTimelineRenderFromState: vi.fn(),
  };

  return { state, dom, deps };
}

describe('session-stop-runtime-controller', () => {
  beforeEach(() => {
    sessionStatsMocks.finalizeSessionStats.mockReset();
    performanceNoteLogMocks.buildPerformanceSessionNoteLogSnapshot.mockReset();
    performanceStarsMocks.buildPerformanceStarsRunKey.mockReset();
    performanceStarsMocks.resolvePerformanceStarView.mockReset();
    sessionAnalysisBundleMocks.buildSessionAnalysisBundle.mockReset();

    sessionStatsMocks.finalizeSessionStats.mockImplementation((stats) => ({ ...stats }));
    performanceNoteLogMocks.buildPerformanceSessionNoteLogSnapshot.mockReturnValue({ noteLog: true });
    performanceStarsMocks.buildPerformanceStarsRunKey.mockReturnValue('performance-run');
    performanceStarsMocks.resolvePerformanceStarView.mockReturnValue({ stars: 3 });
    sessionAnalysisBundleMocks.buildSessionAnalysisBundle.mockReturnValue({ analysis: true });
  });

  it('finalizes session artifacts and preserves timeline visuals for session summary', () => {
    const { state, deps } = createDeps();
    const originalFeedbackByEvent = structuredClone(state.performanceTimelineFeedbackByEvent);
    const originalTimingByEvent = structuredClone(state.performanceTimingByEvent);
    const originalRejectsByEvent = structuredClone(state.performanceOnsetRejectsByEvent);
    const originalCaptureByEvent = structuredClone(state.performanceCaptureTelemetryByEvent);
    const controller = createSessionStopRuntimeController(deps);

    controller.stop();

    expect(state.lastSessionStats).toEqual(
      expect.objectContaining({ modeKey: 'performance', completedRun: true })
    );
    expect(state.lastSessionPerformanceNoteLog).toEqual({ noteLog: true });
    expect(state.lastSessionAnalysisBundle).toEqual({ analysis: true });
    expect(state.lastSessionAnalysisAutoDownloadKey).toBeNull();
    expect(state.performanceStarsByRunKey['performance-run']).toBe(3);
    expect(deps.savePerformanceStarResults).toHaveBeenCalledTimes(1);
    expect(deps.flushPendingStatsSave).toHaveBeenCalledTimes(1);
    expect(deps.saveLastSessionStats).toHaveBeenCalledTimes(1);
    expect(deps.saveLastSessionAnalysisBundle).toHaveBeenCalledTimes(1);
    expect(deps.displayStats).toHaveBeenCalledTimes(1);
    expect(deps.displaySessionSummary).toHaveBeenCalledTimes(1);
    expect(sessionAnalysisBundleMocks.buildSessionAnalysisBundle).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedMelodyId: 'builtin:guitar:ode_to_joy_intro',
        melodyTempoBpm: 92,
        melodyStudyRange: { startIndex: 1, endIndex: 4 },
        inputSource: 'microphone',
        inputDeviceLabel: 'Scarlett Mic',
      })
    );
    expect(state.performanceTimelineFeedbackKey).toBe('feedback:key');
    expect(state.performanceTimelineFeedbackByEvent).toEqual(originalFeedbackByEvent);
    expect(state.performanceTimingByEvent).toEqual(originalTimingByEvent);
    expect(state.performanceOnsetRejectsByEvent).toEqual(originalRejectsByEvent);
    expect(state.performanceCaptureTelemetryByEvent).toEqual(originalCaptureByEvent);
    expect(deps.restoreMicPerformanceLatencyCalibrationState).toHaveBeenCalledWith({ restored: true });
  });

  it('tears down runtime state and skips audio teardown when stream should stay open', () => {
    const { state, dom, deps } = createDeps({
      activeSessionStats: null,
      showSessionSummaryOnStop: false,
      inputSource: 'midi',
    });
    const controller = createSessionStopRuntimeController(deps);

    controller.stop(true);

    expect(deps.teardownAudioRuntime).not.toHaveBeenCalled();
    expect(deps.setStatusText).not.toHaveBeenCalled();
    expect(deps.stopMetronome).toHaveBeenCalledTimes(1);
    expect(deps.cancelAnimationFrame).toHaveBeenCalledWith(9);
    expect(deps.stopPerformanceTransportLoop).toHaveBeenCalledTimes(1);
    expect(deps.clearTrackedTimeouts).toHaveBeenCalledWith(state.pendingTimeoutIds);
    expect(deps.invalidatePendingAdvance).toHaveBeenCalledTimes(1);
    expect(deps.clearInterval).toHaveBeenCalledWith(44);
    expect(deps.stopMidiInput).toHaveBeenCalledTimes(1);
    expect(deps.setTunerVisible).toHaveBeenCalledWith(false);
    expect(deps.updateTuner).toHaveBeenCalledWith(null);
    expect(deps.setVolumeLevel).toHaveBeenCalledWith(0);
    expect(deps.resetSessionButtonsState).toHaveBeenCalledTimes(1);
    expect(deps.setPromptText).toHaveBeenCalledWith('');
    expect(deps.clearResultMessage).toHaveBeenCalledTimes(1);
    expect(deps.clearSessionGoalProgress).toHaveBeenCalledTimes(1);
    expect(deps.setInfoSlots).toHaveBeenCalledTimes(1);
    expect(deps.setTimedInfoVisible).toHaveBeenCalledWith(false);
    expect(deps.refreshMicPolyphonicDetectorAudioInfoUi).not.toHaveBeenCalled();
    expect(deps.refreshMicPerformanceReadinessUi).not.toHaveBeenCalled();
    expect(deps.redrawFretboard).toHaveBeenCalledTimes(1);
    expect(deps.scheduleMelodyTimelineRenderFromState).toHaveBeenCalledTimes(1);
    expect(state.isListening).toBe(false);
    expect(state.activeSessionStats).toBeNull();
    expect(state.timerId).toBeNull();
    expect(state.cooldown).toBe(false);
    expect(state.ignorePromptAudioUntilMs).toBe(0);
    expect(state.performanceTimelineFeedbackKey).toBeNull();
    expect(state.performanceTimelineFeedbackByEvent).toEqual({});
    expect(state.micLastInputRms).toBe(0);
    expect(state.micLastMonophonicConfidence).toBeNull();
    expect(state.micLastMonophonicPitchSpreadCents).toBeNull();
    expect(state.micLastMonophonicDetectedAtMs).toBeNull();
    expect(state.micPerformanceReadinessLastUiRefreshAtMs).toBe(0);
    expect(dom.melodyTabTimelineGrid.scrollLeft).toBe(0);
  });
});

