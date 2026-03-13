import { dom } from '../dom';
import type { MelodyDefinition } from '../melody-library';
import type { MelodyStudyRange } from '../melody-study-range';
import type { CurriculumPresetKey } from '../curriculum-presets';
import type { UiMode } from '../ui-mode';
import type { UiWorkflow } from '../training-workflows';
import { createSessionWorkspaceControlsCluster } from './session-workspace-controls-cluster';

interface SelectedMelodyContextControllerLike {
  getSelectedMelody(): MelodyDefinition | null;
  getSelectedMelodyId(): string;
  syncMetronomeMeterFromSelectedMelody(): void;
  getSelectedMelodyEventCount(): number;
}

interface MelodyPracticeSettingsBridgeControllerLike {
  getStoredMelodyStudyRange(melodyId: string, totalEvents: number): MelodyStudyRange;
  hydrateMelodyTransposeForSelectedMelody(): void;
  hydrateMelodyStringShiftForSelectedMelody(): void;
  hydrateMelodyStudyRangeForSelectedMelody(): void;
  syncMelodyLoopRangeDisplay(): void;
  applyMelodyTransposeSemitones(nextValue: unknown): boolean;
  applyMelodyStringShift(nextValue: unknown): { changed: boolean; valid: boolean };
  applyMelodyStudyRange(range: Partial<MelodyStudyRange>): boolean;
  setStoredMelodyTransposeSemitones(melodyId: string, semitones: number): number;
  refreshMelodyOptionsForCurrentInstrument(): void;
}

interface MelodyTimelineEditingBridgeControllerLike {
  resetState(): void;
  syncState(): void;
}

interface MelodyImportWorkspaceControllerLike {
  closeAndResetInputs(): void;
}

interface CurriculumPresetBridgeControllerLike {
  markAsCustom(): void;
  setPresetInfo(text: string): void;
  applyPreset(key: CurriculumPresetKey): void;
}

interface MelodyTimelineUiControllerLike {
  refreshUi(): void;
}

interface MelodyDemoRuntimeControllerLike {
  stopPlayback(options?: { clearUi?: boolean }): void;
  clearPreviewState(): void;
  isActive(): boolean;
  getClampedBpmFromInput(): number;
  retimePlayback(): boolean;
}

interface MetronomeBridgeControllerLike {
  hydrateMelodyTempoForSelectedMelody(): void;
  syncMelodyTimelineZoomDisplay(): void;
  syncScrollingTabZoomDisplay(): void;
  persistSelectedMelodyTempoOverride(): void;
  syncMetronomeTempoFromMelodyIfLinked(): Promise<void>;
  syncHiddenMetronomeTempoFromSharedTempo(): void;
  syncMelodyMetronomeRuntime(): Promise<void>;
  renderMetronomeToggleButton(): void;
}

interface MicSettingsControllerLike {
  updateNoiseGateInfo(): void;
}

interface SessionWorkspaceGraphClusterDeps {
  dom: typeof dom;
  state: SessionWorkspaceGraphState;
  saveSettings: () => void;
  handleModeChange: () => void;
  stopListening: () => void;
  refreshDisplayFormatting: () => void;
  setNoteNamingPreference: (preference: string) => void;
  resolveInstrumentById: (instrumentId: string) => { name: string };
  redrawFretboard: () => void;
  updateInstrumentUI: (enabledStrings?: string[], tuningPresetKey?: string) => void;
  loadInstrumentSoundfont: (instrumentName: string) => Promise<void>;
  renderMelodyTabTimelineFromState: () => void;
  setPracticeSetupSummary: (summaryText: string) => void;
  setSessionToolsSummary: (summaryText: string) => void;
  setMelodySetupSummary: (summaryText: string) => void;
  setPracticeSetupCollapsed: (collapsed: boolean) => void;
  setMelodySetupCollapsed: (collapsed: boolean) => void;
  setSessionToolsCollapsed: (collapsed: boolean) => void;
  setLayoutControlsExpanded: (expanded: boolean) => void;
  toggleLayoutControlsExpanded: () => void;
  setUiWorkflow: (workflow: UiWorkflow) => void;
  setUiMode: (mode: UiMode) => void;
  setResultMessage: (message: string, tone?: 'success' | 'error') => void;
  refreshLayoutControlsVisibility: () => void;
  refreshMicPerformanceReadinessUi: () => void;
  getEnabledStringsCount: () => number;
  getEnabledStrings: () => string[];
  listMelodiesForCurrentInstrument: () => MelodyDefinition[];
  getAdjustedMelody: (melody: MelodyDefinition, stringShift: number) => MelodyDefinition;
  isStringShiftFeasible: (melody: MelodyDefinition, nextShift: number) => boolean;
  isDefaultStudyRange: (totalEvents: number) => boolean;
  isMelodyWorkflowMode: (mode: string) => boolean;
  isCustomMelodyId: (melodyId: string) => boolean;
  formatMelodyStudyRange: (melody: MelodyDefinition) => string;
  formatMelodyTransposeSemitones: (semitones: number) => string;
  formatMelodyStringShift: (shift: number) => string;
  normalizeMelodyTransposeSemitones: (value: unknown) => number;
  normalizeMelodyStringShift: (value: unknown) => number;
  hasCompletedOnboarding: () => boolean;
  confirmUserAction: (message: string) => Promise<boolean>;
  selectedMelodyContextController: SelectedMelodyContextControllerLike;
  melodyPracticeSettingsBridgeController: MelodyPracticeSettingsBridgeControllerLike;
  melodyTimelineEditingBridgeController: MelodyTimelineEditingBridgeControllerLike;
  melodyImportWorkspaceController: MelodyImportWorkspaceControllerLike;
  curriculumPresetBridgeController: CurriculumPresetBridgeControllerLike;
  melodyTimelineUiController: MelodyTimelineUiControllerLike;
  melodyDemoRuntimeController: MelodyDemoRuntimeControllerLike;
  metronomeBridgeController: MetronomeBridgeControllerLike;
  micSettingsController: MicSettingsControllerLike;
}

type SessionWorkspaceControlsClusterDeps = Parameters<
  typeof createSessionWorkspaceControlsCluster
>[0];

type PracticePresetUiControllerRef = { syncPracticePresetUi(): void } | null;
type SessionWorkspaceWorkflowLayoutState =
  SessionWorkspaceControlsClusterDeps['workflowLayout']['workflowLayout']['state'];
type SessionWorkspaceWorkflowLayoutControlsState =
  SessionWorkspaceControlsClusterDeps['workflowLayout']['workflowLayoutControls']['state'];
type SessionWorkspaceWorkflowLayoutSectionState =
  SessionWorkspaceWorkflowLayoutState & SessionWorkspaceWorkflowLayoutControlsState;
type SessionWorkspaceMelodySetupUiState =
  SessionWorkspaceControlsClusterDeps['setupUi']['melodySetupUi']['state'];
type SessionWorkspacePracticeSetupSummaryState =
  SessionWorkspaceControlsClusterDeps['setupUi']['practiceSetupSummary']['state'];
type SessionWorkspacePracticePresetUiState =
  SessionWorkspaceControlsClusterDeps['setupUi']['practicePresetUi']['state'];
