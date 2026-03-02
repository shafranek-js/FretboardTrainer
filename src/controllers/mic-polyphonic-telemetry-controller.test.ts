import { describe, expect, it, vi } from 'vitest';
import { createMicPolyphonicTelemetryController } from './mic-polyphonic-telemetry-controller';

function createDeps() {
  return {
    dom: {
      exportMicPolyphonicTelemetryBtn: { disabled: false } as HTMLButtonElement,
      resetMicPolyphonicTelemetryBtn: { disabled: false } as HTMLButtonElement,
    },
    state: {
      micSensitivityPreset: 'auto',
      micAutoNoiseFloorRms: 0.009,
      micNoteAttackFilterPreset: 'balanced',
      micNoteHoldFilterPreset: '80ms',
      micPolyphonicDetectorProvider: 'spectrum',
      lastMicPolyphonicDetectorProviderUsed: 'spectrum',
      lastMicPolyphonicDetectorFallbackFrom: null,
      lastMicPolyphonicDetectorWarning: null,
      micPolyphonicDetectorTelemetryFrames: 12,
      micPolyphonicDetectorTelemetryTotalLatencyMs: 36,
      micPolyphonicDetectorTelemetryMaxLatencyMs: 5,
      micPolyphonicDetectorTelemetryLastLatencyMs: 3,
      micPolyphonicDetectorTelemetryFallbackFrames: 1,
      micPolyphonicDetectorTelemetryWarningFrames: 2,
      micPolyphonicDetectorTelemetryWindowStartedAtMs: 1_000,
    },
    now: vi.fn(() => 3_000),
    getUserAgent: vi.fn(() => 'Test UA'),
    getHardwareConcurrency: vi.fn(() => 8),
    getAnalyserSampleRate: vi.fn(() => 48_000),
    getAnalyserFftSize: vi.fn(() => 4096),
    downloadTextFile: vi.fn(),
    resetTelemetry: vi.fn(),
    refreshTelemetryUi: vi.fn(),
    setResultMessage: vi.fn(),
    showNonBlockingError: vi.fn(),
    formatUserFacingError: vi.fn((prefix: string) => prefix),
  };
}

describe('mic-polyphonic-telemetry-controller', () => {
  it('disables export when there are no collected frames', () => {
    const deps = createDeps();
    deps.state.micPolyphonicDetectorTelemetryFrames = 0;
    const controller = createMicPolyphonicTelemetryController(deps);

    controller.syncButtonState();

    expect(deps.dom.exportMicPolyphonicTelemetryBtn.disabled).toBe(true);
    expect(deps.dom.resetMicPolyphonicTelemetryBtn.disabled).toBe(true);
  });

  it('exports a json snapshot when telemetry exists', () => {
    const deps = createDeps();
    const controller = createMicPolyphonicTelemetryController(deps);

    controller.exportTelemetry();

    expect(deps.downloadTextFile).toHaveBeenCalledTimes(1);
    expect(deps.downloadTextFile.mock.calls[0]?.[0]).toContain('mic-poly-telemetry-');
    expect(deps.downloadTextFile.mock.calls[0]?.[2]).toBe('application/json');
    const exportedJson = deps.downloadTextFile.mock.calls[0]?.[1] as string;
    const snapshot = JSON.parse(exportedJson);
    expect(snapshot.version).toBe(2);
    expect(snapshot.configuration.resolvedVolumeThreshold).toBeGreaterThan(0);
    expect(snapshot.configuration.attackFilterPreset).toBe('balanced');
    expect(snapshot.configuration.holdDurationMs).toBe(80);
    expect(snapshot.configuration.analyserSampleRate).toBe(48000);
    expect(snapshot.framesPerSecond).toBeGreaterThan(0);
    expect(deps.setResultMessage).toHaveBeenCalledWith('Poly detector telemetry exported.', 'success');
  });

  it('shows an error when no telemetry exists yet', () => {
    const deps = createDeps();
    deps.state.micPolyphonicDetectorTelemetryFrames = 0;
    const controller = createMicPolyphonicTelemetryController(deps);

    controller.exportTelemetry();

    expect(deps.setResultMessage).toHaveBeenCalledWith(
      'No poly detector telemetry has been collected yet.',
      'error'
    );
    expect(deps.downloadTextFile).not.toHaveBeenCalled();
  });

  it('resets telemetry and syncs ui/button state', () => {
    const deps = createDeps();
    const controller = createMicPolyphonicTelemetryController(deps);

    controller.resetTelemetry();

    expect(deps.resetTelemetry).toHaveBeenCalledTimes(1);
    expect(deps.refreshTelemetryUi).toHaveBeenCalledTimes(1);
    expect(deps.setResultMessage).toHaveBeenCalledWith('Poly detector telemetry reset.', 'success');
  });
});
