interface AudioInputControlsDom {
  applySuggestedMicLatencyBtn: HTMLButtonElement;
  startMicLatencyCalibrationBtn: HTMLButtonElement;
  audioInputDevice: HTMLSelectElement;
  micSensitivityPreset: HTMLSelectElement;
  micNoteAttackFilter: HTMLSelectElement;
  micNoteHoldFilter: HTMLSelectElement;
  micPolyphonicDetectorProvider: HTMLSelectElement;
  calibrateNoiseFloorBtn: HTMLButtonElement;
  runMicPolyphonicBenchmarkBtn: HTMLButtonElement;
  exportMicPolyphonicTelemetryBtn: HTMLButtonElement;
  resetMicPolyphonicTelemetryBtn: HTMLButtonElement;
  inputSource: HTMLSelectElement;
  midiInputDevice: HTMLSelectElement;
  switchToMicrophoneFromMidiBtn: HTMLButtonElement;
}

export interface AudioInputControlsControllerDeps {
  dom: AudioInputControlsDom;
  applySuggestedMicLatency: () => void;
  startMicLatencyCalibration: () => void;
  handleAudioInputDeviceChange: () => void;
  handleSensitivityChange: () => void;
  handleAttackChange: () => void;
  handleHoldChange: () => void;
  handlePolyphonicProviderChange: () => void;
  calibrateNoiseFloor: () => Promise<void>;
  runMicPolyphonicBenchmark: () => Promise<void>;
  exportMicPolyphonicTelemetry: () => void;
  resetMicPolyphonicTelemetry: () => void;
  handleInputSourceChange: () => Promise<void>;
  handleMidiInputDeviceChange: () => void;
}

export function createAudioInputControlsController(deps: AudioInputControlsControllerDeps) {
  function register() {
    deps.dom.applySuggestedMicLatencyBtn.addEventListener('click', () => {
      deps.applySuggestedMicLatency();
    });

    deps.dom.startMicLatencyCalibrationBtn.addEventListener('click', () => {
      deps.startMicLatencyCalibration();
    });

    deps.dom.audioInputDevice.addEventListener('change', () => {
      deps.handleAudioInputDeviceChange();
    });

    deps.dom.micSensitivityPreset.addEventListener('change', () => {
      deps.handleSensitivityChange();
    });

    deps.dom.micNoteAttackFilter.addEventListener('change', () => {
      deps.handleAttackChange();
    });

    deps.dom.micNoteHoldFilter.addEventListener('change', () => {
      deps.handleHoldChange();
    });

    deps.dom.micPolyphonicDetectorProvider.addEventListener('change', () => {
      deps.handlePolyphonicProviderChange();
    });

    deps.dom.calibrateNoiseFloorBtn.addEventListener('click', async () => {
      await deps.calibrateNoiseFloor();
    });

    deps.dom.runMicPolyphonicBenchmarkBtn.addEventListener('click', async () => {
      await deps.runMicPolyphonicBenchmark();
    });

    deps.dom.exportMicPolyphonicTelemetryBtn.addEventListener('click', () => {
      deps.exportMicPolyphonicTelemetry();
    });

    deps.dom.resetMicPolyphonicTelemetryBtn.addEventListener('click', () => {
      deps.resetMicPolyphonicTelemetry();
    });

    deps.dom.inputSource.addEventListener('change', () => {
      void deps.handleInputSourceChange();
    });

    deps.dom.midiInputDevice.addEventListener('change', () => {
      deps.handleMidiInputDeviceChange();
    });

    deps.dom.switchToMicrophoneFromMidiBtn.addEventListener('click', () => {
      if (deps.dom.inputSource.value === 'microphone') return;
      deps.dom.inputSource.value = 'microphone';
      deps.dom.inputSource.dispatchEvent(new Event('change'));
    });
  }

  return {
    register,
  };
}