type SessionWorkspacePracticeSetupControlsState =
  SessionWorkspaceControlsClusterDeps['practiceControls']['practiceSetupControls']['state'];
type SessionWorkspaceInstrumentDisplayControlsState =
  SessionWorkspaceControlsClusterDeps['practiceControls']['instrumentDisplayControls']['state'];
type SessionWorkspacePracticePresetControlsState =
  SessionWorkspaceControlsClusterDeps['practiceControls']['practicePresetControls']['state'];
type SessionWorkspaceMelodyPracticeControlsState =
  SessionWorkspaceControlsClusterDeps['melodyWorkflow']['melodyPracticeControls']['state'];
type SessionWorkspaceMelodySelectionState =
  SessionWorkspaceControlsClusterDeps['melodyWorkflow']['melodySelection']['state'];
type SessionWorkspaceMelodySetupControlsState =
  SessionWorkspaceControlsClusterDeps['melodyWorkflow']['melodySetupControls']['state'];
type SessionWorkspaceMelodyPracticeActionsState =
  SessionWorkspaceControlsClusterDeps['melodyWorkflow']['melodyPracticeActions']['state'];
type SessionWorkspaceGraphState =
  SessionWorkspaceWorkflowLayoutSectionState
  & SessionWorkspaceMelodySetupUiState
  & SessionWorkspacePracticeSetupSummaryState
  & SessionWorkspacePracticePresetUiState
  & SessionWorkspacePracticeSetupControlsState
  & SessionWorkspaceInstrumentDisplayControlsState
  & SessionWorkspacePracticePresetControlsState
  & SessionWorkspaceMelodyPracticeControlsState
  & SessionWorkspaceMelodySelectionState
  & SessionWorkspaceMelodySetupControlsState
  & SessionWorkspaceMelodyPracticeActionsState;
type SessionWorkspaceSetupUiContextState =
  SessionWorkspaceMelodySetupUiState
  & SessionWorkspacePracticeSetupSummaryState
  & SessionWorkspacePracticePresetUiState;
type SessionWorkspaceMelodyWorkflowContextState =
  SessionWorkspaceMelodySetupControlsState
  & SessionWorkspaceMelodyPracticeActionsState
  & SessionWorkspaceMelodyPracticeControlsState
  & SessionWorkspaceMelodySelectionState;
type SessionWorkspacePracticeControlsContextState =
  SessionWorkspacePracticePresetControlsState
  & SessionWorkspacePracticeSetupControlsState
  & SessionWorkspaceInstrumentDisplayControlsState;
type SessionWorkspaceSetupUiContextDeps = Pick<
  SessionWorkspaceGraphClusterDeps,
  | 'dom'
  | 'state'
  | 'getEnabledStringsCount'
  | 'listMelodiesForCurrentInstrument'
  | 'getAdjustedMelody'
  | 'isStringShiftFeasible'
  | 'isMelodyWorkflowMode'
  | 'isCustomMelodyId'
  | 'isDefaultStudyRange'
  | 'renderMelodyTabTimelineFromState'
  | 'setPracticeSetupSummary'
  | 'setSessionToolsSummary'
  | 'setMelodySetupSummary'
  | 'formatMelodyStudyRange'
  | 'formatMelodyTransposeSemitones'
  | 'formatMelodyStringShift'
  | 'hasCompletedOnboarding'
  | 'selectedMelodyContextController'
  | 'melodyDemoRuntimeController'
>;
type SessionWorkspaceWorkflowLayoutContextDeps = Pick<
  SessionWorkspaceGraphClusterDeps,
  | 'dom'
  | 'state'
  | 'saveSettings'
  | 'handleModeChange'
  | 'stopListening'
  | 'setPracticeSetupCollapsed'
  | 'setMelodySetupCollapsed'
  | 'setSessionToolsCollapsed'
  | 'setLayoutControlsExpanded'
  | 'toggleLayoutControlsExpanded'
  | 'setUiWorkflow'
  | 'setUiMode'
  | 'listMelodiesForCurrentInstrument'
  | 'selectedMelodyContextController'
  | 'melodyImportWorkspaceController'
  | 'melodyTimelineEditingBridgeController'
  | 'melodyDemoRuntimeController'
>;
type SessionWorkspaceMelodyWorkflowContextDeps = Pick<
  SessionWorkspaceGraphClusterDeps,
  | 'dom'
  | 'state'
  | 'saveSettings'
  | 'stopListening'
  | 'redrawFretboard'
  | 'setResultMessage'
  | 'refreshLayoutControlsVisibility'
  | 'renderMelodyTabTimelineFromState'
  | 'listMelodiesForCurrentInstrument'
  | 'isMelodyWorkflowMode'
  | 'isCustomMelodyId'
  | 'formatMelodyTransposeSemitones'
  | 'normalizeMelodyTransposeSemitones'
  | 'normalizeMelodyStringShift'
  | 'confirmUserAction'
  | 'selectedMelodyContextController'
  | 'melodyPracticeSettingsBridgeController'
  | 'melodyTimelineEditingBridgeController'
  | 'melodyImportWorkspaceController'
  | 'curriculumPresetBridgeController'
  | 'melodyTimelineUiController'
  | 'melodyDemoRuntimeController'
  | 'metronomeBridgeController'
>;
type SessionWorkspacePracticeControlsContextDeps = Pick<
  SessionWorkspaceGraphClusterDeps,
  | 'dom'
  | 'state'
  | 'saveSettings'
  | 'handleModeChange'
  | 'stopListening'
  | 'refreshDisplayFormatting'
  | 'setNoteNamingPreference'
  | 'resolveInstrumentById'
  | 'redrawFretboard'
  | 'updateInstrumentUI'
  | 'loadInstrumentSoundfont'
  | 'setResultMessage'
  | 'refreshMicPerformanceReadinessUi'
  | 'getEnabledStrings'
  | 'selectedMelodyContextController'
  | 'melodyTimelineEditingBridgeController'
  | 'curriculumPresetBridgeController'
  | 'melodyTimelineUiController'
  | 'melodyDemoRuntimeController'
  | 'metronomeBridgeController'
  | 'micSettingsController'
>;
type SetupUiBuilderContext = ReturnType<typeof createSetupUiContext>;
type WorkflowLayoutBuilderContext = ReturnType<typeof createWorkflowLayoutContext>;
type MelodyWorkflowBuilderContext = ReturnType<typeof createMelodyWorkflowContext>;
type PracticeControlsBuilderContext = ReturnType<typeof createPracticeControlsContext>;

function createSetupUiContextState(
  state: SessionWorkspaceSetupUiContextState
): SessionWorkspaceSetupUiContextState {
  return state;
}

function createMelodyWorkflowContextState(
  state: SessionWorkspaceMelodyWorkflowContextState
): SessionWorkspaceMelodyWorkflowContextState {
  return state;
}

function createPracticeControlsContextState(
  state: SessionWorkspacePracticeControlsContextState
): SessionWorkspacePracticeControlsContextState {
  return state;
}

