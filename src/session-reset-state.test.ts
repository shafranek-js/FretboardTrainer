import { describe, expect, it } from 'vitest';
import { createSessionStopResetState } from './session-reset-state';

describe('createSessionStopResetState', () => {
  it('returns a fully reset session payload', () => {
    expect(createSessionStopResetState()).toEqual({
      stableNoteCounter: 0,
      lastNote: null,
      lastDetectedChord: '',
      stableChordCounter: 0,
      monophonicConfidenceEma: 0,
      monophonicVoicingEma: 0,
      consecutiveSilence: 0,
      lastPitches: [],
      currentPrompt: null,
      liveDetectedNote: null,
      liveDetectedString: null,
      wrongDetectedNote: null,
      wrongDetectedString: null,
      wrongDetectedFret: null,
      rhythmLastJudgedBeatAtMs: null,
      scaleNotes: [],
      currentScaleIndex: 0,
      currentProgression: [],
      currentProgressionIndex: 0,
      currentArpeggioIndex: 0,
      currentMelodyId: null,
      currentMelodyEventIndex: 0,
      performanceActiveEventIndex: null,
      currentMelodyEventFoundNotes: new Set<string>(),
      melodyDemoRuntimeActive: false,
      melodyDemoRuntimePaused: false,
      melodyDemoRuntimeBaseTimeSec: 0,
      melodyDemoRuntimeAnchorStartedAtMs: null,
      melodyDemoRuntimePausedOffsetSec: 0,
      micLastInputRms: 0,
      micLastMonophonicConfidence: null,
      micLastMonophonicPitchSpreadCents: null,
      micLastMonophonicDetectedAtMs: null,
      micPerformanceReadinessLastUiRefreshAtMs: 0,
      micPerformanceJudgmentCount: 0,
      micPerformanceJudgmentTotalLatencyMs: 0,
      micPerformanceJudgmentLastLatencyMs: null,
      micPerformanceJudgmentMaxLatencyMs: 0,
      micPerformanceSuggestedLatencyMs: null,
      micPerformanceLatencyCalibrationActive: false,
      micPerformanceOnsetGateStatus: 'idle',
      micPerformanceOnsetGateReason: null,
      micPerformanceOnsetGateAtMs: null,
      micPerformanceOnsetRejectedWeakAttackCount: 0,
      micPerformanceOnsetRejectedLowConfidenceCount: 0,
      micPerformanceOnsetRejectedLowVoicingCount: 0,
      micPerformanceOnsetRejectedShortHoldCount: 0,
      micPerformanceOnsetLastRejectedNote: null,
      micPerformanceOnsetLastRejectedAtMs: null,
      micPerformanceOnsetLastRejectedReasonKey: null,
      performancePromptResolved: false,
      performancePromptMatched: false,
      performancePromptHadAttempt: false,
      performancePromptHadWrongAttempt: false,
      performanceTimelineFeedbackKey: null,
      performanceTimelineFeedbackByEvent: {},
      performanceTimingByEvent: {},
      performanceOnsetRejectsByEvent: {},
      performanceCaptureTelemetryByEvent: {},
      performanceMicLastJudgedOnsetNote: null,
      performanceMicLastJudgedOnsetAtMs: null,
      performanceMicLastUncertainOnsetNote: null,
      performanceMicLastUncertainOnsetAtMs: null,
      micMonophonicAttackLastVolume: 0,
      performancePrerollLeadInVisible: false,
      performancePrerollStartedAtMs: null,
      performancePrerollDurationMs: 0,
      performancePrerollStepIndex: null,
      performanceRuntimeStartedAtMs: null,
      performanceTransportAnimationId: 0,
      performanceRunCompleted: false,
      showSessionSummaryOnStop: false,
      pendingSessionStopResultMessage: null,
    });
  });

  it('returns fresh arrays on each call', () => {
    const first = createSessionStopResetState();
    const second = createSessionStopResetState();

    expect(first.lastPitches).not.toBe(second.lastPitches);
    expect(first.scaleNotes).not.toBe(second.scaleNotes);
    expect(first.currentProgression).not.toBe(second.currentProgression);
    expect(first.currentMelodyEventFoundNotes).not.toBe(second.currentMelodyEventFoundNotes);
  });
});
