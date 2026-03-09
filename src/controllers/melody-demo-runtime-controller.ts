import { createMelodyDemoController } from './melody-demo-controller';
import { createMelodyDemoPresentationController } from './melody-demo-presentation-controller';
import type { MelodyFingeringStrategy } from '../melody-fingering';
import { getMelodyWithPracticeAdjustments } from '../melody-string-shift';
import type { MelodyDefinition } from '../melody-library';
import type { MelodyStudyRange } from '../melody-study-range';
import type { IInstrument } from '../instruments/instrument';
import type { ChordNote } from '../types';
import type { UiWorkflow } from '../training-workflows';

interface MelodyDemoRuntimeControllerDom {
  melodySelector: HTMLSelectElement;
  melodyTabTimelineGrid: HTMLElement;
  melodyDemoBpm: HTMLInputElement;
  melodyDemoBpmValue: HTMLElement;
  melodyDemoBtn: HTMLButtonElement;
  melodyPauseDemoBtn: HTMLButtonElement;
  melodyStepBackBtn: HTMLButtonElement;
  melodyStepForwardBtn: HTMLButtonElement;
  melodyLoopRange: HTMLInputElement;
  melodyPlaybackControls: HTMLElement;
  trainingMode: HTMLSelectElement;
  stringSelector: HTMLElement;
}

interface MelodyDemoRuntimeControllerState {
  uiWorkflow: UiWorkflow;
  currentInstrument: IInstrument;
  melodyTransposeSemitones: number;
  melodyStringShift: number;
  melodyLoopRangeEnabled: boolean;
  isListening: boolean;
  currentMelodyId: string | null;
  currentMelodyEventIndex: number;
  performanceActiveEventIndex: number | null;
  melodyTimelinePreviewIndex: number | null;
  melodyTimelinePreviewLabel: string | null;
  melodyDemoRuntimeActive: boolean;
  melodyDemoRuntimePaused: boolean;
  melodyDemoRuntimeBaseTimeSec: number;
  melodyDemoRuntimeAnchorStartedAtMs: number | null;
  melodyDemoRuntimePausedOffsetSec: number;
  melodyFingeringStrategy?: MelodyFingeringStrategy;
  melodyFingeringLevel?: 'beginner' | 'intermediate' | 'advanced';
  calibratedA4: number;
  audioContext: {
    state: string;
    resume(): Promise<void>;
  } | null;
}

export interface MelodyDemoRuntimeControllerDeps {
  dom: MelodyDemoRuntimeControllerDom;
  state: MelodyDemoRuntimeControllerState;
  getSelectedMelodyId: () => string | null;
  getMelodyById: (melodyId: string, instrument: IInstrument) => MelodyDefinition | null;
  getStoredMelodyStudyRange: (melodyId: string, totalEvents: number) => MelodyStudyRange;
  getEnabledStrings: (container: HTMLElement) => Set<string>;
  isMelodyWorkflowMode: (mode: string) => boolean;
  setResultMessage: (message: string, type?: 'success' | 'error') => void;
  setPromptText: (text: string) => void;
  syncMelodyLoopRangeDisplay: () => void;
  showNonBlockingError: (message: string) => void;
  formatUserFacingError: (prefix: string, error: unknown) => string;
  scheduleTimelineRender: () => void;
  drawFretboard: (
    showAllNotes?: boolean,
    targetNote?: string | null,
    targetString?: string | null,
    chordFingering?: ChordNote[] | null
  ) => void;
  redrawFretboard: () => void;
  playSound: (noteOrNotes: string | string[]) => void;
  loadInstrumentSoundfont: (instrumentName: string) => Promise<void>;
  stopListening: () => void;
  seekActiveMelodySessionToEvent: (eventIndex: number) => boolean;
  getStudyRangeLength: (studyRange: MelodyStudyRange, totalEvents: number) => number;
  formatStudyRange: (studyRange: MelodyStudyRange, totalEvents: number) => string;
  startMelodyMetronomeIfEnabled: (options?: { alignToPerformanceTimeMs?: number | null }) => Promise<void>;
  syncMelodyMetronomeRuntime: () => Promise<void>;
  updateScrollingTabPanelRuntime: (offsetSec: number) => void;
  getPlaybackActionLabel: (workflow: UiWorkflow) => string;
  getPlaybackPromptLabel: (workflow: UiWorkflow) => string;
  getPlaybackCompletedLabel: (workflow: UiWorkflow) => string;
  requestAnimationFrame: (callback: FrameRequestCallback) => number;
}