function createSetupUiContext(deps: SessionWorkspaceSetupUiContextDeps) {
  return {
    dom: deps.dom,
    state: createSetupUiContextState(deps.state),
    getEnabledStringsCount: deps.getEnabledStringsCount,
    listMelodiesForCurrentInstrument: deps.listMelodiesForCurrentInstrument,
    getAdjustedMelody: deps.getAdjustedMelody,
    isStringShiftFeasible: deps.isStringShiftFeasible,
    isMelodyWorkflowMode: deps.isMelodyWorkflowMode,
    isCustomMelodyId: deps.isCustomMelodyId,
    isDefaultStudyRange: deps.isDefaultStudyRange,
    renderMelodyTabTimelineFromState: deps.renderMelodyTabTimelineFromState,
    setPracticeSetupSummary: deps.setPracticeSetupSummary,
    setSessionToolsSummary: deps.setSessionToolsSummary,
    setMelodySetupSummary: deps.setMelodySetupSummary,
    formatMelodyStudyRange: deps.formatMelodyStudyRange,
    formatMelodyTransposeSemitones: deps.formatMelodyTransposeSemitones,
    formatMelodyStringShift: deps.formatMelodyStringShift,
    hasCompletedOnboarding: deps.hasCompletedOnboarding,
    selectedMelodyContextController: deps.selectedMelodyContextController,
    melodyDemoRuntimeController: deps.melodyDemoRuntimeController,
  };
}

function createWorkflowLayoutState(
  state: SessionWorkspaceWorkflowLayoutState
): SessionWorkspaceWorkflowLayoutState {
  const workflowLayoutState = {} as SessionWorkspaceWorkflowLayoutState;

  Object.defineProperties(workflowLayoutState, {
    uiWorkflow: {
      enumerable: true,
      get: () => state.uiWorkflow,
      set: (value: SessionWorkspaceWorkflowLayoutState['uiWorkflow']) => {
        state.uiWorkflow = value;
      },
    },
  });

  return workflowLayoutState;
}

function createWorkflowLayoutControlsState(
  state: SessionWorkspaceWorkflowLayoutControlsState
): SessionWorkspaceWorkflowLayoutControlsState {
  const workflowLayoutControlsState = {} as SessionWorkspaceWorkflowLayoutControlsState;

  Object.defineProperties(workflowLayoutControlsState, {
    uiWorkflow: {
      enumerable: true,
      get: () => state.uiWorkflow,
      set: (value: SessionWorkspaceWorkflowLayoutControlsState['uiWorkflow']) => {
        state.uiWorkflow = value;
      },
    },
    uiMode: {
      enumerable: true,
      get: () => state.uiMode,
      set: (value: SessionWorkspaceWorkflowLayoutControlsState['uiMode']) => {
        state.uiMode = value;
      },
    },
    isListening: {
      enumerable: true,
      get: () => state.isListening,
    },
  });

  return workflowLayoutControlsState;
}

function createWorkflowLayoutContext(deps: SessionWorkspaceWorkflowLayoutContextDeps) {
  return {
    dom: deps.dom,
    state: createWorkflowLayoutState(deps.state),
    controlsState: createWorkflowLayoutControlsState(deps.state),
    saveSettings: deps.saveSettings,
    handleModeChange: deps.handleModeChange,
    stopListening: deps.stopListening,
    setPracticeSetupCollapsed: deps.setPracticeSetupCollapsed,
    setMelodySetupCollapsed: deps.setMelodySetupCollapsed,
    setSessionToolsCollapsed: deps.setSessionToolsCollapsed,
    setLayoutControlsExpanded: deps.setLayoutControlsExpanded,
    toggleLayoutControlsExpanded: deps.toggleLayoutControlsExpanded,
    setUiWorkflow: deps.setUiWorkflow,
    setUiMode: deps.setUiMode,
    listMelodiesForCurrentInstrument: deps.listMelodiesForCurrentInstrument,
    selectedMelodyContextController: deps.selectedMelodyContextController,
    melodyImportWorkspaceController: deps.melodyImportWorkspaceController,
    melodyTimelineEditingBridgeController: deps.melodyTimelineEditingBridgeController,
    melodyDemoRuntimeController: deps.melodyDemoRuntimeController,
  };
}

function createMelodyWorkflowContext(deps: SessionWorkspaceMelodyWorkflowContextDeps) {
  return {
    dom: deps.dom,
    state: createMelodyWorkflowContextState(deps.state),
    saveSettings: deps.saveSettings,
    stopListening: deps.stopListening,
    redrawFretboard: deps.redrawFretboard,
    setResultMessage: deps.setResultMessage,
    refreshLayoutControlsVisibility: deps.refreshLayoutControlsVisibility,
    renderMelodyTabTimelineFromState: deps.renderMelodyTabTimelineFromState,
    listMelodiesForCurrentInstrument: deps.listMelodiesForCurrentInstrument,
    isMelodyWorkflowMode: deps.isMelodyWorkflowMode,
    isCustomMelodyId: deps.isCustomMelodyId,
    formatMelodyTransposeSemitones: deps.formatMelodyTransposeSemitones,
    normalizeMelodyTransposeSemitones: deps.normalizeMelodyTransposeSemitones,
    normalizeMelodyStringShift: deps.normalizeMelodyStringShift,
    confirmUserAction: deps.confirmUserAction,
    selectedMelodyContextController: deps.selectedMelodyContextController,
    melodyPracticeSettingsBridgeController: deps.melodyPracticeSettingsBridgeController,
    melodyTimelineEditingBridgeController: deps.melodyTimelineEditingBridgeController,
    melodyImportWorkspaceController: deps.melodyImportWorkspaceController,
    curriculumPresetBridgeController: deps.curriculumPresetBridgeController,
    melodyTimelineUiController: deps.melodyTimelineUiController,
    melodyDemoRuntimeController: deps.melodyDemoRuntimeController,
    metronomeBridgeController: deps.metronomeBridgeController,
  };
}

function createPracticeControlsContext(deps: SessionWorkspacePracticeControlsContextDeps) {
  return {
    dom: deps.dom,
    state: createPracticeControlsContextState(deps.state),
    saveSettings: deps.saveSettings,
    handleModeChange: deps.handleModeChange,
    stopListening: deps.stopListening,
    refreshDisplayFormatting: deps.refreshDisplayFormatting,
    setNoteNamingPreference: deps.setNoteNamingPreference,
    resolveInstrumentById: deps.resolveInstrumentById,
    redrawFretboard: deps.redrawFretboard,
    updateInstrumentUI: deps.updateInstrumentUI,
    loadInstrumentSoundfont: deps.loadInstrumentSoundfont,
    setResultMessage: deps.setResultMessage,
    refreshMicPerformanceReadinessUi: deps.refreshMicPerformanceReadinessUi,
    getEnabledStrings: deps.getEnabledStrings,
    selectedMelodyContextController: deps.selectedMelodyContextController,
    melodyTimelineEditingBridgeController: deps.melodyTimelineEditingBridgeController,
    curriculumPresetBridgeController: deps.curriculumPresetBridgeController,
    melodyTimelineUiController: deps.melodyTimelineUiController,
    melodyDemoRuntimeController: deps.melodyDemoRuntimeController,
    metronomeBridgeController: deps.metronomeBridgeController,
    micSettingsController: deps.micSettingsController,
  };
}

