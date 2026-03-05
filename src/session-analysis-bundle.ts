import type { SessionStats } from './types';
import type { PerformanceSessionNoteLogSnapshot } from './performance-session-note-log';
import type {
  PerformanceTimelineAttempt,
  PerformanceTimelineFeedbackByEvent,
} from './performance-timeline-feedback';
import type { PerformanceTimingGrade } from './performance-timing-grade';

export interface PerformanceTimingEventLogEntry {
  bucket: PerformanceTimingGrade['bucket'];
  label: string;
  weight: number;
  signedOffsetMs: number;
  judgedAtMs: number;
}

export type MicPerformanceOnsetRejectReasonKey =
  | 'weak_attack'
  | 'low_confidence'
  | 'low_voicing'
  | 'short_hold';

export interface PerformanceOnsetRejectEventLogEntry {
  reasonKey: MicPerformanceOnsetRejectReasonKey;
  reason: string | null;
  rejectedAtMs: number;
  onsetNote: string | null;
  onsetAtMs: number | null;
  eventDurationMs: number | null;
  holdRequiredMs: number | null;
  holdElapsedMs: number | null;
  runtimeCalibrationLevel: 'off' | 'mild' | 'strong' | null;
}

export interface PerformanceCaptureEventTelemetry {
  preStableSeenCount: number;
  voicedFrameCount: number;
  confidentFrameCount: number;
  detectedNoteFrameCount: number;
  maxStableRunFrames: number;
  maxAttackPeak: number;
  avgRms: number;
  rmsSampleCount: number;
  stableDetectionCount: number;
  promptAttemptCount: number;
  uncertainFrameCount: number;
  uncertainReasonCounts: Record<MicPerformanceOnsetRejectReasonKey, number>;
}

export interface SessionAnalysisBundle {
  schemaVersion: 1;
  generatedAtIso: string;
  sessionStats: SessionStats | null;
  performanceNoteLog: PerformanceSessionNoteLogSnapshot | null;
  performanceFeedbackByEvent: PerformanceTimelineFeedbackByEvent;
  performanceTimingByEvent: Record<number, PerformanceTimingEventLogEntry[]>;
  performanceOnsetRejectsByEvent: Record<number, PerformanceOnsetRejectEventLogEntry[]>;
  performanceCaptureTelemetryByEvent: Record<number, PerformanceCaptureEventTelemetry>;
  context: {
    selectedMelodyId: string | null;
    melodyTempoBpm: number | null;
    melodyStudyRange: { startIndex: number; endIndex: number } | null;
    inputSource: 'microphone' | 'midi';
    inputDeviceLabel: string;
    isDirectInputMode: boolean;
    micSensitivityPreset: string;
    micNoteAttackFilterPreset: string;
    micNoteHoldFilterPreset: string;
    micPolyphonicDetectorProvider: string;
    performanceMicTolerancePreset: string;
    performanceTimingLeniencyPreset: string;
    performanceMicLatencyCompensationMs: number;
    performanceTimingBiasMs: number;
    activeAudioTrack: {
      requestedContentHint: string | null;
      appliedContentHint: string | null;
      settings: {
        sampleRate: number | null;
        channelCount: number | null;
        echoCancellation: boolean | null;
        noiseSuppression: boolean | null;
        autoGainControl: boolean | null;
      };
    };
  };
  diagnostics: {
    micLastInputRms: number;
    micLastMonophonicConfidence: number | null;
    micLastMonophonicPitchSpreadCents: number | null;
    micPerformanceSuggestedLatencyMs: number | null;
    micPerformanceJudgmentCount: number;
    micPerformanceJudgmentAvgLatencyMs: number | null;
    micPerformanceJudgmentLastLatencyMs: number | null;
    micPerformanceOnsetRejected: {
      weakAttack: number;
      lowConfidence: number;
      lowVoicing: number;
      shortHold: number;
    };
    micPerformanceOnsetGate: {
      status: 'idle' | 'accepted' | 'rejected';
      reason: string | null;
      atMs: number | null;
    };
    micPolyphonicTelemetry: {
      frames: number;
      totalLatencyMs: number;
      maxLatencyMs: number;
      lastLatencyMs: number | null;
      fallbackFrames: number;
      warningFrames: number;
      providerUsed: string | null;
      fallbackFrom: string | null;
      warning: string | null;
      windowStartedAtMs: number;
    };
  };
}

