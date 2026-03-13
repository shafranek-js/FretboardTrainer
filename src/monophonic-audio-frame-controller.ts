import type { AppState } from './state';
type MonophonicFrameResult = import('./audio-frame-processing').MonophonicFrameResult;
type MicMonophonicAttackTrackingEvent = import('./mic-monophonic-attack-tracking-controller').MicMonophonicAttackTrackingEvent;
type PerformanceMicHoldCalibrationLevel = import('./mic-note-hold-filter').PerformanceMicHoldCalibrationLevel;

interface MonophonicAudioFrameControllerDeps {
  state: Pick<
    AppState,
    | 'dataArray'
    | 'audioContext'
    | 'targetFrequency'
    | 'currentPrompt'
    | 'lastPitches'
    | 'lastNote'
    | 'stableNoteCounter'
    | 'monophonicConfidenceEma'
    | 'monophonicVoicingEma'
    | 'micLastMonophonicConfidence'
    | 'micLastMonophonicPitchSpreadCents'
    | 'micLastMonophonicDetectedAtMs'
    | 'inputSource'
    | 'micMonophonicAttackPeakVolume'
    | 'micMonophonicFirstDetectedAtMs'
    | 'performanceMicLastUncertainOnsetNote'
    | 'performanceMicLastUncertainOnsetAtMs'
    | 'startTime'
    | 'performanceMicLatencyCompensationMs'
    | 'performanceTimingLeniencyPreset'
    | 'micNoteAttackFilterPreset'
    | 'micNoteHoldFilterPreset'
  >;
  detectPitch: typeof import('./audio').detectPitch;
  noteResolver: typeof import('./audio').freqToNoteName;
  detectMonophonicFrame: typeof import('./audio-detection-handlers').detectMonophonicFrame;
  buildAudioMonophonicReactionPlan: typeof import('./session-detection-reactions').buildAudioMonophonicReactionPlan;
  executeAudioMonophonicReaction: typeof import('./process-audio-reaction-executors').executeAudioMonophonicReaction;
  updateTuner: (frequency: number) => void;
  refreshReadinessUiThrottled: (nowMs?: number) => void;
  recordCaptureFrame: (input: {
    rms: number;
    detectedNote: string | null;
    nextStableNoteCounter: number;
    requiredStableFrames: number;
    confident: boolean;
    voiced: boolean;
    attackPeak: number;
  }) => void;
  recordStableDetection: () => void;
  recordUncertainFrame: (reason: import('./session-analysis-bundle').MicPerformanceOnsetRejectReasonKey | null) => void;
  setOnsetGateStatus: (
    status: 'accepted' | 'rejected',
    statusText: string,
    options?: {
      atMs?: number;
      rejectReasonKey?: 'short_hold' | 'weak_attack' | 'low_confidence' | 'low_voicing';
      onsetNote?: string;
      onsetAtMs?: number | null;
      eventDurationMs?: number | null;
      holdRequiredMs?: number;
      holdElapsedMs?: number | null;
      runtimeCalibrationLevel?: PerformanceMicHoldCalibrationLevel;
    }
  ) => void;
  resolveUncertainReasonKey: (input: {
    voicingAccepted: boolean;
    confidenceAccepted: boolean;
    attackAccepted: boolean;
    holdAccepted: boolean;
  }) => import('./session-analysis-bundle').MicPerformanceOnsetRejectReasonKey | null;
  resolveEffectiveRuntimeMicHoldCalibrationLevel: (
    performanceAdaptiveMicInput: boolean
  ) => PerformanceMicHoldCalibrationLevel;
  updateAttackTracking: (detectedNote: string | null, volume: number) => MicMonophonicAttackTrackingEvent;
  clearFreshAttackGuard: (event: MicMonophonicAttackTrackingEvent) => void;
  resolveMicNoteAttackRequiredPeak: typeof import('./mic-note-attack-filter').resolveMicNoteAttackRequiredPeak;
  shouldAcceptMicNoteByAttackStrength: typeof import('./mic-note-attack-filter').shouldAcceptMicNoteByAttackStrength;
  resolveMicNoteHoldRequiredDurationMs: typeof import('./mic-note-hold-filter').resolveMicNoteHoldRequiredDurationMs;
  shouldAcceptMicNoteByHoldDuration: typeof import('./mic-note-hold-filter').shouldAcceptMicNoteByHoldDuration;
  resolvePerformanceMicJudgingThresholds: typeof import('./performance-mic-judging-thresholds').resolvePerformanceMicJudgingThresholds;
  shouldReportPerformanceMicUncertainFrame: typeof import('./performance-mic-uncertain').shouldReportPerformanceMicUncertainFrame;
  resolveLatencyCompensatedPromptStartedAtMs: typeof import('./performance-mic-latency-compensation').resolveLatencyCompensatedPromptStartedAtMs;
  setResultMessage: (message: string, tone?: 'neutral' | 'success' | 'error') => void;
  handleStableDetectedNote: (detectedNote: string, detectedFrequency?: number | null) => void;
  now?: () => number;
}

