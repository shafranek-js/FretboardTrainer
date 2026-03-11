import type {
  MicPerformanceOnsetRejectReasonKey,
  PerformanceCaptureEventTelemetry,
  PerformanceOnsetRejectEventLogEntry,
} from './session-analysis-bundle';
import type { PerformanceMicHoldCalibrationLevel } from './mic-note-hold-filter';

type AppState = typeof import('./state').state;

interface PerformanceMicTelemetryControllerDeps {
  state: Pick<
    AppState,
    | 'performanceOnsetRejectsByEvent'
    | 'performanceCaptureTelemetryByEvent'
    | 'micPerformanceOnsetGateStatus'
    | 'micPerformanceOnsetGateReason'
    | 'micPerformanceOnsetGateAtMs'
    | 'micPerformanceOnsetRejectedWeakAttackCount'
    | 'micPerformanceOnsetRejectedLowConfidenceCount'
    | 'micPerformanceOnsetRejectedLowVoicingCount'
    | 'micPerformanceOnsetRejectedShortHoldCount'
    | 'micPerformanceOnsetLastRejectedReasonKey'
    | 'micPerformanceOnsetLastRejectedNote'
    | 'micPerformanceOnsetLastRejectedAtMs'
  >;
  getCurrentEventIndex: () => number | null;
  now?: () => number;
}

