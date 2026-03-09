import { describe, expect, it, vi } from 'vitest';
import { createMelodySetupControlsController } from './melody-setup-controls-controller';

type Listener = () => void | Promise<void>;

type MockControl = {
  listeners: Record<string, Listener>;
  value: string;
  checked: boolean;
  dispatchEvent: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
};

function createControl(value = '', checked = false): MockControl {
  const listeners: Record<string, Listener> = {};
  return {
    listeners,
    value,
    checked,
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn((type: string, handler: Listener) => {
      listeners[type] = handler;
    }),
  };
}

function createDeps() {
  return {
    dom: {
      melodySelector: createControl('melody-a'),
      trainingMode: createControl('study-melody'),
      melodyStudyStart: createControl('3'),
      melodyStudyEnd: createControl('5'),
      melodyStudyResetBtn: createControl(),
      melodyShowNote: createControl('', false),
      melodyShowTabTimeline: createControl('', false),
      melodyShowScrollingTab: createControl('', false),
      melodyTimelineZoom: createControl('100'),
      scrollingTabZoom: createControl('100'),
      melodyLoopRange: createControl('', false),
      melodyDemoBpm: createControl('92'),
    },
    state: {
      preferredMelodyId: null,
      isListening: true,
      showMelodyTabTimeline: false,
      showScrollingTabPanel: false,
      melodyLoopRangeEnabled: false,
    },
    stopMelodyDemoPlayback: vi.fn(),
    markCurriculumPresetAsCustom: vi.fn(),
    resetMelodyTimelineEditingState: vi.fn(),
    hydrateMelodyTransposeForSelectedMelody: vi.fn(),
    hydrateMelodyStringShiftForSelectedMelody: vi.fn(),
    hydrateMelodyStudyRangeForSelectedMelody: vi.fn(),
    hydrateMelodyTempoForSelectedMelody: vi.fn(),
    syncMetronomeMeterFromSelectedMelody: vi.fn(),
    clearMelodyDemoPreviewState: vi.fn(),
    updateMelodyActionButtonsForSelection: vi.fn(),
    isMelodyWorkflowMode: vi.fn(() => true),
    stopListening: vi.fn(),
    setResultMessage: vi.fn(),
    updatePracticeSetupSummary: vi.fn(),
    saveSettings: vi.fn(),
    refreshMelodyTimelineUi: vi.fn(),
    refreshLayoutControlsVisibility: vi.fn(),
    syncMelodyTimelineZoomDisplay: vi.fn(),
    syncScrollingTabZoomDisplay: vi.fn(),
    syncMelodyLoopRangeDisplay: vi.fn(),
    clampMelodyDemoBpmInput: vi.fn(),
    persistSelectedMelodyTempoOverride: vi.fn(),
    syncMetronomeTempoFromMelodyIfLinked: vi.fn(async () => {}),
    getSelectedMelodyEventCount: vi.fn(() => 8),
  };
}

