import { describe, expect, it, vi } from 'vitest';
import { createSessionMelodyWorkflowCluster } from './session-melody-workflow-cluster';

function createDeps() {
  return {
    melodySetupControls: {
      dom: {} as never,
      state: {} as never,
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
      isMelodyWorkflowMode: vi.fn(() => false),
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
      syncMetronomeTempoFromMelodyIfLinked: vi.fn(),
      retimeMelodyDemoPlayback: vi.fn(() => false),
      getSelectedMelodyEventCount: vi.fn(() => null),
    },
    melodyPracticeActions: {
      dom: {
        trainingMode: { value: 'melody' },
      },
      state: {
        isListening: false,
        melodyTransposeSemitones: 0,
      },
      isMelodyWorkflowMode: vi.fn(() => true),
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
      listCustomMelodies: vi.fn(() => []),
      setStoredMelodyTransposeSemitones: vi.fn(() => 0),
      hydrateMelodyTransposeForSelectedMelody: vi.fn(),
      formatMelodyTransposeSemitones: vi.fn(() => '+0'),
      confirmUserAction: vi.fn(async () => true),
    },
    melodyPracticeControls: {
      dom: {
        melodyTranspose: { addEventListener: vi.fn(), value: '0' },
        melodyTransposeDownBtn: { addEventListener: vi.fn() },
        melodyTransposeUpBtn: { addEventListener: vi.fn() },
        melodyTransposeResetBtn: { addEventListener: vi.fn() },
        melodyStringShift: { addEventListener: vi.fn(), value: '0' },
        melodyStringShiftDownBtn: { addEventListener: vi.fn() },
        melodyStringShiftUpBtn: { addEventListener: vi.fn() },
        melodyStringShiftResetBtn: { addEventListener: vi.fn() },
        melodyTransposeBatchCustomBtn: { addEventListener: vi.fn() },
        melodyStudyStart: { addEventListener: vi.fn(), value: '1', dispatchEvent: vi.fn() },
        melodyStudyEnd: { addEventListener: vi.fn(), value: '1' },
      },
      state: {
        melodyTransposeSemitones: 0,
        melodyStringShift: 0,
      },
      normalizeMelodyTransposeSemitones: vi.fn((value) => Number(value)),
      normalizeMelodyStringShift: vi.fn((value) => Number(value)),
      stopMelodyDemoPlayback: vi.fn(),
    },
    melodySelection: {
      dom: {
        melodySelector: { value: '' },
        melodyNameInput: { value: '' },
        melodyAsciiTabInput: { value: '' },
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
    },
  };
}

describe('session-melody-workflow-cluster', () => {
  it('creates the melody workflow controllers as one cluster', () => {
    const cluster = createSessionMelodyWorkflowCluster(createDeps() as never);

    expect(cluster.melodySetupControlsController).toBeTruthy();
    expect(cluster.melodyPracticeActionsController).toBeTruthy();
    expect(cluster.melodyPracticeControlsController).toBeTruthy();
    expect(cluster.melodySelectionController).toBeTruthy();
  });
});
