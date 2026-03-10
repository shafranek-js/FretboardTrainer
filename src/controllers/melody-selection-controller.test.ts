import { describe, expect, it, vi } from 'vitest';
import { createMelodySelectionController } from './melody-selection-controller';

function createDeps() {
  return {
    dom: {
      melodySelector: { value: '' },
      melodyNameInput: { value: 'Imported melody' },
      melodyAsciiTabInput: { value: '1 string 0---' },
    },
    state: {
      preferredMelodyId: null,
    },
    refreshPracticeMelodyOptions: vi.fn(),
    hydrateMelodyTransposeForSelectedMelody: vi.fn(),
    hydrateMelodyStringShiftForSelectedMelody: vi.fn(),
    hydrateMelodyStudyRangeForSelectedMelody: vi.fn(),
    hydrateMelodyTempoForSelectedMelody: vi.fn(),
    clearMelodyDemoPreviewState: vi.fn(),
    updateMelodyActionButtonsForSelection: vi.fn(),
    refreshMelodyEmptyState: vi.fn(),
    resetMelodyTimelineEditingState: vi.fn(),
    closeMelodyImportModal: vi.fn(),
    markCurriculumPresetAsCustom: vi.fn(),
    updatePracticeSetupSummary: vi.fn(),
    saveSettings: vi.fn(),
    setResultMessage: vi.fn(),
    renderMelodyTabTimeline: vi.fn(),
    syncMelodyTimelineEditingState: vi.fn(),
  };
}

describe('melody-selection-controller', () => {
  it('refreshes selected-melody UI for the current instrument', () => {
    const deps = createDeps();
    const controller = createMelodySelectionController(deps as never);

    controller.refreshOptionsForCurrentInstrument();

    expect(deps.refreshPracticeMelodyOptions).toHaveBeenCalledTimes(1);
    expect(deps.hydrateMelodyTempoForSelectedMelody).toHaveBeenCalledTimes(1);
    expect(deps.updateMelodyActionButtonsForSelection).toHaveBeenCalledTimes(1);
    expect(deps.refreshMelodyEmptyState).toHaveBeenCalledTimes(1);
  });

  it('finalizes imported melody selection and rehydrates dependent UI state', () => {
    const deps = createDeps();
    const observedSelectedIds: string[] = [];
    deps.hydrateMelodyTransposeForSelectedMelody.mockImplementation(() => {
      observedSelectedIds.push(deps.dom.melodySelector.value);
    });
    deps.hydrateMelodyStringShiftForSelectedMelody.mockImplementation(() => {
      observedSelectedIds.push(deps.dom.melodySelector.value);
    });
    deps.hydrateMelodyStudyRangeForSelectedMelody.mockImplementation(() => {
      observedSelectedIds.push(deps.dom.melodySelector.value);
    });
    deps.hydrateMelodyTempoForSelectedMelody.mockImplementation(() => {
      observedSelectedIds.push(deps.dom.melodySelector.value);
    });
    const controller = createMelodySelectionController(deps as never);

    controller.finalizeImportSelection('melody-42', 'Imported successfully.');

    expect(deps.resetMelodyTimelineEditingState).toHaveBeenCalledTimes(1);
    expect(deps.dom.melodySelector.value).toBe('melody-42');
    expect(deps.state.preferredMelodyId).toBe('melody-42');
    expect(observedSelectedIds).toEqual(['', 'melody-42', 'melody-42', 'melody-42', 'melody-42']);
    expect(deps.clearMelodyDemoPreviewState).toHaveBeenCalledTimes(1);
    expect(deps.updateMelodyActionButtonsForSelection).toHaveBeenCalledTimes(2);
    expect(deps.dom.melodyNameInput.value).toBe('');
    expect(deps.dom.melodyAsciiTabInput.value).toBe('');
    expect(deps.closeMelodyImportModal).toHaveBeenCalledTimes(1);
    expect(deps.markCurriculumPresetAsCustom).toHaveBeenCalledTimes(1);
    expect(deps.updatePracticeSetupSummary).toHaveBeenCalledTimes(1);
    expect(deps.saveSettings).toHaveBeenCalledTimes(1);
    expect(deps.setResultMessage).toHaveBeenCalledWith('Imported successfully.', 'success');
    expect(deps.renderMelodyTabTimeline).toHaveBeenCalledTimes(1);
    expect(deps.syncMelodyTimelineEditingState).toHaveBeenCalledTimes(1);
  });
});

