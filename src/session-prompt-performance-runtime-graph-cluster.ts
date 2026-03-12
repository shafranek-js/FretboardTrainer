import { dom } from './dom';
import { state } from './state';
import { createSessionPromptPerformanceRuntimeCluster } from './session-prompt-performance-runtime-cluster';
import type { Prompt } from './types';
import type { PerformanceTimingGrade } from './performance-timing-grade';

interface SessionPromptPerformanceRuntimeGraphClusterDeps {
  dom: Pick<typeof dom, 'rhythmTimingWindow' | 'trainingMode' | 'melodySelector' | 'sessionGoal' | 'stringSelector' | 'melodyDemoBpm'>;
  state: typeof state;
  nextPrompt: () => void;
  getMetronomeTimingSnapshot: typeof import('./metronome').getMetronomeTimingSnapshot;
  evaluateRhythmTiming: typeof import('./rhythm-timing').evaluateRhythmTiming;
  recordRhythmTimingAttempt: typeof import('./session-stats').recordRhythmTimingAttempt;
  formatRhythmFeedback: typeof import('./rhythm-timing').formatRhythmFeedback;
  setResultMessage: (message: string, tone?: 'neutral' | 'success' | 'error') => void;
  isMelodyWorkflowMode: (mode: string) => boolean;
  resolvePerformanceMicDropHoldMs: typeof import('./performance-mic-adaptive-gating').resolvePerformanceMicDropHoldMs;
  shouldResetMicAttackTracking: typeof import('./mic-attack-tracking').shouldResetMicAttackTracking;
  shouldRearmMicOnsetForSameNote: typeof import('./mic-note-reattack').shouldRearmMicOnsetForSameNote;
  shouldResetStudyMelodyOnsetTrackingOnPromptChange: typeof import('./study-melody-prompt-transition').shouldResetStudyMelodyOnsetTrackingOnPromptChange;
  getEnabledStrings: typeof import('./fretboard-ui-state').getEnabledStrings;
  redrawFretboard: () => void;
  scheduleMelodyTimelineRenderFromState: () => void;
  setSessionGoalProgress: (text: string) => void;
  setSessionButtonsState: (partialState: Partial<{ playSoundDisabled: boolean }>) => void;
  playSound: typeof import('./audio').playSound;
  clearWrongDetectedHighlight: () => void;
  recordPerformanceTimelineSuccess: (prompt: Prompt, redraw?: boolean) => void;
  recordPerformanceTimelineMissed: (prompt: Prompt) => void;
  recordSessionAttempt: typeof import('./session-stats').recordSessionAttempt;
  recordPerformancePromptResolution: typeof import('./session-stats').recordPerformancePromptResolution;
  updateStats: (correct: boolean, elapsedSeconds: number) => void;
  recordPerformanceTimingAttempt: typeof import('./session-stats').recordPerformanceTimingAttempt;
  recordPerformanceTimingByEvent: (grade: PerformanceTimingGrade | null) => void;
  setInfoSlots: (slot1?: string, slot2?: string, slot3?: string) => void;
  drawFretboard: typeof import('./ui').drawFretboard;
  scheduleSessionTimeout: (delayMs: number, callback: () => void, context: string) => number;
  isPerformanceStyleMode: (trainingMode: string) => boolean;
  getMelodyById: typeof import('./melody-library').getMelodyById;
  getPracticeAdjustedMelody: (melody: import('./melody-library').MelodyDefinition) => import('./melody-library').MelodyDefinition;
  clearPerformanceTimelineFeedback: () => void;
  requestAnimationFrame: (callback: FrameRequestCallback) => number;
  cancelAnimationFrame: (handle: number) => void;
}