describe('melody-setup-controls-controller', () => {
  it('handles melody selection changes through the shared hydration flow', () => {
    const deps = createDeps();
    const controller = createMelodySetupControlsController(deps as never);

    controller.register();
    deps.dom.melodySelector.listeners.change();

    expect(deps.stopMelodyDemoPlayback).toHaveBeenCalledWith({ clearUi: true });
    expect(deps.markCurriculumPresetAsCustom).toHaveBeenCalledTimes(1);
    expect(deps.state.preferredMelodyId).toBe('melody-a');
    expect(deps.resetMelodyTimelineEditingState).toHaveBeenCalledTimes(1);
    expect(deps.hydrateMelodyTransposeForSelectedMelody).toHaveBeenCalledTimes(1);
    expect(deps.hydrateMelodyStringShiftForSelectedMelody).toHaveBeenCalledTimes(1);
    expect(deps.hydrateMelodyStudyRangeForSelectedMelody).toHaveBeenCalledTimes(1);
    expect(deps.hydrateMelodyTempoForSelectedMelody).toHaveBeenCalledTimes(1);
    expect(deps.syncMetronomeMeterFromSelectedMelody).toHaveBeenCalledTimes(1);
    expect(deps.clearMelodyDemoPreviewState).toHaveBeenCalledTimes(1);
    expect(deps.updateMelodyActionButtonsForSelection).toHaveBeenCalledTimes(1);
    expect(deps.stopListening).toHaveBeenCalledTimes(1);
    expect(deps.setResultMessage).toHaveBeenCalledWith(
      'Melody changed. Session stopped; press Start to begin from the first event.'
    );
    expect(deps.updatePracticeSetupSummary).toHaveBeenCalledTimes(1);
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
    expect(deps.refreshMelodyTimelineUi).toHaveBeenCalledTimes(1);
  });

  it('resets study range to the full selected melody span', () => {
    const deps = createDeps();
    const controller = createMelodySetupControlsController(deps as never);

    controller.register();
    deps.dom.melodyStudyResetBtn.listeners.click();

    expect(deps.getSelectedMelodyEventCount).toHaveBeenCalledTimes(1);
    expect(deps.dom.melodyStudyStart.value).toBe('1');
    expect(deps.dom.melodyStudyEnd.value).toBe('8');
    expect(deps.dom.melodyStudyStart.dispatchEvent).toHaveBeenCalledTimes(1);
  });

  it('persists note visibility changes in the practice summary', () => {
    const deps = createDeps();
    const controller = createMelodySetupControlsController(deps as never);

    controller.register();
    deps.dom.melodyShowNote.listeners.change();

    expect(deps.markCurriculumPresetAsCustom).toHaveBeenCalledTimes(1);
    expect(deps.updatePracticeSetupSummary).toHaveBeenCalledTimes(1);
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
  });

  it('syncs timeline and scrolling panel visibility toggles', () => {
    const deps = createDeps();
    const controller = createMelodySetupControlsController(deps as never);

    controller.register();
    deps.dom.melodyShowTabTimeline.checked = true;
    deps.dom.melodyShowTabTimeline.listeners.change();
    deps.dom.melodyShowScrollingTab.checked = true;
    deps.dom.melodyShowScrollingTab.listeners.change();

    expect(deps.state.showMelodyTabTimeline).toBe(true);
    expect(deps.state.showScrollingTabPanel).toBe(true);
    expect(deps.refreshLayoutControlsVisibility).toHaveBeenCalledTimes(2);
    expect(deps.refreshMelodyTimelineUi).toHaveBeenCalledTimes(2);
    expect(deps.saveSettings).toHaveBeenCalledTimes(2);
  });

  it('syncs zoom controls through the shared display helpers', () => {
    const deps = createDeps();
    const controller = createMelodySetupControlsController(deps as never);

    controller.register();
    deps.dom.melodyTimelineZoom.listeners.input();
    deps.dom.melodyTimelineZoom.listeners.change();
    deps.dom.scrollingTabZoom.listeners.input();
    deps.dom.scrollingTabZoom.listeners.change();

    expect(deps.syncMelodyTimelineZoomDisplay).toHaveBeenCalledTimes(2);
    expect(deps.syncScrollingTabZoomDisplay).toHaveBeenCalledTimes(2);
    expect(deps.refreshMelodyTimelineUi).toHaveBeenCalledTimes(4);
    expect(deps.saveSettings).toHaveBeenCalledTimes(4);
  });

  it('syncs loop range and melody bpm side effects', () => {
    const deps = createDeps();
    const controller = createMelodySetupControlsController(deps as never);

    controller.register();
    deps.dom.melodyLoopRange.checked = true;
    deps.dom.melodyLoopRange.listeners.change();
    deps.dom.melodyDemoBpm.listeners.input();
    deps.dom.melodyDemoBpm.listeners.change();

    expect(deps.state.melodyLoopRangeEnabled).toBe(true);
    expect(deps.syncMelodyLoopRangeDisplay).toHaveBeenCalledTimes(1);
    expect(deps.updatePracticeSetupSummary).toHaveBeenCalledTimes(1);
    expect(deps.clampMelodyDemoBpmInput).toHaveBeenCalledTimes(2);
    expect(deps.persistSelectedMelodyTempoOverride).toHaveBeenCalledTimes(2);
    expect(deps.syncMetronomeTempoFromMelodyIfLinked).toHaveBeenCalledTimes(2);
    expect(deps.saveSettings).toHaveBeenCalledTimes(3);
  });
});
