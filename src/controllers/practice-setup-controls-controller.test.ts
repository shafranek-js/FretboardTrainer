import { describe, expect, it, vi } from 'vitest';
import { createPracticeSetupControlsController } from './practice-setup-controls-controller';

type Listener = () => void;

type MockElement = {
  listeners: Record<string, Listener>;
  value: string;
  checked: boolean;
  style: { display: string };
  textContent: string;
  classList: {
    hidden: boolean;
    toggle: ReturnType<typeof vi.fn>;
  };
  addEventListener: ReturnType<typeof vi.fn>;
  dispatchEvent: ReturnType<typeof vi.fn>;
};

function createElement(value = '', checked = false): MockElement {
  const listeners: Record<string, Listener> = {};
  const classList = {
    hidden: false,
    toggle: vi.fn((className: string, force?: boolean) => {
      if (className === 'hidden' && typeof force === 'boolean') {
        classList.hidden = force;
      }
      return classList.hidden;
    }),
  };

  return {
    listeners,
    value,
    checked,
    style: { display: '' },
    textContent: '',
    classList,
    addEventListener: vi.fn((type: string, handler: Listener) => {
      listeners[type] = handler;
    }),
    dispatchEvent: vi.fn(),
  };
}

function createDeps() {
  const dom = {
    showAllNotes: createElement('', false),
    showStringToggles: createElement('', false),
    stringSelector: createElement(),
    autoPlayPromptSound: createElement('', false),
    relaxPerformanceOctaveCheck: createElement('', false),
    noteNaming: createElement('letters'),
    trainingMode: createElement('melody'),
    sessionGoal: createElement('accuracy'),
    sessionPace: createElement('normal'),
    curriculumPreset: createElement('custom'),
    startFret: createElement('0'),
    endFret: createElement('12'),
    rhythmTimingWindow: createElement('normal'),
    difficulty: createElement('medium'),
    scaleSelector: createElement('major'),
    chordSelector: createElement('triads'),
    randomizeChords: createElement('', false),
    progressionSelector: createElement('ii-v-i'),
    arpeggioPatternSelector: createElement('ascending'),
  };

  return {
    dom,
    state: {
      uiWorkflow: 'learn-notes' as const,
      showingAllNotes: false,
      autoPlayPromptSound: false,
      relaxPerformanceOctaveCheck: false,
      sessionPace: 'normal',
    },
    markCurriculumPresetAsCustom: vi.fn(),
    saveSettings: vi.fn(),
    redrawFretboard: vi.fn(),
    refreshDisplayFormatting: vi.fn(),
    setNoteNamingPreference: vi.fn(),
    resolveSessionToolsVisibility: vi.fn(() => ({ showShowStringTogglesRow: true })),
    stopMelodyDemoPlayback: vi.fn(),
    handleModeChange: vi.fn(),
    applyUiWorkflowLayout: vi.fn(),
    syncHiddenMetronomeTempoFromSharedTempo: vi.fn(),
    syncMelodyMetronomeRuntime: vi.fn(async () => {}),
    updatePracticeSetupSummary: vi.fn(),
    refreshMicPerformanceReadinessUi: vi.fn(),
    syncMelodyTimelineEditingState: vi.fn(),
    setCurriculumPresetInfo: vi.fn(),
    applyCurriculumPreset: vi.fn(),
    persistSelectedMelodyTempoOverride: vi.fn(),
    renderMetronomeToggleButton: vi.fn(),
  };
}

