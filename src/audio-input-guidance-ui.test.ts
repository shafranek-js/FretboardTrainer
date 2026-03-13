import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  dom: {
    audioInputDevice: {
      selectedOptions: [{ textContent: 'USB Interface' }],
    } as unknown as HTMLSelectElement,
    audioInputInfo: {
      textContent: '',
    } as HTMLElement,
  },
  state: {
    audioInputLastErrorKind: null as 'permission' | 'device' | 'unsupported' | 'unknown' | null,
    audioInputLastErrorMessage: null as string | null,
    isListening: false,
    activeAudioInputTrackSettings: null as object | null,
    mediaStream: null as MediaStream | null,
  },
}));

vi.mock('./state', () => ({
  dom: harness.dom,
  state: harness.state,
}));

vi.mock('./dom', () => ({
  dom: harness.dom,
}));

import {
  clearAudioInputGuidanceError,
  refreshAudioInputGuidanceUi,
  setAudioInputGuidanceError,
} from './audio-input-guidance-ui';

describe('audio-input-guidance-ui', () => {
  beforeEach(() => {
    harness.state.audioInputLastErrorKind = null;
    harness.state.audioInputLastErrorMessage = null;
    harness.state.isListening = false;
    harness.state.activeAudioInputTrackSettings = null;
    harness.state.mediaStream = null;
    harness.dom.audioInputInfo.textContent = '';
  });

  it('shows permission guidance after a blocked microphone start', () => {
    setAudioInputGuidanceError('permission');
    refreshAudioInputGuidanceUi();

    expect(harness.dom.audioInputInfo.textContent).toContain('permission is blocked');
  });

  it('shows ready guidance when microphone runtime is active', () => {
    harness.state.activeAudioInputTrackSettings = {};
    refreshAudioInputGuidanceUi();

    expect(harness.dom.audioInputInfo.textContent).toContain('Microphone ready');
    expect(harness.dom.audioInputInfo.textContent).toContain('USB Interface');
  });

  it('returns to the default guidance after clearing the error state', () => {
    setAudioInputGuidanceError('device');
    clearAudioInputGuidanceError();
    refreshAudioInputGuidanceUi();

    expect(harness.dom.audioInputInfo.textContent).toContain('Choose a microphone');
  });
});