export function createPerformanceMicTelemetryController(deps: PerformanceMicTelemetryControllerDeps) {
  const now = () => (typeof deps.now === 'function' ? deps.now() : Date.now());

  function createEmptyCaptureEventTelemetry(): PerformanceCaptureEventTelemetry {
    return {
      preStableSeenCount: 0,
      voicedFrameCount: 0,
      confidentFrameCount: 0,
      detectedNoteFrameCount: 0,
      maxStableRunFrames: 0,
      maxAttackPeak: 0,
      avgRms: 0,
      rmsSampleCount: 0,
      stableDetectionCount: 0,
      promptAttemptCount: 0,
      uncertainFrameCount: 0,
      uncertainReasonCounts: {
        weak_attack: 0,
        low_confidence: 0,
        low_voicing: 0,
        short_hold: 0,
      },
    };
  }

  function ensureCaptureEventTelemetry(eventIndex: number) {
    const existing = deps.state.performanceCaptureTelemetryByEvent[eventIndex];
    if (existing) return existing;
    const next = createEmptyCaptureEventTelemetry();
    deps.state.performanceCaptureTelemetryByEvent[eventIndex] = next;
    return next;
  }

  function recordOnsetRejectReason(input: {
    reasonKey: MicPerformanceOnsetRejectReasonKey;
    onsetNote: string | null;
    onsetAtMs: number | null;
  }) {
    const dedupeMatched =
      deps.state.micPerformanceOnsetLastRejectedReasonKey === input.reasonKey &&
      deps.state.micPerformanceOnsetLastRejectedNote === input.onsetNote &&
      deps.state.micPerformanceOnsetLastRejectedAtMs === input.onsetAtMs;
    if (dedupeMatched) return false;

    deps.state.micPerformanceOnsetLastRejectedReasonKey = input.reasonKey;
    deps.state.micPerformanceOnsetLastRejectedNote = input.onsetNote;
    deps.state.micPerformanceOnsetLastRejectedAtMs = input.onsetAtMs;

    if (input.reasonKey === 'weak_attack') {
      deps.state.micPerformanceOnsetRejectedWeakAttackCount += 1;
      return true;
    }
    if (input.reasonKey === 'low_confidence') {
      deps.state.micPerformanceOnsetRejectedLowConfidenceCount += 1;
      return true;
    }
    if (input.reasonKey === 'low_voicing') {
      deps.state.micPerformanceOnsetRejectedLowVoicingCount += 1;
      return true;
    }
    deps.state.micPerformanceOnsetRejectedShortHoldCount += 1;
    return true;
  }

  function recordOnsetRejectByEvent(input: {
    reasonKey: MicPerformanceOnsetRejectReasonKey;
    reason: string | null;
    rejectedAtMs: number;
    onsetNote: string | null;
    onsetAtMs: number | null;
    eventDurationMs: number | null;
    holdRequiredMs: number | null;
    holdElapsedMs: number | null;
    runtimeCalibrationLevel: PerformanceMicHoldCalibrationLevel | null;
  }) {
    const eventIndex = deps.getCurrentEventIndex();
    if (eventIndex === null) return;
    const bucket = deps.state.performanceOnsetRejectsByEvent[eventIndex] ?? [];
    const lastEntry = bucket[bucket.length - 1];
    if (
      lastEntry &&
      lastEntry.reasonKey === input.reasonKey &&
      lastEntry.onsetNote === input.onsetNote &&
      lastEntry.onsetAtMs === input.onsetAtMs
    ) {
      return;
    }
    bucket.push({
      reasonKey: input.reasonKey,
      reason: input.reason ?? null,
      rejectedAtMs: input.rejectedAtMs,
      onsetNote: input.onsetNote ?? null,
      onsetAtMs: input.onsetAtMs ?? null,
      eventDurationMs:
        typeof input.eventDurationMs === 'number' && Number.isFinite(input.eventDurationMs)
          ? Math.max(0, Math.round(input.eventDurationMs))
          : null,
      holdRequiredMs:
        typeof input.holdRequiredMs === 'number' && Number.isFinite(input.holdRequiredMs)
          ? Math.max(0, Math.round(input.holdRequiredMs))
          : null,
      holdElapsedMs:
        typeof input.holdElapsedMs === 'number' && Number.isFinite(input.holdElapsedMs)
          ? Math.max(0, Math.round(input.holdElapsedMs))
          : null,
      runtimeCalibrationLevel:
        input.runtimeCalibrationLevel === 'mild' || input.runtimeCalibrationLevel === 'strong'
          ? input.runtimeCalibrationLevel
          : input.runtimeCalibrationLevel === 'off'
            ? 'off'
            : null,
    } satisfies PerformanceOnsetRejectEventLogEntry);
    deps.state.performanceOnsetRejectsByEvent[eventIndex] = bucket;
  }

  function setOnsetGateStatus(
    status: 'accepted' | 'rejected',
    reason: string,
    input?: {
      atMs?: number;
      rejectReasonKey?: MicPerformanceOnsetRejectReasonKey;
      onsetNote?: string | null;
      onsetAtMs?: number | null;
      eventDurationMs?: number | null;
      holdRequiredMs?: number | null;
      holdElapsedMs?: number | null;
      runtimeCalibrationLevel?: PerformanceMicHoldCalibrationLevel | null;
    }
  ) {
    const atMs = input?.atMs ?? now();
    deps.state.micPerformanceOnsetGateStatus = status;
    deps.state.micPerformanceOnsetGateReason = reason;
    deps.state.micPerformanceOnsetGateAtMs = atMs;

    if (status !== 'rejected' || !input?.rejectReasonKey) return;
    const recorded = recordOnsetRejectReason({
      reasonKey: input.rejectReasonKey,
      onsetNote: input.onsetNote ?? null,
      onsetAtMs: input.onsetAtMs ?? atMs,
    });
    if (!recorded) return;
    recordOnsetRejectByEvent({
      reasonKey: input.rejectReasonKey,
      reason,
      rejectedAtMs: atMs,
      onsetNote: input.onsetNote ?? null,
      onsetAtMs: input.onsetAtMs ?? atMs,
      eventDurationMs:
        typeof input.eventDurationMs === 'number' && Number.isFinite(input.eventDurationMs)
          ? input.eventDurationMs
          : null,
      holdRequiredMs:
        typeof input.holdRequiredMs === 'number' && Number.isFinite(input.holdRequiredMs)
          ? input.holdRequiredMs
          : null,
      holdElapsedMs:
        typeof input.holdElapsedMs === 'number' && Number.isFinite(input.holdElapsedMs)
          ? input.holdElapsedMs
          : null,
      runtimeCalibrationLevel: input.runtimeCalibrationLevel ?? null,
    });
  }

  function resetOnsetGateStatus() {
    deps.state.micPerformanceOnsetGateStatus = 'idle';
    deps.state.micPerformanceOnsetGateReason = null;
    deps.state.micPerformanceOnsetGateAtMs = null;
  }

  function resetOnsetRejectTelemetry() {
    deps.state.micPerformanceOnsetRejectedWeakAttackCount = 0;
    deps.state.micPerformanceOnsetRejectedLowConfidenceCount = 0;
    deps.state.micPerformanceOnsetRejectedLowVoicingCount = 0;
    deps.state.micPerformanceOnsetRejectedShortHoldCount = 0;
    deps.state.micPerformanceOnsetLastRejectedReasonKey = null;
    deps.state.micPerformanceOnsetLastRejectedNote = null;
    deps.state.micPerformanceOnsetLastRejectedAtMs = null;
  }

  function recordStableDetection() {
    const eventIndex = deps.getCurrentEventIndex();
    if (eventIndex === null) return;
    const telemetry = ensureCaptureEventTelemetry(eventIndex);
    telemetry.stableDetectionCount += 1;
  }

  function recordPromptAttempt() {
    const eventIndex = deps.getCurrentEventIndex();
    if (eventIndex === null) return;
    const telemetry = ensureCaptureEventTelemetry(eventIndex);
    telemetry.promptAttemptCount += 1;
  }

  function recordCaptureFrame(input: {
    rms: number;
    detectedNote: string | null;
    nextStableNoteCounter: number;
    requiredStableFrames: number;
    confident: boolean;
    voiced: boolean;
    attackPeak: number;
  }) {
    const eventIndex = deps.getCurrentEventIndex();
    if (eventIndex === null) return;
    const telemetry = ensureCaptureEventTelemetry(eventIndex);
    telemetry.rmsSampleCount += 1;
    const nextCount = telemetry.rmsSampleCount;
    const safeRms = Number.isFinite(input.rms) ? Math.max(0, input.rms) : 0;
    telemetry.avgRms = ((telemetry.avgRms * (nextCount - 1)) + safeRms) / nextCount;
    const safeAttackPeak = Number.isFinite(input.attackPeak) ? Math.max(0, input.attackPeak) : 0;
    telemetry.maxAttackPeak = Math.max(telemetry.maxAttackPeak, safeAttackPeak);

    if (!input.detectedNote?.trim()) return;
    telemetry.detectedNoteFrameCount += 1;
    if (input.voiced) telemetry.voicedFrameCount += 1;
    if (input.confident) telemetry.confidentFrameCount += 1;

    const stableRun = Number.isFinite(input.nextStableNoteCounter)
      ? Math.max(0, Math.round(input.nextStableNoteCounter))
      : 0;
    telemetry.maxStableRunFrames = Math.max(telemetry.maxStableRunFrames, stableRun);
    if (stableRun > 0 && stableRun < Math.max(1, input.requiredStableFrames)) {
      telemetry.preStableSeenCount += 1;
    }
  }

  function resolveUncertainReasonKey(input: {
    voicingAccepted: boolean;
    confidenceAccepted: boolean;
    attackAccepted: boolean;
    holdAccepted: boolean;
  }): MicPerformanceOnsetRejectReasonKey | null {
    if (!input.voicingAccepted) return 'low_voicing';
    if (!input.confidenceAccepted) return 'low_confidence';
    if (!input.attackAccepted) return 'weak_attack';
    if (!input.holdAccepted) return 'short_hold';
    return null;
  }

  function recordUncertainFrame(reasonKey: MicPerformanceOnsetRejectReasonKey | null) {
    const eventIndex = deps.getCurrentEventIndex();
    if (eventIndex === null) return;
    const telemetry = ensureCaptureEventTelemetry(eventIndex);
    telemetry.uncertainFrameCount += 1;
    if (reasonKey) {
      telemetry.uncertainReasonCounts[reasonKey] += 1;
    }
  }

  return {
    setOnsetGateStatus,
    resetOnsetGateStatus,
    resetOnsetRejectTelemetry,
    recordStableDetection,
    recordPromptAttempt,
    recordCaptureFrame,
    resolveUncertainReasonKey,
    recordUncertainFrame,
  };
}
