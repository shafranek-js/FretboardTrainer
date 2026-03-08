import type { Prompt } from './types';
import type { PerformanceTimelineFeedbackByEvent } from './performance-timeline-feedback';
import type {
  MicPerformanceOnsetRejectReasonKey,
  PerformanceCaptureEventTelemetry,
  PerformanceOnsetRejectEventLogEntry,
  PerformanceTimingEventLogEntry,
} from './session-analysis-bundle';
import { createPromptCycleTrackingResetState } from './prompt-tracking-state';

export interface SessionStopResetState {
  currentPrompt: Prompt | null;
  liveDetectedNote: string | null;
  liveDetectedString: string | null;
  wrongDetectedNote: string | null;
  wrongDetectedString: string | null;
  wrongDetectedFret: number | null;
  rhythmLastJudgedBeatAtMs: number | null;
  scaleNotes: { note: string; string: string }[];
  currentScaleIndex: number;
  currentProgression: string[];
  currentProgressionIndex: number;
  currentArpeggioIndex: number;
  currentMelodyId: string | null;
  currentMelodyEventIndex: number;
  performanceActiveEventIndex: number | null;
  currentMelodyEventFoundNotes: Set<string>;
  melodyDemoRuntimeActive: boolean;
  melodyDemoRuntimePaused: boolean;
  melodyDemoRuntimeBaseTimeSec: number;
  melodyDemoRuntimeAnchorStartedAtMs: number | null;
  melodyDemoRuntimePausedOffsetSec: number;
  performancePromptResolved: boolean;
  performancePromptMatched: boolean;
  performancePromptHadAttempt: boolean;
  performancePromptHadWrongAttempt: boolean;
  performanceTimelineFeedbackKey: string | null;
  performanceTimelineFeedbackByEvent: PerformanceTimelineFeedbackByEvent;
  performanceTimingByEvent: Record<number, PerformanceTimingEventLogEntry[]>;
  performanceOnsetRejectsByEvent: Record<number, PerformanceOnsetRejectEventLogEntry[]>;
  performanceCaptureTelemetryByEvent: Record<number, PerformanceCaptureEventTelemetry>;
  monophonicConfidenceEma: number;
  performanceMicLastJudgedOnsetNote: string | null;
  performanceMicLastJudgedOnsetAtMs: number | null;
  performanceMicLastUncertainOnsetNote: string | null;
  performanceMicLastUncertainOnsetAtMs: number | null;
  micMonophonicAttackLastVolume: number;
  micLastInputRms: number;
  micLastMonophonicConfidence: number | null;
  micLastMonophonicPitchSpreadCents: number | null;
  micLastMonophonicDetectedAtMs: number | null;
  micPerformanceReadinessLastUiRefreshAtMs: number;
  micPerformanceJudgmentCount: number;
  micPerformanceJudgmentTotalLatencyMs: number;
  micPerformanceJudgmentLastLatencyMs: number | null;
  micPerformanceJudgmentMaxLatencyMs: number;
  micPerformanceSuggestedLatencyMs: number | null;
  micPerformanceLatencyCalibrationActive: boolean;
  micPerformanceOnsetGateStatus: 'idle' | 'accepted' | 'rejected';
  micPerformanceOnsetGateReason: string | null;
  micPerformanceOnsetGateAtMs: number | null;
  micPerformanceOnsetRejectedWeakAttackCount: number;
  micPerformanceOnsetRejectedLowConfidenceCount: number;
  micPerformanceOnsetRejectedLowVoicingCount: number;
  micPerformanceOnsetRejectedShortHoldCount: number;
  micPerformanceOnsetLastRejectedNote: string | null;
  micPerformanceOnsetLastRejectedAtMs: number | null;
  micPerformanceOnsetLastRejectedReasonKey:
    | MicPerformanceOnsetRejectReasonKey
    | null;
  performancePrerollLeadInVisible: boolean;
  performancePrerollStartedAtMs: number | null;
  performancePrerollDurationMs: number;
  performancePrerollStepIndex: number | null;
  performanceRuntimeStartedAtMs: number | null;
  performanceTransportAnimationId: number;
  performanceRunCompleted: boolean;
  showSessionSummaryOnStop: boolean;
  pendingSessionStopResultMessage: { text: string; tone: 'neutral' | 'success' | 'error' } | null;
}

export function createSessionStopResetState() {
  return {
    ...createPromptCycleTrackingResetState(),
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
    performancePromptResolved: false,
    performancePromptMatched: false,
    performancePromptHadAttempt: false,
    performancePromptHadWrongAttempt: false,
    performanceTimelineFeedbackKey: null,
    performanceTimelineFeedbackByEvent: {},
    performanceTimingByEvent: {},
    performanceOnsetRejectsByEvent: {},
    performanceCaptureTelemetryByEvent: {},
    monophonicConfidenceEma: 0,
    performanceMicLastJudgedOnsetNote: null,
    performanceMicLastJudgedOnsetAtMs: null,
    performanceMicLastUncertainOnsetNote: null,
    performanceMicLastUncertainOnsetAtMs: null,
    micMonophonicAttackLastVolume: 0,
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
    performancePrerollLeadInVisible: false,
    performancePrerollStartedAtMs: null,
    performancePrerollDurationMs: 0,
    performancePrerollStepIndex: null,
    performanceRuntimeStartedAtMs: null,
    performanceTransportAnimationId: 0,
    performanceRunCompleted: false,
    showSessionSummaryOnStop: false,
    pendingSessionStopResultMessage: null,
  } satisfies SessionStopResetState & ReturnType<typeof createPromptCycleTrackingResetState>;
}