function createMelodySetupUiState(
  state: SessionWorkspaceMelodySetupUiState
): SessionWorkspaceMelodySetupUiState {
  const melodySetupUiState = {} as SessionWorkspaceMelodySetupUiState;

  Object.defineProperties(melodySetupUiState, {
    currentInstrument: { enumerable: true, get: () => state.currentInstrument },
    melodyTransposeSemitones: {
      enumerable: true,
      get: () => state.melodyTransposeSemitones,
      set: (value: SessionWorkspaceMelodySetupUiState['melodyTransposeSemitones']) => {
        state.melodyTransposeSemitones = value;
      },
    },
    melodyStringShift: {
      enumerable: true,
      get: () => state.melodyStringShift,
      set: (value: SessionWorkspaceMelodySetupUiState['melodyStringShift']) => {
        state.melodyStringShift = value;
      },
    },
    melodyStudyRangeStartIndex: {
      enumerable: true,
      get: () => state.melodyStudyRangeStartIndex,
      set: (value: SessionWorkspaceMelodySetupUiState['melodyStudyRangeStartIndex']) => {
        state.melodyStudyRangeStartIndex = value;
      },
    },
    melodyStudyRangeEndIndex: {
      enumerable: true,
      get: () => state.melodyStudyRangeEndIndex,
      set: (value: SessionWorkspaceMelodySetupUiState['melodyStudyRangeEndIndex']) => {
        state.melodyStudyRangeEndIndex = value;
      },
    },
  });

  return melodySetupUiState;
}

function createPracticeSetupSummaryState(
  state: SessionWorkspacePracticeSetupSummaryState
): SessionWorkspacePracticeSetupSummaryState {
  const practiceSetupSummaryState = {} as SessionWorkspacePracticeSetupSummaryState;

  Object.defineProperties(practiceSetupSummaryState, {
    currentInstrument: { enumerable: true, get: () => state.currentInstrument },
    melodyTransposeSemitones: { enumerable: true, get: () => state.melodyTransposeSemitones },
    melodyStringShift: { enumerable: true, get: () => state.melodyStringShift },
    melodyLoopRangeEnabled: {
      enumerable: true,
      get: () => state.melodyLoopRangeEnabled,
      set: (value: SessionWorkspacePracticeSetupSummaryState['melodyLoopRangeEnabled']) => {
        state.melodyLoopRangeEnabled = value;
      },
    },
  });

  return practiceSetupSummaryState;
}

function createPracticePresetUiState(
  state: SessionWorkspacePracticePresetUiState
): SessionWorkspacePracticePresetUiState {
  const practicePresetUiState = {} as SessionWorkspacePracticePresetUiState;

  Object.defineProperties(practicePresetUiState, {
    micSensitivityPreset: {
      enumerable: true,
      get: () => state.micSensitivityPreset,
      set: (value: SessionWorkspacePracticePresetUiState['micSensitivityPreset']) => {
        state.micSensitivityPreset = value as SessionWorkspacePracticePresetUiState['micSensitivityPreset'];
      },
    },
    micNoteAttackFilterPreset: {
      enumerable: true,
      get: () => state.micNoteAttackFilterPreset,
      set: (value: SessionWorkspacePracticePresetUiState['micNoteAttackFilterPreset']) => {
        state.micNoteAttackFilterPreset = value as SessionWorkspacePracticePresetUiState['micNoteAttackFilterPreset'];
      },
    },
    micNoteHoldFilterPreset: {
      enumerable: true,
      get: () => state.micNoteHoldFilterPreset,
      set: (value: SessionWorkspacePracticePresetUiState['micNoteHoldFilterPreset']) => {
        state.micNoteHoldFilterPreset = value as SessionWorkspacePracticePresetUiState['micNoteHoldFilterPreset'];
      },
    },
    isDirectInputMode: {
      enumerable: true,
      get: () => state.isDirectInputMode,
      set: (value: SessionWorkspacePracticePresetUiState['isDirectInputMode']) => {
        state.isDirectInputMode = value;
      },
    },
    performanceMicTolerancePreset: {
      enumerable: true,
      get: () => state.performanceMicTolerancePreset,
      set: (value: SessionWorkspacePracticePresetUiState['performanceMicTolerancePreset']) => {
        state.performanceMicTolerancePreset = value as SessionWorkspacePracticePresetUiState['performanceMicTolerancePreset'];
      },
    },
    performanceTimingLeniencyPreset: {
      enumerable: true,
      get: () => state.performanceTimingLeniencyPreset,
      set: (value: SessionWorkspacePracticePresetUiState['performanceTimingLeniencyPreset']) => {
        state.performanceTimingLeniencyPreset = value as SessionWorkspacePracticePresetUiState['performanceTimingLeniencyPreset'];
      },
    },
    uiWorkflow: {
      enumerable: true,
      get: () => state.uiWorkflow,
      set: (value: SessionWorkspacePracticePresetUiState['uiWorkflow']) => {
        state.uiWorkflow = value;
      },
    },
  });

  return practicePresetUiState;
}

function buildSetupUi(
  deps: SetupUiBuilderContext
): SessionWorkspaceControlsClusterDeps['setupUi'] {
  const melodySetupUiState = createMelodySetupUiState(deps.state);
  const practiceSetupSummaryState = createPracticeSetupSummaryState(deps.state);
  const practicePresetUiState = createPracticePresetUiState(deps.state);

  return {
    melodySetupUi: {
      dom: {
        trainingMode: deps.dom.trainingMode,
        melodyPlaybackControls: deps.dom.melodyPlaybackControls,
        editMelodyBtn: deps.dom.editMelodyBtn,
        exportMelodyMidiBtn: deps.dom.exportMelodyMidiBtn,
        bakePracticeMelodyBtn: deps.dom.bakePracticeMelodyBtn,
        melodyDemoBtn: deps.dom.melodyDemoBtn,
        melodyStepBackBtn: deps.dom.melodyStepBackBtn,
        melodyStepForwardBtn: deps.dom.melodyStepForwardBtn,
        melodyTransposeResetBtn: deps.dom.melodyTransposeResetBtn,
        melodyStringShiftResetBtn: deps.dom.melodyStringShiftResetBtn,
        melodyTransposeBatchCustomBtn: deps.dom.melodyTransposeBatchCustomBtn,
        melodyStringShift: deps.dom.melodyStringShift,
        melodyStringShiftDownBtn: deps.dom.melodyStringShiftDownBtn,
        melodyStringShiftUpBtn: deps.dom.melodyStringShiftUpBtn,
        melodyStudyStart: deps.dom.melodyStudyStart,
        melodyStudyEnd: deps.dom.melodyStudyEnd,
        melodyStudyResetBtn: deps.dom.melodyStudyResetBtn,
        deleteMelodyBtn: deps.dom.deleteMelodyBtn,
      },
      state: melodySetupUiState,
      getSelectedMelody: () => deps.selectedMelodyContextController.getSelectedMelody(),
      getSelectedMelodyId: () => deps.selectedMelodyContextController.getSelectedMelodyId(),
      listMelodies: () => deps.listMelodiesForCurrentInstrument(),
      getAdjustedMelody: deps.getAdjustedMelody,
      isStringShiftFeasible: deps.isStringShiftFeasible,
      isMelodyWorkflowMode: deps.isMelodyWorkflowMode,
      isDemoActive: () => deps.melodyDemoRuntimeController.isActive(),
      isCustomMelodyId: deps.isCustomMelodyId,
      isDefaultStudyRange: deps.isDefaultStudyRange,
      renderTimeline: deps.renderMelodyTabTimelineFromState,
    },
    practiceSetupSummary: {
      dom: {
        trainingMode: deps.dom.trainingMode,
        difficulty: deps.dom.difficulty,
        curriculumPreset: deps.dom.curriculumPreset,
        sessionGoal: deps.dom.sessionGoal,
        sessionPace: deps.dom.sessionPace,
        startFret: deps.dom.startFret,
        endFret: deps.dom.endFret,
        stringSelector: deps.dom.stringSelector,
        scaleSelector: deps.dom.scaleSelector,
        chordSelector: deps.dom.chordSelector,
        progressionSelector: deps.dom.progressionSelector,
        arpeggioPatternSelector: deps.dom.arpeggioPatternSelector,
        melodySelector: deps.dom.melodySelector,
        melodyShowNote: deps.dom.melodyShowNote,
      },
      state: practiceSetupSummaryState,
      getEnabledStringsCount: () => deps.getEnabledStringsCount(),
      getSelectedMelody: () => deps.selectedMelodyContextController.getSelectedMelody(),
      getStoredMelodyStudyRangeText: (melody) => deps.formatMelodyStudyRange(melody),
      isMelodyWorkflowMode: deps.isMelodyWorkflowMode,
      formatMelodyTransposeSemitones: deps.formatMelodyTransposeSemitones,
      formatMelodyStringShift: deps.formatMelodyStringShift,
      setPracticeSetupSummary: deps.setPracticeSetupSummary,
      setSessionToolsSummary: deps.setSessionToolsSummary,
      setMelodySetupSummary: deps.setMelodySetupSummary,
    },
    practicePresetUi: {
      dom: deps.dom,
      state: practicePresetUiState,
      hasCompletedOnboarding: deps.hasCompletedOnboarding,
    },
  };
}

