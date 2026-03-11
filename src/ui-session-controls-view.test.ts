import { describe, expect, it, vi } from 'vitest';

function createClassListState() {
  const classes = new Set<string>();
  return {
    add: vi.fn((...values: string[]) => {
      values.forEach((value) => classes.add(value));
    }),
    remove: vi.fn((...values: string[]) => {
      values.forEach((value) => classes.delete(value));
    }),
    toggle: vi.fn((value: string, force?: boolean) => {
      if (force === undefined) {
        if (classes.has(value)) {
          classes.delete(value);
          return false;
        }
        classes.add(value);
        return true;
      }
      if (force) {
        classes.add(value);
        return true;
      }
      classes.delete(value);
      return false;
    }),
    contains: (value: string) => classes.has(value),
  };
}

function createElementStub() {
  const attributes = new Map<string, string>();
  return {
    classList: createClassListState(),
    style: { display: '' },
    dataset: {} as Record<string, string>,
    textContent: '',
    disabled: false,
    setAttribute: vi.fn((name: string, value: string) => {
      attributes.set(name, value);
    }),
    getAttribute: (name: string) => attributes.get(name) ?? null,
  };
}

const harness = vi.hoisted(() => ({
  dom: {
    startBtn: createElementStub(),
    stopBtn: createElementStub(),
    hintBtn: createElementStub(),
    playSoundBtn: createElementStub(),
    sessionToggleBtn: createElementStub(),
    startSessionHelpBtn: createElementStub(),
    hintControlsHost: createElementStub(),
    learnNotesPromptHost: createElementStub(),
    timedInfo: createElementStub(),
  },
}));

vi.mock('./dom', () => ({
  dom: harness.dom,
}));

vi.mock('./workflow-ui-copy', () => ({
  getWorkflowUiCopy: (workflow: string) => ({
    primaryActionLabel: workflow === 'practice' ? 'Start Practice' : 'Start Session',
    primaryActionAriaLabel: workflow === 'practice' ? 'Start practice session' : 'Start session',
  }),
}));

vi.mock('./training-mode-ui', () => ({
  getTrainingModeUiVisibility: (mode: string) => ({
    showHintButton: mode === 'random',
  }),
}));

import {
  renderHintButtonVisibility,
  renderLearnNotesPromptVisibility,
  renderSessionButtonsDisabled,
  renderSessionToggleButton,
  renderTimedInfoVisibility,
} from './ui-session-controls-view';

describe('ui-session-controls-view', () => {
  it('renders primary button disabled states', () => {
    renderSessionButtonsDisabled({
      startDisabled: false,
      stopDisabled: true,
      hintDisabled: false,
      playSoundDisabled: true,
      isLoading: true,
    });

    expect(harness.dom.startBtn.disabled).toBe(true);
    expect(harness.dom.stopBtn.disabled).toBe(true);
    expect(harness.dom.hintBtn.disabled).toBe(false);
    expect(harness.dom.playSoundBtn.disabled).toBe(true);
  });

  it('renders session toggle state and hides library/editor start action', () => {
    renderSessionToggleButton({
      startDisabled: false,
      stopDisabled: true,
      isLoading: false,
      workflow: 'library',
    });

    expect(harness.dom.sessionToggleBtn.textContent).toBe('Start Session');
    expect(harness.dom.sessionToggleBtn.dataset.sessionState).toBe('start');
    expect(harness.dom.sessionToggleBtn.classList.contains('hidden')).toBe(true);
    expect(harness.dom.startSessionHelpBtn.classList.contains('hidden')).toBe(true);

    renderSessionToggleButton({
      startDisabled: false,
      stopDisabled: false,
      isLoading: false,
      workflow: 'practice',
    });

    expect(harness.dom.sessionToggleBtn.textContent).toBe('Stop Session');
    expect(harness.dom.sessionToggleBtn.dataset.sessionState).toBe('stop');
    expect(harness.dom.sessionToggleBtn.disabled).toBe(false);
  });

  it('renders hint, prompt and timed visibility', () => {
    renderHintButtonVisibility({ mode: 'random', workflow: 'learn-notes', sessionActive: true });
    expect(harness.dom.hintControlsHost.classList.contains('hidden')).toBe(false);
    expect(harness.dom.hintBtn.style.display).toBe('inline-flex');

    renderLearnNotesPromptVisibility({
      workflow: 'learn-notes',
      sessionActive: true,
      hasPromptText: true,
    });
    expect(harness.dom.learnNotesPromptHost.classList.contains('hidden')).toBe(false);
    expect(harness.dom.learnNotesPromptHost.style.display).toBe('flex');

    renderTimedInfoVisibility({
      mode: 'timed',
      workflow: 'learn-notes',
      sessionActive: true,
      timedInfoVisible: true,
    });
    expect(harness.dom.timedInfo.classList.contains('hidden')).toBe(false);
    expect(harness.dom.timedInfo.style.display).toBe('inline-flex');
  });
});
