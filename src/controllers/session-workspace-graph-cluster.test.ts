import { describe, expect, it, vi } from 'vitest';

const { createSessionWorkspaceControlsCluster } = vi.hoisted(() => ({
  createSessionWorkspaceControlsCluster: vi.fn(),
}));

vi.mock('../dom', () => ({ dom: {} }));
vi.mock('../state', () => ({ state: {} }));
vi.mock('./session-workspace-controls-cluster', () => ({
  createSessionWorkspaceControlsCluster,
}));

describe('session-workspace-graph-cluster', () => {
  it('wires cyclic preset-ui and workflow reset callbacks through the workspace graph', async () => {
    const syncPracticePresetUi = vi.fn();
    const clusterResult = {
      practicePresetUiController: { syncPracticePresetUi },
      refreshMelodyOptionsForCurrentInstrument: vi.fn(),
    };
    createSessionWorkspaceControlsCluster.mockReturnValue(clusterResult);

    const { createSessionWorkspaceGraphCluster } = await import('./session-workspace-graph-cluster');

    const closeAndResetInputs = vi.fn();
    const resetState = vi.fn();

    const dom = {
      trainingMode: {}, melodyPlaybackControls: {}, editMelodyBtn: {}, exportMelodyMidiBtn: {},
      bakePracticeMelodyBtn: {}, melodyDemoBtn: {}, melodyStepBackBtn: {}, melodyStepForwardBtn: {},
      melodyTransposeResetBtn: {}, melodyStringShiftResetBtn: {}, melodyTransposeBatchCustomBtn: {},
      melodyStringShift: {}, melodyStringShiftDownBtn: {}, melodyStringShiftUpBtn: {}, melodyStudyStart: {},
      melodyStudyEnd: {}, melodyStudyResetBtn: {}, deleteMelodyBtn: {}, difficulty: {}, curriculumPreset: {},
      sessionGoal: {}, sessionPace: {}, startFret: {}, endFret: {}, stringSelector: {}, scaleSelector: {},
      chordSelector: {}, progressionSelector: {}, arpeggioPatternSelector: {}, melodySelector: {},
      melodyShowNote: {}, openMelodyImportBtn: { click: vi.fn() }, melodyNameInput: {}, melodyAsciiTabInput: {},
      showAllNotes: {}, showStringToggles: {}, autoPlayPromptSound: {}, promptSoundTail: {}, promptSoundTailValue: {},
      relaxPerformanceOctaveCheck: {}, noteNaming: {}, rhythmTimingWindow: {}, randomizeChords: {},
      instrumentSelector: {}, tuningPreset: {}, showTimelineSteps: {}, showTimelineDetails: {},
      melodyFingeringStrategy: {}, melodyFingeringStrategyQuick: {}, melodyFingeringLevel: {},
      micDirectInputMode: {}, practiceInputPreset: {}, micSensitivityPreset: {}, micNoteAttackFilter: {},
      micNoteHoldFilter: {}, performanceMicTolerancePreset: {}, performanceTimingLeniencyPreset: {},
      practiceTimingPreset: {}, performanceMicLatencyCompensation: {}, performanceMicLatencyCompensationExact: {},
      performanceMicLatencyCompensationValue: {},
    } as any;

    const deps = {
      dom,
      state: {} as any,
      saveSettings: vi.fn(),
      handleModeChange: vi.fn(),
      stopListening: vi.fn(),
      refreshDisplayFormatting: vi.fn(),
      setNoteNamingPreference: vi.fn(),
      resolveInstrumentById: vi.fn(() => ({ name: 'Guitar' })),
      redrawFretboard: vi.fn(),
      updateInstrumentUI: vi.fn(),
      loadInstrumentSoundfont: vi.fn(async () => {}),
      renderMelodyTabTimelineFromState: vi.fn(),
      setPracticeSetupSummary: vi.fn(),
      setSessionToolsSummary: vi.fn(),
      setMelodySetupSummary: vi.fn(),
      setPracticeSetupCollapsed: vi.fn(),
      setMelodySetupCollapsed: vi.fn(),
      setSessionToolsCollapsed: vi.fn(),
      setLayoutControlsExpanded: vi.fn(),
      toggleLayoutControlsExpanded: vi.fn(),
      setUiWorkflow: vi.fn(),
      setUiMode: vi.fn(),
      setResultMessage: vi.fn(),
      refreshLayoutControlsVisibility: vi.fn(),
      refreshMicPerformanceReadinessUi: vi.fn(),
      getEnabledStringsCount: vi.fn(() => 6),
      getEnabledStrings: vi.fn(() => ['E', 'A']),
      listMelodiesForCurrentInstrument: vi.fn(() => [{ id: 'm1', source: 'custom', events: [{}, {}] }]),
      getAdjustedMelody: vi.fn((melody) => melody),
      isStringShiftFeasible: vi.fn(() => true),
      isDefaultStudyRange: vi.fn(() => false),
      isMelodyWorkflowMode: vi.fn(() => true),
      isCustomMelodyId: vi.fn(() => true),
      formatMelodyStudyRange: vi.fn(() => '1-2'),
      formatMelodyTransposeSemitones: vi.fn(() => '+2'),
      formatMelodyStringShift: vi.fn(() => '+1 string'),
      normalizeMelodyTransposeSemitones: vi.fn(() => 0),
      normalizeMelodyStringShift: vi.fn(() => 0),
      hasCompletedOnboarding: vi.fn(() => true),
      confirmUserAction: vi.fn(async () => true),
      selectedMelodyContextController: {
        getSelectedMelody: vi.fn(() => null),
        getSelectedMelodyId: vi.fn(() => 'm1'),
        syncMetronomeMeterFromSelectedMelody: vi.fn(),
        getSelectedMelodyEventCount: vi.fn(() => 2),
      },
      melodyPracticeSettingsBridgeController: {
        getStoredMelodyStudyRange: vi.fn(() => ({ startIndex: 0, endIndex: 1 })),
        hydrateMelodyTransposeForSelectedMelody: vi.fn(),
        hydrateMelodyStringShiftForSelectedMelody: vi.fn(),
        hydrateMelodyStudyRangeForSelectedMelody: vi.fn(),
        syncMelodyLoopRangeDisplay: vi.fn(),
        applyMelodyTransposeSemitones: vi.fn(() => true),
        applyMelodyStringShift: vi.fn(() => ({ changed: true, valid: true })),
        applyMelodyStudyRange: vi.fn(() => true),
        setStoredMelodyTransposeSemitones: vi.fn(() => 1),
        refreshMelodyOptionsForCurrentInstrument: vi.fn(),
      },
      melodyTimelineEditingBridgeController: {
        resetState,
        syncState: vi.fn(),
      },
      melodyImportWorkspaceController: {
        closeAndResetInputs,
      },
      curriculumPresetBridgeController: {
        markAsCustom: vi.fn(),
        setPresetInfo: vi.fn(),
        applyPreset: vi.fn(),
      },
      melodyTimelineUiController: {
        refreshUi: vi.fn(),
      },
      melodyDemoRuntimeController: {
        stopPlayback: vi.fn(),
        clearPreviewState: vi.fn(),
        isActive: vi.fn(() => false),
        getClampedBpmFromInput: vi.fn(() => 120),
        retimePlayback: vi.fn(() => false),
      },
      metronomeBridgeController: {
        hydrateMelodyTempoForSelectedMelody: vi.fn(),
        syncMelodyTimelineZoomDisplay: vi.fn(),
        syncScrollingTabZoomDisplay: vi.fn(),
        persistSelectedMelodyTempoOverride: vi.fn(),
        syncMetronomeTempoFromMelodyIfLinked: vi.fn(async () => {}),
        syncHiddenMetronomeTempoFromSharedTempo: vi.fn(),
        syncMelodyMetronomeRuntime: vi.fn(async () => {}),
        renderMetronomeToggleButton: vi.fn(),
      },
      micSettingsController: {
        updateNoiseGateInfo: vi.fn(),
      },
    };

    const result = createSessionWorkspaceGraphCluster(deps as any);
    const args = createSessionWorkspaceControlsCluster.mock.calls[0][0];

    args.practiceControls.practicePresetControls.syncPracticePresetUi();
    args.workflowLayout.workflowLayout.resetMelodyWorkflowEditorState();

    expect(syncPracticePresetUi).toHaveBeenCalledTimes(1);
    expect(closeAndResetInputs).toHaveBeenCalledTimes(1);
    expect(resetState).toHaveBeenCalledTimes(1);
    expect(result).toBe(clusterResult);
  });
});
