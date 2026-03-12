import { createSessionPromptPerformanceRuntimeGraphCluster } from './session-prompt-performance-runtime-graph-cluster';

type SessionPromptPerformanceRuntimeGraphDeps = Parameters<typeof createSessionPromptPerformanceRuntimeGraphCluster>[0];

export interface SessionPromptPerformanceRuntimeGraphDepsBuilderArgs {
  dom: SessionPromptPerformanceRuntimeGraphDeps['dom'];
  state: SessionPromptPerformanceRuntimeGraphDeps['state'];
  nextPrompt: SessionPromptPerformanceRuntimeGraphDeps['nextPrompt'];
  getMetronomeTimingSnapshot: SessionPromptPerformanceRuntimeGraphDeps['getMetronomeTimingSnapshot'];
  evaluateRhythmTiming: SessionPromptPerformanceRuntimeGraphDeps['evaluateRhythmTiming'];
  recordRhythmTimingAttempt: SessionPromptPerformanceRuntimeGraphDeps['recordRhythmTimingAttempt'];
  formatRhythmFeedback: SessionPromptPerformanceRuntimeGraphDeps['formatRhythmFeedback'];
  setResultMessage: SessionPromptPerformanceRuntimeGraphDeps['setResultMessage'];
  isMelodyWorkflowMode: SessionPromptPerformanceRuntimeGraphDeps['isMelodyWorkflowMode'];
  resolvePerformanceMicDropHoldMs: SessionPromptPerformanceRuntimeGraphDeps['resolvePerformanceMicDropHoldMs'];
  shouldResetMicAttackTracking: SessionPromptPerformanceRuntimeGraphDeps['shouldResetMicAttackTracking'];
  shouldRearmMicOnsetForSameNote: SessionPromptPerformanceRuntimeGraphDeps['shouldRearmMicOnsetForSameNote'];
  shouldResetStudyMelodyOnsetTrackingOnPromptChange: SessionPromptPerformanceRuntimeGraphDeps['shouldResetStudyMelodyOnsetTrackingOnPromptChange'];
  getEnabledStrings: SessionPromptPerformanceRuntimeGraphDeps['getEnabledStrings'];
  redrawFretboard: SessionPromptPerformanceRuntimeGraphDeps['redrawFretboard'];
  scheduleMelodyTimelineRenderFromState: SessionPromptPerformanceRuntimeGraphDeps['scheduleMelodyTimelineRenderFromState'];
  setSessionGoalProgress: SessionPromptPerformanceRuntimeGraphDeps['setSessionGoalProgress'];
  setSessionButtonsState: SessionPromptPerformanceRuntimeGraphDeps['setSessionButtonsState'];
  playSound: SessionPromptPerformanceRuntimeGraphDeps['playSound'];
  clearWrongDetectedHighlight: SessionPromptPerformanceRuntimeGraphDeps['clearWrongDetectedHighlight'];
  recordPerformanceTimelineSuccess: SessionPromptPerformanceRuntimeGraphDeps['recordPerformanceTimelineSuccess'];
  recordPerformanceTimelineMissed: SessionPromptPerformanceRuntimeGraphDeps['recordPerformanceTimelineMissed'];
  recordSessionAttempt: SessionPromptPerformanceRuntimeGraphDeps['recordSessionAttempt'];
  recordPerformancePromptResolution: SessionPromptPerformanceRuntimeGraphDeps['recordPerformancePromptResolution'];
  updateStats: SessionPromptPerformanceRuntimeGraphDeps['updateStats'];
  recordPerformanceTimingAttempt: SessionPromptPerformanceRuntimeGraphDeps['recordPerformanceTimingAttempt'];
  recordPerformanceTimingByEvent: SessionPromptPerformanceRuntimeGraphDeps['recordPerformanceTimingByEvent'];
  setInfoSlots: SessionPromptPerformanceRuntimeGraphDeps['setInfoSlots'];
  drawFretboard: SessionPromptPerformanceRuntimeGraphDeps['drawFretboard'];
  scheduleSessionTimeout: SessionPromptPerformanceRuntimeGraphDeps['scheduleSessionTimeout'];
  isPerformanceStyleMode: SessionPromptPerformanceRuntimeGraphDeps['isPerformanceStyleMode'];
  getMelodyById: SessionPromptPerformanceRuntimeGraphDeps['getMelodyById'];
  getPracticeAdjustedMelody: SessionPromptPerformanceRuntimeGraphDeps['getPracticeAdjustedMelody'];
  clearPerformanceTimelineFeedback: SessionPromptPerformanceRuntimeGraphDeps['clearPerformanceTimelineFeedback'];
  requestAnimationFrame: SessionPromptPerformanceRuntimeGraphDeps['requestAnimationFrame'];
  cancelAnimationFrame: SessionPromptPerformanceRuntimeGraphDeps['cancelAnimationFrame'];
}

export function buildSessionPromptPerformanceRuntimeGraphDeps(
  args: SessionPromptPerformanceRuntimeGraphDepsBuilderArgs
): SessionPromptPerformanceRuntimeGraphDeps {
  return {
    dom: args.dom,
    state: args.state,
    nextPrompt: args.nextPrompt,
    getMetronomeTimingSnapshot: args.getMetronomeTimingSnapshot,
    evaluateRhythmTiming: args.evaluateRhythmTiming,
    recordRhythmTimingAttempt: args.recordRhythmTimingAttempt,
    formatRhythmFeedback: args.formatRhythmFeedback,
    setResultMessage: args.setResultMessage,
    isMelodyWorkflowMode: args.isMelodyWorkflowMode,
    resolvePerformanceMicDropHoldMs: args.resolvePerformanceMicDropHoldMs,
    shouldResetMicAttackTracking: args.shouldResetMicAttackTracking,
    shouldRearmMicOnsetForSameNote: args.shouldRearmMicOnsetForSameNote,
    shouldResetStudyMelodyOnsetTrackingOnPromptChange: args.shouldResetStudyMelodyOnsetTrackingOnPromptChange,
    getEnabledStrings: args.getEnabledStrings,
    redrawFretboard: args.redrawFretboard,
    scheduleMelodyTimelineRenderFromState: args.scheduleMelodyTimelineRenderFromState,
    setSessionGoalProgress: args.setSessionGoalProgress,
    setSessionButtonsState: args.setSessionButtonsState,
    playSound: args.playSound,
    clearWrongDetectedHighlight: args.clearWrongDetectedHighlight,
    recordPerformanceTimelineSuccess: args.recordPerformanceTimelineSuccess,
    recordPerformanceTimelineMissed: args.recordPerformanceTimelineMissed,
    recordSessionAttempt: args.recordSessionAttempt,
    recordPerformancePromptResolution: args.recordPerformancePromptResolution,
    updateStats: args.updateStats,
    recordPerformanceTimingAttempt: args.recordPerformanceTimingAttempt,
    recordPerformanceTimingByEvent: args.recordPerformanceTimingByEvent,
    setInfoSlots: args.setInfoSlots,
    drawFretboard: args.drawFretboard,
    scheduleSessionTimeout: args.scheduleSessionTimeout,
    isPerformanceStyleMode: args.isPerformanceStyleMode,
    getMelodyById: args.getMelodyById,
    getPracticeAdjustedMelody: args.getPracticeAdjustedMelody,
    clearPerformanceTimelineFeedback: args.clearPerformanceTimelineFeedback,
    requestAnimationFrame: args.requestAnimationFrame,
    cancelAnimationFrame: args.cancelAnimationFrame,
  };
}
