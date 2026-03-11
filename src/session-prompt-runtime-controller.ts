import { buildPromptAudioPlan } from './prompt-audio-plan';
import { executePromptAudioPlan } from './prompt-audio-executor';
import { buildSessionInitialTimelinePreview } from './session-initial-timeline-preview';
import { formatSessionGoalProgress, getSessionGoalTargetCorrect } from './session-goal';

type AppDom = typeof import('./dom').dom;
type AppState = typeof import('./state').state;

interface SessionPromptRuntimeControllerDeps {
  dom: Pick<AppDom, 'trainingMode' | 'melodySelector' | 'sessionGoal' | 'stringSelector'>;
  state: Pick<
    AppState,
    | 'activeSessionStats'
    | 'melodyTimelinePreviewIndex'
    | 'melodyTimelinePreviewLabel'
    | 'currentPrompt'
    | 'autoPlayPromptSound'
    | 'currentInstrument'
    | 'calibratedA4'
    | 'melodyTransposeSemitones'
    | 'melodyStringShift'
    | 'melodyStudyRangeStartIndex'
    | 'melodyStudyRangeEndIndex'
    | 'targetFrequency'
  >;
  getEnabledStrings: (selector: AppDom['stringSelector']) => Set<string>;
  redrawFretboard: () => void;
  scheduleTimelineRender: () => void;
  setSessionGoalProgress: (text: string) => void;
  setPlaySoundDisabled: (disabled: boolean) => void;
  playSound: (note: string, durationMs?: number, instrumentOverride?: AppState['currentInstrument'] | null) => void;
}

export function createSessionPromptRuntimeController(deps: SessionPromptRuntimeControllerDeps) {
  function syncTimelineUi() {
    deps.redrawFretboard();
    deps.scheduleTimelineRender();
  }

  function updateSessionGoalProgress() {
    const goalTargetCorrect = getSessionGoalTargetCorrect(deps.dom.sessionGoal.value);
    if (goalTargetCorrect === null) return;
    deps.setSessionGoalProgress(
      formatSessionGoalProgress(deps.state.activeSessionStats?.correctAttempts ?? 0, goalTargetCorrect)
    );
  }

  function applyInitialTimelinePreview(previewLabel: string) {
    const preview = buildSessionInitialTimelinePreview({
      trainingMode: deps.dom.trainingMode.value,
      selectedMelodyId: deps.dom.melodySelector.value,
      currentInstrument: deps.state.currentInstrument,
      melodyTransposeSemitones: deps.state.melodyTransposeSemitones,
      melodyStringShift: deps.state.melodyStringShift,
      melodyStudyRangeStartIndex: deps.state.melodyStudyRangeStartIndex,
      melodyStudyRangeEndIndex: deps.state.melodyStudyRangeEndIndex,
    });

    deps.state.melodyTimelinePreviewIndex = preview?.eventIndex ?? null;
    deps.state.melodyTimelinePreviewLabel = preview ? previewLabel : null;
    syncTimelineUi();
  }

  function clearInitialTimelinePreview() {
    if (deps.state.melodyTimelinePreviewIndex === null && deps.state.melodyTimelinePreviewLabel === null) {
      return;
    }

    deps.state.melodyTimelinePreviewIndex = null;
    deps.state.melodyTimelinePreviewLabel = null;
    syncTimelineUi();
  }

  function configurePromptAudio() {
    const audioPlan = buildPromptAudioPlan({
      prompt: deps.state.currentPrompt,
      trainingMode: deps.dom.trainingMode.value,
      autoPlayPromptSoundEnabled: deps.state.autoPlayPromptSound,
      instrument: deps.state.currentInstrument,
      calibratedA4: deps.state.calibratedA4,
      enabledStrings: deps.getEnabledStrings(deps.dom.stringSelector),
    });
    executePromptAudioPlan(audioPlan, {
      setTargetFrequency: (frequency) => {
        deps.state.targetFrequency = frequency;
      },
      setPlaySoundDisabled: deps.setPlaySoundDisabled,
      playSound: deps.playSound,
    });
  }

  return {
    updateSessionGoalProgress,
    applyInitialTimelinePreview,
    clearInitialTimelinePreview,
    configurePromptAudio,
  };
}
