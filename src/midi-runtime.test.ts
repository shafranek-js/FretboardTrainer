import { beforeEach, describe, expect, it, vi } from 'vitest';

function createClassList() {
  const classes = new Set<string>();
  return {
    add: (name: string) => {
      classes.add(name);
    },
    remove: (name: string) => {
      classes.delete(name);
    },
    toggle: (name: string, force?: boolean) => {
      if (force === undefined) {
        if (classes.has(name)) {
          classes.delete(name);
          return false;
        }
        classes.add(name);
        return true;
      }
      if (force) {
        classes.add(name);
        return true;
      }
      classes.delete(name);
      return false;
    },
    contains: (name: string) => classes.has(name),
  };
}

const harness = vi.hoisted(() => ({
  hudCalls: vi.fn(),
  guidanceCalls: vi.fn(),
  dom: {
    inputSource: {
      value: 'microphone',
      options: [
        { value: 'microphone', disabled: false, textContent: 'Microphone' },
        { value: 'midi', disabled: false, textContent: 'MIDI' },
      ],
    } as unknown as HTMLSelectElement,
    audioInputRow: { classList: createClassList() } as HTMLElement,
    micSensitivityRow: { classList: createClassList() } as HTMLElement,
    practiceInputPresetRow: { classList: createClassList() } as HTMLElement,
    micAttackFilterRow: { classList: createClassList() } as HTMLElement,
    micHoldFilterRow: { classList: createClassList() } as HTMLElement,
    micDirectInputRow: { classList: createClassList() } as HTMLElement,
    micPolyphonicDetectorRow: { classList: createClassList() } as HTMLElement,
    micNoiseCalibrationRow: { classList: createClassList() } as HTMLElement,
    audioInputInfo: { classList: createClassList(), textContent: '' } as HTMLElement,
    micNoiseGateInfo: { classList: createClassList() } as HTMLElement,
    micPerformanceInfo: { classList: createClassList() } as HTMLElement,
    midiInputRow: { classList: createClassList() } as HTMLElement,
    midiInputInfo: { classList: createClassList(), textContent: '' } as HTMLElement,
    midiInputDevice: {
      value: '',
      innerHTML: '',
      disabled: false,
      append: vi.fn(),
    } as unknown as HTMLSelectElement,
    midiConnectionStatus: { classList: createClassList(), textContent: '' } as HTMLElement,
    switchToMicrophoneFromMidiBtn: { classList: createClassList() } as HTMLElement,
  },
  state: {
    inputSource: 'microphone' as 'microphone' | 'midi',
    preferredMidiInputDeviceId: null as string | null,
    midiAccess: null as MIDIAccess | null,
    midiInput: null as MIDIInput | null,
  },
}));

vi.mock('./dom', () => ({
  dom: harness.dom,
}));

vi.mock('./state', () => ({
  state: harness.state,
}));

vi.mock('./input-source-status', () => ({
  updateSessionInputStatusHud: harness.hudCalls,
}));

vi.mock('./audio-input-guidance-ui', () => ({
  refreshAudioInputGuidanceUi: harness.guidanceCalls,
}));

vi.mock('./midi-message', () => ({
  parseMidiMessageData: vi.fn(() => null),
}));

import { setInputSourcePreference, setPreferredMidiInputDeviceId } from './midi-runtime';

describe('midi-runtime', () => {
  beforeEach(() => {
    harness.hudCalls.mockClear();
    harness.guidanceCalls.mockClear();
    harness.state.inputSource = 'microphone';
    harness.state.preferredMidiInputDeviceId = null;
    harness.state.midiAccess = null;
    harness.state.midiInput = null;
    harness.dom.inputSource.value = 'microphone';
    harness.dom.midiInputDevice.value = '';
    harness.dom.midiConnectionStatus.textContent = '';
    const navigatorRef =
      typeof navigator === 'undefined' ? ({} as Navigator) : navigator;
    if (typeof navigator === 'undefined') {
      Object.defineProperty(globalThis, 'navigator', {
        value: navigatorRef,
        configurable: true,
        writable: true,
      });
    }
    Object.defineProperty(navigatorRef, 'requestMIDIAccess', {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  it('falls back to microphone when midi is unsupported', () => {
    setInputSourcePreference('midi');

    expect(harness.state.inputSource).toBe('microphone');
    expect(harness.dom.inputSource.value).toBe('microphone');
    expect(harness.dom.audioInputRow.classList.contains('hidden')).toBe(false);
    expect(harness.dom.midiInputRow.classList.contains('hidden')).toBe(true);
    expect(harness.guidanceCalls).toHaveBeenCalledTimes(1);
    expect(harness.hudCalls).toHaveBeenCalledTimes(1);
  });

  it('updates the preferred midi input device and refreshes status ui', () => {
    setPreferredMidiInputDeviceId('midi-7');

    expect(harness.state.preferredMidiInputDeviceId).toBe('midi-7');
    expect(harness.dom.midiInputDevice.value).toBe('midi-7');
    expect(harness.hudCalls).toHaveBeenCalledTimes(1);
  });
});