function buildWorkflowLayout(
  deps: WorkflowLayoutBuilderContext
): SessionWorkspaceControlsClusterDeps['workflowLayout'] {
  return {
    workflowLayout: {
      dom: deps.dom,
      state: deps.state,
      setUiWorkflow: deps.setUiWorkflow,
      setPracticeSetupCollapsed: deps.setPracticeSetupCollapsed,
      setMelodySetupCollapsed: deps.setMelodySetupCollapsed,
      setSessionToolsCollapsed: deps.setSessionToolsCollapsed,
      setLayoutControlsExpanded: deps.setLayoutControlsExpanded,
      handleModeChange: deps.handleModeChange,
      resetMelodyWorkflowEditorState: () => {
        deps.melodyImportWorkspaceController.closeAndResetInputs();
        deps.melodyTimelineEditingBridgeController.resetState();
      },
      getSelectedMelodyId: () => deps.selectedMelodyContextController.getSelectedMelodyId(),
      getAvailableMelodyCount: () => deps.listMelodiesForCurrentInstrument().length,
    },
    workflow: {
      dom: {
        melodySelector: deps.dom.melodySelector,
      },
      listAvailableMelodyIds: () => deps.listMelodiesForCurrentInstrument().map((entry) => entry.id),
    },
    workflowLayoutControls: {
      dom: deps.dom,
      state: deps.controlsState,
      toggleLayoutControlsExpanded: deps.toggleLayoutControlsExpanded,
      stopMelodyDemoPlayback: ({ clearUi }) =>
        deps.melodyDemoRuntimeController.stopPlayback({ clearUi }),
      stopListening: deps.stopListening,
      saveSettings: deps.saveSettings,
      setUiMode: deps.setUiMode,
      openMelodyImport: () => deps.dom.openMelodyImportBtn.click(),
    },
  };
}

function createMelodyPracticeControlsState(
  state: SessionWorkspaceMelodyPracticeControlsState
): SessionWorkspaceMelodyPracticeControlsState {
  const melodyPracticeControlsState = {} as SessionWorkspaceMelodyPracticeControlsState;

  Object.defineProperties(melodyPracticeControlsState, {
    melodyTransposeSemitones: {
      enumerable: true,
      get: () => state.melodyTransposeSemitones,
      set: (value: SessionWorkspaceMelodyPracticeControlsState['melodyTransposeSemitones']) => {
        state.melodyTransposeSemitones = value;
      },
    },
    melodyStringShift: {
      enumerable: true,
      get: () => state.melodyStringShift,
      set: (value: SessionWorkspaceMelodyPracticeControlsState['melodyStringShift']) => {
        state.melodyStringShift = value;
      },
    },
  });

  return melodyPracticeControlsState;
}

function createMelodySelectionState(
  state: SessionWorkspaceMelodySelectionState
): SessionWorkspaceMelodySelectionState {
  const melodySelectionState = {} as SessionWorkspaceMelodySelectionState;

  Object.defineProperties(melodySelectionState, {
    preferredMelodyId: {
      enumerable: true,
      get: () => state.preferredMelodyId,
      set: (value: SessionWorkspaceMelodySelectionState['preferredMelodyId']) => {
        state.preferredMelodyId = value;
      },
    },
  });

  return melodySelectionState;
}

function createMelodySetupControlsState(
  state: SessionWorkspaceMelodySetupControlsState
): SessionWorkspaceMelodySetupControlsState {
  const melodySetupControlsState = {} as SessionWorkspaceMelodySetupControlsState;

  Object.defineProperties(melodySetupControlsState, {
    preferredMelodyId: {
      enumerable: true,
      get: () => state.preferredMelodyId,
      set: (value: SessionWorkspaceMelodySetupControlsState['preferredMelodyId']) => {
        state.preferredMelodyId = value;
      },
    },
    isListening: {
      enumerable: true,
      get: () => state.isListening,
    },
    showMelodyTabTimeline: {
      enumerable: true,
      get: () => state.showMelodyTabTimeline,
      set: (value: SessionWorkspaceMelodySetupControlsState['showMelodyTabTimeline']) => {
        state.showMelodyTabTimeline = value;
      },
    },
    showScrollingTabPanel: {
      enumerable: true,
      get: () => state.showScrollingTabPanel,
      set: (value: SessionWorkspaceMelodySetupControlsState['showScrollingTabPanel']) => {
        state.showScrollingTabPanel = value;
      },
    },
    melodyLoopRangeEnabled: {
      enumerable: true,
      get: () => state.melodyLoopRangeEnabled,
      set: (value: SessionWorkspaceMelodySetupControlsState['melodyLoopRangeEnabled']) => {
        state.melodyLoopRangeEnabled = value;
      },
    },
  });

  return melodySetupControlsState;
}

