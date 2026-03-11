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
  return {
    classList: createClassListState(),
    textContent: '',
  };
}

const harness = vi.hoisted(() => ({
  dom: {
    statusBar: createElementStub(),
    prompt: createElementStub(),
    result: createElementStub(),
    infoSlot1: createElementStub(),
    infoSlot2: createElementStub(),
    infoSlot3: createElementStub(),
    sessionInlineDivider: createElementStub(),
    sessionInlineFeedback: createElementStub(),
  },
}));

vi.mock('./dom', () => ({
  dom: harness.dom,
}));

vi.mock('./note-display', () => ({
  formatMusicText: (value: string) => `fmt:${value}`,
}));

import {
  renderInfoSlots,
  renderPromptText,
  renderResultView,
  renderStatusText,
} from './ui-feedback-view';

describe('ui-feedback-view', () => {
  it('renders status and prompt text', () => {
    renderStatusText('Ready');
    renderPromptText('C#4');

    expect(harness.dom.statusBar.textContent).toBe('Ready');
    expect(harness.dom.prompt.textContent).toBe('fmt:C#4');
  });

  it('renders success result and keeps divider invisible when info slots are empty', () => {
    renderResultView({ text: 'Correct', tone: 'success' });

    expect(harness.dom.result.textContent).toBe('fmt:Correct');
    expect(harness.dom.result.classList.contains('text-green-400')).toBe(true);
    expect(harness.dom.result.classList.contains('text-red-400')).toBe(false);
    expect(harness.dom.sessionInlineDivider.classList.contains('hidden')).toBe(false);
    expect(harness.dom.sessionInlineDivider.classList.contains('invisible')).toBe(true);
    expect(harness.dom.sessionInlineFeedback.classList.contains('opacity-60')).toBe(false);
  });

  it('renders info slots and shows divider when both result and info are present', () => {
    renderResultView({ text: 'Wrong', tone: 'error' });
    renderInfoSlots({ slot1: 'A', slot2: '', slot3: '' });

    expect(harness.dom.result.classList.contains('text-red-400')).toBe(true);
    expect(harness.dom.infoSlot1.textContent).toBe('fmt:A');
    expect(harness.dom.infoSlot2.textContent).toBe('fmt:');
    expect(harness.dom.infoSlot3.textContent).toBe('fmt:');
    expect(harness.dom.sessionInlineDivider.classList.contains('invisible')).toBe(false);
    expect(harness.dom.sessionInlineFeedback.classList.contains('opacity-60')).toBe(false);
  });
});
