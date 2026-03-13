import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  dom: {
    inputStatusBar: { textContent: '', title: '' } as HTMLElement,
    audioInputDevice: {
      selectedOptions: [{ textContent: 'USB Interface' }],
    } as unknown as HTMLSelectElement,
    midiInputDevice: {
      selectedOptions: [{ textContent: 'Launchkey Mini' }],
    } as unknown as HTMLSelectElement,
  },
  state: {
    inputSource: 'microphone' as 'microphone' | 'midi',
  },
}));

vi.mock('./dom', () => ({
  dom: harness.dom,
}));

vi.mock('./state', () => ({
  state: harness.state,
}));

import { updateSessionInputStatusHud } from './input-source-status';

describe('input-source-status', () => {
  beforeEach(() => {
    harness.dom.inputStatusBar.textContent = '';
    harness.dom.inputStatusBar.title = '';
    harness.state.inputSource = 'microphone';
  });

  it('shows microphone status when microphone input is active', () => {
    updateSessionInputStatusHud();

    expect(harness.dom.inputStatusBar.textContent).toBe('Mic: USB Interface');
    expect(harness.dom.inputStatusBar.title).toBe('Mic: USB Interface');
  });

  it('shows midi status when midi input is active', () => {
    harness.state.inputSource = 'midi';

    updateSessionInputStatusHud();

    expect(harness.dom.inputStatusBar.textContent).toBe('MIDI: Launchkey Mini');
    expect(harness.dom.inputStatusBar.title).toBe('MIDI: Launchkey Mini');
  });
});