function createMelodyPracticeActionsState(
  state: SessionWorkspaceMelodyPracticeActionsState
): SessionWorkspaceMelodyPracticeActionsState {
  const melodyPracticeActionsState = {} as SessionWorkspaceMelodyPracticeActionsState;

  Object.defineProperties(melodyPracticeActionsState, {
    isListening: {
      enumerable: true,
      get: () => state.isListening,
    },
    melodyTransposeSemitones: {
      enumerable: true,
      get: () => state.melodyTransposeSemitones,
      set: (value: SessionWorkspaceMelodyPracticeActionsState['melodyTransposeSemitones']) => {
        state.melodyTransposeSemitones = value;
      },
    },
  });

  return melodyPracticeActionsState;
}

function buildMelodyWorkflow(
  deps: MelodyWorkflowBuilderContext
): SessionWorkspaceControlsClusterDeps['melodyWorkflow'] {
  const melodySetupControlsState = createMelodySetupControlsState(deps.state);
  const melodyPracticeActionsState = createMelodyPracticeActionsState(deps.state);
  const melodyPracticeControlsState = createMelodyPracticeControlsState(deps.state);
  const melodySelectionState = createMelodySelectionState(deps.state);

  return {
    melodySetupControls: {
      dom: deps.dom,
      state: melodySetupControlsState,
      stopMelodyDemoPlayback: ({ clearUi }) =>
        deps.melodyDemoRuntimeController.stopPlayback({ clearUi }),
      markCurriculumPresetAsCustom: () => deps.curriculumPresetBridgeController.markAsCustom(),
      resetMelodyTimelineEditingState: () => deps.melodyTimelineEditingBridgeController.resetState(),
      hydrateMelodyTransposeForSelectedMelody: () =>
        deps.melodyPracticeSettingsBridgeController.hydrateMelodyTransposeForSelectedMelody(),
      hydrateMelodyStringShiftForSelectedMelody: () =>
        deps.melodyPracticeSettingsBridgeController.hydrateMelodyStringShiftForSelectedMelody(),
      hydrateMelodyStudyRangeForSelectedMelody: () =>
        deps.melodyPracticeSettingsBridgeController.hydrateMelodyStudyRangeForSelectedMelody(),
      hydrateMelodyTempoForSelectedMelody: () =>
        deps.metronomeBridgeController.hydrateMelodyTempoForSelectedMelody(),
      syncMetronomeMeterFromSelectedMelody: () =>
        deps.selectedMelodyContextController.syncMetronomeMeterFromSelectedMelody(),
      clearMelodyDemoPreviewState: () => deps.melodyDemoRuntimeController.clearPreviewState(),
      isMelodyWorkflowMode: deps.isMelodyWorkflowMode,
      stopListening: deps.stopListening,
      setResultMessage: deps.setResultMessage,
      saveSettings: deps.saveSettings,
      refreshMelodyTimelineUi: () => deps.melodyTimelineUiController.refreshUi(),
      refreshLayoutControlsVisibility: deps.refreshLayoutControlsVisibility,
      syncMelodyTimelineZoomDisplay: () =>
        deps.metronomeBridgeController.syncMelodyTimelineZoomDisplay(),
      syncScrollingTabZoomDisplay: () =>
        deps.metronomeBridgeController.syncScrollingTabZoomDisplay(),
      syncMelodyLoopRangeDisplay: () =>
        deps.melodyPracticeSettingsBridgeController.syncMelodyLoopRangeDisplay(),
      clampMelodyDemoBpmInput: () => {
        deps.melodyDemoRuntimeController.getClampedBpmFromInput();
      },
      persistSelectedMelodyTempoOverride: () =>
        deps.metronomeBridgeController.persistSelectedMelodyTempoOverride(),
      syncMetronomeTempoFromMelodyIfLinked: () =>
        deps.metronomeBridgeController.syncMetronomeTempoFromMelodyIfLinked(),
      retimeMelodyDemoPlayback: () => deps.melodyDemoRuntimeController.retimePlayback(),
      getSelectedMelodyEventCount: () =>
        deps.selectedMelodyContextController.getSelectedMelodyEventCount(),
    },
    melodyPracticeActions: {
      dom: {
        trainingMode: deps.dom.trainingMode,
      },
      state: melodyPracticeActionsState,
      isMelodyWorkflowMode: deps.isMelodyWorkflowMode,
      stopMelodyDemoPlayback: (options) => deps.melodyDemoRuntimeController.stopPlayback(options),
      stopListening: deps.stopListening,
      markCurriculumPresetAsCustom: () => deps.curriculumPresetBridgeController.markAsCustom(),
      saveSettings: deps.saveSettings,
      redrawFretboard: deps.redrawFretboard,
      refreshMelodyTimelineUi: () => deps.melodyTimelineUiController.refreshUi(),
      setResultMessage: deps.setResultMessage,
      applyMelodyTransposeSemitones: (nextValue) =>
        deps.melodyPracticeSettingsBridgeController.applyMelodyTransposeSemitones(nextValue),
      applyMelodyStringShift: (nextValue) =>
        deps.melodyPracticeSettingsBridgeController.applyMelodyStringShift(nextValue),
      applyMelodyStudyRange: (range) =>
        deps.melodyPracticeSettingsBridgeController.applyMelodyStudyRange(range),
      listCustomMelodies: () =>
        deps.listMelodiesForCurrentInstrument().filter((entry) => entry.source === 'custom'),
      setStoredMelodyTransposeSemitones: (melodyId, semitones) =>
        deps.melodyPracticeSettingsBridgeController.setStoredMelodyTransposeSemitones(
          melodyId,
          semitones
        ),
      hydrateMelodyTransposeForSelectedMelody: () =>
        deps.melodyPracticeSettingsBridgeController.hydrateMelodyTransposeForSelectedMelody(),
      formatMelodyTransposeSemitones: deps.formatMelodyTransposeSemitones,
      confirmUserAction: deps.confirmUserAction,
    },
    melodyPracticeControls: {
      dom: deps.dom,
      state: melodyPracticeControlsState,
      normalizeMelodyTransposeSemitones: deps.normalizeMelodyTransposeSemitones,
      normalizeMelodyStringShift: deps.normalizeMelodyStringShift,
      stopMelodyDemoPlayback: ({ clearUi }) =>
        deps.melodyDemoRuntimeController.stopPlayback({ clearUi }),
    },
    melodySelection: {
      dom: {
        melodySelector: deps.dom.melodySelector,
        melodyNameInput: deps.dom.melodyNameInput,
        melodyAsciiTabInput: deps.dom.melodyAsciiTabInput,
      },
      state: melodySelectionState,
      refreshPracticeMelodyOptions: () =>
        deps.melodyPracticeSettingsBridgeController.refreshMelodyOptionsForCurrentInstrument(),
      hydrateMelodyTransposeForSelectedMelody: () =>
        deps.melodyPracticeSettingsBridgeController.hydrateMelodyTransposeForSelectedMelody(),
      hydrateMelodyStringShiftForSelectedMelody: () =>
        deps.melodyPracticeSettingsBridgeController.hydrateMelodyStringShiftForSelectedMelody(),
      hydrateMelodyStudyRangeForSelectedMelody: () =>
        deps.melodyPracticeSettingsBridgeController.hydrateMelodyStudyRangeForSelectedMelody(),
      hydrateMelodyTempoForSelectedMelody: () =>
        deps.metronomeBridgeController.hydrateMelodyTempoForSelectedMelody(),
      clearMelodyDemoPreviewState: () => deps.melodyDemoRuntimeController.clearPreviewState(),
      resetMelodyTimelineEditingState: () => deps.melodyTimelineEditingBridgeController.resetState(),
      closeMelodyImportModal: () => deps.melodyImportWorkspaceController.closeAndResetInputs(),
      markCurriculumPresetAsCustom: () => deps.curriculumPresetBridgeController.markAsCustom(),
      saveSettings: deps.saveSettings,
      setResultMessage: deps.setResultMessage,
      renderMelodyTabTimeline: deps.renderMelodyTabTimelineFromState,
      syncMelodyTimelineEditingState: () => deps.melodyTimelineEditingBridgeController.syncState(),
    },
  };
}

