import { formatSessionGoalProgress, getSessionGoalTargetCorrect } from './session-goal';

type AppDom = typeof import('./dom').dom;
type AppState = typeof import('./state').state;

type SessionStartPlan = ReturnType<typeof import('./session-start-preflight').buildSessionStartPlan>;
type SessionStartPlanInput = Parameters<typeof import('./session-start-preflight').buildSessionStartPlan>[0];

interface SessionStartRuntimePreparationResult {
  shouldProceed: boolean;
  errorMessage: string | null;
}

interface SessionStartRuntimeControllerDeps {
  dom: Pick<AppDom, 'trainingMode' | 'progressionSelector' | 'melodySelector' | 'sessionGoal'>;
  state: Pick<
    AppState,
    | 'isCalibrating'
    | 'calibrationFrequencies'
    | 'pendingTimeoutIds'
    | 'performanceRuntimeStartedAtMs'
    | 'performancePrerollLeadInVisible'
    | 'performancePrerollStartedAtMs'
    | 'performancePrerollDurationMs'
    | 'performancePrerollStepIndex'
    | 'performanceActiveEventIndex'
    | 'performanceRunCompleted'
    | 'currentInstrument'
    | 'melodyTransposeSemitones'
    | 'melodyStringShift'
    | 'timeLeft'
    | 'currentScore'
    | 'timerId'
    | 'currentProgression'
    | 'currentProgressionIndex'
    | 'currentArpeggioIndex'
  >;
  isPerformanceStyleMode: (trainingMode: string) => boolean;
  stopPerformanceTransportLoop: () => void;
  clearTrackedTimeouts: (pendingTimeoutIds: AppState['pendingTimeoutIds']) => void;
  invalidatePendingAdvance: () => void;
  getModeDetectionType: (trainingMode: string) => SessionStartPlanInput['modeDetectionType'];
  timedDurationSeconds: number;
  buildSessionStartPlan: typeof import('./session-start-preflight').buildSessionStartPlan;
  setSessionButtonsState: (buttons: SessionStartPlan['sessionButtons']) => void;
  setTimerValue: (seconds: number) => void;
  setScoreValue: (score: number) => void;
  setTimedInfoVisible: (visible: boolean) => void;
  clearSessionGoalProgress: () => void;
  createTimedSessionIntervalHandler: (input: {
    decrementTimeLeft: () => number;
    setTimerValue: (seconds: number) => void;
    handleTimeUp: () => void;
    onRuntimeError: (context: string, error: unknown) => void;
  }) => () => void;
  setInterval: (callback: () => void, delayMs: number) => number;
  handleTimeUp: () => void;
  onRuntimeError: (context: string, error: unknown) => void;
  setSessionGoalProgress: (text: string) => void;
}

export function createSessionStartRuntimeController(deps: SessionStartRuntimeControllerDeps) {
  function resetPerformanceRuntimeState() {
    deps.stopPerformanceTransportLoop();
    deps.clearTrackedTimeouts(deps.state.pendingTimeoutIds);
    deps.invalidatePendingAdvance();
    deps.state.performanceRuntimeStartedAtMs = null;
    deps.state.performancePrerollLeadInVisible = false;
    deps.state.performancePrerollStartedAtMs = null;
    deps.state.performancePrerollDurationMs = 0;
    deps.state.performancePrerollStepIndex = null;
    deps.state.performanceActiveEventIndex = null;
    deps.state.performanceRunCompleted = false;
  }

  function prepare(forCalibration = false): SessionStartRuntimePreparationResult {
    if (forCalibration) {
      deps.state.isCalibrating = true;
      deps.state.calibrationFrequencies = [];
      return { shouldProceed: true, errorMessage: null };
    }

    const trainingMode = deps.dom.trainingMode.value;
    if (deps.isPerformanceStyleMode(trainingMode)) {
      resetPerformanceRuntimeState();
    }

    const startPlan = deps.buildSessionStartPlan({
      trainingMode,
      modeDetectionType: deps.getModeDetectionType(trainingMode),
      progressionName: deps.dom.progressionSelector.value,
      progressions: deps.state.currentInstrument.CHORD_PROGRESSIONS,
      timedDuration: deps.timedDurationSeconds,
      selectedMelodyId: deps.dom.melodySelector.value.trim() || null,
      currentInstrument: deps.state.currentInstrument,
      melodyTransposeSemitones: deps.state.melodyTransposeSemitones,
      melodyStringShift: deps.state.melodyStringShift,
    });

    deps.setSessionButtonsState(startPlan.sessionButtons);

    if (startPlan.timed.enabled) {
      deps.state.timeLeft = startPlan.timed.durationSeconds;
      deps.state.currentScore = startPlan.timed.initialScore;
      deps.setTimerValue(startPlan.timed.durationSeconds);
      deps.setScoreValue(startPlan.timed.initialScore);
      deps.setTimedInfoVisible(true);
      deps.clearSessionGoalProgress();
      deps.state.timerId = deps.setInterval(
        deps.createTimedSessionIntervalHandler({
          decrementTimeLeft: () => {
            deps.state.timeLeft--;
            return deps.state.timeLeft;
          },
          setTimerValue: deps.setTimerValue,
          handleTimeUp: deps.handleTimeUp,
          onRuntimeError: deps.onRuntimeError,
        }),
        1000
      );
    }

    if (!startPlan.shouldStart) {
      return {
        shouldProceed: false,
        errorMessage: startPlan.errorMessage,
      };
    }

    if (startPlan.progression.isRequired) {
      deps.state.currentProgression = startPlan.progression.selected;
      deps.state.currentProgressionIndex = 0;
    }

    if (startPlan.resetArpeggioIndex) {
      deps.state.currentArpeggioIndex = 0;
    }

    const goalTargetCorrect = getSessionGoalTargetCorrect(deps.dom.sessionGoal.value);
    if (!startPlan.timed.enabled && goalTargetCorrect !== null) {
      deps.setSessionGoalProgress(formatSessionGoalProgress(0, goalTargetCorrect));
    } else {
      deps.clearSessionGoalProgress();
    }

    return {
      shouldProceed: true,
      errorMessage: null,
    };
  }

  return {
    prepare,
  };
}
