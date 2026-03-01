import { calculateRmsLevel } from '../audio-frame-processing';
import { estimateNoiseFloorRms, resolveMicVolumeThreshold } from '../mic-input-sensitivity';
import { normalizeMicNoteAttackFilterPreset } from '../mic-note-attack-filter';
import { normalizeMicNoteHoldFilterPreset } from '../mic-note-hold-filter';
import { normalizeMicPolyphonicDetectorProvider } from '../mic-polyphonic-detector';
import { normalizeMicSensitivityPreset } from '../mic-input-sensitivity';

interface MicSettingsControllerState {
  isListening: boolean;
  preferredAudioInputDeviceId: string | null;
  micSensitivityPreset: string;
  micAutoNoiseFloorRms: number | null;
  micNoteAttackFilterPreset: string;
  micNoteHoldFilterPreset: string;
  micPolyphonicDetectorProvider: string;
  lastMicPolyphonicDetectorProviderUsed: string | null;
  lastMicPolyphonicDetectorFallbackFrom: string | null;
  lastMicPolyphonicDetectorWarning: string | null;
  micPolyphonicDetectorTelemetryFrames: number;
  micPolyphonicDetectorTelemetryTotalLatencyMs: number;
  micPolyphonicDetectorTelemetryMaxLatencyMs: number;
  micPolyphonicDetectorTelemetryLastLatencyMs: number | null;
  micPolyphonicDetectorTelemetryFallbackFrames: number;
  micPolyphonicDetectorTelemetryWarningFrames: number;
  micPolyphonicDetectorTelemetryWindowStartedAtMs: number;
  micPolyphonicDetectorTelemetryLastUiRefreshAtMs: number;
  audioContext?: AudioContext | null;
  analyser?: AnalyserNode | null;
  dataArray?: Float32Array | null;
}

interface MicSettingsControllerDom {
  micNoiseGateInfo: HTMLElement;
  micSensitivityPreset: HTMLSelectElement;
  micNoteAttackFilter: HTMLSelectElement;
  micNoteHoldFilter: HTMLSelectElement;
  micPolyphonicDetectorProvider: HTMLSelectElement;
  calibrateNoiseFloorBtn: HTMLButtonElement;
}

interface MicSettingsControllerDeps {
  dom: MicSettingsControllerDom;
  state: MicSettingsControllerState;
  ensureAudioRuntime(state: MicSettingsControllerState, options: { audioInputDeviceId: string | null }): Promise<void>;
  refreshAudioInputDeviceOptions(): Promise<void>;
  refreshMicPolyphonicDetectorAudioInfoUi(): void;
  saveSettings(): void;
  setResultMessage(message: string, tone?: 'success' | 'error'): void;
  formatUserFacingError(prefix: string, error: unknown): string;
  showNonBlockingError(message: string): void;
}

