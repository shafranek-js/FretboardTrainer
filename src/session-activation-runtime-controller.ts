import { buildSessionInitialPromptPlan } from './session-initial-prompt-plan';
import { executeSessionRuntimeActivation } from './session-runtime-activation-executor';
import { getTrainingModeLabel } from './training-mode-labels';
import { clampMelodyPlaybackBpm } from './melody-timeline-duration';
import { resolveMelodyMetronomeMeterProfile } from './melody-meter';
import { getMelodyById } from './melody-library';

type AppDom = typeof import('./dom').dom;
type AppState = typeof import('./state').state;

type InputSource = 'microphone' | 'midi';

type SessionInitialPromptPlan = ReturnType<typeof import('./session-initial-prompt-plan').buildSessionInitialPromptPlan>;

interface SessionActivationRuntimeControllerDeps {
  dom: Pick<
    AppDom,
    | 'trainingMode'
    | 'melodySelector'
    | 'melodyDemoBpm'
    | 'startFret'
    | 'endFret'
    | 'stringSelector'
    | 'audioInputDevice'
    | 'midiInputDevice'
  >;
  state: Pick<
    AppState,
    | 'isListening'
    | 'activeSessionStats'
    | 'currentInstrument'
    | 'currentTuningPresetKey'
    | 'melodyStudyRangeStartIndex'
    | 'melodyStudyRangeEndIndex'
    | 'melodyTransposeSemitones'
    | 'melodyStringShift'
    | 'pendingTimeoutIds'
  >;
  getSelectedFretRange: (startFret: string, endFret: string) => { minFret: number | undefined; maxFret: number | undefined };
  getEnabledStrings: (selector: AppDom['stringSelector']) => Set<string>;
  executeSessionRuntimeActivation: typeof import('./session-runtime-activation-executor').executeSessionRuntimeActivation;
  setIsListening: (value: boolean) => void;
  setActiveSessionStats: (sessionStats: AppState['activeSessionStats']) => void;
  resetPromptCycleTracking: () => void;
  setStatusText: (text: string) => void;
  processAudio: () => void;
  nextPrompt: () => void;
  setPromptText: (text: string) => void;
  setResultMessage: (message: string, tone?: 'neutral' | 'success' | 'error') => void;
  clearResultMessage: () => void;
  applyInitialTimelinePreview: (previewLabel: string) => void;
  clearInitialTimelinePreview: () => void;
  startRuntimeClock: () => void;
  beginPrerollTimeline: (pulseCount: number, delayMs: number) => void;
  advancePrerollTimeline: (pulseIndex: number, pulseCount: number) => void;
  finishPrerollTimeline: () => void;
  playMetronomeCue: (accented?: boolean) => Promise<void>;
  scheduleSessionTimeout: (delayMs: number, callback: () => void, context: string) => unknown;
  showNonBlockingError: (message: string) => void;
  formatUserFacingError: (prefix: string, error: unknown) => string;
}