describe('practice-setup-controls-controller', () => {
  it('updates show all notes and redraws the fretboard', () => {
    const deps = createDeps();
    const controller = createPracticeSetupControlsController(deps as never);

    controller.register();
    deps.dom.showAllNotes.checked = true;
    deps.dom.showAllNotes.listeners.change();

    expect(deps.state.showingAllNotes).toBe(true);
    expect(deps.markCurriculumPresetAsCustom).toHaveBeenCalledTimes(1);
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
    expect(deps.redrawFretboard).toHaveBeenCalledTimes(1);
  });

  it('syncs string selector visibility from the current workflow policy', () => {
    const deps = createDeps();
    const controller = createPracticeSetupControlsController(deps as never);

    controller.register();
    deps.dom.showStringToggles.checked = true;
    deps.dom.showStringToggles.listeners.change();

    expect(deps.resolveSessionToolsVisibility).toHaveBeenCalledWith('learn-notes');
    expect(deps.dom.stringSelector.classList.toggle).toHaveBeenCalledWith('hidden', false);
    expect(deps.dom.stringSelector.style.display).toBe('');
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
  });

  it('applies note naming changes and refreshes display formatting', () => {
    const deps = createDeps();
    const controller = createPracticeSetupControlsController(deps as never);

    controller.register();
    deps.dom.noteNaming.value = 'solfege';
    deps.dom.noteNaming.listeners.change();

    expect(deps.setNoteNamingPreference).toHaveBeenCalledWith('solfege');
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
    expect(deps.redrawFretboard).toHaveBeenCalledTimes(1);
    expect(deps.refreshDisplayFormatting).toHaveBeenCalledTimes(1);
  });

  it('handles training mode changes through the shared practice setup flow', () => {
    const deps = createDeps();
    const controller = createPracticeSetupControlsController(deps as never);

    controller.register();
    deps.dom.trainingMode.listeners.change();

    expect(deps.stopMelodyDemoPlayback).toHaveBeenCalledWith({ clearUi: true });
    expect(deps.markCurriculumPresetAsCustom).toHaveBeenCalledTimes(1);
    expect(deps.handleModeChange).toHaveBeenCalledTimes(1);
    expect(deps.applyUiWorkflowLayout).toHaveBeenCalledWith('learn-notes');
    expect(deps.syncHiddenMetronomeTempoFromSharedTempo).toHaveBeenCalledTimes(1);
    expect(deps.syncMelodyMetronomeRuntime).toHaveBeenCalledTimes(1);
    expect(deps.updatePracticeSetupSummary).toHaveBeenCalledTimes(1);
    expect(deps.refreshMicPerformanceReadinessUi).toHaveBeenCalledTimes(1);
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
    expect(deps.syncMelodyTimelineEditingState).toHaveBeenCalledTimes(1);
  });

  it('normalizes session pace before saving it', () => {
    const deps = createDeps();
    const controller = createPracticeSetupControlsController(deps as never);

    controller.register();
    deps.dom.sessionPace.value = 'unexpected';
    deps.dom.sessionPace.listeners.change();

    expect(deps.state.sessionPace).toBe('normal');
    expect(deps.dom.sessionPace.value).toBe('normal');
    expect(deps.markCurriculumPresetAsCustom).toHaveBeenCalledTimes(1);
    expect(deps.updatePracticeSetupSummary).toHaveBeenCalledTimes(1);
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
  });

  it('routes custom and preset curriculum selections correctly', () => {
    const deps = createDeps();
    const controller = createPracticeSetupControlsController(deps as never);

    controller.register();
    deps.dom.curriculumPreset.value = 'custom';
    deps.dom.curriculumPreset.listeners.change();
    deps.dom.curriculumPreset.value = 'caged';
    deps.dom.curriculumPreset.listeners.change();

    expect(deps.setCurriculumPresetInfo).toHaveBeenCalledWith('');
    expect(deps.applyCurriculumPreset).toHaveBeenCalledWith('caged');
    expect(deps.persistSelectedMelodyTempoOverride).toHaveBeenCalledTimes(1);
    expect(deps.syncHiddenMetronomeTempoFromSharedTempo).toHaveBeenCalledTimes(1);
    expect(deps.renderMetronomeToggleButton).toHaveBeenCalledTimes(1);
    expect(deps.updatePracticeSetupSummary).toHaveBeenCalledTimes(2);
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
  });
});
