import { describe, expect, it, vi } from 'vitest';
import type { WorkflowLayout } from './workflow-layout';

function createClassListState() {
  const classes = new Set<string>();
  return {
    add: vi.fn((...values: string[]) => values.forEach((value) => classes.add(value))),
    remove: vi.fn((...values: string[]) => values.forEach((value) => classes.delete(value))),
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
    textContent: '',
    setAttribute: vi.fn((name: string, value: string) => attributes.set(name, value)),
  };
}

const harness = vi.hoisted(() => ({
  dom: {
    practiceSetupPanel: createElementStub(),
    practiceSetupToggleBtn: createElementStub(),
    practiceSetupChevron: createElementStub(),
    melodySetupPanel: createElementStub(),
    melodySetupToggleBtn: createElementStub(),
    melodySetupChevron: createElementStub(),
    sessionToolsPanel: createElementStub(),
    sessionToolsToggleBtn: createElementStub(),
    sessionToolsChevron: createElementStub(),
  },
}));

vi.mock('./dom', () => ({ dom: harness.dom }));

import {
  renderMelodySetupCollapsedView,
  renderPracticeSetupCollapsedView,
  renderSessionToolsCollapsedView,
} from './ui-workflow-panels-view';

function buildLayout(overrides: Partial<WorkflowLayout> = {}): WorkflowLayout {
  return {
    showPracticeSetup: true,
    showMelodySetup: true,
    showPlaybackControls: true,
    showDisplayControls: true,
    showSessionTools: true,
    showSessionToolsContent: true,
    showMelodyActionControls: true,
    showMelodyPracticeControls: false,
    showEditingToolsControls: false,
    showPlaybackQuickControls: true,
    showPlaybackPromptSoundControl: true,
    showMelodyNoteHintDisplayControl: true,
    showMelodyDisplayControls: true,
    showLayoutZoomControls: true,
    showTimelineZoomControl: true,
    showScrollingZoomControl: true,
    showAnyZoomControl: true,
    sessionTools: {
      showPlanSection: true,
      showDisplaySection: true,
      showActiveStringsSection: true,
      showShowAllNotesRow: true,
      showShowStringTogglesRow: true,
      showAutoPlayPromptSoundRow: true,
      showRelaxPerformanceOctaveRow: false,
      showPitchMatchRow: false,
      showTimingWindowRow: false,
      showMicLatencyRow: false,
      dimPrimaryControls: false,
    },
    ...overrides,
  };
}

describe('ui-workflow-panels-view', () => {
  it('renders practice setup collapsed state', () => {
    const setPanelToggleVisualState = vi.fn();

    renderPracticeSetupCollapsedView({
      layout: buildLayout(),
      collapsed: true,
      setPanelToggleVisualState,
    });

    expect(harness.dom.practiceSetupPanel.style.display).toBe('none');
    expect(harness.dom.practiceSetupChevron.textContent).toBe('>');
    expect(setPanelToggleVisualState).toHaveBeenCalledWith(harness.dom.practiceSetupToggleBtn, false);
  });

  it('renders melody setup collapsed state and respects hidden toggle', () => {
    const setPanelToggleVisualState = vi.fn();

    renderMelodySetupCollapsedView({
      layout: buildLayout(),
      collapsed: false,
      toggleHidden: true,
      setPanelToggleVisualState,
    });
    expect(harness.dom.melodySetupPanel.style.display).toBe('');

    renderMelodySetupCollapsedView({
      layout: buildLayout(),
      collapsed: false,
      toggleHidden: false,
      setPanelToggleVisualState,
    });
    expect(harness.dom.melodySetupPanel.style.display).toBe('flex');
    expect(harness.dom.melodySetupChevron.textContent).toBe('v');
  });

  it('renders session tools collapsed state and hide fallback', () => {
    const setPanelToggleVisualState = vi.fn();

    renderSessionToolsCollapsedView({
      layout: buildLayout({ showSessionTools: false }),
      collapsed: false,
      toggleHidden: false,
      setPanelToggleVisualState,
    });
    expect(harness.dom.sessionToolsPanel.style.display).toBe('none');

    renderSessionToolsCollapsedView({
      layout: buildLayout(),
      collapsed: false,
      toggleHidden: false,
      setPanelToggleVisualState,
    });
    expect(harness.dom.sessionToolsPanel.style.display).toBe('flex');
    expect(harness.dom.sessionToolsChevron.textContent).toBe('v');
  });
});