export function createSessionActivationRuntimeController(deps: SessionActivationRuntimeControllerDeps) {
  function buildActivationInitialPromptPlan(forCalibration: boolean): SessionInitialPromptPlan {
    if (forCalibration) {
      return { delayMs: 0, prepMessage: '', pulseCount: 0, secondaryAccentStepIndices: [] };
    }

    const selectedMelodyId = deps.dom.melodySelector.value.trim();
    const selectedBaseMelody = selectedMelodyId ? getMelodyById(selectedMelodyId, deps.state.currentInstrument) : null;
    const meterProfile = resolveMelodyMetronomeMeterProfile(selectedBaseMelody);
    return buildSessionInitialPromptPlan({
      trainingMode: deps.dom.trainingMode.value,
      bpm: clampMelodyPlaybackBpm(deps.dom.melodyDemoBpm.value),
      beatsPerBar: meterProfile.beatsPerBar,
      beatUnitDenominator: meterProfile.beatUnitDenominator,
      secondaryAccentStepIndices: meterProfile.secondaryAccentBeatIndices,
    });
  }

  function runInitialPrompt(initialPromptPlan: SessionInitialPromptPlan) {
    if (initialPromptPlan.delayMs <= 0) {
      deps.startRuntimeClock();
      deps.nextPrompt();
      return;
    }

    deps.setPromptText('');
    if (initialPromptPlan.prepMessage) {
      deps.setResultMessage(initialPromptPlan.prepMessage);
    }
    deps.applyInitialTimelinePreview(initialPromptPlan.prepMessage);
    deps.beginPrerollTimeline(initialPromptPlan.pulseCount, initialPromptPlan.delayMs);
    if (initialPromptPlan.pulseCount > 0) {
      void deps.playMetronomeCue(true).catch((error) => {
        deps.showNonBlockingError(deps.formatUserFacingError('Failed to play preroll count-in', error));
      });
    }

    const pulseIntervalMs =
      initialPromptPlan.pulseCount > 0 ? initialPromptPlan.delayMs / initialPromptPlan.pulseCount : 0;

    for (let pulseIndex = 1; pulseIndex < initialPromptPlan.pulseCount; pulseIndex += 1) {
      deps.scheduleSessionTimeout(
        Math.round(pulseIntervalMs * pulseIndex),
        () => {
          void deps
            .playMetronomeCue(initialPromptPlan.secondaryAccentStepIndices.includes(pulseIndex))
            .catch((error) => {
              deps.showNonBlockingError(deps.formatUserFacingError('Failed to play preroll count-in', error));
            });
          deps.advancePrerollTimeline(pulseIndex, initialPromptPlan.pulseCount);
        },
        `session initial prompt preroll pulse ${pulseIndex + 1}`
      );
    }

    deps.scheduleSessionTimeout(
      initialPromptPlan.delayMs,
      () => {
        if (!deps.state.isListening) return;
        deps.finishPrerollTimeline();
        deps.clearInitialTimelinePreview();
        deps.clearResultMessage();
        deps.startRuntimeClock();
        deps.nextPrompt();
      },
      'session initial prompt preroll'
    );
  }

  function activateSession(forCalibration: boolean, selectedInputSource: InputSource) {
    const initialPromptPlan = buildActivationInitialPromptPlan(forCalibration);
    const selectedMode = !forCalibration ? deps.dom.trainingMode.selectedOptions[0] : null;
    const fretRange = !forCalibration
      ? deps.getSelectedFretRange(deps.dom.startFret.value, deps.dom.endFret.value)
      : { minFret: undefined, maxFret: undefined };

    deps.executeSessionRuntimeActivation(
      {
        forCalibration,
        selectedInputSource,
        sessionInputSource: selectedInputSource,
        modeKey: !forCalibration ? deps.dom.trainingMode.value : undefined,
        modeLabel: !forCalibration
          ? selectedMode?.textContent?.trim() || getTrainingModeLabel(deps.dom.trainingMode.value)
          : undefined,
        instrumentName: !forCalibration ? deps.state.currentInstrument.name : undefined,
        tuningPresetKey: !forCalibration ? deps.state.currentTuningPresetKey : undefined,
        stringOrder: !forCalibration ? deps.state.currentInstrument.STRING_ORDER : undefined,
        enabledStrings: !forCalibration ? Array.from(deps.getEnabledStrings(deps.dom.stringSelector)) : undefined,
        minFret: fretRange.minFret,
        maxFret: fretRange.maxFret,
        melodyId: !forCalibration ? deps.dom.melodySelector.value.trim() || null : undefined,
        melodyStudyRangeStartIndex: !forCalibration ? deps.state.melodyStudyRangeStartIndex : undefined,
        melodyStudyRangeEndIndex: !forCalibration ? deps.state.melodyStudyRangeEndIndex : undefined,
        melodyTransposeSemitones: !forCalibration ? deps.state.melodyTransposeSemitones : undefined,
        melodyStringShift: !forCalibration ? deps.state.melodyStringShift : undefined,
        audioInputDeviceLabel: !forCalibration
          ? deps.dom.audioInputDevice.selectedOptions[0]?.textContent?.trim()
          : undefined,
        midiInputDeviceLabel: !forCalibration
          ? deps.dom.midiInputDevice.selectedOptions[0]?.textContent?.trim()
          : undefined,
      },
      {
        setIsListening: deps.setIsListening,
        setActiveSessionStats: deps.setActiveSessionStats,
        resetPromptCycleTracking: deps.resetPromptCycleTracking,
        setStatusText: deps.setStatusText,
        nextPrompt: () => runInitialPrompt(initialPromptPlan),
        processAudio: deps.processAudio,
      }
    );
  }

  return {
    buildActivationInitialPromptPlan,
    runInitialPrompt,
    activateSession,
  };
}
