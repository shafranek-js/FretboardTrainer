import { describe, expect, it, vi } from 'vitest';
import { createMonophonicAudioFrameController } from './monophonic-audio-frame-controller';

function createState() {
  return {
    dataArray: new Float32Array([0.1, 0.2]),
    audioContext: { sampleRate: 48000 },
    targetFrequency: 261.63,
    currentPrompt: { targetNote: 'C', melodyEventDurationMs: 180 },
    lastPitches: [],
    lastNote: null,
    stableNoteCounter: 0,
    monophonicConfidenceEma: 0,
    monophonicVoicingEma: 0,
    micLastMonophonicConfidence: 0,
    micLastMonophonicPitchSpreadCents: null,
    micLastMonophonicDetectedAtMs: null,
    inputSource: 'microphone' as const,
    micMonophonicAttackPeakVolume: 0.12,
    micMonophonicFirstDetectedAtMs: 1000,
    performanceMicLastUncertainOnsetNote: null,
    performanceMicLastUncertainOnsetAtMs: null,
    startTime: 900,
    performanceMicLatencyCompensationMs: 0,
    performanceTimingLeniencyPreset: 'normal' as const,
    micNoteAttackFilterPreset: 'balanced' as const,
    micNoteHoldFilterPreset: '80ms' as const,
  };
}

function createMonophonicResult(overrides = {}) {
  return {
    withinRange: true,
    detectedNote: 'C',
    smoothedFrequency: 261.63,
    pitchSpreadCents: 2,
    confidence: 0.9,
    rawConfidence: 0.9,
    isConfident: true,
    nextConfidenceEma: 0.9,
    voicingConfidence: 0.92,
    rawVoicingConfidence: 0.92,
    isVoiced: true,
    nextVoicingEma: 0.92,
    nextLastPitches: [261.63],
    nextLastNote: 'C',
    nextStableNoteCounter: 4,
    isStableMatch: true,
    isStableMismatch: false,
    ...overrides,
  };
}

function createDeps() {
  const state = createState();
  return {
    state,
    detectPitch: vi.fn(() => 261.63),
    noteResolver: vi.fn(() => 'C'),
    detectMonophonicFrame: vi.fn(() => createMonophonicResult()),
    buildAudioMonophonicReactionPlan: vi.fn(() => ({ kind: 'stable_note', detectedNote: 'C' })),
    executeAudioMonophonicReaction: vi.fn(({ reactionPlan, onStableDetectedNote }) => {
      if (reactionPlan.kind === 'stable_note') onStableDetectedNote(reactionPlan.detectedNote);
    }),
    updateTuner: vi.fn(),
    refreshReadinessUiThrottled: vi.fn(),
    recordCaptureFrame: vi.fn(),
    recordStableDetection: vi.fn(),
    recordUncertainFrame: vi.fn(),
    setOnsetGateStatus: vi.fn(),
    resolveUncertainReasonKey: vi.fn(() => 'unknown'),
    resolveEffectiveRuntimeMicHoldCalibrationLevel: vi.fn(() => 'mild'),
    updateAttackTracking: vi.fn(() => 'started'),
    clearFreshAttackGuard: vi.fn(),
    resolveMicNoteAttackRequiredPeak: vi.fn(() => 0.05),
    shouldAcceptMicNoteByAttackStrength: vi.fn(() => true),
    resolveMicNoteHoldRequiredDurationMs: vi.fn(() => 28),
    shouldAcceptMicNoteByHoldDuration: vi.fn(() => true),
    resolvePerformanceMicJudgingThresholds: vi.fn(() => ({ confidenceAccepted: true, voicingAccepted: true })),
    shouldReportPerformanceMicUncertainFrame: vi.fn(() => false),
    resolveLatencyCompensatedPromptStartedAtMs: vi.fn((startTime) => startTime),
    setResultMessage: vi.fn(),
    handleStableDetectedNote: vi.fn(),
    now: vi.fn(() => 1100),
  };
}

describe('monophonic-audio-frame-controller', () => {
  it('handles an accepted stable performance frame and forwards it to stable detection', () => {
    const deps = createDeps();
    const controller = createMonophonicAudioFrameController(deps);

    controller.handleFrame({
      volume: 0.12,
      micVolumeThreshold: 0.03,
      requiredStableFrames: 3,
      melodyAdaptiveMicInput: true,
      performanceAdaptiveMicInput: true,
    });

    expect(deps.updateTuner).toHaveBeenCalledWith(261.63);
    expect(deps.recordCaptureFrame).toHaveBeenCalledTimes(1);
    expect(deps.recordStableDetection).toHaveBeenCalledTimes(1);
    expect(deps.setOnsetGateStatus).toHaveBeenCalledWith(
      'accepted',
      'Peak 0.120, conf 0.90, voicing 0.92.',
      expect.objectContaining({ atMs: 1100 })
    );
    expect(deps.handleStableDetectedNote).toHaveBeenCalledWith('C', 261.63);
  });

  it('blocks unstable performance onset gates and reports uncertain frames', () => {
    const deps = createDeps();
    deps.resolvePerformanceMicJudgingThresholds = vi.fn(() => ({ confidenceAccepted: false, voicingAccepted: true }));
    deps.resolveUncertainReasonKey = vi.fn(() => 'low_confidence');
    deps.shouldReportPerformanceMicUncertainFrame = vi.fn(() => true);
    const controller = createMonophonicAudioFrameController(deps);

    controller.handleFrame({
      volume: 0.12,
      micVolumeThreshold: 0.03,
      requiredStableFrames: 3,
      melodyAdaptiveMicInput: true,
      performanceAdaptiveMicInput: true,
    });

    expect(deps.setOnsetGateStatus).toHaveBeenCalledWith(
      'rejected',
      'Reason: low confidence (0.90).',
      expect.objectContaining({ rejectReasonKey: 'low_confidence' })
    );
    expect(deps.recordUncertainFrame).toHaveBeenCalledWith('low_confidence');
    expect(deps.setResultMessage).toHaveBeenCalledWith(
      'Low mic confidence. Play a cleaner single-note attack.',
      'neutral'
    );
    expect(deps.handleStableDetectedNote).not.toHaveBeenCalled();
    expect(deps.state.performanceMicLastUncertainOnsetNote).toBe('C');
  });

  it('updates attack tracking for non-stable frames without forwarding detection', () => {
    const deps = createDeps();
    deps.detectMonophonicFrame = vi.fn(() => createMonophonicResult({ nextStableNoteCounter: 1 }));
    deps.buildAudioMonophonicReactionPlan = vi.fn(() => ({ kind: 'none' }));
    deps.executeAudioMonophonicReaction = vi.fn();
    const controller = createMonophonicAudioFrameController(deps);

    controller.handleFrame({
      volume: 0.12,
      micVolumeThreshold: 0.03,
      requiredStableFrames: 3,
      melodyAdaptiveMicInput: false,
      performanceAdaptiveMicInput: false,
    });

    expect(deps.updateAttackTracking).toHaveBeenCalledWith('C', 0.12);
    expect(deps.clearFreshAttackGuard).toHaveBeenCalledWith('started');
    expect(deps.handleStableDetectedNote).not.toHaveBeenCalled();
  });
});
