import type { AppState } from './state';

type AppDom = typeof import('./dom').dom;
interface RhythmModeRuntimeControllerDeps {
  dom: Pick<AppDom, 'rhythmTimingWindow'>;
  state: Pick<AppState, 'rhythmLastJudgedBeatAtMs' | 'activeSessionStats'>;
  now: () => number;
  getMetronomeTimingSnapshot: typeof import('./metronome').getMetronomeTimingSnapshot;
  evaluateRhythmTiming: typeof import('./rhythm-timing').evaluateRhythmTiming;
  recordRhythmTimingAttempt: typeof import('./session-stats').recordRhythmTimingAttempt;
  formatRhythmFeedback: typeof import('./rhythm-timing').formatRhythmFeedback;
  setResultMessage: (message: string, tone?: 'neutral' | 'success' | 'error') => void;
}
export function createRhythmModeRuntimeController(deps: RhythmModeRuntimeControllerDeps) {
  function handleStableNote(detectedNote: string) {
    const timing = deps.evaluateRhythmTiming(
      deps.now(),
      deps.getMetronomeTimingSnapshot(),
      deps.dom.rhythmTimingWindow.value
    );
    if (!timing) {
      deps.setResultMessage('Enable Click to practice rhythm timing.', 'error');
      return;
    }
    if (deps.state.rhythmLastJudgedBeatAtMs === timing.beatAtMs) {
      return;
    }
    deps.state.rhythmLastJudgedBeatAtMs = timing.beatAtMs;
    deps.recordRhythmTimingAttempt(
      deps.state.activeSessionStats,
      timing.signedOffsetMs,
      timing.absOffsetMs,
      timing.tone === 'success'
    );
    deps.setResultMessage(deps.formatRhythmFeedback(timing, detectedNote), timing.tone);
  }
  return { handleStableNote };
}