export function createMelodyDemoRuntimeController(deps: MelodyDemoRuntimeControllerDeps) {
  function getSelectedMelody() {
    const selectedMelodyId = deps.getSelectedMelodyId();
    return selectedMelodyId ? deps.getMelodyById(selectedMelodyId, deps.state.currentInstrument) : null;
  }

  function findPlayableStringForNote(note: string): string | null {
    const instrumentData = deps.state.currentInstrument;
    const enabledStrings = deps.getEnabledStrings(deps.dom.stringSelector);

    for (const stringName of instrumentData.STRING_ORDER) {
      if (!enabledStrings.has(stringName)) continue;
      const fret = instrumentData.FRETBOARD[stringName]?.[note];
      if (typeof fret === 'number') {
        return stringName;
      }
    }

    return null;
  }

  function getSelection() {
    const selectedMelodyId = deps.getSelectedMelodyId();
    if (!selectedMelodyId) {
      deps.setResultMessage('Select a melody first.', 'error');
      return null;
    }

    const baseMelody = deps.getMelodyById(selectedMelodyId, deps.state.currentInstrument);
    if (!baseMelody) {
      deps.setResultMessage('Selected melody is unavailable for the current instrument.', 'error');
      return null;
    }

    const melody = getMelodyWithPracticeAdjustments(
      baseMelody,
      deps.state.melodyTransposeSemitones,
      deps.state.melodyStringShift,
      deps.state.currentInstrument
    );
    if (melody.events.length === 0) {
      deps.setResultMessage('Selected melody has no playable notes.', 'error');
      return null;
    }

    return {
      melody,
      studyRange: deps.getStoredMelodyStudyRange(melody.id, melody.events.length),
    };
  }

  let melodyDemoController: ReturnType<typeof createMelodyDemoController> | null = null;

  const melodyDemoPresentationController = createMelodyDemoPresentationController({
    dom: {
      melodyDemoBpm: deps.dom.melodyDemoBpm,
      melodyDemoBpmValue: deps.dom.melodyDemoBpmValue,
      melodyDemoBtn: deps.dom.melodyDemoBtn,
      melodyPauseDemoBtn: deps.dom.melodyPauseDemoBtn,
      melodyStepBackBtn: deps.dom.melodyStepBackBtn,
      melodyStepForwardBtn: deps.dom.melodyStepForwardBtn,
      melodyLoopRange: deps.dom.melodyLoopRange,
      melodyPlaybackControls: deps.dom.melodyPlaybackControls,
      trainingMode: deps.dom.trainingMode,
      stringSelector: deps.dom.stringSelector,
    },
    state: deps.state,
    getUiWorkflow: () => deps.state.uiWorkflow,
    getSelectedMelody,
    isMelodyWorkflowMode: deps.isMelodyWorkflowMode,
    getPlaybackActionLabel: deps.getPlaybackActionLabel,
    isDemoActive: () => melodyDemoController?.isActive() ?? false,
    isDemoPaused: () => melodyDemoController?.isPaused() ?? false,
    syncLoopRangeDisplay: deps.syncMelodyLoopRangeDisplay,
    loadInstrumentSoundfont: deps.loadInstrumentSoundfont,
    showNonBlockingError: deps.showNonBlockingError,
    formatUserFacingError: deps.formatUserFacingError,
    getEnabledStrings: deps.getEnabledStrings,
    playSound: deps.playSound,
    setPromptText: deps.setPromptText,
    drawFretboard: deps.drawFretboard,
    redrawFretboard: deps.redrawFretboard,
    renderTimeline: deps.scheduleTimelineRender,
    findPlayableStringForNote,
  });

  melodyDemoController = createMelodyDemoController({
    getSelection,
    getLoopRangeEnabled: () => deps.state.melodyLoopRangeEnabled,
    isListening: () => deps.state.isListening,
    stopListening: deps.stopListening,
    getTrainingMode: () => deps.dom.trainingMode.value,
    isMelodyWorkflowMode: deps.isMelodyWorkflowMode,
    seekActiveMelodySessionToEvent: (eventIndex) => {
      const selection = getSelection();
      if (!selection) return false;
      deps.state.currentMelodyId = selection.melody.id;
      return deps.seekActiveMelodySessionToEvent(eventIndex);
    },
    ensureAudioReady: melodyDemoPresentationController.ensureAudioReady,
    previewEvent: melodyDemoPresentationController.previewEvent,
    getStepDelayMs: melodyDemoPresentationController.getStepDelayMs,
    getStudyRangeLength: deps.getStudyRangeLength,
    formatStudyRange: deps.formatStudyRange,
    clearUiPreview: () => {
      deps.state.melodyTimelinePreviewIndex = null;
      deps.state.melodyTimelinePreviewLabel = null;
      deps.setPromptText('');
    },
    redrawFretboard: deps.redrawFretboard,
    onStateChange: melodyDemoPresentationController.renderButtonState,
    setResultMessage: deps.setResultMessage,
    onBeforePlaybackStart: async (playbackAnchorPerfMs) => {
      await deps.startMelodyMetronomeIfEnabled({ alignToPerformanceTimeMs: playbackAnchorPerfMs });
    },
    onPlaybackCursorChange: (cursor) => {
      deps.state.melodyDemoRuntimeActive = cursor.active;
      deps.state.melodyDemoRuntimePaused = cursor.paused;
      deps.state.melodyDemoRuntimeBaseTimeSec = cursor.baseTimeSec;
      deps.state.melodyDemoRuntimeAnchorStartedAtMs = cursor.anchorStartedAtMs;
      deps.state.melodyDemoRuntimePausedOffsetSec = cursor.pausedOffsetSec;
      deps.scheduleTimelineRender();
    },
    onPlaybackStopped: () => {
      deps.state.melodyDemoRuntimeActive = false;
      deps.state.melodyDemoRuntimePaused = false;
      deps.state.melodyDemoRuntimeBaseTimeSec = 0;
      deps.state.melodyDemoRuntimeAnchorStartedAtMs = null;
      deps.state.melodyDemoRuntimePausedOffsetSec = 0;
      deps.scheduleTimelineRender();
      void deps.syncMelodyMetronomeRuntime();
    },
    onPlaybackCompleted: () => {
      deps.state.currentMelodyEventIndex = 0;
      deps.state.performanceActiveEventIndex = null;
      deps.state.melodyTimelinePreviewIndex = null;
      deps.state.melodyTimelinePreviewLabel = null;
      deps.dom.melodyTabTimelineGrid.scrollLeft = 0;
      deps.updateScrollingTabPanelRuntime(0);
      deps.scheduleTimelineRender();
      deps.requestAnimationFrame(() => {
        deps.dom.melodyTabTimelineGrid.scrollLeft = 0;
      });
    },
    getPlaybackPromptLabel: () => deps.getPlaybackPromptLabel(deps.state.uiWorkflow),
    getPlaybackCompletedLabel: () => deps.getPlaybackCompletedLabel(deps.state.uiWorkflow),
  });

  function stopPlayback(options?: { clearUi?: boolean; message?: string }) {
    melodyDemoController.stopPlayback(options);
    deps.dom.melodyTabTimelineGrid.scrollLeft = 0;
    void deps.syncMelodyMetronomeRuntime();
  }

  function pausePlayback() {
    melodyDemoController.pausePlayback();
    void deps.syncMelodyMetronomeRuntime();
  }

  async function resumePlayback() {
    const resumeAnchorPerfMs = performance.now() + 20;
    await deps.startMelodyMetronomeIfEnabled({ alignToPerformanceTimeMs: resumeAnchorPerfMs });
    await melodyDemoController.resumePlayback(resumeAnchorPerfMs);
  }

  return {
    syncBpmDisplay: melodyDemoPresentationController.syncBpmDisplay,
    getClampedBpmFromInput: melodyDemoPresentationController.getClampedBpmFromInput,
    renderButtonState: melodyDemoPresentationController.renderButtonState,
    clearPreviewState: () => melodyDemoController.clearPreviewState(),
    startPlayback: async () => melodyDemoController.startPlayback(),
    stopPlayback,
    pausePlayback,
    resumePlayback,
    seekToEvent: (eventIndex: number, options?: { commit?: boolean }) =>
      melodyDemoController.seekToEvent(eventIndex, options),
    stepPreview: async (direction: -1 | 1) => melodyDemoController.stepPreview(direction),
    shouldHandleHotkeys: () => melodyDemoController.shouldHandleHotkeys(),
    isActive: () => melodyDemoController.isActive(),
    isPlaying: () => melodyDemoController.isPlaying(),
    isPaused: () => melodyDemoController.isPaused(),
    findPlayableStringForNote,
  };
}

