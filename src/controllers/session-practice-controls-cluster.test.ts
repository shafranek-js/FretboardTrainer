import { describe, expect, it, vi } from 'vitest';
import { createSessionPracticeControlsCluster } from './session-practice-controls-cluster';

function createDeps() {
  return {
    practicePresetControls: {
      dom: {} as never,
      state: {} as never,
      refreshMicPerformanceReadinessUi: vi.fn(),
      syncPracticePresetUi: vi.fn(),
      updateMicNoiseGateInfo: vi.fn(),
      saveSettings: vi.fn(),
    },
    practiceSetupControls: {
      dom: {} as never,
      state: {} as never,
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
      syncMelodyMetronomeRuntime: vi.fn(),
      updatePracticeSetupSummary: vi.fn(),
      refreshMicPerformanceReadinessUi: vi.fn(),
      syncMelodyTimelineEditingState: vi.fn(),
      setCurriculumPresetInfo: vi.fn(),
      applyCurriculumPreset: vi.fn(),
      persistSelectedMelodyTempoOverride: vi.fn(),
      renderMetronomeToggleButton: vi.fn(),
    },
    instrumentDisplayControls: {
      dom: {} as never,
      state: {} as never,
      resolveInstrumentById: vi.fn(() => ({ name: 'Guitar' })),
      stopMelodyDemoPlayback: vi.fn(),
      markCurriculumPresetAsCustom: vi.fn(),
      resetMelodyTimelineEditingState: vi.fn(),
      updateInstrumentUI: vi.fn(),
      getEnabledStrings: vi.fn(() => []),
      refreshMelodyOptionsForCurrentInstrument: vi.fn(),
      updatePracticeSetupSummary: vi.fn(),
      loadInstrumentSoundfont: vi.fn(),
      saveSettings: vi.fn(),
      refreshMelodyTimelineUi: vi.fn(),
      stopListening: vi.fn(),
      setResultMessage: vi.fn(),
      redrawFretboard: vi.fn(),
    },
  };
}

describe('session-practice-controls-cluster', () => {
  it('creates the practice and instrument controllers as one cluster', () => {
    const cluster = createSessionPracticeControlsCluster(createDeps() as never);

    expect(cluster.practicePresetControlsController).toBeTruthy();
    expect(cluster.practiceSetupControlsController).toBeTruthy();
    expect(cluster.instrumentDisplayControlsController).toBeTruthy();
  });
});
