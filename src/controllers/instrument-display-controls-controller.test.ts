import { describe, expect, it, vi } from 'vitest';
import { createInstrumentDisplayControlsController } from './instrument-display-controls-controller';

type Listener = () => void | Promise<void>;

type MockInput = {
  listeners: Record<string, Listener>;
  value: string;
  checked: boolean;
  selectedOptions?: Array<{ textContent?: string | null }>;
  addEventListener: ReturnType<typeof vi.fn>;
};

function createControl(value = '', checked = false): MockInput {
  const listeners: Record<string, Listener> = {};
  return {
    listeners,
    value,
    checked,
    selectedOptions: [{ textContent: value }],
    addEventListener: vi.fn((type: string, handler: Listener) => {
      listeners[type] = handler;
    }),
  };
}

function createDeps() {
  const dom = {
    instrumentSelector: createControl('bass'),
    tuningPreset: createControl('drop-d'),
    showTimelineSteps: createControl('', false),
    showTimelineDetails: createControl('', false),
    melodyFingeringStrategy: createControl('heuristic'),
    melodyFingeringStrategyQuick: createControl('minimax'),
    melodyFingeringLevel: createControl('advanced'),
  };
  dom.tuningPreset.selectedOptions = [{ textContent: 'Drop D' }];

  return {
    dom,
    state: {
      currentInstrument: { name: 'guitar' },
      currentTuningPresetKey: 'standard',
      isListening: true,
      showMelodyTimelineSteps: false,
      showMelodyTimelineDetails: false,
      melodyFingeringStrategy: 'minimax',
      melodyFingeringLevel: 'beginner',
    },
    resolveInstrumentById: vi.fn((instrumentId: string) => ({ name: instrumentId })),
    stopMelodyDemoPlayback: vi.fn(),
    markCurriculumPresetAsCustom: vi.fn(),
    resetMelodyTimelineEditingState: vi.fn(),
    updateInstrumentUI: vi.fn(),
    getEnabledStrings: vi.fn(() => ['E', 'A', 'D']),
    refreshMelodyOptionsForCurrentInstrument: vi.fn(),
    updatePracticeSetupSummary: vi.fn(),
    loadInstrumentSoundfont: vi.fn(async () => {}),
    saveSettings: vi.fn(),
    refreshMelodyTimelineUi: vi.fn(),
    stopListening: vi.fn(),
    setResultMessage: vi.fn(),
    redrawFretboard: vi.fn(),
  };
}

describe('instrument-display-controls-controller', () => {
  it('handles instrument changes through the shared setup flow', async () => {
    const deps = createDeps();
    const controller = createInstrumentDisplayControlsController(deps as never);

    controller.register();
    await deps.dom.instrumentSelector.listeners.change();

    expect(deps.stopMelodyDemoPlayback).toHaveBeenCalledWith({ clearUi: true });
    expect(deps.markCurriculumPresetAsCustom).toHaveBeenCalledTimes(1);
    expect(deps.resetMelodyTimelineEditingState).toHaveBeenCalledTimes(1);
    expect(deps.resolveInstrumentById).toHaveBeenCalledWith('bass');
    expect(deps.state.currentInstrument.name).toBe('bass');
    expect(deps.state.currentTuningPresetKey).toBe('drop-d');
    expect(deps.updateInstrumentUI).toHaveBeenCalledTimes(1);
    expect(deps.refreshMelodyOptionsForCurrentInstrument).toHaveBeenCalledTimes(1);
    expect(deps.updatePracticeSetupSummary).toHaveBeenCalledTimes(1);
    expect(deps.loadInstrumentSoundfont).toHaveBeenCalledWith('bass');
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
    expect(deps.refreshMelodyTimelineUi).toHaveBeenCalledTimes(1);
  });

  it('handles tuning changes and stops the current session when needed', () => {
    const deps = createDeps();
    const controller = createInstrumentDisplayControlsController(deps as never);

    controller.register();
    deps.dom.tuningPreset.listeners.change();

    expect(deps.stopMelodyDemoPlayback).toHaveBeenCalledWith({ clearUi: true });
    expect(deps.markCurriculumPresetAsCustom).toHaveBeenCalledTimes(1);
    expect(deps.resetMelodyTimelineEditingState).toHaveBeenCalledTimes(1);
    expect(deps.stopListening).toHaveBeenCalledTimes(1);
    expect(deps.getEnabledStrings).toHaveBeenCalledTimes(1);
    expect(deps.updateInstrumentUI).toHaveBeenCalledWith(['E', 'A', 'D'], 'drop-d');
    expect(deps.updatePracticeSetupSummary).toHaveBeenCalledTimes(1);
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
    expect(deps.setResultMessage).toHaveBeenCalledWith('Tuning set: Drop D');
    expect(deps.refreshMelodyTimelineUi).toHaveBeenCalledTimes(1);
  });

  it('persists timeline step and detail visibility toggles', () => {
    const deps = createDeps();
    const controller = createInstrumentDisplayControlsController(deps as never);

    controller.register();
    deps.dom.showTimelineSteps.checked = true;
    deps.dom.showTimelineSteps.listeners.change();
    deps.dom.showTimelineDetails.checked = true;
    deps.dom.showTimelineDetails.listeners.change();

    expect(deps.state.showMelodyTimelineSteps).toBe(true);
    expect(deps.state.showMelodyTimelineDetails).toBe(true);
    expect(deps.saveSettings).toHaveBeenCalledTimes(2);
    expect(deps.refreshMelodyTimelineUi).toHaveBeenCalledTimes(2);
  });

  it('normalizes fingering strategy from both controls', () => {
    const deps = createDeps();
    const controller = createInstrumentDisplayControlsController(deps as never);

    controller.register();
    deps.dom.melodyFingeringStrategy.value = 'heuristic';
    deps.dom.melodyFingeringStrategy.listeners.change();
    deps.dom.melodyFingeringStrategyQuick.value = 'minimax';
    deps.dom.melodyFingeringStrategyQuick.listeners.change();

    expect(deps.state.melodyFingeringStrategy).toBe('minimax');
    expect(deps.dom.melodyFingeringStrategy.value).toBe('minimax');
    expect(deps.dom.melodyFingeringStrategyQuick.value).toBe('minimax');
    expect(deps.saveSettings).toHaveBeenCalledTimes(2);
    expect(deps.redrawFretboard).toHaveBeenCalledTimes(2);
    expect(deps.refreshMelodyTimelineUi).toHaveBeenCalledTimes(2);
  });

  it('normalizes fingering level and refreshes the displays', () => {
    const deps = createDeps();
    const controller = createInstrumentDisplayControlsController(deps as never);

    controller.register();
    deps.dom.melodyFingeringLevel.value = 'advanced';
    deps.dom.melodyFingeringLevel.listeners.change();

    expect(deps.state.melodyFingeringLevel).toBe('advanced');
    expect(deps.dom.melodyFingeringLevel.value).toBe('advanced');
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
    expect(deps.redrawFretboard).toHaveBeenCalledTimes(1);
    expect(deps.refreshMelodyTimelineUi).toHaveBeenCalledTimes(1);
  });
});
