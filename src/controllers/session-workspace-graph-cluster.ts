import { dom } from '../dom';
import { state } from '../state';
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
  state: typeof state;
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

export function createSessionWorkspaceGraphCluster(deps: SessionWorkspaceGraphClusterDeps) {
  let practicePresetUiControllerRef: { syncPracticePresetUi(): void } | null = null;

  const cluster = createSessionWorkspaceControlsCluster({
    setupUi: {
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
        state: deps.state,
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
        state: deps.state,
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
        state: deps.state,
        hasCompletedOnboarding: deps.hasCompletedOnboarding,
      },
    },
    workflowLayout: {
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
        state: deps.state,
        toggleLayoutControlsExpanded: deps.toggleLayoutControlsExpanded,
        stopMelodyDemoPlayback: ({ clearUi }) => deps.melodyDemoRuntimeController.stopPlayback({ clearUi }),
        stopListening: deps.stopListening,
        saveSettings: deps.saveSettings,
        setUiMode: deps.setUiMode,
        openMelodyImport: () => deps.dom.openMelodyImportBtn.click(),
      },
    },
    melodyWorkflow: {
      melodySetupControls: {
        dom: deps.dom,
        state: deps.state,
        stopMelodyDemoPlayback: ({ clearUi }) => deps.melodyDemoRuntimeController.stopPlayback({ clearUi }),
        markCurriculumPresetAsCustom: () => deps.curriculumPresetBridgeController.markAsCustom(),
        resetMelodyTimelineEditingState: () => deps.melodyTimelineEditingBridgeController.resetState(),
        hydrateMelodyTransposeForSelectedMelody: () => deps.melodyPracticeSettingsBridgeController.hydrateMelodyTransposeForSelectedMelody(),
        hydrateMelodyStringShiftForSelectedMelody: () => deps.melodyPracticeSettingsBridgeController.hydrateMelodyStringShiftForSelectedMelody(),
        hydrateMelodyStudyRangeForSelectedMelody: () => deps.melodyPracticeSettingsBridgeController.hydrateMelodyStudyRangeForSelectedMelody(),
        hydrateMelodyTempoForSelectedMelody: () => deps.metronomeBridgeController.hydrateMelodyTempoForSelectedMelody(),
        syncMetronomeMeterFromSelectedMelody: () => deps.selectedMelodyContextController.syncMetronomeMeterFromSelectedMelody(),
        clearMelodyDemoPreviewState: () => deps.melodyDemoRuntimeController.clearPreviewState(),
        isMelodyWorkflowMode: deps.isMelodyWorkflowMode,
        stopListening: deps.stopListening,
        setResultMessage: deps.setResultMessage,
        saveSettings: deps.saveSettings,
        refreshMelodyTimelineUi: () => deps.melodyTimelineUiController.refreshUi(),
        refreshLayoutControlsVisibility: deps.refreshLayoutControlsVisibility,
        syncMelodyTimelineZoomDisplay: () => deps.metronomeBridgeController.syncMelodyTimelineZoomDisplay(),
        syncScrollingTabZoomDisplay: () => deps.metronomeBridgeController.syncScrollingTabZoomDisplay(),
        syncMelodyLoopRangeDisplay: () => deps.melodyPracticeSettingsBridgeController.syncMelodyLoopRangeDisplay(),
        clampMelodyDemoBpmInput: () => {
          deps.melodyDemoRuntimeController.getClampedBpmFromInput();
        },
        persistSelectedMelodyTempoOverride: () => deps.metronomeBridgeController.persistSelectedMelodyTempoOverride(),
        syncMetronomeTempoFromMelodyIfLinked: () => deps.metronomeBridgeController.syncMetronomeTempoFromMelodyIfLinked(),
        retimeMelodyDemoPlayback: () => deps.melodyDemoRuntimeController.retimePlayback(),
        getSelectedMelodyEventCount: () => deps.selectedMelodyContextController.getSelectedMelodyEventCount(),
      },
      melodyPracticeActions: {
        dom: {
          trainingMode: deps.dom.trainingMode,
        },
        state: deps.state,
        isMelodyWorkflowMode: deps.isMelodyWorkflowMode,
        stopMelodyDemoPlayback: (options) => deps.melodyDemoRuntimeController.stopPlayback(options),
        stopListening: deps.stopListening,
        markCurriculumPresetAsCustom: () => deps.curriculumPresetBridgeController.markAsCustom(),
        saveSettings: deps.saveSettings,
        redrawFretboard: deps.redrawFretboard,
        refreshMelodyTimelineUi: () => deps.melodyTimelineUiController.refreshUi(),
        setResultMessage: deps.setResultMessage,
        applyMelodyTransposeSemitones: (nextValue) => deps.melodyPracticeSettingsBridgeController.applyMelodyTransposeSemitones(nextValue),
        applyMelodyStringShift: (nextValue) => deps.melodyPracticeSettingsBridgeController.applyMelodyStringShift(nextValue),
        applyMelodyStudyRange: (range) => deps.melodyPracticeSettingsBridgeController.applyMelodyStudyRange(range),
        listCustomMelodies: () => deps.listMelodiesForCurrentInstrument().filter((entry) => entry.source === 'custom'),
        setStoredMelodyTransposeSemitones: (melodyId, semitones) =>
          deps.melodyPracticeSettingsBridgeController.setStoredMelodyTransposeSemitones(melodyId, semitones),
        hydrateMelodyTransposeForSelectedMelody: () => deps.melodyPracticeSettingsBridgeController.hydrateMelodyTransposeForSelectedMelody(),
        formatMelodyTransposeSemitones: deps.formatMelodyTransposeSemitones,
        confirmUserAction: deps.confirmUserAction,
      },
      melodyPracticeControls: {
        dom: deps.dom,
        state: deps.state,
        normalizeMelodyTransposeSemitones: deps.normalizeMelodyTransposeSemitones,
        normalizeMelodyStringShift: deps.normalizeMelodyStringShift,
        stopMelodyDemoPlayback: ({ clearUi }) => deps.melodyDemoRuntimeController.stopPlayback({ clearUi }),
      },
      melodySelection: {
        dom: {
          melodySelector: deps.dom.melodySelector,
          melodyNameInput: deps.dom.melodyNameInput,
          melodyAsciiTabInput: deps.dom.melodyAsciiTabInput,
        },
        state: deps.state,
        refreshPracticeMelodyOptions: () => deps.melodyPracticeSettingsBridgeController.refreshMelodyOptionsForCurrentInstrument(),
        hydrateMelodyTransposeForSelectedMelody: () => deps.melodyPracticeSettingsBridgeController.hydrateMelodyTransposeForSelectedMelody(),
        hydrateMelodyStringShiftForSelectedMelody: () => deps.melodyPracticeSettingsBridgeController.hydrateMelodyStringShiftForSelectedMelody(),
        hydrateMelodyStudyRangeForSelectedMelody: () => deps.melodyPracticeSettingsBridgeController.hydrateMelodyStudyRangeForSelectedMelody(),
        hydrateMelodyTempoForSelectedMelody: () => deps.metronomeBridgeController.hydrateMelodyTempoForSelectedMelody(),
        clearMelodyDemoPreviewState: () => deps.melodyDemoRuntimeController.clearPreviewState(),
        resetMelodyTimelineEditingState: () => deps.melodyTimelineEditingBridgeController.resetState(),
        closeMelodyImportModal: () => deps.melodyImportWorkspaceController.closeAndResetInputs(),
        markCurriculumPresetAsCustom: () => deps.curriculumPresetBridgeController.markAsCustom(),
        saveSettings: deps.saveSettings,
        setResultMessage: deps.setResultMessage,
        renderMelodyTabTimeline: deps.renderMelodyTabTimelineFromState,
        syncMelodyTimelineEditingState: () => deps.melodyTimelineEditingBridgeController.syncState(),
      },
    },
    practiceControls: {
      practicePresetControls: {
        dom: deps.dom,
        state: deps.state,
        refreshMicPerformanceReadinessUi: deps.refreshMicPerformanceReadinessUi,
        syncPracticePresetUi: () => practicePresetUiControllerRef?.syncPracticePresetUi(),
        updateMicNoiseGateInfo: () => deps.micSettingsController.updateNoiseGateInfo(),
        saveSettings: deps.saveSettings,
      },
      practiceSetupControls: {
        dom: deps.dom,
        state: deps.state,
        markCurriculumPresetAsCustom: () => deps.curriculumPresetBridgeController.markAsCustom(),
        saveSettings: deps.saveSettings,
        redrawFretboard: deps.redrawFretboard,
        refreshDisplayFormatting: deps.refreshDisplayFormatting,
        setNoteNamingPreference: deps.setNoteNamingPreference,
        stopMelodyDemoPlayback: ({ clearUi }) => deps.melodyDemoRuntimeController.stopPlayback({ clearUi }),
        handleModeChange: deps.handleModeChange,
        syncHiddenMetronomeTempoFromSharedTempo: () => deps.metronomeBridgeController.syncHiddenMetronomeTempoFromSharedTempo(),
        syncMelodyMetronomeRuntime: () => deps.metronomeBridgeController.syncMelodyMetronomeRuntime(),
        refreshMicPerformanceReadinessUi: deps.refreshMicPerformanceReadinessUi,
        syncMelodyTimelineEditingState: () => deps.melodyTimelineEditingBridgeController.syncState(),
        setCurriculumPresetInfo: (text) => deps.curriculumPresetBridgeController.setPresetInfo(text),
        applyCurriculumPreset: (key) => deps.curriculumPresetBridgeController.applyPreset(key),
        persistSelectedMelodyTempoOverride: () => deps.metronomeBridgeController.persistSelectedMelodyTempoOverride(),
        renderMetronomeToggleButton: () => deps.metronomeBridgeController.renderMetronomeToggleButton(),
      },
      instrumentDisplayControls: {
        dom: deps.dom,
        state: deps.state,
        resolveInstrumentById: deps.resolveInstrumentById,
        stopMelodyDemoPlayback: ({ clearUi }) => deps.melodyDemoRuntimeController.stopPlayback({ clearUi }),
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
    },
  });

  practicePresetUiControllerRef = cluster.practicePresetUiController;
  return cluster;
}