export function createSessionPromptPerformanceRuntimeGraphCluster(
  deps: SessionPromptPerformanceRuntimeGraphClusterDeps
) {
  let sessionPromptRuntimeControllerRef: { updateSessionGoalProgress(): void } | null = null;
  let performancePromptControllerRef: { resolveMissed(): void } | null = null;

  const cluster = createSessionPromptPerformanceRuntimeCluster({
    rhythmMode: {
      dom: {
        rhythmTimingWindow: deps.dom.rhythmTimingWindow,
      },
      state: deps.state,
      now: () => Date.now(),
      getMetronomeTimingSnapshot: deps.getMetronomeTimingSnapshot,
      evaluateRhythmTiming: deps.evaluateRhythmTiming,
      recordRhythmTimingAttempt: deps.recordRhythmTimingAttempt,
      formatRhythmFeedback: deps.formatRhythmFeedback,
      setResultMessage: deps.setResultMessage,
    },
    micMonophonicAttackTracking: {
      state: deps.state,
      getTrainingMode: () => deps.dom.trainingMode.value,
      isMelodyWorkflowMode: deps.isMelodyWorkflowMode,
      resolvePerformanceMicDropHoldMs: deps.resolvePerformanceMicDropHoldMs,
      shouldResetMicAttackTracking: deps.shouldResetMicAttackTracking,
      shouldRearmMicOnsetForSameNote: deps.shouldRearmMicOnsetForSameNote,
      shouldResetStudyMelodyOnsetTrackingOnPromptChange: deps.shouldResetStudyMelodyOnsetTrackingOnPromptChange,
    },
    sessionPrompt: {
      dom: {
        trainingMode: deps.dom.trainingMode,
        melodySelector: deps.dom.melodySelector,
        sessionGoal: deps.dom.sessionGoal,
        stringSelector: deps.dom.stringSelector,
      },
      state: deps.state,
      getEnabledStrings: deps.getEnabledStrings,
      redrawFretboard: deps.redrawFretboard,
      scheduleTimelineRender: deps.scheduleMelodyTimelineRenderFromState,
      setSessionGoalProgress: deps.setSessionGoalProgress,
      setPlaySoundDisabled: (disabled) => {
        deps.setSessionButtonsState({ playSoundDisabled: disabled });
      },
      playSound: deps.playSound,
    },
    performancePrompt: {
      state: deps.state,
      getTrainingMode: () => deps.dom.trainingMode.value,
      clearWrongDetectedHighlight: deps.clearWrongDetectedHighlight,
      recordPerformanceTimelineSuccess: deps.recordPerformanceTimelineSuccess,
      recordPerformanceTimelineMissed: deps.recordPerformanceTimelineMissed,
      recordSessionAttempt: deps.recordSessionAttempt,
      recordPerformancePromptResolution: deps.recordPerformancePromptResolution,
      updateStats: deps.updateStats,
      updateSessionGoalProgress: () => sessionPromptRuntimeControllerRef?.updateSessionGoalProgress(),
      recordPerformanceTimingAttempt: deps.recordPerformanceTimingAttempt,
      recordPerformanceTimingByEvent: deps.recordPerformanceTimingByEvent,
      setInfoSlots: deps.setInfoSlots,
      redrawFretboard: deps.redrawFretboard,
      drawFretboard: deps.drawFretboard,
      setResultMessage: deps.setResultMessage,
      scheduleSessionTimeout: deps.scheduleSessionTimeout,
    },
    performanceTransport: {
      dom: {
        trainingMode: deps.dom.trainingMode,
        melodySelector: deps.dom.melodySelector,
        melodyDemoBpm: deps.dom.melodyDemoBpm,
      },
      state: deps.state,
      isPerformanceStyleMode: deps.isPerformanceStyleMode,
      getMelodyById: deps.getMelodyById,
      getPracticeAdjustedMelody: deps.getPracticeAdjustedMelody,
      redrawFretboard: deps.redrawFretboard,
      scheduleTimelineRender: deps.scheduleMelodyTimelineRenderFromState,
      clearPerformanceTimelineFeedback: deps.clearPerformanceTimelineFeedback,
      clearWrongDetectedHighlight: deps.clearWrongDetectedHighlight,
      onResolveMissedPrompt: () => performancePromptControllerRef?.resolveMissed(),
      requestAnimationFrame: deps.requestAnimationFrame,
      cancelAnimationFrame: deps.cancelAnimationFrame,
    },
    nextPrompt: deps.nextPrompt,
  });

  sessionPromptRuntimeControllerRef = cluster.sessionPromptRuntimeController;
  performancePromptControllerRef = cluster.performancePromptController;
  return cluster;
}
