import { describe, expect, it, vi } from 'vitest';
import { createInputDeviceController } from './input-device-controller';

function createSelect(value: string) {
  return { value } as HTMLSelectElement;
}

function createDeps() {
  return {
    dom: {
      audioInputDevice: createSelect('mic-2'),
      inputSource: createSelect('microphone'),
      midiInputDevice: createSelect('midi-7'),
    },
    state: {
      isListening: false,
      inputSource: 'microphone' as const,
    },
    normalizeAudioInputDeviceId: vi.fn((value: unknown) => (typeof value === 'string' && value ? value : null)),
    setPreferredAudioInputDeviceId: vi.fn(),
    normalizeInputSource: vi.fn((value: unknown) => (value === 'midi' ? 'midi' : 'microphone')),
    setInputSourcePreference: vi.fn(),
    refreshMidiInputDevices: vi.fn(async () => {}),
    normalizeMidiInputDeviceId: vi.fn((value: unknown) => (typeof value === 'string' && value ? value : null)),
    setPreferredMidiInputDeviceId: vi.fn(),
    stopMelodyDemoPlayback: vi.fn(),
    stopListening: vi.fn(),
    saveSettings: vi.fn(),
    updateMicNoiseGateInfo: vi.fn(),
    setResultMessage: vi.fn(),
  };
}

describe('input-device-controller', () => {
  it('updates audio input preference and syncs noise gate info', () => {
    const deps = createDeps();
    const controller = createInputDeviceController(deps);

    controller.handleAudioInputDeviceChange();

    expect(deps.setPreferredAudioInputDeviceId).toHaveBeenCalledWith('mic-2');
    expect(deps.updateMicNoiseGateInfo).toHaveBeenCalledTimes(1);
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
  });

  it('stops an active session when microphone input changes', () => {
    const deps = createDeps();
    deps.state.isListening = true;
    const controller = createInputDeviceController(deps);

    controller.handleAudioInputDeviceChange();

    expect(deps.stopListening).toHaveBeenCalledTimes(1);
    expect(deps.setResultMessage).toHaveBeenCalledWith(
      'Microphone changed. Session stopped; press Start to use the selected input.'
    );
  });

  it('switches to midi input and refreshes midi devices', async () => {
    const deps = createDeps();
    deps.dom.inputSource.value = 'midi';
    const controller = createInputDeviceController(deps);

    await controller.handleInputSourceChange();

    expect(deps.stopMelodyDemoPlayback).toHaveBeenCalledWith({ clearUi: true });
    expect(deps.setInputSourcePreference).toHaveBeenCalledWith('midi');
    expect(deps.refreshMidiInputDevices).toHaveBeenCalledWith(true);
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
  });

  it('stops an active midi session when midi device changes', () => {
    const deps = createDeps();
    deps.state.isListening = true;
    deps.state.inputSource = 'midi';
    const controller = createInputDeviceController(deps);

    controller.handleMidiInputDeviceChange();

    expect(deps.setPreferredMidiInputDeviceId).toHaveBeenCalledWith('midi-7');
    expect(deps.stopListening).toHaveBeenCalledTimes(1);
    expect(deps.setResultMessage).toHaveBeenCalledWith(
      'MIDI device changed. Session stopped; press Start to use the selected input.'
    );
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
  });
});
