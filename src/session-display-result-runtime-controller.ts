import { getSessionGoalTargetCorrect } from './session-goal';
import { executeDisplayResultSuccessFlow } from './display-result-success-flow-executor';
import type { Prompt } from './types';
import type { AppState } from './state';

type AppDom = typeof import('./dom').dom;

type ModeConfig = {
  detectionType: import('./modes/training-mode').DetectionType | null;
} | null;

interface SessionDisplayResultRuntimeControllerDeps {
  dom: Pick<AppDom, 'sessionGoal'>;
  state: Pick<
    AppState,
    | 'currentPrompt'
    | 'activeSessionStats'
    | 'currentInstrument'
    | 'currentArpeggioIndex'
    | 'showingAllNotes'
    | 'sessionPace'
    | 'showSessionSummaryOnStop'
    | 'currentMelodyEventIndex'
    | 'currentScore'
  >;
  getTrainingMode: () => string;
  getMode: (trainingMode: string) => ModeConfig;
  recordSessionAttempt: (
    activeSessionStats: AppState['activeSessionStats'],
    prompt: Prompt,
    correct: boolean,
    elapsedSeconds: number,
    instrument: AppState['currentInstrument']
  ) => void;
  updateStats: (correct: boolean, elapsedSeconds: number) => void;
  setInfoSlots: (slot1?: string, slot2?: string, slot3?: string) => void;
  setSessionGoalProgress: (text: string) => void;
  stopListening: () => void;
  setResultMessage: (message: string, tone?: 'neutral' | 'success' | 'error') => void;
  setScoreValue: (score: number) => void;
  setTunerVisible: (visible: boolean) => void;
  redrawFretboard: () => void;
  drawFretboard: (
    showAllNotes?: boolean,
    targetNote?: string | null,
    targetString?: string | null,
    chordFingering?: Prompt['targetChordFingering'],
    activeNotes?: Set<string>
  ) => void;
  scheduleSessionTimeout: (delayMs: number, callback: () => void, context: string) => unknown;
  scheduleSessionCooldown: (context: string, delayMs: number, callback: () => void) => void;
  nextPrompt: () => void;
}

export function createSessionDisplayResultRuntimeController(
  deps: SessionDisplayResultRuntimeControllerDeps
) {
  function handleResult(correct: boolean, elapsedSeconds: number) {
    if (deps.state.currentPrompt) {
      deps.recordSessionAttempt(
        deps.state.activeSessionStats,
        deps.state.currentPrompt,
        correct,
        elapsedSeconds,
        deps.state.currentInstrument
      );
    }
    deps.updateStats(correct, elapsedSeconds);

    if (!correct || !deps.state.currentPrompt) {
      return;
    }

    const trainingMode = deps.getTrainingMode();
    const mode = deps.getMode(trainingMode);
    executeDisplayResultSuccessFlow(
      {
        prompt: deps.state.currentPrompt,
        trainingMode,
        modeDetectionType: mode?.detectionType ?? null,
        elapsedSeconds,
        currentArpeggioIndex: deps.state.currentArpeggioIndex,
        showingAllNotes: deps.state.showingAllNotes,
        sessionPace: deps.state.sessionPace,
        goalTargetCorrect: getSessionGoalTargetCorrect(deps.dom.sessionGoal.value),
        correctAttempts: deps.state.activeSessionStats?.correctAttempts ?? null,
      },
      {
        setInfoSlots: deps.setInfoSlots,
        setSessionGoalProgress: deps.setSessionGoalProgress,
        requestSessionSummaryOnStop: () => {
          deps.state.showSessionSummaryOnStop = true;
        },
        stopListening: deps.stopListening,
        setCurrentArpeggioIndex: (index) => {
          deps.state.currentArpeggioIndex = index;
        },
        setResultMessage: deps.setResultMessage,
        advanceMelodyPromptIndex: () => {
          if (deps.getTrainingMode() === 'melody') {
            deps.state.currentMelodyEventIndex += 1;
          }
        },
        setScoreValue: deps.setScoreValue,
        setTunerVisible: deps.setTunerVisible,
        redrawFretboard: deps.redrawFretboard,
        drawFretboard: deps.drawFretboard,
        scheduleSessionTimeout: deps.scheduleSessionTimeout,
        scheduleSessionCooldown: deps.scheduleSessionCooldown,
        nextPrompt: deps.nextPrompt,
        addScore: (delta) => {
          deps.state.currentScore += delta;
          return deps.state.currentScore;
        },
      }
    );
  }

  return {
    handleResult,
  };
}
