import { describe, expect, it, vi } from 'vitest';
import { createSessionInputControlsCluster } from './session-input-controls-cluster';

function createDeps() {
  return {
    micSettings: {
      dom: {} as never,
      state: {} as never,
      ensureAudioRuntime: vi.fn(),
      refreshAudioInputDeviceOptions: vi.fn(),
      refreshMicPolyphonicDetectorAudioInfoUi: vi.fn(),
      refreshMicPerformanceReadinessUi: vi.fn(),
      syncPracticePresetUi: vi.fn(),
      saveSettings: vi.fn(),
      setResultMessage: vi.fn(),
      formatUserFacingError: vi.fn(),
      showNonBlockingError: vi.fn(),
    },
    inputDevice: {
      dom: {} as never,
      state: {} as never,
      normalizeAudioInputDeviceId: vi.fn(),
      setPreferredAudioInputDeviceId: vi.fn(),
      normalizeInputSource: vi.fn(),
      setInputSourcePreference: vi.fn(),
      refreshMidiInputDevices: vi.fn(),
      normalizeMidiInputDeviceId: vi.fn(),
      setPreferredMidiInputDeviceId: vi.fn(),
      stopMelodyDemoPlayback: vi.fn(),
      stopListening: vi.fn(),
      saveSettings: vi.fn(),
      updateMicNoiseGateInfo: vi.fn(),
      refreshMicPerformanceReadinessUi: vi.fn(),
      setResultMessage: vi.fn(),
    },
    micPolyphonicBenchmark: {
      dom: {} as never,
      state: {} as never,
      detectMicPolyphonicFrame: vi.fn(),
      now: vi.fn(),
      setResultMessage: vi.fn(),
      showNonBlockingError: vi.fn(),
      formatUserFacingError: vi.fn(),
    },
    micPolyphonicTelemetry: {
      dom: {
        exportMicPolyphonicTelemetryBtn: { disabled: false } as HTMLButtonElement,
        resetMicPolyphonicTelemetryBtn: { disabled: false } as HTMLButtonElement,
      },
      state: {
        micSensitivityPreset: 'balanced',
        micAutoNoiseFloorRms: null,
        micNoteAttackFilterPreset: 'medium',
        micNoteHoldFilterPreset: 'medium',
        micPolyphonicDetectorProvider: 'spectrum',
        lastMicPolyphonicDetectorProviderUsed: null,
        lastMicPolyphonicDetectorFallbackFrom: null,
        lastMicPolyphonicDetectorWarning: null,
        micPolyphonicDetectorTelemetryFrames: 0,
        micPolyphonicDetectorTelemetryTotalLatencyMs: 0,
        micPolyphonicDetectorTelemetryMaxLatencyMs: 0,
        micPolyphonicDetectorTelemetryLastLatencyMs: null,
        micPolyphonicDetectorTelemetryFallbackFrames: 0,
        micPolyphonicDetectorTelemetryWarningFrames: 0,
        micPolyphonicDetectorTelemetryWindowStartedAtMs: 0,
      },
      now: vi.fn(),
      getUserAgent: vi.fn(),
      getHardwareConcurrency: vi.fn(),
      getAnalyserSampleRate: vi.fn(),
      getAnalyserFftSize: vi.fn(),
      downloadTextFile: vi.fn(),
      resetTelemetry: vi.fn(),
      refreshTelemetryUi: vi.fn(),
      setResultMessage: vi.fn(),
      showNonBlockingError: vi.fn(),
      formatUserFacingError: vi.fn(),
    },
    audioInputControls: {
      dom: {
        applySuggestedMicLatencyBtn: { addEventListener: vi.fn() } as never,
        startMicLatencyCalibrationBtn: { addEventListener: vi.fn() } as never,
        audioInputDevice: { addEventListener: vi.fn() } as never,
        micSensitivityPreset: { addEventListener: vi.fn() } as never,
        micNoteAttackFilter: { addEventListener: vi.fn() } as never,
        micNoteHoldFilter: { addEventListener: vi.fn() } as never,
        micPolyphonicDetectorProvider: { addEventListener: vi.fn() } as never,
        calibrateNoiseFloorBtn: { addEventListener: vi.fn() } as never,
        runMicPolyphonicBenchmarkBtn: { addEventListener: vi.fn() } as never,
        exportMicPolyphonicTelemetryBtn: { addEventListener: vi.fn() } as never,
        resetMicPolyphonicTelemetryBtn: { addEventListener: vi.fn() } as never,
        inputSource: { addEventListener: vi.fn(), value: 'microphone', dispatchEvent: vi.fn() } as never,
        midiInputDevice: { addEventListener: vi.fn() } as never,
        switchToMicrophoneFromMidiBtn: { addEventListener: vi.fn() } as never,
      },
      applySuggestedMicLatency: vi.fn(),
      startMicLatencyCalibration: vi.fn(),
    },
  };
}

describe('session-input-controls-cluster', () => {
  it('creates the input-related controllers as one cluster', () => {
    const cluster = createSessionInputControlsCluster(createDeps() as never);

    expect(cluster.micSettingsController).toBeTruthy();
    expect(cluster.inputDeviceController).toBeTruthy();
    expect(cluster.micPolyphonicBenchmarkController).toBeTruthy();
    expect(cluster.micPolyphonicTelemetryController).toBeTruthy();
    expect(cluster.audioInputControlsController).toBeTruthy();
  });
});
