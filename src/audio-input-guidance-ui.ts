import { dom } from './dom';
import { state } from './state';

export type AudioInputGuidanceErrorKind = 'permission' | 'device' | 'unsupported' | 'unknown';

function getSelectedAudioInputLabel() {
  return dom.audioInputDevice.selectedOptions[0]?.textContent?.trim() || 'Default microphone';
}

export function clearAudioInputGuidanceError() {
  state.audioInputLastErrorKind = null;
  state.audioInputLastErrorMessage = null;
}

export function setAudioInputGuidanceError(kind: AudioInputGuidanceErrorKind, message?: string | null) {
  state.audioInputLastErrorKind = kind;
  state.audioInputLastErrorMessage = typeof message === 'string' && message.trim().length > 0 ? message.trim() : null;
}

export function refreshAudioInputGuidanceUi() {
  const selectedAudioInputLabel = getSelectedAudioInputLabel();

  if (state.audioInputLastErrorKind === 'permission') {
    dom.audioInputInfo.textContent =
      'Microphone permission is blocked. Allow access in the browser site settings, then press Start Session again.';
    return;
  }

  if (state.audioInputLastErrorKind === 'device') {
    dom.audioInputInfo.textContent =
      'The selected microphone is unavailable. Pick another microphone in Settings or reconnect the device, then press Start Session again.';
    return;
  }

  if (state.audioInputLastErrorKind === 'unsupported') {
    dom.audioInputInfo.textContent =
      'This browser cannot open a microphone input. Use a modern browser with microphone access support.';
    return;
  }

  if (state.isListening || state.activeAudioInputTrackSettings || state.mediaStream) {
    dom.audioInputInfo.textContent =
      `Microphone ready: ${selectedAudioInputLabel}. Press Start Session to listen. ` +
      'If note timing feels late, run Latency Calibration.';
    return;
  }

  dom.audioInputInfo.textContent =
    'Choose a microphone if needed, then press Start Session. The app will ask for microphone access the first time.';
}
