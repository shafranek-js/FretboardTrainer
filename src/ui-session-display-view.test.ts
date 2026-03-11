import { beforeEach, describe, expect, it, vi } from 'vitest';

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

function createStub() {
  const attributes = new Map<string, string>();
  const element = {
    classList: createClassListState(),
    style: { display: '' },
    dataset: {} as Record<string, string>,
    textContent: '',
    title: '',
    removeAttribute: vi.fn((name: string) => {
      attributes.delete(name);
      if (name === 'title') {
        element.title = '';
      }
    }),
  };
  return element;
}

const harness = vi.hoisted(() => ({
  dom: {
    timer: createStub(),
    score: createStub(),
    sessionGoalProgress: createStub(),
    practiceSetupSummary: createStub(),
    practiceSetupToggleBtn: createStub(),
    practiceSetupPanel: createStub(),
    melodySetupSummary: createStub(),
    melodySetupToggleBtn: createStub(),
    melodySetupPanel: createStub(),
    sessionToolsSummary: createStub(),
    sessionToolsToggleBtn: createStub(),
    sessionToolsPanel: createStub(),
  },
}));

vi.mock('./dom', () => ({
  dom: harness.dom,
}));

vi.mock('./note-display', () => ({
  formatMusicText: (value: string) => `fmt:${value}`,
}));

import {
  renderFormattedSessionGoalProgress,
  renderMelodySetupSummary,
  renderPracticeSetupSummary,
  renderScoreValue,
  renderSessionGoalProgress,
  renderSessionToolsSummary,
  renderTimerValue,
} from './ui-session-display-view';

describe('ui-session-display-view', () => {
  beforeEach(() => {
    harness.dom.melodySetupToggleBtn.classList.remove('hidden');
    harness.dom.sessionToolsToggleBtn.classList.remove('hidden');
  });

  it('renders timer and score values', () => {
    renderTimerValue('58');
    renderScoreValue('12');

    expect(harness.dom.timer.textContent).toBe('58');
    expect(harness.dom.score.textContent).toBe('12');
  });

  it('renders raw and formatted goal progress text', () => {
    renderSessionGoalProgress('C# goal');
    expect(harness.dom.sessionGoalProgress.textContent).toBe('C# goal');
    expect(harness.dom.sessionGoalProgress.classList.contains('hidden')).toBe(false);

    renderFormattedSessionGoalProgress('A4');
    expect(harness.dom.sessionGoalProgress.textContent).toBe('fmt:A4');

    renderSessionGoalProgress('');
    expect(harness.dom.sessionGoalProgress.classList.contains('hidden')).toBe(true);
  });

  it('renders summaries and visibility rules', () => {
    renderPracticeSetupSummary('Practice summary');
    expect(harness.dom.practiceSetupSummary.textContent).toBe('Practice summary');
    expect(harness.dom.practiceSetupToggleBtn.dataset.summaryTooltip).toBe('Practice summary');
    expect(harness.dom.practiceSetupPanel.dataset.summaryTooltip).toBe('Practice summary');

    renderMelodySetupSummary('Melody summary');
    expect(harness.dom.melodySetupSummary.style.display).toBe('');
    harness.dom.melodySetupToggleBtn.classList.add('hidden');
    renderMelodySetupSummary('Melody summary');
    expect(harness.dom.melodySetupSummary.style.display).toBe('none');

    renderSessionToolsSummary('Tools summary');
    expect(harness.dom.sessionToolsSummary.style.display).toBe('');
    harness.dom.sessionToolsToggleBtn.classList.add('hidden');
    renderSessionToolsSummary('Tools summary');
    expect(harness.dom.sessionToolsSummary.style.display).toBe('none');
  });
});

