import { describe, expect, it, vi } from 'vitest';
import { createMelodyPracticeActionsController } from './melody-practice-actions-controller';

function createDeps() {
  return {
    dom: {
      trainingMode: { value: 'melody' } as HTMLSelectElement,
    },
    state: {
      isListening: false,
      melodyTransposeSemitones: 2,
    },
    isMelodyWorkflowMode: vi.fn((mode: string) => mode === 'melody' || mode === 'performance'),
    stopMelodyDemoPlayback: vi.fn(),
    stopListening: vi.fn(),
    markCurriculumPresetAsCustom: vi.fn(),
    updateMelodyActionButtonsForSelection: vi.fn(),
    updatePracticeSetupSummary: vi.fn(),
    saveSettings: vi.fn(),
    redrawFretboard: vi.fn(),
    refreshMelodyTimelineUi: vi.fn(),
    setResultMessage: vi.fn(),
    applyMelodyTransposeSemitones: vi.fn(() => true),
    applyMelodyStringShift: vi.fn(() => ({ changed: true, valid: true })),
    applyMelodyStudyRange: vi.fn(() => true),
    listCustomMelodies: vi.fn(() => [{ id: 'custom-1' }, { id: 'custom-2' }]),
    setStoredMelodyTransposeSemitones: vi.fn(),
    hydrateMelodyTransposeForSelectedMelody: vi.fn(),
    formatMelodyTransposeSemitones: vi.fn(() => '+2 st'),
    confirmUserAction: vi.fn(async () => true),
  };
}

describe('melody-practice-actions-controller', () => {
  it('applies transpose changes with workflow side effects', () => {
    const deps = createDeps();
    deps.state.isListening = true;
    const controller = createMelodyPracticeActionsController(deps);

    const changed = controller.handleTransposeInputChange(3);

    expect(changed).toBe(true);
    expect(deps.stopMelodyDemoPlayback).toHaveBeenCalledWith({ clearUi: true });
    expect(deps.stopListening).toHaveBeenCalledTimes(1);
    expect(deps.setResultMessage).toHaveBeenCalledWith(
      'Melody transpose changed. Session stopped; press Start to continue.'
    );
    expect(deps.refreshMelodyTimelineUi).toHaveBeenCalledTimes(1);
  });

  it('shows an error when string shift is not playable', () => {
    const deps = createDeps();
    deps.applyMelodyStringShift = vi.fn(() => ({ changed: false, valid: false }));
    const controller = createMelodyPracticeActionsController(deps);

    const changed = controller.handleStringShiftInputChange(1);

    expect(changed).toBe(false);
    expect(deps.setResultMessage).toHaveBeenCalledWith(
      'This string shift is not playable on the current instrument setup.',
      'error'
    );
    expect(deps.stopMelodyDemoPlayback).not.toHaveBeenCalled();
  });

  it('applies study range changes with stop message', () => {
    const deps = createDeps();
    deps.state.isListening = true;
    const controller = createMelodyPracticeActionsController(deps);

    const changed = controller.handleStudyRangeChange(
      { startIndex: 2, endIndex: 5 },
      { stopMessage: 'Study range adjusted. Session stopped; press Start to continue.' }
    );

    expect(changed).toBe(true);
    expect(deps.stopListening).toHaveBeenCalledTimes(1);
    expect(deps.setResultMessage).toHaveBeenCalledWith(
      'Study range adjusted. Session stopped; press Start to continue.'
    );
  });

  it('batch-applies current transpose to all custom melodies', async () => {
    const deps = createDeps();
    const controller = createMelodyPracticeActionsController(deps);

    await controller.applyCurrentTransposeToAllCustomMelodies();

    expect(deps.confirmUserAction).toHaveBeenCalledWith('Set transpose +2 st for all 2 custom melodies?');
    expect(deps.setStoredMelodyTransposeSemitones).toHaveBeenCalledTimes(2);
    expect(deps.hydrateMelodyTransposeForSelectedMelody).toHaveBeenCalledTimes(1);
    expect(deps.setResultMessage).toHaveBeenCalledWith('Set transpose +2 st for 2 custom melodies.', 'success');
  });
});
