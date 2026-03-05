import { describe, expect, it } from 'vitest';
import {
  buildSessionAnalysisBundle,
  formatSessionAnalysisBundleFileName,
} from './session-analysis-bundle';

describe('session-analysis-bundle', () => {
  it('builds a stable bundle with context and diagnostics', () => {
    const bundle = buildSessionAnalysisBundle({
      sessionStats: null,
      performanceNoteLog: null,
      performanceFeedbackByEvent: {
        0: [{ note: 'E', stringName: 'E', fret: 0, status: 'correct' }],
      },
      performanceTimingByEvent: {
        0: [{ bucket: 'perfect', label: 'Perfect', weight: 1, signedOffsetMs: 8, judgedAtMs: 1000 }],
      },
      performanceOnsetRejectsByEvent: {
        0: [
          {
            reasonKey: 'short_hold',
            reason: 'Reason: hold too short (8ms < 12ms).',
            rejectedAtMs: 995,
            onsetNote: 'E',
            onsetAtMs: 987,
            eventDurationMs: 214,
            holdRequiredMs: 12,
            holdElapsedMs: 8,
            runtimeCalibrationLevel: 'off',
          },
        ],
      },
      performanceCaptureTelemetryByEvent: {
        0: {
          preStableSeenCount: 2,
          voicedFrameCount: 8,
          confidentFrameCount: 7,
          detectedNoteFrameCount: 9,
          maxStableRunFrames: 1,
          maxAttackPeak: 0.06,
          avgRms: 0.018,
          rmsSampleCount: 24,
          stableDetectionCount: 3,
          promptAttemptCount: 2,
          uncertainFrameCount: 1,
          uncertainReasonCounts: {
            weak_attack: 0,
            low_confidence: 0,
            low_voicing: 0,
            short_hold: 1,
          },
        },
      },
      selectedMelodyId: 'melody-1',
      melodyTempoBpm: 90,
      melodyStudyRange: { startIndex: 0, endIndex: 7 },
      inputSource: 'microphone',
      inputDeviceLabel: 'Default microphone',
      isDirectInputMode: true,
      micSensitivityPreset: 'normal',
      micNoteAttackFilterPreset: 'balanced',
      micNoteHoldFilterPreset: '80ms',
      micPolyphonicDetectorProvider: 'spectrum',
      performanceMicTolerancePreset: 'normal',
      performanceTimingLeniencyPreset: 'normal',
      performanceMicLatencyCompensationMs: 80,
      performanceTimingBiasMs: 12,
      requestedAudioInputContentHint: 'music',
      activeAudioInputTrackContentHint: 'music',
      activeAudioInputTrackSettings: {
        sampleRate: 48000,
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      micLastInputRms: 0.015,
      micLastMonophonicConfidence: 0.83,
      micLastMonophonicPitchSpreadCents: 7.2,
      micPerformanceSuggestedLatencyMs: 83,
      micPerformanceJudgmentCount: 10,
      micPerformanceJudgmentTotalLatencyMs: 840,
      micPerformanceJudgmentLastLatencyMs: 81,
      micPerformanceOnsetRejectedWeakAttackCount: 4,
      micPerformanceOnsetRejectedLowConfidenceCount: 2,
      micPerformanceOnsetRejectedLowVoicingCount: 1,
      micPerformanceOnsetRejectedShortHoldCount: 3,
      micPerformanceOnsetGateStatus: 'accepted',
      micPerformanceOnsetGateReason: null,
      micPerformanceOnsetGateAtMs: 1000,
      micPolyphonicDetectorTelemetryFrames: 100,
      micPolyphonicDetectorTelemetryTotalLatencyMs: 175,
      micPolyphonicDetectorTelemetryMaxLatencyMs: 4,
      micPolyphonicDetectorTelemetryLastLatencyMs: 2,
      micPolyphonicDetectorTelemetryFallbackFrames: 3,
      micPolyphonicDetectorTelemetryWarningFrames: 1,
      lastMicPolyphonicDetectorProviderUsed: 'spectrum',
      lastMicPolyphonicDetectorFallbackFrom: null,
      lastMicPolyphonicDetectorWarning: null,
      micPolyphonicDetectorTelemetryWindowStartedAtMs: 500,
      generatedAtMs: Date.UTC(2026, 2, 5, 10, 0, 0),
    });

    expect(bundle.schemaVersion).toBe(1);
    expect(bundle.generatedAtIso).toBe('2026-03-05T10:00:00.000Z');
    expect(bundle.context.selectedMelodyId).toBe('melody-1');
    expect(bundle.context.isDirectInputMode).toBe(true);
    expect(bundle.context.activeAudioTrack.settings.sampleRate).toBe(48000);
    expect(bundle.performanceFeedbackByEvent[0]).toHaveLength(1);
    expect(bundle.performanceTimingByEvent[0]).toHaveLength(1);
    expect(bundle.performanceOnsetRejectsByEvent[0]).toHaveLength(1);
    expect(bundle.performanceCaptureTelemetryByEvent[0]?.uncertainReasonCounts.short_hold).toBe(1);
    expect(bundle.diagnostics.micPerformanceJudgmentAvgLatencyMs).toBe(84);
    expect(bundle.diagnostics.micPerformanceOnsetRejected.shortHold).toBe(3);
  });

  it('formats deterministic bundle filename', () => {
    const name = formatSessionAnalysisBundleFileName();
    expect(name).toBe('fretflow-session-analysis-latest.json');
  });
});