function createPracticeSetupControlsState(
  state: SessionWorkspacePracticeSetupControlsState
): SessionWorkspacePracticeSetupControlsState {
  const practiceSetupControlsState = {} as SessionWorkspacePracticeSetupControlsState;

  Object.defineProperties(practiceSetupControlsState, {
    uiWorkflow: {
      enumerable: true,
      get: () => state.uiWorkflow,
      set: (value: SessionWorkspacePracticeSetupControlsState['uiWorkflow']) => {
        state.uiWorkflow = value;
      },
    },
    showingAllNotes: {
      enumerable: true,
      get: () => state.showingAllNotes,
      set: (value: SessionWorkspacePracticeSetupControlsState['showingAllNotes']) => {
        state.showingAllNotes = value;
      },
    },
    autoPlayPromptSound: {
      enumerable: true,
      get: () => state.autoPlayPromptSound,
      set: (value: SessionWorkspacePracticeSetupControlsState['autoPlayPromptSound']) => {
        state.autoPlayPromptSound = value;
      },
    },
    promptSoundTailMs: {
      enumerable: true,
      get: () => state.promptSoundTailMs,
      set: (value: SessionWorkspacePracticeSetupControlsState['promptSoundTailMs']) => {
        state.promptSoundTailMs = value;
      },
    },
    relaxPerformanceOctaveCheck: {
      enumerable: true,
      get: () => state.relaxPerformanceOctaveCheck,
      set: (value: SessionWorkspacePracticeSetupControlsState['relaxPerformanceOctaveCheck']) => {
        state.relaxPerformanceOctaveCheck = value;
      },
    },
    sessionPace: {
      enumerable: true,
      get: () => state.sessionPace as SessionWorkspacePracticeSetupControlsState['sessionPace'],
      set: (value: SessionWorkspacePracticeSetupControlsState['sessionPace']) => {
        state.sessionPace = value as SessionWorkspacePracticeSetupControlsState['sessionPace'];
      },
    },
  });

  return practiceSetupControlsState;
}

function createInstrumentDisplayControlsState(
  state: SessionWorkspaceInstrumentDisplayControlsState
): SessionWorkspaceInstrumentDisplayControlsState {
  const instrumentDisplayControlsState = {} as SessionWorkspaceInstrumentDisplayControlsState;

  Object.defineProperties(instrumentDisplayControlsState, {
    currentInstrument: {
      enumerable: true,
      get: () => state.currentInstrument,
      set: (value: SessionWorkspaceInstrumentDisplayControlsState['currentInstrument']) => {
        state.currentInstrument = value as SessionWorkspaceInstrumentDisplayControlsState['currentInstrument'];
      },
    },
    currentTuningPresetKey: {
      enumerable: true,
      get: () => state.currentTuningPresetKey,
      set: (value: SessionWorkspaceInstrumentDisplayControlsState['currentTuningPresetKey']) => {
        state.currentTuningPresetKey = value;
      },
    },
    isListening: {
      enumerable: true,
      get: () => state.isListening,
    },
    showMelodyTimelineSteps: {
      enumerable: true,
      get: () => state.showMelodyTimelineSteps,
      set: (value: SessionWorkspaceInstrumentDisplayControlsState['showMelodyTimelineSteps']) => {
        state.showMelodyTimelineSteps = value;
      },
    },
    showMelodyTimelineDetails: {
      enumerable: true,
      get: () => state.showMelodyTimelineDetails,
      set: (value: SessionWorkspaceInstrumentDisplayControlsState['showMelodyTimelineDetails']) => {
        state.showMelodyTimelineDetails = value;
      },
    },
    melodyFingeringStrategy: {
      enumerable: true,
      get: () => state.melodyFingeringStrategy,
      set: (value: SessionWorkspaceInstrumentDisplayControlsState['melodyFingeringStrategy']) => {
        state.melodyFingeringStrategy = value as SessionWorkspaceInstrumentDisplayControlsState['melodyFingeringStrategy'];
      },
    },
    melodyFingeringLevel: {
      enumerable: true,
      get: () => state.melodyFingeringLevel,
      set: (value: SessionWorkspaceInstrumentDisplayControlsState['melodyFingeringLevel']) => {
        state.melodyFingeringLevel = value as SessionWorkspaceInstrumentDisplayControlsState['melodyFingeringLevel'];
      },
    },
  });

  return instrumentDisplayControlsState;
}