function clonePerformanceAttempts(
  feedbackByEvent: PerformanceTimelineFeedbackByEvent
): PerformanceTimelineFeedbackByEvent {
  return Object.fromEntries(
    Object.entries(feedbackByEvent).map(([eventIndex, attempts]) => [
      Number.parseInt(eventIndex, 10),
      attempts.map((attempt): PerformanceTimelineAttempt => ({
        note: attempt.note,
        stringName: attempt.stringName ?? null,
        fret: typeof attempt.fret === 'number' ? attempt.fret : null,
        status: attempt.status,
      })),
    ])
  );
}

function clonePerformanceTimingByEvent(
  timingByEvent: Record<number, PerformanceTimingEventLogEntry[]>
): Record<number, PerformanceTimingEventLogEntry[]> {
  return Object.fromEntries(
    Object.entries(timingByEvent).map(([eventIndex, entries]) => [
      Number.parseInt(eventIndex, 10),
      entries.map((entry) => ({ ...entry })),
    ])
  );
}

function clonePerformanceOnsetRejectsByEvent(
  rejectsByEvent: Record<number, PerformanceOnsetRejectEventLogEntry[]>
): Record<number, PerformanceOnsetRejectEventLogEntry[]> {
  return Object.fromEntries(
    Object.entries(rejectsByEvent).map(([eventIndex, entries]) => [
      Number.parseInt(eventIndex, 10),
      entries.map((entry) => ({
        ...entry,
        eventDurationMs: Number.isFinite(entry.eventDurationMs)
          ? Math.max(0, Math.round(entry.eventDurationMs))
          : null,
        holdRequiredMs: Number.isFinite(entry.holdRequiredMs)
          ? Math.max(0, Math.round(entry.holdRequiredMs))
          : null,
        holdElapsedMs: Number.isFinite(entry.holdElapsedMs)
          ? Math.max(0, Math.round(entry.holdElapsedMs))
          : null,
        runtimeCalibrationLevel:
          entry.runtimeCalibrationLevel === 'mild' || entry.runtimeCalibrationLevel === 'strong'
            ? entry.runtimeCalibrationLevel
            : entry.runtimeCalibrationLevel === 'off'
              ? 'off'
              : null,
      })),
    ])
  );
}

function clonePerformanceCaptureTelemetryByEvent(
  captureTelemetryByEvent: Record<number, PerformanceCaptureEventTelemetry>
): Record<number, PerformanceCaptureEventTelemetry> {
  return Object.fromEntries(
    Object.entries(captureTelemetryByEvent).map(([eventIndex, entry]) => [
      Number.parseInt(eventIndex, 10),
      {
        preStableSeenCount: Math.max(0, Math.round(entry.preStableSeenCount ?? 0)),
        voicedFrameCount: Math.max(0, Math.round(entry.voicedFrameCount ?? 0)),
        confidentFrameCount: Math.max(0, Math.round(entry.confidentFrameCount ?? 0)),
        detectedNoteFrameCount: Math.max(0, Math.round(entry.detectedNoteFrameCount ?? 0)),
        maxStableRunFrames: Math.max(0, Math.round(entry.maxStableRunFrames ?? 0)),
        maxAttackPeak: Number.isFinite(entry.maxAttackPeak) ? Math.max(0, entry.maxAttackPeak) : 0,
        avgRms: Number.isFinite(entry.avgRms) ? Math.max(0, entry.avgRms) : 0,
        rmsSampleCount: Math.max(0, Math.round(entry.rmsSampleCount ?? 0)),
        stableDetectionCount: Math.max(0, Math.round(entry.stableDetectionCount ?? 0)),
        promptAttemptCount: Math.max(0, Math.round(entry.promptAttemptCount ?? 0)),
        uncertainFrameCount: Math.max(0, Math.round(entry.uncertainFrameCount ?? 0)),
        uncertainReasonCounts: {
          weak_attack: Math.max(0, Math.round(entry.uncertainReasonCounts?.weak_attack ?? 0)),
          low_confidence: Math.max(0, Math.round(entry.uncertainReasonCounts?.low_confidence ?? 0)),
          low_voicing: Math.max(0, Math.round(entry.uncertainReasonCounts?.low_voicing ?? 0)),
          short_hold: Math.max(0, Math.round(entry.uncertainReasonCounts?.short_hold ?? 0)),
        },
      },
    ])
  );
}