interface HandleMonophonicFrameInput {
  volume: number;
  micVolumeThreshold: number;
  requiredStableFrames: number;
  melodyAdaptiveMicInput: boolean;
  performanceAdaptiveMicInput: boolean;
}

export function createMonophonicAudioFrameController(deps: MonophonicAudioFrameControllerDeps) {
  const now = () => (typeof deps.now === 'function' ? deps.now() : Date.now());

  function applyFrameState(monophonicResult: MonophonicFrameResult) {
    deps.state.micLastMonophonicConfidence = monophonicResult.confidence;
    deps.state.micLastMonophonicPitchSpreadCents = monophonicResult.pitchSpreadCents;
    if (monophonicResult.detectedNote) {
      deps.state.micLastMonophonicDetectedAtMs = now();
    }
    deps.state.lastPitches = monophonicResult.nextLastPitches;
    deps.state.lastNote = monophonicResult.nextLastNote;
    deps.state.stableNoteCounter = monophonicResult.nextStableNoteCounter;
    deps.state.monophonicConfidenceEma = monophonicResult.nextConfidenceEma;
    deps.state.monophonicVoicingEma = monophonicResult.nextVoicingEma;
  }

  function handlePerformanceOnsetGate(input: {
    detectedNote: string;
    monophonicResult: MonophonicFrameResult;
    micVolumeThreshold: number;
    performanceAdaptiveMicInput: boolean;
  }) {
    const nowMs = now();
    const performanceHoldCalibrationLevel = deps.resolveEffectiveRuntimeMicHoldCalibrationLevel(
      input.performanceAdaptiveMicInput
    );
    const attackRequiredPeak =
      deps.state.inputSource === 'midi'
        ? 0
        : deps.resolveMicNoteAttackRequiredPeak({
            preset: deps.state.micNoteAttackFilterPreset,
            volumeThreshold: input.micVolumeThreshold,
            performanceAdaptive: input.performanceAdaptiveMicInput,
            smoothedConfidence: input.monophonicResult.confidence,
            smoothedVoicing: input.monophonicResult.voicingConfidence,
          });
    const attackAccepted =
      deps.state.inputSource === 'midi' ||
      deps.shouldAcceptMicNoteByAttackStrength({
        preset: deps.state.micNoteAttackFilterPreset,
        peakVolume: deps.state.micMonophonicAttackPeakVolume,
        volumeThreshold: input.micVolumeThreshold,
        performanceAdaptive: input.performanceAdaptiveMicInput,
        smoothedConfidence: input.monophonicResult.confidence,
        smoothedVoicing: input.monophonicResult.voicingConfidence,
      });
    const holdRequiredMs = deps.resolveMicNoteHoldRequiredDurationMs({
      preset: deps.state.micNoteHoldFilterPreset,
      performanceAdaptive: input.performanceAdaptiveMicInput,
      eventDurationMs: deps.state.currentPrompt?.melodyEventDurationMs ?? null,
      performanceCalibrationLevel: performanceHoldCalibrationLevel,
    });
    const holdElapsedMs =
      deps.state.micMonophonicFirstDetectedAtMs === null
        ? null
        : Math.max(0, nowMs - deps.state.micMonophonicFirstDetectedAtMs);
    const holdAccepted =
      deps.state.inputSource === 'midi' ||
      deps.shouldAcceptMicNoteByHoldDuration({
        preset: deps.state.micNoteHoldFilterPreset,
        noteFirstDetectedAtMs: deps.state.micMonophonicFirstDetectedAtMs,
        nowMs,
        performanceAdaptive: input.performanceAdaptiveMicInput,
        eventDurationMs: deps.state.currentPrompt?.melodyEventDurationMs ?? null,
        performanceCalibrationLevel: performanceHoldCalibrationLevel,
      });
    const performanceMicThresholds = input.performanceAdaptiveMicInput
      ? deps.resolvePerformanceMicJudgingThresholds({
          smoothedConfidence: input.monophonicResult.confidence,
          rawConfidence: input.monophonicResult.rawConfidence,
          smoothedVoicing: input.monophonicResult.voicingConfidence,
          rawVoicing: input.monophonicResult.rawVoicingConfidence,
          attackPeakVolume: deps.state.micMonophonicAttackPeakVolume,
          attackRequiredPeak,
        })
      : null;
    const confidenceAccepted =
      performanceMicThresholds?.confidenceAccepted ?? input.monophonicResult.isConfident;
    const voicingAccepted = performanceMicThresholds?.voicingAccepted ?? input.monophonicResult.isVoiced;

    if (input.performanceAdaptiveMicInput) {
      const onsetAtMs = deps.state.micMonophonicFirstDetectedAtMs;
      const eventDurationMs = deps.state.currentPrompt?.melodyEventDurationMs ?? null;
      if (!voicingAccepted) {
        deps.setOnsetGateStatus('rejected', `Reason: low voicing (${input.monophonicResult.voicingConfidence.toFixed(2)}).`, {
          atMs: nowMs,
          rejectReasonKey: 'low_voicing',
          onsetNote: input.detectedNote,
          onsetAtMs,
          eventDurationMs,
          runtimeCalibrationLevel: performanceHoldCalibrationLevel,
        });
      } else if (!confidenceAccepted) {
        deps.setOnsetGateStatus('rejected', `Reason: low confidence (${input.monophonicResult.confidence.toFixed(2)}).`, {
          atMs: nowMs,
          rejectReasonKey: 'low_confidence',
          onsetNote: input.detectedNote,
          onsetAtMs,
          eventDurationMs,
          runtimeCalibrationLevel: performanceHoldCalibrationLevel,
        });
      } else if (!attackAccepted) {
        deps.setOnsetGateStatus(
          'rejected',
          `Reason: weak attack (peak ${deps.state.micMonophonicAttackPeakVolume.toFixed(3)} < ${attackRequiredPeak.toFixed(3)}).`,
          {
            atMs: nowMs,
            rejectReasonKey: 'weak_attack',
            onsetNote: input.detectedNote,
            onsetAtMs,
            eventDurationMs,
            runtimeCalibrationLevel: performanceHoldCalibrationLevel,
          }
        );
      } else if (!holdAccepted) {
        deps.setOnsetGateStatus('rejected', `Reason: hold too short (${Math.round(holdElapsedMs ?? 0)}ms < ${holdRequiredMs}ms).`, {
          atMs: nowMs,
          rejectReasonKey: 'short_hold',
          onsetNote: input.detectedNote,
          onsetAtMs,
          eventDurationMs,
          holdRequiredMs,
          holdElapsedMs,
          runtimeCalibrationLevel: performanceHoldCalibrationLevel,
        });
      } else {
        deps.setOnsetGateStatus(
          'accepted',
          `Peak ${deps.state.micMonophonicAttackPeakVolume.toFixed(3)}, conf ${input.monophonicResult.confidence.toFixed(2)}, voicing ${input.monophonicResult.voicingConfidence.toFixed(2)}.`,
          { atMs: nowMs }
        );
      }
      deps.refreshReadinessUiThrottled(nowMs);
    }

    const uncertainReasonKey = deps.resolveUncertainReasonKey({
      voicingAccepted,
      confidenceAccepted,
      attackAccepted,
      holdAccepted,
    });
    if (
      input.performanceAdaptiveMicInput &&
      deps.shouldReportPerformanceMicUncertainFrame({
        detectedNote: input.detectedNote,
        noteFirstDetectedAtMs: deps.state.micMonophonicFirstDetectedAtMs,
        promptStartedAtMs:
          deps.resolveLatencyCompensatedPromptStartedAtMs(
            deps.state.startTime,
            deps.state.performanceMicLatencyCompensationMs
          ) ?? deps.state.startTime,
        nowMs,
        attackAccepted,
        holdAccepted,
        confidenceAccepted,
        voicingAccepted,
        lastReportedOnsetNote: deps.state.performanceMicLastUncertainOnsetNote,
        lastReportedOnsetAtMs: deps.state.performanceMicLastUncertainOnsetAtMs,
        eventDurationMs: deps.state.currentPrompt?.melodyEventDurationMs ?? null,
        leniencyPreset: deps.state.performanceTimingLeniencyPreset ?? 'normal',
      })
    ) {
      deps.state.performanceMicLastUncertainOnsetNote = input.detectedNote;
      deps.state.performanceMicLastUncertainOnsetAtMs = deps.state.micMonophonicFirstDetectedAtMs;
      deps.recordUncertainFrame(uncertainReasonKey);
      deps.setResultMessage('Low mic confidence. Play a cleaner single-note attack.', 'neutral');
    }

    return {
      attackAccepted,
      holdAccepted,
      confidenceAccepted,
      voicingAccepted,
    };
  }

  function handleFrame(input: HandleMonophonicFrameInput) {
    const frequency = deps.detectPitch(
      deps.state.dataArray!,
      deps.state.audioContext!.sampleRate,
      input.micVolumeThreshold,
      {
        expectedFrequency: input.melodyAdaptiveMicInput ? deps.state.targetFrequency : null,
        preferLowLatency: input.melodyAdaptiveMicInput,
      }
    );
    deps.updateTuner(frequency);

    const monophonicResult = deps.detectMonophonicFrame({
      frequency,
      lastPitches: deps.state.lastPitches,
      lastNote: deps.state.lastNote,
      stableNoteCounter: deps.state.stableNoteCounter,
      previousConfidenceEma: deps.state.monophonicConfidenceEma,
      previousVoicingEma: deps.state.monophonicVoicingEma,
      requiredStableFrames: input.requiredStableFrames,
      targetNote: deps.state.currentPrompt?.targetNote ?? null,
      noteResolver: deps.noteResolver,
      emaPreset: input.melodyAdaptiveMicInput ? 'performance_fast' : 'default',
    });

    applyFrameState(monophonicResult);
    if (deps.state.inputSource === 'microphone') {
      deps.refreshReadinessUiThrottled();
    }

    const reactionPlan = deps.buildAudioMonophonicReactionPlan({
      detectedNote: monophonicResult.detectedNote,
      nextStableNoteCounter: monophonicResult.nextStableNoteCounter,
      requiredStableFrames: input.requiredStableFrames,
    });

    if (input.performanceAdaptiveMicInput) {
      deps.recordCaptureFrame({
        rms: input.volume,
        detectedNote: monophonicResult.detectedNote,
        nextStableNoteCounter: monophonicResult.nextStableNoteCounter,
        requiredStableFrames: input.requiredStableFrames,
        confident: monophonicResult.isConfident,
        voiced: monophonicResult.isVoiced,
        attackPeak: deps.state.micMonophonicAttackPeakVolume,
      });
    }

    deps.executeAudioMonophonicReaction({
      reactionPlan,
      onStableDetectedNote: (detectedNote) => {
        if (input.performanceAdaptiveMicInput) {
          deps.recordStableDetection();
        }
        const attackTrackingEvent = deps.updateAttackTracking(detectedNote, input.volume);
        deps.clearFreshAttackGuard(attackTrackingEvent);
        const gateOutcome = handlePerformanceOnsetGate({
          detectedNote,
          monophonicResult,
          micVolumeThreshold: input.micVolumeThreshold,
          performanceAdaptiveMicInput: input.performanceAdaptiveMicInput,
        });
        if (
          input.performanceAdaptiveMicInput &&
          deps.state.inputSource !== 'midi' &&
          (!gateOutcome.voicingAccepted ||
            !gateOutcome.confidenceAccepted ||
            !gateOutcome.attackAccepted ||
            !gateOutcome.holdAccepted)
        ) {
          return;
        }
        deps.handleStableDetectedNote(detectedNote, monophonicResult.smoothedFrequency);
      },
    });

    if (reactionPlan.kind === 'none') {
      const attackTrackingEvent = deps.updateAttackTracking(monophonicResult.detectedNote, input.volume);
      deps.clearFreshAttackGuard(attackTrackingEvent);
    }
  }

  return {
    handleFrame,
  };
}