export function createMicSettingsController(deps: MicSettingsControllerDeps) {
  function updateNoiseGateInfo() {
    const threshold = resolveMicVolumeThreshold(
      deps.state.micSensitivityPreset as never,
      deps.state.micAutoNoiseFloorRms
    );
    const polyProviderLabel =
      deps.dom.micPolyphonicDetectorProvider.selectedOptions[0]?.textContent?.trim() ??
      'Spectrum (Fast baseline)';
    if (deps.state.micSensitivityPreset === 'auto') {
      const noiseFloorText =
        typeof deps.state.micAutoNoiseFloorRms === 'number'
          ? deps.state.micAutoNoiseFloorRms.toFixed(4)
          : 'n/a';
      const attackLabel = deps.dom.micNoteAttackFilter.selectedOptions[0]?.textContent?.trim() ?? 'Balanced';
      const holdLabel = deps.dom.micNoteHoldFilter.selectedOptions[0]?.textContent?.trim() ?? '80 ms';
      deps.dom.micNoiseGateInfo.textContent =
        `Mic noise gate threshold: ${threshold.toFixed(4)} (Auto; room noise floor ${noiseFloorText} RMS). ` +
        `Attack: ${attackLabel}; Hold: ${holdLabel}. Poly detector: ${polyProviderLabel}.`;
      return;
    }

    const presetLabel = deps.dom.micSensitivityPreset.selectedOptions[0]?.textContent?.trim() ?? 'Normal';
    const attackLabel = deps.dom.micNoteAttackFilter.selectedOptions[0]?.textContent?.trim() ?? 'Balanced';
    const holdLabel = deps.dom.micNoteHoldFilter.selectedOptions[0]?.textContent?.trim() ?? '80 ms';
    deps.dom.micNoiseGateInfo.textContent =
      `Mic noise gate threshold: ${threshold.toFixed(4)} (${presetLabel} preset). ` +
      `Attack: ${attackLabel}; Hold: ${holdLabel}. Poly detector: ${polyProviderLabel}. Use Auto calibration for noisy rooms.`;
  }

  async function measureRoomNoiseFloorRms(durationMs = 2000) {
    await deps.ensureAudioRuntime(deps.state, {
      audioInputDeviceId: deps.state.preferredAudioInputDeviceId,
    });
    await deps.refreshAudioInputDeviceOptions();
    if (deps.state.audioContext?.state === 'suspended') {
      await deps.state.audioContext.resume();
    }
    if (!deps.state.analyser || !deps.state.dataArray) {
      throw new Error('Microphone analyser is not available.');
    }

    const samples: number[] = [];
    const startedAt = performance.now();
    await new Promise<void>((resolve, reject) => {
      const step = () => {
        try {
          if (!deps.state.analyser || !deps.state.dataArray) {
            reject(new Error('Microphone analyser was released during noise calibration.'));
            return;
          }
          deps.state.analyser.getFloatTimeDomainData(deps.state.dataArray);
          samples.push(calculateRmsLevel(deps.state.dataArray));

          if (performance.now() - startedAt >= durationMs) {
            resolve();
            return;
          }
          requestAnimationFrame(step);
        } catch (error) {
          reject(error);
        }
      };
      requestAnimationFrame(step);
    });

    const estimated = estimateNoiseFloorRms(samples);
    if (estimated === null) {
      throw new Error('Could not estimate room noise floor.');
    }
    return estimated;
  }

  function handleSensitivityChange() {
    deps.state.micSensitivityPreset = normalizeMicSensitivityPreset(deps.dom.micSensitivityPreset.value);
    deps.dom.micSensitivityPreset.value = deps.state.micSensitivityPreset;
    updateNoiseGateInfo();
    deps.saveSettings();
  }

  function handleAttackChange() {
    deps.state.micNoteAttackFilterPreset = normalizeMicNoteAttackFilterPreset(
      deps.dom.micNoteAttackFilter.value
    );
    deps.dom.micNoteAttackFilter.value = deps.state.micNoteAttackFilterPreset;
    updateNoiseGateInfo();
    deps.saveSettings();
  }

  function handleHoldChange() {
    deps.state.micNoteHoldFilterPreset = normalizeMicNoteHoldFilterPreset(deps.dom.micNoteHoldFilter.value);
    deps.dom.micNoteHoldFilter.value = deps.state.micNoteHoldFilterPreset;
    updateNoiseGateInfo();
    deps.saveSettings();
  }

  function handlePolyphonicProviderChange() {
    deps.state.micPolyphonicDetectorProvider = normalizeMicPolyphonicDetectorProvider(
      deps.dom.micPolyphonicDetectorProvider.value
    );
    deps.dom.micPolyphonicDetectorProvider.value = deps.state.micPolyphonicDetectorProvider;
    deps.state.lastMicPolyphonicDetectorProviderUsed = null;
    deps.state.lastMicPolyphonicDetectorFallbackFrom = null;
    deps.state.lastMicPolyphonicDetectorWarning = null;
    deps.state.micPolyphonicDetectorTelemetryFrames = 0;
    deps.state.micPolyphonicDetectorTelemetryTotalLatencyMs = 0;
    deps.state.micPolyphonicDetectorTelemetryMaxLatencyMs = 0;
    deps.state.micPolyphonicDetectorTelemetryLastLatencyMs = null;
    deps.state.micPolyphonicDetectorTelemetryFallbackFrames = 0;
    deps.state.micPolyphonicDetectorTelemetryWarningFrames = 0;
    deps.state.micPolyphonicDetectorTelemetryWindowStartedAtMs = 0;
    deps.state.micPolyphonicDetectorTelemetryLastUiRefreshAtMs = 0;
    updateNoiseGateInfo();
    deps.refreshMicPolyphonicDetectorAudioInfoUi();
    deps.saveSettings();
  }

  async function calibrateNoiseFloor() {
    if (deps.state.isListening) {
      deps.setResultMessage('Stop the current session before calibrating room noise.', 'error');
      return;
    }

    const originalLabel = deps.dom.calibrateNoiseFloorBtn.textContent ?? 'Calibrate';
    deps.dom.calibrateNoiseFloorBtn.disabled = true;
    deps.dom.calibrateNoiseFloorBtn.textContent = 'Measuring... stay silent';
    deps.dom.micNoiseGateInfo.textContent =
      'Measuring room noise floor... keep the room quiet for 2 seconds.';

    try {
      const noiseFloorRms = await measureRoomNoiseFloorRms(2000);
      deps.state.micAutoNoiseFloorRms = noiseFloorRms;
      deps.state.micSensitivityPreset = 'auto';
      deps.dom.micSensitivityPreset.value = 'auto';
      updateNoiseGateInfo();
      deps.refreshMicPolyphonicDetectorAudioInfoUi();
      deps.saveSettings();
      deps.setResultMessage(
        `Room noise calibrated. Auto threshold is now based on ${noiseFloorRms.toFixed(4)} RMS.`,
        'success'
      );
    } catch (error) {
      updateNoiseGateInfo();
      deps.showNonBlockingError(deps.formatUserFacingError('Failed to calibrate room noise floor', error));
    } finally {
      deps.dom.calibrateNoiseFloorBtn.disabled = false;
      deps.dom.calibrateNoiseFloorBtn.textContent = originalLabel;
    }
  }

  return {
    updateNoiseGateInfo,
    handleSensitivityChange,
    handleAttackChange,
    handleHoldChange,
    handlePolyphonicProviderChange,
    calibrateNoiseFloor,
  };
}
