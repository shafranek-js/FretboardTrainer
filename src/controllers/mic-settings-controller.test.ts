import { describe, expect, it, vi } from 'vitest';
import { createMicSettingsController } from './mic-settings-controller';

function createSelect(value: string, label: string) {
  return {
    value,
    selectedOptions: [{ textContent: label }],
  } as unknown as HTMLSelectElement;
}

function createDeps() {
  return {
    dom: {
      micNoiseGateInfo: { textContent: '' } as HTMLElement,
      micSensitivityPreset: createSelect('normal', 'Normal'),
      micNoteAttackFilter: createSelect('balanced', 'Balanced'),
      micNoteHoldFilter: createSelect('80ms', '80 ms'),
      micPolyphonicDetectorProvider: createSelect('spectrum', 'Spectrum'),
      calibrateNoiseFloorBtn: { disabled: false, textContent: 'Calibrate' } as HTMLButtonElement,
    },
    state: {
      isListening: false,
      preferredAudioInputDeviceId: null,
      micSensitivityPreset: 'normal',
      micAutoNoiseFloorRms: null,
      micNoteAttackFilterPreset: 'balanced',
      micNoteHoldFilterPreset: '80ms',
      micPolyphonicDetectorProvider: 'spectrum',
      lastMicPolyphonicDetectorProviderUsed: 'old',
      lastMicPolyphonicDetectorFallbackFrom: 'old',
      lastMicPolyphonicDetectorWarning: 'old',
      micPolyphonicDetectorTelemetryFrames: 1,
      micPolyphonicDetectorTelemetryTotalLatencyMs: 2,
      micPolyphonicDetectorTelemetryMaxLatencyMs: 3,
      micPolyphonicDetectorTelemetryLastLatencyMs: 4,
      micPolyphonicDetectorTelemetryFallbackFrames: 5,
      micPolyphonicDetectorTelemetryWarningFrames: 6,
      micPolyphonicDetectorTelemetryWindowStartedAtMs: 7,
      micPolyphonicDetectorTelemetryLastUiRefreshAtMs: 8,
    },
    ensureAudioRuntime: vi.fn(async () => {}),
    refreshAudioInputDeviceOptions: vi.fn(async () => {}),
    refreshMicPolyphonicDetectorAudioInfoUi: vi.fn(),
    saveSettings: vi.fn(),
    setResultMessage: vi.fn(),
    formatUserFacingError: vi.fn((prefix: string) => prefix),
    showNonBlockingError: vi.fn(),
  };
}

describe('mic-settings-controller', () => {
  it('formats noise gate info for preset mode', () => {
    const deps = createDeps();
    const controller = createMicSettingsController(deps);

    controller.updateNoiseGateInfo();

    expect(deps.dom.micNoiseGateInfo.textContent).toContain('Mic noise gate threshold:');
    expect(deps.dom.micNoiseGateInfo.textContent).toContain('(Normal preset)');
    expect(deps.dom.micNoiseGateInfo.textContent).toContain('Poly detector: Spectrum');
  });

  it('updates sensitivity preset and saves settings', () => {
    const deps = createDeps();
    deps.dom.micSensitivityPreset.value = 'auto';
    deps.dom.micSensitivityPreset.selectedOptions = [{ textContent: 'Auto' }];
    const controller = createMicSettingsController(deps);

    controller.handleSensitivityChange();

    expect(deps.state.micSensitivityPreset).toBe('auto');
    expect(deps.dom.micSensitivityPreset.value).toBe('auto');
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
  });

  it('resets polyphonic detector telemetry on provider change', () => {
    const deps = createDeps();
    deps.dom.micPolyphonicDetectorProvider.value = 'essentia-experimental';
    deps.dom.micPolyphonicDetectorProvider.selectedOptions = [{ textContent: 'Essentia' }];
    const controller = createMicSettingsController(deps);

    controller.handlePolyphonicProviderChange();

    expect(deps.state.micPolyphonicDetectorProvider).toBe('essentia_experimental');
    expect(deps.state.lastMicPolyphonicDetectorProviderUsed).toBeNull();
    expect(deps.state.micPolyphonicDetectorTelemetryFrames).toBe(0);
    expect(deps.refreshMicPolyphonicDetectorAudioInfoUi).toHaveBeenCalledTimes(1);
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
  });
});