function createPracticePresetControlsState(
  state: SessionWorkspacePracticePresetControlsState
): SessionWorkspacePracticePresetControlsState {
  const practicePresetControlsState = {} as SessionWorkspacePracticePresetControlsState;

  Object.defineProperties(practicePresetControlsState, {
    isDirectInputMode: {
      enumerable: true,
      get: () => state.isDirectInputMode,
      set: (value: SessionWorkspacePracticePresetControlsState['isDirectInputMode']) => {
        state.isDirectInputMode = value;
      },
    },
    ignorePromptAudioUntilMs: {
      enumerable: true,
      get: () => state.ignorePromptAudioUntilMs,
      set: (value: SessionWorkspacePracticePresetControlsState['ignorePromptAudioUntilMs']) => {
        state.ignorePromptAudioUntilMs = value;
      },
    },
    micSensitivityPreset: {
      enumerable: true,
      get: () => state.micSensitivityPreset,
      set: (value: SessionWorkspacePracticePresetControlsState['micSensitivityPreset']) => {
        state.micSensitivityPreset = value as SessionWorkspacePracticePresetControlsState['micSensitivityPreset'];
      },
    },
    micNoteAttackFilterPreset: {
      enumerable: true,
      get: () => state.micNoteAttackFilterPreset,
      set: (value: SessionWorkspacePracticePresetControlsState['micNoteAttackFilterPreset']) => {
        state.micNoteAttackFilterPreset = value as SessionWorkspacePracticePresetControlsState['micNoteAttackFilterPreset'];
      },
    },
    micNoteHoldFilterPreset: {
      enumerable: true,
      get: () => state.micNoteHoldFilterPreset,
      set: (value: SessionWorkspacePracticePresetControlsState['micNoteHoldFilterPreset']) => {
        state.micNoteHoldFilterPreset = value as SessionWorkspacePracticePresetControlsState['micNoteHoldFilterPreset'];
      },
    },
    performanceMicTolerancePreset: {
      enumerable: true,
      get: () => state.performanceMicTolerancePreset,
      set: (value: SessionWorkspacePracticePresetControlsState['performanceMicTolerancePreset']) => {
        state.performanceMicTolerancePreset = value as SessionWorkspacePracticePresetControlsState['performanceMicTolerancePreset'];
      },
    },
    performanceTimingLeniencyPreset: {
      enumerable: true,
      get: () => state.performanceTimingLeniencyPreset,
      set: (value: SessionWorkspacePracticePresetControlsState['performanceTimingLeniencyPreset']) => {
        state.performanceTimingLeniencyPreset = value as SessionWorkspacePracticePresetControlsState['performanceTimingLeniencyPreset'];
      },
    },
    performanceMicLatencyCompensationMs: {
      enumerable: true,
      get: () => state.performanceMicLatencyCompensationMs,
      set: (value: SessionWorkspacePracticePresetControlsState['performanceMicLatencyCompensationMs']) => {
        state.performanceMicLatencyCompensationMs = value;
      },
    },
    micPerformanceSuggestedLatencyMs: {
      enumerable: true,
      get: () => state.micPerformanceSuggestedLatencyMs,
      set: (value: SessionWorkspacePracticePresetControlsState['micPerformanceSuggestedLatencyMs']) => {
        state.micPerformanceSuggestedLatencyMs = value;
      },
    },
    micPerformanceLatencyCalibrationActive: {
      enumerable: true,
      get: () => state.micPerformanceLatencyCalibrationActive,
      set: (value: SessionWorkspacePracticePresetControlsState['micPerformanceLatencyCalibrationActive']) => {
        state.micPerformanceLatencyCalibrationActive = value;
      },
    },
    micPerformanceJudgmentCount: {
      enumerable: true,
      get: () => state.micPerformanceJudgmentCount,
      set: (value: SessionWorkspacePracticePresetControlsState['micPerformanceJudgmentCount']) => {
        state.micPerformanceJudgmentCount = value;
      },
    },
    micPerformanceJudgmentTotalLatencyMs: {
      enumerable: true,
      get: () => state.micPerformanceJudgmentTotalLatencyMs,
      set: (value: SessionWorkspacePracticePresetControlsState['micPerformanceJudgmentTotalLatencyMs']) => {
        state.micPerformanceJudgmentTotalLatencyMs = value;
      },
    },
    micPerformanceJudgmentLastLatencyMs: {
      enumerable: true,
      get: () => state.micPerformanceJudgmentLastLatencyMs,
      set: (value: SessionWorkspacePracticePresetControlsState['micPerformanceJudgmentLastLatencyMs']) => {
        state.micPerformanceJudgmentLastLatencyMs = value;
      },
    },
    micPerformanceJudgmentMaxLatencyMs: {
      enumerable: true,
      get: () => state.micPerformanceJudgmentMaxLatencyMs,
      set: (value: SessionWorkspacePracticePresetControlsState['micPerformanceJudgmentMaxLatencyMs']) => {
        state.micPerformanceJudgmentMaxLatencyMs = value;
      },
    },
  });

  return practicePresetControlsState;
}

function buildPracticeControls(
  deps: PracticeControlsBuilderContext,
  getPracticePresetUiControllerRef: () => PracticePresetUiControllerRef
): SessionWorkspaceControlsClusterDeps['practiceControls'] {
  const practicePresetControlsState = createPracticePresetControlsState(deps.state);
  const practiceSetupControlsState = createPracticeSetupControlsState(deps.state);
  const instrumentDisplayControlsState = createInstrumentDisplayControlsState(deps.state);

  return {
    practicePresetControls: {
      dom: deps.dom,
      state: practicePresetControlsState,
      refreshMicPerformanceReadinessUi: deps.refreshMicPerformanceReadinessUi,
      syncPracticePresetUi: () => getPracticePresetUiControllerRef()?.syncPracticePresetUi(),
      updateMicNoiseGateInfo: () => deps.micSettingsController.updateNoiseGateInfo(),
      saveSettings: deps.saveSettings,
    },
    practiceSetupControls: {
      dom: deps.dom,
      state: practiceSetupControlsState,
      markCurriculumPresetAsCustom: () => deps.curriculumPresetBridgeController.markAsCustom(),
      saveSettings: deps.saveSettings,
      redrawFretboard: deps.redrawFretboard,
      refreshDisplayFormatting: deps.refreshDisplayFormatting,
      setNoteNamingPreference: deps.setNoteNamingPreference,
      stopMelodyDemoPlayback: ({ clearUi }) =>
        deps.melodyDemoRuntimeController.stopPlayback({ clearUi }),
      handleModeChange: deps.handleModeChange,
      syncHiddenMetronomeTempoFromSharedTempo: () =>
        deps.metronomeBridgeController.syncHiddenMetronomeTempoFromSharedTempo(),
      syncMelodyMetronomeRuntime: () => deps.metronomeBridgeController.syncMelodyMetronomeRuntime(),
      refreshMicPerformanceReadinessUi: deps.refreshMicPerformanceReadinessUi,
      syncMelodyTimelineEditingState: () => deps.melodyTimelineEditingBridgeController.syncState(),
      setCurriculumPresetInfo: (text) => deps.curriculumPresetBridgeController.setPresetInfo(text),
      applyCurriculumPreset: (key) => deps.curriculumPresetBridgeController.applyPreset(key),
      persistSelectedMelodyTempoOverride: () =>
        deps.metronomeBridgeController.persistSelectedMelodyTempoOverride(),
      renderMetronomeToggleButton: () => deps.metronomeBridgeController.renderMetronomeToggleButton(),
    },
    instrumentDisplayControls: {
      dom: deps.dom,
      state: instrumentDisplayControlsState,
      resolveInstrumentById: deps.resolveInstrumentById,
      stopMelodyDemoPlayback: ({ clearUi }) =>
        deps.melodyDemoRuntimeController.stopPlayback({ clearUi }),
      markCurriculumPresetAsCustom: () => deps.curriculumPresetBridgeController.markAsCustom(),
      resetMelodyTimelineEditingState: () => deps.melodyTimelineEditingBridgeController.resetState(),
      updateInstrumentUI: deps.updateInstrumentUI,
      getEnabledStrings: () => deps.getEnabledStrings(),
      loadInstrumentSoundfont: deps.loadInstrumentSoundfont,
      saveSettings: deps.saveSettings,
      refreshMelodyTimelineUi: () => deps.melodyTimelineUiController.refreshUi(),
      stopListening: deps.stopListening,
      setResultMessage: deps.setResultMessage,
      redrawFretboard: deps.redrawFretboard,
    },
  };
}

export function createSessionWorkspaceGraphCluster(deps: SessionWorkspaceGraphClusterDeps) {
  let practicePresetUiControllerRef: PracticePresetUiControllerRef = null;

  const cluster = createSessionWorkspaceControlsCluster({
    setupUi: buildSetupUi(createSetupUiContext(deps)),
    workflowLayout: buildWorkflowLayout(createWorkflowLayoutContext(deps)),
    melodyWorkflow: buildMelodyWorkflow(createMelodyWorkflowContext(deps)),
    practiceControls: buildPracticeControls(
      createPracticeControlsContext(deps),
      () => practicePresetUiControllerRef
    ),
  });

  practicePresetUiControllerRef = cluster.practicePresetUiController;
  return cluster;
}
