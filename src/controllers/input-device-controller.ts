interface InputDeviceControllerState {
  isListening: boolean;
  inputSource: 'microphone' | 'midi';
}

interface InputDeviceControllerDom {
  audioInputDevice: HTMLSelectElement;
  inputSource: HTMLSelectElement;
  midiInputDevice: HTMLSelectElement;
}

interface InputDeviceControllerDeps {
  dom: InputDeviceControllerDom;
  state: InputDeviceControllerState;
  normalizeAudioInputDeviceId(value: unknown): string | null;
  setPreferredAudioInputDeviceId(deviceId: string | null): void;
  normalizeInputSource(value: unknown): 'microphone' | 'midi';
  setInputSourcePreference(inputSource: 'microphone' | 'midi'): void;
  refreshMidiInputDevices(requestAccess?: boolean): Promise<void>;
  normalizeMidiInputDeviceId(value: unknown): string | null;
  setPreferredMidiInputDeviceId(deviceId: string | null): void;
  stopMelodyDemoPlayback(options: { clearUi: boolean }): void;
  stopListening(): void;
  saveSettings(): void;
  updateMicNoiseGateInfo(): void;
  setResultMessage(message: string, tone?: 'success' | 'error'): void;
}

export function createInputDeviceController(deps: InputDeviceControllerDeps) {
  function handleAudioInputDeviceChange() {
    const selectedDeviceId = deps.normalizeAudioInputDeviceId(deps.dom.audioInputDevice.value);
    deps.setPreferredAudioInputDeviceId(selectedDeviceId);

    if (deps.state.isListening) {
      deps.stopListening();
      deps.setResultMessage('Microphone changed. Session stopped; press Start to use the selected input.');
    }

    deps.saveSettings();
    deps.updateMicNoiseGateInfo();
  }

  async function handleInputSourceChange() {
    deps.stopMelodyDemoPlayback({ clearUi: true });
    const nextInputSource = deps.normalizeInputSource(deps.dom.inputSource.value);
    deps.setInputSourcePreference(nextInputSource);

    if (nextInputSource === 'midi') {
      await deps.refreshMidiInputDevices(true);
    }

    if (deps.state.isListening) {
      deps.stopListening();
      deps.setResultMessage('Input source changed. Session stopped; press Start to continue.');
    }

    deps.saveSettings();
  }

  function handleMidiInputDeviceChange() {
    const selectedDeviceId = deps.normalizeMidiInputDeviceId(deps.dom.midiInputDevice.value);
    deps.setPreferredMidiInputDeviceId(selectedDeviceId);

    if (deps.state.isListening && deps.state.inputSource === 'midi') {
      deps.stopListening();
      deps.setResultMessage('MIDI device changed. Session stopped; press Start to use the selected input.');
    }

    deps.saveSettings();
  }

  return {
    handleAudioInputDeviceChange,
    handleInputSourceChange,
    handleMidiInputDeviceChange,
  };
}