export function buildSessionAnalysisBundle(input: {
  sessionStats: SessionStats | null;
  performanceNoteLog: PerformanceSessionNoteLogSnapshot | null;
  performanceFeedbackByEvent: PerformanceTimelineFeedbackByEvent;
  performanceTimingByEvent: Record<number, PerformanceTimingEventLogEntry[]>;
  performanceOnsetRejectsByEvent: Record<number, PerformanceOnsetRejectEventLogEntry[]>;
  performanceCaptureTelemetryByEvent: Record<number, PerformanceCaptureEventTelemetry>;
  selectedMelodyId: string | null;
  melodyTempoBpm: number | null;
  melodyStudyRange: { startIndex: number; endIndex: number } | null;
  inputSource: 'microphone' | 'midi';
  inputDeviceLabel: string;
  isDirectInputMode: boolean;
  micSensitivityPreset: string;
  micNoteAttackFilterPreset: string;
  micNoteHoldFilterPreset: string;
  micPolyphonicDetectorProvider: string;
  performanceMicTolerancePreset: string;
  performanceTimingLeniencyPreset: string;
  performanceMicLatencyCompensationMs: number;
  performanceTimingBiasMs: number;
  requestedAudioInputContentHint: string | null;
  activeAudioInputTrackContentHint: string | null;
  activeAudioInputTrackSettings: {
    sampleRate: number | null;
    channelCount: number | null;
    echoCancellation: boolean | null;
    noiseSuppression: boolean | null;
    autoGainControl: boolean | null;
  } | null;
  micLastInputRms: number;
  micLastMonophonicConfidence: number | null;
  micLastMonophonicPitchSpreadCents: number | null;
  micPerformanceSuggestedLatencyMs: number | null;
  micPerformanceJudgmentCount: number;
  micPerformanceJudgmentTotalLatencyMs: number;
  micPerformanceJudgmentLastLatencyMs: number | null;
  micPerformanceOnsetRejectedWeakAttackCount: number;
  micPerformanceOnsetRejectedLowConfidenceCount: number;
  micPerformanceOnsetRejectedLowVoicingCount: number;
  micPerformanceOnsetRejectedShortHoldCount: number;
  micPerformanceOnsetGateStatus: 'idle' | 'accepted' | 'rejected';
  micPerformanceOnsetGateReason: string | null;
  micPerformanceOnsetGateAtMs: number | null;
  micPolyphonicDetectorTelemetryFrames: number;
  micPolyphonicDetectorTelemetryTotalLatencyMs: number;
  micPolyphonicDetectorTelemetryMaxLatencyMs: number;
  micPolyphonicDetectorTelemetryLastLatencyMs: number | null;
  micPolyphonicDetectorTelemetryFallbackFrames: number;
  micPolyphonicDetectorTelemetryWarningFrames: number;
  lastMicPolyphonicDetectorProviderUsed: string | null;
  lastMicPolyphonicDetectorFallbackFrom: string | null;
  lastMicPolyphonicDetectorWarning: string | null;
  micPolyphonicDetectorTelemetryWindowStartedAtMs: number;
  generatedAtMs?: number;
}): SessionAnalysisBundle {
  const generatedAtMs = Number.isFinite(input.generatedAtMs) ? Math.round(input.generatedAtMs ?? 0) : Date.now();
  const avgLatencyMs =
    input.micPerformanceJudgmentCount > 0
      ? Math.round(input.micPerformanceJudgmentTotalLatencyMs / input.micPerformanceJudgmentCount)
      : null;

  return {
    schemaVersion: 1,
    generatedAtIso: new Date(generatedAtMs).toISOString(),
    sessionStats: input.sessionStats,
    performanceNoteLog: input.performanceNoteLog,
    performanceFeedbackByEvent: clonePerformanceAttempts(input.performanceFeedbackByEvent),
    performanceTimingByEvent: clonePerformanceTimingByEvent(input.performanceTimingByEvent),
    performanceOnsetRejectsByEvent: clonePerformanceOnsetRejectsByEvent(
      input.performanceOnsetRejectsByEvent
    ),
    performanceCaptureTelemetryByEvent: clonePerformanceCaptureTelemetryByEvent(
      input.performanceCaptureTelemetryByEvent
    ),
    context: {
      selectedMelodyId: input.selectedMelodyId,
      melodyTempoBpm: input.melodyTempoBpm,
      melodyStudyRange: input.melodyStudyRange,
      inputSource: input.inputSource,
      inputDeviceLabel: input.inputDeviceLabel,
      isDirectInputMode: input.isDirectInputMode,
      micSensitivityPreset: input.micSensitivityPreset,
      micNoteAttackFilterPreset: input.micNoteAttackFilterPreset,
      micNoteHoldFilterPreset: input.micNoteHoldFilterPreset,
      micPolyphonicDetectorProvider: input.micPolyphonicDetectorProvider,
      performanceMicTolerancePreset: input.performanceMicTolerancePreset,
      performanceTimingLeniencyPreset: input.performanceTimingLeniencyPreset,
      performanceMicLatencyCompensationMs: input.performanceMicLatencyCompensationMs,
      performanceTimingBiasMs: input.performanceTimingBiasMs,
      activeAudioTrack: {
        requestedContentHint: input.requestedAudioInputContentHint,
        appliedContentHint: input.activeAudioInputTrackContentHint,
        settings: {
          sampleRate: input.activeAudioInputTrackSettings?.sampleRate ?? null,
          channelCount: input.activeAudioInputTrackSettings?.channelCount ?? null,
          echoCancellation: input.activeAudioInputTrackSettings?.echoCancellation ?? null,
          noiseSuppression: input.activeAudioInputTrackSettings?.noiseSuppression ?? null,
          autoGainControl: input.activeAudioInputTrackSettings?.autoGainControl ?? null,
        },
      },
    },
    diagnostics: {
      micLastInputRms: input.micLastInputRms,
      micLastMonophonicConfidence: input.micLastMonophonicConfidence,
      micLastMonophonicPitchSpreadCents: input.micLastMonophonicPitchSpreadCents,
      micPerformanceSuggestedLatencyMs: input.micPerformanceSuggestedLatencyMs,
      micPerformanceJudgmentCount: input.micPerformanceJudgmentCount,
      micPerformanceJudgmentAvgLatencyMs: avgLatencyMs,
      micPerformanceJudgmentLastLatencyMs: input.micPerformanceJudgmentLastLatencyMs,
      micPerformanceOnsetRejected: {
        weakAttack: input.micPerformanceOnsetRejectedWeakAttackCount,
        lowConfidence: input.micPerformanceOnsetRejectedLowConfidenceCount,
        lowVoicing: input.micPerformanceOnsetRejectedLowVoicingCount,
        shortHold: input.micPerformanceOnsetRejectedShortHoldCount,
      },
      micPerformanceOnsetGate: {
        status: input.micPerformanceOnsetGateStatus,
        reason: input.micPerformanceOnsetGateReason,
        atMs: input.micPerformanceOnsetGateAtMs,
      },
      micPolyphonicTelemetry: {
        frames: input.micPolyphonicDetectorTelemetryFrames,
        totalLatencyMs: input.micPolyphonicDetectorTelemetryTotalLatencyMs,
        maxLatencyMs: input.micPolyphonicDetectorTelemetryMaxLatencyMs,
        lastLatencyMs: input.micPolyphonicDetectorTelemetryLastLatencyMs,
        fallbackFrames: input.micPolyphonicDetectorTelemetryFallbackFrames,
        warningFrames: input.micPolyphonicDetectorTelemetryWarningFrames,
        providerUsed: input.lastMicPolyphonicDetectorProviderUsed,
        fallbackFrom: input.lastMicPolyphonicDetectorFallbackFrom,
        warning: input.lastMicPolyphonicDetectorWarning,
        windowStartedAtMs: input.micPolyphonicDetectorTelemetryWindowStartedAtMs,
      },
    },
  };
}

export function formatSessionAnalysisBundleFileName() {
  return 'fretflow-session-analysis-latest.json';
}
