import { dom, state } from './state';
import { updateSessionInputStatusHud } from './input-source-status';

function buildAudioInputOptionLabel(device: MediaDeviceInfo, index: number) {
  const trimmedLabel = device.label.trim();
  return trimmedLabel.length > 0 ? trimmedLabel : `Microphone ${index + 1}`;
}

export function normalizeAudioInputDeviceId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function setPreferredAudioInputDeviceId(deviceId: string | null) {
  state.preferredAudioInputDeviceId = deviceId;
  if (dom.audioInputDevice) {
    dom.audioInputDevice.value = deviceId ?? '';
  }
  updateSessionInputStatusHud();
}

export async function refreshAudioInputDeviceOptions() {
  if (!dom.audioInputDevice) return;

  const mediaDevices = navigator.mediaDevices;
  if (!mediaDevices?.enumerateDevices) {
    dom.audioInputDevice.innerHTML = '<option value="">Microphone selection not supported</option>';
    dom.audioInputDevice.disabled = true;
    return;
  }

  try {
    const devices = await mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((device) => device.kind === 'audioinput');
    const currentValue = state.preferredAudioInputDeviceId ?? '';

    dom.audioInputDevice.disabled = false;
    dom.audioInputDevice.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Default microphone';
    dom.audioInputDevice.append(defaultOption);

    audioInputs.forEach((device, index) => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.textContent = buildAudioInputOptionLabel(device, index);
      dom.audioInputDevice.append(option);
    });

    const hasCurrentValue =
      currentValue === '' || audioInputs.some((device) => device.deviceId === currentValue);
    dom.audioInputDevice.value = hasCurrentValue ? currentValue : '';

    if (!hasCurrentValue) {
      state.preferredAudioInputDeviceId = null;
    }
    updateSessionInputStatusHud();
  } catch (error) {
    console.warn('Failed to enumerate audio input devices:', error);
    dom.audioInputDevice.innerHTML = '<option value="">Default microphone</option>';
    dom.audioInputDevice.disabled = false;
    dom.audioInputDevice.value = '';
    updateSessionInputStatusHud();
  }
}
