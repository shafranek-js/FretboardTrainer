import type { createSessionWorkspaceGraphCluster as CreateSessionWorkspaceGraphCluster } from './session-workspace-graph-cluster';
import { describe, expect, it, vi } from 'vitest';

const { createSessionWorkspaceControlsCluster } = vi.hoisted(() => ({
  createSessionWorkspaceControlsCluster: vi.fn(),
}));

vi.mock('../dom', () => ({ dom: {} }));
vi.mock('../state', () => ({ state: {} }));
vi.mock('./session-workspace-controls-cluster', () => ({
  createSessionWorkspaceControlsCluster,
}));

type SessionWorkspaceGraphClusterDeps = Parameters<typeof CreateSessionWorkspaceGraphCluster>[0];

function createStub<T>(): T {
  return {} as T;
}

describe('session-workspace-graph-cluster', () => {
  it('wires cyclic preset-ui and workspace control callbacks through the workspace graph', async () => {
    const syncPracticePresetUi = vi.fn();
    const clusterResult = {
      practicePresetUiController: { syncPracticePresetUi },
      refreshMelodyOptionsForCurrentInstrument: vi.fn(),
    };
    createSessionWorkspaceControlsCluster.mockReturnValue(clusterResult);

    const { createSessionWorkspaceGraphCluster } = await import('./session-workspace-graph-cluster');

    const closeAndResetInputs = vi.fn();
    const resetState = vi.fn();
    const applyPreset = vi.fn();
    const syncMelodyMetronomeRuntime = vi.fn(async () => {});
    const updateNoiseGateInfo = vi.fn();

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
    } as unknown as SessionWorkspaceGraphClusterDeps['dom'];

    const deps = {
      dom,
      state: {
        uiWorkflow: 'learn-notes',
        uiMode: 'simple',
        isListening: false,
        currentInstrument: { STRING_ORDER: ['E', 'A', 'D', 'G', 'B', 'e'] },
        preferredMelodyId: null,
        showMelodyTabTimeline: false,
        showScrollingTabPanel: false,
        showingAllNotes: false,
        autoPlayPromptSound: false,
        promptSoundTailMs: 120,
        relaxPerformanceOctaveCheck: false,
        sessionPace: 'steady',
        currentTuningPresetKey: 'standard',
        showMelodyTimelineSteps: false,
        showMelodyTimelineDetails: false,
        melodyFingeringStrategy: 'minimax',
        melodyFingeringLevel: 'advanced',
        melodyTransposeSemitones: 0,
        melodyStringShift: 0,
        melodyStudyRangeStartIndex: 0,
        melodyStudyRangeEndIndex: 1,
        melodyLoopRangeEnabled: false,
        micSensitivityPreset: 'auto',
        micNoteAttackFilterPreset: 'balanced',
        micNoteHoldFilterPreset: '80ms',
        isDirectInputMode: false,
        ignorePromptAudioUntilMs: 0,
        performanceMicTolerancePreset: 'normal',
        performanceTimingLeniencyPreset: 'normal',
        performanceMicLatencyCompensationMs: 0,
        micPerformanceSuggestedLatencyMs: null,
        micPerformanceLatencyCalibrationActive: false,
        micPerformanceJudgmentCount: 0,
        micPerformanceJudgmentTotalLatencyMs: 0,
        micPerformanceJudgmentLastLatencyMs: null,
        micPerformanceJudgmentMaxLatencyMs: 0,
      } as SessionWorkspaceGraphClusterDeps['state'],
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
        applyPreset,
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
        syncMelodyMetronomeRuntime,
        renderMetronomeToggleButton: vi.fn(),
      },
      micSettingsController: {
        updateNoiseGateInfo,
      },
    } as unknown as SessionWorkspaceGraphClusterDeps;

    const result = createSessionWorkspaceGraphCluster(deps);
    const args = createSessionWorkspaceControlsCluster.mock.calls[0][0];

    expect(args.setupUi.melodySetupUi.state).not.toBe(deps.state);
    expect(args.setupUi.practiceSetupSummary.state).not.toBe(deps.state);
    expect(args.setupUi.practicePresetUi.state).not.toBe(deps.state);
    expect(args.melodyWorkflow.melodySetupControls.state).not.toBe(deps.state);
    expect(args.melodyWorkflow.melodyPracticeActions.state).not.toBe(deps.state);
    expect(args.melodyWorkflow.melodyPracticeControls.state).not.toBe(deps.state);
    expect(args.melodyWorkflow.melodySelection.state).not.toBe(deps.state);
    expect(args.practiceControls.practicePresetControls.state).not.toBe(deps.state);
    expect(args.practiceControls.practiceSetupControls.state).not.toBe(deps.state);
    expect(args.practiceControls.instrumentDisplayControls.state).not.toBe(deps.state);
    expect(args.workflowLayout.workflowLayout.state).not.toBe(deps.state);
    expect(args.workflowLayout.workflowLayoutControls.state).not.toBe(deps.state);

    args.setupUi.melodySetupUi.state.melodyStringShift = 2;
    args.setupUi.practiceSetupSummary.state.melodyLoopRangeEnabled = true;
    args.setupUi.practicePresetUi.state.uiWorkflow = 'practice';
    args.melodyWorkflow.melodySetupControls.state.showMelodyTabTimeline = true;
    args.melodyWorkflow.melodySetupControls.state.showScrollingTabPanel = true;
    args.melodyWorkflow.melodyPracticeActions.state.melodyTransposeSemitones = 3;
    args.melodyWorkflow.melodyPracticeControls.state.melodyTransposeSemitones = 4;
    args.melodyWorkflow.melodySelection.state.preferredMelodyId = 'm1';
    args.practiceControls.practicePresetControls.state.isDirectInputMode = true;
    args.practiceControls.practicePresetControls.state.performanceMicLatencyCompensationMs = 35;
    args.practiceControls.practiceSetupControls.state.autoPlayPromptSound = true;
    args.practiceControls.practiceSetupControls.state.sessionPace = 'slow';
    args.practiceControls.instrumentDisplayControls.state.currentTuningPresetKey = 'drop-d';
    args.practiceControls.instrumentDisplayControls.state.showMelodyTimelineDetails = true;
    args.workflowLayout.workflowLayout.state.uiWorkflow = 'editor';
    args.workflowLayout.workflowLayoutControls.state.uiMode = 'advanced';
    args.practiceControls.practicePresetControls.syncPracticePresetUi();
    args.practiceControls.practicePresetControls.updateMicNoiseGateInfo();
    await args.practiceControls.practiceSetupControls.syncMelodyMetronomeRuntime();
    args.practiceControls.practiceSetupControls.applyCurriculumPreset('default');
    args.workflowLayout.workflowLayout.resetMelodyWorkflowEditorState();

    expect(syncPracticePresetUi).toHaveBeenCalledTimes(1);
    expect(updateNoiseGateInfo).toHaveBeenCalledTimes(1);
    expect(deps.state.melodyStringShift).toBe(2);
    expect(deps.state.melodyTransposeSemitones).toBe(4);
    expect(deps.state.showMelodyTabTimeline).toBe(true);
    expect(deps.state.showScrollingTabPanel).toBe(true);
    expect(deps.state.melodyLoopRangeEnabled).toBe(true);
    expect(deps.state.preferredMelodyId).toBe('m1');
    expect(deps.state.isDirectInputMode).toBe(true);
    expect(deps.state.performanceMicLatencyCompensationMs).toBe(35);
    expect(deps.state.autoPlayPromptSound).toBe(true);
    expect(deps.state.sessionPace).toBe('slow');
    expect(deps.state.currentTuningPresetKey).toBe('drop-d');
    expect(deps.state.showMelodyTimelineDetails).toBe(true);
    expect(deps.state.uiWorkflow).toBe('editor');
    expect(deps.state.uiMode).toBe('advanced');
    expect(syncMelodyMetronomeRuntime).toHaveBeenCalledTimes(1);
    expect(applyPreset).toHaveBeenCalledWith('default');
    expect(closeAndResetInputs).toHaveBeenCalledTimes(1);
    expect(resetState).toHaveBeenCalledTimes(1);
    expect(result).toBe(clusterResult);
  });
});
