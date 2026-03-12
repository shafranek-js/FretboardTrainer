import type { Prompt } from './types';

type AppState = typeof import('./state').state;

type ModeConfig = {
  detectionType: import('./modes/training-mode').DetectionType | null;
  generatePrompt?: () => Prompt | null;
} | null;

type PerformancePromptContext = {
  melody: Parameters<typeof import('./modes/melody-performance').buildPerformancePromptForEvent>[0]['melody'];
  studyRange: Parameters<typeof import('./modes/melody-performance').buildPerformancePromptForEvent>[0]['studyRange'];
  bpm: number;
};

interface SessionNextPromptRuntimeControllerDeps {
  state: Pick<
    AppState,
    | 'isListening'
    | 'performanceRuntimeStartedAtMs'
    | 'performancePrerollLeadInVisible'
    | 'pendingSessionStopResultMessage'
    | 'liveDetectedNote'
    | 'liveDetectedString'
    | 'wrongDetectedNote'
    | 'wrongDetectedString'
    | 'wrongDetectedFret'
    | 'rhythmLastJudgedBeatAtMs'
    | 'currentMelodyEventFoundNotes'
    | 'currentPrompt'
    | 'startTime'
  >;
  getTrainingMode: () => string;
  isPerformanceStyleMode: (trainingMode: string) => boolean;
  startRuntimeClock: () => void;
  clearResultMessage: () => void;
  resetAttackTracking: () => void;
  resetPromptCycleTracking: () => void;
  getMode: (trainingMode: string) => ModeConfig;
  syncPromptEventFromRuntime: () => {
    context: PerformancePromptContext | null;
    activeEventIndex: number | null;
  };
  buildPerformancePromptForEvent: typeof import('./modes/melody-performance').buildPerformancePromptForEvent;
  buildSessionNextPromptPlan: typeof import('./session-next-prompt-plan').buildSessionNextPromptPlan;
  executeSessionNextPromptPlan: typeof import('./session-next-prompt-executor').executeSessionNextPromptPlan;
  requestSessionSummaryOnStop: () => void;
  stopListening: () => void;
  showError: (message: string) => void;
  updateTuner: (frequency: number | null) => void;
  setTunerVisible: (visible: boolean) => void;
  syncPromptTransition: (previousPrompt: Prompt | null, nextPrompt: Prompt) => void;
  setPromptText: (text: string) => void;
  redrawFretboard: () => void;
  scheduleTimelineRender: () => void;
  configurePromptAudio: () => void;
  syncMetronomeToPromptStart: () => Promise<void>;
  schedulePerformancePromptAdvance: (prompt: Prompt) => void;
  setResultMessage: (message: string, tone?: 'neutral' | 'success' | 'error') => void;
  now?: () => number;
}

export function createSessionNextPromptRuntimeController(deps: SessionNextPromptRuntimeControllerDeps) {
  const now = () => (typeof deps.now === 'function' ? deps.now() : Date.now());

  function advance() {
    if (!deps.state.isListening) return;

    const trainingMode = deps.getTrainingMode();
    if (
      deps.isPerformanceStyleMode(trainingMode) &&
      deps.state.performanceRuntimeStartedAtMs === null &&
      !deps.state.performancePrerollLeadInVisible
    ) {
      deps.startRuntimeClock();
    }

    deps.clearResultMessage();
    const pendingStopResultMessage = deps.state.pendingSessionStopResultMessage;
    deps.state.pendingSessionStopResultMessage = null;
    deps.state.liveDetectedNote = null;
    deps.state.liveDetectedString = null;
    deps.state.wrongDetectedNote = null;
    deps.state.wrongDetectedString = null;
    deps.state.wrongDetectedFret = null;
    deps.state.rhythmLastJudgedBeatAtMs = null;
    deps.state.currentMelodyEventFoundNotes.clear();

    if (trainingMode !== 'melody') {
      deps.resetAttackTracking();
    }
    deps.resetPromptCycleTracking();

    const mode = deps.getMode(trainingMode);
    let prompt: Prompt | null = null;
    if (deps.isPerformanceStyleMode(trainingMode)) {
      const { context, activeEventIndex } = deps.syncPromptEventFromRuntime();
      if (
        context &&
        typeof activeEventIndex === 'number' &&
        activeEventIndex >= context.studyRange.startIndex &&
        activeEventIndex <= context.studyRange.endIndex
      ) {
        prompt = deps.buildPerformancePromptForEvent({
          melody: context.melody,
          studyRange: context.studyRange,
          eventIndex: activeEventIndex,
          bpm: context.bpm,
        });
      }
    } else {
      prompt = mode?.generatePrompt?.() ?? null;
    }

    const nextPromptPlan = deps.buildSessionNextPromptPlan({
      hasMode: Boolean(mode),
      detectionType: mode?.detectionType ?? null,
      hasPrompt: Boolean(prompt),
    });

    const executionResult = deps.executeSessionNextPromptPlan(nextPromptPlan, prompt, {
      requestSessionSummaryOnStop: deps.requestSessionSummaryOnStop,
      stopListening: deps.stopListening,
      showError: deps.showError,
      updateTuner: deps.updateTuner,
      setTunerVisible: deps.setTunerVisible,
      applyPrompt: (nextPrompt) => {
        const previousPrompt = deps.state.currentPrompt;
        deps.syncPromptTransition(previousPrompt, nextPrompt);
        deps.state.currentPrompt = nextPrompt;
        deps.state.currentMelodyEventFoundNotes.clear();
        deps.setPromptText(nextPrompt.displayText);
        deps.redrawFretboard();
        deps.scheduleTimelineRender();
        deps.configurePromptAudio();
        deps.state.startTime = now();
        void deps.syncMetronomeToPromptStart();
        if (!deps.isPerformanceStyleMode(trainingMode)) {
          deps.schedulePerformancePromptAdvance(nextPrompt);
        }
      },
    });

    if (executionResult === 'stopped' && pendingStopResultMessage) {
      deps.setResultMessage(pendingStopResultMessage.text, pendingStopResultMessage.tone);
    }
  }

  return {
    advance,
  };
}
